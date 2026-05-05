const alertEvaluator = require('./src/services/alertEvaluator');
const { prisma } = require('./src/config/database');

/**
 * Smart test script for the Alert Evaluator
 * Finds a vessel with alert rules and tests evaluation
 */
async function smartTest() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🧪 SMART ALERT EVALUATOR TEST');
    console.log('='.repeat(70) + '\n');

    // Find vessels that have alert rules
    const vesselsWithRules = await prisma.alert_rules.findMany({
      where: { enabled: true },
      distinct: ['vessel_id'],
      select: {
        vessel_id: true,
        vessels: {
          select: { id: true, name: true }
        }
      },
      take: 5
    });

    if (vesselsWithRules.length === 0) {
      console.log('❌ No vessels have enabled alert rules');
      await prisma.$disconnect();
      return;
    }

    console.log(`📊 Found ${vesselsWithRules.length} vessels with alert rules:`);
    vesselsWithRules.forEach((v, i) => {
      console.log(`  ${i + 1}. ${v.vessels.name} (ID: ${v.vessel_id})`);
    });
    console.log();

    // Use the first vessel
    const targetVesselId = vesselsWithRules[0].vessel_id;
    const targetVesselName = vesselsWithRules[0].vessels.name;

    console.log(`🎯 Testing with vessel: ${targetVesselName} (ID: ${targetVesselId})\n`);

    // Get telemetry for this vessel
    const telemetry = await prisma.telemetry.findMany({
      where: { vessel_id: targetVesselId },
      include: {
        vessels: true,
        message_types: true
      },
      orderBy: { timestamp: 'desc' },
      take: 3
    });

    if (telemetry.length === 0) {
      console.log(`❌ No telemetry found for ${targetVesselName}`);
      await prisma.$disconnect();
      return;
    }

    console.log(`📡 Found ${telemetry.length} telemetry entries for this vessel\n`);

    // Get alert rules for this vessel
    const alertRules = await prisma.alert_rules.findMany({
      where: {
        vessel_id: targetVesselId,
        enabled: true
      },
      include: {
        message_types: true
      }
    });

    console.log(`📋 Found ${alertRules.length} enabled alert rules\n`);

    // Show some alert rules
    console.log('Sample Alert Rules:');
    alertRules.slice(0, 10).forEach((rule, i) => {
      const status = rule.is_muted ? '🔇' : '✅';
      console.log(`  ${status} ${rule.name}: ${rule.field_name} ${rule.operator} ${rule.threshold}`);
      console.log(`     Consecutivity: ${rule.consecutivity_enabled ? `Enabled (${rule.consecutivity_count})` : 'Disabled'}`);
      console.log(`     Time Window: ${rule.time_enabled ? `Enabled (${rule.time_count} in ${rule.time_window_mins} mins)` : 'Disabled'}`);
    });
    console.log();

    // Test with the most recent telemetry
    const testEntry = telemetry[0];

    console.log('Testing with telemetry:');
    console.log(`  ID: ${testEntry.id}`);
    console.log(`  Timestamp: ${testEntry.timestamp.toISOString()}`);
    console.log(`  Message Type: ${testEntry.message_types.name}`);
    console.log();

    console.log('Telemetry Data Sample:');
    const dataKeys = Object.keys(testEntry.data).slice(0, 15);
    dataKeys.forEach(key => {
      const value = testEntry.data[key];
      const displayValue = typeof value === 'number' ? value.toFixed(2) : value;
      console.log(`  ${key}: ${displayValue}`);
    });
    if (Object.keys(testEntry.data).length > 15) {
      console.log(`  ... (${Object.keys(testEntry.data).length - 15} more fields)`);
    }
    console.log();

    console.log('='.repeat(70));
    console.log('🚀 RUNNING ALERT EVALUATION');
    console.log('='.repeat(70) + '\n');

    // Run the evaluation
    const result = await alertEvaluator.evaluateTelemetry(testEntry.id);

    console.log('\n' + '='.repeat(70));
    console.log('📊 EVALUATION RESULTS');
    console.log('='.repeat(70));
    console.log(`Status: ${result.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`Rules Evaluated: ${result.rulesEvaluated || 0}`);
    console.log(`Alerts Triggered: ${result.alertsTriggered || 0}`);

    if (result.error) {
      console.log(`Error: ${result.error}`);
    }

    if (result.triggeredAlerts && result.triggeredAlerts.length > 0) {
      console.log('\n🚨 TRIGGERED ALERTS:');
      result.triggeredAlerts.forEach((alert, i) => {
        console.log(`\n  Alert #${i + 1}:`);
        console.log(`    ID: ${alert.id}`);
        console.log(`    Text: ${alert.alert_text}`);
        console.log(`    Status: ${alert.status}`);
        console.log(`    First Triggered: ${alert.first_triggered_at.toISOString()}`);
        console.log(`    Repeat Count: ${alert.repeat_count}`);
      });
    }

    // Check evaluation records
    const evaluations = await prisma.alert_evaluations.findMany({
      where: { telemetry_id: testEntry.id },
      include: {
        alert_rules: {
          select: { name: true, field_name: true, operator: true, threshold: true }
        }
      }
    });

    if (evaluations.length > 0) {
      console.log(`\n📋 EVALUATION RECORDS: ${evaluations.length} created\n`);

      const triggered = evaluations.filter(e => e.triggered);
      const notTriggered = evaluations.filter(e => !e.triggered);

      console.log(`   ✅ Rules OK: ${notTriggered.length}`);
      console.log(`   🔴 Rules Triggered: ${triggered.length}\n`);

      if (triggered.length > 0) {
        console.log('   Triggered Rules:');
        triggered.forEach(e => {
          console.log(`     - ${e.alert_rules.name}: ${e.field_value} ${e.alert_rules.operator} ${e.alert_rules.threshold}`);
        });
      }
    }

    // Check alert history
    const alertHistory = await prisma.alert_history.findMany({
      where: { vessel_id: targetVesselId },
      orderBy: { first_triggered_at: 'desc' },
      take: 5,
      include: {
        alert_rules: {
          select: { name: true }
        }
      }
    });

    if (alertHistory.length > 0) {
      console.log(`\n📚 ALERT HISTORY: ${alertHistory.length} recent alerts\n`);
      alertHistory.forEach((alert, i) => {
        const statusIcon = alert.status === 'active' ? '🔴' : alert.status === 'acknowledged' ? '🟡' : '✅';
        console.log(`  ${i + 1}. ${statusIcon} ${alert.alert_rules?.name || 'Unknown'}`);
        console.log(`     Status: ${alert.status}`);
        console.log(`     First: ${alert.first_triggered_at.toISOString()}`);
        console.log(`     Last: ${alert.last_triggered_at.toISOString()}`);
        console.log(`     Repeats: ${alert.repeat_count}`);
      });
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ TEST COMPLETE');
    console.log('='.repeat(70) + '\n');

    await prisma.$disconnect();

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    console.error(error.stack);
    await prisma.$disconnect();
    process.exit(1);
  }
}

smartTest();