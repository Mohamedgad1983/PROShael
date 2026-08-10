-- Durable, non-starving provider reconciliation for open and settled payments.
-- Must run after the 20260810 gateway/refund migrations and the 20260811
-- financing reversal migration.
BEGIN;

CREATE TABLE IF NOT EXISTS public.gateway_payment_reconciliation_state (
  payment_id UUID PRIMARY KEY REFERENCES public.payments(id) ON DELETE RESTRICT,
  next_check_at TIMESTAMPTZ,
  claim_token UUID,
  lease_expires_at TIMESTAMPTZ,
  last_checked_at TIMESTAMPTZ,
  last_provider_status VARCHAR(30),
  last_result VARCHAR(30),
  last_evidence_hash VARCHAR(64),
  last_error TEXT,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  check_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT gateway_reconciliation_failures_nonnegative
    CHECK (consecutive_failures >= 0),
  CONSTRAINT gateway_reconciliation_count_nonnegative
    CHECK (check_count >= 0),
  CONSTRAINT gateway_reconciliation_result_check
    CHECK (last_result IS NULL OR last_result IN (
      'checked', 'terminal', 'review_required', 'provider_error', 'processing_error'
    )),
  CONSTRAINT gateway_reconciliation_hash_check
    CHECK (last_evidence_hash IS NULL OR last_evidence_hash ~ '^[0-9a-f]{64}$')
);

CREATE INDEX IF NOT EXISTS idx_gateway_reconciliation_due
  ON public.gateway_payment_reconciliation_state(next_check_at, lease_expires_at)
  WHERE next_check_at IS NOT NULL;

COMMENT ON TABLE public.gateway_payment_reconciliation_state IS
  'Cross-process leases and cursors for eventual reconciliation of open and settled Moyasar payments.';

COMMIT;
