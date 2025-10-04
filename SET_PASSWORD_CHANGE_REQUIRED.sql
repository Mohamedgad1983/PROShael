-- ============================================
-- SET PASSWORD CHANGE REQUIREMENT FOR TESTING
-- Run this in Supabase to test password change flow
-- ============================================

-- Set test members to require password change (for testing)
UPDATE members
SET
  requires_password_change = true,
  is_first_login = true
WHERE phone IN ('0555555555', '0501234567', '0512345678');

-- Verify the update
SELECT
  full_name,
  phone,
  requires_password_change,
  is_first_login
FROM members
WHERE phone IN ('0555555555', '0501234567', '0512345678');

-- ============================================
-- AFTER RUNNING THIS:
-- 1. Clear browser cache: localStorage.clear()
-- 2. Login - you'll be asked to change password
-- 3. Enter any password (min 8 chars with mixed case)
-- 4. You'll be redirected to dashboard
-- ============================================