// utils/cache.js
const NodeCache = require('node-cache');
const logger = require('./logger');

class Cache {
  constructor() {
    this.cache = new NodeCache({
      stdTTL: 3600, // 1 hour default TTL
      checkperiod: 600, // Check for expired keys every 10 minutes
      useClones: false // Better performance
    });

    this.prefixes = {
      USER: 'user',
      TEST: 'test',
      QUESTION: 'question',
      EXPLANATION: 'explanation',
      FLASHCARD: 'flashcard',
      PROGRESS: 'progress'
    };
  }

  /**
   * Generate cache key with prefix
   */
  _generateKey(prefix, key) {
    return `${prefix}:${key}`;
  }

  /**
   * Set cache value
   */
  set(prefix, key, value, ttl = null) {
    try {
      const cacheKey = this._generateKey(prefix, key);
      const success = ttl ? 
        this.cache.set(cacheKey, value, ttl) : 
        this.cache.set(cacheKey, value);

      if (success) {
        logger.debug('Cache set', { prefix, key, ttl });
      } else {
        logger.warn('Cache set failed', { prefix, key });
      }

      return success;
    } catch (error) {
      logger.error('Cache set error', { prefix, key, error: error.message });
      return false;
    }
  }

  /**
   * Get cache value
   */
  get(prefix, key) {
    try {
      const cacheKey = this._generateKey(prefix, key);
      const value = this.cache.get(cacheKey);

      if (value !== undefined) {
        logger.debug('Cache hit', { prefix, key });
        return value;
      } else {
        logger.debug('Cache miss', { prefix, key });
        return null;
      }
    } catch (error) {
      logger.error('Cache get error', { prefix, key, error: error.message });
      return null;
    }
  }

  /**
   * Delete cache value
   */
  del(prefix, key) {
    try {
      const cacheKey = this._generateKey(prefix, key);
      const deleted = this.cache.del(cacheKey);
      
      logger.debug('Cache deleted', { prefix, key, deleted });
      return deleted > 0;
    } catch (error) {
      logger.error('Cache delete error', { prefix, key, error: error.message });
      return false;
    }
  }

  /**
   * Check if key exists
   */
  has(prefix, key) {
    try {
      const cacheKey = this._generateKey(prefix, key);
      return this.cache.has(cacheKey);
    } catch (error) {
      logger.error('Cache has error', { prefix, key, error: error.message });
      return false;
    }
  }

  /**
   * Get multiple cache values
   */
  mget(prefix, keys) {
    try {
      const cacheKeys = keys.map(key => this._generateKey(prefix, key));
      const values = this.cache.mget(cacheKeys);
      
      const result = {};
      keys.forEach((key, index) => {
        const cacheKey = cacheKeys[index];
        result[key] = values[cacheKey] || null;
      });

      logger.debug('Cache multiple get', { prefix, keys: keys.length, found: Object.values(result).filter(v => v !== null).length });
      return result;
    } catch (error) {
      logger.error('Cache mget error', { prefix, keys, error: error.message });
      return {};
    }
  }

