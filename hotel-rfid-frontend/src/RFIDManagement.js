import { useEffect, useMemo, useState } from "react";
import api from "./utils/axiosConfig";

function RFIDManagement({ guests = [], staff = [], availableGuestTags = [], availableStaffTags = [], onDataChanged, setToast }) {
  const [tags, setTags]           = useState([]);
  const [loading, setLoading]     = useState(false);
  const [activeTab, setActiveTab] = useState("list");
  const [createForm, setCreateForm] = useState({ tag_code: "", tag_type: "GUEST", assignee_id: "" });
  const [assignForm, setAssignForm] = useState({ rfid_tag_id: "", assignee_type: "GUEST", assignee_id: "" });
  const [lastCode, setLastCode]   = useState("");

  const fetchTags = async () => {
    try {
      setLoading(true);
      const res = await api.get("/rfid/all");
      setTags(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setToast({ type: "error", message: err.response?.data?.error || "Failed to load RFID tags." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTags(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshAll = async () => { await fetchTags(); if (onDataChanged) await onDataChanged(); };

  const createAssignees = useMemo(() => createForm.tag_type === "GUEST" ? guests : staff, [createForm.tag_type, guests, staff]);
  const assignAssignees = useMemo(() => assignForm.assignee_type === "GUEST" ? guests : staff, [assignForm.assignee_type, guests, staff]);
  const assignableTags  = useMemo(() => assignForm.assignee_type === "GUEST" ? availableGuestTags : availableStaffTags, [assignForm.assignee_type, availableGuestTags, availableStaffTags]);

  const createTag = async (e) => {
    e.preventDefault();
    try {
      const payload = { tag_type: createForm.tag_type };
      if (createForm.tag_code.trim()) payload.tag_code = createForm.tag_code.trim();
      if (createForm.assignee_id) {
        payload.assignee_type = createForm.tag_type;
        payload.assignee_id   = Number(createForm.assignee_id);
      }
      const res = await api.post("/rfid/create", payload);
      const code = res.data?.tag_code || "";
      setLastCode(code);
      setToast({ type: "success", message: `Tag created: ${code}` });
      setCreateForm((p) => ({ ...p, tag_code: "", assignee_id: "" }));
      await refreshAll();
    } catch (err) {
      setToast({ type: "error", message: err.response?.data?.error || "Failed to create tag." });
    }
  };

  const assignTag = async (e) => {
    e.preventDefault();
    if (!assignForm.rfid_tag_id) { setToast({ type: "error", message: "Select a tag." });    return; }
    if (!assignForm.assignee_id) { setToast({ type: "error", message: "Select a person." }); return; }
    try {
      await api.post("/rfid/assign", {
        rfid_tag_id:   Number(assignForm.rfid_tag_id),
        assignee_type: assignForm.assignee_type,
        assignee_id:   Number(assignForm.assignee_id),
      });
      setToast({ type: "success", message: "Tag assigned successfully." });
      setAssignForm((p) => ({ ...p, rfid_tag_id: "", assignee_id: "" }));
      await refreshAll();
    } catch (err) {
      setToast({ type: "error", message: err.response?.data?.error || "Failed to assign tag." });
    }
  };

  const releaseTag = async (id) => {
    try {
      await api.post("/rfid/release", { rfid_tag_id: Number(id) });
      setToast({ type: "success", message: "Tag released." });
      await refreshAll();
    } catch (err) {
      setToast({ type: "error", message: err.response?.data?.error || "Failed to release tag." });
    }
  };

  const deactivateTag = async (id) => {
    try {
      await api.delete(`/rfid/${Number(id)}`);
      setToast({ type: "info", message: "Tag deactivated." });
      await refreshAll();
    } catch (err) {
      setToast({ type: "error", message: err.response?.data?.error || "Failed to deactivate tag." });
    }
  };

  const TABS = [
    { id: "list",   label: "All Tags" },
    { id: "create", label: "Create Tag" },
    { id: "assign", label: "Assign Tag" },
  ];

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">RFID Tag Management</h2>
        <p className="section-desc">Create, assign, release, and deactivate RFID tags for guests and staff.</p>
      </div>

      <div className="tab-bar">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tab-btn${activeTab === t.id ? " tab-btn--active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >{t.label}</button>
        ))}
      </div>

      {/* ── Create ── */}
      {activeTab === "create" && (
        <form onSubmit={createTag} className="form-card">
          <div className="form-grid">
            <div className="field-group">
              <label className="field-label" htmlFor="rfid-type">Tag Type</label>
              <select id="rfid-type" value={createForm.tag_type}
                onChange={(e) => setCreateForm({ tag_code: "", tag_type: e.target.value, assignee_id: "" })}>
                <option value="GUEST">Guest</option>
                <option value="STAFF">Staff</option>
              </select>
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="rfid-code">Tag Code <span style={{ color: "var(--text-dim)", fontWeight: 400 }}>(auto-generated if blank)</span></label>
              <input id="rfid-code" type="text" value={createForm.tag_code}
                onChange={(e) => setCreateForm((p) => ({ ...p, tag_code: e.target.value }))} />
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="rfid-assignee">Assign To</label>
              <select id="rfid-assignee" value={createForm.assignee_id}
                onChange={(e) => setCreateForm((p) => ({ ...p, assignee_id: e.target.value }))}>
                <option value="">Assign later</option>
                {createAssignees.map((person) => {
                  const id = createForm.tag_type === "GUEST" ? person.guest_id : person.staff_id;
                  return (
                    <option key={id} value={id}>
                      {person.name}{createForm.tag_type === "GUEST" && person.room_number ? ` — Room ${person.room_number}` : ""}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button type="submit">Create Tag</button>
          </div>
          {lastCode && (
            <div className="info-banner">
              <span>Last generated code:</span>
              <strong style={{ fontFamily: "monospace", letterSpacing: "0.05em" }}>{lastCode}</strong>
            </div>
          )}
        </form>
      )}

      {/* ── Assign ── */}
      {activeTab === "assign" && (
        <form onSubmit={assignTag} className="form-card">
          <div className="form-grid">
            <div className="field-group">
              <label className="field-label" htmlFor="assign-type">Assignee Type</label>
              <select id="assign-type" value={assignForm.assignee_type}
                onChange={(e) => setAssignForm({ rfid_tag_id: "", assignee_type: e.target.value, assignee_id: "" })}>
                <option value="GUEST">Guest</option>
                <option value="STAFF">Staff</option>
              </select>
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="assign-tag">Available Tag</label>
              <select id="assign-tag" value={assignForm.rfid_tag_id}
                onChange={(e) => setAssignForm((p) => ({ ...p, rfid_tag_id: e.target.value }))}>
                <option value="">Select tag</option>
                {assignableTags.map((t) => (
                  <option key={t.rfid_tag_id} value={t.rfid_tag_id}>{t.tag_code}</option>
                ))}
              </select>
              {assignableTags.length === 0 && (
                <span className="field-hint">No unassigned {assignForm.assignee_type.toLowerCase()} tags available.</span>
              )}
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="assign-person">Assign To</label>
              <select id="assign-person" value={assignForm.assignee_id}
                onChange={(e) => setAssignForm((p) => ({ ...p, assignee_id: e.target.value }))}>
                <option value="">Select person</option>
                {assignAssignees.map((person) => {
                  const id = assignForm.assignee_type === "GUEST" ? person.guest_id : person.staff_id;
                  return (
                    <option key={id} value={id}>
                      {person.name}{assignForm.assignee_type === "GUEST" && person.room_number ? ` — Room ${person.room_number}` : ""}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button type="submit">Assign Tag</button>
          </div>
        </form>
      )}

      {/* ── List ── */}
      {activeTab === "list" && (
        <>
          <div className="table-toolbar">
            <span className="table-meta">{tags.length} tag{tags.length !== 1 ? "s" : ""}</span>
            <button className="secondary-button" onClick={fetchTags} disabled={loading} style={{ minWidth: 90 }}>
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>

          {tags.length === 0 && !loading && (
            <EmptyState icon="🏷️" message="No RFID tags found. Create one in the Create Tag tab." />
          )}

          {tags.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Assigned To</th>
                    <th>Assigned At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tags.map((tag) => (
                    <tr key={tag.rfid_tag_id}>
                      <td style={{ fontFamily: "monospace", letterSpacing: "0.04em" }}>{tag.tag_code}</td>
                      <td>
                        <span style={{
                          display: "inline-block", padding: "2px 8px", borderRadius: 20,
                          fontSize: 11, fontWeight: 700,
                          background: tag.tag_type === "GUEST" ? "rgba(147,197,253,0.12)" : "rgba(251,191,36,0.12)",
                          color:      tag.tag_type === "GUEST" ? "#93c5fd" : "#fbbf24",
                          border:     `1px solid ${tag.tag_type === "GUEST" ? "rgba(147,197,253,0.3)" : "rgba(251,191,36,0.3)"}`,
                        }}>
                          {tag.tag_type}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          display: "inline-block", padding: "2px 8px", borderRadius: 20,
                          fontSize: 11, fontWeight: 700,
                          background: tag.is_active ? "rgba(110,231,183,0.12)" : "rgba(107,114,128,0.12)",
                          color:      tag.is_active ? "#6ee7b7" : "#9ca3af",
                          border:     `1px solid ${tag.is_active ? "rgba(110,231,183,0.3)" : "rgba(107,114,128,0.3)"}`,
                        }}>
                          {tag.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        {tag.assignee_type
                          ? <><span style={{ color: "var(--text-dim)", fontSize: 11 }}>{tag.assignee_type} · </span>{tag.assignee_name || `#${tag.assignee_id}`}</>
                          : <span style={{ color: "var(--text-dim)" }}>Unassigned</span>}
                      </td>
                      <td style={{ color: "var(--text-dim)", fontSize: 12 }}>
                        {tag.assigned_at ? formatDateTime(tag.assigned_at) : "—"}
                      </td>
                      <td>
                        <div className="inline-actions">
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => releaseTag(tag.rfid_tag_id)}
                            disabled={!tag.assignee_type}
                            style={{ minWidth: 80, fontSize: 12, padding: "5px 10px" }}
                          >Release</button>
                          <button
                            type="button"
                            onClick={() => deactivateTag(tag.rfid_tag_id)}
                            style={{ minWidth: 90, fontSize: 12, padding: "5px 10px", background: "rgba(248,113,113,0.15)", borderColor: "#f87171", color: "#f87171" }}
                          >Deactivate</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
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

export default RFIDManagement;
