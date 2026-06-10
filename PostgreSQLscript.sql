-- HotelSync360 PostgreSQL schema
-- Run against your Neon (or any PostgreSQL) database.

DROP TABLE IF EXISTS staff_zone_allocation CASCADE;
DROP TABLE IF EXISTS task CASCADE;
DROP TABLE IF EXISTS movement_tag CASCADE;
DROP TABLE IF EXISTS rfid_assignment CASCADE;
DROP TABLE IF EXISTS rfid_reader CASCADE;
DROP TABLE IF EXISTS guest CASCADE;
DROP TABLE IF EXISTS admin CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS rfid_tag CASCADE;
DROP TABLE IF EXISTS room CASCADE;
DROP TABLE IF EXISTS zone CASCADE;
DROP TABLE IF EXISTS property CASCADE;

DROP TYPE IF EXISTS property_status CASCADE;
DROP TYPE IF EXISTS tag_type CASCADE;
DROP TYPE IF EXISTS staff_status CASCADE;
DROP TYPE IF EXISTS guest_status CASCADE;
DROP TYPE IF EXISTS reader_status CASCADE;
DROP TYPE IF EXISTS assignee_type CASCADE;
DROP TYPE IF EXISTS event_type CASCADE;
DROP TYPE IF EXISTS task_status CASCADE;
DROP TYPE IF EXISTS task_priority CASCADE;
DROP TYPE IF EXISTS allocation_priority CASCADE;
DROP TYPE IF EXISTS allocation_status CASCADE;

CREATE TYPE property_status AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE tag_type AS ENUM ('GUEST', 'STAFF');
CREATE TYPE staff_status AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE guest_status AS ENUM ('CHECKED_IN', 'CHECKED_OUT');
CREATE TYPE reader_status AS ENUM ('ONLINE', 'OFFLINE', 'MAINTENANCE');
CREATE TYPE assignee_type AS ENUM ('GUEST', 'STAFF');
CREATE TYPE event_type AS ENUM ('ENTRY', 'EXIT', 'PING');
CREATE TYPE task_status AS ENUM ('PENDING', 'ASSIGNED', 'COMPLETED', 'CANCELLED');
CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE allocation_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE allocation_status AS ENUM ('PLANNED', 'ACTIVE', 'ENDED', 'CANCELLED');

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE property (
    property_id SERIAL PRIMARY KEY,
    property_name VARCHAR(150) NOT NULL,
    address_line1 VARCHAR(200),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    status property_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE zone (
    zone_id SERIAL PRIMARY KEY,
    property_id INT NOT NULL REFERENCES property(property_id) ON DELETE CASCADE ON UPDATE CASCADE,
    zone_name VARCHAR(100) NOT NULL,
    zone_category VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_zone_per_property UNIQUE (property_id, zone_name),
    CONSTRAINT uq_zone_property_zone UNIQUE (property_id, zone_id)
);
CREATE INDEX idx_zone_property ON zone(property_id);

CREATE TABLE room (
    room_id SERIAL PRIMARY KEY,
    property_id INT NOT NULL REFERENCES property(property_id) ON DELETE CASCADE ON UPDATE CASCADE,
    room_number VARCHAR(20) NOT NULL,
    room_type VARCHAR(50),
    zone_id INT REFERENCES zone(zone_id) ON DELETE SET NULL ON UPDATE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_room_per_property UNIQUE (property_id, room_number)
);
CREATE INDEX idx_room_property ON room(property_id);
CREATE INDEX idx_room_zone ON room(zone_id);

CREATE TABLE rfid_tag (
    rfid_tag_id SERIAL PRIMARY KEY,
    tag_code VARCHAR(100) NOT NULL,
    tag_type tag_type NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_rfid_tag_code UNIQUE (tag_code)
);
CREATE INDEX idx_rfid_tag_type_active ON rfid_tag(tag_type, is_active);

CREATE TABLE staff (
    staff_id SERIAL PRIMARY KEY,
    property_id INT NOT NULL REFERENCES property(property_id) ON DELETE CASCADE ON UPDATE CASCADE,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50),
    phone VARCHAR(20),
    status staff_status NOT NULL DEFAULT 'ACTIVE',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_staff_property_staff UNIQUE (property_id, staff_id)
);
CREATE INDEX idx_staff_property_status ON staff(property_id, status, is_active);

CREATE TABLE admin (
    admin_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password VARCHAR(255) NOT NULL,
    status property_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_admin_email UNIQUE (email)
);

