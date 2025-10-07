-- =====================================================
-- FIX: Convert Views to SECURITY INVOKER
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
-- Verify the fix
-- =====================================================

-- Check view options (should show security_invoker = true)
SELECT
    viewname,
    CASE
        WHEN viewoptions IS NULL THEN '⚠️ SECURITY DEFINER (default)'
        WHEN 'security_invoker=true' = ANY(viewoptions) THEN '✅ SECURITY INVOKER'
        ELSE '❌ SECURITY DEFINER'
    END as security_mode
FROM pg_views
WHERE schemaname = 'public'
    AND (
        viewname LIKE '%_v2'
        OR viewname LIKE '%_admin'
        OR viewname IN ('member_payment_analytics', 'member_financial_summary', 'v_subscription_overview')
    )
ORDER BY viewname;

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
    RAISE NOTICE '═══════════════════════════════════════════════';
END $$;
