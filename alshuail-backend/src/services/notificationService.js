/**
 * Notification Service
 * Unified service for sending notifications via WhatsApp and Push
 *
 * Status: PRODUCTION READY with latest Context7 patterns
 * Features:
 * - WhatsApp notifications via UltraMsg with Twilio compatibility fallback
 * - Push notifications via Firebase Cloud Messaging (FCM v1 API)
 * - Multi-channel delivery with fallback
 * - User preference management
 * - Quiet hours support
 * - Bilingual templates (Arabic/English)
 */

import { log } from '../utils/logger.js';
import * as firebaseService from './firebaseService.js';
import * as ultramsgService from './ultramsgService.js';
import * as twilioService from './twilioService.js';
import { query } from './database.js';

/**
 * Notification types supported
 */
export const NotificationType = {
  EVENT_INVITATION: 'event_invitation',
  PAYMENT_RECEIPT: 'payment_receipt',
  PAYMENT_REMINDER: 'payment_reminder',
  CRISIS_ALERT: 'crisis_alert',
  GENERAL_ANNOUNCEMENT: 'general_announcement',
  RSVP_CONFIRMATION: 'rsvp_confirmation'
};

/**
 * Delivery channels
 */
export const DeliveryChannel = {
  WHATSAPP: 'whatsapp',
  SMS: 'sms',
  PUSH: 'push',
  EMAIL: 'email'
};

/**
 * Send notification via WhatsApp. UltraMsg is primary because it is the
 * configured production provider for member messaging. Twilio remains a
 * compatibility fallback for other installations.
 * @param {string} phoneNumber - Recipient phone number (format: +9665xxxxxxxx)
 * @param {string} message - WhatsApp message text (supports Arabic)
 * @param {Object} [options] - Optional configuration
 * @returns {Promise<Object>} - Delivery status
 */
export async function sendWhatsAppNotification(phoneNumber, message, options = {}) {
  try {
    log.info('WhatsApp notification requested', {
      phone: phoneNumber,
      messageLength: message.length
    });

    let result = await ultramsgService.sendWhatsAppMessage(phoneNumber, message);
    let provider = 'ultramsg';

    if (!result.success) {
      result = await twilioService.sendWhatsAppMessage(phoneNumber, message, options);
      provider = 'twilio';
    }

    if (result.success) {
      log.info('WhatsApp notification sent successfully', {
        messageId: result.messageId,
        status: result.status,
        phone: phoneNumber,
        provider,
      });

      return {
        success: true,
        messageId: result.messageId,
        channel: DeliveryChannel.WHATSAPP,
        provider,
        status: result.status,
        timestamp: new Date().toISOString()
      };
    } else {
      log.error('WhatsApp notification failed', {
        error: result.error,
        phone: phoneNumber
      });

      return {
        success: false,
        error: result.error.message || result.error,
        channel: DeliveryChannel.WHATSAPP
      };
    }

  } catch (error) {
    log.error('WhatsApp notification exception', {
      error: error.message,
      phone: phoneNumber
    });

    return {
      success: false,
      error: error.message,
      channel: DeliveryChannel.WHATSAPP
    };
  }
}

/**
 * Send notification via SMS (Currently disabled - WhatsApp + Push only)
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} message - SMS message text (Arabic or English)
 * @returns {Promise<Object>} - Delivery status
 */
export function sendSMSNotification(phoneNumber, _message) {
  log.info('SMS notification skipped - feature not enabled (WhatsApp + Push only)', {
    phone: phoneNumber
  });

  return {
    success: false,
    error: 'SMS notifications not enabled - using WhatsApp and Push only',
    channel: DeliveryChannel.SMS
  };
}

/**
 * Send push notification via Firebase Cloud Messaging
 * @param {string} userId - User ID (member_id from members table)
 * @param {Object} notification - Notification payload {title, body, imageUrl}
 * @param {Object} [data] - Optional custom data payload
 * @returns {Promise<Object>} - Delivery status
 */
