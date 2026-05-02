-- ============================================================================
-- OSHEN VESSEL ALERT SYSTEM - Part 1: Core Tables
-- ============================================================================
-- Version: 1.0
-- Date: November 13, 2025
-- Purpose: Create core tables (users, vessels, message_types, system_metadata)
-- 
-- This is Part 1 of 3 for the database schema
-- Execute in order: 01 -> 02 -> 03
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- For UUID generation

-- Optional: Enable PostGIS for advanced geospatial queries
-- Uncomment if you want to use PostGIS features
-- CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================================
-- CLEAN SLATE (Development Only - Comment out for production)
-- ============================================================================
DROP TABLE IF EXISTS alert_evaluations CASCADE;
DROP TABLE IF EXISTS alert_history CASCADE;
DROP TABLE IF EXISTS telemetry CASCADE;
DROP TABLE IF EXISTS alert_rules CASCADE;
DROP TABLE IF EXISTS geofences CASCADE;
DROP TABLE IF EXISTS vessel_message_types CASCADE;
DROP TABLE IF EXISTS message_types CASCADE;
DROP TABLE IF EXISTS vessels CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS system_metadata CASCADE;

-- ============================================================================
-- TABLE 1: SYSTEM METADATA
-- ============================================================================
-- Purpose: Store application-wide configuration
-- Row Count: 1 (singleton table)
-- ============================================================================

CREATE TABLE system_metadata (
    id INTEGER PRIMARY KEY DEFAULT 1,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    app_version VARCHAR(20) DEFAULT '1.0.0',
    
    -- Ensure only one row exists (singleton pattern)
    CONSTRAINT single_row_check CHECK (id = 1)
);

-- Insert initial row
INSERT INTO system_metadata (id, last_updated, app_version) 
VALUES (1, NOW(), '1.0.0');

COMMENT ON TABLE system_metadata IS 'Application-wide metadata - singleton table with one row';
COMMENT ON COLUMN system_metadata.last_updated IS 'Timestamp of last data modification';

-- ============================================================================
-- TABLE 2: USERS
-- ============================================================================
-- Purpose: User authentication and authorization
-- Row Count Estimate: 10-50 users
-- Migration Notes: Flask app has single hardcoded admin; React app needs multi-user
-- ============================================================================

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(80) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,  -- Bcrypt hash ($2b$12$...)
    pager_id VARCHAR(20),                  -- Pagem app ID for notifications
    role VARCHAR(20) NOT NULL DEFAULT 'supervisor',  -- 'admin' or 'supervisor'
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_role CHECK (role IN ('admin', 'supervisor')),
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes for fast lookups
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

COMMENT ON TABLE users IS 'User accounts for system access and alert notifications';
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password - never store plaintext';
COMMENT ON COLUMN users.pager_id IS 'Pagem application ID for receiving alert pages';
COMMENT ON COLUMN users.role IS 'Access level: admin (full access) or supervisor (read/acknowledge)';

-- ============================================================================
-- TABLE 3: VESSELS
-- ============================================================================
-- Purpose: C-Star platform/vessel information
-- Row Count Estimate: 10-20 vessels
-- JSON Source: platforms[] array in app_data.json
-- ============================================================================

CREATE TABLE vessels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,           -- e.g., "PC14", "PC13"
    imei VARCHAR(20) UNIQUE NOT NULL,     -- Satellite identifier (unique per device)
    at_sea_status BOOLEAN NOT NULL DEFAULT TRUE,  -- Is vessel actively monitored?
    
    -- Emergency alert configuration
    emergency_alert_active BOOLEAN NOT NULL DEFAULT FALSE,
    escalation_threshold INTEGER NOT NULL DEFAULT 3,  -- n_repeats_until_escalation
    repeat_interval_mins INTEGER NOT NULL DEFAULT 5,
    last_check_in_at TIMESTAMPTZ,
    
    -- Supervisor assignments (who gets paged for this vessel)
    primary_supervisor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    secondary_supervisor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- Latest position data stored as JSONB for flexibility
    -- Format: {"latitude": 50.21714, "longitude": -4.30792, "timestamp": "2025-10-28T23:15:00+00:00"}
    latest_position JSONB,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT different_supervisors CHECK (
        primary_supervisor_id IS NULL OR 
        secondary_supervisor_id IS NULL OR 
        primary_supervisor_id != secondary_supervisor_id
    ),
    CONSTRAINT positive_thresholds CHECK (
        escalation_threshold > 0 AND 
        repeat_interval_mins > 0
    )
);

