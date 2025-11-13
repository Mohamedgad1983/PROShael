-- ============================================================================
-- MIGRATION: Add Language & Region Settings to Users Table
-- Created: 2025-11-13
-- Feature: Phase 3 - Language & Region Settings (Feature 5.3)
-- ============================================================================

-- Migration Metadata
-- Name: add_language_settings
-- Version: 20251113_003
-- Description: Add JSONB column for user language/region preferences
-- Rollback: 20251113_add_language_settings_rollback.sql

-- ============================================================================
-- FORWARD MIGRATION
-- ============================================================================

BEGIN;

-- Add language_settings column with default structure
ALTER TABLE users ADD COLUMN IF NOT EXISTS language_settings JSONB DEFAULT '{
  "language": "ar",
  "region": "SA",
  "timezone": "Asia/Riyadh",
  "date_format": "DD/MM/YYYY",
  "time_format": "12h",
  "number_format": "western",
  "currency": "SAR",
  "week_start": "saturday"
}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN users.language_settings IS
'User language and region preferences stored as JSONB.
Structure:
{
  "language": string,        -- ISO 639-1 code: "ar" (Arabic), "en" (English), "both" (Bilingual)
  "region": string,          -- ISO 3166-1 alpha-2 code: "SA" (Saudi Arabia), "AE" (UAE), etc.
  "timezone": string,        -- IANA timezone: "Asia/Riyadh", "Asia/Dubai", etc.
  "date_format": string,     -- One of: "DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"
  "time_format": string,     -- One of: "12h", "24h"
  "number_format": string,   -- One of: "western" (0-9), "arabic" (٠-٩)
  "currency": string,        -- ISO 4217 code: "SAR", "USD", "AED", etc.
  "week_start": string,      -- One of: "saturday", "sunday", "monday"
  "updated_at": "ISO 8601"   -- Last update timestamp (optional)
}';

-- Create GIN index for JSONB queries (efficient lookups)
CREATE INDEX IF NOT EXISTS idx_users_language_settings
  ON users USING gin (language_settings);

-- Update existing users to have default language settings
-- Only update users where language_settings is NULL
UPDATE users
SET language_settings = '{
  "language": "ar",
  "region": "SA",
  "timezone": "Asia/Riyadh",
  "date_format": "DD/MM/YYYY",
  "time_format": "12h",
  "number_format": "western",
  "currency": "SAR",
  "week_start": "saturday"
}'::jsonb
WHERE language_settings IS NULL;

-- Add constraint: language_settings cannot be null (after setting defaults)
ALTER TABLE users ALTER COLUMN language_settings SET NOT NULL;

-- Add validation check: ensure language_settings is valid JSON object
ALTER TABLE users ADD CONSTRAINT check_language_settings_is_object
  CHECK (jsonb_typeof(language_settings) = 'object');

-- Add validation check: ensure required fields exist
ALTER TABLE users ADD CONSTRAINT check_language_settings_required_fields
  CHECK (
    language_settings ? 'language' AND
    language_settings ? 'region' AND
    language_settings ? 'timezone' AND
    language_settings ? 'date_format' AND
    language_settings ? 'time_format' AND
    language_settings ? 'number_format' AND
    language_settings ? 'currency' AND
    language_settings ? 'week_start'
  );

-- Add validation check: ensure language is valid
ALTER TABLE users ADD CONSTRAINT check_language_valid
  CHECK (
    language_settings ->> 'language' IN ('ar', 'en', 'both')
  );

-- Add validation check: ensure date_format is valid
ALTER TABLE users ADD CONSTRAINT check_date_format_valid
  CHECK (
    language_settings ->> 'date_format' IN ('DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD')
  );

-- Add validation check: ensure time_format is valid
ALTER TABLE users ADD CONSTRAINT check_time_format_valid
  CHECK (
    language_settings ->> 'time_format' IN ('12h', '24h')
  );

-- Add validation check: ensure number_format is valid
ALTER TABLE users ADD CONSTRAINT check_number_format_valid
  CHECK (
    language_settings ->> 'number_format' IN ('western', 'arabic')
  );

-- Add validation check: ensure week_start is valid
ALTER TABLE users ADD CONSTRAINT check_week_start_valid
  CHECK (
    language_settings ->> 'week_start' IN ('saturday', 'sunday', 'monday')
  );

-- Add validation check: ensure all string fields are actually strings
ALTER TABLE users ADD CONSTRAINT check_language_settings_strings_valid
  CHECK (
    jsonb_typeof(language_settings -> 'language') = 'string' AND
    jsonb_typeof(language_settings -> 'region') = 'string' AND
    jsonb_typeof(language_settings -> 'timezone') = 'string' AND
    jsonb_typeof(language_settings -> 'date_format') = 'string' AND
    jsonb_typeof(language_settings -> 'time_format') = 'string' AND
    jsonb_typeof(language_settings -> 'number_format') = 'string' AND
    jsonb_typeof(language_settings -> 'currency') = 'string' AND
    jsonb_typeof(language_settings -> 'week_start') = 'string'
  );

-- Add validation check: ensure region is 2-letter ISO code
ALTER TABLE users ADD CONSTRAINT check_region_iso_format
  CHECK (
    language_settings ->> 'region' ~ '^[A-Z]{2}$'
  );

-- Add validation check: ensure currency is 3-letter ISO code
ALTER TABLE users ADD CONSTRAINT check_currency_iso_format
  CHECK (
    language_settings ->> 'currency' ~ '^[A-Z]{3}$'
  );

-- Create trigger to update updated_at timestamp in language_settings
CREATE OR REPLACE FUNCTION update_language_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.language_settings IS DISTINCT FROM OLD.language_settings THEN
    NEW.language_settings = jsonb_set(
      NEW.language_settings,
      '{updated_at}',
      to_jsonb(NOW()::text)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to users table
DROP TRIGGER IF EXISTS trigger_update_language_settings_timestamp ON users;
CREATE TRIGGER trigger_update_language_settings_timestamp
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_language_settings_timestamp();

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully: add_language_settings';
  RAISE NOTICE 'Indexes created: idx_users_language_settings';
  RAISE NOTICE 'Constraints added: 10 validation constraints';
  RAISE NOTICE 'Trigger created: trigger_update_language_settings_timestamp';
END $$;

COMMIT;

-- ============================================================================
-- MIGRATION VERIFICATION
-- ============================================================================

-- Verify column exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'language_settings';

-- Verify indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'users' AND indexname LIKE '%language%';

-- Verify constraints exist
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'users'::regclass AND conname LIKE '%language%';

-- Verify trigger exists
SELECT tgname, proname
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'users'::regclass AND tgname LIKE '%language%';

-- Sample data verification (if users exist)
SELECT
  id,
  email,
  language_settings ->> 'language' as language,
  language_settings ->> 'region' as region,
  language_settings ->> 'timezone' as timezone,
  language_settings ->> 'date_format' as date_format
FROM users
LIMIT 5;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
