-- ============================================
-- AL-SHUAIL TEST MEMBERS SETUP
-- Run this in Supabase SQL Editor to fix auto-logout
-- ============================================

-- Create test members that match the authentication system
-- These are the same test members defined in the backend code

-- Test Member 1: سارة الشعيل (The one you're using)
INSERT INTO members (
  id,
  full_name,
  phone,
  email,
  membership_number,
  membership_status,
  balance,
  join_date,
  created_at,
  updated_at
) VALUES (
  '147b3021-a6a3-4cd7-af2c-67ad11734aa0',
  'سارة الشعيل',
  '0555555555',
  'sara@alshuail.com',
  'SH002',
  'active',
  5000,
  '2024-01-01',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  membership_status = 'active',
  full_name = 'سارة الشعيل',
  phone = '0555555555',
  balance = 5000;

-- Test Member 2: أحمد محمد الشعيل
INSERT INTO members (
  id,
  full_name,
  phone,
  email,
  membership_number,
  membership_status,
  balance,
  join_date,
  created_at,
  updated_at
) VALUES (
  '147b3021-a6a3-4cd7-af2c-67ad11734aa1',
  'أحمد محمد الشعيل',
  '0501234567',
  'ahmad@alshuail.com',
  'SH001',
  'active',
  2500,
  '2024-01-01',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  membership_status = 'active',
  full_name = 'أحمد محمد الشعيل',
  phone = '0501234567',
  balance = 2500;

-- Test Member 3: خالد عبدالله
INSERT INTO members (
  id,
  full_name,
  phone,
  email,
  membership_number,
  membership_status,
  balance,
  join_date,
  created_at,
  updated_at
) VALUES (
  '147b3021-a6a3-4cd7-af2c-67ad11734aa2',
  'خالد عبدالله',
  '0512345678',
  'khaled@alshuail.com',
  'SH003',
  'active',
  1800,
  '2024-01-01',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  membership_status = 'active',
  full_name = 'خالد عبدالله',
  phone = '0512345678',
  balance = 1800;

-- Verify the members were created
SELECT
  id,
  full_name,
  phone,
  membership_number,
  membership_status,
  balance
FROM members
WHERE phone IN ('0555555555', '0501234567', '0512345678');

-- ============================================
-- AFTER RUNNING THIS SCRIPT:
-- 1. Clear browser cache/localStorage
-- 2. Login with:
--    Phone: 0555555555
--    Password: 123456
-- 3. You should now stay logged in!
-- ============================================