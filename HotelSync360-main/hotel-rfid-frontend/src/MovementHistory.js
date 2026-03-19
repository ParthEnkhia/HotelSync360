import { useState } from "react";
import api from "./utils/axiosConfig";

function MovementHistory({ propertyId, tags = [] }) {
  const [rfid, setRfid] = useState("");
  const [history, setHistory] = useState([]);

  const fetchHistory = async () => {
    if (!propertyId || !rfid) {
      alert("Select a property and RFID tag first");
      return;
    }

    try {
      const res = await api.get(`/movement/history/${Number(rfid)}`, {
        params: { property_id: Number(propertyId) },
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
      <select value={rfid} onChange={(e) => setRfid(e.target.value)}>
        <option value="">Select RFID Tag</option>
        {tags.map((tag) => (
          <option key={tag.rfid_tag_id} value={tag.rfid_tag_id}>
            {tag.tag_code}
            {tag.assignee_name ? ` - ${tag.assignee_name}` : ""}
          </option>
        ))}
      </select>
      <button onClick={fetchHistory} disabled={!propertyId || !rfid}>Get History</button>

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
