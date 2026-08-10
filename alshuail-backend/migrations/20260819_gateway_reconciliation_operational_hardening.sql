-- Operational hardening for durable Moyasar reconciliation.
--
-- A provider 404 is not proof that a previously reserved identity never
-- existed. Count only consecutive 404 responses, then stop automated polling
-- after four observations spanning at least 24 hours and route the identity to
-- manual review. The payment row remains untouched and its provider identity
-- remains reserved. Evidence mismatches use the same durable review boundary.
BEGIN;

ALTER TABLE public.gateway_payment_reconciliation_state
  ADD COLUMN IF NOT EXISTS consecutive_not_found INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS first_not_found_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_provider_http_status SMALLINT,
  ADD COLUMN IF NOT EXISTS review_reason VARCHAR(80);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.gateway_payment_reconciliation_state'::regclass
       AND conname = 'gateway_reconciliation_review_reason_check'
       AND POSITION('legacy_manual_review' IN pg_get_constraintdef(oid)) = 0
  ) THEN
    ALTER TABLE public.gateway_payment_reconciliation_state
      DROP CONSTRAINT gateway_reconciliation_review_reason_check;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.gateway_payment_reconciliation_state'::regclass
       AND conname = 'gateway_reconciliation_not_found_nonnegative'
  ) THEN
    ALTER TABLE public.gateway_payment_reconciliation_state
      ADD CONSTRAINT gateway_reconciliation_not_found_nonnegative
      CHECK (consecutive_not_found >= 0) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.gateway_payment_reconciliation_state'::regclass
       AND conname = 'gateway_reconciliation_http_status_check'
  ) THEN
    ALTER TABLE public.gateway_payment_reconciliation_state
      ADD CONSTRAINT gateway_reconciliation_http_status_check
      CHECK (
        last_provider_http_status IS NULL
        OR last_provider_http_status BETWEEN 100 AND 599
      ) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.gateway_payment_reconciliation_state'::regclass
       AND conname = 'gateway_reconciliation_review_reason_check'
  ) THEN
    ALTER TABLE public.gateway_payment_reconciliation_state
      ADD CONSTRAINT gateway_reconciliation_review_reason_check
      CHECK (
        review_reason IS NULL
        OR review_reason IN (
          'provider_not_found_bounded',
          'gateway_evidence_mismatch',
          'gateway_financial_exception',
          'legacy_manual_review'
        )
      ) NOT VALID;
  END IF;
END $$;

ALTER TABLE public.gateway_payment_reconciliation_state
  VALIDATE CONSTRAINT gateway_reconciliation_not_found_nonnegative;
ALTER TABLE public.gateway_payment_reconciliation_state
  VALIDATE CONSTRAINT gateway_reconciliation_http_status_check;
ALTER TABLE public.gateway_payment_reconciliation_state
  VALIDATE CONSTRAINT gateway_reconciliation_review_reason_check;

-- Existing review rows were intentionally polled daily. The final operational
-- contract makes review terminal for automation; an operator must explicitly
-- resolve it instead of allowing an infinite processing-error loop.
UPDATE public.gateway_payment_reconciliation_state
   SET next_check_at = NULL,
       claim_token = NULL,
       lease_expires_at = NULL,
       review_reason = COALESCE(
         review_reason,
         CASE
           WHEN last_evidence_hash IS NOT NULL THEN 'gateway_financial_exception'
           ELSE 'legacy_manual_review'
         END
       ),
       updated_at = NOW()
 WHERE last_result = 'review_required'
   AND (
     next_check_at IS NOT NULL
     OR claim_token IS NOT NULL
     OR lease_expires_at IS NOT NULL
     OR review_reason IS NULL
   );

CREATE OR REPLACE FUNCTION public.enforce_gateway_reconciliation_operational_state()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.consecutive_not_found < 0 THEN
    RAISE EXCEPTION 'Gateway reconciliation not-found count cannot be negative'
      USING ERRCODE = '23514';
  END IF;

  IF (NEW.consecutive_not_found = 0 AND NEW.first_not_found_at IS NOT NULL)
     OR (NEW.consecutive_not_found > 0 AND NEW.first_not_found_at IS NULL) THEN
    RAISE EXCEPTION 'Gateway reconciliation not-found count and first timestamp must agree'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.consecutive_not_found > 0
     AND NEW.last_provider_http_status IS DISTINCT FROM 404 THEN
    RAISE EXCEPTION 'Only consecutive provider 404 responses may increment not-found count'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.last_result = 'review_required' THEN
    IF NEW.next_check_at IS NOT NULL
       OR NEW.claim_token IS NOT NULL
       OR NEW.lease_expires_at IS NOT NULL
       OR NEW.review_reason IS NULL THEN
      RAISE EXCEPTION 'Gateway review-required state must stop automation with a reason'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.review_reason = 'provider_not_found_bounded'
       AND (
         NEW.consecutive_not_found < 4
         OR NEW.first_not_found_at IS NULL
         OR NEW.first_not_found_at > NOW() - INTERVAL '24 hours'
         OR NEW.last_provider_http_status IS DISTINCT FROM 404
       ) THEN
      RAISE EXCEPTION 'Provider not-found review requires four 404s spanning 24 hours'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.review_reason IN ('gateway_evidence_mismatch', 'gateway_financial_exception')
       AND NEW.last_evidence_hash IS NULL THEN
      RAISE EXCEPTION 'Gateway evidence review requires a sanitized evidence hash'
        USING ERRCODE = '23514';
    END IF;
  ELSIF NEW.review_reason IS NOT NULL THEN
    RAISE EXCEPTION 'Gateway reconciliation review reason requires review-required state'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_gateway_reconciliation_operational_state
  ON public.gateway_payment_reconciliation_state;
CREATE TRIGGER trg_enforce_gateway_reconciliation_operational_state
  BEFORE INSERT OR UPDATE ON public.gateway_payment_reconciliation_state
  FOR EACH ROW EXECUTE FUNCTION public.enforce_gateway_reconciliation_operational_state();

CREATE OR REPLACE FUNCTION public.prevent_gateway_reconciliation_review_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.last_result = 'review_required' THEN
    RAISE EXCEPTION 'Gateway reconciliation review evidence cannot be deleted'
      USING ERRCODE = '23514';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_gateway_reconciliation_review_delete
  ON public.gateway_payment_reconciliation_state;
CREATE TRIGGER trg_prevent_gateway_reconciliation_review_delete
  BEFORE DELETE ON public.gateway_payment_reconciliation_state
  FOR EACH ROW EXECUTE FUNCTION public.prevent_gateway_reconciliation_review_delete();

CREATE INDEX IF NOT EXISTS idx_gateway_reconciliation_review_required
  ON public.gateway_payment_reconciliation_state(last_checked_at DESC, payment_id)
  WHERE last_result = 'review_required';

COMMENT ON COLUMN public.gateway_payment_reconciliation_state.consecutive_not_found IS
  'Consecutive authoritative provider HTTP 404 responses only; every non-404 response resets it.';
COMMENT ON COLUMN public.gateway_payment_reconciliation_state.review_reason IS
  'Bounded automation stop reason. The provider payment identity remains reserved on payments.';

COMMIT;