export async function sendPushNotification(userId, notification, data = {}) {
  try {
    log.info('Push notification requested', {
      userId,
      title: notification.title
    });

    // Get all active device tokens for this user
    const { rows: tokens } = await query(
      'SELECT token, platform FROM device_tokens WHERE member_id = $1 AND is_active = $2',
      [userId, true]
    );

    if (!tokens || tokens.length === 0) {
      log.warn('No active device tokens found for user', { userId });
      return {
        success: false,
        error: 'No active devices registered',
        channel: DeliveryChannel.PUSH
      };
    }

    // Send to all user devices using multicast (more efficient)
    const deviceTokens = tokens.map(t => t.token);
    const result = await firebaseService.sendMulticastNotification(
      deviceTokens,
      {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.imageUrl
      },
      data
    );

    // Clean up invalid tokens
    if (result.results) {
      const invalidTokens = result.results
        .filter(r => r.shouldRemoveToken)
        .map(r => r.token);

      if (invalidTokens.length > 0) {
        log.info('Removing invalid device tokens', {
          count: invalidTokens.length,
          userId
        });

        // Mark tokens as inactive
        await query(
          'UPDATE device_tokens SET is_active = $1 WHERE token = ANY($2)',
          [false, invalidTokens]
        );
      }
    }

    if (result.successCount > 0) {
      log.info('Push notification sent successfully', {
        userId,
        devicesReached: result.successCount,
        totalDevices: tokens.length
      });

      return {
        success: true,
        messageId: `push_multicast_${Date.now()}`,
        channel: DeliveryChannel.PUSH,
        status: 'sent',
        devicesReached: result.successCount,
        totalDevices: tokens.length,
        timestamp: new Date().toISOString()
      };
    } else {
      return {
        success: false,
        error: 'Failed to send to any device',
        channel: DeliveryChannel.PUSH
      };
    }

  } catch (error) {
    log.error('Push notification failed', {
      error: error.message,
      userId
    });

    return {
      success: false,
      error: error.message,
      channel: DeliveryChannel.PUSH
    };
  }
}

async function writeDeliveryLog({
  memberId,
  type,
  channel,
  title,
  body,
  status,
  error = null,
  metadata = {},
}) {
  try {
    await query(
      `INSERT INTO notification_logs (
         member_id, title, body, data, status,
         success_count, failure_count, sent_at, error_message, created_at
       ) VALUES ($1, $2, $3, $4::jsonb, $5,
                 CASE WHEN $5 = 'sent' THEN 1 ELSE 0 END,
                 CASE WHEN $5 = 'failed' THEN 1 ELSE 0 END,
                 CASE WHEN $5 = 'sent' THEN NOW() ELSE NULL END,
                 $6, NOW())`,
      [
        memberId,
        title,
        body,
        JSON.stringify({ notification_type: type, channel, ...metadata }),
        status,
        error,
      ]
    );
  } catch (logError) {
    log.warn('Could not write notification delivery log', {
      memberId,
      channel,
      error: logError.message,
    });
  }
}

/**
 * Canonical delivery path for transactional member events.
 *
 * The inbox row is written first and is never removed when an external
 * provider fails. Delivery then prefers Push and falls back to WhatsApp.
 */
