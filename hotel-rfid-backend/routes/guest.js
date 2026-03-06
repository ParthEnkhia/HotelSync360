const express = require("express");
const pool = require("../db");

const router = express.Router();

router.post("/add", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { property_id, name, phone, room_id, rfid_tag_id } = req.body;

    if (!property_id || !name || !room_id || !rfid_tag_id) {
      return res.status(400).json({ error: "Required fields missing" });
    }

    await connection.beginTransaction();

    const [roomRows] = await connection.query(
      "SELECT room_id FROM ROOM WHERE room_id = ? AND property_id = ?",
      [room_id, property_id]
    );
    if (!roomRows.length) {
      await connection.rollback();
      return res.status(400).json({ error: "Invalid room for property" });
    }

    const [tagRows] = await connection.query(
      "SELECT rfid_tag_id, tag_type, is_active FROM RFID_TAG WHERE rfid_tag_id = ?",
      [rfid_tag_id]
    );
    if (!tagRows.length) {
      await connection.rollback();
      return res.status(400).json({ error: "RFID tag not found" });
    }
    if (tagRows[0].tag_type !== "GUEST") {
      await connection.rollback();
      return res.status(400).json({ error: "RFID tag type must be GUEST" });
    }
    if (!tagRows[0].is_active) {
      await connection.rollback();
      return res.status(400).json({ error: "RFID tag is inactive" });
    }

    const [guestInsert] = await connection.query(
      "INSERT INTO GUEST (property_id, name, phone, room_id, check_in_time) VALUES (?, ?, ?, ?, NOW())",
      [property_id, name, phone || null, room_id]
    );

    await connection.query(
      `INSERT INTO RFID_ASSIGNMENT (rfid_tag_id, assignee_type, assignee_id, assigned_at, is_active)
       VALUES (?, 'GUEST', ?, NOW(), TRUE)`,
      [rfid_tag_id, guestInsert.insertId]
    );

    await connection.commit();

    res.json({
      message: "Guest added successfully",
      guest_id: guestInsert.insertId,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Add Guest Error:", error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ error: "RFID tag is already assigned" });
    }
    res.status(500).json({ error: "Error adding guest" });
  } finally {
    connection.release();
  }
});

router.get("/all", async (req, res) => {
  try {
    const { property_id } = req.query;
    const params = [];
    let whereClause = "";

    if (property_id) {
      whereClause = "WHERE g.property_id = ?";
      params.push(property_id);
    }

    const [rows] = await pool.query(
      `SELECT g.guest_id, g.name, g.phone, g.status, g.check_in_time, g.check_out_time,
              r.room_number, t.rfid_tag_id, t.tag_code
       FROM GUEST g
       JOIN ROOM r ON g.room_id = r.room_id
       LEFT JOIN RFID_ASSIGNMENT ra ON ra.assignee_type = 'GUEST' AND ra.assignee_id = g.guest_id AND ra.is_active = TRUE
       LEFT JOIN RFID_TAG t ON t.rfid_tag_id = ra.rfid_tag_id
       ${whereClause}
       ORDER BY g.guest_id DESC`,
      params
    );

    res.json(rows);
  } catch (error) {
    console.error("Fetch Guests Error:", error);
    res.status(500).json({ error: "Error fetching guests" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT g.*, r.room_number, t.rfid_tag_id, t.tag_code
       FROM GUEST g
       LEFT JOIN ROOM r ON g.room_id = r.room_id
       LEFT JOIN RFID_ASSIGNMENT ra ON ra.assignee_type = 'GUEST' AND ra.assignee_id = g.guest_id AND ra.is_active = TRUE
       LEFT JOIN RFID_TAG t ON t.rfid_tag_id = ra.rfid_tag_id
       WHERE g.guest_id = ?
       LIMIT 1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Guest not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Fetch Single Guest Error:", error);
    res.status(500).json({ error: "Error fetching guest" });
  }
});

router.post("/checkout/:id", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;

    await connection.beginTransaction();

    const [guestRows] = await connection.query(
      "SELECT guest_id FROM GUEST WHERE guest_id = ?",
      [id]
    );
    if (!guestRows.length) {
      await connection.rollback();
      return res.status(404).json({ error: "Guest not found" });
    }

    await connection.query(
      "UPDATE GUEST SET status = 'CHECKED_OUT', check_out_time = NOW() WHERE guest_id = ?",
      [id]
    );

    await connection.query(
      `UPDATE RFID_ASSIGNMENT
       SET is_active = FALSE, released_at = NOW()
       WHERE assignee_type = 'GUEST' AND assignee_id = ? AND is_active = TRUE`,
      [id]
    );

    await connection.commit();

    res.json({ message: "Guest checked out successfully" });
  } catch (error) {
    await connection.rollback();
    console.error("Checkout Guest Error:", error);
    res.status(500).json({ error: "Error checking out guest" });
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
       WHERE assignee_type = 'GUEST' AND assignee_id = ? AND is_active = TRUE`,
      [id]
    );
    await connection.query("DELETE FROM GUEST WHERE guest_id = ?", [id]);
    await connection.commit();

    res.json({ message: "Guest deleted successfully" });
  } catch (error) {
    await connection.rollback();
    console.error("Delete Guest Error:", error);
    res.status(500).json({ error: "Error deleting guest" });
  } finally {
    connection.release();
  }
});

module.exports = router;
