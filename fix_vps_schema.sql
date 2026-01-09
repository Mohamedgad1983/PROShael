-- Fix VPS Schema to Match Supabase
-- Add all missing columns for data import

-- ===== roles table =====
ALTER TABLE roles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS display_name TEXT;

-- ===== permissions table =====
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS module TEXT;

-- ===== user_role_assignments table =====
ALTER TABLE user_role_assignments ADD COLUMN IF NOT EXISTS start_date_gregorian DATE;
ALTER TABLE user_role_assignments ADD COLUMN IF NOT EXISTS end_date_gregorian DATE;
ALTER TABLE user_role_assignments ADD COLUMN IF NOT EXISTS start_date_hijri TEXT;
ALTER TABLE user_role_assignments ADD COLUMN IF NOT EXISTS end_date_hijri TEXT;
ALTER TABLE user_role_assignments ADD COLUMN IF NOT EXISTS updated_by UUID;

-- ===== system_settings table =====
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS system_name TEXT;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS default_language TEXT DEFAULT 'ar';
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS hijri_calendar_primary BOOLEAN DEFAULT true;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS session_timeout INTEGER DEFAULT 1440;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS max_login_attempts INTEGER DEFAULT 5;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS password_requirements JSONB;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS backup_settings JSONB;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS security_settings JSONB;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS system_version TEXT;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS max_upload_size_mb INTEGER DEFAULT 10;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS enable_notifications BOOLEAN DEFAULT true;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS maintenance_mode BOOLEAN DEFAULT false;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS debug_mode BOOLEAN DEFAULT false;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS api_url TEXT;

-- ===== sub_categories table =====
ALTER TABLE sub_categories ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE sub_categories ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE sub_categories ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE sub_categories ADD COLUMN IF NOT EXISTS purpose_ar TEXT;
ALTER TABLE sub_categories ADD COLUMN IF NOT EXISTS purpose_en TEXT;
ALTER TABLE sub_categories ADD COLUMN IF NOT EXISTS default_target_amount NUMERIC;
ALTER TABLE sub_categories ADD COLUMN IF NOT EXISTS min_target_amount NUMERIC;
ALTER TABLE sub_categories ADD COLUMN IF NOT EXISTS max_target_amount NUMERIC;
ALTER TABLE sub_categories ADD COLUMN IF NOT EXISTS default_min_contribution NUMERIC;
ALTER TABLE sub_categories ADD COLUMN IF NOT EXISTS collection_period_days INTEGER;
ALTER TABLE sub_categories ADD COLUMN IF NOT EXISTS allows_excess_collection BOOLEAN DEFAULT false;
ALTER TABLE sub_categories ADD COLUMN IF NOT EXISTS auto_close_when_complete BOOLEAN DEFAULT false;
ALTER TABLE sub_categories ADD COLUMN IF NOT EXISTS show_contributors BOOLEAN DEFAULT true;
ALTER TABLE sub_categories ADD COLUMN IF NOT EXISTS show_beneficiary BOOLEAN DEFAULT true;
ALTER TABLE sub_categories ADD COLUMN IF NOT EXISTS show_progress BOOLEAN DEFAULT true;
ALTER TABLE sub_categories ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;
ALTER TABLE sub_categories ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- ===== expense_categories table =====
ALTER TABLE expense_categories ADD COLUMN IF NOT EXISTS category_code TEXT;
ALTER TABLE expense_categories ADD COLUMN IF NOT EXISTS category_name_ar TEXT;
ALTER TABLE expense_categories ADD COLUMN IF NOT EXISTS category_name_en TEXT;
ALTER TABLE expense_categories ADD COLUMN IF NOT EXISTS parent_category_id UUID;
ALTER TABLE expense_categories ADD COLUMN IF NOT EXISTS icon_name TEXT;
ALTER TABLE expense_categories ADD COLUMN IF NOT EXISTS color_code TEXT;
ALTER TABLE expense_categories ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE expense_categories ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;

