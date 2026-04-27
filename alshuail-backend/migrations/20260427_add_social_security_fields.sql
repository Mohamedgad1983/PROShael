-- Migration: Add social security beneficiary fields to members table
-- Created: 2026-04-27
-- Purpose: Support the one-time onboarding question
--   "هل أنت مستفيد من الضمان الاجتماعي؟" + national ID upload.
--
-- Both columns are nullable on purpose — `social_security_answered_at IS NULL`
-- is what the mobile app uses to decide whether to prompt the user.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'members' AND column_name = 'social_security_beneficiary'
    ) THEN
        ALTER TABLE members ADD COLUMN social_security_beneficiary BOOLEAN DEFAULT NULL;
        COMMENT ON COLUMN members.social_security_beneficiary IS
            'Whether the member is a social security beneficiary (مستفيد من الضمان الاجتماعي). NULL = not yet asked.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'members' AND column_name = 'social_security_answered_at'
    ) THEN
        ALTER TABLE members ADD COLUMN social_security_answered_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
        COMMENT ON COLUMN members.social_security_answered_at IS
            'Timestamp when the member answered the social security onboarding question. NULL = the mobile app should still prompt.';
    END IF;
END $$;

-- Index for quick lookup of unanswered members (admin reports)
CREATE INDEX IF NOT EXISTS idx_members_social_security_unanswered
    ON members(social_security_answered_at)
    WHERE social_security_answered_at IS NULL;
