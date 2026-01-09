-- =====================================================
-- DIAGNOSTIC: Check payments and members tables
-- =====================================================
-- Purpose: Identify actual column names for Phase 4 views
-- Risk Level: ZERO (read-only)
-- =====================================================

-- Check members table columns
SELECT
    'members' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'members'
ORDER BY ordinal_position;

-- Check payments table columns
SELECT
    'payments' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'payments'
ORDER BY ordinal_position;

-- Check if subscriptions table exists
SELECT
    table_name,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
            AND information_schema.columns.table_name = t.table_name
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM (
    VALUES
        ('members'),
        ('payments'),
        ('subscriptions')
) AS t(table_name);

-- If subscriptions exists, show its columns
SELECT
    'subscriptions' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'subscriptions'
ORDER BY ordinal_position;

-- Show simple column summary
SELECT
    table_name,
    STRING_AGG(column_name, ', ' ORDER BY ordinal_position) as all_columns
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name IN ('members', 'payments', 'subscriptions')
GROUP BY table_name
ORDER BY table_name;
