-- ============================================================================
-- OSHEN VESSEL ALERT SYSTEM - Part 3: Telemetry, History & System Features
-- ============================================================================
-- Version: 1.0
-- Date: November 13, 2025
-- Purpose: Create telemetry, alert history, triggers, and views
-- 
-- Prerequisites: Execute 01 and 02 first
-- This is Part 3 of 3 for the database schema
-- ============================================================================

-- ============================================================================
-- TABLE 8: TELEMETRY
-- ============================================================================
-- Purpose: Store vessel telemetry messages
-- Row Count Estimate: ~100K/month (scales with number of vessels)
-- Data retention: Consider archiving after 90 days
-- ============================================================================

CREATE TABLE telemetry (
    id SERIAL PRIMARY KEY,
    vessel_id INTEGER NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
    message_type_id INTEGER NOT NULL REFERENCES message_types(id) ON DELETE CASCADE,
    
    -- Core fields (extracted for indexing and geofence checks)
    timestamp TIMESTAMPTZ NOT NULL,        -- Message timestamp from vessel
    latitude DOUBLE PRECISION,             -- Extracted for fast geofence queries
    longitude DOUBLE PRECISION,            -- Extracted for fast geofence queries
    
    -- All other telemetry data stored as JSONB
    -- Format: {"Average Heading Error": -5, "Navigator Wind Speed Average": 12.7, ...}
    -- This allows flexibility for different message formats without schema changes
    data JSONB NOT NULL,
    
    -- System field
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- When system received message
    
    -- Constraints
    CONSTRAINT valid_latitude CHECK (latitude >= -90 AND latitude <= 90),
    CONSTRAINT valid_longitude CHECK (longitude >= -180 AND longitude <= 180),
    CONSTRAINT valid_timestamps CHECK (timestamp <= received_at)
);

-- Indexes for common query patterns
CREATE INDEX idx_telemetry_vessel ON telemetry(vessel_id);
CREATE INDEX idx_telemetry_vessel_timestamp ON telemetry(vessel_id, timestamp DESC);
CREATE INDEX idx_telemetry_timestamp ON telemetry(timestamp DESC);
CREATE INDEX idx_telemetry_message_type ON telemetry(message_type_id);

-- GIN index for JSONB data queries
CREATE INDEX idx_telemetry_data ON telemetry USING GIN (data);

-- Spatial index for location-based queries (if PostGIS enabled)
-- Uncomment if using PostGIS:
-- CREATE INDEX idx_telemetry_location ON telemetry USING GIST (ll_to_earth(latitude, longitude));

COMMENT ON TABLE telemetry IS 'Vessel telemetry messages - consider partitioning for large datasets';
COMMENT ON COLUMN telemetry.data IS 'All message fields as JSONB - flexible schema for different message formats';
COMMENT ON COLUMN telemetry.timestamp IS 'Message timestamp from vessel (may be delayed)';
COMMENT ON COLUMN telemetry.received_at IS 'System ingestion timestamp (always accurate)';

-- ============================================================================
-- TABLE 9: ALERT HISTORY
-- ============================================================================
-- Purpose: Track triggered alerts with acknowledgment and resolution
-- Row Count Estimate: ~1000/month
-- ============================================================================

CREATE TABLE alert_history (
    id SERIAL PRIMARY KEY,
    vessel_id INTEGER NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
    alert_rule_id INTEGER REFERENCES alert_rules(id) ON DELETE SET NULL,  -- Can be NULL if rule deleted
    
    -- Alert details
    alert_text TEXT NOT NULL,              -- e.g., "Heading Error (||>= 35.0) is met"
    
    -- Timing
    first_triggered_at TIMESTAMPTZ NOT NULL,   -- When alert first fired
    last_triggered_at TIMESTAMPTZ NOT NULL,    -- Most recent trigger
    repeat_count INTEGER NOT NULL DEFAULT 0,    -- Number of times repeated
    
    -- Resolution workflow
    status VARCHAR(20) NOT NULL DEFAULT 'active',  -- 'active', 'acknowledged', 'resolved'
    acknowledged_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    
    -- External notification tracking
    pagem_sent BOOLEAN NOT NULL DEFAULT FALSE,
    pagem_sent_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_status CHECK (status IN ('active', 'acknowledged', 'resolved')),
    CONSTRAINT valid_timing CHECK (last_triggered_at >= first_triggered_at),
    CONSTRAINT resolved_after_acknowledged CHECK (
        resolved_at IS NULL OR acknowledged_at IS NULL OR resolved_at >= acknowledged_at
    )
);

