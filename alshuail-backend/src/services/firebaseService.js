/**
 * Firebase Cloud Messaging (FCM) Service
 *
 * Handles push notification sending to iOS, Android, and Web devices
 * using Firebase Admin SDK with latest v1 API patterns from Context7
 *
 * Features:
 * - Single device push notifications
 * - Multicast (same message to multiple devices)
 * - Batch sending (different messages to multiple devices)
 * - Platform-specific configurations (Android, iOS, Web)
 * - Bilingual support (Arabic/English)
 * - Error handling with token cleanup
 * - Rich notifications with images and custom data
 */

import admin from 'firebase-admin';
import { config } from '../config/env.js';
import { log } from '../utils/logger.js';

// Initialize Firebase Admin SDK
let firebaseInitialized = false;

/**
 * Initialize Firebase Admin SDK
 * Only initializes once per application lifecycle
 */
function initializeFirebase() {
  if (firebaseInitialized) {
    return;
  }

  if (!config.firebase.enabled) {
    log.warn('Firebase not configured - push notifications disabled');
    return;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.firebase.projectId,
        clientEmail: config.firebase.clientEmail,
        privateKey: config.firebase.privateKey,
      }),
    });

    firebaseInitialized = true;
    log.info('Firebase Admin SDK initialized successfully');
  } catch (error) {
    log.error('Failed to initialize Firebase Admin SDK', { error: error.message });
    throw error;
  }
}

/**
 * Send push notification to a single device
 *
 * @param {string} token - FCM registration token
 * @param {Object} notification - Notification payload
 * @param {string} notification.title - Notification title
 * @param {string} notification.body - Notification body
 * @param {string} [notification.imageUrl] - Optional image URL
 * @param {Object} [data] - Optional custom data payload (all values must be strings)
 * @param {Object} [options] - Optional platform-specific options
 * @returns {Promise<{success: boolean, messageId?: string, error?: Object}>}
 */
export async function sendPushNotification(token, notification, data = {}, options = {}) {
  if (!config.firebase.enabled) {
    return {
      success: false,
      error: { code: 'firebase-disabled', message: 'Firebase not configured' }
    };
  }

  initializeFirebase();

  try {
    const message = {
      token: token,
      notification: {
        title: notification.title,
        body: notification.body,
        ...(notification.imageUrl && { imageUrl: notification.imageUrl })
      },
      data: data,
      android: {
        priority: 'high',
        notification: {
          channelId: 'default',
          sound: 'default',
          defaultSound: true,
          defaultVibrateTimings: true,
          ...options.android?.notification
        },
        ...options.android
      },
      apns: {
        headers: {
          'apns-priority': '10'
        },
        payload: {
          aps: {
            alert: {
              title: notification.title,
              body: notification.body
            },
            sound: 'default',
            badge: options.apns?.badge || 1,
            ...options.apns?.payload?.aps
          }
        },
        ...options.apns
      },
      webpush: {
        notification: {
          title: notification.title,
          body: notification.body,
          ...(notification.imageUrl && { icon: notification.imageUrl })
        },
        ...options.webpush
      }
    };

    const response = await admin.messaging().send(message);

    log.info('Push notification sent successfully', { messageId: response });

    return {
      success: true,
      messageId: response
    };

  } catch (error) {
    log.error('Error sending push notification', { error: error.message, code: error.code });

    // Handle specific Firebase errors
    const errorResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message
      }
    };

    // Check for invalid/unregistered tokens (should be removed from database)
    if (error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered') {
      errorResponse.shouldRemoveToken = true;
    }

    return errorResponse;
  }
}

/**
 * Send same notification to multiple devices (multicast)
 * More efficient than sending individual messages
 *
 * @param {string[]} tokens - Array of FCM registration tokens (max 500)
 * @param {Object} notification - Notification payload
 * @param {Object} [data] - Optional custom data payload
 * @param {Object} [options] - Optional platform-specific options
 * @returns {Promise<{successCount: number, failureCount: number, results: Array}>}
 */
