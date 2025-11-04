-- =====================================================
-- Notification Preferences Table Migration
-- =====================================================
-- Purpose: Store user preferences for notification channels and types
-- Date: 2025-01-25
-- =====================================================

-- Step 1: Create notification_preferences table
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,

  -- Channel preferences (enabled/disabled)
  enable_push BOOLEAN DEFAULT true,
  enable_whatsapp BOOLEAN DEFAULT true,
  enable_email BOOLEAN DEFAULT false,

  -- Notification type preferences
  event_invitations BOOLEAN DEFAULT true,
  payment_reminders BOOLEAN DEFAULT true,
  payment_receipts BOOLEAN DEFAULT true,
  crisis_alerts BOOLEAN DEFAULT true,
  general_announcements BOOLEAN DEFAULT true,
  rsvp_confirmations BOOLEAN DEFAULT true,

  -- Quiet hours (no notifications during this time)
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  quiet_hours_enabled BOOLEAN DEFAULT false,

  -- Language preference for notifications
  preferred_language VARCHAR(5) DEFAULT 'ar' CHECK (preferred_language IN ('ar', 'en')),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- One preference record per member
  UNIQUE(member_id)
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_prefs_member_id
ON user_notification_preferences(member_id);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_push_enabled
ON user_notification_preferences(enable_push)
WHERE enable_push = true;

CREATE INDEX IF NOT EXISTS idx_notification_prefs_whatsapp_enabled
ON user_notification_preferences(enable_whatsapp)
WHERE enable_whatsapp = true;

-- Step 3: Add comments for documentation
COMMENT ON TABLE user_notification_preferences IS
'User preferences for notification channels and types';

COMMENT ON COLUMN user_notification_preferences.enable_push IS
'Whether user wants push notifications (FCM)';

COMMENT ON COLUMN user_notification_preferences.enable_whatsapp IS
'Whether user wants WhatsApp notifications';

COMMENT ON COLUMN user_notification_preferences.enable_email IS
'Whether user wants email notifications (future feature)';

COMMENT ON COLUMN user_notification_preferences.quiet_hours_start IS
'Start time for quiet hours (e.g., 22:00:00 for 10 PM)';

COMMENT ON COLUMN user_notification_preferences.quiet_hours_end IS
'End time for quiet hours (e.g., 08:00:00 for 8 AM)';

COMMENT ON COLUMN user_notification_preferences.preferred_language IS
'Notification language: ar (Arabic) or en (English)';

-- Step 4: Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_prefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger for automatic updated_at
DROP TRIGGER IF EXISTS notification_prefs_updated_at_trigger ON user_notification_preferences;
CREATE TRIGGER notification_prefs_updated_at_trigger
  BEFORE UPDATE ON user_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_prefs_updated_at();

-- Step 6: Insert default preferences for existing members
INSERT INTO user_notification_preferences (member_id)
SELECT id FROM members
WHERE id NOT IN (SELECT member_id FROM user_notification_preferences)
ON CONFLICT (member_id) DO NOTHING;

-- Step 7: Verification query
SELECT
  'NOTIFICATION_PREFERENCES' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE enable_push = true) as push_enabled,
  COUNT(*) FILTER (WHERE enable_whatsapp = true) as whatsapp_enabled,
  COUNT(*) FILTER (WHERE quiet_hours_enabled = true) as quiet_hours_enabled,
  COUNT(*) FILTER (WHERE preferred_language = 'ar') as arabic_preference,
  COUNT(*) FILTER (WHERE preferred_language = 'en') as english_preference
FROM user_notification_preferences;

-- Step 8: Success message
DO $$
DECLARE
  member_count INTEGER;
  pref_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO member_count FROM members;
  SELECT COUNT(*) INTO pref_count FROM user_notification_preferences;

  RAISE NOTICE '';
  RAISE NOTICE '✅ Notification preferences table created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Table: user_notification_preferences';
  RAISE NOTICE 'Features:';
  RAISE NOTICE '  - Channel preferences (Push, WhatsApp, Email)';
  RAISE NOTICE '  - Notification type preferences';
  RAISE NOTICE '  - Quiet hours support';
  RAISE NOTICE '  - Bilingual support (Arabic/English)';
  RAISE NOTICE '  - Automatic timestamp updates';
  RAISE NOTICE '';
  RAISE NOTICE 'Data:';
  RAISE NOTICE '  - Total members: %', member_count;
  RAISE NOTICE '  - Preferences created: %', pref_count;
  RAISE NOTICE '';
END $$;
