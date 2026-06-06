const logger = require('../utils/logger');
const config = require('../config/config');
class ServiceAuthMiddleware {
  verify(req, res, next) {
    const secret = req.headers['x-service-secret'];
    if (!secret || secret !== config.SERVICE_SECRET) {
      return res.status(403).json({ 
        status:  'error', 
        message: 'Unauthorized service call' 
      });
    }

    next();
  }
}

module.exports = new ServiceAuthMiddleware();