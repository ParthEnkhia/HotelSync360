import { useState } from "react";
import api from "./utils/axiosConfig";

function AddGuest({ propertyId, rooms = [], availableGuestTags = [], onDataChanged, setToast }) {
  const [form, setForm] = useState({ name: "", phone: "", room_id: "", rfid_tag_id: "" });
  const [busy, setBusy] = useState(false);

  const update = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!propertyId) { setToast({ type: "warning", message: "Select a property from the top bar first." }); return; }
    if (!form.name.trim()) { setToast({ type: "error", message: "Guest name is required." }); return; }
    if (!form.room_id)     { setToast({ type: "error", message: "Please select a room." }); return; }
    if (!form.rfid_tag_id) { setToast({ type: "error", message: "Please select an RFID tag." }); return; }

    try {
      setBusy(true);
      await api.post("/guest/add", {
        property_id:  Number(propertyId),
        name:         form.name.trim(),
        phone:        form.phone.trim() || null,
        room_id:      Number(form.room_id),
        rfid_tag_id:  Number(form.rfid_tag_id),
      });
      setToast({ type: "success", message: `Guest "${form.name.trim()}" checked in successfully.` });
      setForm({ name: "", phone: "", room_id: "", rfid_tag_id: "" });
      if (onDataChanged) await onDataChanged();
    } catch (err) {
      setToast({ type: "error", message: err.response?.data?.error || "Failed to add guest." });
    } finally {
      setBusy(false);
    }
  };

  if (!propertyId) {
    return <EmptyState icon="🛎️" message="Select a property from the top bar to check in guests." />;
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <SectionHeader title="Guest Check-In" description="Register a new guest and assign them a room and RFID access tag." />

      <div className="form-grid">
        <div className="field-group">
          <label className="field-label" htmlFor="guest-name">Full Name <Required /></label>
          <input id="guest-name" type="text" autoComplete="off"
            value={form.name} onChange={(e) => update("name", e.target.value)} />
        </div>
        <div className="field-group">
          <label className="field-label" htmlFor="guest-phone">Phone Number</label>
          <input id="guest-phone" type="tel" autoComplete="off"
            value={form.phone} onChange={(e) => update("phone", e.target.value)} />
        </div>
        <div className="field-group">
          <label className="field-label" htmlFor="guest-room">Room <Required /></label>
          <select id="guest-room" value={form.room_id} onChange={(e) => update("room_id", e.target.value)}>
            <option value="">Select room</option>
            {rooms.map((r) => (
              <option key={r.room_id} value={r.room_id}>
                Room {r.room_number}{r.room_type ? ` — ${r.room_type}` : ""}
              </option>
            ))}
          </select>
          {rooms.length === 0 && <span className="field-hint">No rooms available for this property.</span>}
        </div>
        <div className="field-group">
          <label className="field-label" htmlFor="guest-tag">RFID Tag <Required /></label>
          <select id="guest-tag" value={form.rfid_tag_id} onChange={(e) => update("rfid_tag_id", e.target.value)}>
            <option value="">Select tag</option>
            {availableGuestTags.map((t) => (
              <option key={t.rfid_tag_id} value={t.rfid_tag_id}>{t.tag_code}</option>
            ))}
          </select>
          {availableGuestTags.length === 0 && (
            <span className="field-hint">No unassigned guest tags. Create one in RFID Tags.</span>
          )}
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" disabled={busy}>
          {busy ? "Checking in…" : "Check In Guest"}
        </button>
      </div>
    </form>
  );
}

function SectionHeader({ title, description }) {
  return (
    <div className="section-header">
      <h2 className="section-title">{title}</h2>
      {description && <p className="section-desc">{description}</p>}
    </div>
  );
}

function Required() {
  return <span style={{ color: "var(--brand)", marginLeft: 2 }}>*</span>;
}

function EmptyState({ icon, message }) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon">{icon}</span>
      <p className="empty-state__message">{message}</p>
    </div>
  );
}

export default AddGuest;