export async function createMemberNotification(memberId, {
  title,
  body,
  type = 'general_announcement',
  priority = 'normal',
  relatedId = null,
  relatedType = null,
  actionUrl = null,
  data = {},
}) {
  let inAppStored = false;
  let notificationId = null;

  try {
    const { rows: userRows } = await query(
      `SELECT id
         FROM users
        WHERE id = $1 OR member_id = $1
        ORDER BY CASE WHEN member_id = $1 THEN 0 ELSE 1 END
        LIMIT 1`,
      [memberId]
    );
    const linkedUserId = userRows[0]?.id || null;

    const { rows } = await query(
      `INSERT INTO notifications (
         member_id, user_id, title, title_ar, message, message_ar,
         type, notification_type, priority, is_read, read,
         related_id, related_type, action_url, metadata,
         status, sent_at, created_at
       ) VALUES (
         $1, $2, $3, $3, $4, $4,
         $5, $5, $6, false, false,
         $7, $8, $9, $10::jsonb,
         'sent', NOW(), NOW()
       )
       RETURNING id`,
      [
        memberId,
        linkedUserId,
        title,
        body,
        type,
        priority,
        relatedId,
        relatedType,
        actionUrl,
        JSON.stringify(data),
      ]
    );

    inAppStored = true;
    notificationId = rows[0]?.id || null;
    await writeDeliveryLog({
      memberId,
      type,
      channel: 'in_app',
      title,
      body,
      status: 'sent',
      metadata: { notification_id: notificationId, related_id: relatedId, related_type: relatedType },
    });
  } catch (error) {
    log.warn('Could not persist member notification', { memberId, error: error.message });
    await writeDeliveryLog({ memberId, type, channel: 'in_app', title, body, status: 'failed', error: error.message });
  }

  const pushData = Object.fromEntries(
    Object.entries({ ...data, type, related_id: relatedId, related_type: relatedType })
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)])
  );

  const pushResult = await sendPushNotification(memberId, { title, body }, pushData);
  await writeDeliveryLog({
    memberId,
    type,
    channel: DeliveryChannel.PUSH,
    title,
    body,
    status: pushResult.success ? 'sent' : 'failed',
    error: pushResult.success ? null : pushResult.error,
    metadata: {
      related_id: relatedId,
      related_type: relatedType,
      devices_reached: pushResult.devicesReached || 0,
    },
  });

  if (pushResult.success) {
    return {
      ...pushResult,
      success: true,
      deliveredVia: DeliveryChannel.PUSH,
      inAppStored,
      notificationId,
    };
  }

  try {
    const { rows } = await query(
      'SELECT phone, whatsapp_number FROM members WHERE id = $1 LIMIT 1',
      [memberId]
    );
    const phone = rows[0]?.whatsapp_number || rows[0]?.phone;
    if (phone) {
      const whatsappResult = await sendWhatsAppNotification(phone, `${title}\n${body}`);
      await writeDeliveryLog({
        memberId,
        type,
        channel: DeliveryChannel.WHATSAPP,
        title,
        body,
        status: whatsappResult.success ? 'sent' : 'failed',
        error: whatsappResult.success ? null : whatsappResult.error,
        metadata: {
          related_id: relatedId,
          related_type: relatedType,
          provider: whatsappResult.provider || null,
        },
      });
      if (whatsappResult.success) {
        return {
          ...whatsappResult,
          success: true,
          deliveredVia: DeliveryChannel.WHATSAPP,
          inAppStored,
          notificationId,
        };
      }
    }
  } catch (error) {
    log.warn('WhatsApp fallback failed', { memberId, error: error.message });
  }

  return {
    success: inAppStored,
    deliveredVia: inAppStored ? 'in_app' : null,
    channel: inAppStored ? 'in_app' : null,
    inAppStored,
    notificationId,
    error: inAppStored ? null : (pushResult.error || 'notification_delivery_failed'),
  };
}

/**
 * Send multi-channel notification with fallback
 * @param {Object} recipient - Recipient information
 * @param {Object} notification - Notification content
 * @param {Array<string>} channels - Preferred delivery channels (ordered by priority)
 * @returns {Promise<Object>} - Delivery results
 */
export async function sendMultiChannelNotification(recipient, notification, channels = ['whatsapp', 'sms', 'push']) {
  const results = {
    success: false,
    attempts: [],
    deliveredVia: null
  };

  // Try each channel in order until successful
  for (const channel of channels) {
    let result;

    switch (channel) {
      case DeliveryChannel.WHATSAPP:
        result = await sendWhatsAppNotification(
          recipient.phone,
          notification.message || notification.body
        );
        break;

      case DeliveryChannel.SMS:
        result = await sendSMSNotification(
          recipient.phone,
          notification.message || notification.body
        );
        break;

      case DeliveryChannel.PUSH:
        result = await sendPushNotification(
          recipient.userId,
          {
            title: notification.title,
            body: notification.body,
            imageUrl: notification.imageUrl
          },
          notification.data
        );
        break;

      default:
        log.warn('Unknown notification channel', { channel });
        continue;
    }

    results.attempts.push(result);

    if (result.success) {
      results.success = true;
      results.deliveredVia = channel;
      break; // Stop trying after first successful delivery
    }
  }

  // Log final delivery status
  if (results.success) {
    log.info('Multi-channel notification delivered', {
      channel: results.deliveredVia,
      attempts: results.attempts.length
    });
  } else {
    log.error('Multi-channel notification failed', {
      allChannelsFailed: true,
      attempts: results.attempts.length
    });
  }

  return results;
}

/**
 * Check user notification preferences from database
 * @param {string} userId - User ID (member_id)
 * @returns {Promise<Object>} - User preferences
 */