-- ===== document_categories table =====
ALTER TABLE document_categories ADD COLUMN IF NOT EXISTS category_code TEXT;
ALTER TABLE document_categories ADD COLUMN IF NOT EXISTS category_name_ar TEXT;
ALTER TABLE document_categories ADD COLUMN IF NOT EXISTS category_name_en TEXT;
ALTER TABLE document_categories ADD COLUMN IF NOT EXISTS parent_category_id UUID;
ALTER TABLE document_categories ADD COLUMN IF NOT EXISTS icon_name TEXT;
ALTER TABLE document_categories ADD COLUMN IF NOT EXISTS color_code TEXT;
ALTER TABLE document_categories ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- ===== document_types table =====
ALTER TABLE document_types ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE document_types ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE document_types ADD COLUMN IF NOT EXISTS name_ar TEXT;
ALTER TABLE document_types ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE document_types ADD COLUMN IF NOT EXISTS description_ar TEXT;
ALTER TABLE document_types ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT false;
ALTER TABLE document_types ADD COLUMN IF NOT EXISTS requires_expiry BOOLEAN DEFAULT false;
ALTER TABLE document_types ADD COLUMN IF NOT EXISTS max_file_size_mb INTEGER DEFAULT 10;
ALTER TABLE document_types ADD COLUMN IF NOT EXISTS allowed_extensions JSONB;
ALTER TABLE document_types ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE document_types ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
ALTER TABLE document_types ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- ===== subscription_plans table =====
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS name_ar TEXT;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS name_en TEXT;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS base_amount NUMERIC;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'SAR';
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS duration_months INTEGER DEFAULT 12;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS description_ar TEXT;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS description_en TEXT;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS plan_name_ar TEXT;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS plan_name_en TEXT;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS amount NUMERIC;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly';

-- ===== subscriptions table =====
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS plan_id UUID;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS subscriber_id UUID;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS amount NUMERIC;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'SAR';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS hijri_start_date TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS hijri_end_date TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS is_paid_by_another BOOLEAN DEFAULT false;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS subscription_id UUID;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS current_balance NUMERIC DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS months_paid_ahead INTEGER DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS next_payment_due DATE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS last_payment_date DATE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS last_payment_amount NUMERIC;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true;

-- ===== initiatives table =====
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS initiative_number TEXT;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS name_ar TEXT;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS name_en TEXT;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS description_ar TEXT;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS description_en TEXT;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS category_id UUID;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS sub_category_id UUID;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS target_amount NUMERIC;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS collected_amount NUMERIC DEFAULT 0;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'SAR';
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS start_date_hijri TEXT;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS end_date_hijri TEXT;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS beneficiary_id UUID;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS beneficiary_name TEXT;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS beneficiary_details JSONB;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS reason_ar TEXT;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS reason_en TEXT;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS contributors_count INTEGER DEFAULT 0;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS min_contribution NUMERIC;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS max_contribution NUMERIC;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS progress_percentage NUMERIC DEFAULT 0;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public';
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS show_contributors BOOLEAN DEFAULT true;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS show_amounts BOOLEAN DEFAULT true;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS allow_anonymous BOOLEAN DEFAULT true;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS attachment_urls JSONB;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS tags JSONB;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS created_by UUID;

-- ===== diya_cases table =====
ALTER TABLE diya_cases ADD COLUMN IF NOT EXISTS case_number TEXT;
ALTER TABLE diya_cases ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE diya_cases ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE diya_cases ADD COLUMN IF NOT EXISTS case_type TEXT;
ALTER TABLE diya_cases ADD COLUMN IF NOT EXISTS compensation_amount NUMERIC;
ALTER TABLE diya_cases ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'SAR';
ALTER TABLE diya_cases ADD COLUMN IF NOT EXISTS reported_date_hijri TEXT;
ALTER TABLE diya_cases ADD COLUMN IF NOT EXISTS reported_date_gregorian DATE;
ALTER TABLE diya_cases ADD COLUMN IF NOT EXISTS resolution_date_hijri TEXT;
ALTER TABLE diya_cases ADD COLUMN IF NOT EXISTS resolution_date_gregorian DATE;
ALTER TABLE diya_cases ADD COLUMN IF NOT EXISTS involved_parties JSONB;
ALTER TABLE diya_cases ADD COLUMN IF NOT EXISTS complainant_id UUID;
ALTER TABLE diya_cases ADD COLUMN IF NOT EXISTS defendant_id UUID;
ALTER TABLE diya_cases ADD COLUMN IF NOT EXISTS mediator_id UUID;
ALTER TABLE diya_cases ADD COLUMN IF NOT EXISTS mediator_name TEXT;
ALTER TABLE diya_cases ADD COLUMN IF NOT EXISTS incident_location TEXT;
ALTER TABLE diya_cases ADD COLUMN IF NOT EXISTS witnesses JSONB;
ALTER TABLE diya_cases ADD COLUMN IF NOT EXISTS evidence_documents JSONB;
ALTER TABLE diya_cases ADD COLUMN IF NOT EXISTS resolution_details TEXT;
ALTER TABLE diya_cases ADD COLUMN IF NOT EXISTS payment_status TEXT;
ALTER TABLE diya_cases ADD COLUMN IF NOT EXISTS created_by UUID;

