-- =====================================================
-- Al-Shuail First-Time Password Change System
-- Migration Script for PostgreSQL
-- Date: 2025-01-09
-- =====================================================
--
-- Purpose:
-- 1. Add must_change_password flag to members table
-- 2. Used for forcing password change on first login
--
-- This script is SAFE TO RUN MULTIPLE TIMES (idempotent)
-- =====================================================

BEGIN;

-- Add must_change_password field
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'members'
        AND column_name = 'must_change_password'
    ) THEN
        ALTER TABLE public.members
        ADD COLUMN must_change_password BOOLEAN DEFAULT FALSE;

        COMMENT ON COLUMN public.members.must_change_password IS
        'If true, user must change password on next login (first-time or admin reset)';
    END IF;
END $$;

-- Create index for quick filtering
CREATE INDEX IF NOT EXISTS idx_members_must_change_password
ON public.members(must_change_password)
WHERE must_change_password = TRUE;

COMMIT;

-- Verification
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'members'
AND column_name = 'must_change_password';
