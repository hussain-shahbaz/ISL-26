// Request/Response logging middleware - captures and queues logs

const { v4: uuidv4 } = require('uuid');
const LogQueue = require('../queue/log-queue');

const loggerMiddleware = (req, res, next) => {
  const requestId = req.get('x-request-id') || uuidv4();
  const requestStartTime = Date.now();

  req.requestId = requestId;
  req.startTime = requestStartTime;

  const originalSend = res.send;
  res.send = function (data) {
    const responseTime = Date.now() - requestStartTime;
    const service = req.get('x-service') || process.env.SERVICE_NAME || 'main-server';
    const environment = process.env.NODE_ENV || 'development';
    const userId = req.get('x-user-id') || null;
    

    // Log REQUEST
    const requestLog = {
      service,
      environment,
      eventType: 'REQUEST',
      requestId,
      userId,
      timestamp: new Date(req.startTime).toISOString(),
      request: {
        method: req.method,
        path: req.path,
        url: req.originalUrl,
        headers: req.headers,
        query: req.query,
        body: req.body,
      },
    };
    LogQueue.add(requestLog);


    // Log RESPONSE
    let responseBody = data;
    try {
      if (typeof data === 'string') {
        responseBody = JSON.parse(data);
      }
    } catch (error) {
      // Keep original if not JSON
    }

    const responseLog = {
      service,
      environment,
      eventType: 'RESPONSE',
      requestId,
      userId,
      timestamp: new Date().toISOString(),
      response: {
        statusCode: res.statusCode,
        headers: res.getHeaders(),
        body: responseBody,
        responseTime,
      },
    };

    LogQueue.add(responseLog);

    return originalSend.call(this, data);
  };

  next();
};

module.exports = loggerMiddleware;
