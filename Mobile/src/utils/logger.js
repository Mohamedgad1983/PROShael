/**
 * Frontend Logger Utility for Al-Shuail Mobile PWA
 *
 * Provides structured logging with environment-aware output
 * - Development: Full console logging
 * - Production: Silent or remote logging only
 *
 * @module utils/logger
 */

class Logger {
  constructor() {
    this.isDevelopment = import.meta.env?.MODE === 'development' ||
                         window.location.hostname === 'localhost' ||
                         window.location.hostname === '127.0.0.1';
    this.isProduction = !this.isDevelopment;

    // Log levels
    this.levels = {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3
    };

    // Current log level (configurable)
    this.currentLevel = this.isDevelopment ? this.levels.DEBUG : this.levels.ERROR;
  }

  /**
   * Format log message with timestamp and context
   * @private
   */
  formatMessage(level, message, context = {}) {
    const timestamp = new Date().toISOString();
    return {
      timestamp,
      level,
      message,
      ...context
    };
  }

  /**
   * Log debug message (development only)
   * @param {string} message - Log message
   * @param {Object} context - Additional context
   */
  debug(message, context = {}) {
    if (this.currentLevel <= this.levels.DEBUG && this.isDevelopment) {
      console.debug('[DEBUG]', message, context);
    }
  }

  /**
   * Log info message
   * @param {string} message - Log message
   * @param {Object} context - Additional context
   */
  info(message, context = {}) {
    if (this.currentLevel <= this.levels.INFO) {
      if (this.isDevelopment) {
        console.log('[INFO]', message, context);
      }
      // In production, could send to remote logging service
    }
  }

  /**
   * Log warning message
   * @param {string} message - Log message
   * @param {Object} context - Additional context
   */
  warn(message, context = {}) {
    if (this.currentLevel <= this.levels.WARN) {
      console.warn('[WARN]', message, context);
      // In production, could send to remote logging service
    }
  }

  /**
   * Log error message
   * @param {string} message - Log message
   * @param {Object} context - Additional context
   */
  error(message, context = {}) {
    if (this.currentLevel <= this.levels.ERROR) {
      console.error('[ERROR]', message, context);
      // In production, should send to remote logging service
      this.sendToRemoteLogger('error', message, context);
    }
  }

  /**
   * Send log to remote logging service (production)
   * @private
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} context - Additional context
   */
  sendToRemoteLogger(level, message, context) {
    if (!this.isProduction) return;

    // TODO: Implement remote logging (e.g., Sentry, LogRocket, custom endpoint)
    // Example:
    // fetch('/api/logs', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(this.formatMessage(level, message, context))
    // }).catch(() => {}); // Silent fail for logging
  }

  /**
   * Group related logs (development only)
   * @param {string} label - Group label
   * @param {Function} callback - Function containing grouped logs
   */
  group(label, callback) {
    if (this.isDevelopment) {
      console.group(label);
      callback();
      console.groupEnd();
    }
  }

  /**
   * Log performance measurement
   * @param {string} label - Performance label
   * @param {number} startTime - Performance start time
   */
  performance(label, startTime) {
    const duration = performance.now() - startTime;
    this.debug(`⚡ Performance: ${label}`, { duration: `${duration.toFixed(2)}ms` });
  }
}

// Export singleton instance
const logger = new Logger();
export default logger;
