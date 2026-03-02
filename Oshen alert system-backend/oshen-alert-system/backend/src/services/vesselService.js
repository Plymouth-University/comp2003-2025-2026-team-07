const { prisma } = require('../config/database');

class VesselService {
  // Get all vessels
  async getAllVessels() {
    return await prisma.vessels.findMany({
      include: {
        vessel_message_types: {
          include: {
            message_types: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  // Get vessel by ID
  async getVesselById(id) {
    const vessel = await prisma.vessels.findUnique({
      where: { id: parseInt(id) },
      include: {
        geofences: true,
        alert_rules: {
          include: {
            message_types: true
          }
        },
        vessel_message_types: {
          include: {
            message_types: true
          }
        },
        telemetry: {
          orderBy: { timestamp: 'desc' },
          take: 50
        }
      }
    });

    if (!vessel) {
      const error = new Error('Vessel not found');
      error.statusCode = 404;
      throw error;
    }

    return vessel;
  }

  // Get vessel by IMEI
  async getVesselByImei(imei) {
    return await prisma.vessels.findUnique({
      where: { imei: imei },
      include: {
        geofences: true,
        alert_rules: true
      }
    });
  }

  // Create new vessel
  async createVessel(data) {
    return await prisma.vessels.create({
      data: {
        name: data.name,
        imei: data.imei,
        at_sea_status: data.at_sea_status ?? true,
        emergency_alert_active: false,
        escalation_threshold: data.escalation_threshold || 3,
        repeat_interval_mins: data.repeat_interval_mins || 5
      }
    });
  }

  // Update vessel
  async updateVessel(id, data) {
    return await prisma.vessels.update({
      where: { id: parseInt(id) },
      data: data
    });
  }

  // Delete vessel
  async deleteVessel(id) {
    return await prisma.vessels.delete({
      where: { id: parseInt(id) }
    });
  }

  // Get vessel statistics
  async getVesselStats(id) {
    const vessel = await this.getVesselById(id);
    
    const alertCount = await prisma.alert_history.count({
      where: { vessel_id: parseInt(id) }
    });

    const activeAlerts = await prisma.alert_history.count({
      where: { 
        vessel_id: parseInt(id),
        status: 'active'
      }
    });

    const telemetryCount = await prisma.telemetry.count({
      where: { vessel_id: parseInt(id) }
    });

    return {
      vessel: vessel,
      stats: {
        total_alerts: alertCount,
        active_alerts: activeAlerts,
        telemetry_messages: telemetryCount
      }
    };
  }
}

module.exports = new VesselService();