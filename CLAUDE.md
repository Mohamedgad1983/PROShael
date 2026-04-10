# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Al-Shuail Family Management System (صندوق عائلة شعيل العنزي)** — A bilingual (Arabic/English) family fund management platform for managing 347+ members across 10 family branches (فخوذ). Full-stack application with web admin, mobile PWA, Flutter native app, and iOS SwiftUI app.

### Key Features
- Member management with family tree visualization (marriage tracking, extended trees)
- Subscription tracking (monthly/annual dues) with flexible payment system
- Payment processing (KNET, bank transfers, pay-on-behalf)
- Diya (blood money) collection system (internal/external classification)
- Initiative/project funding campaigns with progress tracking
- Crisis case management and alerts
- Push notifications (Firebase Cloud Messaging)
- Dual authentication: WhatsApp OTP + password-based login
- Multi-role system with Hijri date-based role expiration
- Approval workflows for administrative actions
- Member monitoring and wellness checks
- Fund balance tracking with reconciliation snapshots
- Balance adjustments with audit trail
- Expense category management and vouchers
- Bilingual support (Arabic RTL + English)
- Hijri calendar integration throughout
- PWA offline support with service workers
- Biometric authentication (Flutter/iOS)

## GitHub Repository

- **Main Repository**: https://github.com/Mohamedgad1983/PROShael
- **Branch**: main
- **CI/CD**: GitHub Actions (backend, frontend, Cloudflare Pages)

## Architecture

```
PROShael/
├── alshuail-backend/         # Express.js API v2.0.0 (ES Modules) - Port 5001
├── alshuail-admin-arabic/    # React 19 + TypeScript Admin Dashboard - Port 3002
├── alshuail-mobile/          # React 18 + Vite 5 Mobile PWA - Port 5173
├── alshuail-flutter/         # Flutter 3.x Native Mobile App (Android/iOS)
├── AlShuailFund/             # Native iOS SwiftUI App (MVVM)
├── docs/                     # Consolidated documentation hub
│   ├── architecture/         # Architecture & API docs
│   ├── specs/                # Feature specifications (6 specs)
│   ├── reports/              # Verification & fix reports
│   ├── ios/                  # App Store & iOS docs
│   ├── analysis/             # Analysis & PRD docs
│   └── migrations/           # Database migration docs
├── database/                 # Root-level DB schemas & migrations
├── scripts/                  # Utility scripts (scope of work generator)
├── .github/workflows/        # CI/CD pipelines (4 workflows)
├── archive/                  # Legacy/backup files (not active)
└── CLAUDE.md                 # This file
```

### Infrastructure
| Component | Technology | URL | Port |
|-----------|------------|-----|------|
| Backend API | Node.js 18+ Express.js v2.0.0 | api.alshailfund.com | 5001 |
| Admin Dashboard | React 19 + TypeScript + CRACO | alshailfund.com | 3002 |
| Mobile PWA | React 18 + Vite 5 | app.alshailfund.com | 5173 |
| Flutter App | Flutter 3.x + Dart (Provider + Riverpod) | Google Play / App Store | - |
| iOS App | SwiftUI (MVVM) | App Store | - |
| Database | PostgreSQL 15 (self-hosted on VPS) | 213.199.62.185 | 5432 |

