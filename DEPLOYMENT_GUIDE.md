# Al-Shuail Family Management System - Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the Al-Shuail Family Management System using the enterprise-grade CI/CD pipeline with Arabic RTL support and Islamic calendar integration.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   (React)       │◄──►│   (Node.js)     │◄──►│   (Supabase)    │
│   Port: 3002    │    │   Port: 3001    │    │   PostgreSQL    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Vercel        │    │   Railway       │    │   Supabase      │
│   (Production)  │    │   (Production)  │    │   (Managed)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Prerequisites

### Development Environment
- Node.js 18+ and npm 9+
- Docker and Docker Compose
- Git with SSH keys configured
- VS Code or preferred IDE

### Required Accounts & Services
- GitHub account with repository access
- Supabase project with PostgreSQL database
- Vercel account for frontend deployment
- Railway account for backend deployment
- Docker Hub account for container registry

## Environment Setup

### 1. Clone and Setup Repository

```bash
git clone https://github.com/Mohamedgad1983/PROShael.git
cd PROShael

# Install dependencies for all projects
npm run install:all

# Setup environment configurations
npm run setup:env
```

### 2. Configure Environment Variables

#### Frontend (.env)
```bash
cd alshuail-admin-arabic
cp .env.example .env
```

Edit `.env` with your values:
```env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_ENV=development
PORT=3002
```

#### Backend (.env)
```bash
cd alshuail-backend
cp .env.example .env
```

Edit `.env` with your Supabase credentials:
```env
NODE_ENV=development
PORT=3001
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-anon-public-key
JWT_SECRET=your-generated-jwt-secret
```

### 3. Database Setup

#### Supabase Configuration
1. Create a new Supabase project
2. Copy the project URL and anon key
3. Run the database setup script:
```bash
cd alshuail-backend
psql $SUPABASE_URL -f setupDatabase.sql
```

#### Test Database Connection
```bash
npm run db:test
```

## Local Development

### Start Development Servers

```bash
# Start both frontend and backend
npm run dev

# Or start individually
npm run dev:frontend  # Port 3002
npm run dev:backend   # Port 3001
```

### Using Docker for Development

```bash
# Start all services with Docker Compose
npm run docker:dev

# View logs
npm run docker:logs

# Stop services
npm run docker:down
```

### Available Development Scripts

```bash
# Code quality
npm run lint              # Lint both projects
npm run lint:fix          # Fix linting issues
npm run test              # Run all tests
npm run test:ci           # Run tests for CI

# Arabic/RTL specific
npm run rtl-check         # Validate RTL layout
npm run arabic-validation # Check Arabic content
npm run hijri-test        # Test Islamic calendar

# Health checks
npm run health-check      # Check both services
npm run security-audit    # Security vulnerability scan
```

## CI/CD Pipeline Configuration

### GitHub Repository Setup

#### 1. Repository Secrets

Add these secrets in GitHub repository settings:

**Database & API:**
```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-anon-public-key
JWT_SECRET=your-secure-jwt-secret
```

**Frontend Deployment (Vercel):**
```
VERCEL_TOKEN=your-vercel-token
VERCEL_ORG_ID=your-vercel-org-id
VERCEL_PROJECT_ID=your-vercel-project-id
```

**Backend Deployment (Railway):**
```
RAILWAY_TOKEN=your-railway-token
RAILWAY_STAGING_PROJECT_ID=your-staging-project-id
RAILWAY_PRODUCTION_PROJECT_ID=your-production-project-id
```

**Docker Registry:**
```
DOCKER_USERNAME=your-docker-username
DOCKER_PASSWORD=your-docker-password
```

**Environment URLs:**
```
STAGING_API_URL=https://staging-api.alshuail.com
PROD_API_URL=https://api.alshuail.com
STAGING_FRONTEND_URL=https://staging.alshuail.com
PROD_FRONTEND_URL=https://alshuail.com
```

#### 2. Branch Protection Rules

Configure branch protection for `main` and `develop`:
- Require pull request reviews
- Require status checks to pass
- Require branches to be up to date
- Include administrators

### Frontend CI/CD (Vercel)

#### Automatic Deployments
- **Develop branch** → Staging environment
- **Main branch** → Production environment

#### Pipeline Stages
1. **Quality Gates:** ESLint, TypeScript, Tests, Arabic RTL validation
2. **Build:** Create optimized production builds
3. **Security:** Audit dependencies and check for secrets
4. **Deploy:** Deploy to Vercel with health checks
5. **Performance:** Lighthouse audits on staging

### Backend CI/CD (Railway)

#### Automatic Deployments
- **Develop branch** → Staging environment
- **Main branch** → Production environment

#### Pipeline Stages
1. **Quality Gates:** ESLint, Security audit, Database tests
2. **Integration Tests:** PostgreSQL integration with real database
3. **Docker Build:** Multi-stage optimized containers
4. **Deploy:** Deploy to Railway with health monitoring
5. **Post-Deploy:** Health checks and performance validation

## Production Deployment

### Manual Deployment Steps

