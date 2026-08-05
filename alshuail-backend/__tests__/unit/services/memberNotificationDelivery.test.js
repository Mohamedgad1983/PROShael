import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockQuery = jest.fn();
const mockSendMulticast = jest.fn();
const mockUltraMsg = jest.fn();
const mockTwilio = jest.fn();

jest.unstable_mockModule('../../../src/services/database.js', () => ({ query: mockQuery }));
jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.unstable_mockModule('../../../src/services/firebaseService.js', () => ({
  sendMulticastNotification: mockSendMulticast,
}));
jest.unstable_mockModule('../../../src/services/ultramsgService.js', () => ({
  sendWhatsAppMessage: mockUltraMsg,
}));
jest.unstable_mockModule('../../../src/services/twilioService.js', () => ({
  sendWhatsAppMessage: mockTwilio,
}));

const { createMemberNotification } = await import('../../../src/services/notificationService.js');

function configureDatabase({ tokens = [], phone = '+966500000000' } = {}) {
  mockQuery.mockImplementation((sql, params) => {
    const text = String(sql);
    if (text.includes('FROM users')) { return Promise.resolve({ rows: [] }); }
    if (text.includes('INSERT INTO notifications')) { return Promise.resolve({ rows: [{ id: 'notification-1' }] }); }
    if (text.includes('INSERT INTO notification_logs')) { return Promise.resolve({ rows: [] }); }
    if (text.includes('FROM device_tokens')) { return Promise.resolve({ rows: tokens }); }
    if (text.includes('FROM members')) { return Promise.resolve({ rows: phone ? [{ phone, whatsapp_number: null }] : [] }); }
    throw new Error(`Unexpected query: ${text.slice(0, 80)} ${JSON.stringify(params)}`);
  });
}

describe('createMemberNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTwilio.mockResolvedValue({ success: false, error: 'not configured' });
  });

  test('stores the inbox row by member_id and reports successful Push delivery', async () => {
    configureDatabase({ tokens: [{ token: 'device-token', platform: 'ios' }] });
    mockSendMulticast.mockResolvedValue({ successCount: 1, failureCount: 0, results: [] });

    const result = await createMemberNotification('member-1', {
      title: 'تمت الموافقة',
      body: 'تم اعتماد الطلب',
      type: 'family_financing_status_update',
      relatedId: 'request-1',
      relatedType: 'family_financing',
    });

    const inboxCall = mockQuery.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO notifications'));
    expect(inboxCall).toBeDefined();
    expect(String(inboxCall[0])).toContain('member_id, user_id');
    expect(inboxCall[1][0]).toBe('member-1');
    expect(result).toMatchObject({
      success: true,
      deliveredVia: 'push',
      inAppStored: true,
      notificationId: 'notification-1',
    });
    expect(mockUltraMsg).not.toHaveBeenCalled();
  });

  test('keeps the inbox notification and falls back to UltraMsg when no device is registered', async () => {
    configureDatabase({ tokens: [] });
    mockUltraMsg.mockResolvedValue({ success: true, messageId: 'wa-1', status: 'sent' });

    const result = await createMemberNotification('member-2', {
      title: 'تم رفض الطلب',
      body: 'السبب: المستند غير واضح',
      type: 'marriage_support_status_update',
    });

    expect(mockUltraMsg).toHaveBeenCalledWith(
      '+966500000000',
      'تم رفض الطلب\nالسبب: المستند غير واضح'
    );
    expect(result).toMatchObject({
      success: true,
      deliveredVia: 'whatsapp',
      inAppStored: true,
      provider: 'ultramsg',
    });
  });
});
