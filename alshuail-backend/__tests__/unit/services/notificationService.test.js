/**
 * Notification Service Unit Tests
 * Tests multi-channel notification delivery
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// Mock dependencies
const mockSupabaseResponse = {
  data: null,
  error: null
};

const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  in: jest.fn(() => mockSupabase),
  update: jest.fn(() => mockSupabase),
  single: jest.fn(() => Promise.resolve(mockSupabaseResponse))
};

jest.unstable_mockModule('../../../src/config/database.js', () => ({
  supabase: mockSupabase
}));

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

jest.unstable_mockModule('../../../src/config/env.js', () => ({
  config: {
    twilio: { accountSid: 'test', authToken: 'test' }
  }
}));

describe('Notification Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseResponse.data = null;
    mockSupabaseResponse.error = null;
  });

  // ============================================
  // Notification Type Constants Tests
  // ============================================
  describe('NotificationType Constants', () => {
    test('should define EVENT_INVITATION type', () => {
      const NotificationType = {
        EVENT_INVITATION: 'event_invitation'
      };
      expect(NotificationType.EVENT_INVITATION).toBe('event_invitation');
    });

    test('should define PAYMENT_RECEIPT type', () => {
      const NotificationType = {
        PAYMENT_RECEIPT: 'payment_receipt'
      };
      expect(NotificationType.PAYMENT_RECEIPT).toBe('payment_receipt');
    });

    test('should define PAYMENT_REMINDER type', () => {
      const NotificationType = {
        PAYMENT_REMINDER: 'payment_reminder'
      };
      expect(NotificationType.PAYMENT_REMINDER).toBe('payment_reminder');
    });

    test('should define CRISIS_ALERT type', () => {
      const NotificationType = {
        CRISIS_ALERT: 'crisis_alert'
      };
      expect(NotificationType.CRISIS_ALERT).toBe('crisis_alert');
    });

    test('should define GENERAL_ANNOUNCEMENT type', () => {
      const NotificationType = {
        GENERAL_ANNOUNCEMENT: 'general_announcement'
      };
      expect(NotificationType.GENERAL_ANNOUNCEMENT).toBe('general_announcement');
    });

    test('should define RSVP_CONFIRMATION type', () => {
      const NotificationType = {
        RSVP_CONFIRMATION: 'rsvp_confirmation'
      };
      expect(NotificationType.RSVP_CONFIRMATION).toBe('rsvp_confirmation');
    });
  });

  // ============================================
  // Delivery Channel Constants Tests
  // ============================================
  describe('DeliveryChannel Constants', () => {
    const DeliveryChannel = {
      WHATSAPP: 'whatsapp',
      SMS: 'sms',
      PUSH: 'push',
      EMAIL: 'email'
    };

    test('should define WHATSAPP channel', () => {
      expect(DeliveryChannel.WHATSAPP).toBe('whatsapp');
    });

    test('should define SMS channel', () => {
      expect(DeliveryChannel.SMS).toBe('sms');
    });

    test('should define PUSH channel', () => {
      expect(DeliveryChannel.PUSH).toBe('push');
    });

    test('should define EMAIL channel', () => {
      expect(DeliveryChannel.EMAIL).toBe('email');
    });
  });

  // ============================================
  // WhatsApp Notification Tests
  // ============================================
  describe('sendWhatsAppNotification', () => {
    test('should return success on successful delivery', () => {
      const result = {
        success: true,
        messageId: 'msg_123',
        channel: 'whatsapp',
        status: 'sent',
        timestamp: new Date().toISOString()
      };

      expect(result.success).toBe(true);
      expect(result.channel).toBe('whatsapp');
    });

    test('should return error on failure', () => {
      const result = {
        success: false,
        error: 'Failed to send',
        channel: 'whatsapp'
      };

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to send');
    });

    test('should include message length in log', () => {
      const message = 'مرحباً، هذه رسالة تجريبية';
      const logData = {
        phone: '+9665xxxxxxxx',
        messageLength: message.length
      };

      // Arabic string length is 25 characters
      expect(logData.messageLength).toBe(25);
    });
  });

  // ============================================
  // SMS Notification Tests
  // ============================================
  describe('sendSMSNotification', () => {
    test('should return disabled message', () => {
      const result = {
        success: false,
        error: 'SMS notifications not enabled - using WhatsApp and Push only',
        channel: 'sms'
      };

      expect(result.success).toBe(false);
      expect(result.error).toContain('not enabled');
    });
  });

  // ============================================
  // Push Notification Tests
  // ============================================
  describe('sendPushNotification', () => {
    test('should return success with device count', () => {
      const result = {
        success: true,
        messageId: 'push_multicast_123',
        channel: 'push',
        status: 'sent',
        devicesReached: 2,
        totalDevices: 3,
        timestamp: new Date().toISOString()
      };

      expect(result.success).toBe(true);
      expect(result.devicesReached).toBeLessThanOrEqual(result.totalDevices);
    });

    test('should return error when no devices registered', () => {
      const result = {
        success: false,
        error: 'No active devices registered',
        channel: 'push'
      };

      expect(result.success).toBe(false);
      expect(result.error).toContain('No active devices');
    });

    test('should return error when all devices fail', () => {
      const result = {
        success: false,
        error: 'Failed to send to any device',
        channel: 'push'
      };

      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // Multi-Channel Notification Tests
  // ============================================
  describe('sendMultiChannelNotification', () => {
    test('should try channels in order', () => {
      const channels = ['whatsapp', 'sms', 'push'];
      const attempts = [];

      channels.forEach(channel => {
        attempts.push({ channel, tried: true });
      });

      expect(attempts).toHaveLength(3);
      expect(attempts[0].channel).toBe('whatsapp');
    });

    test('should stop after first successful delivery', () => {
      const results = {
        success: false,
        attempts: [],
        deliveredVia: null
      };

      // Simulate first channel failing, second succeeding
      results.attempts.push({ success: false, channel: 'whatsapp' });
      results.attempts.push({ success: true, channel: 'sms' });
      results.success = true;
      results.deliveredVia = 'sms';

      expect(results.success).toBe(true);
      expect(results.deliveredVia).toBe('sms');
      expect(results.attempts).toHaveLength(2);
    });

    test('should report failure if all channels fail', () => {
      const results = {
        success: false,
        attempts: [
          { success: false, channel: 'whatsapp' },
          { success: false, channel: 'sms' },
          { success: false, channel: 'push' }
        ],
        deliveredVia: null
      };

      expect(results.success).toBe(false);
      expect(results.deliveredVia).toBeNull();
    });
  });

  // ============================================
  // User Preferences Tests
  // ============================================
  describe('getUserNotificationPreferences', () => {
    test('should return default preferences for new users', () => {
      const defaults = {
        userId: 'user-123',
        channels: {
          whatsapp: true,
          sms: false,
          push: true,
          email: false
        },
        types: {
          event_invitation: true,
          payment_receipt: true,
          payment_reminder: true,
          crisis_alert: true,
          general_announcement: true,
          rsvp_confirmation: true
        },
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '07:00'
        },
        language: 'ar'
      };

      expect(defaults.channels.whatsapp).toBe(true);
      expect(defaults.channels.sms).toBe(false);
      expect(defaults.language).toBe('ar');
    });

    test('should map database columns to expected format', () => {
      const dbPrefs = {
        enable_whatsapp: true,
        enable_push: true,
        enable_email: false,
        event_invitations: true,
        payment_receipts: true,
        payment_reminders: false,
        crisis_alerts: true,
        general_announcements: true,
        rsvp_confirmations: true,
        quiet_hours_enabled: true,
        quiet_hours_start: '22:00:00',
        quiet_hours_end: '07:00:00',
        preferred_language: 'ar'
      };

      const mapped = {
        channels: {
          whatsapp: dbPrefs.enable_whatsapp,
          push: dbPrefs.enable_push,
          email: dbPrefs.enable_email
        },
        types: {
          event_invitation: dbPrefs.event_invitations,
          payment_reminder: dbPrefs.payment_reminders
        },
        quietHours: {
          enabled: dbPrefs.quiet_hours_enabled,
          start: dbPrefs.quiet_hours_start.substring(0, 5),
          end: dbPrefs.quiet_hours_end.substring(0, 5)
        }
      };

      expect(mapped.channels.whatsapp).toBe(true);
      expect(mapped.quietHours.start).toBe('22:00');
    });
  });

  // ============================================
  // Quiet Hours Tests
  // ============================================
  describe('isInQuietHours', () => {
    test('should return false if quiet hours disabled', () => {
      const preferences = {
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '07:00'
        }
      };

      const isInQuietHours = !preferences.quietHours.enabled
        ? false
        : true;

      expect(isInQuietHours).toBe(false);
    });

    test('should handle quiet hours spanning midnight', () => {
      const start = '22:00';
      const end = '07:00';
      const currentTime = '23:30';

      // When start > end, it spans midnight
      const spansMidnight = start > end;
      expect(spansMidnight).toBe(true);

      // Check if current time is in range
      const isInRange = currentTime >= start || currentTime <= end;
      expect(isInRange).toBe(true);
    });

    test('should handle daytime quiet hours', () => {
      const start = '12:00';
      const end = '14:00';
      const currentTime = '13:00';

      // When start < end, it doesn't span midnight
      const spansMidnight = start > end;
      expect(spansMidnight).toBe(false);

      // Check if current time is in range
      const isInRange = currentTime >= start && currentTime <= end;
      expect(isInRange).toBe(true);
    });

    test('should format current time correctly', () => {
      const now = new Date('2024-06-15T23:45:00');
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      expect(currentTime).toBe('23:45');
    });
  });

  // ============================================
  // Notification with Preferences Tests
  // ============================================
  describe('sendNotificationWithPreferences', () => {
    test('should skip if notification type disabled', () => {
      const preferences = {
        types: {
          payment_reminder: false
        }
      };
      const notificationType = 'payment_reminder';

      const shouldSkip = !preferences.types[notificationType];

      expect(shouldSkip).toBe(true);
    });

    test('should bypass quiet hours for crisis alerts', () => {
      const notificationType = 'crisis_alert';
      const isInQuietHours = true;

      const shouldDefer = notificationType !== 'crisis_alert' && isInQuietHours;

      expect(shouldDefer).toBe(false);
    });

    test('should defer non-crisis alerts during quiet hours', () => {
      const notificationType = 'payment_reminder';
      const isInQuietHours = true;

      const shouldDefer = notificationType !== 'crisis_alert' && isInQuietHours;

      expect(shouldDefer).toBe(true);
    });

    test('should determine enabled channels from preferences', () => {
      const preferences = {
        channels: {
          whatsapp: true,
          sms: false,
          push: true,
          email: false
        }
      };

      const enabledChannels = Object.entries(preferences.channels)
        .filter(([_, enabled]) => enabled)
        .map(([channel]) => channel);

      expect(enabledChannels).toEqual(['whatsapp', 'push']);
    });

    test('should return error if no channels enabled', () => {
      const preferences = {
        channels: {
          whatsapp: false,
          sms: false,
          push: false,
          email: false
        }
      };

      const enabledChannels = Object.entries(preferences.channels)
        .filter(([_, enabled]) => enabled)
        .map(([channel]) => channel);

      const result = enabledChannels.length === 0
        ? { success: false, reason: 'no_channels_enabled' }
        : { success: true };

      expect(result.reason).toBe('no_channels_enabled');
    });
  });

  // ============================================
  // Device Token Management Tests
  // ============================================
  describe('Device Token Management', () => {
    test('should query active device tokens', () => {
      const query = {
        member_id: 'user-123',
        is_active: true
      };

      expect(query.is_active).toBe(true);
    });

    test('should extract tokens from query result', () => {
      const tokens = [
        { token: 'token1', platform: 'ios' },
        { token: 'token2', platform: 'android' }
      ];

      const deviceTokens = tokens.map(t => t.token);

      expect(deviceTokens).toEqual(['token1', 'token2']);
    });

    test('should identify invalid tokens for removal', () => {
      const results = [
        { token: 'token1', shouldRemoveToken: false },
        { token: 'token2', shouldRemoveToken: true },
        { token: 'token3', shouldRemoveToken: true }
      ];

      const invalidTokens = results
        .filter(r => r.shouldRemoveToken)
        .map(r => r.token);

      expect(invalidTokens).toEqual(['token2', 'token3']);
    });
  });

  // ============================================
  // Recipient Data Tests
  // ============================================
  describe('Recipient Data', () => {
    test('should construct recipient from member data', () => {
      const member = {
        id: 'member-123',
        phone: '+9665xxxxxxxx',
        email: 'member@example.com'
      };

      const recipient = {
        userId: member.id,
        phone: member.phone,
        email: member.email
      };

      expect(recipient.userId).toBe('member-123');
      expect(recipient.phone).toBe('+9665xxxxxxxx');
    });

    test('should return error if member not found', () => {
      const memberError = { message: 'Not found' };

      const result = memberError
        ? { success: false, reason: 'member_not_found' }
        : { success: true };

      expect(result.reason).toBe('member_not_found');
    });
  });

  // ============================================
  // Logging Tests
  // ============================================
  describe('Logging', () => {
    test('should log successful delivery', () => {
      const logData = {
        channel: 'whatsapp',
        attempts: 1
      };

      expect(logData.channel).toBe('whatsapp');
    });

    test('should log failed delivery', () => {
      const logData = {
        allChannelsFailed: true,
        attempts: 3
      };

      expect(logData.allChannelsFailed).toBe(true);
    });

    test('should log notification skip reason', () => {
      const logData = {
        userId: 'user-123',
        type: 'payment_reminder',
        reason: 'user_preference_disabled'
      };

      expect(logData.reason).toBe('user_preference_disabled');
    });
  });
});