export async function sendMulticastNotification(tokens, notification, data = {}, options = {}) {
  if (!config.firebase.enabled) {
    return {
      successCount: 0,
      failureCount: tokens.length,
      results: tokens.map(token => ({
        token,
        success: false,
        error: { code: 'firebase-disabled', message: 'Firebase not configured' }
      }))
    };
  }

  if (!tokens || tokens.length === 0) {
    return {
      successCount: 0,
      failureCount: 0,
      results: []
    };
  }

  // Limit to 500 tokens per Firebase requirement
  if (tokens.length > 500) {
    log.warn('Token count exceeds Firebase limit, truncating', { tokenCount: tokens.length, limit: 500 });
    tokens = tokens.slice(0, 500);
  }

  initializeFirebase();

  try {
    const message = {
      tokens: tokens,
      notification: {
        title: notification.title,
        body: notification.body,
        ...(notification.imageUrl && { imageUrl: notification.imageUrl })
      },
      data: data,
      android: {
        priority: 'high',
        ttl: 3600 * 1000, // 1 hour
        notification: {
          channelId: 'default',
          sound: 'default',
          defaultSound: true,
          defaultVibrateTimings: true,
          ...options.android?.notification
        },
        ...options.android
      },
      apns: {
        headers: {
          'apns-priority': '10'
        },
        payload: {
          aps: {
            alert: {
              title: notification.title,
              body: notification.body
            },
            sound: 'default',
            badge: options.apns?.badge || 1,
            ...options.apns?.payload?.aps
          }
        },
        ...options.apns
      }
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    log.info('Multicast notification results', { successCount: response.successCount, failureCount: response.failureCount });

    // Process results to identify invalid tokens
    const results = response.responses.map((resp, idx) => {
      if (!resp.success) {
        const shouldRemove =
          resp.error.code === 'messaging/invalid-registration-token' ||
          resp.error.code === 'messaging/registration-token-not-registered';

        if (shouldRemove) {
          log.debug('Invalid FCM token should be removed', { tokenSuffix: tokens[idx].slice(-8) });
        }

        return {
          token: tokens[idx],
          success: false,
          error: {
            code: resp.error.code,
            message: resp.error.message
          },
          shouldRemoveToken: shouldRemove
        };
      }

      return {
        token: tokens[idx],
        success: true,
        messageId: resp.messageId
      };
    });

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
      results: results
    };

  } catch (error) {
    log.error('Error sending multicast notification', { error: error.message, code: error.code });

    return {
      successCount: 0,
      failureCount: tokens.length,
      results: tokens.map(token => ({
        token,
        success: false,
        error: {
          code: error.code,
          message: error.message
        }
      }))
    };
  }
}

/**
 * Send different notifications to multiple devices
 * Use when each device needs personalized content
 *
 * @param {Array<{token: string, notification: Object, data?: Object}>} messages - Array of message configurations
 * @returns {Promise<{successCount: number, failureCount: number, results: Array}>}
 */
export async function sendBatchNotifications(messages) {
  if (!config.firebase.enabled) {
    return {
      successCount: 0,
      failureCount: messages.length,
      results: messages.map(msg => ({
        token: msg.token,
        success: false,
        error: { code: 'firebase-disabled', message: 'Firebase not configured' }
      }))
    };
  }

  if (!messages || messages.length === 0) {
    return {
      successCount: 0,
      failureCount: 0,
      results: []
    };
  }

  // Limit to 500 messages per Firebase requirement
  if (messages.length > 500) {
    log.warn('Message count exceeds Firebase limit, truncating', { messageCount: messages.length, limit: 500 });
    messages = messages.slice(0, 500);
  }

  initializeFirebase();

  try {
    const firebaseMessages = messages.map(msg => ({
      token: msg.token,
      notification: {
        title: msg.notification.title,
        body: msg.notification.body,
        ...(msg.notification.imageUrl && { imageUrl: msg.notification.imageUrl })
      },
      data: msg.data || {},
      android: {
        priority: 'high',
        notification: {
          channelId: 'default',
          sound: 'default',
          badge: msg.badge || 1
        }
      },
      apns: {
        payload: {
          aps: {
            badge: msg.badge || 1,
            sound: 'default'
          }
        }
      }
    }));

    const response = await admin.messaging().sendEach(firebaseMessages);

    log.info('Batch notification results', { successCount: response.successCount, failureCount: response.failureCount });

    const results = response.responses.map((resp, idx) => {
      if (!resp.success) {
        const shouldRemove =
          resp.error.code === 'messaging/invalid-registration-token' ||
          resp.error.code === 'messaging/registration-token-not-registered';

        return {
          token: messages[idx].token,
          success: false,
          error: {
            code: resp.error.code,
            message: resp.error.message
          },
          shouldRemoveToken: shouldRemove
        };
      }

      return {
        token: messages[idx].token,
        success: true,
        messageId: resp.messageId
      };
    });

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
      results: results
    };

  } catch (error) {
    log.error('Error sending batch notifications', { error: error.message, code: error.code });

    return {
      successCount: 0,
      failureCount: messages.length,
      results: messages.map(msg => ({
        token: msg.token,
        success: false,
        error: {
          code: error.code,
          message: error.message
        }
      }))
    };
  }
}

/**
 * Send data-only message (silent push for background sync)
 *
 * @param {string} token - FCM registration token
 * @param {Object} data - Data payload (all values must be strings)
 * @returns {Promise<{success: boolean, messageId?: string, error?: Object}>}
 */
export async function sendDataMessage(token, data) {
  if (!config.firebase.enabled) {
    return {
      success: false,
      error: { code: 'firebase-disabled', message: 'Firebase not configured' }
    };
  }

  initializeFirebase();

  try {
    const message = {
      token: token,
      data: data,
      android: {
        priority: 'high'
      },
      apns: {
        headers: {
          'apns-priority': '10',
          'apns-push-type': 'background'
        },
        payload: {
          aps: {
            'content-available': 1
          }
        }
      }
    };

    const response = await admin.messaging().send(message);

    log.info('Data message sent successfully', { messageId: response });

    return {
      success: true,
      messageId: response
    };

  } catch (error) {
    log.error('Error sending data message', { error: error.message, code: error.code });

    return {
      success: false,
      error: {
        code: error.code,
        message: error.message
      },
      shouldRemoveToken:
        error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered'
    };
  }
}

export default {
  sendPushNotification,
  sendMulticastNotification,
  sendBatchNotifications,
  sendDataMessage
};
