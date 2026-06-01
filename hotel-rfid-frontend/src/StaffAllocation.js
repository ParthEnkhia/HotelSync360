import { useCallback, useEffect, useState } from "react";
import api from "./utils/axiosConfig";

const STATUS_OPTIONS = ["PLANNED", "ACTIVE", "ENDED", "CANCELLED"];

const STATUS_STYLES = {
  PLANNED:   { bg: "rgba(147,197,253,0.12)", color: "#93c5fd", border: "rgba(147,197,253,0.3)" },
  ACTIVE:    { bg: "rgba(110,231,183,0.12)", color: "#6ee7b7", border: "rgba(110,231,183,0.3)" },
  ENDED:     { bg: "rgba(156,163,175,0.12)", color: "#9ca3af", border: "rgba(156,163,175,0.3)" },
  CANCELLED: { bg: "rgba(248,113,113,0.12)", color: "#f87171", border: "rgba(248,113,113,0.3)" },
};

const PRIORITY_STYLES = {
  LOW:      { color: "#6ee7b7" },
  MEDIUM:   { color: "#fbbf24" },
  HIGH:     { color: "#f97316" },
  CRITICAL: { color: "#f87171" },
};

const toSqlDatetime = (v) => {
  if (!v) return null;
  return v.length === 16 ? `${v.replace("T", " ")}:00` : v.replace("T", " ");
};

