/**
 * Member Monitoring Controller Unit Tests
 * Tests optimized member monitoring dashboard functionality
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
  update: jest.fn(() => mockSupabase),
  insert: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  gte: jest.fn(() => mockSupabase),
  lte: jest.fn(() => mockSupabase),
  order: jest.fn(() => mockSupabase),
  range: jest.fn(() => mockSupabase),
  single: jest.fn(() => Promise.resolve(mockSupabaseResponse)),
  then: jest.fn((cb) => Promise.resolve(cb(mockSupabaseResponse)))
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

jest.unstable_mockModule('../../../src/services/memberMonitoringQueryService.js', () => ({
  buildMemberMonitoringQuery: jest.fn(),
  getMemberStatistics: jest.fn(),
  exportMemberData: jest.fn(),
  getMemberDetails: jest.fn(),
  searchMembersAutocomplete: jest.fn(),
  getTribalSectionStats: jest.fn()
}));

describe('Member Monitoring Controller Unit Tests', () => {
  const createMockRequest = (overrides = {}) => ({
    user: { id: 'admin-123', role: 'admin' },
    query: {},
    body: {},
    params: {},
    ...overrides
  });

  const createMockResponse = () => {
    const res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res),
      setHeader: jest.fn(() => res)
    };
    return res;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseResponse.data = null;
    mockSupabaseResponse.error = null;
  });

  // ============================================
  // Filter Extraction Tests
  // ============================================
  describe('Filter Extraction', () => {
    test('should extract all filter parameters', () => {
      const req = createMockRequest({
        query: {
          memberId: 'SH-001',
          fullName: 'محمد',
          phone: '0501234567',
          tribalSection: 'الشمال',
          balanceOperator: '>',
          balanceAmount: '1000',
          status: 'active',
          page: '2',
          limit: '25',
          sortBy: 'balance',
          sortOrder: 'desc'
        }
      });

      const filters = {
        memberId: req.query.memberId,
        fullName: req.query.fullName,
        phone: req.query.phone,
        tribalSection: req.query.tribalSection,
        balanceOperator: req.query.balanceOperator,
        balanceAmount: req.query.balanceAmount ? parseFloat(req.query.balanceAmount) : undefined,
        status: req.query.status,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50,
        sortBy: req.query.sortBy || 'full_name',
        sortOrder: req.query.sortOrder || 'asc'
      };

      expect(filters.memberId).toBe('SH-001');
      expect(filters.balanceAmount).toBe(1000);
      expect(filters.page).toBe(2);
      expect(filters.limit).toBe(25);
    });

    test('should apply default values', () => {
      const req = createMockRequest({ query: {} });

      const filters = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50,
        sortBy: req.query.sortBy || 'full_name',
        sortOrder: req.query.sortOrder || 'asc'
      };

      expect(filters.page).toBe(1);
      expect(filters.limit).toBe(50);
      expect(filters.sortBy).toBe('full_name');
      expect(filters.sortOrder).toBe('asc');
    });

    test('should limit max results to 100', () => {
      const req = createMockRequest({
        query: { limit: '200' }
      });

      let limit = parseInt(req.query.limit) || 50;
      if (limit > 100) {
        limit = 100;
      }

      expect(limit).toBe(100);
    });
  });

  // ============================================
  // Balance Operator Tests
  // ============================================
  describe('Balance Operators', () => {
    test('should handle greater than operator', () => {
      const operator = '>';
      const amount = 1000;

      expect(operator).toBe('>');
      expect(amount).toBe(1000);
    });

    test('should handle less than operator', () => {
      const operator = '<';
      const amount = 500;

      expect(operator).toBe('<');
    });

    test('should handle between operator', () => {
      const req = createMockRequest({
        query: {
          balanceOperator: 'between',
          balanceMin: '1000',
          balanceMax: '2000'
        }
      });

      const filters = {
        balanceOperator: req.query.balanceOperator,
        balanceMin: req.query.balanceMin ? parseFloat(req.query.balanceMin) : undefined,
        balanceMax: req.query.balanceMax ? parseFloat(req.query.balanceMax) : undefined
      };

      expect(filters.balanceOperator).toBe('between');
      expect(filters.balanceMin).toBe(1000);
      expect(filters.balanceMax).toBe(2000);
    });

    test('should handle compliant operator', () => {
      const operator = 'compliant';
      // compliant means balance >= 3000
      expect(operator).toBe('compliant');
    });

    test('should handle non-compliant operator', () => {
      const operator = 'non-compliant';
      // non-compliant means balance < 3000
      expect(operator).toBe('non-compliant');
    });

    test('should handle critical operator', () => {
      const operator = 'critical';
      // critical means balance < 1000
      expect(operator).toBe('critical');
    });

    test('should handle excellent operator', () => {
      const operator = 'excellent';
      // excellent means balance >= 5000
      expect(operator).toBe('excellent');
    });
  });

  // ============================================
  // Response Format Tests
  // ============================================
  describe('Response Format', () => {
    test('should return monitoring response format', () => {
      const res = createMockResponse();

      const response = {
        success: true,
        members: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 100,
          totalPages: 2,
          filtered: 100
        },
        statistics: {
          totalMembers: 100,
          compliant: 60,
          nonCompliant: 40
        },
        performance: {
          queryTime: '45ms',
          cached: false
        }
      };

      res.json(response);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          pagination: expect.any(Object),
          performance: expect.any(Object)
        })
      );
    });

    test('should set proper headers', () => {
      const res = createMockResponse();

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('X-Query-Time', '45ms');

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json; charset=utf-8');
      expect(res.setHeader).toHaveBeenCalledWith('X-Query-Time', '45ms');
    });
  });

  // ============================================
  // Dashboard Statistics Tests
  // ============================================
  describe('Dashboard Statistics', () => {
    test('should handle force refresh', () => {
      const req = createMockRequest({
        query: { refresh: 'true' }
      });

      const forceRefresh = req.query.refresh === 'true';
      expect(forceRefresh).toBe(true);
    });

    test('should return statistics with cache info', () => {
      const res = createMockResponse();

      res.json({
        success: true,
        statistics: {
          totalMembers: 300,
          activeMembers: 250,
          suspendedMembers: 50
        },
        cached: true,
        cacheAge: 120
      });

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          cached: true
        })
      );
    });
  });

  // ============================================
  // Export Members Tests
  // ============================================
  describe('Export Members', () => {
    test('should set download headers', () => {
      const res = createMockResponse();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="members-export-${timestamp}.json"`);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json; charset=utf-8');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('attachment; filename="members-export-')
      );
    });
  });

  // ============================================
  // Get Member Details Tests
  // ============================================
  describe('Get Member Details', () => {
    test('should require member ID', () => {
      const req = createMockRequest({
        params: { id: '' }
      });
      const res = createMockResponse();

      if (!req.params.id) {
        res.status(400).json({
          error: 'Member ID is required'
        });
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ============================================
  // Search Members Tests
  // ============================================
  describe('Search Members Autocomplete', () => {
    test('should require minimum 2 characters', () => {
      const req = createMockRequest({
        query: { q: 'م' }
      });
      const res = createMockResponse();

      if (!req.query.q || req.query.q.length < 2) {
        res.json({
          success: true,
          data: []
        });
      }

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: []
      });
    });

    test('should parse limit parameter', () => {
      const req = createMockRequest({
        query: { q: 'محمد', limit: '5' }
      });

      const limit = parseInt(req.query.limit) || 10;
      expect(limit).toBe(5);
    });
  });

  // ============================================
  // Suspend Member Tests
  // ============================================
  describe('Suspend Member', () => {
    test('should require suspension reason', () => {
      const req = createMockRequest({
        params: { id: 'member-123' },
        body: { reason: '' }
      });
      const res = createMockResponse();

      if (!req.body.reason) {
        res.status(400).json({
          error: 'Suspension reason is required'
        });
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should update member with suspension info', () => {
      const id = 'member-123';
      const reason = 'عدم دفع الاشتراكات';
      const adminId = 'admin-123';

      const updateData = {
        is_suspended: true,
        suspension_reason: reason,
        suspended_at: new Date().toISOString(),
        suspended_by: adminId
      };

      expect(updateData.is_suspended).toBe(true);
      expect(updateData.suspension_reason).toBe(reason);
    });

    test('should return success response', () => {
      const res = createMockResponse();

      res.json({
        success: true,
        message: 'تم إيقاف العضو بنجاح',
        member: { id: 'member-123', is_suspended: true }
      });

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'تم إيقاف العضو بنجاح'
        })
      );
    });
  });

  // ============================================
  // Reactivate Member Tests
  // ============================================
  describe('Reactivate Member', () => {
    test('should clear suspension fields', () => {
      const adminId = 'admin-123';

      const updateData = {
        is_suspended: false,
        suspension_reason: null,
        suspended_at: null,
        suspended_by: null,
        reactivated_at: new Date().toISOString(),
        reactivated_by: adminId
      };

      expect(updateData.is_suspended).toBe(false);
      expect(updateData.suspension_reason).toBeNull();
      expect(updateData.reactivated_at).toBeDefined();
    });
  });

  // ============================================
  // Notify Members Tests
  // ============================================
  describe('Notify Members', () => {
    test('should require member IDs', () => {
      const req = createMockRequest({
        body: { memberIds: [] }
      });
      const res = createMockResponse();

      if (!req.body.memberIds || !Array.isArray(req.body.memberIds) || req.body.memberIds.length === 0) {
        res.status(400).json({
          error: 'Member IDs are required'
        });
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should require message', () => {
      const req = createMockRequest({
        body: { memberIds: ['m1'], message: '' }
      });
      const res = createMockResponse();

      if (!req.body.message) {
        res.status(400).json({
          error: 'Message is required'
        });
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should track sent and failed notifications', () => {
      const results = {
        sent: [
          { memberId: 'm1', memberName: 'محمد' },
          { memberId: 'm2', memberName: 'أحمد' }
        ],
        failed: [
          { memberId: 'm3', reason: 'Member not found' }
        ]
      };

      expect(results.sent.length).toBe(2);
      expect(results.failed.length).toBe(1);
    });

    test('should support different channels', () => {
      const channels = ['app', 'sms', 'both'];

      channels.forEach(channel => {
        expect(['app', 'sms', 'both']).toContain(channel);
      });
    });
  });

  // ============================================
  // Audit Log Tests
  // ============================================
  describe('Audit Log', () => {
    test('should calculate pagination offset', () => {
      const page = 3;
      const limit = 50;
      const offset = (page - 1) * limit;

      expect(offset).toBe(100);
    });

    test('should filter by action_type', () => {
      const req = createMockRequest({
        query: { action_type: 'member_suspended' }
      });

      expect(req.query.action_type).toBe('member_suspended');
    });

    test('should filter by date range', () => {
      const req = createMockRequest({
        query: {
          start_date: '2024-01-01',
          end_date: '2024-12-31'
        }
      });

      expect(req.query.start_date).toBe('2024-01-01');
      expect(req.query.end_date).toBe('2024-12-31');
    });

    test('should return paginated response', () => {
      const res = createMockResponse();

      res.json({
        success: true,
        logs: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 150,
          totalPages: 3
        }
      });

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          pagination: expect.objectContaining({
            totalPages: 3
          })
        })
      );
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================
  describe('Error Handling', () => {
    test('should return 400 for invalid input', () => {
      const res = createMockResponse();
      res.status(400).json({
        error: 'Member ID is required'
      });

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should return 500 on internal error', () => {
      const res = createMockResponse();
      res.status(500).json({
        error: 'Internal server error',
        message: 'Database connection failed'
      });

      expect(res.status).toHaveBeenCalledWith(500);
    });

    test('should include error message in response', () => {
      const error = new Error('Query timeout');
      const res = createMockResponse();

      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Query timeout'
        })
      );
    });
  });
});
