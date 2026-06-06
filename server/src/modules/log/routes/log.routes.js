// Express route definitions for log module

const express = require('express');
const router = express.Router();
const LogController = require('../controller/log.controller');
const serviceAuth = require('../middleware/service_auth_middleware')

const {
  validateCreateLog,
  validateLogId,
  validateRequestId,
  validateQueryLogs,
  validateVerifyChain,
  validateStatsService,
  validateCleanup,
  handleValidationErrors,
} = require('../validator/log.validator');


router.use(serviceAuth.verify.bind(serviceAuth));
router.post('/', validateCreateLog, handleValidationErrors, LogController.createLog);
router.get('/health', LogController.healthCheck);
router.get('/logs/:id', validateLogId, handleValidationErrors, LogController.getLog);
router.get('/pair/:requestId', validateRequestId, handleValidationErrors, LogController.getRequestResponsePair);
router.get('/query', validateQueryLogs, handleValidationErrors, LogController.queryLogs);
router.post('/verify-chain', validateVerifyChain, handleValidationErrors, LogController.verifyChainIntegrity);
router.get('/stats/:service', validateStatsService, handleValidationErrors, LogController.getStatistics);
router.post('/cleanup', validateCleanup, handleValidationErrors, LogController.cleanupLogs);

module.exports = router;
