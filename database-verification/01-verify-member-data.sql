-- =====================================================
-- COMPREHENSIVE MEMBER DATA VERIFICATION SCRIPT
-- =====================================================
-- This script verifies all aspects of member data in Supabase
-- Expected: 289 real members with specific tribal distribution
-- =====================================================

-- 1. CHECK TOTAL MEMBER COUNT
-- Expected: 289 real members (excluding test accounts if any)
SELECT
    'Total Members Check' as verification_type,
    COUNT(*) as actual_count,
    289 as expected_count,
    CASE
        WHEN COUNT(*) = 289 THEN '✓ PASS'
        ELSE '✗ FAIL - Count mismatch'
    END as status
FROM members
WHERE email NOT LIKE '%test%'
  AND email NOT LIKE '%admin%'
  AND name NOT LIKE '%Test%';

-- 2. CHECK TRIBAL DISTRIBUTION
-- Expected distribution from Excel data
WITH expected_distribution AS (
    SELECT 'رشود' as tribal_name, 172 as expected_count, 59.5 as expected_percentage
    UNION ALL SELECT 'الدغيش', 45, 15.6
    UNION ALL SELECT 'رشيد', 36, 12.5
    UNION ALL SELECT 'العيد', 14, 4.8
    UNION ALL SELECT 'الرشيد', 12, 4.2
    UNION ALL SELECT 'الشبيعان', 5, 1.7
    UNION ALL SELECT 'المسعود', 4, 1.4
    UNION ALL SELECT 'عقاب', 1, 0.3
),
actual_distribution AS (
    SELECT
        COALESCE(tribal_section, 'Unknown') as tribal_name,
        COUNT(*) as actual_count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as actual_percentage
    FROM members
    WHERE email NOT LIKE '%test%'
      AND email NOT LIKE '%admin%'
      AND name NOT LIKE '%Test%'
    GROUP BY tribal_section
)
SELECT
    'Tribal Distribution' as verification_type,
    COALESCE(e.tribal_name, a.tribal_name) as tribal_section,
    COALESCE(a.actual_count, 0) as actual_count,
    COALESCE(e.expected_count, 0) as expected_count,
    COALESCE(a.actual_percentage, 0) as actual_percentage,
    COALESCE(e.expected_percentage, 0) as expected_percentage,
    CASE
        WHEN COALESCE(a.actual_count, 0) = COALESCE(e.expected_count, 0) THEN '✓ MATCH'
        WHEN ABS(COALESCE(a.actual_count, 0) - COALESCE(e.expected_count, 0)) <= 2 THEN '~ CLOSE'
        ELSE '✗ MISMATCH'
    END as status
FROM expected_distribution e
FULL OUTER JOIN actual_distribution a ON e.tribal_name = a.tribal_name
ORDER BY COALESCE(e.expected_count, 0) DESC;

-- 3. CHECK FOR MOCK DATA PATTERNS
-- Mock data had exactly 36 members per tribe - this should NOT exist
SELECT
    'Mock Data Pattern Check' as verification_type,
    tribal_section,
    COUNT(*) as member_count,
    CASE
        WHEN COUNT(*) = 36 THEN '✗ SUSPICIOUS - Likely mock data!'
        ELSE '✓ OK'
    END as status
FROM members
WHERE email NOT LIKE '%test%'
  AND email NOT LIKE '%admin%'
GROUP BY tribal_section
HAVING COUNT(*) = 36;

-- 4. CHECK TOTAL BALANCE
-- Expected: 397,040 SAR total
SELECT
    'Total Balance Check' as verification_type,
    SUM(balance) as actual_total_balance,
    397040 as expected_total_balance,
    ABS(SUM(balance) - 397040) as difference,
    CASE
        WHEN ABS(SUM(balance) - 397040) < 100 THEN '✓ PASS'
        WHEN ABS(SUM(balance) - 397040) < 1000 THEN '~ CLOSE'
        ELSE '✗ FAIL - Large discrepancy'
    END as status
FROM members
WHERE email NOT LIKE '%test%'
  AND email NOT LIKE '%admin%';

-- 5. CHECK FOR DUPLICATE MEMBER IDS
SELECT
    'Duplicate Member IDs' as verification_type,
    member_id,
    COUNT(*) as occurrences,
    STRING_AGG(name, ', ') as member_names
FROM members
WHERE member_id IS NOT NULL
GROUP BY member_id
HAVING COUNT(*) > 1;

