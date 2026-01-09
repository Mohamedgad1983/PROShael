# Al-Shuail Database Migration SQL Scripts

**Generated**: 2025-12-13
**Target**: Self-Hosted PostgreSQL 15 on VPS (213.199.62.185)

---

## Phase 1: VPS PostgreSQL Setup

### 1.1 Install PostgreSQL 15

```bash
# SSH into VPS
ssh root@213.199.62.185

# Update system
apt update && apt upgrade -y

# Install PostgreSQL 15
apt install -y postgresql-15 postgresql-contrib-15

# Start and enable PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Verify installation
psql --version
```

### 1.2 Create Database and User

```bash
# Switch to postgres user
sudo -u postgres psql
```

```sql
-- Create database
CREATE DATABASE alshuail_db
    WITH ENCODING='UTF8'
    LC_COLLATE='en_US.UTF-8'
    LC_CTYPE='en_US.UTF-8'
    TEMPLATE=template0;

-- Create user (replace 'SECURE_PASSWORD' with actual password)
CREATE USER alshuail_admin WITH ENCRYPTED PASSWORD 'SECURE_PASSWORD';

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE alshuail_db TO alshuail_admin;

-- Connect to database
\c alshuail_db

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO alshuail_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO alshuail_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO alshuail_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO alshuail_admin;

\q
```

### 1.3 Configure PostgreSQL Access

```bash
# Edit postgresql.conf
nano /etc/postgresql/15/main/postgresql.conf
```

```ini
# Add/modify these lines:
listen_addresses = 'localhost'  # Only local access (backend connects locally)
port = 5432
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 768MB
maintenance_work_mem = 128MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 4MB
```

```bash
# Edit pg_hba.conf for local access only
nano /etc/postgresql/15/main/pg_hba.conf
```

```ini
# Add this line (backend connects locally via socket):
local   alshuail_db     alshuail_admin                          md5
host    alshuail_db     alshuail_admin     127.0.0.1/32         md5
```

```bash
# Restart PostgreSQL
systemctl restart postgresql
```

---

## Phase 2: Create Extensions and Sequences

### 2.1 Required Extensions

```sql
-- Connect to alshuail_db as alshuail_admin
\c alshuail_db alshuail_admin

-- Create required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

### 2.2 Create Sequences

```sql
-- Payment number sequence
CREATE SEQUENCE IF NOT EXISTS payment_number_seq START 1;

-- Crisis alerts sequence
CREATE SEQUENCE IF NOT EXISTS crisis_alerts_id_seq START 1;

-- Crisis responses sequence
CREATE SEQUENCE IF NOT EXISTS crisis_responses_id_seq START 1;
```

---

## Phase 3: Create Tables (Dependency Order)

### Level 0: Standalone Tables (No Foreign Keys)

```sql
-- 3.0.1 settings
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value JSONB NOT NULL,
    description TEXT,
    category VARCHAR(50),
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.0.2 roles
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name VARCHAR(50) NOT NULL UNIQUE,
    role_name_ar VARCHAR(100),
    description TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.0.3 permissions
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_name VARCHAR(100) NOT NULL UNIQUE,
    permission_name_ar VARCHAR(200),
    description TEXT,
    category VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3.0.4 user_roles
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name VARCHAR(50) NOT NULL UNIQUE,
    role_name_ar VARCHAR(100),
    description TEXT,
    description_ar TEXT,
    permissions JSONB DEFAULT '{}'::jsonb,
    priority INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.0.5 system_settings
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value JSONB,
    description TEXT,
    category VARCHAR(50),
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID
);

-- 3.0.6 main_categories
CREATE TABLE main_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_ar VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),
    description_ar TEXT,
    description_en TEXT,
    icon VARCHAR(50),
    color VARCHAR(7),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3.0.7 document_types
CREATE TABLE document_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    name_ar VARCHAR(200) NOT NULL,
    description TEXT,
    description_ar TEXT,
    is_required BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    requires_expiry BOOLEAN DEFAULT false,
    max_file_size_mb INTEGER DEFAULT 10,
    allowed_extensions TEXT[] DEFAULT ARRAY['pdf', 'jpg', 'jpeg', 'png'],
    category VARCHAR(50),
    display_order INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.0.8 subscription_plans
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_name VARCHAR(100) NOT NULL,
    plan_name_ar VARCHAR(100),
    description TEXT,
    description_ar TEXT,
    amount NUMERIC(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'SAR',
    duration_months INTEGER DEFAULT 12,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.0.9 sms_otp
CREATE TABLE sms_otp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    purpose VARCHAR(50) DEFAULT 'login',
    is_used BOOLEAN DEFAULT false,
    attempts INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3.0.10 audit_logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    user_email VARCHAR(255),
    user_role VARCHAR(50),
    action_type VARCHAR(50) NOT NULL,
    details TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT now()
);

