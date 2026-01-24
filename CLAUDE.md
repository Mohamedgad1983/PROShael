# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Al-Shuail Family Management System (صندوق عائلة شعيل العنزي)** - A bilingual (Arabic/English) family fund management platform for managing 347+ members across 10 family branches (فخوذ). Full-stack application with web admin, mobile PWA, and native Flutter app.

### Key Features
- Member management with family tree visualization
- Subscription tracking (monthly/annual dues)
- Payment processing (KNET, bank transfers)
- Diya (blood money) collection system
- Initiative/project funding campaigns
- Crisis case management
- Push notifications (Firebase)
- WhatsApp OTP authentication
- Bilingual support (Arabic RTL + English)
- Hijri calendar integration

## GitHub Repository

- **Main Repository**: https://github.com/Mohamedgad1983/PROShael
- **Branch**: main
- **Flutter App**: Embedded in alshuail-flutter/ directory

## Architecture

```
D:/PROShael/
├── alshuail-backend/       # Express.js API (ES Modules) - Port 5001
├── alshuail-admin-arabic/  # React 18 + TypeScript Admin Dashboard - Port 3002
├── alshuail-mobile/        # React + Vite Mobile PWA - Port 5173
├── alshuail-flutter/       # Flutter Native Mobile App (Android/iOS)
├── claudedocs/             # Generated documentation/reports
└── CLAUDE.md               # This file
```

### Infrastructure
| Component | Technology | URL | Port |
|-----------|------------|-----|------|
| Backend API | Node.js 18+ Express.js | api.alshailfund.com | 5001 |
| Admin Dashboard | React 18 + TypeScript | alshailfund.com | 3002 |
| Mobile PWA | React 18 + Vite 5 | app.alshailfund.com | 5173 |
| Flutter App | Flutter 3.x + Dart | Google Play / App Store | - |
| Database | PostgreSQL 15 | Supabase Cloud | 5432 |

### Server Details (Production VPS)
- **VPS IP**: 213.199.62.185
- **OS**: Ubuntu 22.04 LTS
- **Backend Path**: /var/www/PROShael/alshuail-backend
- **Mobile PWA Path**: /var/www/mobile
- **Admin Path**: Cloudflare Pages
- **PM2 Process**: alshuail-backend
- **Web Server**: Nginx (reverse proxy)

## Family Branches (فخوذ)

| ID | Arabic Name | English Name |
|----|-------------|--------------|
| 1 | ذرية فالح شعيل | Faleh Shuail |
| 2 | ذرية مبارك شعيل | Mubarak Shuail |
| 3 | ذرية محمد شعيل | Mohammed Shuail |
| 4 | ذرية فهد شعيل | Fahad Shuail |
| 5 | ذرية عبدالله شعيل | Abdullah Shuail |
| 6 | ذرية سعود شعيل | Saud Shuail |
| 7 | ذرية عبدالعزيز شعيل | Abdulaziz Shuail |
| 8 | ذرية راشد شعيل | Rashid Shuail |
| 9 | ذرية خالد شعيل | Khalid Shuail |
| 10 | ذرية ناصر شعيل | Nasser Shuail |

## Common Commands

### Backend (alshuail-backend/)
```bash
npm run dev          # Development with nodemon (port 5001)
npm start            # Production mode
npm test             # Run Jest tests
npm run lint         # ESLint check
```

### Admin Frontend (alshuail-admin-arabic/)
```bash
npm start            # Development server (CRACO on port 3002)
npm run build        # Production build
npm run build:fast   # Production build (no sourcemaps)
```

### Mobile PWA (alshuail-mobile/)
```bash
npm run dev          # Vite dev server (port 5173)
npm run build        # Production build (outputs to dist/)
npm run preview      # Preview production build
```

### Flutter App (alshuail-flutter/)
```bash
flutter pub get      # Install dependencies
flutter run          # Run on connected device/emulator
flutter build apk    # Build Android APK
flutter build ios    # Build iOS (requires macOS)
```

### Deployment Commands
```bash
# Admin to Cloudflare Pages
cd alshuail-admin-arabic && npm run build:fast
npx wrangler pages deploy build --project-name=alshuail-admin

# Mobile PWA to VPS
cd alshuail-mobile && npm run build
scp -r dist/* root@213.199.62.185:/var/www/mobile/

# Backend to VPS
ssh root@213.199.62.185 "cd /var/www/PROShael/alshuail-backend && git pull && pm2 restart alshuail-backend"
```

## Backend Architecture

### Directory Structure
```
alshuail-backend/
├── server.js                    # Main entry point
├── src/
│   ├── config/
│   │   └── database.js          # Supabase client configuration
│   ├── controllers/             # Request handlers
│   │   ├── authController.js
│   │   ├── membersController.js
│   │   ├── paymentsController.js
│   │   ├── subscriptionsController.js
│   │   ├── initiativesController.js
│   │   ├── diyasController.js
│   │   ├── expensesController.js
│   │   ├── notificationsController.js
│   │   ├── reportsController.js
│   │   └── settingsController.js
│   ├── middleware/
│   │   └── authMiddleware.js    # JWT verification
│   ├── routes/                  # API route definitions
│   │   ├── auth.js
│   │   ├── members.js
│   │   ├── payments.js
│   │   └── ...
│   └── services/                # Business logic
│       ├── firebaseService.js   # FCM push notifications
│       ├── ultramsgService.js   # WhatsApp OTP
│       ├── receiptService.js    # PDF generation
│       └── notificationService.js
├── __tests__/                   # Jest test suites
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   └── security/
└── package.json
```

