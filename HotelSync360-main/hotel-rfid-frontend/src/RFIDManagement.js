import { useEffect, useState } from "react";
import api from "./utils/axiosConfig";

function RFIDManagement({ onDataChanged }) {
  const [tags, setTags] = useState([]);
  const [createForm, setCreateForm] = useState({
    tag_code: "",
    tag_type: "GUEST",
  });
  const [lastGeneratedCode, setLastGeneratedCode] = useState("");

  const fetchTags = async () => {
    try {
      const res = await api.get("/rfid/all");
      setTags(res.data);
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Error loading RFID tags";
      alert(errorMessage);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const refreshAll = async () => {
    await fetchTags();
    if (onDataChanged) {
      await onDataChanged();
    }
  };

  const createTag = async () => {
    try {
      const payload = {
        tag_type: createForm.tag_type,
        tag_code: createForm.tag_code || undefined,
      };

      const res = await api.post("/rfid/create", payload);
      setLastGeneratedCode(res.data?.tag_code || "");
      alert(`RFID tag created. Code: ${res.data?.tag_code || "N/A"}`);
      setCreateForm((prev) => ({ ...prev, tag_code: "" }));
      await refreshAll();
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Error creating RFID tag";
      alert(errorMessage);
    }
  };

  const releaseTag = async (rfidTagId) => {
    try {
      await api.post("/rfid/release", { rfid_tag_id: Number(rfidTagId) });
      alert("RFID released successfully");
      await refreshAll();
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Error releasing RFID";
      alert(errorMessage);
    }
  };

  const deactivateTag = async (rfidTagId) => {
    try {
      await api.delete(`/rfid/${Number(rfidTagId)}`);
      alert("RFID tag deactivated");
      await refreshAll();
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Error deactivating RFID";
      alert(errorMessage);
    }
  };

  return (
    <div>
      <h2>RFID Management</h2>

      <h3>Create RFID Tag</h3>
      <div className="grid-3">
        <input
          placeholder="Tag Code (optional)"
          value={createForm.tag_code}
          onChange={(e) => setCreateForm((prev) => ({ ...prev, tag_code: e.target.value }))}
        />
        <select
          value={createForm.tag_type}
          onChange={(e) => setCreateForm({ tag_code: "", tag_type: e.target.value })}
        >
          <option value="GUEST">Guest</option>
          <option value="STAFF">Staff</option>
        </select>
      </div>
      <button onClick={createTag}>Create Tag</button>
      {lastGeneratedCode ? (
        <p>
          Generated RFID Code: <strong>{lastGeneratedCode}</strong>
        </p>
      ) : null}

      <h3>RFID Tag List</h3>
      <button onClick={fetchTags}>Refresh</button>
      <table border="1" style={{ marginTop: "10px" }}>
        <thead>
          <tr>
            <th>RFID Tag ID</th>
            <th>RFID Code</th>
            <th>Type</th>
            <th>Active</th>
            <th>Assigned To</th>
            <th>Assigned At</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {tags.map((tag) => (
            <tr key={tag.rfid_tag_id}>
              <td>{tag.rfid_tag_id}</td>
              <td>{tag.tag_code}</td>
              <td>{tag.tag_type}</td>
              <td>{tag.is_active ? "Yes" : "No"}</td>
              <td>
                {tag.assignee_type
                  ? `${tag.assignee_type}: ${tag.assignee_name || tag.assignee_id}`
                  : "Unassigned"}
              </td>
              <td>{tag.assigned_at || "-"}</td>
              <td>
                <div className="inline-actions">
                  <button
                    type="button"
                    onClick={() => releaseTag(tag.rfid_tag_id)}
                    disabled={!tag.assignee_type}
                  >
                    Release
                  </button>
                  <button type="button" onClick={() => deactivateTag(tag.rfid_tag_id)}>
                    Deactivate
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

export default RFIDManagement;
