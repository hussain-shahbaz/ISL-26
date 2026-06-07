// Business logic for logging - sanitizes data, manages hash chain, calls repository

const LogRepository = require('../repository/log.repository');
const { sanitize } = require('../utils/sanitizer');
const { verifyHash,calculateLogHash } = require('../utils/hash-utils');
const logger = require('../utils/logger');
const config = require('../config/config');

class LogService {
  // Single definition of the data covered by the hash chain. Used by both
  // captureLog and verifyChainIntegrity so the two can never drift apart.
  _hashPayload(log) {
    // Project to ONLY the fields that are persisted, in a fixed key order, so
    // the hash computed at capture time matches the one recomputed from the
    // stored document during verification. (Notably, response.headers are not
    // persisted by the schema, so they must be excluded from the hash.)
    const req = log.request || {};
    const res = log.response || {};
    return {
      eventType: log.eventType,
      requestId: log.requestId,
      timestamp: new Date(log.timestamp).toISOString(),
      service: log.service,
      environment: log.environment,
      request: {
        method: req.method ?? null,
        url: req.url ?? null,
        path: req.path ?? null,
        query: req.query ?? null,
        params: req.params ?? null,
        headers: req.headers ?? null,
        body: req.body ?? null,
        ip: req.ip ?? null,
        userId: req.userId ?? null,
        userAgent: req.userAgent ?? null,
      },
      response: {
        statusCode: res.statusCode ?? null,
        responseTime: res.responseTime ?? null,
        body: res.body ?? null,
      },
      error: log.error ?? null,
    };
  }

  async captureLog(logData) {
    try {
      const sanitized = {
        service: logData.service,
        environment: logData.environment,
        eventType: logData.eventType,
        requestId: logData.requestId,
        userId: logData.userId || null,
        timestamp: new Date(logData.timestamp),
        request: sanitize(logData.request),
        response: sanitize(logData.response),
        error: logData.error ? sanitize(logData.error) : null,
      };
      
      const previousLog = await LogRepository.getLastLog(
        logData.service,
        logData.environment
      );

      // Data covered by the hash chain (excludes the hash fields themselves).
      const logDataForHashing = this._hashPayload(sanitized);

      if (previousLog) {
        sanitized.previousHash = previousLog.currentHash;
      } else {
        // Genesis: previousHash is special marker
        sanitized.previousHash = calculateLogHash(config.GENESIS_MARKER + '-' + logData.service, config.GENESIS_MARKER);
      }

      // Calculate currentHash ONLY from previousHash + logData (not including hash fields)
      sanitized.currentHash = calculateLogHash(sanitized.previousHash, logDataForHashing);

      const saved = await LogRepository.create(sanitized);

      logger.info(`Log created: ${saved._id}`);
      return {
        success: true,
        data: saved,
        statusCode: 201,
      };
    } catch (error) {
      logger.error(`Error capturing log: ${error.message}`);
      return {
        success: false,
        error: error.message,
        statusCode: 500,
      };
    }
  }

  async retrieveLog(logId) {
    try {
      const log = await LogRepository.findById(logId);

      if (!log) {
        return {
          success: false,
          error: 'Log not found',
          statusCode: 404,
        };
      }

      return {
        success: true,
        data: log,
        statusCode: 200,
      };
    } catch (error) {
      logger.error(`Error retrieving log: ${error.message}`);
      return {
        success: false,
        error: error.message,
        statusCode: 500,
      };
    }
  }

  async getRequestResponsePair(requestId) {
    try {
      const result = await LogRepository.findByRequestId(requestId);

      if (!result.data || result.data.length === 0) {
        return {
          success: false,
          error: 'No logs found for this request ID',
          statusCode: 404,
        };
      }

      return {
        success: true,
        data: result.data,
        total: result.total,
        statusCode: 200,
      };
    } catch (error) {
      logger.error(`Error retrieving request-response pair: ${error.message}`);
      return {
        success: false,
        error: error.message,
        statusCode: 500,
      };
    }
  }

