/**
 * Firebase Admin Configuration
 * For Push Notifications (FCM)
 * 
 * @module firebase-admin
 */

import admin from 'firebase-admin';
import { log } from './logger.js';

// Service Account credentials
const serviceAccount = {
  type: "service_account",
  project_id: "i-o-s-shaael-gqra2n-ef788",
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || "0933c9b2bbd84fa8601c7432eeca7eabce7b8c8f",
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDZwPPpoEZal2v3\nPtehtsu3/i3L3RPet9jzBONs/QvQ1mOpyomUN3oWdw9LhDCDa9LXxsFbRJvbn59X\nZtyvZArIszbI7sp/oO0pt0EYWC3RaOvzNZf2Un7Srb4hiw7P0aa/nAl/enQ5A9jC\njX6f9UbOy+nVDHzoe5XsH75gGWwpRB3AdKMB7Lu8Rjw3ARE0UuV+NL+H8Us7gy6t\nM8STWUFP3or7qvq+CaQhAa/I4BOxehKSfx/cAvCOjngZuFtPbp8m2zv+WC8ZmjTE\nDmIDSiMf3xLgcMN6lCCXyLHtnxMMAFHmpBAbBv08ob9/MsNW2tBfNWtJzNHuLyNx\n5d0NseplAgMBAAECggEADL7aiAY1l//c9e/btz931SEvlQsvqo2gSTk0BqEZG/Qw\niTOtsds9bisx3f2yyT56bN7ZWno9lTFWpksDB9EXQIAc6M3xVF8bAqITUVV3+RXn\nGak9Z9GUUsiQpG37Q/bFh9meRLPqMZwkB984ViyJJHmTCkFc3k69i8Cf6AgU6KVU\nYwh3hqYIBxNuMnX3kkgDMfakwAW9gmaoKCop7Ptp9mXIoh1S07I48X58xUEVoMXR\n4fBIXRaTtiV8f+h+g09ur6BiEdL7WkniK6WmZ0QtnDkmQtPkd1+mj2uUYrv0lDhj\nqf9EmoXU30kUQiQ7Ggh0W7S/dz0lC5Q6+UEGmSOcUQKBgQDxXLIv4rSi/IaObnu2\nE2fZnMRrzUImQnDE+bsbS0CGRINaz0PmefVPSlFtExGA2ovlZOxl3bW0tpcSNggk\nqpT1RZ6Cmiz8LViMeLbvHZCGiLlxwY2fCxx8Fv2pXvtvaFz8Xa+yP3XPVS1dJbbJ\nVzggvSDr2K4Nij+s+xz81c9iNwKBgQDm9birPUeq9fmFWTGqqVrMN0WzpsOY0Uk7\nmSfniWieF+tnK7z4+DJ0Fw9oojI39FTF4vN5TR7/u5cfDlVKaTEWltJd8un8YaEx\nZtlQZnywlaDKw/t7Pc7N8Qi16rZfBc8e60LxF3eXzn+gVS42caaH2P8ykAuHNjPl\nrk8orst6QwKBgFInLhN0g+2SLK6gVoVz934viP/0fpaNONsi8Zfptk29VkR7le4G\nBwR1FGAfBG8qdEGhZ4GIxId9OtCdCYqJcWhGyRxFJBi1ypUNpZ6gHohcU1qv+edv\nncNzA+Y5iTWzfSr9LIdsaEopAObapmvDvzwNg/4i46OCMghL9OLuV8djAoGAVhR7\nMYdzcKqgxyyJMFxSdQ6cseqTuB84tjfNAaTbEyFDIX7RvdFzrITzv0HEicpM1jxS\nFoHB7fqSxoZnD4bJPuwTl+RzhRc2Jt14XVj1XDNIbIpC7poIvAT8BCFou13E5nc0\nyfq/Hhtewfk9chlFwhgEdWnuggSXryEaa8VKHVUCgYBV87xFI/h3ifRlsoFAoxza\nMDVPjMeJ4xRxTFVkIlpLmrgfFuJbiLIyKkGpcdY9J+2r1vJunLpt7qJg5qcnvHV2\nAyJvhsrQQGZwsF9vDk6g64cu+Fa9Lej0iSKI8GZ6l7yPSOu4CQ8SirPinaHrf9W0\nUi7BG7yWNmRE2+qK+qPx/w==\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@i-o-s-shaael-gqra2n-ef788.iam.gserviceaccount.com",
  client_id: "104000934539294451754",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40i-o-s-shaael-gqra2n-ef788.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
};

// Initialize Firebase Admin
let firebaseApp = null;

const initializeFirebase = () => {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
    
    log.info('✅ Firebase Admin initialized successfully');
    return firebaseApp;
  } catch (error) {
    log.error('❌ Firebase Admin initialization failed:', { error: error.message });
    return null;
  }
};

// Get Firebase Messaging instance
const getMessaging = () => {
  if (!firebaseApp) {
    initializeFirebase();
  }
  return admin.messaging();
};

/**
 * Send push notification to a single device
 * @param {string} token - FCM device token
 * @param {object} notification - { title, body, icon?, click_action? }
 * @param {object} data - Additional data payload
 */
const sendNotification = async (token, notification, data = {}) => {
  try {
    const messaging = getMessaging();
    
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
    log.error('❌ Failed to send notification:', { error: error.message, token: token.substring(0, 20) + '...' });
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
