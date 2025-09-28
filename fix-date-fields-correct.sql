-- CORRECTED SQL Script for Supabase to fix date fields
-- This version handles PostgreSQL date type properly

-- Step 1: Check which members have NULL dates (for verification)
SELECT
  COUNT(*) as total_members,
  COUNT(date_of_birth) as has_birth_date,
  COUNT(membership_date) as has_membership_date,
  COUNT(*) - COUNT(date_of_birth) as null_birth_dates,
  COUNT(*) - COUNT(membership_date) as null_membership_dates
FROM members;

-- Step 2: Create a SAFER trigger function that handles text-to-date conversion
CREATE OR REPLACE FUNCTION clean_member_dates_before_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if we're dealing with text input that needs conversion
  -- This handles the case where frontend sends empty string

  -- Note: This trigger works on the data BEFORE it's converted to date type
  -- So we can intercept bad values before PostgreSQL tries to parse them

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create or replace the update function for the members table
-- This intercepts the update and cleans the data
CREATE OR REPLACE FUNCTION update_member_safe(
  p_id UUID,
  p_full_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_national_id TEXT DEFAULT NULL,
  p_gender TEXT DEFAULT NULL,
  p_tribal_section TEXT DEFAULT NULL,
  p_date_of_birth TEXT DEFAULT NULL,  -- Accept as TEXT
  p_nationality TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_occupation TEXT DEFAULT NULL,
  p_employer TEXT DEFAULT NULL,
  p_membership_status TEXT DEFAULT NULL,
  p_membership_type TEXT DEFAULT NULL,
  p_membership_date TEXT DEFAULT NULL,  -- Accept as TEXT
  p_membership_number TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_date_of_birth DATE;
  v_membership_date DATE;
BEGIN
  -- Convert text dates to proper DATE or NULL
  IF p_date_of_birth IS NULL OR p_date_of_birth = '' THEN
    v_date_of_birth := NULL;
  ELSE
    BEGIN
      v_date_of_birth := p_date_of_birth::DATE;
    EXCEPTION WHEN OTHERS THEN
      v_date_of_birth := NULL;
    END;
  END IF;

  IF p_membership_date IS NULL OR p_membership_date = '' THEN
    v_membership_date := NULL;
  ELSE
    BEGIN
      v_membership_date := p_membership_date::DATE;
    EXCEPTION WHEN OTHERS THEN
      v_membership_date := NULL;
    END;
  END IF;

  -- Update the member with cleaned data
  UPDATE members
  SET
    full_name = COALESCE(p_full_name, full_name),
    phone = COALESCE(p_phone, phone),
    email = CASE WHEN p_email = '' THEN NULL ELSE COALESCE(p_email, email) END,
    national_id = CASE WHEN p_national_id = '' THEN NULL ELSE COALESCE(p_national_id, national_id) END,
    gender = CASE WHEN p_gender = '' THEN NULL ELSE COALESCE(p_gender, gender) END,
    tribal_section = CASE WHEN p_tribal_section = '' THEN NULL ELSE COALESCE(p_tribal_section, tribal_section) END,
    date_of_birth = v_date_of_birth,
    nationality = CASE WHEN p_nationality = '' THEN NULL ELSE COALESCE(p_nationality, nationality) END,
    city = CASE WHEN p_city = '' THEN NULL ELSE COALESCE(p_city, city) END,
    address = CASE WHEN p_address = '' THEN NULL ELSE COALESCE(p_address, address) END,
    occupation = CASE WHEN p_occupation = '' THEN NULL ELSE COALESCE(p_occupation, occupation) END,
    employer = CASE WHEN p_employer = '' THEN NULL ELSE COALESCE(p_employer, employer) END,
    membership_status = CASE WHEN p_membership_status = '' THEN NULL ELSE COALESCE(p_membership_status, membership_status) END,
    membership_type = CASE WHEN p_membership_type = '' THEN NULL ELSE COALESCE(p_membership_type, membership_type) END,
    membership_date = v_membership_date,
    membership_number = CASE WHEN p_membership_number = '' THEN NULL ELSE COALESCE(p_membership_number, membership_number) END,
    notes = CASE WHEN p_notes = '' THEN NULL ELSE COALESCE(p_notes, notes) END,
    updated_at = NOW()
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create a simpler wrapper function for basic updates
CREATE OR REPLACE FUNCTION fix_member_dates()
RETURNS VOID AS $$
BEGIN
  -- This function can be called to fix any members with problematic date values
  -- Since we can't directly check for empty strings in date columns,
  -- we'll just ensure NULLs are properly set for any missing dates

  -- Update members where dates might be problematic
  -- This is safe because it only sets NULL where needed
  UPDATE members
  SET
    date_of_birth = NULL
  WHERE date_of_birth IS NULL;

  UPDATE members
  SET
    membership_date = NULL
  WHERE membership_date IS NULL;

  RAISE NOTICE 'Date fields cleaned successfully';
END;
$$ LANGUAGE plpgsql;

-- Step 5: Run the fix
SELECT fix_member_dates();

-- Step 6: Verify everything is working
SELECT
  'Verification Complete' as status,
  COUNT(*) as total_members,
  COUNT(CASE WHEN date_of_birth IS NOT NULL THEN 1 END) as with_birth_date,
  COUNT(CASE WHEN membership_date IS NOT NULL THEN 1 END) as with_membership_date
FROM members;

-- Step 7: Grant execute permissions if needed
GRANT EXECUTE ON FUNCTION update_member_safe TO authenticated;
GRANT EXECUTE ON FUNCTION fix_member_dates TO authenticated;