CREATE TABLE guest (
    guest_id SERIAL PRIMARY KEY,
    property_id INT NOT NULL REFERENCES property(property_id) ON DELETE CASCADE ON UPDATE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    status guest_status NOT NULL DEFAULT 'CHECKED_IN',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    check_in_time TIMESTAMP,
    check_out_time TIMESTAMP,
    room_id INT REFERENCES room(room_id) ON DELETE SET NULL ON UPDATE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_guest_property_status ON guest(property_id, status, is_active);
CREATE INDEX idx_guest_room ON guest(room_id);

CREATE TABLE rfid_reader (
    reader_id SERIAL PRIMARY KEY,
    property_id INT NOT NULL REFERENCES property(property_id) ON DELETE CASCADE ON UPDATE CASCADE,
    zone_id INT NOT NULL REFERENCES zone(zone_id) ON DELETE CASCADE ON UPDATE CASCADE,
    reader_connection VARCHAR(150),
    reader_name VARCHAR(100),
    status reader_status NOT NULL DEFAULT 'ONLINE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_reader_property ON rfid_reader(property_id);
CREATE INDEX idx_reader_zone_status ON rfid_reader(zone_id, status);

CREATE TABLE rfid_assignment (
    assignment_id SERIAL PRIMARY KEY,
    rfid_tag_id INT NOT NULL REFERENCES rfid_tag(rfid_tag_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    assignee_type assignee_type NOT NULL,
    assignee_id INT NOT NULL,
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    released_at TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes VARCHAR(255)
);
CREATE UNIQUE INDEX uq_active_tag ON rfid_assignment(rfid_tag_id) WHERE is_active = TRUE;
CREATE UNIQUE INDEX uq_active_assignee ON rfid_assignment(assignee_type, assignee_id) WHERE is_active = TRUE;
CREATE INDEX idx_assignment_lookup ON rfid_assignment(assignee_type, assignee_id, is_active);
CREATE INDEX idx_assignment_tag_active ON rfid_assignment(rfid_tag_id, is_active);

CREATE TABLE movement_tag (
    movement_id BIGSERIAL PRIMARY KEY,
    scan_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    rfid_tag_id INT NOT NULL REFERENCES rfid_tag(rfid_tag_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    reader_id INT NOT NULL REFERENCES rfid_reader(reader_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    event_type event_type NOT NULL DEFAULT 'PING',
    signal_strength INT,
    raw_payload JSONB
);
CREATE INDEX idx_movement_time ON movement_tag(scan_time);
CREATE INDEX idx_movement_tag_time ON movement_tag(rfid_tag_id, scan_time);
CREATE INDEX idx_movement_reader_time ON movement_tag(reader_id, scan_time);

CREATE TABLE task (
    task_id SERIAL PRIMARY KEY,
    property_id INT NOT NULL REFERENCES property(property_id) ON DELETE CASCADE ON UPDATE CASCADE,
    task_type VARCHAR(100),
    status task_status NOT NULL DEFAULT 'PENDING',
    priority task_priority NOT NULL DEFAULT 'MEDIUM',
    created_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    assigned_time TIMESTAMP,
    complete_time TIMESTAMP,
    zone_id INT REFERENCES zone(zone_id) ON DELETE SET NULL ON UPDATE CASCADE,
    room_id INT REFERENCES room(room_id) ON DELETE SET NULL ON UPDATE CASCADE,
    staff_id INT REFERENCES staff(staff_id) ON DELETE SET NULL ON UPDATE CASCADE,
    description VARCHAR(255)
);
CREATE INDEX idx_task_property ON task(property_id);
CREATE INDEX idx_task_status_priority ON task(status, priority);
CREATE INDEX idx_task_zone ON task(zone_id);
CREATE INDEX idx_task_room ON task(room_id);
CREATE INDEX idx_task_staff ON task(staff_id);

CREATE TABLE staff_zone_allocation (
    allocation_id SERIAL PRIMARY KEY,
    property_id INT NOT NULL REFERENCES property(property_id) ON DELETE CASCADE ON UPDATE CASCADE,
    staff_id INT NOT NULL REFERENCES staff(staff_id) ON DELETE CASCADE ON UPDATE CASCADE,
    zone_id INT NOT NULL REFERENCES zone(zone_id) ON DELETE CASCADE ON UPDATE CASCADE,
    allocated_by_staff_id INT REFERENCES staff(staff_id) ON DELETE SET NULL ON UPDATE CASCADE,
    priority allocation_priority NOT NULL DEFAULT 'MEDIUM',
    status allocation_status NOT NULL DEFAULT 'PLANNED',
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    reason VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_alloc_property ON staff_zone_allocation(property_id);
CREATE INDEX idx_alloc_zone_status_time ON staff_zone_allocation(zone_id, status, start_time);
CREATE INDEX idx_alloc_staff_status ON staff_zone_allocation(staff_id, status);

CREATE TRIGGER trg_property_updated_at BEFORE UPDATE ON property
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_zone_updated_at BEFORE UPDATE ON zone
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_room_updated_at BEFORE UPDATE ON room
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_rfid_tag_updated_at BEFORE UPDATE ON rfid_tag
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_staff_updated_at BEFORE UPDATE ON staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_admin_updated_at BEFORE UPDATE ON admin
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_guest_updated_at BEFORE UPDATE ON guest
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_rfid_reader_updated_at BEFORE UPDATE ON rfid_reader
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_staff_zone_allocation_updated_at BEFORE UPDATE ON staff_zone_allocation
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed data
DO $$
DECLARE
    v_property_id INT;
    v_reception_zone_id INT;
    v_lobby_zone_id INT;
    v_floor_1_zone_id INT;
    v_back_office_zone_id INT;
    v_amit_staff_id INT;
    v_neha_staff_id INT;
    v_staff_tag_1_id INT;
    v_staff_tag_2_id INT;
BEGIN
    INSERT INTO property (property_name, address_line1, city, state, country, status)
    VALUES ('Default Hotel Property', 'Main Road', 'Mumbai', 'Maharashtra', 'India', 'ACTIVE')
    RETURNING property_id INTO v_property_id;

    INSERT INTO zone (property_id, zone_name, zone_category) VALUES
        (v_property_id, 'Reception', 'PUBLIC'),
        (v_property_id, 'Lobby', 'PUBLIC'),
        (v_property_id, 'Floor-1', 'GUEST'),
        (v_property_id, 'Back Office', 'STAFF');

    SELECT zone_id INTO v_reception_zone_id FROM zone
      WHERE property_id = v_property_id AND zone_name = 'Reception' LIMIT 1;
    SELECT zone_id INTO v_lobby_zone_id FROM zone
      WHERE property_id = v_property_id AND zone_name = 'Lobby' LIMIT 1;
    SELECT zone_id INTO v_floor_1_zone_id FROM zone
      WHERE property_id = v_property_id AND zone_name = 'Floor-1' LIMIT 1;
    SELECT zone_id INTO v_back_office_zone_id FROM zone
      WHERE property_id = v_property_id AND zone_name = 'Back Office' LIMIT 1;

    INSERT INTO room (property_id, room_number, room_type, zone_id) VALUES
        (v_property_id, '101', 'DELUXE', v_floor_1_zone_id),
        (v_property_id, '102', 'DELUXE', v_floor_1_zone_id),
        (v_property_id, '201', 'SUITE', v_floor_1_zone_id);

    INSERT INTO staff (property_id, name, role, phone, status, is_active) VALUES
        (v_property_id, 'Amit Sharma', 'SECURITY', '9876543210', 'ACTIVE', TRUE),
        (v_property_id, 'Neha Verma', 'HOUSEKEEPING', '9876543211', 'ACTIVE', TRUE);

    INSERT INTO rfid_tag (tag_code, tag_type, is_active) VALUES
        ('STAFF-0001', 'STAFF', TRUE),
        ('STAFF-0002', 'STAFF', TRUE),
        ('STAFF-0003', 'STAFF', TRUE),
        ('GUEST-0001', 'GUEST', TRUE),
        ('GUEST-0002', 'GUEST', TRUE),
        ('GUEST-0003', 'GUEST', TRUE);

    INSERT INTO rfid_reader (property_id, zone_id, reader_connection, reader_name, status) VALUES
        (v_property_id, v_reception_zone_id, '192.168.1.10', 'Reception Reader', 'ONLINE'),
        (v_property_id, v_lobby_zone_id, '192.168.1.11', 'Lobby Reader', 'ONLINE'),
        (v_property_id, v_floor_1_zone_id, '192.168.1.12', 'Floor-1 Reader', 'ONLINE'),
        (v_property_id, v_back_office_zone_id, '192.168.1.13', 'Back Office Reader', 'ONLINE');

    SELECT staff_id INTO v_amit_staff_id FROM staff
      WHERE property_id = v_property_id AND name = 'Amit Sharma' LIMIT 1;
    SELECT staff_id INTO v_neha_staff_id FROM staff
      WHERE property_id = v_property_id AND name = 'Neha Verma' LIMIT 1;

    SELECT rfid_tag_id INTO v_staff_tag_1_id FROM rfid_tag
      WHERE tag_code = 'STAFF-0001' LIMIT 1;
    SELECT rfid_tag_id INTO v_staff_tag_2_id FROM rfid_tag
      WHERE tag_code = 'STAFF-0002' LIMIT 1;

    INSERT INTO rfid_assignment (rfid_tag_id, assignee_type, assignee_id, assigned_at, is_active) VALUES
        (v_staff_tag_1_id, 'STAFF', v_amit_staff_id, NOW(), TRUE),
        (v_staff_tag_2_id, 'STAFF', v_neha_staff_id, NOW(), TRUE);
END $$;
