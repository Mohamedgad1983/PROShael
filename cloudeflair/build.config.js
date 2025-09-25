/**
 * Cloudflare Pages Build Configuration
 * Handles the build process for the Al-Shuail Admin Dashboard
 */

const fs = require('fs');
const path = require('path');

// Build configuration for Cloudflare Pages
const buildConfig = {
  // Node.js version requirement
  nodeVersion: '20.11.1',

  // Build commands based on environment
  commands: {
    install: 'cd alshuail-admin-arabic && npm ci --prefer-offline --no-audit',
    build: {
      production: 'cd alshuail-admin-arabic && NODE_OPTIONS="--max-old-space-size=8192" npm run build:production',
      preview: 'cd alshuail-admin-arabic && NODE_OPTIONS="--max-old-space-size=4096" npm run build'
    },
    postBuild: 'node cloudeflair/post-build.js'
  },

  // Output directory configuration
  output: {
    directory: 'alshuail-admin-arabic/build',
    publicPath: '/'
  },

  // Environment-specific settings
  environments: {
    production: {
      NODE_ENV: 'production',
      GENERATE_SOURCEMAP: 'false',
      INLINE_RUNTIME_CHUNK: 'false',
      IMAGE_INLINE_SIZE_LIMIT: '10000',
      REACT_APP_ENV: 'production'
    },
    preview: {
      NODE_ENV: 'development',
      GENERATE_SOURCEMAP: 'true',
      INLINE_RUNTIME_CHUNK: 'false',
      IMAGE_INLINE_SIZE_LIMIT: '10000',
      REACT_APP_ENV: 'staging'
    }
  },

  // Build optimization settings
  optimization: {
    splitChunks: true,
    minify: true,
    treeshake: true,
    compression: 'gzip',
    bundleSizeLimit: '500kb'
  },

  // Asset handling
  assets: {
    // Files to copy to build directory
    staticFiles: [
      'public/favicon.ico',
      'public/logo192.png',
      'public/logo512.png',
      'public/manifest.json',
      'public/robots.txt'
    ],
    // Asset optimization
    images: {
      formats: ['webp', 'avif'],
      quality: 85,
      lazy: true
    },
    fonts: {
      preload: ['arabic-fonts/*.woff2'],
      display: 'swap'
    }
  },

  // PWA configuration
  pwa: {
    enabled: true,
    manifest: 'manifest.json',
    workbox: {
      globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/api\.alshuail\.com/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-cache',
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 300 // 5 minutes
            }
          }
        },
        {
          urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'image-cache',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
            }
          }
        }
      ]
    }
  },

  // Security headers (merged with .pages.json)
  security: {
    csp: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'img-src': ["'self'", 'data:', 'https:', 'blob:'],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'connect-src': ["'self'", 'https://api.alshuail.com', 'wss://api.alshuail.com'],
      'frame-ancestors': ["'none'"]
    }
  },

  // Arabic/RTL specific settings
  rtl: {
    enabled: true,
    defaultDirection: 'rtl',
    languages: ['ar'],
    fonts: {
      primary: 'SF Arabic',
      fallback: ['Segoe UI Arabic', 'Arial', 'sans-serif']
    }
  },

  // Performance budgets
  performance: {
    budgets: [
      {
        type: 'bundle',
        name: 'main',
        maximumWarning: '300kb',
        maximumError: '500kb'
      },
      {
        type: 'bundle',
        name: 'vendor',
        maximumWarning: '500kb',
        maximumError: '1mb'
      }
    ],
    metrics: {
      fcp: 2000, // First Contentful Paint
      lcp: 2500, // Largest Contentful Paint
      fid: 100,  // First Input Delay
      cls: 0.1   // Cumulative Layout Shift
    }
  }
};

module.exports = buildConfig;