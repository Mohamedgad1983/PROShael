-- A protocol-v2 checkout may be abandoned locally immediately before a
-- delayed provider submission becomes visible. Preserve the released local
-- state, but route an exact late capture into the controlled refund queue.
BEGIN;

CREATE OR REPLACE FUNCTION public.is_gateway_abandonment_exception_transition(
  old_status TEXT,
  old_gateway_status TEXT,
  old_failure_reason TEXT,
  old_financing_plan_id TEXT,
  new_status TEXT,
  new_gateway_status TEXT,
  new_verified_at TIMESTAMPTZ
) RETURNS BOOLEAN AS $$
  SELECT new_verified_at IS NOT NULL AND (
    (
      LOWER(BTRIM(COALESCE(old_status, ''))) = 'cancelled'
      AND LOWER(BTRIM(COALESCE(old_gateway_status, ''))) = 'not_submitted'
      AND (
        LOWER(BTRIM(COALESCE(new_status, ''))) IN ('pending_refund', 'refunded', 'failed')
        OR (
          LOWER(BTRIM(COALESCE(new_status, ''))) = 'cancelled'
          AND LOWER(BTRIM(COALESCE(new_gateway_status, ''))) IN ('voided', 'canceled', 'cancelled')
        )
      )
    )
    OR (
      LOWER(BTRIM(COALESCE(old_status, ''))) = 'pending_refund'
      AND old_failure_reason = 'CAPTURE_AFTER_LOCAL_ABANDONMENT'
      AND NULLIF(BTRIM(COALESCE(old_financing_plan_id, '')), '') IS NOT NULL
      AND (
        LOWER(BTRIM(COALESCE(new_status, ''))) = 'refunded'
        OR (
          LOWER(BTRIM(COALESCE(new_status, ''))) = 'cancelled'
          AND LOWER(BTRIM(COALESCE(new_gateway_status, ''))) = 'voided'
        )
      )
    )
  );
$$ LANGUAGE SQL IMMUTABLE PARALLEL SAFE;

CREATE OR REPLACE FUNCTION public.enforce_gateway_capture_after_abandonment()
RETURNS TRIGGER AS $$
DECLARE
  initial_resolution BOOLEAN;
  financing_refund_resolution BOOLEAN;
  expected_minor BIGINT;
  response_id TEXT;
  response_given_id TEXT;
  response_status TEXT;
  response_currency TEXT;
  response_amount BIGINT;
  response_captured BIGINT;
  response_refunded BIGINT;
  response_refunded_at TEXT;
  response_voided_at TEXT;