### Server Details (Production VPS)
- **VPS IP**: 213.199.62.185
- **OS**: Ubuntu 22.04 LTS
- **Backend Path**: /var/www/PROShael/alshuail-backend
- **Mobile PWA Path**: /var/www/mobile
- **Admin Path**: Cloudflare Pages
- **PM2 Process**: alshuail-backend
- **Web Server**: Nginx (reverse proxy)
- **Database**: PostgreSQL 15 (self-hosted, migrated from Supabase)

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
npm test             # Run Jest tests (164 test files)
npm test -- --coverage  # With coverage report
npm run lint         # ESLint check
```

### Admin Frontend (alshuail-admin-arabic/)
```bash
npm start            # Development server (CRACO on port 3002)
npm run build        # Production build
npm run build:fast   # Production build (no sourcemaps)
npm run build:emergency  # Emergency build (unminified, no tree-shaking)
npm run build:staging    # Staging build
npm run build:production # Production optimized build
npm run pwa:build    # PWA-specific build
npm run pwa:validate # Validate PWA configuration
npm run type-check   # TypeScript type checking
npm run lint         # ESLint check
npm run docker:build # Build Docker image
npm run docker:run   # Run Docker container
```

### Mobile PWA (alshuail-mobile/)
```bash
npm run dev          # Vite dev server (port 5173)
npm run build        # Production build (outputs to dist/)
npm run preview      # Preview production build
npm run lint         # ESLint (0 warnings policy)
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
alshuail-backend/ (v2.0.0)
├── server.js                        # Main entry point (471 lines, 50+ route mounts)
├── Dockerfile                       # Multi-stage Docker build
├── healthcheck.js                   # Health check endpoint
├── src/
│   ├── config/                      # Configuration (4 files)
│   │   ├── database.js              # PostgreSQL VPS connection
│   │   ├── documentStorage.js       # Document/file storage config
│   │   ├── env.js                   # Centralized env management
│   │   └── pgQueryBuilder.js        # Query builder utilities
│   ├── controllers/                 # Request handlers (33 files)
│   │   ├── admin.controller.js
│   │   ├── approval.controller.js
│   │   ├── audit.controller.js
│   │   ├── balanceAdjustmentController.js
│   │   ├── bankTransfersController.js
│   │   ├── crisisController.js
│   │   ├── dashboardController.js
│   │   ├── deviceTokenController.js
│   │   ├── diyasController.js
│   │   ├── expenseCategoriesController.js
│   │   ├── expensesController.js
│   │   ├── family-tree.controller.js
│   │   ├── family-tree-extended.controller.js
│   │   ├── financialReportsController.js
│   │   ├── fundBalanceController.js
│   │   ├── initiativesController.js
│   │   ├── memberController.js
│   │   ├── memberImportController.js
│   │   ├── memberMonitoringController.js
│   │   ├── memberRegistrationController.js
│   │   ├── memberStatementController.js
│   │   ├── memberSuspensionController.js
│   │   ├── membersController.js
│   │   ├── membersMonitoringController.js
│   │   ├── notificationController.js
│   │   ├── notificationsController.js
│   │   ├── occasionsController.js
│   │   ├── passwordAuth.controller.js
│   │   ├── paymentAnalyticsController.js
│   │   ├── paymentsController.js
│   │   ├── push-notifications.controller.js
│   │   ├── statementController.js
│   │   └── subscriptionController.js
│   ├── middleware/                   # Request processing (13 files)
│   │   ├── auth.js                  # JWT token validation
│   │   ├── connectionPool.js        # Database connection pooling
│   │   ├── cookie-auth.js           # Cookie-based authentication
│   │   ├── csrf.js                  # CSRF token validation
│   │   ├── featureFlags.js          # Feature flag checking
│   │   ├── memberSuspensionCheck.js # Suspension status verification
│   │   ├── payment-validator.js     # Payment validation rules
│   │   ├── rateLimiter.js           # Rate limiting
│   │   ├── rbacMiddleware.js        # Role-based access control
│   │   ├── requireAdminOrSelf.js    # Admin or self-access restriction
│   │   ├── roleExpiration.js        # Hijri date-based role expiration
│   │   ├── securityHeaders.js       # Security header injection
│   │   └── superAdminAuth.js        # Superadmin-only access
│   ├── routes/                      # API route definitions (43 files)
│   ├── services/                    # Business logic (19 files)
│   │   ├── arabicPdfExporter.js     # Arabic PDF generation
│   │   ├── bankTransferService.js   # Bank transfer processing
│   │   ├── cacheService.js          # Redis caching
│   │   ├── database.js              # Database service wrapper
│   │   ├── databaseOptimizationService.js
│   │   ├── financialAnalyticsService.js
│   │   ├── firebaseService.js       # FCM push notifications
│   │   ├── forensicAnalysis.js      # Data forensics
│   │   ├── memberMonitoringQueryService.js
│   │   ├── memberService.js
│   │   ├── notificationService.js
│   │   ├── notificationTemplates.js
│   │   ├── optimizedReportQueries.js
│   │   ├── paymentProcessingService.js
│   │   ├── receiptService.js        # PDF receipt generation
│   │   ├── reportExportService.js
│   │   ├── twilioService.js         # Twilio SMS (legacy)
│   │   ├── ultramsgService.js       # WhatsApp OTP
│   │   └── whatsappOtpService.js
│   ├── utils/                       # Utility functions (16 files)
│   │   ├── accessControl.js
│   │   ├── audit-logger.js
│   │   ├── errorCodes.js
│   │   ├── firebase-admin.js
│   │   ├── hijriConverter.js
│   │   ├── hijriDateUtils.js
│   │   ├── inputSanitizer.js
│   │   ├── jsonSanitizer.js
│   │   ├── logger.js                # Winston logger
│   │   ├── memberHelpers.js
│   │   ├── memberValidation.js
│   │   ├── notificationHelpers.js
│   │   ├── profileValidation.js
│   │   ├── secureOtp.js
│   │   └── tree-generator.js
│   ├── constants/                   # Application constants
│   ├── validators/                  # Joi validation schemas
│   ├── database/                    # RBAC SQL schemas
│   └── scripts/                     # Utility scripts (8 active + archived)
├── migrations/                      # Database migrations (33 files)
├── __tests__/                       # Test suites (164 files)
│   ├── unit/                        # Unit tests (51 files)
│   ├── integration/                 # API integration tests
│   ├── e2e/                         # End-to-end flows
│   ├── security/                    # Security vulnerability tests
│   ├── performance/                 # Performance benchmarks
│   ├── __mocks__/                   # Test mocks and data
│   └── helpers/                     # Test helper functions
└── package.json
```

### API Routes (/api) — Full Listing
| Route | Description |
|-------|-------------|
| /auth | Login, OTP verification, logout |
| /auth/password | Password-based authentication (login, reset) |
| /otp | WhatsApp OTP send/verify/resend |
| /members | CRUD operations for members |
| /member-monitoring | Member wellness checks and monitoring |
| /payments | Payment processing and history |
| /subscriptions | Subscription management |
| /expenses | Expense tracking and reporting |
| /expense-categories | Dynamic expense category management |
| /diyas | Blood money collections |
| /diya-dashboard | Diya dashboard views |
| /initiatives | Project campaigns |
| /initiatives (enhanced) | Enhanced initiative endpoints |
| /family-tree | Family hierarchy data |
| /tree | Enhanced tree generation |
| /notifications | Notification management |
| /notifications/push | Firebase push notifications |
| /device-tokens | FCM device token registration |
| /admin | Admin panel operations |
| /approvals | Approval workflow management |
| /audit | Audit log queries |
| /multi-role | Multi-role assignment with Hijri dates |
| /password-management | Superadmin password management |
| /rbac | Role-based access control routes |
| /dashboard | Dashboard metrics and summaries |
| /reports | Financial and member reports |
| /analytics | Payment analytics and insights |
| /statements | Account statement generation |
| /member-statement | Member payment statements |
| /fund | Fund balance management |
| /balance-adjustments | Manual member balance corrections |
| /bank-transfers | Bank transfer / pay-on-behalf requests |
| /documents | Document management |
| /receipts | Receipt generation |
| /occasions | Event management |
| /news | News/announcements |
| /crisis | Crisis alerts and management |
| /settings | System settings |
| /user/profile | User profile management |
| /csrf-token | CSRF token endpoints |
| /health | Health check |

### Services Layer
| Service | Purpose |
|---------|---------|
| firebaseService.js | Push notifications via Firebase Cloud Messaging |
| ultramsgService.js | WhatsApp OTP delivery via Ultramsg API |
| whatsappOtpService.js | WhatsApp OTP orchestration |
| receiptService.js | PDF receipt generation with PDFKit |
| arabicPdfExporter.js | Arabic-specific PDF generation |
| notificationService.js | Notification orchestration and delivery |
| notificationTemplates.js | Notification message templates |
| paymentProcessingService.js | Payment processing logic |
| bankTransferService.js | Bank transfer processing |
| financialAnalyticsService.js | Financial analysis algorithms |
| memberService.js | Member business logic |
| memberMonitoringQueryService.js | Member monitoring queries |
| cacheService.js | Redis caching layer |
| databaseOptimizationService.js | Query optimization utilities |
| optimizedReportQueries.js | Performance-optimized report queries |
| reportExportService.js | Report export (Excel, PDF) |
| forensicAnalysis.js | Data forensics and analysis |
| database.js | Database service wrapper |

### Key Backend Dependencies
- **Framework**: express ^4.18.2, helmet ^7.1.0, cors ^2.8.5
- **Database**: pg ^8.16.3 (direct PostgreSQL, NOT Supabase client)
- **Auth**: jsonwebtoken ^9.0.2, bcrypt ^6.0.0, csrf-csrf ^4.0.3
- **PDF**: pdfkit ^0.17.2, canvas ^3.2.0
- **Calendar**: moment-hijri ^3.0.0, hijri-converter ^1.1.1
- **Communication**: firebase-admin ^13.5.0, twilio ^5.10.4
- **Validation**: joi ^18.0.1
- **Logging**: winston ^3.11.0
- **Testing**: jest ^30.2.0, supertest ^7.1.4

## Admin Dashboard Architecture

### Directory Structure (alshuail-admin-arabic/ v2.0.0)
```
src/
├── components/              # 200+ reusable UI components (32 categories)
│   ├── Auth/                # LoginPage, EmailLoginPage, ProtectedRoute
│   ├── Dashboard/           # 28 files - Multiple dashboard variants
│   │   ├── UnifiedDashboard.tsx
│   │   ├── IslamicPremiumDashboard.tsx
│   │   ├── AppleDashboard.tsx
│   │   └── ...
│   ├── Members/             # 42 files - Member management
│   │   ├── Registration forms (Apple, Premium, Standard)
│   │   ├── Import/Export (Premium)
│   │   └── Member documents, security sections
│   ├── Payments/            # 16 files - Payment processing
│   ├── Subscriptions/       # 10 files - Subscription management
│   ├── Diyas/               # 12 files - Diya management
│   ├── Initiatives/         # 13 files - Initiative tracking
│   ├── Occasions/           # 12 files - Event management
│   ├── MemberMonitoring/    # 18 files - Advanced member tracking
│   ├── Reports/             # 13 files - Financial reporting
│   ├── MemberStatement/     # Statement search, balance adjustments
│   ├── Notifications/       # 10 files - Notification system
│   ├── FamilyTree/          # 9 files - Family tree visualization
│   ├── Settings/            # 22 files - Comprehensive settings
│   │   ├── ProfileSettings, AppearanceSettings
│   │   ├── LanguageSettings, SystemSettings
│   │   ├── AccessControl, MultiRoleManagement
│   │   ├── UserManagement, AuditLogs
│   │   └── Modern design system components
│   ├── Approvals/           # Approval workflows
│   ├── Crisis/              # Crisis management dashboard
│   ├── Common/              # 20 files - Shared components
│   │   ├── HijriDatePicker, HijriDateInput, HijriDateDisplay
│   │   ├── VirtualScrollList (performance)
│   │   └── ErrorBoundary, SkeletonLoaders
│   ├── Navigation/          # Role-based navigation
│   ├── Documents/           # Document manager
│   ├── Registration/        # Premium registration
│   └── mobile/              # Mobile bottom nav
├── pages/                   # 21 page files
│   ├── admin/               # Admin pages (7 files)
│   │   ├── FamilyTreeManagement.tsx
│   │   ├── FullFamilyTree.tsx
│   │   ├── InitiativesManagement.tsx
│   │   ├── InitiativeReport.tsx
│   │   ├── NewsManagement.tsx
│   │   └── SubscriptionDashboard.tsx
│   ├── mobile/              # Mobile pages (12 files)
│   │   ├── Login, Dashboard, Profile, Payment
│   │   ├── PaymentHistory, Notifications
│   │   ├── MemberSubscriptionView, ChangePassword
│   │   └── ReceiptUpload
│   ├── member/              # Member pages (4 files)
│   │   ├── News, NewsDetail, Initiatives, Notifications
│   └── PrivacyPolicy.tsx
├── contexts/                # State management (3 files)
│   ├── AuthContext.js
│   ├── RoleContext.tsx
│   └── ThemeContext.tsx      # Dark/light mode
├── hooks/                   # Custom hooks (4 files)
│   ├── useApi.ts
│   ├── useActiveMemberCount.ts
│   ├── useMobile.js
│   └── useNotifications.js
├── services/                # API services (19 files)
│   ├── admin.service.ts, auth.ts, approval.service.ts
│   ├── familytree.service.ts, multiRoleService.ts
│   ├── memberService.js, paymentService.js
│   ├── subscriptionService.js, notificationService.js
│   ├── websocketService.js, analyticsService.js
│   └── api.js, mobileApi.js
├── utils/                   # Helper functions (29 files)
│   ├── hijriDate.js, hijriDateUtils.ts, hijriDateSystem.ts
│   ├── validators.js, phoneValidator.js
│   ├── performance.ts, memoryOptimization.js
│   ├── apiConfig.ts, constants.js
│   ├── pwa.ts, indexedDBManager.js
│   └── arabic.ts
├── types/                   # TypeScript types (3 files)
│   ├── appearanceSettings.ts
│   ├── languageSettings.ts
│   └── notificationSettings.ts
├── features/                # Feature packages
│   └── access-control/      # Access control feature
└── App.tsx                  # Main router
```

### Admin Routes
| Route | Description | Required Role |
|-------|-------------|---------------|
| /login | Admin login page | Public |
| /admin/dashboard | Main admin dashboard | All authenticated |
| /admin/* | All admin routes (via StyledDashboard) | admin+ |
| /admin/initiatives/:id/report | Initiative detail reports | admin+ |
| /mobile/login | Member mobile login | Public |
| /mobile/dashboard | Member mobile dashboard | member+ |
| /mobile/profile | Member profile | member+ |
| /mobile/payment | Payment interface | member+ |
| /mobile/payment-history | Payment history | member+ |
| /mobile/notifications | Mobile notifications | member+ |
| /mobile/subscription | Subscription details | member+ |
| /mobile/news, /mobile/news/:id | News listing & detail | member+ |
| /mobile/initiatives | Initiative listing | member+ |
| /register/:token | Public member registration | Public |
| /apple-register | Apple-style registration | Public |
| /premium-register | Premium registration | Public |
| /family-tree | Family tree admin view | All authenticated |

### Admin Key Dependencies
- **UI**: React 19.1.1, Tailwind CSS, Framer Motion, Heroicons, Lucide React, DaisyUI
- **Charts**: Chart.js, React-ChartJS-2, Recharts
- **PDF/Export**: jspdf, jspdf-autotable, html2canvas, xlsx, xlsx-populate
- **Date**: hijri-converter, moment-hijri
- **Build**: CRACO (custom webpack config with code splitting)
- **PWA**: Workbox, Service Workers

## Mobile PWA Architecture

### Directory Structure (alshuail-mobile/ v2.0.0)
```
src/
├── pages/                   # 24 page components
│   ├── Login.jsx            # Phone + Password/OTP auth
│   ├── Dashboard.jsx        # Main dashboard with caching
│   ├── Profile.jsx
│   ├── Settings.jsx         # Push notification toggle
│   ├── FamilyTree.jsx
│   ├── BranchDetail.jsx
│   ├── Notifications.jsx
│   ├── Initiatives.jsx
│   ├── Events.jsx
│   ├── News.jsx
│   ├── Payments.jsx
│   ├── PaymentCenter.jsx    # Payment hub (self/on-behalf)
│   ├── PaymentHistory.jsx
│   ├── SubscriptionDetail.jsx
│   ├── MemberCard.jsx
│   ├── Statement.jsx
│   ├── ChangePassword.jsx   # First-login forced password change
│   ├── ProfileWizard.jsx
│   ├── PrivacyPolicy.jsx
│   └── Payment type pages (Subscription, Diya, Initiative, BankTransfer)
├── components/              # 4 components
│   ├── BottomNav.jsx
│   ├── FundBalanceWidget.jsx  # Real-time fund balance display
│   ├── MemberSearchField.jsx
│   └── NotificationPrompt.jsx
├── contexts/
│   ├── DataCacheContext.jsx   # Data caching with TTL (5 min default)
│   └── index.js
├── services/                # 11 service files
│   ├── authService.js       # WhatsApp OTP + password login
│   ├── pushNotificationService.js  # Full Firebase FCM integration
│   ├── memberService.js
│   ├── familyTreeService.js
│   ├── subscriptionService.js
│   ├── paymentService.js
│   ├── newsService.js
│   ├── initiativeService.js
│   ├── eventsService.js
│   ├── notificationService.js
│   └── index.js
├── utils/
│   └── api.js               # Axios with auth interceptors
├── firebase-messaging-sw.js  # Service worker (background notifications)
└── App.jsx                  # React Router v6 with AuthContext
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
| Change Password | /change-password |
| Subscription Detail | /subscriptions/:year |
| Profile Wizard | /profile-wizard |
| Statement | /statement |
| Events | /events |
| Privacy Policy | /privacy |

