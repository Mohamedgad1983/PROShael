-- ========================================
-- DEBUG PAYMENTS TABLE CONSTRAINTS
-- Run this script in Supabase SQL Editor
-- ========================================

-- 1. Check if payments table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'payments'
) as table_exists;

-- 2. Show all columns in payments table
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'payments'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Show all constraints on payments table
SELECT
  con.conname AS constraint_name,
  con.contype AS constraint_type,
  CASE con.contype
    WHEN 'c' THEN 'CHECK'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 't' THEN 'TRIGGER'
    WHEN 'x' THEN 'EXCLUDE'
  END AS constraint_type_label,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_namespace nsp ON nsp.oid = con.connamespace
JOIN pg_class cls ON cls.oid = con.conrelid
WHERE cls.relname = 'payments'
  AND nsp.nspname = 'public'
ORDER BY con.contype;

-- 4. Show foreign key relationships
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'payments';

-- 5. Check if members table exists (for foreign key)
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'members'
) as members_table_exists;

-- 6. Check if the test member exists
SELECT
  id,
  full_name,
  phone,
  membership_number
FROM members
WHERE phone = '0555555555';

-- 7. Show sample data from payments table
SELECT
  id,
  payer_id,
  amount,
  category,
  status,
  created_at,
  updated_at
FROM payments
ORDER BY created_at DESC
LIMIT 5;

-- 8. Count total payments
SELECT COUNT(*) as total_payments FROM payments;

-- ========================================
-- TEST INSERT (COMMENTED OUT FOR SAFETY)
-- Uncomment and modify to test insert
-- ========================================

/*
-- Test insert with the test member ID
-- Replace 'YOUR_MEMBER_ID_HERE' with actual member ID from step 6

INSERT INTO payments (
  payer_id,
  amount,
  category,
  payment_method,
  status,
  notes,
  reference_number
) VALUES (
  'YOUR_MEMBER_ID_HERE',  -- Replace with actual member ID
  500.00,
  'subscription',
  'transfer',
  'pending',
  'Test payment from mobile app',
  'TEST-' || to_char(now(), 'YYYYMMDD-HH24MISS')
);
*/

-- ========================================
-- CREATE PAYMENTS TABLE IF MISSING
-- Run this ONLY if table doesn't exist
-- ========================================

/*
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payer_id UUID REFERENCES members(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  category VARCHAR(50) CHECK (category IN ('subscription', 'donation', 'event', 'membership', 'other')),
  payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'card', 'transfer', 'online', 'check')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'failed', 'refunded')),
  reference_number VARCHAR(50) UNIQUE,
  notes TEXT,
  title VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_payer_id ON payments(payer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_category ON payments(category);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
*/

-- ========================================
-- ALTERNATIVE: Simple insert test
-- ========================================

/*
-- First, get the member ID
DO $$
DECLARE
  v_member_id UUID;
BEGIN
  -- Get member ID from phone number
  SELECT id INTO v_member_id
  FROM members
  WHERE phone = '0555555555'
  LIMIT 1;

  -- Insert test payment
  IF v_member_id IS NOT NULL THEN
    INSERT INTO payments (
      payer_id,
      amount,
      category,
      status,
      notes
    ) VALUES (
      v_member_id,
      500.00,
      'subscription',
      'pending',
      'Test payment from SQL script'
    );

    RAISE NOTICE 'Payment inserted successfully for member: %', v_member_id;
  ELSE
    RAISE NOTICE 'Member with phone 0555555555 not found';
  END IF;
END $$;
*/