-- ===== events table =====
ALTER TABLE events ADD COLUMN IF NOT EXISTS title_en TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS description_en TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_type TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS venue_details JSONB;
ALTER TABLE events ADD COLUMN IF NOT EXISTS max_attendees INTEGER;
ALTER TABLE events ADD COLUMN IF NOT EXISTS current_attendees INTEGER DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS registration_required BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS registration_deadline TIMESTAMP;
ALTER TABLE events ADD COLUMN IF NOT EXISTS entry_fee NUMERIC;
ALTER TABLE events ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'SAR';
ALTER TABLE events ADD COLUMN IF NOT EXISTS organizer TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS contact_info JSONB;
ALTER TABLE events ADD COLUMN IF NOT EXISTS requirements JSONB;
ALTER TABLE events ADD COLUMN IF NOT EXISTS agenda JSONB;
ALTER TABLE events ADD COLUMN IF NOT EXISTS speakers JSONB;
ALTER TABLE events ADD COLUMN IF NOT EXISTS sponsors JSONB;
ALTER TABLE events ADD COLUMN IF NOT EXISTS media_links JSONB;
ALTER TABLE events ADD COLUMN IF NOT EXISTS tags JSONB;
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public';
ALTER TABLE events ADD COLUMN IF NOT EXISTS start_date_hijri TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS end_date_hijri TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS gallery_urls JSONB;
ALTER TABLE events ADD COLUMN IF NOT EXISTS hijri_event_date TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS hijri_year INTEGER;
ALTER TABLE events ADD COLUMN IF NOT EXISTS hijri_month INTEGER;
ALTER TABLE events ADD COLUMN IF NOT EXISTS hijri_day INTEGER;

-- ===== news_announcements table =====
ALTER TABLE news_announcements ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE news_announcements ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE news_announcements ADD COLUMN IF NOT EXISTS author_id UUID;
ALTER TABLE news_announcements ADD COLUMN IF NOT EXISTS publish_date TIMESTAMP;
ALTER TABLE news_announcements ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMP;
ALTER TABLE news_announcements ADD COLUMN IF NOT EXISTS target_audience TEXT;
ALTER TABLE news_announcements ADD COLUMN IF NOT EXISTS target_families JSONB;
ALTER TABLE news_announcements ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';
ALTER TABLE news_announcements ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE news_announcements ADD COLUMN IF NOT EXISTS attachments JSONB;
ALTER TABLE news_announcements ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE news_announcements ADD COLUMN IF NOT EXISTS title_ar TEXT;
ALTER TABLE news_announcements ADD COLUMN IF NOT EXISTS title_en TEXT;
ALTER TABLE news_announcements ADD COLUMN IF NOT EXISTS content_ar TEXT;
ALTER TABLE news_announcements ADD COLUMN IF NOT EXISTS content_en TEXT;
ALTER TABLE news_announcements ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT false;
ALTER TABLE news_announcements ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMP;
ALTER TABLE news_announcements ADD COLUMN IF NOT EXISTS notification_count INTEGER DEFAULT 0;
ALTER TABLE news_announcements ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;
ALTER TABLE news_announcements ADD COLUMN IF NOT EXISTS media_urls JSONB;
ALTER TABLE news_announcements ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMP;

