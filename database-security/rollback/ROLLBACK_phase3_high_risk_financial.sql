-- =====================================================
-- EMERGENCY ROLLBACK: Phase 3 - Financial Tables
-- =====================================================
-- Purpose: URGENT rollback of financial table RLS
-- Risk: 🔴 CRITICAL - Use only in emergency
-- Execution Time: <30 seconds
-- =====================================================

-- 🚨 EMERGENCY USE ONLY 🚨
-- Run this immediately if:
-- - Admin cannot access financial data
-- - Bank statement uploads failing
-- - Financial reports broken
-- - Data appears corrupted
-- - Any financial operation fails
-- =====================================================

BEGIN;

DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '🚨 EMERGENCY ROLLBACK - FINANCIAL TABLES';
    RAISE NOTICE 'Time: %', NOW();
    RAISE NOTICE '🔴 CRITICAL: Restoring financial table access';
    RAISE NOTICE '═══════════════════════════════════════════════';
END $$;

-- =====================================================
-- PRE-ROLLBACK SNAPSHOT
-- =====================================================

-- Document current state for analysis
DO $$
DECLARE
    bank_count INT;
    receipt_count INT;
BEGIN
    SELECT COUNT(*) INTO bank_count FROM bank_statements;
    SELECT COUNT(*) INTO receipt_count FROM expense_receipts;

    RAISE NOTICE '📊 Pre-rollback record counts:';
    RAISE NOTICE '   - bank_statements: % (should match original)', bank_count;
    RAISE NOTICE '   - expense_receipts: % (should match original)', receipt_count;
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE NOTICE '⚠️ Cannot access tables (RLS blocking) - proceeding with rollback';
END $$;

-- =====================================================
-- TABLE 1: bank_statements - URGENT ROLLBACK
-- =====================================================

-- Drop all policies
DROP POLICY IF EXISTS "admin_only_bank_statements" ON public.bank_statements;
DROP POLICY IF EXISTS "deny_non_admin_bank_statements" ON public.bank_statements;

-- Disable RLS
ALTER TABLE public.bank_statements DISABLE ROW LEVEL SECURITY;

-- Update comment
COMMENT ON TABLE public.bank_statements IS
'⚠️ EMERGENCY ROLLBACK - RLS disabled - Investigate before re-enabling';

RAISE NOTICE '✅ bank_statements: RLS DISABLED - Full access restored';

-- =====================================================
-- TABLE 2: expense_receipts - URGENT ROLLBACK
-- =====================================================

-- Drop all policies
DROP POLICY IF EXISTS "admin_only_expense_receipts" ON public.expense_receipts;

-- Disable RLS
ALTER TABLE public.expense_receipts DISABLE ROW LEVEL SECURITY;

-- Update comment
COMMENT ON TABLE public.expense_receipts IS
'⚠️ EMERGENCY ROLLBACK - RLS disabled - Investigate before re-enabling';

RAISE NOTICE '✅ expense_receipts: RLS DISABLED - Full access restored';

-- =====================================================
-- IMMEDIATE VERIFICATION
-- =====================================================

-- Check RLS is disabled
SELECT
    tablename,
    CASE
        WHEN rowsecurity THEN '❌ FAILED - STILL HAS RLS'
        ELSE '✅ SUCCESS - RLS DISABLED'
    END as emergency_rollback_status
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('bank_statements', 'expense_receipts')
ORDER BY tablename;

-- Verify data access restored
DO $$
DECLARE
    bank_count INT;
    receipt_count INT;
BEGIN
    SELECT COUNT(*) INTO bank_count FROM bank_statements;
    SELECT COUNT(*) INTO receipt_count FROM expense_receipts;

    IF bank_count > 0 THEN
        RAISE NOTICE '✅ bank_statements: Access restored - % records', bank_count;
    ELSE
        RAISE WARNING '⚠️ bank_statements: Empty or still inaccessible';
    END IF;

    IF receipt_count >= 0 THEN
        RAISE NOTICE '✅ expense_receipts: Access restored - % records', receipt_count;
    ELSE
        RAISE WARNING '⚠️ expense_receipts: Empty or still inaccessible';
    END IF;
END $$;

-- =====================================================
-- COMMIT ROLLBACK
-- =====================================================

COMMIT;

DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '✅ EMERGENCY ROLLBACK COMPLETED';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ FINANCIAL TABLES NOW UNPROTECTED';
    RAISE NOTICE '⚠️ IMMEDIATE ACTIONS REQUIRED:';
    RAISE NOTICE '';
    RAISE NOTICE '1. Test admin dashboard financial section';
    RAISE NOTICE '2. Verify data integrity';
    RAISE NOTICE '3. Review error logs to identify root cause';
    RAISE NOTICE '4. Document what went wrong';
    RAISE NOTICE '5. Plan corrective action';
    RAISE NOTICE '6. DO NOT re-enable RLS until issue is resolved';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables affected:';
    RAISE NOTICE '  - bank_statements (now unprotected)';
    RAISE NOTICE '  - expense_receipts (now unprotected)';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ SECURITY ALERT: Financial data temporarily exposed';
    RAISE NOTICE '⚠️ Investigate and fix ASAP';
    RAISE NOTICE '═══════════════════════════════════════════════';
END $$;

-- =====================================================
-- POST-ROLLBACK CHECKLIST
-- =====================================================
-- IMMEDIATE (Within 1 hour):
-- [ ] Test all financial dashboard features
-- [ ] Verify bank statement access
-- [ ] Check expense receipt uploads
-- [ ] Test financial report generation
-- [ ] Verify data integrity (compare record counts)
--
-- WITHIN 24 HOURS:
-- [ ] Review application error logs
-- [ ] Identify root cause of RLS failure
-- [ ] Document incident for team
-- [ ] Plan corrective measures
-- [ ] Update RLS policies if needed
--
-- BEFORE RE-ENABLING RLS:
-- [ ] Fix identified issues
-- [ ] Test in staging environment
-- [ ] Create better rollback procedures
-- [ ] Schedule maintenance window
-- [ ] Notify team of planned re-enablement
-- =====================================================

-- =====================================================
-- INCIDENT LOGGING
-- =====================================================

-- Create incident log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.rls_incident_log (
    id SERIAL PRIMARY KEY,
    incident_time TIMESTAMP DEFAULT NOW(),
    phase TEXT,
    tables_affected TEXT[],
    reason TEXT,
    rolled_back BOOLEAN DEFAULT true,
    notes TEXT
);

-- Log this incident
INSERT INTO public.rls_incident_log (phase, tables_affected, reason, notes)
VALUES (
    'Phase 3 - Financial Tables',
    ARRAY['bank_statements', 'expense_receipts'],
    'Emergency rollback - Admin access issues',
    'RLS disabled on financial tables due to access problems. Investigate logs and fix before re-enabling.'
);

RAISE NOTICE '📝 Incident logged in rls_incident_log table';
