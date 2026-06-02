/**
 * Firebase Admin Configuration
 * For Push Notifications (FCM)
 * 
 * @module firebase-admin
 */

import admin from 'firebase-admin';
import { config } from '../config/env.js';
import { log } from './logger.js';

let firebaseApp = null;

const initializeFirebase = () => {
  if (firebaseApp) {
    return firebaseApp;
  }

  if (!config.firebase.enabled) {
    log.warn('Firebase Admin not configured - push notifications disabled');
    return null;
  }

  try {
    firebaseApp = admin.apps.length
      ? admin.app()
      : admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.firebase.projectId,
          clientEmail: config.firebase.clientEmail,
          privateKey: config.firebase.privateKey,
        }),
        projectId: config.firebase.projectId
      });
    
    log.info('Firebase Admin initialized successfully');
    return firebaseApp;
  } catch (error) {
    log.error('Firebase Admin initialization failed:', { error: error.message });
    return null;
  }
};

// Get Firebase Messaging instance
const getMessaging = () => {
  if (!firebaseApp) {
    initializeFirebase();
  }
  return firebaseApp ? admin.messaging(firebaseApp) : null;
};

const firebaseDisabledResult = () => ({
  success: false,
  error: { code: 'firebase-disabled', message: 'Firebase not configured' }
});

/**
 * Send push notification to a single device
 * @param {string} token - FCM device token
 * @param {object} notification - { title, body, icon?, click_action? }
 * @param {object} data - Additional data payload
 */
const sendNotification = async (token, notification, data = {}) => {
  try {
    const messaging = getMessaging();
    if (!messaging) {
      return firebaseDisabledResult();
    }
    
    const message = {
      token,
      notification: {
        title: notification.title,
        body: notification.body,
        ...(notification.icon && { imageUrl: notification.icon })
      },
      data: {
        ...data,
        click_action: notification.click_action || '/'
      },
      webpush: {
        notification: {
          title: notification.title,
          body: notification.body,
          icon: notification.icon || '/icons/icon-192.png',
          badge: '/icons/icon-72.png',
          vibrate: [200, 100, 200],
          requireInteraction: true,
          actions: [
            { action: 'open', title: 'فتح' },
            { action: 'close', title: 'إغلاق' }
          ]
        },
        fcmOptions: {
          link: notification.click_action || '/'
        }
      }
    };

    const response = await messaging.send(message);
    log.info('✅ Notification sent successfully:', { messageId: response });
    return { success: true, messageId: response };
  } catch (error) {
    log.error('❌ Failed to send notification:', { error: error.message, token: `${token.substring(0, 20)}...` });
    return { success: false, error: error.message };
  }
};

/**
 * Send push notification to multiple devices
 * @param {string[]} tokens - Array of FCM device tokens
 * @param {object} notification - { title, body, icon?, click_action? }
 * @param {object} data - Additional data payload
 */
const sendMulticastNotification = async (tokens, notification, data = {}) => {
  if (!tokens || tokens.length === 0) {
    return { success: false, error: 'No tokens provided' };
  }

  try {
    const messaging = getMessaging();
    if (!messaging) {
      return {
        success: false,
        successCount: 0,
        failureCount: tokens.length,
        error: { code: 'firebase-disabled', message: 'Firebase not configured' }
      };
    }
    
    const message = {
      tokens,
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: {
        ...data,
        click_action: notification.click_action || '/'
      },
      webpush: {
        notification: {
          title: notification.title,
          body: notification.body,
          icon: notification.icon || '/icons/icon-192.png',
          badge: '/icons/icon-72.png'
        }
      }
    };

    const response = await messaging.sendEachForMulticast(message);
    
    log.info('✅ Multicast notification sent:', {
      successCount: response.successCount,
      failureCount: response.failureCount
    });

    // Handle failed tokens
    const failedTokens = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        failedTokens.push({
          token: tokens[idx],
          error: resp.error?.message
        });
      }
    });

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      failedTokens
    };
  } catch (error) {
    log.error('❌ Failed to send multicast notification:', { error: error.message });
    return { success: false, error: error.message };
  }
};

/**
 * Send notification to a topic
 * @param {string} topic - Topic name (e.g., 'all_members', 'admins')
 * @param {object} notification - { title, body, icon?, click_action? }
 * @param {object} data - Additional data payload
 */
const sendTopicNotification = async (topic, notification, data = {}) => {
  try {
    const messaging = getMessaging();
    if (!messaging) {
      return firebaseDisabledResult();
    }
    
    const message = {
      topic,
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: {
        ...data,
        click_action: notification.click_action || '/'
      },
      webpush: {
        notification: {
          title: notification.title,
          body: notification.body,
          icon: notification.icon || '/icons/icon-192.png'
        }
      }
    };

    const response = await messaging.send(message);
    log.info('✅ Topic notification sent:', { topic, messageId: response });
    return { success: true, messageId: response };
  } catch (error) {
    log.error('❌ Failed to send topic notification:', { error: error.message, topic });
    return { success: false, error: error.message };
  }
};

/**
 * Subscribe tokens to a topic
 * @param {string[]} tokens - Array of FCM tokens
 * @param {string} topic - Topic name
 */
const subscribeToTopic = async (tokens, topic) => {
  try {
    const messaging = getMessaging();
    if (!messaging) {
      return firebaseDisabledResult();
    }
    const response = await messaging.subscribeToTopic(tokens, topic);
    log.info('✅ Subscribed to topic:', { topic, successCount: response.successCount });
    return { success: true, ...response };
  } catch (error) {
    log.error('❌ Failed to subscribe to topic:', { error: error.message, topic });
    return { success: false, error: error.message };
  }
};

/**
 * Unsubscribe tokens from a topic
 * @param {string[]} tokens - Array of FCM tokens
 * @param {string} topic - Topic name
 */
const unsubscribeFromTopic = async (tokens, topic) => {
  try {
    const messaging = getMessaging();
    if (!messaging) {
      return firebaseDisabledResult();
    }
    const response = await messaging.unsubscribeFromTopic(tokens, topic);
    log.info('✅ Unsubscribed from topic:', { topic, successCount: response.successCount });
    return { success: true, ...response };
  } catch (error) {
    log.error('❌ Failed to unsubscribe from topic:', { error: error.message, topic });
    return { success: false, error: error.message };
  }
};

export {
  initializeFirebase,
  getMessaging,
  sendNotification,
  sendMulticastNotification,
  sendTopicNotification,
  subscribeToTopic,
  unsubscribeFromTopic
};

export default {
  initializeFirebase,
  sendNotification,
  sendMulticastNotification,
  sendTopicNotification,
  subscribeToTopic,
  unsubscribeFromTopic
};
