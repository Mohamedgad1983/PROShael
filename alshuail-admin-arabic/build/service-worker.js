// ========================================
// Al-Shuail PWA Service Worker
// Enables offline functionality and caching
// ========================================

const CACHE_NAME = 'alshuail-v1.0.2-purple-fixed';
const RUNTIME_CACHE = 'alshuail-runtime-v1.0.2';

// Files to cache on install
const PRECACHE_URLS = [
    '/mobile/',
    '/mobile/login.html',
    '/mobile/dashboard.html',
    '/mobile/css/mobile.css',
    '/mobile/js/app.js',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png'
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
