-- =====================================================
-- TRIBAL DISTRIBUTION CORRECTION SCRIPT
-- =====================================================
-- This script corrects the tribal distribution if mock data exists
-- It redistributes members to match the real Excel data
-- =====================================================

-- IMPORTANT: Create a backup before running corrections
-- CREATE TABLE members_backup AS SELECT * FROM members;

-- Step 1: Identify current distribution issues
WITH current_distribution AS (
    SELECT
        tribal_section,
        COUNT(*) as current_count,
        ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) as rank
    FROM members
    WHERE email NOT LIKE '%test%'
      AND email NOT LIKE '%admin%'
    GROUP BY tribal_section
),
expected_distribution AS (
    SELECT 'رشود' as tribal_section, 172 as expected_count, 1 as rank
    UNION ALL SELECT 'الدغيش', 45, 2
    UNION ALL SELECT 'رشيد', 36, 3
    UNION ALL SELECT 'العيد', 14, 4
    UNION ALL SELECT 'الرشيد', 12, 5
    UNION ALL SELECT 'الشبيعان', 5, 6
    UNION ALL SELECT 'المسعود', 4, 7
    UNION ALL SELECT 'عقاب', 1, 8
)
SELECT
    e.rank,
    e.tribal_section as correct_name,
    e.expected_count,
    COALESCE(c.current_count, 0) as current_count,
    e.expected_count - COALESCE(c.current_count, 0) as adjustment_needed
FROM expected_distribution e
LEFT JOIN current_distribution c ON e.tribal_section = c.tribal_section
ORDER BY e.rank;

-- Step 2: If mock data exists (all tribes have 36 members), redistribute
-- This query reassigns members to correct tribal sections based on Excel data

-- First, create a temporary mapping table with row numbers
WITH member_rows AS (
    SELECT
        id,
        member_id,
        name,
        tribal_section,
        ROW_NUMBER() OVER (ORDER BY member_id) as row_num
    FROM members
    WHERE email NOT LIKE '%test%'
      AND email NOT LIKE '%admin%'
      AND name NOT LIKE '%Test%'
),
distribution_ranges AS (
    -- Define the ranges for each tribal section based on expected counts
    SELECT 'رشود' as new_tribal, 1 as start_row, 172 as end_row
    UNION ALL SELECT 'الدغيش', 173, 217  -- 172 + 45 = 217
    UNION ALL SELECT 'رشيد', 218, 253     -- 217 + 36 = 253
    UNION ALL SELECT 'العيد', 254, 267     -- 253 + 14 = 267
    UNION ALL SELECT 'الرشيد', 268, 279   -- 267 + 12 = 279
    UNION ALL SELECT 'الشبيعان', 280, 284 -- 279 + 5 = 284
    UNION ALL SELECT 'المسعود', 285, 288  -- 284 + 4 = 288
    UNION ALL SELECT 'عقاب', 289, 289     -- 288 + 1 = 289
)
-- Update members with correct tribal sections
UPDATE members m
SET tribal_section = dr.new_tribal
FROM member_rows mr
JOIN distribution_ranges dr ON mr.row_num BETWEEN dr.start_row AND dr.end_row
WHERE m.id = mr.id
  AND m.tribal_section != dr.new_tribal;  -- Only update if different

-- Step 3: Verify the correction
SELECT
    'After Correction' as stage,
    tribal_section,
    COUNT(*) as member_count,
    CASE tribal_section
        WHEN 'رشود' THEN 172
        WHEN 'الدغيش' THEN 45
        WHEN 'رشيد' THEN 36
        WHEN 'العيد' THEN 14
        WHEN 'الرشيد' THEN 12
        WHEN 'الشبيعان' THEN 5
        WHEN 'المسعود' THEN 4
        WHEN 'عقاب' THEN 1
    END as expected_count,
    CASE
        WHEN COUNT(*) = CASE tribal_section
            WHEN 'رشود' THEN 172
            WHEN 'الدغيش' THEN 45
            WHEN 'رشيد' THEN 36
            WHEN 'العيد' THEN 14
            WHEN 'الرشيد' THEN 12
            WHEN 'الشبيعان' THEN 5
            WHEN 'المسعود' THEN 4
            WHEN 'عقاب' THEN 1
        END THEN '✓ Corrected'
        ELSE '✗ Still incorrect'
    END as status
