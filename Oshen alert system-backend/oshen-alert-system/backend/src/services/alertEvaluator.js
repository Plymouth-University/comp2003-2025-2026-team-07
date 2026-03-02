const { prisma } = require('../config/database');

/**
 * Alert Evaluation Engine
 *
 * Evaluates incoming telemetry against alert rules.
 * Tracks consecutivity and time-based triggers.
 * Creates alert_history entries when thresholds are met.
 *
 * Based on Flask app's alert_evaluator.py
 */
class AlertEvaluator {
  /**
   * Compare a value against a threshold using a comparator
   * Supports: '>', '>=', '<', '<=', '==', '||>=' (absolute value)
   */
  compare(value, threshold, comparator) {
    const numValue = parseFloat(value);
    const numThreshold = parseFloat(threshold);

    switch (comparator) {
      case '>':
        return numValue > numThreshold;
      case '>=':
        return numValue >= numThreshold;
      case '<':
        return numValue < numThreshold;
      case '<=':
        return numValue <= numThreshold;
      case '==':
        return numValue === numThreshold;
      case '||>=':
        return Math.abs(numValue) >= numThreshold;
      default:
        throw new Error(`Unknown comparator: ${comparator}`);
    }
  }

  /**
   * Check if an alert rule is currently muted
   */
  isMuted(alertRule) {
    if (!alertRule.is_muted) return false;
    if (!alertRule.unmute_date) return alertRule.is_muted;

    const now = new Date();
    const unmuteDate = new Date(alertRule.unmute_date);
    return now < unmuteDate;
  }

  /**
   * Extract field value from telemetry data
   * Tries multiple field name formats: original, snake_case, PascalCase
   */
  extractFieldValue(telemetryData, fieldName) {
    // Try original field name
    if (fieldName in telemetryData) {
      return { value: telemetryData[fieldName], found: true };
    }

    // Try snake_case version
    const snakeCase = fieldName.toLowerCase().replace(/\s+/g, '_');
    if (snakeCase in telemetryData) {
      return { value: telemetryData[snakeCase], found: true };
    }

    // Try PascalCase version
    const pascalCase = snakeCase
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
    if (pascalCase in telemetryData) {
      return { value: telemetryData[pascalCase], found: true };
    }

    return { value: null, found: false };
  }

  /**
   * Get recent consecutive evaluations for an alert rule
   * Used to determine if consecutivity threshold is met
   */
  async getRecentConsecutiveEvaluations(alertRuleId, telemetryId, limit) {
    const evaluations = await prisma.alert_evaluations.findMany({
      where: {
        alert_rule_id: alertRuleId,
        id: { lt: telemetryId } // Only evaluations before this one
      },
      orderBy: { evaluated_at: 'desc' },
      take: limit
    });

    return evaluations;
  }

  /**
   * Get evaluations within a time window
   * Used for time-based triggers (e.g., "100 violations in 30 minutes")
   */
  async getEvaluationsInTimeWindow(alertRuleId, windowMinutes) {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

    const evaluations = await prisma.alert_evaluations.findMany({
      where: {
        alert_rule_id: alertRuleId,
        evaluated_at: { gte: windowStart },
        triggered: true
      }
    });

    return evaluations;
  }

  /**
   * Create or update alert history entry
   */
  async createOrUpdateAlertHistory(alertRule, vessel, alertText, telemetryTimestamp) {
    // Check if there's an active alert for this rule
    const existingAlert = await prisma.alert_history.findFirst({
      where: {
        vessel_id: vessel.id,
        alert_rule_id: alertRule.id,
        status: 'active'
      }
    });

    if (existingAlert) {
      // Update existing alert (repeat)
      const updatedAlert = await prisma.alert_history.update({
        where: { id: existingAlert.id },
        data: {
          last_triggered_at: new Date(),
          repeat_count: existingAlert.repeat_count + 1
        }
      });

      console.log(`🔄 Updated alert #${updatedAlert.id}: ${alertText} (Repeat #${updatedAlert.repeat_count})`);
      return updatedAlert;
    } else {
      // Create new alert
      const newAlert = await prisma.alert_history.create({
        data: {
          vessel_id: vessel.id,
          alert_rule_id: alertRule.id,
          alert_text: alertText,
          first_triggered_at: new Date(),
          last_triggered_at: new Date(),
          repeat_count: 0,
          status: 'active',
          pagem_sent: false
        }
      });

      console.log(`🚨 NEW ALERT #${newAlert.id}: ${alertText}`);
      return newAlert;
    }
  }

