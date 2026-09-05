-- ==============================================================================
-- TRACKMYBUS - REAL-TIME BUS TRACKING SYSTEM
-- PostgreSQL Database Schema & Initial Seed Script
-- ==============================================================================
-- Target Engine: PostgreSQL 12+
-- Description: Complete relational schema for tracking municipal/intercity buses,
--              real-time GPS telemetry, route geometry, commuter complaints,
--              lost-and-found items, and maintenance analytics.
--
-- How to run this file with psql:
--   psql -U <username> -d <database_name> -f schema.sql
-- ==============================================================================

-- Clean up existing views and tables if re-running script (in reverse dependency order)
DROP VIEW IF EXISTS issue_summary CASCADE;
DROP TABLE IF EXISTS lost_found_items CASCADE;
DROP TABLE IF EXISTS issue_flags CASCADE;
DROP TABLE IF EXISTS live_locations CASCADE;
DROP TABLE IF EXISTS trips CASCADE;
DROP TABLE IF EXISTS buses CASCADE;
DROP TABLE IF EXISTS stops CASCADE;
DROP TABLE IF EXISTS routes CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ==============================================================================
-- 1. USERS TABLE
-- ==============================================================================
-- PURPOSE:
-- Stores all authentication accounts and roles in the TrackMyBus ecosystem.
-- Supports three distinct user personas:
--   - 'driver': Operates buses, sends periodic telemetry, and views assignments.
--   - 'commuter': General public who tracks buses, reports issues, & files lost items.
--   - 'admin': Fleet managers with privileges to manage routes, buses, and staff.
--
-- DESIGN NOTES:
-- - 'phone' is strictly UNIQUE as mobile numbers serve as the primary login identifier in transit apps.
-- - 'password_hash' stores secure one-way salted password hashes (e.g. bcrypt cost 10).
-- - A CHECK constraint prevents invalid role assignments at the database engine level.
-- ==============================================================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('driver', 'commuter', 'admin')),
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 2. ROUTES TABLE
-- ==============================================================================
-- PURPOSE:
-- Represents transit corridors connecting two terminals (e.g., Secunderabad to Gachibowli).
-- Routes provide the parent structural definition that stops, buses, and trips anchor to.
--
-- DESIGN NOTES:
-- - 'city_code' (e.g., 'HYD') facilitates multi-city scaling or partitioning in future expansions.
-- - Start and end points serve as human-readable route headsigns displayed on bus boards and mobile UI.
-- ==============================================================================
CREATE TABLE routes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    start_point VARCHAR(100) NOT NULL,
    end_point VARCHAR(100) NOT NULL,
    city_code VARCHAR(10) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 3. STOPS TABLE
-- ==============================================================================
-- PURPOSE:
-- Represents individual passenger pickup and dropoff points along a designated route.
--
-- DESIGN NOTES:
-- - 'route_id' has FOREIGN KEY ... ON DELETE CASCADE: If a route is decommissioned,
--   its sequential stop definitions are directly tied to it and are cleaned up automatically.
-- - 'sequence_number' defines the exact chronological stop order (1, 2, 3...) along the route.
-- - UNIQUE(route_id, sequence_number) guarantees stop order integrity (no duplicate order positions).
-- - 'lat' and 'lng' use NUMERIC(10, 7) for centimeter-level geographical GPS accuracy.
-- ==============================================================================
CREATE TABLE stops (
    id SERIAL PRIMARY KEY,
    route_id INT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    lat NUMERIC(10, 7) NOT NULL CHECK (lat BETWEEN -90.0000000 AND 90.0000000),
    lng NUMERIC(10, 7) NOT NULL CHECK (lng BETWEEN -180.0000000 AND 180.0000000),
    sequence_number INT NOT NULL CHECK (sequence_number > 0),
    CONSTRAINT uq_route_stop_sequence UNIQUE (route_id, sequence_number)
);

