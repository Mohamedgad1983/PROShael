-- =====================================================
-- DIAGNOSTIC: Check Table Columns for Phase 2
-- =====================================================
-- Purpose: Identify actual column names before Phase 2
-- Risk Level: ZERO (read-only)
-- Run this BEFORE executing Phase 2 migration
-- =====================================================

-- Check news_reactions columns
SELECT
    'news_reactions' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'news_reactions'
ORDER BY ordinal_position;

-- Check news_views columns
SELECT
    'news_views' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'news_views'
ORDER BY ordinal_position;

-- Check notifications columns
SELECT
    'notifications' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'notifications'
ORDER BY ordinal_position;

-- Check push_notification_tokens columns
SELECT
    'push_notification_tokens' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'push_notification_tokens'
ORDER BY ordinal_position;

-- Check family_relationships columns
SELECT
    'family_relationships' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'family_relationships'
ORDER BY ordinal_position;

-- Check family_tree_positions columns
SELECT
    'family_tree_positions' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'family_tree_positions'
ORDER BY ordinal_position;

-- Check document_processing_queue columns
SELECT
    'document_processing_queue' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'document_processing_queue'
ORDER BY ordinal_position;

-- =====================================================
-- SUMMARY: Which tables exist?
-- =====================================================
SELECT
    table_name,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
            AND information_schema.columns.table_name = t.table_name
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM (
    VALUES
        ('news_reactions'),
        ('news_views'),
        ('notifications'),
        ('push_notification_tokens'),
        ('family_relationships'),
        ('family_tree_positions'),
        ('document_processing_queue')
) AS t(table_name);
