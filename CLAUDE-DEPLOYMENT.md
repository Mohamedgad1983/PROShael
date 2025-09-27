# CLAUDE-DEPLOYMENT.md

This file provides deployment and infrastructure guidance to Claude Code (claude.ai/code) when working with this repository.

## CI/CD Pipeline Implementation (Latest Update)

### Overview
Complete enterprise-grade CI/CD infrastructure implemented with GitHub Actions, Docker, and multi-environment deployment support for the Al-Shuail Family Management System.

### GitHub Actions Workflows

#### Frontend Pipeline (`.github/workflows/frontend-ci-cd.yml`)
- **Node.js 18** environment with TypeScript support
- **Arabic RTL** text validation and layout testing
- **ESLint** with Arabic text support
- **React Testing** with RTL support and coverage reporting
- **Multi-environment builds**:
  - `develop` branch → Staging (Vercel)
  - `main` branch → Production (Vercel)
- **Performance auditing** with Lighthouse
- **Security scanning** for vulnerabilities
- **Artifact retention** for 7 days

#### Backend Pipeline (`.github/workflows/backend-ci-cd.yml`)
- **Node.js 18** with PostgreSQL 15 testing
- **ES Modules** support configuration
- **Security audit** automation
- **Docker multi-stage builds** for optimization
- **Database migrations** handling
- **Health check** validation
- **Multi-environment deployments**:
  - `develop` branch → Staging (Railway)
  - `main` branch → Production (Railway)
- **Islamic calendar** validation tests
- **RBAC role** validation

### Docker Infrastructure

#### Production Dockerfiles
- **Multi-stage builds** for size optimization (base → production)
- **Alpine Linux** base for security
- **Non-root user** (alshuail:1001) for security
- **Health checks** integrated
- **Arabic text libraries** support

#### Docker Compose Files
- **Development** (`docker-compose.yml`): Hot reload, PostgreSQL, Redis
- **Production** (`docker-compose.prod.yml`): Scaling, monitoring, backups
- **Custom network**: alshuail-network for service isolation

### Environment Configuration

#### Environment Templates
- **Comprehensive `.env.example`** with 200+ configuration options
- **Environment setup script** (`setup-env.js`) for automated configuration
- **Multi-environment support**: development, staging, production
- **Security-first approach**: JWT secrets, encryption keys, API tokens

#### Platform Configurations
- **Vercel** (`vercel.json`): Frontend deployment with Arabic optimization
- **Railway** (`railway.toml`): Backend deployment with auto-scaling
- **Nginx**: RTL content serving and caching

### Enhanced Package.json Scripts

#### Root-level Orchestration
```json
{
  "scripts": {
    "dev": "concurrently npm:dev:*",
    "docker:dev": "docker-compose up",
    "docker:prod": "docker-compose -f docker-compose.prod.yml up",
    "health-check": "node scripts/health-check.js",
    "pre-deploy:production": "npm run lint && npm run test:ci && npm run security-audit",
    "setup:env": "node scripts/setup-env.js",
    "rtl-check": "node scripts/rtl-check.js",
    "hijri-test": "node scripts/hijri-test.js"
  }
}
```

#### CI/CD Specific Scripts
- **Linting**: `lint`, `lint:check`, `lint:fix`
- **Testing**: `test`, `test:coverage`, `test:integration`, `test:ci`
- **Security**: `security-audit`, `security-fix`
- **Docker**: `docker:build`, `docker:run`, `docker:push`
- **Deployment**: `deploy:staging`, `deploy:production`

### Deployment Commands

#### Initial Setup
```bash
# Setup environment variables
npm run setup:env

# Validate configuration
npm run validate:env

# Test locally with Docker
npm run docker:dev
```

#### Deployment Workflow
```bash
# Pre-deployment checks
npm run pre-deploy:production

# Deploy to staging (automatic on push to develop)
git push origin develop

# Deploy to production (automatic on push to main)
git push origin main
```

## Cloudflare Pages Deployment (Current Production)

### Live URL
- **Production**: https://alshuail-admin.pages.dev
- **Preview**: https://[deployment-id].alshuail-admin.pages.dev

### Manual Deployment Process
```bash
# 1. Navigate to frontend directory
cd alshuail-admin-arabic

# 2. Build the project (when TypeScript issue is fixed)
npm run build

# 3. Deploy to Cloudflare Pages
wrangler pages deploy build --project-name=alshuail-admin --env-file .env.local --commit-dirty=true
```

