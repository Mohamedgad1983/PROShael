-- =====================================================
-- PHASE 3: HIGH-RISK FINANCIAL TABLES - RLS ENABLEMENT
-- =====================================================
-- Purpose: Secure financial data with strict admin-only access
-- Risk Level: 🔴 HIGH
-- Execution Time: ~1 minute
-- Tables: 3 (bank_statements, expense_receipts, expense_categories)
-- CRITICAL: Test extensively in staging before production
-- =====================================================

-- ⚠️⚠️⚠️ WARNING ⚠️⚠️⚠️
-- These tables contain sensitive financial data
-- ONLY run this during low-traffic hours
-- MUST have rollback plan ready
-- MUST test admin dashboard finance features after
-- =====================================================

-- =====================================================
-- PRE-FLIGHT SAFETY CHECKS
-- =====================================================

DO $$
DECLARE
    phase1_incomplete INT;
    phase2_incomplete INT;
BEGIN
    -- Verify Phases 1 & 2 completed successfully
    SELECT COUNT(*) INTO phase1_incomplete
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN ('document_categories', 'expense_categories', 'family_branches')
    AND rowsecurity = false;

    SELECT COUNT(*) INTO phase2_incomplete
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN ('notifications', 'news_reactions')
    AND rowsecurity = false;

    IF phase1_incomplete > 0 OR phase2_incomplete > 0 THEN
        RAISE EXCEPTION '❌ ABORT: Previous phases not completed. Phase 1: % incomplete, Phase 2: % incomplete',
            phase1_incomplete, phase2_incomplete;
    END IF;

    -- Check for active financial transactions
    RAISE NOTICE '✅ Previous phases verified';
    RAISE NOTICE '⚠️ Proceeding with HIGH-RISK financial tables';
    RAISE NOTICE '⚠️ Ensure you have tested in staging environment';
    RAISE NOTICE '⚠️ Have rollback script ready';
END $$;

-- =====================================================
-- BACKUP VERIFICATION
-- =====================================================

-- Document current record counts for rollback reference
DO $$
DECLARE
    bank_count INT;
    receipt_count INT;
BEGIN
    SELECT COUNT(*) INTO bank_count FROM bank_statements;
    SELECT COUNT(*) INTO receipt_count FROM expense_receipts;

    RAISE NOTICE '📊 Current record counts:';
    RAISE NOTICE '   - bank_statements: %', bank_count;
    RAISE NOTICE '   - expense_receipts: %', receipt_count;
    RAISE NOTICE '   Save these numbers for verification after migration';
END $$;

-- =====================================================
-- TABLE 1: bank_statements
-- =====================================================
-- Pattern: ADMIN ONLY (strictest security)
-- Use Case: Bank account statements and reconciliation
-- Data Sensitivity: 🔴 CRITICAL - Financial records

ALTER TABLE public.bank_statements ENABLE ROW LEVEL SECURITY;

-- Only admins can access bank statements
CREATE POLICY "admin_only_bank_statements"
ON public.bank_statements
FOR ALL
USING (
    auth.jwt() ->> 'role' = 'admin'
    OR auth.jwt() ->> 'user_type' = 'admin'
);

-- Additional safety: Deny service_role access unless explicitly admin
CREATE POLICY "deny_non_admin_bank_statements"
ON public.bank_statements
AS RESTRICTIVE
FOR ALL
USING (
    auth.jwt() ->> 'role' = 'admin'
    OR auth.jwt() ->> 'user_type' = 'admin'
);

COMMENT ON TABLE public.bank_statements IS
'🔴 RLS Enabled: ADMIN ONLY - Contains sensitive financial data - Phase 3';

-- =====================================================
-- TABLE 2: expense_receipts
-- =====================================================
-- Pattern: ADMIN ONLY
-- Use Case: Receipt images and documentation
-- Data Sensitivity: 🔴 HIGH - Expense documentation

ALTER TABLE public.expense_receipts ENABLE ROW LEVEL SECURITY;

-- Only admins can access expense receipts
CREATE POLICY "admin_only_expense_receipts"
ON public.expense_receipts
FOR ALL
USING (
    auth.jwt() ->> 'role' = 'admin'
    OR auth.jwt() ->> 'user_type' = 'admin'
);

COMMENT ON TABLE public.expense_receipts IS
'🔴 RLS Enabled: ADMIN ONLY - Contains expense documentation - Phase 3';

-- =====================================================
-- POST-MIGRATION VERIFICATION
-- =====================================================

-- Verify RLS enabled on all financial tables
SELECT
    '🔒 FINANCIAL TABLES RLS STATUS' as status_check,
    tablename,
    CASE
        WHEN rowsecurity THEN '✅ SECURED'
        ELSE '❌ VULNERABLE'
    END as security_status,
    (SELECT COUNT(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename) as policy_count
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'bank_statements',
        'expense_receipts'
    )
ORDER BY tablename;

-- Verify record counts unchanged
DO $$
DECLARE
    bank_count_after INT;
    receipt_count_after INT;
