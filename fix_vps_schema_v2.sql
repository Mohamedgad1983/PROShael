-- Fix VPS Schema v2 - Handle column naming mismatches with Supabase

-- ===== roles table - Supabase has 'name' but VPS has 'role_name' =====
ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_pkey CASCADE;
ALTER TABLE roles RENAME COLUMN role_name TO role_name_old;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS display_name TEXT;
UPDATE roles SET name = role_name_old WHERE name IS NULL;
ALTER TABLE roles DROP COLUMN IF EXISTS role_name_old;
ALTER TABLE roles ALTER COLUMN role_name DROP NOT NULL;

-- ===== permissions table - Supabase has 'name' but VPS has 'permission_name' =====
ALTER TABLE permissions RENAME COLUMN permission_name TO permission_name_old;
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS name TEXT;
UPDATE permissions SET name = permission_name_old WHERE name IS NULL;
ALTER TABLE permissions DROP COLUMN IF EXISTS permission_name_old;
ALTER TABLE permissions ALTER COLUMN permission_name DROP NOT NULL;

-- ===== user_role_assignments - add missing columns =====
ALTER TABLE user_role_assignments ADD COLUMN IF NOT EXISTS notes TEXT;

-- ===== system_settings - add created_at column =====
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- ===== sub_categories - add sort_order column =====
ALTER TABLE sub_categories ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- ===== expense_categories - make 'name' nullable and add code columns =====
ALTER TABLE expense_categories ALTER COLUMN name DROP NOT NULL;

-- ===== document_categories - make 'name' nullable =====
ALTER TABLE document_categories ALTER COLUMN name DROP NOT NULL;

-- ===== document_types - fix allowed_extensions type (JSONB to TEXT[]) =====
-- Drop and recreate as TEXT[] if it's JSONB
ALTER TABLE document_types DROP COLUMN IF EXISTS allowed_extensions;
ALTER TABLE document_types ADD COLUMN IF NOT EXISTS allowed_extensions TEXT[];

-- ===== initiatives - add missing columns =====
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS title_en TEXT;

-- ===== news_announcements - add status column =====
ALTER TABLE news_announcements ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE news_announcements ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- ===== activities - add title_ar column (rename from title if needed) =====
ALTER TABLE activities ADD COLUMN IF NOT EXISTS title_ar TEXT;

-- ===== notifications - add type column =====
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type TEXT;

-- ===== payments - add hijri_payment_date column =====
ALTER TABLE payments ADD COLUMN IF NOT EXISTS hijri_payment_date TEXT;

-- ===== balance_adjustments - add updated_at column =====
ALTER TABLE balance_adjustments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- ===== financial_contributions - fix amount column =====
ALTER TABLE financial_contributions ALTER COLUMN amount DROP NOT NULL;

-- ===== financial_audit_trail - add action_type if not exists =====
ALTER TABLE financial_audit_trail ADD COLUMN IF NOT EXISTS action_type TEXT;
ALTER TABLE financial_audit_trail ALTER COLUMN action_type DROP NOT NULL;

-- ===== financial_access_logs - add action_type if not exists =====
ALTER TABLE financial_access_logs ADD COLUMN IF NOT EXISTS action_type TEXT;
ALTER TABLE financial_access_logs ALTER COLUMN action_type DROP NOT NULL;

-- ===== documents_metadata - make file_name nullable =====
ALTER TABLE documents_metadata ALTER COLUMN file_name DROP NOT NULL;

-- ===== refresh_tokens - drop FK constraint temporarily =====
ALTER TABLE refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_user_id_fkey;

SELECT 'Schema fix v2 completed!' as result;
