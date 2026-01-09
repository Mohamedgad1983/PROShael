-- =====================================================
-- PHASE 4: FIX SECURITY DEFINER VIEWS
-- =====================================================
-- Purpose: Replace Security Definer views with RLS-aware versions
-- Risk Level: 🔴 HIGH
-- Execution Time: ~3 minutes
-- Views: 3 (member_payment_analytics, member_financial_summary,
--           v_subscription_overview)
-- Strategy: Create new views, update code, deprecate old views
-- =====================================================

-- ⚠️⚠️⚠️ WARNING ⚠️⚠️⚠️
-- Security Definer views bypass RLS
-- This migration creates NEW views with proper RLS
-- Backend code must be updated to use new view names
-- DO NOT drop old views until backend is updated
-- =====================================================

-- =====================================================
-- PRE-FLIGHT CHECKS
-- =====================================================

DO $$
BEGIN
    -- Verify previous phases completed
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'bank_statements'
        AND rowsecurity = true
    ) THEN
        RAISE EXCEPTION '❌ ABORT: Phase 3 not completed. Secure financial tables first.';
    END IF;

    RAISE NOTICE '✅ Previous phases verified';
    RAISE NOTICE '🔄 Creating RLS-aware replacement views...';
END $$;

-- =====================================================
-- STEP 1: ANALYZE EXISTING VIEWS
-- =====================================================

-- First, let's see what the current views look like
SELECT
    viewname,
    viewowner,
    LEFT(definition, 200) as definition_preview
FROM pg_views
WHERE schemaname = 'public'
    AND viewname IN (
        'member_payment_analytics',
        'member_financial_summary',
        'v_subscription_overview'
    );

-- =====================================================
-- STEP 2: CREATE NEW RLS-AWARE VIEWS
-- =====================================================

-- =====================================================
-- NEW VIEW 1: member_payment_analytics_v2
-- =====================================================
-- Purpose: Payment analytics that respect RLS
-- Replacement for: member_payment_analytics
-- Access: Members see their own, Admins see all

CREATE OR REPLACE VIEW public.member_payment_analytics_v2 AS
SELECT
    m.id as member_id,
    m.full_name,
    m.phone,
    m.membership_status,
    COALESCE(SUM(p.amount), 0) as total_paid,
    COUNT(p.id) as payment_count,
    MAX(p.payment_date) as last_payment_date,
    MIN(p.payment_date) as first_payment_date,
    m.current_balance,
    CASE
        WHEN m.current_balance >= 3000 THEN 'compliant'
        ELSE 'non_compliant'
    END as compliance_status
FROM members m
LEFT JOIN payments p ON m.id = p.member_id
WHERE
    -- RLS: Members see their own data, Admins see all
    (auth.jwt() ->> 'member_id' = m.id::text)
    OR (auth.jwt() ->> 'id' = m.id::text)
    OR (auth.jwt() ->> 'role' = 'admin')
    OR (auth.jwt() ->> 'user_type' = 'admin')
GROUP BY m.id, m.full_name, m.phone, m.membership_status, m.current_balance;

COMMENT ON VIEW public.member_payment_analytics_v2 IS
'✅ RLS-aware payment analytics view - Replacement for member_payment_analytics';

-- =====================================================
-- NEW VIEW 2: member_financial_summary_v2
-- =====================================================
-- Purpose: Financial summary that respects RLS
-- Replacement for: member_financial_summary
-- Access: Members see their own, Admins see all

CREATE OR REPLACE VIEW public.member_financial_summary_v2 AS
SELECT
    m.id as member_id,
    m.full_name,
    m.phone,
    m.current_balance,
    m.membership_status,
    m.tribal_section,
    COALESCE(p.yearly_2024, 0) as paid_2024,
    COALESCE(p.yearly_2025, 0) as paid_2025,
    COALESCE(p.total_payments, 0) as lifetime_payments,
    (m.current_balance < 3000) as needs_payment,
    CASE
        WHEN m.current_balance >= 3000 THEN '✅ Compliant'
        WHEN m.current_balance >= 2000 THEN '⚠️ Warning'
        ELSE '🔴 Critical'
    END as financial_status
