const { prisma } = require('../config/database');

class AlertService {
  // Get all alert rules
  async getAllAlertRules(filters = {}) {
    const where = {};
    
    if (filters.vessel_id) {
      where.vessel_id = parseInt(filters.vessel_id);
    }
    
    if (filters.enabled !== undefined) {
      where.enabled = filters.enabled === 'true';
    }
    
    if (filters.is_muted !== undefined) {
      where.is_muted = filters.is_muted === 'true';
    }

    return await prisma.alert_rules.findMany({
      where: where,
      include: {
        vessels: {
          select: { id: true, name: true, imei: true }
        },
        message_types: {
          select: { id: true, name: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });
  }

  // Get alert rule by ID
  async getAlertRuleById(id) {
    const alert = await prisma.alert_rules.findUnique({
      where: { id: parseInt(id) },
      include: {
        vessels: true,
        message_types: true
      }
    });

    if (!alert) {
      const error = new Error('Alert rule not found');
      error.statusCode = 404;
      throw error;
    }

    return alert;
  }

  // Create new alert rule
  async createAlertRule(data) {
    return await prisma.alert_rules.create({
      data: {
        vessel_id: parseInt(data.vessel_id),
        message_type_id: parseInt(data.message_type_id),
        name: data.name,
        field_name: data.field_name,
        operator: data.operator,
        threshold: parseFloat(data.threshold),
        consecutivity_enabled: data.consecutivity_enabled ?? true,
        consecutivity_count: data.consecutivity_count || 3,
        time_enabled: data.time_enabled ?? false,
        time_window_mins: data.time_window_mins || 0,
        time_count: data.time_count || 100,
        is_muted: data.is_muted ?? false,
        enabled: data.enabled ?? true
      }
    });
  }

  // Update alert rule
  async updateAlertRule(id, data) {
    return await prisma.alert_rules.update({
      where: { id: parseInt(id) },
      data: data
    });
  }

  // Delete alert rule
  async deleteAlertRule(id) {
    return await prisma.alert_rules.delete({
      where: { id: parseInt(id) }
    });
  }

  // Toggle alert mute status
  async toggleMute(id, isMuted) {
    return await prisma.alert_rules.update({
      where: { id: parseInt(id) },
      data: { 
        is_muted: isMuted,
        updated_at: new Date()
      }
    });
  }

  // Get alert history
  async getAlertHistory(filters = {}) {
    const where = {};
    
    if (filters.vessel_id) {
      where.vessel_id = parseInt(filters.vessel_id);
    }
    
    if (filters.status) {
      where.status = filters.status;
    }
    
    if (filters.from_date) {
      where.first_triggered_at = {  // ← FIXED: was first_triggered
        gte: new Date(filters.from_date)
      };
    }

    return await prisma.alert_history.findMany({
      where: where,
      include: {
        vessels: {
          select: { id: true, name: true, imei: true }
        },
        alert_rules: {
          select: { id: true, name: true, field_name: true }
        }
      },
      orderBy: { first_triggered_at: 'desc' },  // ← FIXED: was first_triggered
      take: filters.limit ? parseInt(filters.limit) : 100
    });
  }

  // Get active alerts
  async getActiveAlerts(vesselId = null) {
    const where = { status: 'active' };
    
    if (vesselId) {
      where.vessel_id = parseInt(vesselId);
    }

    return await prisma.alert_history.findMany({
      where: where,
      include: {
        vessels: {
          select: { id: true, name: true, imei: true }
        },
        alert_rules: {
          select: { id: true, name: true, field_name: true, operator: true, threshold: true }
        }
      },
      orderBy: { first_triggered_at: 'desc' }  // ← FIXED: was first_triggered
    });
  }

  // Acknowledge alert
  async acknowledgeAlert(id, userId) {
    const alert = await prisma.alert_history.findUnique({
      where: { id: parseInt(id) }
    });

    if (!alert) {
      const error = new Error('Alert not found');
      error.statusCode = 404;
      throw error;
    }

    return await prisma.alert_history.update({
      where: { id: parseInt(id) },
      data: {
        status: 'acknowledged',
        acknowledged_at: new Date(),
        acknowledged_by: userId
      }
    });
  }

  // Resolve alert
  async resolveAlert(id, userId) {
    const alert = await prisma.alert_history.findUnique({
      where: { id: parseInt(id) }
    });

    if (!alert) {
      const error = new Error('Alert not found');
      error.statusCode = 404;
      throw error;
    }

    return await prisma.alert_history.update({
      where: { id: parseInt(id) },
      data: {
        status: 'resolved',
        resolved_at: new Date(),
        resolved_by : userId 
      
      }
    });
  }

  // Get alert statistics
  async getAlertStats(vesselId = null) {
    const where = vesselId ? { vessel_id: parseInt(vesselId) } : {};

    const total = await prisma.alert_history.count({ where });
    const active = await prisma.alert_history.count({ 
      where: { ...where, status: 'active' } 
    });
    const acknowledged = await prisma.alert_history.count({ 
      where: { ...where, status: 'acknowledged' } 
    });
    const resolved = await prisma.alert_history.count({ 
      where: { ...where, status: 'resolved' } 
    });

    return {
      total,
      active,
      acknowledged,
      resolved
    };
  }
}

module.exports = new AlertService();