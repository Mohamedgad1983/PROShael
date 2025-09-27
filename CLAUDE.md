# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Al-Shuail Family Management System - A comprehensive platform consisting of:
1. **Admin Dashboard** - Premium, Apple-inspired admin system with member management, financial tracking, and document handling
   - **Live URL**: https://alshuail-admin.pages.dev (Cloudflare Pages)
2. **Member Mobile App** - Mobile-first application for members with payment processing, notifications, and account management
   - **Access**: `/member` route on the main application
3. **Backend API** - Node.js/Express API with Supabase integration for both admin and mobile clients
   - **Live URL**: https://proshael.onrender.com (Render free hosting)
   - **Health Check**: https://proshael.onrender.com/api/health

Features glassmorphism design, sophisticated animations, full RTL support for Arabic interface, and complete mobile experience.

## Documentation Structure

This documentation is split into two main files for better organization:

### 📘 [CLAUDE-DEVELOPMENT.md](./CLAUDE-DEVELOPMENT.md)
Development guide containing:
- Development commands for frontend and backend
- Architecture overview (React, Node.js, Supabase)
- API integration patterns and CORS configuration
- Component implementation details
- Member Management System details
- Member Mobile App implementation
- Authentication flow and database schema
- Environment variables configuration
- Common troubleshooting tips
- Premium Apple-inspired design system
- Recent implementations and updates

### 📗 [CLAUDE-DEPLOYMENT.md](./CLAUDE-DEPLOYMENT.md)
Deployment and infrastructure guide containing:
- CI/CD pipeline with GitHub Actions
- Docker configuration (multi-stage builds, compose files)
- Cloudflare Pages deployment
- Render.com backend deployment
- Production URLs and configuration
- Environment setup and secrets
- Monitoring and health checks
- Zero-downtime deployment strategies
- Arabic & Islamic features support

## Quick Start

### Development
```bash
# Frontend (port 3002)
cd alshuail-admin-arabic && npm install && npm start

# Backend (port 5001)
cd alshuail-backend && npm install && npm run dev
```

### Deployment
```bash
# Deploy to production (auto-deploys via GitHub Actions)
git add . && git commit -m "changes" && git push origin main
```

For detailed development instructions, see [CLAUDE-DEVELOPMENT.md](./CLAUDE-DEVELOPMENT.md)
For deployment and infrastructure details, see [CLAUDE-DEPLOYMENT.md](./CLAUDE-DEPLOYMENT.md)