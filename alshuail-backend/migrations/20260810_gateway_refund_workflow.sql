-- Controlled, auditable resolution for provider captures that cannot be
-- credited locally and are therefore held in payments.status=pending_refund.
-- This migration is additive and safe to apply repeatedly.

BEGIN;

CREATE TABLE IF NOT EXISTS public.gateway_refund_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  gateway_provider VARCHAR(40) NOT NULL,
  gateway_payment_id TEXT NOT NULL,
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency VARCHAR(3) NOT NULL,
  status VARCHAR(30) NOT NULL
    CHECK (status IN ('processing', 'succeeded', 'failed')),
  reason TEXT NOT NULL,
  requested_by UUID,
  request_ip TEXT,
  user_agent TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 1 CHECK (attempt_count > 0),
  provider_response JSONB,
  last_error TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (payment_id)
);

ALTER TABLE public.gateway_refund_operations
  ADD COLUMN IF NOT EXISTS request_ip TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT;

CREATE INDEX IF NOT EXISTS idx_gateway_refund_operations_status
  ON public.gateway_refund_operations(status, updated_at DESC);

COMMENT ON TABLE public.gateway_refund_operations IS
  'Immutable payment identity plus retry/audit state for administrator-approved gateway refunds.';

COMMENT ON COLUMN public.gateway_refund_operations.reason IS
  'Required human review reason supplied by the super administrator.';

COMMENT ON COLUMN public.gateway_refund_operations.provider_response IS
  'Latest verified provider response; secrets and raw authorization headers are never stored.';

COMMIT;
