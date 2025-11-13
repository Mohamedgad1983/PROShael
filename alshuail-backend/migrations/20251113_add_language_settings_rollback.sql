-- ============================================================================
-- ROLLBACK MIGRATION: Remove Language & Region Settings from Users Table
-- Created: 2025-11-13
-- Feature: Phase 3 - Language & Region Settings (Feature 5.3)
-- ============================================================================

-- Rollback Metadata
-- Name: add_language_settings_rollback
-- Version: 20251113_003_rollback
-- Description: Safely remove language_settings column and related objects
-- Forward Migration: 20251113_add_language_settings.sql

-- ============================================================================
-- ROLLBACK MIGRATION
-- ============================================================================

BEGIN;

-- Log rollback start
DO $$
BEGIN
  RAISE NOTICE 'Starting rollback: remove language_settings';
  RAISE NOTICE 'This will remove the language_settings column and all related objects';
END $$;

-- Drop trigger first
DROP TRIGGER IF EXISTS trigger_update_language_settings_timestamp ON users;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_language_settings_timestamp();

-- Drop constraints
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_language_settings_is_object;
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_language_settings_required_fields;
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_language_valid;
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_date_format_valid;
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_time_format_valid;
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_number_format_valid;
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_week_start_valid;
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_language_settings_strings_valid;
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_region_iso_format;
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_currency_iso_format;

-- Drop indexes
DROP INDEX IF EXISTS idx_users_language_settings;

-- Remove NOT NULL constraint before dropping column
ALTER TABLE users ALTER COLUMN language_settings DROP NOT NULL;

-- Drop the column
ALTER TABLE users DROP COLUMN IF EXISTS language_settings;

-- Log rollback completion
DO $$
BEGIN
  RAISE NOTICE 'Rollback completed successfully';
  RAISE NOTICE 'Column removed: language_settings';
  RAISE NOTICE 'Indexes removed: idx_users_language_settings';
  RAISE NOTICE 'Constraints removed: 10 validation constraints';
  RAISE NOTICE 'Trigger removed: trigger_update_language_settings_timestamp';
  RAISE NOTICE 'Function removed: update_language_settings_timestamp';
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK VERIFICATION
-- ============================================================================

-- Verify column is removed
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'language_settings';
-- Should return 0 rows

-- Verify indexes are removed
SELECT indexname
FROM pg_indexes
WHERE tablename = 'users' AND indexname LIKE '%language%';
-- Should return 0 rows

-- Verify constraints are removed
SELECT conname
FROM pg_constraint
WHERE conrelid = 'users'::regclass AND conname LIKE '%language%';
-- Should return 0 rows

-- Verify trigger is removed
SELECT tgname
FROM pg_trigger
WHERE tgrelid = 'users'::regclass AND tgname LIKE '%language%';
-- Should return 0 rows

-- Verify function is removed
SELECT proname
FROM pg_proc
WHERE proname = 'update_language_settings_timestamp';
-- Should return 0 rows

-- ============================================================================
-- END OF ROLLBACK
-- ============================================================================
