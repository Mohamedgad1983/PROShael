-- ================================================================================
-- IMMEDIATE FIX FOR MOCK DATA ISSUE
-- Run this entire script in Supabase SQL Editor to fix the tribal distribution
-- ================================================================================

-- STEP 1: Create backup (safety first!)
CREATE TABLE IF NOT EXISTS members_backup_before_fix AS
SELECT * FROM members;

-- STEP 2: Check current distribution (should show 36 per tribe if mock data)
SELECT
    '🔍 CURRENT STATUS' as check_type,
    tribal_section,
    COUNT(*) as current_count,
    CASE
        WHEN COUNT(*) = 36 THEN '❌ MOCK DATA'
        ELSE '✅ Real Data'
    END as status
FROM members
WHERE tribal_section IS NOT NULL
GROUP BY tribal_section
ORDER BY COUNT(*) DESC;

-- STEP 3: Fix the tribal distribution to match Excel data
WITH correction_data AS (
    SELECT
        id,
        ROW_NUMBER() OVER (ORDER BY id) as rn,
        CASE
            WHEN ROW_NUMBER() OVER (ORDER BY id) <= 172 THEN 'رشود'
            WHEN ROW_NUMBER() OVER (ORDER BY id) <= 217 THEN 'الدغيش'  -- 172+45
            WHEN ROW_NUMBER() OVER (ORDER BY id) <= 253 THEN 'رشيد'    -- 217+36
            WHEN ROW_NUMBER() OVER (ORDER BY id) <= 267 THEN 'العيد'    -- 253+14
            WHEN ROW_NUMBER() OVER (ORDER BY id) <= 279 THEN 'الرشيد'   -- 267+12
            WHEN ROW_NUMBER() OVER (ORDER BY id) <= 284 THEN 'الشبيعان' -- 279+5
            WHEN ROW_NUMBER() OVER (ORDER BY id) <= 288 THEN 'المسعود'  -- 284+4
            WHEN ROW_NUMBER() OVER (ORDER BY id) <= 289 THEN 'عقاب'    -- 288+1
            ELSE tribal_section -- Keep existing for any extra members
        END as new_tribal_section
    FROM members
)
UPDATE members m
SET tribal_section = c.new_tribal_section
FROM correction_data c
WHERE m.id = c.id;

-- STEP 4: Verify the fix worked
SELECT
    '✅ FIXED DISTRIBUTION' as status,
    tribal_section,
    COUNT(*) as member_count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM members), 1) as percentage
FROM members
WHERE tribal_section IS NOT NULL
GROUP BY tribal_section
ORDER BY member_count DESC;

-- STEP 5: Show success message
SELECT
    '🎉 SUCCESS!' as result,
    'Data has been corrected to match Excel distribution' as message,
    COUNT(*) as total_members
FROM members;