### Mobile Key Dependencies
- **UI**: React 18.2, Vite 5, Tailwind CSS 3, Lucide React
- **PWA**: vite-plugin-pwa 0.17.0 (auto-update, standalone, RTL Arabic manifest)
- **Notifications**: Firebase 12.6.0 (FCM + service worker)
- **Calendar**: moment-hijri 2.1.2
- **API**: Axios 1.6.0 with auth interceptors

## Flutter App Architecture

### Directory Structure (alshuail-flutter/)
```
lib/
├── main.dart                        # App entry point
├── config/
│   ├── api_config.dart              # API endpoints
│   ├── app_router.dart              # GoRouter navigation
│   └── app_theme.dart               # Theme configuration
├── providers/
│   ├── auth_provider.dart           # Authentication state
│   └── data_cache_provider.dart     # Data caching
├── services/
│   ├── api_service.dart             # REST API (Dio)
│   ├── auth_service.dart            # Authentication logic
│   ├── biometric_service.dart       # Biometric auth (fingerprint/face)
│   ├── member_service.dart          # Member operations
│   └── storage_service.dart         # Local storage (Hive + Secure Storage)
├── screens/
│   ├── auth/                        # Login, OTP, Create Password, Biometric
│   │   ├── login_screen.dart
│   │   ├── otp_verification_screen.dart
│   │   ├── create_password_screen.dart
│   │   ├── biometric_login_screen.dart
│   │   ├── forgot_password_screen.dart
│   │   ├── profile_completion_screen.dart
│   │   └── splash_screen.dart
│   ├── dashboard/                   # Dashboard + Main Navigation
│   ├── payments/                    # Payments, Bank Transfer, Details
│   ├── family/                      # Family tree visualization
│   ├── profile/                     # User profile
│   ├── settings/                    # App settings
│   ├── notifications/               # Notification center
│   ├── news/                        # News feed
│   ├── events/                      # Event management
│   ├── initiatives/                 # Initiative participation
│   ├── member_card/                 # Digital member card
│   ├── statement/                   # Account statements
│   ├── add_children/                # Add children workflow
│   └── common/                      # Success screens
├── widgets/
│   ├── balance_card.dart            # Balance display
│   └── quick_action_button.dart     # Action buttons
└── (37 Dart files total, ~16,756 LOC)
```

