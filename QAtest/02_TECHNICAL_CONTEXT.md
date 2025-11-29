# 🏗️ AL-SHUAIL SYSTEM - TECHNICAL CONTEXT

## 📊 TECHNOLOGY STACK

### Backend Infrastructure
```yaml
Runtime: Node.js v18+
Framework: Express.js
Deployment: Render (PaaS)
API Base URL: https://proshael.onrender.com/api/v1
Environment: Production
Language: JavaScript (ES6+)
```

### Database
```yaml
System: PostgreSQL 15+
Provider: Supabase
Project ID: oneiggrfzagqjbkdinin
Connection: Pooled connections
Total Tables: 64
Total Relationships: 94 foreign keys
Size: ~2.5 MB (structure + data)
Active Members: 347
```

### Frontend
```yaml
Admin Panel:
  - Framework: React 18 + TypeScript
  - Styling: Tailwind CSS + DaisyUI
  - Deployment: Cloudflare Pages
  - URL: https://alshuail-admin.pages.dev
  
Mobile App:
  - Type: Progressive Web App (PWA)
  - Framework: React (not Flutter)
  - Status: In development
```

### Testing Framework
```yaml
Unit Tests: Jest
API Tests: Supertest
Frontend Tests: React Testing Library
Coverage Tool: Istanbul/nyc
Mocking: Jest mocks
Current Status:
  - Total Tests: 516
  - Passing: 454 (88%)
  - Failing: 62 (12%)
  - Coverage: 20.2%
```

---

## 🗄️ DATABASE SCHEMA (64 Tables)

### Core Member Management (8 tables)

#### `members` Table ⚠️ CRITICAL - Referenced by 40+ tables
```sql
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_number VARCHAR(20) UNIQUE NOT NULL, -- Format: SH-XXXX
  full_name_ar VARCHAR(255) NOT NULL,
  full_name_en VARCHAR(255) NOT NULL,
  national_id VARCHAR(20) UNIQUE NOT NULL,
  phone VARCHAR(20) NOT NULL, -- +966 or +965
  email VARCHAR(255),
  date_of_birth DATE NOT NULL,
  family_id UUID REFERENCES families(id),
  family_branch_id UUID REFERENCES family_branches(id),
  gender VARCHAR(10),
  marital_status VARCHAR(20),
  address_ar TEXT,
  address_en TEXT,
  profile_photo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  balance DECIMAL(10,2) DEFAULT 0, -- Important: 90% were below 3000 SAR
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Current status: 347 active members
```

#### Related Tables:
- `member_photos` - Profile photos
- `member_documents` - Personal documents
- `member_subscriptions` - Subscription links
- `member_registration_tokens` - Registration tokens
- `temp_members` - Temporary records (8 rows)
- `profiles` - Extended user profiles (2 rows)
- `members_backup_20250928_1039` - Backup (299 rows)

---

### Authentication & Authorization (7 tables)

#### `users` Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL, -- 7 roles defined
  permissions JSONB DEFAULT '{}',
  member_id UUID REFERENCES members(id),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `user_roles` Table (7 roles defined)
```sql
-- Actual roles in system:
1. super_admin - Full system access
2. admin - Administrative functions
3. financial_manager - Financial operations only
4. family_tree_manager - Family tree editing only
5. member - Basic member access
6. secretary - Documentation & records
7. viewer - Read-only access
```

#### Related Tables:
- `roles` - Role definitions (5 rows)
- `permissions` - Permission definitions (15 rows)
- `user_role_assignments` - User-role mappings (1 row)
- `refresh_tokens` - JWT refresh tokens (12 rows)
- `verification_codes` - Phone/email verification

---

### Financial Management (12 tables)

