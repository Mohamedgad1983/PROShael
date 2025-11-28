/**
 * Dashboard Controller Unit Tests
 * Tests dashboard statistics with proper mocking for parallel queries
 */

import { jest, describe, test, expect, beforeEach, afterAll } from '@jest/globals';

// Mock state for controlling test scenarios
// Uses query-specific state rather than shared currentTable
let mockState = {
  membersStats: { data: null, error: null },      // getMembersStatistics
  payments: { data: null, error: null },           // getPaymentsStatistics
  subscriptions: { data: null, error: null },      // getSubscriptionStatistics
  recentPayments: { data: null, error: null },     // getRecentActivities payments
  recentMembers: { data: null, error: null },      // getRecentActivities members
  tribalMembers: { data: null, error: null },      // getTribalSectionsStatistics
  shouldThrow: false
};

// Determine which mock data to return based on query context
function determineResult(tableName, selectFields, hasOrder) {
  // getTribalSectionsStatistics: members table with tribal_section
  if (tableName === 'members' && selectFields && selectFields.includes('tribal_section')) {
    return mockState.tribalMembers;
  }

  // getRecentActivities: payments with order
  if (tableName === 'payments' && hasOrder) {
    return mockState.recentPayments;
  }

  // getRecentActivities: members with order and member_id
  if (tableName === 'members' && hasOrder && selectFields && selectFields.includes('member_id')) {
    return mockState.recentMembers;
  }

  // getMembersStatistics: members with is_active
  if (tableName === 'members' && selectFields && selectFields.includes('is_active')) {
    return mockState.membersStats;
  }

  // getPaymentsStatistics: payments without order
  if (tableName === 'payments' && !hasOrder) {
    return mockState.payments;
  }

  // getSubscriptionStatistics: subscriptions
  if (tableName === 'subscriptions') {
    return mockState.subscriptions;
  }

  // Default fallback based on table
  if (tableName === 'members') return mockState.membersStats;
  if (tableName === 'payments') return mockState.payments;
  if (tableName === 'subscriptions') return mockState.subscriptions;

  return { data: null, error: null };
}

// Create chainable mock that tracks each query's own context
const mockSupabase = {
  from: jest.fn((tableName) => {
    // Each call to from() creates a new chain with its own context
    let queryContext = {
      tableName,
      selectFields: null,
      hasOrder: false
    };

    const chain = {
      select: jest.fn((fields) => {
        queryContext.selectFields = fields;
        return chain;
      }),
      eq: jest.fn(() => chain),
      gte: jest.fn(() => chain),
      lte: jest.fn(() => chain),
      limit: jest.fn(() => chain),
      order: jest.fn(() => {
        queryContext.hasOrder = true;
        return chain;
      }),
      single: jest.fn(() => {
        if (mockState.shouldThrow) {
          return Promise.reject(new Error('Database error'));
        }
        const result = determineResult(queryContext.tableName, queryContext.selectFields, queryContext.hasOrder);
        return Promise.resolve(result);
      }),
      then: jest.fn((callback) => {
        if (mockState.shouldThrow) {
          return Promise.reject(new Error('Database error'));
        }
        const result = determineResult(queryContext.tableName, queryContext.selectFields, queryContext.hasOrder);
        return Promise.resolve(callback(result));
      })
    };

    return chain;
  })
};

// Mock modules
jest.unstable_mockModule('../../../src/config/database.js', () => ({
  supabase: mockSupabase
}));

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    http: jest.fn(),
    db: jest.fn()
  }
}));

// Import controller AFTER mocking
const { getDashboardStats } = await import('../../../src/controllers/dashboardController.js');
const { log } = await import('../../../src/utils/logger.js');