### Flutter Key Dependencies
- **State**: Provider, Flutter Riverpod
- **Navigation**: GoRouter
- **Network**: Dio, connectivity_plus
- **Storage**: Hive, flutter_secure_storage, shared_preferences
- **Auth**: local_auth (biometrics)
- **Notifications**: firebase_core, firebase_messaging, flutter_local_notifications
- **PDF**: pdf, printing
- **UI**: google_fonts, shimmer, cached_network_image, lottie, lucide_icons

## iOS SwiftUI App Architecture

### Directory Structure (AlShuailFund/)
```
AlShuailFund/
├── AlShuailFundApp.swift            # App entry point
├── App/
│   └── AppState.swift               # Global app state
├── Core/
│   ├── Network/
│   │   ├── APIEndpoint.swift        # API endpoint definitions
│   │   ├── APIError.swift           # Error handling
│   │   ├── NetworkManager.swift     # Network requests
│   │   └── TokenManager.swift       # Token management
│   └── Theme/
│       ├── AppColors.swift          # Color palette
│       ├── AppFonts.swift           # Typography
│       └── DeviceHelper.swift       # Device utilities
├── Features/
│   ├── Auth/                        # AuthService, AuthViewModel, AuthViews
│   ├── Dashboard/                   # Dashboard views
│   ├── AboutAppView.swift
│   ├── ContactInfoView.swift
│   ├── DonationFlowView.swift
│   ├── EditProfileView.swift
│   ├── MemberCardView.swift
│   ├── MyFamilyTreeView.swift
│   ├── NotificationSettingsView.swift
│   ├── PaymentDetailView.swift
│   ├── PaymentFlowView.swift
│   ├── ReportsView.swift
│   └── PushNotificationManager.swift
├── Models/
│   └── Models.swift                 # Data models
├── Navigation/
│   └── MainTabView.swift            # Tab bar navigation
└── (26 Swift files total, ~5,818 LOC)
```

