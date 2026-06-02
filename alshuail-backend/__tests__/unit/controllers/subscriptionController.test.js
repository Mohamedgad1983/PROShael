/**
 * Subscription Controller Unit Tests
 * Current controller implementation uses direct PostgreSQL queries and
 * explicit transactions for payment recording.
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

const mockQuery = jest.fn();
const mockClient = {
  query: jest.fn(),
  release: jest.fn()
};
const mockGetClient = jest.fn(async () => mockClient);

jest.unstable_mockModule('../../../src/services/database.js', () => ({
  query: mockQuery,
  getClient: mockGetClient
}));

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

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

const createMockRequest = (overrides = {}) => ({
  user: { id: 'admin-1', user_id: 'admin-user', member_id: 'member-1', phone: '0500000000', role: 'admin' },
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

describe('Subscription Controller Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReset();
    mockClient.query.mockReset();
    mockClient.release.mockClear();
    mockGetClient.mockClear();
    mockQuery.mockResolvedValue({ rows: [] });
    mockClient.query.mockResolvedValue({ rows: [] });
  });

  describe('getSubscriptionPlans()', () => {
    test('returns active plans ordered by amount', async () => {
      const plans = [
        { id: 1, name: 'Basic', is_active: true, base_amount: 50 },
        { id: 2, name: 'Premium', is_active: true, base_amount: 100 }
      ];
      mockQuery.mockResolvedValueOnce({ rows: plans });

      const res = createMockResponse();
      await getSubscriptionPlans(createMockRequest(), res);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM subscription_plans WHERE is_active = $1 ORDER BY base_amount ASC',
        [true]
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        plans
      });
    });

    test('returns 500 when plans query fails', async () => {
      mockQuery.mockRejectedValueOnce(new Error('plans failed'));

      const res = createMockResponse();
      await getSubscriptionPlans(createMockRequest(), res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'plans failed'
      }));
    });
  });

  describe('getMemberSubscription()', () => {
    test('uses member current_balance and beneficiary payments to build subscription summary', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 'member-1', phone: '0500000000', current_balance: '700', full_name_ar: 'محمد' }]
        })
        .mockResolvedValueOnce({
          rows: [{ total_paid: '600', payment_count: '2', last_payment_date: '2026-01-15' }]
        })
        .mockResolvedValueOnce({
          rows: [{ plan_name: 'اشتراك سنوي', next_payment_due: '2026-02-01' }]
        });

      const res = createMockResponse();
      await getMemberSubscription(createMockRequest(), res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        subscription: expect.objectContaining({
          id: 'member-1',
          current_balance: '700',
          total_paid: '600',
          amount_due: '2300',
          plan_name: 'اشتراك سنوي'
        })
      }));
    });

    test('returns 401 when no member id is available', async () => {
      const res = createMockResponse();
      await getMemberSubscription(createMockRequest({ user: {} }), res);

      expect(mockQuery).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('getPaymentHistory()', () => {
    test('returns payment history using beneficiary_id strategy', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({
          rows: [{
            id: 'payment-1',
            amount: '50',
            payment_date: '2026-01-01',
            status: 'approved',
            subscription_year: 2026,
            receipt_number: 'R-1',
            notes_ar: 'دفعة اشتراك',
            payment_method: 'cash'
          }]
        });

      const res = createMockResponse();
      await getPaymentHistory(createMockRequest({ query: { page: '1', limit: '10' } }), res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        total: 1,
        page: 1,
        limit: 10,
        payments: [expect.objectContaining({
          id: 'payment-1',
          amount: 50,
          payment_date: '2026-01-01'
        })]
      }));
    });
  });

  describe('getAllSubscriptions()', () => {
    test('returns paginated subscriptions with payment balance overrides and stats', async () => {
      const subscriptions = [
        { member_id: 'member-1', member_name: 'محمد', current_balance: 0, status: 'overdue' }
      ];
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: subscriptions })
        .mockResolvedValueOnce({ rows: [{ member_id: 'member-1', real_balance: '250' }] })
        .mockResolvedValueOnce({ rows: [{ status: 'active' }, { status: 'overdue' }] });

      const res = createMockResponse();
      await getAllSubscriptions(createMockRequest({
        query: { page: '1', limit: '20', status: 'overdue', search: 'محمد' }
      }), res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        total: 1,
        subscriptions: [expect.objectContaining({
          member_id: 'member-1',
          current_balance: 250
        })],
        stats: {
          total_members: 2,
          active: 1,
          overdue: 1
        }
      }));
    });
  });

  describe('getSubscriptionStats()', () => {
    test('calculates dashboard stats from subscription overview rows', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { status: 'active', amount_due: 0, months_paid_ahead: 4 },
          { status: 'overdue', amount_due: 100, months_paid_ahead: 0 },
          { status: 'overdue', months_paid_ahead: 1 }
        ]
      });

      const res = createMockResponse();
      await getSubscriptionStats(createMockRequest(), res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        total_members: 3,
        active: 1,
        overdue: 2,
        monthly_revenue: 150,
        overdue_amount: 150,
        avg_months_ahead: 1.7
      }));
    });
  });

  describe('getOverdueMembers()', () => {
    test('returns overdue members and total due', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { member_id: 'member-1', amount_due: 100 },
          { member_id: 'member-2' }
        ]
      });

      const res = createMockResponse();
      await getOverdueMembers(createMockRequest(), res);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM v_subscription_overview WHERE status = $1 ORDER BY next_payment_due ASC',
        ['overdue']
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        overdue_members: [
          { member_id: 'member-1', amount_due: 100 },
          { member_id: 'member-2' }
        ],
        total_due: 150
      });
    });
  });

  describe('recordPayment()', () => {
    test('rejects missing beneficiary/member payment fields', async () => {
      const res = createMockResponse();

      await recordPayment(createMockRequest({ body: { amount: 50, months: 1 } }), res);

      expect(mockQuery).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'البيانات المطلوبة: member_id أو beneficiary_id, amount, months'
      }));
    });

    test('rejects payments below the minimum amount', async () => {
      const res = createMockResponse();

      await recordPayment(createMockRequest({
        body: { member_id: 'member-1', amount: 25, months: 1 }
      }), res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'الحد الأدنى للدفع 50 ريال'
      }));
    });

    test('returns 404 when the beneficiary subscription is missing', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = createMockResponse();
      await recordPayment(createMockRequest({
        body: { member_id: 'member-1', amount: 50, months: 1 }
      }), res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'لم يتم العثور على اشتراك للعضو المستفيد'
      }));
    });

    test('records a payment in a transaction and updates subscription/member balance', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 'sub-1', member_id: 'member-2', current_balance: 100 }] })
        .mockResolvedValueOnce({ rows: [{ user_id: 'beneficiary-user', full_name: 'المستفيد' }] })
        .mockResolvedValueOnce({ rows: [{ user_id: 'payer-user', full_name: 'الدافع' }] });

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'payment-1' }] }) // insert payment
        .mockResolvedValueOnce({ rows: [] }) // update subscription
        .mockResolvedValueOnce({ rows: [] }) // update member balance
        .mockResolvedValueOnce({ rows: [] }) // notification
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const res = createMockResponse();
      await recordPayment(createMockRequest({
        user: { id: 'admin-1', user_id: 'admin-user' },
        body: {
          payer_id: 'member-1',
          beneficiary_id: 'member-2',
          amount: 150,
          months: 3,
          payment_method: 'cash',
          notes: 'اختبار'
        }
      }), res);

      expect(mockGetClient).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO payments'), expect.arrayContaining([
        'sub-1',
        'member-1',
        'member-2',
        true,
        150,
        3
      ]));
      expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE subscriptions SET'), expect.arrayContaining([
        250,
        5
      ]));
      expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE members SET balance = $1'), [250, 'member-2']);
      expect(mockClient.query).toHaveBeenLastCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        new_balance: 250,
        months_ahead: 5,
        payment_id: 'payment-1',
        is_on_behalf: true
      }));
    });

    test('rolls back and returns 500 when the transaction fails', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 'sub-1', member_id: 'member-1', current_balance: 0 }] })
        .mockResolvedValueOnce({ rows: [{ user_id: 'beneficiary-user', full_name: 'محمد' }] });

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(new Error('insert failed'))
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      const res = createMockResponse();
      await recordPayment(createMockRequest({
        body: { member_id: 'member-1', amount: 50, months: 1 }
      }), res);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('sendPaymentReminder()', () => {
    test('requires explicit members or send_to_all', async () => {
      const res = createMockResponse();

      await sendPaymentReminder(createMockRequest({ body: {} }), res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'يجب تحديد member_ids أو send_to_all'
      }));
    });

    test('returns success with zero sent when no targets are found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = createMockResponse();
      await sendPaymentReminder(createMockRequest({ body: { send_to_all: true } }), res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        sent: 0,
        failed: 0,
        message: 'لا يوجد أعضاء للإرسال إليهم'
      });
    });

    test('sends reminders and reports failures for members without user_id', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            { id: 'member-1', user_id: 'user-1', full_name: 'محمد', phone: '0500000000' },
            { id: 'member-2', user_id: null, full_name: 'أحمد', phone: '0500000001' }
          ]
        })
        .mockResolvedValueOnce({ rows: [] });

      const res = createMockResponse();
      await sendPaymentReminder(createMockRequest({
        body: { member_ids: ['member-1', 'member-2'] },
        query: { verbose: 'true' }
      }), res);

      expect(mockQuery).toHaveBeenNthCalledWith(1, 'SELECT id, user_id, full_name, phone FROM members WHERE id = ANY($1)', [['member-1', 'member-2']]);
      expect(mockQuery).toHaveBeenNthCalledWith(2, expect.stringContaining('INSERT INTO notifications'), expect.any(Array));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        sent: 1,
        failed: 1,
        details: expect.arrayContaining([
          expect.objectContaining({ member_id: 'member-1', status: 'sent' }),
          expect.objectContaining({ member_id: 'member-2', status: 'failed', error: 'No user_id' })
        ])
      }));
    });
  });
});
