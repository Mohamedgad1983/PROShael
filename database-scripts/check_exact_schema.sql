-- =====================================================
-- CHECK EXACT DATABASE SCHEMA
-- Run this in Supabase SQL Editor and share the results
-- =====================================================

-- 1. Check members table columns
SELECT
    'MEMBERS TABLE' as table_info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'members'
ORDER BY ordinal_position;

-- 2. Check payments table columns
SELECT
    'PAYMENTS TABLE' as table_info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'payments'
ORDER BY ordinal_position;

-- 3. Check if subscriptions table exists
SELECT
    'SUBSCRIPTIONS TABLE' as table_info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'subscriptions'
ORDER BY ordinal_position;

-- 4. Get sample data to see actual field values
SELECT
    'SAMPLE MEMBER' as data_type,
    *
FROM members
LIMIT 1;

SELECT
    'SAMPLE PAYMENT' as data_type,
    *
FROM payments
LIMIT 1;