-- 6. CHECK FOR NULL OR EMPTY CRITICAL FIELDS
SELECT
    'Data Integrity Check' as verification_type,
    COUNT(*) FILTER (WHERE member_id IS NULL OR member_id = '') as null_member_ids,
    COUNT(*) FILTER (WHERE name IS NULL OR name = '') as null_names,
    COUNT(*) FILTER (WHERE tribal_section IS NULL OR tribal_section = '') as null_tribal_sections,
    COUNT(*) FILTER (WHERE phone IS NULL OR phone = '') as null_phones,
    COUNT(*) FILTER (WHERE balance IS NULL) as null_balances,
    CASE
        WHEN COUNT(*) FILTER (WHERE member_id IS NULL OR name IS NULL OR tribal_section IS NULL) = 0
        THEN '✓ PASS - All critical fields populated'
        ELSE '✗ FAIL - Missing critical data'
    END as status
FROM members
WHERE email NOT LIKE '%test%'
  AND email NOT LIKE '%admin%';

-- 7. CHECK MEMBER ID FORMAT
-- Member IDs should follow a consistent pattern (e.g., SH0001 to SH0289)
SELECT
    'Member ID Format Check' as verification_type,
    COUNT(*) as total_members,
    COUNT(*) FILTER (WHERE member_id ~ '^SH\d{4}$') as valid_format_count,
    COUNT(*) FILTER (WHERE member_id !~ '^SH\d{4}$') as invalid_format_count,
    CASE
        WHEN COUNT(*) = COUNT(*) FILTER (WHERE member_id ~ '^SH\d{4}$')
        THEN '✓ PASS - All IDs properly formatted'
        ELSE '✗ FAIL - Invalid ID formats found'
    END as status
FROM members
WHERE email NOT LIKE '%test%'
  AND email NOT LIKE '%admin%';

-- 8. LIST MEMBERS WITH INVALID FORMAT OR SUSPICIOUS DATA
SELECT
    'Suspicious Data Details' as verification_type,
    member_id,
    name,
    tribal_section,
    balance,
    phone,
    CASE
        WHEN member_id !~ '^SH\d{4}$' THEN 'Invalid ID format'
        WHEN balance < 0 THEN 'Negative balance'
        WHEN balance > 50000 THEN 'Unusually high balance'
        WHEN tribal_section NOT IN ('رشود', 'الدغيش', 'رشيد', 'العيد', 'الرشيد', 'الشبيعان', 'المسعود', 'عقاب')
        THEN 'Unknown tribal section'
        ELSE 'Other issue'
    END as issue
FROM members
WHERE email NOT LIKE '%test%'
  AND email NOT LIKE '%admin%'
  AND (
    member_id !~ '^SH\d{4}$'
    OR balance < 0
    OR balance > 50000
    OR tribal_section NOT IN ('رشود', 'الدغيش', 'رشيد', 'العيد', 'الرشيد', 'الشبيعان', 'المسعود', 'عقاب')
  )
LIMIT 20;

-- 9. CHECK BALANCE DISTRIBUTION
-- Analyze if balances follow expected patterns
SELECT
    'Balance Distribution' as verification_type,
    COUNT(*) FILTER (WHERE balance = 0) as zero_balance_count,
    COUNT(*) FILTER (WHERE balance > 0 AND balance < 1000) as under_1000,
    COUNT(*) FILTER (WHERE balance >= 1000 AND balance < 3000) as range_1000_3000,
    COUNT(*) FILTER (WHERE balance >= 3000 AND balance < 5000) as range_3000_5000,
    COUNT(*) FILTER (WHERE balance >= 5000) as over_5000,
    MIN(balance) as min_balance,
    MAX(balance) as max_balance,
    ROUND(AVG(balance), 2) as avg_balance,
    ROUND(STDDEV(balance), 2) as stddev_balance
FROM members
WHERE email NOT LIKE '%test%'
  AND email NOT LIKE '%admin%';

-- 10. FINAL SUMMARY
WITH summary AS (
    SELECT
        COUNT(*) as total_count,
        COUNT(DISTINCT tribal_section) as unique_tribes,
        SUM(balance) as total_balance,
        COUNT(*) FILTER (WHERE balance >= 3000) as compliant_count,
        COUNT(*) FILTER (WHERE balance < 3000) as non_compliant_count
    FROM members
    WHERE email NOT LIKE '%test%'
      AND email NOT LIKE '%admin%'
)
SELECT
    'FINAL SUMMARY' as verification_type,
    total_count,
    CASE WHEN total_count = 289 THEN '✓' ELSE '✗' END as count_ok,
    unique_tribes,
    CASE WHEN unique_tribes = 8 THEN '✓' ELSE '✗' END as tribes_ok,
    total_balance,
    CASE WHEN ABS(total_balance - 397040) < 1000 THEN '✓' ELSE '✗' END as balance_ok,
    compliant_count,
    non_compliant_count,
    ROUND(compliant_count * 100.0 / total_count, 1) as compliance_percentage
FROM summary;