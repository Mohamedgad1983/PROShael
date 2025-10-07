-- =====================================================
-- SUPABASE SECURITY AUDIT
-- =====================================================
-- Purpose: Understand current database access patterns
-- Risk Level: ZERO (Read-only queries)
-- Execution Time: ~30 seconds
-- Run this BEFORE making any changes
-- =====================================================

-- 1. Check RLS Status for All Tables
-- =====================================================
SELECT
    schemaname,
    tablename,
    CASE
        WHEN rowsecurity THEN '✅ ENABLED'
        ELSE '❌ DISABLED'
    END as rls_status,
    CASE
        WHEN rowsecurity THEN 'SECURE'
        ELSE '⚠️ VULNERABLE'
    END as security_level
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename NOT LIKE 'pg_%'
    AND tablename NOT LIKE 'sql_%'
ORDER BY
    rowsecurity ASC,
    tablename;

-- 2. List All RLS Policies (Current Protection)
-- =====================================================
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Check Security Definer Functions/Views
-- =====================================================
SELECT
    n.nspname as schema,
    p.proname as name,
    CASE p.prokind
        WHEN 'f' THEN 'FUNCTION'
        WHEN 'p' THEN 'PROCEDURE'
        WHEN 'a' THEN 'AGGREGATE'
        WHEN 'w' THEN 'WINDOW'
        ELSE 'OTHER'
    END as type,
    CASE
        WHEN p.prosecdef THEN '⚠️ SECURITY DEFINER'
        ELSE '✅ SECURITY INVOKER'
    END as security_mode,
    pg_get_userbyid(p.proowner) as owner
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.prosecdef = true
ORDER BY p.proname;

-- 4. Check Views with Security Definer
-- =====================================================
SELECT
    schemaname,
    viewname,
    viewowner,
    definition
FROM pg_views
WHERE schemaname = 'public'
    AND viewname IN (
        'member_payment_analytics',
        'member_financial_summary',
        'v_subscription_overview'
    )
ORDER BY viewname;

-- 5. Count Records per Table (Understand Data Volume)
-- =====================================================
SELECT
    schemaname,
    relname as tablename,
    n_live_tup as row_count,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) as total_size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- 6. Check Which Tables Have Foreign Keys (Dependencies)
-- =====================================================
SELECT DISTINCT
    tc.table_schema,
    tc.table_name,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- 7. Check Members Table Structure (Most Critical)
-- =====================================================
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'members'
ORDER BY ordinal_position;

-- 8. Test Current Authentication Claims
-- =====================================================
-- Run this to see what JWT claims your users have
SELECT
    auth.uid() as user_id,
    auth.role() as auth_role,
    auth.jwt() ->> 'role' as jwt_role,
    auth.jwt() ->> 'user_type' as jwt_user_type,
    auth.jwt() ->> 'email' as jwt_email;

-- =====================================================
-- EXPECTED OUTPUT ANALYSIS
-- =====================================================
--
-- Query 1: Should show 14 tables with RLS DISABLED
-- Query 2: Will show existing RLS policies (if any)
-- Query 3: Should identify the 3 Security Definer issues
-- Query 4: Should return the 3 problematic views
-- Query 5: Helps understand which tables have most data
-- Query 6: Shows dependencies (careful with foreign keys!)
-- Query 7: Verifies members table structure
-- Query 8: Shows what auth info is available for policies
--
-- SAVE THIS OUTPUT - You'll need it for rollback reference
-- =====================================================

-- 9. Generate Backup Commands (for safety)
-- =====================================================
SELECT
    'pg_dump --table=' || tablename || ' --data-only --file=backup_' || tablename || '.sql' as backup_command
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'news_reactions',
        'news_views',
        'push_notification_tokens',
        'notifications',
        'family_relationships',
        'family_tree_positions',
        'document_categories',
        'family_branches',
        'bank_statements',
        'expense_receipts',
        'expense_categories',
        'document_processing_queue'
    )
ORDER BY tablename;

-- =====================================================
-- POST-AUDIT CHECKLIST
-- =====================================================
-- [ ] Save all query results to a file
-- [ ] Document current user counts and access patterns
-- [ ] Identify which tables have the most traffic
-- [ ] Verify JWT claims structure matches expectations
-- [ ] Confirm backup strategy is in place
-- [ ] Review with team before proceeding
-- =====================================================
