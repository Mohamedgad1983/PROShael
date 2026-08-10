-- Gateway-managed subscription rows may change financial state only when the
-- same statement persists authoritative Moyasar evidence. Generic admin
-- status/process/bulk endpoints do not write that evidence and are rejected.
BEGIN;

CREATE OR REPLACE FUNCTION public.enforce_gateway_subscription_evidence()
RETURNS trigger AS $$
DECLARE
  gateway_managed BOOLEAN;
  old_gateway_managed BOOLEAN;
  expected_minor BIGINT;
  response_status TEXT;
  response_id TEXT;
  response_currency TEXT;
  response_amount BIGINT;
  response_captured BIGINT;
  response_refunded BIGINT;
BEGIN
  gateway_managed := NEW.financing_plan_id IS NULL AND (
    NULLIF(BTRIM(COALESCE(NEW.gateway_provider, '')), '') IS NOT NULL
    OR NULLIF(BTRIM(COALESCE(NEW.gateway_payment_id::text, '')), '') IS NOT NULL
    OR LOWER(BTRIM(COALESCE(NEW.payment_method, ''))) IN ('app_payment', 'apple_pay', 'moyasar')
  );

  IF TG_OP = 'INSERT' THEN
    IF NOT gateway_managed THEN
      RETURN NEW;
    END IF;
    expected_minor := ROUND(NEW.amount::numeric * 100)::bigint;
    IF NEW.category = 'subscription'
       AND NEW.status = 'pending'
       AND LOWER(BTRIM(COALESCE(NEW.gateway_provider, ''))) = 'moyasar'
       AND NEW.gateway_protocol_version = 2
       AND NEW.gateway_status = 'prepared_v2'
       AND NEW.gateway_submission_started_at IS NULL
       AND NULLIF(BTRIM(COALESCE(NEW.gateway_payment_id::text, '')), '') IS NOT NULL
       AND expected_minor > 0
       AND NEW.gateway_amount_minor IS NOT DISTINCT FROM expected_minor
       AND UPPER(BTRIM(COALESCE(NEW.gateway_currency, ''))) = 'SAR' THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Gateway subscription rows may be inserted only as canonical prepared-v2 sessions'
      USING ERRCODE = '23514';
  END IF;

  old_gateway_managed := OLD.financing_plan_id IS NULL AND (
    NULLIF(BTRIM(COALESCE(OLD.gateway_provider, '')), '') IS NOT NULL
    OR NULLIF(BTRIM(COALESCE(OLD.gateway_payment_id::text, '')), '') IS NOT NULL
    OR LOWER(BTRIM(COALESCE(OLD.payment_method, ''))) IN ('app_payment', 'apple_pay', 'moyasar')
  );
  gateway_managed := gateway_managed OR old_gateway_managed;

  IF NOT gateway_managed THEN
    RETURN NEW;
  END IF;

  IF old_gateway_managed AND (
    NEW.payer_id IS DISTINCT FROM OLD.payer_id
    OR NEW.beneficiary_id IS DISTINCT FROM OLD.beneficiary_id
    OR NEW.financing_plan_id IS DISTINCT FROM OLD.financing_plan_id
    OR NEW.category IS DISTINCT FROM OLD.category
    OR NEW.amount IS DISTINCT FROM OLD.amount
    OR NEW.gateway_provider IS DISTINCT FROM OLD.gateway_provider
    OR NEW.gateway_payment_id IS DISTINCT FROM OLD.gateway_payment_id
    OR NEW.gateway_amount_minor IS DISTINCT FROM OLD.gateway_amount_minor
    OR NEW.gateway_currency IS DISTINCT FROM OLD.gateway_currency
    OR (
      NEW.payment_method IS DISTINCT FROM OLD.payment_method
      AND NOT (
        LOWER(BTRIM(COALESCE(OLD.payment_method, ''))) IN ('app_payment', 'apple_pay')
        AND LOWER(BTRIM(COALESCE(NEW.payment_method, ''))) = 'moyasar'
      )
    )
  ) THEN
    RAISE EXCEPTION 'Gateway-managed payment charge identity is immutable'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.status IS NOT DISTINCT FROM OLD.status
     AND NEW.gateway_status IS NOT DISTINCT FROM OLD.gateway_status
     AND NEW.gateway_response IS NOT DISTINCT FROM OLD.gateway_response
     AND NEW.gateway_verified_at IS NOT DISTINCT FROM OLD.gateway_verified_at
     AND NEW.gateway_failure_reason IS NOT DISTINCT FROM OLD.gateway_failure_reason THEN
    RETURN NEW;
  END IF;

  -- The only local state transitions allowed without provider evidence are
  -- the atomic protocol-v2 submission marker and abandonment before submit.
  IF OLD.status = 'pending'
     AND OLD.gateway_status = 'prepared_v2'
     AND NEW.status = 'pending_verification'
     AND NEW.gateway_status = 'submission_started'
     AND OLD.gateway_submission_started_at IS NULL
     AND NEW.gateway_submission_started_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'pending'
     AND OLD.gateway_status = 'prepared_v2'
     AND NEW.status = 'cancelled'
     AND NEW.gateway_status = 'not_submitted'
     AND OLD.gateway_submission_started_at IS NULL
     AND NEW.gateway_submission_started_at IS NULL
     AND NEW.gateway_abandoned_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.gateway_verified_at IS NULL
     OR NEW.gateway_verified_at IS NOT DISTINCT FROM OLD.gateway_verified_at
     OR NEW.gateway_response IS NULL
     OR NEW.gateway_response IS NOT DISTINCT FROM OLD.gateway_response
     OR jsonb_typeof(NEW.gateway_response) <> 'object' THEN
    RAISE EXCEPTION 'Gateway-managed payment status requires fresh provider evidence'
      USING ERRCODE = '23514';
  END IF;

  expected_minor := ROUND(NEW.amount::numeric * 100)::bigint;
  response_status := LOWER(BTRIM(COALESCE(NEW.gateway_response->>'status', '')));
  response_id := BTRIM(COALESCE(NEW.gateway_response->>'id', ''));
  response_currency := UPPER(BTRIM(COALESCE(NEW.gateway_response->>'currency', '')));

  IF COALESCE(NEW.gateway_response->>'amount', '') !~ '^[0-9]+$' THEN
    RAISE EXCEPTION 'Gateway-managed payment evidence amount is invalid'
      USING ERRCODE = '23514';
  END IF;
  response_amount := (NEW.gateway_response->>'amount')::bigint;
  response_captured := CASE
    WHEN COALESCE(NEW.gateway_response->>'captured', '') ~ '^[0-9]+$'
      THEN (NEW.gateway_response->>'captured')::bigint
    ELSE NULL
  END;
  response_refunded := CASE
    WHEN COALESCE(NEW.gateway_response->>'refunded', '') ~ '^[0-9]+$'
      THEN (NEW.gateway_response->>'refunded')::bigint
    ELSE NULL
  END;

  IF expected_minor IS NULL OR expected_minor <= 0
     OR (
       NEW.gateway_amount_minor IS NOT NULL
       AND NEW.gateway_amount_minor IS DISTINCT FROM expected_minor
     )
     OR response_amount IS DISTINCT FROM expected_minor
     OR response_currency <> 'SAR'
     OR response_id <> BTRIM(COALESCE(NEW.gateway_payment_id::text, ''))
     OR LOWER(BTRIM(COALESCE(NEW.gateway_provider, ''))) <> 'moyasar'
     OR response_status <> LOWER(BTRIM(COALESCE(NEW.gateway_status, ''))) THEN
    RAISE EXCEPTION 'Gateway-managed payment evidence identity, amount, currency, or status mismatch'
      USING ERRCODE = '23514';
  END IF;

  IF OLD.status = 'paid'
     AND NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status NOT IN ('refunded', 'cancelled') THEN
    RAISE EXCEPTION 'A paid gateway subscription may exit only through exact refund or void evidence'
      USING ERRCODE = '23514';
  END IF;

  IF OLD.status = 'pending_refund'
     AND NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status NOT IN ('refunded', 'cancelled') THEN
    RAISE EXCEPTION 'A pending-refund gateway subscription may exit only through exact refund or void evidence'
      USING ERRCODE = '23514';
  END IF;

  IF OLD.status = 'cancelled'
     AND OLD.gateway_verified_at IS NOT NULL
     AND LOWER(BTRIM(COALESCE(OLD.gateway_status, ''))) IN ('voided', 'canceled', 'cancelled') THEN
    RAISE EXCEPTION 'A verified provider cancellation cannot be resurrected'
      USING ERRCODE = '23514';
  END IF;

  IF OLD.status = 'refunded' THEN
    RAISE EXCEPTION 'A refunded gateway subscription cannot be resurrected'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.status IN ('paid', 'pending_refund')
     AND NEW.status IS DISTINCT FROM OLD.status
     AND OLD.status NOT IN ('pending', 'pending_verification') THEN
    RAISE EXCEPTION 'Gateway capture may settle only an open submitted payment'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.status IN ('paid', 'pending_refund') THEN
    IF response_status NOT IN ('paid', 'captured')
       OR (response_status = 'captured' AND response_captured IS DISTINCT FROM expected_minor) THEN
      RAISE EXCEPTION 'Gateway paid state requires exact full capture evidence'
        USING ERRCODE = '23514';
    END IF;
  ELSIF NEW.status = 'refunded' THEN
    IF response_status <> 'refunded'
       OR response_refunded IS DISTINCT FROM expected_minor
       OR NULLIF(BTRIM(COALESCE(NEW.gateway_response->>'refunded_at', '')), '') IS NULL THEN
      RAISE EXCEPTION 'Gateway refund state requires exact full timestamped refund evidence'
        USING ERRCODE = '23514';
    END IF;
  ELSIF NEW.status = 'cancelled' THEN
    IF response_status NOT IN ('voided', 'canceled', 'cancelled') THEN
      RAISE EXCEPTION 'Gateway cancellation state requires provider cancellation evidence'
        USING ERRCODE = '23514';
    END IF;
    IF OLD.status IN ('paid', 'pending_refund') AND (
      response_captured IS DISTINCT FROM expected_minor
      OR NULLIF(BTRIM(COALESCE(NEW.gateway_response->>'voided_at', '')), '') IS NULL
    ) THEN
      RAISE EXCEPTION 'Settled gateway cancellation requires exact full timestamped void evidence'
        USING ERRCODE = '23514';
    END IF;
  ELSIF NEW.status = 'failed' THEN
    IF response_status <> 'failed' THEN
      RAISE EXCEPTION 'Gateway failure state requires provider failure evidence'
        USING ERRCODE = '23514';
    END IF;
  ELSIF NEW.status = 'pending_verification' THEN
    IF response_status NOT IN ('initiated', 'authorized', 'verified') THEN
      RAISE EXCEPTION 'Gateway verification state requires provider pending evidence'
        USING ERRCODE = '23514';
    END IF;
  ELSE
    RAISE EXCEPTION 'Unsupported gateway-managed payment status transition'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_gateway_subscription_evidence ON public.payments;
CREATE TRIGGER trg_enforce_gateway_subscription_evidence
  BEFORE INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_gateway_subscription_evidence();

COMMENT ON FUNCTION public.enforce_gateway_subscription_evidence() IS
  'Prevents generic admin status/process/bulk APIs from mutating Moyasar subscription money without fresh exact provider evidence.';

COMMIT;
