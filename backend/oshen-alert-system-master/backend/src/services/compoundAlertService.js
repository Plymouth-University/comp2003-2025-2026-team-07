const { prisma } = require('../config/database');
const pagemService = require('./pagemService');

/**
 * Compound Alert Service
 *
 * Manages compound alert rules (meta-alerts) that fire when N individual
 * alert rules have been triggered within a given time window for a vessel.
 *
 * Example: "If 5 different alerts have fired in the last 60 minutes, escalate."
 */
class CompoundAlertService {
  /**
   * Check if a compound rule is currently muted
   */
  isMuted(rule) {
    if (!rule.is_muted) return false;
    if (!rule.unmute_date) return rule.is_muted;
    return new Date() < new Date(rule.unmute_date);
  }

  /**
   * Evaluate all enabled compound rules for a vessel.
   * Called after every telemetry evaluation cycle.
   */
  async evaluateCompoundRules(vesselId) {
    const rules = await prisma.compound_alert_rules.findMany({
      where: { vessel_id: vesselId, enabled: true }
    });

    if (rules.length === 0) return [];

    const results = [];
    for (const rule of rules) {
      if (this.isMuted(rule)) {
        console.log(`🔇 Compound rule "${rule.name}" is muted, skipping`);
        continue;
      }
      const result = await this.evaluateCompoundRule(rule, vesselId);
      results.push(result);
    }
    return results;
  }

  /**
   * Evaluate a single compound rule.
   * Counts distinct alert_rule_ids that have active/acknowledged history
   * entries with first_triggered_at within the time window.
   */
  async evaluateCompoundRule(rule, vesselId) {
    const windowStart = new Date(Date.now() - rule.time_window_mins * 60 * 1000);

    // Count distinct individual alert rules that have fired within the window
    const activeAlertGroups = await prisma.alert_history.groupBy({
      by: ['alert_rule_id'],
      where: {
        vessel_id: vesselId,
        status: { in: ['active', 'acknowledged'] },
        first_triggered_at: { gte: windowStart },
        alert_rule_id: { not: null }
      }
    });

    const distinctCount = activeAlertGroups.length;

    console.log(`   🔗 Compound rule "${rule.name}": ${distinctCount}/${rule.threshold_count} distinct alerts in ${rule.time_window_mins} min window`);

    if (distinctCount >= rule.threshold_count) {
      const historyEntry = await this.createOrUpdateCompoundHistory(rule, vesselId, distinctCount);
      return { ruleId: rule.id, ruleName: rule.name, triggered: true, distinctCount, historyEntry };
    }

    return { ruleId: rule.id, ruleName: rule.name, triggered: false, distinctCount };
  }

  /**
   * Create a new compound alert history entry, or update the repeat count
   * if one is already active for this rule+vessel.
   */
  async createOrUpdateCompoundHistory(rule, vesselId, triggeredCount) {
    const existing = await prisma.compound_alert_history.findFirst({
      where: {
        vessel_id: vesselId,
        compound_rule_id: rule.id,
        status: 'active'
      }
    });

    const alertText = `${rule.name}: ${triggeredCount} alerts triggered within ${rule.time_window_mins} minute window (threshold: ${rule.threshold_count})`;

    if (existing) {
      const updated = await prisma.compound_alert_history.update({
        where: { id: existing.id },
        data: {
          last_triggered_at: new Date(),
          repeat_count: existing.repeat_count + 1,
          triggered_alert_count: triggeredCount
        }
      });
      console.log(`🔄 Updated compound alert #${updated.id}: ${alertText} (Repeat #${updated.repeat_count})`);
      return updated;
    }

    const created = await prisma.compound_alert_history.create({
      data: {
        vessel_id: vesselId,
        compound_rule_id: rule.id,
        alert_text: alertText,
        triggered_alert_count: triggeredCount,
        first_triggered_at: new Date(),
        last_triggered_at: new Date(),
        repeat_count: 0,
        status: 'active',
        pagem_sent: false
      }
    });
    console.log(`🚨 NEW COMPOUND ALERT #${created.id}: ${alertText}`);

    // Notify vessel supervisors via Pagem (fire-and-forget)
    pagemService.notifyVesselSupervisors(vesselId, alertText)
      .then(async (results) => {
        const anySent = results.some(r => r.result?.success);
        if (anySent) {
          await prisma.compound_alert_history.update({
            where: { id: created.id },
            data: { pagem_sent: true, pagem_sent_at: new Date() }
          });
        }
      })
      .catch(err => console.error(`❌ Pagem notification error for compound alert #${created.id}:`, err.message));

    return created;
  }

  // ─── CRUD: Rules ────────────────────────────────────────────────────────────

