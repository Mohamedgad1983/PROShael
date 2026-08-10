import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockSendEachForMulticast = jest.fn();
const mockInitializeApp = jest.fn();
const mockCert = jest.fn(value => value);

jest.unstable_mockModule('firebase-admin', () => ({
  default: {
    initializeApp: mockInitializeApp,
    credential: { cert: mockCert },
    messaging: () => ({ sendEachForMulticast: mockSendEachForMulticast }),
  },
}));

jest.unstable_mockModule('../../../src/config/env.js', () => ({
  config: {
    firebase: {
      enabled: true,
      projectId: 'test-project',
      clientEmail: 'firebase@test.invalid',
      privateKey: 'test-private-key',
    },
  },
}));

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

const { sendMulticastNotification } = await import('../../../src/services/firebaseService.js');

beforeEach(() => {
  jest.clearAllMocks();
  mockSendEachForMulticast.mockResolvedValue({
    successCount: 1,
    failureCount: 0,
    responses: [{ success: true, messageId: 'fcm-message-1' }],
  });
});

describe('Firebase financing reminder collapse options', () => {
  test('preserves stable Android and APNs collapse identities', async () => {
    const collapseKey = '0123456789abcdef0123456789abcdef';
    await sendMulticastNotification(
      ['device-token-1'],
      { title: 'تذكير بقسط التمويل', body: 'موعد القسط قريب.' },
      { installment_id: 'installment-1' },
      {
        android: { collapseKey },
        apns: {
          headers: {
            'apns-collapse-id': collapseKey,
          },
        },
      }
    );

    const message = mockSendEachForMulticast.mock.calls[0][0];
    expect(message.android.collapseKey).toBe(collapseKey);
    expect(message.apns.headers).toEqual({
      'apns-priority': '10',
      'apns-collapse-id': collapseKey,
    });
    expect(message.android.notification.channelId).toBe('default');
    expect(message.apns.payload.aps.sound).toBe('default');
  });
});
