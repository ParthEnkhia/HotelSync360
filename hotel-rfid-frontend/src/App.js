import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Routes, Route, Navigate,
  useNavigate, useLocation, NavLink,
} from "react-router-dom";

import AddGuest        from "./AddGuest";
import ScanRFID        from "./ScanRFID";
import CurrentLocation from "./CurrentLocation";
import MovementHistory from "./MovementHistory";
import RFIDManagement  from "./RFIDManagement";
import StaffAllocation from "./StaffAllocation";
import PropertyManager from "./PropertyManager";
import Toast, { useToast } from "./components/Toast";
import api, { getAuthToken, setAuthToken } from "./utils/axiosConfig";

/* ─── constants ──────────────────────────────────────────────────────── */
const emptyPropertyContext = {
  property: null, rooms: [], zones: [], readers: [],
  staff: [], guests: [], available_guest_tags: [],
  available_staff_tags: [], active_tags: [],
};

const NAV_ITEMS = [
  { path: "/dashboard/properties", label: "Properties",       icon: "🏨" },
  { path: "/dashboard/rfid",       label: "RFID Tags",        icon: "🏷️" },
  { path: "/dashboard/allocation", label: "Staff Allocation", icon: "👥" },
  { path: "/dashboard/guests",     label: "Guests",           icon: "🛎️" },
  { path: "/dashboard/scan",       label: "Scan RFID",        icon: "📡" },
  { path: "/dashboard/current",    label: "Track Current",    icon: "📍" },
  { path: "/dashboard/history",    label: "Movement History", icon: "📋" },
];

