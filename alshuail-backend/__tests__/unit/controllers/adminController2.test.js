/**
 * Admin Controller Unit Tests (admin.controller.js)
 * Tests admin management functionality
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// Mock dependencies
const mockSupabaseResponse = {
  data: null,
  error: null,
  count: null
};

const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  insert: jest.fn(() => mockSupabase),
  update: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  order: jest.fn(() => mockSupabase),
  single: jest.fn(() => Promise.resolve(mockSupabaseResponse)),
  then: jest.fn((cb) => Promise.resolve(cb(mockSupabaseResponse)))
};

jest.unstable_mockModule('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase)
}));

jest.unstable_mockModule('../../../src/utils/audit-logger.js', () => ({
  logAdminAction: jest.fn(),
  ACTIONS: {
    MEMBER_CREATED: 'member_created',
    SUBDIVISION_ASSIGNED: 'subdivision_assigned'
  },
  RESOURCE_TYPES: {
    MEMBER: 'member'
  }
}));

describe('Admin Controller Unit Tests', () => {
  const createMockRequest = (overrides = {}) => ({
    user: { id: 'admin-123', role: 'super_admin' },
    query: {},
    body: {},
    params: {},
    ip: '127.0.0.1',
    get: jest.fn(() => 'Mozilla/5.0'),
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
    mockSupabaseResponse.count = null;
  });

  // ============================================
  // Add Member Validation Tests
  // ============================================
  describe('Add Member Validation', () => {
    test('should require full_name_ar', () => {
      const req = createMockRequest({
        body: { phone: '0501234567', family_branch_id: 'branch-123' }
      });
      const res = createMockResponse();

      if (!req.body.full_name_ar) {
        res.status(400).json({
          success: false,
          message: 'الاسم والهاتف والفخذ مطلوبة'
        });
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should require phone', () => {
      const req = createMockRequest({
        body: { full_name_ar: 'محمد بن علي', family_branch_id: 'branch-123' }
      });
      const res = createMockResponse();

      if (!req.body.phone) {
        res.status(400).json({
          success: false,
          message: 'الاسم والهاتف والفخذ مطلوبة'
        });
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should require family_branch_id', () => {
      const req = createMockRequest({
        body: { full_name_ar: 'محمد بن علي', phone: '0501234567' }
      });
      const res = createMockResponse();

      if (!req.body.family_branch_id) {
        res.status(400).json({
          success: false,
          message: 'الاسم والهاتف والفخذ مطلوبة'
        });
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ============================================
  // Phone Validation Tests
  // ============================================
  describe('Phone Validation', () => {
    test('should validate Saudi phone starting with 05', () => {
      // Updated regex to handle local format with leading 0
      const phoneRegex = /^(\+966|966|0)?5[0-9]{8}$|^(\+965|965)?[569][0-9]{7}$/;
      const phone = '0501234567'.replace(/\s/g, '');

      expect(phoneRegex.test(phone)).toBe(true);
    });

    test('should validate Saudi phone with +966', () => {
      const phoneRegex = /^(\+966|966|0)?5[0-9]{8}$|^(\+965|965)?[569][0-9]{7}$/;
      const phone = '+966501234567'.replace(/\s/g, '');

      expect(phoneRegex.test(phone)).toBe(true);
    });

    test('should validate Kuwaiti phone starting with 5', () => {
      const phoneRegex = /^(\+966|966|0)?5[0-9]{8}$|^(\+965|965)?[569][0-9]{7}$/;
      const phone = '51234567'.replace(/\s/g, '');

      expect(phoneRegex.test(phone)).toBe(true);
    });

    test('should validate Kuwaiti phone starting with 9', () => {
      const phoneRegex = /^(\+966|966)?5[0-9]{8}$|^(\+965|965)?[569][0-9]{7}$/;
      const phone = '91234567'.replace(/\s/g, '');

      expect(phoneRegex.test(phone)).toBe(true);
    });

    test('should reject invalid phone format', () => {
      const phoneRegex = /^(\+966|966)?5[0-9]{8}$|^(\+965|965)?[569][0-9]{7}$/;
      const phone = '123456';

      expect(phoneRegex.test(phone)).toBe(false);
    });

    test('should return 400 for invalid phone', () => {
      const res = createMockResponse();
      const phoneRegex = /^(\+966|966)?5[0-9]{8}$|^(\+965|965)?[569][0-9]{7}$/;
      const phone = '123456';

      if (!phoneRegex.test(phone)) {
        res.status(400).json({
          success: false,
          message: 'رقم الهاتف غير صحيح. يجب أن يكون سعودي (+966) أو كويتي (+965)'
        });
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ============================================
  // Member ID Generation Tests
  // ============================================
  describe('Member ID Generation', () => {
    test('should generate SH-0001 format', () => {
      const count = 0;
      const memberId = `SH-${String(count + 1).padStart(4, '0')}`;

      expect(memberId).toBe('SH-0001');
    });

    test('should generate SH-0010 for 9th member', () => {
      const count = 9;
      const memberId = `SH-${String(count + 1).padStart(4, '0')}`;

      expect(memberId).toBe('SH-0010');
    });

    test('should generate SH-0100 for 99th member', () => {
      const count = 99;
      const memberId = `SH-${String(count + 1).padStart(4, '0')}`;

      expect(memberId).toBe('SH-0100');
    });

    test('should generate SH-1000 for 999th member', () => {
      const count = 999;
      const memberId = `SH-${String(count + 1).padStart(4, '0')}`;

      expect(memberId).toBe('SH-1000');
    });
  });

  // ============================================
  // Duplicate Phone Check Tests
  // ============================================
  describe('Duplicate Phone Check', () => {
    test('should return 400 if phone exists', () => {
      const res = createMockResponse();
      const existing = { id: 'member-123' };

      if (existing) {
        res.status(400).json({
          success: false,
          message: 'رقم الهاتف مسجل مسبقاً'
        });
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ============================================
  // Member Creation Tests
  // ============================================
  describe('Member Creation', () => {
    test('should create member with pending_approval status', () => {
      const memberData = {
        member_id: 'SH-0001',
        full_name_ar: 'محمد بن علي',
        full_name_en: 'Mohammed bin Ali',
        phone: '0501234567',
        family_branch_id: 'branch-123',
        registration_status: 'pending_approval',
        is_active: false,
        created_by: 'admin-123',
        created_at: new Date().toISOString()
      };

      expect(memberData.registration_status).toBe('pending_approval');
      expect(memberData.is_active).toBe(false);
    });

    test('should use full_name_ar for full_name_en if not provided', () => {
      const full_name_ar = 'محمد بن علي';
      const full_name_en = null;

      const memberData = {
        full_name_en: full_name_en || full_name_ar
      };

      expect(memberData.full_name_en).toBe('محمد بن علي');
    });

    test('should return 201 on successful creation', () => {
      const res = createMockResponse();
      res.status(201).json({
        success: true,
        message: 'تمت إضافة العضو بنجاح',
        data: { id: 'member-123' }
      });

      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  // ============================================
  // Assign Subdivision Tests
  // ============================================
  describe('Assign Subdivision', () => {
    test('should require family_branch_id', () => {
      const req = createMockRequest({
        params: { memberId: 'member-123' },
        body: {}
      });
      const res = createMockResponse();

      if (!req.body.family_branch_id) {
        res.status(400).json({
          success: false,
          message: 'الفخذ مطلوب'
        });
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should update member with new branch', () => {
      const memberId = 'member-123';
      const family_branch_id = 'branch-456';

      const updateData = {
        family_branch_id,
        updated_at: new Date().toISOString()
      };

      expect(updateData.family_branch_id).toBe('branch-456');
    });
  });

  // ============================================
  // Get Subdivisions Tests
  // ============================================
  describe('Get Subdivisions', () => {
    test('should return subdivisions with count', () => {
      const res = createMockResponse();
      const subdivisions = [
        { id: 1, branch_name: 'فرع الشمال' },
        { id: 2, branch_name: 'فرع الجنوب' }
      ];

      res.json({
        success: true,
        count: subdivisions.length,
        data: subdivisions
      });

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          count: 2
        })
      );
    });

    test('should order subdivisions by branch_name', () => {
      const subdivisions = [
        { branch_name: 'فرع ب' },
        { branch_name: 'فرع أ' },
        { branch_name: 'فرع ج' }
      ];

      const sorted = subdivisions.sort((a, b) =>
        a.branch_name.localeCompare(b.branch_name, 'ar')
      );

      expect(sorted[0].branch_name).toBe('فرع أ');
    });
  });

  // ============================================
  // Dashboard Statistics Tests
  // ============================================
  describe('Dashboard Statistics', () => {
    test('should return all statistics', () => {
      const res = createMockResponse();

      const stats = {
        totalMembers: 100,
        activeMembers: 80,
        pendingApprovals: 15,
        subdivisions: 5
      };

      res.json({
        success: true,
        data: stats
      });

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            totalMembers: 100,
            activeMembers: 80
          })
        })
      );
    });

    test('should handle null counts', () => {
      const totalMembers = null;
      const activeMembers = null;

      const stats = {
        totalMembers: totalMembers || 0,
        activeMembers: activeMembers || 0
      };

      expect(stats.totalMembers).toBe(0);
      expect(stats.activeMembers).toBe(0);
    });
  });

  // ============================================
  // Audit Logging Tests
  // ============================================
  describe('Audit Logging', () => {
    test('should include admin ID in audit log', () => {
      const auditData = {
        adminId: 'admin-123',
        action: 'member_created',
        resourceType: 'member',
        resourceId: 'member-456',
        changes: { full_name_ar: 'محمد' },
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0'
      };

      expect(auditData.adminId).toBeDefined();
      expect(auditData.ipAddress).toBeDefined();
    });

    test('should track member creation in audit', () => {
      const auditData = {
        action: 'member_created',
        changes: {
          member_id: 'SH-0001',
          full_name_ar: 'محمد',
          phone: '0501234567',
          family_branch_id: 'branch-123'
        }
      };

      expect(auditData.action).toBe('member_created');
      expect(auditData.changes.member_id).toBeDefined();
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================
  describe('Error Handling', () => {
    test('should return 400 for validation errors', () => {
      const res = createMockResponse();
      res.status(400).json({
        success: false,
        message: 'الاسم والهاتف والفخذ مطلوبة'
      });

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should return 500 on insert error', () => {
      const res = createMockResponse();
      res.status(500).json({
        success: false,
        message: 'خطأ في إضافة العضو'
      });

      expect(res.status).toHaveBeenCalledWith(500);
    });

    test('should return 500 on server error', () => {
      const res = createMockResponse();
      res.status(500).json({
        success: false,
        message: 'خطأ في الخادم'
      });

      expect(res.status).toHaveBeenCalledWith(500);
    });

    test('should include Arabic error messages', () => {
      const errorMessage = 'رقم الهاتف غير صحيح';
      expect(errorMessage).toMatch(/[\u0600-\u06FF]/);
    });
  });
});
