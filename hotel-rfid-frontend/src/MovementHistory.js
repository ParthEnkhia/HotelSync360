import { useState } from "react";
import api from "./utils/axiosConfig";

function MovementHistory({ propertyId = "1" }) {
  const [rfid, setRfid] = useState("");
  const [history, setHistory] = useState([]);

  const fetchHistory = async () => {
    try {
      const res = await api.get(`/movement/history/${Number(rfid)}`, {
        params: { property_id: Number(propertyId || 1) },
      });
      setHistory(res.data);
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Error fetching history";
      alert(errorMessage);
    }
  };

  return (
    <div>
      <h2>Movement History</h2>
      <p>Property ID: <strong>{propertyId || "1"}</strong></p>
      <input placeholder="RFID Tag ID" value={rfid} onChange={(e) => setRfid(e.target.value)} />
      <button onClick={fetchHistory}>Get History</button>

      <table border="1" style={{ marginTop: "10px" }}>
        <thead>
          <tr>
            <th>Zone</th>
            <th>Reader</th>
            <th>Event</th>
            <th>Scan Time</th>
          </tr>
        </thead>
        <tbody>
          {history.map((item, index) => (
            <tr key={index}>
              <td>{item.zone_name}</td>
              <td>{item.reader_name || "N/A"}</td>
              <td>{item.event_type}</td>
              <td>{item.scan_time}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default MovementHistory;
