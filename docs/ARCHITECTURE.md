# System Architecture

Al-Shuail Family Management System - Architecture Documentation v2.0.0

---

## Overview

The Al-Shuail Family Management System is a full-stack web application built with a microservices-ready architecture. It consists of three main components:

1. **Backend API** - Express.js REST API
2. **Admin Dashboard** - React TypeScript SPA
3. **Mobile PWA** - React Vite Progressive Web App

---

## System Architecture Diagram

```
                    ┌─────────────────────────────────────────────────────┐
                    │                    CLIENTS                           │
                    ├─────────────────────┬───────────────────────────────┤
                    │  Desktop Browser    │     Mobile Browser/PWA        │
                    │  (Admin Dashboard)  │     (Member App)              │
                    └─────────┬───────────┴───────────────┬───────────────┘
                              │                           │
                              │ HTTPS                     │ HTTPS
                              │                           │
    ┌─────────────────────────▼───────────────────────────▼─────────────────────────┐
    │                           CLOUDFLARE CDN                                       │
    │                    (SSL Termination, DDoS Protection)                          │
    └─────────────────────────────────────┬─────────────────────────────────────────┘
                                          │
            ┌─────────────────────────────┼─────────────────────────────┐
            │                             │                             │
            ▼                             ▼                             ▼
    ┌───────────────┐           ┌─────────────────┐           ┌─────────────────┐
    │ Admin SPA     │           │ Mobile PWA      │           │ API Server      │
    │ alshailfund   │           │ app.alshailfund │           │ api.alshailfund │
    │ .com          │           │ .com            │           │ .com            │
    │ (CF Pages)    │           │ (VPS/Nginx)     │           │ (VPS/PM2)       │
    └───────────────┘           └─────────────────┘           └────────┬────────┘
                                                                       │
                                          ┌────────────────────────────┤
                                          │                            │
                                          ▼                            ▼
                                ┌─────────────────┐          ┌─────────────────┐
                                │   Supabase      │          │ External APIs   │
                                │   PostgreSQL    │          │ - Firebase FCM  │
                                │                 │          │ - UltraMsg      │
                                │   Storage       │          │ - Twilio        │
                                └─────────────────┘          └─────────────────┘
```

---

## Component Architecture

### Backend API Architecture

```
alshuail-backend/
├── server.js                 # Entry point, Express setup
├── src/
│   ├── config/
│   │   ├── database.js       # Supabase client initialization
│   │   ├── env.js            # Centralized environment config
│   │   └── firebase.js       # Firebase Admin SDK setup
│   │
│   ├── middleware/
│   │   ├── authMiddleware.js # JWT authentication
│   │   ├── rateLimiter.js    # Request rate limiting
│   │   ├── validation.js     # Request validation
│   │   └── errorHandler.js   # Global error handling
│   │
│   ├── routes/
│   │   ├── auth.js           # Authentication routes
│   │   ├── members.js        # Member management
│   │   ├── payments.js       # Payment processing
│   │   ├── subscriptions.js  # Subscription management
│   │   ├── familyTree.js     # Family tree operations
│   │   ├── reports.js        # Reporting endpoints
│   │   └── ...               # Other route modules
│   │
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── memberController.js
│   │   ├── paymentController.js
│   │   └── ...               # Business logic handlers
│   │
│   ├── services/
│   │   ├── firebaseService.js    # Push notifications
│   │   ├── ultramsgService.js    # WhatsApp messaging
│   │   ├── receiptService.js     # PDF generation
│   │   ├── arabicPdfExporter.js  # Arabic PDF with RTL
│   │   └── notificationService.js
│   │
│   └── utils/
│       ├── logger.js         # Winston logging
│       ├── errorCodes.js     # Error definitions
│       └── helpers.js        # Utility functions
│
└── __tests__/                # Test suites
    ├── unit/
    ├── integration/
    └── e2e/
```

### Frontend Architecture (Admin)

