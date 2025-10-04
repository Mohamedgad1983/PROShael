-- ========================================
-- FIX: Make subscription_id nullable
-- Not all payments need to be linked to a subscription
-- ========================================

-- Make subscription_id nullable
ALTER TABLE payments
ALTER COLUMN subscription_id DROP NOT NULL;

-- Verify the change
SELECT
  column_name,
  is_nullable,
  data_type
FROM information_schema.columns
WHERE table_name = 'payments'
  AND column_name = 'subscription_id';

-- ========================================
-- Now test insert again
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
  'Test payment - subscription_id now nullable'
FROM member_info
RETURNING
  id as payment_id,
  payer_id,
  amount,
  category,
  status,
  subscription_id,
  notes,
  created_at;

-- ========================================
-- Verify payment was created
-- ========================================

SELECT
  id,
  payer_id,
  amount,
  category,
  status,
  subscription_id,
  created_at
FROM payments
ORDER BY created_at DESC
LIMIT 1;