## Authentication Flow

### Dual Authentication System
The system supports two authentication methods:

**Method 1: WhatsApp OTP**
1. User enters phone number (Kuwait +965 or Saudi +966)
2. Backend sends OTP via WhatsApp (Ultramsg API)
3. User enters 6-digit OTP code
4. Backend verifies OTP and returns JWT token

**Method 2: Password-based Login**
1. User enters phone number + password
2. Backend validates credentials (bcrypt)
3. First-login users must change temporary password
4. Backend returns JWT token

**Post-Authentication:**
- Token stored in localStorage (mobile/admin) or Secure Storage (Flutter)
- All API requests include `Authorization: Bearer <token>` header
- CSRF token protection on state-changing requests

### Token Expiry
- Admin Dashboard: 7 days
- Mobile App: 30 days

### User Roles (with Hijri Date-Based Expiration)
| Role | Permissions |
|------|-------------|
| super_admin | Full system access, password management |
| admin | Member and content management |
| financial_manager | Payments, expenses, reports |
| operational_manager | Operations and notifications |
| member | View own data, make payments |

Roles can be assigned with Hijri-date-based expiration via the multi-role management system.

## Database Schema

### Core Tables
| Table | Description |
|-------|-------------|
| members | Family member profiles |
| family_branches | 10 family branch definitions |
| payments | All payment transactions |
| payments_yearly | Yearly payment summaries |
| subscriptions | Monthly/annual subscription records |
| initiatives | Fundraising campaigns |
| diyas | Blood money collection cases (internal/external) |
| crisis_cases | Emergency assistance cases |
| notifications | Push notification records |
| notification_logs | Notification delivery logs |
| notification_preferences | User notification preferences |
| device_tokens | FCM token storage |
| audit_logs | System audit trail |
| occasions | Family events |
| news | News/announcements |
| expenses | Fund expenditures with status tracking |
| expense_categories | Dynamic expense categories |
| settings | System configuration |
| system_settings | System-wide settings |
| fund_balance_snapshots | Fund balance reconciliation |
| bank_transfer_requests | Bank transfer / pay-on-behalf tracking |
| documents_metadata | Document storage metadata |