  /**
   * Set multiple cache values
   */
  mset(prefix, keyValuePairs, ttl = null) {
    try {
      const cacheData = {};
      Object.keys(keyValuePairs).forEach(key => {
        const cacheKey = this._generateKey(prefix, key);
        cacheData[cacheKey] = keyValuePairs[key];
      });

      const success = this.cache.mset(cacheData);
      
      if (success && ttl) {
        Object.keys(cacheData).forEach(cacheKey => {
          this.cache.ttl(cacheKey, ttl);
        });
      }

      logger.debug('Cache multiple set', { prefix, items: Object.keys(keyValuePairs).length });
      return success;
    } catch (error) {
      logger.error('Cache mset error', { prefix, error: error.message });
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    try {
      const stats = this.cache.getStats();
      return {
        hits: stats.hits,
        misses: stats.misses,
        keys: stats.keys,
        ksize: stats.ksize,
        vsize: stats.vsize,
        hitRate: stats.hits / (stats.hits + stats.misses) || 0
      };
    } catch (error) {
      logger.error('Cache stats error', { error: error.message });
      return null;
    }
  }

  /**
   * Flush all cache
   */
  flush() {
    try {
      this.cache.flushAll();
      logger.info('Cache flushed');
      return true;
    } catch (error) {
      logger.error('Cache flush error', { error: error.message });
      return false;
    }
  }

  /**
   * Get all keys with prefix
   */
  keys(prefix = null) {
    try {
      const allKeys = this.cache.keys();
      
      if (!prefix) {
        return allKeys;
      }

      return allKeys.filter(key => key.startsWith(`${prefix}:`));
    } catch (error) {
      logger.error('Cache keys error', { prefix, error: error.message });
      return [];
    }
  }

  /**
   * User-specific cache methods
   */
  user = {
    set: (userId, key, value, ttl = null) => {
      const prefix = `user:${userId}`;
      return this.set(prefix, key, value, ttl);
    },

    get: (userId, key) => {
      const prefix = `user:${userId}`;
      return this.get(prefix, key);
    },

    del: (userId, key) => {
      const prefix = `user:${userId}`;
      return this.del(prefix, key);
    },

    clear: (userId) => {
      const prefix = `user:${userId}`;
      const keys = this.keys(prefix);
      keys.forEach(key => this.cache.del(key));
      logger.debug('User cache cleared', { userId, keys: keys.length });
    }
  };

  /**
   * Test-specific cache methods
   */
  test = {
    set: (testId, data, ttl = 7200) => { // 2 hours for tests
      return this.set('test', testId, data, ttl);
    },

    get: (testId) => {
      return this.get('test', testId);
    },

    del: (testId) => {
      return this.del('test', testId);
    }
  };

  /**
   * Question-specific cache methods
   */
  question = {
    set: (questionId, data, ttl = 86400) => { // 24 hours for questions
      return this.set('question', questionId, data, ttl);
    },

    get: (questionId) => {
      return this.get('question', questionId);
    },

    setBatch: (questions) => {
      const keyValuePairs = {};
      questions.forEach(q => {
        keyValuePairs[q.id] = q;
      });
      return this.mset('question', keyValuePairs, 86400);
    }
  };

  /**
   * Explanation-specific cache methods
   */
  explanation = {
    set: (topic, difficulty, examType, data, ttl = 86400) => {
      const key = `${topic}:${difficulty}:${examType}`;
      return this.set('explanation', key, data, ttl);
    },

    get: (topic, difficulty, examType) => {
      const key = `${topic}:${difficulty}:${examType}`;
      return this.get('explanation', key);
    }
  };

  /**
   * Flashcard-specific cache methods
   */
  flashcard = {
    set: (topic, types, data, ttl = 86400) => {
      const key = `${topic}:${types.join(',')}`;
      return this.set('flashcard', key, data, ttl);
    },

    get: (topic, types) => {
      const key = `${topic}:${types.join(',')}`;
      return this.get('flashcard', key);
    }
  };

  /**
   * Progress-specific cache methods
   */
  progress = {
    set: (userId, data, ttl = 1800) => { // 30 minutes for progress
      return this.set('progress', userId, data, ttl);
    },

    get: (userId) => {
      return this.get('progress', userId);
    },

    update: (userId, updates) => {
      const current = this.get('progress', userId);
      if (current) {
        const updated = { ...current, ...updates, updatedAt: new Date() };
        return this.set('progress', userId, updated);
      }
      return false;
    }
  };

  /**
   * Cache middleware for Express routes
   */
  middleware(prefix, keyGenerator, ttl = 3600) {
    return (req, res, next) => {
      const key = keyGenerator(req);
      const cached = this.get(prefix, key);

      if (cached) {
        logger.debug('Cache middleware hit', { prefix, key });
        return res.json(cached);
      }

      // Store original send method
      const originalSend = res.send;

      // Override send method to cache response
      res.send = function(data) {
        if (res.statusCode === 200) {
          try {
            const responseData = JSON.parse(data);
            this.set(prefix, key, responseData, ttl);
            logger.debug('Cache middleware set', { prefix, key });
          } catch (error) {
            logger.warn('Cache middleware parse error', { prefix, key, error: error.message });
          }
        }

        originalSend.call(this, data);
      }.bind(this);

      next();
    };
  }
}

// Create singleton instance
const cache = new Cache();

module.exports = cache;