export async function getUserNotificationPreferences(userId) {
  try {
    // Fetch from user_notification_preferences table
    const { rows } = await query(
      'SELECT * FROM user_notification_preferences WHERE member_id = $1',
      [userId]
    );

    if (!rows || rows.length === 0) {
      log.warn('No preferences found for user, using defaults', { userId });
      return getDefaultPreferences(userId);
    }

    const prefs = rows[0];

    // Map database columns to expected format
    return {
      userId,
      channels: {
        whatsapp: prefs.enable_whatsapp,
        sms: false, // SMS disabled as per requirements
        push: prefs.enable_push,
        email: prefs.enable_email
      },
      types: {
        event_invitation: prefs.event_invitations,
        payment_receipt: prefs.payment_receipts,
        payment_reminder: prefs.payment_reminders,
        crisis_alert: prefs.crisis_alerts,
        general_announcement: prefs.general_announcements,
        rsvp_confirmation: prefs.rsvp_confirmations
      },
      quietHours: {
        enabled: prefs.quiet_hours_enabled,
        start: prefs.quiet_hours_start ? prefs.quiet_hours_start.substring(0, 5) : '22:00',
        end: prefs.quiet_hours_end ? prefs.quiet_hours_end.substring(0, 5) : '07:00'
      },
      language: prefs.preferred_language || 'ar'
    };

  } catch (error) {
    log.error('Error fetching user preferences', {
      error: error.message,
      userId
    });

    // Return defaults on error
    return getDefaultPreferences(userId);
  }
}

/**
 * Get default notification preferences
 * @param {string} userId - User ID
 * @returns {Object} - Default preferences
 */
function getDefaultPreferences(userId) {
  return {
    userId,
    channels: {
      whatsapp: true,
      sms: false, // Disabled as per requirements
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
}

/**
 * Check if current time is within user's quiet hours
 * @param {Object} preferences - User notification preferences
 * @returns {boolean} - True if in quiet hours
 */
export function isInQuietHours(preferences) {
  if (!preferences.quietHours.enabled) {
    return false;
  }

  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  const { start, end } = preferences.quietHours;

  // Handle quiet hours that span midnight (e.g., 22:00 - 07:00)
  if (start > end) {
    return currentTime >= start || currentTime <= end;
  }

  return currentTime >= start && currentTime <= end;
}

/**
 * Send notification respecting user preferences
 * @param {string} userId - User ID
 * @param {string} notificationType - Type of notification
 * @param {Object} notification - Notification content
 * @returns {Promise<Object>} - Delivery result
 */
export async function sendNotificationWithPreferences(userId, notificationType, notification) {
  try {
    // Get user preferences
    const preferences = await getUserNotificationPreferences(userId);

    // Check if user wants this type of notification
    if (!preferences.types[notificationType]) {
      log.info('Notification skipped - user disabled this type', {
        userId,
        type: notificationType
      });
      return {
        success: false,
        reason: 'user_preference_disabled',
        type: notificationType
      };
    }

    // Check quiet hours (except for crisis alerts)
    if (notificationType !== NotificationType.CRISIS_ALERT && isInQuietHours(preferences)) {
      log.info('Notification deferred - quiet hours', {
        userId,
        quietHours: preferences.quietHours
      });

      // Feature: Queue notification for delivery after quiet hours (requires job queue system)
      return {
        success: false,
        reason: 'quiet_hours',
        deferredUntil: preferences.quietHours.end
      };
    }

    // Determine enabled channels
    const enabledChannels = Object.entries(preferences.channels)
      .filter(([_, enabled]) => enabled)
      .map(([channel]) => channel);

    if (enabledChannels.length === 0) {
      log.warn('No notification channels enabled for user', { userId });
      return {
        success: false,
        reason: 'no_channels_enabled'
      };
    }

    // Get recipient information from database
    const { rows: memberRows } = await query(
      'SELECT id, phone, email FROM members WHERE id = $1',
      [userId]
    );

    if (!memberRows || memberRows.length === 0) {
      log.error('Failed to fetch member data', { userId });
      return {
        success: false,
        reason: 'member_not_found'
      };
    }

    const member = memberRows[0];

    const recipient = {
      userId: member.id,
      phone: member.phone,
      email: member.email
    };

    // Send via enabled channels
    const result = await sendMultiChannelNotification(
      recipient,
      notification,
      enabledChannels
    );

    return result;

  } catch (error) {
    log.error('Failed to send notification with preferences', {
      error: error.message,
      userId,
      type: notificationType
    });

    return {
      success: false,
      error: error.message
    };
  }
}

export default {
  NotificationType,
  DeliveryChannel,
  sendWhatsAppNotification,
  sendSMSNotification,
  sendPushNotification,
  createMemberNotification,
  sendMultiChannelNotification,
  getUserNotificationPreferences,
  isInQuietHours,
  sendNotificationWithPreferences
};
