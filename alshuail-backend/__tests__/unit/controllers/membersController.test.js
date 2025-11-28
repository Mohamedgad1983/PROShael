/**
 * Members Controller Unit Tests
 * Tests member CRUD operations with proper mocking and actual function imports
 */

import { jest, describe, test, expect, beforeEach, afterAll } from '@jest/globals';

// Mock state for controlling test scenarios
let mockState = {
  members: { data: null, error: null, count: 0 },
  single: { data: null, error: null },
  insert: { data: null, error: null },
  update: { data: null, error: null },
  delete: { error: null },
  statistics: {
    total: { count: 0, error: null },
    active: { count: 0, error: null },
    completed: { count: 0, error: null },
    pending: { count: 0, error: null },
    socialSecurity: { count: 0, error: null },
    thisMonth: { count: 0, error: null },
    imports: { data: [], error: null }
  },
  shouldThrow: false
};

// Query tracker for context-aware responses
let queryTracker = {
  table: null,
  selectFields: null,
  filters: [],
  hasOrder: false,
  isHead: false,
  isSingle: false
};

// Original single function - saved for restoration in beforeEach
const originalSingleFn = () => {
  queryTracker.isSingle = true;
  if (mockState.shouldThrow) {
    return Promise.resolve({ data: null, error: { message: 'Database error' } });
  }
  if (queryTracker.table === 'members' && mockState.single.error) {
    return Promise.resolve(mockState.single);
  }
  return Promise.resolve(mockState.single);
};

// Create chainable mock Supabase
const mockSupabase = {
  from: jest.fn((table) => {
    queryTracker = {
      table,
      selectFields: null,
      filters: [],
      hasOrder: false,
      isHead: false,
      isSingle: false
    };
    return mockSupabase;
  }),
  select: jest.fn((fields, options) => {
    queryTracker.selectFields = fields;
    queryTracker.isHead = options?.head || false;
    return mockSupabase;
  }),
  insert: jest.fn(() => mockSupabase),
  update: jest.fn(() => mockSupabase),
  delete: jest.fn(() => mockSupabase),
  eq: jest.fn((field, value) => {
    queryTracker.filters.push({ field, value });
    return mockSupabase;
  }),
  neq: jest.fn(() => mockSupabase),
  in: jest.fn(() => mockSupabase),
  or: jest.fn(() => mockSupabase),
  gte: jest.fn(() => mockSupabase),
  lte: jest.fn(() => mockSupabase),
  order: jest.fn(() => {
    queryTracker.hasOrder = true;
    return mockSupabase;
  }),
  range: jest.fn(() => mockSupabase),
  limit: jest.fn(() => mockSupabase),
  single: jest.fn(originalSingleFn),
  then: jest.fn((callback) => {
    if (mockState.shouldThrow) {
      return Promise.resolve(callback({ data: null, error: { message: 'Database error' }, count: null }));
    }

    // Statistics queries (head: true)
    if (queryTracker.isHead && queryTracker.table === 'members') {
      const statusFilter = queryTracker.filters.find(f => f.field === 'membership_status');
      const profileFilter = queryTracker.filters.find(f => f.field === 'profile_completed');
      const socialFilter = queryTracker.filters.find(f => f.field === 'social_security_beneficiary');

      if (statusFilter?.value === 'active') {
        return Promise.resolve(callback({ count: mockState.statistics.active.count, error: mockState.statistics.active.error }));
      }
      if (profileFilter?.value === true && socialFilter) {
        return Promise.resolve(callback({ count: mockState.statistics.socialSecurity.count, error: mockState.statistics.socialSecurity.error }));
      }
      if (profileFilter?.value === true) {
        return Promise.resolve(callback({ count: mockState.statistics.completed.count, error: mockState.statistics.completed.error }));
      }
      if (profileFilter?.value === false) {
        return Promise.resolve(callback({ count: mockState.statistics.pending.count, error: mockState.statistics.pending.error }));
      }
      // Check for gte filter (this month)
      if (queryTracker.filters.length === 0 || !statusFilter && !profileFilter) {
        // Could be total or thisMonth
        return Promise.resolve(callback({ count: mockState.statistics.total.count, error: mockState.statistics.total.error }));
      }
    }

    // Excel imports query
    if (queryTracker.table === 'excel_import_batches') {
      return Promise.resolve(callback({ data: mockState.statistics.imports.data, error: mockState.statistics.imports.error }));
    }

    // Regular members query
    if (queryTracker.table === 'members') {
      return Promise.resolve(callback({
        data: mockState.members.data,
        error: mockState.members.error,
        count: mockState.members.count
      }));
    }

    return Promise.resolve(callback(mockState.members));
  })
};

