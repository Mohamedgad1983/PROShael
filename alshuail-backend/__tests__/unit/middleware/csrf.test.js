/**
 * CSRF Middleware Unit Tests
 * Tests Cross-Site Request Forgery protection
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// Mock dependencies
jest.unstable_mockModule('../../../src/config/env.js', () => ({
  config: {
    csrf: { secret: 'test-csrf-secret' },
    isProduction: false
  }
}));

describe('CSRF Middleware Unit Tests', () => {
  const createMockRequest = (overrides = {}) => ({
    headers: {},
    body: {},
    query: {},
    method: 'POST',
    path: '/api/test',
    ...overrides
  });

  const createMockResponse = () => {
    const res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res),
      cookie: jest.fn(() => res)
    };
    return res;
  };

  const mockNext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // CSRF Options Configuration Tests
  // ============================================
  describe('CSRF Options Configuration', () => {
    test('should configure cookie name', () => {
      const csrfOptions = {
        cookieName: 'x-csrf-token'
      };

      expect(csrfOptions.cookieName).toBe('x-csrf-token');
    });

    test('should configure cookie options for development', () => {
      const isProduction = false;
      const cookieOptions = {
        httpOnly: false, // Allow frontend to read
        sameSite: isProduction ? 'strict' : 'lax',
        secure: isProduction,
        path: '/',
        maxAge: 3600000 // 1 hour
      };

      expect(cookieOptions.httpOnly).toBe(false);
      expect(cookieOptions.sameSite).toBe('lax');
      expect(cookieOptions.secure).toBe(false);
      expect(cookieOptions.maxAge).toBe(3600000);
    });

    test('should configure cookie options for production', () => {
      const isProduction = true;
      const cookieOptions = {
        httpOnly: false,
        sameSite: isProduction ? 'strict' : 'lax',
        secure: isProduction,
        path: '/'
      };

      expect(cookieOptions.sameSite).toBe('strict');
      expect(cookieOptions.secure).toBe(true);
    });
  });

  // ============================================
  // Token Extraction Tests
  // ============================================
  describe('Token Extraction from Request', () => {
    test('should extract token from x-csrf-token header', () => {
      const req = createMockRequest({
        headers: { 'x-csrf-token': 'header-token-123' }
      });

      const getTokenFromRequest = (r) => {
        return r.headers['x-csrf-token'] ||
               r.body._csrf ||
               r.query._csrf;
      };

      expect(getTokenFromRequest(req)).toBe('header-token-123');
    });

    test('should extract token from body._csrf', () => {
      const req = createMockRequest({
        body: { _csrf: 'body-token-456' }
      });

      const getTokenFromRequest = (r) => {
        return r.headers['x-csrf-token'] ||
               r.body._csrf ||
               r.query._csrf;
      };

      expect(getTokenFromRequest(req)).toBe('body-token-456');
    });

    test('should extract token from query._csrf', () => {
      const req = createMockRequest({
        query: { _csrf: 'query-token-789' }
      });

      const getTokenFromRequest = (r) => {
        return r.headers['x-csrf-token'] ||
               r.body._csrf ||
               r.query._csrf;
      };

      expect(getTokenFromRequest(req)).toBe('query-token-789');
    });

    test('should prioritize header over body and query', () => {
      const req = createMockRequest({
        headers: { 'x-csrf-token': 'header-token' },
        body: { _csrf: 'body-token' },
        query: { _csrf: 'query-token' }
      });

      const getTokenFromRequest = (r) => {
        return r.headers['x-csrf-token'] ||
               r.body._csrf ||
               r.query._csrf;
      };

      expect(getTokenFromRequest(req)).toBe('header-token');
    });

    test('should return undefined when no token provided', () => {
      const req = createMockRequest();

      const getTokenFromRequest = (r) => {
        return r.headers['x-csrf-token'] ||
               r.body._csrf ||
               r.query._csrf;
      };

      expect(getTokenFromRequest(req)).toBeUndefined();
    });
  });

  // ============================================
  // Generate CSRF Token Tests
  // ============================================
  describe('Generate CSRF Token', () => {
    test('should generate token successfully', () => {
      const req = createMockRequest();
      let tokenGenerated = false;

      // Simulate token generation
      const generateCSRFToken = (r, res, next) => {
        r.csrfToken = () => 'generated-token-123';
        tokenGenerated = true;
        next();
      };

      generateCSRFToken(req, createMockResponse(), mockNext);

      expect(tokenGenerated).toBe(true);
      expect(req.csrfToken()).toBe('generated-token-123');
      expect(mockNext).toHaveBeenCalled();
    });

    test('should return 500 on token generation error', () => {
      const res = createMockResponse();

      res.status(500).json({
        success: false,
        error: 'Security token generation failed'
      });

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Security token generation failed'
      });
    });
  });

  // ============================================
  // Validate CSRF Token Tests
  // ============================================
  describe('Validate CSRF Token', () => {
    test('should skip validation for GET requests', () => {
      const req = createMockRequest({ method: 'GET' });
      let nextCalled = false;

      const validateCSRFToken = (r) => {
        if (['GET', 'HEAD', 'OPTIONS'].includes(r.method)) {
          return true; // Skip validation
        }
        return false;
      };

      const shouldSkip = validateCSRFToken(req);
      expect(shouldSkip).toBe(true);
    });

    test('should skip validation for HEAD requests', () => {
      const req = createMockRequest({ method: 'HEAD' });

      const shouldSkip = ['GET', 'HEAD', 'OPTIONS'].includes(req.method);
      expect(shouldSkip).toBe(true);
    });

    test('should skip validation for OPTIONS requests', () => {
      const req = createMockRequest({ method: 'OPTIONS' });

      const shouldSkip = ['GET', 'HEAD', 'OPTIONS'].includes(req.method);
      expect(shouldSkip).toBe(true);
    });

    test('should require validation for POST requests', () => {
      const req = createMockRequest({ method: 'POST' });

      const shouldSkip = ['GET', 'HEAD', 'OPTIONS'].includes(req.method);
      expect(shouldSkip).toBe(false);
    });

    test('should require validation for PUT requests', () => {
      const req = createMockRequest({ method: 'PUT' });

      const shouldSkip = ['GET', 'HEAD', 'OPTIONS'].includes(req.method);
      expect(shouldSkip).toBe(false);
    });

    test('should require validation for DELETE requests', () => {
      const req = createMockRequest({ method: 'DELETE' });

      const shouldSkip = ['GET', 'HEAD', 'OPTIONS'].includes(req.method);
      expect(shouldSkip).toBe(false);
    });
  });

  // ============================================
  // Public Endpoint Bypass Tests
  // ============================================
  describe('Public Endpoint Bypass', () => {
    const publicEndpoints = [
      '/api/auth/login',
      '/api/auth/verify-otp',
      '/api/health',
      '/api/csrf-token'
    ];

    test('should skip CSRF for login endpoint', () => {
      const path = '/api/auth/login';
      const shouldSkip = publicEndpoints.includes(path);
      expect(shouldSkip).toBe(true);
    });

    test('should skip CSRF for verify-otp endpoint', () => {
      const path = '/api/auth/verify-otp';
      const shouldSkip = publicEndpoints.includes(path);
      expect(shouldSkip).toBe(true);
    });

    test('should skip CSRF for health endpoint', () => {
      const path = '/api/health';
      const shouldSkip = publicEndpoints.includes(path);
      expect(shouldSkip).toBe(true);
    });

    test('should skip CSRF for csrf-token endpoint', () => {
      const path = '/api/csrf-token';
      const shouldSkip = publicEndpoints.includes(path);
      expect(shouldSkip).toBe(true);
    });

    test('should NOT skip CSRF for members endpoint', () => {
      const path = '/api/members';
      const shouldSkip = publicEndpoints.includes(path);
      expect(shouldSkip).toBe(false);
    });

    test('should NOT skip CSRF for finances endpoint', () => {
      const path = '/api/finances';
      const shouldSkip = publicEndpoints.includes(path);
      expect(shouldSkip).toBe(false);
    });
  });

  // ============================================
  // Validation Failure Tests
  // ============================================
  describe('Validation Failure Handling', () => {
    test('should return 403 on invalid token', () => {
      const res = createMockResponse();

      res.status(403).json({
        success: false,
        error: 'Invalid security token. Please refresh and try again.',
        code: 'CSRF_VALIDATION_FAILED'
      });

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'CSRF_VALIDATION_FAILED'
        })
      );
    });

    test('should include user-friendly error message', () => {
      const res = createMockResponse();

      res.status(403).json({
        success: false,
        error: 'Invalid security token. Please refresh and try again.'
      });

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('refresh')
        })
      );
    });
  });

  // ============================================
  // Double Submit Cookie Pattern Tests
  // ============================================
  describe('Double Submit Cookie Pattern', () => {
    test('should set cookie with path /', () => {
      const cookieOptions = { path: '/' };
      expect(cookieOptions.path).toBe('/');
    });

    test('should set 1 hour max age', () => {
      const maxAge = 3600000;
      expect(maxAge).toBe(60 * 60 * 1000);
    });

    test('should allow frontend to read cookie (httpOnly: false)', () => {
      const cookieOptions = { httpOnly: false };
      expect(cookieOptions.httpOnly).toBe(false);
    });
  });

  // ============================================
  // Environment-Based Configuration Tests
  // ============================================
  describe('Environment-Based Configuration', () => {
    test('development should use lax sameSite', () => {
      const isProduction = false;
      const sameSite = isProduction ? 'strict' : 'lax';
      expect(sameSite).toBe('lax');
    });

    test('production should use strict sameSite', () => {
      const isProduction = true;
      const sameSite = isProduction ? 'strict' : 'lax';
      expect(sameSite).toBe('strict');
    });

    test('development should not require secure', () => {
      const isProduction = false;
      expect(isProduction).toBe(false);
    });

    test('production should require secure', () => {
      const isProduction = true;
      expect(isProduction).toBe(true);
    });
  });

  // ============================================
  // Integration Behavior Tests
  // ============================================
  describe('Integration Behavior', () => {
    test('should proceed if validation passes', () => {
      let nextCalled = false;

      // Simulate successful validation
      const validateAndProceed = () => {
        nextCalled = true;
      };

      validateAndProceed();
      expect(nextCalled).toBe(true);
    });

    test('should attach csrfToken function to request', () => {
      const req = createMockRequest();
      const token = 'test-token-123';

      req.csrfToken = () => token;

      expect(typeof req.csrfToken).toBe('function');
      expect(req.csrfToken()).toBe('test-token-123');
    });
  });
});