  async getAllCompoundRules(filters = {}) {
    const where = {};
    if (filters.vessel_id) where.vessel_id = parseInt(filters.vessel_id);
    if (filters.enabled !== undefined) where.enabled = filters.enabled === 'true';

    return await prisma.compound_alert_rules.findMany({
      where,
      include: {
        vessels: { select: { id: true, name: true, imei: true } }
      },
      orderBy: { created_at: 'desc' }
    });
  }

  async getCompoundRuleById(id) {
    const rule = await prisma.compound_alert_rules.findUnique({
      where: { id: parseInt(id) },
      include: {
        vessels: { select: { id: true, name: true, imei: true } }
      }
    });
    if (!rule) {
      const err = new Error('Compound alert rule not found');
      err.statusCode = 404;
      throw err;
    }
    return rule;
  }

  async createCompoundRule(data) {
    if (!data.vessel_id || !data.name || !data.threshold_count || !data.time_window_mins) {
      const err = new Error('vessel_id, name, threshold_count and time_window_mins are required');
      err.statusCode = 400;
      throw err;
    }
    return await prisma.compound_alert_rules.create({
      data: {
        vessel_id: parseInt(data.vessel_id),
        name: data.name,
        description: data.description || null,
        threshold_count: parseInt(data.threshold_count),
        time_window_mins: parseInt(data.time_window_mins),
        enabled: data.enabled ?? true,
        is_muted: data.is_muted ?? false,
        unmute_date: data.unmute_date ? new Date(data.unmute_date) : null
      }
    });
  }

  async updateCompoundRule(id, data) {
    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.threshold_count !== undefined) updateData.threshold_count = parseInt(data.threshold_count);
    if (data.time_window_mins !== undefined) updateData.time_window_mins = parseInt(data.time_window_mins);
    if (data.enabled !== undefined) updateData.enabled = data.enabled;
    if (data.is_muted !== undefined) updateData.is_muted = data.is_muted;
    if (data.unmute_date !== undefined) updateData.unmute_date = data.unmute_date ? new Date(data.unmute_date) : null;
    updateData.updated_at = new Date();

    return await prisma.compound_alert_rules.update({
      where: { id: parseInt(id) },
      data: updateData
    });
  }

  async deleteCompoundRule(id) {
    return await prisma.compound_alert_rules.delete({
      where: { id: parseInt(id) }
    });
  }

  async toggleMute(id, isMuted, unmuteDate = null) {
    return await prisma.compound_alert_rules.update({
      where: { id: parseInt(id) },
      data: {
        is_muted: isMuted,
        unmute_date: unmuteDate ? new Date(unmuteDate) : null,
        updated_at: new Date()
      }
    });
  }

  // ─── CRUD: History ───────────────────────────────────────────────────────────

  async getCompoundHistory(filters = {}) {
    const where = {};
    if (filters.vessel_id) where.vessel_id = parseInt(filters.vessel_id);
    if (filters.status) where.status = filters.status;
    if (filters.from_date) where.first_triggered_at = { gte: new Date(filters.from_date) };

    return await prisma.compound_alert_history.findMany({
      where,
      include: {
        vessels: { select: { id: true, name: true, imei: true } },
        compound_alert_rules: { select: { id: true, name: true, threshold_count: true, time_window_mins: true } }
      },
      orderBy: { first_triggered_at: 'desc' },
      take: filters.limit ? parseInt(filters.limit) : 100
    });
  }

  async getActiveCompoundAlerts(vesselId = null) {
    const where = { status: 'active' };
    if (vesselId) where.vessel_id = parseInt(vesselId);

    return await prisma.compound_alert_history.findMany({
      where,
      include: {
        vessels: { select: { id: true, name: true, imei: true } },
        compound_alert_rules: { select: { id: true, name: true, threshold_count: true, time_window_mins: true } }
      },
      orderBy: { first_triggered_at: 'desc' }
    });
  }

  async acknowledgeCompoundAlert(id, userId) {
    const alert = await prisma.compound_alert_history.findUnique({ where: { id: parseInt(id) } });
    if (!alert) {
      const err = new Error('Compound alert not found');
      err.statusCode = 404;
      throw err;
    }
    return await prisma.compound_alert_history.update({
      where: { id: parseInt(id) },
      data: {
        status: 'acknowledged',
        acknowledged_at: new Date(),
        acknowledged_by: userId
      }
    });
  }

  async resolveCompoundAlert(id, userId) {
    const alert = await prisma.compound_alert_history.findUnique({ where: { id: parseInt(id) } });
    if (!alert) {
      const err = new Error('Compound alert not found');
      err.statusCode = 404;
      throw err;
    }
    return await prisma.compound_alert_history.update({
      where: { id: parseInt(id) },
      data: {
        status: 'resolved',
        resolved_at: new Date(),
        resolved_by: userId
      }
    });
  }
}

module.exports = new CompoundAlertService();