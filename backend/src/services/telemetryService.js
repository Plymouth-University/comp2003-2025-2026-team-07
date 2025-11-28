const { prisma } = require('../config/database');

class TelemetryService {
  // Get telemetry data with filters
  async getTelemetry(filters = {}) {
    const where = {};
    
    if (filters.vessel_id) {
      where.vessel_id = parseInt(filters.vessel_id);
    }
    
    if (filters.from_date) {
      where.timestamp = {
        gte: new Date(filters.from_date)
      };
    }
    
    if (filters.to_date) {
      where.timestamp = {
        ...where.timestamp,
        lte: new Date(filters.to_date)
      };
    }

    const limit = filters.limit ? parseInt(filters.limit) : 100;

    return await prisma.telemetry.findMany({
      where: where,
      include: {
        vessels: {
          select: { id: true, name: true, imei: true }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: limit
    });
  }

  // Get telemetry by ID
  async getTelemetryById(id) {
    const telemetry = await prisma.telemetry.findUnique({
      where: { id: parseInt(id) },
      include: {
        vessels: true
      }
    });

    if (!telemetry) {
      const error = new Error('Telemetry data not found');
      error.statusCode = 404;
      throw error;
    }

    return telemetry;
  }

  // Get latest telemetry for a vessel
  async getLatestTelemetry(vesselId) {
    return await prisma.telemetry.findFirst({
      where: { vessel_id: parseInt(vesselId) },
      orderBy: { timestamp: 'desc' }
    });
  }

  // Create new telemetry entry
  async createTelemetry(data) {
    // Validate required fields
    if (!data.vessel_id || !data.latitude || !data.longitude || !data.timestamp) {
      const error = new Error('vessel_id, latitude, longitude, and timestamp are required');
      error.statusCode = 400;
      throw error;
    }

    // Parse timestamp and ensure received_at is always >= timestamp
    const telemetryTimestamp = new Date(data.timestamp);
    const receivedAt = new Date();
    
    // If timestamp is in the future (due to clock skew), use timestamp as received_at
    const finalReceivedAt = telemetryTimestamp > receivedAt ? telemetryTimestamp : receivedAt;

    const telemetry = await prisma.telemetry.create({
      data: {
        vessel_id: parseInt(data.vessel_id),
        message_type_id: parseInt(data.message_type_id || 1), // Default to message type 1 if not provided
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude),
        timestamp: telemetryTimestamp,
        data: data.data || {}, // Additional telemetry data (JSONB)
        received_at: finalReceivedAt
      }
    });

    // Update vessel's latest position
    await prisma.vessels.update({
      where: { id: parseInt(data.vessel_id) },
      data: {
        latest_position: {
          latitude: parseFloat(data.latitude),
          longitude: parseFloat(data.longitude),
          timestamp: telemetryTimestamp
        },
        last_check_in_at: finalReceivedAt
      }
    });

    return telemetry;
  }

  // Bulk create telemetry entries
  async createBulkTelemetry(dataArray) {
    const results = {
      success: [],
      failed: []
    };

    for (const data of dataArray) {
      try {
        const telemetry = await this.createTelemetry(data);
        results.success.push(telemetry);
      } catch (error) {
        results.failed.push({
          data: data,
          error: error.message
        });
      }
    }

    return results;
  }

  // Get telemetry statistics for a vessel
  async getTelemetryStats(vesselId, hours = 24) {
    const fromDate = new Date();
    fromDate.setHours(fromDate.getHours() - hours);

    const telemetryData = await prisma.telemetry.findMany({
      where: {
        vessel_id: parseInt(vesselId),
        timestamp: { gte: fromDate }
      },
      orderBy: { timestamp: 'asc' }
    });

    if (telemetryData.length === 0) {
      return {
        vessel_id: parseInt(vesselId),
        period_hours: hours,
        message_count: 0,
        average_interval_mins: null,
        latest_message: null
      };
    }

    // Calculate average interval between messages
    let totalInterval = 0;
    for (let i = 1; i < telemetryData.length; i++) {
      const interval = (telemetryData[i].timestamp - telemetryData[i - 1].timestamp) / 60000; // minutes
      totalInterval += interval;
    }
    const avgInterval = telemetryData.length > 1 
      ? totalInterval / (telemetryData.length - 1) 
      : null;

    return {
      vessel_id: parseInt(vesselId),
      period_hours: hours,
      message_count: telemetryData.length,
      average_interval_mins: avgInterval ? avgInterval.toFixed(2) : null,
      latest_message: telemetryData[telemetryData.length - 1].timestamp,
      first_message: telemetryData[0].timestamp
    };
  }

  // Delete old telemetry data (cleanup)
  async deleteOldTelemetry(daysToKeep = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await prisma.telemetry.deleteMany({
      where: {
        timestamp: { lt: cutoffDate }
      }
    });

    return {
      deleted_count: result.count,
      cutoff_date: cutoffDate
    };
  }
}

module.exports = new TelemetryService();