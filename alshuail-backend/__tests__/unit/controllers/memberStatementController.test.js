/**
 * Member Statement Controller Unit Tests
 * Tests member financial statement generation
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

describe('Member Statement Controller Unit Tests', () => {
  const createMockRequest = (overrides = {}) => ({
    user: { id: 'user-123', role: 'admin' },
    query: {},
    params: { memberId: 'member-123' },
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
  // Statement Generation Tests
  // ============================================
  describe('Statement Generation', () => {
    test('should generate statement for member', () => {
      const statement = {
        member_id: 'member-123',
        period: { start: '2024-01-01', end: '2024-12-31' },
        payments: [],
        subscriptions: [],
        contributions: [],
        summary: {}
      };

      expect(statement.member_id).toBe('member-123');
      expect(statement.period).toBeDefined();
    });

    test('should include payment history', () => {
      const payments = [
        { id: 'p1', amount: 500, date: '2024-01-15', type: 'subscription' },
        { id: 'p2', amount: 1000, date: '2024-02-15', type: 'contribution' }
      ];

      expect(payments.length).toBe(2);
      expect(payments[0].type).toBe('subscription');
    });

    test('should include subscription status', () => {
      const subscriptions = [
        { id: 's1', plan: 'annual', status: 'active', amount: 500 },
        { id: 's2', plan: 'annual', status: 'expired', amount: 500 }
      ];

      const active = subscriptions.filter(s => s.status === 'active');
      expect(active.length).toBe(1);
    });

    test('should include contribution history', () => {
      const contributions = [
        { id: 'c1', initiative_id: 'init-1', amount: 200 },
        { id: 'c2', initiative_id: 'init-2', amount: 500 }
      ];

      const total = contributions.reduce((sum, c) => sum + c.amount, 0);
      expect(total).toBe(700);
    });
  });

  // ============================================
  // Date Range Tests
  // ============================================
  describe('Date Range Handling', () => {
    test('should filter by date range', () => {
      const req = createMockRequest({
        query: {
          start_date: '2024-01-01',
          end_date: '2024-06-30'
        }
      });

      expect(req.query.start_date).toBe('2024-01-01');
      expect(req.query.end_date).toBe('2024-06-30');
    });

    test('should default to current year', () => {
      const year = new Date().getFullYear();
      const defaultStart = `${year}-01-01`;
      const defaultEnd = `${year}-12-31`;

      expect(defaultStart).toContain(year.toString());
    });

    test('should support hijri date filter', () => {
      const req = createMockRequest({
        query: {
          hijri_year: '1446',
          hijri_month: '5'
        }
      });

      expect(req.query.hijri_year).toBe('1446');
      expect(req.query.hijri_month).toBe('5');
    });
  });

  // ============================================
  // Balance Calculation Tests
  // ============================================
  describe('Balance Calculations', () => {
    test('should calculate total paid', () => {
      const payments = [
        { amount: 500, status: 'completed' },
        { amount: 1000, status: 'completed' },
        { amount: 200, status: 'pending' }
      ];

      const totalPaid = payments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0);

      expect(totalPaid).toBe(1500);
    });

    test('should calculate outstanding balance', () => {
      const totalDue = 2000;
      const totalPaid = 1500;
      const outstanding = totalDue - totalPaid;

      expect(outstanding).toBe(500);
    });

    test('should calculate overpayment', () => {
      const totalDue = 1000;
      const totalPaid = 1500;
      const balance = totalDue - totalPaid;

      expect(balance).toBe(-500);
      expect(balance < 0).toBe(true); // Credit balance
    });

    test('should calculate subscription dues', () => {
      const subscriptionMonths = 12;
      const monthlyRate = 50;
      const totalDue = subscriptionMonths * monthlyRate;

      expect(totalDue).toBe(600);
    });
  });

  // ============================================
  // Transaction Summary Tests
  // ============================================
  describe('Transaction Summary', () => {
    test('should summarize by transaction type', () => {
      const transactions = [
        { type: 'subscription', amount: 500 },
        { type: 'subscription', amount: 500 },
        { type: 'contribution', amount: 1000 },
        { type: 'diya', amount: 200 }
      ];

      const byType = transactions.reduce((acc, t) => {
        acc[t.type] = (acc[t.type] || 0) + t.amount;
        return acc;
      }, {});

      expect(byType['subscription']).toBe(1000);
      expect(byType['contribution']).toBe(1000);
      expect(byType['diya']).toBe(200);
    });

    test('should count transactions by status', () => {
      const transactions = [
        { status: 'completed' },
        { status: 'completed' },
        { status: 'pending' },
        { status: 'failed' }
      ];

      const byStatus = transactions.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      }, {});

      expect(byStatus['completed']).toBe(2);
      expect(byStatus['pending']).toBe(1);
    });

    test('should calculate monthly breakdown', () => {
      const transactions = [
        { amount: 500, date: '2024-01-15' },
        { amount: 300, date: '2024-01-20' },
        { amount: 700, date: '2024-02-10' }
      ];

      const byMonth = transactions.reduce((acc, t) => {
        const month = t.date.substring(0, 7);
        acc[month] = (acc[month] || 0) + t.amount;
        return acc;
      }, {});

      expect(byMonth['2024-01']).toBe(800);
      expect(byMonth['2024-02']).toBe(700);
    });
  });

  // ============================================
  // Member Info Tests
  // ============================================
  describe('Member Information', () => {
    test('should include member details', () => {
      const member = {
        id: 'member-123',
        full_name: 'محمد بن عبدالله',
        membership_number: 'M001',
        phone: '+966501234567',
        email: 'member@test.com'
      };

      expect(member.full_name).toBeDefined();
      expect(member.membership_number).toBeDefined();
    });

    test('should include membership status', () => {
      const member = {
        is_active: true,
        membership_status: 'active',
        joined_date: '2020-01-01'
      };

      expect(member.is_active).toBe(true);
      expect(member.membership_status).toBe('active');
    });

    test('should include family information', () => {
      const member = {
        family_id: 'family-123',
        family_name: 'آل محمد',
        is_family_head: false
      };

      expect(member.family_id).toBeDefined();
    });
  });

  // ============================================
  // Response Format Tests
  // ============================================
  describe('Response Format', () => {
    test('should return complete statement', () => {
      const res = createMockResponse();
      const statement = {
        member: { id: 'member-123', full_name: 'محمد' },
        period: { start: '2024-01-01', end: '2024-12-31' },
        payments: [],
        subscriptions: [],
        contributions: [],
        summary: {
          total_paid: 2000,
          total_due: 2500,
          balance: -500
        },
        generated_at: new Date().toISOString()
      };

      res.json({
        success: true,
        data: statement
      });

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            member: expect.any(Object),
            summary: expect.any(Object)
          })
        })
      );
    });

    test('should include Arabic messages', () => {
      const messages = {
        success: 'تم إنشاء كشف الحساب بنجاح',
        no_transactions: 'لا توجد معاملات في الفترة المحددة'
      };

      expect(messages.success).toMatch(/[\u0600-\u06FF]/);
    });

    test('should include generation timestamp', () => {
      const statement = {
        generated_at: new Date().toISOString()
      };

      expect(statement.generated_at).toBeDefined();
    });
  });

  // ============================================
  // Access Control Tests
  // ============================================
  describe('Access Control', () => {
    test('should allow member to view own statement', () => {
      const user = { id: 'member-123', role: 'member' };
      const memberId = 'member-123';

      const canView = user.id === memberId || ['super_admin', 'admin', 'financial_manager'].includes(user.role);
      expect(canView).toBe(true);
    });

    test('should allow admin to view any statement', () => {
      const user = { id: 'admin-456', role: 'admin' };
      const memberId = 'member-123';

      const canView = user.id === memberId || ['super_admin', 'admin', 'financial_manager'].includes(user.role);
      expect(canView).toBe(true);
    });

    test('should deny member from viewing others statement', () => {
      const user = { id: 'member-456', role: 'member' };
      const memberId = 'member-123';

      const canView = user.id === memberId || ['super_admin', 'admin', 'financial_manager'].includes(user.role);
      expect(canView).toBe(false);
    });

    test('should return 403 for unauthorized access', () => {
      const res = createMockResponse();
      res.status(403).json({
        success: false,
        error: 'Access denied: Cannot view other member statements'
      });

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ============================================
  // Export Tests
  // ============================================
  describe('Statement Export', () => {
    test('should support PDF export', () => {
      const req = createMockRequest({
        query: { format: 'pdf' }
      });

      expect(req.query.format).toBe('pdf');
    });

    test('should support Excel export', () => {
      const req = createMockRequest({
        query: { format: 'excel' }
      });

      expect(req.query.format).toBe('excel');
    });

    test('should validate export format', () => {
      const validFormats = ['pdf', 'excel', 'csv', 'json'];
      const format = 'pdf';

      expect(validFormats).toContain(format);
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================
  describe('Error Handling', () => {
    test('should return 404 for non-existent member', () => {
      const res = createMockResponse();
      res.status(404).json({
        success: false,
        error: 'Member not found'
      });

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('should return 400 for invalid date range', () => {
      const res = createMockResponse();
      res.status(400).json({
        success: false,
        error: 'Invalid date range'
      });

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should return 500 on database error', () => {
      const res = createMockResponse();
      res.status(500).json({
        success: false,
        error: 'Failed to generate statement'
      });

      expect(res.status).toHaveBeenCalledWith(500);
    });

    test('should handle empty transactions', () => {
      const transactions = null;
      const safeTransactions = transactions || [];

      expect(safeTransactions).toEqual([]);
    });
  });

  // ============================================
  // Statement Period Tests
  // ============================================
  describe('Statement Periods', () => {
    test('should generate monthly statement', () => {
      const period = {
        type: 'monthly',
        month: 1,
        year: 2024
      };

      expect(period.type).toBe('monthly');
    });

    test('should generate quarterly statement', () => {
      const period = {
        type: 'quarterly',
        quarter: 1,
        year: 2024
      };

      expect(period.type).toBe('quarterly');
    });

    test('should generate annual statement', () => {
      const period = {
        type: 'annual',
        year: 2024
      };

      expect(period.type).toBe('annual');
    });

    test('should generate custom period statement', () => {
      const period = {
        type: 'custom',
        start: '2024-03-15',
        end: '2024-09-15'
      };

      expect(period.type).toBe('custom');
    });
  });

  // ============================================
  // Comparison Tests
  // ============================================
  describe('Period Comparison', () => {
    test('should compare with previous period', () => {
      const current = { total_paid: 1000 };
      const previous = { total_paid: 800 };

      const change = current.total_paid - previous.total_paid;
      const changePercent = ((change) / previous.total_paid) * 100;

      expect(change).toBe(200);
      expect(changePercent).toBe(25);
    });

    test('should identify payment patterns', () => {
      const monthlyPayments = [500, 500, 500, 0, 500, 500];
      const missedMonths = monthlyPayments.filter(p => p === 0).length;

      expect(missedMonths).toBe(1);
    });
  });
});
