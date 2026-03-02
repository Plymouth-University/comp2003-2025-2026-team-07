const alertEvaluator = require('./src/services/alertEvaluator');
const { prisma } = require('./src/config/database');

/**
 * Test script for the Alert Evaluator
 *
 * This script will:
 * 1. Get the most recent telemetry entry
 * 2. Evaluate it against all alert rules
 * 3. Display the results
 */
async function testAlertEvaluator() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🧪 TESTING ALERT EVALUATOR');
    console.log('='.repeat(70) + '\n');

    // Get recent telemetry
    const recentTelemetry = await prisma.telemetry.findMany({
      include: {
        vessels: true,
        message_types: true
      },
      orderBy: { timestamp: 'desc' },
      take: 5
    });

    if (recentTelemetry.length === 0) {
      console.log('❌ No telemetry found in database');
      await prisma.$disconnect();
      return;
    }

    console.log(`📡 Found ${recentTelemetry.length} recent telemetry entries\n`);

    // Test with the most recent entry
    const testEntry = recentTelemetry[0];

    console.log('Testing with:');
    console.log(`  Vessel: ${testEntry.vessels.name}`);
    console.log(`  Message Type: ${testEntry.message_types.name}`);
    console.log(`  Timestamp: ${testEntry.timestamp.toISOString()}`);
    console.log(`  Telemetry ID: ${testEntry.id}\n`);

    // Check if there are any alert rules for this vessel
    const alertRules = await prisma.alert_rules.findMany({
      where: {
        vessel_id: testEntry.vessel_id,
        message_type_id: testEntry.message_type_id,
        enabled: true
      }
    });

    console.log(`📋 Found ${alertRules.length} enabled alert rules for this vessel\n`);

    if (alertRules.length === 0) {
      console.log('⚠️  No enabled alert rules for this vessel. Cannot test evaluation.');
      await prisma.$disconnect();
      return;
    }

    // Show sample alert rules
    console.log('Sample Alert Rules:');
    alertRules.slice(0, 5).forEach((rule, i) => {
      const status = rule.is_muted ? '🔇 Muted' : '✅ Active';
      console.log(`  ${i + 1}. ${rule.name}: ${rule.field_name} ${rule.operator} ${rule.threshold} ${status}`);
    });
    console.log();

    // Display telemetry data sample
    console.log('Telemetry Data Sample:');
    const dataKeys = Object.keys(testEntry.data).slice(0, 10);
    dataKeys.forEach(key => {
      console.log(`  ${key}: ${testEntry.data[key]}`);
    });
    if (Object.keys(testEntry.data).length > 10) {
      console.log(`  ... (${Object.keys(testEntry.data).length - 10} more fields)`);
    }
    console.log();

    console.log('-'.repeat(70));
    console.log('🚀 Starting Alert Evaluation...\n');
    console.log('-'.repeat(70));

    // Run the evaluation
    const result = await alertEvaluator.evaluateTelemetry(testEntry.id);

    console.log('\n' + '='.repeat(70));
    console.log('📊 EVALUATION RESULTS');
    console.log('='.repeat(70));
    console.log(`Status: ${result.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`Rules Evaluated: ${result.rulesEvaluated || 0}`);
    console.log(`Alerts Triggered: ${result.alertsTriggered || 0}`);

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
    } else {
      console.log('\nℹ️  No alerts triggered (this is normal if all rules are within thresholds)');
    }

    console.log('\n' + '='.repeat(70));

    // Show recent alert evaluations
    const recentEvaluations = await prisma.alert_evaluations.findMany({
      where: {
        telemetry_id: testEntry.id
      },
      include: {
        alert_rules: {
          select: { name: true, field_name: true, operator: true, threshold: true }
        }
      },
      orderBy: { evaluated_at: 'desc' },
      take: 10
    });

    if (recentEvaluations.length > 0) {
      console.log('\n📋 EVALUATION RECORDS CREATED:');
      console.log('-'.repeat(70));
      recentEvaluations.forEach((eval, i) => {
        const triggered = eval.triggered ? '🔴 TRIGGERED' : '✅ OK';
        console.log(`  ${i + 1}. ${eval.alert_rules.name}`);
        console.log(`     Field: ${eval.alert_rules.field_name} = ${eval.field_value}`);
        console.log(`     Rule: ${eval.alert_rules.operator} ${eval.alert_rules.threshold}`);
        console.log(`     Result: ${triggered}`);
        console.log();
      });
    }

    console.log('='.repeat(70));
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

// Run the test
testAlertEvaluator();