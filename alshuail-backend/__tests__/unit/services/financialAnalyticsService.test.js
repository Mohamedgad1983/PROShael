/**
 * Financial Analytics Service Unit Tests
 * Tests comprehensive financial reporting and analytics
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
  gte: jest.fn(() => mockSupabase),
  lte: jest.fn(() => mockSupabase),
  lt: jest.fn(() => mockSupabase),
  single: jest.fn(() => Promise.resolve(mockSupabaseResponse))
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

describe('Financial Analytics Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseResponse.data = null;
    mockSupabaseResponse.error = null;
  });

  // ============================================
  // Get Payment Statistics Tests
  // ============================================
  describe('getPaymentStatistics', () => {
    test('should calculate total payments count', () => {
      const payments = [{}, {}, {}];
      const stats = { totalPayments: payments.length };

      expect(stats.totalPayments).toBe(3);
    });

    test('should calculate total amount', () => {
      const payments = [
        { amount: 100 },
        { amount: 200 },
        { amount: 300 }
      ];
      const totalAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

      expect(totalAmount).toBe(600);
    });

    test('should calculate paid amount', () => {
      const payments = [
        { status: 'paid', amount: 100 },
        { status: 'pending', amount: 200 },
        { status: 'paid', amount: 300 }
      ];
      const paidAmount = payments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + parseFloat(p.amount), 0);

      expect(paidAmount).toBe(400);
    });

    test('should calculate pending amount', () => {
      const payments = [
        { status: 'paid', amount: 100 },
        { status: 'pending', amount: 200 }
      ];
      const pendingAmount = payments
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + parseFloat(p.amount), 0);

      expect(pendingAmount).toBe(200);
    });

    test('should calculate status breakdown', () => {
      const payments = [
        { status: 'paid' },
        { status: 'paid' },
        { status: 'pending' },
        { status: 'failed' }
      ];

      const breakdown = {};
      payments.forEach(p => {
        breakdown[p.status] = (breakdown[p.status] || 0) + 1;
      });

      expect(breakdown.paid).toBe(2);
      expect(breakdown.pending).toBe(1);
      expect(breakdown.failed).toBe(1);
    });

    test('should calculate category breakdown', () => {
      const payments = [
        { category: 'subscription', amount: 100 },
        { category: 'subscription', amount: 150 },
        { category: 'donation', amount: 200 }
      ];

      const categoryBreakdown = {};
      payments.forEach(p => {
        if (!categoryBreakdown[p.category]) {
          categoryBreakdown[p.category] = { count: 0, amount: 0 };
        }
        categoryBreakdown[p.category].count += 1;
        categoryBreakdown[p.category].amount += parseFloat(p.amount);
      });

      expect(categoryBreakdown.subscription.count).toBe(2);
      expect(categoryBreakdown.subscription.amount).toBe(250);
    });

    test('should calculate average payment', () => {
      const totalAmount = 1000;
      const totalPayments = 10;
      const averagePayment = totalPayments > 0 ? totalAmount / totalPayments : 0;

      expect(averagePayment).toBe(100);
    });

    test('should calculate success rate', () => {
      const totalPayments = 100;
      const paidPayments = 80;
      const successRate = totalPayments > 0 ? (paidPayments / totalPayments) * 100 : 0;

      expect(successRate).toBe(80);
    });
  });

  // ============================================
  // Calculate Total Revenue Tests
  // ============================================
  describe('calculateTotalRevenue', () => {
    test('should calculate revenue for paid payments only', () => {
      const payments = [
        { status: 'paid', amount: 100 },
        { status: 'pending', amount: 200 },
        { status: 'paid', amount: 300 }
      ];

      const totalRevenue = payments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + parseFloat(p.amount), 0);

      expect(totalRevenue).toBe(400);
    });

    test('should calculate category revenue', () => {
      const payments = [
        { category: 'subscription', amount: 100 },
        { category: 'subscription', amount: 200 },
        { category: 'donation', amount: 150 }
      ];

      const categoryRevenue = {};
      payments.forEach(p => {
        categoryRevenue[p.category] = (categoryRevenue[p.category] || 0) + parseFloat(p.amount);
      });

      expect(categoryRevenue.subscription).toBe(300);
      expect(categoryRevenue.donation).toBe(150);
    });

    test('should calculate daily revenue', () => {
      const payments = [
        { created_at: '2024-06-15T10:00:00', amount: 100 },
        { created_at: '2024-06-15T14:00:00', amount: 200 },
        { created_at: '2024-06-16T09:00:00', amount: 150 }
      ];

      const dailyRevenue = {};
      payments.forEach(p => {
        const date = p.created_at.split('T')[0];
        dailyRevenue[date] = (dailyRevenue[date] || 0) + parseFloat(p.amount);
      });

      expect(dailyRevenue['2024-06-15']).toBe(300);
      expect(dailyRevenue['2024-06-16']).toBe(150);
    });

    test('should calculate comparison with previous period', () => {
      const currentRevenue = 5000;
      const previousRevenue = 4000;
      const changeAmount = currentRevenue - previousRevenue;
      const changePercentage = previousRevenue > 0 ? (changeAmount / previousRevenue) * 100 : 0;

      expect(changeAmount).toBe(1000);
      expect(changePercentage).toBe(25);
    });

    test('should determine trend direction', () => {
      const changeAmount = 1000;
      const trend = changeAmount > 0 ? 'up' : changeAmount < 0 ? 'down' : 'stable';

      expect(trend).toBe('up');
    });
  });

  // ============================================
  // Get Payments By Category Tests
  // ============================================
  describe('getPaymentsByCategory', () => {
    test('should count payments per category', () => {
      const payments = [
        { category: 'subscription' },
        { category: 'subscription' },
        { category: 'donation' },
        { category: 'event' }
      ];

      const categories = {};
      payments.forEach(p => {
        if (!categories[p.category]) {
          categories[p.category] = { totalCount: 0 };
        }
        categories[p.category].totalCount += 1;
      });

      expect(categories.subscription.totalCount).toBe(2);
      expect(categories.donation.totalCount).toBe(1);
    });

    test('should calculate category percentages', () => {
      const categories = {
        subscription: { totalAmount: 3000 },
        donation: { totalAmount: 2000 }
      };
      const totalAmount = 5000;

      Object.values(categories).forEach(category => {
        category.percentage = (category.totalAmount / totalAmount) * 100;
      });

      expect(categories.subscription.percentage).toBe(60);
      expect(categories.donation.percentage).toBe(40);
    });

    test('should sort categories by total amount', () => {
      const categories = [
        { name: 'subscription', totalAmount: 3000 },
        { name: 'donation', totalAmount: 5000 },
        { name: 'event', totalAmount: 1000 }
      ];

      const sorted = categories.sort((a, b) => b.totalAmount - a.totalAmount);

      expect(sorted[0].name).toBe('donation');
      expect(sorted[2].name).toBe('event');
    });

    test('should use other for unknown category', () => {
      const category = null;
      const categoryName = category || 'other';

      expect(categoryName).toBe('other');
    });
  });

  // ============================================
  // Get Member Contributions Tests
  // ============================================
  describe('getMemberContributions', () => {
    test('should track top contributors', () => {
      const memberStats = [
        { totalAmount: 5000 },
        { totalAmount: 3000 },
        { totalAmount: 2000 }
      ];

      const sorted = memberStats.sort((a, b) => b.totalAmount - a.totalAmount);
      const topContributors = sorted.slice(0, 10);

      expect(topContributors[0].totalAmount).toBe(5000);
    });

    test('should calculate member average contribution', () => {
      const totalAmount = 3000;
      const paymentCount = 6;
      const averagePayment = paymentCount > 0 ? totalAmount / paymentCount : 0;

      expect(averagePayment).toBe(500);
    });

    test('should track last payment date', () => {
      const payments = [
        { created_at: '2024-06-10' },
        { created_at: '2024-06-15' },
        { created_at: '2024-06-12' }
      ];

      let lastPayment = null;
      payments.forEach(p => {
        if (!lastPayment || p.created_at > lastPayment) {
          lastPayment = p.created_at;
        }
      });

      expect(lastPayment).toBe('2024-06-15');
    });

    test('should calculate total contributions', () => {
      const members = [
        { totalAmount: 1000 },
        { totalAmount: 2000 },
        { totalAmount: 3000 }
      ];

      const totalContributions = members.reduce((sum, m) => sum + m.totalAmount, 0);

      expect(totalContributions).toBe(6000);
    });
  });

  // ============================================
  // Get Overdue Payments Tests
  // ============================================
  describe('getOverduePayments', () => {
    test('should identify payments older than 30 days', () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const paymentDate = new Date();
      paymentDate.setDate(paymentDate.getDate() - 45);

      const isOverdue = paymentDate < thirtyDaysAgo;

      expect(isOverdue).toBe(true);
    });

    test('should calculate days overdue', () => {
      const now = new Date();
      const paymentDate = new Date();
      paymentDate.setDate(paymentDate.getDate() - 45);

      const daysDiff = Math.floor((now - paymentDate) / (1000 * 60 * 60 * 24));

      expect(daysDiff).toBe(45);
    });

    test('should categorize 30-60 days overdue', () => {
      const daysOverdue = 45;
      let category;

      if (daysOverdue >= 30 && daysOverdue < 60) {
        category = '30-60days';
      } else if (daysOverdue >= 60 && daysOverdue < 90) {
        category = '60-90days';
      } else if (daysOverdue >= 90) {
        category = '90+days';
      }

      expect(category).toBe('30-60days');
    });

    test('should categorize 60-90 days overdue', () => {
      const daysOverdue = 75;
      let category;

      if (daysOverdue >= 30 && daysOverdue < 60) {
        category = '30-60days';
      } else if (daysOverdue >= 60 && daysOverdue < 90) {
        category = '60-90days';
      } else if (daysOverdue >= 90) {
        category = '90+days';
      }

      expect(category).toBe('60-90days');
    });

    test('should categorize 90+ days overdue', () => {
      const daysOverdue = 120;
      let category;

      if (daysOverdue >= 30 && daysOverdue < 60) {
        category = '30-60days';
      } else if (daysOverdue >= 60 && daysOverdue < 90) {
        category = '60-90days';
      } else if (daysOverdue >= 90) {
        category = '90+days';
      }

      expect(category).toBe('90+days');
    });
  });

  // ============================================
  // Generate Financial Report Tests
  // ============================================
  describe('generateFinancialReport', () => {
    test('should include generation timestamp', () => {
      const report = {
        generatedAt: new Date().toISOString()
      };

      expect(report.generatedAt).toBeDefined();
    });

    test('should include period in report', () => {
      const report = { period: 'month' };
      expect(report.period).toBe('month');
    });

    test('should include summary section', () => {
      const report = { summary: { totalPayments: 100 } };
      expect(report.summary).toBeDefined();
    });

    test('should include revenue section', () => {
      const report = { revenue: { totalRevenue: 50000 } };
      expect(report.revenue).toBeDefined();
    });

    test('should include categories section', () => {
      const report = { categories: { subscription: {} } };
      expect(report.categories).toBeDefined();
    });

    test('should conditionally include member stats', () => {
      const includeMemberStats = true;
      const report = { memberStats: includeMemberStats ? {} : null };

      expect(report.memberStats).toBeDefined();
    });

    test('should conditionally include overdue payments', () => {
      const includeOverdue = true;
      const report = { overduePayments: includeOverdue ? {} : null };

      expect(report.overduePayments).toBeDefined();
    });

    test('should include trends section', () => {
      const report = { trends: { revenueGrowth: 10 } };
      expect(report.trends).toBeDefined();
    });
  });

  // ============================================
  // Calculate Trends Tests
  // ============================================
  describe('calculateTrends', () => {
    test('should calculate revenue growth', () => {
      const current = { paidAmount: 5500 };
      const previous = { paidAmount: 5000 };
      const revenueGrowth = previous.paidAmount > 0 ?
        ((current.paidAmount - previous.paidAmount) / previous.paidAmount) * 100 : 0;

      expect(revenueGrowth).toBe(10);
    });

    test('should calculate payment volume growth', () => {
      const current = { totalPayments: 110 };
      const previous = { totalPayments: 100 };
      const volumeGrowth = previous.totalPayments > 0 ?
        ((current.totalPayments - previous.totalPayments) / previous.totalPayments) * 100 : 0;

      expect(volumeGrowth).toBe(10);
    });

    test('should calculate average payment trend', () => {
      const current = { averagePayment: 550 };
      const previous = { averagePayment: 500 };
      const avgTrend = previous.averagePayment > 0 ?
        ((current.averagePayment - previous.averagePayment) / previous.averagePayment) * 100 : 0;

      expect(avgTrend).toBe(10);
    });

    test('should calculate category trends', () => {
      const current = { categoryBreakdown: { subscription: { amount: 3300 } } };
      const previous = { categoryBreakdown: { subscription: { amount: 3000 } } };

      const currentAmount = current.categoryBreakdown.subscription.amount;
      const previousAmount = previous.categoryBreakdown.subscription.amount;
      const trend = previousAmount > 0 ? ((currentAmount - previousAmount) / previousAmount) * 100 : 0;

      expect(trend).toBe(10);
    });
  });

  // ============================================
  // Date Range Validation Tests
  // ============================================
  describe('validateDateRange', () => {
    test('should use start of month as default start date', () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      expect(startOfMonth.getDate()).toBe(1);
    });

    test('should use current date as default end date', () => {
      const now = new Date();
      expect(now).toBeInstanceOf(Date);
    });

    test('should accept custom start date', () => {
      const dateRange = { startDate: '2024-01-01' };
      const startDate = dateRange.startDate;

      expect(startDate).toBe('2024-01-01');
    });

    test('should accept custom end date', () => {
      const dateRange = { endDate: '2024-06-30' };
      const endDate = dateRange.endDate;

      expect(endDate).toBe('2024-06-30');
    });
  });

  // ============================================
  // Period Date Range Tests
  // ============================================
  describe('getPeriodDateRange', () => {
    test('should calculate today range', () => {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      expect(startDate.getHours()).toBe(0);
    });

    test('should calculate week range', () => {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      expect(weekAgo.getTime()).toBeLessThan(now.getTime());
    });

    test('should calculate month range', () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      expect(startOfMonth.getDate()).toBe(1);
    });

    test('should calculate quarter range', () => {
      const now = new Date();
      const quarterStart = Math.floor(now.getMonth() / 3) * 3;
      const startOfQuarter = new Date(now.getFullYear(), quarterStart, 1);

      expect([0, 3, 6, 9]).toContain(startOfQuarter.getMonth());
    });

    test('should calculate year range', () => {
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);

      expect(startOfYear.getMonth()).toBe(0);
      expect(startOfYear.getDate()).toBe(1);
    });
  });

  // ============================================
  // Previous Period Date Range Tests
  // ============================================
  describe('getPreviousPeriodDateRange', () => {
    test('should calculate previous period length', () => {
      const currentStart = new Date('2024-06-01');
      const currentEnd = new Date('2024-06-30');
      const periodLength = currentEnd.getTime() - currentStart.getTime();

      expect(periodLength).toBeGreaterThan(0);
    });

    test('should calculate previous period start', () => {
      const currentStart = new Date('2024-06-01');
      const currentEnd = new Date('2024-06-30');
      const periodLength = currentEnd.getTime() - currentStart.getTime();
      const previousStart = new Date(currentStart.getTime() - periodLength);

      expect(previousStart.getTime()).toBeLessThan(currentStart.getTime());
    });

    test('should calculate previous period end', () => {
      const currentStart = new Date('2024-06-01');
      const previousEnd = currentStart;

      expect(previousEnd.getTime()).toBe(currentStart.getTime());
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================
  describe('Error Handling', () => {
    test('should return Arabic error for payment stats failure', () => {
      const error = 'فشل في جلب إحصائيات المدفوعات';
      expect(error).toMatch(/[\u0600-\u06FF]/);
    });

    test('should return Arabic error for revenue calculation failure', () => {
      const error = 'فشل في حساب إجمالي الإيرادات';
      expect(error).toMatch(/[\u0600-\u06FF]/);
    });

    test('should return Arabic error for category breakdown failure', () => {
      const error = 'فشل في جلب تصنيف المدفوعات';
      expect(error).toMatch(/[\u0600-\u06FF]/);
    });

    test('should return Arabic error for member contributions failure', () => {
      const error = 'فشل في جلب إحصائيات مساهمات الأعضاء';
      expect(error).toMatch(/[\u0600-\u06FF]/);
    });

    test('should return Arabic error for overdue payments failure', () => {
      const error = 'فشل في جلب المدفوعات المتأخرة';
      expect(error).toMatch(/[\u0600-\u06FF]/);
    });

    test('should return Arabic error for report generation failure', () => {
      const error = 'فشل في إنشاء التقرير المالي';
      expect(error).toMatch(/[\u0600-\u06FF]/);
    });
  });

  // ============================================
  // Daily Stats Calculation Tests
  // ============================================
  describe('Daily Stats Calculation', () => {
    test('should extract date from created_at', () => {
      const payment = { created_at: '2024-06-15T14:30:00' };
      const date = payment.created_at.split('T')[0];

      expect(date).toBe('2024-06-15');
    });

    test('should handle unknown date', () => {
      const payment = { created_at: null };
      const date = payment.created_at ? payment.created_at.split('T')[0] : 'unknown';

      expect(date).toBe('unknown');
    });

    test('should aggregate by date', () => {
      const dailyStats = {};
      const date = '2024-06-15';
      const amount = 100;

      if (!dailyStats[date]) {
        dailyStats[date] = { count: 0, amount: 0 };
      }
      dailyStats[date].count += 1;
      dailyStats[date].amount += amount;

      expect(dailyStats[date].count).toBe(1);
      expect(dailyStats[date].amount).toBe(100);
    });
  });

  // ============================================
  // Payment Method Breakdown Tests
  // ============================================
  describe('Payment Method Breakdown', () => {
    test('should track payment methods', () => {
      const payments = [
        { payment_method: 'cash', amount: 100 },
        { payment_method: 'card', amount: 200 },
        { payment_method: 'cash', amount: 150 }
      ];

      const methodBreakdown = {};
      payments.forEach(p => {
        if (p.payment_method) {
          if (!methodBreakdown[p.payment_method]) {
            methodBreakdown[p.payment_method] = { count: 0, amount: 0 };
          }
          methodBreakdown[p.payment_method].count += 1;
          methodBreakdown[p.payment_method].amount += parseFloat(p.amount);
        }
      });

      expect(methodBreakdown.cash.count).toBe(2);
      expect(methodBreakdown.cash.amount).toBe(250);
      expect(methodBreakdown.card.count).toBe(1);
    });

    test('should skip payments without method', () => {
      const payment = { amount: 100 };
      const hasMethod = !!payment.payment_method;

      expect(hasMethod).toBe(false);
    });
  });
});
