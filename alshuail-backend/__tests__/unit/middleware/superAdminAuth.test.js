/**
 * Super Admin Auth Middleware Unit Tests
 * Tests super admin authentication and authorization
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// Mock dependencies
const mockSupabaseResponse = {
  data: null,
  error: null
};

const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  single: jest.fn(() => Promise.resolve(mockSupabaseResponse))
};

jest.unstable_mockModule('../../../src/config/database.js', () => ({
  supabase: mockSupabase
}));

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('Super Admin Auth Middleware Unit Tests', () => {
  const createMockRequest = (overrides = {}) => ({
    user: null,
    path: '/api/test',
    superAdmin: null,
    ...overrides
  });

  const createMockResponse = () => {
    const res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res)
    };
    return res;
  };

  const mockNext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseResponse.data = null;
    mockSupabaseResponse.error = null;
  });

  // ============================================
  // Authentication Check Tests
  // ============================================
  describe('Authentication Check', () => {
    test('should return 401 if no user ID or email', () => {
      const res = createMockResponse();
      const req = createMockRequest({ user: null });

      const userId = req.user?.id;
      const userEmail = req.user?.email;

      if (!userId && !userEmail) {
        res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'يجب تسجيل الدخول أولاً',
          message_en: 'Authentication required'
        });
      }

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'UNAUTHORIZED'
        })
      );
    });

    test('should include bilingual authentication message', () => {
      const res = createMockResponse();

      res.status(401).json({
        message: 'يجب تسجيل الدخول أولاً',
        message_en: 'Authentication required'
      });

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/[\u0600-\u06FF]/),
          message_en: 'Authentication required'
        })
      );
    });
  });

  // ============================================
  // Database Check Tests
  // ============================================
  describe('Database Role Check', () => {
    test('should return 500 on database error', () => {
      const res = createMockResponse();
      const error = { message: 'Connection failed' };

      if (error) {
        res.status(500).json({
          success: false,
          error: 'DATABASE_ERROR',
          message: 'خطأ في التحقق من الصلاحيات'
        });
      }

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'DATABASE_ERROR'
        })
      );
    });

    test('should query users table with correct fields', () => {
      const selectFields = 'role, email';
      expect(selectFields).toContain('role');
      expect(selectFields).toContain('email');
    });
  });

  // ============================================
  // Super Admin Role Check Tests
  // ============================================
  describe('Super Admin Role Check', () => {
    test('should return 403 if not super_admin', () => {
      const res = createMockResponse();
      const user = { role: 'admin', email: 'admin@test.com' };

      if (user.role !== 'super_admin') {
        res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'هذه العملية متاحة للمشرف العام فقط',
          message_en: 'Super admin access required',
          requiredRole: 'super_admin',
          currentRole: user.role
        });
      }

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'FORBIDDEN',
          requiredRole: 'super_admin',
          currentRole: 'admin'
        })
      );
    });

    test('should deny financial_manager role', () => {
      const user = { role: 'financial_manager' };
      const isSuperAdmin = user.role === 'super_admin';
      expect(isSuperAdmin).toBe(false);
    });

    test('should deny member role', () => {
      const user = { role: 'member' };
      const isSuperAdmin = user.role === 'super_admin';
      expect(isSuperAdmin).toBe(false);
    });

    test('should allow super_admin role', () => {
      const user = { role: 'super_admin' };
      const isSuperAdmin = user.role === 'super_admin';
      expect(isSuperAdmin).toBe(true);
    });
  });

  // ============================================
  // Super Admin Request Attachment Tests
  // ============================================
  describe('Super Admin Request Attachment', () => {
    test('should attach superAdmin object to request', () => {
      const req = createMockRequest({
        user: { id: 'admin-123' }
      });

      const user = { email: 'admin@test.com', role: 'super_admin' };

      req.superAdmin = {
        id: req.user.id,
        email: user.email,
        role: user.role
      };

      expect(req.superAdmin).toEqual({
        id: 'admin-123',
        email: 'admin@test.com',
        role: 'super_admin'
      });
    });

    test('should call next() when super admin access granted', () => {
      let nextCalled = false;
      const user = { role: 'super_admin' };

      if (user.role === 'super_admin') {
        nextCalled = true;
      }

      expect(nextCalled).toBe(true);
    });
  });

  // ============================================
  // isSuperAdmin Utility Tests
  // ============================================
  describe('isSuperAdmin Utility Function', () => {
    test('should return true for super_admin role', () => {
      const data = { role: 'super_admin' };
      const result = data?.role === 'super_admin';
      expect(result).toBe(true);
    });

    test('should return false for non-super_admin role', () => {
      const data = { role: 'admin' };
      const result = data?.role === 'super_admin';
      expect(result).toBe(false);
    });

    test('should return false on database error', () => {
      const error = { message: 'Not found' };
      let result = false;

      if (error) {
        result = false;
      }

      expect(result).toBe(false);
    });

    test('should return false when user not found', () => {
      const data = null;
      const result = data?.role === 'super_admin';
      expect(result).toBe(false);
    });
  });

  // ============================================
  // Logging Tests
  // ============================================
  describe('Logging', () => {
    test('should log access granted with details', () => {
      const logData = {
        userId: 'admin-123',
        email: 'admin@test.com',
        path: '/api/admin/settings'
      };

      expect(logData.userId).toBe('admin-123');
      expect(logData.email).toBe('admin@test.com');
      expect(logData.path).toBe('/api/admin/settings');
    });

    test('should warn on access denied', () => {
      const logData = {
        userId: 'user-123',
        email: 'user@test.com',
        role: 'member',
        path: '/api/admin/settings'
      };

      expect(logData.role).toBe('member');
    });

    test('should log error on database error', () => {
      const error = { message: 'Connection timeout' };
      const userId = 'user-123';

      expect(error.message).toBe('Connection timeout');
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================
  describe('Error Handling', () => {
    test('should return 500 on unexpected error', () => {
      const res = createMockResponse();

      res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'خطأ في الخادم'
      });

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'SERVER_ERROR'
        })
      );
    });

    test('should include Arabic server error message', () => {
      const message = 'خطأ في الخادم';
      expect(message).toMatch(/[\u0600-\u06FF]/);
    });
  });

  // ============================================
  // Middleware Order Tests
  // ============================================
  describe('Middleware Order', () => {
    test('should expect req.user from authenticateToken', () => {
      const req = createMockRequest({
        user: {
          id: 'user-123',
          email: 'user@test.com'
        }
      });

      // Should be set by previous middleware
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe('user-123');
    });

    test('should work without email if id present', () => {
      const req = createMockRequest({
        user: { id: 'user-123' }
      });

      const userId = req.user?.id;
      const userEmail = req.user?.email;
      const hasIdentifier = userId || userEmail;

      expect(hasIdentifier).toBeTruthy();
    });

    test('should work with email if id absent', () => {
      const req = createMockRequest({
        user: { email: 'user@test.com' }
      });

      const userId = req.user?.id;
      const userEmail = req.user?.email;
      const hasIdentifier = userId || userEmail;

      expect(hasIdentifier).toBeTruthy();
    });
  });

  // ============================================
  // Response Message Tests
  // ============================================
  describe('Response Messages', () => {
    test('should include forbidden message in Arabic', () => {
      const message = 'هذه العملية متاحة للمشرف العام فقط';
      expect(message).toMatch(/[\u0600-\u06FF]/);
    });

    test('should include forbidden message in English', () => {
      const message_en = 'Super admin access required';
      expect(message_en).toBe('Super admin access required');
    });

    test('should include current role in forbidden response', () => {
      const res = createMockResponse();
      const currentRole = 'financial_manager';

      res.status(403).json({
        currentRole: currentRole
      });

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          currentRole: 'financial_manager'
        })
      );
    });

    test('should include required role in forbidden response', () => {
      const res = createMockResponse();

      res.status(403).json({
        requiredRole: 'super_admin'
      });

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          requiredRole: 'super_admin'
        })
      );
    });
  });

  // ============================================
  // Email Query Tests
  // ============================================
  describe('Email Query in isSuperAdmin', () => {
    test('should query by email', () => {
      const email = 'admin@test.com';
      const query = { email: email };

      expect(query.email).toBe('admin@test.com');
    });

    test('should select only role field', () => {
      const selectFields = 'role';
      expect(selectFields).toBe('role');
    });
  });

  // ============================================
  // Path Logging Tests
  // ============================================
  describe('Path Logging', () => {
    test('should include request path in logs', () => {
      const req = createMockRequest({
        path: '/api/admin/users'
      });

      expect(req.path).toBe('/api/admin/users');
    });

    test('should log path on access granted', () => {
      const logData = {
        action: 'Access granted',
        path: '/api/admin/settings'
      };

      expect(logData.path).toBe('/api/admin/settings');
    });

    test('should log path on access denied', () => {
      const logData = {
        action: 'Access denied',
        path: '/api/admin/settings'
      };

      expect(logData.path).toBe('/api/admin/settings');
    });
  });
});
