/**
 * Payment Status Transitions Tests
 * Phase 2: Payment Processing Testing - Status Management (5 tests)
 */

import { jest } from '@jest/globals';

describe('Payment Status Transitions Tests', () => {
  class PaymentStatusManager {
    constructor() {
      this.validStatuses = ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'];
      this.statusTransitions = {
        'pending': ['processing', 'cancelled', 'failed'],
        'processing': ['completed', 'failed', 'cancelled'],
        'completed': ['refunded'],
        'failed': ['pending'], // Can retry
        'cancelled': [], // Terminal state
        'refunded': [] // Terminal state
      };
      this.statusHistory = new Map();
    }

    isValidStatus(status) {
      return this.validStatuses.includes(status);
    }

    canTransition(fromStatus, toStatus) {
      if (!this.isValidStatus(fromStatus) || !this.isValidStatus(toStatus)) {
        return false;
      }

      const allowedTransitions = this.statusTransitions[fromStatus] || [];
      return allowedTransitions.includes(toStatus);
    }

    transitionStatus(paymentId, currentStatus, newStatus, metadata = {}) {
      if (!this.canTransition(currentStatus, newStatus)) {
        throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
      }

      // Initialize history if needed
      if (!this.statusHistory.has(paymentId)) {
        this.statusHistory.set(paymentId, []);
      }

      // Record transition
      const transition = {
        from: currentStatus,
        to: newStatus,
        timestamp: new Date().toISOString(),
        metadata
      };

      this.statusHistory.get(paymentId).push(transition);

      return {
        paymentId,
        status: newStatus,
        previousStatus: currentStatus,
        transitionTime: transition.timestamp
      };
    }

    getStatusHistory(paymentId) {
      return this.statusHistory.get(paymentId) || [];
    }

    isTerminalStatus(status) {
      const transitions = this.statusTransitions[status] || [];
      return transitions.length === 0;
    }
  }

  describe('Payment Status Operations', () => {
    let statusManager;

    beforeEach(() => {
      statusManager = new PaymentStatusManager();
    });

    test('should validate status transitions correctly', () => {
      // Valid transitions
      expect(statusManager.canTransition('pending', 'processing')).toBe(true);
      expect(statusManager.canTransition('processing', 'completed')).toBe(true);
      expect(statusManager.canTransition('completed', 'refunded')).toBe(true);
      expect(statusManager.canTransition('failed', 'pending')).toBe(true);

      // Invalid transitions
      expect(statusManager.canTransition('pending', 'completed')).toBe(false);
      expect(statusManager.canTransition('completed', 'processing')).toBe(false);
      expect(statusManager.canTransition('cancelled', 'completed')).toBe(false);
      expect(statusManager.canTransition('refunded', 'pending')).toBe(false);
    });

    test('should track complete payment lifecycle', () => {
      const paymentId = 'PAY-001';

      // Pending → Processing
      const transition1 = statusManager.transitionStatus(
        paymentId,
        'pending',
        'processing',
        { processor: 'stripe', attemptNumber: 1 }
      );

      expect(transition1.status).toBe('processing');
      expect(transition1.previousStatus).toBe('pending');

      // Processing → Completed
      const transition2 = statusManager.transitionStatus(
        paymentId,
        'processing',
        'completed',
        { transactionId: 'TXN-123', amount: 150.00 }
      );

      expect(transition2.status).toBe('completed');

      // Get history
      const history = statusManager.getStatusHistory(paymentId);
      expect(history).toHaveLength(2);
      expect(history[0].from).toBe('pending');
      expect(history[0].to).toBe('processing');
      expect(history[1].from).toBe('processing');
      expect(history[1].to).toBe('completed');
    });

    test('should handle failure and retry scenarios', () => {
      const paymentId = 'PAY-002';

      // Pending → Processing
      statusManager.transitionStatus(paymentId, 'pending', 'processing');

      // Processing → Failed
      statusManager.transitionStatus(
        paymentId,
        'processing',
        'failed',
        { error: 'Insufficient funds', errorCode: 'INSUFFICIENT_FUNDS' }
      );

      // Failed → Pending (retry)
      const retryTransition = statusManager.transitionStatus(
        paymentId,
        'failed',
        'pending',
        { retryAttempt: 1, retryReason: 'User added funds' }
      );

      expect(retryTransition.status).toBe('pending');

      // Check history shows retry
      const history = statusManager.getStatusHistory(paymentId);
      expect(history).toHaveLength(3);
      expect(history[2].from).toBe('failed');
      expect(history[2].to).toBe('pending');
      expect(history[2].metadata.retryAttempt).toBe(1);
    });

    test('should prevent invalid status transitions', () => {
      const paymentId = 'PAY-003';

      // Try invalid transition: pending → completed (skipping processing)
      expect(() => {
        statusManager.transitionStatus(paymentId, 'pending', 'completed');
      }).toThrow(/Invalid status transition from pending to completed/);

      // Try transition from terminal state
      expect(() => {
        statusManager.transitionStatus(paymentId, 'cancelled', 'processing');
      }).toThrow(/Invalid status transition from cancelled to processing/);

      // Try transition from refunded (terminal)
      expect(() => {
        statusManager.transitionStatus(paymentId, 'refunded', 'completed');
      }).toThrow(/Invalid status transition from refunded to completed/);
    });

    test('should identify terminal states correctly', () => {
      // Terminal states
      expect(statusManager.isTerminalStatus('cancelled')).toBe(true);
      expect(statusManager.isTerminalStatus('refunded')).toBe(true);

      // Non-terminal states
      expect(statusManager.isTerminalStatus('pending')).toBe(false);
      expect(statusManager.isTerminalStatus('processing')).toBe(false);
      expect(statusManager.isTerminalStatus('completed')).toBe(false);
      expect(statusManager.isTerminalStatus('failed')).toBe(false);
    });
  });
});