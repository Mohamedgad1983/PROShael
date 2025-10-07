-- =====================================================
-- ROLLBACK SCRIPT: Phase 2 - Medium Risk Tables
-- =====================================================
-- Purpose: Undo Phase 2 RLS changes if issues occur
-- Risk: MEDIUM - Test thoroughly after rollback
-- Execution Time: ~1 minute
-- =====================================================

-- ⚠️ WHEN TO USE THIS ROLLBACK:
-- - Members cannot see notifications
-- - News reactions not working
-- - Push notifications failing
-- - Family tree issues
-- - Document processing errors
-- =====================================================

BEGIN;

DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '🔄 ROLLING BACK PHASE 2 CHANGES';
    RAISE NOTICE 'Time: %', NOW();
    RAISE NOTICE 'MEDIUM RISK - Test all features after rollback';
    RAISE NOTICE '═══════════════════════════════════════════════';
END $$;

-- =====================================================
-- TABLE 1: news_reactions
-- =====================================================

DROP POLICY IF EXISTS "members_read_all_reactions" ON public.news_reactions;
DROP POLICY IF EXISTS "members_insert_own_reaction" ON public.news_reactions;
DROP POLICY IF EXISTS "members_delete_own_reaction" ON public.news_reactions;
DROP POLICY IF EXISTS "admin_manage_reactions" ON public.news_reactions;

ALTER TABLE public.news_reactions DISABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.news_reactions IS 'Rolled back - RLS disabled';

RAISE NOTICE '✅ news_reactions: Rolled back';

-- =====================================================
-- TABLE 2: news_views
-- =====================================================

DROP POLICY IF EXISTS "members_read_own_views" ON public.news_views;
DROP POLICY IF EXISTS "system_insert_views" ON public.news_views;
DROP POLICY IF EXISTS "admin_manage_views" ON public.news_views;

ALTER TABLE public.news_views DISABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.news_views IS 'Rolled back - RLS disabled';

RAISE NOTICE '✅ news_views: Rolled back';

-- =====================================================
-- TABLE 3: notifications
-- =====================================================

DROP POLICY IF EXISTS "members_read_own_notifications" ON public.notifications;
DROP POLICY IF EXISTS "members_update_own_notifications" ON public.notifications;
DROP POLICY IF EXISTS "admin_manage_notifications" ON public.notifications;

ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.notifications IS 'Rolled back - RLS disabled';

RAISE NOTICE '✅ notifications: Rolled back';

-- =====================================================
-- TABLE 4: push_notification_tokens
-- =====================================================

DROP POLICY IF EXISTS "members_manage_own_tokens" ON public.push_notification_tokens;

ALTER TABLE public.push_notification_tokens DISABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.push_notification_tokens IS 'Rolled back - RLS disabled';

RAISE NOTICE '✅ push_notification_tokens: Rolled back';

-- =====================================================
-- TABLE 5: family_relationships
-- =====================================================

DROP POLICY IF EXISTS "authenticated_read_relationships" ON public.family_relationships;
DROP POLICY IF EXISTS "admin_manage_relationships" ON public.family_relationships;

ALTER TABLE public.family_relationships DISABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.family_relationships IS 'Rolled back - RLS disabled';

RAISE NOTICE '✅ family_relationships: Rolled back';

-- =====================================================
-- TABLE 6: family_tree_positions
-- =====================================================

DROP POLICY IF EXISTS "authenticated_read_positions" ON public.family_tree_positions;
DROP POLICY IF EXISTS "admin_manage_positions" ON public.family_tree_positions;

ALTER TABLE public.family_tree_positions DISABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.family_tree_positions IS 'Rolled back - RLS disabled';

RAISE NOTICE '✅ family_tree_positions: Rolled back';

-- =====================================================
-- TABLE 7: document_processing_queue
-- =====================================================

DROP POLICY IF EXISTS "admin_system_only" ON public.document_processing_queue;

ALTER TABLE public.document_processing_queue DISABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.document_processing_queue IS 'Rolled back - RLS disabled';

RAISE NOTICE '✅ document_processing_queue: Rolled back';

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT
    tablename,
    CASE
        WHEN rowsecurity THEN '❌ STILL HAS RLS'
        ELSE '✅ RLS DISABLED'
    END as rollback_status,
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

DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '✅ PHASE 2 ROLLBACK COMPLETED';
    RAISE NOTICE '═══════════════════════════════════════════════';
END $$;

COMMIT;

-- =====================================================
-- POST-ROLLBACK TESTING
-- =====================================================
-- [ ] Test news reactions in member app
-- [ ] Verify notifications display
-- [ ] Check push notification registration
-- [ ] Test family tree viewing
-- [ ] Verify document processing
-- =====================================================