#### 1. Pre-deployment Checklist
```bash
# Run full quality checks
npm run pre-deploy:production

# Validate environment configuration
npm run validate:env

# Test Islamic calendar integration
npm run hijri-test

# Verify Arabic RTL layout
npm run rtl-check
```

#### 2. Frontend Production Deployment

```bash
# Build for production
cd alshuail-admin-arabic
npm run build:production

# Deploy to Vercel (if manual)
vercel --prod
```

#### 3. Backend Production Deployment

```bash
# Build Docker image
cd alshuail-backend
npm run docker:build

# Deploy to Railway (automatic via CI/CD)
# Or manually: railway up --service backend
```

### Environment-Specific Configurations

#### Staging Environment
```env
NODE_ENV=staging
REACT_APP_ENV=staging
REACT_APP_API_URL=https://staging-api.alshuail.com
LOG_LEVEL=info
```

#### Production Environment
```env
NODE_ENV=production
REACT_APP_ENV=production
REACT_APP_API_URL=https://api.alshuail.com
LOG_LEVEL=warn
GENERATE_SOURCEMAP=false
```

## Monitoring and Maintenance

### Health Monitoring

#### Automated Health Checks
- **Frontend:** `/health` endpoint every 30 seconds
- **Backend:** `/health` endpoint with database connectivity
- **Database:** Connection pooling and query performance

#### Monitoring URLs
- **Production API Health:** https://api.alshuail.com/health
- **Staging API Health:** https://staging-api.alshuail.com/health
- **Frontend Health:** https://alshuail.com/health

### Performance Monitoring

#### Metrics to Track
- **API Response Time:** < 500ms average
- **Database Query Time:** < 100ms average
- **Frontend Load Time:** < 3 seconds
- **Memory Usage:** < 512MB per container
- **Error Rate:** < 1%

#### Logging
```bash
# View backend logs
npm run logs:backend

# View error logs
npm run logs:error

# Docker container logs
npm run docker:logs
```

### Security Monitoring

#### Regular Security Tasks
- Weekly dependency audits
- Monthly security patch updates
- Quarterly penetration testing
- SSL certificate renewal monitoring

#### Security Commands
```bash
# Run security audit
npm run security-audit

# Check for vulnerable dependencies
npm audit --audit-level moderate

# Update dependencies
npm run update:deps
```

## Troubleshooting

### Common Issues

#### 1. Build Failures

**Arabic Font Loading Issues:**
```bash
# Check font files in build
ls -la alshuail-admin-arabic/build/static/media/

# Verify Arabic text rendering
npm run rtl-check
```

**TypeScript Errors:**
```bash
# Type checking
npm run type-check

# Clear cache and rebuild
rm -rf node_modules package-lock.json
npm install
```

#### 2. Deployment Issues

**Environment Variable Problems:**
```bash
# Validate environment configuration
npm run validate:env

# Generate new secrets
node setup-env.js secrets
```

**Database Connection Issues:**
```bash
# Test database connectivity
npm run db:test

# Check Supabase project status
curl -f $SUPABASE_URL/rest/v1/members
```

#### 3. Performance Issues

**High Memory Usage:**
```bash
# Check Docker container stats
docker stats

# Analyze bundle size
npm run build:analyze
```

**Slow API Responses:**
```bash
# Check backend health
curl -f http://localhost:3001/health

# Monitor database queries
# Check Supabase dashboard for slow queries
```

### Recovery Procedures

#### Database Recovery
1. Check Supabase backup status
2. Restore from latest backup if needed
3. Run migration scripts
4. Verify data integrity

#### Application Recovery
1. Check GitHub Actions status
2. Rollback to previous deployment
3. Investigate logs and error reports
4. Apply hotfixes if necessary

## Maintenance Schedule

### Daily
- Monitor health check status
- Review error logs
- Check performance metrics

### Weekly
- Security audit and dependency updates
- Database performance review
- Backup verification

### Monthly
- Full system health assessment
- Performance optimization review
- Security patch evaluation
- Documentation updates

## Support and Documentation

### Development Team Contacts
- **DevOps Lead:** [Contact Information]
- **Backend Team:** [Contact Information]
- **Frontend Team:** [Contact Information]
- **Database Admin:** [Contact Information]

### Useful Links
- **Repository:** https://github.com/Mohamedgad1983/PROShael
- **Staging Frontend:** https://staging.alshuail.com
- **Production Frontend:** https://alshuail.com
- **API Documentation:** https://api.alshuail.com/docs
- **Supabase Dashboard:** [Project Dashboard URL]

### Emergency Procedures
1. **Critical Issues:** Contact DevOps lead immediately
2. **Database Issues:** Check Supabase status page
3. **Deployment Issues:** Review GitHub Actions logs
4. **Security Issues:** Follow security incident response plan

## Conclusion

This deployment guide provides comprehensive instructions for managing the Al-Shuail Family Management System's CI/CD pipeline. The system is designed for high availability, security, and performance while maintaining support for Arabic RTL content and Islamic calendar features.

For additional support or questions, please refer to the project documentation or contact the development team.