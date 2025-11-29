// ========================================
// Al-Shuail PWA Service Worker
// Enables offline functionality and caching
// With Firebase Cloud Messaging Support
// ========================================

// Import Firebase Messaging for background notifications
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyDV_8GEXglt-rnftvs37GaTKGKbUIth5yA",
  authDomain: "i-o-s-shaael-gqra2n-ef788.firebaseapp.com",
  projectId: "i-o-s-shaael-gqra2n-ef788",
  storageBucket: "i-o-s-shaael-gqra2n-ef788.firebasestorage.app",
  messagingSenderId: "384257332256",
  appId: "1:384257332256:web:11d2543409f62f655ad845"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received:', payload);
  
  const notificationTitle = payload.notification?.title || 'إشعار جديد';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: payload.notification?.icon || '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [200, 100, 200],
    data: payload.data || {},
    requireInteraction: true,
    actions: [
      { action: 'open', title: 'فتح' },
      { action: 'close', title: 'إغلاق' }
    ]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'close') return;

  const clickAction = event.notification.data?.click_action || '/dashboard.html';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if app is already open
        for (const client of windowClients) {
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

const CACHE_NAME = 'alshuail-v2.0.0-phase2';
const RUNTIME_CACHE = 'alshuail-runtime-v2';

// Files to cache on install - Phase 2 Complete
const PRECACHE_URLS = [
    '/',
    '/login.html',
    '/dashboard.html',
    '/payment.html',
    '/events.html',
    '/profile.html',
    '/notifications.html',
    '/statements.html',
    '/crisis.html',
    '/family-tree.html',
    '/src/styles/variables.css',
    '/src/styles/components.css',
    '/src/pages/dashboard.css',
    '/src/pages/payment.css',
    '/src/pages/events.css',
    '/src/pages/profile.css',
    '/src/pages/notifications.css',
    '/src/pages/statements.css',
    '/src/pages/crisis.css',
    '/src/pages/family-tree.css',
    '/src/api/api-client.js',
    '/src/state/state-manager.js',
    '/src/state/user-store.js',
    '/src/state/payment-store.js',
    '/src/state/event-store.js',
    '/src/components/navigation.js',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
];

// ========================================
// Install Event - Cache static assets
// ========================================
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[Service Worker] Caching static assets');
                return cache.addAll(PRECACHE_URLS);
            })
            .then(() => self.skipWaiting())
    );
});

// ========================================
// Activate Event - Clean old caches
// ========================================
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    
    const currentCaches = [CACHE_NAME, RUNTIME_CACHE];
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(cacheName => !currentCaches.includes(cacheName))
                        .map(cacheName => {
                            console.log('[Service Worker] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        })
                );
            })
            .then(() => self.clients.claim())
    );
});

// ========================================
// Fetch Event - Serve from cache or network
// ========================================
self.addEventListener('fetch', (event) => {
    // Skip cross-origin requests
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    // Skip API calls for real-time data
    if (event.request.url.includes('/api/')) {
        // Network first for API calls
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Cache successful API responses
                    if (response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(RUNTIME_CACHE).then(cache => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // Fallback to cache if offline
                    return caches.match(event.request);
                })
        );
        return;
    }

    // Cache first for static assets
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    // Update cache in background
                    fetch(event.request).then(response => {
                        caches.open(RUNTIME_CACHE).then(cache => {
                            cache.put(event.request, response);
                        });
                    });
                    return cachedResponse;
                }

                // Not in cache, fetch from network
                return fetch(event.request)
                    .then(response => {
                        // Cache valid responses
                        if (response.status === 200) {
                            const responseClone = response.clone();
                            caches.open(RUNTIME_CACHE).then(cache => {
                                cache.put(event.request, responseClone);
                            });
                        }
                        return response;
                    })
                    .catch(() => {
                        // Offline fallback page
                        if (event.request.mode === 'navigate') {
                            return caches.match('/mobile/offline.html');
                        }
                    });
            })
    );
});

