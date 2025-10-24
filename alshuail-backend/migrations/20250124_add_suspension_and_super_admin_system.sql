-- =====================================================
-- Al-Shuail Member Suspension and Super Admin System
-- Migration Script for Supabase
-- Date: 2025-01-24
-- =====================================================
--
-- Purpose:
-- 1. Add suspension tracking fields to members table
-- 2. Add role system for super admin vs regular admin
-- 3. Set admin@alshuail.com as initial super admin
-- 4. Prepare database for member suspension functionality
--
-- This script is SAFE TO RUN MULTIPLE TIMES (idempotent)
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Add Suspension Tracking Fields to Members Table
-- =====================================================

-- Add suspended_at field (when member was suspended)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'members'
        AND column_name = 'suspended_at'
    ) THEN
        ALTER TABLE public.members
        ADD COLUMN suspended_at TIMESTAMPTZ;

        COMMENT ON COLUMN public.members.suspended_at IS
        'Timestamp when member was suspended. NULL means not suspended.';
    END IF;
END $$;

-- Add suspended_by field (admin who suspended the member)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'members'
        AND column_name = 'suspended_by'
    ) THEN
        ALTER TABLE public.members
        ADD COLUMN suspended_by UUID;

        COMMENT ON COLUMN public.members.suspended_by IS
        'UUID of admin who suspended this member.';
    END IF;
END $$;

-- Add suspension_reason field
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'members'
        AND column_name = 'suspension_reason'
    ) THEN
        ALTER TABLE public.members
        ADD COLUMN suspension_reason TEXT;

        COMMENT ON COLUMN public.members.suspension_reason IS
        'Reason why member was suspended (e.g., non-payment, violation).';
    END IF;
END $$;

-- Add reactivated_at field (when member was reactivated)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'members'
        AND column_name = 'reactivated_at'
    ) THEN
        ALTER TABLE public.members
        ADD COLUMN reactivated_at TIMESTAMPTZ;

        COMMENT ON COLUMN public.members.reactivated_at IS
        'Timestamp when member was reactivated after suspension.';
    END IF;
END $$;

-- Add reactivated_by field (admin who reactivated the member)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'members'
        AND column_name = 'reactivated_by'
    ) THEN
        ALTER TABLE public.members
        ADD COLUMN reactivated_by UUID;

        COMMENT ON COLUMN public.members.reactivated_by IS
        'UUID of admin who reactivated this member.';
    END IF;
END $$;

-- Add reactivation_notes field
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'members'
        AND column_name = 'reactivation_notes'
    ) THEN
        ALTER TABLE public.members
        ADD COLUMN reactivation_notes TEXT;

        COMMENT ON COLUMN public.members.reactivation_notes IS
        'Notes about why member was reactivated.';
    END IF;
END $$;

-- =====================================================
-- STEP 2: Add Role System to Users/Admins Table
-- =====================================================

-- First, check if 'users' table exists, if not, check 'admins' table
DO $$
DECLARE
    target_table TEXT;
BEGIN
    -- Determine which table to use
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        target_table := 'users';
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admins') THEN
        target_table := 'admins';
    ELSE
        RAISE NOTICE 'Neither users nor admins table found. Role column not added.';
        RETURN;
    END IF;

    -- Add role column to the identified table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = target_table
        AND column_name = 'role'
    ) THEN
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN role TEXT DEFAULT ''admin''', target_table);
        EXECUTE format('COMMENT ON COLUMN public.%I.role IS ''User role: super_admin, admin, or user''', target_table);
        RAISE NOTICE 'Role column added to % table', target_table;
    ELSE
        RAISE NOTICE 'Role column already exists in % table', target_table;
    END IF;
END $$;

-- =====================================================
-- STEP 3: Create Indexes for Performance
-- =====================================================

-- Index on suspended_at for quick filtering of suspended members
CREATE INDEX IF NOT EXISTS idx_members_suspended_at
ON public.members(suspended_at)
WHERE suspended_at IS NOT NULL;

-- Index on membership_status for general filtering
CREATE INDEX IF NOT EXISTS idx_members_membership_status
ON public.members(membership_status);

-- Index on role for quick permission checks (check both tables)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admins') THEN
        CREATE INDEX IF NOT EXISTS idx_admins_role ON public.admins(role);
    END IF;
