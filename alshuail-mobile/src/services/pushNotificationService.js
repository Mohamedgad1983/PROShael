/**
 * Push Notification Service
 * صندوق عائلة شعيل العنزي
 *
 * Handles Firebase Cloud Messaging (FCM) for push notifications
 * - Permission request
 * - Token registration
 * - Notification handling
 */

import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import api from '../utils/api'

// Firebase configuration
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDV_8GEXglt-rnftvs37GaTKGKbUIth5yA",
  authDomain: "i-o-s-shaael-gqra2n-ef788.firebaseapp.com",
  projectId: "i-o-s-shaael-gqra2n-ef788",
  storageBucket: "i-o-s-shaael-gqra2n-ef788.firebasestorage.app",
  messagingSenderId: "384257332256",
  appId: "1:384257332256:web:11d2543409f62f655ad845"
}

// VAPID Key for web push
const VAPID_KEY = 'BFOJB7exHm1YgARigl7e85CMVkkZJnAEgoM7oHVdFefgjZGYdO8a4tsstug1jJ7TwiXpCtm5pdrCsPD6Eriv0S4'

let firebaseApp = null
let messaging = null
let isInitialized = false

/**
 * Initialize Firebase
 */
const initializeFirebase = () => {
  if (isInitialized) return true

  try {
    firebaseApp = initializeApp(FIREBASE_CONFIG)
    messaging = getMessaging(firebaseApp)
    isInitialized = true
    console.log('✅ Firebase initialized successfully')
    return true
  } catch (error) {
    console.error('❌ Failed to initialize Firebase:', error)
    return false
  }
}

/**
 * Check if push notifications are supported
 */
export const isPushSupported = () => {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/**
 * Get current notification permission status
 */
export const getPermissionStatus = () => {
  if (!('Notification' in window)) {
    return 'unsupported'
  }
  return Notification.permission // 'granted', 'denied', 'default'
}

/**
 * Request notification permission
 */
export const requestPermission = async () => {
  if (!isPushSupported()) {
    console.warn('Push notifications not supported')
    return { success: false, error: 'غير مدعوم' }
  }

  try {
    const permission = await Notification.requestPermission()
    console.log('Notification permission:', permission)

    if (permission === 'granted') {
      return { success: true, permission }
    } else if (permission === 'denied') {
      return { success: false, error: 'تم رفض الإذن', permission }
    } else {
      return { success: false, error: 'لم يتم الرد', permission }
    }
  } catch (error) {
    console.error('Permission request error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Register service worker for push notifications
 */
export const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers not supported')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/'
    })
    console.log('✅ Service Worker registered:', registration.scope)
    return registration
  } catch (error) {
    console.error('❌ Service Worker registration failed:', error)
    return null
  }
}

/**
 * Get FCM token for push notifications
 */
export const getFCMToken = async () => {
  if (!isPushSupported()) {
    return { success: false, error: 'غير مدعوم' }
  }

  const permission = getPermissionStatus()
  if (permission !== 'granted') {
    return { success: false, error: 'يرجى السماح بالإشعارات أولاً' }
  }

  try {
    // Register service worker first
    const registration = await registerServiceWorker()
    if (!registration) {
      return { success: false, error: 'فشل تسجيل Service Worker' }
    }

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready

    // Initialize Firebase
    const initialized = initializeFirebase()
    if (!initialized) {
      return { success: false, error: 'فشل تهيئة Firebase' }
    }

    // Get token using Firebase SDK
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    })

    if (token) {
      console.log('✅ FCM Token obtained:', token.substring(0, 20) + '...')
      return { success: true, token }
    } else {
      return { success: false, error: 'لم يتم الحصول على الرمز' }
    }
  } catch (error) {
    console.error('❌ FCM Token error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Register device token with backend
 */
export const registerDeviceToken = async (token, memberId = null) => {
  try {
    const response = await api.post('/notifications/push/register', {
      token,
      memberId,
      platform: 'web'
    })

    console.log('✅ Device token registered with backend')
    return response.data
  } catch (error) {
    console.error('❌ Failed to register device token:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Unregister device token
 */
export const unregisterDeviceToken = async (token) => {
  try {
    const response = await api.post('/notifications/push/unregister', { token })
    console.log('✅ Device token unregistered')
    return response.data
  } catch (error) {
    console.error('❌ Failed to unregister device token:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Setup foreground message handler
 */
export const setupForegroundHandler = (callback) => {
  if (!isInitialized || !messaging) {
    console.warn('Firebase not initialized')
    return
  }

  onMessage(messaging, (payload) => {
    console.log('📬 Foreground message received:', payload)

    // Show notification manually for foreground
    if (Notification.permission === 'granted') {
      const notification = new Notification(payload.notification?.title || 'صندوق عائلة شعيل', {
        body: payload.notification?.body,
        icon: '/logo.png',
        badge: '/logo.png',
        dir: 'rtl',
        lang: 'ar',
        tag: payload.data?.type || 'foreground',
        data: payload.data
      })

      notification.onclick = () => {
        window.focus()
        if (payload.data?.click_action) {
          window.location.href = payload.data.click_action
        }
        notification.close()
      }
    }

    // Call custom callback
    if (callback) {
      callback(payload)
    }
  })
}

/**
 * Complete push notification setup
 * Call this after user logs in
 */
export const setupPushNotifications = async (memberId = null) => {
  console.log('🔔 Setting up push notifications...')

  // Check support
  if (!isPushSupported()) {
    console.warn('Push notifications not supported on this device')
    return { success: false, error: 'غير مدعوم', reason: 'browser_not_supported' }
  }

  // Request permission
  const permissionResult = await requestPermission()
  if (!permissionResult.success) {
    console.warn('Notification permission not granted:', permissionResult)
    return { success: false, error: permissionResult.error, reason: 'permission_denied' }
  }

  // Get FCM token
  const tokenResult = await getFCMToken()
  if (!tokenResult.success) {
    console.error('Failed to get FCM token:', tokenResult)
    return { success: false, error: tokenResult.error, reason: 'token_failed' }
  }

  // Register with backend
  const registerResult = await registerDeviceToken(tokenResult.token, memberId)
  if (!registerResult.success) {
    console.error('Failed to register token with backend:', registerResult)
    return { success: false, error: registerResult.error, reason: 'registration_failed' }
  }

  // Store token locally
  localStorage.setItem('fcm_token', tokenResult.token)

  console.log('✅ Push notifications setup complete!')
  return {
    success: true,
    token: tokenResult.token,
    message: 'تم تفعيل الإشعارات بنجاح'
  }
}

/**
 * Check if notifications are enabled
 */
export const isNotificationsEnabled = () => {
  return getPermissionStatus() === 'granted' && !!localStorage.getItem('fcm_token')
}

/**
 * Show test notification
 */
export const showTestNotification = () => {
  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted')
    return false
  }

  const notification = new Notification('🔔 اختبار الإشعارات', {
    body: 'تم تفعيل الإشعارات بنجاح! ستصلك التنبيهات الآن.',
    icon: '/logo.png',
    badge: '/logo.png',
    dir: 'rtl',
    lang: 'ar',
    tag: 'test',
    requireInteraction: false
  })

  notification.onclick = () => {
    window.focus()
    notification.close()
  }

  setTimeout(() => notification.close(), 5000)
  return true
}

export default {
  isPushSupported,
  getPermissionStatus,
  requestPermission,
  registerServiceWorker,
  getFCMToken,
  registerDeviceToken,
  unregisterDeviceToken,
  setupForegroundHandler,
  setupPushNotifications,
  isNotificationsEnabled,
  showTestNotification
}
