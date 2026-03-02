const express = require('express');
const router = express.Router();
const geofenceService = require('../services/geofenceService');
const { authenticateToken, requireAdmin, requireSupervisor } = require('../middleware/auth');

// GET /api/geofences - Get all geofences
router.get('/', async (req, res, next) => {
  try {
    const geofences = await geofenceService.getAllGeofences(req.query);
    res.json({ 
      success: true,
      count: geofences.length,
      data: geofences 
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/geofences/:id - Get geofence by ID
router.get('/:id', async (req, res, next) => {
  try {
    const geofence = await geofenceService.getGeofenceById(req.params.id);
    res.json({ 
      success: true,
      data: geofence 
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/geofences/vessel/:vesselId - Get all geofences for a vessel
router.get('/vessel/:vesselId', async (req, res, next) => {
  try {
    const geofences = await geofenceService.getGeofencesByVessel(req.params.vesselId);
    res.json({ 
      success: true,
      count: geofences.length,
      data: geofences 
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/geofences - Create new geofence (Admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const geofence = await geofenceService.createGeofence(req.body);
    res.status(201).json({ 
      success: true,
      message: 'Geofence created successfully',
      data: geofence 
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/geofences/:id - Update geofence (Admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const geofence = await geofenceService.updateGeofence(req.params.id, req.body);
    res.json({ 
      success: true,
      message: 'Geofence updated successfully',
      data: geofence 
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/geofences/:id - Delete geofence (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    await geofenceService.deleteGeofence(req.params.id);
    res.json({ 
      success: true,
      message: 'Geofence deleted successfully' 
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/geofences/:id/mute - Toggle geofence mute (Supervisor or Admin)
router.patch('/:id/mute', authenticateToken, requireSupervisor, async (req, res, next) => {
  try {
    const { is_muted } = req.body;
    const geofence = await geofenceService.toggleMute(req.params.id, is_muted);
    res.json({ 
      success: true,
      message: is_muted ? 'Geofence muted' : 'Geofence unmuted',
      data: geofence 
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/geofences/evaluate - Evaluate position against geofences
router.post('/evaluate', async (req, res, next) => {
  try {
    const { vessel_id, latitude, longitude } = req.body;
    
    if (!vessel_id || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'vessel_id, latitude, and longitude are required'
      });
    }

    const violations = await geofenceService.evaluateGeofences(
      vessel_id, 
      { latitude, longitude }
    );
    
    res.json({ 
      success: true,
      has_violations: violations.length > 0,
      violations: violations 
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
