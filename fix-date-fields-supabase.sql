-- SQL Script to fix date field issues in Supabase
-- Run this in Supabase SQL Editor

-- Step 1: Check current date columns and their data types
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'members'
AND data_type = 'date'
ORDER BY column_name;

-- Step 2: Update any empty string dates to NULL
-- This fixes existing bad data
UPDATE members
SET date_of_birth = NULL
WHERE date_of_birth = '' OR date_of_birth::text = '';

UPDATE members
SET membership_date = NULL
WHERE membership_date = '' OR membership_date::text = '';

-- Step 3: Add constraints to prevent empty strings in date fields
-- This prevents future issues
ALTER TABLE members
ADD CONSTRAINT check_date_of_birth_valid
CHECK (date_of_birth IS NULL OR date_of_birth::text != '');

ALTER TABLE members
ADD CONSTRAINT check_membership_date_valid
CHECK (membership_date IS NULL OR membership_date::text != '');

-- Step 4: Create a function to clean date inputs
CREATE OR REPLACE FUNCTION clean_date_input()
RETURNS TRIGGER AS $$
BEGIN
  -- Clean date_of_birth
  IF NEW.date_of_birth IS NOT NULL AND NEW.date_of_birth::text = '' THEN
    NEW.date_of_birth := NULL;
  END IF;

  -- Clean membership_date
  IF NEW.membership_date IS NOT NULL AND NEW.membership_date::text = '' THEN
    NEW.membership_date := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger to automatically clean dates on insert/update
DROP TRIGGER IF EXISTS clean_member_dates ON members;

CREATE TRIGGER clean_member_dates
BEFORE INSERT OR UPDATE ON members
FOR EACH ROW
EXECUTE FUNCTION clean_date_input();

-- Step 6: Verify the fix
SELECT
  COUNT(*) as total_members,
  COUNT(date_of_birth) as members_with_birth_date,
  COUNT(membership_date) as members_with_membership_date
FROM members;

-- Step 7: Test with a sample update (optional)
-- UPDATE members
-- SET date_of_birth = NULL
-- WHERE id = (SELECT id FROM members LIMIT 1);

-- If you need to remove the constraints later (not recommended):
-- ALTER TABLE members DROP CONSTRAINT IF EXISTS check_date_of_birth_valid;
-- ALTER TABLE members DROP CONSTRAINT IF EXISTS check_membership_date_valid;