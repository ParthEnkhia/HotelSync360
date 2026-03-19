import { useCallback, useEffect, useMemo, useState } from "react";
import AddGuest from "./AddGuest";
import ScanRFID from "./ScanRFID";
import CurrentLocation from "./CurrentLocation";
import MovementHistory from "./MovementHistory";
import RFIDManagement from "./RFIDManagement";
import StaffAllocation from "./StaffAllocation";
import api, { getAuthToken, setAuthToken } from "./utils/axiosConfig";

const emptyPropertyContext = {
  property: null,
  rooms: [],
  zones: [],
  readers: [],
  staff: [],
  guests: [],
  available_guest_tags: [],
  available_staff_tags: [],
  active_tags: [],
};

function App() {
  const [propertyId, setPropertyId] = useState("");
  const [connection, setConnection] = useState({
    status: "checking",
    message: "Checking backend...",
    authRequired: false,
  });
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [sessionStarted, setSessionStarted] = useState(() => Boolean(getAuthToken()));
  const [authBusy, setAuthBusy] = useState(false);
  const [properties, setProperties] = useState([]);
  const [propertyContext, setPropertyContext] = useState(emptyPropertyContext);

  const clearSession = useCallback(() => {
    setAuthToken("");
    setSessionStarted(false);
    setProperties([]);
    setPropertyId("");
    setPropertyContext(emptyPropertyContext);
  }, []);

  const checkBackend = useCallback(async () => {
    setConnection((prev) => ({ ...prev, status: "checking", message: "Checking backend..." }));
    try {
      const res = await api.get("/");
      const data = res.data || {};
      setConnection({
        status: "online",
        message: data.message || "Backend is online",
        authRequired: Boolean(data.auth_required),
      });
    } catch (error) {
      setConnection({
        status: "offline",
        message: error.response?.data?.error || "Backend is offline or unreachable",
        authRequired: false,
      });
    }
  }, []);

  const fetchProperties = useCallback(async () => {
    if (!sessionStarted) {
      return;
    }

    try {
      const res = await api.get("/reference/properties");
      const nextProperties = Array.isArray(res.data) ? res.data : [];
      setProperties(nextProperties);
      setPropertyId((current) => {
        if (current && nextProperties.some((property) => String(property.property_id) === String(current))) {
          return current;
        }
        return nextProperties[0] ? String(nextProperties[0].property_id) : "";
      });
    } catch (error) {
      if (error.response?.status === 401) {
        clearSession();
        return;
      }
      alert(error.response?.data?.error || "Error loading properties");
    }
  }, [clearSession, sessionStarted]);

  const fetchPropertyContext = useCallback(async () => {
    if (!sessionStarted || !propertyId) {
      setPropertyContext(emptyPropertyContext);
      return;
    }

    try {
      const res = await api.get(`/reference/property/${Number(propertyId)}/options`);
      setPropertyContext({
        ...emptyPropertyContext,
        ...res.data,
      });
    } catch (error) {
      if (error.response?.status === 401) {
        clearSession();
        return;
      }
      alert(error.response?.data?.error || "Error loading property data");
    }
  }, [clearSession, propertyId, sessionStarted]);

  useEffect(() => {
    checkBackend();
  }, [checkBackend]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  useEffect(() => {
    fetchPropertyContext();
  }, [fetchPropertyContext]);

  const handleLogin = async () => {
    if (!loginForm.email || !loginForm.password) {
      alert("Email and password are required");
      return;
    }

    try {
      setAuthBusy(true);
      const res = await api.post("/auth/login", loginForm);
      const token = res.data?.token || "";

      if (!token) {
        throw new Error("Missing token");
      }

      setAuthToken(token);
      setSessionStarted(true);
      setLoginForm({ email: loginForm.email, password: "" });
      await checkBackend();
    } catch (error) {
      const errorMessage = error.response?.data?.error || "Login failed";
      alert(errorMessage);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    setLoginForm({ email: "", password: "" });
  };

  const selectedProperty = useMemo(
    () => properties.find((property) => String(property.property_id) === String(propertyId)) || null,
    [properties, propertyId]
  );

  if (!sessionStarted) {
    return (
      <div className="login-shell">
        <div className="login-card">
          <p className="eyebrow">Hotel RFID Dashboard</p>
          <h1>HotelSync360</h1>
          <p className="login-copy">Sign in to open the dashboard.</p>
          <div className="grid-1">
            <input
              type="email"
              placeholder="Admin Email"
              value={loginForm.email}
              onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
            />
            <input
              type="password"
              placeholder="Password"
              value={loginForm.password}
              onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
            />
            <button type="button" onClick={handleLogin} disabled={authBusy || connection.status === "offline"}>
              {authBusy ? "Signing In..." : "Login"}
            </button>
            {!connection.authRequired ? (
              <button type="button" className="secondary-button" onClick={() => setSessionStarted(true)}>
                Continue to Dashboard
              </button>
            ) : null}
          </div>
          <div className={`status-badge ${connection.status}`}>{connection.message}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-row">
          <div>
            <p className="eyebrow">Hotel RFID Dashboard</p>
            <h1>HotelSync360</h1>
            <p className="subtle">
              {selectedProperty
                ? `${selectedProperty.property_name}${selectedProperty.city ? `, ${selectedProperty.city}` : ""}`
                : "Select an active property to continue."}
            </p>
          </div>
          <button type="button" className="secondary-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
        <div className="toolbar">
          <label htmlFor="propertyId">Property</label>
          <select id="propertyId" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
            <option value="">Select Property</option>
            {properties.map((property) => (
              <option key={property.property_id} value={property.property_id}>
                {property.property_name}
              </option>
            ))}
          </select>
          <button onClick={checkBackend}>Refresh Backend Status</button>
          <div className={`status-badge ${connection.status}`}>{connection.message}</div>
        </div>
      </header>

      <section className="panel">
        <RFIDManagement
          guests={propertyContext.guests}
          staff={propertyContext.staff}
          availableGuestTags={propertyContext.available_guest_tags}
          availableStaffTags={propertyContext.available_staff_tags}
          onDataChanged={fetchPropertyContext}
        />
      </section>
      <section className="panel">
        <StaffAllocation
          propertyId={propertyId}
          staff={propertyContext.staff}
          zones={propertyContext.zones}
        />
      </section>
      <section className="panel">
        <AddGuest
          propertyId={propertyId}
          rooms={propertyContext.rooms}
          availableGuestTags={propertyContext.available_guest_tags}
          onDataChanged={fetchPropertyContext}
        />
      </section>
      <section className="panel">
        <ScanRFID tags={propertyContext.active_tags} readers={propertyContext.readers} />
      </section>
      <section className="panel">
        <CurrentLocation propertyId={propertyId} tags={propertyContext.active_tags} />
      </section>
      <section className="panel">
        <MovementHistory propertyId={propertyId} tags={propertyContext.active_tags} />
      </section>
    </div>
  );
}

export default App;
