/**
 * Payment History Tracking Tests
 * Phase 2: Payment Processing Testing - History Tracking (3 tests)
 */

import { jest } from '@jest/globals';

describe('Payment History Tracking Tests', () => {
  class PaymentHistoryTracker {
    constructor() {
      this.history = new Map();
      this.memberPayments = new Map();
      this.dailyTotals = new Map();
    }

    recordPayment(payment) {
      // Add to history
      this.history.set(payment.id, {
        ...payment,
        recordedAt: new Date().toISOString()
      });

      // Track by member
      if (!this.memberPayments.has(payment.memberId)) {
        this.memberPayments.set(payment.memberId, []);
      }
      this.memberPayments.get(payment.memberId).push(payment.id);

      // Track daily totals
      const dateKey = new Date(payment.createdAt).toISOString().split('T')[0];
      if (!this.dailyTotals.has(dateKey)) {
        this.dailyTotals.set(dateKey, { count: 0, total: 0, currencies: {} });
      }

      const daily = this.dailyTotals.get(dateKey);
      daily.count++;
      daily.total += payment.amount;
      daily.currencies[payment.currency] = (daily.currencies[payment.currency] || 0) + payment.amount;

      return payment.id;
    }

    getMemberHistory(memberId, options = {}) {
      const paymentIds = this.memberPayments.get(memberId) || [];
      let payments = paymentIds.map(id => this.history.get(id));

      // Apply filters
      if (options.startDate) {
        payments = payments.filter(p =>
          new Date(p.createdAt) >= new Date(options.startDate)
        );
      }

      if (options.endDate) {
        payments = payments.filter(p =>
          new Date(p.createdAt) <= new Date(options.endDate)
        );
      }

      if (options.status) {
        payments = payments.filter(p => p.status === options.status);
      }

      // Sort
      const sortField = options.sortBy || 'createdAt';
      const sortOrder = options.sortOrder || 'desc';

      payments.sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];

        if (sortOrder === 'desc') {
          return aVal > bVal ? -1 : 1;
        } else {
          return aVal < bVal ? -1 : 1;
        }
      });

      // Pagination
      if (options.limit) {
        const offset = options.offset || 0;
        payments = payments.slice(offset, offset + options.limit);
      }

      return {
        memberId,
        payments,
        count: payments.length,
        totalCount: paymentIds.length
      };
    }

    generateSummaryReport(startDate, endDate) {
      const report = {
        period: {
          start: startDate,
          end: endDate
        },
        totalPayments: 0,
        totalAmount: 0,
        byStatus: {},
        byCurrency: {},
        byMember: {},
        dailyBreakdown: []
      };

      for (const [id, payment] of this.history) {
        const paymentDate = new Date(payment.createdAt);

        if (paymentDate >= new Date(startDate) && paymentDate <= new Date(endDate)) {
          report.totalPayments++;
          report.totalAmount += payment.amount;

          // By status
          report.byStatus[payment.status] = (report.byStatus[payment.status] || 0) + 1;

          // By currency
          if (!report.byCurrency[payment.currency]) {
            report.byCurrency[payment.currency] = { count: 0, total: 0 };
          }
          report.byCurrency[payment.currency].count++;
          report.byCurrency[payment.currency].total += payment.amount;

          // By member
          if (!report.byMember[payment.memberId]) {
            report.byMember[payment.memberId] = { count: 0, total: 0 };
          }
          report.byMember[payment.memberId].count++;
          report.byMember[payment.memberId].total += payment.amount;
        }
      }

      // Daily breakdown
      for (const [date, data] of this.dailyTotals) {
        if (date >= startDate && date <= endDate) {
          report.dailyBreakdown.push({
            date,
            ...data
          });
        }
      }

      // Sort daily breakdown
      report.dailyBreakdown.sort((a, b) => a.date.localeCompare(b.date));

      return report;
    }

    getPaymentStatistics(memberId) {
      const paymentIds = this.memberPayments.get(memberId) || [];
      const payments = paymentIds.map(id => this.history.get(id));

      if (payments.length === 0) {
        return null;
      }

      const amounts = payments
        .filter(p => p.status === 'completed')
        .map(p => p.amount);

      const total = amounts.reduce((sum, amt) => sum + amt, 0);
      const average = amounts.length > 0 ? total / amounts.length : 0;
      const max = Math.max(...amounts, 0);
      const min = amounts.length > 0 ? Math.min(...amounts) : 0;

      // Calculate frequency (payments per month)
      const dates = payments.map(p => new Date(p.createdAt));
      const earliest = new Date(Math.min(...dates));
      const latest = new Date(Math.max(...dates));
      const monthsDiff = Math.max(1,
        (latest.getFullYear() - earliest.getFullYear()) * 12 +
        (latest.getMonth() - earliest.getMonth()) + 1
      );
      const frequency = payments.length / monthsDiff;

      return {
        memberId,
        totalPayments: payments.length,
        completedPayments: amounts.length,
        totalAmount: Number(total.toFixed(2)),
        averageAmount: Number(average.toFixed(2)),
        maxAmount: max,
        minAmount: min,
        paymentsPerMonth: Number(frequency.toFixed(1)),
        firstPayment: earliest.toISOString(),
        lastPayment: latest.toISOString()
      };
    }
  }

  describe('Payment History Operations', () => {
    let tracker;

    beforeEach(() => {
      tracker = new PaymentHistoryTracker();
      jest.useFakeTimers();

      // Add test payments
      const payments = [
        {
          id: 'PAY-001',
          memberId: 'MEM-001',
          amount: 100,
          currency: 'SAR',
          status: 'completed',
          createdAt: '2025-01-01T10:00:00Z'
        },
        {
          id: 'PAY-002',
          memberId: 'MEM-001',
          amount: 150,
          currency: 'SAR',
          status: 'completed',
          createdAt: '2025-01-05T10:00:00Z'
        },
        {
          id: 'PAY-003',
          memberId: 'MEM-002',
          amount: 200,
          currency: 'KWD',
          status: 'completed',
          createdAt: '2025-01-10T10:00:00Z'
        },
        {
          id: 'PAY-004',
          memberId: 'MEM-001',
          amount: 75,
          currency: 'SAR',
          status: 'failed',
          createdAt: '2025-01-15T10:00:00Z'
        }
      ];

      payments.forEach(payment => tracker.recordPayment(payment));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should track member payment history with filters', () => {
      // Get all payments for MEM-001
      const history = tracker.getMemberHistory('MEM-001');
      expect(history.payments).toHaveLength(3);
      expect(history.totalCount).toBe(3);

      // Filter by status
      const completedOnly = tracker.getMemberHistory('MEM-001', {
        status: 'completed'
      });
      expect(completedOnly.payments).toHaveLength(2);

      // Filter by date range
      const dateFiltered = tracker.getMemberHistory('MEM-001', {
        startDate: '2025-01-03',
        endDate: '2025-01-12'
      });
      expect(dateFiltered.payments).toHaveLength(1);
      expect(dateFiltered.payments[0].id).toBe('PAY-002');

      // Pagination
      const paginated = tracker.getMemberHistory('MEM-001', {
        limit: 2,
        offset: 1
      });
      expect(paginated.payments).toHaveLength(2);

      // Sort by amount ascending
      const sorted = tracker.getMemberHistory('MEM-001', {
        sortBy: 'amount',
        sortOrder: 'asc'
      });
      expect(sorted.payments[0].amount).toBe(75);
      expect(sorted.payments[2].amount).toBe(150);
    });

    test('should generate comprehensive summary report', () => {
      const report = tracker.generateSummaryReport('2025-01-01', '2025-01-31');

      expect(report.totalPayments).toBe(4);
      expect(report.totalAmount).toBe(525); // 100 + 150 + 200 + 75

      // By status
      expect(report.byStatus.completed).toBe(3);
      expect(report.byStatus.failed).toBe(1);

      // By currency
      expect(report.byCurrency.SAR.count).toBe(3);
      expect(report.byCurrency.SAR.total).toBe(325); // 100 + 150 + 75
      expect(report.byCurrency.KWD.count).toBe(1);
      expect(report.byCurrency.KWD.total).toBe(200);

      // By member
      expect(report.byMember['MEM-001'].count).toBe(3);
      expect(report.byMember['MEM-001'].total).toBe(325);
      expect(report.byMember['MEM-002'].count).toBe(1);
      expect(report.byMember['MEM-002'].total).toBe(200);

      // Daily breakdown
      expect(report.dailyBreakdown).toHaveLength(4);
      expect(report.dailyBreakdown[0].date).toBe('2025-01-01');
    });

    test('should calculate member payment statistics', () => {
      const stats = tracker.getPaymentStatistics('MEM-001');

      expect(stats.totalPayments).toBe(3);
      expect(stats.completedPayments).toBe(2);
      expect(stats.totalAmount).toBe(250); // 100 + 150 (completed only)
      expect(stats.averageAmount).toBe(125);
      expect(stats.maxAmount).toBe(150);
      expect(stats.minAmount).toBe(100);
      expect(stats.firstPayment).toBe('2025-01-01T10:00:00.000Z');
      expect(stats.lastPayment).toBe('2025-01-15T10:00:00.000Z');
      expect(stats.paymentsPerMonth).toBe(3); // 3 payments in 1 month

      // Member with no payments
      const noStats = tracker.getPaymentStatistics('MEM-999');
      expect(noStats).toBeNull();
    });
  });
});