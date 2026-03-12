const express = require("express");
const cors = require("cors");

const guestRoutes = require("./routes/guest");
const movementRoutes = require("./routes/movement");
const rfidRoutes = require("./routes/rfid");
const allocationRoutes = require("./routes/allocation");
const authRoutes = require("./routes/auth");
const authMiddleware = require("./middleware/authMiddleware");

const pool = require("./db");

const app = express();

const defaultCorsOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const configuredOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = configuredOrigins.length
  ? configuredOrigins
  : defaultCorsOrigins;

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true); // non-browser clients (curl/postman)
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
  })
);
app.use(express.json());

pool
  .getConnection()
  .then((conn) => {
    console.log("Database connected successfully");
    conn.release();
  })
  .catch((err) => console.error("Database connection failed:", err));

app.use("/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Hotel RFID Backend Running");
});

const authRequired =
  String(process.env.AUTH_REQUIRED || "").toLowerCase() === "true";
if (authRequired) {
  app.use(authMiddleware);
}

app.use("/guest", guestRoutes);
app.use("/movement", movementRoutes);
app.use("/rfid", rfidRoutes);
app.use("/allocation", allocationRoutes);

// Ensure CORS rejections return JSON (instead of default HTML error page)
app.use((err, req, res, next) => {
  if (err && err.message === "Not allowed by CORS") {
    return res.status(403).json({ error: "CORS blocked" });
  }
  return next(err);
});

const PORT = Number(process.env.PORT || 5000);
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
