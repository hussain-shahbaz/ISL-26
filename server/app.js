// Main server - runs on port 3000, integrates all modules

require('dotenv').config();
const express = require('express');
const loggerMiddleware = require('./src/common/middleware/logger-middleware');
const LogQueue = require('./src/common/queue/log-queue');
const AuthRoutes = require('./src/modules/auth/routes');

const app = express();
const PORT = process.env.MAIN_SERVER_PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request ID middleware (for tracking)
app.use((req, res, next) => {
  req.requestId = req.get('x-request-id') || `req-${Date.now()}`;
  next();
});

// Logging middleware (captures REQUEST + RESPONSE)
app.use(loggerMiddleware);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Main server is healthy',
    timestamp: new Date(),
    queueSize: LogQueue.size(),
  });
});

// Routes
app.use('/api/module/auth', AuthRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(`Error:`, err.message);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

const startServer = () => {
  app.listen(PORT, () => {
    console.log(`✅ Main server running at http://localhost:${PORT}`);
    console.log(`📡 Log service URL: ${process.env.LOG_SERVICE_URL || 'http://localhost:3001'}`);
    console.log(`📝 Logs are queued and sent non-blocking every 100ms`);
  });
};

startServer();

module.exports = app;
