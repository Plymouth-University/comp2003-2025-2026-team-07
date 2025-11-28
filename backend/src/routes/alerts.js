const express = require('express');
const router = express.Router();
const alertService = require('../services/alertService');
const { authenticateToken, requireAdmin, requireSupervisor } = require('../middleware/auth');

// GET /api/alerts/rules - Get all alert rules
router.get('/rules', async (req, res, next) => {
  try {
    const alerts = await alertService.getAllAlertRules(req.query);
    res.json({ 
      success: true,
      count: alerts.length,
      data: alerts 
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/alerts/rules/:id - Get alert rule by ID
router.get('/rules/:id', async (req, res, next) => {
  try {
    const alert = await alertService.getAlertRuleById(req.params.id);
    res.json({ 
      success: true,
      data: alert 
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/alerts/rules - Create new alert rule (Admin only)
router.post('/rules', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const alert = await alertService.createAlertRule(req.body);
    res.status(201).json({ 
      success: true,
      message: 'Alert rule created successfully',
      data: alert 
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/alerts/rules/:id - Update alert rule (Admin only)
router.put('/rules/:id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const alert = await alertService.updateAlertRule(req.params.id, req.body);
    res.json({ 
      success: true,
      message: 'Alert rule updated successfully',
      data: alert 
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/alerts/rules/:id - Delete alert rule (Admin only)
router.delete('/rules/:id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    await alertService.deleteAlertRule(req.params.id);
    res.json({ 
      success: true,
      message: 'Alert rule deleted successfully' 
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/alerts/rules/:id/mute - Toggle alert mute (Supervisor or Admin)
router.patch('/rules/:id/mute', authenticateToken, requireSupervisor, async (req, res, next) => {
  try {
    const { is_muted } = req.body;
    const alert = await alertService.toggleMute(req.params.id, is_muted);
    res.json({ 
      success: true,
      message: is_muted ? 'Alert muted' : 'Alert unmuted',
      data: alert 
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/alerts/history - Get alert history
router.get('/history', async (req, res, next) => {
  try {
    const history = await alertService.getAlertHistory(req.query);
    res.json({ 
      success: true,
      count: history.length,
      data: history 
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/alerts/active - Get active alerts
router.get('/active', async (req, res, next) => {
  try {
    const { vessel_id } = req.query;
    const alerts = await alertService.getActiveAlerts(vessel_id);
    res.json({ 
      success: true,
      count: alerts.length,
      data: alerts 
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/alerts/:id/acknowledge - Acknowledge alert (Supervisor or Admin)
router.post('/:id/acknowledge', authenticateToken, requireSupervisor, async (req, res, next) => {
  try {
    const alert = await alertService.acknowledgeAlert(req.params.id, req.user.id);
    res.json({ 
      success: true,
      message: 'Alert acknowledged',
      data: alert 
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/alerts/:id/resolve - Resolve alert (Supervisor or Admin)
router.post('/:id/resolve', authenticateToken, requireSupervisor, async (req, res, next) => {
  try {
    const alert = await alertService.resolveAlert(req.params.id, req.user.id);
    res.json({ 
      success: true,
      message: 'Alert resolved',
      data: alert 
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/alerts/stats - Get alert statistics
router.get('/stats', async (req, res, next) => {
  try {
    const { vessel_id } = req.query;
    const stats = await alertService.getAlertStats(vessel_id);
    res.json({ 
      success: true,
      data: stats 
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