function StaffAllocation({ propertyId, staff = [], zones = [], setToast }) {
  const [viewMode, setViewMode]   = useState("all");
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm] = useState({
    staff_id: "", zone_id: "", allocated_by_staff_id: "",
    priority: "MEDIUM", start_time: "", end_time: "", reason: "",
  });

  const fetchAllocations = useCallback(async () => {
    if (!propertyId) { setAllocations([]); return; }
    try {
      setLoading(true);
      const endpoint = viewMode === "active" ? "/allocation/active" : "/allocation/all";
      const res = await api.get(endpoint, { params: { property_id: Number(propertyId) } });
      setAllocations(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setToast({ type: "error", message: err.response?.data?.error || "Failed to load allocations." });
    } finally {
      setLoading(false);
    }
  }, [propertyId, viewMode, setToast]);

  useEffect(() => { fetchAllocations(); }, [fetchAllocations]);

  const resetForm = () => setForm({
    staff_id: "", zone_id: "", allocated_by_staff_id: "",
    priority: "MEDIUM", start_time: "", end_time: "", reason: "",
  });

  const createAllocation = async (e) => {
    e.preventDefault();
    if (!propertyId)    { setToast({ type: "warning", message: "Select a property first." }); return; }
    if (!form.staff_id) { setToast({ type: "error",   message: "Select a staff member." }); return; }
    if (!form.zone_id)  { setToast({ type: "error",   message: "Select a zone." }); return; }
    if (!form.start_time) { setToast({ type: "error", message: "Start time is required." }); return; }

    try {
      await api.post("/allocation/create", {
        property_id:          Number(propertyId),
        staff_id:             Number(form.staff_id),
        zone_id:              Number(form.zone_id),
        allocated_by_staff_id: form.allocated_by_staff_id ? Number(form.allocated_by_staff_id) : null,
        priority:             form.priority,
        start_time:           toSqlDatetime(form.start_time),
        end_time:             toSqlDatetime(form.end_time),
        reason:               form.reason.trim() || null,
      });
      setToast({ type: "success", message: "Allocation created successfully." });
      resetForm();
      setShowForm(false);
      fetchAllocations();
    } catch (err) {
      setToast({ type: "error", message: err.response?.data?.error || "Failed to create allocation." });
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/allocation/${id}/status`, { status });
      setToast({ type: "success", message: `Status updated to ${status}.` });
      fetchAllocations();
    } catch (err) {
      setToast({ type: "error", message: err.response?.data?.error || "Failed to update status." });
    }
  };

  if (!propertyId) {
    return <EmptyState icon="👥" message="Select a property from the top bar to manage staff allocations." />;
  }

  return (
    <div>
      <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 className="section-title">Staff Allocation</h2>
          <p className="section-desc">Assign staff members to zones with priority levels and time windows.</p>
        </div>
        <button onClick={() => { setShowForm((v) => !v); if (showForm) resetForm(); }} style={{ flexShrink: 0 }}>
          {showForm ? "Cancel" : "+ New Allocation"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createAllocation} className="form-card">
          <h3 style={{ marginTop: 0, color: "var(--text)", fontSize: 14, fontWeight: 600 }}>New Allocation</h3>
          <div className="form-grid">
            <div className="field-group">
              <label className="field-label" htmlFor="alloc-staff">Staff Member <Req /></label>
              <select id="alloc-staff" value={form.staff_id} onChange={(e) => setForm((p) => ({ ...p, staff_id: e.target.value }))}>
                <option value="">Select staff member</option>
                {staff.map((m) => (
                  <option key={m.staff_id} value={m.staff_id}>
                    {m.name}{m.role ? ` — ${m.role}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="alloc-zone">Zone <Req /></label>
              <select id="alloc-zone" value={form.zone_id} onChange={(e) => setForm((p) => ({ ...p, zone_id: e.target.value }))}>
                <option value="">Select zone</option>
                {zones.map((z) => (
                  <option key={z.zone_id} value={z.zone_id}>
                    {z.zone_name}{z.zone_category ? ` — ${z.zone_category}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="alloc-by">Allocated By</label>
              <select id="alloc-by" value={form.allocated_by_staff_id} onChange={(e) => setForm((p) => ({ ...p, allocated_by_staff_id: e.target.value }))}>
                <option value="">Optional</option>
                {staff.map((m) => (
                  <option key={m.staff_id} value={m.staff_id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="alloc-priority">Priority</label>
              <select id="alloc-priority" value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="alloc-start">Start Time <Req /></label>
              <input id="alloc-start" type="datetime-local" value={form.start_time}
                onChange={(e) => setForm((p) => ({ ...p, start_time: e.target.value }))} />
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="alloc-end">End Time</label>
              <input id="alloc-end" type="datetime-local" value={form.end_time}
                onChange={(e) => setForm((p) => ({ ...p, end_time: e.target.value }))} />
            </div>
            <div className="field-group" style={{ gridColumn: "1 / -1" }}>
              <label className="field-label" htmlFor="alloc-reason">Reason / Notes</label>
              <input id="alloc-reason" type="text" value={form.reason}
                onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit">Create Allocation</button>
            <button type="button" className="secondary-button" onClick={() => { setShowForm(false); resetForm(); }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Filter + refresh */}
      <div className="table-toolbar">
        <div className="segmented-control">
          {["all", "active"].map((mode) => (
            <button
              key={mode}
              type="button"
              className={`segmented-btn${viewMode === mode ? " segmented-btn--active" : ""}`}
              onClick={() => setViewMode(mode)}
            >
              {mode === "all" ? "All" : "Active only"}
            </button>
          ))}
        </div>
        <button className="secondary-button" onClick={fetchAllocations} disabled={loading} style={{ minWidth: 90 }}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {!loading && allocations.length === 0 && (
        <EmptyState icon="📋" message="No allocations found. Create one above." />
      )}

      {allocations.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Staff</th>
                <th>Zone</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Start</th>
                <th>End</th>
                <th>Update</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map((a) => {
                const ss = STATUS_STYLES[a.status]   || STATUS_STYLES.PLANNED;
                const ps = PRIORITY_STYLES[a.priority] || PRIORITY_STYLES.MEDIUM;
                return (
                  <tr key={a.allocation_id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{a.staff_name || `Staff #${a.staff_id}`}</div>
                      {a.staff_role && <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{a.staff_role}</div>}
                    </td>
                    <td>{a.zone_name || `Zone #${a.zone_id}`}</td>
                    <td>
                      <span style={{ color: ps.color, fontWeight: 700, fontSize: 12 }}>{a.priority}</span>
                    </td>
                    <td>
                      <span style={{
                        display: "inline-block", padding: "2px 10px", borderRadius: 20,
                        fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
                        background: ss.bg, color: ss.color, border: `1px solid ${ss.border}`,
                      }}>
                        {a.status}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-dim)", fontSize: 12 }}>{formatDateTime(a.start_time)}</td>
                    <td style={{ color: "var(--text-dim)", fontSize: 12 }}>{a.end_time ? formatDateTime(a.end_time) : "—"}</td>
                    <td>
                      <select
                        value={a.status}
                        onChange={(e) => updateStatus(a.allocation_id, e.target.value)}
                        style={{ maxWidth: 130, margin: 0, fontSize: 12, padding: "5px 8px" }}
                      >
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Req() {
  return <span style={{ color: "var(--brand)", marginLeft: 2 }}>*</span>;
}

function formatDateTime(raw) {
  if (!raw) return "—";
  try { return new Date(raw).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }); }
  catch { return raw; }
}

function EmptyState({ icon, message }) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon">{icon}</span>
      <p className="empty-state__message">{message}</p>
    </div>
  );
}

export default StaffAllocation;