  /**
   * Evaluate a single telemetry entry against all alert rules for that vessel
   * This is the main entry point called when new telemetry arrives
   */
  async evaluateTelemetry(telemetryId) {
    try {
      // Get the telemetry entry with vessel and message type info
      const telemetry = await prisma.telemetry.findUnique({
        where: { id: telemetryId },
        include: {
          vessels: true,
          message_types: true
        }
      });

      if (!telemetry) {
        console.error(`❌ Telemetry ${telemetryId} not found`);
        return { success: false, error: 'Telemetry not found' };
      }

      const vessel = telemetry.vessels;
      const telemetryData = telemetry.data;

      console.log(`\n🔍 Evaluating telemetry #${telemetryId} for vessel ${vessel.name}`);

      // Get all enabled alert rules for this vessel and message type
      const alertRules = await prisma.alert_rules.findMany({
        where: {
          vessel_id: vessel.id,
          message_type_id: telemetry.message_type_id,
          enabled: true
        },
        include: {
          message_types: true
        }
      });

      if (alertRules.length === 0) {
        console.log(`ℹ️  No enabled alert rules for ${vessel.name}`);
        return { success: true, rulesEvaluated: 0, alertsTriggered: 0 };
      }

      console.log(`📋 Found ${alertRules.length} enabled alert rules to evaluate`);

      let evaluationsCreated = 0;
      let alertsTriggered = 0;
      const triggeredAlerts = [];

      // Evaluate each alert rule
      for (const alertRule of alertRules) {
        const result = await this.evaluateRule(alertRule, telemetry, vessel);

        if (result.evaluated) {
          evaluationsCreated++;
        }

        if (result.alertTriggered) {
          alertsTriggered++;
          triggeredAlerts.push(result.alertHistory);
        }
      }

      console.log(`✅ Evaluation complete: ${evaluationsCreated} rules evaluated, ${alertsTriggered} alerts triggered\n`);

      return {
        success: true,
        rulesEvaluated: evaluationsCreated,
        alertsTriggered: alertsTriggered,
        triggeredAlerts: triggeredAlerts
      };

    } catch (error) {
      console.error(`❌ Error evaluating telemetry ${telemetryId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Evaluate a single alert rule against telemetry
   */
  async evaluateRule(alertRule, telemetry, vessel) {
    const fieldName = alertRule.field_name;
    const threshold = parseFloat(alertRule.threshold);
    const operator = alertRule.operator;

    // Check if rule is muted
    if (this.isMuted(alertRule)) {
      console.log(`🔇 Rule "${alertRule.name}" is muted, skipping`);
      return { evaluated: false, triggered: false, alertTriggered: false };
    }

    // Extract field value from telemetry data
    const { value: fieldValue, found } = this.extractFieldValue(telemetry.data, fieldName);

    if (!found) {
      console.warn(`⚠️  Field "${fieldName}" not found in telemetry data for rule "${alertRule.name}"`);
      return { evaluated: false, triggered: false, alertTriggered: false };
    }

    // Perform comparison
    const isTriggered = this.compare(fieldValue, threshold, operator);

    // Store evaluation result
    await prisma.alert_evaluations.create({
      data: {
        alert_rule_id: alertRule.id,
        telemetry_id: telemetry.id,
        triggered: isTriggered,
        field_value: parseFloat(fieldValue) || 0,
        evaluated_at: new Date()
      }
    });

    if (!isTriggered) {
      console.log(`✓ Rule "${alertRule.name}": ${fieldValue} ${operator} ${threshold} = false`);
      return { evaluated: true, triggered: false, alertTriggered: false };
    }

    console.log(`⚠️  Rule "${alertRule.name}": ${fieldValue} ${operator} ${threshold} = TRUE`);

    // Check if we should trigger an alert based on consecutivity or time window
    const shouldAlert = await this.checkAlertThresholds(alertRule, telemetry);

    if (shouldAlert.shouldTrigger) {
      const alertText = this.buildAlertText(alertRule, fieldValue, shouldAlert);
      const alertHistory = await this.createOrUpdateAlertHistory(
        alertRule,
        vessel,
        alertText,
        telemetry.timestamp
      );

      return {
        evaluated: true,
        triggered: true,
        alertTriggered: true,
        alertHistory: alertHistory,
        alertText: alertText
      };
    }

    return { evaluated: true, triggered: true, alertTriggered: false };
  }

  /**
   * Check if consecutivity or time-based thresholds are met
   */
  async checkAlertThresholds(alertRule, telemetry) {
    const consecutivityEnabled = alertRule.consecutivity_enabled;
    const timeEnabled = alertRule.time_enabled;

    let consecutivityTriggered = false;
    let timeTriggered = false;

    // Check consecutivity threshold
    if (consecutivityEnabled) {
      const recentEvaluations = await this.getRecentConsecutiveEvaluations(
        alertRule.id,
        telemetry.id,
        alertRule.consecutivity_count
      );

      // Count consecutive triggered evaluations (including current)
      let consecutiveCount = 1; // Current evaluation is triggered
      for (const evaluation of recentEvaluations) {
        if (evaluation.triggered) {
          consecutiveCount++;
        } else {
          break; // Chain broken
        }
      }

      if (consecutiveCount >= alertRule.consecutivity_count) {
        consecutivityTriggered = true;
        console.log(`   📊 Consecutivity threshold met: ${consecutiveCount}/${alertRule.consecutivity_count}`);
      } else {
        console.log(`   📊 Consecutivity: ${consecutiveCount}/${alertRule.consecutivity_count} (not met)`);
      }
    }

    // Check time-based threshold
    if (timeEnabled) {
      const evaluationsInWindow = await this.getEvaluationsInTimeWindow(
        alertRule.id,
        alertRule.time_window_mins
      );

      const triggerCountInWindow = evaluationsInWindow.length + 1; // +1 for current

      if (triggerCountInWindow >= alertRule.time_count) {
        timeTriggered = true;
        console.log(`   ⏱️  Time threshold met: ${triggerCountInWindow}/${alertRule.time_count} in ${alertRule.time_window_mins} mins`);
      } else {
        console.log(`   ⏱️  Time window: ${triggerCountInWindow}/${alertRule.time_count} (not met)`);
      }
    }

    // Alert should trigger if either enabled threshold is met
    const shouldTrigger = (consecutivityEnabled && consecutivityTriggered) ||
                         (timeEnabled && timeTriggered);

    return {
      shouldTrigger,
      consecutivityTriggered,
      timeTriggered
    };
  }

  /**
   * Build alert text message
   */
  buildAlertText(alertRule, fieldValue, thresholdResult) {
    const components = [];

    if (thresholdResult.consecutivityTriggered) {
      components.push('Consecutivity threshold met');
    }

    if (thresholdResult.timeTriggered) {
      components.push('Time threshold met');
    }

    const triggerInfo = components.length > 0 ? ` (${components.join(', ')})` : '';

    return `${alertRule.name}: ${fieldValue} ${alertRule.operator} ${alertRule.threshold}${triggerInfo}`;
  }

  /**
   * Evaluate all pending telemetry (useful for backfilling or manual triggers)
   */
  async evaluateAllPendingTelemetry(vesselId = null) {
    try {
      const where = vesselId ? { vessel_id: parseInt(vesselId) } : {};

      // Get recent telemetry that hasn't been evaluated yet
      const telemetry = await prisma.telemetry.findMany({
        where: where,
        orderBy: { timestamp: 'desc' },
        take: 100,
        include: {
          vessels: true,
          alert_evaluations: true
        }
      });

      console.log(`\n🔄 Evaluating ${telemetry.length} telemetry entries...`);

      const results = [];
      for (const entry of telemetry) {
        const result = await this.evaluateTelemetry(entry.id);
        results.push(result);
      }

      const totalAlerts = results.reduce((sum, r) => sum + (r.alertsTriggered || 0), 0);
      console.log(`✅ Batch evaluation complete: ${totalAlerts} total alerts triggered\n`);

      return {
        success: true,
        entriesEvaluated: telemetry.length,
        totalAlertsTriggered: totalAlerts,
        results: results
      };

    } catch (error) {
      console.error('❌ Error in batch evaluation:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
module.exports = new AlertEvaluator();
