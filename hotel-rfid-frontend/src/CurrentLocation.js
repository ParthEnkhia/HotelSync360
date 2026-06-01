import { useState } from "react";
import api from "./utils/axiosConfig";

function CurrentLocation({ propertyId, tags = [], setToast }) {
  const [rfid, setRfid]         = useState("");
  const [location, setLocation] = useState(null);
  const [busy, setBusy]         = useState(false);
  const [searched, setSearched] = useState(false);

  const handleCheck = async (e) => {
    e.preventDefault();
    if (!propertyId) { setToast({ type: "warning", message: "Select a property from the top bar first." }); return; }
    if (!rfid)       { setToast({ type: "error",   message: "Select an RFID tag to look up." }); return; }

    try {
      setBusy(true);
      setSearched(false);
      const res = await api.get(`/movement/current/${Number(rfid)}`, {
        params: { property_id: Number(propertyId) },
      });
      setLocation(res.data);
      setSearched(true);
    } catch (err) {
      setLocation(null);
      setSearched(true);
      if (err.response?.status !== 404) {
        setToast({ type: "error", message: err.response?.data?.error || "Failed to fetch location." });
      }
    } finally {
      setBusy(false);
    }
  };

  const selectedTag = tags.find((t) => String(t.rfid_tag_id) === String(rfid));

  if (!propertyId) {
    return <EmptyState icon="📍" message="Select a property from the top bar to track RFID tags." />;
  }

  return (
    <div>
      <SectionHeader
        title="Current Location"
        description="Look up the last recorded location of any active RFID tag."
      />

      <form onSubmit={handleCheck} className="lookup-form">
        <div className="field-group" style={{ flex: 1 }}>
          <label className="field-label" htmlFor="cl-tag">RFID Tag</label>
          <select id="cl-tag" value={rfid} onChange={(e) => { setRfid(e.target.value); setLocation(null); setSearched(false); }}>
            <option value="">Select a tag</option>
            {tags.map((t) => (
              <option key={t.rfid_tag_id} value={t.rfid_tag_id}>
                {t.tag_code}{t.assignee_name ? ` — ${t.assignee_name}` : ""}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={busy || !rfid} style={{ alignSelf: "flex-end", marginBottom: 4 }}>
          {busy ? "Locating…" : "Find Location"}
        </button>
      </form>

      {searched && !location && (
        <div className="result-card result-card--empty">
          <span style={{ fontSize: 28 }}>📭</span>
          <p>No movement recorded for this tag yet.</p>
        </div>
      )}

      {location && (
        <div className="result-card">
          <div className="result-card__header">
            <span className="result-card__icon">📍</span>
            <div>
              <div className="result-card__title">{location.zone_name || "Unknown Zone"}</div>
              {selectedTag && (
                <div className="result-card__sub">
                  {selectedTag.tag_code}
                  {selectedTag.assignee_name ? ` · ${selectedTag.assignee_name}` : ""}
                </div>
              )}
            </div>
            <span className={`event-badge event-badge--${(location.event_type || "").toLowerCase()}`}>
              {location.event_type}
            </span>
          </div>
          <div className="result-card__meta">
            <MetaItem label="Reader"    value={location.reader_name || "—"} />
            <MetaItem label="Last seen" value={formatDateTime(location.scan_time)} />
            <MetaItem label="Event"     value={location.event_type} />
          </div>
        </div>
      )}
    </div>
  );
}

function MetaItem({ label, value }) {
  return (
    <div className="meta-item">
      <span className="meta-item__label">{label}</span>
      <span className="meta-item__value">{value}</span>
    </div>
  );
}

function formatDateTime(raw) {
  if (!raw) return "—";
  try {
    return new Date(raw).toLocaleString(undefined, {
      dateStyle: "medium", timeStyle: "short",
    });
  } catch { return raw; }
}

function SectionHeader({ title, description }) {
  return (
    <div className="section-header">
      <h2 className="section-title">{title}</h2>
      {description && <p className="section-desc">{description}</p>}
    </div>
  );
}

function EmptyState({ icon, message }) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon">{icon}</span>
      <p className="empty-state__message">{message}</p>
    </div>
  );
}

export default CurrentLocation;
