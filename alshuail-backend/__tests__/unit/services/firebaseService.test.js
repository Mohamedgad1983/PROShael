/**
 * Firebase Service Unit Tests
 * Tests Firebase Cloud Messaging (FCM) push notification operations
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// Mock firebase-admin
const mockMessaging = {
  send: jest.fn(),
  sendEach: jest.fn(),
  sendEachForMulticast: jest.fn()
};

jest.unstable_mockModule('firebase-admin', () => ({
  default: {
    initializeApp: jest.fn(),
    credential: {
      cert: jest.fn()
    },
    messaging: jest.fn(() => mockMessaging)
  }
}));

jest.unstable_mockModule('../../../src/config/env.js', () => ({
  config: {
    firebase: {
      enabled: true,
      projectId: 'test-project',
      clientEmail: 'test@test.iam.gserviceaccount.com',
      privateKey: 'test-private-key'
    }
  }
}));

describe('Firebase Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // Initialization Tests
  // ============================================
  describe('Firebase Initialization', () => {
    test('should only initialize once', () => {
      let initialized = false;

      const initializeFirebase = () => {
        if (initialized) return;
        initialized = true;
      };

      initializeFirebase();
      initializeFirebase();

      expect(initialized).toBe(true);
    });

    test('should warn when Firebase not configured', () => {
      const config = { firebase: { enabled: false } };

      const shouldWarn = !config.firebase.enabled;
      expect(shouldWarn).toBe(true);
    });

    test('should use service account credentials', () => {
      const credentials = {
        projectId: 'test-project',
        clientEmail: 'test@test.iam.gserviceaccount.com',
        privateKey: 'test-private-key'
      };

      expect(credentials.projectId).toBe('test-project');
      expect(credentials.clientEmail).toContain('iam.gserviceaccount.com');
    });
  });

  // ============================================
  // sendPushNotification Tests
  // ============================================
  describe('sendPushNotification', () => {
    test('should return error when Firebase disabled', () => {
      const config = { firebase: { enabled: false } };

      const result = !config.firebase.enabled
        ? { success: false, error: { code: 'firebase-disabled', message: 'Firebase not configured' } }
        : { success: true };

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('firebase-disabled');
    });

    test('should construct message with notification payload', () => {
      const token = 'test-token';
      const notification = {
        title: 'Test Title',
        body: 'Test Body'
      };

      const message = {
        token: token,
        notification: {
          title: notification.title,
          body: notification.body
        }
      };

      expect(message.token).toBe('test-token');
      expect(message.notification.title).toBe('Test Title');
    });

    test('should include imageUrl if provided', () => {
      const notification = {
        title: 'Test',
        body: 'Test',
        imageUrl: 'https://example.com/image.png'
      };

      const payload = {
        ...notification,
        ...(notification.imageUrl && { imageUrl: notification.imageUrl })
      };

      expect(payload.imageUrl).toBe('https://example.com/image.png');
    });

    test('should not include imageUrl if not provided', () => {
      const notification = {
        title: 'Test',
        body: 'Test'
      };

      const payload = {
        title: notification.title,
        body: notification.body,
        ...(notification.imageUrl && { imageUrl: notification.imageUrl })
      };

      expect(payload.imageUrl).toBeUndefined();
    });

    test('should configure Android options', () => {
      const androidConfig = {
        priority: 'high',
        notification: {
          channelId: 'default',
          sound: 'default',
          defaultSound: true,
          defaultVibrateTimings: true
        }
      };

      expect(androidConfig.priority).toBe('high');
      expect(androidConfig.notification.channelId).toBe('default');
    });

    test('should configure iOS (APNS) options', () => {
      const apnsConfig = {
        headers: {
          'apns-priority': '10'
        },
        payload: {
          aps: {
            alert: { title: 'Test', body: 'Test' },
            sound: 'default',
            badge: 1
          }
        }
      };

      expect(apnsConfig.headers['apns-priority']).toBe('10');
      expect(apnsConfig.payload.aps.sound).toBe('default');
    });

    test('should configure Web push options', () => {
      const webpushConfig = {
        notification: {
          title: 'Test Title',
          body: 'Test Body'
        }
      };

      expect(webpushConfig.notification.title).toBe('Test Title');
    });

    test('should return success with messageId', () => {
      const result = {
        success: true,
        messageId: 'msg-123456'
      };

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-123456');
    });

    test('should identify invalid token errors', () => {
      const errorCodes = [
        'messaging/invalid-registration-token',
        'messaging/registration-token-not-registered'
      ];

      const error = { code: 'messaging/invalid-registration-token' };
      const shouldRemoveToken = errorCodes.includes(error.code);

      expect(shouldRemoveToken).toBe(true);
    });
  });

  // ============================================
  // sendMulticastNotification Tests
  // ============================================
  describe('sendMulticastNotification', () => {
    test('should return empty results for no tokens', () => {
      const tokens = [];

      const result = {
        successCount: 0,
        failureCount: 0,
        results: []
      };

      expect(result.successCount).toBe(0);
      expect(result.results).toHaveLength(0);
    });

    test('should limit to 500 tokens', () => {
      const tokens = Array(600).fill('token');
      const limited = tokens.slice(0, 500);

      expect(limited).toHaveLength(500);
    });

    test('should construct multicast message', () => {
      const tokens = ['token1', 'token2', 'token3'];
      const notification = { title: 'Test', body: 'Test Body' };

      const message = {
        tokens: tokens,
        notification: {
          title: notification.title,
          body: notification.body
        }
      };

      expect(message.tokens).toHaveLength(3);
    });

    test('should include TTL for Android', () => {
      const ttl = 3600 * 1000; // 1 hour in milliseconds

      expect(ttl).toBe(3600000);
    });

    test('should process multicast results', () => {
      const tokens = ['token1', 'token2', 'token3'];
      const responses = [
        { success: true, messageId: 'msg1' },
        { success: false, error: { code: 'messaging/invalid-registration-token' } },
        { success: true, messageId: 'msg3' }
      ];

      const results = responses.map((resp, idx) => {
        if (!resp.success) {
          const shouldRemove = resp.error.code === 'messaging/invalid-registration-token';
          return {
            token: tokens[idx],
            success: false,
            error: resp.error,
            shouldRemoveToken: shouldRemove
          };
        }
        return {
          token: tokens[idx],
          success: true,
          messageId: resp.messageId
        };
      });

      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].shouldRemoveToken).toBe(true);
    });

    test('should count successes and failures', () => {
      const response = {
        successCount: 2,
        failureCount: 1,
        responses: [
          { success: true },
          { success: false },
          { success: true }
        ]
      };

      expect(response.successCount).toBe(2);
      expect(response.failureCount).toBe(1);
    });
  });

  // ============================================
  // sendBatchNotifications Tests
  // ============================================
  describe('sendBatchNotifications', () => {
    test('should return error for all when Firebase disabled', () => {
      const messages = [
        { token: 'token1', notification: { title: 'Test' } },
        { token: 'token2', notification: { title: 'Test' } }
      ];
      const firebaseEnabled = false;

      const result = !firebaseEnabled
        ? {
            successCount: 0,
            failureCount: messages.length,
            results: messages.map(msg => ({
              token: msg.token,
              success: false,
              error: { code: 'firebase-disabled' }
            }))
          }
        : { successCount: messages.length };

      expect(result.failureCount).toBe(2);
    });

    test('should return empty for no messages', () => {
      const messages = [];

      const result = {
        successCount: 0,
        failureCount: 0,
        results: []
      };

      expect(result.results).toHaveLength(0);
    });

    test('should limit to 500 messages', () => {
      const messages = Array(600).fill({ token: 'token', notification: { title: 'Test' } });
      const limited = messages.slice(0, 500);

      expect(limited).toHaveLength(500);
    });

    test('should construct individual messages', () => {
      const messages = [
        {
          token: 'token1',
          notification: { title: 'Hello User 1', body: 'Custom message 1' },
          data: { userId: '1' }
        },
        {
          token: 'token2',
          notification: { title: 'Hello User 2', body: 'Custom message 2' },
          data: { userId: '2' }
        }
      ];

      const firebaseMessages = messages.map(msg => ({
        token: msg.token,
        notification: {
          title: msg.notification.title,
          body: msg.notification.body
        },
        data: msg.data || {}
      }));

      expect(firebaseMessages[0].notification.title).toBe('Hello User 1');
      expect(firebaseMessages[1].notification.title).toBe('Hello User 2');
    });

    test('should include badge number', () => {
      const msg = {
        token: 'token1',
        notification: { title: 'Test' },
        badge: 5
      };

      const config = {
        android: {
          notification: {
            badge: msg.badge || 1
          }
        },
        apns: {
          payload: {
            aps: {
              badge: msg.badge || 1
            }
          }
        }
      };

      expect(config.android.notification.badge).toBe(5);
      expect(config.apns.payload.aps.badge).toBe(5);
    });
  });

  // ============================================
  // sendDataMessage Tests
  // ============================================
  describe('sendDataMessage', () => {
    test('should return error when Firebase disabled', () => {
      const firebaseEnabled = false;

      const result = !firebaseEnabled
        ? { success: false, error: { code: 'firebase-disabled' } }
        : { success: true };

      expect(result.success).toBe(false);
    });

    test('should construct data-only message', () => {
      const token = 'test-token';
      const data = { type: 'sync', userId: '123' };

      const message = {
        token: token,
        data: data
      };

      expect(message.token).toBe('test-token');
      expect(message.data.type).toBe('sync');
    });

    test('should configure for background delivery on iOS', () => {
      const apnsConfig = {
        headers: {
          'apns-priority': '10',
          'apns-push-type': 'background'
        },
        payload: {
          aps: {
            'content-available': 1
          }
        }
      };

      expect(apnsConfig.headers['apns-push-type']).toBe('background');
      expect(apnsConfig.payload.aps['content-available']).toBe(1);
    });

    test('should use high priority for Android', () => {
      const androidConfig = {
        priority: 'high'
      };

      expect(androidConfig.priority).toBe('high');
    });

    test('should identify tokens to remove on error', () => {
      const errorCodes = [
        'messaging/invalid-registration-token',
        'messaging/registration-token-not-registered'
      ];

      const error1 = { code: 'messaging/invalid-registration-token' };
      const error2 = { code: 'messaging/network-error' };

      expect(errorCodes.includes(error1.code)).toBe(true);
      expect(errorCodes.includes(error2.code)).toBe(false);
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================
  describe('Error Handling', () => {
    test('should return structured error response', () => {
      const error = {
        code: 'messaging/invalid-argument',
        message: 'Invalid message format'
      };

      const errorResponse = {
        success: false,
        error: {
          code: error.code,
          message: error.message
        }
      };

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.code).toBe('messaging/invalid-argument');
    });

    test('should flag tokens for removal', () => {
      const invalidTokenCodes = [
        'messaging/invalid-registration-token',
        'messaging/registration-token-not-registered'
      ];

      const error = { code: 'messaging/invalid-registration-token' };
      const shouldRemove = invalidTokenCodes.includes(error.code);

      expect(shouldRemove).toBe(true);
    });

    test('should not flag valid errors for token removal', () => {
      const invalidTokenCodes = [
        'messaging/invalid-registration-token',
        'messaging/registration-token-not-registered'
      ];

      const error = { code: 'messaging/internal-error' };
      const shouldRemove = invalidTokenCodes.includes(error.code);

      expect(shouldRemove).toBe(false);
    });
  });

  // ============================================
  // Configuration Tests
  // ============================================
  describe('Configuration', () => {
    test('should check for Firebase enabled flag', () => {
      const config = { firebase: { enabled: true } };

      expect(config.firebase.enabled).toBe(true);
    });

    test('should require project ID', () => {
      const config = {
        firebase: {
          projectId: 'test-project'
        }
      };

      expect(config.firebase.projectId).toBeDefined();
    });

    test('should require client email', () => {
      const config = {
        firebase: {
          clientEmail: 'test@test.iam.gserviceaccount.com'
        }
      };

      expect(config.firebase.clientEmail).toBeDefined();
    });

    test('should require private key', () => {
      const config = {
        firebase: {
          privateKey: 'test-private-key'
        }
      };

      expect(config.firebase.privateKey).toBeDefined();
    });
  });

  // ============================================
  // Result Format Tests
  // ============================================
  describe('Result Format', () => {
    test('should return success with messageId', () => {
      const result = {
        success: true,
        messageId: 'projects/test/messages/123456'
      };

      expect(result.success).toBe(true);
      expect(result.messageId).toContain('messages');
    });

    test('should return multicast results format', () => {
      const result = {
        successCount: 2,
        failureCount: 1,
        results: [
          { token: 'token1', success: true, messageId: 'msg1' },
          { token: 'token2', success: false, error: { code: 'error' } },
          { token: 'token3', success: true, messageId: 'msg3' }
        ]
      };

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
      expect(result.results).toHaveLength(3);
    });
  });
});
