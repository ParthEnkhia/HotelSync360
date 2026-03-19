import { useCallback, useEffect, useMemo, useState } from "react";
import api from "./utils/axiosConfig";

const getHeatLabel = (ratio) => {
  if (ratio >= 0.85) return "Peak";
  if (ratio >= 0.55) return "Busy";
  if (ratio > 0) return "Active";
  return "Empty";
};

function ZoneHeatmap({ propertyId }) {
  const [zones, setZones] = useState([]);
  const [maxOccupancy, setMaxOccupancy] = useState(0);
  const [selectedZoneId, setSelectedZoneId] = useState("");

  const fetchHeatmap = useCallback(async () => {
    if (!propertyId) {
      setZones([]);
      setMaxOccupancy(0);
      setSelectedZoneId("");
      return;
    }

    try {
      const res = await api.get("/movement/analytics/zone-heatmap", {
        params: { property_id: Number(propertyId) },
      });

      const nextZones = Array.isArray(res.data?.zones) ? res.data.zones : [];
      setZones(nextZones);
      setMaxOccupancy(Number(res.data?.max_occupancy || 0));
      setSelectedZoneId((current) => {
        if (current && nextZones.some((zone) => String(zone.zone_id) === String(current))) {
          return current;
        }
        return nextZones[0] ? String(nextZones[0].zone_id) : "";
      });
    } catch (err) {
      alert(err.response?.data?.error || "Error loading zone heatmap");
    }
  }, [propertyId]);

  useEffect(() => {
    fetchHeatmap();
  }, [fetchHeatmap]);

  const selectedZone = useMemo(
    () => zones.find((zone) => String(zone.zone_id) === String(selectedZoneId)) || null,
    [zones, selectedZoneId]
  );

  return (
    <div>
      <div className="section-header">
        <div>
          <h2>Zone Heatmap</h2>
          <p>
            View live occupancy by zone and inspect exactly who is currently present based on the latest RFID scans.
          </p>
        </div>
        <button type="button" onClick={fetchHeatmap} disabled={!propertyId}>
          Refresh Heatmap
        </button>
      </div>

      {!propertyId ? <p>Select a property to view the heatmap.</p> : null}

      {propertyId ? (
        <>
          <div className="heatmap-summary">
            <div className="heatmap-stat">
              <span className="heatmap-stat-label">Zones</span>
              <strong>{zones.length}</strong>
            </div>
            <div className="heatmap-stat">
              <span className="heatmap-stat-label">People Tracked</span>
              <strong>{zones.reduce((sum, zone) => sum + Number(zone.occupancy_count || 0), 0)}</strong>
            </div>
            <div className="heatmap-stat">
              <span className="heatmap-stat-label">Peak Zone Load</span>
              <strong>{maxOccupancy}</strong>
            </div>
          </div>

          <div className="heatmap-grid">
            {zones.map((zone) => (
              <button
                key={zone.zone_id}
                type="button"
                className={`heatmap-card ${String(zone.zone_id) === String(selectedZoneId) ? "selected" : ""}`}
                style={{ "--heat": zone.heat_ratio ?? 0 }}
                onClick={() => setSelectedZoneId(String(zone.zone_id))}
              >
                <div className="heatmap-card-top">
                  <span className="heatmap-zone-name">{zone.zone_name}</span>
                  <span className="heatmap-zone-badge">{getHeatLabel(Number(zone.heat_ratio || 0))}</span>
                </div>
                <strong className="heatmap-count">{zone.occupancy_count}</strong>
                <span className="heatmap-subtitle">
                  {zone.zone_category || "General Zone"}
                </span>
              </button>
            ))}
          </div>

          <div className="zone-detail-card">
            <div className="section-header">
              <div>
                <h3>Specific Zone Details</h3>
                <p>
                  {selectedZone
                    ? `${selectedZone.zone_name} currently has ${selectedZone.occupancy_count} people.`
                    : "Select a zone to inspect its occupants."}
                </p>
              </div>
              <select value={selectedZoneId} onChange={(e) => setSelectedZoneId(e.target.value)}>
                <option value="">Select Zone</option>
                {zones.map((zone) => (
                  <option key={zone.zone_id} value={zone.zone_id}>
                    {zone.zone_name}
                  </option>
                ))}
              </select>
            </div>

            {selectedZone ? (
              selectedZone.occupants?.length ? (
                <div className="occupant-list">
                  {selectedZone.occupants.map((occupant) => (
                    <div key={occupant.rfid_tag_id} className="occupant-card">
                      <div className="occupant-name-row">
                        <strong>{occupant.display_name}</strong>
                        <span className="occupant-type">{occupant.assignee_type || occupant.tag_type}</span>
                      </div>
                      <p>RFID: {occupant.tag_code}</p>
                      <p>Reader: {occupant.reader_name || "N/A"}</p>
                      <p>Last Scan: {occupant.scan_time}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No one is currently detected in this zone.</p>
              )
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

export default ZoneHeatmap;
