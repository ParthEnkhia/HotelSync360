const { Pool } = require("pg");
const dotenv = require("dotenv");

dotenv.config();
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: ".env.example" });
}

const dbStatus = {
  healthy: false,
  lastCheckedAt: null,
  lastError: null,
};

function toPgPlaceholders(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

function ensureReturning(sql) {
  const trimmed = sql.trim();
  if (!/^INSERT\s+/i.test(trimmed)) {
    return trimmed;
  }
  if (/\bRETURNING\b/i.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed} RETURNING *`;
}

function extractInsertId(row) {
  if (!row) {
    return undefined;
  }

  const priority = [
    "guest_id",
    "property_id",
    "zone_id",
    "rfid_tag_id",
    "allocation_id",
    "assignment_id",
    "admin_id",
    "staff_id",
    "reader_id",
    "movement_id",
    "task_id",
    "room_id",
  ];

  for (const key of priority) {
    if (row[key] !== undefined && row[key] !== null) {
      return row[key];
    }
  }

  const idKeys = Object.keys(row).filter((key) => key.endsWith("_id"));
  return idKeys.length ? row[idKeys[0]] : undefined;
}

function toQueryResult(result) {
  const rows = result.rows || [];
  const meta = {
    affectedRows: result.rowCount ?? 0,
    insertId: extractInsertId(rows[0]),
  };

  return [rows, meta];
}

class PgConnection {
  constructor(client) {
    this.client = client;
  }

  async query(sql, params = []) {
    const pgSql = toPgPlaceholders(ensureReturning(sql));
    const result = await this.client.query(pgSql, params);
    return toQueryResult(result);
  }

  async beginTransaction() {
    await this.client.query("BEGIN");
  }

  async commit() {
    await this.client.query("COMMIT");
  }

  async rollback() {
    await this.client.query("ROLLBACK");
  }

  release() {
    this.client.release();
  }
}

const poolConfig = {
  max: Number(process.env.DB_POOL_SIZE || 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

if (process.env.DATABASE_URL) {
  poolConfig.connectionString = process.env.DATABASE_URL;
  if (process.env.DATABASE_URL.includes("neon.tech")) {
    poolConfig.ssl = { rejectUnauthorized: false };
  }
} else {
  poolConfig.host = process.env.DB_HOST || "localhost";
  poolConfig.port = Number(process.env.DB_PORT || 5432);
  poolConfig.user = process.env.DB_USER || "postgres";
  poolConfig.password = process.env.DB_PASSWORD || "";
  poolConfig.database = process.env.DB_NAME || "neondb";
}

const pgPool = new Pool(poolConfig);

const pool = {
  async query(sql, params = []) {
    const pgSql = toPgPlaceholders(ensureReturning(sql));
    const result = await pgPool.query(pgSql, params);
    return toQueryResult(result);
  },

  async getConnection() {
    const client = await pgPool.connect();
    return new PgConnection(client);
  },
};

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
    await pgPool.query("SELECT 1");

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
    "ETIMEDOUT",
    "ENOTFOUND",
    "57P01",
    "57P02",
    "57P03",
    "08000",
    "08003",
    "08006",
    "28P01",
    "3D000",
  ]);

  return Boolean(error && databaseErrorCodes.has(error.code));
}

module.exports = pool;
module.exports.refreshDatabaseStatus = refreshDatabaseStatus;
module.exports.getDatabaseStatus = getDatabaseStatus;
module.exports.isDatabaseError = isDatabaseError;
