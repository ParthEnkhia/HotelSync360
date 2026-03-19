import { useState } from "react";
import api from "./utils/axiosConfig";

function CurrentLocation({ propertyId, tags = [] }) {
  const [rfid, setRfid] = useState("");
  const [location, setLocation] = useState(null);

  const getLocation = async () => {
    if (!propertyId || !rfid) {
      alert("Select a property and RFID tag first");
      return;
    }

    try {
      const res = await api.get(`/movement/current/${Number(rfid)}`, {
        params: { property_id: Number(propertyId) },
      });
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
      <select value={rfid} onChange={(e) => setRfid(e.target.value)}>
        <option value="">Select RFID Tag</option>
        {tags.map((tag) => (
          <option key={tag.rfid_tag_id} value={tag.rfid_tag_id}>
            {tag.tag_code}
            {tag.assignee_name ? ` - ${tag.assignee_name}` : ""}
          </option>
        ))}
      </select>
      <button onClick={getLocation} disabled={!propertyId || !rfid}>Check</button>

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
