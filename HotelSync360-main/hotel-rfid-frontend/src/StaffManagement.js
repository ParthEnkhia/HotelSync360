import { useCallback, useEffect, useState } from "react";
import api from "./utils/axiosConfig";

const emptyForm = {
  staff_id: null,
  name: "",
  role: "",
  phone: "",
};

function StaffManagement({ propertyId, availableStaffTags = [], onDataChanged }) {
  const [form, setForm] = useState(emptyForm);
  const [staffList, setStaffList] = useState([]);
  const [busy, setBusy] = useState(false);

  const refreshStaff = useCallback(async () => {
    if (!propertyId) {
      setStaffList([]);
      return;
    }

    try {
      const res = await api.get("/staff/all", {
        params: { property_id: Number(propertyId), include_inactive: true },
      });
      setStaffList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      alert(err.response?.data?.error || "Error loading staff");
    }
  }, [propertyId]);

  useEffect(() => {
    setForm(emptyForm);
    refreshStaff();
  }, [propertyId, refreshStaff]);

  const resetForm = () => setForm(emptyForm);

  const refreshAll = async () => {
    await refreshStaff();
    if (onDataChanged) {
      await onDataChanged();
    }
  };

  const handleSubmit = async () => {
    if (!propertyId) {
      alert("Select a property first");
      return;
    }
    if (!form.name) {
      alert("Staff name is required");
      return;
    }

    try {
      setBusy(true);
      if (form.staff_id) {
        await api.patch(`/staff/update/${form.staff_id}`, {
          name: form.name,
          role: form.role || null,
          phone: form.phone || null,
        });
        alert("Staff updated successfully");
      } else {
        await api.post("/staff/add", {
          property_id: Number(propertyId),
          name: form.name,
          role: form.role || null,
          phone: form.phone || null,
        });
        alert("Staff added successfully");
      }

      resetForm();
      await refreshAll();
    } catch (err) {
      alert(err.response?.data?.error || "Error saving staff");
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (member) => {
    setForm({
      staff_id: member.staff_id,
      name: member.name || "",
      role: member.role || "",
      phone: member.phone || "",
    });
  };

  const deactivateStaff = async (staffId) => {
    try {
      await api.patch(`/staff/deactivate/${staffId}`);
      alert("Staff deactivated successfully");
      if (Number(form.staff_id) === Number(staffId)) {
        resetForm();
      }
      await refreshAll();
    } catch (err) {
      alert(err.response?.data?.error || "Error deactivating staff");
    }
  };

  const deleteStaff = async (staffId) => {
    try {
      await api.delete(`/staff/delete/${staffId}`);
      alert("Staff deleted successfully");
      if (Number(form.staff_id) === Number(staffId)) {
        resetForm();
      }
      await refreshAll();
    } catch (err) {
      alert(err.response?.data?.error || "Error deleting staff");
    }
  };

  const assignRfid = async (staffId, rfidTagId) => {
    if (!rfidTagId) {
      alert("Select an RFID tag first");
      return;
    }

    try {
      await api.post("/rfid/assign", {
        rfid_tag_id: Number(rfidTagId),
        assignee_type: "STAFF",
        assignee_id: Number(staffId),
      });
      alert("RFID assigned successfully");
      await refreshAll();
    } catch (err) {
      alert(err.response?.data?.error || "Error assigning RFID");
    }
  };

  return (
    <div>
      <h2>Staff Management</h2>
      {!propertyId ? <p>Select a property to manage staff.</p> : null}

      <h3>{form.staff_id ? "Edit Staff" : "Add Staff"}</h3>
      <div className="grid-3">
        <input
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
        />
        <input
          placeholder="Role"
          value={form.role}
          onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
        />
        <input
          placeholder="Phone"
          value={form.phone}
          onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
        />
      </div>
      <div className="inline-actions">
        <button onClick={handleSubmit} disabled={busy || !propertyId}>
          {busy ? "Saving..." : form.staff_id ? "Update Staff" : "Add Staff"}
        </button>
        {form.staff_id ? (
          <button type="button" className="secondary-button" onClick={resetForm}>
            Cancel Edit
          </button>
        ) : null}
      </div>

      <h3>Staff List</h3>
      <button onClick={refreshStaff} disabled={!propertyId}>Refresh</button>
      <table border="1" style={{ marginTop: "10px" }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Role</th>
            <th>Phone</th>
            <th>Status</th>
            <th>Active</th>
            <th>RFID</th>
            <th>Assign RFID</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {staffList.map((member) => (
            <tr key={member.staff_id}>
              <td>{member.staff_id}</td>
              <td>{member.name}</td>
              <td>{member.role || "-"}</td>
              <td>{member.phone || "-"}</td>
              <td>{member.status}</td>
              <td>{member.is_active ? "Yes" : "No"}</td>
              <td>{member.tag_code || "-"}</td>
              <td>
                {member.is_active && !member.tag_code ? (
                  <div className="inline-actions">
                    <select
                      value={member._selectedTagId || ""}
                      onChange={(e) =>
                        setStaffList((prev) =>
                          prev.map((item) =>
                            item.staff_id === member.staff_id
                              ? { ...item, _selectedTagId: e.target.value }
                              : item
                          )
                        )
                      }
                    >
                      <option value="">Select Staff RFID</option>
                      {availableStaffTags.map((tag) => (
                        <option key={tag.rfid_tag_id} value={tag.rfid_tag_id}>
                          {tag.tag_code}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => assignRfid(member.staff_id, member._selectedTagId)}
                    >
                      Assign
                    </button>
                  </div>
                ) : (
                  "-"
                )}
              </td>
              <td>
                <div className="inline-actions">
                  <button type="button" onClick={() => startEdit(member)} disabled={!member.is_active}>
                    Edit
                  </button>
                  <button type="button" onClick={() => deactivateStaff(member.staff_id)} disabled={!member.is_active}>
                    Deactivate
                  </button>
                  <button type="button" onClick={() => deleteStaff(member.staff_id)}>
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default StaffManagement;
