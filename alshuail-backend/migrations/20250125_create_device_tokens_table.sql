-- =====================================================
-- Device Tokens Table Migration
-- =====================================================
-- Purpose: Store Firebase FCM device tokens for push notifications
-- Date: 2025-01-25
-- =====================================================

-- Step 1: Create device_tokens table
CREATE TABLE IF NOT EXISTS device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_name VARCHAR(255),
  app_version VARCHAR(50),
  os_version VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Ensure one token per device (unique combination)
  UNIQUE(member_id, token)
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_device_tokens_member_id
ON device_tokens(member_id);

CREATE INDEX IF NOT EXISTS idx_device_tokens_token
ON device_tokens(token);

CREATE INDEX IF NOT EXISTS idx_device_tokens_is_active
ON device_tokens(is_active)
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_device_tokens_platform
ON device_tokens(platform);

-- Step 3: Add comments for documentation
COMMENT ON TABLE device_tokens IS
'Firebase Cloud Messaging device tokens for push notifications';

COMMENT ON COLUMN device_tokens.member_id IS
'Reference to the member who owns this device';

COMMENT ON COLUMN device_tokens.token IS
'Firebase FCM registration token for this device';

COMMENT ON COLUMN device_tokens.platform IS
'Device platform: ios, android, or web';

COMMENT ON COLUMN device_tokens.device_name IS
'Optional human-readable device name (e.g., "iPhone 15 Pro", "Samsung Galaxy")';

COMMENT ON COLUMN device_tokens.is_active IS
'Whether this token is still valid (false if token refresh failed)';

COMMENT ON COLUMN device_tokens.last_used_at IS
'Last time a notification was successfully sent to this token';

-- Step 4: Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_device_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger for automatic updated_at
DROP TRIGGER IF EXISTS device_tokens_updated_at_trigger ON device_tokens;
CREATE TRIGGER device_tokens_updated_at_trigger
  BEFORE UPDATE ON device_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_device_tokens_updated_at();

-- Step 6: Verification query
SELECT
  'DEVICE_TOKENS_TABLE' as table_name,
  COUNT(*) as record_count,
  COUNT(DISTINCT member_id) as unique_members,
  COUNT(DISTINCT platform) as platforms_used
FROM device_tokens;

-- Step 7: Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Device tokens table created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Table: device_tokens';
  RAISE NOTICE 'Features:';
  RAISE NOTICE '  - FCM token storage per device';
  RAISE NOTICE '  - Multi-platform support (iOS, Android, Web)';
  RAISE NOTICE '  - Active/inactive token tracking';
  RAISE NOTICE '  - Automatic timestamp updates';
  RAISE NOTICE '  - Performance indexes';
  RAISE NOTICE '';
END $$;
