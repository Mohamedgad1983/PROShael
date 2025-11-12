-- Migration: Add notification_preferences column to auth.users
-- Created: 2025-02-01
-- Purpose: Store user notification preferences for Feature 3

-- Add notification_preferences column as JSONB with default values
ALTER TABLE auth.users
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "email_notifications": true,
  "push_notifications": false,
  "member_updates": true,
  "financial_alerts": true,
  "system_updates": false
}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN auth.users.notification_preferences IS 'User notification preferences stored as JSON: email_notifications, push_notifications, member_updates, financial_alerts, system_updates';

-- Update existing users to have default notification preferences (if column already exists but null)
UPDATE auth.users
SET notification_preferences = '{
  "email_notifications": true,
  "push_notifications": false,
  "member_updates": true,
  "financial_alerts": true,
  "system_updates": false
}'::jsonb
WHERE notification_preferences IS NULL;

-- Create index for faster querying (optional, for performance)
CREATE INDEX IF NOT EXISTS idx_users_notification_preferences
ON auth.users USING gin (notification_preferences);

-- Verify migration
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_schema = 'auth'
  AND table_name = 'users'
  AND column_name = 'notification_preferences';
