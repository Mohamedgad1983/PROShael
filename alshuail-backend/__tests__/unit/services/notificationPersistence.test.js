import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockQuery = jest.fn();
const mockUltraMsg = jest.fn();
const mockTwilio = jest.fn();
const mockFirebaseMulticast = jest.fn();

jest.unstable_mockModule('../../../src/services/database.js', () => ({
  query: mockQuery,
}));

jest.unstable_mockModule('../../../src/services/ultramsgService.js', () => ({
  sendWhatsAppMessage: mockUltraMsg,
}));

jest.unstable_mockModule('../../../src/services/twilioService.js', () => ({
  sendWhatsAppMessage: mockTwilio,
}));

jest.unstable_mockModule('../../../src/services/firebaseService.js', () => ({
  sendMulticastNotification: mockFirebaseMulticast,
}));

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

const {
  createMemberNotification,
  persistIdempotentMemberNotification,
} = await import('../../../src/services/notificationService.js');

const MEMBER_ID = '33333333-3333-4333-8333-333333333333';
const RELATED_ID = '44444444-4444-4444-8444-444444444444';

function installDatabaseResponses() {
  mockQuery.mockImplementation((sql, params) => {
    if (sql.includes('FROM users')) {return { rows: [] };}
    if (sql.includes('INSERT INTO notifications')) {
      expect(params[4]).toBe('marriage_support_signature_reminder');
      expect(params[5]).toBe('marriage_support_signature_reminder');
      return { rows: [{ id: '55555555-5555-4555-8555-555555555555' }] };
    }
    if (sql.includes('INSERT INTO notification_logs')) {return { rows: [], rowCount: 1 };}
    if (sql.includes('FROM device_tokens')) {return { rows: [] };}
    if (sql.includes('FROM members')) {return { rows: [{ phone: '966500000000' }] };}
    throw new Error(`Unexpected SQL: ${sql}`);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  installDatabaseResponses();
  mockUltraMsg.mockResolvedValue({ success: false, error: 'provider unavailable' });
  mockTwilio.mockResolvedValue({ success: false, error: 'fallback unavailable' });
});

describe('transactional member notification persistence', () => {
  test('persists a deterministic inbox row without invoking an external provider', async () => {
    const client = {
      query: jest.fn((sql, params) => {
        if (sql.includes('FROM users')) {return Promise.resolve({ rows: [] });}
        if (sql.includes('INSERT INTO notifications')) {
          expect(sql).toContain('idempotency_key');
          expect(sql).toContain('ON CONFLICT (idempotency_key)');
          expect(params[11]).toBe('financing-reminder:installment-1:due_today');
          return Promise.resolve({
            rows: [{ id: '88888888-8888-4888-8888-888888888888', member_id: MEMBER_ID }],
          });
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      }),
    };

    await expect(persistIdempotentMemberNotification(MEMBER_ID, {
      title: 'قسط مستحق',
      body: 'موعد القسط اليوم.',
      type: 'financing_installment_reminder',
    }, {
      client,
      idempotencyKey: 'financing-reminder:installment-1:due_today',
    })).resolves.toEqual({
      notificationId: '88888888-8888-4888-8888-888888888888',
      created: true,
    });
    expect(mockFirebaseMulticast).not.toHaveBeenCalled();
    expect(mockUltraMsg).not.toHaveBeenCalled();
    expect(mockTwilio).not.toHaveBeenCalled();
  });

  test('resolves the existing inbox row after an idempotency conflict', async () => {
    const client = {
      query: jest.fn((sql) => {
        if (sql.includes('FROM users')) {return Promise.resolve({ rows: [] });}
        if (sql.includes('INSERT INTO notifications')) {return Promise.resolve({ rows: [] });}
        if (sql.includes('WHERE idempotency_key = $1')) {
          return Promise.resolve({ rows: [{
            id: '88888888-8888-4888-8888-888888888888',
            member_id: MEMBER_ID,
          }] });
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      }),
    };

    await expect(persistIdempotentMemberNotification(MEMBER_ID, {
      title: 'قسط مستحق',
      body: 'موعد القسط اليوم.',
      type: 'financing_installment_reminder',
    }, {
      client,
      idempotencyKey: 'financing-reminder:installment-1:due_today',
    })).resolves.toEqual({
      notificationId: '88888888-8888-4888-8888-888888888888',
      created: false,
    });
  });

  test('stores an in-app notification and delivery logs when external channels fail', async () => {
    const result = await createMemberNotification(MEMBER_ID, {
      title: 'مطلوب توقيع شاهد',
      body: 'يرجى مراجعة الإقرار وتوقيعه من التطبيق.',
      type: 'marriage_support_signature_reminder',
      priority: 'high',
      relatedId: RELATED_ID,
      relatedType: 'marriage_support',
      actionUrl: '/requests',
    });

    expect(result).toEqual(expect.objectContaining({
      success: true,
      deliveredVia: 'in_app',
      inAppStored: true,
      notificationId: '55555555-5555-4555-8555-555555555555',
    }));

    const notificationInsert = mockQuery.mock.calls.find(([sql]) =>
      sql.includes('INSERT INTO notifications')
    );
    expect(notificationInsert[0]).toContain('$5, $6, $7');

    const deliveryLogCalls = mockQuery.mock.calls.filter(([sql]) =>
      sql.includes('INSERT INTO notification_logs')
    );
    expect(deliveryLogCalls).toHaveLength(3);
    for (const [, params] of deliveryLogCalls) {
      expect(params.slice(4, 8)).toEqual([params[4], params[4], params[4], params[4]]);
    }
    expect(mockUltraMsg).toHaveBeenCalledTimes(1);
    expect(mockTwilio).toHaveBeenCalledTimes(1);
  });

  test('uses UltraMsg first and does not call Twilio after successful delivery', async () => {
    mockUltraMsg.mockResolvedValueOnce({
      success: true,
      messageId: 'ultra-message-1',
      status: 'sent',
    });

    const result = await createMemberNotification(MEMBER_ID, {
      title: 'تذكير',
      body: 'مطلوب توقيعك.',
      type: 'marriage_support_signature_reminder',
      relatedId: RELATED_ID,
      relatedType: 'marriage_support',
    });

    expect(result).toEqual(expect.objectContaining({
      success: true,
      deliveredVia: 'whatsapp',
      provider: 'ultramsg',
      inAppStored: true,
    }));
    expect(mockUltraMsg).toHaveBeenCalledTimes(1);
    expect(mockTwilio).not.toHaveBeenCalled();
  });
});