#### `subscriptions` Table ⚠️ CRITICAL - 347 active
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id),
  subscriber_id UUID REFERENCES members(id), -- Who pays
  plan_id UUID REFERENCES subscription_plans(id),
  amount DECIMAL(10,2) NOT NULL, -- Always 50 SAR for monthly
  currency VARCHAR(3) DEFAULT 'SAR',
  start_date DATE NOT NULL,
  end_date DATE,
  status VARCHAR(20) DEFAULT 'active', -- active/overdue/suspended
  auto_renew BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Business Rule: Base subscription is 50 SAR/month
-- Discount: 10% for families with 5+ members
```

#### `payments` Table
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payer_id UUID REFERENCES members(id),
  subscription_id UUID REFERENCES subscriptions(id),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'SAR',
  payment_method VARCHAR(50) NOT NULL, -- bank_transfer/cash/electronic/check
  payment_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending/completed/failed
  reference_number VARCHAR(100),
  processed_by UUID REFERENCES members(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Related Tables:
- `subscription_plans` - Available plans (3 rows)
- `financial_contributions` - Diya/charity contributions (20 rows)
- `financial_transactions` - Transaction log
- `financial_reports` - Generated reports
- `contributions` - General contributions
- `expenses` - Expense tracking
- `expense_categories` - Expense categories (10 rows)
- `expense_receipts` - Receipt storage
- `bank_statements` - Bank statement metadata
- `payment_notifications` - Payment notifications

---

### Family Tree System (8 tables)

#### `family_relationships` Table
```sql
CREATE TABLE family_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_from UUID REFERENCES members(id),
  member_to UUID REFERENCES members(id),
  relationship_type VARCHAR(50) NOT NULL, -- father/mother/son/daughter/etc
  created_by UUID REFERENCES members(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT no_self_reference CHECK (member_from != member_to)
);

-- Valid relationship types:
-- father, mother, son, daughter, brother, sister
-- grandfather, grandmother, uncle, aunt, cousin
-- nephew, niece
```

#### `family_tree` Table
```sql
CREATE TABLE family_tree (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id),
  parent_member_id UUID REFERENCES members(id),
  generation_level INTEGER NOT NULL,
  position_x DECIMAL(10,2),
  position_y DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `family_branches` Table (3 branches - فخذ)
```sql
CREATE TABLE family_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_name_ar VARCHAR(255) NOT NULL,
  branch_name_en VARCHAR(255) NOT NULL,
  branch_head_id UUID REFERENCES members(id),
  parent_branch_id UUID REFERENCES family_branches(id),
  description_ar TEXT,
  description_en TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Currently: 3 family branches defined
```

#### Related Tables:
- `family_tree_positions` - Visual positioning
- `families` - Family groups
- `family_assets` - Family asset tracking
- `inheritance_plans` - Inheritance planning

---

### Activities & Events (10 tables)

#### `activities` Table (9 active)
```sql
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  main_category_id UUID REFERENCES main_categories(id),
  sub_category_id UUID REFERENCES sub_categories(id),
  title_ar VARCHAR(255) NOT NULL,
  title_en VARCHAR(255) NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  beneficiary_name_ar VARCHAR(255),
  beneficiary_name_en VARCHAR(255),
  target_amount DECIMAL(10,2),
  current_amount DECIMAL(10,2) DEFAULT 0,
  collection_start_date DATE,
  collection_end_date DATE,
  hijri_start_date VARCHAR(50), -- Format: YYYY/M/D
  hijri_end_date VARCHAR(50),
  event_date DATE,
  event_time TIME,
  event_location_ar TEXT,
  event_location_en TEXT,
  organizer_id UUID REFERENCES members(id),
  financial_manager_id UUID REFERENCES members(id),
  status VARCHAR(20) DEFAULT 'active',
  collection_status VARCHAR(20) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Current: 9 active activities
```

#### Related Tables:
- `events` - Scheduled events (3 rows)
- `event_attendees` - Event participation (2 rows)
- `event_registrations` - Event sign-ups
- `occasions` - Family occasions
- `occasion_registrations` - Occasion RSVPs
- `occasion_rsvp` - RSVP responses
- `initiatives` - Active initiatives (2 rows)
- `initiative_donations` - Initiative funding
- `initiative_volunteers` - Volunteer sign-ups