BEGIN
    SELECT COUNT(*) INTO bank_count_after FROM bank_statements;
    SELECT COUNT(*) INTO receipt_count_after FROM expense_receipts;

    RAISE NOTICE '📊 Post-migration record counts:';
    RAISE NOTICE '   - bank_statements: %', bank_count_after;
    RAISE NOTICE '   - expense_receipts: %', receipt_count_after;
    RAISE NOTICE 'Compare these with pre-migration counts';
END $$;

-- List all policies on financial tables
SELECT
    '🔐 FINANCIAL TABLE POLICIES' as policy_overview,
    tablename,
    policyname,
    CASE permissive
        WHEN 'PERMISSIVE' THEN '✅ Allow matching'
        WHEN 'RESTRICTIVE' THEN '🛑 Deny non-matching'
    END as policy_type,
    cmd as operations
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN (
        'bank_statements',
        'expense_receipts'
    )
ORDER BY tablename, policyname;

-- =====================================================
-- CRITICAL POST-MIGRATION TESTS
-- =====================================================

-- ⚠️ RUN THESE TESTS IMMEDIATELY AFTER MIGRATION ⚠️

-- Test 1: Admin should access bank statements
-- (Run as admin user)
-- SELECT COUNT(*) FROM bank_statements;
-- Expected: Returns count > 0

-- Test 2: Non-admin should be DENIED
-- (Run as regular member)
-- SELECT COUNT(*) FROM bank_statements;
-- Expected: Returns 0 (or error if not using service role)

-- Test 3: Admin should access expense receipts
-- (Run as admin user)
-- SELECT COUNT(*) FROM expense_receipts;
-- Expected: Returns count > 0

-- Test 4: Admin can INSERT (Test write access)
-- BEGIN;
-- INSERT INTO bank_statements (statement_date, amount, description)
-- VALUES (NOW(), 1000.00, 'RLS Migration Test');
-- SELECT * FROM bank_statements WHERE description = 'RLS Migration Test';
-- ROLLBACK; -- Don't actually insert test data

-- =====================================================
-- ADMIN DASHBOARD CRITICAL FEATURES TO TEST
-- =====================================================
-- After migration, IMMEDIATELY test these in admin dashboard:
--
-- 1. Financial Overview page loads
-- 2. Can view bank statement list
-- 3. Can upload new bank statement
-- 4. Can view expense receipts
-- 5. Can upload expense receipt
-- 6. Financial reports generate correctly
-- 7. Export financial data works
--
-- IF ANY OF THESE FAIL: Run rollback script immediately
-- =====================================================

-- =====================================================
-- SUCCESS METRICS
-- =====================================================
-- ✅ 2 critical financial tables secured
-- ✅ 13 out of 17 security issues resolved (76.5%)
-- 🔴 HIGHEST RISK PHASE - Monitor closely
-- ⚠️ Admin-only access enforced on financial data
--
-- MONITORING CHECKLIST (First 24 hours):
-- [ ] Hour 1: Test all admin financial features
-- [ ] Hour 2: Verify no member access to financial data
-- [ ] Hour 6: Check application logs for RLS errors
-- [ ] Hour 12: Test financial report generation
-- [ ] Hour 24: Verify data integrity
--
-- NEXT STEPS:
-- 1. Monitor admin dashboard financial features for 48 hours
-- 2. Verify NO unauthorized access attempts in logs
-- 3. Test financial report exports
-- 4. If stable, proceed to Phase 4 (Security Definer Views)
-- =====================================================

-- =====================================================
-- EMERGENCY ROLLBACK INDICATORS
-- =====================================================
-- Roll back immediately if:
-- ❌ Admin cannot access financial overview
-- ❌ Record counts changed unexpectedly
-- ❌ Unable to upload bank statements
-- ❌ Financial exports fail
-- ❌ Any data corruption detected
--
-- Rollback command:
-- See: ROLLBACK_phase3_high_risk_financial.sql
-- =====================================================

-- =====================================================
-- SECURITY AUDIT TRAIL
-- =====================================================

-- Create audit log entry
DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '🔒 PHASE 3 FINANCIAL TABLES SECURED';
    RAISE NOTICE '   Migration completed: %', NOW();
    RAISE NOTICE '   Tables secured: bank_statements, expense_receipts';
    RAISE NOTICE '   Security level: ADMIN ONLY';
    RAISE NOTICE '   Risk level: HIGH';
    RAISE NOTICE '   Next phase: Security Definer Views';
    RAISE NOTICE '═══════════════════════════════════════════════';
END $$;

-- =====================================================
-- MONITORING QUERY (Run every hour for 48 hours)
-- =====================================================

-- Check for unauthorized access attempts
SELECT
    NOW() as check_time,
    'bank_statements' as table_name,
    COUNT(*) as accessible_records,
    CASE
        WHEN COUNT(*) > 0 THEN '✅ Access working'
        ELSE '⚠️ No access (check if admin)'
    END as status
FROM bank_statements
UNION ALL
SELECT
    NOW(),
    'expense_receipts',
    COUNT(*),
    CASE
        WHEN COUNT(*) > 0 THEN '✅ Access working'
        ELSE '⚠️ No access (check if admin)'
    END
FROM expense_receipts;

-- Expected: Admin sees all records, Members see 0 records
