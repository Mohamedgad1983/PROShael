// Service Worker for Al-Shuail Admin Dashboard
// Version: 1.0.0
// Performance optimized caching strategy

const CACHE_NAME = 'al-shuail-v1';
const DYNAMIC_CACHE = 'al-shuail-dynamic-v1';

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/static/css/main.css',
  '/static/js/bundle.js',
  '/manifest.json',
  '/favicon.ico'
];

// Cache API responses for these routes
const API_CACHE_ROUTES = [
  '/api/dashboard/stats',
  '/api/members',
  '/api/settings'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS.map(url =>
          new Request(url, { cache: 'no-cache' })
        ).filter(Boolean));
      })
      .catch(err => console.log('Cache install error:', err))
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name.startsWith('al-shuail') && name !== CACHE_NAME && name !== DYNAMIC_CACHE)
          .map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome extensions
  if (url.protocol === 'chrome-extension:') return;

  // Network first for API calls (with cache fallback)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Cache first for static assets
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // Network first with cache fallback for everything else
  event.respondWith(networkFirstStrategy(request));
});

// Cache first strategy - for static assets
async function cacheFirstStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    // Update cache in background
    fetch(request).then(response => {
      if (response && response.status === 200) {
        cache.put(request, response.clone());
      }
    });
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return new Response('Offline - Asset not available', { status: 503 });
  }
}

// Network first strategy - for dynamic content
async function networkFirstStrategy(request) {
  const cache = await caches.open(DYNAMIC_CACHE);

  try {
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse && networkResponse.status === 200) {
      // Don't cache auth endpoints
      if (!request.url.includes('/auth/')) {
        cache.put(request, networkResponse.clone());
      }
    }

    return networkResponse;
  } catch (error) {
    // Try cache on network failure
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return cache.match('/index.html');
    }

    return new Response('Network error', { status: 503 });
  }
}

// Check if request is for static asset
function isStaticAsset(pathname) {
  const staticExtensions = [
    '.js', '.css', '.png', '.jpg', '.jpeg',
    '.svg', '.gif', '.woff', '.woff2', '.ttf', '.eot'
  ];
  return staticExtensions.some(ext => pathname.endsWith(ext));
}

// Message handler for cache control
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }

  if (event.data === 'clearCache') {
    caches.keys().then(names => {
      names.forEach(name => caches.delete(name));
    });
  }
});