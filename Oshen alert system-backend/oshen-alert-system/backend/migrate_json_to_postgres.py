#!/usr/bin/env python3
"""
Oshen Alert System - Data Migration Script
Migrates data from Flask app_data.json to PostgreSQL database
"""

import json
import psycopg2
from psycopg2.extras import Json
from datetime import datetime
import sys

# ====================================================================
# DATABASE CONFIGURATION
# ====================================================================
DB_CONFIG = {
    'host': '127.0.0.1',
    'port': 5433,
    'database': 'oshen_alerts',
    'user': 'postgres',
    'password': '08033379777'  # Update if needed
}

# Path to your app_data.json file
JSON_FILE_PATH = 'app_data.json'  # Update this path!


# ====================================================================
# HELPER FUNCTIONS
# ====================================================================

def load_json_data(filepath):
    """Load the app_data.json file"""
    print(f"📂 Loading data from {filepath}...")
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        print(f"✅ Loaded {len(data.get('platforms', []))} vessels from JSON")
        return data
    except FileNotFoundError:
        print(f"❌ Error: File not found: {filepath}")
        print("Please update JSON_FILE_PATH in the script to point to your app_data.json file")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"❌ Error: Invalid JSON format: {e}")
        sys.exit(1)


def connect_db():
    """Connect to PostgreSQL database"""
    print("🔌 Connecting to PostgreSQL...")
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        print("✅ Connected to database successfully")
        return conn
    except psycopg2.Error as e:
        print(f"❌ Failed to connect to database: {e}")
        sys.exit(1)


# ====================================================================
# MIGRATION FUNCTIONS
# ====================================================================

def migrate_message_types(cursor, data):
    """Migrate unique message types"""
    print("\n📋 Migrating message types...")
    
    message_types = {}
    
    # Collect unique message types from all vessels
    for platform in data.get('platforms', []):
        for msg_type in platform.get('message_types', []):
            name = msg_type.get('name')
            if name and name not in message_types:
                message_types[name] = {
                    'schema_path': msg_type.get('decoding_schema_path', ''),
                    'expected_interval': msg_type.get('acceptable_time_between_messages', 30),
                    'late_threshold': msg_type.get('acceptable_late_time_mins', 30)
                }
    
    # Insert message types
    for name, details in message_types.items():
        cursor.execute("""
            INSERT INTO message_types (name, schema_path, expected_interval_mins, late_threshold_mins)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (name) DO UPDATE 
            SET schema_path = EXCLUDED.schema_path,
                expected_interval_mins = EXCLUDED.expected_interval_mins,
                late_threshold_mins = EXCLUDED.late_threshold_mins
            RETURNING id
        """, (name, details['schema_path'], details['expected_interval'], details['late_threshold']))
        
        result = cursor.fetchone()
        if result:
            print(f"  ✅ Created/Updated message type: {name} (ID: {result[0]})")
    
    print(f"✅ Migrated {len(message_types)} message types")


def migrate_vessels(cursor, data):
    """Migrate vessels (platforms)"""
    print("\n🚢 Migrating vessels...")
    
    vessel_map = {}  # Maps vessel name to database ID
    
    for platform in data.get('platforms', []):
        name = platform.get('name')
        imei = platform.get('imei')
        at_sea = platform.get('at_sea_status', True)
        
        # Get latest position if available
        latest_pos = platform.get('latest_position')
        latest_position_json = None
        if latest_pos:
            latest_position_json = Json({
                'latitude': latest_pos.get('latitude'),
                'longitude': latest_pos.get('longitude'),
                'timestamp': latest_pos.get('timestamp')
            })
        
        # Get emergency alert status
        emergency_status = platform.get('emergency_alert_status', {})
        emergency_active = emergency_status.get('is_active', False)
        
        # Insert vessel
        cursor.execute("""
            INSERT INTO vessels (
                name, imei, at_sea_status, emergency_alert_active, 
                latest_position, escalation_threshold, repeat_interval_mins
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (imei) DO UPDATE 
            SET name = EXCLUDED.name,
                at_sea_status = EXCLUDED.at_sea_status,
                emergency_alert_active = EXCLUDED.emergency_alert_active,
                latest_position = EXCLUDED.latest_position
            RETURNING id
        """, (
            name, 
            imei, 
            at_sea, 
            emergency_active,
            latest_position_json,
            emergency_status.get('n_repeats_until_escalation', 3),
            emergency_status.get('repeat_interval_mins', 5)
        ))
        
        vessel_id = cursor.fetchone()[0]
        vessel_map[name] = vessel_id
        print(f"  ✅ Created/Updated vessel: {name} (ID: {vessel_id}, IMEI: {imei})")
    
    print(f"✅ Migrated {len(vessel_map)} vessels")
    return vessel_map


