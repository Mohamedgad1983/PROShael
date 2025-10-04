-- ============================================
-- SKIP PASSWORD CHANGE REQUIREMENT
-- Run this in Supabase to bypass password change
-- ============================================

-- Update test members to not require password change
UPDATE members
SET
  temp_password = NULL,
  password_hash = NULL,
  requires_password_change = false,
  is_first_login = false
WHERE phone IN ('0555555555', '0501234567', '0512345678');

-- Verify the update
SELECT
  full_name,
  phone,
  temp_password,
  requires_password_change,
  is_first_login
FROM members
WHERE phone IN ('0555555555', '0501234567', '0512345678');

-- ============================================
-- AFTER RUNNING THIS:
-- 1. Clear browser cache: localStorage.clear()
-- 2. Login normally - won't ask for password change
-- ============================================