-- 3.0.11 events
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    title_en TEXT,
    description TEXT,
    description_en TEXT,
    event_type TEXT DEFAULT 'general',
    status TEXT DEFAULT 'upcoming',
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    start_date_hijri VARCHAR(20),
    end_date_hijri VARCHAR(20),
    hijri_event_date VARCHAR(50),
    hijri_year INTEGER,
    hijri_month INTEGER,
    hijri_day INTEGER,
    location TEXT,
    venue_details TEXT,
    max_attendees INTEGER,
    current_attendees INTEGER DEFAULT 0,
    registration_required BOOLEAN DEFAULT true,
    registration_deadline TIMESTAMPTZ,
    entry_fee NUMERIC(10,2) DEFAULT 0,
    currency TEXT DEFAULT 'SAR',
    organizer TEXT,
    contact_info TEXT,
    requirements TEXT,
    agenda JSONB DEFAULT '[]'::jsonb,
    speakers JSONB DEFAULT '[]'::jsonb,
    sponsors JSONB DEFAULT '[]'::jsonb,
    media_links JSONB DEFAULT '[]'::jsonb,
    tags JSONB DEFAULT '[]'::jsonb,
    is_featured BOOLEAN DEFAULT false,
    visibility TEXT DEFAULT 'public',
    cover_image_url TEXT,
    gallery_urls TEXT[],
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

-- 3.0.12 occasions
CREATE TABLE occasions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    title_ar VARCHAR(255),
    description TEXT,
    description_ar TEXT,
    occasion_type VARCHAR(50),
    occasion_date DATE,
    occasion_date_hijri VARCHAR(20),
    status VARCHAR(20) DEFAULT 'upcoming',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.0.13 families
CREATE TABLE families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_name TEXT NOT NULL,
    family_code TEXT,
    origin_area TEXT,
    family_tree JSONB,
    total_members INTEGER DEFAULT 0,
    active_members INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    head_member_id UUID,  -- Will add FK later
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.0.14 temp_members (for import/migration)
CREATE TABLE temp_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    full_name_en TEXT,
    phone VARCHAR(20),
    email TEXT,
    membership_number VARCHAR(20),
    membership_status VARCHAR(50) DEFAULT 'active',
    date_of_birth DATE,
    date_of_birth_hijri VARCHAR(20),
    gender VARCHAR(10),
    city VARCHAR(100),
    address TEXT,
    notes TEXT,
    balance NUMERIC(12,2) DEFAULT 0,
    total_paid NUMERIC(12,2) DEFAULT 0,
    payment_2021 NUMERIC(12,2) DEFAULT 0,
    payment_2022 NUMERIC(12,2) DEFAULT 0,
    payment_2023 NUMERIC(12,2) DEFAULT 0,
    payment_2024 NUMERIC(12,2) DEFAULT 0,
    payment_2025 NUMERIC(12,2) DEFAULT 0,
    family_branch VARCHAR(100),
    import_batch VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Level 1: Self-Referencing & Simple Dependencies

