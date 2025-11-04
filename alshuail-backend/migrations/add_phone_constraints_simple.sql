-- =====================================================
-- Phone Number Constraints Migration (Simplified)
-- =====================================================
-- Run AFTER fix_phone_data_integrity.sql
-- =====================================================

-- Step 1: Verify data is clean
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM members
  WHERE phone IS NOT NULL
    AND phone !~ '^(966[5][0-9]{8}|965[0-9]{8})$';

  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Cannot add constraint: % invalid phone numbers found', invalid_count;
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

-- Step 3: Add index
CREATE INDEX IF NOT EXISTS idx_members_phone
ON members(phone)
WHERE phone IS NOT NULL;

-- Step 4: Add comments
COMMENT ON CONSTRAINT phone_format_check ON members IS
'Phone format: Saudi 966XXXXXXXXX or Kuwait 965XXXXXXXX';

COMMENT ON COLUMN members.phone IS
'Phone in international format without + prefix. Saudi: 966XXXXXXXXX, Kuwait: 965XXXXXXXX';

-- Step 5: Verify
SELECT
  COUNT(*) as total,
  COUNT(phone) as with_phone,
  COUNT(CASE WHEN phone ~ '^966[5][0-9]{8}$' THEN 1 END) as saudi,
  COUNT(CASE WHEN phone ~ '^965[0-9]{8}$' THEN 1 END) as kuwait
FROM members;
