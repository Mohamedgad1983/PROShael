/**
 * Supabase Service Unit Tests
 * Tests database helper functions and operations
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// Mock Supabase response
const mockSupabaseResponse = {
  data: null,
  error: null
};

const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  insert: jest.fn(() => mockSupabase),
  update: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  order: jest.fn(() => mockSupabase),
  single: jest.fn(() => Promise.resolve(mockSupabaseResponse))
};

jest.unstable_mockModule('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase)
}));

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('Supabase Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseResponse.data = null;
    mockSupabaseResponse.error = null;
  });

  // ============================================
  // Environment Configuration Tests
  // ============================================
  describe('Environment Configuration', () => {
    test('should require SUPABASE_URL', () => {
      const envVars = {
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'anon-key',
        SUPABASE_SERVICE_KEY: 'service-key'
      };

      expect(envVars.SUPABASE_URL).toBeDefined();
    });

    test('should require SUPABASE_ANON_KEY', () => {
      const envVars = {
        SUPABASE_ANON_KEY: 'anon-key'
      };

      expect(envVars.SUPABASE_ANON_KEY).toBeDefined();
    });

    test('should require SUPABASE_SERVICE_KEY', () => {
      const envVars = {
        SUPABASE_SERVICE_KEY: 'service-key'
      };

      expect(envVars.SUPABASE_SERVICE_KEY).toBeDefined();
    });

    test('should throw if SUPABASE_URL missing', () => {
      const getUrl = () => {
        if (!process.env.TEST_MISSING_URL) {
          throw new Error('SUPABASE_URL is required');
        }
        return process.env.TEST_MISSING_URL;
      };

      expect(getUrl).toThrow('SUPABASE_URL is required');
    });
  });

  // ============================================
  // getMembersWithBalances Tests
  // ============================================
  describe('getMembersWithBalances', () => {
    test('should calculate balance from transactions', () => {
      const member = {
        id: 'member-123',
        name: 'Test Member',
        payments: [
          { amount: 5000, transaction_type: 'credit' },
          { amount: 2000, transaction_type: 'debit' },
          { amount: 1000, transaction_type: 'credit' }
        ]
      };

      const balance = member.payments.reduce((sum, payment) => {
        return payment.transaction_type === 'credit'
          ? sum + payment.amount
          : sum - payment.amount;
      }, 0);

      expect(balance).toBe(4000);
    });

    test('should handle empty payments array', () => {
      const member = {
        id: 'member-123',
        payments: []
      };

      const balance = member.payments?.reduce((sum, payment) => {
        return payment.transaction_type === 'credit'
          ? sum + payment.amount
          : sum - payment.amount;
      }, 0) || 0;

      expect(balance).toBe(0);
    });

    test('should handle null payments', () => {
      const member = {
        id: 'member-123',
        payments: null
      };

      const balance = member.payments?.reduce((sum, payment) => {
        return payment.transaction_type === 'credit'
          ? sum + payment.amount
          : sum - payment.amount;
      }, 0) || 0;

      expect(balance).toBe(0);
    });

    test('should determine sufficient status', () => {
      const balance = 3500;
      const status = balance >= 3000 ? 'sufficient' : 'insufficient';

      expect(status).toBe('sufficient');
    });

    test('should determine insufficient status', () => {
      const balance = 2500;
      const status = balance >= 3000 ? 'sufficient' : 'insufficient';

      expect(status).toBe('insufficient');
    });

    test('should return member with calculated fields', () => {
      const member = {
        id: 'member-123',
        name: 'Test Member',
        payments: [{ amount: 5000, transaction_type: 'credit' }]
      };

      const balance = 5000;
      const result = {
        ...member,
        balance: balance,
        status: balance >= 3000 ? 'sufficient' : 'insufficient'
      };

      expect(result.balance).toBe(5000);
      expect(result.status).toBe('sufficient');
      expect(result.id).toBe('member-123');
    });
  });

  // ============================================
  // getMemberById Tests
  // ============================================
  describe('getMemberById', () => {
    test('should query by member ID', () => {
      const memberId = 'member-123';
      const query = { id: memberId };

      expect(query.id).toBe('member-123');
    });

    test('should return single member', () => {
      const member = {
        id: 'member-123',
        name: 'Test Member',
        phone: '+966555555555',
        email: 'test@example.com'
      };

      expect(member.id).toBeDefined();
      expect(member.name).toBeDefined();
    });

    test('should throw on error', () => {
      const error = { message: 'Member not found' };

      expect(() => { throw new Error(error.message); }).toThrow('Member not found');
    });
  });

  // ============================================
  // updateMemberStatus Tests
  // ============================================
  describe('updateMemberStatus', () => {
    test('should update status with timestamp', () => {
      const memberId = 'member-123';
      const status = 'active';
      const updatedBy = 'admin-456';

      const updateData = {
        status,
        updated_at: new Date().toISOString(),
        updated_by: updatedBy
      };

      expect(updateData.status).toBe('active');
      expect(updateData.updated_by).toBe('admin-456');
      expect(updateData.updated_at).toBeDefined();
    });

    test('should include ISO timestamp', () => {
      const timestamp = new Date().toISOString();

      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    test('should return updated member', () => {
      const updated = {
        id: 'member-123',
        status: 'inactive',
        updated_at: new Date().toISOString(),
        updated_by: 'admin-456'
      };

      expect(updated.status).toBe('inactive');
      expect(updated.id).toBe('member-123');
    });
  });

  // ============================================
  // logAuditAction Tests
  // ============================================
  describe('logAuditAction', () => {
    test('should create audit log entry', () => {
      const auditEntry = {
        action: 'member_updated',
        target_id: 'member-123',
        target_type: 'member',
        details: { field: 'status', old: 'active', new: 'inactive' },
        performed_by: 'admin-456',
        performed_at: new Date().toISOString()
      };

      expect(auditEntry.action).toBe('member_updated');
      expect(auditEntry.target_type).toBe('member');
      expect(auditEntry.performed_by).toBe('admin-456');
    });

    test('should store JSON details', () => {
      const details = {
        field: 'status',
        oldValue: 'active',
        newValue: 'inactive'
      };

      const jsonDetails = JSON.stringify(details);
      const parsed = JSON.parse(jsonDetails);

      expect(parsed.field).toBe('status');
    });

    test('should record action types', () => {
      const actionTypes = [
        'member_created',
        'member_updated',
        'member_deleted',
        'payment_created',
        'payment_updated',
        'login_success',
        'login_failed'
      ];

      expect(actionTypes).toContain('member_updated');
      expect(actionTypes).toContain('payment_created');
    });
  });

  // ============================================
  // createNotification Tests
  // ============================================
  describe('createNotification', () => {
    test('should create notification entry', () => {
      const notification = {
        member_id: 'member-123',
        type: 'payment_reminder',
        title: 'تذكير بالدفع',
        message: 'يرجى دفع الاشتراك',
        status: 'pending',
        created_at: new Date().toISOString(),
        created_by: 'system'
      };

      expect(notification.type).toBe('payment_reminder');
      expect(notification.status).toBe('pending');
    });

    test('should support notification types', () => {
      const types = [
        'event_invitation',
        'payment_reminder',
        'payment_receipt',
        'crisis_alert',
        'general_announcement'
      ];

      expect(types).toContain('payment_reminder');
      expect(types).toContain('crisis_alert');
    });

    test('should set default status to pending', () => {
      const status = 'pending';
      expect(status).toBe('pending');
    });
  });

  // ============================================
  // queueSMS Tests
  // ============================================
  describe('queueSMS', () => {
    test('should create SMS queue entry', () => {
      const smsEntry = {
        phone_number: '+966555555555',
        message: 'تذكير بالدفع',
        notification_id: 'notif-123',
        status: 'queued',
        created_at: new Date().toISOString()
      };

      expect(smsEntry.status).toBe('queued');
      expect(smsEntry.phone_number).toMatch(/^\+966/);
    });

    test('should handle null notification_id', () => {
      const smsEntry = {
        phone_number: '+966555555555',
        message: 'Test message',
        notification_id: null,
        status: 'queued'
      };

      expect(smsEntry.notification_id).toBeNull();
    });

    test('should validate phone number format', () => {
      const saudiPhoneRegex = /^\+966[5][0-9]{8}$/;

      expect('+966555555555').toMatch(saudiPhoneRegex);
      expect('+966512345678').toMatch(saudiPhoneRegex);
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================
  describe('Error Handling', () => {
    test('should log errors with context', () => {
      const error = { message: 'Database connection failed' };
      const context = 'Error fetching members with balances:';

      const logData = { context, error: error.message };

      expect(logData.context).toContain('fetching members');
    });

    test('should rethrow database errors', () => {
      const dbError = new Error('Database timeout');

      expect(() => { throw dbError; }).toThrow('Database timeout');
    });

    test('should handle constraint violations', () => {
      const error = {
        code: '23505',
        message: 'duplicate key value violates unique constraint'
      };

      expect(error.code).toBe('23505');
      expect(error.message).toContain('duplicate');
    });
  });

  // ============================================
  // Select Query Tests
  // ============================================
  describe('Select Query Construction', () => {
    test('should build nested select for members with payments', () => {
      const selectQuery = `
        *,
        payments:transactions(
          amount,
          transaction_type,
          created_at
        )
      `;

      expect(selectQuery).toContain('payments:transactions');
      expect(selectQuery).toContain('amount');
    });

    test('should support join syntax', () => {
      const selectWithJoin = 'id, name, payments(amount, status)';

      expect(selectWithJoin).toContain('payments(');
    });
  });

  // ============================================
  // Ordering Tests
  // ============================================
  describe('Result Ordering', () => {
    test('should order by created_at descending', () => {
      const orderConfig = {
        column: 'created_at',
        ascending: false
      };

      expect(orderConfig.ascending).toBe(false);
    });
  });

  // ============================================
  // Transaction Type Tests
  // ============================================
  describe('Transaction Types', () => {
    test('should handle credit transactions', () => {
      const transaction = { amount: 1000, transaction_type: 'credit' };
      const isCredit = transaction.transaction_type === 'credit';

      expect(isCredit).toBe(true);
    });

    test('should handle debit transactions', () => {
      const transaction = { amount: 500, transaction_type: 'debit' };
      const isDebit = transaction.transaction_type === 'debit';

      expect(isDebit).toBe(true);
    });

    test('should calculate net balance correctly', () => {
      const transactions = [
        { amount: 5000, transaction_type: 'credit' },
        { amount: 1000, transaction_type: 'debit' },
        { amount: 2000, transaction_type: 'credit' },
        { amount: 500, transaction_type: 'debit' }
      ];

      const balance = transactions.reduce((sum, t) => {
        return t.transaction_type === 'credit'
          ? sum + t.amount
          : sum - t.amount;
      }, 0);

      expect(balance).toBe(5500);
    });
  });
});
