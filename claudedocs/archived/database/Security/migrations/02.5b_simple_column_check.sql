-- =====================================================
-- SIMPLE COLUMN CHECK
-- =====================================================
-- Shows all columns in one result for Phase 2 tables
-- =====================================================

SELECT
    table_name,
    STRING_AGG(column_name, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name IN (
        'news_reactions',
        'news_views',
        'notifications',
        'push_notification_tokens',
        'family_relationships',
        'family_tree_positions',
        'document_processing_queue'
    )
GROUP BY table_name
ORDER BY table_name;