-- Indexes for common queries
CREATE INDEX idx_vessels_name ON vessels(name);
CREATE INDEX idx_vessels_imei ON vessels(imei);
CREATE INDEX idx_vessels_at_sea_status ON vessels(at_sea_status);
CREATE INDEX idx_vessels_primary_supervisor ON vessels(primary_supervisor_id);
CREATE INDEX idx_vessels_secondary_supervisor ON vessels(secondary_supervisor_id);
CREATE INDEX idx_vessels_emergency_active ON vessels(emergency_alert_active);

-- GIN index for JSONB querying (enables fast queries on JSON fields)
CREATE INDEX idx_vessels_latest_position ON vessels USING GIN (latest_position);

COMMENT ON TABLE vessels IS 'C-Star vessel/platform information and monitoring status';
COMMENT ON COLUMN vessels.imei IS 'International Mobile Equipment Identity - unique satellite device ID';
COMMENT ON COLUMN vessels.at_sea_status IS 'TRUE = actively monitored, FALSE = in port/maintenance';
COMMENT ON COLUMN vessels.latest_position IS 'Most recent position as JSON: {lat, lon, timestamp}';

-- ============================================================================
-- TABLE 4: MESSAGE TYPES
-- ============================================================================
-- Purpose: Define different telemetry message formats
-- Row Count Estimate: ~5 message types (Format 3, Format 5, etc.)
-- JSON Source: platforms[].message_types[]
-- ============================================================================

CREATE TABLE message_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,           -- e.g., "Format 5", "Format 3"
    schema_path VARCHAR(255),              -- e.g., "message_format3.json"
    expected_interval_mins INTEGER NOT NULL DEFAULT 30,  -- acceptable_time_between_messages
    late_threshold_mins INTEGER NOT NULL DEFAULT 30,     -- acceptable_late_time_mins
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT positive_intervals CHECK (
        expected_interval_mins > 0 AND 
        late_threshold_mins > 0
    )
);

-- Index for lookups
CREATE INDEX idx_message_types_name ON message_types(name);

COMMENT ON TABLE message_types IS 'Telemetry message format definitions';
COMMENT ON COLUMN message_types.expected_interval_mins IS 'Normal time between messages from vessel';
COMMENT ON COLUMN message_types.late_threshold_mins IS 'Grace period before considering message late';

-- ============================================================================
-- TABLE 5: VESSEL_MESSAGE_TYPES (Junction Table)
-- ============================================================================
-- Purpose: Many-to-many relationship between vessels and message types
-- A vessel can send multiple message formats, a message format can be used by multiple vessels
-- ============================================================================

CREATE TABLE vessel_message_types (
    id SERIAL PRIMARY KEY,
    vessel_id INTEGER NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
    message_type_id INTEGER NOT NULL REFERENCES message_types(id) ON DELETE CASCADE,
    
    -- Ensure each vessel-message_type combination is unique
    CONSTRAINT unique_vessel_message_type UNIQUE (vessel_id, message_type_id)
);

CREATE INDEX idx_vessel_message_types_vessel ON vessel_message_types(vessel_id);
CREATE INDEX idx_vessel_message_types_message_type ON vessel_message_types(message_type_id);

COMMENT ON TABLE vessel_message_types IS 'Links vessels to the message formats they transmit';

-- ============================================================================
-- PART 1 COMPLETE
-- ============================================================================
-- Next: Execute 02_schema_geofences_alerts.sql
-- ============================================================================