END $$;

-- =====================================================
-- STEP 4: Set Initial Super Admin Role
-- =====================================================

-- Set admin@alshuail.com as super_admin (check both tables)
DO $$
BEGIN
    -- Try users table first
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        UPDATE public.users
        SET role = 'super_admin'
        WHERE email = 'admin@alshuail.com';

        IF FOUND THEN
            RAISE NOTICE 'Set admin@alshuail.com as super_admin in users table';
        END IF;
    END IF;

    -- Try admins table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admins') THEN
        UPDATE public.admins
        SET role = 'super_admin'
        WHERE email = 'admin@alshuail.com';

        IF FOUND THEN
            RAISE NOTICE 'Set admin@alshuail.com as super_admin in admins table';
        END IF;
    END IF;
END $$;

-- =====================================================
-- STEP 5: Add Helper Function to Check Super Admin
-- =====================================================

-- Function to check if a user is a super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Try users table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        SELECT role INTO user_role FROM public.users WHERE email = user_email;
        IF user_role = 'super_admin' THEN
            RETURN TRUE;
        END IF;
    END IF;

    -- Try admins table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admins') THEN
        SELECT role INTO user_role FROM public.admins WHERE email = user_email;
        IF user_role = 'super_admin' THEN
            RETURN TRUE;
        END IF;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.is_super_admin(TEXT) IS
'Helper function to check if a user has super_admin role';

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES (Run these to verify changes)
-- =====================================================

-- Check if suspension fields were added to members table
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'members'
AND column_name IN ('suspended_at', 'suspended_by', 'suspension_reason',
                    'reactivated_at', 'reactivated_by', 'reactivation_notes')
ORDER BY column_name;

-- Check if role column was added (try both tables)
SELECT 'users' as table_name, column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'role'
UNION ALL
SELECT 'admins' as table_name, column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'admins' AND column_name = 'role';

-- Check super admin users
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE NOTICE 'Super admins in users table:';
        PERFORM email, role FROM public.users WHERE role = 'super_admin';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admins') THEN
        RAISE NOTICE 'Super admins in admins table:';
        PERFORM email, role FROM public.admins WHERE role = 'super_admin';
    END IF;
END $$;

-- Check created indexes
SELECT indexname, tablename, indexdef
FROM pg_indexes
WHERE indexname IN ('idx_members_suspended_at', 'idx_members_membership_status',
                    'idx_users_role', 'idx_admins_role')
ORDER BY tablename, indexname;

-- =====================================================
-- ROLLBACK INSTRUCTIONS (If you need to undo changes)
-- =====================================================
/*
-- To remove suspension fields from members table:
ALTER TABLE public.members DROP COLUMN IF EXISTS suspended_at;
ALTER TABLE public.members DROP COLUMN IF EXISTS suspended_by;
ALTER TABLE public.members DROP COLUMN IF EXISTS suspension_reason;
ALTER TABLE public.members DROP COLUMN IF EXISTS reactivated_at;
ALTER TABLE public.members DROP COLUMN IF EXISTS reactivated_by;
ALTER TABLE public.members DROP COLUMN IF EXISTS reactivation_notes;

-- To remove role column (check which table you're using):
ALTER TABLE public.users DROP COLUMN IF EXISTS role;
-- OR
ALTER TABLE public.admins DROP COLUMN IF EXISTS role;

-- To remove indexes:
DROP INDEX IF EXISTS public.idx_members_suspended_at;
DROP INDEX IF EXISTS public.idx_members_membership_status;
DROP INDEX IF EXISTS public.idx_users_role;
DROP INDEX IF EXISTS public.idx_admins_role;

-- To remove helper function:
DROP FUNCTION IF EXISTS public.is_super_admin(TEXT);
*/

-- =====================================================
-- HOW TO ADD MORE SUPER ADMINS IN THE FUTURE
-- =====================================================
/*
-- For users table:
UPDATE public.users
SET role = 'super_admin'
WHERE email = 'newemail@example.com';

-- For admins table:
UPDATE public.admins
SET role = 'super_admin'
WHERE email = 'newemail@example.com';

-- To demote from super_admin to regular admin:
UPDATE public.users
SET role = 'admin'
WHERE email = 'email@example.com';
*/
