const express = require("express");
const pool = require("../db");

const router = express.Router();

const parsePositiveInt = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

router.post("/properties", async (req, res) => {
  try {
    const { property_name, address_line1, city, state, country } = req.body;

    if (!property_name) {
      return res.status(400).json({ error: "property_name is required" });
    }

    const [result] = await pool.query(
      `INSERT INTO PROPERTY (property_name, address_line1, city, state, country, status)
       VALUES (?, ?, ?, ?, ?, 'ACTIVE')`,
      [
        property_name,
        address_line1 || null,
        city || null,
        state || null,
        country || null,
      ]
    );

    res.json({ message: "Property created successfully", property_id: result.insertId });
  } catch (error) {
    console.error("Create Property Error:", error);
    res.status(500).json({ error: "Error creating property" });
  }
});

router.get("/properties", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT property_id, property_name, city, state, country, status
       FROM PROPERTY
       WHERE status = 'ACTIVE'
       ORDER BY property_name`
    );

    res.json(rows);
  } catch (error) {
    console.error("Fetch Properties Error:", error);
    res.status(500).json({ error: "Error fetching properties" });
  }
});

router.post("/zones", async (req, res) => {
  try {
    const { property_id, zone_name, zone_category } = req.body;

    if (!property_id || !zone_name) {
      return res.status(400).json({ error: "property_id and zone_name are required" });
    }

    const [propertyRows] = await pool.query(
      "SELECT property_id FROM PROPERTY WHERE property_id = ? LIMIT 1",
      [property_id]
    );
    if (!propertyRows.length) {
      return res.status(404).json({ error: "Property not found" });
    }

    const [result] = await pool.query(
      `INSERT INTO ZONE (property_id, zone_name, zone_category)
       VALUES (?, ?, ?)`,
      [property_id, zone_name, zone_category || null]
    );

    res.json({ message: "Zone created successfully", zone_id: result.insertId });
  } catch (error) {
    console.error("Create Zone Error:", error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ error: "Zone name already exists for this property" });
    }
    res.status(500).json({ error: "Error creating zone" });
  }
});

router.post("/rooms", async (req, res) => {
  try {
    const { property_id, room_number, room_type, zone_id } = req.body;

    if (!property_id || !room_number) {
      return res.status(400).json({ error: "property_id and room_number are required" });
    }

    if (zone_id) {
      const [zoneRows] = await pool.query(
        "SELECT zone_id, property_id FROM ZONE WHERE zone_id = ? LIMIT 1",
        [zone_id]
      );
      if (!zoneRows.length) {
        return res.status(404).json({ error: "Zone not found" });
      }
      if (Number(zoneRows[0].property_id) !== Number(property_id)) {
        return res.status(400).json({ error: "Zone does not belong to this property" });
      }
    }

    const [result] = await pool.query(
      `INSERT INTO ROOM (property_id, room_number, room_type, zone_id)
       VALUES (?, ?, ?, ?)`,
      [property_id, room_number, room_type || null, zone_id || null]
    );

    res.json({ message: "Room created successfully", room_id: result.insertId });
  } catch (error) {
    console.error("Create Room Error:", error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ error: "Room number already exists for this property" });
    }
    res.status(500).json({ error: "Error creating room" });
  }
});

router.post("/readers", async (req, res) => {
  try {
    const { property_id, zone_id, reader_name, reader_connection, status } = req.body;

    if (!property_id || !zone_id) {
      return res.status(400).json({ error: "property_id and zone_id are required" });
    }

    const [zoneRows] = await pool.query(
      "SELECT zone_id, property_id FROM ZONE WHERE zone_id = ? LIMIT 1",
      [zone_id]
    );
    if (!zoneRows.length) {
      return res.status(404).json({ error: "Zone not found" });
    }
    if (Number(zoneRows[0].property_id) !== Number(property_id)) {
      return res.status(400).json({ error: "Zone does not belong to this property" });
    }

    const [result] = await pool.query(
      `INSERT INTO RFID_READER (property_id, zone_id, reader_connection, reader_name, status)
       VALUES (?, ?, ?, ?, ?)`,
      [
        property_id,
        zone_id,
        reader_connection || null,
        reader_name || null,
        status || "ONLINE",
      ]
    );

    res.json({ message: "Reader created successfully", reader_id: result.insertId });
  } catch (error) {
    console.error("Create Reader Error:", error);
    res.status(500).json({ error: "Error creating reader" });
  }
});

router.get("/property/:propertyId/options", async (req, res) => {
  try {
    const propertyId = parsePositiveInt(req.params.propertyId);

    if (!propertyId) {
      return res.status(400).json({ error: "propertyId must be a positive integer" });
    }

    const [propertyRows] = await pool.query(
      `SELECT property_id, property_name, city, state, country, status
       FROM PROPERTY
       WHERE property_id = ?
       LIMIT 1`,
      [propertyId]
    );

    if (!propertyRows.length) {
      return res.status(404).json({ error: "Property not found" });
    }

    const [
      [rooms],
      [zones],
      [readers],
      [staff],
      [guests],
      [availableGuestTags],
      [availableStaffTags],
      [activeTags],
    ] = await Promise.all([
      pool.query(
        `SELECT room_id, room_number, room_type, zone_id
         FROM ROOM
         WHERE property_id = ?
         ORDER BY room_number`,
        [propertyId]
      ),
      pool.query(
        `SELECT zone_id, zone_name, zone_category
         FROM ZONE
         WHERE property_id = ?
         ORDER BY zone_name`,
        [propertyId]
      ),
      pool.query(
        `SELECT reader_id, reader_name, reader_connection, zone_id, status
         FROM RFID_READER
         WHERE property_id = ?
         ORDER BY reader_name, reader_id`,
        [propertyId]
      ),
      pool.query(
        `SELECT staff_id, name, role, status
         FROM STAFF
         WHERE property_id = ? AND status = 'ACTIVE' AND is_active = TRUE
         ORDER BY name, staff_id`,
        [propertyId]
      ),
      pool.query(
        `SELECT g.guest_id, g.name, g.status, g.room_id, r.room_number
         FROM GUEST g
         LEFT JOIN ROOM r ON r.room_id = g.room_id
         WHERE g.property_id = ? AND g.status = 'CHECKED_IN' AND g.is_active = TRUE
         ORDER BY g.name, g.guest_id`,
        [propertyId]
      ),
      pool.query(
        `SELECT t.rfid_tag_id, t.tag_code, t.tag_type
         FROM RFID_TAG t
         LEFT JOIN RFID_ASSIGNMENT ra
           ON ra.rfid_tag_id = t.rfid_tag_id AND ra.is_active = TRUE
         WHERE t.tag_type = 'GUEST'
           AND t.is_active = TRUE
           AND ra.assignment_id IS NULL
         ORDER BY t.rfid_tag_id DESC`,
        []
      ),
      pool.query(
        `SELECT t.rfid_tag_id, t.tag_code, t.tag_type
         FROM RFID_TAG t
         LEFT JOIN RFID_ASSIGNMENT ra
           ON ra.rfid_tag_id = t.rfid_tag_id AND ra.is_active = TRUE
         WHERE t.tag_type = 'STAFF'
           AND t.is_active = TRUE
           AND ra.assignment_id IS NULL
         ORDER BY t.rfid_tag_id DESC`,
        []
      ),
      pool.query(
        `SELECT t.rfid_tag_id, t.tag_code, t.tag_type, t.is_active,
                ra.assignee_type, ra.assignee_id, ra.assigned_at,
                CASE
                  WHEN ra.assignee_type = 'GUEST' THEN g.name
                  WHEN ra.assignee_type = 'STAFF' THEN s.name
                  ELSE NULL
                END AS assignee_name
         FROM RFID_TAG t
         LEFT JOIN RFID_ASSIGNMENT ra
           ON ra.rfid_tag_id = t.rfid_tag_id AND ra.is_active = TRUE
         LEFT JOIN GUEST g
           ON ra.assignee_type = 'GUEST' AND ra.assignee_id = g.guest_id
         LEFT JOIN STAFF s
           ON ra.assignee_type = 'STAFF' AND ra.assignee_id = s.staff_id
         WHERE t.is_active = TRUE
           AND (
             ra.assignment_id IS NULL
             OR (ra.assignee_type = 'GUEST' AND g.property_id = ? AND g.is_active = TRUE)
             OR (ra.assignee_type = 'STAFF' AND s.property_id = ? AND s.is_active = TRUE)
           )
         ORDER BY t.rfid_tag_id DESC`,
        [propertyId, propertyId]
      ),
    ]);

    res.json({
      property: propertyRows[0],
      rooms,
      zones,
      readers,
      staff,
      guests,
      available_guest_tags: availableGuestTags,
      available_staff_tags: availableStaffTags,
      active_tags: activeTags,
    });
  } catch (error) {
    console.error("Fetch Property Options Error:", error);
    res.status(500).json({ error: "Error fetching property options" });
  }
});

module.exports = router;