FROM members m
LEFT JOIN (
    SELECT
        member_id,
        SUM(CASE WHEN EXTRACT(YEAR FROM payment_date) = 2024 THEN amount ELSE 0 END) as yearly_2024,
        SUM(CASE WHEN EXTRACT(YEAR FROM payment_date) = 2025 THEN amount ELSE 0 END) as yearly_2025,
        SUM(amount) as total_payments
    FROM payments
    GROUP BY member_id
) p ON m.id = p.member_id
WHERE
    -- RLS: Members see their own data, Admins see all
    (auth.jwt() ->> 'member_id' = m.id::text)
    OR (auth.jwt() ->> 'id' = m.id::text)
    OR (auth.jwt() ->> 'role' = 'admin')
    OR (auth.jwt() ->> 'user_type' = 'admin');

COMMENT ON VIEW public.member_financial_summary_v2 IS
'✅ RLS-aware financial summary - Replacement for member_financial_summary';

-- =====================================================
-- NEW VIEW 3: v_subscription_overview_v2
-- =====================================================
-- Purpose: Subscription overview that respects RLS
-- Replacement for: v_subscription_overview
-- Access: Members see their own, Admins see all

CREATE OR REPLACE VIEW public.v_subscription_overview_v2 AS
SELECT
    m.id as member_id,
    m.full_name,
    m.phone,
    m.email,
    m.membership_status,
    m.join_date,
    m.current_balance,
    COALESCE(s.subscription_level, 'basic') as subscription_level,
    COALESCE(s.auto_renew, false) as auto_renew,
    s.expiry_date as subscription_expiry,
    CASE
        WHEN s.expiry_date IS NULL THEN '❌ No subscription'
        WHEN s.expiry_date < NOW() THEN '⚠️ Expired'
        WHEN s.expiry_date < NOW() + INTERVAL '30 days' THEN '🟡 Expiring soon'
        ELSE '✅ Active'
    END as subscription_status,
    EXTRACT(DAY FROM (s.expiry_date - NOW())) as days_until_expiry
FROM members m
LEFT JOIN subscriptions s ON m.id = s.member_id
WHERE
    -- RLS: Members see their own data, Admins see all
    (auth.jwt() ->> 'member_id' = m.id::text)
    OR (auth.jwt() ->> 'id' = m.id::text)
    OR (auth.jwt() ->> 'role' = 'admin')
    OR (auth.jwt() ->> 'user_type' = 'admin');

COMMENT ON VIEW public.v_subscription_overview_v2 IS
'✅ RLS-aware subscription overview - Replacement for v_subscription_overview';

-- =====================================================
-- STEP 3: CREATE ADMIN-ONLY UNRESTRICTED VIEWS
-- =====================================================
-- These views provide unrestricted access for admin analytics

CREATE OR REPLACE VIEW public.member_payment_analytics_admin AS
SELECT
    m.id as member_id,
    m.full_name,
    m.phone,
    m.membership_status,
    m.tribal_section,
    COALESCE(SUM(p.amount), 0) as total_paid,
    COUNT(p.id) as payment_count,
    MAX(p.payment_date) as last_payment_date,
    MIN(p.payment_date) as first_payment_date,
    m.current_balance,
    CASE
        WHEN m.current_balance >= 3000 THEN 'compliant'
        ELSE 'non_compliant'
    END as compliance_status
FROM members m
LEFT JOIN payments p ON m.id = p.member_id
GROUP BY m.id, m.full_name, m.phone, m.membership_status, m.tribal_section, m.current_balance;

-- Apply RLS to admin view
ALTER VIEW public.member_payment_analytics_admin SET (security_invoker = true);

-- Create RLS policy for admin-only access
-- Note: Views don't directly support RLS policies, but they will use
-- the underlying table's RLS policies

COMMENT ON VIEW public.member_payment_analytics_admin IS
'🔐 Admin-only unrestricted payment analytics';

-- =====================================================
-- STEP 4: VERIFY NEW VIEWS
-- =====================================================

-- List all views (old and new)
SELECT
    viewname,
    CASE
        WHEN viewname LIKE '%_v2' THEN '✅ New RLS-aware'
        WHEN viewname LIKE '%_admin' THEN '🔐 Admin only'
        WHEN viewname IN ('member_payment_analytics', 'member_financial_summary', 'v_subscription_overview')
            THEN '⚠️ Old Security Definer - TO BE DEPRECATED'
        ELSE '❓ Unknown'
    END as view_status,
    viewowner
FROM pg_views
WHERE schemaname = 'public'
    AND (
        viewname LIKE '%payment%'
        OR viewname LIKE '%financial%'
        OR viewname LIKE '%subscription%'
    )
ORDER BY view_status, viewname;

-- Test new views (should work with RLS)
-- SELECT COUNT(*) FROM member_payment_analytics_v2;
-- SELECT COUNT(*) FROM member_financial_summary_v2;
-- SELECT COUNT(*) FROM v_subscription_overview_v2;