```sql
-- 3.1.1 document_categories (self-referencing)
CREATE TABLE document_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_code VARCHAR(50) NOT NULL UNIQUE,
    category_name_ar VARCHAR(100) NOT NULL,
    category_name_en VARCHAR(100),
    parent_category_id UUID REFERENCES document_categories(id),
    icon_name VARCHAR(50),
    color_code VARCHAR(7),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3.1.2 expense_categories (self-referencing)
CREATE TABLE expense_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_code VARCHAR(50) NOT NULL UNIQUE,
    category_name_ar VARCHAR(100) NOT NULL,
    category_name_en VARCHAR(100),
    parent_category_id UUID REFERENCES expense_categories(id),
    icon_name VARCHAR(50),
    color_code VARCHAR(7),
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    is_system BOOLEAN DEFAULT false,
    created_by UUID,  -- Will add FK to users later
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.1.3 sub_categories
CREATE TABLE sub_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    main_category_id UUID NOT NULL REFERENCES main_categories(id),
    name_ar VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),
    description_ar TEXT,
    description_en TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3.1.4 user_role_assignments
CREATE TABLE user_role_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,  -- Will add FK to members later
    role_id UUID NOT NULL REFERENCES user_roles(id),
    assigned_by UUID,
    start_date_gregorian DATE,
    end_date_gregorian DATE,
    start_date_hijri VARCHAR(20),
    end_date_hijri VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Level 2: Users Table (Without member_id FK)

```sql
-- 3.2.1 users (without member_id FK initially)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT,
    phone TEXT NOT NULL UNIQUE,
    role TEXT DEFAULT 'member',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    last_login TIMESTAMPTZ,
    permissions JSONB DEFAULT '[]'::jsonb,
    department TEXT,
    admin_notes TEXT,
    status VARCHAR(20) DEFAULT 'active',
    password_hash TEXT,
    full_name_ar VARCHAR(255),
    full_name_en VARCHAR(255),
    member_id UUID,  -- FK added later after members table
    is_verified BOOLEAN DEFAULT false,
    notification_settings JSONB NOT NULL DEFAULT '{"types": ["system", "security"], "frequency": "instant", "quiet_hours": {"end": "08:00", "start": "22:00", "overnight": true}, "sms_enabled": false, "push_enabled": true, "email_enabled": true}'::jsonb,
    appearance_settings JSONB NOT NULL DEFAULT '{"font_size": "medium", "theme_mode": "auto", "compact_mode": false, "primary_color": "#1976d2", "animations_enabled": true}'::jsonb,
    language_settings JSONB NOT NULL DEFAULT '{"region": "SA", "currency": "SAR", "language": "ar", "timezone": "Asia/Riyadh", "week_start": "saturday", "date_format": "DD/MM/YYYY", "time_format": "12h", "number_format": "western"}'::jsonb
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email);
```

### Level 3: Family Branches (Without member FKs)

```sql
-- 3.3.1 family_branches (without member FKs initially)
CREATE TABLE family_branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_code VARCHAR(50) NOT NULL UNIQUE,
    branch_name VARCHAR(255) NOT NULL,
    branch_name_ar VARCHAR(255),
    branch_name_en VARCHAR(255),
    description_ar TEXT,
    description_en TEXT,
    parent_branch_id UUID REFERENCES family_branches(id),
    branch_head_id UUID,  -- FK to members added later
    established_date DATE,
    established_date_hijri VARCHAR(10),
    primary_location VARCHAR(255),
    country VARCHAR(100),
    member_count INTEGER DEFAULT 0,
    active_member_count INTEGER DEFAULT 0,
    branch_settings JSONB DEFAULT '{}'::jsonb,
    branch_permissions JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    merged_with_branch_id UUID REFERENCES family_branches(id),
    merge_date DATE,
    created_by UUID,  -- FK to members added later
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Level 4: Members (Core Table)

