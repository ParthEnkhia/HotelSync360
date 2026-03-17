import { useEffect, useState } from "react";
import AddGuest from "./AddGuest";
import ScanRFID from "./ScanRFID";
import CurrentLocation from "./CurrentLocation";
import MovementHistory from "./MovementHistory";
import RFIDManagement from "./RFIDManagement";
import StaffAllocation from "./StaffAllocation";
import api, { getAuthToken, setAuthToken } from "./utils/axiosConfig";

function App() {
  const [propertyId, setPropertyId] = useState("1");
  const [connection, setConnection] = useState({ status: "checking", message: "Checking backend..." });
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [authToken, setAuthTokenState] = useState(() => getAuthToken());
  const [authBusy, setAuthBusy] = useState(false);

  const checkBackend = async () => {
    setConnection({ status: "checking", message: "Checking backend..." });
    try {
      const res = await api.get("/");
      setConnection({
        status: "online",
        message: typeof res.data === "string" ? res.data : "Backend is online",
      });
    } catch (error) {
      setConnection({ status: "offline", message: "Backend is offline or unreachable" });
    }
  };

  useEffect(() => {
    checkBackend();
  }, []);

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
      setAuthTokenState(token);
      setLoginForm({ email: loginForm.email, password: "" });
      await checkBackend();
      alert("Login successful");
    } catch (error) {
      const errorMessage = error.response?.data?.error || "Login failed";
      alert(errorMessage);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = () => {
    setAuthToken("");
    setAuthTokenState("");
    setLoginForm({ email: "", password: "" });
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>HotelSync360 - RFID Tracker</h1>
        <div className="toolbar">
          <label htmlFor="propertyId">Active Property ID</label>
          <input
            id="propertyId"
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="1"
          />
          <button onClick={checkBackend}>Refresh Backend Status</button>
        </div>
        <div className={`status-badge ${connection.status}`}>
          {connection.message}
        </div>
        <div className="auth-panel">
          <h2>Admin Access</h2>
          <div className="grid-3">
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
            {authToken ? (
              <button type="button" onClick={handleLogout}>
                Logout
              </button>
            ) : (
              <button type="button" onClick={handleLogin} disabled={authBusy}>
                {authBusy ? "Signing In..." : "Login"}
              </button>
            )}
          </div>
          <p className="auth-status">
            {authToken ? "JWT stored and sent with API requests." : "Not authenticated. Required when AUTH_REQUIRED=true."}
          </p>
        </div>
      </header>

      <section className="panel"><RFIDManagement /></section>
      <section className="panel"><StaffAllocation propertyId={propertyId} /></section>
      <section className="panel"><AddGuest propertyId={propertyId} /></section>
      <section className="panel"><ScanRFID /></section>
      <section className="panel"><CurrentLocation propertyId={propertyId} /></section>
      <section className="panel"><MovementHistory propertyId={propertyId} /></section>
    </div>
  );
}

export default App;