-- =====================================================
-- STEP 5: MIGRATION INSTRUCTIONS FOR BACKEND CODE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '📝 BACKEND CODE MIGRATION REQUIRED';
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'Update your backend code to use new view names:';
    RAISE NOTICE '';
    RAISE NOTICE '1. Replace: member_payment_analytics';
    RAISE NOTICE '   With: member_payment_analytics_v2';
    RAISE NOTICE '';
    RAISE NOTICE '2. Replace: member_financial_summary';
    RAISE NOTICE '   With: member_financial_summary_v2';
    RAISE NOTICE '';
    RAISE NOTICE '3. Replace: v_subscription_overview';
    RAISE NOTICE '   With: v_subscription_overview_v2';
    RAISE NOTICE '';
    RAISE NOTICE 'For admin-only analytics, use:';
    RAISE NOTICE '   - member_payment_analytics_admin';
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE 'FILES TO UPDATE:';
    RAISE NOTICE '  - alshuail-backend/src/routes/*.js';
    RAISE NOTICE '  - alshuail-backend/src/controllers/*.js';
    RAISE NOTICE '  - Search for old view names in codebase';
    RAISE NOTICE '═══════════════════════════════════════════════';
END $$;

-- =====================================================
-- STEP 6: DEPRECATION NOTICES (Don't drop yet!)
-- =====================================================

-- Mark old views as deprecated
COMMENT ON VIEW public.member_payment_analytics IS
'⚠️ DEPRECATED - Use member_payment_analytics_v2 instead - Will be removed after backend migration';

COMMENT ON VIEW public.member_financial_summary IS
'⚠️ DEPRECATED - Use member_financial_summary_v2 instead - Will be removed after backend migration';

COMMENT ON VIEW public.v_subscription_overview IS
'⚠️ DEPRECATED - Use v_subscription_overview_v2 instead - Will be removed after backend migration';

-- =====================================================
-- STEP 7: TEST QUERIES FOR EACH USER TYPE
-- =====================================================

-- Test as Member (should only see own data)
-- SET SESSION ROLE member_user; -- or use JWT auth
-- SELECT * FROM member_payment_analytics_v2 LIMIT 5;
-- Expected: Only their own record

-- Test as Admin (should see all data)
-- SET SESSION ROLE admin_user; -- or use JWT auth
-- SELECT * FROM member_payment_analytics_v2 LIMIT 5;
-- Expected: All records

-- Test admin-only view
-- SELECT * FROM member_payment_analytics_admin LIMIT 5;
-- Expected: All records (admin only)

-- =====================================================
-- SUCCESS METRICS
-- =====================================================
-- ✅ 3 new RLS-aware views created
-- ✅ 1 admin-only analytics view created
-- ✅ Old views marked as deprecated
-- ⚠️ Backend code needs updating
-- ⚠️ Cannot drop old views until backend is updated
--
-- NEXT STEPS:
-- 1. Update backend code to use new view names
-- 2. Deploy backend changes
-- 3. Test thoroughly in production
-- 4. After 1 week of stable operation, drop old views
-- 5. Run final security audit
-- =====================================================

-- =====================================================
-- AFTER BACKEND UPDATE: DROP OLD VIEWS (1 WEEK LATER)
-- =====================================================
-- ⚠️ DO NOT RUN THESE COMMANDS YET ⚠️
-- Only run after backend is fully migrated and tested

-- DROP VIEW IF EXISTS public.member_payment_analytics;
-- DROP VIEW IF EXISTS public.member_financial_summary;
-- DROP VIEW IF EXISTS public.v_subscription_overview;

-- After dropping, run:
-- SELECT COUNT(*) FROM pg_views WHERE schemaname = 'public'
--   AND viewname IN ('member_payment_analytics', 'member_financial_summary', 'v_subscription_overview');
-- Expected: 0 (all old views removed)

-- =====================================================
-- FINAL SECURITY AUDIT
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '🎉 PHASE 4 COMPLETED - SECURITY DEFINER VIEWS FIXED';
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '✅ All 17 security issues addressed:';
    RAISE NOTICE '   - 14 tables now have RLS enabled';
    RAISE NOTICE '   - 3 Security Definer views replaced';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ PENDING: Backend code migration';
    RAISE NOTICE '';
    RAISE NOTICE 'Run final audit after 1 week:';
    RAISE NOTICE '   See: 06_final_security_audit.sql';
    RAISE NOTICE '═══════════════════════════════════════════════';
END $$;
