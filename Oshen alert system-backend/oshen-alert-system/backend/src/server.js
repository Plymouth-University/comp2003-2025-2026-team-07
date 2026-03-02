const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { testConnection } = require('./config/database');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Import routes
const vesselRoutes = require('./routes/vessels');
const alertRoutes = require('./routes/alerts');
const geofenceRoutes = require('./routes/geofences');
const telemetryRoutes = require('./routes/telemetry');
const authRoutes = require('./routes/auth');
const dataFetcherRoutes = require('./routes/dataFetcher');

// Import data fetcher service
const dataFetcherService = require('./services/dataFetcherService');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// MIDDLEWARE
// ============================================================================

// CORS configuration - Allow multiple origins
const allowedOrigins = [
  'http://localhost:3001',
  'http://localhost:3000',
  'http://localhost:5173',
  'https://ares-swirlier-yulanda.ngrok-free.dev'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging (development only)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// ============================================================================
// ROUTES
// ============================================================================

// Health check endpoint
app.get('/health', (req, res) => {
  const dataFetcherStatus = dataFetcherService.getStatus();
  
  res.json({ 
    status: 'OK', 
    message: 'Oshen Alert System API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    dataFetcher: {
      enabled: process.env.ENABLE_DATA_FETCHER === 'true',
      running: dataFetcherStatus.isRunning
    }
  });
});

// API routes
app.use('/api/vessels', vesselRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/geofences', geofenceRoutes);
app.use('/api/telemetry', telemetryRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/data-fetcher', dataFetcherRoutes);

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Oshen Alert System API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      auth: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register (Admin)',
        me: 'GET /api/auth/me',
        users: 'GET /api/auth/users (Admin)',
        changePassword: 'PUT /api/auth/password'
      },
      vessels: {
        list: 'GET /api/vessels',
        get: 'GET /api/vessels/:id',
        stats: 'GET /api/vessels/:id/stats',
        create: 'POST /api/vessels (Admin)',
        update: 'PUT /api/vessels/:id (Admin)',
        delete: 'DELETE /api/vessels/:id (Admin)'
      },
      alerts: {
        rules: 'GET /api/alerts/rules',
        getRule: 'GET /api/alerts/rules/:id',
        createRule: 'POST /api/alerts/rules (Admin)',
        updateRule: 'PUT /api/alerts/rules/:id (Admin)',
        deleteRule: 'DELETE /api/alerts/rules/:id (Admin)',
        muteRule: 'PATCH /api/alerts/rules/:id/mute (Supervisor)',
        history: 'GET /api/alerts/history',
        active: 'GET /api/alerts/active',
        acknowledge: 'POST /api/alerts/:id/acknowledge (Supervisor)',
        resolve: 'POST /api/alerts/:id/resolve (Supervisor)',
        stats: 'GET /api/alerts/stats'
      },
      geofences: {
        list: 'GET /api/geofences',
        get: 'GET /api/geofences/:id',
        byVessel: 'GET /api/geofences/vessel/:vesselId',
        create: 'POST /api/geofences (Admin)',
        update: 'PUT /api/geofences/:id (Admin)',
        delete: 'DELETE /api/geofences/:id (Admin)',
        mute: 'PATCH /api/geofences/:id/mute (Supervisor)',
        evaluate: 'POST /api/geofences/evaluate'
      },
      telemetry: {
        list: 'GET /api/telemetry',
        get: 'GET /api/telemetry/:id',
        latest: 'GET /api/telemetry/vessel/:vesselId/latest',
        stats: 'GET /api/telemetry/vessel/:vesselId/stats',
        create: 'POST /api/telemetry',
        bulk: 'POST /api/telemetry/bulk',
        cleanup: 'DELETE /api/telemetry/cleanup (Admin)'
      },
      dataFetcher: {
        status: 'GET /api/data-fetcher/status',
        trigger: 'POST /api/data-fetcher/trigger (Admin)',
        start: 'POST /api/data-fetcher/start (Admin)',
        stop: 'POST /api/data-fetcher/stop (Admin)'
      }
    },
    documentation: 'See README.md for detailed API documentation'
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function startServer() {
  try {
    // Test database connection
    await testConnection();
    
    // Start server
    app.listen(PORT, () => {
      console.log('='.repeat(70));
      console.log('🚀 Oshen Alert System API');
      console.log('='.repeat(70));
      console.log(`📡 Server running on: http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`📚 API docs: http://localhost:${PORT}/api`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
      console.log('='.repeat(70));
      
      // Start data fetcher service if enabled
      if (process.env.ENABLE_DATA_FETCHER === 'true') {
        console.log('\n🔄 Data fetcher service is ENABLED');
        dataFetcherService.start();
      } else {
        console.log('\n⏸️ Data fetcher service is DISABLED');
        console.log('   To enable, set ENABLE_DATA_FETCHER=true in .env');
        console.log('   Or trigger manually via POST /api/data-fetcher/trigger');
      }
      
      console.log('\n');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  dataFetcherService.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT signal received: closing HTTP server');
  dataFetcherService.stop();
  process.exit(0);
});

module.exports = app;