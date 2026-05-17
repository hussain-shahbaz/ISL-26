// Hash utilities for hash chain cryptography

const crypto = require('crypto');
const config = require('../config/config');

module.exports = {
  generateHash: (data) => {
    return crypto
      .createHash(config.HASH_ALGORITHM)
      .update(data)
      .digest('hex');
  },

  generateGenesisHash: (serviceName) => {
    const data = `${config.GENESIS_MARKER}-${serviceName}-${Date.now()}`;
    return crypto
      .createHash(config.HASH_ALGORITHM)
      .update(data)
      .digest('hex');
  },

  calculateLogHash: (previousHash, logData) => {
    const dataString = typeof logData === 'string' ? logData : JSON.stringify(logData);
    return crypto
      .createHash(config.HASH_ALGORITHM)
      .update(previousHash + dataString)
      .digest('hex');
  },

  verifyHash: (previousHash, logData, currentHash) => {
    const expectedHash = module.exports.calculateLogHash(previousHash, logData);
    return expectedHash === currentHash;
  },

  verifyChain: (logs) => {
    if (!logs || logs.length === 0) {
      return { valid: true, logsVerified: 0 };
    }

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      if (!log.currentHash || !log.previousHash) {
        return {
          valid: false,
          brokenAt: i,
          error: 'Missing hash in log',
        };
      }

      if (i > 0) {
        const previousLog = logs[i - 1];
        if (log.previousHash !== previousLog.currentHash) {
          return {
            valid: false,
            brokenAt: i,
            error: 'Hash chain continuity broken',
            expected: previousLog.currentHash,
            actual: log.previousHash,
          };
        }
      }
    }

    return {
      valid: true,
      logsVerified: logs.length,
      genesisHash: logs[0].previousHash,
      finalHash: logs[logs.length - 1].currentHash,
    };
  },
};
