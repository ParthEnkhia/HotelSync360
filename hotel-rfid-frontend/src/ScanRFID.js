import { useState } from "react";
import api from "./utils/axiosConfig";

const EVENT_TYPES = [
  { value: "ENTRY", label: "Entry",  desc: "Tag entered a zone",   color: "#6ee7b7" },
  { value: "EXIT",  label: "Exit",   desc: "Tag exited a zone",    color: "#f87171" },
  { value: "PING",  label: "Ping",   desc: "Periodic presence check", color: "#93c5fd" },
];

function ScanRFID({ tags = [], readers = [], setToast }) {
  const [tag,       setTag]       = useState("");
  const [reader,    setReader]    = useState("");
  const [eventType, setEventType] = useState("ENTRY");
  const [busy,      setBusy]      = useState(false);
  const [lastScan,  setLastScan]  = useState(null);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!tag)    { setToast({ type: "error", message: "Select an RFID tag." });   return; }
    if (!reader) { setToast({ type: "error", message: "Select a reader." }); return; }

    try {
      setBusy(true);
      await api.post("/movement/scan", {
        rfid_tag_id: Number(tag),
        reader_id:   Number(reader),
        event_type:  eventType,
      });
      const selectedTag    = tags.find((t) => String(t.rfid_tag_id) === String(tag));
      const selectedReader = readers.find((r) => String(r.reader_id) === String(reader));
      setLastScan({
        tag:    selectedTag,
        reader: selectedReader,
        event:  eventType,
        time:   new Date(),
      });
      setToast({ type: "success", message: `${eventType} event recorded for ${selectedTag?.tag_code || "tag"}.` });
    } catch (err) {
      setToast({ type: "error", message: err.response?.data?.error || "Scan failed." });
    } finally {
      setBusy(false);
    }
  };

  if (tags.length === 0 || readers.length === 0) {
    return (
      <EmptyState
        icon="📡"
        message={
          tags.length === 0
            ? "No active RFID tags found. Assign tags to guests or staff first."
            : "No RFID readers configured for this property."
        }
      />
    );
  }

  return (
    <div>
      <SectionHeader
        title="Simulate RFID Scan"
        description="Record a manual scan event — useful for testing and demonstrations."
      />

      <form onSubmit={handleScan}>
        {/* Event type selector */}
        <div className="field-group" style={{ marginBottom: 20 }}>
          <label className="field-label">Event Type</label>
          <div className="event-type-grid">
            {EVENT_TYPES.map((et) => (
              <button
                key={et.value}
                type="button"
                onClick={() => setEventType(et.value)}
                className={`event-type-btn${eventType === et.value ? " event-type-btn--active" : ""}`}
                style={eventType === et.value ? {
                  borderColor: et.color,
                  background: `${et.color}18`,
                  color: et.color,
                } : {}}
              >
                <span className="event-type-btn__label">{et.label}</span>
                <span className="event-type-btn__desc">{et.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="form-grid">
          <div className="field-group">
            <label className="field-label" htmlFor="scan-tag">RFID Tag</label>
            <select id="scan-tag" value={tag} onChange={(e) => setTag(e.target.value)}>
              <option value="">Select tag</option>
              {tags.map((t) => (
                <option key={t.rfid_tag_id} value={t.rfid_tag_id}>
                  {t.tag_code}{t.assignee_name ? ` — ${t.assignee_name}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="scan-reader">Reader</label>
            <select id="scan-reader" value={reader} onChange={(e) => setReader(e.target.value)}>
              <option value="">Select reader</option>
              {readers.map((r) => (
                <option key={r.reader_id} value={r.reader_id}>
                  {r.reader_name || `Reader ${r.reader_id}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={busy || !tag || !reader}>
            {busy ? "Recording…" : "Record Scan"}
          </button>
        </div>
      </form>

      {lastScan && (
        <div className="result-card" style={{ marginTop: 24 }}>
          <div className="result-card__header">
            <span className="result-card__icon">✓</span>
            <div>
              <div className="result-card__title">Scan recorded</div>
              <div className="result-card__sub">{lastScan.time.toLocaleTimeString()}</div>
            </div>
          </div>
          <div className="result-card__meta">
            <MetaItem label="Tag"    value={lastScan.tag?.tag_code || "—"} />
            <MetaItem label="Reader" value={lastScan.reader?.reader_name || "—"} />
            <MetaItem label="Event"  value={lastScan.event} />
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

export default ScanRFID;
