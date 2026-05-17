// Sanitize sensitive data from logs before storage

const config = require('../config/config');

const SENSITIVE_PATTERNS = config.SENSITIVE_FIELD_PATTERNS.map(p => p.toLowerCase());
const HEADERS_TO_REDACT = config.HEADERS_SANITIZE_VALUES;

function isSensitiveField(key) {
  const keyLower = key.toLowerCase();
  return SENSITIVE_PATTERNS.some(pattern => keyLower.includes(pattern));
}

function sanitizeObject(obj, depth = 0) {
  if (depth > 10 || obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1));
  }

  const sanitized = {};

  for (const [key, value] of Object.entries(obj)) {
    const keyLower = key.toLowerCase();

    if (isSensitiveField(key)) {
      continue; // Skip sensitive fields
    }

    if (HEADERS_TO_REDACT[keyLower]) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

module.exports = {
  sanitize: (data) => {
    if (!data || typeof data !== 'object') return data;
    return sanitizeObject(data);
  },

  sanitizeRequest: (request) => {
    if (!request) return request;
    return {
      ...request,
      headers: sanitizeObject(request.headers),
      body: sanitizeObject(request.body),
      query: sanitizeObject(request.query),
    };
  },

  sanitizeResponse: (response) => {
    if (!response) return response;
    return {
      ...response,
      body: sanitizeObject(response.body),
    };
  },
};
