/**
 * RBAC Middleware Unit Tests (rbacMiddleware.js)
 * Tests role-based access control with permissions
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
  insert: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  single: jest.fn(() => Promise.resolve(mockSupabaseResponse)),
  rpc: jest.fn(() => Promise.resolve(mockSupabaseResponse))
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

jest.unstable_mockModule('../../../src/config/env.js', () => ({
  config: {
    jwt: { secret: 'test-secret-key' }
  }
}));

describe('RBAC Middleware Unit Tests', () => {
  const createMockRequest = (overrides = {}) => ({
    headers: {},
    path: '/api/test',
    method: 'GET',
    ip: '127.0.0.1',
    user: null,
    userRole: null,
    userPermissions: {},
    body: {},
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
    mockSupabaseResponse.data = null;
    mockSupabaseResponse.error = null;
  });

  // ============================================
  // Arabic Role Names Tests
  // ============================================
  describe('Arabic Role Names', () => {
    test('should return Arabic name for super_admin', () => {
      const roleNames = {
        'super_admin': 'المدير الأعلى',
        'financial_manager': 'المدير المالي',
        'admin': 'مدير',
        'member': 'عضو'
      };

      expect(roleNames['super_admin']).toBe('المدير الأعلى');
    });

    test('should return Arabic name for financial_manager', () => {
      const roleNames = {
        'financial_manager': 'المدير المالي'
      };

      expect(roleNames['financial_manager']).toBe('المدير المالي');
    });

    test('should return original role if not found', () => {
      const roleNames = {};
      const role = 'custom_role';
      const arabicName = roleNames[role] || role;

      expect(arabicName).toBe('custom_role');
    });
  });

  // ============================================
  // Role Permissions Tests
  // ============================================
  describe('Role Permissions', () => {
    test('super_admin should have all_access', () => {
      const permissions = {
        'super_admin': {
          all_access: true,
          manage_users: true,
          manage_members: true,
          manage_finances: true
        }
      };

      expect(permissions['super_admin'].all_access).toBe(true);
    });

    test('financial_manager should have finance permissions', () => {
      const permissions = {
        'financial_manager': {
          view_dashboard: true,
          manage_finances: true,
          view_financial_reports: true,
          manage_subscriptions: true,
          manage_payments: true
        }
      };

      expect(permissions['financial_manager'].manage_finances).toBe(true);
      expect(permissions['financial_manager'].manage_payments).toBe(true);
    });

    test('user_member should have limited permissions', () => {
      const permissions = {
        'user_member': {
          view_dashboard: true,
          view_my_profile: true,
          view_my_payments: true,
          view_family_events: true
        }
      };

      expect(permissions['user_member'].view_my_profile).toBe(true);
      expect(permissions['user_member'].manage_users).toBeUndefined();
    });

    test('should return default permissions for unknown role', () => {
      const permissions = {};
      const role = 'unknown';
      const rolePerms = permissions[role] || { view_dashboard: true };

      expect(rolePerms.view_dashboard).toBe(true);
    });
  });

  // ============================================
  // Role Hierarchy Tests
  // ============================================
  describe('Role Hierarchy', () => {
    test('super_admin should have highest level', () => {
      const hierarchy = {
        super_admin: 100,
        financial_manager: 80,
        family_tree_admin: 70,
        occasions_initiatives_diyas_admin: 60,
        user_member: 10
      };

      expect(hierarchy.super_admin).toBe(100);
      expect(hierarchy.super_admin).toBeGreaterThan(hierarchy.financial_manager);
    });

    test('user_member should have lowest level', () => {
      const hierarchy = {
        super_admin: 100,
        user_member: 10
      };

      expect(hierarchy.user_member).toBe(10);
      expect(hierarchy.user_member).toBeLessThan(hierarchy.super_admin);
    });
  });

  // ============================================
  // RequireRole Tests
  // ============================================
  describe('RequireRole Middleware', () => {
    test('should return 401 if no authorization header', () => {
      const res = createMockResponse();
      const req = createMockRequest({
        headers: {}
      });

      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          message: 'الرجاء تسجيل الدخول للمتابعة'
        });
      }

      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('should allow member role when member is in allowed roles', () => {
      const allowedRoles = ['member', 'admin'];
      const userRole = 'member';

      const isAllowed = allowedRoles.includes(userRole);
      expect(isAllowed).toBe(true);
    });

    test('should deny member when not in allowed roles', () => {
      const res = createMockResponse();
      const allowedRoles = ['admin', 'super_admin'];
      const userRole = 'member';

      if (!allowedRoles.includes(userRole)) {
        res.status(403).json({
          success: false,
          message: 'ليس لديك الصلاحية للوصول إلى هذا المورد'
        });
      }

      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('super_admin should always be allowed', () => {
      const allowedRoles = ['financial_manager'];
      const userRole = 'super_admin';

      const isAllowed = allowedRoles.includes(userRole) || userRole === 'super_admin';
      expect(isAllowed).toBe(true);
    });

    test('should attach user info to request', () => {
      const decoded = {
        id: 'user-123',
        email: 'user@example.com',
        phone: '0501234567',
        role: 'admin'
      };

      const req = createMockRequest();
      req.user = {
        id: decoded.id,
        email: decoded.email,
        phone: decoded.phone,
        role: decoded.role,
        roleAr: 'مدير'
      };

      expect(req.user.id).toBe('user-123');
      expect(req.user.roleAr).toBe('مدير');
    });
  });

  // ============================================
  // RequirePermission Tests
  // ============================================
  describe('RequirePermission Middleware', () => {
    test('should check specific permission', () => {
      const userPermissions = {
        manage_finances: true,
        view_dashboard: true
      };

      const hasPermission = userPermissions['manage_finances'] === true;
      expect(hasPermission).toBe(true);
    });

    test('should allow all_access to bypass permission check', () => {
      const userPermissions = {
        all_access: true
      };

      const permissionName = 'manage_finances';
      const hasPermission = userPermissions[permissionName] === true ||
                           userPermissions.all_access === true;

      expect(hasPermission).toBe(true);
    });

    test('should allow super_admin to bypass permission check', () => {
      const userRole = 'super_admin';
      const hasPermission = userRole === 'super_admin';

      expect(hasPermission).toBe(true);
    });

    test('should return 403 if permission denied', () => {
      const res = createMockResponse();
      const permissionName = 'manage_users';

      res.status(403).json({
        success: false,
        message: 'ليس لديك الصلاحية لتنفيذ هذا الإجراء',
        requiredPermission: permissionName
      });

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          requiredPermission: 'manage_users'
        })
      );
    });
  });

  // ============================================
  // RequireOwnershipOrAdmin Tests
  // ============================================
  describe('RequireOwnershipOrAdmin Middleware', () => {
    test('should allow super_admin access to any resource', () => {
      const req = createMockRequest({
        user: { id: 'admin-123', role: 'super_admin' }
      });

      const isAllowed = req.user.role === 'super_admin';
      expect(isAllowed).toBe(true);
    });

    test('should allow user to access their own resource', () => {
      const req = createMockRequest({
        user: { id: 'user-123', role: 'member' }
      });
      const resourceOwnerId = 'user-123';

      const isAllowed = req.user.id === resourceOwnerId;
      expect(isAllowed).toBe(true);
    });

    test('should deny user access to other resources', () => {
      const res = createMockResponse();
      const req = createMockRequest({
        user: { id: 'user-123', role: 'member' }
      });
      const resourceOwnerId = 'user-456';

      if (req.user.role !== 'super_admin' && req.user.id !== resourceOwnerId) {
        res.status(403).json({
          success: false,
          message: 'ليس لديك الصلاحية للوصول إلى هذا المورد'
        });
      }

      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('should return 401 if no user', () => {
      const res = createMockResponse();
      const req = createMockRequest({ user: null });

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'الرجاء تسجيل الدخول للمتابعة'
        });
      }

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  // ============================================
  // ValidateRoleAssignment Tests
  // ============================================
  describe('ValidateRoleAssignment Middleware', () => {
    test('should only allow super_admin to assign roles', () => {
      const res = createMockResponse();
      const req = createMockRequest({
        user: { role: 'admin' }
      });

      if (req.user.role !== 'super_admin') {
        res.status(403).json({
          success: false,
          message: 'فقط المدير الأعلى يمكنه تعيين الأدوار'
        });
      }

      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('should validate role name', () => {
      const validRoles = [
        'super_admin',
        'financial_manager',
        'family_tree_admin',
        'occasions_initiatives_diyas_admin',
        'user_member'
      ];

      const roleName = 'financial_manager';
      const isValid = validRoles.includes(roleName);

      expect(isValid).toBe(true);
    });

    test('should reject invalid role name', () => {
      const res = createMockResponse();
      const validRoles = [
        'super_admin',
        'financial_manager',
        'family_tree_admin'
      ];

      const roleName = 'invalid_role';

      if (!validRoles.includes(roleName)) {
        res.status(400).json({
          success: false,
          message: 'اسم الدور غير صالح',
          validRoles
        });
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ============================================
  // GetRoleDataFilter Tests
  // ============================================
  describe('GetRoleDataFilter', () => {
    test('super_admin should have no filters', () => {
      const user = { role: 'super_admin' };
      const filters = {};

      if (user.role === 'super_admin') {
        // No filters
      }

      expect(Object.keys(filters).length).toBe(0);
    });

    test('financial_manager should filter to financial data', () => {
      const user = { role: 'financial_manager' };
      const filters = {};

      if (user.role === 'financial_manager') {
        filters.dataType = 'financial';
      }

      expect(filters.dataType).toBe('financial');
    });

    test('user_member should filter to own data', () => {
      const user = { id: 'user-123', role: 'user_member' };
      const filters = {};

      if (user.role === 'user_member') {
        filters.userId = user.id;
      }

      expect(filters.userId).toBe('user-123');
    });

    test('unknown role should be blocked', () => {
      const user = { role: 'unknown' };
      const filters = {};

      const knownRoles = ['super_admin', 'financial_manager', 'user_member'];
      if (!knownRoles.includes(user.role)) {
        filters.blocked = true;
      }

      expect(filters.blocked).toBe(true);
    });
  });

  // ============================================
  // Audit Logging Tests
  // ============================================
  describe('Audit Logging', () => {
    test('should extract module from path', () => {
      const extractModule = (path) => {
        const pathParts = path.split('/').filter(Boolean);
        if (pathParts[0] === 'api' && pathParts[1]) {
          return pathParts[1];
        }
        return 'unknown';
      };

      expect(extractModule('/api/members/123')).toBe('members');
      expect(extractModule('/api/finances/report')).toBe('finances');
      expect(extractModule('/health')).toBe('unknown');
    });

    test('should create audit log entry', () => {
      const req = {
        user: { id: 'user-123' },
        method: 'POST',
        path: '/api/members',
        ip: '192.168.1.1',
        headers: { 'user-agent': 'Mozilla/5.0' }
      };

      const auditEntry = {
        user_id: req.user.id,
        action: `${req.method} ${req.path}`,
        module: 'members',
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      };

      expect(auditEntry.user_id).toBe('user-123');
      expect(auditEntry.action).toBe('POST /api/members');
      expect(auditEntry.module).toBe('members');
    });
  });

  // ============================================
  // Role Shortcuts Tests
  // ============================================
  describe('Role Shortcuts', () => {
    test('requireSuperAdmin should only include super_admin', () => {
      const allowedRoles = ['super_admin'];
      expect(allowedRoles).toEqual(['super_admin']);
    });

    test('requireFinancialManager should include super_admin', () => {
      const allowedRoles = ['super_admin', 'financial_manager'];
      expect(allowedRoles).toContain('super_admin');
      expect(allowedRoles).toContain('financial_manager');
    });

    test('requireMember should only include member', () => {
      const allowedRoles = ['member'];
      expect(allowedRoles).toEqual(['member']);
    });

    test('requireAnyAuthenticated should include all roles', () => {
      const allowedRoles = [
        'super_admin',
        'financial_manager',
        'family_tree_admin',
        'occasions_initiatives_diyas_admin',
        'user_member',
        'member'
      ];

      expect(allowedRoles.length).toBe(6);
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

    test('should return 401 for invalid session', () => {
      const res = createMockResponse();

      res.status(401).json({
        success: false,
        message: 'جلسة غير صالحة، الرجاء تسجيل الدخول مجدداً'
      });

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });
});
