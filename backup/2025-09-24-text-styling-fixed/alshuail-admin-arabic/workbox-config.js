// Workbox configuration for Al-Shuail PWA
// Advanced caching strategies and offline functionality

module.exports = {
  globDirectory: 'build/',
  globPatterns: [
    '**/*.{html,js,css,png,jpg,jpeg,svg,ico,woff,woff2,ttf,eot}'
  ],
  swDest: 'build/workbox-sw.js',
  swSrc: 'public/sw.js',

  // Additional settings
  skipWaiting: true,
  clientsClaim: true,

  // Ignore patterns
  globIgnores: [
    '**/node_modules/**/*',
    'sw.js',
    'workbox-sw.js'
  ],

  // Define runtime caching strategies
  runtimeCaching: [
    // Cache API calls with Network First strategy
    {
      urlPattern: /^https:\/\/.*\/api\/.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'alshuail-api-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 30, // 30 minutes
        },
        networkTimeoutSeconds: 10,
        cacheableResponse: {
          statuses: [0, 200],
        },
        backgroundSync: {
          name: 'api-background-sync',
          options: {
            maxRetentionTime: 24 * 60, // 24 hours in minutes
          },
        },
      },
    },

    // Cache images with Cache First strategy
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'alshuail-images-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },

    // Cache fonts with Cache First strategy
    {
      urlPattern: /\.(?:woff|woff2|ttf|eot)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'alshuail-fonts-cache',
        expiration: {
          maxEntries: 20,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },

    // Cache Google Fonts with Stale While Revalidate
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'google-fonts-stylesheets',
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },

    // Cache Google Fonts files
    {
      urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-webfonts',
        expiration: {
          maxEntries: 30,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },

    // Cache static assets with Stale While Revalidate
    {
      urlPattern: /\.(?:js|css)$/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'alshuail-static-resources',
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },

    // Cache navigation requests with Network First
    {
      urlPattern: /^https:\/\/.*\/(members|reports|payments|documents|settings)/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'alshuail-pages-cache',
        expiration: {
          maxEntries: 20,
          maxAgeSeconds: 60 * 60 * 24, // 24 hours
        },
        networkTimeoutSeconds: 3,
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },

    // Cache CDN resources
    {
      urlPattern: /^https:\/\/cdn\..*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'alshuail-cdn-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
  ],

  // Manifest settings
  manifestTransforms: [
    (manifestEntries) => {
      // Custom manifest transform logic
      const updatedEntries = manifestEntries.map((entry) => {
        // Add cache busting for certain files
        if (entry.url.endsWith('.js') || entry.url.endsWith('.css')) {
          entry.url += `?v=${Date.now()}`;
        }
        return entry;
      });

      return { manifest: updatedEntries };
    },
  ],

  // Mode settings
  mode: 'production',

  // Additional Workbox modules to include
  additionalManifestEntries: [
    { url: '/offline.html', revision: null },
    { url: '/members', revision: null },
    { url: '/reports', revision: null },
    { url: '/payments', revision: null },
    { url: '/documents', revision: null },
    { url: '/settings', revision: null },
  ],
};