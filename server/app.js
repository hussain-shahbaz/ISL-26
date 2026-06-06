// API Gateway - single entry point for the Secure Online Examination System.
// Responsibilities: security headers, CORS, request id, async audit logging,
// rate limiting, auth (in-process), and reverse-proxy to the microservices.

const path = require('node:path');
const { pathToFileURL } = require('node:url');
// Single source of truth: the repo-root .env (falls back to a local .env).
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const loggerMiddleware = require('./src/common/middleware/logger-middleware');
const LogQueue = require('./src/common/queue/log-queue');
const microserviceRoutes = require('./src/common/microservices/microservice-routes');
const { authenticate } = require('./src/common/middleware/auth');

const app = express();
const PORT = process.env.GATEWAY_PORT || process.env.MAIN_SERVER_PORT || 3000;

// -------------------------
// Security & parsing
// -------------------------
app.use(helmet());

const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000')
  .split(',')
  .map((o) => o.trim());
app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Correlation id for request/response log pairing
app.use((req, res, next) => {
  req.requestId = req.get('x-request-id') || `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  res.setHeader('x-request-id', req.requestId);
  next();
});

// Async, non-blocking audit logging
app.use(loggerMiddleware);

// Rate limiting on the public API surface
const apiLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', error_code: 429, message: 'Too many requests' },
});
app.use('/api', apiLimiter);

// -------------------------
// Health (integration contract shape)
// -------------------------
app.get('/health', (req, res) => {
  res.status(200).json({
    module: 'gateway',
    status: 'healthy',
    dependencies: ['auth-service', 'log-service'],
    version: '1.0.0',
    queueSize: LogQueue.size(),
    timestamp: new Date().toISOString(),
  });
});

// -------------------------
// Auth service (attached in-process)
// -------------------------
async function loadAuthService() {
  const authServicePath = path.resolve(__dirname, 'auth-service/src/app.js');
  const authModule = await import(pathToFileURL(authServicePath).href);
  const AttachAuth = authModule.default || authModule.AddAuth;
  if (typeof AttachAuth !== 'function') {
    throw new Error('Auth service did not export a valid attach function');
  }
  await AttachAuth(app);
  console.log('Auth service attached at /api/auth');
}

// -------------------------
// Start
// -------------------------
async function startServer() {
  try {
    await loadAuthService();

    // Reverse proxy: /api/modules/<service>/* -> microservice.
    // authenticate verifies the JWT once and propagates a trusted identity.
    app.use('/api/modules', authenticate, microserviceRoutes.getRouter());

    // 404
    app.use((req, res) => {
      res.status(404).json({
        status: 'error',
        error_code: 404,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
        timestamp: new Date().toISOString(),
      });
    });

    // Centralized error handler
    app.use((err, req, res, next) => {
      console.error('Gateway error:', err.message);
      res.status(err.status || 500).json({
        status: 'error',
        error_code: err.status || 500,
        message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
        timestamp: new Date().toISOString(),
      });
    });

    const server = app.listen(PORT, () => {
      console.log(`Gateway running at http://localhost:${PORT}`);
      console.log('Proxy routes: /api/modules/{exam,student-exam,grade-cheat}/*');
      console.log(`Log service: ${process.env.LOG_SERVICE_URL || 'http://localhost:3006/logs'}`);
    });

    const shutdown = async (signal) => {
      console.log(`${signal} received, draining logs and shutting down...`);
      await LogQueue.shutdown();
      server.close(() => process.exit(0));
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to start gateway:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
