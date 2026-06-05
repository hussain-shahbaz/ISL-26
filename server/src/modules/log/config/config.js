// Log module configuration - centralized settings and constants

module.exports = {
  PORT: process.env.LOG_SERVICE_PORT || 3001,
  NODE_ENV: process.env.NODE_ENV || 'development',
  APP_NAME: process.env.APP_NAME || 'log-service',

  MONGODB: {
    URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/logs',
    DB_NAME: process.env.MONGODB_DB_NAME || 'logs',
    TIMEOUT: 5000,
    POOL_SIZE: 10,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
  },

  LOG_RETENTION: {
    KEEP_DAYS: process.env.LOG_RETENTION_DAYS || 90,
    BATCH_SIZE: 100,
    FLUSH_INTERVAL: 1000,
  },

  HASH_ALGORITHM: 'sha256',
  GENESIS_MARKER: 'GENESIS',

  QUERY_LIMITS: {
    MAX_SKIP: 10000,
    MAX_LIMIT: 1000,
    DEFAULT_LIMIT: 50,
  },

  SIZE_LIMITS: {
    REQUEST_BODY_MAX: 10000,
    RESPONSE_BODY_MAX: 5000,
    HEADERS_MAX: 2000,
  },

  SENSITIVE_FIELD_PATTERNS: [
    'password', 'passwd', 'pwd', 'secret', 'token', 'accesstoken',
    'refreshtoken', 'apikey', 'api_key', 'apisecret', 'privatekey',
    'private_key', 'ssn', 'creditcard', 'cardnumber', 'cvv', 'ccv', 'pin', 'mpin',
  ],

  HEADERS_SANITIZE_VALUES: {
    authorization: true,
    'x-api-key': true,
    'x-auth-token': true,
    'x-access-token': true,
    cookie: true,
    'set-cookie': true,
    'x-csrf-token': true,
  },

  ERROR_CODES: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    DB_ERROR: 'DB_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    CHAIN_BROKEN: 'CHAIN_BROKEN',
    HASH_VERIFICATION_FAILED: 'HASH_VERIFICATION_FAILED',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
  },

  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_ERROR: 500,
  },

  EVENT_TYPES: {
    REQUEST: 'REQUEST',
    RESPONSE: 'RESPONSE',
  },

  ENVIRONMENTS: {
    PRODUCTION: 'production',
    DEVELOPMENT: 'development',
    TESTING: 'testing',
  },

  HTTP_METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],

  FEATURES: {
    ENABLE_CHAIN_VERIFICATION: true,
    ENABLE_HASH_LOGGING: true,
    ENABLE_SANITIZATION: true,
  },

  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  GENESIS_MARKER : process.env.GENESIS
};