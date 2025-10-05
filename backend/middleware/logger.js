// middleware/logger.js
const logger = require('../utils/logger');
const Helpers = require('../utils/helpers');

class LoggingMiddleware {
  /**
   * HTTP request logging
   */
  httpLogger(req, res, next) {
    const start = Date.now();

    // Log request
    logger.info('HTTP Request Started', {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?._id,
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
      body: this._sanitizeBody(req.body)
    });

    // Capture response
    const originalSend = res.send;
    res.send = function(data) {
      const duration = Date.now() - start;
      
      // Log response
      const logData = {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        userId: req.user?._id,
        responseSize: Buffer.byteLength(data, 'utf8')
      };

      if (res.statusCode >= 400) {
        logger.warn('HTTP Request Completed', logData);
      } else {
        logger.info('HTTP Request Completed', logData);
      }

      // Set response time header
      res.setHeader('X-Response-Time', `${duration}ms`);

      originalSend.call(this, data);
    };

    next();
  }

  /**
   * Database query logging
   */
  databaseLogger(mongoose) {
    mongoose.set('debug', (collectionName, method, query, doc) => {
      const duration = doc?.duration || 0;
      const logData = {
        collection: collectionName,
        method,
        query: Helpers.sanitizeInput(JSON.stringify(query)),
        duration: `${duration}ms`
      };

      if (duration > 100) { // Log slow queries as warnings
        logger.warn('Slow Database Query', logData);
      } else {
        logger.debug('Database Query', logData);
      }
    });
  }

  /**
   * AI service call logging
   */
  aiServiceLogger(serviceName) {
    return (operation, data) => {
      const logData = {
        service: serviceName,
        operation,
        ...data
      };

      if (data.error) {
        logger.error('AI Service Error', logData);
      } else if (data.duration > 5000) { // 5 seconds
        logger.warn('Slow AI Service Call', logData);
      } else {
        logger.info('AI Service Call', logData);
      }
    };
  }

  /**
   * User activity logging
   */
  userActivityLogger(req, res, next) {
    if (req.user) {
      const activity = {
        userId: req.user._id,
        action: this._getActionFromRoute(req),
        resource: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      };

      logger.activity(req.user._id, activity.action, activity.resource, activity);
    }

    next();
  }

  /**
   * Performance monitoring
   */
  performanceMonitor(req, res, next) {
    const start = process.hrtime();

    res.on('finish', () => {
      const [seconds, nanoseconds] = process.hrtime(start);
      const duration = seconds * 1000 + nanoseconds / 1000000;

      logger.performance(req.originalUrl, duration, {
        method: req.method,
        statusCode: res.statusCode,
        userId: req.user?._id
      });
    });

    next();
  }

  /**
   * Security event logging
   */
  securityLogger(req, res, next) {
    // Log potential security events
    const securityEvents = [
      { condition: req.body && Object.keys(req.body).length > 10000, type: 'LARGE_REQUEST_BODY' },
      { condition: req.originalUrl.length > 1000, type: 'LONG_URL' },
      { condition: req.get('User-Agent')?.includes('bot') && !req.get('User-Agent')?.includes('Google'), type: 'SUSPICIOUS_USER_AGENT' }
    ];

    securityEvents.forEach(event => {
      if (event.condition) {
        logger.warn('Security event detected', {
          type: event.type,
          ip: req.ip,
          url: req.originalUrl,
          userAgent: req.get('User-Agent')
        });
      }
    });

    next();
  }

  /**
   * Cache operation logging
   */
  cacheLogger(operation, key, hit = null, duration = null) {
    const logData = {
      operation,
      key: Helpers.sanitizeInput(key),
      duration: duration ? `${duration}ms` : undefined
    };

    if (hit !== null) {
      logData.hit = hit;
      logger.debug('Cache operation', logData);
    } else {
      logger.debug('Cache operation', logData);
    }
  }

  /**
   * Error context enrichment
   */
  errorContextEnricher(error, req) {
    return {
      ...error,
      context: {
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userId: req.user?._id,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Sanitize request body for logging
   */
  _sanitizeBody(body) {
    if (!body || typeof body !== 'object') return body;

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'authorization', 'creditCard', 'ssn'];

    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    });

    return sanitized;
  }

  /**
   * Extract action from route for activity logging
   */
  _getActionFromRoute(req) {
    const route = req.originalUrl;
    const method = req.method;

    if (route.includes('/auth/login')) return 'LOGIN';
    if (route.includes('/auth/register')) return 'REGISTER';
    if (route.includes('/auth/logout')) return 'LOGOUT';
    if (route.includes('/tests') && method === 'POST') return 'CREATE_TEST';
    if (route.includes('/tests') && method === 'GET') return 'VIEW_TEST';
    if (route.includes('/questions') && method === 'POST') return 'CREATE_QUESTION';
    if (route.includes('/flashcards') && method === 'GET') return 'VIEW_FLASHCARDS';
    if (route.includes('/progress') && method === 'GET') return 'VIEW_PROGRESS';

    return `${method}_${route.split('/')[1]?.toUpperCase() || 'UNKNOWN'}`;
  }

  /**
   * Request ID middleware for tracing
   */
  requestId(req, res, next) {
    const requestId = Helpers.generateId('req');
    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
  }

  /**
   * Correlation ID middleware for distributed tracing
   */
  correlationId(req, res, next) {
    const correlationId = req.headers['x-correlation-id'] || Helpers.generateId('corr');
    req.correlationId = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);
    next();
  }
}

module.exports = new LoggingMiddleware();