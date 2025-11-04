/**
 * Twilio WhatsApp Service
 *
 * Handles WhatsApp message sending using Twilio API
 * with latest Node.js SDK patterns from Context7
 *
 * Features:
 * - WhatsApp text messages
 * - Media messages (images, documents)
 * - Smart encoding for Arabic text
 * - Template messages (future)
 * - Delivery status tracking
 * - Error handling with detailed codes
 */

import twilio from 'twilio';
import { config } from '../config/env.js';

// Initialize Twilio client
let twilioClient = null;

/**
 * Initialize Twilio client
 * Only initializes once per application lifecycle
 */
function initializeTwilio() {
  if (twilioClient) {
    return twilioClient;
  }

  if (!config.twilio.enabled) {
    console.warn('⚠️  Twilio not configured - WhatsApp notifications disabled');
    return null;
  }

  try {
    twilioClient = twilio(config.twilio.accountSid, config.twilio.authToken);
    console.log('✅ Twilio client initialized successfully');
    return twilioClient;
  } catch (error) {
    console.error('❌ Failed to initialize Twilio client:', error.message);
    throw error;
  }
}

/**
 * Format phone number for WhatsApp (add whatsapp: prefix)
 *
 * @param {string} phoneNumber - Phone number in E.164 format (+966XXXXXXXXX)
 * @returns {string} WhatsApp-formatted number (whatsapp:+966XXXXXXXXX)
 */
function formatWhatsAppNumber(phoneNumber) {
  // Remove any existing whatsapp: prefix
  const cleanNumber = phoneNumber.replace(/^whatsapp:/, '');

  // Ensure + prefix exists
  const e164Number = cleanNumber.startsWith('+') ? cleanNumber : `+${cleanNumber}`;

  // Add whatsapp: prefix
  return `whatsapp:${e164Number}`;
}

/**
 * Send WhatsApp text message
 *
 * @param {string} to - Recipient phone number in E.164 format (+966XXXXXXXXX)
 * @param {string} body - Message text (supports Arabic with smart encoding)
 * @param {Object} [options] - Optional configuration
 * @param {string} [options.statusCallback] - URL for delivery status webhooks
 * @returns {Promise<{success: boolean, messageId?: string, status?: string, error?: Object}>}
 */
export async function sendWhatsAppMessage(to, body, options = {}) {
  if (!config.twilio.enabled) {
    return {
      success: false,
      error: { code: 'twilio-disabled', message: 'Twilio not configured' }
    };
  }

  const client = initializeTwilio();
  if (!client) {
    return {
      success: false,
      error: { code: 'twilio-not-initialized', message: 'Twilio client not initialized' }
    };
  }

  try {
    const message = await client.messages.create({
      body: body,
      to: formatWhatsAppNumber(to),
      from: formatWhatsAppNumber(config.twilio.phoneNumber),
      smartEncoded: true, // Latest feature: smart encoding for Arabic text
      ...(options.statusCallback && { statusCallback: options.statusCallback })
    });

    console.log('✅ WhatsApp message sent successfully:', message.sid);
    console.log('   Status:', message.status);
    console.log('   To:', to);

    return {
      success: true,
      messageId: message.sid,
      status: message.status,
      dateSent: message.dateSent
    };

  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error.message);

    // Handle Twilio-specific errors
    if (error instanceof twilio.RestException) {
      console.error('   Twilio Error Code:', error.code);
      console.error('   Twilio Status:', error.status);
      console.error('   More Info:', error.moreInfo);

      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          status: error.status,
          moreInfo: error.moreInfo
        }
      };
    }

    return {
      success: false,
      error: {
        code: 'unknown-error',
        message: error.message
      }
    };
  }
}

/**
 * Send WhatsApp message with media (image, document, etc.)
 *
 * @param {string} to - Recipient phone number in E.164 format
 * @param {string} body - Message text
 * @param {string|string[]} mediaUrl - URL(s) of media to send
 * @param {Object} [options] - Optional configuration
 * @returns {Promise<{success: boolean, messageId?: string, status?: string, error?: Object}>}
 */