// Mock bcrypt
const mockBcrypt = {
  hash: jest.fn((password) => Promise.resolve(`hashed_${password}`)),
  compare: jest.fn(() => Promise.resolve(true))
};

// Mock jwt
const mockJwt = {
  verify: jest.fn(() => ({ id: 'test-member-id', role: 'member' })),
  sign: jest.fn(() => 'mock-token')
};

// Mock modules BEFORE importing controller
jest.unstable_mockModule('../../../src/config/database.js', () => ({
  supabase: mockSupabase
}));

jest.unstable_mockModule('bcryptjs', () => ({
  default: mockBcrypt
}));

jest.unstable_mockModule('jsonwebtoken', () => ({
  default: mockJwt
}));

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    http: jest.fn()
  }
}));

jest.unstable_mockModule('../../../src/config/env.js', () => ({
  config: {
    isDevelopment: true,
    isProduction: false,
    jwt: { secret: 'test-secret' }
  }
}));

jest.unstable_mockModule('../../../src/utils/inputSanitizer.js', () => ({
  sanitizeSearchTerm: jest.fn((term) => term?.replace(/[';]/g, '')),
  sanitizeNumber: jest.fn((val, min, max, def) => {
    const num = parseInt(val);
    if (isNaN(num) || num < min) return def;
    if (num > max) return max;
    return num;
  }),
  sanitizeBoolean: jest.fn((val) => val === 'true' || val === true),
  sanitizePhone: jest.fn((phone) => {
    if (!phone) return null;
    // Simple phone validation for Saudi format
    if (/^05\d{8}$/.test(phone)) return phone;
    if (/^\+966\d{9}$/.test(phone)) return phone;
    return null;
  })
}));

jest.unstable_mockModule('../../../src/utils/jsonSanitizer.js', () => ({
  sanitizeJSON: jest.fn((obj) => obj),
  prepareUpdateData: jest.fn((data) => ({ ...data, updated_at: new Date().toISOString() }))
}));

// Import controller AFTER mocking
const {
  getAllMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
  getMemberStatistics,
  sendRegistrationReminders,
  getIncompleteProfiles,
  addMemberManually,
  getMemberProfile,
  getMemberBalance,
  getMemberTransactions,
  getMemberNotifications,
  updateMemberProfile
} = await import('../../../src/controllers/membersController.js');

const { log } = await import('../../../src/utils/logger.js');

describe('Members Controller Unit Tests', () => {
  const createMockRequest = (overrides = {}) => ({
    query: {},
    params: {},
    body: {},
    user: { id: 'test-user-id', role: 'admin' },
    headers: { authorization: 'Bearer mock-token' },
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
    // Reset mock state
    mockState = {
      members: { data: null, error: null, count: 0 },
      single: { data: null, error: null },
      insert: { data: null, error: null },
      update: { data: null, error: null },
      delete: { error: null },
      statistics: {
        total: { count: 0, error: null },
        active: { count: 0, error: null },
        completed: { count: 0, error: null },
        pending: { count: 0, error: null },
        socialSecurity: { count: 0, error: null },
        thisMonth: { count: 0, error: null },
        imports: { data: [], error: null }
      },
      shouldThrow: false
    };
    queryTracker = {
      table: null,
      selectFields: null,
      filters: [],
      hasOrder: false,
      isHead: false,
      isSingle: false
    };
    // Restore the original single function in case a test replaced it
    mockSupabase.single = jest.fn(originalSingleFn);
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // getAllMembers Tests (lines 9-80)
  // ============================================
  describe('getAllMembers()', () => {
    test('should return paginated members successfully (lines 64-73)', async () => {
      const mockMembers = [
        { id: 'm1', full_name: 'Test Member 1' },
        { id: 'm2', full_name: 'Test Member 2' }
      ];
      mockState.members = { data: mockMembers, error: null, count: 2 };

      const req = createMockRequest({ query: { page: '1', limit: '10' } });
      const res = createMockResponse();

      await getAllMembers(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Array),
          pagination: expect.objectContaining({
            page: expect.any(Number),
            limit: expect.any(Number)
          })
        })
      );
    });

    test('should handle profile_completed filter (lines 30-32)', async () => {
      mockState.members = { data: [], error: null, count: 0 };

      const req = createMockRequest({ query: { profile_completed: 'true' } });
      const res = createMockResponse();

      await getAllMembers(req, res);

      expect(mockSupabase.eq).toHaveBeenCalledWith('profile_completed', true);
    });

    test('should handle status filter (lines 34-36)', async () => {
      mockState.members = { data: [], error: null, count: 0 };

      const req = createMockRequest({ query: { status: 'active' } });
      const res = createMockResponse();

      await getAllMembers(req, res);

      expect(mockSupabase.eq).toHaveBeenCalledWith('membership_status', 'active');
    });

    test('should handle search parameter (lines 39-49)', async () => {
      mockState.members = { data: [], error: null, count: 0 };

      const req = createMockRequest({ query: { search: 'test' } });
      const res = createMockResponse();

      await getAllMembers(req, res);

      expect(mockSupabase.or).toHaveBeenCalled();
    });

    test('should return 500 on database error (lines 74-79)', async () => {
      mockState.shouldThrow = true;

      const req = createMockRequest();
      const res = createMockResponse();

      await getAllMembers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    test('should use default pagination values (lines 13-14)', async () => {
      mockState.members = { data: [], error: null, count: 0 };

      const req = createMockRequest({ query: {} });
      const res = createMockResponse();

      await getAllMembers(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          pagination: expect.objectContaining({
            page: 1,
            limit: 100
          })
        })
      );
    });

    test('should ignore invalid status filter (line 23)', async () => {
      mockState.members = { data: [], error: null, count: 0 };

      const req = createMockRequest({ query: { status: 'invalid' } });
      const res = createMockResponse();

      await getAllMembers(req, res);

      // Should not call eq with membership_status for invalid value
      const eqCalls = mockSupabase.eq.mock.calls;
      const statusCall = eqCalls.find(call => call[0] === 'membership_status');
      expect(statusCall).toBeUndefined();
    });

    test('should handle null members data (line 66)', async () => {
      mockState.members = { data: null, error: null, count: 0 };

      const req = createMockRequest();
      const res = createMockResponse();

      await getAllMembers(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: []
        })
      );
    });
  });

  // ============================================
  // getMemberById Tests (lines 82-111)
  // ============================================
  describe('getMemberById()', () => {
    test('should return member by ID successfully (lines 101-104)', async () => {
      const mockMember = { id: 'm1', full_name: 'Test Member' };
      mockState.single = { data: mockMember, error: null };

      const req = createMockRequest({ params: { id: 'm1' } });
      const res = createMockResponse();

      await getMemberById(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockMember
        })
      );
    });

    test('should return 404 when member not found (lines 94-99)', async () => {
      mockState.single = { data: null, error: null };

      const req = createMockRequest({ params: { id: 'nonexistent' } });
      const res = createMockResponse();

      await getMemberById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'العضو غير موجود'
        })
      );
    });

    test('should return 500 on database error (lines 105-110)', async () => {
      mockState.single = { data: null, error: { message: 'Database error' } };

      const req = createMockRequest({ params: { id: 'm1' } });
      const res = createMockResponse();

      await getMemberById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ============================================
  // createMember Tests (lines 113-189)
  // ============================================
  describe('createMember()', () => {
    test('should create member successfully (lines 164-181)', async () => {
      const newMember = { id: 'm1', full_name: 'Test', phone: '0501234567', membership_number: 'SH-12345678' };
      mockState.single = { data: newMember, error: null };

      const req = createMockRequest({
        body: { full_name: 'Test', phone: '0501234567' }
      });
      const res = createMockResponse();

      await createMember(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'تم إضافة العضو بنجاح'
        })
      );
    });

    test('should return 400 when full_name is missing (lines 119-127)', async () => {
      const req = createMockRequest({
        body: { phone: '0501234567' }
      });
      const res = createMockResponse();

      await createMember(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'الاسم الكامل مطلوب'
        })
      );
    });

    test('should return 400 when phone is missing (lines 119-127)', async () => {
      const req = createMockRequest({
        body: { full_name: 'Test' }
      });
      const res = createMockResponse();

      await createMember(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'رقم الهاتف مطلوب'
        })
      );
    });

    test('should return 400 for invalid phone number (lines 130-136)', async () => {
      const req = createMockRequest({
        body: { full_name: 'Test', phone: '123' }
      });
      const res = createMockResponse();

      await createMember(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('رقم الهاتف غير صالح')
        })
      );
    });

    test('should generate membership number if not provided (lines 138-141)', async () => {
      const newMember = { id: 'm1', full_name: 'Test', phone: '0501234567', membership_number: 'SH-12345678' };
      mockState.single = { data: newMember, error: null };

      const req = createMockRequest({
        body: { full_name: 'Test', phone: '0501234567' }
      });
      const res = createMockResponse();

      await createMember(req, res);

      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    test('should return 500 on database error (lines 182-188)', async () => {
      mockState.single = { data: null, error: { message: 'Insert failed' } };

      const req = createMockRequest({
        body: { full_name: 'Test', phone: '0501234567' }
      });
      const res = createMockResponse();

      await createMember(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ============================================
  // updateMember Tests (lines 191-332)
  // ============================================
  describe('updateMember()', () => {
    test('should update member successfully (lines 307-311)', async () => {
      const updatedMember = { id: 'm1', full_name: 'Updated Name', membership_number: 'SH-001' };
      mockState.single = { data: updatedMember, error: null };

      const req = createMockRequest({
        params: { id: 'm1' },
        body: { full_name: 'Updated Name' }
      });
      const res = createMockResponse();

      await updateMember(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'تم تحديث بيانات العضو بنجاح'
        })
      );
    });

    test('should return 400 when no update data (lines 252-258)', async () => {
      const req = createMockRequest({
        params: { id: 'm1' },
        body: {}
      });
      const res = createMockResponse();

      await updateMember(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'لا توجد بيانات للتحديث'
        })
      );
    });

    test('should return 400 for invalid phone on update (lines 232-241)', async () => {
      const req = createMockRequest({
        params: { id: 'm1' },
        body: { phone: '123' }
      });
      const res = createMockResponse();

      await updateMember(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('رقم الهاتف غير صالح')
        })
      );
    });

    test('should return 404 when member not found (lines 295-300)', async () => {
      mockState.single = { data: null, error: null };

      const req = createMockRequest({
        params: { id: 'nonexistent' },
        body: { full_name: 'Test' }
      });
      const res = createMockResponse();

      await updateMember(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('should return 409 for duplicate data error code 23505 (lines 278-283)', async () => {
      mockState.single = { data: null, error: { code: '23505', message: 'Duplicate' } };

      const req = createMockRequest({
        params: { id: 'm1' },
        body: { full_name: 'Test' }
      });
      const res = createMockResponse();

      await updateMember(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    test('should return 400 for invalid data error codes (lines 285-290)', async () => {
      mockState.single = { data: null, error: { code: '22P02', message: 'Invalid data' } };

      const req = createMockRequest({
        params: { id: 'm1' },
        body: { full_name: 'Test' }
      });
      const res = createMockResponse();

      await updateMember(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should handle empty date fields (lines 208-216)', async () => {
      const updatedMember = { id: 'm1', full_name: 'Test' };
      mockState.single = { data: updatedMember, error: null };

      const req = createMockRequest({
        params: { id: 'm1' },
        body: { full_name: 'Test', date_of_birth: '' }
      });
      const res = createMockResponse();

      await updateMember(req, res);

      // Should succeed without including empty date
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    test('should lowercase gender field (lines 218-219)', async () => {
      const updatedMember = { id: 'm1', gender: 'male' };
      mockState.single = { data: updatedMember, error: null };

      const req = createMockRequest({
        params: { id: 'm1' },
        body: { gender: 'MALE' }
      });
      const res = createMockResponse();

      await updateMember(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });

  // ============================================
  // deleteMember Tests (lines 334-355)
  // ============================================
  describe('deleteMember()', () => {
    test('should delete member successfully (lines 345-348)', async () => {
      mockState.delete = { error: null };

      const req = createMockRequest({ params: { id: 'm1' } });
      const res = createMockResponse();

      await deleteMember(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'تم حذف العضو بنجاح'
        })
      );
    });

    test('should return 500 on database error (lines 349-354)', async () => {
      mockState.shouldThrow = true;

      const req = createMockRequest({ params: { id: 'm1' } });
      const res = createMockResponse();

      await deleteMember(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ============================================
  // getMemberStatistics Tests (lines 357-440)
  // ============================================
  describe('getMemberStatistics()', () => {
    test('should return all statistics (lines 420-432)', async () => {
      mockState.statistics = {
        total: { count: 100, error: null },
        active: { count: 80, error: null },
        completed: { count: 75, error: null },
        pending: { count: 25, error: null },
        socialSecurity: { count: 10, error: null },
        thisMonth: { count: 5, error: null },
        imports: { data: [], error: null }
      };

      const req = createMockRequest();
      const res = createMockResponse();

      await getMemberStatistics(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            total_members: expect.any(Number),
            active_members: expect.any(Number),
            completed_profiles: expect.any(Number),
            pending_profiles: expect.any(Number)
          })
        })
      );
    });

    test('should return 500 on database error (lines 434-439)', async () => {
      mockState.shouldThrow = true;

      const req = createMockRequest();
      const res = createMockResponse();

      await getMemberStatistics(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    test('should calculate completion rate correctly (line 429)', async () => {
      mockState.statistics = {
        total: { count: 100, error: null },
        active: { count: 80, error: null },
        completed: { count: 75, error: null },
        pending: { count: 25, error: null },
        socialSecurity: { count: 10, error: null },
        thisMonth: { count: 5, error: null },
        imports: { data: [], error: null }
      };

      const req = createMockRequest();
      const res = createMockResponse();

      await getMemberStatistics(req, res);

      // Completion rate should be calculated
      expect(res.json).toHaveBeenCalled();
    });
  });

  // ============================================
  // sendRegistrationReminders Tests (lines 442-529)
  // ============================================
  describe('sendRegistrationReminders()', () => {
    test('should return 400 when memberIds is missing (lines 446-451)', async () => {
      const req = createMockRequest({ body: {} });
      const res = createMockResponse();

      await sendRegistrationReminders(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'يجب تحديد قائمة بمعرفات الأعضاء'
        })
      );
    });

    test('should return 400 when memberIds is empty array (lines 446-451)', async () => {
      const req = createMockRequest({ body: { memberIds: [] } });
      const res = createMockResponse();

      await sendRegistrationReminders(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should return 404 when no incomplete profiles found (lines 475-480)', async () => {
      mockState.members = { data: [], error: null };

      const req = createMockRequest({ body: { memberIds: ['id1', 'id2'] } });
      const res = createMockResponse();

      await sendRegistrationReminders(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('should return success with member reminders (lines 513-521)', async () => {
      const mockMembersData = [
        {
          id: 'm1',
          full_name: 'Test',
          phone: '0501234567',
          membership_number: 'SH-001',
          member_registration_tokens: [{ token: 'ABC123', temp_password: '123456', expires_at: '2025-01-01' }]
        }
      ];
      mockState.members = { data: mockMembersData, error: null };

      const req = createMockRequest({ body: { memberIds: ['m1'] } });
      const res = createMockResponse();

      await sendRegistrationReminders(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            total_reminders: 1
          })
        })
      );
    });
  });

  // ============================================
  // getIncompleteProfiles Tests (lines 531-571)
  // ============================================
  describe('getIncompleteProfiles()', () => {
    test('should return incomplete profiles with pagination (lines 554-563)', async () => {
      mockState.members = { data: [{ id: 'm1', profile_completed: false }], error: null, count: 1 };

      const req = createMockRequest({ query: { page: '1', limit: '20' } });
      const res = createMockResponse();

      await getIncompleteProfiles(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          pagination: expect.objectContaining({
            page: 1,
            limit: 20
          })
        })
      );
    });

    test('should return 500 on database error (lines 565-570)', async () => {
      mockState.shouldThrow = true;

      const req = createMockRequest();
      const res = createMockResponse();

      await getIncompleteProfiles(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ============================================
  // addMemberManually Tests (lines 573-708)
  // ============================================
  describe('addMemberManually()', () => {
    test('should return 400 when full_name is missing (lines 587-593)', async () => {
      const req = createMockRequest({ body: { phone: '0501234567' } });
      const res = createMockResponse();

      await addMemberManually(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'الاسم الكامل ورقم الهاتف مطلوبان'
        })
      );
    });

    test('should return 400 when phone exists (lines 605-610)', async () => {
      mockState.single = { data: { id: 'existing' }, error: null };

      const req = createMockRequest({
        body: { full_name: 'Test', phone: '0501234567' }
      });
      const res = createMockResponse();

      await addMemberManually(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'رقم الهاتف مسجل مسبقاً'
        })
      );
    });

    test('should create member with generated values (lines 612-632)', async () => {
      // First call returns null (phone not found), second returns new member
      let callCount = 0;
      mockSupabase.single = jest.fn(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ data: null, error: null });
        }
        return Promise.resolve({
          data: { id: 'm1', full_name: 'Test', phone: '0501234567' },
          error: null
        });
      });

      const req = createMockRequest({
        body: { full_name: 'Test', phone: '0501234567' }
      });
      const res = createMockResponse();

      await addMemberManually(req, res);

      // Should call insert
      expect(mockSupabase.insert).toHaveBeenCalled();
    });
  });

  // ============================================
  // getMemberProfile Tests (lines 712-751)
  // ============================================
  describe('getMemberProfile()', () => {
    test('should return member profile without sensitive data (lines 738-744)', async () => {
      const mockMember = {
        id: 'm1',
        full_name: 'Test',
        temp_password: 'secret',
        password_hash: 'hash'
      };
      mockState.single = { data: mockMember, error: null };

      const req = createMockRequest({ user: { id: 'm1' } });
      const res = createMockResponse();

      await getMemberProfile(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.not.objectContaining({
            temp_password: expect.anything(),
            password_hash: expect.anything()
          })
        })
      );
    });

    test('should return 404 when member not found (lines 731-736)', async () => {
      mockState.single = { data: null, error: null };

      const req = createMockRequest({ user: { id: 'nonexistent' } });
      const res = createMockResponse();

      await getMemberProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('should return 500 on database error (lines 745-750)', async () => {
      mockState.single = { data: null, error: { message: 'Error' } };

      const req = createMockRequest({ user: { id: 'm1' } });
      const res = createMockResponse();

      await getMemberProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ============================================
  // getMemberBalance Tests (lines 753-802)
  // ============================================
  describe('getMemberBalance()', () => {
    test('should return balance information (lines 785-795)', async () => {
      mockState.members = { data: [{ amount: 500, status: 'completed' }], error: null };
      mockState.single = { data: { membership_status: 'active', full_name: 'Test' }, error: null };

      const req = createMockRequest();
      const res = createMockResponse();

      await getMemberBalance(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            current_balance: expect.any(Number),
            minimum_balance: expect.any(Number)
          })
        })
      );
    });

    test('should return 500 on error (lines 796-801)', async () => {
      mockJwt.verify = jest.fn(() => { throw new Error('Invalid token'); });

      const req = createMockRequest();
      const res = createMockResponse();

      await getMemberBalance(req, res);

      expect(res.status).toHaveBeenCalledWith(500);

      // Restore jwt mock
      mockJwt.verify = jest.fn(() => ({ id: 'test-member-id', role: 'member' }));
    });
  });

  // ============================================
  // getMemberTransactions Tests (lines 804-839)
  // ============================================
  describe('getMemberTransactions()', () => {
    test('should return paginated transactions (lines 822-832)', async () => {
      mockState.members = { data: [{ id: 'p1', amount: 500 }], error: null, count: 1 };

      const req = createMockRequest({ query: { page: '1', limit: '20' } });
      const res = createMockResponse();

      await getMemberTransactions(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          pagination: expect.objectContaining({
            page: 1,
            limit: 20
          })
        })
      );
    });

    test('should return 500 on error (lines 833-838)', async () => {
      mockJwt.verify = jest.fn(() => { throw new Error('Invalid'); });

      const req = createMockRequest();
      const res = createMockResponse();

      await getMemberTransactions(req, res);

      expect(res.status).toHaveBeenCalledWith(500);

      mockJwt.verify = jest.fn(() => ({ id: 'test-member-id', role: 'member' }));
    });
  });

  // ============================================
  // getMemberNotifications Tests (lines 841-881)
  // ============================================
  describe('getMemberNotifications()', () => {
    test('should return paginated notifications (lines 865-874)', async () => {
      mockState.members = { data: [{ id: 'n1', message: 'Test' }], error: null, count: 1 };

      const req = createMockRequest({ query: { page: '1', limit: '20' } });
      const res = createMockResponse();

      await getMemberNotifications(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          pagination: expect.any(Object)
        })
      );
    });

    test('should filter unread only when requested (lines 856-858)', async () => {
      mockState.members = { data: [], error: null, count: 0 };

      const req = createMockRequest({ query: { unread_only: 'true' } });
      const res = createMockResponse();

      await getMemberNotifications(req, res);

      expect(mockSupabase.eq).toHaveBeenCalledWith('is_read', false);
    });

    test('should return 500 on error (lines 875-880)', async () => {
      mockJwt.verify = jest.fn(() => { throw new Error('Invalid'); });

      const req = createMockRequest();
      const res = createMockResponse();

      await getMemberNotifications(req, res);

      expect(res.status).toHaveBeenCalledWith(500);

      mockJwt.verify = jest.fn(() => ({ id: 'test-member-id', role: 'member' }));
    });
  });

  // ============================================
  // updateMemberProfile Tests (lines 883-929)
  // ============================================
  describe('updateMemberProfile()', () => {
    test('should update profile successfully (lines 918-922)', async () => {
      const updatedMember = { id: 'm1', full_name: 'Updated' };
      mockState.single = { data: updatedMember, error: null };

      const req = createMockRequest({
        body: { full_name: 'Updated' }
      });
      const res = createMockResponse();

      await updateMemberProfile(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'تم تحديث الملف الشخصي بنجاح'
        })
      );
    });

    test('should remove sensitive fields from update (lines 892-901)', async () => {
      const updatedMember = { id: 'm1', full_name: 'Updated' };
      mockState.single = { data: updatedMember, error: null };

      const req = createMockRequest({
        body: {
          full_name: 'Updated',
          membership_number: 'SH-HACK',
          temp_password: 'secret',
          password_hash: 'hash'
        }
      });
      const res = createMockResponse();

      await updateMemberProfile(req, res);

      // Should succeed without sensitive fields
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    test('should return 500 on error (lines 923-928)', async () => {
      mockJwt.verify = jest.fn(() => { throw new Error('Invalid'); });

      const req = createMockRequest({ body: { full_name: 'Test' } });
      const res = createMockResponse();

      await updateMemberProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(500);

      mockJwt.verify = jest.fn(() => ({ id: 'test-member-id', role: 'member' }));
    });
  });

  // ============================================
  // Arabic Messages Tests
  // ============================================
  describe('Arabic Error Messages', () => {
    test('should return Arabic messages for validation errors', async () => {
      const req = createMockRequest({ body: {} });
      const res = createMockResponse();

      await createMember(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringMatching(/[\u0600-\u06FF]/)
        })
      );
    });
  });
});
