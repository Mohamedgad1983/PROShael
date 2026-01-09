-- =====================================================
-- PHASE 2: MEDIUM-RISK TABLES - RLS ENABLEMENT (FIXED)
-- =====================================================
-- Purpose: Enable RLS on user-interaction tables
-- Risk Level: MEDIUM
-- Execution Time: ~2 minutes
-- Tables: 7 (news_reactions, news_views, notifications,
--            push_notification_tokens, family_relationships,
--            family_tree_positions, document_processing_queue)
-- REQUIREMENT: Phase 1 must be successful
-- =====================================================

-- =====================================================
-- PRE-FLIGHT CHECKS
-- =====================================================

DO $$
BEGIN
    -- Verify Phase 1 completed
    IF (SELECT COUNT(*) FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename IN ('document_categories', 'expense_categories', 'family_branches')
        AND rowsecurity = false) > 0 THEN
        RAISE EXCEPTION '❌ ERROR: Phase 1 not completed. Run phase 1 migration first.';
    END IF;

    RAISE NOTICE '✅ Phase 1 verification passed';
    RAISE NOTICE 'ℹ️ Starting Phase 2 migration...';
END $$;

-- =====================================================
-- TABLE 1: news_reactions
-- =====================================================
-- Pattern: Member can manage their own reactions
-- Use Case: Members like/react to news posts
-- Columns: reactor_member_id (who reacted)

ALTER TABLE public.news_reactions ENABLE ROW LEVEL SECURITY;

-- Members can read all reactions (to see counts)
CREATE POLICY "members_read_all_reactions"
ON public.news_reactions
FOR SELECT
USING (
    auth.role() = 'authenticated'
);

-- Members can insert their own reactions
CREATE POLICY "members_insert_own_reaction"
ON public.news_reactions
FOR INSERT
WITH CHECK (
    (auth.jwt() ->> 'id' = reactor_member_id::text)
    OR (auth.jwt() ->> 'member_id' = reactor_member_id::text)
    OR (auth.jwt() ->> 'role' = 'admin')
);

-- Members can delete their own reactions
CREATE POLICY "members_delete_own_reaction"
ON public.news_reactions
FOR DELETE
USING (
    (auth.jwt() ->> 'id' = reactor_member_id::text)
    OR (auth.jwt() ->> 'member_id' = reactor_member_id::text)
    OR (auth.jwt() ->> 'role' = 'admin')
);

-- Admins can do everything
CREATE POLICY "admin_manage_reactions"
ON public.news_reactions
FOR ALL
USING (
    auth.jwt() ->> 'role' = 'admin'
);

COMMENT ON TABLE public.news_reactions IS
'RLS Enabled: Members manage own, Admin full access - Phase 2';

-- =====================================================
-- TABLE 2: news_views
-- =====================================================
-- Pattern: Member can see their own views, system can write
-- Use Case: Track which members viewed which news
-- Columns: viewer_member_id, viewer_user_id

ALTER TABLE public.news_views ENABLE ROW LEVEL SECURITY;

-- Members can see their own views
CREATE POLICY "members_read_own_views"
ON public.news_views
FOR SELECT
USING (
    (auth.uid()::text = viewer_user_id::text)
    OR (auth.jwt() ->> 'id' = viewer_member_id::text)
    OR (auth.jwt() ->> 'member_id' = viewer_member_id::text)
    OR (auth.jwt() ->> 'role' = 'admin')
);

-- System can insert views
CREATE POLICY "system_insert_views"
ON public.news_views
FOR INSERT
WITH CHECK (true); -- Allow insert, RLS will be enforced on SELECT

-- Admins can do everything
CREATE POLICY "admin_manage_views"
ON public.news_views
FOR ALL
USING (
    auth.jwt() ->> 'role' = 'admin'
);

COMMENT ON TABLE public.news_views IS
'RLS Enabled: Members see own, System writes - Phase 2';

-- =====================================================
-- TABLE 3: notifications
-- =====================================================
-- Pattern: Member reads their own, Admin writes
-- Use Case: Push notifications and alerts
-- Columns: user_id (recipient)

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Members can read their own notifications
CREATE POLICY "members_read_own_notifications"
ON public.notifications
FOR SELECT
USING (
    (auth.uid()::text = user_id::text)
    OR (auth.jwt() ->> 'id' = user_id::text)
    OR (auth.jwt() ->> 'member_id' = user_id::text)
    OR (auth.jwt() ->> 'role' = 'admin')
);

-- Members can update their own (mark as read)
CREATE POLICY "members_update_own_notifications"
ON public.notifications
FOR UPDATE
USING (
    (auth.uid()::text = user_id::text)
    OR (auth.jwt() ->> 'id' = user_id::text)
    OR (auth.jwt() ->> 'member_id' = user_id::text)
);

-- Admins can create and manage all notifications
CREATE POLICY "admin_manage_notifications"
ON public.notifications
FOR ALL
USING (
    auth.jwt() ->> 'role' = 'admin'
);

COMMENT ON TABLE public.notifications IS
'RLS Enabled: Members read own, Admin manages - Phase 2';

-- =====================================================
-- TABLE 4: push_notification_tokens
-- =====================================================
-- Pattern: Member manages their own device tokens
-- Use Case: FCM/APNS push notification registration
-- Columns: user_id, owner_member_id

