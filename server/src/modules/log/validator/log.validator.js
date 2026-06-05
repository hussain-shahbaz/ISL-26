// Express validator rules for request validation

const { body, param, query, validationResult } = require('express-validator');

const validateCreateLog = [
  body('service')
    .trim()
    .notEmpty().withMessage('Service is required')
    .isString().withMessage('Service must be a string'),
  
  body('environment')
    .trim()
    .notEmpty().withMessage('Environment is required')
    .isIn(['development', 'staging', 'production']).withMessage('Invalid environment'),
  
  body('eventType')
    .trim()
    .notEmpty().withMessage('EventType is required')
    .isIn(['REQUEST', 'RESPONSE']).withMessage('EventType must be REQUEST or RESPONSE'),
  
  body('requestId')
    .trim()
    .notEmpty().withMessage('RequestId is required')
    .isString().withMessage('RequestId must be a string'),
  
  body('timestamp')
    .notEmpty().withMessage('Timestamp is required')
    .isISO8601().withMessage('Timestamp must be valid ISO8601 date'),
  
  body('request')
    .optional()
    .isObject().withMessage('Request must be an object'),
  
  body('response')
    .optional()
    .isObject().withMessage('Response must be an object'),
  
  body('error')
    .optional()
    .isObject().withMessage('Error must be an object'),
  
  body('userId')
    .optional()
    .isString().withMessage('UserId must be a string'),
];

const validateLogId = [
  param('id')
    .notEmpty().withMessage('Log ID is required')
    .isMongoId().withMessage('Invalid log ID format'),
];

const validateRequestId = [
  param('requestId')
    .trim()
    .notEmpty().withMessage('RequestId is required')
    .isString().withMessage('RequestId must be a string'),
];

const validateQueryLogs = [
  query('service')
    .optional()
    .trim()
    .isString().withMessage('Service must be a string'),
  
  query('eventType')
    .optional()
    .isIn(['REQUEST', 'RESPONSE']).withMessage('EventType must be REQUEST or RESPONSE'),
  
  query('userId')
    .optional()
    .trim()
    .isString().withMessage('UserId must be a string'),
  
  query('statusCode')
    .optional()
    .isInt({ min: 100, max: 599 }).withMessage('StatusCode must be between 100 and 599'),
  
  query('startTime')
    .optional()
    .isISO8601().withMessage('StartTime must be valid ISO8601 date'),
  
  query('endTime')
    .optional()
    .isISO8601().withMessage('EndTime must be valid ISO8601 date'),
  
  query('errorOnly')
    .optional()
    .isBoolean().withMessage('ErrorOnly must be true or false'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
  
  query('skip')
    .optional()
    .isInt({ min: 0 }).withMessage('Skip must be >= 0'),
];

const validateVerifyChain = [
  body('service')
    .trim()
    .notEmpty().withMessage('Service is required')
    .isString().withMessage('Service must be a string'),
  
  body('environment')
    .trim()
    .notEmpty().withMessage('Environment is required')
    .isIn(['development', 'staging', 'production']).withMessage('Invalid environment'),
];

const validateStatsService = [
  param('service')
    .trim()
    .notEmpty().withMessage('Service is required')
    .isString().withMessage('Service must be a string'),
  
  query('eventType')
    .optional()
    .isIn(['REQUEST', 'RESPONSE']).withMessage('EventType must be REQUEST or RESPONSE'),
];

const validateCleanup = [
  body('days')
    .notEmpty().withMessage('Days is required')
    .isInt({ min: 1 }).withMessage('Days must be a positive integer'),
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
      })),
      statusCode: 400,
    });
  }
  next();
};

module.exports = {
  validateCreateLog,
  validateLogId,
  validateRequestId,
  validateQueryLogs,
  validateVerifyChain,
  validateStatsService,
  validateCleanup,
  handleValidationErrors,
};
