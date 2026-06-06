// Log microservice entry point - runs on port 3001

require('dotenv').config();
const express = require('express');
const config = require('./config/config');
const DatabaseConnection = require('./config/database');
const logger = require('./utils/logger');
const LogRoutes = require('./routes/log.routes');

const app = express();
const PORT = config.PORT;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/logs', LogRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({
    module: 'log-service',
    status: 'healthy',
    dependencies: ['mongodb'],
    version: '1.0.0',
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    statusCode: 404,
  });
});

app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    statusCode: 500,
  });
});

const startServer = async () => {
  try {
    await DatabaseConnection.connect();
    logger.info('Database connected successfully');

    app.listen(PORT, () => {
      logger.info(`Log microservice running on port ${PORT}`);
      console.log(`✅ Log service running at http://localhost:${PORT}, LEVEL HAI`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();

module.exports = app;
