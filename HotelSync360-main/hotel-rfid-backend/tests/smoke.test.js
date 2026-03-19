const test = require("node:test");
const assert = require("node:assert/strict");

test("route modules load", async () => {
  assert.doesNotThrow(() => require("../routes/guest"));
  assert.doesNotThrow(() => require("../routes/staff"));
  assert.doesNotThrow(() => require("../routes/movement"));
  assert.doesNotThrow(() => require("../routes/rfid"));
  assert.doesNotThrow(() => require("../routes/allocation"));
});

test("db pool module loads", async () => {
  const pool = require("../db");
  assert.ok(pool, "pool should be defined");
});