BEGIN
  initial_resolution :=
    OLD.status = 'cancelled'
    AND LOWER(BTRIM(COALESCE(OLD.gateway_status, ''))) = 'not_submitted';
  financing_refund_resolution :=
    OLD.status = 'pending_refund'
    AND OLD.gateway_failure_reason = 'CAPTURE_AFTER_LOCAL_ABANDONMENT'
    AND OLD.financing_plan_id IS NOT NULL;

  IF TG_OP <> 'UPDATE'
     OR NOT public.is_gateway_abandonment_exception_transition(
       OLD.status::text,
       OLD.gateway_status::text,
       OLD.gateway_failure_reason::text,
       OLD.financing_plan_id::text,
       NEW.status::text,
       NEW.gateway_status::text,
       NEW.gateway_verified_at
     ) THEN
    RAISE EXCEPTION 'Invalid capture-after-abandonment transition'
      USING ERRCODE = '23514';
  END IF;

  IF (to_jsonb(NEW) - ARRAY[
        'status', 'payment_method', 'gateway_status', 'gateway_response',
        'gateway_verified_at', 'gateway_failure_reason', 'processed_at', 'updated_at'
      ]::text[]) IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY[
        'status', 'payment_method', 'gateway_status', 'gateway_response',
        'gateway_verified_at', 'gateway_failure_reason', 'processed_at', 'updated_at'
      ]::text[]) THEN
    RAISE EXCEPTION 'Capture-after-abandonment charge identity is immutable'
      USING ERRCODE = '23514';
  END IF;

  IF LOWER(BTRIM(COALESCE(NEW.gateway_provider, ''))) <> 'moyasar'
     OR LOWER(BTRIM(COALESCE(NEW.payment_method, ''))) <> 'moyasar'
     OR NULLIF(BTRIM(COALESCE(NEW.gateway_payment_id::text, '')), '') IS NULL
     OR NEW.gateway_protocol_version IS DISTINCT FROM 2
     OR NEW.gateway_submission_started_at IS NOT NULL
     OR NEW.gateway_abandoned_at IS NULL
     OR NEW.gateway_verified_at IS NULL
     OR NEW.gateway_verified_at IS NOT DISTINCT FROM OLD.gateway_verified_at
     OR NEW.gateway_response IS NULL
     OR NEW.gateway_response IS NOT DISTINCT FROM OLD.gateway_response
     OR jsonb_typeof(NEW.gateway_response) IS DISTINCT FROM 'object'
     OR NOT (NEW.financing_plan_id IS NOT NULL OR NEW.category = 'subscription') THEN
    RAISE EXCEPTION 'Capture-after-abandonment requires canonical gateway state and fresh evidence'
      USING ERRCODE = '23514';
  END IF;

  IF initial_resolution AND (
    OLD.gateway_verified_at IS NOT NULL
    OR OLD.gateway_abandoned_at IS NULL
    OR OLD.gateway_failure_reason NOT IN (
      'CLIENT_CANCELLED_BEFORE_PROVIDER_SUBMISSION',
      'SESSION_EXPIRED_BEFORE_PROVIDER_SUBMISSION'
    )
  ) THEN
    RAISE EXCEPTION 'Capture-after-abandonment requires a canonical local abandonment'
      USING ERRCODE = '23514';
  END IF;

  expected_minor := ROUND(NEW.amount::numeric * 100)::bigint;
  IF expected_minor IS NULL OR expected_minor <= 0
     OR NEW.gateway_amount_minor IS DISTINCT FROM expected_minor
     OR UPPER(BTRIM(COALESCE(NEW.gateway_currency, ''))) <> 'SAR' THEN
    RAISE EXCEPTION 'Capture-after-abandonment local amount or currency is invalid'
      USING ERRCODE = '23514';
  END IF;

  response_id := NULLIF(BTRIM(NEW.gateway_response->>'id'), '');
  response_given_id := NULLIF(BTRIM(NEW.gateway_response->>'given_id'), '');
  response_status := LOWER(BTRIM(COALESCE(NEW.gateway_response->>'status', '')));
  response_currency := UPPER(BTRIM(COALESCE(NEW.gateway_response->>'currency', '')));
  response_refunded_at := NULLIF(BTRIM(NEW.gateway_response->>'refunded_at'), '');
  response_voided_at := NULLIF(BTRIM(NEW.gateway_response->>'voided_at'), '');

  IF COALESCE(NEW.gateway_response->>'amount', '') !~ '^[0-9]+$' THEN
    RAISE EXCEPTION 'Capture-after-abandonment provider amount is invalid'
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

  IF response_id IS DISTINCT FROM BTRIM(NEW.gateway_payment_id::text)
     OR (response_given_id IS NOT NULL
         AND response_given_id IS DISTINCT FROM BTRIM(NEW.gateway_payment_id::text))
     OR response_amount IS DISTINCT FROM expected_minor
     OR response_currency <> 'SAR'
     OR response_status <> LOWER(BTRIM(COALESCE(NEW.gateway_status, ''))) THEN
    RAISE EXCEPTION 'Capture-after-abandonment provider identity or amount mismatch'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.financing_plan_id IS NOT NULL AND EXISTS (
    SELECT 1
      FROM public.financing_payment_allocations a
     WHERE a.payment_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'Abandoned financing capture cannot have installment allocations'
      USING ERRCODE = '23514';
  END IF;

  IF initial_resolution AND NEW.status = 'pending_refund' THEN
    IF NEW.gateway_failure_reason IS DISTINCT FROM 'CAPTURE_AFTER_LOCAL_ABANDONMENT'
       OR response_status NOT IN ('paid', 'captured')
       OR (
         response_status = 'captured'
         AND response_captured IS DISTINCT FROM expected_minor
       ) THEN
      RAISE EXCEPTION 'Late abandoned capture requires exact full paid/captured evidence'
        USING ERRCODE = '23514';
    END IF;
  ELSIF NEW.status = 'refunded' THEN
    IF response_status <> 'refunded'
       OR response_refunded IS DISTINCT FROM expected_minor
       OR response_refunded_at IS NULL THEN
      RAISE EXCEPTION 'Abandoned payment refund requires exact full timestamped evidence'
        USING ERRCODE = '23514';
    END IF;
  ELSIF NEW.status = 'cancelled' THEN
    IF response_status NOT IN ('voided', 'canceled', 'cancelled')
       OR (
         financing_refund_resolution
         AND (
           response_status <> 'voided'
           OR response_captured IS DISTINCT FROM expected_minor
           OR response_voided_at IS NULL
         )
       ) THEN
      RAISE EXCEPTION 'Abandoned payment cancellation requires exact provider evidence'
        USING ERRCODE = '23514';
    END IF;
  ELSIF initial_resolution AND NEW.status = 'failed' THEN
    IF response_status <> 'failed' THEN
      RAISE EXCEPTION 'Abandoned payment failure requires provider failure evidence'
        USING ERRCODE = '23514';
    END IF;
  ELSE
    RAISE EXCEPTION 'Unsupported capture-after-abandonment resolution'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE PLPGSQL;

-- Route only the narrow late-provider transitions around the historical
-- protocol, financing, pending-refund and subscription guards. Every routed
-- transition is validated by enforce_gateway_capture_after_abandonment().
DROP TRIGGER IF EXISTS trg_enforce_gateway_protocol_v2_state ON public.payments;
DROP TRIGGER IF EXISTS trg_enforce_gateway_protocol_v2_state_insert ON public.payments;
CREATE TRIGGER trg_enforce_gateway_protocol_v2_state_insert
  BEFORE INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_gateway_protocol_v2_state();
CREATE TRIGGER trg_enforce_gateway_protocol_v2_state
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  WHEN (NOT public.is_gateway_abandonment_exception_transition(
    OLD.status::text, OLD.gateway_status::text, OLD.gateway_failure_reason::text,
    OLD.financing_plan_id::text, NEW.status::text, NEW.gateway_status::text,
    NEW.gateway_verified_at
  ))
  EXECUTE FUNCTION public.enforce_gateway_protocol_v2_state();

DROP TRIGGER IF EXISTS trg_enforce_financing_payment_settlement ON public.payments;
DROP TRIGGER IF EXISTS trg_enforce_financing_payment_settlement_insert ON public.payments;
DROP TRIGGER IF EXISTS trg_enforce_financing_payment_settlement_delete ON public.payments;
CREATE TRIGGER trg_enforce_financing_payment_settlement_insert
  BEFORE INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_financing_payment_settlement();
CREATE TRIGGER trg_enforce_financing_payment_settlement_delete
  BEFORE DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_financing_payment_settlement();
CREATE TRIGGER trg_enforce_financing_payment_settlement
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  WHEN (NOT public.is_gateway_abandonment_exception_transition(
    OLD.status::text, OLD.gateway_status::text, OLD.gateway_failure_reason::text,
    OLD.financing_plan_id::text, NEW.status::text, NEW.gateway_status::text,
    NEW.gateway_verified_at
  ))
  EXECUTE FUNCTION public.enforce_financing_payment_settlement();

DROP TRIGGER IF EXISTS trg_enforce_gateway_pending_refund_state ON public.payments;
DROP TRIGGER IF EXISTS trg_enforce_gateway_pending_refund_state_insert ON public.payments;
DROP TRIGGER IF EXISTS trg_enforce_gateway_pending_refund_state_delete ON public.payments;
CREATE TRIGGER trg_enforce_gateway_pending_refund_state_insert
  BEFORE INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_gateway_pending_refund_state();
CREATE TRIGGER trg_enforce_gateway_pending_refund_state_delete
  BEFORE DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_gateway_pending_refund_state();
CREATE TRIGGER trg_enforce_gateway_pending_refund_state
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  WHEN (NOT public.is_gateway_abandonment_exception_transition(
    OLD.status::text, OLD.gateway_status::text, OLD.gateway_failure_reason::text,
    OLD.financing_plan_id::text, NEW.status::text, NEW.gateway_status::text,
    NEW.gateway_verified_at
  ))
  EXECUTE FUNCTION public.enforce_gateway_pending_refund_state();

DROP TRIGGER IF EXISTS trg_enforce_gateway_subscription_evidence ON public.payments;
DROP TRIGGER IF EXISTS trg_enforce_gateway_subscription_evidence_insert ON public.payments;
CREATE TRIGGER trg_enforce_gateway_subscription_evidence_insert
  BEFORE INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_gateway_subscription_evidence();
CREATE TRIGGER trg_enforce_gateway_subscription_evidence
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  WHEN (NOT public.is_gateway_abandonment_exception_transition(
    OLD.status::text, OLD.gateway_status::text, OLD.gateway_failure_reason::text,
    OLD.financing_plan_id::text, NEW.status::text, NEW.gateway_status::text,
    NEW.gateway_verified_at
  ))
  EXECUTE FUNCTION public.enforce_gateway_subscription_evidence();

DROP TRIGGER IF EXISTS trg_enforce_gateway_capture_after_abandonment ON public.payments;
CREATE TRIGGER trg_enforce_gateway_capture_after_abandonment
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  WHEN (public.is_gateway_abandonment_exception_transition(
    OLD.status::text, OLD.gateway_status::text, OLD.gateway_failure_reason::text,
    OLD.financing_plan_id::text, NEW.status::text, NEW.gateway_status::text,
    NEW.gateway_verified_at
  ))
  EXECUTE FUNCTION public.enforce_gateway_capture_after_abandonment();

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_gateway_protocol_v2_shape_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_gateway_protocol_v2_shape_check CHECK (
    gateway_protocol_version IS DISTINCT FROM 2
    OR (
      NULLIF(BTRIM(gateway_provider), '') IS NOT NULL
      AND NULLIF(BTRIM(gateway_payment_id::text), '') IS NOT NULL
      AND gateway_amount_minor = ROUND(amount * 100)::bigint
      AND NULLIF(BTRIM(gateway_currency), '') IS NOT NULL
      AND (
        (
          gateway_submission_started_at IS NULL
          AND gateway_status = 'prepared_v2'
          AND status = 'pending'
          AND gateway_abandoned_at IS NULL
          AND gateway_verified_at IS NULL
        )
        OR (
          gateway_submission_started_at IS NULL
          AND gateway_status = 'not_submitted'
          AND status = 'cancelled'
          AND gateway_abandoned_at IS NOT NULL
          AND gateway_verified_at IS NULL
        )
        OR (
          gateway_submission_started_at IS NULL
          AND gateway_abandoned_at IS NOT NULL
          AND gateway_verified_at IS NOT NULL
          AND (
            (
              status = 'pending_refund'
              AND gateway_status IN ('paid', 'captured')
              AND gateway_failure_reason = 'CAPTURE_AFTER_LOCAL_ABANDONMENT'
            )
            OR (status = 'refunded' AND gateway_status = 'refunded')
            OR (status = 'failed' AND gateway_status = 'failed')
            OR (
              status = 'cancelled'
              AND gateway_status IN ('voided', 'canceled', 'cancelled')
            )
          )
        )
        OR (
          gateway_submission_started_at IS NOT NULL
          AND gateway_status NOT IN ('prepared_v2', 'not_submitted')
          AND status <> 'pending'
          AND gateway_abandoned_at IS NULL
        )
      )
    )
  );

CREATE INDEX IF NOT EXISTS idx_payments_recent_gateway_abandonment
  ON public.payments ((COALESCE(gateway_abandoned_at, updated_at, created_at)), id)
  WHERE status = 'cancelled'
    AND gateway_status = 'not_submitted'
    AND gateway_provider = 'moyasar'
    AND gateway_payment_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.prevent_gateway_managed_payment_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF NULLIF(BTRIM(COALESCE(OLD.gateway_provider, '')), '') IS NOT NULL
     OR NULLIF(BTRIM(COALESCE(OLD.gateway_payment_id::text, '')), '') IS NOT NULL
     OR OLD.financing_plan_id IS NOT NULL
     OR LOWER(BTRIM(COALESCE(OLD.payment_method, ''))) IN (
       'app_payment', 'apple_pay', 'moyasar'
     ) THEN
    RAISE EXCEPTION 'Gateway-managed payments cannot be hard-deleted'
      USING ERRCODE = '23514';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE PLPGSQL;

DROP TRIGGER IF EXISTS trg_prevent_gateway_managed_payment_delete ON public.payments;
CREATE TRIGGER trg_prevent_gateway_managed_payment_delete
  BEFORE DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.prevent_gateway_managed_payment_delete();

CREATE OR REPLACE FUNCTION public.enforce_gateway_refund_operation_identity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_id IS DISTINCT FROM OLD.payment_id
     OR NEW.gateway_provider IS DISTINCT FROM OLD.gateway_provider
     OR NEW.gateway_payment_id IS DISTINCT FROM OLD.gateway_payment_id
     OR NEW.amount_minor IS DISTINCT FROM OLD.amount_minor
     OR NEW.currency IS DISTINCT FROM OLD.currency THEN
    RAISE EXCEPTION 'Gateway refund operation identity is immutable'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE PLPGSQL;

DROP TRIGGER IF EXISTS trg_enforce_gateway_refund_operation_identity
  ON public.gateway_refund_operations;
CREATE TRIGGER trg_enforce_gateway_refund_operation_identity
  BEFORE UPDATE ON public.gateway_refund_operations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_gateway_refund_operation_identity();

COMMIT;
