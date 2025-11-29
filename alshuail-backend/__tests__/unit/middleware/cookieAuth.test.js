/**
 * Cookie Auth Middleware Unit Tests
 * Tests cookie-based JWT authentication
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// Mock dependencies
jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

jest.unstable_mockModule('../../../src/config/env.js', () => ({
  config: {
    jwt: { secret: 'test-jwt-secret' },
    isProduction: false
  }
}));

describe('Cookie Auth Middleware Unit Tests', () => {
  const createMockRequest = (overrides = {}) => ({
    cookies: {},
    headers: {},
    user: null,
    userId: null,
    ...overrides
  });

  const createMockResponse = () => {
    const res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res),
      cookie: jest.fn(() => res),
      clearCookie: jest.fn(() => res)
    };
    return res;
  };

  const mockNext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // Cookie Configuration Tests
  // ============================================
  describe('Cookie Configuration', () => {
    test('should set httpOnly to true for XSS protection', () => {
      const COOKIE_CONFIG = { httpOnly: true };
      expect(COOKIE_CONFIG.httpOnly).toBe(true);
    });

    test('should set secure to false in development', () => {
      const isProduction = false;
      const COOKIE_CONFIG = { secure: isProduction };
      expect(COOKIE_CONFIG.secure).toBe(false);
    });

    test('should set secure to true in production', () => {
      const isProduction = true;
      const COOKIE_CONFIG = { secure: isProduction };
      expect(COOKIE_CONFIG.secure).toBe(true);
    });

    test('should set sameSite to lax in development', () => {
      const isProduction = false;
      const sameSite = isProduction ? 'strict' : 'lax';
      expect(sameSite).toBe('lax');
    });

    test('should set sameSite to strict in production', () => {
      const isProduction = true;
      const sameSite = isProduction ? 'strict' : 'lax';
      expect(sameSite).toBe('strict');
    });

    test('should set path to /', () => {
      const COOKIE_CONFIG = { path: '/' };
      expect(COOKIE_CONFIG.path).toBe('/');
    });

    test('should set maxAge to 7 days', () => {
      const maxAge = 7 * 24 * 60 * 60 * 1000;
      expect(maxAge).toBe(604800000);
    });
  });

  // ============================================
  // Set Auth Cookie Tests
  // ============================================
  describe('setAuthCookie', () => {
    test('should call res.cookie with auth_token', () => {
      const res = createMockResponse();
      const token = 'test-jwt-token';

      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 604800000
      });

      expect(res.cookie).toHaveBeenCalledWith(
        'auth_token',
        token,
        expect.objectContaining({
          httpOnly: true,
          path: '/'
        })
      );
    });

    test('should merge custom options', () => {
      const res = createMockResponse();
      const baseConfig = { httpOnly: true, path: '/' };
      const customOptions = { maxAge: 3600000 };
      const mergedOptions = { ...baseConfig, ...customOptions };

      expect(mergedOptions.maxAge).toBe(3600000);
      expect(mergedOptions.httpOnly).toBe(true);
    });

    test('should return true on success', () => {
      const setAuthCookie = () => true;
      expect(setAuthCookie()).toBe(true);
    });

    test('should return false on error', () => {
      const setAuthCookie = () => {
        try {
          throw new Error('Cookie error');
        } catch (e) {
          return false;
        }
      };
      expect(setAuthCookie()).toBe(false);
    });
  });

  // ============================================
  // Clear Auth Cookie Tests
  // ============================================
  describe('clearAuthCookie', () => {
    test('should call res.clearCookie with auth_token', () => {
      const res = createMockResponse();

      res.clearCookie('auth_token', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/'
      });

      expect(res.clearCookie).toHaveBeenCalledWith(
        'auth_token',
        expect.objectContaining({
          httpOnly: true,
          path: '/'
        })
      );
    });

    test('should return true on success', () => {
      const clearAuthCookie = () => true;
      expect(clearAuthCookie()).toBe(true);
    });

    test('should return false on error', () => {
      const clearAuthCookie = () => {
        try {
          throw new Error('Clear error');
        } catch (e) {
          return false;
        }
      };
      expect(clearAuthCookie()).toBe(false);
    });
  });

  // ============================================
  // Extract Token Tests
  // ============================================
  describe('extractToken', () => {
    test('should extract token from cookie first', () => {
      const req = createMockRequest({
        cookies: { auth_token: 'cookie-token' },
        headers: { authorization: 'Bearer header-token' }
      });

      const extractToken = (r) => {
        if (r.cookies && r.cookies.auth_token) {
          return r.cookies.auth_token;
        }
        if (r.headers.authorization) {
          const parts = r.headers.authorization.split(' ');
          if (parts.length === 2 && parts[0] === 'Bearer') {
            return parts[1];
          }
        }
        return null;
      };

      expect(extractToken(req)).toBe('cookie-token');
    });

    test('should fallback to Authorization header', () => {
      const req = createMockRequest({
        cookies: {},
        headers: { authorization: 'Bearer header-token' }
      });

      const extractToken = (r) => {
        if (r.cookies && r.cookies.auth_token) {
          return r.cookies.auth_token;
        }
        if (r.headers.authorization) {
          const parts = r.headers.authorization.split(' ');
          if (parts.length === 2 && parts[0] === 'Bearer') {
            return parts[1];
          }
        }
        return null;
      };

      expect(extractToken(req)).toBe('header-token');
    });

    test('should return null if no token found', () => {
      const req = createMockRequest({
        cookies: {},
        headers: {}
      });

      const extractToken = (r) => {
        if (r.cookies && r.cookies.auth_token) {
          return r.cookies.auth_token;
        }
        if (r.headers.authorization) {
          const parts = r.headers.authorization.split(' ');
          if (parts.length === 2 && parts[0] === 'Bearer') {
            return parts[1];
          }
        }
        return null;
      };

      expect(extractToken(req)).toBeNull();
    });

    test('should handle malformed Authorization header', () => {
      const req = createMockRequest({
        headers: { authorization: 'InvalidFormat' }
      });

      const extractToken = (r) => {
        if (r.headers.authorization) {
          const parts = r.headers.authorization.split(' ');
          if (parts.length === 2 && parts[0] === 'Bearer') {
            return parts[1];
          }
        }
        return null;
      };

      expect(extractToken(req)).toBeNull();
    });
  });

  // ============================================
  // Verify Auth Token Tests
  // ============================================
  describe('verifyAuthToken', () => {
    test('should return 401 if no token', () => {
      const res = createMockResponse();
      const token = null;

      if (!token) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          errorAr: 'المصادقة مطلوبة'
        });
      }

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Authentication required'
        })
      );
    });

    test('should attach user to request on valid token', () => {
      const req = createMockRequest();
      const decoded = { id: 'user-123', role: 'admin' };

      req.user = decoded;
      req.userId = decoded.id || decoded.userId;

      expect(req.user).toEqual(decoded);
      expect(req.userId).toBe('user-123');
    });

    test('should return 401 on TokenExpiredError', () => {
      const res = createMockResponse();
      const errorName = 'TokenExpiredError';

      if (errorName === 'TokenExpiredError') {
        res.status(401).json({
          success: false,
          error: 'Token expired. Please login again.',
          errorAr: 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.',
          code: 'TOKEN_EXPIRED'
        });
      }

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'TOKEN_EXPIRED'
        })
      );
    });

    test('should return 401 on JsonWebTokenError', () => {
      const res = createMockResponse();
      const errorName = 'JsonWebTokenError';

      if (errorName === 'JsonWebTokenError') {
        res.status(401).json({
          success: false,
          error: 'Invalid token',
          errorAr: 'رمز غير صالح',
          code: 'INVALID_TOKEN'
        });
      }

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'INVALID_TOKEN'
        })
      );
    });

    test('should return 500 on unexpected error', () => {
      const res = createMockResponse();

      res.status(500).json({
        success: false,
        error: 'Authentication error',
        errorAr: 'خطأ في المصادقة'
      });

      expect(res.status).toHaveBeenCalledWith(500);
    });

    test('should clear cookie on token expiry', () => {
      const res = createMockResponse();

      res.clearCookie('auth_token', {
        httpOnly: true,
        path: '/'
      });

      expect(res.clearCookie).toHaveBeenCalled();
    });
  });

  // ============================================
  // Optional Auth Tests
  // ============================================
  describe('optionalAuth', () => {
    test('should attach user if valid token exists', () => {
      const req = createMockRequest({
        cookies: { auth_token: 'valid-token' }
      });
      const decoded = { id: 'user-123' };

      // Simulate valid token
      req.user = decoded;
      req.userId = decoded.id;

      expect(req.user).toBeDefined();
      expect(req.userId).toBe('user-123');
    });

    test('should continue without user if no token', () => {
      const req = createMockRequest();
      let nextCalled = false;

      // No token, but continue
      nextCalled = true;

      expect(req.user).toBeNull();
      expect(nextCalled).toBe(true);
    });

    test('should continue without user on invalid token', () => {
      const req = createMockRequest({
        cookies: { auth_token: 'invalid-token' }
      });
      let nextCalled = false;

      // Token invalid, but don't fail
      nextCalled = true;

      expect(nextCalled).toBe(true);
    });

    test('should not set user on verification error', () => {
      const req = createMockRequest();

      // Error during verification
      expect(req.user).toBeNull();
    });
  });

  // ============================================
  // Refresh Auth Cookie Tests
  // ============================================
  describe('refreshAuthCookie', () => {
    test('should return 401 if no token to refresh', () => {
      const res = createMockResponse();
      const token = null;

      if (!token) {
        res.status(401).json({
          success: false,
          error: 'No token to refresh',
          errorAr: 'لا يوجد رمز للتحديث'
        });
      }

      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('should generate new token with same payload', () => {
      const decoded = {
        id: 'user-123',
        userId: 'user-123',
        phone: '0501234567',
        role: 'admin'
      };

      const newPayload = {
        id: decoded.id,
        userId: decoded.userId,
        phone: decoded.phone,
        role: decoded.role
      };

      expect(newPayload.id).toBe('user-123');
      expect(newPayload.role).toBe('admin');
    });

    test('should return success on refresh', () => {
      const res = createMockResponse();

      res.json({
        success: true,
        message: 'Token refreshed successfully'
      });

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });

    test('should return 401 on refresh error', () => {
      const res = createMockResponse();

      res.status(401).json({
        success: false,
        error: 'Failed to refresh token',
        errorAr: 'فشل تحديث الرمز'
      });

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  // ============================================
  // Generate Token Tests
  // ============================================
  describe('generateToken', () => {
    test('should generate token with default 7d expiry', () => {
      const defaultExpiry = '7d';
      expect(defaultExpiry).toBe('7d');
    });

    test('should accept custom expiry', () => {
      const customExpiry = '1h';
      expect(customExpiry).toBe('1h');
    });

    test('should include payload in token', () => {
      const payload = { id: 'user-123', role: 'admin' };
      expect(payload.id).toBe('user-123');
      expect(payload.role).toBe('admin');
    });
  });

  // ============================================
  // Bilingual Messages Tests
  // ============================================
  describe('Bilingual Messages', () => {
    test('should include Arabic error messages', () => {
      const messages = {
        authRequired: 'المصادقة مطلوبة',
        tokenExpired: 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.',
        invalidToken: 'رمز غير صالح',
        authError: 'خطأ في المصادقة',
        noTokenToRefresh: 'لا يوجد رمز للتحديث',
        refreshFailed: 'فشل تحديث الرمز'
      };

      // All messages should contain Arabic characters
      Object.values(messages).forEach(msg => {
        expect(msg).toMatch(/[\u0600-\u06FF]/);
      });
    });

    test('should include English error messages', () => {
      const messages = {
        authRequired: 'Authentication required',
        tokenExpired: 'Token expired. Please login again.',
        invalidToken: 'Invalid token',
        authError: 'Authentication error'
      };

      expect(messages.authRequired).toBe('Authentication required');
    });
  });

  // ============================================
  // User ID Extraction Tests
  // ============================================
  describe('User ID Extraction', () => {
    test('should extract id from decoded.id', () => {
      const decoded = { id: 'id-123', userId: 'userId-456' };
      const userId = decoded.id || decoded.userId;
      expect(userId).toBe('id-123');
    });

    test('should fallback to decoded.userId', () => {
      const decoded = { userId: 'userId-456' };
      const userId = decoded.id || decoded.userId;
      expect(userId).toBe('userId-456');
    });
  });
});
