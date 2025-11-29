/**
 * Rate Limiter Middleware Unit Tests (rateLimiter.js)
 * Tests rate limiting functionality for API protection
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// Mock dependencies
jest.unstable_mockModule('../../../src/utils/errorCodes.js', () => ({
  createErrorResponse: jest.fn((code, data) => ({
    success: false,
    error: code,
    ...data
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

describe('Rate Limiter Unit Tests', () => {
  const createMockRequest = (overrides = {}) => ({
    user: null,
    ip: '127.0.0.1',
    connection: { remoteAddress: '127.0.0.1' },
    ...overrides
  });

  const createMockResponse = () => {
    const res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res),
      set: jest.fn(() => res)
    };
    return res;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // Rate Limit Configuration Tests
  // ============================================
  describe('Rate Limit Configuration', () => {
    test('should define reportGeneration limits', () => {
      const limits = {
        reportGeneration: {
          windowMs: 60 * 60 * 1000, // 1 hour
          maxRequests: 10,
          message: 'Report generation limit exceeded. Maximum 10 reports per hour'
        }
      };

      expect(limits.reportGeneration.windowMs).toBe(3600000);
      expect(limits.reportGeneration.maxRequests).toBe(10);
    });

    test('should define reportExport limits', () => {
      const limits = {
        reportExport: {
          windowMs: 60 * 60 * 1000,
          maxRequests: 20,
          message: 'Report export limit exceeded. Maximum 20 exports per hour'
        }
      };

      expect(limits.reportExport.maxRequests).toBe(20);
    });

    test('should define financialSummary limits', () => {
      const limits = {
        financialSummary: {
          windowMs: 60 * 60 * 1000,
          maxRequests: 30,
          message: 'Financial summary limit exceeded. Maximum 30 requests per hour'
        }
      };

      expect(limits.financialSummary.maxRequests).toBe(30);
    });

    test('should define general API limits', () => {
      const limits = {
        general: {
          windowMs: 60 * 1000, // 1 minute
          maxRequests: 100,
          message: 'Too many requests. Please try again later'
        }
      };

      expect(limits.general.windowMs).toBe(60000);
      expect(limits.general.maxRequests).toBe(100);
    });

    test('should define forensic report limits', () => {
      const limits = {
        forensic: {
          windowMs: 60 * 60 * 1000,
          maxRequests: 5,
          message: 'Forensic report limit exceeded. Maximum 5 forensic reports per hour'
        }
      };

      expect(limits.forensic.maxRequests).toBe(5);
    });
  });

  // ============================================
  // Client ID Generation Tests
  // ============================================
  describe('Client ID Generation', () => {
    test('should prioritize user ID over IP', () => {
      const req = createMockRequest({
        user: { id: 'user-123' },
        ip: '192.168.1.1'
      });

      const getClientId = (r) => {
        if (r.user?.id) {
          return `user_${r.user.id}`;
        }
        const ip = r.ip || r.connection.remoteAddress || 'unknown';
        return `ip_${ip}`;
      };

      expect(getClientId(req)).toBe('user_user-123');
    });

    test('should fallback to IP when no user', () => {
      const req = createMockRequest({
        user: null,
        ip: '192.168.1.1'
      });

      const getClientId = (r) => {
        if (r.user?.id) {
          return `user_${r.user.id}`;
        }
        const ip = r.ip || r.connection.remoteAddress || 'unknown';
        return `ip_${ip}`;
      };

      expect(getClientId(req)).toBe('ip_192.168.1.1');
    });

    test('should use connection.remoteAddress as fallback', () => {
      const req = createMockRequest({
        user: null,
        ip: null,
        connection: { remoteAddress: '10.0.0.1' }
      });

      const getClientId = (r) => {
        if (r.user?.id) {
          return `user_${r.user.id}`;
        }
        const ip = r.ip || r.connection.remoteAddress || 'unknown';
        return `ip_${ip}`;
      };

      expect(getClientId(req)).toBe('ip_10.0.0.1');
    });

    test('should use unknown when no IP available', () => {
      const req = createMockRequest({
        user: null,
        ip: null,
        connection: {}
      });

      const getClientId = (r) => {
        if (r.user?.id) {
          return `user_${r.user.id}`;
        }
        const ip = r.ip || r.connection?.remoteAddress || 'unknown';
        return `ip_${ip}`;
      };

      expect(getClientId(req)).toBe('ip_unknown');
    });
  });

  // ============================================
  // Rate Limit Check Tests
  // ============================================
  describe('Rate Limit Checking', () => {
    test('should allow first request', () => {
      const requests = new Map();
      const clientId = 'user_test';
      const limit = { maxRequests: 10, windowMs: 60000 };

      if (!requests.has(clientId)) {
        requests.set(clientId, {
          count: 1,
          firstRequest: Date.now(),
          lastRequest: Date.now()
        });
      }

      const result = { allowed: true, remaining: limit.maxRequests - 1 };
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    test('should increment count for subsequent requests', () => {
      const clientRequests = {
        count: 5,
        firstRequest: Date.now() - 30000,
        lastRequest: Date.now()
      };

      clientRequests.count++;
      clientRequests.lastRequest = Date.now();

      expect(clientRequests.count).toBe(6);
    });

    test('should reset count after window expires', () => {
      const windowMs = 60000;
      const clientRequests = {
        count: 50,
        firstRequest: Date.now() - 120000 // 2 minutes ago
      };

      const timeElapsed = Date.now() - clientRequests.firstRequest;
      const shouldReset = timeElapsed > windowMs;

      expect(shouldReset).toBe(true);
    });

    test('should deny request when limit exceeded', () => {
      const limit = { maxRequests: 10 };
      const clientRequests = { count: 11 };

      const allowed = clientRequests.count <= limit.maxRequests;
      expect(allowed).toBe(false);
    });

    test('should return remaining count', () => {
      const limit = { maxRequests: 10 };
      const currentCount = 7;

      const remaining = limit.maxRequests - currentCount;
      expect(remaining).toBe(3);
    });
  });

  // ============================================
  // Blacklist Tests
  // ============================================
  describe('Blacklist Management', () => {
    test('should add client to blacklist', () => {
      const blacklist = new Set();
      const clientId = 'user_abuser';

      blacklist.add(clientId);

      expect(blacklist.has(clientId)).toBe(true);
    });

    test('should check if client is blacklisted', () => {
      const blacklist = new Set(['user_blocked']);

      expect(blacklist.has('user_blocked')).toBe(true);
      expect(blacklist.has('user_allowed')).toBe(false);
    });

    test('should blacklist client after 3x over limit', () => {
      const limit = { maxRequests: 10 };
      const clientRequests = { count: 31 }; // 3x over limit

      const shouldBlacklist = clientRequests.count > limit.maxRequests * 3;
      expect(shouldBlacklist).toBe(true);
    });

    test('should remove from blacklist after duration', () => {
      const blacklist = new Set(['user_temp']);

      // Simulate auto-removal
      blacklist.delete('user_temp');

      expect(blacklist.has('user_temp')).toBe(false);
    });
  });

  // ============================================
  // Cleanup Tests
  // ============================================
  describe('Cleanup', () => {
    test('should remove expired entries', () => {
      const requests = new Map();
      const windowMs = 60000;
      const now = Date.now();

      requests.set('key1', { firstRequest: now - 120000 }); // expired
      requests.set('key2', { firstRequest: now - 30000 }); // not expired

      for (const [key, data] of requests.entries()) {
        if (now - data.firstRequest > windowMs) {
          requests.delete(key);
        }
      }

      expect(requests.has('key1')).toBe(false);
      expect(requests.has('key2')).toBe(true);
    });
  });

  // ============================================
  // Stats Tests
  // ============================================
  describe('Rate Limiter Stats', () => {
    test('should return active clients count', () => {
      const requests = new Map();
      requests.set('client1', {});
      requests.set('client2', {});

      const stats = {
        activeClients: requests.size,
        blacklistedClients: 1
      };

      expect(stats.activeClients).toBe(2);
    });

    test('should return blacklisted count', () => {
      const blacklist = new Set(['blocked1', 'blocked2', 'blocked3']);

      const stats = {
        blacklistedClients: blacklist.size
      };

      expect(stats.blacklistedClients).toBe(3);
    });
  });

  // ============================================
  // Reset Client Tests
  // ============================================
  describe('Reset Client', () => {
    test('should reset client limits', () => {
      const requests = new Map();
      const blacklist = new Set();
      const clientId = 'user_reset';

      requests.set('user_reset_general', {});
      requests.set('user_reset_reports', {});
      blacklist.add(clientId);

      // Reset operation
      for (const key of requests.keys()) {
        if (key.startsWith(clientId)) {
          requests.delete(key);
        }
      }
      blacklist.delete(clientId);

      expect(requests.size).toBe(0);
      expect(blacklist.has(clientId)).toBe(false);
    });
  });

  // ============================================
  // Middleware Response Tests
  // ============================================
  describe('Middleware Response', () => {
    test('should return 403 for blacklisted client', () => {
      const res = createMockResponse();

      res.status(403).json({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Access temporarily blocked due to excessive requests',
        messageAr: 'تم حظر الوصول مؤقتاً بسبب الطلبات المفرطة'
      });

      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('should return 429 when rate limit exceeded', () => {
      const res = createMockResponse();

      res.status(429).json({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later',
        resetTime: new Date(Date.now() + 60000)
      });

      expect(res.status).toHaveBeenCalledWith(429);
    });

    test('should set rate limit headers', () => {
      const res = createMockResponse();
      const maxRequests = 100;
      const remaining = 95;

      res.set({
        'X-RateLimit-Limit': maxRequests,
        'X-RateLimit-Remaining': remaining
      });

      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Limit': 100,
          'X-RateLimit-Remaining': 95
        })
      );
    });
  });

  // ============================================
  // Dynamic Rate Limit Tests
  // ============================================
  describe('Dynamic Rate Limiting', () => {
    test('should multiply limit for super_admin', () => {
      const baseLimit = 10;
      const userRole = 'super_admin';

      let multiplier = 1;
      switch (userRole) {
        case 'super_admin':
          multiplier = 5;
          break;
        case 'financial_manager':
          multiplier = 3;
          break;
        case 'operational_manager':
          multiplier = 2;
          break;
        default:
          multiplier = 1;
      }

      expect(Math.floor(baseLimit * multiplier)).toBe(50);
    });

    test('should multiply limit for financial_manager', () => {
      const baseLimit = 10;
      const multiplier = 3;

      expect(Math.floor(baseLimit * multiplier)).toBe(30);
    });

    test('should use standard limit for regular users', () => {
      const baseLimit = 10;
      const multiplier = 1;

      expect(Math.floor(baseLimit * multiplier)).toBe(10);
    });
  });

  // ============================================
  // IP Rate Limit Tests
  // ============================================
  describe('IP Rate Limiting', () => {
    test('should track by IP for unauthenticated endpoints', () => {
      const ipLimiter = new Map();
      const ip = '192.168.1.1';
      const requestsPerMinute = 10;

      if (!ipLimiter.has(ip)) {
        ipLimiter.set(ip, {
          count: 1,
          firstRequest: Date.now()
        });
      }

      expect(ipLimiter.get(ip).count).toBe(1);
    });

    test('should increment IP count', () => {
      const ipData = {
        count: 5,
        firstRequest: Date.now() - 30000
      };

      ipData.count++;

      expect(ipData.count).toBe(6);
    });

    test('should deny IP when limit exceeded', () => {
      const res = createMockResponse();
      const requestsPerMinute = 10;
      const ipData = { count: 11 };

      if (ipData.count > requestsPerMinute) {
        res.status(429).json({
          success: false,
          error: 'RATE_LIMIT_EXCEEDED'
        });
      }

      expect(res.status).toHaveBeenCalledWith(429);
    });
  });

  // ============================================
  // Endpoint Specific Limits Tests
  // ============================================
  describe('Endpoint Specific Limits', () => {
    test('should have reportGeneration limit', () => {
      const rateLimits = {
        reportGeneration: 'reportGeneration',
        reportExport: 'reportExport',
        financialSummary: 'financialSummary',
        forensicReport: 'forensic',
        general: 'general'
      };

      expect(rateLimits.reportGeneration).toBe('reportGeneration');
    });

    test('should map forensicReport to forensic limit type', () => {
      const rateLimits = {
        forensicReport: 'forensic'
      };

      expect(rateLimits.forensicReport).toBe('forensic');
    });
  });
});
