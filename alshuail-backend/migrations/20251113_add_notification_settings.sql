-- ============================================================================
-- MIGRATION: Add Notification Settings to Users Table
-- Created: 2025-11-13
-- Feature: Phase 1 - Notification Settings (Feature 5.1)
-- ============================================================================

-- Migration Metadata
-- Name: add_notification_settings
-- Version: 20251113_001
-- Description: Add JSONB column for user notification preferences
-- Rollback: 20251113_add_notification_settings_rollback.sql

-- ============================================================================
-- FORWARD MIGRATION
-- ============================================================================

BEGIN;

-- Add notification_settings column with default structure
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{
  "email_enabled": true,
  "sms_enabled": false,
  "push_enabled": true,
  "types": ["system", "security"],
  "frequency": "instant",
  "quiet_hours": {
    "start": "22:00",
    "end": "08:00",
    "overnight": true
  }
}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN users.notification_settings IS
'User notification preferences stored as JSONB.
Structure:
{
  "email_enabled": boolean,     -- Enable email notifications
  "sms_enabled": boolean,        -- Enable SMS notifications
  "push_enabled": boolean,       -- Enable push notifications
  "types": string[],             -- Array of: "system", "security", "members", "finance", "family_tree"
  "frequency": string,           -- One of: "instant", "daily", "weekly"
  "quiet_hours": {
    "start": "HH:MM",           -- Start time in 24-hour format
    "end": "HH:MM",             -- End time in 24-hour format
    "overnight": boolean         -- Whether quiet hours span midnight
  },
  "updated_at": "ISO 8601"      -- Last update timestamp (optional)
}';

-- Create GIN index for JSONB queries (efficient lookups)
CREATE INDEX IF NOT EXISTS idx_users_notification_settings
  ON users USING gin (notification_settings);

-- Create index for faster filtering by notification preferences
CREATE INDEX IF NOT EXISTS idx_users_notification_types
  ON users USING gin ((notification_settings -> 'types'));

-- Update existing users to have default notification settings
-- Only update users where notification_settings is NULL
UPDATE users
SET notification_settings = '{
  "email_enabled": true,
  "sms_enabled": false,
  "push_enabled": true,
  "types": ["system", "security"],
  "frequency": "instant",
  "quiet_hours": {
    "start": "22:00",
    "end": "08:00",
    "overnight": true
  }
}'::jsonb
WHERE notification_settings IS NULL;

-- Add constraint: notification_settings cannot be null (after setting defaults)
ALTER TABLE users ALTER COLUMN notification_settings SET NOT NULL;

-- Add validation check: ensure notification_settings is valid JSON object
ALTER TABLE users ADD CONSTRAINT check_notification_settings_is_object
  CHECK (jsonb_typeof(notification_settings) = 'object');

-- Add validation check: ensure required fields exist
ALTER TABLE users ADD CONSTRAINT check_notification_settings_required_fields
  CHECK (
    notification_settings ? 'email_enabled' AND
    notification_settings ? 'sms_enabled' AND
    notification_settings ? 'push_enabled' AND
    notification_settings ? 'types' AND
    notification_settings ? 'frequency' AND
    notification_settings ? 'quiet_hours'
  );

-- Add validation check: ensure types is an array
ALTER TABLE users ADD CONSTRAINT check_notification_types_is_array
  CHECK (jsonb_typeof(notification_settings -> 'types') = 'array');

-- Add validation check: ensure types array is not empty
ALTER TABLE users ADD CONSTRAINT check_notification_types_not_empty
  CHECK (jsonb_array_length(notification_settings -> 'types') > 0);

-- Add validation check: ensure frequency is valid enum
ALTER TABLE users ADD CONSTRAINT check_notification_frequency_valid
  CHECK (
    notification_settings ->> 'frequency' IN ('instant', 'daily', 'weekly')
  );

-- Add validation check: ensure boolean fields are actually booleans
ALTER TABLE users ADD CONSTRAINT check_notification_booleans_valid
  CHECK (
    jsonb_typeof(notification_settings -> 'email_enabled') = 'boolean' AND
    jsonb_typeof(notification_settings -> 'sms_enabled') = 'boolean' AND
    jsonb_typeof(notification_settings -> 'push_enabled') = 'boolean'
  );

-- Add validation check: ensure quiet_hours is an object
ALTER TABLE users ADD CONSTRAINT check_notification_quiet_hours_is_object
  CHECK (jsonb_typeof(notification_settings -> 'quiet_hours') = 'object');

-- Add validation check: ensure quiet_hours has required fields
ALTER TABLE users ADD CONSTRAINT check_notification_quiet_hours_fields
  CHECK (
    (notification_settings -> 'quiet_hours') ? 'start' AND
    (notification_settings -> 'quiet_hours') ? 'end'
  );

-- Create trigger to update updated_at timestamp in notification_settings
CREATE OR REPLACE FUNCTION update_notification_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.notification_settings IS DISTINCT FROM OLD.notification_settings THEN
    NEW.notification_settings = jsonb_set(
      NEW.notification_settings,
      '{updated_at}',
      to_jsonb(NOW()::text)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to users table
DROP TRIGGER IF EXISTS trigger_update_notification_settings_timestamp ON users;
CREATE TRIGGER trigger_update_notification_settings_timestamp
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_settings_timestamp();

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully: add_notification_settings';
  RAISE NOTICE 'Indexes created: idx_users_notification_settings, idx_users_notification_types';
  RAISE NOTICE 'Constraints added: 9 validation constraints';
  RAISE NOTICE 'Trigger created: trigger_update_notification_settings_timestamp';
END $$;

COMMIT;

-- ============================================================================
-- MIGRATION VERIFICATION
-- ============================================================================

-- Verify column exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'notification_settings';

-- Verify indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'users' AND indexname LIKE '%notification%';

-- Verify constraints exist
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'users'::regclass AND conname LIKE '%notification%';

-- Verify trigger exists
SELECT tgname, proname
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'users'::regclass AND tgname LIKE '%notification%';

-- Sample data verification (if users exist)
SELECT
  id,
  email,
  notification_settings ->> 'email_enabled' as email_enabled,
  notification_settings ->> 'frequency' as frequency,
  notification_settings -> 'types' as types
FROM users
LIMIT 5;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
