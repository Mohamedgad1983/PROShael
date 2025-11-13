-- ============================================================================
-- MIGRATION: Add Appearance Settings to Users Table
-- Created: 2025-11-13
-- Feature: Phase 2 - Appearance Settings (Feature 5.2)
-- ============================================================================

-- Migration Metadata
-- Name: add_appearance_settings
-- Version: 20251113_002
-- Description: Add JSONB column for user appearance/theme preferences
-- Rollback: 20251113_add_appearance_settings_rollback.sql

-- ============================================================================
-- FORWARD MIGRATION
-- ============================================================================

BEGIN;

-- Add appearance_settings column with default structure
ALTER TABLE users ADD COLUMN IF NOT EXISTS appearance_settings JSONB DEFAULT '{
  "theme_mode": "auto",
  "primary_color": "#1976d2",
  "font_size": "medium",
  "compact_mode": false,
  "animations_enabled": true
}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN users.appearance_settings IS
'User appearance/theme preferences stored as JSONB.
Structure:
{
  "theme_mode": string,        -- One of: "light", "dark", "auto"
  "primary_color": string,      -- Hex color code (e.g., "#1976d2")
  "font_size": string,          -- One of: "small", "medium", "large"
  "compact_mode": boolean,      -- Enable compact spacing
  "animations_enabled": boolean, -- Enable UI animations
  "updated_at": "ISO 8601"      -- Last update timestamp (optional)
}';

-- Create GIN index for JSONB queries (efficient lookups)
CREATE INDEX IF NOT EXISTS idx_users_appearance_settings
  ON users USING gin (appearance_settings);

-- Update existing users to have default appearance settings
-- Only update users where appearance_settings is NULL
UPDATE users
SET appearance_settings = '{
  "theme_mode": "auto",
  "primary_color": "#1976d2",
  "font_size": "medium",
  "compact_mode": false,
  "animations_enabled": true
}'::jsonb
WHERE appearance_settings IS NULL;

-- Add constraint: appearance_settings cannot be null (after setting defaults)
ALTER TABLE users ALTER COLUMN appearance_settings SET NOT NULL;

-- Add validation check: ensure appearance_settings is valid JSON object
ALTER TABLE users ADD CONSTRAINT check_appearance_settings_is_object
  CHECK (jsonb_typeof(appearance_settings) = 'object');

-- Add validation check: ensure required fields exist
ALTER TABLE users ADD CONSTRAINT check_appearance_settings_required_fields
  CHECK (
    appearance_settings ? 'theme_mode' AND
    appearance_settings ? 'primary_color' AND
    appearance_settings ? 'font_size' AND
    appearance_settings ? 'compact_mode' AND
    appearance_settings ? 'animations_enabled'
  );

-- Add validation check: ensure theme_mode is valid enum
ALTER TABLE users ADD CONSTRAINT check_appearance_theme_mode_valid
  CHECK (
    appearance_settings ->> 'theme_mode' IN ('light', 'dark', 'auto')
  );

-- Add validation check: ensure font_size is valid enum
ALTER TABLE users ADD CONSTRAINT check_appearance_font_size_valid
  CHECK (
    appearance_settings ->> 'font_size' IN ('small', 'medium', 'large')
  );

-- Add validation check: ensure boolean fields are actually booleans
ALTER TABLE users ADD CONSTRAINT check_appearance_booleans_valid
  CHECK (
    jsonb_typeof(appearance_settings -> 'compact_mode') = 'boolean' AND
    jsonb_typeof(appearance_settings -> 'animations_enabled') = 'boolean'
  );

-- Add validation check: ensure primary_color is a string
ALTER TABLE users ADD CONSTRAINT check_appearance_primary_color_is_string
  CHECK (
    jsonb_typeof(appearance_settings -> 'primary_color') = 'string'
  );

-- Add validation check: ensure primary_color is valid hex format
ALTER TABLE users ADD CONSTRAINT check_appearance_primary_color_hex_format
  CHECK (
    appearance_settings ->> 'primary_color' ~ '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'
  );

-- Create trigger to update updated_at timestamp in appearance_settings
CREATE OR REPLACE FUNCTION update_appearance_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.appearance_settings IS DISTINCT FROM OLD.appearance_settings THEN
    NEW.appearance_settings = jsonb_set(
      NEW.appearance_settings,
      '{updated_at}',
      to_jsonb(NOW()::text)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to users table
DROP TRIGGER IF EXISTS trigger_update_appearance_settings_timestamp ON users;
CREATE TRIGGER trigger_update_appearance_settings_timestamp
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_appearance_settings_timestamp();

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully: add_appearance_settings';
  RAISE NOTICE 'Indexes created: idx_users_appearance_settings';
  RAISE NOTICE 'Constraints added: 7 validation constraints';
  RAISE NOTICE 'Trigger created: trigger_update_appearance_settings_timestamp';
END $$;

COMMIT;

-- ============================================================================
-- MIGRATION VERIFICATION
-- ============================================================================

-- Verify column exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'appearance_settings';

-- Verify indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'users' AND indexname LIKE '%appearance%';

-- Verify constraints exist
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'users'::regclass AND conname LIKE '%appearance%';

-- Verify trigger exists
SELECT tgname, proname
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'users'::regclass AND tgname LIKE '%appearance%';

-- Sample data verification (if users exist)
SELECT
  id,
  email,
  appearance_settings ->> 'theme_mode' as theme_mode,
  appearance_settings ->> 'font_size' as font_size,
  appearance_settings -> 'compact_mode' as compact_mode
FROM users
LIMIT 5;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
