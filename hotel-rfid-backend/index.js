const express = require("express");
const cors = require("cors");

const guestRoutes = require("./routes/guest");
const movementRoutes = require("./routes/movement");
const rfidRoutes = require("./routes/rfid");
const allocationRoutes = require("./routes/allocation");

const pool = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

pool
  .getConnection()
  .then((conn) => {
    console.log("Database connected successfully");
    conn.release();
  })
  .catch((err) => console.error("Database connection failed:", err));

app.use("/guest", guestRoutes);
app.use("/movement", movementRoutes);
app.use("/rfid", rfidRoutes);
app.use("/allocation", allocationRoutes);

app.get("/", (req, res) => {
  res.send("Hotel RFID Backend Running");
});

const PORT = Number(process.env.PORT || 5000);
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
