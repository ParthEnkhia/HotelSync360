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
    get: jest.fn(() => Promise.resolve({ data: "Backend is online" })),
    post: jest.fn(),
  },
  getAuthToken: jest.fn(() => ""),
  setAuthToken: jest.fn(),
}));

test("renders app title and key sections", () => {
  render(<App />);

  expect(screen.getByText(/HotelSync360 - RFID Tracker/i)).toBeInTheDocument();
  expect(screen.getByText(/Admin Access/i)).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/Admin Email/i)).toBeInTheDocument();
  expect(screen.getByText(/RFID Management/i)).toBeInTheDocument();
  expect(screen.getByText(/Staff Force Allocation/i)).toBeInTheDocument();
  expect(screen.getByText(/Add Guest/i)).toBeInTheDocument();
  expect(screen.getByText(/Refresh Backend Status/i)).toBeInTheDocument();
});
