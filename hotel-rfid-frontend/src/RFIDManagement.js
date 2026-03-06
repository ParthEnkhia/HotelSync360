import { useEffect, useState } from "react";
import api from "./utils/axiosConfig";

function RFIDManagement() {
  const [tags, setTags] = useState([]);
  const [createForm, setCreateForm] = useState({ tag_type: "GUEST" });
  const [assignForm, setAssignForm] = useState({
    rfid_tag_id: "",
    assignee_type: "GUEST",
    assignee_id: "",
  });
  const [releaseTagId, setReleaseTagId] = useState("");
  const [deactivateTagId, setDeactivateTagId] = useState("");
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

  const createTag = async () => {
    try {
      const res = await api.post("/rfid/create", { tag_type: createForm.tag_type });
      setLastGeneratedCode(res.data?.tag_code || "");
      alert(`RFID tag created. Code: ${res.data?.tag_code || "N/A"}`);
      fetchTags();
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Error creating RFID tag";
      alert(errorMessage);
    }
  };

  const assignTag = async () => {
    try {
      await api.post("/rfid/assign", {
        rfid_tag_id: Number(assignForm.rfid_tag_id),
        assignee_type: assignForm.assignee_type,
        assignee_id: Number(assignForm.assignee_id),
      });
      alert("RFID assigned successfully");
      fetchTags();
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Error assigning RFID";
      alert(errorMessage);
    }
  };

  const releaseTag = async () => {
    try {
      await api.post("/rfid/release", { rfid_tag_id: Number(releaseTagId) });
      alert("RFID released successfully");
      setReleaseTagId("");
      fetchTags();
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Error releasing RFID";
      alert(errorMessage);
    }
  };

  const deactivateTag = async () => {
    try {
      await api.delete(`/rfid/${Number(deactivateTagId)}`);
      alert("RFID tag deactivated");
      setDeactivateTagId("");
      fetchTags();
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Error deactivating RFID";
      alert(errorMessage);
    }
  };

  return (
    <div>
      <h2>RFID Management</h2>

      <h3>Create RFID Tag</h3>
      <p>RFID code is auto-generated as a unique 8-digit number.</p>
      <select
        value={createForm.tag_type}
        onChange={(e) => setCreateForm((prev) => ({ ...prev, tag_type: e.target.value }))}
      >
        <option value="GUEST">GUEST</option>
        <option value="STAFF">STAFF</option>
      </select>
      <button onClick={createTag}>Create</button>
      {lastGeneratedCode ? (
        <p>
          Generated RFID Code: <strong>{lastGeneratedCode}</strong>
        </p>
      ) : null}

      <h3>Assign RFID Tag</h3>
      <input
        placeholder="RFID Tag ID"
        value={assignForm.rfid_tag_id}
        onChange={(e) => setAssignForm((prev) => ({ ...prev, rfid_tag_id: e.target.value }))}
      />
      <select
        value={assignForm.assignee_type}
        onChange={(e) => setAssignForm((prev) => ({ ...prev, assignee_type: e.target.value }))}
      >
        <option value="GUEST">GUEST</option>
        <option value="STAFF">STAFF</option>
      </select>
      <input
        placeholder="Assignee ID"
        value={assignForm.assignee_id}
        onChange={(e) => setAssignForm((prev) => ({ ...prev, assignee_id: e.target.value }))}
      />
      <button onClick={assignTag}>Assign</button>

      <h3>Release RFID Tag</h3>
      <input
        placeholder="RFID Tag ID"
        value={releaseTagId}
        onChange={(e) => setReleaseTagId(e.target.value)}
      />
      <button onClick={releaseTag}>Release</button>

      <h3>Deactivate RFID Tag</h3>
      <input
        placeholder="RFID Tag ID"
        value={deactivateTagId}
        onChange={(e) => setDeactivateTagId(e.target.value)}
      />
      <button onClick={deactivateTag}>Deactivate</button>

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
          </tr>
        </thead>
        <tbody>
          {tags.map((tag) => (
            <tr key={tag.rfid_tag_id}>
              <td>{tag.rfid_tag_id}</td>
              <td>{tag.tag_code}</td>
              <td>{tag.tag_type}</td>
              <td>{tag.is_active ? "Yes" : "No"}</td>
              <td>{tag.assignee_type ? `${tag.assignee_type} #${tag.assignee_id}` : "Unassigned"}</td>
              <td>{tag.assigned_at || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default RFIDManagement;
