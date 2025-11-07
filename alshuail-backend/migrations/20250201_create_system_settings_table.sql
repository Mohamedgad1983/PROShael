-- =====================================================
-- Al-Shuail System Settings Table
-- Migration Script for Supabase
-- Date: 2025-02-01
-- =====================================================
--
-- Purpose:
-- 1. Create system_settings table for persistent configuration
-- 2. Add user_preferences table for role-based customization
-- 3. Initialize default system settings
--
-- This script is SAFE TO RUN MULTIPLE TIMES (idempotent)
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Create system_settings Table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_name VARCHAR(200) DEFAULT 'نظام إدارة عائلة الشعيل',
  system_version VARCHAR(20) DEFAULT '2.0.1',
  default_language VARCHAR(5) DEFAULT 'ar',
  hijri_calendar_primary BOOLEAN DEFAULT true,

  -- Session & Security
  session_timeout INTEGER DEFAULT 1440, -- minutes
  max_login_attempts INTEGER DEFAULT 5,
  password_requirements JSONB DEFAULT '{
    "min_length": 8,
    "require_uppercase": true,
    "require_numbers": true,
    "require_special_chars": true
  }'::jsonb,

  -- Backup Settings
  backup_settings JSONB DEFAULT '{
    "auto_backup": true,
    "backup_frequency": "daily",
    "retention_days": 30
  }'::jsonb,

  -- Security Settings
  security_settings JSONB DEFAULT '{
    "two_factor_required": false,
    "ip_whitelisting": false,
    "audit_logging": true
  }'::jsonb,

  -- System Configuration
  max_upload_size_mb INTEGER DEFAULT 10,
  enable_notifications BOOLEAN DEFAULT true,
  maintenance_mode BOOLEAN DEFAULT false,
  debug_mode BOOLEAN DEFAULT false,

  -- API Configuration
  api_url VARCHAR(500),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES members(id)
);

COMMENT ON TABLE public.system_settings IS 'Global system configuration and settings';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_updated_at ON public.system_settings(updated_at DESC);

-- =====================================================
-- STEP 2: Create user_preferences Table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,

  -- Dashboard Widgets
  dashboard_widgets JSONB DEFAULT '[]'::jsonb,

  -- Notification Preferences
  notifications JSONB DEFAULT '[]'::jsonb,

  -- Theme & Display
  theme VARCHAR(20) DEFAULT 'dark',
  language VARCHAR(5) DEFAULT 'ar',

  -- Custom Preferences
  custom_settings JSONB DEFAULT '{}'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, role)
);

COMMENT ON TABLE public.user_preferences IS 'User-specific preferences and customization';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_role ON public.user_preferences(role);

-- =====================================================
-- STEP 3: Row Level Security (RLS)
-- =====================================================

-- Enable RLS on system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Super admins can view system settings
CREATE POLICY "Super admins can view system settings"
  ON public.system_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = auth.uid()
      AND members.role = 'super_admin'
    )
  );

-- Policy: Super admins can update system settings
CREATE POLICY "Super admins can update system settings"
  ON public.system_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = auth.uid()
      AND members.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = auth.uid()
      AND members.role = 'super_admin'
    )
  );

-- Policy: Super admins can insert system settings
CREATE POLICY "Super admins can insert system settings"
  ON public.system_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = auth.uid()
      AND members.role = 'super_admin'
    )
  );

-- Enable RLS on user_preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own preferences
CREATE POLICY "Users can view own preferences"
  ON public.user_preferences
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy: Users can update their own preferences
CREATE POLICY "Users can update own preferences"
  ON public.user_preferences
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can insert their own preferences
CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- STEP 4: Insert Default System Settings
-- =====================================================

INSERT INTO public.system_settings (
  system_name,
  system_version,
  default_language,
  hijri_calendar_primary,
  session_timeout,
  max_login_attempts,
  max_upload_size_mb,
  enable_notifications,
  maintenance_mode,
  debug_mode
)
SELECT
  'نظام إدارة عائلة الشعيل',
  '2.0.1',
  'ar',
  true,
  1440,
  5,
  10,
  true,
  false,
  false
WHERE NOT EXISTS (SELECT 1 FROM public.system_settings);

-- =====================================================
-- STEP 5: Create Triggers for Updated Timestamp
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for system_settings
DROP TRIGGER IF EXISTS update_system_settings_updated_at ON public.system_settings;
CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON public.system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for user_preferences
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if tables were created
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('system_settings', 'user_preferences');

-- Check default settings
SELECT * FROM public.system_settings LIMIT 1;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('system_settings', 'user_preferences')
ORDER BY tablename, policyname;
