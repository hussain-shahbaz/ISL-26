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
          await axios.post(this.logServiceUrl, log, {
            timeout: 5000,
          });
        } catch (error) {
          console.error(`Failed to send log to ${this.logServiceUrl}: ${error.message}`);
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
