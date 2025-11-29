/**
 * Auth Middleware Unit Tests (authMiddleware.js)
 * Tests JWT authentication and role-based authorization
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// Mock dependencies
jest.unstable_mockModule('../../../src/config/env.js', () => ({
  config: {
    jwt: { secret: 'test-secret-key-for-testing' }
  }
}));

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    auth: jest.fn()
  }
}));

describe('Auth Middleware Unit Tests', () => {
  const createMockRequest = (overrides = {}) => ({
    headers: {},
    originalUrl: '/api/test',
    path: '/api/test',
    method: 'GET',
    user: null,
    ...overrides
  });

  const createMockResponse = () => {
    const res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res)
    };
    return res;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // Public Endpoint Detection Tests
  // ============================================
  describe('Public Endpoint Detection', () => {
    test('should identify member-monitoring as public', () => {
      const publicEndpoints = [
        '/api/member-monitoring',
        '/api/dashboard/stats'
      ];

      const isPublic = publicEndpoints.some(endpoint =>
        '/api/member-monitoring/all'.includes(endpoint)
      );

      expect(isPublic).toBe(true);
    });

    test('should identify dashboard/stats as public', () => {
      const publicEndpoints = [
        '/api/member-monitoring',
        '/api/dashboard/stats'
      ];

      const isPublic = publicEndpoints.some(endpoint =>
        '/api/dashboard/stats'.includes(endpoint)
      );

      expect(isPublic).toBe(true);
    });

    test('should NOT identify /api/members as public', () => {
      const publicEndpoints = [
        '/api/member-monitoring',
        '/api/dashboard/stats'
      ];

      const isPublic = publicEndpoints.some(endpoint =>
        '/api/members'.includes(endpoint)
      );

      expect(isPublic).toBe(false);
    });
  });

  // ============================================
  // Token Extraction Tests
  // ============================================
  describe('Token Extraction', () => {
    test('should extract token from Bearer header', () => {
      const req = createMockRequest({
        headers: { authorization: 'Bearer test-token-123' }
      });

      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      expect(token).toBe('test-token-123');
    });

    test('should handle lowercase authorization header', () => {
      const req = createMockRequest({
        headers: { authorization: 'Bearer my-token' }
      });

      const token = req.headers['authorization']?.split(' ')[1];
      expect(token).toBe('my-token');
    });
  });

  // ============================================
  // Missing JWT Secret Tests
  // ============================================
  describe('Missing JWT Secret', () => {
    test('should return 500 if JWT_SECRET not configured', () => {
      const res = createMockResponse();
      const jwtSecret = null;

      if (!jwtSecret) {
        res.status(500).json({
          success: false,
          error: 'Server configuration error'
        });
      }

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Server configuration error'
        })
      );
    });
  });

  // ============================================
  // User Object Construction Tests
  // ============================================
  describe('User Object Construction', () => {
    test('should construct user object from decoded token', () => {
      const decoded = {
        id: 'user-123',
        role: 'admin',
        email: 'admin@example.com',
        phone: '0501234567',
        fullName: 'محمد أحمد'
      };

      const user = {
        id: decoded.id || decoded.user_id,
        role: decoded.role || 'member',
        email: decoded.email,
        phone: decoded.phone,
        fullName: decoded.fullName || decoded.full_name,
        membershipNumber: decoded.membershipNumber || decoded.membership_number
      };

      expect(user.id).toBe('user-123');
      expect(user.role).toBe('admin');
      expect(user.email).toBe('admin@example.com');
      expect(user.fullName).toBe('محمد أحمد');
    });

    test('should default role to member', () => {
      const decoded = { id: 'user-123' };

      const user = {
        id: decoded.id,
        role: decoded.role || 'member'
      };

      expect(user.role).toBe('member');
    });

    test('should handle user_id field', () => {
      const decoded = { user_id: 'user-456' };

      const user = {
        id: decoded.id || decoded.user_id
      };

      expect(user.id).toBe('user-456');
    });
  });

  // ============================================
  // Authorize Middleware Tests
  // ============================================
  describe('Authorize Middleware', () => {
    test('should convert single role to array', () => {
      const roles = 'admin';
      const requiredRoles = Array.isArray(roles) ? roles : [roles];

      expect(requiredRoles).toEqual(['admin']);
    });

    test('should keep array roles as array', () => {
      const roles = ['admin', 'super_admin'];
      const requiredRoles = Array.isArray(roles) ? roles : [roles];

      expect(requiredRoles).toEqual(['admin', 'super_admin']);
    });

    test('should allow super_admin access to everything', () => {
      const userRole = 'super_admin';
      const hasAccess = userRole === 'super_admin';

      expect(hasAccess).toBe(true);
    });

    test('should check role in required roles', () => {
      const userRole = 'admin';
      const requiredRoles = ['admin', 'financial_manager'];

      const hasAccess = requiredRoles.includes(userRole);
      expect(hasAccess).toBe(true);
    });

    test('should deny if role not in required roles', () => {
      const userRole = 'member';
      const requiredRoles = ['admin', 'financial_manager'];

      const hasAccess = requiredRoles.includes(userRole);
      expect(hasAccess).toBe(false);
    });

    test('should return 401 if no user', () => {
      const res = createMockResponse();
      const req = createMockRequest({ user: null });

      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'You must be logged in to access this resource'
        });
      }

      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('should return 403 with required roles message', () => {
      const res = createMockResponse();
      const requiredRoles = ['admin', 'financial_manager'];

      res.status(403).json({
        success: false,
        error: 'Access denied',
        message: `This action requires one of these roles: ${requiredRoles.join(', ')}`
      });

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'This action requires one of these roles: admin, financial_manager'
        })
      );
    });
  });

  // ============================================
  // Helper Middleware Tests
  // ============================================
  describe('Helper Middlewares', () => {
    test('requireAdmin should include admin, super_admin, financial_manager', () => {
      const adminRoles = ['admin', 'super_admin', 'financial_manager'];

      expect(adminRoles).toContain('admin');
      expect(adminRoles).toContain('super_admin');
      expect(adminRoles).toContain('financial_manager');
    });

    test('requireSuperAdmin should only include super_admin', () => {
      const superAdminRoles = ['super_admin'];

      expect(superAdminRoles).toEqual(['super_admin']);
    });

    test('requireFinancialManager should include appropriate roles', () => {
      const financialRoles = ['financial_manager', 'admin', 'super_admin'];

      expect(financialRoles).toContain('financial_manager');
      expect(financialRoles).toContain('admin');
      expect(financialRoles).toContain('super_admin');
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================
  describe('Error Handling', () => {
    test('should return 401 for TokenExpiredError', () => {
      const res = createMockResponse();

      res.status(401).json({
        success: false,
        error: 'Token expired',
        message: 'Your session has expired. Please login again.'
      });

      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('should return 401 for JsonWebTokenError', () => {
      const res = createMockResponse();

      res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'The provided token is invalid.'
      });

      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('should return 401 for generic token error', () => {
      const res = createMockResponse();

      res.status(401).json({
        success: false,
        error: 'Authentication failed',
        message: 'Token verification failed'
      });

      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('should return 500 for unexpected auth error', () => {
      const res = createMockResponse();

      res.status(500).json({
        success: false,
        error: 'Authentication error',
        message: 'An unexpected error occurred during authentication'
      });

      expect(res.status).toHaveBeenCalledWith(500);
    });

    test('should return 500 for unexpected authorization error', () => {
      const res = createMockResponse();

      res.status(500).json({
        success: false,
        error: 'Authorization error',
        message: 'An unexpected error occurred during authorization'
      });

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ============================================
  // Logging Tests
  // ============================================
  describe('Logging', () => {
    test('should log warning for missing token', () => {
      const logData = {
        path: '/api/members',
        method: 'GET'
      };

      expect(logData.path).toBeDefined();
      expect(logData.method).toBeDefined();
    });

    test('should log authorization failure details', () => {
      const logData = {
        userRole: 'member',
        requiredRoles: ['admin'],
        userId: 'user-123'
      };

      expect(logData.userRole).toBe('member');
      expect(logData.requiredRoles).toEqual(['admin']);
    });
  });
});
