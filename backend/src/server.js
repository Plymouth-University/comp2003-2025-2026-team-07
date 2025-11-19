const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Oshen Alert System API is running',
    timestamp: new Date().toISOString()
  });
});

// Routes will go here later
// app.use('/api/vessels', require('./routes/vessels'));
// app.use('/api/alerts', require('./routes/alerts'));

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Oshen API server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});