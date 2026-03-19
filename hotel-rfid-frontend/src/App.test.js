import { render, screen } from "@testing-library/react";
import App from "./App";

jest.mock("./RFIDManagement", () => () => <div>RFID Management</div>);
jest.mock("./StaffAllocation", () => () => <div>Staff Force Allocation</div>);
jest.mock("./AddGuest", () => () => <div>Add Guest</div>);
jest.mock("./ScanRFID", () => () => <div>Simulate RFID Scan</div>);
jest.mock("./CurrentLocation", () => () => <div>Current Location</div>);
jest.mock("./MovementHistory", () => () => <div>Movement History</div>);
jest.mock("./utils/axiosConfig", () => ({
  __esModule: true,
  default: {
    get: jest.fn(() => Promise.resolve({ data: { message: "Backend is online", auth_required: true } })),
    post: jest.fn(),
  },
  getAuthToken: jest.fn(() => ""),
  setAuthToken: jest.fn(),
}));

test("renders a clean login screen first", () => {
  render(<App />);

  expect(screen.getByText(/HotelSync360/i)).toBeInTheDocument();
  expect(screen.getByText(/Sign in to open the dashboard/i)).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/Admin Email/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Login/i })).toBeInTheDocument();
});
