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
// import connectDB from "./auth-service/src/config/database.js";
// await connectDB();
// -------------------------
// Global Middlewares
// -------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// Request Id
app.use((req, res, next) => {
  req.requestId = req.get("x-request-id") || `req-${Date.now()}`;
  next();
});
// Logger
// app.use(loggerMiddleware);
// -------------------------
// Health
// -------------------------
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Main server healthy",
    timestamp: new Date(),
    queueSize: LogQueue.size(),
  });
});
// -------------------------
// Attach Auth Service
// -------------------------
const attachAuthService = async () => {
  const { default: connectMongo } = await import(
    "./auth-service/src/config/database.js"
  );
  const {  connectRedis } = await import(
    "./auth-service/src/config/redis.js"
  );
  await connectMongo();
  console.log("✅ MongoDB Connected");
  await connectRedis();
  console.log("✅ Redis Connected");
  const { attachAuth } = await import("./auth-service/src/app.js");
  attachAuth(app);
  console.log("✅ Auth service attached");
};
// -------------------------
// Start Server
// -------------------------


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
