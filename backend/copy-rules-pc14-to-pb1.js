const { prisma } = require('./src/config/database');

/**
 * Copy alert rules from PC14 to PB1
 * Only copies rules that have matching fields in PB1's telemetry data
 */
async function copyRulesToPB1() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('📋 COPYING ALERT RULES FROM PC14 TO PB1');
    console.log('='.repeat(80) + '\n');

    // Get PC14 (source vessel)
    const pc14 = await prisma.vessels.findFirst({
      where: { name: 'PC14' },
      include: {
        alert_rules: {
          include: {
            message_types: true
          }
        }
      }
    });

    if (!pc14) {
      console.log('❌ PC14 not found');
      await prisma.$disconnect();
      return;
    }

    // Get PB1 (target vessel)
    const pb1 = await prisma.vessels.findFirst({
      where: { name: { contains: 'PB1' } }
    });

    if (!pb1) {
      console.log('❌ PB1 not found');
      await prisma.$disconnect();
      return;
    }

    console.log(`Source: ${pc14.name} (ID: ${pc14.id}) - ${pc14.alert_rules.length} rules`);
    console.log(`Target: ${pb1.name} (ID: ${pb1.id})\n`);

    // Get PB1's latest telemetry to check available fields
    const pb1Telemetry = await prisma.telemetry.findFirst({
      where: { vessel_id: pb1.id },
      orderBy: { timestamp: 'desc' }
    });

    if (!pb1Telemetry) {
      console.log('❌ No telemetry data for PB1');
      await prisma.$disconnect();
      return;
    }

    const availableFields = new Set(Object.keys(pb1Telemetry.data));
    console.log(`PB1 has ${availableFields.size} telemetry fields available\n`);

    // Helper function to check if field exists in telemetry
    function fieldExists(fieldName) {
      // Try exact match
      if (availableFields.has(fieldName)) return true;

      // Try snake_case
      const snakeCase = fieldName.toLowerCase().replace(/\s+/g, '_');
      if (availableFields.has(snakeCase)) return true;

      // Try PascalCase
      const pascalCase = snakeCase.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
      if (availableFields.has(pascalCase)) return true;

      return false;
    }

    // Filter compatible rules
    const compatibleRules = [];
    const incompatibleRules = [];

    for (const rule of pc14.alert_rules) {
      if (fieldExists(rule.field_name)) {
        compatibleRules.push(rule);
      } else {
        incompatibleRules.push(rule);
      }
    }

    console.log('='.repeat(80));
    console.log('📊 ANALYSIS');
    console.log('='.repeat(80) + '\n');
    console.log(`✅ Compatible Rules: ${compatibleRules.length}`);
    console.log(`❌ Incompatible Rules: ${incompatibleRules.length}\n`);

    if (compatibleRules.length === 0) {
      console.log('⚠️  No compatible rules to copy!');
      await prisma.$disconnect();
      return;
    }

    console.log('Compatible Rules to Copy:');
    compatibleRules.forEach((rule, i) => {
      const status = rule.enabled ? '✅' : '❌';
      const muted = rule.is_muted ? '🔇' : '';
      console.log(`  ${i + 1}. ${status} ${muted} ${rule.name}: ${rule.field_name} ${rule.operator} ${rule.threshold}`);
    });

    if (incompatibleRules.length > 0) {
      console.log('\nIncompatible Rules (will NOT be copied):');
      incompatibleRules.slice(0, 5).forEach((rule, i) => {
        console.log(`  ${i + 1}. ${rule.name}: "${rule.field_name}" not found in PB1 telemetry`);
      });
      if (incompatibleRules.length > 5) {
        console.log(`  ... and ${incompatibleRules.length - 5} more`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('💾 COPYING RULES');
    console.log('='.repeat(80) + '\n');

    let copiedCount = 0;
    let skippedCount = 0;

    for (const rule of compatibleRules) {
      try {
        // Check if rule already exists for PB1
        const existing = await prisma.alert_rules.findFirst({
          where: {
            vessel_id: pb1.id,
            name: rule.name,
            field_name: rule.field_name
          }
        });

        if (existing) {
          console.log(`⏭️  Skipped: "${rule.name}" (already exists)`);
          skippedCount++;
          continue;
        }

        // Copy the rule
        const newRule = await prisma.alert_rules.create({
          data: {
            vessel_id: pb1.id,
            message_type_id: rule.message_type_id,
            name: rule.name,
            field_name: rule.field_name,
            operator: rule.operator,
            threshold: rule.threshold,
            consecutivity_enabled: rule.consecutivity_enabled,
            consecutivity_count: rule.consecutivity_count,
            time_enabled: rule.time_enabled,
            time_window_mins: rule.time_window_mins,
            time_count: rule.time_count,
            enabled: rule.enabled,
            is_muted: rule.is_muted,
            unmute_date: rule.unmute_date
          }
        });

        console.log(`✅ Copied: "${rule.name}" (ID: ${newRule.id})`);
        copiedCount++;

      } catch (error) {
        console.log(`❌ Failed to copy "${rule.name}": ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📈 SUMMARY');
    console.log('='.repeat(80) + '\n');
    console.log(`Total PC14 Rules: ${pc14.alert_rules.length}`);
    console.log(`Compatible Rules: ${compatibleRules.length}`);
    console.log(`Successfully Copied: ${copiedCount}`);
    console.log(`Skipped (already exist): ${skippedCount}`);
    console.log(`Incompatible (not copied): ${incompatibleRules.length}\n`);

    // Verify
    const pb1Rules = await prisma.alert_rules.findMany({
      where: { vessel_id: pb1.id }
    });

    console.log(`✅ PB1 now has ${pb1Rules.length} total alert rules\n`);

    if (copiedCount > 0) {
      console.log('🎉 SUCCESS! Alert rules copied to PB1');
      console.log('\nNext steps:');
      console.log('1. Wait 5 minutes for next data fetch cycle');
      console.log('2. Watch backend console for alert evaluations');
      console.log('3. Check alert_history table for triggered alerts');
      console.log('4. View in frontend once built\n');
    }

    console.log('='.repeat(80) + '\n');

    await prisma.$disconnect();

  } catch (error) {
    console.error('\n❌ ERROR:', error);
    console.error(error.stack);
    await prisma.$disconnect();
    process.exit(1);
  }
}

copyRulesToPB1();