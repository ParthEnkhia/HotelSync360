const express = require("express");
const cors = require("cors");

const guestRoutes = require("./routes/guest");
const movementRoutes = require("./routes/movement");
const rfidRoutes = require("./routes/rfid");
const allocationRoutes = require("./routes/allocation");
const authRoutes = require("./routes/auth");
const referenceRoutes = require("./routes/reference");
const authMiddleware = require("./middleware/authMiddleware");

const {
  refreshDatabaseStatus,
  getDatabaseStatus,
  isDatabaseError,
} = require("./db");

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

app.use("/auth", authRoutes);

app.get("/", (req, res) => {
  const database = getDatabaseStatus();
  res.json({
    message: "Hotel RFID Backend Running",
    auth_required: authRequired,
    database_healthy: database.healthy,
  });
});

app.get("/health", async (req, res) => {
  try {
    await refreshDatabaseStatus();
  } catch (error) {
    // Health route reports degraded state instead of throwing a generic 500.
  }

  const database = getDatabaseStatus();
  const status = database.healthy ? "ok" : "degraded";

  res.status(database.healthy ? 200 : 503).json({
    status,
    service: "hotel-rfid-backend",
    auth_required: authRequired,
    uptime_seconds: Math.round(process.uptime()),
    database,
    checked_at: new Date().toISOString(),
  });
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
app.use("/reference", referenceRoutes);

// Ensure CORS rejections return JSON (instead of default HTML error page)
app.use((err, req, res, next) => {
  if (err && err.message === "Not allowed by CORS") {
    return res.status(403).json({ error: "CORS blocked" });
  }
  if (isDatabaseError(err)) {
    return res.status(503).json({
      error: "Database unavailable",
      details: getDatabaseStatus().lastError || {
        code: err.code || "UNKNOWN_DB_ERROR",
        message: err.message || "Database connection failed",
      },
    });
  }
  return next(err);
});

const PORT = Number(process.env.PORT || 5000);

async function startServer() {
  try {
    await refreshDatabaseStatus();
    console.log("Database connected successfully");
  } catch (err) {
    console.error("Database connection failed:", err);
  }

  return app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
