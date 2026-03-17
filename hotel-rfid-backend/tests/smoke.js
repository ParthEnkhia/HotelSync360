const assert = require("node:assert/strict");

try {
  require("../db");
  const backend = require("../index");
  require("../routes/guest");
  require("../routes/movement");
  require("../routes/rfid");
  require("../routes/allocation");
  require("../routes/auth");
  assert.ok(backend.app, "App should be exported");
  assert.equal(typeof backend.startServer, "function", "startServer should be exported");
  console.log("Backend smoke test passed");
} catch (error) {
  console.error("Backend smoke test failed:", error);
  process.exit(1);
}
