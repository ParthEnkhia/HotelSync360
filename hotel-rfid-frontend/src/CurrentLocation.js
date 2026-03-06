import { useState } from "react";
import api from "./utils/axiosConfig";

function CurrentLocation() {
  const [rfid, setRfid] = useState("");
  const [location, setLocation] = useState(null);

  const getLocation = async () => {
    try {
      const res = await api.get(`/movement/current/${Number(rfid)}`);
      setLocation(res.data);
    } catch (err) {
      setLocation(null);
      const errorMessage = err.response?.data?.error || "Error fetching location";
      alert(errorMessage);
    }
  };

  return (
    <div>
      <h2>Current Location</h2>
      <input placeholder="RFID Tag ID" value={rfid} onChange={(e) => setRfid(e.target.value)} />
      <button onClick={getLocation}>Check</button>

      {location && (
        <div>
          <p>Zone: {location.zone_name}</p>
          <p>Reader: {location.reader_name || "N/A"}</p>
          <p>Time: {location.scan_time}</p>
          <p>Event: {location.event_type}</p>
        </div>
      )}
    </div>
  );
}

export default CurrentLocation;