---

### Diya (Blood Money) System (2 tables)

#### `diya_cases` Table
```sql
CREATE TABLE diya_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number VARCHAR(50) UNIQUE NOT NULL, -- Format: DIYA-YYYY-XXXX
  complainant_id UUID REFERENCES members(id),
  defendant_id UUID REFERENCES members(id),
  case_type VARCHAR(50) NOT NULL, -- accidental_death/intentional_injury/etc
  amount_due DECIMAL(10,2) NOT NULL,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'open', -- open/in_progress/resolved
  incident_date DATE NOT NULL,
  incident_description_ar TEXT,
  incident_description_en TEXT,
  resolution_date DATE,
  created_by UUID REFERENCES members(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Historical: 3 cases with 852+ contributors
```

#### `diya_case_updates` Table
```sql
CREATE TABLE diya_case_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES diya_cases(id),
  update_date DATE NOT NULL,
  update_description_ar TEXT,
  update_description_en TEXT,
  payment_amount DECIMAL(10,2),
  updated_by UUID REFERENCES members(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### Document Management (5 tables)

#### `documents_metadata` Table
```sql
CREATE TABLE documents_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES members(id),
  category_id UUID REFERENCES document_categories(id),
  type_id UUID REFERENCES document_types(id),
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type VARCHAR(100),
  storage_bucket VARCHAR(50), -- member-photos/member-documents/etc
  created_by UUID REFERENCES members(id),
  parent_document_id UUID REFERENCES documents_metadata(id), -- For versions
  is_deleted BOOLEAN DEFAULT false,
  deleted_by UUID REFERENCES members(id),
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Related Tables:
- `document_categories` - Categories defined (13 rows)
- `document_types` - Types defined (14 rows)
- `document_processing_queue` - Processing queue
- `document_access_logs` - Access audit log

---

### System Tables (8 tables)

#### `settings` Table (24 rows configured)
```sql
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  category VARCHAR(50),
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Related Tables:
- `app_settings` - App configuration (6 rows)
- `system_settings` - System config (1 row)
- `audit_logs` - System audit trail
- `notifications` - User notifications
- `news_announcements` - News posts
- `sms_otp` - SMS OTP codes
- `excel_import_batches` - Import tracking

---

## 🎯 CRITICAL BUSINESS RULES

### 1. Member Validation Rules

```javascript
// National ID formats
const SAUDI_NATIONAL_ID = /^[12]\d{9}$/; // 1xxxxxxxxx or 2xxxxxxxxx
const KUWAIT_CIVIL_ID = /^\d{12}$/;      // 12 digits

// Phone number formats
const SAUDI_PHONE = /^(\+966|0)[5]\d{8}$/;  // +966 5XXXXXXXX or 05XXXXXXXX
const KUWAIT_PHONE = /^(\+965)[569]\d{7}$/; // +965 XXXXXXXX

// Membership number format
const MEMBERSHIP_NUMBER = /^SH-\d{4}$/;  // SH-0001 to SH-9999

// Arabic name validation (must contain Arabic characters)
const ARABIC_TEXT = /[\u0600-\u06FF]/;

// Business Rules:
// - Both Arabic and English names required
// - Unique national_id
// - Unique phone number
// - Valid family_branch_id required
// - Auto-generate membership number in sequence
```

### 2. Financial Rules (CRITICAL)

```javascript
// Subscription rules
const MONTHLY_SUBSCRIPTION = 50; // SAR
const FAMILY_DISCOUNT_THRESHOLD = 5; // 5+ members
const FAMILY_DISCOUNT_RATE = 0.10; // 10% discount

