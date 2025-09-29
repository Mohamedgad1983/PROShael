-- Fix Column Name Issues in Al-Shuail Database
-- Run this script in Supabase SQL Editor

-- Option 1: Add missing columns as aliases (RECOMMENDED)
-- This creates computed columns that reference the existing 'id' column

-- For members table
ALTER TABLE members
ADD COLUMN IF NOT EXISTS member_id UUID GENERATED ALWAYS AS (id) STORED;

-- For payments table
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS payment_id UUID GENERATED ALWAYS AS (id) STORED;

-- For subscriptions table
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS subscription_id UUID GENERATED ALWAYS AS (id) STORED;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_members_member_id ON members(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_id ON payments(payment_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_subscription_id ON subscriptions(subscription_id);

-- Verify the columns exist
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('members', 'payments', 'subscriptions')
  AND column_name IN ('id', 'member_id', 'payment_id', 'subscription_id')
ORDER BY table_name, column_name;