// Al-Shuail PWA Service Worker
// Advanced caching strategies for offline functionality

const CACHE_NAME = 'alshuail-pwa-v1.0.0';
const OFFLINE_PAGE = '/offline.html';
const FALLBACK_IMAGE = '/images/fallback-image.png';

// Assets to cache immediately
const STATIC_CACHE_URLS = [
  '/',
  '/members',
  '/reports',
  '/payments',
  '/documents',
  '/settings',
  '/offline.html',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  // Arabic fonts
  'https://fonts.googleapis.com/css2?family=Cairo:wght@200;300;400;500;600;700;800;900&display=swap',
  'https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400;1,700&display=swap'
];

// API endpoints for network-first caching
const API_CACHE_PATTERNS = [
  /^https?:\/\/.*\/api\/members/,
  /^https?:\/\/.*\/api\/reports/,
  /^https?:\/\/.*\/api\/payments/,
  /^https?:\/\/.*\/api\/expenses/,
  /^https?:\/\/.*\/api\/auth\/profile/
];

// Image cache patterns
const IMAGE_CACHE_PATTERNS = [
  /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
  /^https?:\/\/.*\/images\//,
  /^https?:\/\/.*\/icons\//
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('🚀 Service Worker installing...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching static assets...');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('✅ Static assets cached successfully');
        // Force activation of new service worker
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker activating...');

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all pages
      self.clients.claim()
    ]).then(() => {
      console.log('✅ Service Worker activated successfully');
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other protocols
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // API requests - Network First with fallback
  if (API_CACHE_PATTERNS.some(pattern => pattern.test(request.url))) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Images - Cache First with fallback
  if (IMAGE_CACHE_PATTERNS.some(pattern => pattern.test(request.url))) {
    event.respondWith(cacheFirstStrategy(request, FALLBACK_IMAGE));
    return;
  }

  // Static assets - Cache First
  if (isStaticAsset(request.url)) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // Navigation requests - Network First with offline page
  if (request.mode === 'navigate') {
    event.respondWith(navigationStrategy(request));
    return;
  }

  // Default - Network First
  event.respondWith(networkFirstStrategy(request));
});

// Network First Strategy - for API calls and dynamic content
async function networkFirstStrategy(request) {
  const cacheName = getCacheName(request);

  try {
    // Try network first
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      console.log('🌐 Network response cached:', request.url);
    }

    return networkResponse;
  } catch (error) {
    console.log('📱 Network failed, trying cache:', request.url);

    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('💾 Serving from cache:', request.url);
      return cachedResponse;
    }

    // If API request, return offline data
    if (API_CACHE_PATTERNS.some(pattern => pattern.test(request.url))) {
      return createOfflineResponse(request);
    }

    throw error;
  }
}

// Cache First Strategy - for static assets and images
async function cacheFirstStrategy(request, fallbackUrl = null) {
  const cacheName = getCacheName(request);

  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('💾 Serving from cache:', request.url);
      return cachedResponse;
    }

    // Fallback to network
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache the response
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      console.log('🌐 Network response cached:', request.url);
    }

    return networkResponse;
  } catch (error) {
    console.log('❌ Cache and network failed:', request.url);

    // Try fallback URL if provided
    if (fallbackUrl) {
      const fallbackResponse = await caches.match(fallbackUrl);
      if (fallbackResponse) {
        return fallbackResponse;
      }
    }

    throw error;
  }
}

// Navigation Strategy - for page requests
async function navigationStrategy(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache successful page responses
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('📱 Navigation offline, serving cached page or offline page');

    // Try to serve cached version
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Serve offline page
    const offlinePage = await caches.match(OFFLINE_PAGE);
    if (offlinePage) {
      return offlinePage;
    }

    // Final fallback
    return new Response(
      createOfflineHTML(),
      {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        status: 200
      }
    );
  }
}

// Helper function to determine cache name
function getCacheName(request) {
  if (API_CACHE_PATTERNS.some(pattern => pattern.test(request.url))) {
    return `${CACHE_NAME}-api`;
  }
  if (IMAGE_CACHE_PATTERNS.some(pattern => pattern.test(request.url))) {
    return `${CACHE_NAME}-images`;
  }
  return CACHE_NAME;
}

