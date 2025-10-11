/**
 * Cache Service for Reports
 * Implements Redis caching with fallback to in-memory cache
 */

import { createClient } from 'redis';
import { log } from '../utils/logger.js';

class CacheService {
  constructor() {
    this.redisClient = null;
    this.inMemoryCache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      errors: 0
    };
    this.initRedis();
  }

  /**
   * Initialize Redis connection
   */
  async initRedis() {
    try {
      // Check if Redis configuration is available
      if (process.env.REDIS_URL) {
        this.redisClient = createClient({
          url: process.env.REDIS_URL,
          socket: {
            reconnectStrategy: (retries) => {
              if (retries > 5) {
                log.info('Redis connection failed, falling back to in-memory cache');
                return new Error('Redis connection failed');
              }
              return Math.min(retries * 100, 3000);
            }
          }
        });

        this.redisClient.on('error', (err) => {
          log.error('Redis Client Error:', { error: err.message });
          this.cacheStats.errors++;
        });

        this.redisClient.on('connect', () => {
          log.info('Redis connected successfully');
        });

        await this.redisClient.connect();
      } else {
        log.info('Redis URL not configured, using in-memory cache');
      }
    } catch (error) {
      log.error('Failed to initialize Redis:', { error: error.message });
      log.info('Falling back to in-memory cache');
    }
  }

  /**
   * Generate cache key with namespace
   */
  generateKey(namespace, params) {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {});

    return `alshuail:${namespace}:${JSON.stringify(sortedParams)}`;
  }

  /**
   * Set value in cache with TTL
   */
  async set(key, value, ttl = 300) {
    try {
      const serialized = JSON.stringify(value);

      // Try Redis first
      if (this.redisClient?.isReady) {
        await this.redisClient.setEx(key, ttl, serialized);
      } else {
        // Fallback to in-memory cache
        this.inMemoryCache.set(key, {
          value: serialized,
          expiry: Date.now() + (ttl * 1000)
        });

        // Clean up expired entries
        this.cleanupInMemoryCache();
      }

      return true;
    } catch (error) {
      log.error('Cache set error:', { error: error.message });
      this.cacheStats.errors++;
      return false;
    }
  }

  /**
   * Get value from cache
   */
  async get(key) {
    try {
      let cached;

      // Try Redis first
      if (this.redisClient?.isReady) {
        cached = await this.redisClient.get(key);
      } else {
        // Fallback to in-memory cache
        const entry = this.inMemoryCache.get(key);
        if (entry && entry.expiry > Date.now()) {
          cached = entry.value;
        } else if (entry) {
          this.inMemoryCache.delete(key);
        }
      }

      if (cached) {
        this.cacheStats.hits++;
        return JSON.parse(cached);
      }

      this.cacheStats.misses++;
      return null;
    } catch (error) {
      log.error('Cache get error:', { error: error.message });
      this.cacheStats.errors++;
      return null;
    }
  }

  /**
   * Delete value from cache
   */
  async del(key) {
    try {
      if (this.redisClient?.isReady) {
        await this.redisClient.del(key);
      } else {
        this.inMemoryCache.delete(key);
      }
      return true;
    } catch (error) {
      log.error('Cache delete error:', { error: error.message });
      return false;
    }
  }

  /**
   * Clear all cache entries with pattern
   */
  async clearPattern(pattern) {
    try {
      if (this.redisClient?.isReady) {
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
        }
      } else {
        // Clear matching keys from in-memory cache
        for (const key of this.inMemoryCache.keys()) {
          if (key.includes(pattern.replace('*', ''))) {
            this.inMemoryCache.delete(key);
          }
        }
      }
      return true;
    } catch (error) {
      log.error('Cache clear error:', { error: error.message });
      return false;
    }
  }

  /**
   * Cleanup expired entries from in-memory cache
   */
  cleanupInMemoryCache() {
    const now = Date.now();
    for (const [key, entry] of this.inMemoryCache.entries()) {
      if (entry.expiry <= now) {
        this.inMemoryCache.delete(key);
      }
    }

    // Limit cache size to prevent memory issues
    if (this.inMemoryCache.size > 1000) {
      const entriesToDelete = this.inMemoryCache.size - 800;
      const keys = Array.from(this.inMemoryCache.keys());
      for (let i = 0; i < entriesToDelete; i++) {
        this.inMemoryCache.delete(keys[i]);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.cacheStats.hits + this.cacheStats.misses > 0
      ? (this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) * 100).toFixed(2)
      : 0;

    return {
      ...this.cacheStats,
      hitRate: `${hitRate}%`,
      cacheType: this.redisClient?.isReady ? 'Redis' : 'In-Memory',
      entriesCount: this.redisClient?.isReady ? 'N/A' : this.inMemoryCache.size
    };
  }

  /**
   * Cache wrapper for async functions
   */
  async cacheable(key, fn, ttl = 300) {
    // Try to get from cache first
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    const result = await fn();
    await this.set(key, result, ttl);
    return result;
  }

  /**
   * Invalidate cache for specific report types
   */
  invalidateReportCache(reportType) {
    const patterns = {
      financial: 'alshuail:financial:*',
      members: 'alshuail:members:*',
      payments: 'alshuail:payments:*',
      expenses: 'alshuail:expenses:*',
      all: 'alshuail:*'
    };

    const pattern = patterns[reportType] || patterns.all;
    return this.clearPattern(pattern);
  }
}

// Create singleton instance
const cacheService = new CacheService();

// Cache decorators for report functions
export const cacheableReport = (namespace, ttl = 300) => {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    // eslint-disable-next-line require-await
    descriptor.value = async function (...args) {
      const [req] = args;
      const cacheKey = cacheService.generateKey(namespace, {
        ...req.query,
        userId: req.user?.id,
        role: req.user?.role
      });

      return cacheService.cacheable(
        cacheKey,
        () => originalMethod.apply(this, args),
        ttl
      );
    };

    return descriptor;
  };
};

/**
 * Express middleware for cache headers
 */
export const cacheMiddleware = (ttl = 300) => {
  return (req, res, next) => {
    // Set cache headers
    res.set({
      'Cache-Control': `private, max-age=${ttl}`,
      'X-Cache-TTL': ttl
    });

    // Add cache info to response
    const originalJson = res.json.bind(res);
    res.json = function (data) {
      const stats = cacheService.getStats();
      res.set('X-Cache-Hit-Rate', stats.hitRate);
      res.set('X-Cache-Type', stats.cacheType);

      return originalJson({
        ...data,
        _cache: {
          hitRate: stats.hitRate,
          type: stats.cacheType
        }
      });
    };

    next();
  };
};

export default cacheService;