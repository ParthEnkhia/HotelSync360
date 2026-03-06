import { useCallback, useEffect, useState } from "react";
import api from "./utils/axiosConfig";

const statusOptions = ["PLANNED", "ACTIVE", "ENDED", "CANCELLED"];

const toSqlDatetime = (input) => {
  if (!input) return null;
  if (input.length === 16) {
    return `${input.replace("T", " ")}:00`;
  }
  return input.replace("T", " ");
};

function StaffAllocation({ propertyId = "1" }) {
  const [viewMode, setViewMode] = useState("all");
  const [allocations, setAllocations] = useState([]);
  const [form, setForm] = useState({
    staff_id: "",
    zone_id: "",
    allocated_by_staff_id: "",
    priority: "MEDIUM",
    start_time: "",
    end_time: "",
    reason: "",
  });

  const fetchAllocations = useCallback(async () => {
    try {
      const endpoint = viewMode === "active" ? "/allocation/active" : "/allocation/all";
      const res = await api.get(endpoint, {
        params: { property_id: Number(propertyId || 1) },
      });
      setAllocations(res.data);
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Error loading allocations";
      alert(errorMessage);
    }
  }, [propertyId, viewMode]);

  useEffect(() => {
    fetchAllocations();
  }, [fetchAllocations]);

  const createAllocation = async () => {
    if (!form.staff_id || !form.zone_id || !form.start_time) {
      alert("Staff ID, Zone ID and Start Time are required");
      return;
    }

    try {
      await api.post("/allocation/create", {
        property_id: Number(propertyId || 1),
        staff_id: Number(form.staff_id),
        zone_id: Number(form.zone_id),
        allocated_by_staff_id: form.allocated_by_staff_id ? Number(form.allocated_by_staff_id) : null,
        priority: form.priority,
        start_time: toSqlDatetime(form.start_time),
        end_time: toSqlDatetime(form.end_time),
        reason: form.reason || null,
      });
      alert("Staff allocation created");
      setForm({
        staff_id: "",
        zone_id: "",
        allocated_by_staff_id: "",
        priority: "MEDIUM",
        start_time: "",
        end_time: "",
        reason: "",
      });
      fetchAllocations();
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Error creating allocation";
      alert(errorMessage);
    }
  };

  const updateStatus = async (allocationId, status) => {
    try {
      await api.patch(`/allocation/${allocationId}/status`, { status });
      fetchAllocations();
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Error updating allocation status";
      alert(errorMessage);
    }
  };

  return (
    <div>
      <h2>Staff Force Allocation</h2>
      <p>Property ID: <strong>{propertyId || "1"}</strong></p>

      <h3>Create Allocation</h3>
      <div className="grid-3">
        <input
          placeholder="Staff ID"
          value={form.staff_id}
          onChange={(e) => setForm((prev) => ({ ...prev, staff_id: e.target.value }))}
        />
        <input
          placeholder="Zone ID"
          value={form.zone_id}
          onChange={(e) => setForm((prev) => ({ ...prev, zone_id: e.target.value }))}
        />
        <input
          placeholder="Allocated By Staff ID (Optional)"
          value={form.allocated_by_staff_id}
          onChange={(e) => setForm((prev) => ({ ...prev, allocated_by_staff_id: e.target.value }))}
        />
        <select
          value={form.priority}
          onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
        >
          <option value="LOW">LOW</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="HIGH">HIGH</option>
          <option value="CRITICAL">CRITICAL</option>
        </select>
        <input
          type="datetime-local"
          value={form.start_time}
          onChange={(e) => setForm((prev) => ({ ...prev, start_time: e.target.value }))}
        />
        <input
          type="datetime-local"
          value={form.end_time}
          onChange={(e) => setForm((prev) => ({ ...prev, end_time: e.target.value }))}
        />
        <input
          className="span-3"
          placeholder="Reason"
          value={form.reason}
          onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
        />
      </div>
      <button onClick={createAllocation}>Create Allocation</button>

      <h3>Allocation Dashboard</h3>
      <label>View: </label>
      <select value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
        <option value="all">All</option>
        <option value="active">Active</option>
      </select>
      <button onClick={fetchAllocations}>Refresh</button>

      <table border="1" style={{ marginTop: "10px" }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Staff</th>
            <th>Zone</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Start</th>
            <th>End</th>
            <th>Update Status</th>
          </tr>
        </thead>
        <tbody>
          {allocations.map((a) => (
            <tr key={a.allocation_id}>
              <td>{a.allocation_id}</td>
              <td>{a.staff_name ? `${a.staff_name} (#${a.staff_id})` : `#${a.staff_id}`}</td>
              <td>{a.zone_name ? `${a.zone_name} (#${a.zone_id})` : `#${a.zone_id}`}</td>
              <td>{a.priority}</td>
              <td>{a.status}</td>
              <td>{a.start_time}</td>
              <td>{a.end_time || "-"}</td>
              <td>
                <select
                  value={a.status}
                  onChange={(e) => updateStatus(a.allocation_id, e.target.value)}
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default StaffAllocation;