// Minimum balance requirement
const MINIMUM_BALANCE = 3000; // SAR
// Note: 90% of members were below this threshold (business recovery needed)

// Valid payment methods
const PAYMENT_METHODS = [
  'bank_transfer',
  'cash',
  'electronic',
  'check'
];

// Currency
const CURRENCY = 'SAR'; // Saudi Riyal only

// Business Rules:
// - Base subscription: 50 SAR/month
// - Discount for families with 5+ members: 10% off
// - All amounts in SAR
// - Track balance per member
// - Generate invoices with Hijri date
```

### 3. Family Tree Rules

```javascript
// Valid relationship types
const VALID_RELATIONSHIPS = [
  'father', 'mother', 'son', 'daughter',
  'brother', 'sister', 'grandfather', 'grandmother',
  'uncle', 'aunt', 'cousin', 'nephew', 'niece'
];

// Business Rules:
// - Each member has ONE parent (except root)
// - No circular references (A → B → A)
// - No self-references (A → A)
// - Generation level must be consistent
// - Branch head must be valid member
// - Support 3 family branches (فخذ)
```

### 4. Diya Case Rules (Islamic Law)

```javascript
// Diya amounts (base amounts in SAR)
const DIYA_AMOUNTS = {
  accidental_death: 100000,      // Full diya
  intentional_injury: 50000,     // 50% of full
  accidental_injury: 30000,      // 30% of full
  severe_injury: 70000           // 70% of full
};

// Case number format
const CASE_NUMBER = /^DIYA-\d{4}-\d{4}$/; // DIYA-2025-0001

// Business Rules:
// - Only family members can be complainants/defendants
// - Amount based on Islamic law calculations
// - Distributed among contributors
// - Requires family council approval
// - Track contributions separately
```

### 5. Authentication & Authorization (RBAC)

```javascript
// 7 roles with specific permissions
const ROLES = {
  SUPER_ADMIN: {
    name: 'super_admin',
    permissions: ['*'] // All permissions
  },
  ADMIN: {
    name: 'admin',
    permissions: [
      'manage_members',
      'view_finances',
      'manage_events',
      'manage_documents'
    ]
  },
  FINANCIAL_MANAGER: {
    name: 'financial_manager',
    permissions: [
      'view_finances',
      'manage_payments',
      'manage_subscriptions',
      'generate_reports'
    ]
  },
  FAMILY_TREE_MANAGER: {
    name: 'family_tree_manager',
    permissions: [
      'manage_family_tree',
      'view_members',
      'manage_relationships'
    ]
  },
  MEMBER: {
    name: 'member',
    permissions: [
      'view_own_data',
      'update_own_profile',
      'view_public_events'
    ]
  },
  SECRETARY: {
    name: 'secretary',
    permissions: [
      'manage_documents',
      'view_members',
      'create_announcements'
    ]
  },
  VIEWER: {
    name: 'viewer',
    permissions: [
      'view_public_data'
    ]
  }
};

// JWT token expiration
const JWT_EXPIRATION = 7 * 24 * 60 * 60; // 7 days in seconds

// Password requirements
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REQUIREMENTS = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
```

### 6. Arabic & Hijri Calendar Rules

```javascript
const moment = require('moment-hijri');

// Hijri date format
const HIJRI_FORMAT = 'iYYYY/iM/iD'; // Example: 1446/5/20

// Business Rules:
// - All Islamic events MUST have Hijri dates
// - Display Hijri prominently, Gregorian secondary
// - Handle month lengths (29-30 days)
// - Convert between Hijri and Gregorian accurately
// - Use Arabic numerals option (٠١٢٣٤٥٦٧٨٩)

// Example conversion
const hijriDate = moment('2025-11-25', 'YYYY-MM-DD').format('iYYYY/iM/iD');
// Result: 1447/5/24

