import { useState } from "react";
import api from "./utils/axiosConfig";

function AddGuest({ propertyId, rooms = [], availableGuestTags = [], onDataChanged }) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    room_id: "",
    rfid_tag_id: "",
  });
  const [busy, setBusy] = useState(false);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!propertyId) {
      alert("Select a property first");
      return;
    }

    if (!form.name || !form.room_id || !form.rfid_tag_id) {
      alert("Name, room number and guest RFID tag are required");
      return;
    }

    try {
      setBusy(true);
      await api.post("/guest/add", {
        property_id: Number(propertyId),
        name: form.name,
        phone: form.phone || null,
        room_id: Number(form.room_id),
        rfid_tag_id: Number(form.rfid_tag_id),
      });
      alert("Guest added successfully");
      setForm({ name: "", phone: "", room_id: "", rfid_tag_id: "" });
      if (onDataChanged) {
        await onDataChanged();
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Error adding guest";
      alert(errorMessage);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h2>Add Guest</h2>
      {!propertyId ? <p>Select a property to add a guest.</p> : null}
      <div className="grid-2">
        <input placeholder="Name" value={form.name} onChange={(e) => updateField("name", e.target.value)} />
        <input placeholder="Phone" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
        <select value={form.room_id} onChange={(e) => updateField("room_id", e.target.value)}>
          <option value="">Select Room</option>
          {rooms.map((room) => (
            <option key={room.room_id} value={room.room_id}>
              {room.room_number}{room.room_type ? ` - ${room.room_type}` : ""}
            </option>
          ))}
        </select>
        <select value={form.rfid_tag_id} onChange={(e) => updateField("rfid_tag_id", e.target.value)}>
          <option value="">Select Guest RFID Tag</option>
          {availableGuestTags.map((tag) => (
            <option key={tag.rfid_tag_id} value={tag.rfid_tag_id}>
              {tag.tag_code}
            </option>
          ))}
        </select>
      </div>
      <button onClick={handleSubmit} disabled={busy || !propertyId}>
        {busy ? "Saving..." : "Submit"}
      </button>
    </div>
  );
}

export default AddGuest;
