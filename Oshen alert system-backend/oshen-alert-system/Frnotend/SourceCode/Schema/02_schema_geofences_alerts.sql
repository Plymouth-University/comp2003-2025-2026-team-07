-- ============================================================================
-- OSHEN VESSEL ALERT SYSTEM - Part 2: Geofences and Alert Rules
-- ============================================================================
-- Version: 1.0
-- Date: November 13, 2025
-- Purpose: Create geofence and alert rule tables
-- 
-- Prerequisites: Execute 01_schema_core_tables.sql first
-- This is Part 2 of 3 for the database schema
-- ============================================================================

-- ============================================================================
-- TABLE 6: GEOFENCES
-- ============================================================================
-- Purpose: Store geographical boundaries for vessels
-- Row Count Estimate: ~50 (5 per vessel average)
-- JSON Source: platforms[].geofences
-- Types: keep_in, keep_out_zone, keep_out_point
-- ============================================================================

CREATE TABLE geofences (
    id SERIAL PRIMARY KEY,
    vessel_id INTEGER NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
    geofence_type VARCHAR(20) NOT NULL,   -- 'keep_in', 'keep_out_zone', 'keep_out_point'
    
    -- Geographical data stored as GeoJSON for flexibility
    -- For polygons: {"type": "Polygon", "coordinates": [[[lon, lat], [lon, lat], ...]]}
    -- For points: {"type": "Point", "coordinates": [lon, lat], "radius_meters": 1000}
    geometry JSONB NOT NULL,
    
    -- Mute configuration
    is_muted BOOLEAN NOT NULL DEFAULT FALSE,
    unmute_date TIMESTAMPTZ,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_geofence_type CHECK (
        geofence_type IN ('keep_in', 'keep_out_zone', 'keep_out_point')
    )
);

-- Indexes
CREATE INDEX idx_geofences_vessel ON geofences(vessel_id);
CREATE INDEX idx_geofences_type ON geofences(geofence_type);
CREATE INDEX idx_geofences_is_muted ON geofences(is_muted);

-- GIN index for JSONB geometry queries
CREATE INDEX idx_geofences_geometry ON geofences USING GIN (geometry);

COMMENT ON TABLE geofences IS 'Geographical boundaries for vessel monitoring';
COMMENT ON COLUMN geofences.geofence_type IS 'keep_in: must stay inside, keep_out_zone: must stay outside, keep_out_point: must avoid area';
COMMENT ON COLUMN geofences.geometry IS 'GeoJSON format geometry with coordinates and optional radius';

-- ============================================================================
-- TABLE 7: ALERT RULES
-- ============================================================================
-- Purpose: Alert trigger configurations
-- Row Count Estimate: ~200 (20 per vessel average)
-- JSON Source: platforms[].message_types[].alert_triggers[]
-- ============================================================================

CREATE TABLE alert_rules (
    id SERIAL PRIMARY KEY,
    vessel_id INTEGER NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
    message_type_id INTEGER NOT NULL REFERENCES message_types(id) ON DELETE CASCADE,
    
    -- Rule configuration
    name VARCHAR(100) NOT NULL,            -- e.g., "Heading Error", "Low Wind"
    field_name VARCHAR(100) NOT NULL,      -- e.g., "Average Heading Error"
    operator VARCHAR(10) NOT NULL,         -- "||>=", ">=", "<=", "=="
    threshold NUMERIC NOT NULL,            -- e.g., 35.0
    
    -- Consecutivity trigger settings
    -- Trigger if X consecutive messages violate the threshold
    consecutivity_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    consecutivity_count INTEGER NOT NULL DEFAULT 3,  -- Messages in a row
    
    -- Time-based trigger settings
    -- Trigger if Y violations occur within Z minutes
    time_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    time_window_mins INTEGER NOT NULL DEFAULT 0,     -- Time period to check
    time_count INTEGER NOT NULL DEFAULT 100,         -- Violations in window
    
    -- Control flags
    enabled BOOLEAN NOT NULL DEFAULT TRUE,           -- Master on/off switch
    is_muted BOOLEAN NOT NULL DEFAULT FALSE,
    unmute_date TIMESTAMPTZ,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_operator CHECK (operator IN ('>', '>=', '<', '<=', '==', '||>=')),
    CONSTRAINT positive_counts CHECK (
        consecutivity_count > 0 AND 
        time_count > 0 AND
        time_window_mins >= 0
    )
);

-- Indexes for fast alert evaluation
CREATE INDEX idx_alert_rules_vessel ON alert_rules(vessel_id);
CREATE INDEX idx_alert_rules_message_type ON alert_rules(message_type_id);
CREATE INDEX idx_alert_rules_enabled ON alert_rules(enabled);
CREATE INDEX idx_alert_rules_is_muted ON alert_rules(is_muted);
CREATE INDEX idx_alert_rules_field_name ON alert_rules(field_name);

-- Composite index for alert evaluation queries
CREATE INDEX idx_alert_rules_vessel_enabled ON alert_rules(vessel_id, enabled) 
WHERE enabled = TRUE AND is_muted = FALSE;

COMMENT ON TABLE alert_rules IS 'Alert trigger configurations for vessel monitoring';
COMMENT ON COLUMN alert_rules.operator IS 'Comparison operator: ||>= means absolute value >=';
COMMENT ON COLUMN alert_rules.consecutivity_count IS 'Number of consecutive violations to trigger';
COMMENT ON COLUMN alert_rules.time_count IS 'Number of violations in time window to trigger';
COMMENT ON COLUMN alert_rules.time_window_mins IS 'Rolling time window for time-based triggers';

-- ============================================================================
-- PART 2 COMPLETE
-- ============================================================================
-- Next: Execute 03_schema_telemetry_history.sql
-- ============================================================================
