// Log Schema - Separate linked documents for REQUEST/RESPONSE with hash chain integrity

const mongoose = require('mongoose');
const crypto = require('crypto');

const logSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      enum: ['REQUEST', 'RESPONSE'],
      required: true,
      index: true
    },

    requestId: {
      type: String,
      required: true,
      index: true,
      sparse: true
    },

    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    },

    service: {
      type: String,
      required: true,
      index: true,
      trim: true
    },

    environment: {
      type: String,
      enum: ['production', 'development', 'testing'],
      default: process.env.NODE_ENV || 'development'
    },

    request: {
      type: {
        method: {
          type: String,
          enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']
        },
        url: String,
        path: String,
        query: { type: Object, default: {} },
        params: { type: Object, default: {} },
        headers: Object, // sanitize before saving
        body: Object, // sanitize before saving
        ip: String,
        userId: { type: String, index: true },
        userAgent: String
      },
      default: {}
    },

    response: {
      type: {
        statusCode: Number,
        responseTime: { type: Number, min: 0 },
        body: Object
      },
      default: {}
    },

    error: {
      type: {
        message: String,
        stack: String,
        code: String
      },
      default: null
    },

    previousHash: {
      type: String,
      required: true
    },

    currentHash: {
      type: String,
      required: true,
      unique: false,
      index: true
    },

    metadata: {
      type: {
        processId: Number,
        nodeVersion: String,
        customData: Object
      },
      default: {}
    }
  },
  { timestamps: true, collection: 'logs' }
);

// Compound indexes for query optimization
logSchema.index({ requestId: 1, timestamp: 1 });
logSchema.index({ service: 1, eventType: 1, timestamp: -1 });
logSchema.index({ 'response.statusCode': 1, timestamp: -1 });
logSchema.index({ 'request.userId': 1, timestamp: -1 });
logSchema.index({ service: 1, currentHash: 1 });
logSchema.index({ eventType: 1, timestamp: -1 });

// Pre-save: Calculate hash for immutability proof
logSchema.pre('save', async function (next) {
  try {
    if (!this.currentHash) {
      const logData = JSON.stringify({
        eventType: this.eventType,
        requestId: this.requestId,
        timestamp: this.timestamp,
        service: this.service,
        environment: this.environment,
        request: this.request || {},
        response: this.response || {},
        error: this.error || {},
        metadata: this.metadata || {}
      });

      this.currentHash = crypto
        .createHash('sha256')
        .update(this.previousHash + logData)
        .digest('hex');
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method: Verify hash integrity
logSchema.methods.verifyHash = () => {
  if (!this.currentHash || !this.previousHash) return false;

  const logData = JSON.stringify({
    eventType: this.eventType,
    requestId: this.requestId,
    timestamp: this.timestamp,
    service: this.service,
    environment: this.environment,
    request: this.request || {},
    response: this.response || {},
    error: this.error || {},
    metadata: this.metadata || {}
  });

  const expectedHash = crypto
    .createHash('sha256')
    .update(this.previousHash + logData)
    .digest('hex');

  return expectedHash === this.currentHash;
};

// Instance method: Get summary
logSchema.methods.getSummary = function () {
  return {
    logId: this._id,
    eventType: this.eventType,
    requestId: this.requestId,
    timestamp: this.timestamp,
    service: this.service,
    method: this.request?.method,
    url: this.request?.url,
    statusCode: this.response?.statusCode,
    responseTime: this.response?.responseTime,
    hash: this.currentHash.substring(0, 16) + '...'
  };
};

// Static method: Generate genesis hash
logSchema.statics.generateGenesisHash = function (serviceName) {
  const genesisData = `genesis-${serviceName}-${Date.now()}`;
  return crypto.createHash('sha256').update(genesisData).digest('hex');
};

module.exports = mongoose.model('Log', logSchema);