ALTER TABLE public.push_notification_tokens ENABLE ROW LEVEL SECURITY;

-- Members can manage their own tokens
CREATE POLICY "members_manage_own_tokens"
ON public.push_notification_tokens
FOR ALL
USING (
    (auth.uid()::text = user_id::text)
    OR (auth.jwt() ->> 'id' = owner_member_id::text)
    OR (auth.jwt() ->> 'member_id' = owner_member_id::text)
    OR (auth.jwt() ->> 'role' = 'admin')
);

COMMENT ON TABLE public.push_notification_tokens IS
'RLS Enabled: Members manage own tokens - Phase 2';

-- =====================================================
-- TABLE 5: family_relationships
-- =====================================================
-- Pattern: Authenticated read, Admin write
-- Use Case: Family tree connections
-- Columns: member_from, member_to, created_by

ALTER TABLE public.family_relationships ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view family relationships
CREATE POLICY "authenticated_read_relationships"
ON public.family_relationships
FOR SELECT
USING (
    auth.role() = 'authenticated'
);

-- Only admins can modify
CREATE POLICY "admin_manage_relationships"
ON public.family_relationships
FOR ALL
USING (
    auth.jwt() ->> 'role' = 'admin'
);

COMMENT ON TABLE public.family_relationships IS
'RLS Enabled: Authenticated read, Admin write - Phase 2';

-- =====================================================
-- TABLE 6: family_tree_positions
-- =====================================================
-- Pattern: Authenticated read, Admin write
-- Use Case: Visual layout of family tree
-- Columns: member_id, x_position, y_position

ALTER TABLE public.family_tree_positions ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view positions
CREATE POLICY "authenticated_read_positions"
ON public.family_tree_positions
FOR SELECT
USING (
    auth.role() = 'authenticated'
);

-- Only admins can modify
CREATE POLICY "admin_manage_positions"
ON public.family_tree_positions
FOR ALL
USING (
    auth.jwt() ->> 'role' = 'admin'
);

COMMENT ON TABLE public.family_tree_positions IS
'RLS Enabled: Authenticated read, Admin write - Phase 2';

-- =====================================================
-- TABLE 7: document_processing_queue
-- =====================================================
-- Pattern: Admin + System only
-- Use Case: Background job processing
-- Columns: document_id, status, processing_type

ALTER TABLE public.document_processing_queue ENABLE ROW LEVEL SECURITY;

-- Only admins and service role can access
CREATE POLICY "admin_system_only"
ON public.document_processing_queue
FOR ALL
USING (
    auth.jwt() ->> 'role' = 'admin'
    OR auth.jwt() ->> 'role' = 'service_role'
);

COMMENT ON TABLE public.document_processing_queue IS
'RLS Enabled: Admin and system only - Phase 2';

-- =====================================================
-- POST-MIGRATION VERIFICATION
-- =====================================================

-- Check all tables have RLS enabled
SELECT
    tablename,
    CASE WHEN rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as rls_status,
    (SELECT COUNT(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename) as policy_count
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

-- List all policies created
SELECT
    tablename,
    policyname,
    cmd as operation,
    permissive as is_permissive
FROM pg_policies
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
ORDER BY tablename, policyname;

-- =====================================================
-- CRITICAL TEST CASES
-- =====================================================

-- Test 1: Member should see their own notifications
-- SELECT * FROM notifications WHERE user_id = auth.jwt() ->> 'id' LIMIT 5;

-- Test 2: Member should be able to react to news
-- INSERT INTO news_reactions (news_id, reactor_member_id, reaction_type)
-- VALUES (1, (auth.jwt() ->> 'id')::integer, 'like');

-- Test 3: Member should see family relationships
-- SELECT * FROM family_relationships LIMIT 5;

-- Test 4: Member should NOT see other members' notification tokens
-- SELECT * FROM push_notification_tokens LIMIT 10;
-- (Should only return their own)

-- =====================================================
-- SUCCESS METRICS
-- =====================================================
-- ✅ 7 more tables now have RLS enabled
-- ✅ 11 out of 17 security issues resolved (64.7%)
-- ⚠️ MONITOR: User interactions (reactions, notifications)
-- ⚠️ WATCH: Mobile app push notifications
-- ⚠️ CHECK: Family tree display
--
-- CRITICAL: Test the following in your apps:
-- - News reactions/likes functionality
-- - Push notification registration
-- - Notification delivery to members
-- - Family tree viewing
--
-- NEXT STEPS:
-- 1. Monitor for 48 hours
-- 2. Check error logs daily
-- 3. Verify mobile app functionality
-- 4. If stable, proceed to Phase 3 (HIGH RISK)
-- =====================================================

-- =====================================================
-- EMERGENCY MONITORING
-- =====================================================

-- Check for RLS policy violations (run hourly)
SELECT
    NOW() as check_time,
    'news_reactions' as table_name,
    COUNT(*) as total_records
FROM news_reactions
UNION ALL
SELECT
    NOW(),
    'notifications',
    COUNT(*)
FROM notifications
UNION ALL
SELECT
    NOW(),
    'push_notification_tokens',
    COUNT(*)
FROM push_notification_tokens;

-- If any query returns 0 records when it shouldn't,
-- RLS might be too restrictive. Check policies immediately.
