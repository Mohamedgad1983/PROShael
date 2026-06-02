/**
 * Firebase Messaging Service Worker
 * صندوق عائلة شعيل العنزي
 * 
 * Handles background push notifications
 */

importScripts('/firebase-sw-config.js');

const firebaseConfig = self.FIREBASE_WEB_CONFIG || {};
const hasFirebaseConfig = [
  'apiKey',
  'authDomain',
  'projectId',
  'messagingSenderId',
  'appId'
].every((key) => Boolean(firebaseConfig[key]));

let messaging = null;

if (hasFirebaseConfig) {
  // Import Firebase scripts
  importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);

  // Get messaging instance
  messaging = firebase.messaging();

  // Handle background messages
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message:', payload);

    const notificationTitle = payload.notification?.title || 'صندوق عائلة شعيل';
    const notificationOptions = {
      body: payload.notification?.body || '',
      icon: '/logo.png',
      badge: '/logo.png',
      tag: payload.data?.type || 'default',
      data: payload.data,
      dir: 'rtl',
      lang: 'ar',
      vibrate: [200, 100, 200],
      requireInteraction: true,
      actions: [
        { action: 'open', title: 'فتح' },
        { action: 'close', title: 'إغلاق' }
      ]
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
} else {
  console.warn('[firebase-messaging-sw.js] Firebase config missing; background FCM disabled');
}

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event);
  
  event.notification.close();

  const clickAction = event.notification.data?.click_action || '/';
  
  // Handle action buttons
  if (event.action === 'close') {
    return;
  }

  // Open the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(clickAction);
          return client.focus();
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(clickAction);
      }
    })
  );
});

// Handle push event directly (fallback)
self.addEventListener('push', (event) => {
  console.log('[firebase-messaging-sw.js] Push event received');
  
  if (event.data) {
    try {
      const data = event.data.json();
      console.log('[firebase-messaging-sw.js] Push data:', data);
    } catch (e) {
      console.log('[firebase-messaging-sw.js] Push text:', event.data.text());
    }
  }
});

console.log('[firebase-messaging-sw.js] Service Worker loaded');