### API Routes (/api)
| Route | Description |
|-------|-------------|
| /auth | Login, OTP verification, logout |
| /members | CRUD operations for members |
| /payments | Payment processing and history |
| /subscriptions | Subscription management |
| /family-tree | Family hierarchy data |
| /notifications | Push notification management |
| /audit | Audit log queries |
| /reports | Financial and member reports |
| /initiatives | Project campaigns |
| /expenses | Expense tracking |
| /settings | System settings |
| /profile | User profile management |
| /diyas | Blood money collections |
| /crisis | Crisis case management |
| /news | News/announcements |
| /occasions | Event management |

### Services Layer
| Service | Purpose |
|---------|---------|
| firebaseService.js | Push notifications via Firebase Cloud Messaging |
| ultramsgService.js | WhatsApp OTP delivery via Ultramsg API |
| receiptService.js | PDF receipt generation with PDFKit |
| notificationService.js | Notification orchestration and delivery |

## Admin Dashboard Architecture

### Directory Structure (alshuail-admin-arabic/)
```
src/
├── components/          # Reusable UI components
├── pages/              # Page components
│   ├── Dashboard.jsx
│   ├── Members.jsx
│   ├── MemberDetails.jsx
│   ├── Payments.jsx
│   ├── Subscriptions.jsx
│   ├── Initiatives.jsx
│   ├── Diyas.jsx
│   ├── Expenses.jsx
│   ├── FamilyTree.jsx
│   ├── Notifications.jsx
│   ├── Reports.jsx
│   ├── Settings.jsx
│   ├── News.jsx
│   └── Login.jsx
├── contexts/           # React contexts
├── hooks/              # Custom hooks
├── services/           # API service functions
├── utils/              # Helper functions
└── App.jsx
```

### Admin Routes
| Page | Route | Required Role |
|------|-------|---------------|
| Dashboard | /admin/dashboard | All authenticated |
| Members | /admin/members | admin+ |
| Member Details | /admin/members/:id | admin+ |
| Payments | /admin/payments | financial_manager+ |
| Subscriptions | /admin/subscriptions | admin+ |
| Initiatives | /admin/initiatives | admin+ |
| Diyas | /admin/diyas | admin+ |
| Expenses | /admin/expenses | financial_manager+ |
| Family Tree | /admin/family-tree | All authenticated |
| Notifications | /admin/notifications | admin+ |
| Reports | /admin/reports | financial_manager+ |
| Settings | /admin/settings | super_admin only |
| News | /admin/news | admin+ |

## Mobile PWA Architecture

### Directory Structure (alshuail-mobile/)
```
src/
├── components/          # Reusable components
├── pages/              # Page components
│   ├── Dashboard.jsx
│   ├── Login.jsx
│   ├── FamilyTree.jsx
│   ├── BranchDetail.jsx
│   ├── Profile.jsx
│   ├── Payments.jsx
│   ├── PaymentCenter.jsx
│   ├── PaymentHistory.jsx
│   ├── Initiatives.jsx
│   ├── MemberCard.jsx
│   ├── Notifications.jsx
│   ├── News.jsx
│   ├── Settings.jsx
│   ├── Statement.jsx
│   ├── Events.jsx
│   └── PrivacyPolicy.jsx
├── contexts/
│   └── AuthContext.jsx
├── services/
│   └── api.js
├── firebase.js          # Firebase config
└── App.jsx
```

### Mobile Routes
| Page | Route |
|------|-------|
| Login | /login |
| Dashboard | /, /dashboard |
| Family Tree | /family-tree |
| Branch Detail | /family-tree/:branchId |
| Notifications | /notifications |
| Profile | /profile |
| Payments | /payments |
| Payment Center | /payment-center |
| Subscription Payment | /payment/subscription |
| Diya Payment | /payment/diya |
| Initiative Payment | /payment/initiative |
| Bank Transfer | /payment/bank-transfer |
| Payment History | /payments/history |
| Member Card | /member-card |
| Initiatives | /initiatives |
| News | /news |
| Settings | /settings |
| Profile Wizard | /profile-wizard |
| Statement | /statement |
| Events | /events |
| Privacy Policy | /privacy |

## Flutter App Architecture

### Directory Structure (alshuail-flutter/)
```
lib/
├── main.dart            # App entry point
├── models/              # Data models
├── screens/             # Screen widgets
├── widgets/             # Reusable widgets
├── services/            # API and auth services
├── providers/           # State management
└── utils/               # Helpers and constants
```

## Authentication Flow

