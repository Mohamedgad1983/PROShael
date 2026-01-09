-- =====================================================
-- Al-Shuail Password Authentication System
-- Migration Script for PostgreSQL
-- Date: 2025-01-09
-- =====================================================
--
-- Purpose:
-- 1. Add password authentication fields to members table
-- 2. Add Face ID / Biometric authentication fields
-- 3. Create password_reset_tokens table for OTP
-- 4. Create security_audit_log table for security events
--
-- This script is SAFE TO RUN MULTIPLE TIMES (idempotent)
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Add Password Fields to Members Table
-- =====================================================

-- Add password_hash field
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'members'
        AND column_name = 'password_hash'
    ) THEN
        ALTER TABLE public.members
        ADD COLUMN password_hash VARCHAR(255);

        COMMENT ON COLUMN public.members.password_hash IS
        'Bcrypt hashed password (12 salt rounds)';
    END IF;
END $$;

-- Add has_password field
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'members'
        AND column_name = 'has_password'
    ) THEN
        ALTER TABLE public.members
        ADD COLUMN has_password BOOLEAN DEFAULT FALSE;

        COMMENT ON COLUMN public.members.has_password IS
        'Whether member has set up a password';
    END IF;
END $$;

-- Add password_updated_at field
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'members'
        AND column_name = 'password_updated_at'
    ) THEN
        ALTER TABLE public.members
        ADD COLUMN password_updated_at TIMESTAMPTZ;

        COMMENT ON COLUMN public.members.password_updated_at IS
        'When the password was last updated';
    END IF;
END $$;

-- =====================================================
-- STEP 2: Add Login Security Fields
-- =====================================================

-- Add failed_login_attempts field
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'members'
        AND column_name = 'failed_login_attempts'
    ) THEN
        ALTER TABLE public.members
        ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;

        COMMENT ON COLUMN public.members.failed_login_attempts IS
        'Number of consecutive failed login attempts';
    END IF;
END $$;

-- Add locked_until field
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'members'
        AND column_name = 'locked_until'
    ) THEN
        ALTER TABLE public.members
        ADD COLUMN locked_until TIMESTAMPTZ;

        COMMENT ON COLUMN public.members.locked_until IS
        'Account locked until this time (NULL = not locked)';
    END IF;
END $$;

-- Add last_login_at field
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'members'
        AND column_name = 'last_login_at'
    ) THEN
        ALTER TABLE public.members
        ADD COLUMN last_login_at TIMESTAMPTZ;

        COMMENT ON COLUMN public.members.last_login_at IS
        'Timestamp of last successful login';
    END IF;
END $$;

-- Add last_login_method field
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'members'
        AND column_name = 'last_login_method'
    ) THEN
        ALTER TABLE public.members
        ADD COLUMN last_login_method VARCHAR(20);

        COMMENT ON COLUMN public.members.last_login_method IS
        'Last login method: otp, password, face_id';
    END IF;
END $$;

-- =====================================================
-- STEP 3: Add Face ID / Biometric Fields
-- =====================================================

-- Add face_id_token field
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'members'
        AND column_name = 'face_id_token'
    ) THEN
        ALTER TABLE public.members
        ADD COLUMN face_id_token VARCHAR(255);

        COMMENT ON COLUMN public.members.face_id_token IS
        'Secure token for Face ID / biometric authentication';
    END IF;
END $$;

-- Add has_face_id field
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'members'
        AND column_name = 'has_face_id'
    ) THEN
        ALTER TABLE public.members
        ADD COLUMN has_face_id BOOLEAN DEFAULT FALSE;

        COMMENT ON COLUMN public.members.has_face_id IS
        'Whether Face ID / biometric is enabled';
    END IF;
END $$;

-- Add face_id_enabled_at field
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'members'
        AND column_name = 'face_id_enabled_at'
    ) THEN
        ALTER TABLE public.members
        ADD COLUMN face_id_enabled_at TIMESTAMPTZ;

        COMMENT ON COLUMN public.members.face_id_enabled_at IS
        'When Face ID was enabled';
    END IF;
END $$;

-- =====================================================
-- STEP 4: Create Password Reset Tokens Table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    phone VARCHAR(20) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    attempts INTEGER DEFAULT 0,
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.password_reset_tokens IS
'OTP tokens for password reset and login verification';

COMMENT ON COLUMN public.password_reset_tokens.otp_hash IS
'Bcrypt hashed OTP (never store plain text)';

