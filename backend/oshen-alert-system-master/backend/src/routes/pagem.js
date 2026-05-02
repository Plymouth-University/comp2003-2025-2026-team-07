const express = require('express');
const router = express.Router();
const pagemService = require('../services/pagemService');
const { prisma } = require('../config/database');
const { authenticateToken, requireAdmin, requireSupervisor } = require('../middleware/auth');

// GET /api/pagem/status - Check if Pagem is configured and key is valid (Admin)
// Response shape: { success, data: { status: 'connected'|'disabled'|'error' }, message }
// Frontend PagemStatusPanel reads data.status to determine which indicator to show.
router.get('/status', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    if (!pagemService.enabled) {
      return res.json({
        success: true,
        data: { status: 'disabled' },
        message: 'PAGEM_API_KEY not configured - paging is disabled'
      });
    }

    const result = await pagemService.testApiKey();

    if (result.success) {
      return res.json({
        success: true,
        data: { status: 'connected' },
        message: result.message || 'API key valid'
      });
    }

    res.json({
      success: false,
      data: { status: 'error' },
      message: result.message || 'Pagem rejected the API key'
    });
  } catch (error) {
    res.json({
      success: false,
      data: { status: 'error' },
      message: error.message
    });
  }
});

// GET /api/pagem/api-key - Get masked API key info (Admin only)
// Returns the masked key (never the real one) + metadata about where it came from.
// The actual key is NEVER returned to the frontend.
router.get('/api-key', authenticateToken, requireAdmin, async (_req, res, next) => {
  try {
    const info = await pagemService.getKeyInfo();
    res.json({ success: true, data: info });
  } catch (error) {
    next(error);
  }
});

// PUT /api/pagem/api-key - Save or update the Pagem API key (Admin only)
// Body: { api_key: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" }
// The key is encrypted with AES-256-GCM before being stored in the database.
// The response includes only the masked key - the real value is never echoed back.
router.put('/api-key', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { api_key } = req.body;

    if (!api_key || typeof api_key !== 'string' || api_key.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'api_key is required' });
    }

    const trimmed = api_key.trim();

    // Basic format guard: UUID v4 pattern (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(trimmed)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid API key format. Expected a UUID such as xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
      });
    }

    // Save key (encrypted) to DB and hot-reload the service
    await pagemService.saveKey(trimmed);

    // Immediately validate the new key against Pagem
    let status = 'connected';
    let message = 'API key saved and validated';
    try {
      await pagemService.testApiKey(); // validate immediately; throws on failure
    } catch (err) {
      status = 'error';
      message = `Key saved but validation failed: ${err.message}`;
    }

    const info = await pagemService.getKeyInfo();

    res.json({
      success: true,
      message,
      data: { status, ...info }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/pagem/test-page - Send a test page to yourself (any authenticated user)
router.post('/test-page', authenticateToken, async (req, res, next) => {
  try {
    const { pager_id } = req.body;

    // Allow overriding pagee ID in body (admin); otherwise use current user's pager_id
    const targetPageeId = (req.user.role === 'admin' && pager_id)
      ? pager_id
      : req.user.pager_id;

    if (!targetPageeId) {
      return res.status(400).json({
        success: false,
        error: 'No pager_id set on your account. Update it in User Settings first.'
      });
    }

    const message = `Oshen Alert System - test page sent at ${new Date().toISOString()}`;
    const result = await pagemService.sendPage(targetPageeId, message);

    if (result.success) {
      res.json({ success: true, message: 'Test page sent successfully', eventId: result.eventId });
    } else {
      // Surface Pagem's actual error code so the user knows exactly what to fix.
      const reason = result.errorMessage || result.reason || 'Pagem returned failure';
      res.status(502).json({ success: false, error: reason });
    }
  } catch (error) {
    next(error);
  }
});

// POST /api/pagem/page-status - Check delivery status of a page (Supervisor+)
router.post('/page-status', authenticateToken, requireSupervisor, async (req, res, next) => {
  try {
    const { eventId } = req.body;

    if (!eventId) {
      return res.status(400).json({ success: false, error: 'eventId is required' });
    }

    const result = await pagemService.getPageStatus(eventId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// GET /api/pagem/debug-status/:eventId - Raw Pagem response for a given eventId (Admin)
// Use this to diagnose acknowledgement parsing — shows exactly what Pagem sends back.
// Remove or gate behind a feature flag before going to production.
router.get('/debug-status/:eventId', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const raw = await pagemService._post('/page/status', { eventId });
    res.json({ success: true, data: { raw, eventId } });
  } catch (error) {
    res.status(502).json({ success: false, error: error.message });
  }
});

// GET /api/pagem/page-log - Recent pages log (Admin/Supervisor)
// Query params: ?limit=50&vessel_id=1&status=unacknowledged
router.get('/page-log', authenticateToken, requireSupervisor, async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const where = {};

    if (req.query.vessel_id) {
      where.vessel_id = parseInt(req.query.vessel_id);
    }

    if (req.query.status === 'unacknowledged') {
      where.status = { in: ['sent', 'delivered'] };
    } else if (req.query.status && req.query.status !== 'all') {
      where.status = req.query.status;
    }

    const logs = await prisma.pagem_page_log.findMany({
      where,
      include: {
        vessels: { select: { id: true, name: true } }
      },
      orderBy: { sent_at: 'desc' },
      take: limit
    });

    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
});

// GET /api/pagem/page-log/:id/refresh - Force-poll Pagem for latest status (Admin)
router.get('/page-log/:id/refresh', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const logId = parseInt(req.params.id);
    const row = await prisma.pagem_page_log.findUnique({
      where: { id: logId }
    });

    if (!row) {
      return res.status(404).json({ success: false, error: 'Log entry not found' });
    }

    if (!row.event_id) {
      // These rows were created before eventId extraction was fixed.
      // Return the current row as-is with an explanation — nothing we can do retroactively.
      return res.status(400).json({
        success: false,
        error: 'No eventId was recorded for this page (created before fix). Re-trigger the test alert to generate new rows with eventId tracking.',
        data: row
      });
    }

    // Fetch from Pagem once, then pass to pollAndUpdateStatus to avoid double-polling
    // (Pagem throttles to 1 req/5s — calling twice in quick succession silently fails)
    let rawPagemResponse;
    try {
      rawPagemResponse = await pagemService._post('/page/status', { eventId: row.event_id });
    } catch (err) {
      return res.status(502).json({ success: false, error: `Pagem status poll failed: ${err.message}` });
    }

    // Pass pre-fetched response so pollAndUpdateStatus doesn't call Pagem a second time
    const updated = await pagemService.pollAndUpdateStatus(logId, row.event_id, rawPagemResponse);
    res.json({ success: true, data: updated, debug: { pagemRaw: rawPagemResponse } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;