/* ─── Root App ───────────────────────────────────────────────────────── */
export default function App() {
  const [sessionStarted, setSessionStarted] = useState(() => Boolean(getAuthToken()));
  const [authBusy,  setAuthBusy]  = useState(false);
  const [authMode,  setAuthMode]  = useState("signin");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm,setSignupForm]= useState({ name: "", email: "", password: "" });

  const [connection, setConnection] = useState({ status: "checking", message: "Checking connection…", authRequired: false });
  const [properties, setProperties] = useState([]);
  const [propertyId, setPropertyId] = useState("");
  const [propertyContext, setPropertyContext] = useState(emptyPropertyContext);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [toast, setToast] = useToast();
  const navigate = useNavigate();

  const clearSession = useCallback(() => {
    setAuthToken("");
    setSessionStarted(false);
    setProperties([]);
    setPropertyId("");
    setPropertyContext(emptyPropertyContext);
  }, []);

  const checkBackend = useCallback(async () => {
    setConnection((p) => ({ ...p, status: "checking", message: "Checking connection…" }));
    try {
      const res = await api.get("/");
      const d = res.data || {};
      setConnection({ status: "online", message: "System online", authRequired: Boolean(d.auth_required) });
    } catch {
      setConnection({ status: "offline", message: "Cannot reach server", authRequired: false });
    }
  }, []);

  const fetchProperties = useCallback(async () => {
    if (!sessionStarted) return;
    try {
      const res = await api.get("/reference/properties");
      const list = Array.isArray(res.data) ? res.data : [];
      setProperties(list);
      setPropertyId((cur) => {
        if (cur && list.some((p) => String(p.property_id) === String(cur))) return cur;
        return list[0] ? String(list[0].property_id) : "";
      });
    } catch (err) {
      if (err.response?.status === 401) { clearSession(); return; }
    }
  }, [sessionStarted, clearSession]);

  const fetchPropertyContext = useCallback(async () => {
    if (!sessionStarted || !propertyId) { setPropertyContext(emptyPropertyContext); return; }
    try {
      const res = await api.get(`/reference/property/${Number(propertyId)}/options`);
      setPropertyContext({ ...emptyPropertyContext, ...res.data });
    } catch (err) {
      if (err.response?.status === 401) { clearSession(); return; }
    }
  }, [sessionStarted, clearSession, propertyId]);

  useEffect(() => { checkBackend(); }, [checkBackend]);
  useEffect(() => { fetchProperties(); }, [fetchProperties]);
  useEffect(() => { fetchPropertyContext(); }, [fetchPropertyContext]);

  const selectedProperty = useMemo(
    () => properties.find((p) => String(p.property_id) === String(propertyId)) || null,
    [properties, propertyId]
  );

  /* ── auth handlers ── */
  const handleLogin = async () => {
    if (!loginForm.email || !loginForm.password) {
      setToast({ type: "error", message: "Email and password are required." });
      return;
    }
    try {
      setAuthBusy(true);
      const res = await api.post("/auth/login", loginForm);
      const token = res.data?.token || "";
      if (!token) throw new Error("No token returned");
      setAuthToken(token);
      setSessionStarted(true);
      setLoginForm((p) => ({ ...p, password: "" }));
      await checkBackend();
      navigate("/dashboard/properties");
    } catch (err) {
      setToast({ type: "error", message: err.response?.data?.error || "Login failed. Please check your credentials." });
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSignup = async () => {
    if (!signupForm.name || !signupForm.email || !signupForm.password) {
      setToast({ type: "error", message: "Name, email and password are all required." });
      return;
    }
    try {
      setAuthBusy(true);
      await api.post("/auth/register", signupForm);
      setToast({ type: "success", message: "Account created. You can now sign in." });
      setLoginForm({ email: signupForm.email, password: "" });
      setSignupForm({ name: "", email: "", password: "" });
      setAuthMode("signin");
    } catch (err) {
      setToast({ type: "error", message: err.response?.data?.error || "Registration failed." });
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = useCallback(() => {
    clearSession();
    setLoginForm({ email: "", password: "" });
    setAuthMode("signin");
    navigate("/login");
  }, [clearSession, navigate]);

  /* ── routes ── */
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to={sessionStarted ? "/dashboard/properties" : "/login"} replace />} />

        <Route path="/login" element={
          sessionStarted
            ? <Navigate to="/dashboard/properties" replace />
            : <LoginPage
                authMode={authMode} setAuthMode={setAuthMode}
                loginForm={loginForm} setLoginForm={setLoginForm}
                signupForm={signupForm} setSignupForm={setSignupForm}
                handleLogin={handleLogin} handleSignup={handleSignup}
                authBusy={authBusy} connection={connection}
              />
        } />

        <Route path="/dashboard/*" element={
          sessionStarted
            ? <DashboardShell
                connection={connection} checkBackend={checkBackend}
                properties={properties} propertyId={propertyId}
                setPropertyId={setPropertyId} selectedProperty={selectedProperty}
                propertyContext={propertyContext}
                fetchProperties={fetchProperties} fetchPropertyContext={fetchPropertyContext}
                sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}
                handleLogout={handleLogout} setToast={setToast}
              />
            : <Navigate to="/login" replace />
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </>
  );
}

/* ─── Login Page ─────────────────────────────────────────────────────── */
function LoginPage({
  authMode, setAuthMode,
  loginForm, setLoginForm,
  signupForm, setSignupForm,
  handleLogin, handleSignup,
  authBusy, connection,
}) {
  const onKey = (e) => { if (e.key === "Enter") handleLogin(); };

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-card__logo">
          <span style={{ fontSize: 32 }}>🏨</span>
        </div>
        <p className="eyebrow">Hotel RFID Management</p>
        <h1>HotelSync360</h1>
        <p className="login-copy">
          {authMode === "signin"
            ? "Sign in to access the management dashboard."
            : "Create an administrator account to get started."}
        </p>

        <div className="auth-switch">
          <button
            type="button"
            className={authMode === "signin" ? "" : "secondary-button"}
            onClick={() => setAuthMode("signin")}
          >Sign In</button>
          <button
            type="button"
            className={authMode === "signup" ? "" : "secondary-button"}
            onClick={() => setAuthMode("signup")}
          >Create Account</button>
        </div>

        <div className="login-fields">
          {authMode === "signin" ? (
            <>
              <div className="field-group">
                <label className="field-label" htmlFor="login-email">Email address</label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm((p) => ({ ...p, email: e.target.value }))}
                  onKeyDown={onKey}
                />
              </div>
              <div className="field-group">
                <label className="field-label" htmlFor="login-password">Password</label>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))}
                  onKeyDown={onKey}
                />
              </div>
              <button
                type="button"
                className="login-submit"
                onClick={handleLogin}
                disabled={authBusy || connection.status === "offline"}
              >
                {authBusy ? "Signing in…" : "Sign In"}
              </button>
            </>
          ) : (
            <>
              <div className="field-group">
                <label className="field-label" htmlFor="signup-name">Full name</label>
                <input
                  id="signup-name"
                  type="text"
                  autoComplete="name"
                  value={signupForm.name}
                  onChange={(e) => setSignupForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="field-group">
                <label className="field-label" htmlFor="signup-email">Email address</label>
                <input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  value={signupForm.email}
                  onChange={(e) => setSignupForm((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div className="field-group">
                <label className="field-label" htmlFor="signup-password">Password</label>
                <input
                  id="signup-password"
                  type="password"
                  autoComplete="new-password"
                  value={signupForm.password}
                  onChange={(e) => setSignupForm((p) => ({ ...p, password: e.target.value }))}
                />
              </div>
              <button
                type="button"
                className="login-submit"
                onClick={handleSignup}
                disabled={authBusy || connection.status === "offline"}
              >
                {authBusy ? "Creating account…" : "Create Account"}
              </button>
            </>
          )}
        </div>

        <div className={`status-badge ${connection.status}`} style={{ marginTop: 20 }}>
          {connection.message}
        </div>
      </div>
    </div>
  );
}

/* ─── Dashboard Shell ────────────────────────────────────────────────── */
function DashboardShell({
  connection, checkBackend,
  properties, propertyId, setPropertyId, selectedProperty,
  propertyContext, fetchProperties, fetchPropertyContext,
  sidebarOpen, setSidebarOpen,
  handleLogout, setToast,
}) {
  const location = useLocation();
  useEffect(() => { setSidebarOpen(false); }, [location.pathname, setSidebarOpen]);

  return (
    <div className="dashboard-root">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "sidebar--open" : ""}`}>
        <div className="sidebar__brand">
          <span className="sidebar__brand-icon">🏨</span>
          <div>
            <div className="sidebar__brand-name">HotelSync360</div>
            <div className="sidebar__brand-sub">RFID Management</div>
          </div>
        </div>

        <nav className="sidebar__nav" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `sidebar__link${isActive ? " sidebar__link--active" : ""}`}
            >
              <span className="sidebar__link-icon">{item.icon}</span>
              <span className="sidebar__link-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className={`status-badge ${connection.status}`} style={{ width: "100%", justifyContent: "center", marginBottom: 10 }}>
            {connection.message}
          </div>
          <button className="secondary-button sidebar__logout" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="dashboard-main">
        <header className="topbar">
          <button
            className="topbar__hamburger secondary-button"
            aria-label="Toggle navigation"
            onClick={() => setSidebarOpen((o) => !o)}
          >☰</button>

          <div className="topbar__property">
            <label htmlFor="topbar-property" className="topbar__property-label">Property</label>
            <select
              id="topbar-property"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="topbar__property-select"
            >
              <option value="">Select a property</option>
              {properties.map((p) => (
                <option key={p.property_id} value={p.property_id}>{p.property_name}</option>
              ))}
            </select>
          </div>

          {selectedProperty && (
            <span className="topbar__property-name">
              {selectedProperty.property_name}
              {selectedProperty.city ? `, ${selectedProperty.city}` : ""}
            </span>
          )}

          <div className="topbar__actions">
            <button
              className="secondary-button topbar__refresh"
              onClick={checkBackend}
              title="Check server status"
              aria-label="Refresh server status"
            >↻</button>
          </div>
        </header>

        <main className="page-content">
          <Routes>
            <Route index element={<Navigate to="properties" replace />} />
            <Route path="properties" element={
              <PageWrapper title="Properties" icon="🏨" description="Manage hotel properties and their zones.">
                <PropertyManager onPropertiesChanged={fetchProperties} setToast={setToast} />
              </PageWrapper>
            } />
            <Route path="rfid" element={
              <PageWrapper title="RFID Tags" icon="🏷️" description="Create, assign, and manage RFID tags for guests and staff.">
                <RFIDManagement
                  guests={propertyContext.guests}
                  staff={propertyContext.staff}
                  availableGuestTags={propertyContext.available_guest_tags}
                  availableStaffTags={propertyContext.available_staff_tags}
                  onDataChanged={fetchPropertyContext}
                  setToast={setToast}
                />
              </PageWrapper>
            } />
            <Route path="allocation" element={
              <PageWrapper title="Staff Allocation" icon="👥" description="Assign staff members to zones with priority levels.">
                <StaffAllocation
                  propertyId={propertyId}
                  staff={propertyContext.staff}
                  zones={propertyContext.zones}
                  setToast={setToast}
                />
              </PageWrapper>
            } />
            <Route path="guests" element={
              <PageWrapper title="Guests" icon="🛎️" description="Check in guests and assign them rooms and RFID tags.">
                <AddGuest
                  propertyId={propertyId}
                  rooms={propertyContext.rooms}
                  availableGuestTags={propertyContext.available_guest_tags}
                  onDataChanged={fetchPropertyContext}
                  setToast={setToast}
                />
              </PageWrapper>
            } />
            <Route path="scan" element={
              <PageWrapper title="Scan RFID" icon="📡" description="Simulate an RFID reader scan event.">
                <ScanRFID
                  tags={propertyContext.active_tags}
                  readers={propertyContext.readers}
                  setToast={setToast}
                />
              </PageWrapper>
            } />
            <Route path="current" element={
              <PageWrapper title="Current Location" icon="📍" description="Look up the last known location of any active RFID tag.">
                <CurrentLocation
                  propertyId={propertyId}
                  tags={propertyContext.active_tags}
                  setToast={setToast}
                />
              </PageWrapper>
            } />
            <Route path="history" element={
              <PageWrapper title="Movement History" icon="📋" description="View the full movement log for any RFID tag.">
                <MovementHistory
                  propertyId={propertyId}
                  tags={propertyContext.active_tags}
                  setToast={setToast}
                />
              </PageWrapper>
            } />
            <Route path="*" element={<Navigate to="properties" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

/* ─── Page Wrapper ───────────────────────────────────────────────────── */
function PageWrapper({ title, icon, description, children }) {
  return (
    <div className="page-wrapper">
      <div className="page-heading">
        <span className="page-heading__icon">{icon}</span>
        <div>
          <h1 className="page-heading__title">{title}</h1>
          {description && <p className="page-heading__desc">{description}</p>}
        </div>
      </div>
      <div className="page-card">
        {children}
      </div>
    </div>
  );
}