### Quick Deploy (Using Existing Build)
```bash
cd alshuail-admin-arabic && wrangler pages deploy build --project-name=alshuail-admin --env-file .env.local --commit-dirty=true
```

### Cloudflare Configuration
- **Project Name**: alshuail-admin
- **Account ID**: 425423960a5734e5ede200086b63fb4c
- **API Token**: Stored in .env.local (with Pages:Edit permissions)
- **Build Output**: alshuail-admin-arabic/build/

## 🚀 Deployment & Infrastructure

### Production URLs
- **Frontend (Admin Dashboard)**: https://alshuail-admin.pages.dev
- **Backend API**: https://proshael.onrender.com
- **API Health Check**: https://proshael.onrender.com/api/health
- **Database**: Supabase (oneiggrfzagqjbkdinin)

### Deployment Platforms
- **Frontend**: Cloudflare Pages (automatic deployment via GitHub Actions)
- **Backend**: Render.com (free tier with auto-deploy from GitHub)
- **Database**: Supabase (PostgreSQL with Row Level Security)

### CI/CD Pipeline
1. **Push to main branch** triggers automatic deployment
2. **GitHub Actions** builds and deploys frontend to Cloudflare Pages
3. **Render** auto-deploys backend on new commits
4. **Deployment time**: ~2-3 minutes for frontend, ~5 minutes for backend

### GitHub Secrets Configuration
```
# Required for Frontend Deployment
CLOUDFLARE_API_TOKEN=<your-cloudflare-api-token>
REACT_APP_SUPABASE_URL=https://oneiggrfzagqjbkdinin.supabase.co
REACT_APP_SUPABASE_ANON_KEY=<your-supabase-anon-key>
REACT_APP_API_URL=https://proshael.onrender.com

# Optional for future enhancements
SLACK_WEBHOOK_URL=<for-deployment-notifications>
SENTRY_DSN=<for-error-monitoring>
```

### Environment Variables (Backend - Render)
```
NODE_ENV=production
PORT=5001
SUPABASE_URL=https://oneiggrfzagqjbkdinin.supabase.co
SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_KEY=<your-supabase-service-key>
JWT_SECRET=<your-jwt-secret>
FRONTEND_URL=https://alshuail-admin.pages.dev
```

### Deployment Commands
```bash
# Deploy frontend (automatic via GitHub Actions)
git add .
git commit -m "your changes"
git push origin main

# Manual frontend deployment (if needed)
cd alshuail-admin-arabic
npm run build
wrangler pages deploy build --project-name=alshuail-admin

# Backend deploys automatically on Render
# Manual restart if needed via Render dashboard
```

### Important Deployment Notes
- **Frontend**: Deploys automatically on push to main branch via GitHub Actions
- **Backend**: Auto-deploys from GitHub to Render (may take 30s to wake after inactivity)
- **Free Tier Limitations**:
  - Render backend sleeps after 15 min inactivity
  - First request after sleep takes ~30 seconds
  - Use UptimeRobot to keep backend awake (optional)
- **CORS**: Backend configured to accept requests from Cloudflare Pages domains

### Quality Assurance Features
- **Automated testing** on every push
- **Code coverage** reporting (minimum 80%)
- **Security vulnerability** scanning
- **Arabic RTL** layout validation
- **Islamic calendar** accuracy testing
- **Performance benchmarking** (< 3s load time)
- **Bundle size** analysis
- **Lighthouse scores** monitoring

### Monitoring & Health Checks
- **Health endpoint**: `/health` with comprehensive system checks
- **Database connectivity** monitoring
- **Arabic font loading** validation
- **Hijri date conversion** accuracy
- **API response time** tracking (< 500ms target)
- **Container health** monitoring with auto-restart

### Zero-Downtime Deployment
- **Rolling updates** for container deployments
- **Database migration** safety checks
- **Automatic rollback** on failure
- **Blue-green deployment** support
- **Feature flags** for gradual rollout

### Arabic & Islamic Features Support
- **RTL validation** in all pipelines
- **Arabic text processing** libraries in Docker
- **Hijri calendar** testing automation
- **Arabic font** optimization in builds
- **Prayer time API** integration ready
- **Islamic date** formatting validation