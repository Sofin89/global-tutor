// middleware/security.js
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');
const logger = require('../utils/logger');

class SecurityMiddleware {
  /**
   * Apply Helmet security headers
   */
  helmetConfig() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'", process.env.APP_URL || "http://localhost:3000"]
        }
      },
      crossOriginEmbedderPolicy: false // Disable for CDN resources
    });
  }

  /**
   * CORS configuration
   */
  corsConfig() {
    const corsOptions = {
      origin: (origin, callback) => {
        const allowedOrigins = [
          process.env.FRONTEND_URL || 'http://localhost:3000',
          'https://ai-global-tutor.vercel.app',
          'https://*.vercel.app'
        ];

        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.some(allowedOrigin => 
          origin === allowedOrigin || 
          allowedOrigin.includes('*') && origin.endsWith(allowedOrigin.split('*')[1])
        )) {
          callback(null, true);
        } else {
          logger.warn('CORS violation attempt', { origin });
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-Request-ID',
        'X-Correlation-ID'
      ],
      maxAge: 86400 // 24 hours
    };

    return cors(corsOptions);
  }

  /**
   * Rate limiting configuration
   */
  rateLimitConfig() {
    const generalLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: {
        error: 'Too many requests from this IP, please try again later.'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Rate limit exceeded', {
          ip: req.ip,
          url: req.originalUrl,
          method: req.method
        });
        
        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests from this IP, please try again later.',
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
          }
        });
      }
    });

    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // Limit each IP to 5 login attempts per windowMs
      message: {
        error: 'Too many authentication attempts, please try again later.'
      },
      skipSuccessfulRequests: true // Don't count successful logins
    });

    const aiLimiter = rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 10, // Limit each user to 10 AI requests per minute
      keyGenerator: (req) => req.user?._id || req.ip,
      message: {
        error: 'Too many AI requests, please slow down.'
      }
    });

    return {
      general: generalLimiter,
      auth: authLimiter,
      ai: aiLimiter
    };
  }

  /**
   * Rate slowing configuration
   */
  rateSlowDown() {
    return slowDown({
      windowMs: 15 * 60 * 1000, // 15 minutes
      delayAfter: 50, // Allow 50 requests per 15 minutes without slowing
      delayMs: 100, // Add 100ms delay per request after delayAfter
      maxDelayMs: 2000 // Maximum delay of 2 seconds
    });
  }

  /**
   * Data sanitization against NoSQL query injection
   */
  noSqlSanitization() {
    return mongoSanitize({
      replaceWith: '_',
      onSanitize: ({ key, req }) => {
        logger.warn('NoSQL injection attempt detected', {
          key,
          ip: req.ip,
          url: req.originalUrl
        });
      }
    });
  }

  /**
   * Data sanitization against XSS attacks
   */
  xssSanitization() {
    return xss({
      whiteList: {}, // empty means no HTML allowed
      stripIgnoreTag: true, // filter out all HTML not in the whitelist
      stripIgnoreTagBody: ['script'] // filter out script tags completely
    });
  }

  /**
   * Prevent parameter pollution
   */
  parameterPollution() {
    return hpp({
      whitelist: [
        'page',
        'limit',
        'sort',
        'fields',
        'examType',
        'subject',
        'difficulty'
      ]
    });
  }

  /**
   * Security headers middleware
   */
  securityHeaders() {
    return (req, res, next) => {
      // Remove sensitive headers
      res.removeHeader('X-Powered-By');
      
      // Add security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
      
      // Cache control for sensitive routes
      if (req.path.includes('/auth') || req.path.includes('/api')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }

      next();
    };
  }

  /**
   * Request size limiting
   */
  requestSizeLimit() {
    return (req, res, next) => {
      const contentLength = parseInt(req.headers['content-length'] || '0');
      
      if (contentLength > 10 * 1024 * 1024) { // 10MB limit
        logger.warn('Request size limit exceeded', {
          size: contentLength,
          ip: req.ip,
          url: req.originalUrl
        });
        
        return res.status(413).json({
          success: false,
          error: {
            code: 'REQUEST_TOO_LARGE',
            message: 'Request body too large'
          }
        });
      }

      next();
    };
  }

  /**
   * IP address filtering
   */
  ipFilter(allowedIPs = []) {
    return (req, res, next) => {
      const clientIP = req.ip;
      
      if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
        logger.warn('IP address not allowed', { ip: clientIP });
        return res.status(403).json({
          success: false,
          error: {
            code: 'IP_NOT_ALLOWED',
            message: 'Access from your IP address is not allowed'
          }
        });
      }

      next();
    };
  }

  /**
   * User agent validation
   */
  userAgentValidation() {
    return (req, res, next) => {
      const userAgent = req.get('User-Agent');
      
      // Block known malicious user agents
      const blockedAgents = [
        'sqlmap',
        'nikto',
        'metasploit',
        'havij',
        'zap'
      ];

      if (blockedAgents.some(agent => userAgent.toLowerCase().includes(agent))) {
        logger.warn('Blocked malicious user agent', { userAgent, ip: req.ip });
        return res.status(403).json({
          success: false,
          error: {
            code: 'BLOCKED_USER_AGENT',
            message: 'Access denied'
          }
        });
      }

      next();
    };
  }

  /**
   * API key authentication for internal services
   */
  apiKeyAuth(validKeys = []) {
    return (req, res, next) => {
      const apiKey = req.headers['x-api-key'];
      
      if (!apiKey) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'API_KEY_REQUIRED',
            message: 'API key is required'
          }
        });
      }

      if (!validKeys.includes(apiKey)) {
        logger.warn('Invalid API key attempt', { ip: req.ip });
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_API_KEY',
            message: 'Invalid API key'
          }
        });
      }

      next();
    };
  }

  /**
   * Request logging for security monitoring
   */
  securityMonitoring() {
    return (req, res, next) => {
      const securityEvents = [];

      // Check for SQL injection patterns
      const sqlInjectionPatterns = [
        /(\bUNION\b.*\bSELECT\b)/i,
        /(\bDROP\b.*\bTABLE\b)/i,
        /(\bINSERT\b.*\bINTO\b)/i,
        /(\bDELETE\b.*\bFROM\b)/i,
        /(\bUPDATE\b.*\bSET\b)/i,
        /(';\s*(DROP|DELETE|UPDATE|INSERT))/i
      ];

      const checkForInjection = (value) => {
        if (typeof value === 'string') {
          return sqlInjectionPatterns.some(pattern => pattern.test(value));
        }
        return false;
      };

      // Check request body, query, and params
      if (checkForInjection(JSON.stringify(req.body)) ||
          checkForInjection(JSON.stringify(req.query)) ||
          checkForInjection(JSON.stringify(req.params))) {
        securityEvents.push('SQL_INJECTION_ATTEMPT');
      }

      // Check for path traversal
      if (req.originalUrl.includes('../') || req.originalUrl.includes('..\\')) {
        securityEvents.push('PATH_TRAVERSAL_ATTEMPT');
      }

      // Log security events
      if (securityEvents.length > 0) {
        logger.warn('Security event detected', {
          events: securityEvents,
          ip: req.ip,
          url: req.originalUrl,
          method: req.method,
          userAgent: req.get('User-Agent')
        });
      }

      next();
    };
  }

  /**
   * Session security configuration
   */
  sessionSecurity() {
    return (req, res, next) => {
      if (req.session) {
        // Regenerate session ID on authentication
        if (req.path.includes('/auth/login') && req.method === 'POST') {
          req.session.regenerate((err) => {
            if (err) {
              logger.error('Session regeneration failed', { error: err.message });
            }
          });
        }

        // Set secure session options
        if (req.session.cookie) {
          req.session.cookie.secure = process.env.NODE_ENV === 'production';
          req.session.cookie.httpOnly = true;
          req.session.cookie.sameSite = 'strict';
        }
      }

      next();
    };
  }
}

module.exports = new SecurityMiddleware();