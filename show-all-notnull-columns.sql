-- ========================================
-- SHOW ALL NOT NULL COLUMNS IN PAYMENTS TABLE
-- This will help us identify all required fields
-- ========================================

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default,
  CASE
    WHEN is_nullable = 'NO' THEN '❌ REQUIRED (NOT NULL)'
    WHEN is_nullable = 'YES' THEN '✅ Optional (nullable)'
  END as status
FROM information_schema.columns
WHERE table_name = 'payments'
  AND table_schema = 'public'
ORDER BY
  CASE WHEN is_nullable = 'NO' THEN 0 ELSE 1 END,
  ordinal_position;

-- ========================================
-- GENERATE ALTER TABLE STATEMENTS
-- Copy these and run to make fields nullable
-- ========================================

SELECT
  'ALTER TABLE payments ALTER COLUMN ' || column_name || ' DROP NOT NULL;' as fix_statement
FROM information_schema.columns
WHERE table_name = 'payments'
  AND table_schema = 'public'
  AND is_nullable = 'NO'
  AND column_name NOT IN ('id', 'amount', 'created_at', 'updated_at')  -- Keep these as required
ORDER BY column_name;
