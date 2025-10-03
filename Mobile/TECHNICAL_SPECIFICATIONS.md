# AL-SHUAIL MOBILE PWA - TECHNICAL SPECIFICATIONS

**Version**: 1.0  
**Date**: October 3, 2025  
**Author**: Technical Team  
**Status**: Final

---

## TABLE OF CONTENTS

1. [System Architecture](#system-architecture)
2. [Technology Stack](#technology-stack)
3. [Database Schema](#database-schema)
4. [API Specifications](#api-specifications)
5. [Frontend Components](#frontend-components)
6. [Security Requirements](#security-requirements)
7. [Performance Requirements](#performance-requirements)
8. [Mobile Requirements](#mobile-requirements)

---

## SYSTEM ARCHITECTURE

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   MOBILE USERS (299+)                   │
│                     iPhone/Android                       │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS
                     ▼
┌─────────────────────────────────────────────────────────┐
│              CLOUDFLARE PAGES (Frontend)                │
│           https://alshuail-admin.pages.dev              │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Mobile     │  │    Admin     │  │   Shared     │ │
│  │   Routes     │  │   Routes     │  │  Components  │ │
│  │  /mobile/*   │  │  /admin/*    │  │              │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└────────────────────┬────────────────────────────────────┘
                     │ REST API
                     ▼
┌─────────────────────────────────────────────────────────┐
│               RENDER.COM (Backend API)                  │
│           https://proshael.onrender.com                 │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Auth Routes  │  │Member Routes │  │ Admin Routes │ │
│  │  /api/auth   │  │ /api/member  │  │ /api/admin   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │           Middleware Layer                       │  │
│  │  • authenticateToken (JWT verification)          │  │
│  │  • requireAdmin (role check)                     │  │
│  │  • requireMember (role check)                    │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │ PostgreSQL Protocol
                     ▼
┌─────────────────────────────────────────────────────────┐
│              SUPABASE (Database + Storage)              │
│         oneiggrfzagqjbkdinin.supabase.co                │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  PostgreSQL  │  │   Storage    │  │   Realtime   │ │
│  │   Database   │  │  (Receipts)  │  │  (Optional)  │ │
│  │   64 Tables  │  │              │  │              │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## TECHNOLOGY STACK

### Frontend

```yaml
Framework: React 18.2.0
Language: JavaScript (ES6+)
Build Tool: Vite
Routing: React Router v6
State Management: React Context API
HTTP Client: Axios
Date Library: moment-hijri
Styling: CSS3 (Custom)
PWA: Workbox (Service Workers)
```

**Key Dependencies**:
```json
{
  "react": "^18.2.0",
  "react-router-dom": "^6.14.0",
  "axios": "^1.4.0",
  "moment-hijri": "^2.1.1"
}
```

### Backend

```yaml
Runtime: Node.js 18.x
Framework: Express 4.18.x
Language: JavaScript (ES6+)
Authentication: JWT (jsonwebtoken)
Password Hashing: bcrypt
Date Library: hijri-date
File Upload: Multer
Database Client: @supabase/supabase-js
```

**Key Dependencies**:
```json
{
  "express": "^4.18.0",
  "jsonwebtoken": "^9.0.0",
  "bcrypt": "^5.1.0",
  "multer": "^1.4.5",
  "@supabase/supabase-js": "^2.26.0",
  "hijri-date": "^1.0.0"
}
```

### Database

```yaml
DBMS: PostgreSQL 15
Hosting: Supabase
Tables: 64
Storage: Supabase Storage (for receipts/documents)
Backup: Daily automated backups
```

### Deployment

```yaml
Frontend Hosting: Cloudflare Pages
Backend Hosting: Render.com (Free tier)
Domain: alshuail-admin.pages.dev
SSL: Automatic (Let's Encrypt)
CDN: Cloudflare
```

---

## DATABASE SCHEMA

### Key Tables for Mobile App

#### 1. members
```sql
CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    membership_number VARCHAR(20) UNIQUE,
    full_name_ar VARCHAR(255) NOT NULL,
    full_name_en VARCHAR(255),
    phone VARCHAR(20) UNIQUE,
    email VARCHAR(255),
    national_id VARCHAR(20),
    date_of_birth DATE,
    tribal_section VARCHAR(100),
    family_id UUID REFERENCES families(id),
    family_branch_id UUID REFERENCES family_branches(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. subscriptions
```sql
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID REFERENCES members(id),
    subscriber_id UUID REFERENCES members(id),
    plan_id UUID REFERENCES subscription_plans(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_amount DECIMAL(10,2) DEFAULT 3000.00,
    paid_amount DECIMAL(10,2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 3. payments
```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payer_id UUID REFERENCES members(id),
    beneficiary_id UUID REFERENCES members(id),
    subscription_id UUID REFERENCES subscriptions(id),
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE DEFAULT CURRENT_DATE,
    payment_method VARCHAR(50),
    receipt_url TEXT,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    approved_by UUID REFERENCES members(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 4. notifications (NEW)
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL, -- 'news', 'occasions', 'diya', 'initiatives', 'condolences'
    title_ar VARCHAR(255) NOT NULL,
    title_en VARCHAR(255),
    content_ar TEXT,
    content_en TEXT,
    target_audience VARCHAR(50) DEFAULT 'all', -- 'all', 'members', 'admins'
    is_active BOOLEAN DEFAULT true,
    publish_date TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES members(id),
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## API SPECIFICATIONS

### Base URL
- **Production**: `https://proshael.onrender.com/api`
- **Development**: `http://localhost:5001/api`

### Authentication

All protected endpoints require JWT token in header:
```
Authorization: Bearer <token>
```

### Response Format

**Success Response**:
```json
{
  "success": true,
  "data": {...},
  "message": "نجح العملية"
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "رسالة الخطأ",
  "code": "ERROR_CODE"
}
```

---

### 1. Authentication Endpoints

#### POST /api/auth/login
**Description**: Login with phone and password  
**Access**: Public  
**Request Body**:
```json
{
  "phone": "0599000001",
  "password": "Test@123"
}
```

**Response** (200):
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "full_name_ar": "أحمد محمد الشعيل",
    "phone": "0599000001",
    "role": "member",
    "membership_number": "SH-10001"
  }
}
```

---

### 2. Member Endpoints

#### GET /api/member/profile
**Description**: Get logged-in member's profile  
**Access**: Members only  
**Headers**: `Authorization: Bearer <token>`  

**Response** (200):
```json
{
  "success": true,
  "member": {
    "id": "uuid",
    "membership_number": "SH-10001",
    "full_name_ar": "أحمد محمد الشعيل",
    "full_name_en": "Ahmed Mohammed Al-Shuail",
    "phone": "0599000001",
    "email": "ahmed@example.com",
    "tribal_section": "رشود",
    "family_branch": "الشعيل",
    "date_of_birth": "1990-01-15",
    "is_active": true
  }
}
```

---

#### GET /api/member/balance
**Description**: Get member's subscription balance  
**Access**: Members only  

**Response** (200):
```json
{
  "success": true,
  "balance": {
    "current": 5000,
    "target": 3000,
    "remaining": 0,
    "percentage": 166,
    "status": "compliant",
    "is_compliant": true,
    "color": "green"
  },
  "subscription": {
    "start_date": "2024-01-01",
    "end_date": "2024-12-31",
    "plan_name": "اشتراك سنوي"
  }
}
```

---

#### GET /api/member/payments
**Description**: Get member's payment history  
**Access**: Members only  
**Query Parameters**:
- `limit` (optional): Number of records (default: 10)
- `year` (optional): Filter by year
- `month` (optional): Filter by month
- `status` (optional): Filter by status

**Example**: `/api/member/payments?limit=5&year=2024`

**Response** (200):
```json
{
  "success": true,
  "payments": [
    {
      "id": "uuid",
      "amount": 1000,
      "payment_date": "2024-09-15",
      "hijri_date": {
        "day": 15,
        "month": 2,
        "year": 1446,
        "formatted": "15 صفر 1446هـ"
      },
      "status": "approved",
      "receipt_url": "https://...",
      "notes": "دفعة شهر سبتمبر",
      "approved_by": "uuid",
      "approved_at": "2024-09-16T10:00:00Z"
    }
  ],
  "count": 5
}
```

---

#### POST /api/member/payments
**Description**: Create new payment  
**Access**: Members only  
**Request Body**:
```json
{
  "beneficiary_id": "uuid",  // Optional: if paying on behalf
  "amount": 1000,
  "payment_date": "2024-10-03",
  "notes": "دفعة شهر أكتوبر"
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "تم إنشاء الدفعة بنجاح",
  "payment": {
    "id": "uuid",
    "amount": 1000,
    "status": "pending"
  }
}
```

---

#### GET /api/member/search
**Description**: Search members (for pay-on-behalf)  
**Access**: Members only  
**Query Parameters**:
- `q` (required): Search query (name, phone, membership number)

**Example**: `/api/member/search?q=محمد`

**Response** (200):
```json
{
  "success": true,
  "members": [
    {
      "id": "uuid",
      "full_name_ar": "محمد أحمد الشعيل",
      "phone": "0599000002",
      "membership_number": "SH-10025",
      "tribal_section": "رشود"
    }
  ]
}
```

---

#### GET /api/member/notifications
**Description**: Get notifications for member  
**Access**: Members only  
**Query Parameters**:
- `type` (optional): Filter by type (news, occasions, diya, initiatives, condolences)
- `unread` (optional): Filter unread only (true/false)

**Response** (200):
```json
{
  "success": true,
  "notifications": [
    {
      "id": "uuid",
      "type": "news",
      "title_ar": "إعلان هام: اجتماع مجلس الإدارة",
      "content_ar": "سيعقد مجلس الإدارة...",
      "publish_date": "2024-10-03T10:00:00Z",
      "is_read": false
    }
  ],
  "unread_count": 5
}
```

---

### 3. Receipt Upload Endpoint

#### POST /api/receipts/upload
**Description**: Upload payment receipt  
**Access**: Members only  
**Content-Type**: `multipart/form-data`  

**Form Data**:
- `payment_id` (string): Payment ID
- `receipt` (file): Image file (JPG, PNG, PDF)

**Validation**:
- Max file size: 5MB
- Allowed types: image/jpeg, image/png, application/pdf

**Response** (200):
```json
{
  "success": true,
  "message": "تم رفع الإيصال بنجاح",
  "receipt_url": "https://supabase.co/storage/receipts/..."
}
```

---

## FRONTEND COMPONENTS

### Component Structure

```
src/
├── pages/
│   ├── auth/
│   │   └── Login.jsx
│   ├── mobile/
│   │   ├── Dashboard.jsx         ⭐ Main mobile dashboard
│   │   ├── Payment.jsx            ⭐ Payment form
│   │   ├── PaymentHistory.jsx    Payment list
│   │   └── Profile.jsx            Member profile
│   └── admin/
│       └── ... (existing admin pages)
├── components/
│   ├── mobile/
│   │   ├── BalanceCard.jsx
│   │   ├── NotificationItem.jsx
│   │   ├── PaymentItem.jsx
│   │   └── BottomNav.jsx
│   └── shared/
│       ├── HijriDate.jsx
│       └── LoadingSpinner.jsx
├── utils/
│   ├── hijriDate.js              ⭐ Hijri conversion
│   ├── RouteGuard.jsx             ⭐ Role-based routing
│   └── api.js                     API helper functions
├── contexts/
│   └── AuthContext.jsx            Authentication state
└── styles/
    └── mobile/
        ├── Dashboard.css
        └── Payment.css
```

---

### Key Component: Dashboard.jsx

**Location**: `src/pages/mobile/Dashboard.jsx`

**Props**: None (uses AuthContext)

**State**:
```javascript
{
  hijriDate: Object,
  profile: Object,
  balance: Object,
  recentPayments: Array,
  notifications: Array,
  loading: Boolean
}
```

**Lifecycle**:
1. Mount → Fetch member data
2. Display Hijri date (updates every minute)
3. Show balance with color coding
4. Load notifications (with filters)
5. Payments list (collapsible)

**API Calls**:
- GET `/api/member/profile`
- GET `/api/member/balance`
- GET `/api/member/payments?limit=5`
- GET `/api/member/notifications`

---

### Key Component: Payment.jsx

**Location**: `src/pages/mobile/Payment.jsx`

**State**:
```javascript
{
  mode: 'self' | 'behalf',
  selectedMember: Object | null,
  amount: Number,
  notes: String,
  receipt: File | null,
  loading: Boolean
}
```

**Features**:
1. Mode selector (self/behalf)
2. Member search (if behalf)
3. Amount input
4. Receipt upload (camera/gallery)
5. Notes textarea
6. Submit button

**Validation**:
- Amount > 0
- Member selected (if behalf mode)
- Receipt uploaded (optional but recommended)

---

## SECURITY REQUIREMENTS

### Authentication

1. **JWT Token**
   - Algorithm: HS256
   - Expiry: 7 days
   - Payload: `{ id, role, phone }`

2. **Password Requirements**
   - Minimum 8 characters
   - At least 1 uppercase
   - At least 1 lowercase
   - At least 1 number
   - At least 1 special character

3. **Token Storage**
   - Frontend: localStorage
   - Auto-refresh: Not implemented (manual re-login after 7 days)

### Authorization

1. **Role-Based Access**
   - `super_admin`: All access
   - `admin`: Admin dashboard
   - `financial_manager`: Financial features
   - `member`: Mobile interface only

2. **Route Protection**
   - Frontend: `<AdminRoute>` and `<MemberRoute>` guards
   - Backend: `requireAdmin` and `requireMember` middleware

3. **Data Isolation**
   - Members can ONLY see their own data
   - Database queries filtered by member ID from JWT
   - No cross-member data access

### Input Validation

1. **Frontend Validation**
   - Phone format: 05xxxxxxxx
   - Amount: Number, > 0
   - File size: < 5MB
   - File type: JPG, PNG, PDF only

2. **Backend Validation**
   - Sanitize all inputs
   - Validate UUIDs
   - Check foreign key constraints
   - Prevent SQL injection

### File Upload Security

1. **Validation**
   - Check file type (magic number, not just extension)
   - Limit file size (5MB)
   - Scan for malware (optional)

2. **Storage**
   - Use Supabase Storage (not local filesystem)
   - Generate unique filenames
   - Set proper permissions
   - Use signed URLs for access

---

## PERFORMANCE REQUIREMENTS

### Page Load Time
- Initial load: < 3 seconds
- Subsequent navigations: < 1 second
- API responses: < 500ms

### Optimization Strategies

1. **Frontend**
   - Code splitting by route
   - Lazy load images
   - Cache API responses
   - Service Worker for offline

2. **Backend**
   - Database query optimization
   - Add indexes on frequently queried columns
   - Use connection pooling
   - Cache static data

3. **Database Indexes**
```sql
-- Critical indexes for mobile app
CREATE INDEX idx_members_phone ON members(phone);
CREATE INDEX idx_payments_payer ON payments(payer_id);
CREATE INDEX idx_payments_date ON payments(payment_date DESC);
CREATE INDEX idx_subscriptions_member ON subscriptions(member_id);
CREATE INDEX idx_notifications_publish ON notifications(publish_date DESC);
```

---

## MOBILE REQUIREMENTS

### Target Devices
- **Primary**: iPhone 11 (375 x 812)
- **Secondary**: iPhone 13 Pro, Samsung Galaxy S21
- **Minimum**: iOS 14+, Android 9+

### Browser Compatibility
- Safari iOS 14+
- Chrome Android 90+
- Firefox Mobile 90+

### PWA Features

1. **Installable**
   - manifest.json with icons
   - Service worker registered
   - Add to Home Screen prompt

2. **Offline Support**
   - Cache core pages
   - Queue failed API requests
   - Show offline indicator

3. **Responsive Design**
   - Mobile-first approach
   - Breakpoints: 375px, 768px, 1024px
   - Touch-friendly (min 44x44 tap targets)

### Performance Targets
- First Contentful Paint: < 2s
- Time to Interactive: < 4s
- Lighthouse Score: 90+

---

## ERROR HANDLING

### Frontend Errors

1. **Network Errors**
   - Show retry button
   - Queue requests for offline mode
   - Display friendly message in Arabic

2. **Validation Errors**
   - Show inline error messages
   - Highlight invalid fields
   - Provide helpful hints

3. **API Errors**
```javascript
try {
  const response = await api.get('/member/profile');
} catch (error) {
  if (error.response?.status === 401) {
    // Unauthorized - redirect to login
    logout();
    navigate('/login');
  } else if (error.response?.status === 403) {
    // Forbidden - show access denied
    showError('غير مصرح - لا تملك صلاحية الوصول');
  } else {
    // Generic error
    showError('حدث خطأ في تحميل البيانات');
  }
}
```

### Backend Errors

1. **Error Response Format**
```javascript
res.status(400).json({
  success: false,
  error: 'رسالة الخطأ بالعربي',
  code: 'VALIDATION_ERROR',
  details: { field: 'amount', message: 'المبلغ يجب أن يكون أكبر من صفر' }
});
```

2. **Error Codes**
- `UNAUTHORIZED`: 401 - Not logged in
- `FORBIDDEN`: 403 - No permission
- `NOT_FOUND`: 404 - Resource not found
- `VALIDATION_ERROR`: 400 - Invalid input
- `SERVER_ERROR`: 500 - Internal error

---

## TESTING REQUIREMENTS

### Unit Tests
- All utility functions (hijriDate.js)
- Component rendering
- API helper functions
- Validation functions

### Integration Tests
- Login flow
- Payment submission flow
- Receipt upload flow
- API endpoint responses

### E2E Tests (Critical Paths)
1. Member login → Dashboard
2. View balance → Make payment → Upload receipt
3. View notifications → Filter by type
4. View payment history

### Performance Tests
- Load time under 3G
- Concurrent user load (100+ users)
- Database query performance

---

## DEPLOYMENT REQUIREMENTS

### Environment Variables

**Backend (.env)**:
```
PORT=5001
NODE_ENV=production
JWT_SECRET=<secret>
SUPABASE_URL=<url>
SUPABASE_SERVICE_KEY=<key>
```

**Frontend (.env)**:
```
VITE_API_URL=https://proshael.onrender.com/api
VITE_SUPABASE_URL=<url>
VITE_SUPABASE_ANON_KEY=<key>
```

### Build Commands

**Frontend**:
```bash
npm install
npm run build
# Output: dist/ folder
```

**Backend**:
```bash
npm install
npm start
# Runs on PORT from .env
```

### Health Checks

**Backend Health Endpoint**:
```
GET /health
Response: { status: 'OK', timestamp: '...' }
```

---

## MAINTENANCE & MONITORING

### Logging
- All API requests logged
- Error logs with stack traces
- User actions in audit_logs table

### Monitoring
- Backend uptime (Render.com dashboard)
- API response times
- Error rates
- User login/activity metrics

### Backup Strategy
- Database: Daily automated (Supabase)
- File storage: Versioned (Supabase)
- Manual backup before major changes

---

**END OF TECHNICAL SPECIFICATIONS**

**Next Steps**:
1. Review and approve this document
2. Set up development environment
3. Begin Phase 1 implementation
4. Follow API specifications exactly

---

**Approval**:
- Tech Lead: _________________ Date: _______
- Backend Developer: _________________ Date: _______
- Frontend Developer: _________________ Date: _______
