-- =====================================================
-- CLEANUP PHASE 2 - Remove Partial Migration
-- =====================================================
-- Purpose: Clean up any partially created policies from failed Phase 2 attempt
-- Risk Level: LOW
-- Run this BEFORE re-running Phase 2 fixed script
-- =====================================================

-- Drop all Phase 2 policies if they exist

-- news_reactions policies
DROP POLICY IF EXISTS "members_read_all_reactions" ON public.news_reactions;
DROP POLICY IF EXISTS "members_insert_own_reaction" ON public.news_reactions;
DROP POLICY IF EXISTS "members_delete_own_reaction" ON public.news_reactions;
DROP POLICY IF EXISTS "admin_manage_reactions" ON public.news_reactions;

-- news_views policies
DROP POLICY IF EXISTS "members_read_own_views" ON public.news_views;
DROP POLICY IF EXISTS "system_insert_views" ON public.news_views;
DROP POLICY IF EXISTS "admin_manage_views" ON public.news_views;

-- notifications policies
DROP POLICY IF EXISTS "members_read_own_notifications" ON public.notifications;
DROP POLICY IF EXISTS "members_update_own_notifications" ON public.notifications;
DROP POLICY IF EXISTS "admin_manage_notifications" ON public.notifications;

-- push_notification_tokens policies
DROP POLICY IF EXISTS "members_manage_own_tokens" ON public.push_notification_tokens;

-- family_relationships policies
DROP POLICY IF EXISTS "authenticated_read_relationships" ON public.family_relationships;
DROP POLICY IF EXISTS "admin_manage_relationships" ON public.family_relationships;

-- family_tree_positions policies
DROP POLICY IF EXISTS "authenticated_read_positions" ON public.family_tree_positions;
DROP POLICY IF EXISTS "admin_manage_positions" ON public.family_tree_positions;

-- document_processing_queue policies
DROP POLICY IF EXISTS "admin_system_only" ON public.document_processing_queue;

-- Disable RLS on tables (to reset to clean state)
ALTER TABLE public.news_reactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_views DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_notification_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_relationships DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_tree_positions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_processing_queue DISABLE ROW LEVEL SECURITY;

-- Verify cleanup
SELECT
    tablename,
    CASE WHEN rowsecurity THEN '❌ STILL HAS RLS' ELSE '✅ CLEANED' END as status,
    (SELECT COUNT(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename) as remaining_policies
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'news_reactions',
        'news_views',
        'notifications',
        'push_notification_tokens',
        'family_relationships',
        'family_tree_positions',
        'document_processing_queue'
    )
ORDER BY tablename;

-- Expected: All tables should show "✅ CLEANED" and 0 remaining_policies

-- =====================================================
-- NEXT STEP
-- =====================================================
-- After running this cleanup, run:
-- 03_phase2_medium_risk_tables_FIXED.sql
-- =====================================================
