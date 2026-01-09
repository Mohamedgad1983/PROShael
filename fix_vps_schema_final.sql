-- COMPREHENSIVE VPS SCHEMA FIX - Match Supabase Schema Exactly
-- Run as postgres superuser

-- Temporarily disable FK constraints
SET session_replication_role = 'replica';

-- ===== user_role_assignments =====
ALTER TABLE user_role_assignments ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE user_role_assignments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE user_role_assignments ADD COLUMN IF NOT EXISTS notes TEXT;

-- ===== system_settings - drop and recreate =====
ALTER TABLE system_settings ALTER COLUMN setting_key DROP NOT NULL;

-- ===== sub_categories =====
ALTER TABLE sub_categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE sub_categories ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;
ALTER TABLE sub_categories ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE sub_categories ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- ===== document_types - fix JSON array storage =====
ALTER TABLE document_types DROP COLUMN IF EXISTS allowed_extensions;
ALTER TABLE document_types ADD COLUMN allowed_extensions JSONB;

-- ===== initiatives - add all columns from Supabase =====
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS title_en TEXT;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS description_en TEXT;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS budget NUMERIC;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS spent_amount NUMERIC DEFAULT 0;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS progress NUMERIC DEFAULT 0;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS attachments JSONB;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS tags JSONB;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public';
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';

-- ===== activities - add all columns from Supabase =====
ALTER TABLE activities ADD COLUMN IF NOT EXISTS title_en TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS description_en TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS activity_number TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS category_id UUID;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS collected_amount NUMERIC DEFAULT 0;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'SAR';
ALTER TABLE activities ADD COLUMN IF NOT EXISTS beneficiary_details JSONB;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS reason_ar TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS reason_en TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS contributors_count INTEGER DEFAULT 0;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS min_contribution NUMERIC;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS max_contribution NUMERIC;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS progress_percentage NUMERIC DEFAULT 0;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
ALTER TABLE activities ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public';
ALTER TABLE activities ADD COLUMN IF NOT EXISTS show_contributors BOOLEAN DEFAULT true;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS show_amounts BOOLEAN DEFAULT true;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS allow_anonymous BOOLEAN DEFAULT true;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS attachment_urls JSONB;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS tags JSONB;

-- ===== notifications - add missing columns =====
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_type TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS color TEXT;

-- ===== payments - add missing columns =====
ALTER TABLE payments ADD COLUMN IF NOT EXISTS processed_date DATE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payer_name TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payer_phone TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS subscription_year INTEGER;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS months_covered JSONB;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS transfer_reference TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- ===== balance_adjustments - fix constraints and add columns =====
ALTER TABLE balance_adjustments ALTER COLUMN adjustment_amount DROP NOT NULL;
ALTER TABLE balance_adjustments ADD COLUMN IF NOT EXISTS amount NUMERIC;
ALTER TABLE balance_adjustments ADD COLUMN IF NOT EXISTS target_year INTEGER;
ALTER TABLE balance_adjustments ADD COLUMN IF NOT EXISTS target_month INTEGER;
ALTER TABLE balance_adjustments ADD COLUMN IF NOT EXISTS adjusted_by_email TEXT;
ALTER TABLE balance_adjustments ADD COLUMN IF NOT EXISTS adjusted_by_role TEXT;
ALTER TABLE balance_adjustments ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE balance_adjustments ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE balance_adjustments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- ===== financial_contributions - fix constraints =====
ALTER TABLE financial_contributions ALTER COLUMN amount DROP NOT NULL;
ALTER TABLE financial_contributions ADD COLUMN IF NOT EXISTS contribution_amount NUMERIC;
ALTER TABLE financial_contributions ADD COLUMN IF NOT EXISTS contributor_id UUID;
ALTER TABLE financial_contributions ADD COLUMN IF NOT EXISTS contributed_by UUID;
ALTER TABLE financial_contributions ADD COLUMN IF NOT EXISTS contribution_date DATE;
ALTER TABLE financial_contributions ADD COLUMN IF NOT EXISTS hijri_date TEXT;
ALTER TABLE financial_contributions ADD COLUMN IF NOT EXISTS payment_receipt TEXT;
ALTER TABLE financial_contributions ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE financial_contributions ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE financial_contributions ADD COLUMN IF NOT EXISTS rejection_reason_ar TEXT;
ALTER TABLE financial_contributions ADD COLUMN IF NOT EXISTS rejection_reason_en TEXT;
ALTER TABLE financial_contributions ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;
ALTER TABLE financial_contributions ADD COLUMN IF NOT EXISTS show_amount BOOLEAN DEFAULT true;
ALTER TABLE financial_contributions ADD COLUMN IF NOT EXISTS public_message_ar TEXT;
ALTER TABLE financial_contributions ADD COLUMN IF NOT EXISTS public_message_en TEXT;
ALTER TABLE financial_contributions ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE financial_contributions ADD COLUMN IF NOT EXISTS contributor_notes TEXT;
ALTER TABLE financial_contributions ADD COLUMN IF NOT EXISTS hijri_date_string TEXT;
ALTER TABLE financial_contributions ADD COLUMN IF NOT EXISTS hijri_day INTEGER;
ALTER TABLE financial_contributions ADD COLUMN IF NOT EXISTS hijri_month_name TEXT;

-- ===== device_tokens =====
ALTER TABLE device_tokens ADD COLUMN IF NOT EXISTS platform TEXT;
ALTER TABLE device_tokens ADD COLUMN IF NOT EXISTS app_version TEXT;
ALTER TABLE device_tokens ADD COLUMN IF NOT EXISTS os_version TEXT;
ALTER TABLE device_tokens ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP;

-- ===== documents_metadata =====
ALTER TABLE documents_metadata ADD COLUMN IF NOT EXISTS uploaded_by UUID;
ALTER TABLE documents_metadata ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE documents_metadata ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE documents_metadata ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE documents_metadata ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- ===== notification_logs =====
ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS body TEXT;
ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS data JSONB;
ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS is_broadcast BOOLEAN DEFAULT false;
ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS success_count INTEGER DEFAULT 0;
ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS failure_count INTEGER DEFAULT 0;

-- ===== Drop problematic FK constraints =====
ALTER TABLE financial_contributions DROP CONSTRAINT IF EXISTS financial_contributions_activity_id_fkey;
ALTER TABLE refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_user_id_fkey;
ALTER TABLE documents_metadata DROP CONSTRAINT IF EXISTS documents_metadata_member_id_fkey;

-- ===== audit_logs - fix constraints =====
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_role TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS action_type TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Re-enable FK constraints
SET session_replication_role = 'origin';

SELECT 'Final schema fix completed!' as result;
