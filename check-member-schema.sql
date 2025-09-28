-- Check the actual columns in the members table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'members'
ORDER BY ordinal_position;

-- Alternative: Get column names from a sample query
SELECT * FROM members LIMIT 0;