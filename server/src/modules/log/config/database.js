// Database connection management

const mongoose = require('mongoose');
const config = require('./config');
const logger = require('../utils/logger');

class Database {
  constructor() {
    this.isConnected = false;
    this.connection = null;
    this.retryCount = 0;
  }

  async connect() {
    if (this.isConnected) {
      logger.info('Already connected to database');
      return this.connection;
    }

    try {
      mongoose.set('strictQuery', true);

      const conn = await mongoose.connect(config.MONGODB.URI, {
        dbName: config.MONGODB.DB_NAME,
        serverSelectionTimeoutMS: config.MONGODB.TIMEOUT,
        connectTimeoutMS: config.MONGODB.TIMEOUT,
        maxPoolSize: config.MONGODB.POOL_SIZE,
        retryWrites: true,
      });

      this.connection = conn;
      this.isConnected = true;
      this.retryCount = 0;

      logger.info('Connected to MongoDB', { uri: config.MONGODB.URI });

      this._setupEventListeners();

      return this.connection;
    } catch (error) {
      logger.error('Database connection error', error);

      if (this.retryCount < config.MONGODB.RETRY_ATTEMPTS) {
        this.retryCount++;
        logger.warn(
          `Retrying connection (${this.retryCount}/${config.MONGODB.RETRY_ATTEMPTS})`,
          { delay: config.MONGODB.RETRY_DELAY }
        );

        await new Promise(resolve => setTimeout(resolve, config.MONGODB.RETRY_DELAY));
        return this.connect();
      }

      throw error;
    }
  }

  async disconnect() {
    if (!this.isConnected) return;

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      logger.info('Disconnected from MongoDB');
    } catch (error) {
      logger.error('Error disconnecting from MongoDB', error);
      throw error;
    }
  }

  _setupEventListeners() {
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
      this.isConnected = false;
    });

    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error event', error);
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
      this.isConnected = true;
    });
  }

  getConnection() {
    return this.connection;
  }

  isReady() {
    return this.isConnected && mongoose.connection.readyState === 1;
  }
}

module.exports = new Database();