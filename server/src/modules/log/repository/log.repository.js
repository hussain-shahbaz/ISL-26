// Repository layer - all MongoDB operations for logs (data abstraction)

const Log = require('../model/log.model');
const logger = require('../utils/logger');
const config = require('../config/config');

class LogRepository {
  async create(logData) {
    try {
      const log = new Log(logData);
      const saved = await log.save();
      logger.debug('Log created', { id: saved._id });
      return saved;
    } catch (error) {
      logger.error('Failed to create log', error);
      throw error;
    }
  }

  async findById(logId) {
    try {
      const log = await Log.findById(logId);
      return log;
    } catch (error) {
      logger.error('Failed to find log by ID', error);
      throw error;
    }
  }

  async findByRequestId(requestId, options = {}) {
    try {
      const { limit = 10, skip = 0, sort = { timestamp: -1 } } = options;
      const logs = await Log.find({ requestId })
        .sort(sort)
        .limit(limit)
        .skip(skip)
        .lean();
      const total = await Log.countDocuments({ requestId });
      return { data: logs, total };
    } catch (error) {
      logger.error('Failed to find logs by requestId', error);
      throw error;
    }
  }

  async findByService(service, options = {}) {
    try {
      const {
        eventType = null,
        limit = config.QUERY_LIMITS.DEFAULT_LIMIT,
        skip = 0,
        startTime = null,
        endTime = null,
        sort = { timestamp: -1 }
      } = options;

      const query = { service };
      if (eventType) query.eventType = eventType;
      if (startTime || endTime) {
        query.timestamp = {};
        if (startTime) query.timestamp.$gte = new Date(startTime);
        if (endTime) query.timestamp.$lte = new Date(endTime);
      }

      const logs = await Log.find(query)
        .sort(sort)
        .limit(limit)
        .skip(skip)
        .lean();
      const total = await Log.countDocuments(query);
      return { data: logs, total };
    } catch (error) {
      logger.error('Failed to find logs by service', error);
      throw error;
    }
  }

  async findByUserId(userId, options = {}) {
    try {
      const {
        limit = config.QUERY_LIMITS.DEFAULT_LIMIT,
        skip = 0,
        sort = { timestamp: -1 }
      } = options;

      const logs = await Log.find({ 'request.userId': userId })
        .sort(sort)
        .limit(limit)
        .skip(skip)
        .lean();
      const total = await Log.countDocuments({ 'request.userId': userId });
      return { data: logs, total };
    } catch (error) {
      logger.error('Failed to find logs by userId', error);
      throw error;
    }
  }

  async findByDateRange(startTime, endTime, options = {}) {
    try {
      const {
        service = null,
        eventType = null,
        limit = config.QUERY_LIMITS.DEFAULT_LIMIT,
        skip = 0,
        sort = { timestamp: -1 }
      } = options;

      const query = {
        timestamp: {
          $gte: new Date(startTime),
          $lte: new Date(endTime)
        }
      };

      if (service) query.service = service;
      if (eventType) query.eventType = eventType;

      const logs = await Log.find(query)
        .sort(sort)
        .limit(limit)
        .skip(skip)
        .lean();
      const total = await Log.countDocuments(query);
      return { data: logs, total };
    } catch (error) {
      logger.error('Failed to find logs by date range', error);
      throw error;
    }
  }

  async findByStatusCode(statusCode, options = {}) {
    try {
      const {
        service = null,
        limit = config.QUERY_LIMITS.DEFAULT_LIMIT,
        skip = 0,
        sort = { timestamp: -1 }
      } = options;

      const query = { 'response.statusCode': statusCode };
      if (service) query.service = service;

      const logs = await Log.find(query)
        .sort(sort)
        .limit(limit)
        .skip(skip)
        .lean();
      const total = await Log.countDocuments(query);
      return { data: logs, total };
    } catch (error) {
      logger.error('Failed to find logs by status code', error);
      throw error;
    }
  }

