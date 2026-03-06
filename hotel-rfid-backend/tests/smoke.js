const assert = require("node:assert/strict");

try {
  require("../db");
  require("../routes/guest");
  require("../routes/movement");
  require("../routes/rfid");
  require("../routes/allocation");
  console.log("Backend smoke test passed");
} catch (error) {
  console.error("Backend smoke test failed:", error);
  process.exit(1);
}

assert.ok(true);
