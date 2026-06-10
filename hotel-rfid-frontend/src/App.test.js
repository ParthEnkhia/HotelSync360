import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

/* ─── Mock all child components so tests focus on App shell logic ─────── */
jest.mock("./PropertyManager",  () => () => <div data-testid="page-properties">Properties Page</div>);
jest.mock("./RFIDManagement",   () => () => <div data-testid="page-rfid">RFID Page</div>);
jest.mock("./StaffAllocation",  () => () => <div data-testid="page-allocation">Allocation Page</div>);
jest.mock("./AddGuest",         () => () => <div data-testid="page-guests">Guests Page</div>);
jest.mock("./ScanRFID",         () => () => <div data-testid="page-scan">Scan Page</div>);
jest.mock("./CurrentLocation",  () => () => <div data-testid="page-current">Current Page</div>);
jest.mock("./MovementHistory",  () => () => <div data-testid="page-history">History Page</div>);
jest.mock("./components/Toast", () => ({
  __esModule: true,
  default: () => null,
  useToast: () => [null, jest.fn()],
}));

jest.mock("./utils/axiosConfig", () => {
  const mockApiGet = (path) => {
    if (path === "/") {
      return Promise.resolve({ data: { message: "Backend online", auth_required: true } });
    }
    if (path === "/reference/properties") {
      return Promise.resolve({ data: [{ property_id: 1, property_name: "Grand Hotel", city: "Mumbai" }] });
    }
    if (String(path).includes("/options")) {
      return Promise.resolve({
        data: {
          rooms: [], zones: [], readers: [], staff: [], guests: [],
          available_guest_tags: [], available_staff_tags: [], active_tags: [],
        },
      });
    }
    return Promise.resolve({ data: [] });
  };

  return {
    __esModule: true,
    default: {
      get: jest.fn(mockApiGet),
      post: jest.fn(() => Promise.resolve({ data: { token: "test-token-123" } })),
      put: jest.fn(() => Promise.resolve({ data: {} })),
      patch: jest.fn(() => Promise.resolve({ data: {} })),
      delete: jest.fn(() => Promise.resolve({ data: {} })),
    },
    getAuthToken: jest.fn(() => ""),
    setAuthToken: jest.fn(),
  };
});

const api = require("./utils/axiosConfig").default;
const { getAuthToken } = require("./utils/axiosConfig");

const mockApiGet = (path) => {
  if (path === "/") {
    return Promise.resolve({ data: { message: "Backend online", auth_required: true } });
  }
  if (path === "/reference/properties") {
    return Promise.resolve({ data: [{ property_id: 1, property_name: "Grand Hotel", city: "Mumbai" }] });
  }
  if (String(path).includes("/options")) {
    return Promise.resolve({
      data: {
        rooms: [], zones: [], readers: [], staff: [], guests: [],
        available_guest_tags: [], available_staff_tags: [], active_tags: [],
      },
    });
  }
  return Promise.resolve({ data: [] });
};

/* ─── Helper: render App inside MemoryRouter at a given path ─────────── */
const renderAt = (initialPath = "/") =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>
  );

beforeEach(() => {
  api.get.mockImplementation(mockApiGet);
  api.post.mockImplementation(() => Promise.resolve({ data: { token: "test-token-123" } }));
  getAuthToken.mockReturnValue("");
});

afterEach(() => {
  cleanup();
  getAuthToken.mockReturnValue("");
});

/* ════════════════════════════════════════════════════════════════════════
   1. Login page
════════════════════════════════════════════════════════════════════════ */
describe("Login page", () => {
  test("renders brand name", () => {
    renderAt("/login");
    expect(screen.getByText("HotelSync360")).toBeInTheDocument();
  });

  test("renders Sign In / Create Account toggle buttons", () => {
    renderAt("/login");
    const signInButtons = screen.getAllByRole("button", { name: /sign in/i });
    expect(signInButtons.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
  });

  test("sign-in form has email and password fields", () => {
    renderAt("/login");
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  test("sign-in submit button is present", () => {
    const { container } = renderAt("/login");
    expect(container.querySelector(".login-submit")).toBeInTheDocument();
  });

  test("switching to Create Account tab shows full-name field", () => {
    renderAt("/login");
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
  });

  test("eyebrow label is present", () => {
    renderAt("/login");
    expect(screen.getByText(/hotel rfid management/i)).toBeInTheDocument();
  });

  test("/ redirects to /login when not authenticated", () => {
    renderAt("/");
    expect(screen.getByText("HotelSync360")).toBeInTheDocument();
  });

  test("/dashboard/* redirects to /login when not authenticated", () => {
    renderAt("/dashboard/guests");
    expect(screen.getByText("HotelSync360")).toBeInTheDocument();
  });
});

/* ════════════════════════════════════════════════════════════════════════
   2. Dashboard shell — authenticated
════════════════════════════════════════════════════════════════════════ */
describe("Dashboard shell (authenticated)", () => {
  beforeEach(() => {
    getAuthToken.mockReturnValue("test-token-123");
  });

  test("renders sidebar brand name", async () => {
    renderAt("/dashboard/properties");
    await waitFor(() => expect(screen.getAllByText("HotelSync360").length).toBeGreaterThan(0));
  });

  test("renders all 7 nav links in sidebar", async () => {
    renderAt("/dashboard/properties");
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /properties/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /rfid tags/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /staff allocation/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /guests/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /scan rfid/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /track current/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /movement history/i })).toBeInTheDocument();
    });
  });

  test("renders Sign Out button in sidebar footer", async () => {
    renderAt("/dashboard/properties");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument()
    );
  });

  test("renders property selector in topbar", async () => {
    renderAt("/dashboard/properties");
    await waitFor(() =>
      expect(screen.getByLabelText(/property/i)).toBeInTheDocument()
    );
  });

  test("properties page loads at /dashboard/properties", async () => {
    renderAt("/dashboard/properties");
    await waitFor(() =>
      expect(screen.getByTestId("page-properties")).toBeInTheDocument()
    );
  });

  test("renders page heading title for Properties route", async () => {
    renderAt("/dashboard/properties");
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /^properties$/i })).toBeInTheDocument()
    );
  });

  test("renders page heading for RFID Tags route", async () => {
    renderAt("/dashboard/rfid");
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /rfid tags/i })).toBeInTheDocument()
    );
  });

  test("renders page heading for Guests route", async () => {
    renderAt("/dashboard/guests");
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /^guests$/i })).toBeInTheDocument()
    );
  });

  test("renders page heading for Movement History route", async () => {
    renderAt("/dashboard/history");
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /movement history/i })).toBeInTheDocument()
    );
  });

  test("rfid page loads at /dashboard/rfid", async () => {
    renderAt("/dashboard/rfid");
    await waitFor(() =>
      expect(screen.getByTestId("page-rfid")).toBeInTheDocument()
    );
  });
});
