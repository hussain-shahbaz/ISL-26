// Queue-based logging system - batches and sends logs to log service

const axios = require('axios');

class LogQueue {
  constructor(maxSize = 100, drainIntervalMs = 100, idleTimeoutMs = 50) {
    this.queue = [];
    this.maxSize = maxSize;
    this.drainIntervalMs = drainIntervalMs;
    this.idleTimeoutMs = idleTimeoutMs;  // Time to wait before flushing if idle
    this.isDraining = false;
    this.idleTimer = null;
    this.logServiceUrl = process.env.LOG_SERVICE_URL || 'http://localhost:3001/logs';
    this.serviceSecret = process.env.SERVICE_SECRET || 'supersecretkey';
    this.startDrainer();
  }

  add(logData) {
    this.queue.push(logData);
    
    // Clear existing idle timer
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }

    // If queue is full, drain immediately
    if (this.queue.length >= this.maxSize) {
      this.drain();
      return;
    }

    // Set new idle timer - drain if no new logs arrive within idleTimeoutMs
    this.idleTimer = setTimeout(() => {
      if (this.queue.length > 0) {
        this.drain();
      }
      this.idleTimer = null;
    }, this.idleTimeoutMs);
  }

  startDrainer() {
    // Fallback interval drain (backup mechanism)
    setInterval(() => {
      if (this.queue.length > 0 && !this.isDraining) {
        this.drain();
      }
    }, this.drainIntervalMs);
  }

  async drain() {
    if (this.isDraining || this.queue.length === 0) return;

    this.isDraining = true;
    const logsToSend = [...this.queue];
    this.queue = [];

    // Clear idle timer when draining
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }

    try {
      for (const log of logsToSend) {
        try {
          const response = await axios.post(this.logServiceUrl, log, {
            timeout: 5000,
            headers: {
              'x-service-secret': this.serviceSecret,
              'Content-Type': 'application/json'
            }
          });

          // Log non-2xx responses with full body for diagnostics
          if (!response || response.status >= 400) {
            console.error(`Log service responded with status=${response?.status}`);
            try {
              console.error('Response body:', JSON.stringify(response?.data, null, 2));
            } catch (e) {
              console.error('Response body (raw):', response?.data);
            }
            console.error('Original log payload:', JSON.stringify(log, null, 2));
          }
        } catch (error) {
          // Axios error — include response body when available for validation errors
          if (error.response) {
            console.error(`Failed to send log to ${this.logServiceUrl}: status=${error.response.status}`);
            try {
              console.error('Error response body:', JSON.stringify(error.response.data, null, 2));
            } catch (e) {
              console.error('Error response body (raw):', error.response.data);
            }
            console.error('Original log payload:', JSON.stringify(log, null, 2));
          } else {
            console.error(`Failed to send log to ${this.logServiceUrl}: ${error.message}`);
          }
          // Optionally re-add to queue on failure
          // this.queue.push(log);
        }
      }
    } finally {
      this.isDraining = false;
    }
  }

  size() {
    return this.queue.length;
  }

  // Graceful shutdown - drain remaining logs
  async shutdown() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    if (this.queue.length > 0) {
      await this.drain();
    }
  }
}

module.exports = new LogQueue();
