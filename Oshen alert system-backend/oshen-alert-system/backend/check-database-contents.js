const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('DATABASE CONTENTS VERIFICATION');
    console.log('='.repeat(70) + '\n');

    // Count records
    const userCount = await prisma.users.count();
    const vesselCount = await prisma.vessels.count();
    const alertCount = await prisma.alert_rules.count();
    const geofenceCount = await prisma.geofences.count();
    const telemetryCount = await prisma.telemetry.count();
    const messageTypeCount = await prisma.message_types.count();
    const alertHistoryCount = await prisma.alert_history.count();

    console.log('📊 RECORD COUNTS:');
    console.log('-'.repeat(70));
    console.log(`Users:               ${userCount}`);
    console.log(`Vessels:             ${vesselCount}`);
    console.log(`Alert Rules:         ${alertCount}`);
    console.log(`Geofences:           ${geofenceCount}`);
    console.log(`Telemetry Records:   ${telemetryCount}`);
    console.log(`Message Types:       ${messageTypeCount}`);
    console.log(`Alert History:       ${alertHistoryCount}`);
    console.log('-'.repeat(70) + '\n');

    // Get sample data
    if (userCount > 0) {
      const users = await prisma.users.findMany({
        select: { id: true, username: true, email: true, role: true, created_at: true }
      });
      console.log('👥 USERS:');
      console.log('-'.repeat(70));
      users.forEach(u => {
        console.log(`  [${u.id}] ${u.username} (${u.role}) - ${u.email}`);
      });
      console.log();
    }

    if (vesselCount > 0) {
      const vessels = await prisma.vessels.findMany({
        select: {
          id: true,
          name: true,
          imei: true,
          at_sea_status: true,
          primary_supervisor_id: true,
          secondary_supervisor_id: true
        }
      });
      console.log('🚢 VESSELS:');
      console.log('-'.repeat(70));
      vessels.forEach(v => {
        const status = v.at_sea_status ? '🌊 At Sea' : '🏠 Docked';
        console.log(`  [${v.id}] ${v.name} (IMEI: ${v.imei}) - ${status}`);
        if (v.primary_supervisor_id) {
          console.log(`      Primary Supervisor: User ${v.primary_supervisor_id}`);
        }
        if (v.secondary_supervisor_id) {
          console.log(`      Secondary Supervisor: User ${v.secondary_supervisor_id}`);
        }
      });
      console.log();
    }

    if (messageTypeCount > 0) {
      const messageTypes = await prisma.message_types.findMany({
        select: { id: true, name: true, expected_interval_mins: true }
      });
      console.log('📨 MESSAGE TYPES:');
      console.log('-'.repeat(70));
      messageTypes.forEach(mt => {
        console.log(`  [${mt.id}] ${mt.name} (Expected every ${mt.expected_interval_mins} mins)`);
      });
      console.log();
    }

    if (alertCount > 0) {
      const alerts = await prisma.alert_rules.findMany({
        select: {
          id: true,
          name: true,
          field_name: true,
          operator: true,
          threshold: true,
          enabled: true,
          is_muted: true,
          vessels: { select: { name: true } }
        },
        take: 10
      });
      console.log('🚨 ALERT RULES (First 10):');
      console.log('-'.repeat(70));
      alerts.forEach(a => {
        const status = !a.enabled ? '❌ Disabled' : a.is_muted ? '🔇 Muted' : '✅ Active';
        console.log(`  [${a.id}] ${a.name} (${a.vessels.name})`);
        console.log(`      Rule: ${a.field_name} ${a.operator} ${a.threshold} - ${status}`);
      });
      console.log();
    }

    if (geofenceCount > 0) {
      const geofences = await prisma.geofences.findMany({
        select: {
          id: true,
          geofence_type: true,
          is_muted: true,
          vessels: { select: { name: true } }
        }
      });
      console.log('🗺️  GEOFENCES:');
      console.log('-'.repeat(70));
      geofences.forEach(g => {
        const status = g.is_muted ? '🔇 Muted' : '✅ Active';
        console.log(`  [${g.id}] ${g.geofence_type} for ${g.vessels.name} - ${status}`);
      });
      console.log();
    }

    if (telemetryCount > 0) {
      const recentTelemetry = await prisma.telemetry.findMany({
        select: {
          id: true,
          timestamp: true,
          latitude: true,
          longitude: true,
          vessels: { select: { name: true } },
          message_types: { select: { name: true } }
        },
        orderBy: { timestamp: 'desc' },
        take: 5
      });
      console.log('📡 RECENT TELEMETRY (Last 5):');
      console.log('-'.repeat(70));
      recentTelemetry.forEach(t => {
        console.log(`  [${t.id}] ${t.vessels.name} - ${t.message_types.name}`);
        console.log(`      Time: ${t.timestamp.toISOString()}`);
        if (t.latitude && t.longitude) {
          console.log(`      Position: ${t.latitude.toFixed(4)}, ${t.longitude.toFixed(4)}`);
        }
      });
      console.log();
    }

    console.log('='.repeat(70));
    console.log('✅ DATABASE VERIFICATION COMPLETE');
    console.log('='.repeat(70) + '\n');

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkDatabase();