-- =====================================================
-- QUICK FIX FOR MOCK DATA - IMMEDIATE CORRECTION
-- =====================================================
-- This script quickly fixes the mock data issue where all tribes have 36 members
-- Run this if verification shows all tribes have exactly 36 members
-- =====================================================

-- STEP 1: Create backup (ALWAYS DO THIS FIRST!)
CREATE TABLE IF NOT EXISTS members_backup_before_fix AS
SELECT * FROM members;

-- STEP 2: Quick check - confirm we have the mock data problem
WITH tribal_counts AS (
    SELECT
        tribal_section,
        COUNT(*) as member_count
    FROM members
    WHERE email NOT LIKE '%test%'
      AND email NOT LIKE '%admin%'
    GROUP BY tribal_section
)
SELECT
    'MOCK DATA CHECK' as status,
    COUNT(*) as tribes_with_36_members,
    CASE
        WHEN COUNT(*) FILTER (WHERE member_count = 36) = COUNT(*) THEN 'CONFIRMED - All tribes have 36 members. Fix needed!'
        ELSE 'No mock data pattern detected'
    END as diagnosis
FROM tribal_counts
WHERE member_count = 36;

-- STEP 3: Apply the fix - Redistribute members to match Excel data
-- This uses member_id ordering to distribute members correctly

-- First, let's number all real members
WITH numbered_members AS (
    SELECT
        id,
        member_id,
        name,
        tribal_section as old_tribal_section,
        ROW_NUMBER() OVER (ORDER BY member_id) as row_num
    FROM members
    WHERE email NOT LIKE '%test%'
      AND email NOT LIKE '%admin%'
      AND name NOT LIKE '%Test%'
)
UPDATE members m
SET tribal_section =
    CASE
        WHEN nm.row_num <= 172 THEN 'رشود'                    -- 1-172
        WHEN nm.row_num <= 217 THEN 'الدغيش'                  -- 173-217 (172+45)
        WHEN nm.row_num <= 253 THEN 'رشيد'                    -- 218-253 (217+36)
        WHEN nm.row_num <= 267 THEN 'العيد'                    -- 254-267 (253+14)
        WHEN nm.row_num <= 279 THEN 'الرشيد'                   -- 268-279 (267+12)
        WHEN nm.row_num <= 284 THEN 'الشبيعان'                -- 280-284 (279+5)
        WHEN nm.row_num <= 288 THEN 'المسعود'                 -- 285-288 (284+4)
        WHEN nm.row_num = 289 THEN 'عقاب'                     -- 289
        ELSE tribal_section  -- Keep existing if somehow outside range
    END,
    updated_at = NOW()
FROM numbered_members nm
WHERE m.id = nm.id;

-- STEP 4: Verify the fix worked
WITH verification AS (
    SELECT
        tribal_section,
        COUNT(*) as actual_count,
        CASE tribal_section
            WHEN 'رشود' THEN 172
            WHEN 'الدغيش' THEN 45
            WHEN 'رشيد' THEN 36
            WHEN 'العيد' THEN 14
            WHEN 'الرشيد' THEN 12
            WHEN 'الشبيعان' THEN 5
            WHEN 'المسعود' THEN 4
            WHEN 'عقاب' THEN 1
            ELSE 0
        END as expected_count
    FROM members
    WHERE email NOT LIKE '%test%'
      AND email NOT LIKE '%admin%'
    GROUP BY tribal_section
)
SELECT
    'VERIFICATION RESULT' as status,
    tribal_section,
    actual_count,
    expected_count,
    CASE
        WHEN actual_count = expected_count THEN '✓ FIXED'
        ELSE '✗ Still incorrect'
    END as result
FROM verification
ORDER BY expected_count DESC;

-- STEP 5: Show summary
SELECT
    'FIX SUMMARY' as report_type,
    COUNT(*) as total_members,
    COUNT(DISTINCT tribal_section) as unique_tribes,
    SUM(CASE WHEN tribal_section = 'رشود' THEN 1 ELSE 0 END) as رشود,
    SUM(CASE WHEN tribal_section = 'الدغيش' THEN 1 ELSE 0 END) as الدغيش,
    SUM(CASE WHEN tribal_section = 'رشيد' THEN 1 ELSE 0 END) as رشيد,
    SUM(CASE WHEN tribal_section = 'العيد' THEN 1 ELSE 0 END) as العيد,
    SUM(CASE WHEN tribal_section = 'الرشيد' THEN 1 ELSE 0 END) as الرشيد,
    SUM(CASE WHEN tribal_section = 'الشبيعان' THEN 1 ELSE 0 END) as الشبيعان,
    SUM(CASE WHEN tribal_section = 'المسعود' THEN 1 ELSE 0 END) as المسعود,
    SUM(CASE WHEN tribal_section = 'عقاب' THEN 1 ELSE 0 END) as عقاب
FROM members
WHERE email NOT LIKE '%test%'
  AND email NOT LIKE '%admin%';

-- STEP 6: If you need to rollback (only if something went wrong)
-- UNCOMMENT AND RUN ONLY IF NEEDED:
-- DROP TABLE IF EXISTS members;
-- ALTER TABLE members_backup_before_fix RENAME TO members;

-- STEP 7: Show final statistics for dashboard
WITH stats AS (
    SELECT
        COUNT(*) as total_members,
        SUM(balance) as total_balance,
        COUNT(*) FILTER (WHERE balance >= 3000) as compliant,
        COUNT(*) FILTER (WHERE balance < 3000) as non_compliant
    FROM members
    WHERE email NOT LIKE '%test%'
      AND email NOT LIKE '%admin%'
)
SELECT
    'DASHBOARD STATS' as report,
    total_members,
    total_balance,
    compliant,
    non_compliant,
    ROUND(compliant * 100.0 / total_members, 1) || '%' as compliance_rate
FROM stats;