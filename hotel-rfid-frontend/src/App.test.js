import { render, screen } from "@testing-library/react";
import App from "./App";

jest.mock("./RFIDManagement", () => () => <div>RFID Management</div>);
jest.mock("./StaffAllocation", () => () => <div>Staff Force Allocation</div>);
jest.mock("./AddGuest", () => () => <div>Add Guest</div>);
jest.mock("./ScanRFID", () => () => <div>Simulate RFID Scan</div>);
jest.mock("./CurrentLocation", () => () => <div>Current Location</div>);
jest.mock("./MovementHistory", () => () => <div>Movement History</div>);

test("renders app title and key sections", () => {
  render(<App />);

  expect(screen.getByText(/HotelSync360 - RFID Tracker/i)).toBeInTheDocument();
  expect(screen.getByText(/RFID Management/i)).toBeInTheDocument();
  expect(screen.getByText(/Staff Force Allocation/i)).toBeInTheDocument();
  expect(screen.getByText(/Add Guest/i)).toBeInTheDocument();
  expect(screen.getByText(/Refresh Backend Status/i)).toBeInTheDocument();
});