1. User enters phone number (Kuwait +965 or Saudi +966)
2. Backend sends OTP via WhatsApp (Ultramsg API)
3. User enters 6-digit OTP code
4. Backend verifies OTP and returns JWT token
5. Token stored in localStorage (mobile) or memory (admin)
6. All API requests include `Authorization: Bearer <token>` header

### Token Expiry
- Admin Dashboard: 7 days
- Mobile App: 30 days

### User Roles
| Role | Permissions |
|------|-------------|
| super_admin | Full system access |
| admin | Member and content management |
| financial_manager | Payments, expenses, reports |
| operational_manager | Operations and notifications |
| member | View own data, make payments |

## Database Schema

### Core Tables
| Table | Description |
|-------|-------------|
| members | Family member profiles |
| family_branches | 10 family branch definitions |
| payments | All payment transactions |
| subscriptions | Monthly/annual subscription records |
| initiatives | Fundraising campaigns |
| diyas | Blood money collection cases |
| crisis_cases | Emergency assistance cases |
| notifications | Push notification records |
| device_tokens | FCM token storage |
| audit_logs | System audit trail |
| occasions | Family events |
| news | News/announcements |
| expenses | Fund expenditures |
| settings | System configuration |

## Third-Party Services

| Service | Purpose | Configuration |
|---------|---------|---------------|
| Supabase | PostgreSQL database hosting | SUPABASE_URL, SUPABASE_ANON_KEY |
| Ultramsg | WhatsApp OTP delivery | ULTRAMSG_INSTANCE_ID, ULTRAMSG_TOKEN |
| Firebase | Push notifications (FCM) | Firebase service account JSON |
| Cloudflare | Admin dashboard hosting | Wrangler CLI |

## Environment Variables

### Backend (.env)
```env
# Database
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_KEY=eyJhbGc...

# Authentication
JWT_SECRET=your-secret-key

# WhatsApp OTP
ULTRAMSG_INSTANCE_ID=instance123
ULTRAMSG_TOKEN=token123

# Firebase Push Notifications
FIREBASE_PROJECT_ID=project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Server
PORT=5001
NODE_ENV=production
```

### Admin Frontend (.env)
```env
REACT_APP_API_URL=https://api.alshailfund.com
```

### Mobile PWA (.env)
```env
VITE_API_URL=https://api.alshailfund.com/api
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_VAPID_KEY=...
```

## Testing

### Backend Tests
```bash
cd alshuail-backend
npm test                    # Run all tests
npm test -- --coverage      # With coverage report
npm test -- auth.test.js    # Run specific test file
```

### Test Structure
```
__tests__/
├── unit/           # Unit tests for services/utils
├── integration/    # API endpoint tests
├── e2e/            # End-to-end flows
└── security/       # Security vulnerability tests
```

### Browser Testing URLs
- Admin Login: https://alshailfund.com/admin/login
- Mobile Login: https://app.alshailfund.com/login
- API Health: https://api.alshailfund.com/api/health

## Debugging

### Check API Health
```bash
curl https://api.alshailfund.com/api/health
```

### View Backend Logs
```bash
ssh root@213.199.62.185 "pm2 logs alshuail-backend --lines 50"
```

### Restart Services
```bash
ssh root@213.199.62.185 "pm2 restart alshuail-backend"
ssh root@213.199.62.185 "systemctl restart nginx"
```

### Check PM2 Status
```bash
ssh root@213.199.62.185 "pm2 status"
```

## Common Gotchas

### ES Modules (Backend)
- Use `import/export` syntax, NOT `require()`
- Include `.js` extensions in imports: `import x from './file.js'`
- package.json has `"type": "module"`

### Phone Number Format
- Kuwait: +965XXXXXXXX (8 digits after +965)
- Saudi Arabia: +966XXXXXXXXX (9 digits after +966)

### RTL Support
- Admin dashboard is RTL by default (Arabic)
- Use `dir="rtl"` and Tailwind RTL utilities
- DaisyUI components support RTL

### Hijri Calendar
- Uses `hijri-converter` library
- Display Islamic dates alongside Gregorian

### CORS Configuration
- Backend allows requests from alshailfund.com and app.alshailfund.com
- Credentials: true for cookie support

## UI Theme

### Color Palette
- Primary Gradient: #667eea to #764ba2 (purple)
- Background: #f8f9fa (light gray)
- Text Primary: #1a1a2e
- Success: #10B981
- Warning: #F59E0B
- Error: #EF4444

### Design System
- Admin: DaisyUI + Tailwind CSS
- Mobile: Custom Tailwind + Lucide icons
- Icons: Lucide React

## Recent Updates (January 2025)

- **Privacy Policy**: Added bilingual privacy page at /privacy (mobile PWA)
- **Flutter App**: Native mobile app added in alshuail-flutter/
- **Project Cleanup**: Removed legacy Mobile/ folder, consolidated structure
- **CLAUDE.md**: Comprehensive documentation update
- **GitHub**: All changes pushed to https://github.com/Mohamedgad1983/PROShael

## Support

- **GitHub Issues**: https://github.com/Mohamedgad1983/PROShael/issues
- **Admin URL**: https://alshailfund.com
- **Mobile App**: https://app.alshailfund.com
- **API Base**: https://api.alshailfund.com/api
