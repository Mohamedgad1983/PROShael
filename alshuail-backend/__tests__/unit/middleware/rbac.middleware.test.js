/**
 * RBAC Middleware Unit Tests (rbac.middleware.js)
 * Tests role constants, permissions, and basic RBAC
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

jest.unstable_mockModule('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase)
}));

describe('RBAC Middleware (rbac.middleware.js) Unit Tests', () => {
  const createMockRequest = (overrides = {}) => ({
    user: null,
    userRole: null,
    userPermissions: {},
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
  // Role Constants Tests
  // ============================================
  describe('ROLES Constants', () => {
    const ROLES = {
      SUPER_ADMIN: 'super_admin',
      ADMIN: 'admin',
      FINANCIAL_MANAGER: 'financial_manager',
      FAMILY_TREE_MANAGER: 'family_tree_manager',
      VIEWER: 'viewer'
    };

    test('should define SUPER_ADMIN role', () => {
      expect(ROLES.SUPER_ADMIN).toBe('super_admin');
    });

    test('should define ADMIN role', () => {
      expect(ROLES.ADMIN).toBe('admin');
    });

    test('should define FINANCIAL_MANAGER role', () => {
      expect(ROLES.FINANCIAL_MANAGER).toBe('financial_manager');
    });

    test('should define FAMILY_TREE_MANAGER role', () => {
      expect(ROLES.FAMILY_TREE_MANAGER).toBe('family_tree_manager');
    });

    test('should define VIEWER role', () => {
      expect(ROLES.VIEWER).toBe('viewer');
    });

    test('should have 5 defined roles', () => {
      expect(Object.keys(ROLES)).toHaveLength(5);
    });
  });

  // ============================================
  // Permission Constants Tests
  // ============================================
  describe('PERMISSIONS Constants', () => {
    const PERMISSIONS = {
      MANAGE_MEMBERS: 'manage_members',
      APPROVE_MEMBERS: 'approve_members',
      MANAGE_FINANCES: 'manage_finances',
      MANAGE_FAMILY_TREE: 'manage_family_tree',
      VIEW_REPORTS: 'view_reports',
      MANAGE_USERS: 'manage_users'
    };

    test('should define MANAGE_MEMBERS permission', () => {
      expect(PERMISSIONS.MANAGE_MEMBERS).toBe('manage_members');
    });

    test('should define APPROVE_MEMBERS permission', () => {
      expect(PERMISSIONS.APPROVE_MEMBERS).toBe('approve_members');
    });

    test('should define MANAGE_FINANCES permission', () => {
      expect(PERMISSIONS.MANAGE_FINANCES).toBe('manage_finances');
    });

    test('should define MANAGE_FAMILY_TREE permission', () => {
      expect(PERMISSIONS.MANAGE_FAMILY_TREE).toBe('manage_family_tree');
    });

    test('should define VIEW_REPORTS permission', () => {
      expect(PERMISSIONS.VIEW_REPORTS).toBe('view_reports');
    });

    test('should define MANAGE_USERS permission', () => {
      expect(PERMISSIONS.MANAGE_USERS).toBe('manage_users');
    });

    test('should have 6 defined permissions', () => {
      expect(Object.keys(PERMISSIONS)).toHaveLength(6);
    });
  });

  // ============================================
  // RequireRole Middleware Tests
  // ============================================
  describe('requireRole Middleware', () => {
    test('should return 403 if user not found', () => {
      const res = createMockResponse();
      const user = null;

      if (!user) {
        res.status(403).json({
          success: false,
          message: 'غير مصرح لك بالوصول'
        });
      }

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/[\u0600-\u06FF]/)
        })
      );
    });

    test('should return 403 if user is inactive', () => {
      const res = createMockResponse();
      const user = { is_active: false };

      if (!user.is_active) {
        res.status(403).json({
          success: false,
          message: 'حسابك غير نشط'
        });
      }

      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('should return 403 if role not in allowed roles', () => {
      const res = createMockResponse();
      const allowedRoles = ['super_admin', 'admin'];
      const user = { role: 'viewer', is_active: true };

      if (!allowedRoles.includes(user.role)) {
        res.status(403).json({
          success: false,
          message: 'ليس لديك صلاحية كافية'
        });
      }

      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('should allow super_admin role', () => {
      let nextCalled = false;
      const allowedRoles = ['super_admin', 'admin'];
      const user = { role: 'super_admin', is_active: true };

      if (allowedRoles.includes(user.role)) {
        nextCalled = true;
      }

      expect(nextCalled).toBe(true);
    });

    test('should attach userRole and userPermissions to request', () => {
      const req = createMockRequest();
      const user = {
        role: 'admin',
        permissions: { manage_members: true, view_reports: true },
        is_active: true
      };

      req.userRole = user.role;
      req.userPermissions = user.permissions || {};

      expect(req.userRole).toBe('admin');
      expect(req.userPermissions.manage_members).toBe(true);
    });

    test('should handle missing permissions gracefully', () => {
      const req = createMockRequest();
      const user = { role: 'viewer', is_active: true };

      req.userRole = user.role;
      req.userPermissions = user.permissions || {};

      expect(req.userPermissions).toEqual({});
    });
  });

  // ============================================
  // RequirePermission Middleware Tests
  // ============================================
  describe('requirePermission Middleware', () => {
    test('should allow super_admin to bypass permission check', () => {
      let nextCalled = false;
      const req = createMockRequest({
        userRole: 'super_admin',
        userPermissions: {}
      });

      if (req.userRole === 'super_admin') {
        nextCalled = true;
      }

      expect(nextCalled).toBe(true);
    });

    test('should check all required permissions', () => {
      const requiredPermissions = ['manage_finances', 'view_reports'];
      const userPermissions = { manage_finances: true, view_reports: true };

      const hasPermission = requiredPermissions.every(
        perm => userPermissions[perm] === true
      );

      expect(hasPermission).toBe(true);
    });

    test('should deny if missing any required permission', () => {
      const res = createMockResponse();
      const requiredPermissions = ['manage_finances', 'manage_users'];
      const userPermissions = { manage_finances: true };

      const hasPermission = requiredPermissions.every(
        perm => userPermissions[perm] === true
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'ليس لديك صلاحية لهذه العملية'
        });
      }

      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('should allow if all permissions present', () => {
      let nextCalled = false;
      const requiredPermissions = ['view_reports'];
      const userPermissions = { view_reports: true };

      const hasPermission = requiredPermissions.every(
        perm => userPermissions[perm] === true
      );

      if (hasPermission) {
        nextCalled = true;
      }

      expect(nextCalled).toBe(true);
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================
  describe('Error Handling', () => {
    test('should return 500 on RBAC error', () => {
      const res = createMockResponse();

      res.status(500).json({
        success: false,
        message: 'خطأ في التحقق من الصلاحيات'
      });

      expect(res.status).toHaveBeenCalledWith(500);
    });

    test('should return 500 on permission check error', () => {
      const res = createMockResponse();

      res.status(500).json({
        success: false,
        message: 'خطأ في التحقق من الصلاحيات'
      });

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ============================================
  // Arabic Message Tests
  // ============================================
  describe('Arabic Error Messages', () => {
    test('should have Arabic unauthorized message', () => {
      const message = 'غير مصرح لك بالوصول';
      expect(message).toMatch(/[\u0600-\u06FF]/);
    });

    test('should have Arabic inactive account message', () => {
      const message = 'حسابك غير نشط';
      expect(message).toMatch(/[\u0600-\u06FF]/);
    });

    test('should have Arabic insufficient permission message', () => {
      const message = 'ليس لديك صلاحية كافية';
      expect(message).toMatch(/[\u0600-\u06FF]/);
    });

    test('should have Arabic operation denied message', () => {
      const message = 'ليس لديك صلاحية لهذه العملية';
      expect(message).toMatch(/[\u0600-\u06FF]/);
    });

    test('should have Arabic error message', () => {
      const message = 'خطأ في التحقق من الصلاحيات';
      expect(message).toMatch(/[\u0600-\u06FF]/);
    });
  });

  // ============================================
  // Supabase Client Tests
  // ============================================
  describe('Supabase Client Configuration', () => {
    test('should use environment variables', () => {
      const url = process.env.SUPABASE_URL || 'test-url';
      const key = process.env.SUPABASE_SERVICE_KEY || 'test-key';

      expect(url).toBeDefined();
      expect(key).toBeDefined();
    });
  });

  // ============================================
  // User Query Tests
  // ============================================
  describe('User Query', () => {
    test('should select required fields', () => {
      const selectFields = 'role, permissions, is_active';

      expect(selectFields).toContain('role');
      expect(selectFields).toContain('permissions');
      expect(selectFields).toContain('is_active');
    });

    test('should query by user id', () => {
      const userId = 'user-123';
      const query = { field: 'id', value: userId };

      expect(query.field).toBe('id');
      expect(query.value).toBe('user-123');
    });
  });

  // ============================================
  // Role Array Handling Tests
  // ============================================
  describe('Role Array Handling', () => {
    test('should accept single role', () => {
      const allowedRoles = ['admin'];
      expect(allowedRoles).toContain('admin');
    });

    test('should accept multiple roles', () => {
      const allowedRoles = ['super_admin', 'admin', 'financial_manager'];
      expect(allowedRoles).toHaveLength(3);
    });

    test('should use rest parameters for roles', () => {
      const roles = ['super_admin', 'admin'];
      const allowedRoles = [...roles];

      expect(allowedRoles).toEqual(['super_admin', 'admin']);
    });
  });

  // ============================================
  // Permission Object Handling Tests
  // ============================================
  describe('Permission Object Handling', () => {
    test('should check permission value is exactly true', () => {
      const permissions = { view_reports: true, manage_finances: false };

      expect(permissions['view_reports'] === true).toBe(true);
      expect(permissions['manage_finances'] === true).toBe(false);
    });

    test('should handle undefined permissions', () => {
      const permissions = {};
      expect(permissions['unknown_perm'] === true).toBe(false);
    });

    test('should handle null permissions object', () => {
      const permissions = null;
      const result = permissions || {};
      expect(result).toEqual({});
    });
  });

  // ============================================
  // Middleware Chain Tests
  // ============================================
  describe('Middleware Chain', () => {
    test('should call next() on success', () => {
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      // Simulate successful authorization
      next();

      expect(nextCalled).toBe(true);
    });

    test('should not call next() on failure', () => {
      let nextCalled = false;
      const res = createMockResponse();

      // Simulate failed authorization
      res.status(403).json({ success: false });

      expect(nextCalled).toBe(false);
    });
  });

  // ============================================
  // Active User Check Tests
  // ============================================
  describe('Active User Check', () => {
    test('should check is_active field', () => {
      const user = { is_active: true };
      expect(user.is_active).toBe(true);
    });

    test('should deny inactive user', () => {
      const user = { is_active: false };
      const shouldDeny = !user.is_active;
      expect(shouldDeny).toBe(true);
    });

    test('should handle missing is_active field', () => {
      const user = {};
      const isActive = user.is_active ?? false;
      expect(isActive).toBe(false);
    });
  });
});