```
alshuail-admin-arabic/
├── public/
│   ├── manifest.json         # PWA manifest
│   └── icons/                # App icons
│
├── src/
│   ├── components/
│   │   ├── Dashboard/        # Dashboard components
│   │   ├── Members/          # Member management
│   │   ├── Payments/         # Payment components
│   │   ├── FamilyTree/       # Tree visualization
│   │   ├── Reports/          # Financial reports
│   │   ├── Settings/         # System settings
│   │   ├── Navigation/       # Navigation components
│   │   └── Shared/           # Reusable components
│   │
│   ├── contexts/
│   │   ├── AuthContext.js    # Authentication state
│   │   ├── RoleContext.tsx   # Role-based access
│   │   └── ThemeContext.js   # Theme management
│   │
│   ├── hooks/
│   │   ├── useAuth.js        # Auth hook
│   │   ├── useFetch.js       # Data fetching
│   │   └── useDebounce.js    # Input debouncing
│   │
│   ├── services/
│   │   ├── api.js            # Axios instance
│   │   ├── memberService.js  # Member API calls
│   │   └── paymentService.js # Payment API calls
│   │
│   └── utils/
│       ├── logger.js         # Frontend logging
│       ├── formatters.js     # Data formatters
│       └── validators.js     # Form validation
│
└── craco.config.js           # Build configuration
```

### Mobile PWA Architecture

```
alshuail-mobile/
├── public/
│   ├── manifest.json         # PWA manifest
│   ├── sw.js                 # Service worker
│   └── icons/                # App icons
│
├── src/
│   ├── components/
│   │   ├── BottomNav.jsx     # Mobile navigation
│   │   ├── LoadingSpinner.jsx
│   │   └── ...
│   │
│   ├── pages/
│   │   ├── Login.jsx         # Authentication
│   │   ├── Dashboard.jsx     # Member dashboard
│   │   ├── Payments.jsx      # Payment history
│   │   ├── FamilyTree.jsx    # Tree view
│   │   └── Profile.jsx       # User profile
│   │
│   └── utils/
│       ├── api.js            # API client
│       ├── auth.js           # Auth utilities
│       └── storage.js        # Local storage
│
└── vite.config.js            # Vite configuration
```

---

## Data Flow

### Authentication Flow

```
┌─────────┐     POST /api/auth/login      ┌─────────┐
│ Client  │ ──────────────────────────►   │ Server  │
│         │   {email, password}           │         │
│         │                               │         │
│         │ ◄──────────────────────────   │         │
│         │   {token, user, permissions}  │         │
└─────────┘                               └─────────┘
     │                                         │
     │ Store token in localStorage             │
     │                                         │
     │     Subsequent requests:                │
     │     Authorization: Bearer <token>       │
     └─────────────────────────────────────────┘
```

### Payment Processing Flow

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Admin   │    │   API    │    │ Database │    │  Member  │
│ Dashboard│    │  Server  │    │(Supabase)│    │          │
└────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘
     │               │               │               │
     │ Record Payment│               │               │
     │──────────────►│               │               │
     │               │ Update Balance               │
     │               │──────────────►│               │
     │               │               │               │
     │               │ Get Updated   │               │
     │               │◄──────────────│               │
     │               │               │               │
     │               │ Send Notification             │
     │               │───────────────────────────────►
     │               │               │               │
     │ Success       │               │               │
     │◄──────────────│               │               │
     │               │               │               │
```

---

## Security Architecture

### Authentication & Authorization

```
┌─────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. HTTPS/TLS (Cloudflare)                                  │
│     └── All traffic encrypted in transit                    │
│                                                             │
│  2. Rate Limiting                                           │
│     └── express-rate-limit: 100 req/min                     │
│                                                             │
│  3. JWT Authentication                                      │
│     └── Token expiry: 7 days (admin) / 30 days (member)     │
│                                                             │
│  4. Role-Based Access Control (RBAC)                        │
│     ├── super_admin: Full access                            │
│     ├── financial_manager: Financial modules                │
│     ├── family_tree_admin: Tree management                  │
│     ├── occasions_admin: Events & initiatives               │
│     └── member: Personal data only                          │
│                                                             │
│  5. Input Validation (Joi)                                  │
│     └── Request body, query params validation               │
│                                                             │
│  6. SQL Injection Prevention                                │
│     └── Parameterized queries via Supabase client           │
│                                                             │
│  7. XSS Prevention                                          │
│     └── Content Security Policy, output encoding            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Role Permission Matrix

| Permission | super_admin | financial_manager | family_tree_admin | occasions_admin | member |
|------------|:-----------:|:-----------------:|:-----------------:|:---------------:|:------:|
| All Access | ✅ | ❌ | ❌ | ❌ | ❌ |
| Members CRUD | ✅ | ❌ | ❌ | ❌ | ❌ |
| View Finances | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage Payments | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Statements | ✅ | ✅ | ❌ | ❌ | ❌ |
| Family Tree | ✅ | ❌ | ✅ | ❌ | ❌ |
| Occasions | ✅ | ❌ | ❌ | ✅ | ❌ |
| Personal Profile | ✅ | ✅ | ✅ | ✅ | ✅ |
| Own Payments | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Database Schema

