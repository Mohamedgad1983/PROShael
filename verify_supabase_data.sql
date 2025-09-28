-- ================================================================================
-- SQL SCRIPT TO VERIFY SUPABASE DATA ACCURACY
-- Run this in Supabase SQL Editor to verify your member data
-- ================================================================================

-- 1. BASIC STATISTICS
-- ================================================================================
SELECT
    '📊 TOTAL MEMBERS COUNT' as metric,
    COUNT(*) as value
FROM members;

-- 2. CHECK FOR DUPLICATES
-- ================================================================================
SELECT
    '🔍 DUPLICATE CHECK' as check_type,
    COUNT(*) as total_rows,
    COUNT(DISTINCT id) as unique_members,
    COUNT(*) - COUNT(DISTINCT id) as duplicates
FROM members;

-- 3. TRIBAL SECTION DISTRIBUTION (REAL DATA)
-- ================================================================================
SELECT
    '📊 TRIBAL SECTION DISTRIBUTION' as report_type,
    tribal_section,
    COUNT(*) as member_count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM members), 2) as percentage,
    SUM(COALESCE(balance, 0)) as total_balance,
    ROUND(AVG(COALESCE(balance, 0)), 2) as avg_balance
FROM members
WHERE tribal_section IS NOT NULL
GROUP BY tribal_section
ORDER BY member_count DESC;

-- 4. CHECK FOR NULL/EMPTY TRIBAL SECTIONS
-- ================================================================================
SELECT
    '⚠️ MEMBERS WITHOUT TRIBAL SECTION' as issue,
    COUNT(*) as count,
    STRING_AGG(full_name, ', ' ORDER BY full_name) as member_names
FROM members
WHERE tribal_section IS NULL OR tribal_section = '';

-- 5. BALANCE ANALYSIS
-- ================================================================================
SELECT
    '💰 BALANCE STATISTICS' as metric,
    COUNT(*) as total_members,
    SUM(COALESCE(balance, 0)) as total_balance,
    ROUND(AVG(COALESCE(balance, 0)), 2) as avg_balance,
    MIN(COALESCE(balance, 0)) as min_balance,
    MAX(COALESCE(balance, 0)) as max_balance,
    COUNT(CASE WHEN balance >= 3000 THEN 1 END) as compliant_members,
    COUNT(CASE WHEN balance < 3000 OR balance IS NULL THEN 1 END) as non_compliant_members
FROM members;

-- 6. VERIFY EXPECTED TRIBAL SECTIONS (Based on Excel Data)
-- ================================================================================
WITH expected_tribes AS (
    SELECT * FROM (VALUES
        ('رشود', 172),
        ('الدغيش', 45),
        ('رشيد', 36),
        ('العيد', 14),
        ('الرشيد', 12),
        ('الشبيعان', 5),
        ('المسعود', 4),
        ('عقاب', 1)
    ) AS t(section_name, expected_count)
),
actual_tribes AS (
    SELECT
        tribal_section,
        COUNT(*) as actual_count
    FROM members
    WHERE tribal_section IS NOT NULL
    GROUP BY tribal_section
)
SELECT
    '🔍 DATA VERIFICATION' as check_type,
    e.section_name as tribal_section,
    e.expected_count as expected_members,
    COALESCE(a.actual_count, 0) as actual_members,
    COALESCE(a.actual_count, 0) - e.expected_count as difference,
    CASE
        WHEN COALESCE(a.actual_count, 0) = e.expected_count THEN '✅ MATCH'
        WHEN ABS(COALESCE(a.actual_count, 0) - e.expected_count) <= 2 THEN '🟡 CLOSE'
        ELSE '🔴 MISMATCH'
    END as status
FROM expected_tribes e
LEFT JOIN actual_tribes a ON e.section_name = a.tribal_section
ORDER BY e.expected_count DESC;

-- 7. CHECK MEMBER IDS FORMAT
-- ================================================================================
SELECT
    '🆔 MEMBER ID CHECK' as check_type,
    COUNT(*) as total,
    COUNT(CASE WHEN membership_number LIKE 'SH-%' THEN 1 END) as correct_format,
    COUNT(CASE WHEN membership_number NOT LIKE 'SH-%' OR membership_number IS NULL THEN 1 END) as incorrect_format
FROM members;

-- 8. CHECK FOR TEST DATA
-- ================================================================================
SELECT
    '🧪 TEST DATA CHECK' as check_type,
    COUNT(*) as potential_test_records
FROM members
WHERE
    full_name LIKE '%test%'
    OR full_name LIKE '%Test%'
    OR full_name LIKE '%TEST%'
    OR email LIKE '%test%'
    OR phone LIKE '0000%'
    OR phone LIKE '1234%';

-- 9. PAYMENT DATA CHECK (If payment columns exist)
-- ================================================================================
SELECT
    '💳 PAYMENT DATA CHECK' as check_type,
    COUNT(*) as members_with_payment_data,
    COUNT(CASE WHEN balance > 0 THEN 1 END) as members_with_positive_balance,
    COUNT(CASE WHEN balance = 0 OR balance IS NULL THEN 1 END) as members_without_balance
FROM members;

-- 10. SUMMARY REPORT
-- ================================================================================
WITH summary AS (
    SELECT
        (SELECT COUNT(*) FROM members) as total_members,
        (SELECT COUNT(DISTINCT tribal_section) FROM members WHERE tribal_section IS NOT NULL) as unique_tribes,
        (SELECT SUM(COALESCE(balance, 0)) FROM members) as total_balance,
        (SELECT COUNT(*) FROM members WHERE balance >= 3000) as compliant_count
)
SELECT
    '📈 FINAL SUMMARY' as report,
    total_members,
    unique_tribes,
    total_balance,
    compliant_count,
    ROUND(compliant_count * 100.0 / NULLIF(total_members, 0), 2) as compliance_percentage
FROM summary;

-- ================================================================================
-- 🎯 EXPECTED RESULTS (Based on Excel Analysis):
-- ================================================================================
-- Total Members: 289
-- Total Balance: 397,040 SAR
-- Tribal Distribution:
--   رشود: 172 members (59.5%)
--   الدغيش: 45 members (15.6%)
--   رشيد: 36 members (12.5%)
--   العيد: 14 members (4.8%)
--   الرشيد: 12 members (4.2%)
--   الشبيعان: 5 members (1.7%)
--   المسعود: 4 members (1.4%)
--   عقاب: 1 member (0.3%)
-- ================================================================================