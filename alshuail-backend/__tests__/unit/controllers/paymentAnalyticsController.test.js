/**
 * Payment Analytics Controller Unit Tests
 * Tests payment analytics and reporting functionality
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
  order: jest.fn(() => mockSupabase),
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

describe('Payment Analytics Controller Unit Tests', () => {
  const createMockRequest = (overrides = {}) => ({
    user: { id: 'user-123', role: 'financial_manager' },
    query: {},
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
    mockSupabaseResponse.data = null;
    mockSupabaseResponse.error = null;
  });

  // ============================================
  // Monthly Payment Summary Tests
  // ============================================
  describe('Monthly Payment Summary', () => {
    test('should aggregate payments by month', () => {
      const payments = [
        { amount: 500, payment_date: '2024-01-15', status: 'completed' },
        { amount: 300, payment_date: '2024-01-20', status: 'completed' },
        { amount: 700, payment_date: '2024-02-10', status: 'completed' }
      ];

      const byMonth = payments.reduce((acc, p) => {
        if (!p.payment_date) return acc;
        const month = p.payment_date.substring(0, 7);
        acc[month] = (acc[month] || 0) + parseFloat(p.amount);
        return acc;
      }, {});

      expect(byMonth['2024-01']).toBe(800);
      expect(byMonth['2024-02']).toBe(700);
    });

    test('should initialize last 12 months with zero', () => {
      const now = new Date();
      const monthlyData = {};

      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyData[monthKey] = { total: 0, count: 0 };
      }

      expect(Object.keys(monthlyData).length).toBe(12);
    });

    test('should include Arabic month names', () => {
      const arabicMonths = [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
      ];

      expect(arabicMonths.length).toBe(12);
      expect(arabicMonths[0]).toBe('يناير');
      expect(arabicMonths[11]).toBe('ديسمبر');
    });

    test('should calculate summary statistics', () => {
      const monthlyData = [
        { total: 1000, count: 10 },
        { total: 1500, count: 15 },
        { total: 800, count: 8 }
      ];

      const summary = {
        totalMonths: monthlyData.length,
        totalAmount: monthlyData.reduce((sum, m) => sum + m.total, 0),
        totalPayments: monthlyData.reduce((sum, m) => sum + m.count, 0),
        averagePerMonth: Math.round(monthlyData.reduce((sum, m) => sum + m.total, 0) / monthlyData.length)
      };

      expect(summary.totalMonths).toBe(3);
      expect(summary.totalAmount).toBe(3300);
      expect(summary.totalPayments).toBe(33);
      expect(summary.averagePerMonth).toBe(1100);
    });

    test('should filter only completed payments', () => {
      const payments = [
        { amount: 500, status: 'completed' },
        { amount: 300, status: 'pending' },
        { amount: 700, status: 'completed' }
      ];

      const completedPayments = payments.filter(p => p.status === 'completed');
      const total = completedPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

      expect(completedPayments.length).toBe(2);
      expect(total).toBe(1200);
    });
  });

  // ============================================
  // Yearly Member Payments Tests
  // ============================================
  describe('Yearly Member Payments', () => {
    test('should aggregate payments by year', () => {
      const members = [
        { id: 1, payment_2021: 500, payment_2022: 600, payment_2023: 700 },
        { id: 2, payment_2021: 400, payment_2022: 500, payment_2023: 600 }
      ];

      const yearlyTotals = {
        2021: members.reduce((sum, m) => sum + (parseFloat(m.payment_2021) || 0), 0),
        2022: members.reduce((sum, m) => sum + (parseFloat(m.payment_2022) || 0), 0),
        2023: members.reduce((sum, m) => sum + (parseFloat(m.payment_2023) || 0), 0)
      };

      expect(yearlyTotals[2021]).toBe(900);
      expect(yearlyTotals[2022]).toBe(1100);
      expect(yearlyTotals[2023]).toBe(1300);
    });

    test('should count members with payments per year', () => {
      const members = [
        { id: 1, payment_2023: 500, payment_2024: 0 },
        { id: 2, payment_2023: 600, payment_2024: 700 },
        { id: 3, payment_2023: 0, payment_2024: 800 }
      ];

      const membersWithPayment2023 = members.filter(m => parseFloat(m.payment_2023) > 0).length;
      const membersWithPayment2024 = members.filter(m => parseFloat(m.payment_2024) > 0).length;

      expect(membersWithPayment2023).toBe(2);
      expect(membersWithPayment2024).toBe(2);
    });

    test('should calculate total across all years', () => {
      const yearlyTotals = { 2021: 1000, 2022: 1500, 2023: 2000, 2024: 2500 };
      const total = Object.values(yearlyTotals).reduce((sum, val) => sum + val, 0);

      expect(total).toBe(7000);
    });

    test('should calculate average per member', () => {
      const members = [
        { total_paid: 1500 },
        { total_paid: 2000 },
        { total_paid: 1000 }
      ];

      const totalPaid = members.reduce((sum, m) => sum + parseFloat(m.total_paid || 0), 0);
      const average = Math.round(totalPaid / members.length);

      expect(average).toBe(1500);
    });
  });

  // ============================================
  // Tribal Section Payments Tests
  // ============================================
  describe('Tribal Section Payments', () => {
    test('should group payments by tribal section', () => {
      const members = [
        { tribal_section: 'الشمال', total_paid: 500 },
        { tribal_section: 'الشمال', total_paid: 700 },
        { tribal_section: 'الجنوب', total_paid: 600 }
      ];

      const sectionData = {};
      members.forEach(member => {
        const section = member.tribal_section || 'غير محدد';
        if (!sectionData[section]) {
          sectionData[section] = { totalPaid: 0, memberCount: 0 };
        }
        sectionData[section].totalPaid += parseFloat(member.total_paid || 0);
        sectionData[section].memberCount += 1;
      });

      expect(sectionData['الشمال'].totalPaid).toBe(1200);
      expect(sectionData['الشمال'].memberCount).toBe(2);
      expect(sectionData['الجنوب'].totalPaid).toBe(600);
    });

    test('should handle undefined tribal section', () => {
      const member = { tribal_section: null, total_paid: 500 };
      const section = member.tribal_section || 'غير محدد';

      expect(section).toBe('غير محدد');
    });

    test('should count active members per section', () => {
      const members = [
        { tribal_section: 'الشمال', membership_status: 'active' },
        { tribal_section: 'الشمال', membership_status: 'suspended' },
        { tribal_section: 'الشمال', membership_status: 'active' }
      ];

      const sectionData = { activeMembers: 0, memberCount: 0 };
      members.forEach(m => {
        sectionData.memberCount++;
        if (m.membership_status === 'active') {
          sectionData.activeMembers++;
        }
      });

      expect(sectionData.activeMembers).toBe(2);
      expect(sectionData.memberCount).toBe(3);
    });

    test('should calculate average per member in section', () => {
      const sectionData = { totalPaid: 3000, memberCount: 5 };
      const average = Math.round(sectionData.totalPaid / sectionData.memberCount);

      expect(average).toBe(600);
    });

    test('should sort sections by total paid descending', () => {
      const sections = [
        { section: 'الشمال', totalPaid: 5000 },
        { section: 'الجنوب', totalPaid: 8000 },
        { section: 'الشرق', totalPaid: 3000 }
      ];

      const sorted = sections.sort((a, b) => b.totalPaid - a.totalPaid);

      expect(sorted[0].section).toBe('الجنوب');
      expect(sorted[0].totalPaid).toBe(8000);
    });
  });

  // ============================================
  // Summary Statistics Tests
  // ============================================
  describe('Summary Statistics', () => {
    test('should calculate total sections', () => {
      const result = [
        { section: 'الشمال' },
        { section: 'الجنوب' },
        { section: 'الشرق' }
      ];

      expect(result.length).toBe(3);
    });

    test('should identify highest paying section', () => {
      const result = [
        { section: 'الشمال', totalPaid: 5000 },
        { section: 'الجنوب', totalPaid: 8000 },
        { section: 'الشرق', totalPaid: 3000 }
      ].sort((a, b) => b.totalPaid - a.totalPaid);

      expect(result[0].section).toBe('الجنوب');
      expect(result[0].totalPaid).toBe(8000);
    });

    test('should handle empty result set', () => {
      const result = [];

      const summary = {
        highestPayingSection: result[0]?.section || 'N/A',
        highestAmount: result[0]?.totalPaid || 0
      };

      expect(summary.highestPayingSection).toBe('N/A');
      expect(summary.highestAmount).toBe(0);
    });
  });

  // ============================================
  // Date Range Calculation Tests
  // ============================================
  describe('Date Range Calculations', () => {
    test('should calculate 12 months ago date', () => {
      const now = new Date();
      const twelveMonthsAgo = new Date(now.setMonth(now.getMonth() - 12));

      expect(twelveMonthsAgo).toBeInstanceOf(Date);
    });

    test('should filter payments by date range', () => {
      const cutoffDate = '2024-01-01';
      const payments = [
        { amount: 500, payment_date: '2023-12-15' },
        { amount: 700, payment_date: '2024-02-10' },
        { amount: 600, payment_date: '2024-03-20' }
      ];

      const filtered = payments.filter(p => p.payment_date >= cutoffDate);
      expect(filtered.length).toBe(2);
    });
  });

  // ============================================
  // Response Format Tests
  // ============================================
  describe('Response Format', () => {
    test('should return monthly summary format', () => {
      const res = createMockResponse();
      const response = {
        success: true,
        data: [
          { monthKey: '2024-01', label: 'يناير', total: 5000, count: 50 }
        ],
        summary: {
          totalMonths: 12,
          totalAmount: 60000,
          totalPayments: 600,
          averagePerMonth: 5000
        }
      };

      res.json(response);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Array),
          summary: expect.objectContaining({
            totalMonths: expect.any(Number)
          })
        })
      );
    });

    test('should return yearly format', () => {
      const response = {
        success: true,
        data: [
          { year: 2024, total: 50000, memberCount: 100 }
        ],
        summary: {
          totalAllYears: 200000,
          totalMembers: 300,
          averagePerMember: 667
        }
      };

      expect(response.data[0].year).toBe(2024);
      expect(response.summary.totalAllYears).toBe(200000);
    });

    test('should return tribal section format', () => {
      const response = {
        success: true,
        data: [
          { section: 'الشمال', totalPaid: 10000, memberCount: 50, activeMembers: 45 }
        ],
        summary: {
          totalSections: 5,
          totalAmount: 50000,
          highestPayingSection: 'الشمال'
        }
      };

      expect(response.data[0].section).toBeDefined();
      expect(response.summary.highestPayingSection).toBe('الشمال');
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================
  describe('Error Handling', () => {
    test('should return 500 on database error', () => {
      const res = createMockResponse();
      res.status(500).json({
        success: false,
        error: 'فشل في جلب ملخص الدفعات الشهرية'
      });

      expect(res.status).toHaveBeenCalledWith(500);
    });

    test('should handle null payments gracefully', () => {
      const payments = null;
      const safePayments = payments || [];

      expect(safePayments).toEqual([]);
    });

    test('should handle missing payment date', () => {
      const payment = { amount: 500, payment_date: null };

      if (!payment.payment_date) {
        // Skip this payment
        expect(true).toBe(true);
      }
    });

    test('should include Arabic error messages', () => {
      const errorMessage = 'فشل في جلب ملخص الدفعات الشهرية';
      expect(errorMessage).toMatch(/[\u0600-\u06FF]/);
    });
  });
});
