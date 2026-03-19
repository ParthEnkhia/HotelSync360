const express = require("express");
const pool = require("../db");

const router = express.Router();

const normalizeOptionalString = (value) => {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
};

router.post("/add", async (req, res) => {
  try {
    const { property_id, name, role, phone } = req.body;

    if (!property_id || !name) {
      return res.status(400).json({ error: "property_id and name are required" });
    }

    const [propertyRows] = await pool.query(
      "SELECT property_id FROM PROPERTY WHERE property_id = ? LIMIT 1",
      [property_id]
    );
    if (!propertyRows.length) {
      return res.status(404).json({ error: "Property not found" });
    }

    const [result] = await pool.query(
      `INSERT INTO STAFF (property_id, name, role, phone, status, is_active)
       VALUES (?, ?, ?, ?, 'ACTIVE', TRUE)`,
      [property_id, name, normalizeOptionalString(role), normalizeOptionalString(phone)]
    );

    res.json({ message: "Staff added successfully", staff_id: result.insertId });
  } catch (error) {
    console.error("Add Staff Error:", error);
    res.status(500).json({ error: "Error adding staff" });
  }
});

router.get("/all", async (req, res) => {
  try {
    const { property_id, include_inactive } = req.query;
    const filters = [];
    const params = [];

    if (!String(include_inactive || "").toLowerCase().trim().match(/^(1|true|yes)$/)) {
      filters.push("s.is_active = TRUE");
    }

    if (property_id) {
      filters.push("s.property_id = ?");
      params.push(property_id);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `SELECT s.staff_id, s.property_id, s.name, s.role, s.phone, s.status, s.is_active,
              t.rfid_tag_id, t.tag_code
       FROM STAFF s
       LEFT JOIN RFID_ASSIGNMENT ra
         ON ra.assignee_type = 'STAFF' AND ra.assignee_id = s.staff_id AND ra.is_active = TRUE
       LEFT JOIN RFID_TAG t
         ON t.rfid_tag_id = ra.rfid_tag_id
       ${whereClause}
       ORDER BY s.staff_id DESC`,
      params
    );

    res.json(rows);
  } catch (error) {
    console.error("Fetch Staff Error:", error);
    res.status(500).json({ error: "Error fetching staff" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT s.*, t.rfid_tag_id, t.tag_code
       FROM STAFF s
       LEFT JOIN RFID_ASSIGNMENT ra
         ON ra.assignee_type = 'STAFF' AND ra.assignee_id = s.staff_id AND ra.is_active = TRUE
       LEFT JOIN RFID_TAG t
         ON t.rfid_tag_id = ra.rfid_tag_id
       WHERE s.staff_id = ?
       LIMIT 1`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Fetch Staff Error:", error);
    res.status(500).json({ error: "Error fetching staff member" });
  }
});

router.patch("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, phone } = req.body;

    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }

    const [staffRows] = await pool.query(
      "SELECT staff_id, is_active FROM STAFF WHERE staff_id = ? LIMIT 1",
      [id]
    );
    if (!staffRows.length) {
      return res.status(404).json({ error: "Staff member not found" });
    }
    if (!staffRows[0].is_active) {
      return res.status(400).json({ error: "Inactive staff member cannot be updated" });
    }

    await pool.query(
      "UPDATE STAFF SET name = ?, role = ?, phone = ? WHERE staff_id = ?",
      [name, normalizeOptionalString(role), normalizeOptionalString(phone), id]
    );

    res.json({ message: "Staff updated successfully" });
  } catch (error) {
    console.error("Update Staff Error:", error);
    res.status(500).json({ error: "Error updating staff" });
  }
});

router.patch("/deactivate/:id", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;

    await connection.beginTransaction();

    const [staffRows] = await connection.query(
      "SELECT staff_id FROM STAFF WHERE staff_id = ? LIMIT 1",
      [id]
    );
    if (!staffRows.length) {
      await connection.rollback();
      return res.status(404).json({ error: "Staff member not found" });
    }

    await connection.query(
      `UPDATE RFID_ASSIGNMENT
       SET is_active = FALSE, released_at = NOW()
       WHERE assignee_type = 'STAFF' AND assignee_id = ? AND is_active = TRUE`,
      [id]
    );

    await connection.query(
      "UPDATE STAFF SET is_active = FALSE, status = 'INACTIVE' WHERE staff_id = ?",
      [id]
    );

    await connection.query(
      `UPDATE STAFF_ZONE_ALLOCATION
       SET status = 'CANCELLED', end_time = COALESCE(end_time, NOW())
       WHERE staff_id = ? AND status IN ('PLANNED', 'ACTIVE')`,
      [id]
    );

    await connection.commit();
    res.json({ message: "Staff deactivated successfully" });
  } catch (error) {
    await connection.rollback();
    console.error("Deactivate Staff Error:", error);
    res.status(500).json({ error: "Error deactivating staff" });
  } finally {
    connection.release();
  }
});

router.delete("/delete/:id", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;

    await connection.beginTransaction();

    await connection.query(
      `UPDATE RFID_ASSIGNMENT
       SET is_active = FALSE, released_at = NOW()
       WHERE assignee_type = 'STAFF' AND assignee_id = ? AND is_active = TRUE`,
      [id]
    );
    await connection.query(
      `UPDATE STAFF_ZONE_ALLOCATION
       SET status = 'CANCELLED', end_time = COALESCE(end_time, NOW())
       WHERE staff_id = ? AND status IN ('PLANNED', 'ACTIVE')`,
      [id]
    );
    await connection.query("DELETE FROM STAFF WHERE staff_id = ?", [id]);

    await connection.commit();
    res.json({ message: "Staff deleted successfully" });
  } catch (error) {
    await connection.rollback();
    console.error("Delete Staff Error:", error);
    res.status(500).json({ error: "Error deleting staff" });
  } finally {
    connection.release();
  }
});

module.exports = router;