-- ===== activities table =====
ALTER TABLE activities ADD COLUMN IF NOT EXISTS activity_number TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS name_ar TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS name_en TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS description_ar TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS description_en TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS category_id UUID;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS sub_category_id UUID;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS target_amount NUMERIC;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS collected_amount NUMERIC DEFAULT 0;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'SAR';
ALTER TABLE activities ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS start_date_hijri TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS end_date_hijri TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS beneficiary_id UUID;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS beneficiary_name TEXT;
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
ALTER TABLE activities ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS attachment_urls JSONB;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS tags JSONB;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS created_by UUID;

-- ===== notifications table =====
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title_ar TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message_ar TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- ===== payments table =====
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_number TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payer_name TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payer_phone TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_type TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS subscription_year INTEGER;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS months_covered JSONB;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'SAR';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_date DATE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS hijri_date TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_number TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS bank_account TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS transfer_reference TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS verified_by UUID;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- ===== balance_adjustments table =====
ALTER TABLE balance_adjustments ADD COLUMN IF NOT EXISTS adjustment_type TEXT;
ALTER TABLE balance_adjustments ADD COLUMN IF NOT EXISTS amount NUMERIC;
ALTER TABLE balance_adjustments ADD COLUMN IF NOT EXISTS previous_balance NUMERIC;
ALTER TABLE balance_adjustments ADD COLUMN IF NOT EXISTS new_balance NUMERIC;
ALTER TABLE balance_adjustments ADD COLUMN IF NOT EXISTS target_year INTEGER;
ALTER TABLE balance_adjustments ADD COLUMN IF NOT EXISTS target_month INTEGER;
ALTER TABLE balance_adjustments ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE balance_adjustments ADD COLUMN IF NOT EXISTS adjusted_by_email TEXT;
ALTER TABLE balance_adjustments ADD COLUMN IF NOT EXISTS adjusted_by_role TEXT;
ALTER TABLE balance_adjustments ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE balance_adjustments ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- ===== user_notification_preferences table =====
ALTER TABLE user_notification_preferences ADD COLUMN IF NOT EXISTS enable_push BOOLEAN DEFAULT true;
ALTER TABLE user_notification_preferences ADD COLUMN IF NOT EXISTS enable_whatsapp BOOLEAN DEFAULT true;
ALTER TABLE user_notification_preferences ADD COLUMN IF NOT EXISTS enable_email BOOLEAN DEFAULT true;
ALTER TABLE user_notification_preferences ADD COLUMN IF NOT EXISTS event_invitations BOOLEAN DEFAULT true;
ALTER TABLE user_notification_preferences ADD COLUMN IF NOT EXISTS payment_reminders BOOLEAN DEFAULT true;
ALTER TABLE user_notification_preferences ADD COLUMN IF NOT EXISTS payment_receipts BOOLEAN DEFAULT true;
ALTER TABLE user_notification_preferences ADD COLUMN IF NOT EXISTS crisis_alerts BOOLEAN DEFAULT true;
ALTER TABLE user_notification_preferences ADD COLUMN IF NOT EXISTS general_announcements BOOLEAN DEFAULT true;
ALTER TABLE user_notification_preferences ADD COLUMN IF NOT EXISTS rsvp_confirmations BOOLEAN DEFAULT true;
ALTER TABLE user_notification_preferences ADD COLUMN IF NOT EXISTS quiet_hours_start TIME;
ALTER TABLE user_notification_preferences ADD COLUMN IF NOT EXISTS quiet_hours_end TIME;
ALTER TABLE user_notification_preferences ADD COLUMN IF NOT EXISTS quiet_hours_enabled BOOLEAN DEFAULT false;
ALTER TABLE user_notification_preferences ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'ar';

