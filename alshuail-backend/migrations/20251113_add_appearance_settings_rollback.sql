-- ============================================================================
-- ROLLBACK MIGRATION: Remove Appearance Settings from Users Table
-- Created: 2025-11-13
-- Feature: Phase 2 - Appearance Settings (Feature 5.2)
-- ============================================================================

-- Rollback Metadata
-- Name: add_appearance_settings_rollback
-- Version: 20251113_002_rollback
-- Description: Safely remove appearance_settings column and related objects
-- Forward Migration: 20251113_add_appearance_settings.sql

-- ============================================================================
-- ROLLBACK MIGRATION
-- ============================================================================

BEGIN;

-- Log rollback start
DO $$
BEGIN
  RAISE NOTICE 'Starting rollback: remove appearance_settings';
  RAISE NOTICE 'This will remove the appearance_settings column and all related objects';
END $$;

-- Drop trigger first
DROP TRIGGER IF EXISTS trigger_update_appearance_settings_timestamp ON users;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_appearance_settings_timestamp();

-- Drop constraints
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_appearance_settings_is_object;
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_appearance_settings_required_fields;
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_appearance_theme_mode_valid;
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_appearance_font_size_valid;
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_appearance_booleans_valid;
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_appearance_primary_color_is_string;
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_appearance_primary_color_hex_format;

-- Drop indexes
DROP INDEX IF EXISTS idx_users_appearance_settings;

-- Remove NOT NULL constraint before dropping column
ALTER TABLE users ALTER COLUMN appearance_settings DROP NOT NULL;

-- Drop the column
ALTER TABLE users DROP COLUMN IF EXISTS appearance_settings;

-- Log rollback completion
DO $$
BEGIN
  RAISE NOTICE 'Rollback completed successfully';
  RAISE NOTICE 'Column removed: appearance_settings';
  RAISE NOTICE 'Indexes removed: idx_users_appearance_settings';
  RAISE NOTICE 'Constraints removed: 7 validation constraints';
  RAISE NOTICE 'Trigger removed: trigger_update_appearance_settings_timestamp';
  RAISE NOTICE 'Function removed: update_appearance_settings_timestamp';
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK VERIFICATION
-- ============================================================================

-- Verify column is removed
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'appearance_settings';
-- Should return 0 rows

-- Verify indexes are removed
SELECT indexname
FROM pg_indexes
WHERE tablename = 'users' AND indexname LIKE '%appearance%';
-- Should return 0 rows

-- Verify constraints are removed
SELECT conname
FROM pg_constraint
WHERE conrelid = 'users'::regclass AND conname LIKE '%appearance%';
-- Should return 0 rows

-- Verify trigger is removed
SELECT tgname
FROM pg_trigger
WHERE tgrelid = 'users'::regclass AND tgname LIKE '%appearance%';
-- Should return 0 rows

-- Verify function is removed
SELECT proname
FROM pg_proc
WHERE proname = 'update_appearance_settings_timestamp';
-- Should return 0 rows

-- ============================================================================
-- END OF ROLLBACK
-- ============================================================================
