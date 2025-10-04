-- ========================================
-- REFRESH SUPABASE SCHEMA CACHE
-- Run this in Supabase SQL Editor
-- ========================================

-- Method 1: Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- ========================================
-- Method 2: Check actual table structure
-- ========================================

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'payments'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ========================================
-- Method 3: Drop and recreate problematic foreign key if exists
-- ========================================

-- Check if the foreign key exists
SELECT
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'payments'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND tc.constraint_name = 'payments_on_behalf_of_fkey';

-- ========================================
-- If the above returns no results, the FK doesn't exist
-- You can skip the foreign key in your query
-- ========================================

-- Test a simple insert without foreign key relation
WITH member_info AS (
  SELECT id FROM members WHERE phone = '0555555555' LIMIT 1
)
INSERT INTO payments (
  payer_id,
  amount,
  category,
  status,
  notes
)
SELECT
  id,
  750.00,
  'subscription',
  'pending',
  'Test after schema cache refresh'
FROM member_info
RETURNING *;

-- Verify
SELECT COUNT(*) as total_payments FROM payments;
