const express = require("express");
const pool = require("../db");

const router = express.Router();

const parsePositiveInt = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

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
         WHERE property_id = ? AND status = 'ACTIVE'
         ORDER BY name, staff_id`,
        [propertyId]
      ),
      pool.query(
        `SELECT g.guest_id, g.name, g.status, g.room_id, r.room_number
         FROM GUEST g
         LEFT JOIN ROOM r ON r.room_id = g.room_id
         WHERE g.property_id = ? AND g.status = 'CHECKED_IN'
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
         ORDER BY t.rfid_tag_id DESC`,
        []
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