-- Indexes for alert management queries
CREATE INDEX idx_alert_history_vessel ON alert_history(vessel_id);
CREATE INDEX idx_alert_history_rule ON alert_history(alert_rule_id);
CREATE INDEX idx_alert_history_status ON alert_history(status);
CREATE INDEX idx_alert_history_first_triggered ON alert_history(first_triggered_at DESC);
CREATE INDEX idx_alert_history_last_triggered ON alert_history(last_triggered_at DESC);

-- Composite indexes for common queries
CREATE INDEX idx_alert_history_vessel_status ON alert_history(vessel_id, status);
CREATE INDEX idx_alert_history_active ON alert_history(status) WHERE status = 'active';

COMMENT ON TABLE alert_history IS 'Historical record of triggered alerts with lifecycle tracking';
COMMENT ON COLUMN alert_history.status IS 'active: needs attention, acknowledged: seen by supervisor, resolved: issue fixed';
COMMENT ON COLUMN alert_history.repeat_count IS 'Number of times alert has re-triggered';

-- ============================================================================
-- TABLE 10: ALERT EVALUATIONS
-- ============================================================================
-- Purpose: Store results of alert rule evaluations
-- Row Count Estimate: ~100K/month (one per rule per message)
-- Notes: Stores the "last_N_message_triggered_status" data
-- Consider: May want to archive or summarize old evaluations
-- ============================================================================

CREATE TABLE alert_evaluations (
    id SERIAL PRIMARY KEY,
    alert_rule_id INTEGER NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
    telemetry_id INTEGER NOT NULL REFERENCES telemetry(id) ON DELETE CASCADE,
    
    -- Evaluation results
    triggered BOOLEAN NOT NULL,            -- Did this message trigger the alert?
    field_value NUMERIC,                   -- Value of the field being evaluated
    
    -- Timestamp
    evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Make sure each rule/telemetry combination is evaluated only once
    CONSTRAINT unique_evaluation UNIQUE (alert_rule_id, telemetry_id)
);

-- Indexes for alert evaluation history queries
CREATE INDEX idx_alert_evaluations_rule ON alert_evaluations(alert_rule_id);
CREATE INDEX idx_alert_evaluations_telemetry ON alert_evaluations(telemetry_id);
CREATE INDEX idx_alert_evaluations_triggered ON alert_evaluations(triggered);
CREATE INDEX idx_alert_evaluations_rule_time ON alert_evaluations(alert_rule_id, evaluated_at DESC);

-- Index for finding recent triggered evaluations
CREATE INDEX idx_alert_evaluations_recent_triggers ON alert_evaluations(alert_rule_id, evaluated_at DESC) 
WHERE triggered = TRUE;

COMMENT ON TABLE alert_evaluations IS 'Evaluation results for each alert rule against each message';
COMMENT ON COLUMN alert_evaluations.triggered IS 'TRUE if this message violated the rule threshold';
COMMENT ON COLUMN alert_evaluations.field_value IS 'Actual value from message (for debugging/analysis)';

-- ============================================================================
-- AUTOMATIC TRIGGERS (Database Functions)
-- ============================================================================

-- Function: Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to tables with updated_at column
CREATE TRIGGER update_vessels_updated_at 
    BEFORE UPDATE ON vessels
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_geofences_updated_at 
    BEFORE UPDATE ON geofences
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alert_rules_updated_at 
    BEFORE UPDATE ON alert_rules
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function: Update system_metadata.last_updated on any data change
CREATE OR REPLACE FUNCTION update_system_metadata()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE system_metadata SET last_updated = NOW() WHERE id = 1;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to critical tables
CREATE TRIGGER update_system_on_vessels_change 
    AFTER INSERT OR UPDATE OR DELETE ON vessels
    FOR EACH STATEMENT 
    EXECUTE FUNCTION update_system_metadata();

CREATE TRIGGER update_system_on_alert_rules_change 
    AFTER INSERT OR UPDATE OR DELETE ON alert_rules
    FOR EACH STATEMENT 
    EXECUTE FUNCTION update_system_metadata();