  async findErrorLogs(options = {}) {
    try {
      const {
        service = null,
        limit = config.QUERY_LIMITS.DEFAULT_LIMIT,
        skip = 0,
        sort = { timestamp: -1 }
      } = options;

      const query = {
        $or: [
          { 'response.statusCode': { $gte: 400 } },
          { error: { $ne: null } }
        ]
      };

      if (service) query.service = service;

      const logs = await Log.find(query)
        .sort(sort)
        .limit(limit)
        .skip(skip)
        .lean();
      const total = await Log.countDocuments(query);
      return { data: logs, total };
    } catch (error) {
      logger.error('Failed to find error logs', error);
      throw error;
    }
  }

  // Unified, combinable query used by the admin audit view.
  // Every filter is optional and ANDed together; no filter = most recent logs.
  async query(filters = {}, options = {}) {
    try {
      const {
        limit = config.QUERY_LIMITS.DEFAULT_LIMIT,
        skip = 0,
        sort = { timestamp: -1 },
      } = options;

      const mongoQuery = {};
      const and = [];

      if (filters.service) mongoQuery.service = filters.service;
      if (filters.eventType) mongoQuery.eventType = filters.eventType;
      if (filters.environment) mongoQuery.environment = filters.environment;
      if (filters.userId) mongoQuery['request.userId'] = filters.userId;
      if (filters.statusCode) mongoQuery['response.statusCode'] = Number(filters.statusCode);

      if (filters.startTime || filters.endTime) {
        mongoQuery.timestamp = {};
        if (filters.startTime) mongoQuery.timestamp.$gte = new Date(filters.startTime);
        if (filters.endTime) mongoQuery.timestamp.$lte = new Date(filters.endTime);
      }

      if (filters.errorOnly === true || filters.errorOnly === 'true') {
        and.push({
          $or: [{ 'response.statusCode': { $gte: 400 } }, { error: { $ne: null } }],
        });
      }

      if (filters.search) {
        const escaped = String(filters.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const rx = new RegExp(escaped, 'i');
        and.push({
          $or: [
            { 'request.path': rx },
            { 'request.url': rx },
            { 'request.method': rx },
            { requestId: rx },
            { 'request.userId': rx },
          ],
        });
      }

      if (and.length) mongoQuery.$and = and;

      const logs = await Log.find(mongoQuery)
        .sort(sort)
        .limit(limit)
        .skip(skip)
        .lean();
      const total = await Log.countDocuments(mongoQuery);
      return { data: logs, total };
    } catch (error) {
      logger.error('Failed to query logs', error);
      throw error;
    }
  }

  async getLastLog(service, environment = null) {
    try {
      const query = { service };
      if (environment) query.environment = environment;

      // Order by insertion (_id), not the gateway timestamp. Timestamps can tie
      // to the millisecond or arrive slightly out of order, which would fork the
      // hash chain; _id is monotonic per process and matches append order.
      const log = await Log.findOne(query)
        .sort({ _id: -1 })
        .lean();
      return log;
    } catch (error) {
      logger.error('Failed to get last log', error);
      throw error;
    }
  }

  async deleteOlderThan(days) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const result = await Log.deleteMany({ timestamp: { $lt: cutoffDate } });
      logger.info(`Deleted ${result.deletedCount} logs older than ${days} days`);
      return result;
    } catch (error) {
      logger.error('Failed to delete old logs', error);
      throw error;
    }
  }

  async getStats(service, options = {}) {
    try {
      const { startTime = null, endTime = null } = options;
      const query = { service };

      if (startTime || endTime) {
        query.timestamp = {};
        if (startTime) query.timestamp.$gte = new Date(startTime);
        if (endTime) query.timestamp.$lte = new Date(endTime);
      }

      const stats = await Log.aggregate([
        { $match: query },
        {
          $facet: {
            totalCount: [{ $count: 'count' }],
            requestCount: [
              { $match: { eventType: 'REQUEST' } },
              { $count: 'count' }
            ],
            responseCount: [
              { $match: { eventType: 'RESPONSE' } },
              { $count: 'count' }
            ],
            errorCount: [
              { $match: { 'response.statusCode': { $gte: 400 } } },
              { $count: 'count' }
            ],
            avgResponseTime: [
              { $match: { eventType: 'RESPONSE' } },
              { $group: { _id: null, avg: { $avg: '$response.responseTime' } } }
            ]
          }
        }
      ]);

      return stats[0];
    } catch (error) {
      logger.error('Failed to get stats', error);
      throw error;
    }
  }
}

module.exports = new LogRepository();
