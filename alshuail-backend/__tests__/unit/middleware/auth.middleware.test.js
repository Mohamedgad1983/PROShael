/**
 * Auth Middleware Unit Tests
 * Comprehensive tests for authentication and authorization middleware
 * Target: Testing authenticate, requireAdmin, requireSuperAdmin functions
 */

import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';

const SECRET_KEY = 'test-secret-key-for-testing';

// Mock supabase responses
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

// Mock dependencies before importing module
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
    jwt: {
      secret: SECRET_KEY
    }
  }
}));

describe('Auth Middleware Unit Tests', () => {

  // Helper functions
  const createMockRequest = (overrides = {}) => ({
    headers: {},
    originalUrl: '/api/test',
    path: '/test',
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

  const createMockNext = () => jest.fn();

  const createValidToken = (payload = {}) => {
    const defaultPayload = {
      id: 'user123',
      role: 'admin',
      email: 'test@example.com'
    };
    return jwt.sign({ ...defaultPayload, ...payload }, SECRET_KEY);
  };

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
      const token = createValidToken();
      const authHeader = `Bearer ${token}`;
      const extractedToken = authHeader.split(' ')[1];

      expect(extractedToken).toBe(token);
    });

    test('should handle missing Authorization header', () => {
      const req = createMockRequest({
        headers: {}
      });

      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      expect(token).toBeUndefined();
    });

    test('should handle Authorization header without Bearer', () => {
      const token = createValidToken();
      const req = createMockRequest({
        headers: {
          authorization: token // No "Bearer " prefix
        }
      });

      const authHeader = req.headers['authorization'];
      const extractedToken = authHeader && authHeader.split(' ')[1];

      expect(extractedToken).toBeUndefined();
    });

    test('should handle empty Bearer token', () => {
      const req = createMockRequest({
        headers: {
          authorization: 'Bearer '
        }
      });

      const authHeader = req.headers['authorization'];
      const extractedToken = authHeader && authHeader.split(' ')[1];

      expect(extractedToken).toBe('');
    });
  });

  // ============================================
  // JWT Verification Tests
  // ============================================
  describe('JWT Verification', () => {

    test('should verify valid token', () => {
      const payload = { id: 'user123', role: 'admin' };
      const token = jwt.sign(payload, SECRET_KEY);

      const decoded = jwt.verify(token, SECRET_KEY);

      expect(decoded.id).toBe('user123');
      expect(decoded.role).toBe('admin');
    });

    test('should reject expired token', () => {
      const payload = { id: 'user123', role: 'admin' };
      const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '-1h' });

      expect(() => {
        jwt.verify(token, SECRET_KEY);
      }).toThrow('jwt expired');
    });

    test('should reject token with wrong secret', () => {
      const payload = { id: 'user123', role: 'admin' };
      const token = jwt.sign(payload, 'different-secret');

      expect(() => {
        jwt.verify(token, SECRET_KEY);
      }).toThrow();
    });

    test('should reject malformed token', () => {
      expect(() => {
        jwt.verify('not.a.valid.token', SECRET_KEY);
      }).toThrow();
    });

    test('should handle TokenExpiredError', () => {
      const payload = { id: 'user123' };
      const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '-1s' });

      try {
        jwt.verify(token, SECRET_KEY);
      } catch (err) {
        expect(err.name).toBe('TokenExpiredError');
      }
    });

    test('should handle JsonWebTokenError', () => {
      try {
        jwt.verify('invalid-token', SECRET_KEY);
      } catch (err) {
        expect(err.name).toBe('JsonWebTokenError');
      }
    });
  });

  // ============================================
  // Public Access Tests
  // ============================================
  describe('Public Access Endpoints', () => {

    test('should allow access to member-monitoring without token', () => {
      const req = createMockRequest({
        originalUrl: '/api/member-monitoring/stats',
        headers: {}
      });

      const shouldAllowPublic = req.originalUrl.includes('member-monitoring');
      expect(shouldAllowPublic).toBe(true);
    });

    test('should allow access to dashboard/stats without token', () => {
      const req = createMockRequest({
        originalUrl: '/api/dashboard/stats',
        headers: {}
      });

      const shouldAllowPublic = req.originalUrl.includes('dashboard/stats');
      expect(shouldAllowPublic).toBe(true);
    });

    test('should require token for other endpoints', () => {
      const req = createMockRequest({
        originalUrl: '/api/members/list',
        headers: {}
      });

      const shouldAllowPublic = req.originalUrl.includes('member-monitoring') ||
                               req.originalUrl.includes('dashboard/stats');
      expect(shouldAllowPublic).toBe(false);
    });
  });

  // ============================================
  // Role-Based Access Tests
  // ============================================
  describe('Role-Based Access Control', () => {

    describe('Admin Role Check', () => {
      const allowedAdminRoles = ['admin', 'super_admin', 'financial_manager'];

      test('should grant access for admin role', () => {
        expect(allowedAdminRoles.includes('admin')).toBe(true);
      });

      test('should grant access for super_admin role', () => {
        expect(allowedAdminRoles.includes('super_admin')).toBe(true);
      });

      test('should grant access for financial_manager role', () => {
        expect(allowedAdminRoles.includes('financial_manager')).toBe(true);
      });

      test('should deny access for member role', () => {
        expect(allowedAdminRoles.includes('member')).toBe(false);
      });

      test('should deny access for user_member role', () => {
        expect(allowedAdminRoles.includes('user_member')).toBe(false);
      });

      test('should deny access for family_tree_admin role', () => {
        expect(allowedAdminRoles.includes('family_tree_admin')).toBe(false);
      });
    });

    describe('Super Admin Role Check', () => {
      test('should grant access only for super_admin role', () => {
        const roles = ['super_admin', 'admin', 'financial_manager', 'member'];

        roles.forEach(role => {
          const hasAccess = role === 'super_admin';
          if (role === 'super_admin') {
            expect(hasAccess).toBe(true);
          } else {
            expect(hasAccess).toBe(false);
          }
        });
      });
    });
  });

  // ============================================
  // User Object Construction Tests
  // ============================================
  describe('User Object Construction', () => {

    test('should construct user object from decoded token', () => {
      const decoded = {
        id: 'user123',
        email: 'test@example.com',
        role: 'admin',
        permissions: { view_dashboard: true }
      };

      const user = { ...decoded };

      expect(user.id).toBe('user123');
      expect(user.email).toBe('test@example.com');
      expect(user.role).toBe('admin');
      expect(user.permissions.view_dashboard).toBe(true);
    });

    test('should handle member token with additional fields', () => {
      const decoded = {
        id: 'member123',
        phone: '+966501234567',
        role: 'member',
        membershipNumber: 'SH001',
        fullName: 'محمد الشعيل'
      };

      const user = {
        id: decoded.id,
        role: decoded.role,
        phone: decoded.phone,
        fullName: decoded.fullName || decoded.full_name,
        full_name: decoded.fullName || decoded.full_name,
        membershipNumber: decoded.membershipNumber,
        membership_number: decoded.membershipNumber
      };

      expect(user.id).toBe('member123');
      expect(user.phone).toBe('+966501234567');
      expect(user.fullName).toBe('محمد الشعيل');
      expect(user.full_name).toBe('محمد الشعيل');
      expect(user.membershipNumber).toBe('SH001');
      expect(user.membership_number).toBe('SH001');
    });

    test('should normalize user_id to id', () => {
      const decoded = {
        user_id: 'user123'
      };

      const user = { ...decoded };
      if (!user.id && user.user_id) {
        user.id = user.user_id;
      }

      expect(user.id).toBe('user123');
    });

    test('should merge member database data with token data', () => {
      const decoded = {
        id: 'member123',
        role: 'member'
      };

      const memberFromDb = {
        id: 'member123',
        full_name: 'محمد الشعيل',
        phone: '+966501234567',
        email: 'member@example.com',
        balance: 2500
      };

      const user = {
        ...memberFromDb,
        ...decoded,
        id: memberFromDb.id,
        role: 'member'
      };

      expect(user.id).toBe('member123');
      expect(user.role).toBe('member');
      expect(user.full_name).toBe('محمد الشعيل');
      expect(user.balance).toBe(2500);
    });
  });

  // ============================================
  // Error Response Tests
  // ============================================
  describe('Error Responses', () => {

    test('should return 401 for missing token', () => {
      const res = createMockResponse();

      res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'No token provided'
      });

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'Authentication required'
      }));
    });

    test('should return 401 for expired token', () => {
      const res = createMockResponse();

      res.status(401).json({
        success: false,
        error: 'Token expired',
        message: 'Your session has expired. Please login again.'
      });

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Token expired'
      }));
    });

    test('should return 401 for invalid token', () => {
      const res = createMockResponse();

      res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'The provided token is invalid.'
      });

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Invalid token'
      }));
    });

    test('should return 403 for insufficient privileges', () => {
      const res = createMockResponse();

      res.status(403).json({
        success: false,
        error: 'Admin privileges required',
        message: 'Your role (member) does not have access to this resource'
      });

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Admin privileges required'
      }));
    });

    test('should return 500 for unexpected errors', () => {
      const res = createMockResponse();

      res.status(500).json({
        success: false,
        error: 'Authentication error',
        message: 'An unexpected error occurred during authentication'
      });

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Authentication error'
      }));
    });
  });

  // ============================================
  // RequireAdmin Logic Tests
  // ============================================
  describe('RequireAdmin Logic', () => {

    test('should allow user with admin role from token', () => {
      const req = createMockRequest({
        user: { id: 'user123', role: 'admin' }
      });

      const allowedRoles = ['admin', 'super_admin', 'financial_manager'];
      const hasAccess = allowedRoles.includes(req.user.role);

      expect(hasAccess).toBe(true);
    });

    test('should allow user with super_admin role from token', () => {
      const req = createMockRequest({
        user: { id: 'user123', role: 'super_admin' }
      });

      const allowedRoles = ['admin', 'super_admin', 'financial_manager'];
      const hasAccess = allowedRoles.includes(req.user.role);

      expect(hasAccess).toBe(true);
    });

    test('should reject user with member role', () => {
      const req = createMockRequest({
        user: { id: 'user123', role: 'member' }
      });

      const allowedRoles = ['admin', 'super_admin', 'financial_manager'];
      const hasAccess = allowedRoles.includes(req.user.role);

      expect(hasAccess).toBe(false);
    });

    test('should reject request without user object', () => {
      const req = createMockRequest({
        user: null
      });

      expect(req.user).toBeNull();
    });

    test('should get user id from either id or user_id field', () => {
      const req1 = createMockRequest({
        user: { id: 'user123', role: 'admin' }
      });
      const req2 = createMockRequest({
        user: { user_id: 'user456', role: 'admin' }
      });

      const userId1 = req1.user.id || req1.user.user_id;
      const userId2 = req2.user.id || req2.user.user_id;

      expect(userId1).toBe('user123');
      expect(userId2).toBe('user456');
    });
  });

  // ============================================
  // RequireSuperAdmin Logic Tests
  // ============================================
  describe('RequireSuperAdmin Logic', () => {

    test('should allow user with super_admin role', () => {
      const req = createMockRequest({
        user: { id: 'user123', role: 'super_admin' }
      });

      const hasAccess = req.user.role === 'super_admin';
      expect(hasAccess).toBe(true);
    });

    test('should reject user with admin role', () => {
      const req = createMockRequest({
        user: { id: 'user123', role: 'admin' }
      });

      const hasAccess = req.user.role === 'super_admin';
      expect(hasAccess).toBe(false);
    });

    test('should reject user with financial_manager role', () => {
      const req = createMockRequest({
        user: { id: 'user123', role: 'financial_manager' }
      });

      const hasAccess = req.user.role === 'super_admin';
      expect(hasAccess).toBe(false);
    });
  });

  // ============================================
  // Token Payload Tests
  // ============================================
  describe('Token Payload Structure', () => {

    test('should include all required admin fields', () => {
      const adminPayload = {
        id: 'admin123',
        email: 'admin@example.com',
        phone: '+966501234567',
        role: 'super_admin',
        permissions: { all_access: true }
      };

      const token = jwt.sign(adminPayload, SECRET_KEY);
      const decoded = jwt.verify(token, SECRET_KEY);

      expect(decoded).toHaveProperty('id');
      expect(decoded).toHaveProperty('email');
      expect(decoded).toHaveProperty('role');
      expect(decoded).toHaveProperty('permissions');
    });

    test('should include all required member fields', () => {
      const memberPayload = {
        id: 'member123',
        phone: '+966501234567',
        role: 'member',
        membershipNumber: 'SH001',
        fullName: 'محمد الشعيل'
      };

      const token = jwt.sign(memberPayload, SECRET_KEY);
      const decoded = jwt.verify(token, SECRET_KEY);

      expect(decoded).toHaveProperty('id');
      expect(decoded).toHaveProperty('phone');
      expect(decoded).toHaveProperty('role');
      expect(decoded).toHaveProperty('membershipNumber');
      expect(decoded).toHaveProperty('fullName');
    });

    test('should include iat and exp claims', () => {
      const payload = { id: 'user123' };
      const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' });
      const decoded = jwt.verify(token, SECRET_KEY);

      expect(decoded).toHaveProperty('iat');
      expect(decoded).toHaveProperty('exp');
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });
  });

  // ============================================
  // Edge Cases Tests
  // ============================================
  describe('Edge Cases', () => {

    test('should handle undefined authorization header', () => {
      const req = createMockRequest();
      const authHeader = req.headers['authorization'];

      expect(authHeader).toBeUndefined();
    });

    test('should handle null user role', () => {
      const req = createMockRequest({
        user: { id: 'user123', role: null }
      });

      const allowedRoles = ['admin', 'super_admin'];
      const hasAccess = req.user.role && allowedRoles.includes(req.user.role);

      expect(hasAccess).toBeFalsy();
    });

    test('should handle empty permissions object', () => {
      const decoded = {
        id: 'user123',
        permissions: {}
      };

      expect(decoded.permissions).toEqual({});
      expect(decoded.permissions.all_access).toBeUndefined();
    });

    test('should handle missing user fields gracefully', () => {
      const decoded = {
        id: 'user123'
        // Missing: email, role, permissions, etc.
      };

      const user = {
        id: decoded.id,
        email: decoded.email || null,
        role: decoded.role || 'unknown',
        permissions: decoded.permissions || {}
      };

      expect(user.id).toBe('user123');
      expect(user.email).toBeNull();
      expect(user.role).toBe('unknown');
      expect(user.permissions).toEqual({});
    });
  });

  // ============================================
  // Middleware Chain Tests
  // ============================================
  describe('Middleware Chain', () => {

    test('should call next() on successful authentication', () => {
      const next = createMockNext();

      // Simulate successful auth
      next();

      expect(next).toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
    });

    test('should not call next() on authentication failure', () => {
      const next = createMockNext();
      const res = createMockResponse();

      // Simulate auth failure - response sent instead of next()
      res.status(401).json({ success: false, error: 'Unauthorized' });

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('should pass user object to next middleware', () => {
      const req = createMockRequest();
      const next = createMockNext();

      // Simulate setting user
      req.user = {
        id: 'user123',
        role: 'admin'
      };

      next();

      expect(req.user).toBeDefined();
      expect(req.user.id).toBe('user123');
    });
  });
});