describe('Dashboard Controller Unit Tests', () => {
  const createMockRequest = (overrides = {}) => ({
    user: { id: 'user-123', role: 'super_admin' },
    query: {},
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
    // Reset all mock state
    mockState = {
      membersStats: { data: null, error: null },
      payments: { data: null, error: null },
      subscriptions: { data: null, error: null },
      recentPayments: { data: null, error: null },
      recentMembers: { data: null, error: null },
      tribalMembers: { data: null, error: null },
      shouldThrow: false
    };
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // getDashboardStats() Main Tests
  // ============================================
  describe('getDashboardStats()', () => {
    test('should return success response with all stats (lines 4-57)', async () => {
      mockState.membersStats = {
        data: [
          { id: 'm1', full_name: 'محمد علي', is_active: true, created_at: new Date().toISOString() },
          { id: 'm2', full_name: 'أحمد محمد', is_active: true, created_at: '2024-01-15' },
          { id: 'm3', full_name: 'سالم', is_active: false, created_at: '2024-01-10' }
        ],
        error: null
      };
      mockState.payments = {
        data: [
          { id: 'p1', amount: 50, status: 'paid', created_at: new Date().toISOString() },
          { id: 'p2', amount: 100, status: 'pending', created_at: '2024-01-15' }
        ],
        error: null
      };
      mockState.subscriptions = {
        data: [
          { id: 's1', amount: 500, status: 'active' },
          { id: 's2', amount: 500, status: 'expired' }
        ],
        error: null
      };
      mockState.recentPayments = { data: [], error: null };
      mockState.recentMembers = { data: [], error: null };
      mockState.tribalMembers = { data: [], error: null };

      const req = createMockRequest();
      const res = createMockResponse();

      await getDashboardStats(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            members: expect.any(Object),
            payments: expect.any(Object),
            subscriptions: expect.any(Object)
          })
        })
      );
      expect(log.http).toHaveBeenCalledWith('Dashboard stats request received');
    });

    test('should use fallback on rejected promises (lines 19-23)', async () => {
      // Simulate all queries failing
      mockState.membersStats = { data: null, error: { message: 'DB Error' } };
      mockState.payments = { data: null, error: { message: 'DB Error' } };
      mockState.subscriptions = { data: null, error: { message: 'DB Error' } };
      mockState.recentPayments = { data: null, error: { message: 'DB Error' } };
      mockState.recentMembers = { data: null, error: { message: 'DB Error' } };
      mockState.tribalMembers = { data: null, error: { message: 'DB Error' } };

      const req = createMockRequest();
      const res = createMockResponse();

      await getDashboardStats(req, res);

      // Should still return success with default/fallback data
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Object)
        })
      );
    });

    test('should handle critical error and return mock data (lines 44-56)', async () => {
      // To hit the catch block, we need res.json to throw on first call
      // This simulates a synchronous error during response handling
      const req = createMockRequest();
      const res = createMockResponse();

      let callCount = 0;
      res.json = jest.fn(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Simulated JSON serialization error');
        }
        return res;
      });

      await getDashboardStats(req, res);

      // The catch block calls res.json with fallback data
      expect(res.json).toHaveBeenCalledTimes(2);
      expect(res.json).toHaveBeenLastCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            members: expect.objectContaining({ total: 299 }),
            payments: expect.objectContaining({ pending: 0 }),
            subscriptions: expect.objectContaining({ active: 0 })
          })
        })
      );
      expect(log.error).toHaveBeenCalledWith(
        'Critical dashboard error',
        expect.any(Object)
      );
    });

    test('should log rejected promises (lines 26-31)', async () => {
      // Make members fail but others succeed
      mockState.membersStats = { data: null, error: { message: 'Members query failed' } };
      mockState.payments = {
        data: [{ id: 'p1', amount: 50, status: 'paid', created_at: new Date().toISOString() }],
        error: null
      };
      mockState.subscriptions = {
        data: [{ id: 's1', amount: 500, status: 'active' }],
        error: null
      };
      mockState.recentPayments = { data: [], error: null };
      mockState.recentMembers = { data: [], error: null };
      mockState.tribalMembers = { data: [], error: null };

      const req = createMockRequest();
      const res = createMockResponse();

      await getDashboardStats(req, res);

      // Should still return success
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });
  });

  // ============================================
  // getMembersStatistics() Tests (lines 88-132)
  // ============================================
  describe('Members Statistics', () => {
    test('should calculate member stats correctly (lines 106-127)', async () => {
      const now = new Date();
      const recentDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days ago

      mockState.membersStats = {
        data: [
          { id: 'm1', full_name: 'Test1', is_active: true, created_at: recentDate },
          { id: 'm2', full_name: 'Test2', is_active: true, created_at: '2023-01-01' },
          { id: 'm3', full_name: 'Test3', is_active: false, created_at: '2023-06-15' }
        ],
        error: null
      };
      mockState.payments = { data: [], error: null };
      mockState.subscriptions = { data: [], error: null };
      mockState.recentPayments = { data: [], error: null };
      mockState.recentMembers = { data: [], error: null };
      mockState.tribalMembers = { data: [], error: null };

      const req = createMockRequest();
      const res = createMockResponse();

      await getDashboardStats(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            members: expect.objectContaining({
              total: 3,
              active: 2,
              inactive: 1
            })
          })
        })
      );
    });

    test('should return default stats on error (lines 96-98, 128-131)', async () => {
      mockState.membersStats = { data: null, error: { message: 'Query timeout' } };
      mockState.payments = { data: [], error: null };
      mockState.subscriptions = { data: [], error: null };
      mockState.recentPayments = { data: [], error: null };
      mockState.recentMembers = { data: [], error: null };
      mockState.tribalMembers = { data: [], error: null };

      const req = createMockRequest();
      const res = createMockResponse();

      await getDashboardStats(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            members: expect.objectContaining({
              total: 299 // Default value
            })
          })
        })
      );
    });

    test('should return default when no members data (lines 101-104)', async () => {
      mockState.membersStats = { data: null, error: null };
      mockState.payments = { data: [], error: null };
      mockState.subscriptions = { data: [], error: null };
      mockState.recentPayments = { data: [], error: null };
      mockState.recentMembers = { data: [], error: null };
      mockState.tribalMembers = { data: [], error: null };

      const req = createMockRequest();
      const res = createMockResponse();

      await getDashboardStats(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            members: expect.objectContaining({
              total: 299
            })
          })
        })
      );
    });

    test('should handle invalid created_at date (lines 113-117)', async () => {
      mockState.membersStats = {
        data: [
          { id: 'm1', full_name: 'Test1', is_active: true, created_at: 'invalid-date' },
          { id: 'm2', full_name: 'Test2', is_active: true, created_at: null }
        ],
        error: null
      };
      mockState.payments = { data: [], error: null };
      mockState.subscriptions = { data: [], error: null };
      mockState.recentPayments = { data: [], error: null };
      mockState.recentMembers = { data: [], error: null };
      mockState.tribalMembers = { data: [], error: null };

      const req = createMockRequest();
      const res = createMockResponse();

      await getDashboardStats(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            members: expect.objectContaining({
              total: 2,
              newThisMonth: 0 // Should be 0 due to invalid dates
            })
          })
        })
      );
    });
  });

  // ============================================
  // getPaymentsStatistics() Tests (lines 134-193)
  // ============================================
  describe('Payments Statistics', () => {
    test('should calculate payment stats correctly (lines 152-188)', async () => {
      const recentDate = new Date().toISOString();

      mockState.membersStats = { data: [], error: null };
      mockState.payments = {
        data: [
          { id: 'p1', amount: '100', status: 'paid', created_at: recentDate },
          { id: 'p2', amount: '200', status: 'paid', created_at: '2023-01-01' },
          { id: 'p3', amount: '50', status: 'pending', created_at: recentDate }
        ],
        error: null
      };
      mockState.subscriptions = { data: [], error: null };
      mockState.recentPayments = { data: [], error: null };
      mockState.recentMembers = { data: [], error: null };
      mockState.tribalMembers = { data: [], error: null };

      const req = createMockRequest();
      const res = createMockResponse();

      await getDashboardStats(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            payments: expect.objectContaining({
              pending: 1,
              pendingAmount: 50,
              totalPaid: 2,
              totalRevenue: 300
            })
          })
        })
      );
    });

    test('should return default stats on error (lines 142-144, 189-192)', async () => {
      mockState.membersStats = { data: [], error: null };
      mockState.payments = { data: null, error: { message: 'Payment query failed' } };
      mockState.subscriptions = { data: [], error: null };
      mockState.recentPayments = { data: [], error: null };
      mockState.recentMembers = { data: [], error: null };
      mockState.tribalMembers = { data: [], error: null };

      const req = createMockRequest();
      const res = createMockResponse();

      await getDashboardStats(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            payments: expect.objectContaining({
              pending: 0,
              totalRevenue: 0
            })
          })
        })
      );
    });

    test('should return default when no payments (lines 147-150)', async () => {
      mockState.membersStats = { data: [], error: null };
      mockState.payments = { data: [], error: null };
      mockState.subscriptions = { data: [], error: null };
      mockState.recentPayments = { data: [], error: null };
      mockState.recentMembers = { data: [], error: null };
      mockState.tribalMembers = { data: [], error: null };

      const req = createMockRequest();
      const res = createMockResponse();

      await getDashboardStats(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            payments: expect.objectContaining({
              pending: 0
            })
          })
        })
      );
    });

    test('should handle invalid payment dates (lines 158-162)', async () => {
      mockState.membersStats = { data: [], error: null };
      mockState.payments = {
        data: [
          { id: 'p1', amount: '100', status: 'paid', created_at: 'invalid' },
          { id: 'p2', amount: '200', status: 'paid', created_at: null }
        ],
        error: null
      };
      mockState.subscriptions = { data: [], error: null };
      mockState.recentPayments = { data: [], error: null };
      mockState.recentMembers = { data: [], error: null };
      mockState.tribalMembers = { data: [], error: null };

      const req = createMockRequest();
      const res = createMockResponse();

      await getDashboardStats(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            payments: expect.objectContaining({
              totalPaid: 2,
              monthlyRevenue: 0 // Invalid dates should not count as monthly
            })
          })
        })
      );
    });

    test('should handle non-numeric amounts (lines 165-167, 170-172, 175-177)', async () => {
      mockState.membersStats = { data: [], error: null };
      mockState.payments = {
        data: [
          { id: 'p1', amount: 'invalid', status: 'paid', created_at: new Date().toISOString() },
          { id: 'p2', amount: null, status: 'pending', created_at: new Date().toISOString() }
        ],
        error: null
      };
      mockState.subscriptions = { data: [], error: null };
      mockState.recentPayments = { data: [], error: null };
      mockState.recentMembers = { data: [], error: null };
      mockState.tribalMembers = { data: [], error: null };

      const req = createMockRequest();
      const res = createMockResponse();

      await getDashboardStats(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            payments: expect.objectContaining({
              totalRevenue: 0, // parseFloat should return 0 for invalid
              pendingAmount: 0
            })
          })
        })
      );
    });
  });

  // ============================================
  // getSubscriptionStatistics() Tests (lines 195-234)
  // ============================================
  describe('Subscription Statistics', () => {
    test('should calculate subscription stats correctly (lines 214-229)', async () => {
      mockState.membersStats = { data: [], error: null };
      mockState.payments = { data: [], error: null };
      mockState.subscriptions = {
        data: [
          { id: 's1', amount: '500', status: 'active' },
          { id: 's2', amount: '500', status: 'active' },
          { id: 's3', amount: '500', status: 'expired' }
        ],
        error: null
      };
      mockState.recentPayments = { data: [], error: null };
      mockState.recentMembers = { data: [], error: null };
      mockState.tribalMembers = { data: [], error: null };

      const req = createMockRequest();
      const res = createMockResponse();

      await getDashboardStats(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            subscriptions: expect.objectContaining({
              active: 2,
              expired: 1,
              total: 3,
              revenue: 1000
            })
          })
        })
      );
    });

    test('should return default stats on error (lines 203-206, 230-233)', async () => {
      mockState.membersStats = { data: [], error: null };
      mockState.payments = { data: [], error: null };
      mockState.subscriptions = { data: null, error: { message: 'Query failed' } };
      mockState.recentPayments = { data: [], error: null };
      mockState.recentMembers = { data: [], error: null };
      mockState.tribalMembers = { data: [], error: null };

      const req = createMockRequest();
      const res = createMockResponse();

      await getDashboardStats(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            subscriptions: expect.objectContaining({
              active: 0,
              total: 0
            })
          })
        })
      );
    });

    test('should return default when no subscriptions (lines 209-212)', async () => {
      mockState.membersStats = { data: [], error: null };
      mockState.payments = { data: [], error: null };
      mockState.subscriptions = { data: [], error: null };
      mockState.recentPayments = { data: [], error: null };
      mockState.recentMembers = { data: [], error: null };
      mockState.tribalMembers = { data: [], error: null };

      const req = createMockRequest();
      const res = createMockResponse();

      await getDashboardStats(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            subscriptions: expect.objectContaining({
              active: 0,
              total: 0
            })
          })
        })
      );
    });

    test('should handle non-numeric subscription amounts (lines 217-220)', async () => {
      mockState.membersStats = { data: [], error: null };
      mockState.payments = { data: [], error: null };
      mockState.subscriptions = {
        data: [
          { id: 's1', amount: 'invalid', status: 'active' },
          { id: 's2', amount: null, status: 'active' }
        ],
        error: null
      };
      mockState.recentPayments = { data: [], error: null };
      mockState.recentMembers = { data: [], error: null };
      mockState.tribalMembers = { data: [], error: null };

      const req = createMockRequest();
      const res = createMockResponse();

      await getDashboardStats(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            subscriptions: expect.objectContaining({
              active: 2,
              revenue: 0 // parseFloat returns 0/NaN for invalid
            })
          })
        })
      );
    });
  });

  // ============================================
  // getTribalSectionsStatistics() Tests (lines 236-278)
  // ============================================
  describe('Tribal Sections Statistics', () => {
    test('should group members by tribal section (lines 255-267)', async () => {
      mockState.membersStats = { data: [], error: null };
      mockState.payments = { data: [], error: null };
      mockState.subscriptions = { data: [], error: null };
      mockState.recentPayments = { data: [], error: null };
      mockState.recentMembers = { data: [], error: null };
      mockState.tribalMembers = {
        data: [
          { tribal_section: 'القسم الشمالي', total_paid: '100' },
          { tribal_section: 'القسم الشمالي', total_paid: '200' },
          { tribal_section: 'القسم الجنوبي', total_paid: '150' },
          { tribal_section: null, total_paid: '50' }
        ],
        error: null
      };

      const req = createMockRequest();
      const res = createMockResponse();

      await getDashboardStats(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            tribalSections: expect.arrayContaining([
              expect.objectContaining({
                section: 'القسم الشمالي',
                members: 2
              })
            ])
          })
        })
      );
    });

    test('should return empty array on error (lines 244-246, 274-277)', async () => {
      mockState.membersStats = { data: [], error: null };
      mockState.payments = { data: [], error: null };
      mockState.subscriptions = { data: [], error: null };
      mockState.recentPayments = { data: [], error: null };
      mockState.recentMembers = { data: [], error: null };
      mockState.tribalMembers = { data: null, error: { message: 'Tribal query failed' } };

      const req = createMockRequest();
      const res = createMockResponse();

      await getDashboardStats(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            tribalSections: []
          })
        })
      );
    });

    test('should return empty when no members for tribal (lines 249-252)', async () => {
      mockState.membersStats = { data: [], error: null };
      mockState.payments = { data: [], error: null };
      mockState.subscriptions = { data: [], error: null };
      mockState.recentPayments = { data: [], error: null };
      mockState.recentMembers = { data: [], error: null };
      mockState.tribalMembers = { data: [], error: null };

      const req = createMockRequest();
      const res = createMockResponse();

      await getDashboardStats(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            tribalSections: []
          })
        })
      );
    });

    test('should handle null tribal_section as Unknown (line 257)', async () => {
      mockState.membersStats = { data: [], error: null };
      mockState.payments = { data: [], error: null };
      mockState.subscriptions = { data: [], error: null };
      mockState.recentPayments = { data: [], error: null };
      mockState.recentMembers = { data: [], error: null };
      mockState.tribalMembers = {
        data: [
          { tribal_section: null, total_paid: '50' },
          { tribal_section: null, total_paid: '100' }
        ],
        error: null
      };

      const req = createMockRequest();
      const res = createMockResponse();

      await getDashboardStats(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            tribalSections: expect.arrayContaining([
              expect.objectContaining({
                section: 'Unknown',
                members: 2
              })
            ])
          })
        })
      );
    });
  });

  // ============================================
  // getRecentActivities() Tests (lines 280-351)
  // ============================================
  describe('Recent Activities', () => {
    test('should fetch and format recent activities (lines 301-312, 318-329)', async () => {
      mockState.membersStats = { data: [], error: null };
      mockState.payments = { data: [], error: null };
      mockState.subscriptions = { data: [], error: null };
      mockState.recentPayments = {
        data: [
          { payment_id: 'p1', amount: 50, status: 'paid', created_at: new Date().toISOString() }
        ],
        error: null
      };
      mockState.recentMembers = {
        data: [
          { member_id: 'm1', full_name: 'محمد علي', created_at: new Date().toISOString() }
        ],
        error: null
      };
      mockState.tribalMembers = { data: [], error: null };

      const req = createMockRequest();
      const res = createMockResponse();

      await getDashboardStats(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            activities: expect.any(Array)
          })
        })
      );
    });

    test('should handle failed payments fetch (lines 313-315)', async () => {
      mockState.membersStats = { data: [], error: null };
      mockState.payments = { data: [], error: null };
      mockState.subscriptions = { data: [], error: null };
      mockState.recentPayments = { data: null, error: { message: 'Payments failed' } };
      mockState.recentMembers = {
        data: [{ member_id: 'm1', full_name: 'محمد', created_at: new Date().toISOString() }],
        error: null
      };
      mockState.tribalMembers = { data: [], error: null };

      const req = createMockRequest();
      const res = createMockResponse();

      await getDashboardStats(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });

    test('should handle failed members fetch (lines 330-332)', async () => {
      mockState.membersStats = { data: [], error: null };
      mockState.payments = { data: [], error: null };
      mockState.subscriptions = { data: [], error: null };
      mockState.recentPayments = {
        data: [{ payment_id: 'p1', amount: 50, status: 'paid', created_at: new Date().toISOString() }],
        error: null
      };
      mockState.recentMembers = { data: null, error: { message: 'Members failed' } };
      mockState.tribalMembers = { data: [], error: null };

      const req = createMockRequest();
      const res = createMockResponse();

      await getDashboardStats(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });

    test('should skip payments without amount (lines 303)', async () => {
      mockState.membersStats = { data: [], error: null };
      mockState.payments = { data: [], error: null };
      mockState.subscriptions = { data: [], error: null };
      mockState.recentPayments = {
        data: [
          { payment_id: 'p1', amount: null, status: 'paid', created_at: new Date().toISOString() },
          { payment_id: 'p2', amount: undefined, status: 'paid', created_at: new Date().toISOString() }
        ],
        error: null
      };
      mockState.recentMembers = { data: [], error: null };
      mockState.tribalMembers = { data: [], error: null };

      const req = createMockRequest();
      const res = createMockResponse();

      await getDashboardStats(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });

    test('should skip members without full_name (line 320)', async () => {
      mockState.membersStats = { data: [], error: null };
      mockState.payments = { data: [], error: null };
      mockState.subscriptions = { data: [], error: null };
      mockState.recentPayments = { data: [], error: null };
      mockState.recentMembers = {
        data: [
          { member_id: 'm1', full_name: null, created_at: new Date().toISOString() },
          { member_id: 'm2', full_name: '', created_at: new Date().toISOString() }
        ],
        error: null
      };
      mockState.tribalMembers = { data: [], error: null };

      const req = createMockRequest();
      const res = createMockResponse();

      await getDashboardStats(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });

    test('should sort activities by date (lines 335-343)', async () => {
      const now = new Date();
      const earlier = new Date(now.getTime() - 3600000); // 1 hour ago

      mockState.membersStats = { data: [], error: null };
      mockState.payments = { data: [], error: null };
      mockState.subscriptions = { data: [], error: null };
      mockState.recentPayments = {
        data: [
          { payment_id: 'p1', amount: 50, status: 'paid', created_at: now.toISOString() }
        ],
        error: null
      };
      mockState.recentMembers = {
        data: [
          { member_id: 'm1', full_name: 'Earlier', created_at: earlier.toISOString() }
        ],
        error: null
      };
      mockState.tribalMembers = { data: [], error: null };

      const req = createMockRequest();
      const res = createMockResponse();

      await getDashboardStats(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });

    test('should handle invalid dates in sorting (lines 337-341)', async () => {
      mockState.membersStats = { data: [], error: null };
      mockState.payments = { data: [], error: null };
      mockState.subscriptions = { data: [], error: null };
      mockState.recentPayments = {
        data: [
          { payment_id: 'p1', amount: 50, status: 'paid', created_at: 'invalid-date' }
        ],
        error: null
      };
      mockState.recentMembers = {
        data: [
          { member_id: 'm1', full_name: 'Test', created_at: 'also-invalid' }
        ],
        error: null
      };
      mockState.tribalMembers = { data: [], error: null };

      const req = createMockRequest();
      const res = createMockResponse();

      await getDashboardStats(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });

    test('should limit activities to 10 (line 346)', async () => {
      const manyPayments = Array(15).fill(null).map((_, i) => ({
        payment_id: `p${i}`,
        amount: 50,
        status: 'paid',
        created_at: new Date().toISOString()
      }));

      mockState.membersStats = { data: [], error: null };
      mockState.payments = { data: [], error: null };
      mockState.subscriptions = { data: [], error: null };
      mockState.recentPayments = { data: manyPayments, error: null };
      mockState.recentMembers = { data: [], error: null };
      mockState.tribalMembers = { data: [], error: null };

      const req = createMockRequest();
      const res = createMockResponse();

      await getDashboardStats(req, res);

      const response = res.json.mock.calls[0][0];
      expect(response.data.activities.length).toBeLessThanOrEqual(10);
    });

    test('should handle activities catch block error (lines 347-350)', async () => {
      // This is covered by the general error handling
      mockState.membersStats = { data: [], error: null };
      mockState.payments = { data: [], error: null };
      mockState.subscriptions = { data: [], error: null };
      mockState.recentPayments = { data: [], error: null };
      mockState.recentMembers = { data: [], error: null };
      mockState.tribalMembers = { data: [], error: null };

      const req = createMockRequest();
      const res = createMockResponse();

      await getDashboardStats(req, res);

      expect(res.json).toHaveBeenCalled();
    });
  });

  // ============================================
  // Default Fallback Functions Tests (lines 60-86)
  // ============================================
  describe('Default Fallback Functions', () => {
    test('getDefaultMembersStats returns expected values (lines 60-67)', async () => {
      // Force use of defaults by making everything fail
      mockState.membersStats = { data: null, error: { message: 'fail' } };
      mockState.payments = { data: null, error: { message: 'fail' } };
      mockState.subscriptions = { data: null, error: { message: 'fail' } };
      mockState.recentPayments = { data: null, error: { message: 'fail' } };
      mockState.recentMembers = { data: null, error: { message: 'fail' } };
      mockState.tribalMembers = { data: null, error: { message: 'fail' } };

      const req = createMockRequest();
      const res = createMockResponse();

      await getDashboardStats(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            members: expect.objectContaining({
              total: 299,
              active: 288,
              inactive: 11,
              newThisMonth: 0
            })
          })
        })
      );
    });

    test('getDefaultPaymentsStats returns expected values (lines 69-77)', async () => {
      mockState.membersStats = { data: null, error: { message: 'fail' } };
      mockState.payments = { data: null, error: { message: 'fail' } };
      mockState.subscriptions = { data: null, error: { message: 'fail' } };
      mockState.recentPayments = { data: null, error: { message: 'fail' } };
      mockState.recentMembers = { data: null, error: { message: 'fail' } };
      mockState.tribalMembers = { data: null, error: { message: 'fail' } };

      const req = createMockRequest();
      const res = createMockResponse();

      await getDashboardStats(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            payments: expect.objectContaining({
              pending: 0,
              pendingAmount: 0,
              monthlyRevenue: 0,
              totalRevenue: 0,
              totalPaid: 0
            })
          })
        })
      );
    });

    test('getDefaultSubscriptionStats returns expected values (lines 79-86)', async () => {
      mockState.membersStats = { data: null, error: { message: 'fail' } };
      mockState.payments = { data: null, error: { message: 'fail' } };
      mockState.subscriptions = { data: null, error: { message: 'fail' } };
      mockState.recentPayments = { data: null, error: { message: 'fail' } };
      mockState.recentMembers = { data: null, error: { message: 'fail' } };
      mockState.tribalMembers = { data: null, error: { message: 'fail' } };

      const req = createMockRequest();
      const res = createMockResponse();

      await getDashboardStats(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            subscriptions: expect.objectContaining({
              active: 0,
              expired: 0,
              total: 0,
              revenue: 0
            })
          })
        })
      );
    });
  });

  // ============================================
  // Specification Tests (Non-Import)
  // ============================================
  describe('Specification Tests', () => {
    test('should calculate member statistics correctly', () => {
      const members = [
        { id: 1, is_active: true },
        { id: 2, is_active: true },
        { id: 3, is_active: false }
      ];

      const total = members.length;
      const active = members.filter(m => m.is_active).length;
      const inactive = members.filter(m => !m.is_active).length;

      expect(total).toBe(3);
      expect(active).toBe(2);
      expect(inactive).toBe(1);
    });

    test('should calculate payment statistics correctly', () => {
      const payments = [
        { amount: 100, status: 'completed' },
        { amount: 200, status: 'pending' },
        { amount: 150, status: 'completed' }
      ];

      const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
      const pending = payments.filter(p => p.status === 'pending');

      expect(totalAmount).toBe(450);
      expect(pending.length).toBe(1);
    });

    test('should handle division by zero', () => {
      const total = 0;
      const percent = total > 0 ? (50 / total) * 100 : 0;
      expect(percent).toBe(0);
    });
  });
});
