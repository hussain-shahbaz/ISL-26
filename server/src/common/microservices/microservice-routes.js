const express = require('express');
const axios = require('axios');

class MicroserviceRoutes {
  constructor() {
    this.router = express.Router();
    // Single shared service-to-service secret (see root .env.example).
    this.serviceSecret = process.env.SERVICE_SECRET || 'dev-service-secret';

    // Microservice endpoints configuration (normalized ports, env-driven).
    this.microservices = {
      exam: {
        baseUrl: process.env.EXAM_SERVICE_URL || 'http://localhost:3003',
        baseApiPath: '/api/exam'
      },
      studentExam: {
        baseUrl: process.env.STUDENT_EXAM_SERVICE_URL || 'http://localhost:3004',
        baseApiPath: '/api/v1/student-exam'
      },
      gradeCheat: {
        baseUrl: process.env.GRADE_CHEAT_SERVICE_URL || 'http://localhost:3005',
        baseApiPath: '/api'
      }
    };

    this._bindRoutes();
  }

  _bindRoutes() {
    // Route: /api/modules/exam/*
    this.router.use('/exam', this._createProxyHandler(this.microservices.exam));

    // Route: /api/modules/student-exam/*
    this.router.use('/student-exam', this._createProxyHandler(this.microservices.studentExam));

    // Route: /api/modules/grade-cheat/*
    this.router.use('/grade-cheat', this._createProxyHandler(this.microservices.gradeCheat));
  }

  /**
   * Creates a proxy handler middleware for a microservice
   * Strips /api/modules/:service prefix and forwards to microservice base API path
   */
  _createProxyHandler(service) {
    return async (req, res) => {
      try {
        // Build target URL: strip prefix, append microservice base path
        const targetPath = req.path; // e.g., /exams, /:id, /question/:examId
        const targetUrl = `${service.baseUrl}${service.baseApiPath}${targetPath}`;

        // Prepare request headers
        const headers = {
          ...req.headers,
          'x-service-secret': this.serviceSecret,
          'x-request-id': req.requestId || req.get('x-request-id') || `req-${Date.now()}`,
          'x-forwarded-from': 'main-server',
          'content-type': 'application/json'
        };

        // Strip hop-by-hop headers so axios recomputes them for the new body
        delete headers.host;
        delete headers['content-length'];
        delete headers.connection;

        // Make request to microservice
        const response = await axios({
          method: req.method,
          url: targetUrl,
          data: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
          params: req.query,
          headers: headers,
          validateStatus: () => true // Don't throw on any status code
        });

        // Return microservice response as-is
        res.status(response.status).json(response.data);
      } catch (error) {
        // Handle network or parsing errors with consistent format
        const errorResponse = this._formatErrorResponse(error);
        res.status(errorResponse.statusCode).json(errorResponse.body);
      }
    };
  }

  /**
   * Formats error responses in consistent format
   */
  _formatErrorResponse(error) {
    let statusCode = 500;
    let message = 'Internal server error';
    let details = null;

    if (error.code === 'ECONNREFUSED') {
      statusCode = 503;
      message = 'Service unavailable: Microservice is unreachable';
    } else if (error.code === 'ENOTFOUND') {
      statusCode = 503;
      message = 'Service unavailable: Microservice host not found';
    } else if (error.code === 'ETIMEDOUT') {
      statusCode = 504;
      message = 'Gateway timeout: Microservice request timed out';
    } else if (error.response) {
      statusCode = error.response.status || 500;
      message = error.response.data?.message || error.response.data?.error || message;
      details = error.response.data;
    } else if (error.message) {
      message = error.message;
    }

    return {
      statusCode,
      body: {
        success: false,
        error: message,
        statusCode,
        ...(details && { details })
      }
    };
  }

  getRouter() {
    return this.router;
  }
}

module.exports = new MicroserviceRoutes();
