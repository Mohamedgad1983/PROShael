-- ========================================
-- STEP 1: Find the test member
-- ========================================
SELECT
  id,
  full_name,
  phone,
  membership_number
FROM members
WHERE phone = '0555555555';

-- ========================================
-- STEP 2: Try automatic insert
-- Copy and run this in Supabase
-- ========================================

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
  500.00,
  'subscription',
  'pending',
  'Test payment from SQL'
FROM member_info
RETURNING
  id as payment_id,
  payer_id,
  amount,
  category,
  status,
  notes,
  created_at;

-- ========================================
-- STEP 3: Verify payment was created
-- ========================================

SELECT COUNT(*) as total_payments FROM payments;

SELECT
  p.id,
  p.amount,
  p.category,
  p.status,
  p.created_at,
  m.full_name as payer_name
FROM payments p
LEFT JOIN members m ON p.payer_id = m.id
ORDER BY p.created_at DESC
LIMIT 5;
