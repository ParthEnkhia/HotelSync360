const express = require("express");
const pool = require("../db");

const router = express.Router();

router.post("/create", async (req, res) => {
  try {
    const {
      property_id,
      staff_id,
      zone_id,
      allocated_by_staff_id,
      priority,
      start_time,
      end_time,
      reason,
    } = req.body;

    if (!property_id || !staff_id || !zone_id || !start_time) {
      return res.status(400).json({ error: "property_id, staff_id, zone_id, start_time are required" });
    }

    const [result] = await pool.query(
      `INSERT INTO STAFF_ZONE_ALLOCATION
      (property_id, staff_id, zone_id, allocated_by_staff_id, priority, status, start_time, end_time, reason)
      VALUES (?, ?, ?, ?, ?, 'PLANNED', ?, ?, ?)`,
      [
        property_id,
        staff_id,
        zone_id,
        allocated_by_staff_id || null,
        priority || "MEDIUM",
        start_time,
        end_time || null,
        reason || null,
      ]
    );

    res.json({
      message: "Staff zone allocation created",
      allocation_id: result.insertId,
    });
  } catch (error) {
    console.error("Create Allocation Error:", error);
    res.status(500).json({ error: "Error creating staff zone allocation" });
  }
});

router.get("/active", async (req, res) => {
  try {
    const { property_id, zone_id } = req.query;
    const where = ["a.status = 'ACTIVE'"];
    const params = [];

    if (property_id) {
      where.push("a.property_id = ?");
      params.push(property_id);
    }
    if (zone_id) {
      where.push("a.zone_id = ?");
      params.push(zone_id);
    }

    const [rows] = await pool.query(
      `SELECT a.*, s.name AS staff_name, s.role AS staff_role, z.zone_name
       FROM STAFF_ZONE_ALLOCATION a
       JOIN STAFF s ON s.staff_id = a.staff_id
       JOIN ZONE z ON z.zone_id = a.zone_id
       WHERE ${where.join(" AND ")}
       ORDER BY a.start_time DESC`,
      params
    );

    res.json(rows);
  } catch (error) {
    console.error("Fetch Active Allocation Error:", error);
    res.status(500).json({ error: "Error fetching active allocations" });
  }
});

router.get("/all", async (req, res) => {
  try {
    const { property_id } = req.query;
    const params = [];
    let where = "";

    if (property_id) {
      where = "WHERE a.property_id = ?";
      params.push(property_id);
    }

    const [rows] = await pool.query(
      `SELECT a.*, s.name AS staff_name, s.role AS staff_role, z.zone_name
       FROM STAFF_ZONE_ALLOCATION a
       JOIN STAFF s ON s.staff_id = a.staff_id
       JOIN ZONE z ON z.zone_id = a.zone_id
       ${where}
       ORDER BY a.created_at DESC`,
      params
    );

    res.json(rows);
  } catch (error) {
    console.error("Fetch All Allocation Error:", error);
    res.status(500).json({ error: "Error fetching allocations" });
  }
});

router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["PLANNED", "ACTIVE", "ENDED", "CANCELLED"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const setEnd = status === "ENDED" ? ", end_time = COALESCE(end_time, NOW())" : "";

    const [result] = await pool.query(
      `UPDATE STAFF_ZONE_ALLOCATION SET status = ? ${setEnd} WHERE allocation_id = ?`,
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Allocation not found" });
    }

    res.json({ message: "Allocation status updated" });
  } catch (error) {
    console.error("Update Allocation Status Error:", error);
    res.status(500).json({ error: "Error updating allocation status" });
  }
});

module.exports = router;
