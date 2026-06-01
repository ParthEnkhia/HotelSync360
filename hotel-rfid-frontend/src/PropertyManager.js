import { useCallback, useEffect, useState } from "react";
import api from "./utils/axiosConfig";

/* ── helpers ─────────────────────────────────────────────────────────── */
const ZONE_CATEGORIES = ["PUBLIC", "GUEST", "STAFF", "RESTRICTED", "SERVICE", "OTHER"];
const PRIORITY_COLORS = {
  LOW: "#6ee7b7",
  MEDIUM: "#fbbf24",
  HIGH: "#f97316",
  CRITICAL: "#f87171",
};

const emptyPropertyForm = {
  property_name: "",
  address_line1: "",
  city: "",
  state: "",
  country: "",
  status: "ACTIVE",
};

const emptyZoneForm = { zone_name: "", zone_category: "PUBLIC" };

/* ── sub-component: inline editable zone row ─────────────────────────── */
function ZoneRow({ zone, propertyId, onSaved, onDeleted, setToast }) {
  const [editing, setEditing]   = useState(false);
  const [confirm, setConfirm]   = useState(false);
  const [form, setForm] = useState({
    zone_name: zone.zone_name,
    zone_category: zone.zone_category || "PUBLIC",
  });
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!form.zone_name.trim()) return;
    try {
      setBusy(true);
      await api.put(`/property/${propertyId}/zones/${zone.zone_id}`, form);
      setEditing(false);
      setToast({ type: "success", message: `Zone "${form.zone_name}" updated.` });
      onSaved();
    } catch (err) {
      setToast({ type: "error", message: err.response?.data?.error || "Failed to update zone." });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    try {
      setBusy(true);
      await api.delete(`/property/${propertyId}/zones/${zone.zone_id}`);
      setToast({ type: "info", message: `Zone "${zone.zone_name}" deleted.` });
      onDeleted();
    } catch (err) {
      setToast({ type: "error", message: err.response?.data?.error || "Failed to delete zone." });
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  };

  if (editing) {
    return (
      <tr>
        <td>{zone.zone_id}</td>
        <td>
          <input
            value={form.zone_name}
            onChange={(e) => setForm((p) => ({ ...p, zone_name: e.target.value }))}
            style={{ maxWidth: "160px" }}
          />
        </td>
        <td>
          <select
            value={form.zone_category}
            onChange={(e) => setForm((p) => ({ ...p, zone_category: e.target.value }))}
            style={{ maxWidth: "140px" }}
          >
            {ZONE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </td>
        <td>
          <div className="inline-actions">
            <button onClick={save} disabled={busy} style={{ minWidth: 70 }}>
              {busy ? "Saving…" : "Save"}
            </button>
            <button
              className="secondary-button"
              onClick={() => setEditing(false)}
              style={{ minWidth: 70 }}
            >
              Cancel
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td style={{ color: "var(--text-dim)", fontSize: 12 }}>{zone.zone_id}</td>
      <td>{zone.zone_name}</td>
      <td>
        <span style={categoryBadgeStyle(zone.zone_category)}>
          {zone.zone_category || "—"}
        </span>
      </td>
      <td>
        <div className="inline-actions">
          <button
            className="secondary-button"
            onClick={() => setEditing(true)}
            style={{ minWidth: 70 }}
          >
            Edit
          </button>
          {confirm ? (
            <>
              <button
                onClick={remove}
                disabled={busy}
                style={{ minWidth: 70, background: "rgba(248,113,113,0.2)", borderColor: "#f87171", color: "#f87171" }}
              >
                {busy ? "…" : "Confirm"}
              </button>
              <button className="secondary-button" onClick={() => setConfirm(false)} style={{ minWidth: 70 }}>
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirm(true)}
              disabled={busy}
              style={{ minWidth: 70, background: "rgba(248,113,113,0.1)", borderColor: "rgba(248,113,113,0.4)", color: "#f87171" }}
            >
              Delete
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function categoryBadgeStyle(cat) {
  const map = {
    PUBLIC: { background: "rgba(110,231,183,0.12)", color: "#6ee7b7", borderColor: "rgba(110,231,183,0.3)" },
    GUEST: { background: "rgba(147,197,253,0.12)", color: "#93c5fd", borderColor: "rgba(147,197,253,0.3)" },
    STAFF: { background: "rgba(251,191,36,0.12)", color: "#fbbf24", borderColor: "rgba(251,191,36,0.3)" },
    RESTRICTED: { background: "rgba(248,113,113,0.12)", color: "#f87171", borderColor: "rgba(248,113,113,0.3)" },
    SERVICE: { background: "rgba(196,181,253,0.12)", color: "#c4b5fd", borderColor: "rgba(196,181,253,0.3)" },
    OTHER: { background: "rgba(156,163,175,0.12)", color: "#9ca3af", borderColor: "rgba(156,163,175,0.3)" },
  };
  const s = map[cat] || map.OTHER;
  return {
    display: "inline-block",
    padding: "2px 10px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.06em",
    border: `1px solid ${s.borderColor}`,
    ...s,
  };
}

/* ── main component ──────────────────────────────────────────────────── */
function PropertyManager({ onPropertiesChanged, setToast }) {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);

  // which property's zones panel is open
  const [expandedId, setExpandedId] = useState(null);
  const [zones, setZones] = useState({}); // { [propertyId]: zone[] }
  const [zonesLoading, setZonesLoading] = useState({});

  // property form state
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null); // null = create
  const [propertyForm, setPropertyForm] = useState(emptyPropertyForm);
  const [propertyBusy, setPropertyBusy] = useState(false);

  // zone add form
  const [zoneForm, setZoneForm] = useState(emptyZoneForm);
  const [zoneBusy, setZoneBusy] = useState(false);

  /* fetch all properties */
  const fetchProperties = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/property/all");
      setProperties(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setToast({ type: "error", message: err.response?.data?.error || "Failed to load properties." });
    } finally {
      setLoading(false);
    }
  }, [setToast]);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  /* fetch zones for a property */
  const fetchZones = useCallback(async (propertyId) => {
    setZonesLoading((p) => ({ ...p, [propertyId]: true }));
    try {
      const res = await api.get(`/property/${propertyId}/zones`);
      setZones((p) => ({ ...p, [propertyId]: Array.isArray(res.data) ? res.data : [] }));
    } catch (err) {
      setToast({ type: "error", message: err.response?.data?.error || "Failed to load zones." });
    } finally {
      setZonesLoading((p) => ({ ...p, [propertyId]: false }));
    }
  }, [setToast]);

  const toggleExpand = (propertyId) => {
    if (expandedId === propertyId) {
      setExpandedId(null);
    } else {
      setExpandedId(propertyId);
      if (!zones[propertyId]) fetchZones(propertyId);
    }
  };

  /* ── property form handlers ── */
  const openCreate = () => {
    setEditingProperty(null);
    setPropertyForm(emptyPropertyForm);
    setShowPropertyForm(true);
  };

  const openEdit = (prop) => {
    setEditingProperty(prop);
    setPropertyForm({
      property_name: prop.property_name,
      address_line1: prop.address_line1 || "",
      city: prop.city || "",
      state: prop.state || "",
      country: prop.country || "",
      status: prop.status,
    });
    setShowPropertyForm(true);
    // also expand zones for this property
    setExpandedId(prop.property_id);
    if (!zones[prop.property_id]) fetchZones(prop.property_id);
  };

  const cancelPropertyForm = () => {
    setShowPropertyForm(false);
    setEditingProperty(null);
  };

  const submitProperty = async () => {
    if (!propertyForm.property_name.trim()) {
      setToast({ type: "error", message: "Property name is required." });
      return;
    }
    try {
      setPropertyBusy(true);
      if (editingProperty) {
        await api.put(`/property/${editingProperty.property_id}`, propertyForm);
        setToast({ type: "success", message: `"${propertyForm.property_name}" updated.` });
      } else {
        await api.post("/property/create", propertyForm);
        setToast({ type: "success", message: `"${propertyForm.property_name}" created.` });
      }
      setShowPropertyForm(false);
      setEditingProperty(null);
      await fetchProperties();
      if (onPropertiesChanged) onPropertiesChanged();
    } catch (err) {
      setToast({ type: "error", message: err.response?.data?.error || "Failed to save property." });
    } finally {
      setPropertyBusy(false);
    }
  };

  /* ── zone add handler ── */
  const addZone = async (propertyId) => {
    if (!zoneForm.zone_name.trim()) {
      setToast({ type: "error", message: "Zone name is required." });
      return;
    }
    try {
      setZoneBusy(true);
      await api.post(`/property/${propertyId}/zones`, zoneForm);
      setToast({ type: "success", message: `Zone "${zoneForm.zone_name}" added.` });
      setZoneForm(emptyZoneForm);
      await fetchZones(propertyId);
      if (onPropertiesChanged) onPropertiesChanged();
    } catch (err) {
      setToast({ type: "error", message: err.response?.data?.error || "Failed to add zone." });
    } finally {
      setZoneBusy(false);
    }
  };

  /* ── render ── */
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <h2 style={{ marginBottom: 0, borderBottom: "none", paddingBottom: 0 }}>Property Manager</h2>
        <button onClick={openCreate} style={{ minWidth: 160 }}>
          + New Property
        </button>
      </div>
      <p style={{ color: "var(--text-dim)", fontSize: 13, marginBottom: 20 }}>
        Create and edit properties, manage their zones and categories.
      </p>

      {/* ── Property Form ── */}
      {showPropertyForm && (
        <div style={formCardStyle}>
          <div style={formCardTopBar} />
          <h3 style={{ marginTop: 0, color: "var(--text)" }}>
            {editingProperty ? `Edit — ${editingProperty.property_name}` : "Create New Property"}
          </h3>
          <div className="grid-2">
            <div style={fieldWrap}>
              <label style={labelStyle}>Property Name *</label>
              <input
                placeholder="e.g. Grand Palace Hotel"
                value={propertyForm.property_name}
                onChange={(e) => setPropertyForm((p) => ({ ...p, property_name: e.target.value }))}
              />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Address</label>
              <input
                placeholder="Street address"
                value={propertyForm.address_line1}
                onChange={(e) => setPropertyForm((p) => ({ ...p, address_line1: e.target.value }))}
              />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>City</label>
              <input
                placeholder="City"
                value={propertyForm.city}
                onChange={(e) => setPropertyForm((p) => ({ ...p, city: e.target.value }))}
              />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>State / Province</label>
              <input
                placeholder="State"
                value={propertyForm.state}
                onChange={(e) => setPropertyForm((p) => ({ ...p, state: e.target.value }))}
              />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Country</label>
              <input
                placeholder="Country"
                value={propertyForm.country}
                onChange={(e) => setPropertyForm((p) => ({ ...p, country: e.target.value }))}
              />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Status</label>
              <select
                value={propertyForm.status}
                onChange={(e) => setPropertyForm((p) => ({ ...p, status: e.target.value }))}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>
          <div className="inline-actions" style={{ marginTop: 12 }}>
            <button onClick={submitProperty} disabled={propertyBusy}>
              {propertyBusy ? "Saving…" : editingProperty ? "Save Changes" : "Create Property"}
            </button>
            <button className="secondary-button" onClick={cancelPropertyForm}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Properties List ── */}
      {loading ? (
        <p style={{ color: "var(--text-dim)" }}>Loading properties…</p>
      ) : properties.length === 0 ? (
        <p style={{ color: "var(--text-dim)" }}>No properties found. Create one above.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {properties.map((prop) => (
            <div key={prop.property_id} style={propertyCardStyle}>
              {/* property card top accent */}
              <div style={propertyCardTopBar(prop.status)} />

              {/* header row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 16, color: "var(--text)" }}>
                      {prop.property_name}
                    </span>
                    <span style={statusBadgeStyle(prop.status)}>{prop.status}</span>
                  </div>
                  <span style={{ fontSize: 13, color: "var(--text-dim)" }}>
                    {[prop.city, prop.state, prop.country].filter(Boolean).join(", ") || "No location set"}
                  </span>
                </div>
                <div className="inline-actions">
                  <button
                    className="secondary-button"
                    onClick={() => openEdit(prop)}
                    style={{ minWidth: 80 }}
                  >
                    Edit
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => toggleExpand(prop.property_id)}
                    style={{ minWidth: 110 }}
                  >
                    {expandedId === prop.property_id ? "Hide Zones ▲" : "Manage Zones ▼"}
                  </button>
                </div>
              </div>

              {/* zones panel */}
              {expandedId === prop.property_id && (
                <div style={zonesPanelStyle}>
                  <h3 style={{ marginTop: 0 }}>Zones</h3>

                  {/* add zone form */}
                  <div style={addZoneFormStyle}>
                    <div className="inline-actions" style={{ flexWrap: "wrap" }}>
                      <div style={fieldWrap}>
                        <label style={labelStyle}>Zone Name *</label>
                        <input
                          placeholder="e.g. Pool Deck"
                          value={zoneForm.zone_name}
                          onChange={(e) => setZoneForm((p) => ({ ...p, zone_name: e.target.value }))}
                          style={{ maxWidth: 200 }}
                        />
                      </div>
                      <div style={fieldWrap}>
                        <label style={labelStyle}>Category</label>
                        <select
                          value={zoneForm.zone_category}
                          onChange={(e) => setZoneForm((p) => ({ ...p, zone_category: e.target.value }))}
                          style={{ maxWidth: 160 }}
                        >
                          {ZONE_CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ alignSelf: "flex-end", paddingBottom: 4 }}>
                        <button
                          onClick={() => addZone(prop.property_id)}
                          disabled={zoneBusy}
                          style={{ minWidth: 110 }}
                        >
                          {zoneBusy ? "Adding…" : "+ Add Zone"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* zones table */}
                  {zonesLoading[prop.property_id] ? (
                    <p style={{ color: "var(--text-dim)", fontSize: 13 }}>Loading zones…</p>
                  ) : !zones[prop.property_id] || zones[prop.property_id].length === 0 ? (
                    <p style={{ color: "var(--text-dim)", fontSize: 13 }}>
                      No zones yet. Add one above.
                    </p>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table>
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Zone Name</th>
                            <th>Category</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {zones[prop.property_id].map((zone) => (
                            <ZoneRow
                              key={zone.zone_id}
                              zone={zone}
                              propertyId={prop.property_id}
                              setToast={setToast}
                              onSaved={() => {
                                fetchZones(prop.property_id);
                                if (onPropertiesChanged) onPropertiesChanged();
                              }}
                              onDeleted={() => {
                                fetchZones(prop.property_id);
                                if (onPropertiesChanged) onPropertiesChanged();
                              }}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* zone category legend */}
                  <div style={legendStyle}>
                    {ZONE_CATEGORIES.map((c) => (
                      <span key={c} style={{ ...categoryBadgeStyle(c), marginRight: 6 }}>{c}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Priority reference card ── */}
      <div style={priorityCardStyle}>
        <h3 style={{ marginTop: 0 }}>Allocation Priority Reference</h3>
        <p style={{ color: "var(--text-dim)", fontSize: 13, marginBottom: 12 }}>
          These priority levels are used when allocating staff to zones.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {Object.entries(PRIORITY_COLORS).map(([level, color]) => (
            <div key={level} style={priorityChipStyle(color)}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block", marginRight: 6 }} />
              <strong>{level}</strong>
              <span style={{ color: "var(--text-dim)", fontSize: 11, marginLeft: 8 }}>
                {level === "LOW" && "Routine tasks, no urgency"}
                {level === "MEDIUM" && "Standard operations"}
                {level === "HIGH" && "Time-sensitive, prioritise"}
                {level === "CRITICAL" && "Immediate response required"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── inline styles ───────────────────────────────────────────────────── */
const formCardStyle = {
  background: "rgba(201,168,76,0.05)",
  border: "1px solid rgba(201,168,76,0.25)",
  borderRadius: 12,
  padding: "20px 20px 16px",
  marginBottom: 20,
  position: "relative",
  overflow: "hidden",
};

const formCardTopBar = {
  position: "absolute",
  top: 0, left: 0, right: 0,
  height: 2,
  background: "linear-gradient(90deg, transparent, #c9a84c, transparent)",
};

const propertyCardStyle = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: 12,
  padding: "18px 20px 16px",
  position: "relative",
  overflow: "hidden",
};

const propertyCardTopBar = (status) => ({
  position: "absolute",
  top: 0, left: 0, right: 0,
  height: 2,
  background: status === "ACTIVE"
    ? "linear-gradient(90deg, transparent, #6ee7b7, transparent)"
    : "linear-gradient(90deg, transparent, #6b7280, transparent)",
});

const zonesPanelStyle = {
  marginTop: 16,
  paddingTop: 16,
  borderTop: "1px solid rgba(255,255,255,0.07)",
};

const addZoneFormStyle = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 8,
  padding: "12px 14px",
  marginBottom: 14,
};

const legendStyle = {
  marginTop: 12,
  paddingTop: 10,
  borderTop: "1px solid rgba(255,255,255,0.06)",
  display: "flex",
  flexWrap: "wrap",
  gap: 4,
};

const priorityCardStyle = {
  marginTop: 24,
  background: "rgba(255,255,255,0.02)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 12,
  padding: "18px 20px",
};

const priorityChipStyle = (color) => ({
  display: "flex",
  alignItems: "center",
  background: `${color}14`,
  border: `1px solid ${color}40`,
  borderRadius: 8,
  padding: "6px 12px",
  fontSize: 13,
  color: "var(--text)",
  flex: "1 1 220px",
});

const statusBadgeStyle = (status) => ({
  display: "inline-block",
  padding: "2px 10px",
  borderRadius: 20,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.06em",
  background: status === "ACTIVE" ? "rgba(110,231,183,0.12)" : "rgba(107,114,128,0.15)",
  color: status === "ACTIVE" ? "#6ee7b7" : "#9ca3af",
  border: `1px solid ${status === "ACTIVE" ? "rgba(110,231,183,0.3)" : "rgba(107,114,128,0.3)"}`,
});

const fieldWrap = { display: "flex", flexDirection: "column", gap: 4 };
const labelStyle = { fontSize: 11, fontWeight: 600, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em" };

export default PropertyManager;