```sql
-- 3.4.1 members
CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    full_name_en TEXT,
    full_name_ar TEXT,
    phone TEXT,
    date_of_birth DATE,
    date_of_birth_hijri VARCHAR(20),
    hijri_birth_date TEXT,
    gender TEXT,
    nationality TEXT,
    city TEXT,
    city_ar VARCHAR(100),
    city_en VARCHAR(100),
    address TEXT,
    address_ar TEXT,
    address_en TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    membership_status TEXT DEFAULT 'active',
    membership_date DATE DEFAULT CURRENT_DATE,
    membership_number VARCHAR(20),
    membership_type TEXT DEFAULT 'regular',
    notes TEXT,
    admin_notes TEXT,
    profile_image_url TEXT,
    occupation VARCHAR(200),
    employer VARCHAR(200),
    joined_date_hijri VARCHAR(20),
    qr_code TEXT,
    membership_card_url TEXT,
    marital_status TEXT,
    password TEXT,
    password_hash VARCHAR(255),
    temp_password VARCHAR(20),
    password_changed BOOLEAN DEFAULT false,
    password_changed_at TIMESTAMP,
    requires_password_change BOOLEAN DEFAULT true,
    role TEXT DEFAULT 'member',
    status TEXT DEFAULT 'pending_verification',
    is_active BOOLEAN DEFAULT true,
    is_first_login BOOLEAN DEFAULT true,
    login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMP,
    last_login TIMESTAMPTZ,
    phone_verified_at TIMESTAMPTZ,
    profile_completed BOOLEAN DEFAULT false,
    profile_completed_at TIMESTAMP,
    face_id_enabled BOOLEAN DEFAULT false,
    additional_info JSONB,
    social_security_beneficiary BOOLEAN,
    whatsapp_number VARCHAR(20),
    national_id VARCHAR(20),
    country VARCHAR(10) DEFAULT 'SA',
    tribal_section VARCHAR(255),
    subscription_type VARCHAR(50) DEFAULT 'monthly',

    -- Balance fields
    total_balance NUMERIC(12,2) DEFAULT 0,
    balance NUMERIC(12,2) DEFAULT 0,
    current_balance NUMERIC(12,2) DEFAULT 0,
    balance_status VARCHAR(50) DEFAULT 'insufficient',
    total_paid NUMERIC(12,2) DEFAULT 0,
    payment_status VARCHAR(50) DEFAULT 'pending',
    is_compliant BOOLEAN DEFAULT false,
    last_payment_date DATE,

    -- Yearly payments
    payment_2021 NUMERIC(12,2) DEFAULT 0,
    payment_2022 NUMERIC(12,2) DEFAULT 0,
    payment_2023 NUMERIC(12,2) DEFAULT 0,
    payment_2024 NUMERIC(12,2) DEFAULT 0,
    payment_2025 NUMERIC(12,2) DEFAULT 0,

    -- Family relationships
    family_id UUID REFERENCES families(id),
    family_branch_id UUID REFERENCES family_branches(id),
    user_id UUID REFERENCES users(id),
    parent_member_id UUID,  -- Self-ref, add constraint later
    spouse_id UUID,  -- Self-ref, add constraint later
    member_id UUID,  -- Legacy field
    generation_level INTEGER DEFAULT 0,
    lineage_path TEXT,

    -- Deceased tracking
    is_deceased BOOLEAN DEFAULT false,
    death_date DATE,
    death_date_hijri VARCHAR(10),

    -- Suspension
    suspended_at TIMESTAMPTZ,
    suspended_by UUID,
    suspension_reason TEXT,
    reactivated_at TIMESTAMPTZ,
    reactivated_by UUID,
    reactivation_notes TEXT,

    -- Audit
    created_by UUID,
    updated_by UUID,
    deleted_by UUID,
    deleted_at TIMESTAMPTZ,
    excel_import_batch VARCHAR(50),

    -- Hijri timestamps
    hijri_created_at TEXT,
    hijri_updated_at TEXT,
    hijri_last_login TEXT,
    hijri_deleted_at TEXT,
    hijri_profile_completed_at VARCHAR(100),

    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Add self-referencing FKs
ALTER TABLE members ADD CONSTRAINT fk_members_parent
    FOREIGN KEY (parent_member_id) REFERENCES members(id);
ALTER TABLE members ADD CONSTRAINT fk_members_spouse
    FOREIGN KEY (spouse_id) REFERENCES members(id);

-- Add indexes
CREATE INDEX idx_members_phone ON members(phone);
CREATE INDEX idx_members_email ON members(email);
CREATE INDEX idx_members_membership_number ON members(membership_number);
CREATE INDEX idx_members_family_branch_id ON members(family_branch_id);
CREATE INDEX idx_members_status ON members(membership_status);
CREATE INDEX idx_members_balance ON members(current_balance);
```

### Level 4.1: Add Circular FKs

```sql
-- Now add the circular FK constraints

-- users.member_id -> members.id
ALTER TABLE users ADD CONSTRAINT fk_users_member
    FOREIGN KEY (member_id) REFERENCES members(id);

-- family_branches.branch_head_id -> members.id
ALTER TABLE family_branches ADD CONSTRAINT fk_family_branches_head
    FOREIGN KEY (branch_head_id) REFERENCES members(id);

-- family_branches.created_by -> members.id
ALTER TABLE family_branches ADD CONSTRAINT fk_family_branches_created_by
    FOREIGN KEY (created_by) REFERENCES members(id);

-- families.head_member_id -> members.id
ALTER TABLE families ADD CONSTRAINT fk_families_head
    FOREIGN KEY (head_member_id) REFERENCES members(id);

-- user_role_assignments.user_id -> members.id (or users.id based on design)
ALTER TABLE user_role_assignments ADD CONSTRAINT fk_user_role_assignments_user
    FOREIGN KEY (user_id) REFERENCES members(id);

-- expense_categories.created_by -> users.id
ALTER TABLE expense_categories ADD CONSTRAINT fk_expense_categories_created_by
    FOREIGN KEY (created_by) REFERENCES users(id);
```

### Level 5: Member-Dependent Tables

