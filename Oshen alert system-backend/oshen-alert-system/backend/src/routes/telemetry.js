const express = require('express');
const router = express.Router();
const telemetryService = require('../services/telemetryService');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/telemetry - Get telemetry data with filters
router.get('/', async (req, res, next) => {
  try {
    const telemetry = await telemetryService.getTelemetry(req.query);
    res.json({ 
      success: true,
      count: telemetry.length,
      data: telemetry 
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/telemetry/:id - Get specific telemetry entry
router.get('/:id', async (req, res, next) => {
  try {
    const telemetry = await telemetryService.getTelemetryById(req.params.id);
    res.json({ 
      success: true,
      data: telemetry 
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/telemetry/vessel/:vesselId/latest - Get latest telemetry for vessel
router.get('/vessel/:vesselId/latest', async (req, res, next) => {
  try {
    const telemetry = await telemetryService.getLatestTelemetry(req.params.vesselId);
    
    if (!telemetry) {
      return res.status(404).json({
        success: false,
        message: 'No telemetry data found for this vessel'
      });
    }

    res.json({ 
      success: true,
      data: telemetry 
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/telemetry/vessel/:vesselId/stats - Get telemetry statistics
router.get('/vessel/:vesselId/stats', async (req, res, next) => {
  try {
    const hours = req.query.hours ? parseInt(req.query.hours) : 24;
    const stats = await telemetryService.getTelemetryStats(req.params.vesselId, hours);
    res.json({ 
      success: true,
      data: stats 
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/telemetry - Create new telemetry entry
// This endpoint would typically be called by the Oshen data ingestion service
router.post('/', async (req, res, next) => {
  try {
    const telemetry = await telemetryService.createTelemetry(req.body);
    res.status(201).json({ 
      success: true,
      message: 'Telemetry data received',
      data: telemetry 
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/telemetry/bulk - Create multiple telemetry entries
router.post('/bulk', async (req, res, next) => {
  try {
    if (!Array.isArray(req.body)) {
      return res.status(400).json({
        success: false,
        error: 'Request body must be an array of telemetry data'
      });
    }

    const results = await telemetryService.createBulkTelemetry(req.body);
    
    res.status(201).json({ 
      success: true,
      message: 'Bulk telemetry processed',
      results: {
        success_count: results.success.length,
        failed_count: results.failed.length,
        successes: results.success,
        failures: results.failed
      }
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/telemetry/cleanup - Delete old telemetry data (Admin only)
router.delete('/cleanup', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const days = req.query.days ? parseInt(req.query.days) : 90;
    const result = await telemetryService.deleteOldTelemetry(days);
    
    res.json({ 
      success: true,
      message: `Deleted telemetry data older than ${days} days`,
      data: result 
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