-- =====================================================
-- STEP 5: Create Security Audit Log Table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.security_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
    member_name VARCHAR(255),
    member_phone VARCHAR(20),
    action_type VARCHAR(50) NOT NULL,
    performed_by UUID REFERENCES public.members(id) ON DELETE SET NULL,
    performed_by_name VARCHAR(255),
    performed_by_role VARCHAR(50),
    details JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.security_audit_log IS
'Audit log for security-related events (login, password changes, etc.)';

-- =====================================================
-- STEP 6: Create Indexes for Performance
-- =====================================================

-- Index on has_password for filtering
CREATE INDEX IF NOT EXISTS idx_members_has_password
ON public.members(has_password)
WHERE has_password = TRUE;

-- Index on locked_until for quick lock checks
CREATE INDEX IF NOT EXISTS idx_members_locked_until
ON public.members(locked_until)
WHERE locked_until IS NOT NULL;

-- Index on has_face_id for filtering
CREATE INDEX IF NOT EXISTS idx_members_has_face_id
ON public.members(has_face_id)
WHERE has_face_id = TRUE;

-- Indexes for password_reset_tokens
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_phone
ON public.password_reset_tokens(phone);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_member_id
ON public.password_reset_tokens(member_id);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at
ON public.password_reset_tokens(expires_at)
WHERE is_used = FALSE;

-- Indexes for security_audit_log
CREATE INDEX IF NOT EXISTS idx_security_audit_log_member_id
ON public.security_audit_log(member_id);

CREATE INDEX IF NOT EXISTS idx_security_audit_log_action_type
ON public.security_audit_log(action_type);

CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at
ON public.security_audit_log(created_at DESC);

-- =====================================================
-- STEP 7: Cleanup Function for Expired OTPs
-- =====================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.password_reset_tokens
    WHERE expires_at < NOW() - INTERVAL '1 day'
    OR (is_used = TRUE AND used_at < NOW() - INTERVAL '1 day');

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.cleanup_expired_otps() IS
'Cleanup function to remove expired OTP tokens. Run periodically.';

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check password fields
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'members'
AND column_name IN ('password_hash', 'has_password', 'password_updated_at',
                    'failed_login_attempts', 'locked_until',
                    'last_login_at', 'last_login_method',
                    'face_id_token', 'has_face_id', 'face_id_enabled_at')
ORDER BY column_name;

-- Check tables created
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('password_reset_tokens', 'security_audit_log')
AND table_schema = 'public';

-- Check indexes created
SELECT indexname, tablename
FROM pg_indexes
WHERE indexname LIKE 'idx_members_has_%'
   OR indexname LIKE 'idx_password_reset%'
   OR indexname LIKE 'idx_security_audit%';

-- =====================================================
-- ROLLBACK INSTRUCTIONS
-- =====================================================
/*
-- To remove password fields from members table:
ALTER TABLE public.members DROP COLUMN IF EXISTS password_hash;
ALTER TABLE public.members DROP COLUMN IF EXISTS has_password;
ALTER TABLE public.members DROP COLUMN IF EXISTS password_updated_at;
ALTER TABLE public.members DROP COLUMN IF EXISTS failed_login_attempts;
ALTER TABLE public.members DROP COLUMN IF EXISTS locked_until;
ALTER TABLE public.members DROP COLUMN IF EXISTS last_login_at;
ALTER TABLE public.members DROP COLUMN IF EXISTS last_login_method;
ALTER TABLE public.members DROP COLUMN IF EXISTS face_id_token;
ALTER TABLE public.members DROP COLUMN IF EXISTS has_face_id;
ALTER TABLE public.members DROP COLUMN IF EXISTS face_id_enabled_at;

-- To remove tables:
DROP TABLE IF EXISTS public.password_reset_tokens;
DROP TABLE IF EXISTS public.security_audit_log;

-- To remove function:
DROP FUNCTION IF EXISTS public.cleanup_expired_otps();

-- To remove indexes:
DROP INDEX IF EXISTS public.idx_members_has_password;
DROP INDEX IF EXISTS public.idx_members_locked_until;
DROP INDEX IF EXISTS public.idx_members_has_face_id;
DROP INDEX IF EXISTS public.idx_password_reset_tokens_phone;
DROP INDEX IF EXISTS public.idx_password_reset_tokens_member_id;
DROP INDEX IF EXISTS public.idx_password_reset_tokens_expires_at;
DROP INDEX IF EXISTS public.idx_security_audit_log_member_id;
DROP INDEX IF EXISTS public.idx_security_audit_log_action_type;
DROP INDEX IF EXISTS public.idx_security_audit_log_created_at;
*/
