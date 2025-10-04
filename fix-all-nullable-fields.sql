-- ========================================
-- FIX: Make all optional payment fields nullable
-- ========================================

-- Make subscription_id nullable
ALTER TABLE payments
ALTER COLUMN subscription_id DROP NOT NULL;

-- Make beneficiary_id nullable (not all payments are for beneficiaries)
ALTER TABLE payments
ALTER COLUMN beneficiary_id DROP NOT NULL;

-- Make other common fields nullable if they have NOT NULL constraints
-- (These may already be nullable, but let's be safe)
DO $$
BEGIN
    -- Try to make payer_id nullable (should stay as it might be required)
    -- ALTER TABLE payments ALTER COLUMN payer_id DROP NOT NULL;

    -- Make payment_method nullable (not always provided)
    BEGIN
        ALTER TABLE payments ALTER COLUMN payment_method DROP NOT NULL;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'payment_method already nullable or does not exist';
    END;

    -- Make receipt_url nullable
    BEGIN
        ALTER TABLE payments ALTER COLUMN receipt_url DROP NOT NULL;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'receipt_url already nullable or does not exist';
    END;

    -- Make reference_number nullable (auto-generated)
    BEGIN
        ALTER TABLE payments ALTER COLUMN reference_number DROP NOT NULL;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'reference_number already nullable or does not exist';
    END;
END $$;

-- ========================================
-- Verify the changes
-- ========================================

SELECT
  column_name,
  is_nullable,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'payments'
  AND column_name IN ('subscription_id', 'beneficiary_id', 'payment_method', 'receipt_url', 'reference_number', 'payer_id')
ORDER BY column_name;

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
  'Test payment - all nullable fields fixed'
FROM member_info
RETURNING
  id as payment_id,
  payer_id,
  amount,
  category,
  status,
  subscription_id,
  beneficiary_id,
  notes,
  created_at;

-- ========================================
-- Verify payment was created successfully
-- ========================================

SELECT
  id,
  payer_id,
  amount,
  category,
  status,
  subscription_id,
  beneficiary_id,
  reference_number,
  created_at
FROM payments
ORDER BY created_at DESC
LIMIT 3;

SELECT COUNT(*) as total_payments FROM payments;
