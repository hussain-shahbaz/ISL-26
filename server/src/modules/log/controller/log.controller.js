// HTTP request handlers - receives requests, calls service, sends responses

const LogService = require('../service/log.service');
const logger = require('../utils/logger');

class LogController {
  async createLog(req, res) {
    try {
      const result = await LogService.captureLog(req.body);
      return res.status(result.statusCode).json(result);
    } catch (error) {
      logger.error(`Controller error in createLog: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: error.message,
        statusCode: 500,
      });
    }
  }

  async getLog(req, res) {
    try {
      const { id } = req.params;
      const result = await LogService.retrieveLog(id);
      return res.status(result.statusCode).json(result);
    } catch (error) {
      logger.error(`Controller error in getLog: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: error.message,
        statusCode: 500,
      });
    }
  }

  async getRequestResponsePair(req, res) {
    try {
      const { requestId } = req.params;
      const result = await LogService.getRequestResponsePair(requestId);
      return res.status(result.statusCode).json(result);
    } catch (error) {
      logger.error(`Controller error in getRequestResponsePair: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: error.message,
        statusCode: 500,
      });
    }
  }

  async queryLogs(req, res) {
    try {
      const filters = req.query;
      const options = {
        limit: parseInt(req.query.limit) || 50,
        skip: parseInt(req.query.skip) || 0,
      };
      const result = await LogService.queryLogs(filters, options);
      return res.status(result.statusCode).json(result);
    } catch (error) {
      logger.error(`Controller error in queryLogs: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: error.message,
        statusCode: 500,
      });
    }
  }

  async verifyChainIntegrity(req, res) {
    try {
      const { service, environment } = req.body;
      const result = await LogService.verifyChainIntegrity(service, environment);
      return res.status(result.statusCode).json(result);
    } catch (error) {
      logger.error(`Controller error in verifyChainIntegrity: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: error.message,
        statusCode: 500,
      });
    }
  }

  async getStatistics(req, res) {
    try {
      const { service } = req.params;
      const options = {
        eventType: req.query.eventType || null,
      };
      const result = await LogService.getStatistics(service, options);
      return res.status(result.statusCode).json(result);
    } catch (error) {
      logger.error(`Controller error in getStatistics: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: error.message,
        statusCode: 500,
      });
    }
  }

  async cleanupLogs(req, res) {
    try {
      const { days } = req.body;
      if (!days || isNaN(days)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid days parameter',
          statusCode: 400,
        });
      }
      const result = await LogService.cleanupOldLogs(days);
      return res.status(result.statusCode).json(result);
    } catch (error) {
      logger.error(`Controller error in cleanupLogs: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: error.message,
        statusCode: 500,
      });
    }
  }

  async healthCheck(req, res) {
    return res.status(200).json({
      success: true,
      message: 'Log service is running',
      statusCode: 200,
    });
  }
}

module.exports = new LogController();
