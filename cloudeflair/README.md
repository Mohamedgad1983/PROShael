# Cloudflare Deployment Configuration

This directory contains all the necessary configuration files for deploying the Al-Shuail Family Management System to Cloudflare Pages and Workers.

## 📁 Files Overview

### Core Configuration Files

- **`.pages.json`** - Main Cloudflare Pages configuration
- **`wrangler.toml`** - Cloudflare Workers/Pages configuration for CLI deployments
- **`build.config.js`** - Comprehensive build configuration with optimization settings
- **`.env.cloudflare.example`** - Environment variables template
- **`post-build.js`** - Post-build optimization script

## 🚀 Quick Start

### 1. Install Wrangler CLI

```bash
npm install -g wrangler
```

### 2. Login to Cloudflare

```bash
wrangler login
# Or from the frontend directory:
npm run cf:login
```

### 3. Configure Environment Variables

```bash
cp cloudeflair/.env.cloudflare.example cloudeflair/.env.cloudflare
# Edit the file with your actual values
```

### 4. Build and Deploy

#### For Production:
```bash
cd alshuail-admin-arabic
npm run cf:publish
```

#### For Preview/Staging:
```bash
cd alshuail-admin-arabic
npm run cf:preview
```

## 📝 Configuration Details

### Build Settings

The project is configured to use:
- **Node.js**: 20.11.1 (required for react-router v7)
- **Build Command**: `npm run build:cloudflare`
- **Output Directory**: `alshuail-admin-arabic/build`
- **Memory Allocation**: 8GB for production builds

### Environment Variables

Key environment variables needed:
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID
- `CLOUDFLARE_API_TOKEN` - API token with Pages permissions
- `REACT_APP_API_URL` - Backend API URL
- `REACT_APP_SUPABASE_URL` - Supabase project URL
- `REACT_APP_SUPABASE_ANON_KEY` - Supabase anonymous key

### Deployment URLs

- **Production**: `https://alshuail.com`
- **Staging**: `https://staging.alshuail.com`
- **Preview**: `https://preview.alshuail.pages.dev`

## 🛠️ Available Scripts

From the `alshuail-admin-arabic` directory:

```bash
# Build for Cloudflare
npm run build:cloudflare

# Deploy to Cloudflare Pages
npm run deploy:cloudflare

# Deploy preview branch
npm run deploy:cloudflare:preview

# Local development with Cloudflare
npm run cf:dev

# Full build and deploy
npm run cf:publish

# Check Cloudflare login status
npm run cf:whoami
```

## 📋 Features Configured

### Security Headers
- X-Frame-Options: DENY
- Content-Security-Policy with strict rules
- X-XSS-Protection enabled
- Referrer-Policy: strict-origin-when-cross-origin

### Performance Optimizations
- Static asset caching (1 year)
- Gzip compression
- Image optimization (WebP/AVIF)
- Code splitting
- Tree shaking

### Arabic/RTL Support
- RTL text direction
- Arabic font preloading
- Locale-specific routing

### PWA Features
- Service Worker with offline support
- App manifest for installability
- Cache strategies for API and assets

## 🔧 Troubleshooting

### Build Failures

If the build fails with memory errors:
```bash
NODE_OPTIONS="--max-old-space-size=8192" npm run build:cloudflare
```

### Missing Dependencies

Ensure all dependencies are installed:
```bash
cd alshuail-admin-arabic
npm ci --prefer-offline
```

### Node Version Issues

Make sure you're using Node.js 20.x:
```bash
nvm use 20
# or
fnm use 20
```

### Cloudflare Login Issues

If `wrangler login` fails:
1. Clear wrangler config: `rm ~/.wrangler/config/default.toml`
2. Try browser-based login: `wrangler login --browser`
3. Or use API token: `wrangler config` and paste your token

## 📊 Build Validation

The post-build script validates:
- Required files exist (index.html, manifest.json, etc.)
- Security headers are generated
- Redirects are properly configured
- Service Worker is optimized
- Sitemap and robots.txt are created

## 🌍 Custom Domains

To add custom domains:

1. Go to Cloudflare Pages dashboard
2. Select your project
3. Go to "Custom domains" tab
4. Add your domain (e.g., `alshuail.com`)
5. Update DNS records as instructed

## 🔄 Continuous Deployment

The project supports automatic deployments:
- Push to `main` branch → Production deployment
- Push to `develop` branch → Staging deployment
- Pull requests → Preview deployments

## 📦 Advanced Features

### Cloudflare Workers (Edge Functions)

The configuration includes support for:
- Edge middleware for security headers
- API proxying to backend
- Custom routing logic
- A/B testing capabilities

### KV Storage

Configured namespaces:
- `CACHE` - For caching API responses
- `SESSIONS` - For user session management
- `CONFIG` - For runtime configuration

### R2 Storage

Configured buckets:
- `alshuail-files` - General file storage
- `alshuail-receipts` - Payment receipts
- `alshuail-backups` - Automated backups

## 🔒 Security Considerations

1. Never commit `.env.cloudflare` with actual secrets
2. Use Cloudflare's secret management for sensitive data
3. Enable Bot Fight Mode in Cloudflare dashboard
4. Configure rate limiting for API routes
5. Use Turnstile for form protection

## 📈 Monitoring

Enable monitoring through:
1. Cloudflare Analytics
2. Web Analytics (RUM)
3. Workers Analytics
4. Custom logging to R2

## 🆘 Support

For issues or questions:
1. Check Cloudflare Pages documentation
2. Review build logs in Cloudflare dashboard
3. Check GitHub Actions logs for CI/CD issues
4. Contact Cloudflare support for platform issues