-- =====================================================
-- FIX: Convert Views to SECURITY INVOKER (Fixed)
-- =====================================================
-- Purpose: Change new views from SECURITY DEFINER to SECURITY INVOKER
-- Risk Level: LOW
-- Execution Time: <30 seconds
-- =====================================================

-- The issue: CREATE OR REPLACE VIEW defaults to SECURITY DEFINER in Supabase
-- The fix: Use ALTER VIEW to change to SECURITY INVOKER

-- =====================================================
-- Change all _v2 views to SECURITY INVOKER
-- =====================================================

ALTER VIEW public.member_payment_analytics_v2 SET (security_invoker = true);
ALTER VIEW public.member_financial_summary_v2 SET (security_invoker = true);
ALTER VIEW public.v_subscription_overview_v2 SET (security_invoker = true);
ALTER VIEW public.member_payment_analytics_admin SET (security_invoker = true);

-- =====================================================
-- Verify the fix (Using pg_catalog)
-- =====================================================

-- Check if views are now SECURITY INVOKER
SELECT
    c.relname as viewname,
    CASE
        WHEN c.relkind = 'v' THEN 'VIEW'
        ELSE 'OTHER'
    END as object_type,
    CASE
        WHEN c.reloptions IS NULL THEN '⚠️ SECURITY DEFINER (default)'
        WHEN 'security_invoker=true' = ANY(c.reloptions) THEN '✅ SECURITY INVOKER'
        WHEN 'security_invoker=false' = ANY(c.reloptions) THEN '❌ SECURITY DEFINER (explicit)'
        ELSE '⚠️ SECURITY DEFINER (default)'
    END as security_mode
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
    AND c.relkind = 'v'
    AND (
        c.relname LIKE '%payment%'
        OR c.relname LIKE '%financial%'
        OR c.relname LIKE '%subscription%'
    )
ORDER BY c.relname;

-- Alternative verification using information_schema
SELECT
    table_name as viewname,
    CASE
        WHEN table_name LIKE '%_v2' OR table_name LIKE '%_admin' THEN '✅ Should be SECURITY INVOKER now'
        ELSE '⚠️ Old view - will be dropped later'
    END as expected_status
FROM information_schema.views
WHERE table_schema = 'public'
    AND (
        table_name LIKE '%payment%'
        OR table_name LIKE '%financial%'
        OR table_name LIKE '%subscription%'
    )
ORDER BY table_name;

-- =====================================================
-- Re-run Supabase Linter
-- =====================================================
-- After running this script:
-- 1. Go to Supabase Dashboard
-- 2. Navigate to Database → Linter
-- 3. Refresh/Re-run the linter
-- 4. The _v2 and _admin views should NO LONGER appear as errors
-- 5. Only the OLD views (without _v2) should still be flagged
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '✅ SECURITY INVOKER FIX APPLIED';
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'New views are now SECURITY INVOKER:';
    RAISE NOTICE '  - member_payment_analytics_v2 ✅';
    RAISE NOTICE '  - member_financial_summary_v2 ✅';
    RAISE NOTICE '  - v_subscription_overview_v2 ✅';
    RAISE NOTICE '  - member_payment_analytics_admin ✅';
    RAISE NOTICE '';
    RAISE NOTICE 'These views now respect RLS properly!';
    RAISE NOTICE '';
    RAISE NOTICE 'Old views still flagged (expected):';
    RAISE NOTICE '  - member_payment_analytics (drop after migration)';
    RAISE NOTICE '  - member_financial_summary (drop after migration)';
    RAISE NOTICE '  - v_subscription_overview (drop after migration)';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Refresh Supabase Linter to verify';
    RAISE NOTICE '2. Update backend code to use _v2 views';
    RAISE NOTICE '3. After 1 week stable, drop old views';
    RAISE NOTICE '═══════════════════════════════════════════════';
END $$;
