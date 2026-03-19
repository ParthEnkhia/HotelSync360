import { useState } from "react";
import api from "./utils/axiosConfig";

const emptyPropertyForm = {
  property_name: "",
  address_line1: "",
  city: "",
  state: "",
  country: "",
};

const emptyZoneForm = {
  zone_name: "",
  zone_category: "",
};

const emptyRoomForm = {
  room_number: "",
  room_type: "",
  zone_id: "",
};

const emptyReaderForm = {
  zone_id: "",
  reader_name: "",
  reader_connection: "",
  status: "ONLINE",
};

function ReferenceSetup({
  propertyId,
  zones = [],
  rooms = [],
  readers = [],
  onPropertiesChanged,
  onPropertyDataChanged,
}) {
  const [propertyForm, setPropertyForm] = useState(emptyPropertyForm);
  const [zoneForm, setZoneForm] = useState(emptyZoneForm);
  const [roomForm, setRoomForm] = useState(emptyRoomForm);
  const [readerForm, setReaderForm] = useState(emptyReaderForm);

  const createProperty = async () => {
    if (!propertyForm.property_name) {
      alert("Property name is required");
      return;
    }

    try {
      await api.post("/reference/properties", propertyForm);
      alert("Property created successfully");
      setPropertyForm(emptyPropertyForm);
      if (onPropertiesChanged) {
        await onPropertiesChanged();
      }
    } catch (err) {
      alert(err.response?.data?.error || "Error creating property");
    }
  };

  const createZone = async () => {
    if (!propertyId) {
      alert("Select a property first");
      return;
    }
    if (!zoneForm.zone_name) {
      alert("Zone name is required");
      return;
    }

    try {
      await api.post("/reference/zones", {
        property_id: Number(propertyId),
        zone_name: zoneForm.zone_name,
        zone_category: zoneForm.zone_category || null,
      });
      alert("Zone created successfully");
      setZoneForm(emptyZoneForm);
      if (onPropertyDataChanged) {
        await onPropertyDataChanged();
      }
    } catch (err) {
      alert(err.response?.data?.error || "Error creating zone");
    }
  };

  const createRoom = async () => {
    if (!propertyId) {
      alert("Select a property first");
      return;
    }
    if (!roomForm.room_number) {
      alert("Room number is required");
      return;
    }

    try {
      await api.post("/reference/rooms", {
        property_id: Number(propertyId),
        room_number: roomForm.room_number,
        room_type: roomForm.room_type || null,
        zone_id: roomForm.zone_id ? Number(roomForm.zone_id) : null,
      });
      alert("Room created successfully");
      setRoomForm(emptyRoomForm);
      if (onPropertyDataChanged) {
        await onPropertyDataChanged();
      }
    } catch (err) {
      alert(err.response?.data?.error || "Error creating room");
    }
  };

  const createReader = async () => {
    if (!propertyId) {
      alert("Select a property first");
      return;
    }
    if (!readerForm.zone_id) {
      alert("Select a zone first");
      return;
    }

    try {
      await api.post("/reference/readers", {
        property_id: Number(propertyId),
        zone_id: Number(readerForm.zone_id),
        reader_name: readerForm.reader_name || null,
        reader_connection: readerForm.reader_connection || null,
        status: readerForm.status,
      });
      alert("Reader created successfully");
      setReaderForm(emptyReaderForm);
      if (onPropertyDataChanged) {
        await onPropertyDataChanged();
      }
    } catch (err) {
      alert(err.response?.data?.error || "Error creating reader");
    }
  };

  return (
    <div>
      <h2>Property Setup</h2>
      <p>Create the property data that powers the dropdowns for rooms, zones, readers, and assignments.</p>

      <h3>Add Property</h3>
      <div className="grid-3">
        <input
          placeholder="Property Name"
          value={propertyForm.property_name}
          onChange={(e) => setPropertyForm((prev) => ({ ...prev, property_name: e.target.value }))}
        />
        <input
          placeholder="Address"
          value={propertyForm.address_line1}
          onChange={(e) => setPropertyForm((prev) => ({ ...prev, address_line1: e.target.value }))}
        />
        <input
          placeholder="City"
          value={propertyForm.city}
          onChange={(e) => setPropertyForm((prev) => ({ ...prev, city: e.target.value }))}
        />
        <input
          placeholder="State"
          value={propertyForm.state}
          onChange={(e) => setPropertyForm((prev) => ({ ...prev, state: e.target.value }))}
        />
        <input
          placeholder="Country"
          value={propertyForm.country}
          onChange={(e) => setPropertyForm((prev) => ({ ...prev, country: e.target.value }))}
        />
      </div>
      <button onClick={createProperty}>Create Property</button>

      <h3>Add Zone</h3>
      <div className="grid-3">
        <input
          placeholder="Zone Name"
          value={zoneForm.zone_name}
          onChange={(e) => setZoneForm((prev) => ({ ...prev, zone_name: e.target.value }))}
        />
        <input
          placeholder="Zone Category"
          value={zoneForm.zone_category}
          onChange={(e) => setZoneForm((prev) => ({ ...prev, zone_category: e.target.value }))}
        />
      </div>
      <button onClick={createZone} disabled={!propertyId}>Create Zone</button>

      <h3>Add Room</h3>
      <div className="grid-3">
        <input
          placeholder="Room Number"
          value={roomForm.room_number}
          onChange={(e) => setRoomForm((prev) => ({ ...prev, room_number: e.target.value }))}
        />
        <input
          placeholder="Room Type"
          value={roomForm.room_type}
          onChange={(e) => setRoomForm((prev) => ({ ...prev, room_type: e.target.value }))}
        />
        <select value={roomForm.zone_id} onChange={(e) => setRoomForm((prev) => ({ ...prev, zone_id: e.target.value }))}>
          <option value="">Select Zone (Optional)</option>
          {zones.map((zone) => (
            <option key={zone.zone_id} value={zone.zone_id}>
              {zone.zone_name}
            </option>
          ))}
        </select>
      </div>
      <button onClick={createRoom} disabled={!propertyId}>Create Room</button>

      <h3>Add RFID Reader</h3>
      <div className="grid-3">
        <select
          value={readerForm.zone_id}
          onChange={(e) => setReaderForm((prev) => ({ ...prev, zone_id: e.target.value }))}
        >
          <option value="">Select Zone</option>
          {zones.map((zone) => (
            <option key={zone.zone_id} value={zone.zone_id}>
              {zone.zone_name}
            </option>
          ))}
        </select>
        <input
          placeholder="Reader Name"
          value={readerForm.reader_name}
          onChange={(e) => setReaderForm((prev) => ({ ...prev, reader_name: e.target.value }))}
        />
        <input
          placeholder="Reader Connection"
          value={readerForm.reader_connection}
          onChange={(e) => setReaderForm((prev) => ({ ...prev, reader_connection: e.target.value }))}
        />
      </div>
      <button onClick={createReader} disabled={!propertyId}>Create Reader</button>

      <div className="grid-3" style={{ marginTop: "12px" }}>
        <div>
          <strong>Rooms</strong>
          <p>{rooms.length ? rooms.map((room) => room.room_number).join(", ") : "No rooms yet"}</p>
        </div>
        <div>
          <strong>Zones</strong>
          <p>{zones.length ? zones.map((zone) => zone.zone_name).join(", ") : "No zones yet"}</p>
        </div>
        <div>
          <strong>Readers</strong>
          <p>{readers.length ? readers.map((reader) => reader.reader_name || `Reader ${reader.reader_id}`).join(", ") : "No readers yet"}</p>
        </div>
      </div>
    </div>
  );
}

export default ReferenceSetup;
