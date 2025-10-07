-- =====================================================
-- ROLLBACK SCRIPT: Phase 1 - Low Risk Tables
-- =====================================================
-- Purpose: Undo Phase 1 RLS changes if issues occur
-- Risk: LOW - Safe to rollback
-- Execution Time: <30 seconds
-- =====================================================

-- ⚠️ WHEN TO USE THIS ROLLBACK:
-- - Reference data not loading in UI
-- - Document categories not visible
-- - Family tree not displaying
-- - Any errors related to these tables
-- =====================================================

BEGIN;

-- Document the rollback
DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '🔄 ROLLING BACK PHASE 1 CHANGES';
    RAISE NOTICE 'Time: %', NOW();
    RAISE NOTICE '═══════════════════════════════════════════════';
END $$;

-- =====================================================
-- TABLE 1: document_categories
-- =====================================================

-- Drop all policies
DROP POLICY IF EXISTS "public_read_document_categories" ON public.document_categories;
DROP POLICY IF EXISTS "admin_manage_document_categories" ON public.document_categories;

-- Disable RLS
ALTER TABLE public.document_categories DISABLE ROW LEVEL SECURITY;

-- Remove comment
COMMENT ON TABLE public.document_categories IS 'RLS Disabled - Rolled back to original state';

RAISE NOTICE '✅ document_categories: RLS disabled, policies removed';

-- =====================================================
-- TABLE 2: expense_categories
-- =====================================================

-- Drop all policies
DROP POLICY IF EXISTS "public_read_expense_categories" ON public.expense_categories;
DROP POLICY IF EXISTS "admin_manage_expense_categories" ON public.expense_categories;

-- Disable RLS
ALTER TABLE public.expense_categories DISABLE ROW LEVEL SECURITY;

-- Remove comment
COMMENT ON TABLE public.expense_categories IS 'RLS Disabled - Rolled back to original state';

RAISE NOTICE '✅ expense_categories: RLS disabled, policies removed';

-- =====================================================
-- TABLE 3: family_branches
-- =====================================================

-- Drop all policies
DROP POLICY IF EXISTS "authenticated_read_family_branches" ON public.family_branches;
DROP POLICY IF EXISTS "admin_manage_family_branches" ON public.family_branches;

-- Disable RLS
ALTER TABLE public.family_branches DISABLE ROW LEVEL SECURITY;

-- Remove comment
COMMENT ON TABLE public.family_branches IS 'RLS Disabled - Rolled back to original state';

RAISE NOTICE '✅ family_branches: RLS disabled, policies removed';

-- =====================================================
-- TABLE 4: members_backup_20250928_1039 (if exists)
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'members_backup_20250928_1039') THEN
        -- Drop all policies
        EXECUTE 'DROP POLICY IF EXISTS "admin_only_backup" ON public.members_backup_20250928_1039';

        -- Disable RLS
        EXECUTE 'ALTER TABLE public.members_backup_20250928_1039 DISABLE ROW LEVEL SECURITY';

        RAISE NOTICE '✅ members_backup_20250928_1039: RLS disabled, policies removed';
    ELSE
        RAISE NOTICE 'ℹ️ members_backup_20250928_1039: Table does not exist';
    END IF;
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check all tables have RLS disabled
SELECT
    tablename,
    CASE
        WHEN rowsecurity THEN '❌ STILL HAS RLS'
        ELSE '✅ RLS DISABLED'
    END as rollback_status
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'document_categories',
        'expense_categories',
        'family_branches',
        'members_backup_20250928_1039'
    )
ORDER BY tablename;

-- Verify no policies remain
SELECT
    tablename,
    COUNT(*) as remaining_policies
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN (
        'document_categories',
        'expense_categories',
        'family_branches',
        'members_backup_20250928_1039'
    )
GROUP BY tablename;

-- Expected: 0 results (no remaining policies)

-- =====================================================
-- TEST DATA ACCESS
-- =====================================================

-- These should now work without authentication
SELECT COUNT(*) as doc_categories FROM document_categories;
SELECT COUNT(*) as expense_categories FROM expense_categories;
SELECT COUNT(*) as family_branches FROM family_branches;

DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '✅ PHASE 1 ROLLBACK COMPLETED';
    RAISE NOTICE 'All tables returned to original state';
    RAISE NOTICE 'RLS disabled, policies removed';
    RAISE NOTICE '═══════════════════════════════════════════════';
END $$;

-- =====================================================
-- COMMIT OR ROLLBACK
-- =====================================================

-- If verification passed, commit:
COMMIT;

-- If verification failed, rollback:
-- ROLLBACK;

-- =====================================================
-- POST-ROLLBACK CHECKLIST
-- =====================================================
-- [ ] Verify admin dashboard loads
-- [ ] Check reference data displays
-- [ ] Test family tree functionality
-- [ ] Monitor logs for errors
-- [ ] Document why rollback was needed
-- [ ] Plan fixes before re-attempting
-- =====================================================
