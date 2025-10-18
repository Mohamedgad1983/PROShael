/**
 * Refund Processing Tests
 * Phase 2: Payment Processing Testing - Refunds (4 tests)
 */

import { jest } from '@jest/globals';

describe('Refund Processing Tests', () => {
  class RefundProcessor {
    constructor() {
      this.refunds = new Map();
      this.refundCounter = 1;
      this.refundPolicies = {
        standard: {
          maxRefundDays: 30,
          processingFee: 0.02, // 2%
          minRefundAmount: 1
        },
        premium: {
          maxRefundDays: 90,
          processingFee: 0,
          minRefundAmount: 0
        },
        noRefund: {
          maxRefundDays: 0,
          processingFee: 1, // 100% fee means no refund
          minRefundAmount: Infinity
        }
      };
    }

    validateRefundRequest(payment, refundAmount, policy = 'standard') {
      const errors = [];
      const policyRules = this.refundPolicies[policy];

      // Check if payment exists and is completed
      if (!payment) {
        errors.push('Payment not found');
        return errors;
      }

      if (payment.status !== 'completed') {
        errors.push(`Cannot refund payment with status ${payment.status}`);
      }

      // Check refund amount
      if (refundAmount <= 0) {
        errors.push('Refund amount must be positive');
      }

      if (refundAmount > payment.amount) {
        errors.push('Refund amount cannot exceed original payment amount');
      }

      if (refundAmount < policyRules.minRefundAmount) {
        errors.push(`Refund amount below minimum of ${policyRules.minRefundAmount}`);
      }

      // Check time limit
      const paymentDate = new Date(payment.completedAt);
      const daysSincePayment = Math.floor((Date.now() - paymentDate) / (1000 * 60 * 60 * 24));

      if (daysSincePayment > policyRules.maxRefundDays) {
        errors.push(`Refund period expired (${policyRules.maxRefundDays} days limit)`);
      }

      // Check if already refunded
      if (payment.refundedAmount >= payment.amount) {
        errors.push('Payment already fully refunded');
      }

      return errors;
    }

    processRefund(payment, refundAmount, reason, policy = 'standard') {
      const errors = this.validateRefundRequest(payment, refundAmount, policy);

      if (errors.length > 0) {
        throw new Error(`Refund validation failed: ${errors.join('; ')}`);
      }

      const policyRules = this.refundPolicies[policy];
      const processingFee = refundAmount * policyRules.processingFee;
      const netRefundAmount = refundAmount - processingFee;

      const refundId = `REF-${this.refundCounter++}-${Date.now()}`;
      const refund = {
        id: refundId,
        paymentId: payment.id,
        originalAmount: payment.amount,
        refundAmount: refundAmount,
        processingFee: Number(processingFee.toFixed(2)),
        netRefundAmount: Number(netRefundAmount.toFixed(2)),
        reason: reason,
        policy: policy,
        status: 'processing',
        createdAt: new Date().toISOString(),
        processedAt: null
      };

      this.refunds.set(refundId, refund);

      // Update payment refund tracking
      payment.refundedAmount = (payment.refundedAmount || 0) + refundAmount;
      payment.refunds = payment.refunds || [];
      payment.refunds.push(refundId);

      return refund;
    }

    completeRefund(refundId) {
      const refund = this.refunds.get(refundId);

      if (!refund) {
        throw new Error(`Refund ${refundId} not found`);
      }

      if (refund.status !== 'processing') {
        throw new Error(`Cannot complete refund with status ${refund.status}`);
      }

      refund.status = 'completed';
      refund.processedAt = new Date().toISOString();

      return refund;
    }

    calculatePartialRefund(payment, percentage) {
      if (percentage <= 0 || percentage > 100) {
        throw new Error('Percentage must be between 0 and 100');
      }

      const refundAmount = (payment.amount * percentage) / 100;
      const alreadyRefunded = payment.refundedAmount || 0;
      const remainingRefundable = payment.amount - alreadyRefunded;

      return {
        requestedAmount: Number(refundAmount.toFixed(2)),
        alreadyRefunded: alreadyRefunded,
        remainingRefundable: Number(remainingRefundable.toFixed(2)),
        canRefund: refundAmount <= remainingRefundable
      };
    }
  }

  describe('Refund Operations', () => {
    let processor;
    let completedPayment;

    beforeEach(() => {
      processor = new RefundProcessor();
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-15'));

      completedPayment = {
        id: 'PAY-001',
        amount: 100,
        status: 'completed',
        completedAt: new Date('2025-01-10').toISOString(),
        refundedAmount: 0
      };
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should process full refund within policy limits', () => {
      const refund = processor.processRefund(
        completedPayment,
        100,
        'customer_request',
        'standard'
      );

      expect(refund).toHaveProperty('id');
      expect(refund.id).toMatch(/^REF-\d+-\d+$/);
      expect(refund.paymentId).toBe('PAY-001');
      expect(refund.refundAmount).toBe(100);
      expect(refund.processingFee).toBe(2); // 2% fee
      expect(refund.netRefundAmount).toBe(98);
      expect(refund.reason).toBe('customer_request');
      expect(refund.status).toBe('processing');

      // Payment should track refund
      expect(completedPayment.refundedAmount).toBe(100);
      expect(completedPayment.refunds).toContain(refund.id);
    });

    test('should handle partial refunds correctly', () => {
      // First partial refund
      const refund1 = processor.processRefund(
        completedPayment,
        30,
        'partial_return',
        'standard'
      );

      expect(refund1.refundAmount).toBe(30);
      expect(completedPayment.refundedAmount).toBe(30);

      // Second partial refund
      const refund2 = processor.processRefund(
        completedPayment,
        50,
        'quality_issue',
        'standard'
      );

      expect(refund2.refundAmount).toBe(50);
      expect(completedPayment.refundedAmount).toBe(80);

      // Calculate remaining refundable
      const partialCalc = processor.calculatePartialRefund(completedPayment, 25);
      expect(partialCalc.requestedAmount).toBe(25);
      expect(partialCalc.alreadyRefunded).toBe(80);
      expect(partialCalc.remainingRefundable).toBe(20);
      expect(partialCalc.canRefund).toBe(false); // 25 > 20 remaining

      // Try to exceed refund limit
      expect(() => {
        processor.processRefund(completedPayment, 30, 'excess_refund');
      }).toThrow(/Refund amount cannot exceed/);
    });

    test('should enforce refund time limits based on policy', () => {
      // Standard policy - 30 days limit
      const oldPayment = {
        id: 'PAY-002',
        amount: 100,
        status: 'completed',
        completedAt: new Date('2024-12-01').toISOString(), // 45 days ago
        refundedAmount: 0
      };

      expect(() => {
        processor.processRefund(oldPayment, 50, 'too_late', 'standard');
      }).toThrow(/Refund period expired/);

      // Premium policy - 90 days limit (should work)
      const premiumRefund = processor.processRefund(
        oldPayment,
        50,
        'premium_member',
        'premium'
      );

      expect(premiumRefund).toBeDefined();
      expect(premiumRefund.processingFee).toBe(0); // No fee for premium
      expect(premiumRefund.netRefundAmount).toBe(50);

      // No refund policy
      const recentPayment = {
        id: 'PAY-003',
        amount: 100,
        status: 'completed',
        completedAt: new Date('2025-01-14').toISOString(), // yesterday
        refundedAmount: 0
      };

      expect(() => {
        processor.processRefund(recentPayment, 50, 'no_refunds', 'noRefund');
      }).toThrow(/Refund period expired/);
    });

    test('should complete refund processing workflow', () => {
      // Create refund
      const refund = processor.processRefund(
        completedPayment,
        50,
        'defective_item'
      );

      expect(refund.status).toBe('processing');
      expect(refund.processedAt).toBeNull();

      // Complete the refund
      const completed = processor.completeRefund(refund.id);

      expect(completed.status).toBe('completed');
      expect(completed.processedAt).toBeDefined();

      // Cannot complete again
      expect(() => {
        processor.completeRefund(refund.id);
      }).toThrow(/Cannot complete refund with status completed/);
    });
  });
});