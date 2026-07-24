-- Create member_registration_tokens.
-- This table is referenced by the self-registration flow
-- (memberRegistrationController: look up token, mark used), by the member
-- list (membersController joins it for registration status), and by the Excel
-- member import (memberImportController inserts a token per imported member).
-- It never existed in the production schema, which broke the import and the
-- token-based registration. Idempotent so it is safe to re-run.

CREATE TABLE IF NOT EXISTS member_registration_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id     UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  token         TEXT NOT NULL UNIQUE,
  temp_password TEXT,
  expires_at    TIMESTAMPTZ,
  is_used       BOOLEAN NOT NULL DEFAULT FALSE,
  used_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mrt_token ON member_registration_tokens (token);
CREATE INDEX IF NOT EXISTS idx_mrt_member_id ON member_registration_tokens (member_id);
