-- =====================================================
-- CHECK MEMBERS TABLE STRUCTURE
-- Run this first to see what columns you have
-- =====================================================

-- Option 1: Check columns in members table
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'members'
ORDER BY ordinal_position;

-- Option 2: Get first member record to see actual data
SELECT * FROM members LIMIT 1;