-- ===== financial_contributions table =====
ALTER TABLE financial_contributions ADD COLUMN IF NOT EXISTS activity_id UUID;
ALTER TABLE financial_contributions ADD COLUMN IF NOT EXISTS contributor_id UUID;
ALTER TABLE financial_contributions ADD COLUMN IF NOT EXISTS contributed_by UUID;
ALTER TABLE financial_contributions ADD COLUMN IF NOT EXISTS contribution_amount NUMERIC;
ALTER TABLE financial_contributions ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'SAR';
ALTER TABLE financial_contributions ADD COLUMN IF NOT EXISTS contribution_date DATE;
ALTER TABLE financial_contributions ADD COLUMN IF NOT EXISTS hijri_date TEXT;
ALTER TABLE financial_contributions ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE financial_contributions ADD COLUMN IF NOT EXISTS payment_reference TEXT;
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
ALTER TABLE financial_contributions ADD COLUMN IF NOT EXISTS hijri_year INTEGER;
ALTER TABLE financial_contributions ADD COLUMN IF NOT EXISTS hijri_month INTEGER;
ALTER TABLE financial_contributions ADD COLUMN IF NOT EXISTS hijri_day INTEGER;
ALTER TABLE financial_contributions ADD COLUMN IF NOT EXISTS hijri_month_name TEXT;

-- ===== financial_audit_trail table =====
ALTER TABLE financial_audit_trail ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE financial_audit_trail ADD COLUMN IF NOT EXISTS operation TEXT;
ALTER TABLE financial_audit_trail ADD COLUMN IF NOT EXISTS resource_type TEXT;
ALTER TABLE financial_audit_trail ADD COLUMN IF NOT EXISTS resource_id UUID;
ALTER TABLE financial_audit_trail ADD COLUMN IF NOT EXISTS previous_value JSONB;
ALTER TABLE financial_audit_trail ADD COLUMN IF NOT EXISTS new_value JSONB;
ALTER TABLE financial_audit_trail ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE financial_audit_trail ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- ===== financial_access_logs table =====
ALTER TABLE financial_access_logs ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE financial_access_logs ADD COLUMN IF NOT EXISTS access_result TEXT;
ALTER TABLE financial_access_logs ADD COLUMN IF NOT EXISTS operation TEXT;
ALTER TABLE financial_access_logs ADD COLUMN IF NOT EXISTS user_role TEXT;
ALTER TABLE financial_access_logs ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE financial_access_logs ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP;
ALTER TABLE financial_access_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- ===== device_tokens table =====
ALTER TABLE device_tokens ADD COLUMN IF NOT EXISTS token TEXT;
ALTER TABLE device_tokens ADD COLUMN IF NOT EXISTS platform TEXT;
ALTER TABLE device_tokens ADD COLUMN IF NOT EXISTS device_name TEXT;
ALTER TABLE device_tokens ADD COLUMN IF NOT EXISTS app_version TEXT;
ALTER TABLE device_tokens ADD COLUMN IF NOT EXISTS os_version TEXT;
ALTER TABLE device_tokens ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP;

-- ===== documents_metadata table =====
ALTER TABLE documents_metadata ADD COLUMN IF NOT EXISTS uploaded_by UUID;
ALTER TABLE documents_metadata ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE documents_metadata ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE documents_metadata ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE documents_metadata ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE documents_metadata ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE documents_metadata ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE documents_metadata ADD COLUMN IF NOT EXISTS original_name TEXT;
ALTER TABLE documents_metadata ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- ===== notification_logs table =====
ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS body TEXT;
ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS data JSONB;
ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS is_broadcast BOOLEAN DEFAULT false;
ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS success_count INTEGER DEFAULT 0;
ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS failure_count INTEGER DEFAULT 0;
ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP;

-- ===== Create expenses table if not exists =====
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_category TEXT,
    title_ar TEXT,
    title_en TEXT,
    description_ar TEXT,
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'SAR',
    expense_date DATE,
    paid_to TEXT,
    paid_by UUID,
    payment_method TEXT,
    receipt_number TEXT,
    status TEXT DEFAULT 'pending',
    approval_required BOOLEAN DEFAULT true,
    approved_by UUID,
    approved_at TIMESTAMP,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    hijri_date_string TEXT,
    hijri_year INTEGER,
    hijri_month INTEGER,
    hijri_day INTEGER,
    hijri_month_name TEXT
);

-- Grant permissions on expenses table
GRANT ALL ON expenses TO alshuail;

SELECT 'Schema fix completed successfully!' as result;
