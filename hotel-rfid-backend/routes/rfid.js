const express = require("express");
const { randomInt } = require("crypto");
const pool = require("../db");

const router = express.Router();

async function generateUniqueTagCode(connection, maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i += 1) {
    const generatedCode = String(randomInt(10000000, 100000000));
    const [existingRows] = await connection.query(
      "SELECT rfid_tag_id FROM RFID_TAG WHERE tag_code = ? LIMIT 1",
      [generatedCode]
    );

    if (!existingRows.length) {
      return generatedCode;
    }
  }

  throw new Error("Unable to generate unique RFID code");
}

router.post("/create", async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { tag_type, tag_code } = req.body;

    if (!tag_type) {
      return res.status(400).json({ error: "tag_type is required" });
    }

    if (!["GUEST", "STAFF"].includes(tag_type)) {
      return res.status(400).json({ error: "tag_type must be GUEST or STAFF" });
    }

    let finalTagCode = (tag_code || "").toString().trim();
    if (!finalTagCode) {
      finalTagCode = await generateUniqueTagCode(connection);
    }

    const [result] = await connection.query(
      "INSERT INTO RFID_TAG (tag_code, tag_type, is_active) VALUES (?, ?, TRUE)",
      [finalTagCode, tag_type]
    );

    res.json({
      message: "RFID tag created",
      rfid_tag_id: result.insertId,
      tag_code: finalTagCode,
    });
  } catch (error) {
    console.error("Create RFID Error:", error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ error: "tag_code already exists" });
    }
    res.status(500).json({ error: "Error creating RFID tag" });
  } finally {
    connection.release();
  }
});

router.get("/all", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.rfid_tag_id, t.tag_code, t.tag_type, t.is_active,
              ra.assignee_type, ra.assignee_id, ra.assigned_at
       FROM RFID_TAG t
       LEFT JOIN RFID_ASSIGNMENT ra ON ra.rfid_tag_id = t.rfid_tag_id AND ra.is_active = TRUE
       ORDER BY t.rfid_tag_id DESC`
    );

    res.json(rows);
  } catch (error) {
    console.error("Fetch RFID Error:", error);
    res.status(500).json({ error: "Error fetching RFID tags" });
  }
});

router.post("/assign", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { rfid_tag_id, assignee_type, assignee_id } = req.body;

    if (!rfid_tag_id || !assignee_type || !assignee_id) {
      return res.status(400).json({ error: "rfid_tag_id, assignee_type, assignee_id are required" });
    }

    if (!["GUEST", "STAFF"].includes(assignee_type)) {
      return res.status(400).json({ error: "assignee_type must be GUEST or STAFF" });
    }

    await connection.beginTransaction();

    const [tagRows] = await connection.query(
      "SELECT tag_type, is_active FROM RFID_TAG WHERE rfid_tag_id = ?",
      [rfid_tag_id]
    );
    if (!tagRows.length) {
      await connection.rollback();
      return res.status(404).json({ error: "RFID tag not found" });
    }
    if (tagRows[0].tag_type !== assignee_type) {
      await connection.rollback();
      return res.status(400).json({ error: "RFID tag type mismatch" });
    }
    if (!tagRows[0].is_active) {
      await connection.rollback();
      return res.status(400).json({ error: "RFID tag is inactive" });
    }

    const entityTable = assignee_type === "GUEST" ? "GUEST" : "STAFF";
    const entityColumn = assignee_type === "GUEST" ? "guest_id" : "staff_id";
    const [entityRows] = await connection.query(
      `SELECT ${entityColumn} FROM ${entityTable} WHERE ${entityColumn} = ? LIMIT 1`,
      [assignee_id]
    );
    if (!entityRows.length) {
      await connection.rollback();
      return res.status(404).json({ error: `${assignee_type} not found` });
    }

    const [activeTagAssignments] = await connection.query(
      `SELECT assignment_id, assignee_type, assignee_id
       FROM RFID_ASSIGNMENT
       WHERE rfid_tag_id = ? AND is_active = TRUE
       LIMIT 1
       FOR UPDATE`,
      [rfid_tag_id]
    );

    if (
      activeTagAssignments.length &&
      activeTagAssignments[0].assignee_type === assignee_type &&
      Number(activeTagAssignments[0].assignee_id) === Number(assignee_id)
    ) {
      await connection.commit();
      return res.json({ message: "RFID already assigned to this assignee" });
    }

    await connection.query(
      `UPDATE RFID_ASSIGNMENT
       SET is_active = FALSE, released_at = NOW()
       WHERE assignee_type = ? AND assignee_id = ? AND is_active = TRUE`,
      [assignee_type, assignee_id]
    );

    await connection.query(
      `UPDATE RFID_ASSIGNMENT
       SET is_active = FALSE, released_at = NOW()
       WHERE rfid_tag_id = ? AND is_active = TRUE`,
      [rfid_tag_id]
    );

    await connection.query(
      `INSERT INTO RFID_ASSIGNMENT (rfid_tag_id, assignee_type, assignee_id, assigned_at, is_active)
       VALUES (?, ?, ?, NOW(), TRUE)`,
      [rfid_tag_id, assignee_type, assignee_id]
    );

    await connection.commit();
    res.json({ message: "RFID assigned successfully" });
  } catch (error) {
    await connection.rollback();
    console.error("Assign RFID Error:", error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ error: "RFID tag or assignee already has active assignment" });
    }
    res.status(500).json({ error: "Error assigning RFID" });
  } finally {
    connection.release();
  }
});

router.post("/release", async (req, res) => {
  try {
    const { rfid_tag_id } = req.body;
    if (!rfid_tag_id) {
      return res.status(400).json({ error: "rfid_tag_id is required" });
    }

    const [result] = await pool.query(
      `UPDATE RFID_ASSIGNMENT
       SET is_active = FALSE, released_at = NOW()
       WHERE rfid_tag_id = ? AND is_active = TRUE`,
      [rfid_tag_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "No active assignment found for this tag" });
    }

    res.json({ message: "RFID released successfully" });
  } catch (error) {
    console.error("Release RFID Error:", error);
    res.status(500).json({ error: "Error releasing RFID" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [activeRows] = await pool.query(
      "SELECT assignment_id FROM RFID_ASSIGNMENT WHERE rfid_tag_id = ? AND is_active = TRUE LIMIT 1",
      [id]
    );

    if (activeRows.length) {
      return res.status(400).json({ error: "Cannot deactivate RFID with active assignment" });
    }

    const [result] = await pool.query(
      "UPDATE RFID_TAG SET is_active = FALSE WHERE rfid_tag_id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "RFID tag not found" });
    }

    res.json({ message: "RFID tag deactivated" });
  } catch (error) {
    console.error("Deactivate RFID Error:", error);
    res.status(500).json({ error: "Error deactivating RFID tag" });
  }
});

module.exports = router;
