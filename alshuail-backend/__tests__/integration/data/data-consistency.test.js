/**
 * Data Consistency Checks Tests
 * Phase 2: Data Integrity Testing - Data Consistency (3 tests)
 */

import { jest } from '@jest/globals';

describe('Data Consistency Tests', () => {
  class DataConsistencyChecker {
    constructor() {
      this.data = {
        members: new Map(),
        payments: new Map(),
        subscriptions: new Map(),
        balances: new Map()
      };

      this.consistencyRules = {
        balances: {
          // Balance must equal sum of payments minus refunds
          check: (memberId) => {
            const payments = this.getMemberPayments(memberId);
            const calculatedBalance = payments.reduce((sum, payment) => {
              if (payment.status === 'completed') {
                return sum + payment.amount - (payment.refundAmount || 0);
              }
              return sum;
            }, 0);

            const recordedBalance = this.data.balances.get(memberId)?.amount || 0;
            return {
              consistent: Math.abs(calculatedBalance - recordedBalance) < 0.01,
              calculated: calculatedBalance,
              recorded: recordedBalance,
              difference: calculatedBalance - recordedBalance
            };
          }
        },
        subscriptions: {
          // Active subscriptions must have valid dates
          check: (memberId) => {
            const subscriptions = this.getMemberSubscriptions(memberId);
            const now = new Date();
            const inconsistencies = [];

            subscriptions.forEach(sub => {
              const startDate = new Date(sub.startDate);
              const endDate = new Date(sub.endDate);

              if (sub.isActive) {
                if (endDate < now) {
                  inconsistencies.push({
                    id: sub.id,
                    issue: 'Active subscription with past end date',
                    endDate: sub.endDate
                  });
                }
                if (startDate > now) {
                  inconsistencies.push({
                    id: sub.id,
                    issue: 'Active subscription with future start date',
                    startDate: sub.startDate
                  });
                }
              } else {
                if (startDate <= now && endDate >= now) {
                  inconsistencies.push({
                    id: sub.id,
                    issue: 'Inactive subscription within valid date range',
                    dateRange: `${sub.startDate} to ${sub.endDate}`
                  });
                }
              }
            });

            return {
              consistent: inconsistencies.length === 0,
              inconsistencies
            };
          }
        },
        payments: {
          // Payment statuses must follow valid transitions
          check: () => {
            const invalidTransitions = [];
            const paymentHistory = new Map();

            // Track status transitions
            for (const [id, payment] of this.data.payments) {
              if (payment.previousStatus) {
                const transition = `${payment.previousStatus} → ${payment.status}`;
                if (!this.isValidTransition(payment.previousStatus, payment.status)) {
                  invalidTransitions.push({
                    paymentId: id,
                    transition,
                    timestamp: payment.updatedAt
                  });
                }
              }
            }

            return {
              consistent: invalidTransitions.length === 0,
              invalidTransitions
            };
          }
        }
      };
    }

    getMemberPayments(memberId) {
      const payments = [];
      for (const [id, payment] of this.data.payments) {
        if (payment.memberId === memberId) {
          payments.push(payment);
        }
      }
      return payments;
    }

    getMemberSubscriptions(memberId) {
      const subscriptions = [];
      for (const [id, subscription] of this.data.subscriptions) {
        if (subscription.memberId === memberId) {
          subscriptions.push(subscription);
        }
      }
      return subscriptions;
    }

    isValidTransition(from, to) {
      const validTransitions = {
        'pending': ['processing', 'cancelled', 'failed'],
        'processing': ['completed', 'failed', 'cancelled'],
        'completed': ['refunded'],
        'failed': ['pending'],
        'cancelled': [],
        'refunded': []
      };

      return (validTransitions[from] || []).includes(to);
    }

    runConsistencyCheck(entity, entityId = null) {
      const rule = this.consistencyRules[entity];
      if (!rule) {
        throw new Error(`No consistency rules defined for ${entity}`);
      }

      return rule.check(entityId);
    }

    runFullConsistencyCheck() {
      const results = {
        overall: true,
        checks: {}
      };

      // Check balance consistency for all members
      const memberIds = new Set();
      for (const payment of this.data.payments.values()) {
        memberIds.add(payment.memberId);
      }

      results.checks.balances = [];
      for (const memberId of memberIds) {
        const check = this.runConsistencyCheck('balances', memberId);
        if (!check.consistent) {
          results.overall = false;
        }
        results.checks.balances.push({
          memberId,
          ...check
        });
      }

      // Check subscription consistency
      results.checks.subscriptions = [];
      for (const memberId of memberIds) {
        const check = this.runConsistencyCheck('subscriptions', memberId);
        if (!check.consistent) {
          results.overall = false;
        }
        results.checks.subscriptions.push({
          memberId,
          ...check
        });
      }

      // Check payment transitions
      const paymentCheck = this.runConsistencyCheck('payments');
      results.checks.payments = paymentCheck;
      if (!paymentCheck.consistent) {
        results.overall = false;
      }

      return results;
    }

    reconcileBalances() {
      const reconciliations = [];

      // Get all unique member IDs
      const memberIds = new Set();
      for (const payment of this.data.payments.values()) {
        memberIds.add(payment.memberId);
      }

      for (const memberId of memberIds) {
        const balanceCheck = this.runConsistencyCheck('balances', memberId);

        if (!balanceCheck.consistent) {
          // Fix the inconsistency
          const oldBalance = this.data.balances.get(memberId)?.amount || 0;
          this.data.balances.set(memberId, {
            memberId,
            amount: balanceCheck.calculated,
            lastReconciled: new Date().toISOString()
          });

          reconciliations.push({
            memberId,
            oldBalance,
            newBalance: balanceCheck.calculated,
            adjustment: balanceCheck.difference
          });
        }
      }

      return {
        reconciled: reconciliations.length,
        adjustments: reconciliations
      };
    }
  }

  describe('Data Consistency Operations', () => {
    let checker;

    beforeEach(() => {
      checker = new DataConsistencyChecker();
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-15T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should detect balance inconsistencies and reconcile', () => {
      // Setup test data
      checker.data.payments.set('PAY-001', {
        id: 'PAY-001',
        memberId: 'MEM-001',
        amount: 100,
        status: 'completed'
      });

      checker.data.payments.set('PAY-002', {
        id: 'PAY-002',
        memberId: 'MEM-001',
        amount: 150,
        status: 'completed',
        refundAmount: 50
      });

      checker.data.payments.set('PAY-003', {
        id: 'PAY-003',
        memberId: 'MEM-001',
        amount: 75,
        status: 'pending' // Should not count
      });

      // Set incorrect balance
      checker.data.balances.set('MEM-001', {
        memberId: 'MEM-001',
        amount: 250 // Should be 200 (100 + 150 - 50)
      });

      // Check balance consistency
      const balanceCheck = checker.runConsistencyCheck('balances', 'MEM-001');
      expect(balanceCheck.consistent).toBe(false);
      expect(balanceCheck.calculated).toBe(200);
      expect(balanceCheck.recorded).toBe(250);
      expect(balanceCheck.difference).toBe(-50);

      // Reconcile balances
      const reconciliation = checker.reconcileBalances();
      expect(reconciliation.reconciled).toBe(1);
      expect(reconciliation.adjustments[0]).toEqual({
        memberId: 'MEM-001',
        oldBalance: 250,
        newBalance: 200,
        adjustment: -50
      });

      // Verify balance is now correct
      const afterCheck = checker.runConsistencyCheck('balances', 'MEM-001');
      expect(afterCheck.consistent).toBe(true);
    });

    test('should detect subscription date inconsistencies', () => {
      const now = new Date('2025-01-15T12:00:00Z');

      // Active subscription with past end date (inconsistent)
      checker.data.subscriptions.set('SUB-001', {
        id: 'SUB-001',
        memberId: 'MEM-001',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        isActive: true // Should be false
      });

      // Active subscription with future start date (inconsistent)
      checker.data.subscriptions.set('SUB-002', {
        id: 'SUB-002',
        memberId: 'MEM-001',
        startDate: '2025-02-01',
        endDate: '2025-12-31',
        isActive: true // Should be false
      });

      // Inactive subscription within valid range (inconsistent)
      checker.data.subscriptions.set('SUB-003', {
        id: 'SUB-003',
        memberId: 'MEM-001',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        isActive: false // Should be true
      });

      // Valid active subscription
      checker.data.subscriptions.set('SUB-004', {
        id: 'SUB-004',
        memberId: 'MEM-001',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        isActive: true
      });

      // Check subscription consistency
      const subCheck = checker.runConsistencyCheck('subscriptions', 'MEM-001');
      expect(subCheck.consistent).toBe(false);
      expect(subCheck.inconsistencies).toHaveLength(3);

      // Check specific inconsistencies
      expect(subCheck.inconsistencies).toContainEqual({
        id: 'SUB-001',
        issue: 'Active subscription with past end date',
        endDate: '2024-12-31'
      });

      expect(subCheck.inconsistencies).toContainEqual({
        id: 'SUB-002',
        issue: 'Active subscription with future start date',
        startDate: '2025-02-01'
      });

      expect(subCheck.inconsistencies).toContainEqual({
        id: 'SUB-003',
        issue: 'Inactive subscription within valid date range',
        dateRange: '2025-01-01 to 2025-12-31'
      });
    });

    test('should validate payment status transitions and detect violations', () => {
      // Valid transitions
      checker.data.payments.set('PAY-001', {
        id: 'PAY-001',
        memberId: 'MEM-001',
        previousStatus: 'pending',
        status: 'processing'
      });

      checker.data.payments.set('PAY-002', {
        id: 'PAY-002',
        memberId: 'MEM-001',
        previousStatus: 'processing',
        status: 'completed'
      });

      // Invalid transitions
      checker.data.payments.set('PAY-003', {
        id: 'PAY-003',
        memberId: 'MEM-001',
        previousStatus: 'pending',
        status: 'completed', // Should go through processing
        updatedAt: '2025-01-15T10:00:00Z'
      });

      checker.data.payments.set('PAY-004', {
        id: 'PAY-004',
        memberId: 'MEM-001',
        previousStatus: 'cancelled',
        status: 'completed', // Cannot transition from cancelled
        updatedAt: '2025-01-15T11:00:00Z'
      });

      // Check payment transition consistency
      const paymentCheck = checker.runConsistencyCheck('payments');
      expect(paymentCheck.consistent).toBe(false);
      expect(paymentCheck.invalidTransitions).toHaveLength(2);

      expect(paymentCheck.invalidTransitions).toContainEqual({
        paymentId: 'PAY-003',
        transition: 'pending → completed',
        timestamp: '2025-01-15T10:00:00Z'
      });

      expect(paymentCheck.invalidTransitions).toContainEqual({
        paymentId: 'PAY-004',
        transition: 'cancelled → completed',
        timestamp: '2025-01-15T11:00:00Z'
      });

      // Run full consistency check
      const fullCheck = checker.runFullConsistencyCheck();
      expect(fullCheck.overall).toBe(false);
      expect(fullCheck.checks.payments.consistent).toBe(false);
    });
  });
});