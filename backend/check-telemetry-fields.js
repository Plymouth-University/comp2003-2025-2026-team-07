const { prisma } = require('./src/config/database');

/**
 * Check if telemetry data contains fields required by alert rules
 */
async function checkTelemetryFields() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 TELEMETRY FIELD ANALYSIS');
    console.log('='.repeat(80) + '\n');

    // Get vessels with alert rules
    const vesselsWithRules = await prisma.vessels.findMany({
      where: {
        alert_rules: {
          some: { enabled: true }
        }
      },
      include: {
        alert_rules: {
          where: { enabled: true },
          select: {
            id: true,
            name: true,
            field_name: true,
            operator: true,
            threshold: true,
            is_muted: true
          }
        }
      }
    });

    console.log(`📊 Found ${vesselsWithRules.length} vessels with enabled alert rules\n`);

    for (const vessel of vesselsWithRules) {
      console.log('='.repeat(80));
      console.log(`🚢 VESSEL: ${vessel.name} (ID: ${vessel.id})`);
      console.log('='.repeat(80));

      // Get recent telemetry
      const recentTelemetry = await prisma.telemetry.findMany({
        where: { vessel_id: vessel.id },
        orderBy: { timestamp: 'desc' },
        take: 3,
        include: {
          message_types: true
        }
      });

      if (recentTelemetry.length === 0) {
        console.log('❌ NO TELEMETRY DATA FOUND\n');
        continue;
      }

      console.log(`\n📡 Latest Telemetry:`);
      const latest = recentTelemetry[0];
      console.log(`   Timestamp: ${latest.timestamp.toISOString()}`);
      console.log(`   Message Type: ${latest.message_types.name}`);
      console.log(`   Received At: ${latest.received_at.toISOString()}`);
      console.log(`   Data Age: ${Math.round((Date.now() - latest.timestamp.getTime()) / (1000 * 60 * 60 * 24))} days old`);

      // Get all unique field names from telemetry data
      const telemetryFields = new Set();
      recentTelemetry.forEach(t => {
        Object.keys(t.data).forEach(key => telemetryFields.add(key));
      });

      console.log(`\n📋 Available Fields (${telemetryFields.size} total):`);
      const sortedFields = Array.from(telemetryFields).sort();
      sortedFields.forEach(field => {
        const value = latest.data[field];
        const displayValue = typeof value === 'number' ? value.toFixed(2) : value;
        console.log(`   ✓ ${field}: ${displayValue}`);
      });

      // Get required fields from alert rules
      const requiredFields = new Set();
      const activeRules = vessel.alert_rules.filter(r => !r.is_muted);
      const mutedRules = vessel.alert_rules.filter(r => r.is_muted);

      activeRules.forEach(rule => requiredFields.add(rule.field_name));

      console.log(`\n🚨 Alert Rules: ${vessel.alert_rules.length} total (${activeRules.length} active, ${mutedRules.length} muted)`);

      // Check field matches
      const matchedFields = [];
      const missingFields = [];

      for (const rule of activeRules) {
        const fieldName = rule.field_name;

        // Try to find the field in various formats
        const snakeCase = fieldName.toLowerCase().replace(/\s+/g, '_');
        const pascalCase = snakeCase.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');

        const found = telemetryFields.has(fieldName) ||
                     telemetryFields.has(snakeCase) ||
                     telemetryFields.has(pascalCase);

        if (found) {
          matchedFields.push(rule);
        } else {
          missingFields.push(rule);
        }
      }

      if (matchedFields.length > 0) {
        console.log(`\n✅ MATCHED RULES (${matchedFields.length}) - Can be evaluated:`);
        matchedFields.forEach(rule => {
          console.log(`   • ${rule.name}: ${rule.field_name} ${rule.operator} ${rule.threshold}`);
        });
      }

      if (missingFields.length > 0) {
        console.log(`\n❌ MISSING FIELDS (${missingFields.length}) - Cannot be evaluated:`);
        missingFields.forEach(rule => {
          console.log(`   • ${rule.name}: "${rule.field_name}" not found in telemetry`);
        });
      }

      if (mutedRules.length > 0) {
        console.log(`\n🔇 MUTED RULES (${mutedRules.length}) - Skipped:`);
        mutedRules.slice(0, 5).forEach(rule => {
          console.log(`   • ${rule.name}: ${rule.field_name} ${rule.operator} ${rule.threshold}`);
        });
        if (mutedRules.length > 5) {
          console.log(`   ... and ${mutedRules.length - 5} more`);
        }
      }

      // Summary
      const coverage = activeRules.length > 0
        ? ((matchedFields.length / activeRules.length) * 100).toFixed(1)
        : 0;

      console.log(`\n📊 SUMMARY:`);
      console.log(`   Total Rules: ${vessel.alert_rules.length}`);
      console.log(`   Active Rules: ${activeRules.length}`);
      console.log(`   Evaluable Rules: ${matchedFields.length}`);
      console.log(`   Coverage: ${coverage}%`);

      if (parseFloat(coverage) < 50 && activeRules.length > 0) {
        console.log(`   ⚠️  WARNING: Low coverage - most alert rules cannot be evaluated!`);
      } else if (parseFloat(coverage) >= 80) {
        console.log(`   ✅ GOOD: Most alert rules can be evaluated`);
      }

      console.log('\n');
    }

    console.log('='.repeat(80));
    console.log('📈 OVERALL ANALYSIS');
    console.log('='.repeat(80) + '\n');

    // Get all unique field names across all vessels
    const allTelemetryFields = await prisma.telemetry.findMany({
      select: { data: true },
      take: 10
    });

    const allFields = new Set();
    allTelemetryFields.forEach(t => {
      Object.keys(t.data).forEach(key => allFields.add(key));
    });

    console.log(`📋 All Telemetry Fields (${allFields.size} unique):`);
    Array.from(allFields).sort().forEach(field => {
      console.log(`   • ${field}`);
    });

    // Get all unique required fields
    const allRequiredFields = await prisma.alert_rules.findMany({
      where: { enabled: true },
      distinct: ['field_name'],
      select: { field_name: true }
    });

    console.log(`\n🚨 All Required Fields (${allRequiredFields.length} unique):`);
    allRequiredFields.forEach(rule => {
      const hasField = allFields.has(rule.field_name);
      const icon = hasField ? '✅' : '❌';
      console.log(`   ${icon} ${rule.field_name}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ ANALYSIS COMPLETE');
    console.log('='.repeat(80) + '\n');

    await prisma.$disconnect();

  } catch (error) {
    console.error('\n❌ ERROR:', error);
    console.error(error.stack);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkTelemetryFields();