# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Al-Shuail Family Management System** - A bilingual (Arabic/English) family fund management platform for managing 347 members across 10 family branches. Full-stack application with web admin, mobile PWA, and native Flutter app.

## GitHub Repository

- **Main Repository**: https://github.com/Mohamedgad1983/PROShael
- **Flutter App**: Embedded in alshuail-flutter/ (part of main repo)

## Architecture

PROShael/
- alshuail-backend/       # Express.js API (ES Modules) - Port 5001
- alshuail-admin-arabic/  # React 18 + TypeScript Admin Dashboard - Port 3002
- alshuail-mobile/        # React + Vite Mobile PWA
- alshuail-flutter/       # Flutter Native Mobile App (Android/iOS)
- docs/                   # Documentation

### Infrastructure
| Component | Technology | URL | Port |
|-----------|------------|-----|------|
| Backend API | Node.js + Express.js | api.alshailfund.com | 5001 |
| Admin Dashboard | React 18 + TypeScript | alshailfund.com | 3002 |
| Mobile PWA | React + Vite + Tailwind | app.alshailfund.com | 5173 |
| Flutter App | Flutter 3.x + Dart | Google Play / App Store | - |
| Database | PostgreSQL | VPS (213.199.62.185) | 5432 |

### Server Details
- **VPS IP**: 213.199.62.185
- **Backend Path**: /var/www/PROShael/alshuail-backend
- **Mobile PWA Path**: /var/www/mobile
- **PM2 Process**: alshuail-backend
- **Database**: PostgreSQL on VPS (self-hosted)

## Common Commands

### Backend (alshuail-backend/)
npm run dev - Development with watch mode (port 5001)
npm start - Production (uses .env.production)
npm test - Run all tests
npm run lint - ESLint check

### Admin Frontend (alshuail-admin-arabic/)
npm start - Development server (CRACO on port 3002)
npm run build:fast - Production build (no sourcemaps)

### Mobile PWA (alshuail-mobile/)
npm run dev - Vite development server (port 5173)
npm run build - Production build (outputs to dist/)

### Flutter App (alshuail-flutter/)
flutter pub get - Install dependencies
flutter run - Run on device/emulator
flutter build apk - Build Android APK
flutter build ios - Build iOS app

### Deployment
# Admin to Cloudflare Pages
npx wrangler pages deploy build --project-name=alshuail-admin

# Mobile PWA to VPS
scp -r dist/* root@213.199.62.185:/var/www/mobile/

# Backend to VPS
ssh root@213.199.62.185 "cd /var/www/PROShael/alshuail-backend && git pull && pm2 restart alshuail-backend"

## Backend Architecture

### Route -> Controller -> Service Pattern
- Routes (src/routes/): Define API endpoints
- Controllers (src/controllers/): Handle request/response
- Services (src/services/): Reusable business logic

### Key Files
- server.js - Main entry point
- src/config/database.js - PostgreSQL database client
- src/middleware/authMiddleware.js - JWT authentication

### API Routes (/api)
/auth, /members, /payments, /subscriptions, /family-tree, /notifications, /audit, /reports, /initiatives, /expenses, /settings, /profile, /diyas, /crisis, /news, /occasions

### Services Layer
- firebaseService.js - Push notifications via FCM
- ultramsgService.js - WhatsApp OTP via Ultramsg
- receiptService.js - PDF receipt generation
- notificationService.js - Notification orchestration

## Frontend Architecture

### Admin Dashboard (React 18 + TypeScript)
- CRACO for custom webpack config
- RTL support for Arabic
- DaisyUI + Tailwind CSS
- react-router-dom v7

### Mobile PWA (React 18 + Vite)
- Vite with vite-plugin-pwa
- Token in localStorage as alshuail_token
- Firebase SDK for push notifications
- Tailwind CSS + Lucide icons

#### Mobile Pages
| Page | Route |
|------|-------|
| Login | /login |
| Dashboard | /, /dashboard |
| FamilyTree | /family-tree |
| BranchDetail | /family-tree/:branchId |
| Notifications | /notifications |
| Profile | /profile |
| Payments | /payments |
| PaymentCenter | /payment-center |
| SubscriptionPayment | /payment/subscription |
| DiyaPayment | /payment/diya |
| InitiativePayment | /payment/initiative |
| BankTransferPayment | /payment/bank-transfer |
| PaymentHistory | /payments/history |
| MemberCard | /member-card |
| Initiatives | /initiatives |
| News | /news |
| Settings | /settings |
| ProfileWizard | /profile-wizard |
| Statement | /statement |
| Events | /events |
| PrivacyPolicy | /privacy |

### Flutter App (Dart)
Native mobile app in alshuail-flutter/
- 22 screens (Login, Dashboard, Payments, Family Tree, etc.)
- Biometric authentication (Face ID / Touch ID)
- Arabic RTL support
- Offline caching with Hive

## Testing

### Backend Tests (__tests__/)
- unit/ - Unit tests
- integration/ - API endpoint tests
- e2e/ - End-to-end tests
- security/ - Security tests

### Browser Testing
- Admin: https://alshailfund.com/admin/login
- Mobile: https://app.alshailfund.com/login

## Important Patterns

### Phone Number Validation
Handles Kuwait (+965) and Saudi Arabia (+966) formats.

### Authentication Flow
1. Login with phone number
2. OTP sent via WhatsApp
3. Verify OTP
4. JWT token returned
5. Token sent as Authorization: Bearer header

### Roles
super_admin, admin, financial_manager, operational_manager, member

## Third-Party Services

| Service | Purpose |
|---------|---------|
| Ultramsg | WhatsApp OTP |
| Firebase | Push notifications (FCM) |
| Cloudflare | Admin hosting (Pages) |

## Environment Variables

### Backend (.env)
DATABASE_URL - PostgreSQL connection string
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD - Database credentials
JWT_SECRET - JWT signing secret
ULTRAMSG_INSTANCE_ID, ULTRAMSG_TOKEN - WhatsApp OTP
FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY - Push notifications

### Frontend
- Admin: REACT_APP_API_URL=https://api.alshailfund.com
- Mobile: VITE_API_URL=https://api.alshailfund.com/api

## Debugging

curl https://api.alshailfund.com/api/health
ssh root@213.199.62.185 "pm2 logs alshuail-backend --lines 50"
ssh root@213.199.62.185 "systemctl restart nginx"
ssh root@213.199.62.185 "systemctl status postgresql"

## Database

### PostgreSQL on VPS
- Host: 213.199.62.185
- Port: 5432
- Self-hosted on Ubuntu VPS

### Main Tables
members, family_branches, payments, subscriptions, initiatives, diyas, crisis_cases, notifications, audit_logs, device_tokens, occasions, news, expenses

## Common Gotchas

### ES Modules
Use import/export, not require(). Include .js extensions.

### Token Expiry
Admin: 7 days, Member: 30 days

### Hijri Calendar
Uses hijri-converter for Islamic calendar.

## Recent Updates (January 2025)

- Flutter App: Integrated into main repo (alshuail-flutter/)
- Backend: Added biometric login endpoint
- Backend: Added profile photo upload endpoint
- Project Cleanup: Removed 434 unnecessary files
- Database: Migrated from Supabase to self-hosted PostgreSQL on VPS
- GitHub: All changes at https://github.com/Mohamedgad1983/PROShael
