import { useState } from "react";
import api from "./utils/axiosConfig";

const EVENT_STYLES = {
  ENTRY: { bg: "rgba(110,231,183,0.12)", color: "#6ee7b7", border: "rgba(110,231,183,0.3)" },
  EXIT:  { bg: "rgba(248,113,113,0.12)", color: "#f87171", border: "rgba(248,113,113,0.3)" },
  PING:  { bg: "rgba(147,197,253,0.12)", color: "#93c5fd", border: "rgba(147,197,253,0.3)" },
};

function MovementHistory({ propertyId, tags = [], setToast }) {
  const [rfid, setRfid]       = useState("");
  const [history, setHistory] = useState([]);
  const [busy, setBusy]       = useState(false);
  const [fetched, setFetched] = useState(false);

  const handleFetch = async (e) => {
    e.preventDefault();
    if (!propertyId) { setToast({ type: "warning", message: "Select a property from the top bar first." }); return; }
    if (!rfid)       { setToast({ type: "error",   message: "Select an RFID tag to view history." }); return; }

    try {
      setBusy(true);
      setFetched(false);
      const res = await api.get(`/movement/history/${Number(rfid)}`, {
        params: { property_id: Number(propertyId) },
      });
      setHistory(Array.isArray(res.data) ? res.data : []);
      setFetched(true);
    } catch (err) {
      setToast({ type: "error", message: err.response?.data?.error || "Failed to load movement history." });
    } finally {
      setBusy(false);
    }
  };

  if (!propertyId) {
    return <EmptyState icon="📋" message="Select a property from the top bar to view movement history." />;
  }

  return (
    <div>
      <SectionHeader
        title="Movement History"
        description="View the complete movement log for any active RFID tag."
      />

      <form onSubmit={handleFetch} className="lookup-form">
        <div className="field-group" style={{ flex: 1 }}>
          <label className="field-label" htmlFor="mh-tag">RFID Tag</label>
          <select id="mh-tag" value={rfid} onChange={(e) => { setRfid(e.target.value); setHistory([]); setFetched(false); }}>
            <option value="">Select a tag</option>
            {tags.map((t) => (
              <option key={t.rfid_tag_id} value={t.rfid_tag_id}>
                {t.tag_code}{t.assignee_name ? ` — ${t.assignee_name}` : ""}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={busy || !rfid} style={{ alignSelf: "flex-end", marginBottom: 4 }}>
          {busy ? "Loading…" : "Load History"}
        </button>
      </form>

      {fetched && history.length === 0 && (
        <EmptyState icon="📭" message="No movement events recorded for this tag." />
      )}

      {history.length > 0 && (
        <>
          <div className="table-meta">
            {history.length} event{history.length !== 1 ? "s" : ""} found
          </div>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Zone</th>
                  <th>Reader</th>
                  <th>Event</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item, i) => {
                  const es = EVENT_STYLES[item.event_type] || EVENT_STYLES.PING;
                  return (
                    <tr key={i}>
                      <td style={{ color: "var(--text-dim)", fontSize: 12 }}>{i + 1}</td>
                      <td>{item.zone_name || "—"}</td>
                      <td>{item.reader_name || "—"}</td>
                      <td>
                        <span style={{
                          display: "inline-block",
                          padding: "2px 10px",
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          background: es.bg,
                          color: es.color,
                          border: `1px solid ${es.border}`,
                        }}>
                          {item.event_type}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-dim)" }}>{formatDateTime(item.scan_time)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function formatDateTime(raw) {
  if (!raw) return "—";
  try { return new Date(raw).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }); }
  catch { return raw; }
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

export default MovementHistory;