```sql
-- 3.5.1 subscriptions
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(id),
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    subscriber_id UUID NOT NULL REFERENCES members(id),
    subscription_id UUID,
    amount NUMERIC(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'SAR',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    hijri_start_date VARCHAR(20),
    hijri_end_date VARCHAR(20),
    status VARCHAR(20) DEFAULT 'pending',
    notes TEXT,
    is_paid_by_another BOOLEAN DEFAULT false,
    total_amount NUMERIC(10,2) DEFAULT 0,
    paid_amount NUMERIC(10,2) DEFAULT 0,
    remaining_amount NUMERIC(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    current_balance NUMERIC(10,2) DEFAULT 0.00,
    months_paid_ahead INTEGER DEFAULT 0,
    next_payment_due DATE,
    last_payment_date DATE,
    last_payment_amount NUMERIC(10,2),
    auto_renew BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_subscriptions_member_id ON subscriptions(member_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- 3.5.2 user_notification_preferences
CREATE TABLE user_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id) UNIQUE,
    email_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    payment_reminders BOOLEAN DEFAULT true,
    event_notifications BOOLEAN DEFAULT true,
    news_notifications BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.5.3 balance_adjustments
CREATE TABLE balance_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(id),
    adjustment_type VARCHAR(50) NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    previous_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
    new_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
    target_year INTEGER,
    target_month INTEGER,
    reason TEXT NOT NULL,
    notes TEXT,
    adjusted_by UUID NOT NULL,
    adjusted_by_email VARCHAR(255),
    adjusted_by_role VARCHAR(50),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.5.4 refresh_tokens
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES members(id),
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    device_info TEXT,
    ip_address INET,
    is_revoked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3.5.5 device_tokens
CREATE TABLE device_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id),
    token TEXT NOT NULL,
    platform VARCHAR(20) NOT NULL,
    device_name VARCHAR(255),
    app_version VARCHAR(50),
    os_version VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(member_id, token)
);

-- 3.5.6 notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    title_ar TEXT,
    message TEXT NOT NULL,
    message_ar TEXT,
    type VARCHAR(50) DEFAULT 'info',
    priority VARCHAR(20) DEFAULT 'normal',
    category VARCHAR(50),
    related_id UUID,
    related_type VARCHAR(50),
    icon VARCHAR(50),
    color VARCHAR(20),
    action_url TEXT,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3.5.7 financial_access_logs
CREATE TABLE financial_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    user_email VARCHAR(255),
    user_role VARCHAR(50),
    action_type VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3.5.8 financial_audit_trail
CREATE TABLE financial_audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    action_type VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    change_reason TEXT,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3.5.9 news_announcements
CREATE TABLE news_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    title_ar TEXT,
    content TEXT NOT NULL,
    content_ar TEXT,
    summary TEXT,
    summary_ar TEXT,
    category VARCHAR(50),
    priority VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(20) DEFAULT 'draft',
    image_url TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    tags TEXT[],
    author_id UUID REFERENCES users(id),
    publish_date TIMESTAMPTZ,
    expiry_date TIMESTAMPTZ,
    view_count INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Level 6: Activities & Related

```sql
-- 3.6.1 activities
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    main_category_id UUID NOT NULL REFERENCES main_categories(id),
    sub_category_id UUID REFERENCES sub_categories(id),
    title_ar VARCHAR(300) NOT NULL,
    title_en VARCHAR(300),
    description_ar TEXT,
    description_en TEXT,
    beneficiary_name_ar VARCHAR(300),
    beneficiary_name_en VARCHAR(300),
    beneficiary_relation_ar VARCHAR(200),
    beneficiary_relation_en VARCHAR(200),
    beneficiary_contact VARCHAR(200),
    beneficiary_notes_ar TEXT,
    beneficiary_notes_en TEXT,
    target_amount NUMERIC(12,2),
    current_amount NUMERIC(12,2) DEFAULT 0,
    min_contribution NUMERIC(10,2) DEFAULT 50.00,
    currency VARCHAR(10) DEFAULT 'SAR',
    collection_start_date DATE,
    collection_end_date DATE,
    collection_deadline DATE,
    event_date DATE,
    event_time TIME,
    event_location_ar VARCHAR(300),
    event_location_en VARCHAR(300),
    max_attendees INTEGER,
    registration_fee NUMERIC(10,2) DEFAULT 0,
    organizer_id UUID NOT NULL REFERENCES temp_members(id),
    financial_manager_id UUID REFERENCES temp_members(id),
    co_organizers UUID[],
    status VARCHAR(30) DEFAULT 'draft',
    collection_status VARCHAR(30) DEFAULT 'pending',
    completion_percentage NUMERIC(5,2) DEFAULT 0,
    show_contributors BOOLEAN DEFAULT true,
    show_amounts BOOLEAN DEFAULT true,
    show_beneficiary BOOLEAN DEFAULT true,
    allow_anonymous_contributions BOOLEAN DEFAULT true,
    requires_registration BOOLEAN DEFAULT false,
    registration_deadline DATE,
    urgency_level INTEGER DEFAULT 3,
    internal_notes TEXT,
    public_notes_ar TEXT,
    public_notes_en TEXT,
    supporting_documents JSONB,
    images TEXT[],
    view_count INTEGER DEFAULT 0,
    contribution_count INTEGER DEFAULT 0,
    contributor_count INTEGER DEFAULT 0,
    category VARCHAR(50),
    activity_type VARCHAR(50),
    hijri_start_date VARCHAR(50),
    hijri_end_date VARCHAR(50),
    hijri_year INTEGER,
    hijri_month INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    published_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- 3.6.2 financial_contributions
