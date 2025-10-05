// utils/logger.js
const winston = require('winston');
const path = require('path');
const fs = require('fs');

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '../logs');
    this._ensureLogDirectory();
    this.logger = this._createLogger();
  }

  /**
   * Create logs directory if it doesn't exist
   */
  _ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Create Winston logger instance
   */
  _createLogger() {
    const format = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
        
        if (stack) {
          log += `\n${stack}`;
        }
        
        if (Object.keys(meta).length > 0) {
          log += `\n${JSON.stringify(meta, null, 2)}`;
        }
        
        return log;
      })
    );

    const transports = [
      // File transport for errors
      new winston.transports.File({
        filename: path.join(this.logDir, 'error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5
      }),

      // File transport for all logs
      new winston.transports.File({
        filename: path.join(this.logDir, 'combined.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 5
      }),

      // Console transport for development
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ];

    return winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format,
      transports,
      exceptionHandlers: [
        new winston.transports.File({
          filename: path.join(this.logDir, 'exceptions.log')
        })
      ],
      rejectionHandlers: [
        new winston.transports.File({
          filename: path.join(this.logDir, 'rejections.log')
        })
      ]
    });
  }

  /**
   * Log info message
   */
  info(message, meta = {}) {
    this.logger.info(message, meta);
  }

  /**
   * Log warning message
   */
  warn(message, meta = {}) {
    this.logger.warn(message, meta);
  }

  /**
   * Log error message
   */
  error(message, meta = {}) {
    this.logger.error(message, meta);
  }

  /**
   * Log debug message
   */
  debug(message, meta = {}) {
    this.logger.debug(message, meta);
  }

  /**
   * Log HTTP request
   */
  http(req, res, responseTime) {
    const logData = {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userId: req.user?.id || 'anonymous'
    };

    if (res.statusCode >= 400) {
      this.warn('HTTP Request', logData);
    } else {
      this.info('HTTP Request', logData);
    }
  }

  /**
   * Log database query
   */
  db(query, collection, duration, success = true) {
    const logData = {
      collection,
      query: typeof query === 'string' ? query : JSON.stringify(query),
      duration: `${duration}ms`,
      success
    };

    if (success) {
      this.debug('Database Query', logData);
    } else {
      this.error('Database Query Failed', logData);
    }
  }

  /**
   * Log AI API call
   */
  ai(service, operation, duration, success = true, error = null) {
    const logData = {
      service,
      operation,
      duration: `${duration}ms`,
      success
    };

    if (error) {
      logData.error = error.message;
    }

    if (success) {
      this.info('AI API Call', logData);
    } else {
      this.error('AI API Call Failed', logData);
    }
  }

  /**
   * Log user activity
   */
  activity(userId, action, resource, details = {}) {
    const logData = {
      userId,
      action,
      resource,
      ...details,
      timestamp: new Date().toISOString()
    };

    this.info('User Activity', logData);
  }

  /**
   * Log performance metrics
   */
  performance(operation, duration, metrics = {}) {
    const logData = {
      operation,
      duration: `${duration}ms`,
      ...metrics
    };

    if (duration > 1000) { // Log slow operations as warnings
      this.warn('Slow Operation', logData);
    } else {
      this.debug('Performance Metric', logData);
    }
  }

  /**
   * Create child logger with additional context
   */
  child(context) {
    const childLogger = this.logger.child(context);
    return {
      info: (message, meta) => childLogger.info(message, { ...context, ...meta }),
      warn: (message, meta) => childLogger.warn(message, { ...context, ...meta }),
      error: (message, meta) => childLogger.error(message, { ...context, ...meta }),
      debug: (message, meta) => childLogger.debug(message, { ...context, ...meta })
    };
  }

  /**
   * Get log statistics
   */
  async getStats(timeframe = '24h') {
    try {
      const stats = {
        totalLogs: 0,
        byLevel: {},
        byService: {},
        errors: 0,
        warnings: 0
      };

      // This would typically query log storage or database
      // For file-based logging, we'd read and analyze log files
      
      return stats;
    } catch (error) {
      this.error('Failed to get log statistics', { error: error.message });
      return null;
    }
  }

  /**
   * Clean up old log files
   */
  async cleanupOldLogs(retentionDays = 30) {
    try {
      const files = fs.readdirSync(this.logDir);
      const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);

      for (const file of files) {
        const filePath = path.join(this.logDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtimeMs < cutoffTime) {
          fs.unlinkSync(filePath);
          this.info('Deleted old log file', { file });
        }
      }
    } catch (error) {
      this.error('Failed to cleanup old logs', { error: error.message });
    }
  }
}

// Create singleton instance
const logger = new Logger();

module.exports = logger;