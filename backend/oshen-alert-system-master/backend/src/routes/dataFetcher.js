const express = require('express');
const router = express.Router();
const dataFetcherService = require('../services/dataFetcherService');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/data-fetcher/status - Get service status
router.get('/status', authenticateToken, async (req, res, next) => {
  try {
    const status = dataFetcherService.getStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/data-fetcher/trigger - Manually trigger data fetch (Admin only)
router.post('/trigger', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    console.log(`🔧 Manual data fetch triggered by user: ${req.user.username}`);
    
    // Trigger fetch in background, don't wait for completion
    dataFetcherService.triggerManualFetch()
      .then(result => {
        console.log('✅ Manual fetch completed:', result);
      })
      .catch(error => {
        console.error('❌ Manual fetch failed:', error);
      });

    res.json({
      success: true,
      message: 'Data fetch triggered successfully. Check logs for progress.',
      triggeredBy: req.user.username,
      triggeredAt: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/data-fetcher/start - Start the service (Admin only)
router.post('/start', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    dataFetcherService.start();
    res.json({
      success: true,
      message: 'Data fetcher service started',
      status: dataFetcherService.getStatus()
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/data-fetcher/stop - Stop the service (Admin only)
router.post('/stop', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    dataFetcherService.stop();
    res.json({
      success: true,
      message: 'Data fetcher service stopped',
      status: dataFetcherService.getStatus()
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