CREATE TRIGGER update_system_on_geofences_change 
    AFTER INSERT OR UPDATE OR DELETE ON geofences
    FOR EACH STATEMENT 
    EXECUTE FUNCTION update_system_metadata();

-- ============================================================================
-- USEFUL VIEWS (Materialized for performance if needed)
-- ============================================================================

-- View: Active alerts per vessel (for dashboard)
CREATE OR REPLACE VIEW v_active_alerts AS
SELECT 
    v.id as vessel_id,
    v.name as vessel_name,
    v.imei,
    COUNT(ah.id) as active_alert_count,
    MAX(ah.last_triggered_at) as most_recent_alert,
    STRING_AGG(ah.alert_text, '; ') as alert_summary
FROM vessels v
LEFT JOIN alert_history ah ON v.id = ah.vessel_id AND ah.status = 'active'
GROUP BY v.id, v.name, v.imei;

COMMENT ON VIEW v_active_alerts IS 'Summary of active alerts per vessel - used by dashboard';

-- View: Comprehensive vessel status (for overview page)
CREATE OR REPLACE VIEW v_vessel_status AS
SELECT 
    v.id,
    v.name,
    v.imei,
    v.at_sea_status,
    v.emergency_alert_active,
    v.latest_position,
    v.last_check_in_at,
    u1.username as primary_supervisor,
    u1.pager_id as primary_pager_id,
    u2.username as secondary_supervisor,
    u2.pager_id as secondary_pager_id,
    COUNT(DISTINCT ar.id) as total_rules,
    COUNT(DISTINCT CASE WHEN ar.enabled = TRUE THEN ar.id END) as enabled_rules,
    COUNT(DISTINCT ah.id) FILTER (WHERE ah.status = 'active') as active_alerts,
    MAX(t.timestamp) as last_telemetry_at
FROM vessels v
LEFT JOIN users u1 ON v.primary_supervisor_id = u1.id
LEFT JOIN users u2 ON v.secondary_supervisor_id = u2.id
LEFT JOIN alert_rules ar ON v.id = ar.vessel_id
LEFT JOIN alert_history ah ON v.id = ah.vessel_id
LEFT JOIN telemetry t ON v.id = t.vessel_id
GROUP BY v.id, v.name, v.imei, v.at_sea_status, v.emergency_alert_active, 
         v.latest_position, v.last_check_in_at, u1.username, u1.pager_id, u2.username, u2.pager_id;

COMMENT ON VIEW v_vessel_status IS 'Complete vessel status for overview dashboard';

-- View: Recent telemetry summary (last 24 hours)
CREATE OR REPLACE VIEW v_recent_telemetry AS
SELECT 
    v.name as vessel_name,
    t.vessel_id,
    t.timestamp,
    t.latitude,
    t.longitude,
    t.data,
    mt.name as message_type
FROM telemetry t
JOIN vessels v ON t.vessel_id = v.id
JOIN message_types mt ON t.message_type_id = mt.id
WHERE t.timestamp > NOW() - INTERVAL '24 hours'
ORDER BY t.timestamp DESC;

COMMENT ON VIEW v_recent_telemetry IS 'Telemetry from last 24 hours - for quick queries';

-- ============================================================================
-- SAMPLE SEED DATA (For Development/Testing)
-- ============================================================================

-- Create admin user
-- Password: "emperorpinguoshen" 
-- Bcrypt hash generated with: python3 -c "from bcrypt import hashpw, gensalt; print(hashpw(b'emperorpinguoshen', gensalt()).decode())"
INSERT INTO users (username, email, password_hash, role, pager_id) 
VALUES ('admin', 'admin@oshen.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxF6O8.S6', 'admin', '7672')
ON CONFLICT (username) DO NOTHING;

-- Create a sample message type
INSERT INTO message_types (name, schema_path, expected_interval_mins, late_threshold_mins) 
VALUES ('Format 5', 'message_format3.json', 30, 30)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- DATABASE SETUP COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Test database with sample queries
-- 2. Create Prisma schema (prisma/schema.prisma)
-- 3. Write migration script (migrate_json_to_db.py)
-- ============================================================================

-- Quick verification query
DO $$
BEGIN
    RAISE NOTICE 'Database schema created successfully!';
    RAISE NOTICE 'Tables created: %', (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public');
    RAISE NOTICE 'Admin user created: %', (SELECT username FROM users WHERE role = 'admin');
END $$;
