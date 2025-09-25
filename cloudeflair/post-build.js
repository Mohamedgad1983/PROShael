#!/usr/bin/env node

/**
 * Post-build script for Cloudflare Pages
 * Runs after the main build to optimize and prepare files for deployment
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const BUILD_DIR = path.join(__dirname, '../alshuail-admin-arabic/build');
const STATIC_DIR = path.join(BUILD_DIR, 'static');

// Post-build tasks
const tasks = {
  // Generate _headers file for Cloudflare Pages
  generateHeaders() {
    console.log('📝 Generating _headers file...');
    const headers = `/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.alshuail.com wss://api.alshuail.com; frame-ancestors 'none';

/static/*
  Cache-Control: public, max-age=31536000, immutable

/*.js
  Cache-Control: public, max-age=31536000, immutable
  Content-Type: application/javascript; charset=utf-8

/*.css
  Cache-Control: public, max-age=31536000, immutable
  Content-Type: text/css; charset=utf-8

/*.woff2
  Cache-Control: public, max-age=31536000, immutable
  Content-Type: font/woff2

/index.html
  Cache-Control: no-cache, no-store, must-revalidate
  Content-Type: text/html; charset=utf-8

/manifest.json
  Cache-Control: public, max-age=3600
  Content-Type: application/manifest+json; charset=utf-8

/service-worker.js
  Cache-Control: no-cache, no-store, must-revalidate
  Content-Type: application/javascript; charset=utf-8

/api/*
  Cache-Control: no-cache, no-store, must-revalidate
`;

    fs.writeFileSync(path.join(BUILD_DIR, '_headers'), headers);
    console.log('✅ _headers file generated');
  },

  // Generate _redirects file for Cloudflare Pages
  generateRedirects() {
    console.log('📝 Generating _redirects file...');
    const redirects = `# Redirects for Al-Shuail App

# API proxy redirects
/api/* https://api.alshuail.com/:splat 200

# Legacy routes
/admin/* /members/:splat 301
/dashboard /members 301
/login /auth/login 301

# PWA routes (client-side routing)
/member/* /index.html 200
/members/* /index.html 200
/reports/* /index.html 200
/documents/* /index.html 200
/payments/* /index.html 200
/settings/* /index.html 200
/auth/* /index.html 200

# Force HTTPS
http://alshuail.com/* https://alshuail.com/:splat 301
http://www.alshuail.com/* https://alshuail.com/:splat 301
https://www.alshuail.com/* https://alshuail.com/:splat 301

# Default SPA fallback
/* /index.html 200
`;

    fs.writeFileSync(path.join(BUILD_DIR, '_redirects'), redirects);
    console.log('✅ _redirects file generated');
  },

  // Generate _routes.json for advanced routing
  generateRoutes() {
    console.log('📝 Generating _routes.json...');
    const routes = {
      version: 1,
      include: ['/*'],
      exclude: [
        '/static/*',
        '/*.js',
        '/*.css',
        '/*.png',
        '/*.jpg',
        '/*.jpeg',
        '/*.gif',
        '/*.svg',
        '/*.ico',
        '/*.woff',
        '/*.woff2',
        '/*.ttf',
        '/*.eot',
        '/*.webp',
        '/*.avif'
      ]
    };

    fs.writeFileSync(
      path.join(BUILD_DIR, '_routes.json'),
      JSON.stringify(routes, null, 2)
    );
    console.log('✅ _routes.json generated');
  },

  // Create worker script for edge functions
  generateWorker() {
    console.log('📝 Generating edge worker...');
    const workerContent = `// Cloudflare Pages Functions
export async function onRequest(context) {
  const { request, env, params, waitUntil, next, data } = context;

  // Add security headers
  const response = await next();
  const newHeaders = new Headers(response.headers);

  // Security headers
  newHeaders.set('X-Frame-Options', 'DENY');
  newHeaders.set('X-Content-Type-Options', 'nosniff');
  newHeaders.set('X-XSS-Protection', '1; mode=block');

  // Arabic/RTL support
  if (request.url.includes('/ar/') || request.headers.get('Accept-Language')?.includes('ar')) {
    newHeaders.set('Content-Language', 'ar');
    newHeaders.set('X-Text-Direction', 'rtl');
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

// API middleware for /api/* routes
export async function onRequestPost({ request, env }) {
  // Handle API requests
  if (request.url.includes('/api/')) {
    // Forward to backend API
    const apiUrl = request.url.replace(
      new URL(request.url).origin,
      env.API_URL || 'https://api.alshuail.com'
    );

    return fetch(apiUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body
    });
  }

  return new Response('Not Found', { status: 404 });
}
`;

    const functionsDir = path.join(BUILD_DIR, 'functions');
    if (!fs.existsSync(functionsDir)) {
      fs.mkdirSync(functionsDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(functionsDir, '_middleware.js'),
      workerContent
    );
    console.log('✅ Edge worker generated');
  },

  // Generate build metadata
  generateMetadata() {
    console.log('📝 Generating build metadata...');
    const metadata = {
      buildTime: new Date().toISOString(),
      buildId: crypto.randomBytes(16).toString('hex'),
      version: process.env.CF_PAGES_COMMIT_SHA || 'local',
      branch: process.env.CF_PAGES_BRANCH || 'main',
      nodeVersion: process.version,
      environment: process.env.REACT_APP_ENV || 'production'
    };

    fs.writeFileSync(
      path.join(BUILD_DIR, 'build-metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
    console.log('✅ Build metadata generated');
  },

  // Optimize assets
  optimizeAssets() {
    console.log('🎨 Optimizing assets...');

    // Update paths in service worker
    const swPath = path.join(BUILD_DIR, 'service-worker.js');
    if (fs.existsSync(swPath)) {
      let swContent = fs.readFileSync(swPath, 'utf8');

      // Update cache name with build ID
      const buildId = crypto.randomBytes(8).toString('hex');
      swContent = swContent.replace(
        /CACHE_NAME\s*=\s*['"].*?['"]/g,
        `CACHE_NAME = 'alshuail-cache-${buildId}'`
      );

      fs.writeFileSync(swPath, swContent);
      console.log('✅ Service worker optimized');
    }

    // Create 404.html from index.html for SPA routing
    const indexPath = path.join(BUILD_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
      fs.copyFileSync(indexPath, path.join(BUILD_DIR, '404.html'));
      console.log('✅ 404.html created');
    }
  },

  // Validate build output
  validateBuild() {
    console.log('🔍 Validating build output...');
    const requiredFiles = [
      'index.html',
      'manifest.json',
      'static/js',
      'static/css'
    ];

    const missingFiles = [];
    for (const file of requiredFiles) {
      const filePath = path.join(BUILD_DIR, file);
      if (!fs.existsSync(filePath)) {
        missingFiles.push(file);
      }
    }

    if (missingFiles.length > 0) {
      console.error('❌ Missing required files:', missingFiles.join(', '));
      process.exit(1);
    }

    console.log('✅ Build validation passed');
  },

  // Generate sitemap
  generateSitemap() {
    console.log('📝 Generating sitemap...');
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://alshuail.com/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://alshuail.com/members</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://alshuail.com/reports</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://alshuail.com/payments</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://alshuail.com/documents</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://alshuail.com/member</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>`;

    fs.writeFileSync(path.join(BUILD_DIR, 'sitemap.xml'), sitemap);
    console.log('✅ Sitemap generated');
  },

  // Generate robots.txt
  generateRobots() {
    console.log('📝 Generating robots.txt...');
    const robots = `# Al-Shuail Family Management System
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /auth/
Disallow: /private/
Disallow: /*.json$
Disallow: /*.map$

# Sitemap location
Sitemap: https://alshuail.com/sitemap.xml

# Crawl-delay for bots
Crawl-delay: 1
`;

    fs.writeFileSync(path.join(BUILD_DIR, 'robots.txt'), robots);
    console.log('✅ robots.txt generated');
  }
};

// Main execution
async function main() {
  console.log('🚀 Starting post-build process...');
  console.log(`📁 Build directory: ${BUILD_DIR}`);

  // Check if build directory exists
  if (!fs.existsSync(BUILD_DIR)) {
    console.error('❌ Build directory not found!');
    process.exit(1);
  }

  try {
    // Run all tasks
    tasks.generateHeaders();
    tasks.generateRedirects();
    tasks.generateRoutes();
    tasks.generateWorker();
    tasks.generateMetadata();
    tasks.optimizeAssets();
    tasks.validateBuild();
    tasks.generateSitemap();
    tasks.generateRobots();

    console.log('✨ Post-build process completed successfully!');
  } catch (error) {
    console.error('❌ Post-build error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { tasks, main };