### Database Migrations (33 files in backend/migrations/)
Migrations cover: password auth system, member balance system, suspension/super admin system, multi-role time-based system, device tokens, notification preferences, crisis tables, audit logs, family tree columns, appearance/language/notification settings, fund balance schema, performance indexes, phone data integrity fixes, and more.

## CI/CD Pipelines

### GitHub Actions Workflows (.github/workflows/)
| Workflow | Purpose |
|----------|---------|
| backend-ci-cd.yml | Quality gates → Build/Docker → Integration tests → Deploy to Railway |
| cloudflare-pages-deploy.yml | Admin dashboard → Build → Deploy to Cloudflare Pages |
| frontend-ci-cd.yml | Frontend build and deploy pipeline |
| tests.yml | General testing workflow |

## Third-Party Services

| Service | Purpose | Configuration |
|---------|---------|---------------|
| PostgreSQL (VPS) | Primary database (self-hosted) | PG_HOST, PG_PORT, PG_DATABASE |
| Ultramsg | WhatsApp OTP delivery | ULTRAMSG_INSTANCE_ID, ULTRAMSG_TOKEN |
| Firebase | Push notifications (FCM) | Firebase service account JSON |
| Cloudflare | Admin dashboard hosting + CDN | Wrangler CLI |
| Railway | Backend hosting (alternative) | render.yaml / railway config |

