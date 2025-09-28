-- Script to fix NULL gender and tribal_section values in members table
-- Run this in Supabase SQL Editor

-- Step 1: Check current status
SELECT
    'Total Members' as metric,
    COUNT(*) as count
FROM members
UNION ALL
SELECT
    'Members with NULL/empty gender' as metric,
    COUNT(*) as count
FROM members
WHERE gender IS NULL OR gender = ''
UNION ALL
SELECT
    'Members with NULL/empty tribal_section' as metric,
    COUNT(*) as count
FROM members
WHERE tribal_section IS NULL OR tribal_section = '';

-- Step 2: Show sample of current data before update
SELECT
    id,
    full_name,
    gender,
    tribal_section
FROM members
LIMIT 10;

-- Step 3: Update NULL/empty gender values to 'male'
UPDATE members
SET
    gender = 'male',
    updated_at = NOW()
WHERE gender IS NULL OR gender = '';

-- Step 4: Update NULL/empty tribal_section values to 'الدغيش'
UPDATE members
SET
    tribal_section = 'الدغيش',
    updated_at = NOW()
WHERE tribal_section IS NULL OR tribal_section = '';

-- Step 5: Verify the updates
SELECT
    'Members with NULL/empty gender after update' as metric,
    COUNT(*) as count
FROM members
WHERE gender IS NULL OR gender = ''
UNION ALL
SELECT
    'Members with NULL/empty tribal_section after update' as metric,
    COUNT(*) as count
FROM members
WHERE tribal_section IS NULL OR tribal_section = '';

-- Step 6: Show distribution of values after update
SELECT
    'Gender Distribution' as category,
    gender as value,
    COUNT(*) as count
FROM members
GROUP BY gender
UNION ALL
SELECT
    'Tribal Section Distribution' as category,
    tribal_section as value,
    COUNT(*) as count
FROM members
GROUP BY tribal_section
ORDER BY category, count DESC;

-- Step 7: Show sample of updated data
SELECT
    id,
    full_name,
    gender,
    tribal_section
FROM members
LIMIT 10;