-- =====================================================
-- Phone Number Constraints Migration
-- =====================================================
-- Purpose: Add database-level validation for phone numbers
-- Date: 2025-01-01
--
-- PREREQUISITES:
--   1. Run fix_phone_data_integrity.sql FIRST
--   2. Verify all phone numbers are valid
--   3. Ensure 0 invalid records remain
--
-- FORMATS:
--   Saudi:  966XXXXXXXXX (11 chars, starts with 9665)
--   Kuwait: 965XXXXXXXX (11 chars, starts with 965)
--
-- =====================================================

-- Step 1: Verify data is clean BEFORE adding constraint
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM members
  WHERE phone IS NOT NULL
    AND phone !~ '^(966[5][0-9]{8}|965[0-9]{8})$';

  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Cannot add constraint: % invalid phone numbers found. Run fix_phone_data_integrity.sql first.', invalid_count;
  ELSE
    RAISE NOTICE 'Data validation passed: All phone numbers are valid';
  END IF;
END $$;

-- Step 2: Add CHECK constraint
ALTER TABLE members
DROP CONSTRAINT IF EXISTS phone_format_check;

ALTER TABLE members
ADD CONSTRAINT phone_format_check
CHECK (
  phone IS NULL OR
  phone ~ '^(966[5][0-9]{8}|965[0-9]{8})$'
);

COMMENT ON CONSTRAINT phone_format_check ON members IS
'Ensures phone numbers are in correct international format:
- Saudi Arabia: 966XXXXXXXXX (9 digits after 966, starting with 5)
- Kuwait: 965XXXXXXXX (8 digits after 965)
- No + prefix in storage
- WhatsApp/SMS ready format';

-- Step 3: Add column comment for documentation
COMMENT ON COLUMN members.phone IS
'Phone number in international format without + prefix.
Formats:
- Saudi Arabia: 966XXXXXXXXX (11 chars total, starts with 9665)
- Kuwait: 965XXXXXXXX (11 chars total, starts with 965)

Examples:
- Saudi: 966501234567 (displayed as +966 50 123 4567)
- Kuwait: 96512345678 (displayed as +965 1234 5678)

For WhatsApp/SMS: Add + prefix when sending
Validated by phone_format_check constraint';

-- Step 4: Create index for performance (phone is searchable)
CREATE INDEX IF NOT EXISTS idx_members_phone
ON members(phone)
WHERE phone IS NOT NULL;

COMMENT ON INDEX idx_members_phone IS
'Performance index for phone number searches and lookups';

-- Step 5: Test constraint with valid numbers
DO $$
BEGIN
  -- Test valid Saudi number (should succeed)
  BEGIN
    INSERT INTO members (full_name, phone, membership_number)
    VALUES ('Test Valid Saudi', '966501234567', 'TEST-SAUDI-001');
    DELETE FROM members WHERE membership_number = 'TEST-SAUDI-001';
    RAISE NOTICE 'Valid Saudi number test: PASSED';
  EXCEPTION WHEN check_violation THEN
    RAISE EXCEPTION 'Valid Saudi number test: FAILED';
  END;

  -- Test valid Kuwait number (should succeed)
  BEGIN
    INSERT INTO members (full_name, phone, membership_number)
    VALUES ('Test Valid Kuwait', '96512345678', 'TEST-KUWAIT-001');
    DELETE FROM members WHERE membership_number = 'TEST-KUWAIT-001';
    RAISE NOTICE 'Valid Kuwait number test: PASSED';
  EXCEPTION WHEN check_violation THEN
    RAISE EXCEPTION 'Valid Kuwait number test: FAILED';
  END;

  -- Test invalid number (should fail)
  BEGIN
    INSERT INTO members (full_name, phone, membership_number)
    VALUES ('Test Invalid', '123456', 'TEST-INVALID-001');
    DELETE FROM members WHERE membership_number = 'TEST-INVALID-001';
    RAISE EXCEPTION 'Invalid number test: FAILED (should have been rejected)';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'Invalid number test: PASSED (correctly rejected)';
  END;
END $$;

-- Step 6: Verification report
SELECT
  'CONSTRAINT VERIFICATION' as report_type,
  COUNT(*) as total_members,
  COUNT(phone) as members_with_phone,
  COUNT(CASE WHEN phone ~ '^966[5][0-9]{8}$' THEN 1 END) as saudi_numbers,
  COUNT(CASE WHEN phone ~ '^965[0-9]{8}$' THEN 1 END) as kuwait_numbers,
  (
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'members'::regclass
      AND conname = 'phone_format_check'
  ) as constraint_name,
  (
    SELECT CASE
      WHEN EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'members'::regclass
          AND conname = 'phone_format_check'
      ) THEN 'ACTIVE'
      ELSE 'MISSING'
    END
  ) as constraint_status
FROM members;

-- =====================================================
-- Rollback Instructions (if needed)
-- =====================================================
-- To remove constraint:
-- ALTER TABLE members DROP CONSTRAINT IF EXISTS phone_format_check;
-- DROP INDEX IF EXISTS idx_members_phone;
-- =====================================================

-- =====================================================
-- Success Confirmation
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Phone constraints migration completed successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  - CHECK constraint: phone_format_check (ACTIVE)';
  RAISE NOTICE '  - Performance index: idx_members_phone (CREATED)';
  RAISE NOTICE '  - Supported formats: Saudi (966XXXXXXXXX), Kuwait (965XXXXXXXX)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Test member creation with valid Saudi number';
  RAISE NOTICE '  2. Test member creation with valid Kuwait number';
  RAISE NOTICE '  3. Verify invalid numbers are rejected';
  RAISE NOTICE '  4. Update frontend validation to match';
  RAISE NOTICE '';
END $$;
