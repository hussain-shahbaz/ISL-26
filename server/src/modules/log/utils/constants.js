// Application constants

const config = require('../config/config');

module.exports = {
  EVENT_TYPES: config.EVENT_TYPES,
  ENVIRONMENTS: config.ENVIRONMENTS,
  HTTP_METHODS: config.HTTP_METHODS,
  HTTP_STATUS: config.HTTP_STATUS,
  ERROR_CODES: config.ERROR_CODES,

  SENSITIVE_PATTERNS: config.SENSITIVE_FIELD_PATTERNS,
  HEADERS_SANITIZE_VALUES: config.HEADERS_SANITIZE_VALUES,

  LOG_LEVELS: {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
  },

  MESSAGES: {
    DB_CONNECTED: 'Connected to MongoDB',
    DB_CONNECTION_ERROR: 'Failed to connect to MongoDB',
    LOG_CREATED: 'Log entry created successfully',
    VALIDATION_ERROR: 'Validation failed',
    CHAIN_VERIFIED: 'Hash chain verified successfully',
    CHAIN_BROKEN: 'Hash chain integrity check failed',
    SERVER_STARTED: 'Log service started',
  },
};
