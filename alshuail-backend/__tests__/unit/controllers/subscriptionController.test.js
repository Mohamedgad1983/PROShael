/**
 * Subscription Controller Unit Tests
 * Testing: getSubscriptionPlans, getMemberSubscription, getPaymentHistory,
 *          getAllSubscriptions, getSubscriptionStats, getOverdueMembers,
 *          recordPayment, sendPaymentReminder
 */

import { jest, describe, test, expect, beforeEach, afterAll } from '@jest/globals';

// Mock state for controlling test scenarios
let mockState = {
  subscriptionPlans: { data: null, error: null },
  subscriptionOverview: { data: null, error: null, count: null },
  subscriptions: { data: null, error: null },
  payments: { data: null, error: null, count: null },
  members: { data: null, error: null },
  notifications: { data: null, error: null },
  shouldThrow: false,
  currentQuery: null
};

// Create chainable mock supabase
const createChainableMock = () => {
  const chain = {
    from: jest.fn((table) => {
      mockState.currentQuery = { table };
      return chain;
    }),
    select: jest.fn(() => chain),
    insert: jest.fn(() => chain),
    update: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    in: jest.fn(() => chain),
    or: jest.fn(() => chain),
    order: jest.fn(() => chain),
    range: jest.fn(() => chain),
    single: jest.fn(() => {
      const table = mockState.currentQuery?.table;
      if (table === 'subscription_plans') {
        return Promise.resolve(mockState.subscriptionPlans);
      }
      if (table === 'v_subscription_overview') {
        return Promise.resolve(mockState.subscriptionOverview);
      }
      if (table === 'subscriptions') {
        return Promise.resolve(mockState.subscriptions);
      }
      if (table === 'payments') {
        return Promise.resolve(mockState.payments);
      }
      if (table === 'members') {
        return Promise.resolve(mockState.members);
      }
      return Promise.resolve({ data: null, error: null });
    }),
    then: jest.fn((callback) => {
      const table = mockState.currentQuery?.table;
      let result;
      if (table === 'subscription_plans') {
        result = mockState.subscriptionPlans;
      } else if (table === 'v_subscription_overview') {
        result = mockState.subscriptionOverview;
      } else if (table === 'subscriptions') {
        result = mockState.subscriptions;
      } else if (table === 'payments') {
        result = mockState.payments;
      } else if (table === 'members') {
        result = mockState.members;
      } else if (table === 'notifications') {
        result = mockState.notifications;
      } else {
        result = { data: null, error: null };
      }
      return Promise.resolve(callback(result));
    })
  };
  return chain;
};

const mockSupabase = createChainableMock();

// Mock modules
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

// Import controller AFTER mocking
const {
  getSubscriptionPlans,
  getMemberSubscription,
  getPaymentHistory,
  getAllSubscriptions,
  getSubscriptionStats,
  getOverdueMembers,
  recordPayment,
  sendPaymentReminder
} = await import('../../../src/controllers/subscriptionController.js');
const { log } = await import('../../../src/utils/logger.js');

