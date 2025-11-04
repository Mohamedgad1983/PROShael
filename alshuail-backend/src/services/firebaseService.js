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
    console.warn('⚠️  Firebase not configured - push notifications disabled');
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
    console.log('✅ Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
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

    console.log('✅ Push notification sent successfully:', response);

    return {
      success: true,
      messageId: response
    };

  } catch (error) {
    console.error('❌ Error sending push notification:', error.message);

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
    console.warn(`⚠️  Token count (${tokens.length}) exceeds Firebase limit (500). Truncating.`);
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

    console.log(`📊 Multicast results: ${response.successCount} successful, ${response.failureCount} failed`);

    // Process results to identify invalid tokens
    const results = response.responses.map((resp, idx) => {
      if (!resp.success) {
        const shouldRemove =
          resp.error.code === 'messaging/invalid-registration-token' ||
          resp.error.code === 'messaging/registration-token-not-registered';

        if (shouldRemove) {
          console.log(`🗑️  Token should be removed: ${tokens[idx]}`);
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
    console.error('❌ Error sending multicast notification:', error.message);

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
    console.warn(`⚠️  Message count (${messages.length}) exceeds Firebase limit (500). Truncating.`);
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

    console.log(`📊 Batch results: ${response.successCount} successful, ${response.failureCount} failed`);

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
    console.error('❌ Error sending batch notifications:', error.message);

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

    console.log('✅ Data message sent successfully:', response);

    return {
      success: true,
      messageId: response
    };

  } catch (error) {
    console.error('❌ Error sending data message:', error.message);

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
