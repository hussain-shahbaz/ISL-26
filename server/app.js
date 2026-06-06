require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const loggerMiddleware = require("./src/common/middleware/logger-middleware");
const LogQueue = require("./src/common/queue/log-queue");
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
const startServer = async () => {
  await attachAuthService();
  // 404 should come AFTER routes
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: "Route not found",
    });
  });
  // Global error handler LAST
  // app.use((err, req, res, next) => {
  //   console.error(err);
  //   res.status(500).json({
  //     success: false,
  //     error: "Internal server error",
  //   });
  // });
  app.listen(PORT, () => {
    console.log(`🚀 Main server running on http://localhost:${PORT}`);
  });
};
startServer().catch((err) => {
  console.error(err);
  process.exit(1);
});
module.exports = app;