  async queryLogs(filters, options = {}) {
    try {
      let result;

      if (filters.service && filters.eventType) {
        result = await LogRepository.findByService(filters.service, {
          eventType: filters.eventType,
          limit: options.limit || config.QUERY_LIMITS.DEFAULT_LIMIT,
          skip: options.skip || 0,
        });
      } else if (filters.service) {
        result = await LogRepository.findByService(filters.service, {
          limit: options.limit || config.QUERY_LIMITS.DEFAULT_LIMIT,
          skip: options.skip || 0,
        });
      } else if (filters.userId) {
        result = await LogRepository.findByUserId(filters.userId, {
          limit: options.limit || config.QUERY_LIMITS.DEFAULT_LIMIT,
          skip: options.skip || 0,
        });
      } else if (filters.statusCode) {
        result = await LogRepository.findByStatusCode(filters.statusCode, {
          limit: options.limit || config.QUERY_LIMITS.DEFAULT_LIMIT,
          skip: options.skip || 0,
        });
      } else if (filters.startTime && filters.endTime) {
        result = await LogRepository.findByDateRange(
          filters.startTime,
          filters.endTime,
          {
            limit: options.limit || config.QUERY_LIMITS.DEFAULT_LIMIT,
            skip: options.skip || 0,
          }
        );
      } else if (filters.errorOnly === true) {
        result = await LogRepository.findErrorLogs({
          limit: options.limit || config.QUERY_LIMITS.DEFAULT_LIMIT,
          skip: options.skip || 0,
        });
      } else {
        return {
          success: false,
          error: 'No valid filter provided',
          statusCode: 400,
        };
      }

      return {
        success: true,
        data: result.data,
        total: result.total,
        statusCode: 200,
      };
    } catch (error) {
      logger.error(`Error querying logs: ${error.message}`);
      return {
        success: false,
        error: error.message,
        statusCode: 500,
      };
    }
  }

  async verifyChainIntegrity(service, environment) {
    try {
      const result = await LogRepository.findByService(service, {
        limit: 10000,
        skip: 0,
        sort: { timestamp: 1 },
      });

      const logs = result.data;

      if (logs.length === 0) {
        return {
          success: true,
          data: {
            isValid: true,
            message: 'No logs to verify',
            totalLogs: 0,
          },
          statusCode: 200,
        };
      }

      for (let i = 1; i < logs.length; i++) {
        const previousLog = logs[i - 1];
        const currentLog = logs[i];

        if (currentLog.previousHash !== previousLog.currentHash) {
          logger.warn(
            `Chain broken between log ${previousLog._id} and ${currentLog._id}`
          );
          return {
            success: true,
            data: {
              isValid: false,
              message: `Chain broken at log index ${i}`,
              brokenAt: {
                previousLogId: previousLog._id,
                currentLogId: currentLog._id,
                expectedHash: previousLog.currentHash,
                receivedHash: currentLog.previousHash,
              },
              totalLogs: logs.length,
            },
            statusCode: 200,
          };
        }

        const isHashValid = verifyHash(
          currentLog.previousHash || '',
          this._hashPayload(currentLog),
          currentLog.currentHash
        );

        if (!isHashValid) {
          logger.warn(`Hash integrity check failed for log ${currentLog._id}`);
          return {
            success: true,
            data: {
              isValid: false,
              message: `Hash integrity failed for log at index ${i}`,
              failedLogId: currentLog._id,
              totalLogs: logs.length,
            },
            statusCode: 200,
          };
        }
      }

      logger.info(`Chain verified for ${service}: ${logs.length} logs intact`);
      return {
        success: true,
        data: {
          isValid: true,
          message: 'Hash chain is valid and unbroken',
          totalLogs: logs.length,
        },
        statusCode: 200,
      };
    } catch (error) {
      logger.error(`Error verifying chain: ${error.message}`);
      return {
        success: false,
        error: error.message,
        statusCode: 500,
      };
    }
  }

  async getStatistics(service, options = {}) {
    try {
      const result = await LogRepository.getStats(service, options);

      return {
        success: true,
        data: result,
        statusCode: 200,
      };
    } catch (error) {
      logger.error(`Error getting statistics: ${error.message}`);
      return {
        success: false,
        error: error.message,
        statusCode: 500,
      };
    }
  }

  async cleanupOldLogs(days) {
    try {
      const result = await LogRepository.deleteOlderThan(days);

      logger.info(`Deleted ${result.deletedCount} logs older than ${days} days`);
      return {
        success: true,
        data: {
          deletedCount: result.deletedCount,
          message: `Deleted logs older than ${days} days`,
        },
        statusCode: 200,
      };
    } catch (error) {
      logger.error(`Error cleaning up logs: ${error.message}`);
      return {
        success: false,
        error: error.message,
        statusCode: 500,
      };
    }
  }
}

module.exports = new LogService();
