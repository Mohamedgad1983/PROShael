-- Test the Supabase function directly
-- Run this in Supabase SQL Editor to verify it works

-- First, get a member ID to test with
WITH test_member AS (
  SELECT id, full_name, gender, tribal_section
  FROM members
  LIMIT 1
)
SELECT
  test_member.full_name as original_name,
  test_member.gender as original_gender,
  test_member.tribal_section as original_tribal,
  update_member_with_safe_dates(
    test_member.id,
    jsonb_build_object(
      'gender', CASE WHEN test_member.gender = 'male' THEN 'female' ELSE 'male' END,
      'tribal_section', 'الرشيد',
      'date_of_birth', '',  -- Testing empty date string
      'membership_date', '',  -- Testing empty date string
      'notes', 'Test from SQL Editor'
    )
  ) as update_result
FROM test_member;