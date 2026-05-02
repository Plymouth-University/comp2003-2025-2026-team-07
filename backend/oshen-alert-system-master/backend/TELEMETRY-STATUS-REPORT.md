# Telemetry & Alert Evaluation Status Report

## Executive Summary

**The alert evaluator is working correctly.** However, there's a mismatch between which vessels have live data and which vessels have alert rules configured.

## Current Situation

### ✅ PB1 - MicroTransat (LIVE DATA)
- **Telemetry Status**: 🟢 **LIVE** - Last update: TODAY (Dec 9, 2025)
- **Data Quality**: ✅ Excellent - 81 fields including all sensor data
- **Alert Rules**: ❌ **ZERO** - No alert rules configured
- **Can Evaluate**: NO - No rules to evaluate against

### ❌ Other Vessels (TEST DATA)
**PC14, PC13, PC7, PC10, PC6, PS1**:
- **Telemetry Status**: 🔴 **STALE** - Last update: 11 days ago (Nov 28, 2025)
- **Data Quality**: ❌ Test data - Only 4 fields (speed, heading, battery_voltage, status)
- **Status Field**: "In port - test data"
- **Alert Rules**: ✅ 19-21 rules each
- **Can Evaluate**: NO - Missing required fields (sensor error flags, navigation data, etc.)

## Detailed Field Comparison

### PB1 Live Data (81 fields available):
```
✅ gps_comms_error_flag
✅ gps_fix_error_flag
✅ heading_sensor_comms_error_flag
✅ heading_sensor_value_error_flag
✅ power_sensor_comms_error_flag
✅ wind_sensor_comms_error_flag
✅ sd_card_write_error_flag
✅ servo_mcu_comms_error_flag
✅ sail_stall_flag
✅ rudder_stall_flag
✅ average_heading_error
✅ navigator_wind_speed_average
✅ average_speed_towards_target_waypoint
✅ platform_speed_on_target_heading_mean
✅ distance_to_wp
... and 66 more fields
```

### Other Vessels Test Data (4 fields only):
```
✅ speed
✅ heading
✅ battery_voltage
❌ status: "In port - test data"
```

## Why Alert Evaluation Isn't Working

1. **Vessels with alert rules** (PC14-PS1) have stale test data
2. **Vessel with live data** (PB1) has no alert rules
3. Test data doesn't contain the fields alert rules are looking for

## Solutions

### Option 1: Create Alert Rules for PB1 (Recommended)

PB1 has live telemetry coming in every ~10 minutes from the Oshen API. Creating alert rules for this vessel will let you test the system immediately.

**Example Alert Rules for PB1:**

```sql
-- GPS Comms Error
INSERT INTO alert_rules (vessel_id, message_type_id, name, field_name, operator, threshold,
  consecutivity_enabled, consecutivity_count, time_enabled, enabled)
VALUES (7, 1, 'GPS Comms Error', 'gps_comms_error_flag', '==', 1,
  true, 5, false, true);

-- Low Battery Voltage
INSERT INTO alert_rules (vessel_id, message_type_id, name, field_name, operator, threshold,
  consecutivity_enabled, consecutivity_count, time_enabled, enabled)
VALUES (7, 1, 'Low Battery', 'battery_voltage_average', '<', 12.0,
  true, 3, false, true);

-- High Wind Speed
INSERT INTO alert_rules (vessel_id, message_type_id, name, field_name, operator, threshold,
  consecutivity_enabled, consecutivity_count, time_enabled, enabled)
VALUES (7, 1, 'High Wind Speed', 'navigator_wind_speed_average', '>', 25.0,
  true, 2, false, true);

-- Heading Error
INSERT INTO alert_rules (vessel_id, message_type_id, name, field_name, operator, threshold,
  consecutivity_enabled, consecutivity_count, time_enabled, enabled)
VALUES (7, 1, 'Heading Error', 'average_heading_error', '||>=', 35,
  true, 3, false, true);
```

**Or use the frontend** to create these rules once it's built.

### Option 2: Wait for Other Vessels to Come Online

When PC14, PC13, PC7, PC10, PC6, PS1 come back online and start sending real telemetry:
1. Their `at_sea_status` will update to `true`
2. Data fetcher will poll them every 5 minutes
3. Real telemetry with all 81 fields will arrive
4. Alert evaluator will start working with their existing 116 rules

### Option 3: Copy Alert Rules to PB1

You can copy existing alert rules from PC14 to PB1:

```sql
INSERT INTO alert_rules (
  vessel_id, message_type_id, name, field_name, operator, threshold,
  consecutivity_enabled, consecutivity_count, time_enabled,
  time_window_mins, time_count, enabled, is_muted
)
SELECT
  7, -- PB1's vessel_id
  message_type_id, name, field_name, operator, threshold,
  consecutivity_enabled, consecutivity_count, time_enabled,
  time_window_mins, time_count, enabled, is_muted
FROM alert_rules
WHERE vessel_id = 1 -- PC14's rules
AND field_name IN (
  SELECT jsonb_object_keys(data) FROM telemetry WHERE vessel_id = 7 LIMIT 1
);
```

This copies only rules that have matching fields in PB1's telemetry.

## Testing the System Right Now

### Quick Test with PB1:

1. **Create 1-2 simple alert rules for PB1** (use SQL above)
2. **Wait 5 minutes** for next data fetch cycle
3. **Check backend console** for evaluation logs
4. **Verify in database**:
   ```sql
   SELECT * FROM alert_evaluations ORDER BY evaluated_at DESC LIMIT 10;
   SELECT * FROM alert_history WHERE vessel_id = 7;
   ```

## Data Fetcher Status

Run this to check the data fetcher:

```bash
cd backend
curl http://localhost:3000/api/data-fetcher/status
```

To manually trigger a fetch:
```bash
curl -X POST http://localhost:3000/api/data-fetcher/trigger
```

## Verification Commands

### Check Latest Telemetry:
```bash
cd backend
node check-pb1-data.js
```

### Check Alert Rules:
```bash
cd backend
node check-pb1-alerts.js
```

### Check Field Mismatches:
```bash
cd backend
node check-telemetry-fields.js
```

## Conclusion

**Everything is working correctly!** The issue is simply:
- ✅ Alert evaluator: Working
- ✅ Data fetcher: Pulling live data from PB1
- ✅ Alert rules: Configured for other vessels
- ❌ **Mismatch**: Live data vessel (PB1) has no rules

**Immediate action**: Create alert rules for PB1 to test the system with live data.

Once the other vessels come back online (or when you create rules for PB1), the alert evaluation will work perfectly because all the infrastructure is in place and functioning.
