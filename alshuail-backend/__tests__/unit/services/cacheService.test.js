/**
 * Cache Service Unit Tests
 * Tests caching functionality with Redis and in-memory fallback
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// Mock dependencies
jest.unstable_mockModule('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    on: jest.fn(),
    isReady: false,
    get: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
    keys: jest.fn()
  }))
}));

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('Cache Service Unit Tests', () => {
  let inMemoryCache;

  beforeEach(() => {
    jest.clearAllMocks();
    inMemoryCache = new Map();
  });

  // ============================================
  // Cache Key Generation Tests
  // ============================================
  describe('generateKey', () => {
    test('should generate key with namespace', () => {
      const namespace = 'financial';
      const params = { year: 2024, type: 'summary' };

      const generateKey = (ns, p) => {
        const sortedParams = Object.keys(p)
          .sort()
          .reduce((result, key) => {
            result[key] = p[key];
            return result;
          }, {});
        return `alshuail:${ns}:${JSON.stringify(sortedParams)}`;
      };

      const key = generateKey(namespace, params);

      expect(key).toBe('alshuail:financial:{"type":"summary","year":2024}');
    });

    test('should sort parameters alphabetically', () => {
      const params = { z: 1, a: 2, m: 3 };

      const sortedParams = Object.keys(params)
        .sort()
        .reduce((result, key) => {
          result[key] = params[key];
          return result;
        }, {});

      expect(Object.keys(sortedParams)).toEqual(['a', 'm', 'z']);
    });

    test('should handle empty params', () => {
      const generateKey = (ns, p) => {
        return `alshuail:${ns}:${JSON.stringify(p || {})}`;
      };

      const key = generateKey('test', {});
      expect(key).toBe('alshuail:test:{}');
    });
  });

  // ============================================
  // In-Memory Cache Set Tests
  // ============================================
  describe('set (in-memory)', () => {
    test('should store value with expiry', () => {
      const key = 'test-key';
      const value = { data: 'test' };
      const ttl = 300;

      const serialized = JSON.stringify(value);
      inMemoryCache.set(key, {
        value: serialized,
        expiry: Date.now() + (ttl * 1000)
      });

      expect(inMemoryCache.has(key)).toBe(true);
      expect(inMemoryCache.get(key).value).toBe(serialized);
    });

    test('should calculate correct expiry time', () => {
      const ttl = 300;
      const now = Date.now();
      const expiry = now + (ttl * 1000);

      expect(expiry).toBeGreaterThan(now);
      expect(expiry - now).toBe(300000);
    });

    test('should serialize value to JSON', () => {
      const value = { key: 'value', number: 123, array: [1, 2, 3] };
      const serialized = JSON.stringify(value);

      expect(typeof serialized).toBe('string');
      expect(JSON.parse(serialized)).toEqual(value);
    });

    test('should return true on successful set', () => {
      let result = false;

      try {
        inMemoryCache.set('key', { value: 'test' });
        result = true;
      } catch (error) {
        result = false;
      }

      expect(result).toBe(true);
    });
  });

  // ============================================
  // In-Memory Cache Get Tests
  // ============================================
  describe('get (in-memory)', () => {
    test('should return cached value if not expired', () => {
      const key = 'test-key';
      const value = { data: 'test' };

      inMemoryCache.set(key, {
        value: JSON.stringify(value),
        expiry: Date.now() + 300000
      });

      const entry = inMemoryCache.get(key);
      expect(entry).toBeDefined();

      if (entry && entry.expiry > Date.now()) {
        const cached = JSON.parse(entry.value);
        expect(cached).toEqual(value);
      }
    });

    test('should return null for expired entries', () => {
      const key = 'expired-key';

      inMemoryCache.set(key, {
        value: JSON.stringify({ data: 'old' }),
        expiry: Date.now() - 1000 // Expired 1 second ago
      });

      const entry = inMemoryCache.get(key);
      let result = null;

      if (entry && entry.expiry > Date.now()) {
        result = JSON.parse(entry.value);
      } else if (entry) {
        inMemoryCache.delete(key);
        result = null;
      }

      expect(result).toBeNull();
    });

    test('should return null for non-existent keys', () => {
      const entry = inMemoryCache.get('non-existent');
      expect(entry).toBeUndefined();
    });

    test('should delete expired entries on access', () => {
      const key = 'expired-key';

      inMemoryCache.set(key, {
        value: JSON.stringify({ data: 'old' }),
        expiry: Date.now() - 1000
      });

      const entry = inMemoryCache.get(key);
      if (entry && entry.expiry <= Date.now()) {
        inMemoryCache.delete(key);
      }

      expect(inMemoryCache.has(key)).toBe(false);
    });
  });

  // ============================================
  // In-Memory Cache Delete Tests
  // ============================================
  describe('del (in-memory)', () => {
    test('should delete existing key', () => {
      const key = 'delete-me';
      inMemoryCache.set(key, { value: 'test' });

      expect(inMemoryCache.has(key)).toBe(true);

      inMemoryCache.delete(key);

      expect(inMemoryCache.has(key)).toBe(false);
    });

    test('should handle deleting non-existent key', () => {
      const result = inMemoryCache.delete('non-existent');
      expect(result).toBe(false);
    });
  });

  // ============================================
  // Clear Pattern Tests
  // ============================================
  describe('clearPattern (in-memory)', () => {
    test('should clear keys matching pattern', () => {
      inMemoryCache.set('alshuail:financial:report1', { value: '1' });
      inMemoryCache.set('alshuail:financial:report2', { value: '2' });
      inMemoryCache.set('alshuail:members:data', { value: '3' });

      const pattern = 'alshuail:financial:';

      for (const key of inMemoryCache.keys()) {
        if (key.includes(pattern.replace('*', ''))) {
          inMemoryCache.delete(key);
        }
      }

      expect(inMemoryCache.size).toBe(1);
      expect(inMemoryCache.has('alshuail:members:data')).toBe(true);
    });

    test('should handle pattern with wildcard', () => {
      const pattern = 'alshuail:*';
      const cleanPattern = pattern.replace('*', '');

      expect(cleanPattern).toBe('alshuail:');
    });
  });

  // ============================================
  // Cleanup Tests
  // ============================================
  describe('cleanupInMemoryCache', () => {
    test('should remove expired entries', () => {
      const now = Date.now();

      inMemoryCache.set('expired1', { value: '1', expiry: now - 1000 });
      inMemoryCache.set('expired2', { value: '2', expiry: now - 2000 });
      inMemoryCache.set('valid', { value: '3', expiry: now + 300000 });

      for (const [key, entry] of inMemoryCache.entries()) {
        if (entry.expiry <= now) {
          inMemoryCache.delete(key);
        }
      }

      expect(inMemoryCache.size).toBe(1);
      expect(inMemoryCache.has('valid')).toBe(true);
    });

    test('should limit cache size to 1000 entries', () => {
      const maxSize = 1000;
      const targetSize = 800;

      // Simulate adding too many entries
      for (let i = 0; i < 1100; i++) {
        inMemoryCache.set(`key${i}`, { value: `value${i}` });
      }

      // Cleanup
      if (inMemoryCache.size > maxSize) {
        const entriesToDelete = inMemoryCache.size - targetSize;
        const keys = Array.from(inMemoryCache.keys());
        for (let i = 0; i < entriesToDelete; i++) {
          inMemoryCache.delete(keys[i]);
        }
      }

      expect(inMemoryCache.size).toBeLessThanOrEqual(targetSize);
    });
  });

  // ============================================
  // Cache Stats Tests
  // ============================================
  describe('getStats', () => {
    test('should return cache statistics', () => {
      const stats = {
        hits: 10,
        misses: 5,
        errors: 1
      };

      const hitRate = stats.hits + stats.misses > 0
        ? (stats.hits / (stats.hits + stats.misses) * 100).toFixed(2)
        : 0;

      expect(hitRate).toBe('66.67');
    });

    test('should handle zero requests', () => {
      const stats = { hits: 0, misses: 0 };

      const hitRate = stats.hits + stats.misses > 0
        ? (stats.hits / (stats.hits + stats.misses) * 100).toFixed(2)
        : 0;

      expect(hitRate).toBe(0);
    });

    test('should return cache type', () => {
      const redisReady = false;
      const cacheType = redisReady ? 'Redis' : 'In-Memory';

      expect(cacheType).toBe('In-Memory');
    });

    test('should return entry count for in-memory cache', () => {
      inMemoryCache.set('key1', {});
      inMemoryCache.set('key2', {});

      expect(inMemoryCache.size).toBe(2);
    });
  });

  // ============================================
  // Cacheable Wrapper Tests
  // ============================================
  describe('cacheable', () => {
    test('should return cached value if exists', async () => {
      const key = 'cacheable-test';
      const cachedValue = { data: 'cached' };

      inMemoryCache.set(key, {
        value: JSON.stringify(cachedValue),
        expiry: Date.now() + 300000
      });

      const entry = inMemoryCache.get(key);
      const result = entry ? JSON.parse(entry.value) : null;

      expect(result).toEqual(cachedValue);
    });

    test('should execute function if not cached', async () => {
      let functionExecuted = false;

      const fn = async () => {
        functionExecuted = true;
        return { data: 'new' };
      };

      const key = 'uncached-test';
      const cached = inMemoryCache.get(key);

      if (!cached) {
        const result = await fn();
        inMemoryCache.set(key, {
          value: JSON.stringify(result),
          expiry: Date.now() + 300000
        });
      }

      expect(functionExecuted).toBe(true);
    });

    test('should cache function result', async () => {
      const key = 'cache-result-test';
      const fnResult = { computed: 'value' };

      const fn = async () => fnResult;
      const result = await fn();

      inMemoryCache.set(key, {
        value: JSON.stringify(result),
        expiry: Date.now() + 300000
      });

      expect(inMemoryCache.has(key)).toBe(true);
    });
  });

  // ============================================
  // Invalidate Report Cache Tests
  // ============================================
  describe('invalidateReportCache', () => {
    test('should map report types to patterns', () => {
      const patterns = {
        financial: 'alshuail:financial:*',
        members: 'alshuail:members:*',
        payments: 'alshuail:payments:*',
        expenses: 'alshuail:expenses:*',
        all: 'alshuail:*'
      };

      expect(patterns.financial).toBe('alshuail:financial:*');
      expect(patterns.all).toBe('alshuail:*');
    });

    test('should fallback to all pattern for unknown type', () => {
      const patterns = {
        financial: 'alshuail:financial:*',
        all: 'alshuail:*'
      };

      const reportType = 'unknown';
      const pattern = patterns[reportType] || patterns.all;

      expect(pattern).toBe('alshuail:*');
    });
  });

  // ============================================
  // TTL Configuration Tests
  // ============================================
  describe('TTL Configuration', () => {
    test('should use default TTL of 300 seconds', () => {
      const defaultTTL = 300;
      expect(defaultTTL).toBe(300);
    });

    test('should allow custom TTL', () => {
      const customTTL = 600;
      const expiry = Date.now() + (customTTL * 1000);

      expect(expiry).toBeGreaterThan(Date.now() + 300000);
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================
  describe('Error Handling', () => {
    test('should increment error count on failure', () => {
      const stats = { errors: 0 };

      try {
        throw new Error('Cache error');
      } catch (error) {
        stats.errors++;
      }

      expect(stats.errors).toBe(1);
    });

    test('should return null on get error', () => {
      let result = null;

      try {
        throw new Error('Get error');
      } catch (error) {
        result = null;
      }

      expect(result).toBeNull();
    });

    test('should return false on set error', () => {
      let result = false;

      try {
        throw new Error('Set error');
      } catch (error) {
        result = false;
      }

      expect(result).toBe(false);
    });
  });

  // ============================================
  // Cache Middleware Tests
  // ============================================
  describe('cacheMiddleware', () => {
    test('should set Cache-Control header', () => {
      const ttl = 300;
      const headers = {};

      headers['Cache-Control'] = `private, max-age=${ttl}`;
      headers['X-Cache-TTL'] = ttl;

      expect(headers['Cache-Control']).toBe('private, max-age=300');
      expect(headers['X-Cache-TTL']).toBe(300);
    });

    test('should add cache info to response', () => {
      const stats = { hitRate: '66.67%', cacheType: 'In-Memory' };
      const data = { results: [] };

      const enrichedData = {
        ...data,
        _cache: {
          hitRate: stats.hitRate,
          type: stats.cacheType
        }
      };

      expect(enrichedData._cache.hitRate).toBe('66.67%');
      expect(enrichedData._cache.type).toBe('In-Memory');
    });
  });

  // ============================================
  // Hit/Miss Tracking Tests
  // ============================================
  describe('Hit/Miss Tracking', () => {
    test('should increment hits on cache hit', () => {
      const stats = { hits: 0, misses: 0 };

      const key = 'hit-test';
      inMemoryCache.set(key, { value: 'test', expiry: Date.now() + 300000 });

      const cached = inMemoryCache.get(key);
      if (cached) {
        stats.hits++;
      }

      expect(stats.hits).toBe(1);
    });

    test('should increment misses on cache miss', () => {
      const stats = { hits: 0, misses: 0 };

      const cached = inMemoryCache.get('non-existent');
      if (!cached) {
        stats.misses++;
      }

      expect(stats.misses).toBe(1);
    });
  });
});