// ========================================
// Push Notification Event
// ========================================
self.addEventListener('push', (event) => {
    console.log('[Service Worker] Push received');
    
    let data = {};
    if (event.data) {
        data = event.data.json();
    }

    const title = data.title || 'صندوق الشعيل';
    const options = {
        body: data.body || 'لديك إشعار جديد',
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-96.png',
        vibrate: [200, 100, 200],
        tag: data.tag || 'default',
        requireInteraction: data.requireInteraction || false,
        actions: [
            {
                action: 'open',
                title: 'فتح',
                icon: '/icons/open.png'
            },
            {
                action: 'close',
                title: 'إغلاق',
                icon: '/icons/close.png'
            }
        ],
        data: {
            url: data.url || '/mobile/dashboard.html',
            dateTime: Date.now()
        },
        dir: 'rtl',
        lang: 'ar'
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// ========================================
// Notification Click Event
// ========================================
self.addEventListener('notificationclick', (event) => {
    console.log('[Service Worker] Notification clicked');
    
    event.notification.close();

    if (event.action === 'close') {
        return;
    }

    const urlToOpen = event.notification.data.url;

    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        })
        .then(windowClients => {
            // Check if there's already a window/tab open
            for (let client of windowClients) {
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            // If no window open, open new one
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

// ========================================
// Background Sync Event (for offline payments)
// ========================================
self.addEventListener('sync', (event) => {
    console.log('[Service Worker] Background sync');
    
    if (event.tag === 'sync-payments') {
        event.waitUntil(syncPendingPayments());
    }
});

async function syncPendingPayments() {
    try {
        // Get pending payments from IndexedDB
        const db = await openDatabase();
        const pendingPayments = await getAllPendingPayments(db);
        
        // Try to sync each payment
        for (let payment of pendingPayments) {
            try {
                const response = await fetch('https://proshael.onrender.com/api/payments', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${payment.token}`
                    },
                    body: JSON.stringify(payment.data)
                });
                
                if (response.ok) {
                    // Remove from pending queue
                    await removePendingPayment(db, payment.id);
                    
                    // Show success notification
                    self.registration.showNotification('تم المزامنة', {
                        body: 'تم إرسال الدفعة بنجاح',
                        icon: '/icons/icon-192.png',
                        tag: 'sync-success'
                    });
                }
            } catch (error) {
                console.error('Failed to sync payment:', error);
            }
        }
    } catch (error) {
        console.error('Background sync failed:', error);
    }
}

// ========================================
// Message Event (for communication with main app)
// ========================================
self.addEventListener('message', (event) => {
    console.log('[Service Worker] Message received:', event.data);
    
    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                );
            })
        );
    }
});

// ========================================
// Helper Functions
// ========================================

function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('AlShuailDB', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('pendingPayments')) {
                db.createObjectStore('pendingPayments', { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}

function getAllPendingPayments(db) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['pendingPayments'], 'readonly');
        const store = transaction.objectStore('pendingPayments');
        const request = store.getAll();
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

function removePendingPayment(db, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['pendingPayments'], 'readwrite');
        const store = transaction.objectStore('pendingPayments');
        const request = store.delete(id);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

// ========================================
// Periodic Background Sync (experimental)
// ========================================
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'update-balance') {
        event.waitUntil(updateCachedBalance());
    }
});

async function updateCachedBalance() {
    try {
        const token = await getStoredToken();
        const response = await fetch('https://proshael.onrender.com/api/members/balance', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            // Update cache with new balance
            const cache = await caches.open(RUNTIME_CACHE);
            await cache.put('/api/members/balance', new Response(JSON.stringify(data)));
        }
    } catch (error) {
        console.error('Failed to update balance:', error);
    }
}

function getStoredToken() {
    return new Promise((resolve) => {
        // This would get token from IndexedDB in production
        resolve(localStorage.getItem('token'));
    });
}

console.log('[Service Worker] Loaded successfully');
