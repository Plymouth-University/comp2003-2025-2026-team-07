const { prisma } = require('../config/database');

class GeofenceService {
  // Get all geofences
  async getAllGeofences(filters = {}) {
    const where = {};
    
    if (filters.vessel_id) {
      where.vessel_id = parseInt(filters.vessel_id);
    }
    
    if (filters.geofence_type) {
      where.geofence_type = filters.geofence_type;
    }
    
    if (filters.is_muted !== undefined) {
      where.is_muted = filters.is_muted === 'true';
    }

    return await prisma.geofences.findMany({
      where: where,
      include: {
        vessels: {
          select: { id: true, name: true, imei: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });
  }

  // Get geofence by ID
  async getGeofenceById(id) {
    const geofence = await prisma.geofences.findUnique({
      where: { id: parseInt(id) },
      include: {
        vessels: true
      }
    });

    if (!geofence) {
      const error = new Error('Geofence not found');
      error.statusCode = 404;
      throw error;
    }

    return geofence;
  }

  // Get geofences by vessel
  async getGeofencesByVessel(vesselId) {
    return await prisma.geofences.findMany({
      where: { vessel_id: parseInt(vesselId) },
      orderBy: { geofence_type: 'asc' }
    });
  }

  // Create new geofence
  async createGeofence(data) {
    return await prisma.geofences.create({
      data: {
        vessel_id: parseInt(data.vessel_id),
        geofence_type: data.geofence_type,
        geometry: data.geometry, // JSONB
        is_muted: data.is_muted ?? false
      }
    });
  }

  // Update geofence
  async updateGeofence(id, data) {
    return await prisma.geofences.update({
      where: { id: parseInt(id) },
      data: data
    });
  }

  // Delete geofence
  async deleteGeofence(id) {
    return await prisma.geofences.delete({
      where: { id: parseInt(id) }
    });
  }

  // Toggle geofence mute status
  async toggleMute(id, isMuted) {
    return await prisma.geofences.update({
      where: { id: parseInt(id) },
      data: { 
        is_muted: isMuted,
        updated_at: new Date()
      }
    });
  }

  // Check if point is inside geofence (basic implementation)
  // For production, use PostGIS or specialized geospatial library
  checkPointInPolygon(point, polygon) {
    const [lat, lon] = point;
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [lat1, lon1] = polygon[i];
      const [lat2, lon2] = polygon[j];

      const intersect = ((lon1 > lon) !== (lon2 > lon)) &&
        (lat < (lat2 - lat1) * (lon - lon1) / (lon2 - lon1) + lat1);
      
      if (intersect) inside = !inside;
    }

    return inside;
  }

  // Check if point is within radius of a point
  checkPointInRadius(point1, point2, radiusMeters) {
    const [lat1, lon1] = point1;
    const [lat2, lon2] = point2;

    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance <= radiusMeters;
  }

  // Evaluate if vessel position violates geofences
  async evaluateGeofences(vesselId, position) {
    const geofences = await this.getGeofencesByVessel(vesselId);
    const violations = [];

    for (const geofence of geofences) {
      if (geofence.is_muted) continue;

      const { geofence_type, geometry } = geofence;
      const point = [position.latitude, position.longitude];

      if (geofence_type === 'keep_in') {
        // Check if point is OUTSIDE the polygon
        const polygon = geometry.coordinates[0];
        if (!this.checkPointInPolygon(point, polygon)) {
          violations.push({
            geofence_id: geofence.id,
            type: 'keep_in',
            message: 'Vessel outside keep-in zone'
          });
        }
      }

      if (geofence_type === 'keep_out_zone') {
        // Check if point is INSIDE the polygon
        const polygon = geometry.coordinates[0];
        if (this.checkPointInPolygon(point, polygon)) {
          violations.push({
            geofence_id: geofence.id,
            type: 'keep_out_zone',
            message: `Vessel inside keep-out zone: ${geometry.name || 'Unnamed'}`
          });
        }
      }

      if (geofence_type === 'keep_out_point') {
        // Check if point is within radius
        const centerPoint = geometry.coordinates;
        const radius = geometry.radius_meters;
        if (this.checkPointInRadius(point, centerPoint, radius)) {
          violations.push({
            geofence_id: geofence.id,
            type: 'keep_out_point',
            message: `Vessel too close to keep-out point: ${geometry.name || 'Unnamed'}`
          });
        }
      }
    }

    return violations;
  }
}

module.exports = new GeofenceService();
