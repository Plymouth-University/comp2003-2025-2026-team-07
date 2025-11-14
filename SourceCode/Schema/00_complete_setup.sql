-- ============================================================================
-- OSHEN VESSEL ALERT SYSTEM - COMPLETE DATABASE SETUP
-- ============================================================================
-- Version: 1.0
-- Date: November 13, 2025
-- Author: Backend Dev 1
-- 
-- This script executes all three parts of the database schema in order
-- Usage: psql -U your_user -d your_database -f 00_complete_setup.sql
-- ============================================================================

\echo '========================================================================='
\echo 'OSHEN VESSEL ALERT SYSTEM - Database Setup'
\echo '========================================================================='
\echo ''
\echo 'This will create the complete database schema for the React/Node.js app'
\echo 'Migration from Flask app (app_data.json) to PostgreSQL'
\echo ''
\echo 'Press Ctrl+C now if you want to abort, or press Enter to continue...'
\echo ''

-- Set error handling
\set ON_ERROR_STOP on

-- Show timing for performance monitoring
\timing on

-- ============================================================================
-- PART 1: Core Tables (Users, Vessels, Message Types)
-- ============================================================================
\echo ''
\echo '========================================================================='
\echo 'PART 1: Creating core tables...'
\echo '========================================================================='
\i 01_schema_core_tables.sql

-- ============================================================================
-- PART 2: Geofences and Alert Rules
-- ============================================================================
\echo ''
\echo '========================================================================='
\echo 'PART 2: Creating geofences and alert rules...'
\echo '========================================================================='
\i 02_schema_geofences_alerts.sql

-- ============================================================================
-- PART 3: Telemetry, History, Triggers, and Views
-- ============================================================================
\echo ''
\echo '========================================================================='
\echo 'PART 3: Creating telemetry, history, triggers, and views...'
\echo '========================================================================='
\i 03_schema_telemetry_history.sql

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
\echo ''
\echo '========================================================================='
\echo 'DATABASE VERIFICATION'
\echo '========================================================================='

-- Count tables
SELECT 
    'Total Tables Created' as metric,
    COUNT(*)::text as value
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- List all tables
\echo ''
\echo 'All Tables:'
SELECT 
    table_name,
    (
        SELECT COUNT(*) 
        FROM information_schema.columns 
        WHERE columns.table_name = tables.table_name
    ) as column_count
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Count indexes
\echo ''
SELECT 
    'Total Indexes Created' as metric,
    COUNT(*)::text as value
FROM pg_indexes 
WHERE schemaname = 'public';

-- Count views
\echo ''
SELECT 
    'Total Views Created' as metric,
    COUNT(*)::text as value
FROM information_schema.views 
WHERE table_schema = 'public';

-- Count triggers
\echo ''
SELECT 
    'Total Triggers Created' as metric,
    COUNT(DISTINCT trigger_name)::text as value
FROM information_schema.triggers 
WHERE trigger_schema = 'public';

-- Show sample data
\echo ''
\echo 'Sample Data Created:'
SELECT 'Admin user: ' || username || ' (role: ' || role || ')' as info
FROM users 
WHERE role = 'admin';

SELECT 'Message type: ' || name as info
FROM message_types;

\echo ''
\echo '========================================================================='
\echo 'DATABASE SETUP COMPLETE ✓'
\echo '========================================================================='
\echo ''
\echo 'Next steps:'
\echo '1. Review the created tables and indexes'
\echo '2. Create Prisma schema file (prisma/schema.prisma)'
\echo '3. Write migration script (migrate_json_to_db.py)'
\echo '4. Test with sample data'
\echo ''
\echo 'Database is ready for the React/Node.js application!'
\echo '========================================================================='