## Environment Variables

### Backend (.env)
```env
# Database (PostgreSQL on VPS - NOT Supabase)
PG_HOST=213.199.62.185
PG_PORT=5432
PG_DATABASE=alshuail
PG_USER=...
PG_PASSWORD=...

# Legacy Supabase (some queries may still reference)
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

# Optional Redis caching
REDIS_URL=redis://...

# Feature Flags
ENABLE_PASSWORD_AUTH=true
ENABLE_OTP_AUTH=true
```

### Admin Frontend (.env.production)
```env
REACT_APP_API_URL=https://api.alshailfund.com/api
REACT_APP_NAME=Al-Shuail Admin Dashboard
REACT_APP_VERSION=2.0.0
REACT_APP_ENABLE_FAMILY_TREE=true
REACT_APP_ENABLE_APPROVALS=true
REACT_APP_ENABLE_AUDIT_LOGS=true
REACT_APP_DEFAULT_LANGUAGE=ar
REACT_APP_DEFAULT_COUNTRY_CODE=+966
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

### Backend Tests (164 files)
```bash
cd alshuail-backend
npm test                    # Run all tests
npm test -- --coverage      # With coverage report
npm test -- auth.test.js    # Run specific test file
```

### Test Structure
```
__tests__/
├── unit/           # Unit tests (51 files: middleware, controllers, utils)
├── integration/    # API integration tests
├── e2e/            # End-to-end flows
├── security/       # Security vulnerability tests
├── performance/    # Performance benchmarks
├── __mocks__/      # Test data and mocking utilities
└── helpers/        # Test helper functions
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
- Mobile login accepts local formats: 05xxxxxxxxx (Saudi), 9xxxxxxx (Kuwait)

### RTL Support
- Admin dashboard is RTL by default (Arabic)
- Use `dir="rtl"` and Tailwind RTL utilities
- DaisyUI components support RTL
- PWA manifest specifies `dir: "rtl"` and `lang: "ar"`

### Hijri Calendar
- Uses `hijri-converter` and `moment-hijri` libraries
- Display Islamic dates alongside Gregorian
- Role expiration uses Hijri dates
- Custom HijriDatePicker, HijriDateInput, HijriDateDisplay components

### CORS Configuration
- Backend allows requests from alshailfund.com and app.alshailfund.com
- Credentials: true for cookie support
- CSRF protection enabled on state-changing requests

