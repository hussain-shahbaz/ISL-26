// Main server - runs on port 3000, integrates all modules

require('dotenv').config();
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const express = require('express');
const cookieParser =  require('cookie-parser');
const loggerMiddleware = require('./src/common/middleware/logger-middleware');
const LogQueue = require('./src/common/queue/log-queue');
const microserviceRoutes = require('./src/common/microservices/microservice-routes');

const app = express();
const PORT = process.env.MAIN_SERVER_PORT || 3000;

app.use(express.json());
app.use(cookieParser());
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

// Microservice routes - all microservices delegated through /api/modules/:service/*
app.use('/api/modules', microserviceRoutes.getRouter());

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

async function loadAuthService() {
  const authServicePath = path.resolve(__dirname, 'auth-service/src/app.js');
  const authModule = await import(pathToFileURL(authServicePath).href);
  const AttachAuth = authModule.default || authModule;
  if (typeof AttachAuth !== 'function') {
    throw new Error('Auth service did not export a valid attach function');
  }
  await AttachAuth(app);
}

async function startServer() {
  try {
    await loadAuthService();

    app.listen(PORT, () => {
      console.log(`✅ Main server running at http://localhost:${PORT}`);
      console.log('📌 Microservice proxy routes:');
      console.log('   - /api/modules/exam/*');
      console.log('   - /api/modules/student-exam/*');
      console.log('   - /api/modules/grade-cheat/*');
      console.log(`📡 Log service URL: ${process.env.LOG_SERVICE_URL || 'http://localhost:3001'}`);
      console.log('📝 Logs are queued and sent non-blocking every 100ms');
    });
  } catch (error) {
    console.error('Failed to start main server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
