// middleware/performance.js
const compression = require('compression');
const logger = require('../utils/logger');
const cache = require('../utils/cache');

class PerformanceMiddleware {
  /**
   * Response compression
   */
  compression() {
    return compression({
      level: 6,
      threshold: 1024, // Only compress responses larger than 1KB
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      }
    });
  }

  /**
   * Response caching middleware
   */
  responseCache(ttl = 300) { // 5 minutes default
    return (req, res, next) => {
      // Only cache GET requests
      if (req.method !== 'GET') {
        return next();
      }

      // Don't cache authenticated requests unless explicitly allowed
      if (req.user && !req.headers['x-cache-auth']) {
        return next();
      }

      const cacheKey = `response:${req.originalUrl}`;
      const cachedResponse = cache.get('response', cacheKey);

      if (cachedResponse) {
        logger.debug('Response cache hit', { url: req.originalUrl });
        
        // Set cache headers
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', cacheKey);
        
        return res.json(cachedResponse);
      }

      // Override res.json to cache response
      const originalJson = res.json;
      res.json = function(data) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cache.set('response', cacheKey, data, ttl);
          logger.debug('Response cached', { 
            url: req.originalUrl, 
            ttl,
            size: JSON.stringify(data).length 
          });
        }

        // Set cache headers
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('X-Cache-Key', cacheKey);
        res.setHeader('Cache-Control', `public, max-age=${ttl}`);

        originalJson.call(this, data);
      };

      next();
    };
  }

  /**
   * Database query optimization hints
   */
  queryOptimization() {
    return (req, res, next) => {
      // Add query optimization hints for large datasets
      if (req.query.limit > 100) {
        req.query.optimize = true;
      }

      next();
    };
  }

  /**
   * Asset optimization
   */
  assetOptimization() {
    return (req, res, next) => {
      // Set long cache TTL for static assets
      if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
        res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString());
      }

      next();
    };
  }

  /**
   * Gzip compression for large responses
   */
  dynamicCompression() {
    return (req, res, next) => {
      const originalSend = res.send;

      res.send = function(body) {
        const bodySize = Buffer.byteLength(body, 'utf8');
        
        // Only compress responses larger than 1KB
        if (bodySize > 1024 && req.acceptsEncodings('gzip')) {
          res.setHeader('Content-Encoding', 'gzip');
          logger.debug('Response compressed', { 
            originalSize: bodySize,
            url: req.originalUrl 
          });
        }

        originalSend.call(this, body);
      };

      next();
    };
  }

  /**
   * Connection keep-alive optimization
   */
  keepAlive() {
    return (req, res, next) => {
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Keep-Alive', 'timeout=60');
      next();
    };
  }

  /**
   * ETag generation for caching
   */
  etag() {
    return (req, res, next) => {
      const originalSend = res.send;

      res.send = function(body) {
        if (typeof body === 'string' || Buffer.isBuffer(body)) {
          const etag = require('crypto')
            .createHash('md5')
            .update(body)
            .digest('hex');
          
          res.setHeader('ETag', etag);

          // Check if client has cached version
          const clientEtag = req.headers['if-none-match'];
          if (clientEtag === etag) {
            return res.status(304).end();
          }
        }

        originalSend.call(this, body);
      };

      next();
    };
  }

  /**
   * Performance monitoring middleware
   */
  performanceMonitor() {
    return (req, res, next) => {
      const start = process.hrtime();
      const startMemory = process.memoryUsage();

      res.on('finish', () => {
        const [seconds, nanoseconds] = process.hrtime(start);
        const duration = seconds * 1000 + nanoseconds / 1000000;
        
        const endMemory = process.memoryUsage();
        const memoryUsed = endMemory.heapUsed - startMemory.heapUsed;

        const metrics = {
          duration: `${duration.toFixed(2)}ms`,
          memoryUsed: `${(memoryUsed / 1024 / 1024).toFixed(2)}MB`,
          url: req.originalUrl,
          method: req.method,
          statusCode: res.statusCode
        };

        // Log slow requests
        if (duration > 1000) { // 1 second
          logger.warn('Slow request detected', metrics);
        }

        // Log high memory usage
        if (memoryUsed > 100 * 1024 * 1024) { // 100MB
          logger.warn('High memory usage detected', metrics);
        }

        // Set performance headers
        res.setHeader('X-Response-Time', `${duration.toFixed(2)}ms`);
        res.setHeader('X-Memory-Usage', `${(memoryUsed / 1024 / 1024).toFixed(2)}MB`);
      });

      next();
    };
  }

  /**
   * Database connection pooling monitor
   */
  dbPoolMonitor(mongoose) {
    mongoose.connection.on('connected', () => {
      logger.info('Database connected - connection pool active');
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('Database disconnected - connection pool inactive');
    });

    // Monitor pool statistics
    setInterval(() => {
      const poolStats = mongoose.connection.db?.serverConfig?.s?.poolSize;
      if (poolStats) {
        logger.debug('Database pool statistics', {
          poolSize: poolStats,
          connections: mongoose.connection.readyState
        });
      }
    }, 60000); // Log every minute
  }

  /**
   * Cache performance monitoring
   */
  cacheMonitor() {
    setInterval(() => {
      const stats = cache.getStats();
      if (stats) {
        logger.debug('Cache performance statistics', {
          hitRate: `${(stats.hitRate * 100).toFixed(2)}%`,
          hits: stats.hits,
          misses: stats.misses,
          keys: stats.keys
        });
      }
    }, 300000); // Log every 5 minutes
  }

  /**
   * Garbage collection monitoring
   */
  gcMonitor() {
    if (global.gc) {
      const gc = require('gc-stats')();

      gc().on('stats', (stats) => {
        logger.debug('Garbage collection statistics', {
          pause: `${stats.pause}ms`,
          gctype: stats.gctype,
          before: `${(stats.diff.usedHeapSize / 1024 / 1024).toFixed(2)}MB`,
          after: `${(stats.usedHeapSize / 1024 / 1024).toFixed(2)}MB`
        });
      });
    }
  }

  /**
   * Request batching for multiple operations
   */
  requestBatching() {
    return (req, res, next) => {
      // Check if this is a batch request
      if (req.path.includes('/batch') && req.method === 'POST') {
        const batchStart = Date.now();
        const originalSend = res.send;

        res.send = function(data) {
          const batchDuration = Date.now() - batchStart;
          logger.debug('Batch request completed', {
            operations: req.body.operations?.length || 0,
            duration: `${batchDuration}ms`,
            savings: `${(batchDuration / (req.body.operations?.length || 1)).toFixed(2)}ms per operation`
          });

          originalSend.call(this, data);
        };
      }

      next();
    };
  }

  /**
   * Lazy loading for heavy resources
   */
  lazyLoading() {
    return (req, res, next) => {
      // Add lazy loading hints for large datasets
      if (req.query.fields === 'all' || req.query.include === 'details') {
        req.lazyLoad = true;
      }

      next();
    };
  }
}

module.exports = new PerformanceMiddleware();