// Create log DTO - validates and sanitizes incoming log data

const sanitizer = require('../utils/sanitizer');
const constants = require('../utils/constants');
const config = require('../config/config');

class CreateLogDTO {
  constructor(data) {
    this.eventType = data.eventType;
    this.requestId = data.requestId;
    this.service = data.service;
    this.environment = data.environment;
    this.request = data.request;
    this.response = data.response;
    this.error = data.error;
    this.metadata = data.metadata;
  }

  validate() {
    const errors = [];

    if (!this.eventType || !Object.values(constants.EVENT_TYPES).includes(this.eventType)) {
      errors.push('eventType must be REQUEST or RESPONSE');
    }

    if (!this.requestId || typeof this.requestId !== 'string') {
      errors.push('requestId is required and must be a string');
    }

    if (!this.service || typeof this.service !== 'string') {
      errors.push('service is required and must be a string');
    }

    if (this.environment && !Object.values(constants.ENVIRONMENTS).includes(this.environment)) {
      errors.push('environment must be production, development, or testing');
    }

    if (this.eventType === constants.EVENT_TYPES.REQUEST) {
      if (!this.request || typeof this.request !== 'object') {
        errors.push('request data is required for REQUEST events');
      }
      if (this.request?.method && !constants.HTTP_METHODS.includes(this.request.method)) {
        errors.push('invalid HTTP method');
      }
    }

    if (this.eventType === constants.EVENT_TYPES.RESPONSE) {
      if (!this.response || typeof this.response !== 'object') {
        errors.push('response data is required for RESPONSE events');
      }
      if (this.response?.statusCode && (this.response.statusCode < 100 || this.response.statusCode > 599)) {
        errors.push('statusCode must be between 100 and 599');
      }
    }

    return errors;
  }

  sanitize() {
    if (this.request) {
      this.request = sanitizer.sanitizeRequest(this.request);
    }
    if (this.response) {
      this.response = sanitizer.sanitizeResponse(this.response);
    }
    if (this.error) {
      this.error = sanitizer.sanitize(this.error);
    }
    return this;
  }

  toObject() {
    return {
      eventType: this.eventType,
      requestId: this.requestId,
      service: this.service,
      environment: this.environment,
      request: this.request,
      response: this.response,
      error: this.error,
      metadata: this.metadata,
    };
  }
}

module.exports = CreateLogDTO;