export async function sendWhatsAppMediaMessage(to, body, mediaUrl, options = {}) {
  if (!config.twilio.enabled) {
    return {
      success: false,
      error: { code: 'twilio-disabled', message: 'Twilio not configured' }
    };
  }

  const client = initializeTwilio();
  if (!client) {
    return {
      success: false,
      error: { code: 'twilio-not-initialized', message: 'Twilio client not initialized' }
    };
  }

  try {
    // Ensure mediaUrl is an array
    const mediaUrls = Array.isArray(mediaUrl) ? mediaUrl : [mediaUrl];

    const message = await client.messages.create({
      body: body,
      to: formatWhatsAppNumber(to),
      from: formatWhatsAppNumber(config.twilio.phoneNumber),
      mediaUrl: mediaUrls,
      smartEncoded: true,
      ...(options.statusCallback && { statusCallback: options.statusCallback })
    });

    console.log('✅ WhatsApp media message sent successfully:', message.sid);
    console.log('   Status:', message.status);
    console.log('   Media count:', mediaUrls.length);

    return {
      success: true,
      messageId: message.sid,
      status: message.status,
      dateSent: message.dateSent,
      numMedia: message.numMedia
    };

  } catch (error) {
    console.error('❌ Error sending WhatsApp media message:', error.message);

    if (error instanceof twilio.RestException) {
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          status: error.status,
          moreInfo: error.moreInfo
        }
      };
    }

    return {
      success: false,
      error: {
        code: 'unknown-error',
        message: error.message
      }
    };
  }
}

/**
 * Send WhatsApp messages to multiple recipients
 * Note: Sends individual messages, not a group message
 *
 * @param {string[]} recipients - Array of phone numbers in E.164 format
 * @param {string} body - Message text
 * @param {Object} [options] - Optional configuration
 * @returns {Promise<{successCount: number, failureCount: number, results: Array}>}
 */
export async function sendBulkWhatsAppMessages(recipients, body, options = {}) {
  if (!config.twilio.enabled) {
    return {
      successCount: 0,
      failureCount: recipients.length,
      results: recipients.map(phone => ({
        phone,
        success: false,
        error: { code: 'twilio-disabled', message: 'Twilio not configured' }
      }))
    };
  }

  if (!recipients || recipients.length === 0) {
    return {
      successCount: 0,
      failureCount: 0,
      results: []
    };
  }

  const results = [];
  let successCount = 0;
  let failureCount = 0;

  // Send messages sequentially to avoid rate limits
  // For production, consider using Promise.allSettled with rate limiting
  for (const phone of recipients) {
    const result = await sendWhatsAppMessage(phone, body, options);

    if (result.success) {
      successCount++;
      results.push({
        phone,
        success: true,
        messageId: result.messageId,
        status: result.status
      });
    } else {
      failureCount++;
      results.push({
        phone,
        success: false,
        error: result.error
      });
    }

    // Small delay to respect rate limits (adjust based on Twilio plan)
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`📊 Bulk WhatsApp results: ${successCount} successful, ${failureCount} failed`);

  return {
    successCount,
    failureCount,
    results
  };
}

/**
 * Get message delivery status
 *
 * @param {string} messageId - Twilio message SID
 * @returns {Promise<{success: boolean, status?: string, error?: Object}>}
 */
export async function getMessageStatus(messageId) {
  if (!config.twilio.enabled) {
    return {
      success: false,
      error: { code: 'twilio-disabled', message: 'Twilio not configured' }
    };
  }

  const client = initializeTwilio();
  if (!client) {
    return {
      success: false,
      error: { code: 'twilio-not-initialized', message: 'Twilio client not initialized' }
    };
  }

  try {
    const message = await client.messages(messageId).fetch();

    return {
      success: true,
      status: message.status,
      errorCode: message.errorCode,
      errorMessage: message.errorMessage,
      dateSent: message.dateSent,
      dateUpdated: message.dateUpdated
    };

  } catch (error) {
    console.error('❌ Error fetching message status:', error.message);

    if (error instanceof twilio.RestException) {
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          status: error.status
        }
      };
    }

    return {
      success: false,
      error: {
        code: 'unknown-error',
        message: error.message
      }
    };
  }
}

/**
 * Validate phone number format for WhatsApp
 *
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} True if valid E.164 format
 */
export function isValidWhatsAppNumber(phoneNumber) {
  // Remove whatsapp: prefix if present
  const cleanNumber = phoneNumber.replace(/^whatsapp:/, '');

  // E.164 format: +[country code][number]
  // Saudi: +966XXXXXXXXX (12 chars total)
  // Kuwait: +965XXXXXXXX (12 chars total)
  const e164Regex = /^\+?(966[5][0-9]{8}|965[0-9]{8})$/;

  return e164Regex.test(cleanNumber);
}

export default {
  sendWhatsAppMessage,
  sendWhatsAppMediaMessage,
  sendBulkWhatsAppMessages,
  getMessageStatus,
  isValidWhatsAppNumber
};