-- ==============================================================================
-- 4. BUSES TABLE
-- ==============================================================================
-- PURPOSE:
-- Represents physical vehicle fleet assets. Connects a bus registration number to
-- its currently assigned route and current primary driver.
--
-- DESIGN NOTES:
-- - 'bus_number' is UNIQUE (license plate / fleet vehicle number like 'TS09-1234').
-- - 'route_id' and 'driver_id' use ON DELETE SET NULL: A physical vehicle is not scrapped
--   if a driver account leaves the system or if a specific route line is modified/deleted.
-- - 'status' uses a CHECK constraint restricting values to ('active', 'inactive').
-- ==============================================================================
CREATE TABLE buses (
    id SERIAL PRIMARY KEY,
    route_id INT REFERENCES routes(id) ON DELETE SET NULL,
    driver_id INT REFERENCES users(id) ON DELETE SET NULL,
    bus_number VARCHAR(20) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 5. TRIPS TABLE
-- ==============================================================================
-- PURPOSE:
-- Tracks scheduled or active journey runs executed by a specific bus on its assigned route.
-- Essential for timetable calculations, punctuality tracking, and delay analysis.
--
-- DESIGN NOTES:
-- - 'bus_id' uses ON DELETE CASCADE: Individual trip runs are historical events belonging to a bus asset.
-- - 'status' tracks the lifecycle of a transit shift: ('scheduled', 'in_progress', 'completed', 'cancelled').
-- ==============================================================================
CREATE TABLE trips (
    id SERIAL PRIMARY KEY,
    bus_id INT NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled'))
);

-- ==============================================================================
-- 6. LIVE_LOCATIONS TABLE
-- ==============================================================================
-- PURPOSE:
-- High-frequency telemetry time-series recording incoming GPS coordinates and speed pings
-- from on-board IoT trackers or driver smartphone GPS.
--
-- DESIGN NOTES:
-- - Designed for fast write throughput and immediate queries for "latest position of bus X".
-- - 'bus_id' uses ON DELETE CASCADE.
-- - 'speed' is stored in km/h with non-negative check constraint.
-- - Timestamp records exact telemetry broadcast time with timezone awareness.
-- ==============================================================================
CREATE TABLE live_locations (
    id SERIAL PRIMARY KEY,
    bus_id INT NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
    lat NUMERIC(10, 7) NOT NULL CHECK (lat BETWEEN -90.0000000 AND 90.0000000),
    lng NUMERIC(10, 7) NOT NULL CHECK (lng BETWEEN -180.0000000 AND 180.0000000),
    speed NUMERIC(6, 2) NOT NULL DEFAULT 0.00 CHECK (speed >= 0.00),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 7. ISSUE_FLAGS TABLE
-- ==============================================================================
-- PURPOSE:
-- Allows commuters and inspecting staff to report on-board problems associated with a specific bus
-- (e.g. broken seats, malfunctioning AC, reckless driving, unsanitary conditions).
--
-- DESIGN NOTES:
-- - 'category' is strictly restricted via CHECK constraint to ('seat', 'ac', 'cleanliness', 'safety', 'driving', 'other').
-- - 'resolved_at' is NULL while the issue remains open; filled with timestamp when maintenance closes it.
-- - 'bus_id' uses ON DELETE CASCADE.
-- ==============================================================================
CREATE TABLE issue_flags (
    id SERIAL PRIMARY KEY,
    bus_id INT NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
    category VARCHAR(30) NOT NULL CHECK (category IN ('seat', 'ac', 'cleanliness', 'safety', 'driving', 'other')),
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMPTZ
);

-- ==============================================================================
-- 8. LOST_FOUND_ITEMS TABLE
-- ==============================================================================
-- PURPOSE:
-- Central depot ledger for managing passenger belongings lost or retrieved on buses or routes.
--
-- DESIGN NOTES:
-- - 'type' is restricted to ('lost', 'found').
-- - 'status' tracks matching progress: ('open', 'matched', 'closed').
-- - 'route_id' and 'bus_id' use ON DELETE SET NULL: The record of a lost item (e.g. laptop bag)
--   must remain preserved for passenger recovery even if the vehicle or route entry is later retired.
-- ==============================================================================
CREATE TABLE lost_found_items (
    id SERIAL PRIMARY KEY,
    type VARCHAR(10) NOT NULL CHECK (type IN ('lost', 'found')),
    route_id INT REFERENCES routes(id) ON DELETE SET NULL,
    bus_id INT REFERENCES buses(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    approx_time TIMESTAMPTZ NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'matched', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ==============================================================================
-- 1. Real-time GPS Index:
-- Enables sub-millisecond retrieval of the most recent location ping for a given bus.
-- The composite index (bus_id, timestamp DESC) allows an index-only scan for:
--   SELECT * FROM live_locations WHERE bus_id = ? ORDER BY timestamp DESC LIMIT 1;
CREATE INDEX idx_live_locations_bus_timestamp 
    ON live_locations (bus_id, timestamp DESC);

-- 2. Route Stops Navigation Index:
-- Supports rapid route itinerary reconstruction and ETA calculations along stop order:
--   SELECT * FROM stops WHERE route_id = ? ORDER BY sequence_number ASC;
CREATE INDEX idx_stops_route_sequence 
    ON stops (route_id, sequence_number);

-- 3. Issue Flagging & Analytics Index:
-- Speeds up filtering open complaints by vehicle, category, and recent submission date:
CREATE INDEX idx_issue_flags_bus_category_created 
    ON issue_flags (bus_id, category, created_at);

-- ==============================================================================
-- VIEW: ISSUE_SUMMARY
-- ==============================================================================
-- PURPOSE:
-- Aggregates unresolved passenger complaints reported within the trailing 7 days,
-- grouped by bus and issue category. Calculates current backlog count, latest report date,
-- and classifies urgency severity:
--   - 'low'    : 1 to 2 open complaints
--   - 'medium' : 3 to 5 open complaints
--   - 'high'   : 6 or more open complaints
--
-- COLUMNS:
--   bus_id, bus_number, category, flag_count, last_flagged_at, severity
-- ==============================================================================
CREATE OR REPLACE VIEW issue_summary AS
SELECT 
    f.bus_id,
    b.bus_number,
    f.category,
    COUNT(f.id)::INT AS flag_count,
    MAX(f.created_at) AS last_flagged_at,
    CASE 
        WHEN COUNT(f.id) >= 6 THEN 'high'
        WHEN COUNT(f.id) >= 3 THEN 'medium'
        ELSE 'low'
    END AS severity
FROM issue_flags f
JOIN buses b ON f.bus_id = b.id
WHERE f.resolved_at IS NULL 
  AND f.created_at >= (CURRENT_TIMESTAMP - INTERVAL '7 days')
GROUP BY f.bus_id, b.bus_number, f.category;

-- ==============================================================================
-- SEED DATA: HYDERABAD TRANSIT NETWORK
-- ==============================================================================

-- 1. Insert Initial System Users
-- Password for both accounts is "password123"
-- Generated with bcrypt cost 10: $2b$10$ANervwj4LzJ/3ykByEHA2e4TlQ/SInfsf1Rdr83.GLl/E1tOuzNqq
INSERT INTO users (id, name, phone, role, password_hash, created_at)
VALUES 
    (1, 'System Administrator', '9000000001', 'admin', '$2b$10$ANervwj4LzJ/3ykByEHA2e4TlQ/SInfsf1Rdr83.GLl/E1tOuzNqq', CURRENT_TIMESTAMP),
    (2, 'Ramesh Kumar (Driver)', '9000000002', 'driver', '$2b$10$ANervwj4LzJ/3ykByEHA2e4TlQ/SInfsf1Rdr83.GLl/E1tOuzNqq', CURRENT_TIMESTAMP);

-- Reset serial sequence to prevent id collisions on future INSERTs
SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT MAX(id) FROM users));

-- 2. Insert 2 Realistic Hyderabad Transit Routes
INSERT INTO routes (id, name, start_point, end_point, city_code, created_at)
VALUES 
    (1, 'Route 10H - IT Express Corridor', 'Secunderabad Railway Station', 'Gachibowli DLF Cybercity', 'HYD', CURRENT_TIMESTAMP),
    (2, 'Route AC-Pushpak - Airport Liner', 'Mehdipatnam Bus Terminal', 'Rajiv Gandhi Intl Airport (RGIA)', 'HYD', CURRENT_TIMESTAMP);

SELECT setval(pg_get_serial_sequence('routes', 'id'), (SELECT MAX(id) FROM routes));

-- 3. Insert 4 Realistic GPS Stops for Each Hyderabad Route
-- Route 1 Stops (Secunderabad -> Begumpet -> Ameerpet -> Gachibowli DLF)
INSERT INTO stops (route_id, name, lat, lng, sequence_number)
VALUES 
    (1, 'Secunderabad Junction Station', 17.4344000, 78.5017000, 1),
    (1, 'Begumpet Metro & Flyover', 17.4448000, 78.4659000, 2),
    (1, 'Ameerpet Metro Interchange', 17.4375000, 78.4483000, 3),
    (1, 'Gachibowli DLF Cybercity Gate', 17.4504000, 78.3808000, 4);

-- Route 2 Stops (Mehdipatnam -> Aramghar -> Shamshabad -> RGIA Terminal)
INSERT INTO stops (route_id, name, lat, lng, sequence_number)
VALUES 
    (2, 'Mehdipatnam Bus Depot Platform 1', 17.3916000, 78.4402000, 1),
    (2, 'Aramghar Junction Flyover', 17.3242000, 78.4358000, 2),
    (2, 'Shamshabad Bus Stop (NH44)', 17.2568000, 78.4285000, 3),
    (2, 'RGIA Airport Passenger Arrivals', 17.2403000, 78.4294000, 4);

-- 4. Insert Assigned Bus TS09-1234
-- Assigned to driver Ramesh Kumar (id = 2) on Route 1 (id = 1)
INSERT INTO buses (id, route_id, driver_id, bus_number, status, created_at)
VALUES 
    (1, 1, 2, 'TS09-1234', 'active', CURRENT_TIMESTAMP);

SELECT setval(pg_get_serial_sequence('buses', 'id'), (SELECT MAX(id) FROM buses));

-- 5. Demonstration Data: Live Location, Active Trip, and Issues to verify View & Indexes
INSERT INTO trips (bus_id, start_time, status)
VALUES 
    (1, CURRENT_TIMESTAMP - INTERVAL '45 minutes', 'in_progress');

-- Simulated GPS pings for TS09-1234 en route to Gachibowli
INSERT INTO live_locations (bus_id, lat, lng, speed, timestamp)
VALUES 
    (1, 17.4448000, 78.4659000, 38.50, CURRENT_TIMESTAMP - INTERVAL '10 minutes'),
    (1, 17.4375000, 78.4483000, 42.00, CURRENT_TIMESTAMP - INTERVAL '5 minutes'),
    (1, 17.4421000, 78.4120000, 48.20, CURRENT_TIMESTAMP);

-- Sample Unresolved Issues within last 7 days to showcase View severity calculation:
-- - 6 'cleanliness' issues -> triggers 'high' severity
-- - 3 'ac' issues          -> triggers 'medium' severity
-- - 1 'seat' issue         -> triggers 'low' severity
INSERT INTO issue_flags (bus_id, category, description, created_at, resolved_at)
VALUES 
    -- Cleanliness (6 flags => 'high')
    (1, 'cleanliness', 'Litter and empty bottles near rear rows 8-10', CURRENT_TIMESTAMP - INTERVAL '2 hours', NULL),
    (1, 'cleanliness', 'Sticky floor near rear door entrance', CURRENT_TIMESTAMP - INTERVAL '5 hours', NULL),
    (1, 'cleanliness', 'Dusty window sills on right side', CURRENT_TIMESTAMP - INTERVAL '1 day', NULL),
    (1, 'cleanliness', 'Trash bin overflowing under front seats', CURRENT_TIMESTAMP - INTERVAL '2 days', NULL),
    (1, 'cleanliness', 'Mud stains on center aisle mats', CURRENT_TIMESTAMP - INTERVAL '3 days', NULL),
    (1, 'cleanliness', 'Spilled soda on middle passenger seat', CURRENT_TIMESTAMP - INTERVAL '4 days', NULL),
    
    -- AC (3 flags => 'medium')
    (1, 'ac', 'AC cooling weak in rear rows during afternoon heat', CURRENT_TIMESTAMP - INTERVAL '6 hours', NULL),
    (1, 'ac', 'Overhead AC vent loose above seat 14', CURRENT_TIMESTAMP - INTERVAL '1 day', NULL),
    (1, 'ac', 'AC louvers stuck pointing downward at row 4', CURRENT_TIMESTAMP - INTERVAL '3 days', NULL),
    
    -- Seat (1 flag => 'low')
    (1, 'seat', 'Recliner lever jammed on seat 9B', CURRENT_TIMESTAMP - INTERVAL '1 day', NULL),

    -- Resolved issue (should NOT appear in issue_summary view)
    (1, 'driving', 'Driver was honking excessively near hospital zone', CURRENT_TIMESTAMP - INTERVAL '6 days', CURRENT_TIMESTAMP - INTERVAL '2 days');

-- Sample Lost and Found Item
INSERT INTO lost_found_items (type, route_id, bus_id, description, approx_time, contact_phone, status, created_at)
VALUES 
    ('found', 1, 1, 'Black Lenovo laptop backpack with blue water bottle in side pouch', CURRENT_TIMESTAMP - INTERVAL '3 hours', '9000000001', 'open', CURRENT_TIMESTAMP);

-- ==============================================================================
-- VERIFICATION QUERIES (Run these in psql to confirm setup)
-- ==============================================================================
-- 1. Verify all tables created:
--    \dt
--
-- 2. Inspect the calculated Issue Summary View:
--    SELECT * FROM issue_summary;
--
-- 3. Check the latest live GPS coordinates for bus TS09-1234:
--    SELECT b.bus_number, l.lat, l.lng, l.speed, l.timestamp
--    FROM live_locations l
--    JOIN buses b ON l.bus_id = b.id
--    WHERE b.bus_number = 'TS09-1234'
--    ORDER BY l.timestamp DESC
--    LIMIT 1;
-- ==============================================================================