### Database Migration from Supabase
- Primary database is now self-hosted PostgreSQL on VPS (213.199.62.185)
- Uses `pg` driver directly (NOT @supabase/supabase-js client)
- Some legacy Supabase references may exist in code — always use pg for new queries
- 33 migration files in backend/migrations/ directory

### Admin Build Configuration
- Uses CRACO for custom webpack config
- Code splitting: separate bundles for heroicons, chartjs, recharts, react, libs
- Emergency build mode available: `BUILD_MODE=emergency` (unminified)
- Access Control feature uses force-include shim to prevent tree-shaking

## UI Theme

### Color Palette
- Primary Gradient: #667eea to #764ba2 (purple)
- Background: #f8f9fa (light gray)
- Text Primary: #1a1a2e
- Success: #10B981
- Warning: #F59E0B
- Error: #EF4444

### Design System
- Admin: DaisyUI + Tailwind CSS + Framer Motion
- Mobile PWA: Custom Tailwind + Lucide icons + Glassmorphism effects
- Flutter: Google Fonts + Material Design + Lucide Icons
- iOS: SwiftUI native + custom color palette
- Icons: Lucide React (web), Lucide Icons (Flutter), SF Symbols (iOS)
- Multiple dashboard design variants: Apple, Islamic Premium, Ultra Premium, Simple

## Documentation Hub (docs/)

### Feature Specifications (docs/specs/)
| Spec | Description |
|------|-------------|
| 001-fund-balance-system | Fund balance tracking and reconciliation |
| 001-member-temp-password | Temporary password system for new members |
| 001-vps-database-migration | Migration from Supabase to VPS PostgreSQL |
| 002-sidebar-accessibility | Sidebar accessibility improvements |
| 003-supabase-to-vps-migration | Complete Supabase to VPS migration plan |
| password-auth-owasp-compliance | OWASP-compliant password authentication |

Each spec includes: spec.md, plan.md, tasks.md, and optionally data-model.md, research.md, quickstart.md, API contracts, and requirement checklists.

### Architecture & Analysis
- docs/architecture/API.md — Complete API endpoint documentation
- docs/architecture/ARCHITECTURE.md — System architecture overview
- docs/analysis/ — Expenses module analysis, PRD v2, controller conversion summary

## Project Statistics

| Metric | Count |
|--------|-------|
| Backend Controllers | 33 |
| Backend Route Files | 43 |
| Backend Services | 19 |
| Backend Middleware | 13 |
| Backend Utils | 16 |
| Backend Test Files | 164 |
| Database Migrations | 33 |
| Admin Components | 200+ (32 categories) |
| Admin Pages | 21 |
| Admin Services | 19 |
| Mobile Pages | 24 |
| Mobile Services | 11 |
| Flutter Dart Files | 37 (~16,756 LOC) |
| iOS Swift Files | 26 (~5,818 LOC) |
| CI/CD Workflows | 4 |
| Feature Specs | 6 |
| Total API Endpoints | 50+ |

## Recent Updates (April 2025)

- **Database Migration**: Migrated from Supabase Cloud to self-hosted PostgreSQL on VPS
- **Password Authentication**: OWASP-compliant password auth alongside WhatsApp OTP
- **Multi-Role System**: Time-based role assignment with Hijri date expiration
- **Fund Balance Management**: Real-time fund tracking with reconciliation snapshots
- **Approval Workflows**: Admin approval queue for sensitive operations
- **Member Monitoring**: Advanced wellness tracking and monitoring dashboards
- **Bank Transfers**: Pay-on-behalf functionality with bank transfer requests
- **Expense Categories**: Dynamic expense category management
- **Balance Adjustments**: Manual corrections with full audit trail
- **CSRF Protection**: Cross-site request forgery protection on all state-changing endpoints
- **Admin Dashboard v2.0**: React 19, 200+ components, multiple dashboard design variants, PWA support
- **Mobile PWA v2.0**: Data caching, fund balance widget, password change flow
- **Flutter App**: 37 screens with biometric auth, GoRouter, Provider + Riverpod
- **iOS SwiftUI App**: Full MVVM architecture with 26 feature screens
- **CI/CD**: GitHub Actions pipelines for backend, frontend, and Cloudflare Pages
- **Security**: Enhanced middleware (CSRF, rate limiting, security headers, role expiration)
- **Performance**: Redis caching, database optimization service, materialized views, connection pooling
- **Testing**: 164 test files covering unit, integration, security, performance, and e2e

## Support

- **GitHub Issues**: https://github.com/Mohamedgad1983/PROShael/issues
- **Admin URL**: https://alshailfund.com
- **Mobile App**: https://app.alshailfund.com
- **API Base**: https://api.alshailfund.com/api
