import { useState } from "react";
import api from "./utils/axiosConfig";

function ScanRFID({ tags = [], readers = [] }) {
  const [tag, setTag] = useState("");
  const [reader, setReader] = useState("");
  const [eventType, setEventType] = useState("PING");

  const handleScan = async () => {
    if (!tag || !reader) {
      alert("Select both an RFID tag and a reader");
      return;
    }

    try {
      await api.post("/movement/scan", {
        rfid_tag_id: Number(tag),
        reader_id: Number(reader),
        event_type: eventType,
      });
      alert("Scan recorded");
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Scan failed";
      alert(errorMessage);
    }
  };

  return (
    <div>
      <h2>Simulate RFID Scan</h2>
      <div className="grid-3">
        <select value={tag} onChange={(e) => setTag(e.target.value)}>
          <option value="">Select RFID Tag</option>
          {tags.map((rfidTag) => (
            <option key={rfidTag.rfid_tag_id} value={rfidTag.rfid_tag_id}>
              {rfidTag.tag_code}
              {rfidTag.assignee_name ? ` - ${rfidTag.assignee_name}` : ""}
            </option>
          ))}
        </select>
        <select value={reader} onChange={(e) => setReader(e.target.value)}>
          <option value="">Select Reader</option>
          {readers.map((rfidReader) => (
            <option key={rfidReader.reader_id} value={rfidReader.reader_id}>
              {rfidReader.reader_name || `Reader ${rfidReader.reader_id}`}
            </option>
          ))}
        </select>
        <select value={eventType} onChange={(e) => setEventType(e.target.value)}>
          <option value="PING">PING</option>
          <option value="ENTRY">ENTRY</option>
          <option value="EXIT">EXIT</option>
        </select>
      </div>
      <button onClick={handleScan}>Scan</button>
    </div>
  );
}

export default ScanRFID;
