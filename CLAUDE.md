# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Al-Shuail Family Management System - A comprehensive platform consisting of:
1. **Admin Dashboard** - Premium, Apple-inspired admin system with member management, financial tracking, and document handling
   - **Live URL**: https://alshuail-admin.pages.dev (Cloudflare Pages)
   - **Members in System**: 299 (288 real members + 10 test + 1 admin)
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

## Recent Implementations (September 2025)

### Member Monitoring Dashboard ✅
**Status**: Live in Production
**Location**: `/member-monitoring` route
**Features Implemented**:
- **Real-time Member Overview**: Displays all 299 members with balance tracking
- **Advanced Filtering System**:
  - Balance thresholds (< 3000 SAR, >= 3000 SAR)
  - Custom balance ranges and comparisons
  - Tribal section filtering (8 sections)
  - Search by name, ID, or phone
- **Statistics Dashboard**:
  - Total members count
  - Compliant vs non-compliant breakdown (3000 SAR threshold)
  - Total balance aggregation
  - Visual indicators with color coding
- **Responsive Design**:
  - Desktop table view with hover effects
  - Mobile card layout with swipe gestures
  - RTL Arabic support throughout
- **Export Capabilities**:
  - CSV export for spreadsheets
  - Excel export with formatting
  - Filtered data export support
- **Performance Features**:
  - Pagination (10/20/50/100 members per page)
  - Debounced search for smooth typing
  - Optimized API calls with single request for all members
  - Loading states and error handling

### Crisis Management Dashboard ✅
**Status**: Live in Production
**Features**: Real-time member balance tracking, crisis alerts, emergency notifications

### API Security Enhancements ✅
- CORS configuration updated for production domains
- JWT authentication with fallback mechanisms
- Role-based access control (RBAC) implementation
- Secure member data endpoints

### Database Integration ✅
- Supabase integration with 299 members
- Automated data synchronization
- Balance tracking and payment history
- Member subscription management