### Core Tables

```sql
-- Members
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name_ar VARCHAR(255) NOT NULL,
  full_name_en VARCHAR(255),
  phone VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255),
  membership_number VARCHAR(20) UNIQUE,
  branch_id UUID REFERENCES family_branches(id),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family Branches (فخوذ)
CREATE TABLE family_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_name_ar VARCHAR(100) NOT NULL,
  branch_name_en VARCHAR(100),
  description TEXT,
  leader_id UUID REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id),
  current_balance DECIMAL(10,2) DEFAULT 0,
  months_paid_ahead INTEGER DEFAULT 0,
  last_payment_date DATE,
  next_payment_due DATE,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id),
  amount DECIMAL(10,2) NOT NULL,
  payment_type VARCHAR(50),
  payment_method VARCHAR(50),
  receipt_number VARCHAR(50),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Business Rules

1. **Subscription Balance Cap**: Maximum 3000 SAR (60 months × 50 SAR)
2. **Monthly Subscription**: Fixed at 50 SAR
3. **Overdue Status**: Member is overdue if balance < 0
4. **Active Status**: Balance >= 0

---

## External Integrations

### Firebase Cloud Messaging (FCM)

```javascript
// Push Notification Flow
firebaseService.sendNotification({
  tokens: [deviceToken1, deviceToken2],
  title: 'تذكير بالدفع',
  body: 'يرجى سداد الاشتراك الشهري',
  data: { type: 'payment_reminder' }
});
```

### WhatsApp (UltraMsg)

```javascript
// OTP Sending
ultramsgService.sendOTP({
  phone: '96551234567',
  message: 'رمز التحقق: 123456'
});
```

### Supabase Storage

```javascript
// Document Upload
supabase.storage
  .from('documents')
  .upload(`members/${memberId}/${filename}`, file);
```

---

## Deployment Architecture

### Production Environment

```
┌─────────────────────────────────────────────────────────────┐
│                    PRODUCTION                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Cloudflare Pages (Admin Dashboard)                         │
│  ├── URL: alshailfund.com                                   │
│  ├── Build: npm run build:fast                              │
│  └── Deploy: wrangler pages deploy                          │
│                                                             │
│  VPS 213.199.62.185 (Backend + Mobile)                      │
│  ├── Backend                                                │
│  │   ├── Path: /var/www/PROShael/alshuail-backend          │
│  │   ├── URL: api.alshailfund.com                          │
│  │   ├── Process: PM2 (alshuail-backend)                   │
│  │   └── Port: 5001                                        │
│  │                                                          │
│  └── Mobile PWA                                             │
│      ├── Path: /var/www/mobile                              │
│      ├── URL: app.alshailfund.com                          │
│      └── Server: Nginx                                      │
│                                                             │
│  Supabase (Database + Storage)                              │
│  └── Region: Singapore                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### CI/CD Pipeline (Future)

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  Push   │───►│  Build  │───►│  Test   │───►│ Deploy  │
│ to main │    │         │    │         │    │         │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
                    │              │              │
                    ▼              ▼              ▼
              npm install    npm test     wrangler deploy
              npm run build  npm run lint pm2 restart
```

---

## Performance Considerations

### Backend Optimization

1. **Database Indexing**: Key columns indexed
2. **Query Optimization**: Limit/offset pagination
3. **Caching**: Redis for frequently accessed data (planned)
4. **Compression**: Gzip response compression

### Frontend Optimization

1. **Code Splitting**: Dynamic imports
2. **Lazy Loading**: Route-based splitting
3. **Image Optimization**: WebP format
4. **Service Worker**: PWA offline support
5. **Bundle Analysis**: webpack-bundle-analyzer

### Monitoring

1. **Backend Logs**: Winston + PM2 logs
2. **Error Tracking**: Sentry (planned)
3. **Performance**: Lighthouse audits
4. **Uptime**: Health check endpoints

---

## Scalability Path

### Current (Single Server)

- Handles 347 members effectively
- Suitable for family-sized organization

### Future (Multi-Server)

1. **Load Balancer**: Nginx/HAProxy
2. **Multiple API Instances**: PM2 cluster mode
3. **Database Read Replicas**: Supabase Pro
4. **CDN**: Cloudflare for all static assets
5. **Queue System**: Redis/Bull for background jobs

---

**Version**: 2.0.0
**Last Updated**: January 2025