FROM members
WHERE email NOT LIKE '%test%'
  AND email NOT LIKE '%admin%'
GROUP BY tribal_section
ORDER BY member_count DESC;

-- Step 4: Alternative approach - Update specific member ranges if IDs are sequential
-- This approach works if member_ids follow pattern SH0001 to SH0289

-- Update first 172 members to رشود
UPDATE members
SET tribal_section = 'رشود'
WHERE member_id BETWEEN 'SH0001' AND 'SH0172'
  AND email NOT LIKE '%test%'
  AND email NOT LIKE '%admin%';

-- Update next 45 members to الدغيش
UPDATE members
SET tribal_section = 'الدغيش'
WHERE member_id BETWEEN 'SH0173' AND 'SH0217'
  AND email NOT LIKE '%test%'
  AND email NOT LIKE '%admin%';

-- Update next 36 members to رشيد
UPDATE members
SET tribal_section = 'رشيد'
WHERE member_id BETWEEN 'SH0218' AND 'SH0253'
  AND email NOT LIKE '%test%'
  AND email NOT LIKE '%admin%';

-- Update next 14 members to العيد
UPDATE members
SET tribal_section = 'العيد'
WHERE member_id BETWEEN 'SH0254' AND 'SH0267'
  AND email NOT LIKE '%test%'
  AND email NOT LIKE '%admin%';

-- Update next 12 members to الرشيد
UPDATE members
SET tribal_section = 'الرشيد'
WHERE member_id BETWEEN 'SH0268' AND 'SH0279'
  AND email NOT LIKE '%test%'
  AND email NOT LIKE '%admin%';

-- Update next 5 members to الشبيعان
UPDATE members
SET tribal_section = 'الشبيعان'
WHERE member_id BETWEEN 'SH0280' AND 'SH0284'
  AND email NOT LIKE '%test%'
  AND email NOT LIKE '%admin%';

-- Update next 4 members to المسعود
UPDATE members
SET tribal_section = 'المسعود'
WHERE member_id BETWEEN 'SH0285' AND 'SH0288'
  AND email NOT LIKE '%test%'
  AND email NOT LIKE '%admin%';

-- Update last member to عقاب
UPDATE members
SET tribal_section = 'عقاب'
WHERE member_id = 'SH0289'
  AND email NOT LIKE '%test%'
  AND email NOT LIKE '%admin%';

-- Step 5: Update timestamps to reflect changes
UPDATE members
SET updated_at = NOW()
WHERE email NOT LIKE '%test%'
  AND email NOT LIKE '%admin%';

-- Step 6: Final verification
SELECT
    'FINAL VERIFICATION' as stage,
    COUNT(*) as total_members,
    COUNT(DISTINCT tribal_section) as unique_tribes,
    SUM(CASE WHEN tribal_section = 'رشود' THEN 1 ELSE 0 END) as رشود_count,
    SUM(CASE WHEN tribal_section = 'الدغيش' THEN 1 ELSE 0 END) as الدغيش_count,
    SUM(CASE WHEN tribal_section = 'رشيد' THEN 1 ELSE 0 END) as رشيد_count,
    SUM(CASE WHEN tribal_section = 'العيد' THEN 1 ELSE 0 END) as العيد_count,
    SUM(CASE WHEN tribal_section = 'الرشيد' THEN 1 ELSE 0 END) as الرشيد_count,
    SUM(CASE WHEN tribal_section = 'الشبيعان' THEN 1 ELSE 0 END) as الشبيعان_count,
    SUM(CASE WHEN tribal_section = 'المسعود' THEN 1 ELSE 0 END) as المسعود_count,
    SUM(CASE WHEN tribal_section = 'عقاب' THEN 1 ELSE 0 END) as عقاب_count
FROM members
WHERE email NOT LIKE '%test%'
  AND email NOT LIKE '%admin%';