CREATE TABLE financial_contributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_id UUID REFERENCES activities(id),
    contributor_id UUID REFERENCES temp_members(id),
    amount NUMERIC(12,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'SAR',
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    payment_date DATE,
    hijri_payment_date VARCHAR(20),
    status VARCHAR(30) DEFAULT 'pending',
    is_anonymous BOOLEAN DEFAULT false,
    notes TEXT,
    receipt_url TEXT,
    verified_by UUID,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_financial_contributions_activity ON financial_contributions(activity_id);
CREATE INDEX idx_financial_contributions_contributor ON financial_contributions(contributor_id);
```

### Level 7: Complex Dependencies

```sql
-- 3.7.1 initiatives
CREATE TABLE initiatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    title_ar VARCHAR(255),
    description TEXT,
    description_ar TEXT,
    initiative_type VARCHAR(50),
    status VARCHAR(30) DEFAULT 'draft',
    financial_target NUMERIC(12,2),
    current_amount NUMERIC(12,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'SAR',
    start_date DATE,
    end_date DATE,
    start_date_hijri VARCHAR(20),
    end_date_hijri VARCHAR(20),
    created_by UUID REFERENCES users(id),
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.7.2 diya_cases
CREATE TABLE diya_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number VARCHAR(20) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    case_type VARCHAR(50) NOT NULL,
    compensation_amount NUMERIC(12,2),
    currency VARCHAR(3) DEFAULT 'SAR',
    status VARCHAR(20) DEFAULT 'reported',
    reported_date_hijri VARCHAR(20) NOT NULL,
    reported_date_gregorian DATE NOT NULL,
    resolution_date_hijri VARCHAR(20),
    resolution_date_gregorian DATE,
    involved_parties JSONB,
    complainant_id UUID REFERENCES members(id),
    defendant_id UUID REFERENCES members(id),
    mediator_id UUID REFERENCES members(id),
    mediator_name VARCHAR(255),
    incident_location TEXT,
    witnesses JSONB,
    evidence_documents JSONB,
    resolution_details TEXT,
    payment_status VARCHAR(20) DEFAULT 'pending',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- 3.7.3 payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID REFERENCES subscriptions(id),
    payment_number VARCHAR(50),
    payer_id UUID REFERENCES members(id),
    beneficiary_id UUID REFERENCES members(id),
    amount NUMERIC(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'SAR',
    payment_method VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending',
    payment_date DATE,
    hijri_payment_date VARCHAR(20),
    hijri_date_string VARCHAR(50),
    hijri_year INTEGER,
    hijri_month INTEGER,
    hijri_day INTEGER,
    hijri_month_name VARCHAR(20),
    processed_date TIMESTAMPTZ,
    bank_transfer_receipt TEXT,
    bank_name VARCHAR(100),
    transfer_reference VARCHAR(100),
    approved_by UUID REFERENCES members(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    notes TEXT,
    notes_ar TEXT,
    notes_en TEXT,
    transaction_fee NUMERIC(10,2) DEFAULT 0.00,
    reference_number VARCHAR(100),
    category VARCHAR(50),
    processed_by UUID REFERENCES users(id),
    import_year INTEGER,
    excel_import_batch VARCHAR(100),
    payment_id UUID,
    months_purchased INTEGER DEFAULT 1,
    receipt_number VARCHAR(100),
    transaction_id VARCHAR(100),
    processing_notes TEXT,
    is_on_behalf BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_payments_payer ON payments(payer_id);
CREATE INDEX idx_payments_beneficiary ON payments(beneficiary_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_date ON payments(payment_date);
```

---

## Phase 4: Create Functions

### 4.1 Core Business Functions

```sql
-- 4.1.1 Generate membership number
CREATE OR REPLACE FUNCTION generate_membership_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
    next_number INTEGER;
    prefix TEXT := 'SH';
BEGIN
    IF NEW.membership_number IS NOT NULL THEN
        RETURN NEW;
    END IF;

    SELECT COALESCE(MAX(CAST(SUBSTRING(membership_number FROM '\d+') AS INTEGER)), 0) + 1
    INTO next_number
    FROM members
    WHERE membership_number LIKE prefix || '%';

    NEW.membership_number = prefix || '-' || LPAD(next_number::TEXT, 4, '0');
    RETURN NEW;
END;
$function$;

-- 4.1.2 Generate payment number
CREATE OR REPLACE FUNCTION generate_payment_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
    next_seq INTEGER;
    year_part TEXT;
    payment_num TEXT;
BEGIN
    SELECT nextval('payment_number_seq') INTO next_seq;
    SELECT EXTRACT(YEAR FROM NOW())::TEXT INTO year_part;
    payment_num := 'SH' || year_part || LPAD(next_seq::TEXT, 4, '0');
    RETURN payment_num;
END;
$function$;

-- 4.1.3 Check subscription expiry
CREATE OR REPLACE FUNCTION check_subscription_expiry()
RETURNS VOID
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    UPDATE subscriptions
    SET status = 'expired',
        updated_at = NOW()
    WHERE status = 'active'
    AND end_date < CURRENT_DATE;
END;
$function$;

-- 4.1.4 Handle updated_at trigger
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

-- 4.1.5 Convert to Hijri (simplified)
CREATE OR REPLACE FUNCTION convert_to_hijri_simple(gregorian_date DATE)
RETURNS TABLE(hijri_year INTEGER, hijri_month INTEGER, hijri_day INTEGER, hijri_month_name TEXT, hijri_string TEXT)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
    month_names TEXT[] := ARRAY[
        'محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر',
        'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
        'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
    ];

    days_diff INT;
    calc_year INT;
    calc_month INT;
    calc_day INT;
BEGIN
    days_diff := gregorian_date - DATE '622-07-16';
    calc_year := GREATEST(FLOOR(days_diff / 354.0) + 1, 1);
    calc_month := GREATEST(LEAST(
        FLOOR((days_diff - (calc_year - 1) * 354) / 29.5) + 1,
        12), 1);
    calc_day := GREATEST(LEAST(
        days_diff - (calc_year - 1) * 354 - (calc_month - 1) * 29 + 1,
        30), 1);

    hijri_year := calc_year;
    hijri_month := calc_month;
    hijri_day := calc_day;
    hijri_month_name := month_names[calc_month];
    hijri_string := calc_day || ' ' || month_names[calc_month] || ' ' || calc_year || ' هـ';

    RETURN NEXT;
END;
$function$;

-- 4.1.6 Get dashboard stats
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS TABLE(
    total_members BIGINT,
    compliant_members BIGINT,
    non_compliant_members BIGINT,
    critical_members BIGINT,
    warning_members BIGINT,
    zero_balance_members BIGINT,
    compliance_rate NUMERIC,
    total_shortfall NUMERIC,
    average_balance NUMERIC
)
LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_members,
        COUNT(*) FILTER (WHERE current_balance >= 3000)::BIGINT as compliant_members,
        COUNT(*) FILTER (WHERE current_balance < 3000)::BIGINT as non_compliant_members,
        COUNT(*) FILTER (WHERE current_balance < 1000)::BIGINT as critical_members,
        COUNT(*) FILTER (WHERE current_balance >= 1000 AND current_balance < 2000)::BIGINT as warning_members,
        COUNT(*) FILTER (WHERE current_balance = 0)::BIGINT as zero_balance_members,
        ROUND((COUNT(*) FILTER (WHERE current_balance >= 3000)::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0)) * 100, 1) as compliance_rate,
        SUM(GREATEST(3000 - current_balance, 0))::NUMERIC as total_shortfall,
        ROUND(AVG(current_balance)::NUMERIC, 2) as average_balance
    FROM members
    WHERE is_active = true AND is_deceased = false;
END;
$function$;

-- 4.1.7 Cleanup expired OTP
CREATE OR REPLACE FUNCTION cleanup_expired_otp()
RETURNS INTEGER
LANGUAGE plpgsql
AS $function$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sms_otp
    WHERE expires_at < NOW() - INTERVAL '1 day'
    AND is_used = false;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$function$;

-- 4.1.8 Get member by phone
CREATE OR REPLACE FUNCTION get_member_by_phone(phone_num TEXT)
RETURNS TABLE(
    id UUID,
    full_name TEXT,
    phone TEXT,
    membership_number TEXT,
    current_balance NUMERIC,
    status TEXT
)
LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        m.id,
        m.full_name,
        m.phone,
        m.membership_number::TEXT,
        m.current_balance,
        m.membership_status
    FROM members m
    WHERE m.phone = phone_num;
END;
$function$;
```

---

## Phase 5: Create Triggers

```sql
-- 5.1 Membership number trigger
CREATE TRIGGER generate_membership_number_trigger
    BEFORE INSERT ON members
    FOR EACH ROW
    EXECUTE FUNCTION generate_membership_number();

-- 5.2 Updated_at triggers
CREATE TRIGGER set_updated_at_members
    BEFORE UPDATE ON members
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at_users
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at_subscriptions
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at_payments
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at_news
    BEFORE UPDATE ON news_announcements
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();
```

---

## Phase 6: Create Materialized Views

```sql
-- 6.1 Member statement view
CREATE MATERIALIZED VIEW member_statement_view AS
SELECT
    m.id,
    m.full_name,
    m.phone,
    m.membership_number,
    m.current_balance,
    CASE
        WHEN m.current_balance >= 3000 THEN 'COMPLIANT'
        WHEN m.current_balance >= 2000 THEN 'WARNING'
        WHEN m.current_balance > 0 THEN 'CRITICAL'
        ELSE 'ZERO_BALANCE'
    END as alert_level,
    CASE
        WHEN m.current_balance >= 3000 THEN '#10B981'
        WHEN m.current_balance >= 2000 THEN '#F59E0B'
        WHEN m.current_balance > 0 THEN '#EF4444'
        ELSE '#6B7280'
    END as status_color,
    GREATEST(3000 - m.current_balance, 0) as shortfall,
    ROUND((m.current_balance / 3000.0 * 100)::NUMERIC, 1) as percentage_complete,
    m.last_payment_date
FROM members m
WHERE m.is_active = true AND m.is_deceased = false;

CREATE UNIQUE INDEX idx_member_statement_view_id ON member_statement_view(id);

-- 6.2 Member balance summary
CREATE MATERIALIZED VIEW member_balance_summary AS
SELECT
    m.id,
    m.full_name,
    m.membership_number,
    m.current_balance as balance,
    m.total_paid,
    (m.current_balance >= 3000) as is_compliant
FROM members m
WHERE m.is_active = true;

CREATE UNIQUE INDEX idx_member_balance_summary_id ON member_balance_summary(id);

-- 6.3 Critical members view
CREATE MATERIALIZED VIEW critical_members_view AS
SELECT
    m.id,
    m.full_name,
    m.phone,
    m.membership_number,
    m.current_balance as balance,
    GREATEST(3000 - m.current_balance, 0) as shortfall,
    CASE
        WHEN m.current_balance = 0 THEN 1
        WHEN m.current_balance < 1000 THEN 2
        ELSE 3
    END as priority_level
FROM members m
WHERE m.is_active = true
AND m.is_deceased = false
AND m.current_balance < 3000;

CREATE UNIQUE INDEX idx_critical_members_view_id ON critical_members_view(id);

-- 6.4 Refresh function
CREATE OR REPLACE FUNCTION refresh_all_views()
RETURNS VOID
LANGUAGE plpgsql
AS $function$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY member_statement_view;
    REFRESH MATERIALIZED VIEW CONCURRENTLY member_balance_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY critical_members_view;
END;
$function$;
```

---

## Phase 7: Data Export Commands (Run on Supabase)

```sql
-- Export each table to CSV for import
-- Run these on Supabase SQL Editor and download results

-- 7.1 Export settings
SELECT * FROM settings;

-- 7.2 Export user_roles
SELECT * FROM user_roles;

-- 7.3 Export family_branches
SELECT * FROM family_branches;

-- 7.4 Export members (main data)
SELECT * FROM members;

-- 7.5 Export subscriptions
SELECT * FROM subscriptions;

-- 7.6 Export financial_contributions
SELECT * FROM financial_contributions;

-- 7.7 Export payments
SELECT * FROM payments;

-- Continue for all tables with data...
```

---

## Phase 8: Data Import Order

```bash
# Import order (respecting dependencies):
# 1. Level 0 tables (no FKs)
# 2. Level 1 tables (self-ref only)
# 3. Users (without member_id)
# 4. Family_branches (without member FKs)
# 5. Members (main table)
# 6. Update circular FKs
# 7. Level 5+ tables
```

---

## Validation Queries

```sql
-- Verify row counts match Supabase
SELECT 'members' as table_name, COUNT(*) as row_count FROM members
UNION ALL
SELECT 'subscriptions', COUNT(*) FROM subscriptions
UNION ALL
SELECT 'financial_contributions', COUNT(*) FROM financial_contributions
UNION ALL
SELECT 'family_branches', COUNT(*) FROM family_branches
UNION ALL
SELECT 'temp_members', COUNT(*) FROM temp_members;

-- Verify FK integrity
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;
```

---

## Rollback Commands

```sql
-- If migration fails, drop all objects
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO alshuail_admin;
```

---

**Next Steps:**
1. User approval of this plan
2. Schedule migration window (recommend Friday evening Saudi time)
3. Create full Supabase backup
4. Execute Phase 1 on VPS
5. Test with sample data before full migration
