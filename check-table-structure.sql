-- ========================================
-- Check exact table structure
-- ========================================

-- Show all columns
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'payments'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Show all constraints with definitions
SELECT
  con.conname AS constraint_name,
  CASE con.contype
    WHEN 'c' THEN 'CHECK'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'u' THEN 'UNIQUE'
  END AS type,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class cls ON cls.oid = con.conrelid
WHERE cls.relname = 'payments'
ORDER BY con.contype;

-- Check if member exists
SELECT
  id,
  full_name,
  phone
FROM members
WHERE phone = '0555555555';
