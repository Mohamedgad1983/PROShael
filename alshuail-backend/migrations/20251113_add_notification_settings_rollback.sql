-- ============================================================================
-- ROLLBACK MIGRATION: Remove Notification Settings from Users Table
-- Created: 2025-11-13
-- Feature: Phase 1 - Notification Settings (Feature 5.1)
-- ============================================================================

-- Rollback Metadata
-- Name: add_notification_settings_rollback
-- Version: 20251113_001_rollback
-- Description: Safely remove notification_settings column and related objects
-- Forward Migration: 20251113_add_notification_settings.sql

-- ============================================================================
-- ROLLBACK MIGRATION
-- ============================================================================

BEGIN;

-- Log rollback start
DO $$
BEGIN
  RAISE NOTICE 'Starting rollback: remove notification_settings';
  RAISE NOTICE 'This will remove the notification_settings column and all related objects';
END $$;

-- Drop trigger first
DROP TRIGGER IF EXISTS trigger_update_notification_settings_timestamp ON users;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_notification_settings_timestamp();

-- Drop constraints
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_notification_settings_is_object;
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_notification_settings_required_fields;
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_notification_types_is_array;
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_notification_types_not_empty;
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_notification_frequency_valid;
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_notification_booleans_valid;
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_notification_quiet_hours_is_object;
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_notification_quiet_hours_fields;

-- Drop indexes
DROP INDEX IF EXISTS idx_users_notification_settings;
DROP INDEX IF EXISTS idx_users_notification_types;

-- Remove NOT NULL constraint before dropping column
ALTER TABLE users ALTER COLUMN notification_settings DROP NOT NULL;

-- Drop the column
ALTER TABLE users DROP COLUMN IF EXISTS notification_settings;

-- Log rollback completion
DO $$
BEGIN
  RAISE NOTICE 'Rollback completed successfully';
  RAISE NOTICE 'Column removed: notification_settings';
  RAISE NOTICE 'Indexes removed: idx_users_notification_settings, idx_users_notification_types';
  RAISE NOTICE 'Constraints removed: 8 validation constraints';
  RAISE NOTICE 'Trigger removed: trigger_update_notification_settings_timestamp';
  RAISE NOTICE 'Function removed: update_notification_settings_timestamp';
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK VERIFICATION
-- ============================================================================

-- Verify column is removed
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'notification_settings';
-- Should return 0 rows

-- Verify indexes are removed
SELECT indexname
FROM pg_indexes
WHERE tablename = 'users' AND indexname LIKE '%notification%';
-- Should return 0 rows

-- Verify constraints are removed
SELECT conname
FROM pg_constraint
WHERE conrelid = 'users'::regclass AND conname LIKE '%notification%';
-- Should return 0 rows

-- Verify trigger is removed
SELECT tgname
FROM pg_trigger
WHERE tgrelid = 'users'::regclass AND tgname LIKE '%notification%';
-- Should return 0 rows

-- Verify function is removed
SELECT proname
FROM pg_proc
WHERE proname = 'update_notification_settings_timestamp';
-- Should return 0 rows

-- ============================================================================
-- END OF ROLLBACK
-- ============================================================================