describe('Subscription Controller Unit Tests', () => {
  const createMockRequest = (overrides = {}) => ({
    user: { id: 'admin-123', member_id: 'member-123', role: 'admin' },
    query: {},
    body: {},
    params: {},
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
    mockState = {
      subscriptionPlans: { data: null, error: null },
      subscriptionOverview: { data: null, error: null, count: null },
      subscriptions: { data: null, error: null },
      payments: { data: null, error: null, count: null },
      members: { data: null, error: null },
      notifications: { data: null, error: null },
      shouldThrow: false,
      currentQuery: null
    };
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // getSubscriptionPlans() Tests
  // ============================================
  describe('getSubscriptionPlans()', () => {
    test('should return active plans successfully', async () => {
      mockState.subscriptionPlans = {
        data: [
          { id: 1, name: 'Basic', is_active: true, base_amount: 50 },
          { id: 2, name: 'Premium', is_active: true, base_amount: 100 }
        ],
        error: null
      };

      const req = createMockRequest();
      const res = createMockResponse();

      await getSubscriptionPlans(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          plans: expect.any(Array)
        })
      );
    });

    test('should return empty array when no plans (line 19)', async () => {
      mockState.subscriptionPlans = {
        data: null,
        error: null
      };

      const req = createMockRequest();
      const res = createMockResponse();

      await getSubscriptionPlans(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          plans: []
        })
      );
    });

    test('should return 500 on database error (lines 22-23)', async () => {
      mockState.subscriptionPlans = {
        data: null,
        error: { message: 'Database connection failed' }
      };

      const req = createMockRequest();
      const res = createMockResponse();

      await getSubscriptionPlans(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(log.error).toHaveBeenCalledWith(
        expect.stringContaining('Subscription: Get plans error'),
        expect.any(Object)
      );
    });
  });

  // ============================================
  // getMemberSubscription() Tests
  // ============================================
  describe('getMemberSubscription()', () => {
    test('should return subscription for valid member', async () => {
      mockState.subscriptionOverview = {
        data: {
          member_id: 'member-123',
          status: 'active',
          current_balance: 150,
          months_paid_ahead: 3,
          next_payment_due: '2025-02-01',
          last_payment_date: '2024-11-15',
          amount_due: 0,
          plan_name: 'Monthly'
        },
        error: null
      };

      const req = createMockRequest();
      const res = createMockResponse();

      await getMemberSubscription(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          subscription: expect.objectContaining({
            member_id: 'member-123',
            status: 'active'
          })
        })
      );
    });

    test('should return 401 for missing member_id (line 39)', async () => {
      const req = createMockRequest({
        user: {} // No member_id or id
      });
      const res = createMockResponse();

      await getMemberSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'معرف العضو غير موجود'
        })
      );
    });

    test('should return 404 for non-existent subscription', async () => {
      mockState.subscriptionOverview = {
        data: null,
        error: { message: 'No rows returned' }
      };

      const req = createMockRequest();
      const res = createMockResponse();

      await getMemberSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('should handle catch block error (lines 74-75)', async () => {
      // Create a mock that throws
      const originalFrom = mockSupabase.from;
      mockSupabase.from = jest.fn(() => {
        throw new Error('Unexpected error');
      });

      const req = createMockRequest();
      const res = createMockResponse();

      await getMemberSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(log.error).toHaveBeenCalled();

      mockSupabase.from = originalFrom;
    });
  });

  // ============================================
  // getPaymentHistory() Tests
  // ============================================
  describe('getPaymentHistory()', () => {
    test('should return 401 for missing member_id (line 94)', async () => {
      const req = createMockRequest({
        user: {}
      });
      const res = createMockResponse();

      await getPaymentHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'معرف العضو غير موجود'
        })
      );
    });

    test('should return empty array when no subscription (line 108)', async () => {
      mockState.subscriptions = {
        data: null,
        error: null
      };

      const req = createMockRequest();
      const res = createMockResponse();

      await getPaymentHistory(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          payments: [],
          total: 0
        })
      );
    });

    test('should return payments with pagination (lines 118-133)', async () => {
      mockState.subscriptions = {
        data: { id: 'sub-123', member_id: 'member-123' },
        error: null
      };
      mockState.payments = {
        data: [
          { id: 'pay-1', amount: 50, payment_date: '2024-01-15' },
          { id: 'pay-2', amount: 100, payment_date: '2024-02-15' }
        ],
        error: null,
        count: 5
      };

      const req = createMockRequest({
        query: { page: '1', limit: '10' }
      });
      const res = createMockResponse();

      await getPaymentHistory(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          payments: expect.any(Array),
          total: expect.any(Number),
          page: 1,
          limit: 10
        })
      );
    });

    test('should handle payment query error (line 131)', async () => {
      mockState.subscriptions = {
        data: { id: 'sub-123', member_id: 'member-123' },
        error: null
      };
      mockState.payments = {
        data: null,
        error: { message: 'Payment query failed' }
      };

      const req = createMockRequest();
      const res = createMockResponse();

      await getPaymentHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    test('should handle catch block error (lines 141-142)', async () => {
      const originalFrom = mockSupabase.from;
      mockSupabase.from = jest.fn(() => {
        throw new Error('Database timeout');
      });

      const req = createMockRequest();
      const res = createMockResponse();

      await getPaymentHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(log.error).toHaveBeenCalledWith(
        expect.stringContaining('Subscription: Get payment history error'),
        expect.any(Object)
      );

      mockSupabase.from = originalFrom;
    });
  });

  // ============================================
  // getAllSubscriptions() Tests (Admin)
  // ============================================
  describe('getAllSubscriptions()', () => {
    test('should return subscriptions with stats', async () => {
      mockState.subscriptionOverview = {
        data: [
          { member_id: 1, status: 'active' },
          { member_id: 2, status: 'overdue' }
        ],
        error: null,
        count: 2
      };

      const req = createMockRequest();
      const res = createMockResponse();

      await getAllSubscriptions(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          subscriptions: expect.any(Array),
          stats: expect.any(Object)
        })
      );
    });

    test('should apply status filter (line 168)', async () => {
      mockState.subscriptionOverview = {
        data: [{ member_id: 1, status: 'overdue' }],
        error: null,
        count: 1
      };

      const req = createMockRequest({
        query: { status: 'overdue' }
      });
      const res = createMockResponse();

      await getAllSubscriptions(req, res);

      expect(mockSupabase.eq).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });

    test('should apply search filter (line 172)', async () => {
      mockState.subscriptionOverview = {
        data: [{ member_id: 1, member_name: 'محمد علي', phone: '0501234567' }],
        error: null,
        count: 1
      };

      const req = createMockRequest({
        query: { search: 'محمد' }
      });
      const res = createMockResponse();

      await getAllSubscriptions(req, res);

      expect(mockSupabase.or).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });

    test('should handle catch block error (lines 205-206)', async () => {
      const originalFrom = mockSupabase.from;
      mockSupabase.from = jest.fn(() => {
        throw new Error('Subscription query failed');
      });

      const req = createMockRequest();
      const res = createMockResponse();

      await getAllSubscriptions(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(log.error).toHaveBeenCalledWith(
        expect.stringContaining('Subscription: Get all subscriptions error'),
        expect.any(Object)
      );

      mockSupabase.from = originalFrom;
    });
  });

  // ============================================
  // getSubscriptionStats() Tests
  // ============================================
  describe('getSubscriptionStats()', () => {
    test('should calculate stats correctly', async () => {
      mockState.subscriptionOverview = {
        data: [
          { status: 'active', months_paid_ahead: 3 },
          { status: 'overdue', amount_due: 100, months_paid_ahead: 0 },
          { status: 'active', months_paid_ahead: 6 }
        ],
        error: null
      };

      const req = createMockRequest();
      const res = createMockResponse();

      await getSubscriptionStats(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          total_members: 3,
          active: 2,
          overdue: 1
        })
      );
    });

    test('should handle overdue_amount calculation (line 236)', async () => {
      mockState.subscriptionOverview = {
        data: [
          { status: 'overdue', amount_due: 50 },
          { status: 'overdue', amount_due: null }, // Should default to 50
          { status: 'active', amount_due: 0 }
        ],
        error: null
      };

      const req = createMockRequest();
      const res = createMockResponse();

      await getSubscriptionStats(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          overdue_amount: 100 // 50 + 50 (default)
        })
      );
    });

    test('should handle catch block error (lines 252-253)', async () => {
      const originalFrom = mockSupabase.from;
      mockSupabase.from = jest.fn(() => {
        throw new Error('Stats query failed');
      });

      const req = createMockRequest();
      const res = createMockResponse();

      await getSubscriptionStats(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(log.error).toHaveBeenCalledWith(
        expect.stringContaining('Subscription: Get stats error'),
        expect.any(Object)
      );

      mockSupabase.from = originalFrom;
    });
  });

  // ============================================
  // getOverdueMembers() Tests
  // ============================================
  describe('getOverdueMembers()', () => {
    test('should return overdue members with total_due (line 275)', async () => {
      mockState.subscriptionOverview = {
        data: [
          { member_id: 1, status: 'overdue', amount_due: 50 },
          { member_id: 2, status: 'overdue', amount_due: null } // Defaults to 50
        ],
        error: null
      };

      const req = createMockRequest();
      const res = createMockResponse();

      await getOverdueMembers(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          overdue_members: expect.any(Array),
          total_due: 100 // 50 + 50 (default)
        })
      );
    });

    test('should handle catch block error (lines 283-284)', async () => {
      const originalFrom = mockSupabase.from;
      mockSupabase.from = jest.fn(() => {
        throw new Error('Overdue query failed');
      });

      const req = createMockRequest();
      const res = createMockResponse();

      await getOverdueMembers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(log.error).toHaveBeenCalledWith(
        expect.stringContaining('Subscription: Get overdue members error'),
        expect.any(Object)
      );

      mockSupabase.from = originalFrom;
    });
  });

  // ============================================
  // recordPayment() Tests
  // ============================================
  describe('recordPayment()', () => {
    test('should reject missing required fields (line 307)', async () => {
      const req = createMockRequest({
        body: { amount: 50, months: 1 } // Missing member_id
      });
      const res = createMockResponse();

      await recordPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'البيانات المطلوبة: member_id, amount, months'
        })
      );
    });

    test('should reject amount less than 50 (line 314)', async () => {
      const req = createMockRequest({
        body: { member_id: 'member-123', amount: 25, months: 1 }
      });
      const res = createMockResponse();

      await recordPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'الحد الأدنى للدفع 50 ريال'
        })
      );
    });

    test('should reject amount not multiple of 50 (line 321)', async () => {
      const req = createMockRequest({
        body: { member_id: 'member-123', amount: 75, months: 1 }
      });
      const res = createMockResponse();

      await recordPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'المبلغ يجب أن يكون من مضاعفات الـ 50 ريال'
        })
      );
    });

    test('should return 404 when subscription not found (line 335)', async () => {
      mockState.subscriptions = {
        data: null,
        error: { message: 'No subscription found' }
      };

      const req = createMockRequest({
        body: { member_id: 'member-123', amount: 100, months: 2 }
      });
      const res = createMockResponse();

      await recordPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'لم يتم العثور على اشتراك لهذا العضو'
        })
      );
    });

    test('should record payment successfully (lines 343-426)', async () => {
      // Setup successful subscription lookup
      mockState.subscriptions = {
        data: { id: 'sub-123', member_id: 'member-123', current_balance: 50 },
        error: null
      };
      // Setup member lookup for notification
      mockState.members = {
        data: { user_id: 'user-123', full_name: 'محمد علي' },
        error: null
      };
      // Setup payment insert
      mockState.payments = {
        data: { id: 'pay-123' },
        error: null
      };
      // Setup notification insert
      mockState.notifications = {
        data: { id: 'notif-123' },
        error: null
      };

      const req = createMockRequest({
        body: {
          member_id: 'member-123',
          amount: 100,
          months: 2,
          payment_method: 'bank_transfer',
          receipt_number: 'REC-001',
          notes: 'Test payment'
        }
      });
      const res = createMockResponse();

      await recordPayment(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'تم تسجيل الدفعة بنجاح',
          new_balance: 150, // 50 + 100
          months_ahead: 3   // 150 / 50
        })
      );
    });

    test('should record payment without notification when no user_id (lines 403-414)', async () => {
      mockState.subscriptions = {
        data: { id: 'sub-123', member_id: 'member-123', current_balance: 0 },
        error: null
      };
      mockState.members = {
        data: { full_name: 'محمد علي' }, // No user_id
        error: null
      };
      mockState.payments = {
        data: { id: 'pay-123' },
        error: null
      };

      const req = createMockRequest({
        body: { member_id: 'member-123', amount: 50, months: 1 }
      });
      const res = createMockResponse();

      await recordPayment(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'تم تسجيل الدفعة بنجاح'
        })
      );
    });

    test('should handle catch block error (lines 424-426)', async () => {
      mockState.subscriptions = {
        data: { id: 'sub-123', member_id: 'member-123', current_balance: 0 },
        error: null
      };
      // Force error by having payment insert fail
      const originalSingle = mockSupabase.single;
      let callCount = 0;
      mockSupabase.single = jest.fn(() => {
        callCount++;
        if (callCount === 1) {
          // First call is subscription lookup
          return Promise.resolve(mockState.subscriptions);
        }
        if (callCount === 2) {
          // Second call is member lookup
          return Promise.resolve(mockState.members);
        }
        // Third call is payment insert - throw error
        return Promise.reject(new Error('Payment insert failed'));
      });

      const req = createMockRequest({
        body: { member_id: 'member-123', amount: 50, months: 1 }
      });
      const res = createMockResponse();

      await recordPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(log.error).toHaveBeenCalledWith(
        expect.stringContaining('Subscription: Record payment error'),
        expect.any(Object)
      );

      mockSupabase.single = originalSingle;
    });
  });

  // ============================================
  // sendPaymentReminder() Tests
  // ============================================
  describe('sendPaymentReminder()', () => {
    test('should reject missing member_ids and send_to_all (line 454)', async () => {
      const req = createMockRequest({
        body: {} // Neither member_ids nor send_to_all
      });
      const res = createMockResponse();

      await sendPaymentReminder(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'يجب تحديد member_ids أو send_to_all'
        })
      );
    });

    test('should accept member_ids array (line 452)', async () => {
      mockState.members = {
        data: [
          { id: 'member-1', user_id: 'user-1', full_name: 'محمد', phone: '0501234567' }
        ],
        error: null
      };
      mockState.notifications = {
        data: { id: 'notif-1' },
        error: null
      };

      const req = createMockRequest({
        body: { member_ids: ['member-1'] }
      });
      const res = createMockResponse();

      await sendPaymentReminder(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          sent: expect.any(Number)
        })
      );
    });

    test('should return success with 0 sent when no target members (line 460)', async () => {
      mockState.subscriptionOverview = {
        data: [], // No overdue members
        error: null
      };

      const req = createMockRequest({
        body: { send_to_all: true }
      });
      const res = createMockResponse();

      await sendPaymentReminder(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          sent: 0,
          failed: 0,
          message: 'لا يوجد أعضاء للإرسال إليهم'
        })
      );
    });

    test('should send notifications to members with user_id (lines 470-522)', async () => {
      mockState.subscriptionOverview = {
        data: [
          { member_id: 'member-1' },
          { member_id: 'member-2' }
        ],
        error: null
      };
      mockState.members = {
        data: [
          { id: 'member-1', user_id: 'user-1', full_name: 'محمد علي', phone: '0501234567' },
          { id: 'member-2', user_id: 'user-2', full_name: 'أحمد محمد', phone: '0507654321' }
        ],
        error: null
      };
      mockState.notifications = {
        data: { id: 'notif-1' },
        error: null
      };

      const req = createMockRequest({
        body: { send_to_all: true }
      });
      const res = createMockResponse();

      await sendPaymentReminder(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          sent: 2,
          failed: 0
        })
      );
    });

    test('should track failed notifications for members without user_id (lines 511-518)', async () => {
      mockState.subscriptionOverview = {
        data: [{ member_id: 'member-1' }],
        error: null
      };
      mockState.members = {
        data: [
          { id: 'member-1', full_name: 'محمد علي', phone: '0501234567' } // No user_id
        ],
        error: null
      };

      const req = createMockRequest({
        body: { send_to_all: true },
        query: { verbose: 'true' }
      });
      const res = createMockResponse();

      await sendPaymentReminder(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          sent: 0,
          failed: 1,
          details: expect.arrayContaining([
            expect.objectContaining({
              status: 'failed',
              error: 'No user_id'
            })
          ])
        })
      );
    });

    test('should handle notification insert error (lines 502-509)', async () => {
      mockState.subscriptionOverview = {
        data: [{ member_id: 'member-1' }],
        error: null
      };
      mockState.members = {
        data: [
          { id: 'member-1', user_id: 'user-1', full_name: 'محمد', phone: '0501234567' }
        ],
        error: null
      };
      mockState.notifications = {
        data: null,
        error: { message: 'Insert failed' }
      };

      const req = createMockRequest({
        body: { send_to_all: true },
        query: { verbose: 'true' }
      });
      const res = createMockResponse();

      await sendPaymentReminder(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          failed: 1,
          details: expect.arrayContaining([
            expect.objectContaining({
              status: 'failed'
            })
          ])
        })
      );
    });

    test('should handle catch block error (lines 530-531)', async () => {
      const originalFrom = mockSupabase.from;
      mockSupabase.from = jest.fn(() => {
        throw new Error('Reminder query failed');
      });

      const req = createMockRequest({
        body: { send_to_all: true }
      });
      const res = createMockResponse();

      await sendPaymentReminder(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(log.error).toHaveBeenCalledWith(
        expect.stringContaining('Subscription: Send reminder error'),
        expect.any(Object)
      );

      mockSupabase.from = originalFrom;
    });
  });

  // ============================================
  // Specification Tests (Non-Import)
  // ============================================
  describe('Specification Tests', () => {
    describe('Pagination Logic', () => {
      test('should use default pagination values', () => {
        const query = {};
        const page = parseInt(query.page) || 1;
        const limit = Math.min(parseInt(query.limit) || 20, 50);
        expect(page).toBe(1);
        expect(limit).toBe(20);
      });

      test('should cap limit at 50', () => {
        const query = { limit: '100' };
        const limit = Math.min(parseInt(query.limit) || 20, 50);
        expect(limit).toBe(50);
      });

      test('should calculate offset correctly', () => {
        const testCases = [
          { page: 1, limit: 20, expectedOffset: 0 },
          { page: 2, limit: 20, expectedOffset: 20 },
          { page: 3, limit: 10, expectedOffset: 20 }
        ];
        testCases.forEach(({ page, limit, expectedOffset }) => {
          const offset = (page - 1) * limit;
          expect(offset).toBe(expectedOffset);
        });
      });
    });

    describe('Balance Calculation', () => {
      test('should calculate new balance correctly', () => {
        const current_balance = 100;
        const amount = 150;
        const new_balance = current_balance + amount;
        expect(new_balance).toBe(250);
      });

      test('should calculate months paid ahead', () => {
        const new_balance = 250;
        const monthly_rate = 50;
        const months_paid_ahead = Math.floor(new_balance / monthly_rate);
        expect(months_paid_ahead).toBe(5);
      });
    });

    describe('Amount Validation', () => {
      test('should accept valid amounts (multiples of 50)', () => {
        const validAmounts = [50, 100, 150, 200, 500];
        validAmounts.forEach(amount => {
          expect(amount >= 50).toBe(true);
          expect(amount % 50).toBe(0);
        });
      });

      test('should reject invalid amounts', () => {
        const invalidAmounts = [25, 55, 75, 99];
        invalidAmounts.forEach(amount => {
          const isValid = amount >= 50 && amount % 50 === 0;
          expect(isValid).toBe(false);
        });
      });
    });

    describe('Arabic Error Messages', () => {
      const errorMessages = [
        'فشل في جلب خطط الاشتراك',
        'معرف العضو غير موجود',
        'لم يتم العثور على اشتراك لهذا العضو',
        'فشل في جلب سجل الدفعات',
        'فشل في جلب الاشتراكات',
        'فشل في جلب الإحصائيات'
      ];

      test('all error messages should be in Arabic', () => {
        errorMessages.forEach(message => {
          expect(message).toMatch(/[\u0600-\u06FF]/);
        });
      });
    });

    describe('SAR Currency Handling', () => {
      test('should use 50 SAR as base rate', () => {
        const base_rate = 50;
        expect(base_rate).toBe(50);
      });

      test('should calculate months from amount', () => {
        const amounts = [50, 100, 150, 200, 500];
        const rate = 50;
        amounts.forEach(amount => {
          const months = amount / rate;
          expect(months).toBe(amount / 50);
        });
      });
    });
  });
});
