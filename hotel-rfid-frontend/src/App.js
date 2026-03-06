import { useEffect, useState } from "react";
import AddGuest from "./AddGuest";
import ScanRFID from "./ScanRFID";
import CurrentLocation from "./CurrentLocation";
import MovementHistory from "./MovementHistory";
import RFIDManagement from "./RFIDManagement";
import StaffAllocation from "./StaffAllocation";
import api from "./utils/axiosConfig";

function App() {
  const [propertyId, setPropertyId] = useState("1");
  const [connection, setConnection] = useState({ status: "checking", message: "Checking backend..." });

  const checkBackend = async () => {
    setConnection({ status: "checking", message: "Checking backend..." });
    try {
      const res = await api.get("/");
      setConnection({
        status: "online",
        message: typeof res.data === "string" ? res.data : "Backend is online",
      });
    } catch (error) {
      setConnection({ status: "offline", message: "Backend is offline or unreachable" });
    }
  };

  useEffect(() => {
    checkBackend();
  }, []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>HotelSync360 - RFID Tracker</h1>
        <div className="toolbar">
          <label htmlFor="propertyId">Active Property ID</label>
          <input
            id="propertyId"
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="1"
          />
          <button onClick={checkBackend}>Refresh Backend Status</button>
        </div>
        <div className={`status-badge ${connection.status}`}>
          {connection.message}
        </div>
      </header>

      <section className="panel"><RFIDManagement /></section>
      <section className="panel"><StaffAllocation propertyId={propertyId} /></section>
      <section className="panel"><AddGuest propertyId={propertyId} /></section>
      <section className="panel"><ScanRFID /></section>
      <section className="panel"><CurrentLocation /></section>
      <section className="panel"><MovementHistory /></section>
    </div>
  );
}

export default App;
