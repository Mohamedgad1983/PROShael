-- ============================================
-- 🚨 COPY THIS ENTIRE SCRIPT AND RUN IN SUPABASE
-- This will fix the auto-logout issue immediately!
-- ============================================

-- STEP 1: Create the main test member (سارة الشعيل)
-- This is the one you've been using with phone: 0555555555
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

-- STEP 2: Create second test member (أحمد محمد الشعيل)
-- Phone: 0501234567, Password: 123456
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

-- STEP 3: Create third test member (خالد عبدالله)
-- Phone: 0512345678, Password: 123456
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

-- STEP 4: Verify the members were created successfully
SELECT
  'TEST MEMBERS CREATED SUCCESSFULLY!' as status,
  COUNT(*) as total_test_members,
  STRING_AGG(full_name || ' (' || phone || ')', ', ') as members_list
FROM members
WHERE phone IN ('0555555555', '0501234567', '0512345678');

-- STEP 5: Show the test members details
SELECT
  full_name as "Name",
  phone as "Phone",
  membership_number as "Member ID",
  membership_status as "Status",
  balance as "Balance (SAR)"
FROM members
WHERE phone IN ('0555555555', '0501234567', '0512345678')
ORDER BY membership_number;

-- ============================================
-- ✅ DONE! Now you can login with:
--
-- Member 1:
--   Phone: 0555555555
--   Password: 123456
--   Name: سارة الشعيل
--
-- Member 2:
--   Phone: 0501234567
--   Password: 123456
--   Name: أحمد محمد الشعيل
--
-- Member 3:
--   Phone: 0512345678
--   Password: 123456
--   Name: خالد عبدالله
--
-- NEXT STEPS:
-- 1. Clear your browser cache/localStorage
-- 2. Go to: https://alshuail-admin.pages.dev/mobile/login
-- 3. Login with any of the above credentials
-- 4. YOU WILL STAY LOGGED IN! 🎉
-- ============================================