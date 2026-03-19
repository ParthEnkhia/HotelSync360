import { useCallback, useEffect, useState } from "react";
import api from "./utils/axiosConfig";

const emptyForm = {
  guest_id: null,
  name: "",
  phone: "",
  room_id: "",
  rfid_tag_id: "",
};

function AddGuest({ propertyId, rooms = [], availableGuestTags = [], onDataChanged }) {
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [guests, setGuests] = useState([]);

  const refreshGuests = useCallback(async () => {
    if (!propertyId) {
      setGuests([]);
      return;
    }

    try {
      const res = await api.get("/guest/all", {
        params: { property_id: Number(propertyId), include_inactive: true },
      });
      setGuests(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      alert(err.response?.data?.error || "Error loading guests");
    }
  }, [propertyId]);

  useEffect(() => {
    setForm(emptyForm);
    refreshGuests();
  }, [propertyId, refreshGuests]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
  };

  const refreshAll = async () => {
    await refreshGuests();
    if (onDataChanged) {
      await onDataChanged();
    }
  };

  const handleSubmit = async () => {
    if (!propertyId) {
      alert("Select a property first");
      return;
    }

    if (!form.name || !form.room_id) {
      alert("Name and room are required.");
      return;
    }

    try {
      setBusy(true);

      if (form.guest_id) {
        await api.patch(`/guest/update/${form.guest_id}`, {
          name: form.name,
          phone: form.phone || null,
          room_id: Number(form.room_id),
        });
        alert("Guest updated successfully");
      } else {
        await api.post("/guest/add", {
          property_id: Number(propertyId),
          name: form.name,
          phone: form.phone || null,
          room_id: Number(form.room_id),
          rfid_tag_id: form.rfid_tag_id ? Number(form.rfid_tag_id) : null,
        });
        alert("Guest added successfully");
      }

      resetForm();
      await refreshAll();
    } catch (err) {
      alert(err.response?.data?.error || "Error saving guest");
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (guest) => {
    setForm({
      guest_id: guest.guest_id,
      name: guest.name || "",
      phone: guest.phone || "",
      room_id: guest.room_id ? String(guest.room_id) : "",
      rfid_tag_id: "",
    });
  };

  const checkoutGuest = async (guestId) => {
    try {
      await api.post(`/guest/checkout/${guestId}`);
      alert("Guest checked out successfully");
      await refreshAll();
    } catch (err) {
      alert(err.response?.data?.error || "Error checking out guest");
    }
  };

  const deactivateGuest = async (guestId) => {
    try {
      await api.patch(`/guest/deactivate/${guestId}`);
      alert("Guest deactivated successfully");
      if (Number(form.guest_id) === Number(guestId)) {
        resetForm();
      }
      await refreshAll();
    } catch (err) {
      alert(err.response?.data?.error || "Error deactivating guest");
    }
  };

  const deleteGuest = async (guestId) => {
    try {
      await api.delete(`/guest/delete/${guestId}`);
      alert("Guest deleted successfully");
      if (Number(form.guest_id) === Number(guestId)) {
        resetForm();
      }
      await refreshAll();
    } catch (err) {
      alert(err.response?.data?.error || "Error deleting guest");
    }
  };

  const assignRfid = async (guestId, rfidTagId) => {
    if (!rfidTagId) {
      alert("Select an RFID tag first");
      return;
    }

    try {
      await api.post("/rfid/assign", {
        rfid_tag_id: Number(rfidTagId),
        assignee_type: "GUEST",
        assignee_id: Number(guestId),
      });
      alert("RFID assigned successfully");
      await refreshAll();
    } catch (err) {
      alert(err.response?.data?.error || "Error assigning RFID");
    }
  };

  return (
    <div>
      <h2>Guest Management</h2>
      {!propertyId ? <p>Select a property to manage guests.</p> : null}

      <h3>{form.guest_id ? "Edit Guest" : "Add Guest"}</h3>
      <div className="grid-2">
        <input placeholder="Name" value={form.name} onChange={(e) => updateField("name", e.target.value)} />
        <input placeholder="Phone" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
        <select value={form.room_id} onChange={(e) => updateField("room_id", e.target.value)}>
          <option value="">Select Room</option>
          {rooms.map((room) => (
            <option key={room.room_id} value={room.room_id}>
              {room.room_number}
              {room.room_type ? ` - ${room.room_type}` : ""}
            </option>
          ))}
        </select>
        <select
          value={form.rfid_tag_id}
          onChange={(e) => updateField("rfid_tag_id", e.target.value)}
        >
          <option value="">Assign RFID Later (Optional)</option>
          {availableGuestTags.map((tag) => (
            <option key={tag.rfid_tag_id} value={tag.rfid_tag_id}>
              {tag.tag_code}
            </option>
          ))}
        </select>
      </div>
      <div className="inline-actions">
        <button onClick={handleSubmit} disabled={busy || !propertyId}>
          {busy ? "Saving..." : form.guest_id ? "Update Guest" : "Add Guest"}
        </button>
        {form.guest_id ? (
          <button type="button" className="secondary-button" onClick={resetForm}>
            Cancel Edit
          </button>
        ) : null}
      </div>

      <h3>Guest List</h3>
      <button onClick={refreshGuests} disabled={!propertyId}>Refresh</button>
      <table border="1" style={{ marginTop: "10px" }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Phone</th>
            <th>Room</th>
            <th>Status</th>
            <th>Active</th>
            <th>RFID</th>
            <th>Assign RFID</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {guests.map((guest) => (
            <tr key={guest.guest_id}>
              <td>{guest.guest_id}</td>
              <td>{guest.name}</td>
              <td>{guest.phone || "-"}</td>
              <td>{guest.room_number || "-"}</td>
              <td>{guest.status}</td>
              <td>{guest.is_active ? "Yes" : "No"}</td>
              <td>{guest.tag_code || "-"}</td>
              <td>
                {guest.is_active && !guest.tag_code ? (
                  <div className="inline-actions">
                    <select
                      value={guest._selectedTagId || ""}
                      onChange={(e) =>
                        setGuests((prev) =>
                          prev.map((item) =>
                            item.guest_id === guest.guest_id
                              ? { ...item, _selectedTagId: e.target.value }
                              : item
                          )
                        )
                      }
                    >
                      <option value="">Select Guest RFID</option>
                      {availableGuestTags.map((tag) => (
                        <option key={tag.rfid_tag_id} value={tag.rfid_tag_id}>
                          {tag.tag_code}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => assignRfid(guest.guest_id, guest._selectedTagId)}
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
                  <button type="button" onClick={() => startEdit(guest)} disabled={!guest.is_active}>
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => checkoutGuest(guest.guest_id)}
                    disabled={!guest.is_active || guest.status === "CHECKED_OUT"}
                  >
                    Checkout
                  </button>
                  <button
                    type="button"
                    onClick={() => deactivateGuest(guest.guest_id)}
                    disabled={!guest.is_active}
                  >
                    Deactivate
                  </button>
                  <button type="button" onClick={() => deleteGuest(guest.guest_id)}>
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

export default AddGuest;
