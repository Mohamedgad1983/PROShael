-- ========================================
-- COMPLETE FIX: Make all optional fields nullable
-- Based on show-all-notnull-columns.sql results
-- ========================================

-- Make beneficiary_id nullable (not all payments have beneficiaries)
ALTER TABLE payments ALTER COLUMN beneficiary_id DROP NOT NULL;

-- Make payer_id nullable (some payments might be system-generated)
ALTER TABLE payments ALTER COLUMN payer_id DROP NOT NULL;

-- Make payment_date nullable (will use created_at as default)
ALTER TABLE payments ALTER COLUMN payment_date DROP NOT NULL;

-- Make payment_method nullable (not always known at creation time)
ALTER TABLE payments ALTER COLUMN payment_method DROP NOT NULL;

-- Make subscription_id nullable (not all payments are subscription-related)
ALTER TABLE payments ALTER COLUMN subscription_id DROP NOT NULL;

-- ========================================
-- Verify all changes were applied
-- ========================================

SELECT
  column_name,
  is_nullable,
  data_type,
  CASE
    WHEN is_nullable = 'NO' THEN '❌ REQUIRED'
    WHEN is_nullable = 'YES' THEN '✅ Optional'
  END as status
FROM information_schema.columns
WHERE table_name = 'payments'
  AND column_name IN ('beneficiary_id', 'payer_id', 'payment_date', 'payment_method', 'subscription_id')
ORDER BY column_name;

-- ========================================
-- TEST INSERT: This should work now!
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
  '✅ SUCCESS! All nullable fields fixed'
FROM member_info
RETURNING
  id as payment_id,
  payer_id,
  amount,
  category,
  status,
  notes,
  created_at,
  '✅ PAYMENT CREATED SUCCESSFULLY!' as result;

-- ========================================
-- Show created payment
-- ========================================

SELECT
  id,
  payer_id,
  amount,
  category,
  status,
  subscription_id,
  beneficiary_id,
  payment_date,
  payment_method,
  notes,
  created_at
FROM payments
ORDER BY created_at DESC
LIMIT 1;

-- ========================================
-- Count total payments
-- ========================================

SELECT
  COUNT(*) as total_payments,
  SUM(amount) as total_amount,
  COUNT(DISTINCT payer_id) as unique_payers,
  '✅ Payments table working!' as status
FROM payments;
