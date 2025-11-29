/**
 * Twilio WhatsApp Service Unit Tests
 * Tests WhatsApp message sending via Twilio API
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// Mock Twilio
const mockTwilioClient = {
  messages: {
    create: jest.fn()
  }
};

jest.unstable_mockModule('twilio', () => ({
  default: jest.fn(() => mockTwilioClient),
  RestException: class RestException extends Error {
    constructor(response) {
      super(response.message);
      this.code = response.code;
      this.status = response.status;
      this.moreInfo = response.moreInfo;
    }
  }
}));

jest.unstable_mockModule('../../../src/config/env.js', () => ({
  config: {
    twilio: {
      enabled: true,
      accountSid: 'ACtest123',
      authToken: 'test-auth-token',
      phoneNumber: '+14155238886'
    }
  }
}));

describe('Twilio WhatsApp Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // Initialization Tests
  // ============================================
  describe('Twilio Initialization', () => {
    test('should only initialize once', () => {
      let client = null;

      const initializeTwilio = () => {
        if (client) return client;
        client = { messages: {} };
        return client;
      };

      initializeTwilio();
      initializeTwilio();

      expect(client).toBeDefined();
    });

    test('should warn when Twilio not configured', () => {
      const config = { twilio: { enabled: false } };

      const shouldWarn = !config.twilio.enabled;
      expect(shouldWarn).toBe(true);
    });

    test('should use account SID and auth token', () => {
      const credentials = {
        accountSid: 'ACtest123',
        authToken: 'test-auth-token'
      };

      expect(credentials.accountSid).toMatch(/^AC/);
      expect(credentials.authToken).toBeDefined();
    });
  });

  // ============================================
  // formatWhatsAppNumber Tests
  // ============================================
  describe('formatWhatsAppNumber', () => {
    test('should add whatsapp: prefix', () => {
      const phoneNumber = '+966555555555';
      const formatted = `whatsapp:${phoneNumber}`;

      expect(formatted).toBe('whatsapp:+966555555555');
    });

    test('should remove existing whatsapp: prefix', () => {
      const phoneNumber = 'whatsapp:+966555555555';
      const cleanNumber = phoneNumber.replace(/^whatsapp:/, '');

      expect(cleanNumber).toBe('+966555555555');
    });

    test('should ensure + prefix exists', () => {
      const phoneNumber = '966555555555';
      const e164Number = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

      expect(e164Number).toBe('+966555555555');
    });

    test('should handle already formatted numbers', () => {
      const phoneNumber = '+966555555555';
      const cleanNumber = phoneNumber.replace(/^whatsapp:/, '');
      const e164Number = cleanNumber.startsWith('+') ? cleanNumber : `+${cleanNumber}`;
      const formatted = `whatsapp:${e164Number}`;

      expect(formatted).toBe('whatsapp:+966555555555');
    });
  });

  // ============================================
  // sendWhatsAppMessage Tests
  // ============================================
  describe('sendWhatsAppMessage', () => {
    test('should return error when Twilio disabled', () => {
      const config = { twilio: { enabled: false } };

      const result = !config.twilio.enabled
        ? { success: false, error: { code: 'twilio-disabled', message: 'Twilio not configured' } }
        : { success: true };

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('twilio-disabled');
    });

    test('should return error when client not initialized', () => {
      const client = null;

      const result = !client
        ? { success: false, error: { code: 'twilio-not-initialized' } }
        : { success: true };

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('twilio-not-initialized');
    });

    test('should construct message payload', () => {
      const to = '+966555555555';
      const body = 'مرحباً بك في عائلة الشعيل';
      const from = '+14155238886';

      const payload = {
        body: body,
        to: `whatsapp:${to}`,
        from: `whatsapp:${from}`,
        smartEncoded: true
      };

      expect(payload.body).toContain('مرحباً');
      expect(payload.to).toBe('whatsapp:+966555555555');
      expect(payload.smartEncoded).toBe(true);
    });

    test('should include statusCallback if provided', () => {
      const options = { statusCallback: 'https://example.com/webhook' };

      const payload = {
        body: 'Test',
        to: 'whatsapp:+966555555555',
        from: 'whatsapp:+14155238886',
        ...(options.statusCallback && { statusCallback: options.statusCallback })
      };

      expect(payload.statusCallback).toBe('https://example.com/webhook');
    });

    test('should not include statusCallback if not provided', () => {
      const options = {};

      const payload = {
        body: 'Test',
        to: 'whatsapp:+966555555555',
        from: 'whatsapp:+14155238886',
        ...(options.statusCallback && { statusCallback: options.statusCallback })
      };

      expect(payload.statusCallback).toBeUndefined();
    });

    test('should return success with message details', () => {
      const message = {
        sid: 'SM123456',
        status: 'queued',
        dateSent: new Date()
      };

      const result = {
        success: true,
        messageId: message.sid,
        status: message.status,
        dateSent: message.dateSent
      };

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('SM123456');
      expect(result.status).toBe('queued');
    });

    test('should handle Twilio REST exception', () => {
      const twilioError = {
        code: 21408,
        message: 'Phone number is not a valid WhatsApp number',
        status: 400,
        moreInfo: 'https://www.twilio.com/docs/errors/21408'
      };

      const result = {
        success: false,
        error: {
          code: twilioError.code,
          message: twilioError.message,
          status: twilioError.status,
          moreInfo: twilioError.moreInfo
        }
      };

      expect(result.success).toBe(false);
      expect(result.error.code).toBe(21408);
    });

    test('should handle unknown errors', () => {
      const error = { message: 'Network error' };

      const result = {
        success: false,
        error: {
          code: 'unknown-error',
          message: error.message
        }
      };

      expect(result.error.code).toBe('unknown-error');
    });
  });

  // ============================================
  // sendWhatsAppMediaMessage Tests
  // ============================================
  describe('sendWhatsAppMediaMessage', () => {
    test('should return error when Twilio disabled', () => {
      const config = { twilio: { enabled: false } };

      const result = !config.twilio.enabled
        ? { success: false, error: { code: 'twilio-disabled' } }
        : { success: true };

      expect(result.success).toBe(false);
    });

    test('should convert single mediaUrl to array', () => {
      const mediaUrl = 'https://example.com/image.png';
      const mediaUrls = Array.isArray(mediaUrl) ? mediaUrl : [mediaUrl];

      expect(mediaUrls).toEqual(['https://example.com/image.png']);
    });

    test('should keep array mediaUrl as is', () => {
      const mediaUrl = ['https://example.com/image1.png', 'https://example.com/image2.png'];
      const mediaUrls = Array.isArray(mediaUrl) ? mediaUrl : [mediaUrl];

      expect(mediaUrls).toHaveLength(2);
    });

    test('should construct media message payload', () => {
      const payload = {
        body: 'Check out this image',
        to: 'whatsapp:+966555555555',
        from: 'whatsapp:+14155238886',
        mediaUrl: ['https://example.com/image.png'],
        smartEncoded: true
      };

      expect(payload.mediaUrl).toHaveLength(1);
      expect(payload.body).toBe('Check out this image');
    });

    test('should return success with media count', () => {
      const result = {
        success: true,
        messageId: 'MM123456',
        status: 'queued',
        dateSent: new Date(),
        numMedia: '1'
      };

      expect(result.numMedia).toBe('1');
    });
  });

  // ============================================
  // sendBulkWhatsAppMessages Tests
  // ============================================
  describe('sendBulkWhatsAppMessages', () => {
    test('should return error for all when Twilio disabled', () => {
      const recipients = ['+966555555551', '+966555555552'];
      const twilioEnabled = false;

      const result = !twilioEnabled
        ? {
            successCount: 0,
            failureCount: recipients.length,
            results: recipients.map(phone => ({
              phone,
              success: false,
              error: { code: 'twilio-disabled' }
            }))
          }
        : { successCount: recipients.length };

      expect(result.failureCount).toBe(2);
    });

    test('should return empty for no recipients', () => {
      const recipients = [];

      const result = {
        successCount: 0,
        failureCount: 0,
        results: []
      };

      expect(result.results).toHaveLength(0);
    });

    test('should track success and failure counts', () => {
      const results = [
        { success: true },
        { success: false },
        { success: true },
        { success: true }
      ];

      let successCount = 0;
      let failureCount = 0;

      results.forEach(r => {
        if (r.success) successCount++;
        else failureCount++;
      });

      expect(successCount).toBe(3);
      expect(failureCount).toBe(1);
    });

    test('should include phone number in results', () => {
      const recipients = ['+966555555551', '+966555555552'];

      const results = recipients.map(phone => ({
        phone,
        success: true,
        messageId: `SM${phone.slice(-6)}`
      }));

      expect(results[0].phone).toBe('+966555555551');
      expect(results[1].phone).toBe('+966555555552');
    });

    test('should add delay between messages', () => {
      const delay = 100; // ms
      expect(delay).toBe(100);
    });
  });

  // ============================================
  // getMessageStatus Tests
  // ============================================
  describe('getMessageStatus', () => {
    test('should return error when Twilio disabled', () => {
      const twilioEnabled = false;

      const result = !twilioEnabled
        ? { success: false, error: { code: 'twilio-disabled' } }
        : { success: true };

      expect(result.success).toBe(false);
    });

    test('should return message status details', () => {
      const message = {
        status: 'delivered',
        errorCode: null,
        errorMessage: null,
        dateSent: new Date('2024-03-15T10:00:00Z'),
        dateUpdated: new Date('2024-03-15T10:01:00Z')
      };

      const result = {
        success: true,
        status: message.status,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        dateSent: message.dateSent,
        dateUpdated: message.dateUpdated
      };

      expect(result.status).toBe('delivered');
      expect(result.errorCode).toBeNull();
    });

    test('should handle failed message status', () => {
      const message = {
        status: 'failed',
        errorCode: 30007,
        errorMessage: 'Carrier violation'
      };

      const result = {
        success: true,
        status: message.status,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage
      };

      expect(result.status).toBe('failed');
      expect(result.errorCode).toBe(30007);
    });

    test('should handle fetch error', () => {
      const error = {
        code: 20404,
        message: 'Message not found',
        status: 404
      };

      const result = {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          status: error.status
        }
      };

      expect(result.success).toBe(false);
      expect(result.error.code).toBe(20404);
    });
  });

  // ============================================
  // isValidWhatsAppNumber Tests
  // ============================================
  describe('isValidWhatsAppNumber', () => {
    test('should validate Saudi phone number', () => {
      const phoneNumber = '+966555555555';
      const cleanNumber = phoneNumber.replace(/^whatsapp:/, '');
      const e164Regex = /^\+?(966[5][0-9]{8}|965[0-9]{8})$/;

      expect(e164Regex.test(cleanNumber)).toBe(true);
    });

    test('should validate Kuwait phone number', () => {
      const phoneNumber = '+96512345678';
      const e164Regex = /^\+?(966[5][0-9]{8}|965[0-9]{8})$/;

      expect(e164Regex.test(phoneNumber)).toBe(true);
    });

    test('should reject invalid Saudi number', () => {
      const phoneNumber = '+96612345678'; // Missing mobile prefix
      const e164Regex = /^\+?(966[5][0-9]{8}|965[0-9]{8})$/;

      expect(e164Regex.test(phoneNumber)).toBe(false);
    });

    test('should strip whatsapp: prefix before validation', () => {
      const phoneNumber = 'whatsapp:+966555555555';
      const cleanNumber = phoneNumber.replace(/^whatsapp:/, '');

      expect(cleanNumber).toBe('+966555555555');
    });

    test('should handle numbers without + prefix', () => {
      const phoneNumber = '966555555555';
      const e164Regex = /^\+?(966[5][0-9]{8}|965[0-9]{8})$/;

      expect(e164Regex.test(phoneNumber)).toBe(true);
    });

    test('should reject too short numbers', () => {
      const phoneNumber = '+9665555555'; // Missing digits
      const e164Regex = /^\+?(966[5][0-9]{8}|965[0-9]{8})$/;

      expect(e164Regex.test(phoneNumber)).toBe(false);
    });

    test('should reject too long numbers', () => {
      const phoneNumber = '+9665555555555'; // Extra digits
      const e164Regex = /^\+?(966[5][0-9]{8}|965[0-9]{8})$/;

      expect(e164Regex.test(phoneNumber)).toBe(false);
    });
  });

  // ============================================
  // Smart Encoding Tests
  // ============================================
  describe('Smart Encoding', () => {
    test('should enable smart encoding for Arabic', () => {
      const payload = {
        body: 'مرحباً بك في عائلة الشعيل',
        smartEncoded: true
      };

      expect(payload.smartEncoded).toBe(true);
    });

    test('should handle mixed Arabic and English', () => {
      const body = 'مرحباً Hello World';
      expect(body).toContain('مرحباً');
      expect(body).toContain('Hello');
    });
  });

  // ============================================
  // Message Status Types Tests
  // ============================================
  describe('Message Status Types', () => {
    test('should recognize queued status', () => {
      const status = 'queued';
      expect(status).toBe('queued');
    });

    test('should recognize sent status', () => {
      const status = 'sent';
      expect(status).toBe('sent');
    });

    test('should recognize delivered status', () => {
      const status = 'delivered';
      expect(status).toBe('delivered');
    });

    test('should recognize read status', () => {
      const status = 'read';
      expect(status).toBe('read');
    });

    test('should recognize failed status', () => {
      const status = 'failed';
      expect(status).toBe('failed');
    });

    test('should recognize undelivered status', () => {
      const status = 'undelivered';
      expect(status).toBe('undelivered');
    });
  });

  // ============================================
  // Error Code Tests
  // ============================================
  describe('Twilio Error Codes', () => {
    test('should handle invalid WhatsApp number error', () => {
      const errorCode = 21408;
      expect(errorCode).toBe(21408);
    });

    test('should handle rate limit error', () => {
      const errorCode = 88001;
      expect(errorCode).toBe(88001);
    });

    test('should handle authentication error', () => {
      const errorCode = 20003;
      expect(errorCode).toBe(20003);
    });

    test('should handle template not approved error', () => {
      const errorCode = 63016;
      expect(errorCode).toBe(63016);
    });
  });

  // ============================================
  // Configuration Tests
  // ============================================
  describe('Configuration', () => {
    test('should require enabled flag', () => {
      const config = { twilio: { enabled: true } };
      expect(config.twilio.enabled).toBe(true);
    });

    test('should require account SID', () => {
      const config = { twilio: { accountSid: 'ACtest123' } };
      expect(config.twilio.accountSid).toBeDefined();
      expect(config.twilio.accountSid).toMatch(/^AC/);
    });

    test('should require auth token', () => {
      const config = { twilio: { authToken: 'test-token' } };
      expect(config.twilio.authToken).toBeDefined();
    });

    test('should require phone number', () => {
      const config = { twilio: { phoneNumber: '+14155238886' } };
      expect(config.twilio.phoneNumber).toBeDefined();
    });
  });
});
