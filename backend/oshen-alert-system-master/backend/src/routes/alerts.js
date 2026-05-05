const express = require('express');
const router = express.Router();
const alertService = require('../services/alertService');
const compoundAlertService = require('../services/compoundAlertService');
const { authenticateToken, requireAdmin, requireSupervisor } = require('../middleware/auth');
const { prisma } = require('../config/database');
const pagemService = require('../services/pagemService');

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

// PATCH /api/alerts/rules/:id/enabled - Toggle alert enabled/disabled (Admin only)
router.patch('/rules/:id/enabled', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ success: false, error: 'enabled must be a boolean' });
    }
    const alert = await alertService.updateAlertRule(req.params.id, { enabled });
    res.json({
      success: true,
      message: enabled ? 'Alert rule enabled' : 'Alert rule disabled',
      data: alert
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

// ─── Compound Alert Rules ────────────────────────────────────────────────────

// GET /api/alerts/compound-rules
router.get('/compound-rules', async (req, res, next) => {
  try {
    const rules = await compoundAlertService.getAllCompoundRules(req.query);
    res.json({ success: true, count: rules.length, data: rules });
  } catch (error) {
    next(error);
  }
});

// GET /api/alerts/compound-rules/:id
router.get('/compound-rules/:id', async (req, res, next) => {
  try {
    const rule = await compoundAlertService.getCompoundRuleById(req.params.id);
    res.json({ success: true, data: rule });
  } catch (error) {
    next(error);
  }
});

// POST /api/alerts/compound-rules (Admin only)
router.post('/compound-rules', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const rule = await compoundAlertService.createCompoundRule(req.body);
    res.status(201).json({
      success: true,
      message: 'Compound alert rule created successfully',
      data: rule
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/alerts/compound-rules/:id (Admin only)
router.put('/compound-rules/:id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const rule = await compoundAlertService.updateCompoundRule(req.params.id, req.body);
    res.json({ success: true, message: 'Compound alert rule updated successfully', data: rule });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/alerts/compound-rules/:id (Admin only)
router.delete('/compound-rules/:id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    await compoundAlertService.deleteCompoundRule(req.params.id);
    res.json({ success: true, message: 'Compound alert rule deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/alerts/compound-rules/:id/mute (Supervisor or Admin)
router.patch('/compound-rules/:id/mute', authenticateToken, requireSupervisor, async (req, res, next) => {
  try {
    const { is_muted, unmute_date } = req.body;
    const rule = await compoundAlertService.toggleMute(req.params.id, is_muted, unmute_date);
    res.json({
      success: true,
      message: is_muted ? 'Compound rule muted' : 'Compound rule unmuted',
      data: rule
    });
  } catch (error) {
    next(error);
  }
});

// ─── Compound Alert History ──────────────────────────────────────────────────

// GET /api/alerts/compound-history
router.get('/compound-history', async (req, res, next) => {
  try {
    const history = await compoundAlertService.getCompoundHistory(req.query);
    res.json({ success: true, count: history.length, data: history });
  } catch (error) {
    next(error);
  }
});

// GET /api/alerts/compound-active
router.get('/compound-active', async (req, res, next) => {
  try {
    const { vessel_id } = req.query;
    const alerts = await compoundAlertService.getActiveCompoundAlerts(vessel_id);
    res.json({ success: true, count: alerts.length, data: alerts });
  } catch (error) {
    next(error);
  }
});

// POST /api/alerts/compound/:id/acknowledge (Supervisor or Admin)
router.post('/compound/:id/acknowledge', authenticateToken, requireSupervisor, async (req, res, next) => {
  try {
    const alert = await compoundAlertService.acknowledgeCompoundAlert(req.params.id, req.user.id);
    res.json({ success: true, message: 'Compound alert acknowledged', data: alert });
  } catch (error) {
    next(error);
  }
});

// POST /api/alerts/compound/:id/resolve (Supervisor or Admin)
router.post('/compound/:id/resolve', authenticateToken, requireSupervisor, async (req, res, next) => {
  try {
    const alert = await compoundAlertService.resolveCompoundAlert(req.params.id, req.user.id);
    res.json({ success: true, message: 'Compound alert resolved', data: alert });
  } catch (error) {
    next(error);
  }
});

// POST /api/alerts/trigger-test - Trigger a real test alert for a vessel (Admin only)
// Creates an alert_history row and pages the vessel's supervisors exactly as a live alert would.
// Use this to demonstrate end-to-end functionality without waiting for real telemetry.
router.post('/trigger-test', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { vessel_id, message: customMessage } = req.body;

    if (!vessel_id) {
      return res.status(400).json({ success: false, error: 'vessel_id is required' });
    }

    const vessel = await prisma.vessels.findUnique({
      where: { id: parseInt(vessel_id) },
      select: { id: true, name: true }
    });

    if (!vessel) {
      return res.status(404).json({ success: false, error: 'Vessel not found' });
    }

    const alertText = customMessage
      ? `TEST ALERT: ${vessel.name} – ${customMessage}`
      : `TEST ALERT: ${vessel.name} – manual test triggered by admin at ${new Date().toISOString()}`;

    const now = new Date();

    // Create a real alert_history row so it appears in the alert feed
    const alert = await prisma.alert_history.create({
      data: {
        vessel_id: vessel.id,
        alert_rule_id: null,
        alert_text: alertText,
        first_triggered_at: now,
        last_triggered_at: now,
        repeat_count: 0,
        status: 'active'
      }
    });

    // Page vessel supervisors using the exact same code path as a live alert
    const pageResults = await pagemService.notifyVesselSupervisors(
      vessel.id,
      alertText,
      { alertId: alert.id, alertType: 'test' }
    );

    // Mark pagem_sent on the alert row if at least one page went out
    const anySuccess = pageResults.some(r => r.result?.success);
    if (anySuccess) {
      await prisma.alert_history.update({
        where: { id: alert.id },
        data: { pagem_sent: true, pagem_sent_at: now }
      });
    }

    res.json({
      success: true,
      data: {
        alertId: alert.id,
        vesselName: vessel.name,
        message: alertText,
        pagesDispatched: pageResults.map(r => ({
          supervisor: r.supervisor,
          pageeId: r.pageeId,
          success: r.result?.success ?? false,
          eventId: r.result?.eventId || null,
          error: r.result?.success ? undefined : (r.result?.errorMessage || r.result?.reason || 'failed')
        }))
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
