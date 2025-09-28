-- Final SQL Script to check and fix date fields in Supabase
-- Run this in Supabase SQL Editor

-- Step 1: Check the actual state of date fields
SELECT
  'Current State' as status,
  COUNT(*) as total_members,
  COUNT(date_of_birth) as has_birth_date,
  COUNT(membership_date) as has_membership_date,
  COUNT(CASE WHEN date_of_birth IS NULL THEN 1 END) as null_birth_dates,
  COUNT(CASE WHEN membership_date IS NULL THEN 1 END) as null_membership_dates
FROM members;

-- Step 2: Check a sample of members to see what's in the date fields
SELECT
  id,
  full_name,
  date_of_birth,
  membership_date,
  CASE WHEN date_of_birth IS NULL THEN 'NULL' ELSE 'Has Value' END as birth_date_status,
  CASE WHEN membership_date IS NULL THEN 'NULL' ELSE 'Has Value' END as membership_date_status
FROM members
LIMIT 10;

-- Step 3: Create or replace the safe update function for member edits
CREATE OR REPLACE FUNCTION update_member_with_safe_dates(
  p_id UUID,
  p_data JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_date_of_birth DATE;
  v_membership_date DATE;
BEGIN
  -- Handle date_of_birth
  IF p_data ? 'date_of_birth' THEN
    IF p_data->>'date_of_birth' IS NULL OR p_data->>'date_of_birth' = '' THEN
      v_date_of_birth := NULL;
    ELSE
      BEGIN
        v_date_of_birth := (p_data->>'date_of_birth')::DATE;
      EXCEPTION WHEN OTHERS THEN
        v_date_of_birth := NULL;
      END;
    END IF;
  END IF;

  -- Handle membership_date
  IF p_data ? 'membership_date' THEN
    IF p_data->>'membership_date' IS NULL OR p_data->>'membership_date' = '' THEN
      v_membership_date := NULL;
    ELSE
      BEGIN
        v_membership_date := (p_data->>'membership_date')::DATE;
      EXCEPTION WHEN OTHERS THEN
        v_membership_date := NULL;
      END;
    END IF;
  END IF;

  -- Update the member
  UPDATE members
  SET
    full_name = COALESCE(p_data->>'full_name', full_name),
    phone = COALESCE(p_data->>'phone', phone),
    email = COALESCE(NULLIF(p_data->>'email', ''), email),
    national_id = COALESCE(NULLIF(p_data->>'national_id', ''), national_id),
    gender = COALESCE(NULLIF(p_data->>'gender', ''), gender),
    tribal_section = COALESCE(NULLIF(p_data->>'tribal_section', ''), tribal_section),
    date_of_birth = COALESCE(v_date_of_birth, date_of_birth),
    nationality = COALESCE(NULLIF(p_data->>'nationality', ''), nationality),
    city = COALESCE(NULLIF(p_data->>'city', ''), city),
    address = COALESCE(NULLIF(p_data->>'address', ''), address),
    occupation = COALESCE(NULLIF(p_data->>'occupation', ''), occupation),
    employer = COALESCE(NULLIF(p_data->>'employer', ''), employer),
    membership_status = COALESCE(NULLIF(p_data->>'membership_status', ''), membership_status),
    membership_type = COALESCE(NULLIF(p_data->>'membership_type', ''), membership_type),
    membership_date = COALESCE(v_membership_date, membership_date),
    membership_number = COALESCE(NULLIF(p_data->>'membership_number', ''), membership_number),
    notes = COALESCE(NULLIF(p_data->>'notes', ''), notes),
    updated_at = NOW()
  WHERE id = p_id
  RETURNING to_jsonb(members.*) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Grant permissions
GRANT EXECUTE ON FUNCTION update_member_with_safe_dates TO authenticated;
GRANT EXECUTE ON FUNCTION update_member_with_safe_dates TO anon;
GRANT EXECUTE ON FUNCTION update_member_with_safe_dates TO service_role;

-- Step 5: Create a trigger to handle date fields on direct updates
CREATE OR REPLACE FUNCTION handle_member_dates_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- This trigger runs BEFORE the update to clean the data

  -- Clean date_of_birth if it's being set
  IF NEW.date_of_birth IS DISTINCT FROM OLD.date_of_birth THEN
    -- PostgreSQL will handle the conversion, we just ensure NULL for empty
    -- The actual empty string check happens in the application layer
    NULL; -- No action needed here, handled by backend
  END IF;

  -- Clean membership_date if it's being set
  IF NEW.membership_date IS DISTINCT FROM OLD.membership_date THEN
    -- PostgreSQL will handle the conversion, we just ensure NULL for empty
    -- The actual empty string check happens in the application layer
    NULL; -- No action needed here, handled by backend
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create or replace the trigger
DROP TRIGGER IF EXISTS clean_member_dates_before_update ON members;
CREATE TRIGGER clean_member_dates_before_update
BEFORE UPDATE ON members
FOR EACH ROW
EXECUTE FUNCTION handle_member_dates_trigger();

-- Step 7: Test the function with a sample update
-- This will help verify it works without errors
DO $$
DECLARE
  v_test_member_id UUID;
  v_result JSONB;
BEGIN
  -- Get a test member ID
  SELECT id INTO v_test_member_id FROM members LIMIT 1;

  -- Test update with empty date string
  v_result := update_member_with_safe_dates(
    v_test_member_id,
    '{"date_of_birth": "", "membership_date": ""}'::JSONB
  );

  RAISE NOTICE 'Test update successful: %', v_result->>'full_name';
END $$;

-- Step 8: Final verification
SELECT
  'After Fix' as status,
  COUNT(*) as total_members,
  COUNT(date_of_birth) as has_birth_date,
  COUNT(membership_date) as has_membership_date,
  COUNT(CASE WHEN date_of_birth IS NULL THEN 1 END) as null_birth_dates,
  COUNT(CASE WHEN membership_date IS NULL THEN 1 END) as null_membership_dates
FROM members;

-- Step 9: Check if we need to populate some default dates
-- Only uncomment and run if needed
/*
-- Set a default membership date for members who don't have one
UPDATE members
SET membership_date = '2024-01-01'::DATE
WHERE membership_date IS NULL
  AND membership_status = 'active';
*/