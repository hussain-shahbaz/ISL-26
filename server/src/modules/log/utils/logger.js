// Module logger - logs internal module events

const config = require('../config/config');
const constants = require('./constants');

const PREFIX = '[LOG-SERVICE]';
const LOG_LEVEL_PRIORITY = {
  [constants.LOG_LEVELS.DEBUG]: 0,
  [constants.LOG_LEVELS.INFO]: 1,
  [constants.LOG_LEVELS.WARN]: 2,
  [constants.LOG_LEVELS.ERROR]: 3,
};

const currentLevel = LOG_LEVEL_PRIORITY[config.LOG_LEVEL] || 1;

const shouldLog = (level) => LOG_LEVEL_PRIORITY[level] >= currentLevel;

module.exports = {
  debug: (message, data) => {
    if (shouldLog(constants.LOG_LEVELS.DEBUG)) {
      console.log(`${PREFIX} [DEBUG]`, message, data || '');
    }
  },

  info: (message, data) => {
    if (shouldLog(constants.LOG_LEVELS.INFO)) {
      console.log(`${PREFIX} [INFO]`, message, data || '');
    }
  },

  warn: (message, data) => {
    if (shouldLog(constants.LOG_LEVELS.WARN)) {
      console.warn(`${PREFIX} [WARN]`, message, data || '');
    }
  },

  error: (message, error) => {
    if (shouldLog(constants.LOG_LEVELS.ERROR)) {
      console.error(`${PREFIX} [ERROR]`, message, error?.message || error || '');
    }
  },
};
