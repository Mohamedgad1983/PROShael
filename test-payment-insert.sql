-- ========================================
-- SIMPLE PAYMENT INSERT TEST
-- Copy and paste this directly in Supabase SQL Editor
-- ========================================

-- Step 1: Get member ID
SELECT
  id,
  full_name,
  phone,
  membership_number,
  'Copy this ID to use below ⬇️' as instruction
FROM members
WHERE phone = '0555555555';

-- ========================================
-- Step 2: Insert test payment
-- Replace 'PASTE_MEMBER_ID_HERE' with the ID from Step 1
-- ========================================

INSERT INTO payments (
  payer_id,
  amount,
  category,
  status,
  notes
) VALUES (
  'PASTE_MEMBER_ID_HERE'::uuid,  -- Replace with actual member ID from step 1
  500.00,
  'subscription',
  'pending',
  'Test payment from Supabase SQL Editor'
) RETURNING *;

-- ========================================
-- OR use this automatic version:
-- ========================================

-- This will automatically find the member and insert payment
WITH member_info AS (
  SELECT id FROM members WHERE phone = '0555555555' LIMIT 1
)
INSERT INTO payments (
  payer_id,
  amount,
  category,
  status,
  notes,
  reference_number
)
SELECT
  id,
  500.00,
  'subscription',
  'pending',
  'Auto-test payment from SQL',
  'TEST-' || to_char(now(), 'YYYYMMDD-HH24MISS')
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
-- Verify the payment was created:
-- ========================================

SELECT
  p.id as payment_id,
  p.amount,
  p.category,
  p.status,
  p.created_at,
  m.full_name as payer_name,
  m.phone as payer_phone
FROM payments p
LEFT JOIN members m ON p.payer_id = m.id
WHERE m.phone = '0555555555'
ORDER BY p.created_at DESC
LIMIT 1;
