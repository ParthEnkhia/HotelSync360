const express = require("express");
const pool = require("../db");

const router = express.Router();

const ALLOWED_EVENT_TYPES = new Set(["ENTRY", "EXIT", "PING"]);
const parsePropertyId = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : NaN;
};

const requirePropertyId = (req, res) => {
  const propertyId = parsePropertyId(req.query.property_id);
  if (propertyId === null) {
    res.status(400).json({ error: "property_id query parameter is required" });
    return null;
  }
  if (Number.isNaN(propertyId)) {
    res.status(400).json({ error: "property_id must be a positive integer" });
    return null;
  }
  return propertyId;
};

const resolvePropertyScopedTag = async (rfidTagId, propertyId) => {
  const [rows] = await pool.query(
    `SELECT DISTINCT t.rfid_tag_id
     FROM RFID_TAG t
     LEFT JOIN RFID_ASSIGNMENT ra
       ON ra.rfid_tag_id = t.rfid_tag_id AND ra.is_active = TRUE
     LEFT JOIN GUEST g
       ON ra.assignee_type = 'GUEST' AND ra.assignee_id = g.guest_id
     LEFT JOIN STAFF s
       ON ra.assignee_type = 'STAFF' AND ra.assignee_id = s.staff_id
     LEFT JOIN MOVEMENT_TAG m
       ON m.rfid_tag_id = t.rfid_tag_id
     LEFT JOIN RFID_READER r
       ON m.reader_id = r.reader_id
     LEFT JOIN ZONE z
       ON r.zone_id = z.zone_id
     WHERE t.rfid_tag_id = ?
       AND (
         g.property_id = ?
         OR s.property_id = ?
         OR z.property_id = ?
       )
     LIMIT 1`,
    [rfidTagId, propertyId, propertyId, propertyId]
  );

  return rows[0] || null;
};

router.post("/scan", async (req, res) => {
  try {
    const { rfid_tag_id, tag_code, reader_id, event_type } = req.body;

    if (!reader_id || (!rfid_tag_id && !tag_code)) {
      return res.status(400).json({ error: "reader_id and one of rfid_tag_id/tag_code are required" });
    }

    let normalizedEventType = "PING";
    if (event_type !== undefined && event_type !== null && String(event_type).trim() !== "") {
      normalizedEventType = String(event_type).trim().toUpperCase();
      if (!ALLOWED_EVENT_TYPES.has(normalizedEventType)) {
        return res.status(400).json({ error: "event_type must be ENTRY, EXIT, or PING" });
      }
    }

    const [readerRows] = await pool.query(
      "SELECT reader_id FROM RFID_READER WHERE reader_id = ? LIMIT 1",
      [reader_id]
    );
    if (!readerRows.length) {
      return res.status(404).json({ error: "RFID reader not found" });
    }

    let resolvedTagId = rfid_tag_id;

    if (resolvedTagId) {
      const [tagRows] = await pool.query(
        "SELECT rfid_tag_id FROM RFID_TAG WHERE rfid_tag_id = ? AND is_active = TRUE LIMIT 1",
        [resolvedTagId]
      );
      if (!tagRows.length) {
        return res.status(404).json({ error: "RFID tag not found" });
      }
      resolvedTagId = tagRows[0].rfid_tag_id;
    } else if (tag_code) {
      const [tagRows] = await pool.query(
        "SELECT rfid_tag_id FROM RFID_TAG WHERE tag_code = ? AND is_active = TRUE LIMIT 1",
        [tag_code]
      );
      if (!tagRows.length) {
        return res.status(404).json({ error: "RFID tag not found" });
      }
      resolvedTagId = tagRows[0].rfid_tag_id;
    }

    try {
      await pool.query(
        "INSERT INTO MOVEMENT_TAG (rfid_tag_id, reader_id, event_type) VALUES (?, ?, ?)",
        [resolvedTagId, reader_id, normalizedEventType]
      );
    } catch (error) {
      if (error.code === "ER_NO_REFERENCED_ROW_2" || error.code === "ER_ROW_IS_REFERENCED_2") {
        return res.status(400).json({ error: "Invalid RFID tag or reader reference" });
      }
      throw error;
    }

    res.json({ message: "Scan recorded" });
  } catch (error) {
    console.error("Scan Error:", error);
    res.status(500).json({ error: "Error recording scan" });
  }
});

