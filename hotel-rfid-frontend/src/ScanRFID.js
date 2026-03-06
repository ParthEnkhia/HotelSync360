import { useState } from "react";
import api from "./utils/axiosConfig";

function ScanRFID() {
  const [tag, setTag] = useState("");
  const [reader, setReader] = useState("");

  const handleScan = async () => {
    try {
      await api.post("/movement/scan", {
        rfid_tag_id: Number(tag),
        reader_id: Number(reader),
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
      <input placeholder="RFID Tag ID" value={tag} onChange={(e) => setTag(e.target.value)} />
      <input placeholder="Reader ID" value={reader} onChange={(e) => setReader(e.target.value)} />
      <button onClick={handleScan}>Scan</button>
    </div>
  );
}

export default ScanRFID;
