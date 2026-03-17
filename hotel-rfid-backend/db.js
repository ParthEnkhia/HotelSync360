const mysql = require("mysql2/promise");
require("dotenv").config();

const dbStatus = {
  healthy: false,
  lastCheckedAt: null,
  lastError: null,
};

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "hotel_movement_tracker",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

const toDatabaseErrorDetails = (error) => {
  if (!error) {
    return null;
  }

  return {
    code: error.code || "UNKNOWN_DB_ERROR",
    message: error.message || "Unknown database error",
  };
};

async function refreshDatabaseStatus() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();

    dbStatus.healthy = true;
    dbStatus.lastCheckedAt = new Date().toISOString();
    dbStatus.lastError = null;
    return { ...dbStatus };
  } catch (error) {
    dbStatus.healthy = false;
    dbStatus.lastCheckedAt = new Date().toISOString();
    dbStatus.lastError = toDatabaseErrorDetails(error);
    throw error;
  }
}

function getDatabaseStatus() {
  return { ...dbStatus };
}

function isDatabaseError(error) {
  const databaseErrorCodes = new Set([
    "ECONNREFUSED",
    "ER_ACCESS_DENIED_ERROR",
    "ER_BAD_DB_ERROR",
    "PROTOCOL_CONNECTION_LOST",
    "ETIMEDOUT",
  ]);

  return Boolean(error && databaseErrorCodes.has(error.code));
}

module.exports = pool;
module.exports.refreshDatabaseStatus = refreshDatabaseStatus;
module.exports.getDatabaseStatus = getDatabaseStatus;
module.exports.isDatabaseError = isDatabaseError;