def migrate_geofences(cursor, data, vessel_map):
    """Migrate geofences (keep-in, keep-out zones and points)"""
    print("\n📍 Migrating geofences...")
    
    geofence_count = 0
    
    for platform in data.get('platforms', []):
        vessel_name = platform.get('name')
        vessel_id = vessel_map.get(vessel_name)
        
        if not vessel_id:
            print(f"  ⚠️  Skipping geofences for unknown vessel: {vessel_name}")
            continue
        
        geofences_data = platform.get('geofences', {})
        mute_info = geofences_data.get('mute_info', {})
        
        # Delete existing geofences for this vessel (to avoid duplicates)
        cursor.execute("DELETE FROM geofences WHERE vessel_id = %s", (vessel_id,))
        
        # Keep-in zone
        keep_in = geofences_data.get('keep_in_zone')
        if keep_in:
            geometry = {
                'type': 'Polygon',
                'coordinates': [keep_in]  # GeoJSON format
            }
            keep_in_mute = mute_info.get('keep_in', {})
            is_muted = keep_in_mute.get('is_muted', False)
            
            cursor.execute("""
                INSERT INTO geofences (vessel_id, geofence_type, geometry, is_muted)
                VALUES (%s, %s, %s, %s)
            """, (vessel_id, 'keep_in', Json(geometry), is_muted))
            geofence_count += 1
            print(f"  ✅ Created keep-in zone for {vessel_name} (muted: {is_muted})")
        
        # Keep-out zones
        keep_out_zones = geofences_data.get('keep_out_zones', [])
        keep_out_mutes = mute_info.get('keep_out', [])
        
        for i, zone in enumerate(keep_out_zones):
            coordinates = zone.get('coordinates', [])
            name = zone.get('name', f'Keep-out Zone {i+1}')
            is_muted = keep_out_mutes[i].get('is_muted', False) if i < len(keep_out_mutes) else False
            
            geometry = {
                'type': 'Polygon',
                'coordinates': [coordinates],
                'name': name
            }
            
            cursor.execute("""
                INSERT INTO geofences (vessel_id, geofence_type, geometry, is_muted)
                VALUES (%s, %s, %s, %s)
            """, (vessel_id, 'keep_out_zone', Json(geometry), is_muted))
            geofence_count += 1
            print(f"  ✅ Created keep-out zone '{name}' for {vessel_name}")
        
        # Keep-out points
        keep_out_points = geofences_data.get('keep_out_points', [])
        point_mutes = mute_info.get('keep_out_points', [])
        
        for i, point in enumerate(keep_out_points):
            lat = point.get('lat')
            lon = point.get('lon')
            name = point.get('name', f'Keep-out Point {i+1}')
            radius = point.get('radius', 1000)
            is_muted = point_mutes[i].get('is_muted', False) if i < len(point_mutes) else False
            
            geometry = {
                'type': 'Point',
                'coordinates': [lat, lon],
                'radius_meters': radius,
                'name': name
            }
            
            cursor.execute("""
                INSERT INTO geofences (vessel_id, geofence_type, geometry, is_muted)
                VALUES (%s, %s, %s, %s)
            """, (vessel_id, 'keep_out_point', Json(geometry), is_muted))
            geofence_count += 1
            print(f"  ✅ Created keep-out point '{name}' for {vessel_name} (radius: {radius}m)")
    
    print(f"✅ Migrated {geofence_count} geofences")


