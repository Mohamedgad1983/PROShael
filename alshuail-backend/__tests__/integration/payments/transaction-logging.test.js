/**
 * Transaction Logging Tests
 * Phase 2: Payment Processing Testing - Transaction Logging (3 tests)
 */

import { jest } from '@jest/globals';

describe('Transaction Logging Tests', () => {
  class TransactionLogger {
    constructor() {
      this.logs = [];
      this.auditTrail = new Map();
    }

    logTransaction(transaction) {
      const logEntry = {
        id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        transactionId: transaction.id,
        type: transaction.type || 'payment',
        amount: transaction.amount,
        currency: transaction.currency,
        memberId: transaction.memberId,
        status: transaction.status,
        metadata: transaction.metadata || {},
        ipAddress: transaction.ipAddress,
        userAgent: transaction.userAgent,
        checksum: this.calculateChecksum(transaction)
      };

      this.logs.push(logEntry);

      // Add to audit trail
      if (!this.auditTrail.has(transaction.memberId)) {
        this.auditTrail.set(transaction.memberId, []);
      }
      this.auditTrail.get(transaction.memberId).push(logEntry);

      return logEntry;
    }

    calculateChecksum(transaction) {
      // Simple checksum for integrity
      const data = `${transaction.id}|${transaction.amount}|${transaction.currency}|${transaction.memberId}`;
      let hash = 0;
      for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return Math.abs(hash).toString(16);
    }

    getTransactionLogs(filters = {}) {
      let filtered = [...this.logs];

      if (filters.memberId) {
        filtered = filtered.filter(log => log.memberId === filters.memberId);
      }

      if (filters.startDate) {
        filtered = filtered.filter(log => new Date(log.timestamp) >= new Date(filters.startDate));
      }

      if (filters.endDate) {
        filtered = filtered.filter(log => new Date(log.timestamp) <= new Date(filters.endDate));
      }

      if (filters.status) {
        filtered = filtered.filter(log => log.status === filters.status);
      }

      if (filters.minAmount !== undefined) {
        filtered = filtered.filter(log => log.amount >= filters.minAmount);
      }

      return filtered;
    }

    getMemberAuditTrail(memberId) {
      return this.auditTrail.get(memberId) || [];
    }

    verifyLogIntegrity(logEntry) {
      const recalculatedChecksum = this.calculateChecksum({
        id: logEntry.transactionId,
        amount: logEntry.amount,
        currency: logEntry.currency,
        memberId: logEntry.memberId
      });

      return recalculatedChecksum === logEntry.checksum;
    }
  }

  describe('Transaction Logging Operations', () => {
    let logger;

    beforeEach(() => {
      logger = new TransactionLogger();
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-15T10:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should log transaction with complete audit information', () => {
      const transaction = {
        id: 'TXN-001',
        type: 'payment',
        amount: 250.00,
        currency: 'SAR',
        memberId: 'MEM-001',
        status: 'completed',
        metadata: {
          paymentMethod: 'card',
          cardLast4: '1234'
        },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0'
      };

      const logEntry = logger.logTransaction(transaction);

      expect(logEntry).toHaveProperty('id');
      expect(logEntry.id).toMatch(/^LOG-\d+-[a-z0-9]+$/);
      expect(logEntry.transactionId).toBe('TXN-001');
      expect(logEntry.amount).toBe(250.00);
      expect(logEntry.currency).toBe('SAR');
      expect(logEntry.status).toBe('completed');
      expect(logEntry.metadata.paymentMethod).toBe('card');
      expect(logEntry.ipAddress).toBe('192.168.1.100');
      expect(logEntry.checksum).toBeDefined();
      expect(logEntry.timestamp).toBe('2025-01-15T10:00:00.000Z');
    });

    test('should filter transaction logs by various criteria', () => {
      // Create multiple transactions
      const transactions = [
        {
          id: 'TXN-001',
          amount: 100,
          currency: 'SAR',
          memberId: 'MEM-001',
          status: 'completed'
        },
        {
          id: 'TXN-002',
          amount: 200,
          currency: 'KWD',
          memberId: 'MEM-002',
          status: 'pending'
        },
        {
          id: 'TXN-003',
          amount: 150,
          currency: 'SAR',
          memberId: 'MEM-001',
          status: 'completed'
        },
        {
          id: 'TXN-004',
          amount: 50,
          currency: 'USD',
          memberId: 'MEM-003',
          status: 'failed'
        }
      ];

      transactions.forEach((txn, index) => {
        jest.advanceTimersByTime(60000 * index); // Advance by 1 minute for each
        logger.logTransaction(txn);
      });

      // Filter by member
      const memberLogs = logger.getTransactionLogs({ memberId: 'MEM-001' });
      expect(memberLogs).toHaveLength(2);
      expect(memberLogs.every(log => log.memberId === 'MEM-001')).toBe(true);

      // Filter by status
      const completedLogs = logger.getTransactionLogs({ status: 'completed' });
      expect(completedLogs).toHaveLength(2);

      // Filter by amount
      const highValueLogs = logger.getTransactionLogs({ minAmount: 150 });
      expect(highValueLogs).toHaveLength(2);
      expect(highValueLogs.every(log => log.amount >= 150)).toBe(true);

      // Combined filters
      const combinedFilter = logger.getTransactionLogs({
        memberId: 'MEM-001',
        status: 'completed',
        minAmount: 100
      });
      expect(combinedFilter).toHaveLength(2);
    });

    test('should maintain audit trail and verify log integrity', () => {
      const transactions = [
        {
          id: 'TXN-001',
          amount: 100,
          currency: 'SAR',
          memberId: 'MEM-001',
          status: 'completed'
        },
        {
          id: 'TXN-002',
          amount: 200,
          currency: 'SAR',
          memberId: 'MEM-001',
          status: 'completed'
        }
      ];

      const logEntries = transactions.map(txn => logger.logTransaction(txn));

      // Check audit trail for member
      const auditTrail = logger.getMemberAuditTrail('MEM-001');
      expect(auditTrail).toHaveLength(2);
      expect(auditTrail[0].transactionId).toBe('TXN-001');
      expect(auditTrail[1].transactionId).toBe('TXN-002');

      // Verify integrity of logs
      logEntries.forEach(logEntry => {
        const isValid = logger.verifyLogIntegrity(logEntry);
        expect(isValid).toBe(true);
      });

      // Tamper with a log and check integrity fails
      const tamperedLog = { ...logEntries[0], amount: 999 };
      const isTamperedValid = logger.verifyLogIntegrity(tamperedLog);
      expect(isTamperedValid).toBe(false);
    });
  });
});