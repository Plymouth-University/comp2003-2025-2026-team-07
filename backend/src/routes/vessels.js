const express = require('express');
const router = express.Router();
const vesselService = require('../services/vesselService');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/vessels - Get all vessels
router.get('/', async (req, res, next) => {
  try {
    const vessels = await vesselService.getAllVessels();
    res.json({ 
      success: true,
      count: vessels.length,
      data: vessels 
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/vessels/:id - Get vessel by ID
router.get('/:id', async (req, res, next) => {
  try {
    const vessel = await vesselService.getVesselById(req.params.id);
    res.json({ 
      success: true,
      data: vessel 
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/vessels/:id/stats - Get vessel statistics
router.get('/:id/stats', async (req, res, next) => {
  try {
    const stats = await vesselService.getVesselStats(req.params.id);
    res.json({ 
      success: true,
      data: stats 
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/vessels - Create new vessel (Admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const vessel = await vesselService.createVessel(req.body);
    res.status(201).json({ 
      success: true,
      message: 'Vessel created successfully',
      data: vessel 
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/vessels/:id - Update vessel (Admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const vessel = await vesselService.updateVessel(req.params.id, req.body);
    res.json({ 
      success: true,
      message: 'Vessel updated successfully',
      data: vessel 
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/vessels/:id - Delete vessel (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    await vesselService.deleteVessel(req.params.id);
    res.json({ 
      success: true,
      message: 'Vessel deleted successfully' 
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;