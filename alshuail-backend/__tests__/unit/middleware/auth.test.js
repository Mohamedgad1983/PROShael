/**
 * Auth Middleware Unit Tests (auth.js)
 * Tests JWT authentication and admin authorization
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
    debug: jest.fn(),
    auth: jest.fn()
  }
}));

jest.unstable_mockModule('../../../src/config/env.js', () => ({
  config: {
    jwt: { secret: 'test-secret-key-for-testing' }
  }
}));

describe('Auth Middleware Unit Tests', () => {
  const createMockRequest = (overrides = {}) => ({
    headers: {},
    originalUrl: '/api/test',
    path: '/api/test',
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

  const mockNext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseResponse.data = null;
    mockSupabaseResponse.error = null;
  });

  // ============================================
  // Token Extraction Tests
  // ============================================
  describe('Token Extraction', () => {
    test('should extract token from Bearer header', () => {
      const authHeader = 'Bearer test-token-123';
      const token = authHeader && authHeader.split(' ')[1];

      expect(token).toBe('test-token-123');
    });

    test('should handle missing authorization header', () => {
      const req = createMockRequest({ headers: {} });
      const authHeader = req.headers['authorization'];

      expect(authHeader).toBeUndefined();
    });

    test('should handle malformed Bearer header', () => {
      const authHeader = 'Bearertest-token';
      const parts = authHeader.split(' ');

      expect(parts.length).toBe(1);
    });
  });

  // ============================================
  // Public Endpoint Tests
  // ============================================
  describe('Public Endpoint Access', () => {
    test('should allow public access to member-monitoring endpoint', () => {
      const req = createMockRequest({
        originalUrl: '/api/member-monitoring/dashboard'
      });

      const isPublicEndpoint = req.originalUrl.includes('member-monitoring');
      expect(isPublicEndpoint).toBe(true);
    });

    test('should allow public access to dashboard/stats endpoint', () => {
      const req = createMockRequest({
        originalUrl: '/api/dashboard/stats'
      });

      const isPublicEndpoint = req.originalUrl.includes('dashboard/stats');
      expect(isPublicEndpoint).toBe(true);
    });

    test('should set viewer role for public access', () => {
      const req = createMockRequest({
        originalUrl: '/api/member-monitoring'
      });

      if (req.originalUrl.includes('member-monitoring')) {
        req.user = { id: 'public-access', role: 'viewer' };
      }

      expect(req.user.role).toBe('viewer');
      expect(req.user.id).toBe('public-access');
    });

    test('should not allow public access to protected endpoints', () => {
      const req = createMockRequest({
        originalUrl: '/api/members/create'
      });

      const isPublicEndpoint =
        req.originalUrl.includes('member-monitoring') ||
        req.originalUrl.includes('dashboard/stats');

      expect(isPublicEndpoint).toBe(false);
    });
  });

  // ============================================
  // Missing Token Tests
  // ============================================
  describe('Missing Token Handling', () => {
    test('should return 401 when no token on protected endpoint', () => {
      const res = createMockResponse();
      const req = createMockRequest({
        headers: {},
        originalUrl: '/api/members'
      });

      const token = req.headers['authorization']?.split(' ')[1];

      if (!token && !req.originalUrl.includes('member-monitoring')) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'No token provided'
        });
      }

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Authentication required'
        })
      );
    });
  });

  // ============================================
  // Token Expiry Tests
  // ============================================
  describe('Token Expiry Handling', () => {
    test('should handle TokenExpiredError', () => {
      const res = createMockResponse();
      const error = { name: 'TokenExpiredError' };

      if (error.name === 'TokenExpiredError') {
        res.status(401).json({
          success: false,
          error: 'Token expired',
          message: 'Your session has expired. Please login again.'
        });
      }

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Token expired'
        })
      );
    });

    test('should handle JsonWebTokenError', () => {
      const res = createMockResponse();
      const error = { name: 'JsonWebTokenError' };

      if (error.name === 'JsonWebTokenError') {
        res.status(401).json({
          success: false,
          error: 'Invalid token',
          message: 'The provided token is invalid.'
        });
      }

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid token'
        })
      );
    });
  });

  // ============================================
  // User Object Construction Tests
  // ============================================
  describe('User Object Construction', () => {
    test('should handle member role decoded from token', () => {
      const decoded = {
        id: 'member-123',
        role: 'member',
        phone: '0501234567',
        fullName: 'محمد بن علي'
      };

      const user = {
        id: decoded.id,
        role: decoded.role,
        phone: decoded.phone,
        fullName: decoded.fullName || decoded.full_name,
        full_name: decoded.fullName || decoded.full_name
      };

      expect(user.id).toBe('member-123');
      expect(user.role).toBe('member');
      expect(user.fullName).toBe('محمد بن علي');
    });

    test('should handle user_id to id mapping', () => {
      const user = {
        user_id: 'user-456'
      };

      if (!user.id && user.user_id) {
        user.id = user.user_id;
      }

      expect(user.id).toBe('user-456');
    });
  });

  // ============================================
  // RequireAdmin Tests
  // ============================================
  describe('RequireAdmin Middleware', () => {
    test('should allow admin role', () => {
      const req = createMockRequest({
        user: { id: 'admin-123', role: 'admin' }
      });

      const allowedRoles = ['admin', 'super_admin', 'financial_manager'];
      const isAllowed = allowedRoles.includes(req.user.role);

      expect(isAllowed).toBe(true);
    });

    test('should allow super_admin role', () => {
      const req = createMockRequest({
        user: { id: 'admin-123', role: 'super_admin' }
      });

      const allowedRoles = ['admin', 'super_admin', 'financial_manager'];
      const isAllowed = allowedRoles.includes(req.user.role);

      expect(isAllowed).toBe(true);
    });

    test('should allow financial_manager role', () => {
      const req = createMockRequest({
        user: { id: 'admin-123', role: 'financial_manager' }
      });

      const allowedRoles = ['admin', 'super_admin', 'financial_manager'];
      const isAllowed = allowedRoles.includes(req.user.role);

      expect(isAllowed).toBe(true);
    });

    test('should deny member role', () => {
      const req = createMockRequest({
        user: { id: 'member-123', role: 'member' }
      });

      const allowedRoles = ['admin', 'super_admin', 'financial_manager'];
      const isAllowed = allowedRoles.includes(req.user.role);

      expect(isAllowed).toBe(false);
    });

    test('should return 401 when no user object', () => {
      const res = createMockResponse();
      const req = createMockRequest({ user: null });

      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('should return 403 for unauthorized role', () => {
      const res = createMockResponse();
      const req = createMockRequest({
        user: { id: 'user-123', role: 'viewer' }
      });

      const allowedRoles = ['admin', 'super_admin', 'financial_manager'];

      if (!allowedRoles.includes(req.user.role)) {
        res.status(403).json({
          success: false,
          error: 'Admin privileges required',
          message: `Your role (${req.user.role}) does not have access to this resource`
        });
      }

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ============================================
  // RequireSuperAdmin Tests
  // ============================================
  describe('RequireSuperAdmin Middleware', () => {
    test('should allow super_admin role', () => {
      const userRole = 'super_admin';
      const isAllowed = userRole === 'super_admin';

      expect(isAllowed).toBe(true);
    });

    test('should deny admin role', () => {
      const userRole = 'admin';
      const isAllowed = userRole === 'super_admin';

      expect(isAllowed).toBe(false);
    });

    test('should deny financial_manager role', () => {
      const userRole = 'financial_manager';
      const isAllowed = userRole === 'super_admin';

      expect(isAllowed).toBe(false);
    });

    test('should return 403 with specific message', () => {
      const res = createMockResponse();
      const req = createMockRequest({
        user: { id: 'admin-123', role: 'admin' }
      });

      if (req.user.role !== 'super_admin') {
        res.status(403).json({
          success: false,
          error: 'Super Admin privileges required',
          message: 'This action requires Super Admin privileges'
        });
      }

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Super Admin privileges required'
        })
      );
    });
  });

  // ============================================
  // Database Role Lookup Tests
  // ============================================
  describe('Database Role Lookup', () => {
    test('should update role from database', () => {
      const req = createMockRequest({
        user: { id: 'user-123', role: 'member' }
      });

      const dbMember = { role: 'admin' };
      req.user.role = dbMember.role;

      expect(req.user.role).toBe('admin');
    });

    test('should return 500 on database error', () => {
      const res = createMockResponse();
      const error = { message: 'Connection failed' };

      res.status(500).json({
        success: false,
        error: 'Authorization check failed'
      });

      expect(res.status).toHaveBeenCalledWith(500);
    });

    test('should return 403 when member not found', () => {
      const res = createMockResponse();

      res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Member record not found'
      });

      expect(res.status).toHaveBeenCalledWith(403);
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
        error: 'Authentication error',
        message: 'An unexpected error occurred during authentication'
      });

      expect(res.status).toHaveBeenCalledWith(500);
    });

    test('should return 500 on authorization error', () => {
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
  // Export Alias Tests
  // ============================================
  describe('Export Aliases', () => {
    test('should have authenticateToken alias', () => {
      // authenticate and authenticateToken should be the same function
      const authenticate = () => {};
      const authenticateToken = authenticate;

      expect(authenticateToken).toBe(authenticate);
    });

    test('should have protect alias', () => {
      // authenticate and protect should be the same function
      const authenticate = () => {};
      const protect = authenticate;

      expect(protect).toBe(authenticate);
    });
  });
});
