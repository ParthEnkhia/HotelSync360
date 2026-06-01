const express = require("express");
const pool = require("../db");

const router = express.Router();

const parsePositiveInt = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

/* ─────────────────────────────────────────────────────────────────────────
   PROPERTY endpoints
───────────────────────────────────────────────────────────────────────── */

// GET /property/all  — list all properties (active + inactive)
router.get("/all", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT property_id, property_name, address_line1, city, state, country, status, created_at
       FROM PROPERTY
       ORDER BY property_name`
    );
    res.json(rows);
  } catch (err) {
    console.error("List Properties Error:", err);
    res.status(500).json({ error: "Error fetching properties" });
  }
});

// POST /property/create
router.post("/create", async (req, res) => {
  try {
    const { property_name, address_line1, city, state, country, status } = req.body;

    if (!property_name || !property_name.trim()) {
      return res.status(400).json({ error: "property_name is required" });
    }

    const validStatuses = ["ACTIVE", "INACTIVE"];
    const safeStatus = validStatuses.includes(status) ? status : "ACTIVE";

    const [result] = await pool.query(
      `INSERT INTO PROPERTY (property_name, address_line1, city, state, country, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        property_name.trim(),
        address_line1 || null,
        city || null,
        state || null,
        country || null,
        safeStatus,
      ]
    );

    res.status(201).json({ message: "Property created", property_id: result.insertId });
  } catch (err) {
    console.error("Create Property Error:", err);
    res.status(500).json({ error: "Error creating property" });
  }
});

// PUT /property/:id  — update property details
router.put("/:id", async (req, res) => {
  try {
    const propertyId = parsePositiveInt(req.params.id);
    if (!propertyId) return res.status(400).json({ error: "Invalid property id" });

    const { property_name, address_line1, city, state, country, status } = req.body;

    if (!property_name || !property_name.trim()) {
      return res.status(400).json({ error: "property_name is required" });
    }

    const validStatuses = ["ACTIVE", "INACTIVE"];
    const safeStatus = validStatuses.includes(status) ? status : "ACTIVE";

    const [result] = await pool.query(
      `UPDATE PROPERTY
       SET property_name = ?, address_line1 = ?, city = ?, state = ?, country = ?, status = ?
       WHERE property_id = ?`,
      [
        property_name.trim(),
        address_line1 || null,
        city || null,
        state || null,
        country || null,
        safeStatus,
        propertyId,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Property not found" });
    }

    res.json({ message: "Property updated" });
  } catch (err) {
    console.error("Update Property Error:", err);
    res.status(500).json({ error: "Error updating property" });
  }
});

/* ─────────────────────────────────────────────────────────────────────────
   ZONE endpoints  (scoped under a property)
───────────────────────────────────────────────────────────────────────── */

// GET /property/:id/zones
router.get("/:id/zones", async (req, res) => {
  try {
    const propertyId = parsePositiveInt(req.params.id);
    if (!propertyId) return res.status(400).json({ error: "Invalid property id" });

    const [rows] = await pool.query(
      `SELECT zone_id, zone_name, zone_category, created_at
       FROM ZONE
       WHERE property_id = ?
       ORDER BY zone_name`,
      [propertyId]
    );
    res.json(rows);
  } catch (err) {
    console.error("List Zones Error:", err);
    res.status(500).json({ error: "Error fetching zones" });
  }
});

// POST /property/:id/zones
router.post("/:id/zones", async (req, res) => {
  try {
    const propertyId = parsePositiveInt(req.params.id);
    if (!propertyId) return res.status(400).json({ error: "Invalid property id" });

    const { zone_name, zone_category } = req.body;
    if (!zone_name || !zone_name.trim()) {
      return res.status(400).json({ error: "zone_name is required" });
    }

    // Verify property exists
    const [propRows] = await pool.query(
      "SELECT property_id FROM PROPERTY WHERE property_id = ? LIMIT 1",
      [propertyId]
    );
    if (!propRows.length) return res.status(404).json({ error: "Property not found" });

    const [result] = await pool.query(
      `INSERT INTO ZONE (property_id, zone_name, zone_category) VALUES (?, ?, ?)`,
      [propertyId, zone_name.trim(), zone_category || null]
    );

    res.status(201).json({ message: "Zone created", zone_id: result.insertId });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "A zone with that name already exists for this property" });
    }
    console.error("Create Zone Error:", err);
    res.status(500).json({ error: "Error creating zone" });
  }
});

// PUT /property/:id/zones/:zoneId
router.put("/:id/zones/:zoneId", async (req, res) => {
  try {
    const propertyId = parsePositiveInt(req.params.id);
    const zoneId = parsePositiveInt(req.params.zoneId);
    if (!propertyId || !zoneId) return res.status(400).json({ error: "Invalid id" });

    const { zone_name, zone_category } = req.body;
    if (!zone_name || !zone_name.trim()) {
      return res.status(400).json({ error: "zone_name is required" });
    }

    const [result] = await pool.query(
      `UPDATE ZONE SET zone_name = ?, zone_category = ?
       WHERE zone_id = ? AND property_id = ?`,
      [zone_name.trim(), zone_category || null, zoneId, propertyId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Zone not found for this property" });
    }

    res.json({ message: "Zone updated" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "A zone with that name already exists for this property" });
    }
    console.error("Update Zone Error:", err);
    res.status(500).json({ error: "Error updating zone" });
  }
});

// DELETE /property/:id/zones/:zoneId
router.delete("/:id/zones/:zoneId", async (req, res) => {
  try {
    const propertyId = parsePositiveInt(req.params.id);
    const zoneId = parsePositiveInt(req.params.zoneId);
    if (!propertyId || !zoneId) return res.status(400).json({ error: "Invalid id" });

    const [result] = await pool.query(
      `DELETE FROM ZONE WHERE zone_id = ? AND property_id = ?`,
      [zoneId, propertyId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Zone not found for this property" });
    }

    res.json({ message: "Zone deleted" });
  } catch (err) {
    // FK constraint — zone is still referenced by rooms/readers/allocations
    if (err.code === "ER_ROW_IS_REFERENCED_2" || err.code === "ER_ROW_IS_REFERENCED") {
      return res.status(409).json({
        error: "Cannot delete zone — it is still referenced by rooms, readers, or allocations",
      });
    }
    console.error("Delete Zone Error:", err);
    res.status(500).json({ error: "Error deleting zone" });
  }
});

module.exports = router;