// Validation
const validateHijriDate = (hijriDate) => {
  return /^\d{4}\/\d{1,2}\/\d{1,2}$/.test(hijriDate);
};
```

---

## 🔗 FOREIGN KEY RELATIONSHIPS (94 Total)

### Critical Relationship Patterns:

#### 1. Members Hub (Central - 40+ references)
```
members ← Referenced by:
├── payments (payer_id)
├── subscriptions (member_id, subscriber_id)
├── family_relationships (member_from, member_to, created_by)
├── family_tree (member_id, parent_member_id)
├── documents_metadata (owner_id, created_by)
├── member_photos (member_id)
├── profiles (member_id)
├── activities (organizer_id, financial_manager_id)
├── diya_cases (complainant_id, defendant_id, created_by)
├── financial_contributions (contributor_id, approved_by)
└── ... 30+ more tables
```

#### 2. Authentication Flow
```
users
├── member_id → members.id
├── role → user_roles.role_name
└── permissions (JSONB)
```

#### 3. Financial Flow
```
subscription_plans
└── subscriptions
    ├── member_id → members.id
    ├── subscriber_id → members.id
    └── payments
        ├── payer_id → members.id
        └── processed_by → members.id
```

#### 4. Family Tree Flow
```
family_branches
├── branch_head_id → members.id
└── family_tree
    ├── member_id → members.id
    └── parent_member_id → members.id (recursive)
```

---

## 🛠️ DEVELOPMENT ENVIRONMENT

### Environment Variables (.env)
```bash
# Database
DATABASE_URL=postgresql://postgres:[password]@db.oneiggrfzagqjbkdinin.supabase.co:5432/postgres
SUPABASE_URL=https://oneiggrfzagqjbkdinin.supabase.co
SUPABASE_ANON_KEY=[key]

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRATION=7d

# API
PORT=3001
NODE_ENV=production
API_BASE_URL=https://proshael.onrender.com/api/v1

# Frontend
FRONTEND_URL=https://alshuail-admin.pages.dev

# SMS (if enabled)
SMS_API_KEY=[key]
SMS_SENDER_ID=AlShuail

# Storage
STORAGE_BUCKET_PHOTOS=member-photos
STORAGE_BUCKET_DOCUMENTS=member-documents
STORAGE_BUCKET_REPORTS=financial-reports
```

### Test Environment Setup
```bash
# Install dependencies
npm install

# Set up test database
npm run test:db:setup

# Run migrations
npm run migrate:test

# Seed test data
npm run seed:test

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage
```

---

## 📦 KEY DEPENDENCIES

### Backend
```json
{
  "express": "^4.18.0",
  "pg": "^8.11.0",
  "@supabase/supabase-js": "^2.39.0",
  "jsonwebtoken": "^9.0.0",
  "bcrypt": "^5.1.0",
  "moment-hijri": "^2.1.0",
  "uuid": "^9.0.0"
}
```

### Testing
```json
{
  "jest": "^29.0.0",
  "supertest": "^6.3.0",
  "@testing-library/react": "^14.0.0",
  "@testing-library/jest-dom": "^6.0.0",
  "jest-environment-jsdom": "^29.0.0"
}
```

---

## 🎯 TESTING PRIORITIES BY BUSINESS IMPACT

### Priority 1: CRITICAL (Must have 90%+ coverage)
1. Authentication & JWT validation
2. Member CRUD operations
3. Subscription calculations (50 SAR)
4. Payment processing
5. RBAC permission checks
6. Family tree operations

### Priority 2: HIGH (Target 70%+ coverage)
1. Financial contributions (Diya)
2. Activities & events
3. Document management
4. Family branch management
5. Notifications
6. Arabic/Hijri handling

### Priority 3: MEDIUM (Target 50%+ coverage)
1. Reporting & analytics
2. Audit logging
3. Settings management
4. Competition management
5. Initiative management

---

**This document provides the complete technical context needed for systematic test fixing and coverage expansion.**

For next steps, proceed to: `03_FIX_STRATEGY.md`
