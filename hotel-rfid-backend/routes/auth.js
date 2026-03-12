const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const router = express.Router();

let didWarnMissingJwtSecret = false;
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret && !didWarnMissingJwtSecret) {
    didWarnMissingJwtSecret = true;
    console.warn(
      "JWT_SECRET is not set. Falling back to an insecure default; set JWT_SECRET in the environment."
    );
  }
  return secret || "supersecretkey";
}

// Register Admin
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "name, email, password are required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      "INSERT INTO ADMIN (name, email, password) VALUES (?, ?, ?)",
      [name, email, hashedPassword]
    );

    res.json({ message: "Admin registered successfully" });
  } catch (error) {
    if (error && error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Email already registered" });
    }
    res.status(500).json({ error: "Registration failed" });
  }
});

// Login Admin
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const [rows] = await pool.query(
      "SELECT * FROM ADMIN WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: "Admin not found" });
    }

    const admin = rows[0];

    const validPassword = await bcrypt.compare(password, admin.password);

    if (!validPassword) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { admin_id: admin.admin_id },
      getJwtSecret(),
      { expiresIn: "1h" }
    );

    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});

module.exports = router;