// Helper function to check if URL is a static asset
function isStaticAsset(url) {
  return /\.(js|css|woff|woff2|ttf|eot)$/.test(url) ||
         url.includes('/static/') ||
         url.includes('/assets/');
}

// Create offline response for API calls
function createOfflineResponse(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Default offline data structure
  let offlineData = {
    success: false,
    offline: true,
    message: 'التطبيق يعمل في وضع عدم الاتصال',
    timestamp: new Date().toISOString()
  };

  // Customize response based on endpoint
  if (pathname.includes('/members')) {
    offlineData.data = [];
    offlineData.message = 'بيانات الأعضاء غير متاحة في وضع عدم الاتصال';
  } else if (pathname.includes('/reports')) {
    offlineData.data = {
      totalExpenses: 0,
      totalMembers: 0,
      monthlyReport: []
    };
    offlineData.message = 'التقارير غير متاحة في وضع عدم الاتصال';
  } else if (pathname.includes('/payments')) {
    offlineData.data = [];
    offlineData.message = 'بيانات المدفوعات غير متاحة في وضع عدم الاتصال';
  }

  return new Response(JSON.stringify(offlineData), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    status: 200
  });
}

// Create offline HTML page
function createOfflineHTML() {
  return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>غير متصل - الشعيل</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Cairo', sans-serif;
                background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                color: white;
                margin: 0;
                padding: 20px;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                text-align: center;
                direction: rtl;
            }
            .container {
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(20px);
                border-radius: 20px;
                padding: 40px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                max-width: 500px;
                width: 100%;
            }
            .icon {
                font-size: 4rem;
                margin-bottom: 20px;
                opacity: 0.8;
            }
            h1 {
                margin: 0 0 20px 0;
                font-size: 2rem;
                font-weight: 600;
            }
            p {
                margin: 0 0 30px 0;
                font-size: 1.1rem;
                opacity: 0.9;
                line-height: 1.6;
            }
            .retry-btn {
                background: linear-gradient(135deg, #007AFF 0%, #5856D6 100%);
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 12px;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                transition: transform 0.2s;
            }
            .retry-btn:hover {
                transform: scale(1.05);
            }
            @keyframes pulse {
                0%, 100% { opacity: 0.8; }
                50% { opacity: 1; }
            }
            .pulse {
                animation: pulse 2s infinite;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="icon pulse">📱</div>
            <h1>غير متصل بالإنترنت</h1>
            <p>يبدو أنك غير متصل بالإنترنت حالياً. يرجى التحقق من اتصالك وإعادة المحاولة.</p>
            <button class="retry-btn" onclick="window.location.reload()">
                إعادة المحاولة
            </button>
        </div>

        <script>
            // Listen for online events
            window.addEventListener('online', () => {
                window.location.reload();
            });
        </script>
    </body>
    </html>
  `;
}

// Background sync for when connection is restored
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag);

  if (event.tag === 'background-sync') {
    event.waitUntil(handleBackgroundSync());
  }
});

// Handle background sync
async function handleBackgroundSync() {
  try {
    // Sync any pending data when connection is restored
    const pendingRequests = await getPendingRequests();

    for (const request of pendingRequests) {
      try {
        await fetch(request.url, request.options);
        console.log('✅ Synced pending request:', request.url);
      } catch (error) {
        console.log('❌ Failed to sync request:', request.url, error);
      }
    }

    // Clear pending requests
    await clearPendingRequests();
  } catch (error) {
    console.error('❌ Background sync failed:', error);
  }
}

// Helper functions for background sync
async function getPendingRequests() {
  // This would retrieve pending requests from IndexedDB
  // For now, return empty array
  return [];
}

async function clearPendingRequests() {
  // This would clear pending requests from IndexedDB
  return Promise.resolve();
}

// Enhanced Push notification handler with Arabic support
self.addEventListener('push', (event) => {
  console.log('📨 Push notification received');

  let notificationData = {
    title: 'إشعار جديد',
    body: 'لديك إشعار جديد من نظام الشعيل',
    icon: '/logo192.png',
    badge: '/favicon-32x32.png',
    dir: 'rtl',
    lang: 'ar',
    tag: 'default',
    data: {},
    vibrate: [200, 100, 200],
    requireInteraction: false
  };

  // Parse push data if available
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = { ...notificationData, ...pushData };
    } catch (error) {
      console.error('❌ Error parsing push data:', error);
    }
  }

  // Customize notification based on type
  if (notificationData.type) {
    switch (notificationData.type) {
      case 'balance-update':
        notificationData.title = 'تحديث الرصيد';
        notificationData.icon = '/logo192.png';
        notificationData.body = `تم تحديث رصيدك إلى ${toArabicNumerals(notificationData.amount || 0)} ر.س`;
        notificationData.actions = [
          { action: 'view-balance', title: 'عرض الرصيد' },
          { action: 'dismiss', title: 'إغلاق' }
        ];
        break;

      case 'new-occasion':
        notificationData.title = `مناسبة جديدة: ${notificationData.occasionType || 'مناسبة'}`;
        notificationData.icon = '/logo192.png';
        notificationData.vibrate = [200, 100, 200, 100, 200];
        notificationData.actions = [
          { action: 'view-details', title: 'عرض التفاصيل' },
          { action: 'rsvp', title: 'تأكيد الحضور' }
        ];
        break;

      case 'new-initiative':
        notificationData.title = 'مبادرة خيرية جديدة';
        notificationData.icon = '/logo192.png';
        notificationData.body = `${notificationData.title} - الهدف: ${toArabicNumerals(notificationData.targetAmount || 0)} ر.س`;
        notificationData.actions = [
          { action: 'donate', title: 'تبرع الآن' },
          { action: 'share', title: 'مشاركة' }
        ];
        break;

      case 'new-diya':
        notificationData.title = 'دية جديدة';
        notificationData.icon = '/logo192.png';
        notificationData.body = `${notificationData.description || 'دية جديدة'} - المطلوب: ${toArabicNumerals(notificationData.targetAmount || 0)} ر.س`;
        notificationData.requireInteraction = true;
        notificationData.vibrate = [300, 200, 300, 200, 300];
        notificationData.actions = [
          { action: 'contribute', title: 'مساهمة' },
          { action: 'view-details', title: 'التفاصيل' }
        ];
        break;

      case 'payment-reminder':
        notificationData.title = 'تذكير بالدفع';
        notificationData.icon = '/logo192.png';
        notificationData.body = `حان موعد دفع الاشتراك الشهري - ${toArabicNumerals(notificationData.amount || 0)} ر.س`;
        notificationData.actions = [
          { action: 'pay-now', title: 'ادفع الآن' },
          { action: 'remind-later', title: 'تذكير لاحقاً' }
        ];
        break;

      case 'family-announcement':
        notificationData.title = 'إعلان عائلي';
        notificationData.icon = '/logo192.png';
        notificationData.actions = [
          { action: 'read-more', title: 'قراءة المزيد' }
        ];
        break;

      default:
        notificationData.actions = [
          { action: 'view', title: 'عرض' },
          { action: 'dismiss', title: 'إغلاق' }
        ];
    }
  }

  // Show notification and cache it
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
      .then(() => {
        console.log('✅ Notification displayed successfully');

        // Cache notification for offline viewing
        return cacheNotificationData({
          id: Date.now(),
          ...notificationData,
          timestamp: new Date().toISOString()
        });
      })
      .catch((error) => {
        console.error('❌ Error showing notification:', error);
      })
  );
});

// Enhanced notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('👆 Notification clicked:', event.notification.tag, 'Action:', event.action);

  event.notification.close();

  const notificationData = event.notification.data || {};
  const action = event.action;

  // Determine target URL based on action and notification type
  let targetUrl = '/member';

  switch (action) {
    case 'view-balance':
      targetUrl = '/member/balance';
      break;
    case 'view-details':
      if (notificationData.type === 'occasion') {
        targetUrl = `/member/occasions/${notificationData.id || ''}`;
      } else if (notificationData.type === 'initiative') {
        targetUrl = `/member/initiatives/${notificationData.id || ''}`;
      } else if (notificationData.type === 'diya') {
        targetUrl = `/member/diyas/${notificationData.id || ''}`;
      } else {
        targetUrl = '/member/notifications';
      }
      break;
    case 'donate':
    case 'contribute':
      targetUrl = `/member/payment?type=${notificationData.type}&id=${notificationData.id || ''}`;
      break;
    case 'pay-now':
      targetUrl = '/member/payment';
      break;
    case 'rsvp':
      targetUrl = `/member/occasions/${notificationData.id || ''}/rsvp`;
      break;
    case 'share':
      // Handle sharing using Web Share API if available
      if (navigator.share && self.clients) {
        event.waitUntil(
          self.clients.matchAll().then(clients => {
            if (clients.length > 0) {
              clients[0].postMessage({
                type: 'share-notification',
                data: {
                  title: event.notification.title,
                  text: event.notification.body,
                  url: self.location.origin + targetUrl
                }
              });
            }
          })
        );
      }
      return;
    case 'remind-later':
      // Schedule reminder for later (would be handled by the app)
      event.waitUntil(
        self.clients.matchAll().then(clients => {
          if (clients.length > 0) {
            clients[0].postMessage({
              type: 'schedule-reminder',
              data: notificationData
            });
          }
        })
      );
      return;
    case 'read-more':
      targetUrl = '/member/announcements';
      break;
    case 'dismiss':
      return;
    case 'view':
    default:
      // Default behavior based on notification type
      if (notificationData.type === 'balance-update') {
        targetUrl = '/member/balance';
      } else if (notificationData.type === 'occasion') {
        targetUrl = `/member/occasions/${notificationData.id || ''}`;
      } else if (notificationData.type === 'initiative') {
        targetUrl = `/member/initiatives/${notificationData.id || ''}`;
      } else if (notificationData.type === 'diya') {
        targetUrl = `/member/diyas/${notificationData.id || ''}`;
      } else {
        targetUrl = '/member/notifications';
      }
  }

  // Open or focus the app window
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open with the target URL
        for (const client of clientList) {
          if (client.url.includes(targetUrl) && 'focus' in client) {
            return client.focus();
          }
        }

        // Check if any app window is open and navigate to target
        for (const client of clientList) {
          if (client.url.includes('/member')) {
            if ('navigate' in client) {
              return client.navigate(targetUrl).then(() => client.focus());
            } else {
              // Fallback: send message to client to navigate
              client.postMessage({
                type: 'navigate-to',
                url: targetUrl
              });
              return client.focus();
            }
          }
        }

        // Open new window if no app window is open
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
      .then((client) => {
        // Send message to client about notification interaction
        if (client) {
          client.postMessage({
            type: 'notification-clicked',
            data: notificationData,
            action: action,
            url: targetUrl
          });
        }
      })
      .catch((error) => {
        console.error('❌ Error handling notification click:', error);
      })
  );
});

// Cache notification data for offline viewing
async function cacheNotificationData(notificationData) {
  try {
    const cache = await caches.open(`${CACHE_NAME}-notifications`);
    const request = new Request(`/notifications/${notificationData.id}`);
    const response = new Response(JSON.stringify(notificationData), {
      headers: { 'Content-Type': 'application/json' }
    });

    await cache.put(request, response);
    console.log('💾 Notification cached for offline viewing');
  } catch (error) {
    console.error('❌ Error caching notification:', error);
  }
}

// Convert numbers to Arabic numerals
function toArabicNumerals(num) {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return num.toString().replace(/[0-9]/g, (digit) => arabicNumerals[parseInt(digit)]);
}

// Handle notification-related messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'cache-notification':
        cacheNotificationData(event.data.notification);
        break;
      case 'clear-notification-cache':
        caches.delete(`${CACHE_NAME}-notifications`);
        break;
      case 'get-cached-notifications':
        getCachedNotifications().then(notifications => {
          event.ports[0].postMessage({ notifications });
        });
        break;
    }
  }
});

// Get cached notifications
async function getCachedNotifications() {
  try {
    const cache = await caches.open(`${CACHE_NAME}-notifications`);
    const requests = await cache.keys();

    const notifications = await Promise.all(
      requests.map(async (request) => {
        const response = await cache.match(request);
        return response.json();
      })
    );

    return notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } catch (error) {
    console.error('❌ Error getting cached notifications:', error);
    return [];
  }
}

console.log('✅ Al-Shuail Service Worker loaded successfully');