def migrate_alert_rules(cursor, data, vessel_map):
    """Migrate alert rules (alert triggers)"""
    print("\n🚨 Migrating alert rules...")
    
    alert_count = 0
    
    for platform in data.get('platforms', []):
        vessel_name = platform.get('name')
        vessel_id = vessel_map.get(vessel_name)
        
        if not vessel_id:
            print(f"  ⚠️  Skipping alerts for unknown vessel: {vessel_name}")
            continue
        
        # Delete existing alert rules for this vessel
        cursor.execute("DELETE FROM alert_rules WHERE vessel_id = %s", (vessel_id,))
        
        for msg_type in platform.get('message_types', []):
            msg_type_name = msg_type.get('name')
            
            # Get message_type_id
            cursor.execute("SELECT id FROM message_types WHERE name = %s", (msg_type_name,))
            result = cursor.fetchone()
            if not result:
                print(f"  ⚠️  Unknown message type: {msg_type_name}")
                continue
            message_type_id = result[0]
            
            # Migrate each alert trigger
            for trigger in msg_type.get('alert_triggers', []):
                name = trigger.get('name')
                field = trigger.get('field')
                comparator = trigger.get('comparator')
                threshold = trigger.get('value_threshold')
                consecutivity_count = trigger.get('consecutivity_trigger_count', 3)
                time_window = trigger.get('time_trigger_period_mins', 0)
                time_count = trigger.get('time_trigger_count', 100)
                is_muted = trigger.get('is_muted', False)
                
                # Check if triggers are enabled
                consecutivity_enabled = trigger.get('consecutivity_enabled', True)
                time_enabled = trigger.get('time_enabled', False)
                
                cursor.execute("""
                    INSERT INTO alert_rules (
                        vessel_id, message_type_id, name, field_name, operator, threshold,
                        consecutivity_enabled, consecutivity_count,
                        time_enabled, time_window_mins, time_count,
                        is_muted, enabled
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    vessel_id, message_type_id, name, field, comparator, threshold,
                    consecutivity_enabled, consecutivity_count,
                    time_enabled, time_window, time_count,
                    is_muted, True
                ))
                
                alert_count += 1
            
            trigger_count = len(msg_type.get('alert_triggers', []))
            print(f"  ✅ Created {trigger_count} alerts for {vessel_name}/{msg_type_name}")
    
    print(f"✅ Migrated {alert_count} alert rules")


def update_system_metadata(cursor, data):
    """Update system metadata with last_updated timestamp"""
    print("\n🔄 Updating system metadata...")
    
    last_updated = data.get('last_updated', datetime.now().isoformat())
    
    cursor.execute("""
        INSERT INTO system_metadata (id, last_updated)
        VALUES (1, %s)
        ON CONFLICT (id) DO UPDATE
        SET last_updated = EXCLUDED.last_updated
    """, (last_updated,))
    
    print(f"✅ System metadata updated (last_updated: {last_updated})")


# ====================================================================
# MAIN MIGRATION
# ====================================================================

def main():
    print("=" * 70)
    print("🚀 OSHEN DATA MIGRATION: JSON → PostgreSQL")
    print("=" * 70)
    
    # Load JSON data
    data = load_json_data(JSON_FILE_PATH)
    
    # Connect to database
    conn = connect_db()
    cursor = conn.cursor()
    
    try:
        # Perform migrations in order
        migrate_message_types(cursor, data)
        vessel_map = migrate_vessels(cursor, data)
        migrate_geofences(cursor, data, vessel_map)
        migrate_alert_rules(cursor, data, vessel_map)
        update_system_metadata(cursor, data)
        
        # Commit all changes
        print("\n💾 Committing changes to database...")
        conn.commit()
        print("✅ All changes committed successfully!")
        
        # Display summary
        print("\n" + "=" * 70)
        print("✅ MIGRATION COMPLETE!")
        print("=" * 70)
        
        cursor.execute("SELECT COUNT(*) FROM vessels")
        print(f"   🚢 Vessels: {cursor.fetchone()[0]}")
        
        cursor.execute("SELECT COUNT(*) FROM geofences")
        print(f"   📍 Geofences: {cursor.fetchone()[0]}")
        
        cursor.execute("SELECT COUNT(*) FROM alert_rules")
        print(f"   🚨 Alert Rules: {cursor.fetchone()[0]}")
        
        cursor.execute("SELECT COUNT(*) FROM message_types")
        print(f"   📋 Message Types: {cursor.fetchone()[0]}")
        
        print("=" * 70)
        print("\n🎉 Data migration successful! Your database is now populated.")
        print("Next steps:")
        print("  1. Verify data in pgAdmin")
        print("  2. Build Express API endpoints")
        print("  3. Deploy to cloud for team access")
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        print("Rolling back changes...")
        conn.rollback()
        sys.exit(1)
    
    finally:
        cursor.close()
        conn.close()
        print("\n🔌 Database connection closed")


if __name__ == '__main__':
    main()