router.get("/current/:rfid_tag_id", async (req, res) => {
  try {
    const { rfid_tag_id } = req.params;
    const propertyId = requirePropertyId(req, res);
    if (!propertyId) return;

    const tag = await resolvePropertyScopedTag(rfid_tag_id, propertyId);
    if (!tag) {
      return res.status(404).json({ error: "RFID tag not found for this property" });
    }

    const [rows] = await pool.query(
      `SELECT z.zone_name, m.scan_time, m.event_type, r.reader_name
       FROM MOVEMENT_TAG m
       JOIN RFID_READER r ON m.reader_id = r.reader_id
       JOIN ZONE z ON r.zone_id = z.zone_id
       WHERE m.rfid_tag_id = ? AND z.property_id = ?
       ORDER BY m.scan_time DESC
       LIMIT 1`,
      [rfid_tag_id, propertyId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "No movement found for this RFID tag" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Current Location Error:", error);
    res.status(500).json({ error: "Error fetching location" });
  }
});

router.get("/history/:rfid_tag_id", async (req, res) => {
  try {
    const { rfid_tag_id } = req.params;
    const propertyId = requirePropertyId(req, res);
    if (!propertyId) return;

    const tag = await resolvePropertyScopedTag(rfid_tag_id, propertyId);
    if (!tag) {
      return res.status(404).json({ error: "RFID tag not found for this property" });
    }

    const [rows] = await pool.query(
      `SELECT z.zone_name, m.scan_time, m.event_type, r.reader_name
       FROM MOVEMENT_TAG m
       JOIN RFID_READER r ON m.reader_id = r.reader_id
       JOIN ZONE z ON r.zone_id = z.zone_id
       WHERE m.rfid_tag_id = ? AND z.property_id = ?
       ORDER BY m.scan_time DESC`,
      [rfid_tag_id, propertyId]
    );

    res.json(rows);
  } catch (error) {
    console.error("History Error:", error);
    res.status(500).json({ error: "Error fetching history" });
  }
});

router.get("/analytics/most-visited-zone", async (req, res) => {
  try {
    const { property_id } = req.query;
    const params = [];
    let whereClause = "";

    if (property_id) {
      whereClause = "WHERE z.property_id = ?";
      params.push(property_id);
    }

    const [rows] = await pool.query(
      `SELECT z.zone_name, COUNT(*) AS visit_count
       FROM MOVEMENT_TAG m
       JOIN RFID_READER r ON m.reader_id = r.reader_id
       JOIN ZONE z ON r.zone_id = z.zone_id
       ${whereClause}
       GROUP BY z.zone_id, z.zone_name
       ORDER BY visit_count DESC
       LIMIT 1`,
      params
    );

    res.json(rows[0] || null);
  } catch (error) {
    console.error("Most Visited Zone Error:", error);
    res.status(500).json({ error: "Error fetching analytics" });
  }
});

router.get("/analytics/current-occupancy", async (req, res) => {
  try {
    const { property_id } = req.query;
    const params = [];
    if (property_id) {
      params.push(property_id);
    }

    const [rows] = await pool.query(
      `SELECT z.zone_name, COUNT(*) AS current_count
       FROM (
         SELECT m1.rfid_tag_id, MAX(m1.movement_id) AS latest_movement_id
         FROM MOVEMENT_TAG m1
         JOIN (
           SELECT rfid_tag_id, MAX(scan_time) AS latest_scan
           FROM MOVEMENT_TAG
           GROUP BY rfid_tag_id
         ) latest_scan
           ON latest_scan.rfid_tag_id = m1.rfid_tag_id
           AND latest_scan.latest_scan = m1.scan_time
         GROUP BY m1.rfid_tag_id
       ) latest
       JOIN MOVEMENT_TAG m ON m.movement_id = latest.latest_movement_id
       JOIN RFID_READER r ON m.reader_id = r.reader_id
       JOIN ZONE z ON r.zone_id = z.zone_id
       WHERE m.event_type IN ('ENTRY', 'PING')
       ${property_id ? "AND z.property_id = ?" : ""}
       GROUP BY z.zone_id, z.zone_name
       ORDER BY current_count DESC`,
      params
    );

    res.json(rows);
  } catch (error) {
    console.error("Current Occupancy Error:", error);
    res.status(500).json({ error: "Error fetching occupancy" });
  }
});

router.get("/analytics/zone-heatmap", async (req, res) => {
  try {
    const propertyId = requirePropertyId(req, res);
    if (!propertyId) return;

    const [zoneRows] = await pool.query(
      `SELECT z.zone_id, z.zone_name, z.zone_category
       FROM ZONE z
       WHERE z.property_id = ?
       ORDER BY z.zone_name`,
      [propertyId]
    );

    const [occupantRows] = await pool.query(
      `SELECT zone_details.zone_id,
              zone_details.zone_name,
              zone_details.zone_category,
              zone_details.reader_name,
              zone_details.scan_time,
              zone_details.event_type,
              t.rfid_tag_id,
              t.tag_code,
              t.tag_type,
              ra.assignee_type,
              ra.assignee_id,
              CASE
                WHEN ra.assignee_type = 'GUEST' THEN g.name
                WHEN ra.assignee_type = 'STAFF' THEN s.name
                ELSE NULL
              END AS assignee_name
       FROM (
         SELECT latest.rfid_tag_id,
                z.zone_id,
                z.zone_name,
                z.zone_category,
                r.reader_name,
                m.scan_time,
                m.event_type
         FROM (
           SELECT m1.rfid_tag_id, MAX(m1.movement_id) AS latest_movement_id
           FROM MOVEMENT_TAG m1
           JOIN RFID_READER r1
             ON r1.reader_id = m1.reader_id
           JOIN ZONE z1
             ON z1.zone_id = r1.zone_id
           WHERE z1.property_id = ?
           GROUP BY m1.rfid_tag_id
         ) latest
         JOIN MOVEMENT_TAG m
           ON m.movement_id = latest.latest_movement_id
         JOIN RFID_READER r
           ON r.reader_id = m.reader_id
         JOIN ZONE z
           ON z.zone_id = r.zone_id
         WHERE m.event_type IN ('ENTRY', 'PING')
       ) zone_details
       JOIN RFID_TAG t
         ON t.rfid_tag_id = zone_details.rfid_tag_id
        AND t.is_active = TRUE
       LEFT JOIN RFID_ASSIGNMENT ra
         ON ra.rfid_tag_id = t.rfid_tag_id
        AND ra.is_active = TRUE
       LEFT JOIN GUEST g
         ON ra.assignee_type = 'GUEST'
        AND ra.assignee_id = g.guest_id
        AND g.is_active = TRUE
       LEFT JOIN STAFF s
         ON ra.assignee_type = 'STAFF'
        AND ra.assignee_id = s.staff_id
        AND s.is_active = TRUE
       ORDER BY zone_details.zone_name, zone_details.scan_time DESC, t.rfid_tag_id DESC`,
      [propertyId]
    );

    const occupantsByZoneId = new Map();
    for (const row of occupantRows) {
      const entry = {
        rfid_tag_id: row.rfid_tag_id,
        tag_code: row.tag_code,
        tag_type: row.tag_type,
        assignee_type: row.assignee_type,
        assignee_id: row.assignee_id,
        assignee_name: row.assignee_name || null,
        display_name: row.assignee_name || `${row.tag_type} Tag ${row.tag_code}`,
        reader_name: row.reader_name || null,
        scan_time: row.scan_time,
        event_type: row.event_type,
      };

      const existing = occupantsByZoneId.get(row.zone_id) || [];
      existing.push(entry);
      occupantsByZoneId.set(row.zone_id, existing);
    }

    const maxOccupancy = zoneRows.reduce((highest, zone) => {
      const count = (occupantsByZoneId.get(zone.zone_id) || []).length;
      return Math.max(highest, count);
    }, 0);

    const zones = zoneRows.map((zone) => {
      const occupants = occupantsByZoneId.get(zone.zone_id) || [];
      return {
        zone_id: zone.zone_id,
        zone_name: zone.zone_name,
        zone_category: zone.zone_category,
        occupancy_count: occupants.length,
        heat_ratio: maxOccupancy > 0 ? Number((occupants.length / maxOccupancy).toFixed(2)) : 0,
        occupants,
      };
    });

    res.json({
      property_id: propertyId,
      max_occupancy: maxOccupancy,
      zones,
    });
  } catch (error) {
    console.error("Zone Heatmap Error:", error);
    res.status(500).json({ error: "Error fetching zone heatmap" });
  }
});

router.get("/analytics/today-movements", async (req, res) => {
  try {
    const { property_id } = req.query;
    const params = [];
    let propertyJoinFilter = "";

    if (property_id) {
      propertyJoinFilter = "AND z.property_id = ?";
      params.push(property_id);
    }

    const [rows] = await pool.query(
      `SELECT COUNT(*) AS total_today
       FROM MOVEMENT_TAG m
       JOIN RFID_READER r ON m.reader_id = r.reader_id
       JOIN ZONE z ON r.zone_id = z.zone_id
       WHERE DATE(m.scan_time) = CURDATE() ${propertyJoinFilter}`,
      params
    );

    res.json(rows[0]);
  } catch (error) {
    console.error("Today Movements Error:", error);
    res.status(500).json({ error: "Error fetching today count" });
  }
});

router.get("/analytics/zone-time/:rfid_tag_id", async (req, res) => {
  try {
    const { rfid_tag_id } = req.params;
    const propertyId = requirePropertyId(req, res);
    if (!propertyId) return;

    const tag = await resolvePropertyScopedTag(rfid_tag_id, propertyId);
    if (!tag) {
      return res.status(404).json({ error: "RFID tag not found for this property" });
    }

    const [rows] = await pool.query(
      `SELECT z.zone_name, m.scan_time
       FROM MOVEMENT_TAG m
       JOIN RFID_READER r ON m.reader_id = r.reader_id
       JOIN ZONE z ON r.zone_id = z.zone_id
       WHERE m.rfid_tag_id = ? AND z.property_id = ?
       ORDER BY m.scan_time`,
      [rfid_tag_id, propertyId]
    );

    res.json(rows);
  } catch (error) {
    console.error("Zone Time Error:", error);
    res.status(500).json({ error: "Error fetching zone time" });
  }
});

module.exports = router;
