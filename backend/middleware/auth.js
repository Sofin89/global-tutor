// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Response = require('../utils/response');
const logger = require('../utils/logger');
const cache = require('../utils/cache');

class AuthMiddleware {
  /**
   * Verify JWT token and attach user to request
   */
  async authenticate(req, res, next) {
    try {
      const token = this._extractToken(req);
      
      if (!token) {
        return Response.sendError(res, 'Access token required', 'MISSING_TOKEN', null, 401);
      }

      // Check cache first for user data
      const cachedUser = cache.get('user', `token:${token}`);
      if (cachedUser) {
        req.user = cachedUser;
        logger.debug('User authenticated from cache', { userId: cachedUser.id });
        return next();
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Fetch fresh user data
      const user = await User.findById(decoded.id)
        .select('-password')
        .lean();
      
      if (!user) {
        return Response.sendError(res, 'User not found', 'USER_NOT_FOUND', null, 401);
      }

      if (user.status !== 'active') {
        return Response.sendError(res, 'Account is not active', 'ACCOUNT_INACTIVE', null, 403);
      }

      // Cache user data for 15 minutes
      cache.set('user', `token:${token}`, user, 900);
      
      req.user = user;
      logger.debug('User authenticated successfully', { userId: user._id });
      next();
    } catch (error) {
      logger.error('Authentication failed', { error: error.message });
      
      if (error.name === 'JsonWebTokenError') {
        return Response.sendError(res, 'Invalid token', 'INVALID_TOKEN', null, 401);
      }
      
      if (error.name === 'TokenExpiredError') {
        return Response.sendError(res, 'Token expired', 'TOKEN_EXPIRED', null, 401);
      }
      
      return Response.sendError(res, 'Authentication failed', 'AUTH_FAILED', null, 401);
    }
  }

  /**
   * Optional authentication - doesn't fail if no token
   */
  async authenticateOptional(req, res, next) {
    try {
      const token = this._extractToken(req);
      
      if (!token) {
        req.user = null;
        return next();
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id)
        .select('-password')
        .lean();
      
      if (user && user.status === 'active') {
        req.user = user;
      } else {
        req.user = null;
      }
      
      next();
    } catch (error) {
      // Don't fail for optional auth, just set user to null
      req.user = null;
      next();
    }
  }

  /**
   * Require specific user roles
   */
  requireRoles(roles) {
    return (req, res, next) => {
      if (!req.user) {
        return Response.sendError(res, 'Authentication required', 'AUTH_REQUIRED', null, 401);
      }

      if (!roles.includes(req.user.role)) {
        logger.warn('Insufficient permissions', { 
          userId: req.user._id, 
          role: req.user.role, 
          required: roles 
        });
        return Response.sendError(res, 'Insufficient permissions', 'FORBIDDEN', null, 403);
      }

      next();
    };
  }

  /**
   * Require email verification
   */
  requireVerifiedEmail(req, res, next) {
    if (!req.user) {
      return Response.sendError(res, 'Authentication required', 'AUTH_REQUIRED', null, 401);
    }

    if (!req.user.isEmailVerified) {
      return Response.sendError(res, 'Email verification required', 'EMAIL_VERIFICATION_REQUIRED', null, 403);
    }

    next();
  }

  /**
   * Rate limiting by user ID
   */
  rateLimitByUser(requestsPerMinute = 60) {
    const rateLimitMap = new Map();

    return (req, res, next) => {
      if (!req.user) {
        return next(); // Skip rate limiting for unauthenticated requests
      }

      const userId = req.user._id.toString();
      const now = Date.now();
      const windowMs = 60 * 1000; // 1 minute

      if (!rateLimitMap.has(userId)) {
        rateLimitMap.set(userId, {
          count: 0,
          resetTime: now + windowMs
        });
      }

      const userRateLimit = rateLimitMap.get(userId);

      // Reset counter if window has passed
      if (now > userRateLimit.resetTime) {
        userRateLimit.count = 0;
        userRateLimit.resetTime = now + windowMs;
      }

      // Check if rate limit exceeded
      if (userRateLimit.count >= requestsPerMinute) {
        logger.warn('Rate limit exceeded', { userId, requestsPerMinute });
        return Response.sendError(
          res, 
          'Rate limit exceeded', 
          'RATE_LIMIT_EXCEEDED', 
          { 
            retryAfter: Math.ceil((userRateLimit.resetTime - now) / 1000),
            limit: requestsPerMinute,
            window: '1 minute'
          }, 
          429
        );
      }

      // Increment counter
      userRateLimit.count++;

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', requestsPerMinute);
      res.setHeader('X-RateLimit-Remaining', requestsPerMinute - userRateLimit.count);
      res.setHeader('X-RateLimit-Reset', Math.ceil(userRateLimit.resetTime / 1000));

      next();
    };
  }

  /**
   * Generate JWT token
   */
  generateToken(user) {
    const payload = {
      id: user._id,
      email: user.email,
      role: user.role
    };

    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      issuer: 'ai-global-tutor',
      subject: user._id.toString()
    });
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(user) {
    const payload = {
      id: user._id,
      type: 'refresh'
    };

    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
      issuer: 'ai-global-tutor'
    });
  }

  /**
   * Verify refresh token
   */
  async verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      const user = await User.findById(decoded.id);
      if (!user || user.status !== 'active') {
        throw new Error('User not found or inactive');
      }

      return user;
    } catch (error) {
      throw new Error(`Refresh token verification failed: ${error.message}`);
    }
  }

  /**
   * Extract token from request
   */
  _extractToken(req) {
    // From Authorization header
    if (req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        return parts[1];
      }
    }

    // From query parameter
    if (req.query.token) {
      return req.query.token;
    }

    // From cookies
    if (req.cookies && req.cookies.accessToken) {
      return req.cookies.accessToken;
    }

    return null;
  }

  /**
   * Logout user by invalidating token
   */
  async logout(req, res) {
    try {
      const token = this._extractToken(req);
      if (token) {
        // Add token to blacklist cache for remaining TTL
        const decoded = jwt.decode(token);
        if (decoded && decoded.exp) {
          const ttl = Math.max(0, decoded.exp - Math.floor(Date.now() / 1000));
          cache.set('blacklist', token, true, ttl);
        }
      }

      // Clear user cache
      if (req.user) {
        cache.user.clear(req.user._id.toString());
      }

      logger.info('User logged out successfully', { userId: req.user?._id });
      return Response.sendSuccess(res, null, 'Logged out successfully');
    } catch (error) {
      logger.error('Logout failed', { error: error.message });
      return Response.sendError(res, 'Logout failed', 'LOGOUT_FAILED', null, 500);
    }
  }

  /**
   * Check if token is blacklisted
   */
  async isTokenBlacklisted(token) {
    return cache.has('blacklist', token);
  }

  /**
   * Middleware to check blacklisted tokens
   */
  async checkTokenBlacklist(req, res, next) {
    try {
      const token = this._extractToken(req);
      if (token && await this.isTokenBlacklisted(token)) {
        return Response.sendError(res, 'Token has been invalidated', 'TOKEN_BLACKLISTED', null, 401);
      }
      next();
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthMiddleware();
