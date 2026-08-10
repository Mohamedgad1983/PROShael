-- Gateway checkout protocol v2
--
-- A v2 checkout is persisted before the client contacts Moyasar.  The client
-- must then atomically mark the row as submission_started immediately before
-- its first provider request.  Only a row that is still prepared_v2 can be
-- abandoned locally.  Once submission has started, absence at the provider is
-- not proof of absence forever, so the gateway identity remains reserved for
-- reconciliation and idempotent retry.
--
-- Forward-only and safe to apply repeatedly.  Existing (NULL protocol) rows
-- remain conservative legacy sessions and are not rewritten.

BEGIN;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS gateway_protocol_version SMALLINT,
  ADD COLUMN IF NOT EXISTS gateway_submission_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS gateway_abandoned_at TIMESTAMPTZ;

COMMENT ON COLUMN public.payments.gateway_protocol_version IS
  'Client/backend checkout handshake version. NULL is a conservative legacy session; version 2 uses the prepared/submission marker state machine.';
COMMENT ON COLUMN public.payments.gateway_submission_started_at IS
  'Atomic proof that the client was authorised to begin the first provider request; never cleared after it is set.';
COMMENT ON COLUMN public.payments.gateway_abandoned_at IS
  'Set only when a prepared v2 session is proven never submitted and is released locally.';

-- Provider states `captured` and `refunded` may represent partial amounts.
-- Never infer a full local credit/debit from the status word alone. Every
-- mismatched amount is quarantined here without changing payment, member, plan,
-- installment, or allocation state. The evidence hash makes webhook/reconciler
-- retries idempotent while occurrence_count preserves their audit frequency.
CREATE TABLE IF NOT EXISTS public.gateway_financial_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  gateway_provider VARCHAR(40) NOT NULL,
  gateway_payment_id TEXT NOT NULL,
  provider_status VARCHAR(30) NOT NULL
    CONSTRAINT gateway_financial_exceptions_provider_status_check
    CHECK (provider_status IN ('captured', 'refunded', 'voided')),
  exception_kind VARCHAR(30) NOT NULL
    CONSTRAINT gateway_financial_exceptions_exception_kind_check
    CHECK (exception_kind IN ('partial_capture', 'partial_refund', 'invalid_void_evidence')),
  expected_minor BIGINT NOT NULL CHECK (expected_minor > 0),
  actual_minor BIGINT CHECK (actual_minor IS NULL OR actual_minor >= 0),
  currency VARCHAR(3) NOT NULL,
  evidence_hash VARCHAR(64) NOT NULL CHECK (evidence_hash ~ '^[0-9a-f]{64}$'),
  provider_response JSONB NOT NULL,
  review_status VARCHAR(20) NOT NULL DEFAULT 'open'
    CHECK (review_status IN ('open', 'resolved', 'dismissed')),
  occurrence_count INTEGER NOT NULL DEFAULT 1 CHECK (occurrence_count > 0),
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  CONSTRAINT gateway_financial_exception_review_shape_check CHECK (
    (review_status = 'open' AND reviewed_at IS NULL)
    OR (review_status IN ('resolved', 'dismissed') AND reviewed_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_gateway_financial_exception_evidence
  ON public.gateway_financial_exceptions(payment_id, provider_status, evidence_hash);

CREATE INDEX IF NOT EXISTS idx_gateway_financial_exceptions_open
  ON public.gateway_financial_exceptions(review_status, last_seen_at DESC)
  WHERE review_status = 'open';

COMMENT ON TABLE public.gateway_financial_exceptions IS
  'Durable no-balance-mutation quarantine for partial/invalid provider capture and refund evidence.';

-- Earlier rehearsals of this repeat-safe migration installed the narrower
-- capture/refund checks. Widen those named constraints without rewriting any
-- evidence rows so a contradictory void of previously captured money can be
-- quarantined by the same immutable review workflow.
DO $$
DECLARE
  constraint_definition TEXT;
BEGIN
  SELECT pg_get_constraintdef(oid)
    INTO constraint_definition
    FROM pg_constraint
   WHERE conrelid = 'public.gateway_financial_exceptions'::regclass
     AND conname = 'gateway_financial_exceptions_provider_status_check';

  IF constraint_definition IS NOT NULL
     AND POSITION('voided' IN constraint_definition) = 0 THEN
    ALTER TABLE public.gateway_financial_exceptions
      DROP CONSTRAINT gateway_financial_exceptions_provider_status_check;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.gateway_financial_exceptions'::regclass
       AND conname = 'gateway_financial_exceptions_provider_status_check'
  ) THEN
    ALTER TABLE public.gateway_financial_exceptions
      ADD CONSTRAINT gateway_financial_exceptions_provider_status_check
      CHECK (provider_status IN ('captured', 'refunded', 'voided')) NOT VALID;
  END IF;

  SELECT pg_get_constraintdef(oid)
    INTO constraint_definition
    FROM pg_constraint
   WHERE conrelid = 'public.gateway_financial_exceptions'::regclass
     AND conname = 'gateway_financial_exceptions_exception_kind_check';

  IF constraint_definition IS NOT NULL
     AND POSITION('invalid_void_evidence' IN constraint_definition) = 0 THEN
    ALTER TABLE public.gateway_financial_exceptions
      DROP CONSTRAINT gateway_financial_exceptions_exception_kind_check;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.gateway_financial_exceptions'::regclass
       AND conname = 'gateway_financial_exceptions_exception_kind_check'
  ) THEN
    ALTER TABLE public.gateway_financial_exceptions
      ADD CONSTRAINT gateway_financial_exceptions_exception_kind_check
      CHECK (
        exception_kind IN ('partial_capture', 'partial_refund', 'invalid_void_evidence')
      ) NOT VALID;
  END IF;
END $$;

ALTER TABLE public.gateway_financial_exceptions
  VALIDATE CONSTRAINT gateway_financial_exceptions_provider_status_check;
ALTER TABLE public.gateway_financial_exceptions
  VALIDATE CONSTRAINT gateway_financial_exceptions_exception_kind_check;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.gateway_financial_exceptions'::regclass
       AND conname = 'gateway_financial_exception_review_shape_check'
  ) THEN
    ALTER TABLE public.gateway_financial_exceptions
      ADD CONSTRAINT gateway_financial_exception_review_shape_check CHECK (
        (review_status = 'open' AND reviewed_at IS NULL)
        OR (review_status IN ('resolved', 'dismissed') AND reviewed_at IS NOT NULL)
      ) NOT VALID;
    ALTER TABLE public.gateway_financial_exceptions
      VALIDATE CONSTRAINT gateway_financial_exception_review_shape_check;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.enforce_gateway_financial_exception_evidence()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Gateway financial exception evidence cannot be deleted'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.payment_id IS DISTINCT FROM OLD.payment_id
     OR NEW.gateway_provider IS DISTINCT FROM OLD.gateway_provider
     OR NEW.gateway_payment_id IS DISTINCT FROM OLD.gateway_payment_id
     OR NEW.provider_status IS DISTINCT FROM OLD.provider_status
     OR NEW.exception_kind IS DISTINCT FROM OLD.exception_kind
     OR NEW.expected_minor IS DISTINCT FROM OLD.expected_minor
     OR NEW.actual_minor IS DISTINCT FROM OLD.actual_minor
     OR NEW.currency IS DISTINCT FROM OLD.currency
     OR NEW.evidence_hash IS DISTINCT FROM OLD.evidence_hash
     OR NEW.provider_response IS DISTINCT FROM OLD.provider_response
     OR NEW.first_seen_at IS DISTINCT FROM OLD.first_seen_at THEN
    RAISE EXCEPTION 'Gateway financial exception identity and evidence are immutable'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.occurrence_count < OLD.occurrence_count THEN
    RAISE EXCEPTION 'Gateway financial exception occurrence count cannot decrease'
      USING ERRCODE = '23514';
  END IF;
  IF NEW.last_seen_at < OLD.last_seen_at THEN
    RAISE EXCEPTION 'Gateway financial exception last-seen time cannot move backwards'
      USING ERRCODE = '23514';
  END IF;
  IF OLD.review_status IN ('resolved', 'dismissed') AND NEW.review_status = 'open' THEN
    RAISE EXCEPTION 'A reviewed gateway financial exception cannot be reopened in place'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_gateway_financial_exception_evidence
  ON public.gateway_financial_exceptions;
CREATE TRIGGER trg_enforce_gateway_financial_exception_evidence
  BEFORE UPDATE OR DELETE ON public.gateway_financial_exceptions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_gateway_financial_exception_evidence();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.payments'::regclass
       AND conname = 'payments_gateway_protocol_version_check'
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_gateway_protocol_version_check
      CHECK (gateway_protocol_version IS NULL OR gateway_protocol_version >= 2)
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.payments'::regclass
       AND conname = 'payments_gateway_protocol_v2_shape_check'
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_gateway_protocol_v2_shape_check
      CHECK (
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
              gateway_submission_started_at IS NOT NULL
              AND gateway_status NOT IN ('prepared_v2', 'not_submitted')
              AND status <> 'pending'
              AND gateway_abandoned_at IS NULL
            )
          )
        )
      ) NOT VALID;
  END IF;
END $$;

ALTER TABLE public.payments
  VALIDATE CONSTRAINT payments_gateway_protocol_version_check;
ALTER TABLE public.payments
  VALIDATE CONSTRAINT payments_gateway_protocol_v2_shape_check;

-- Prevent a second live provider identity for the same subscription
-- beneficiary. The application reuses an exact same-payer/same-amount v2 row;
-- a different payer or amount conflicts until this row reaches a terminal
-- state. COALESCE preserves safety for historical rows with NULL beneficiary.
CREATE UNIQUE INDEX IF NOT EXISTS uq_subscription_one_open_gateway_intent_per_beneficiary
  ON public.payments ((COALESCE(beneficiary_id, payer_id)))
  WHERE financing_plan_id IS NULL
    AND category = 'subscription'
    AND LOWER(BTRIM(gateway_provider)) = 'moyasar'
    AND gateway_protocol_version = 2
    AND status IN ('pending', 'pending_verification');

CREATE OR REPLACE FUNCTION public.enforce_gateway_protocol_v2_state()
RETURNS TRIGGER AS $$
DECLARE
  marker_transition BOOLEAN := FALSE;
  abandon_transition BOOLEAN := FALSE;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.gateway_protocol_version = 2 THEN
      IF NEW.status IS DISTINCT FROM 'pending'
         OR NEW.gateway_status IS DISTINCT FROM 'prepared_v2'
         OR NEW.gateway_submission_started_at IS NOT NULL
         OR NEW.gateway_abandoned_at IS NOT NULL
         OR NEW.gateway_verified_at IS NOT NULL THEN
        RAISE EXCEPTION 'Gateway protocol v2 rows must start prepared and unsubmitted'
          USING ERRCODE = '23514';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.gateway_protocol_version IS DISTINCT FROM NEW.gateway_protocol_version THEN
    RAISE EXCEPTION 'Gateway protocol version is immutable'
      USING ERRCODE = '23514';
  END IF;

  IF OLD.gateway_protocol_version IS DISTINCT FROM 2 THEN
    RETURN NEW;
  END IF;

  -- These fields identify one exact provider charge.  Protocol-v2 cancellation
  -- releases only the local plan/scope reservation; it never repurposes the
  -- same payment row or given_id for a different amount or member.
  IF NEW.payer_id IS DISTINCT FROM OLD.payer_id
     OR NEW.beneficiary_id IS DISTINCT FROM OLD.beneficiary_id
     OR NEW.amount IS DISTINCT FROM OLD.amount
     OR NEW.category IS DISTINCT FROM OLD.category
     OR NEW.financing_plan_id IS DISTINCT FROM OLD.financing_plan_id
     OR NEW.financing_payment_scope IS DISTINCT FROM OLD.financing_payment_scope
     OR NEW.gateway_provider IS DISTINCT FROM OLD.gateway_provider
     OR NEW.gateway_payment_id IS DISTINCT FROM OLD.gateway_payment_id
     OR NEW.gateway_amount_minor IS DISTINCT FROM OLD.gateway_amount_minor
     OR NEW.gateway_currency IS DISTINCT FROM OLD.gateway_currency THEN
    RAISE EXCEPTION 'Gateway protocol v2 charge identity is immutable'
      USING ERRCODE = '23514';
  END IF;

  marker_transition :=
    OLD.status = 'pending'
    AND OLD.gateway_status = 'prepared_v2'
    AND OLD.gateway_submission_started_at IS NULL
    AND OLD.gateway_abandoned_at IS NULL
    AND NEW.status = 'pending_verification'
    AND NEW.gateway_status = 'submission_started'
    AND NEW.gateway_submission_started_at IS NOT NULL
    AND NEW.gateway_abandoned_at IS NULL
    AND NEW.gateway_verified_at IS NULL
    AND NEW.gateway_failure_reason IS NULL
    AND NEW.gateway_response IS NOT DISTINCT FROM OLD.gateway_response;

  abandon_transition :=
    OLD.status = 'pending'
    AND OLD.gateway_status = 'prepared_v2'
    AND OLD.gateway_submission_started_at IS NULL
    AND OLD.gateway_abandoned_at IS NULL
    AND NEW.status = 'cancelled'
    AND NEW.gateway_status = 'not_submitted'
    AND NEW.gateway_submission_started_at IS NULL
    AND NEW.gateway_abandoned_at IS NOT NULL
    AND NEW.gateway_verified_at IS NULL
    AND NEW.gateway_failure_reason IN (
      'CLIENT_CANCELLED_BEFORE_PROVIDER_SUBMISSION',
      'SESSION_EXPIRED_BEFORE_PROVIDER_SUBMISSION'
    )
    AND NEW.gateway_response IS NOT DISTINCT FROM OLD.gateway_response;

  IF OLD.gateway_status = 'prepared_v2'
     AND (
       NEW.status IS DISTINCT FROM OLD.status
       OR NEW.gateway_status IS DISTINCT FROM OLD.gateway_status
       OR NEW.gateway_submission_started_at IS DISTINCT FROM OLD.gateway_submission_started_at
       OR NEW.gateway_abandoned_at IS DISTINCT FROM OLD.gateway_abandoned_at
       OR NEW.gateway_verified_at IS DISTINCT FROM OLD.gateway_verified_at
       OR NEW.gateway_failure_reason IS DISTINCT FROM OLD.gateway_failure_reason
       OR NEW.gateway_response IS DISTINCT FROM OLD.gateway_response
     )
     AND NOT marker_transition
     AND NOT abandon_transition THEN
    RAISE EXCEPTION 'Prepared gateway session may only start submission or become not_submitted'
      USING ERRCODE = '23514';
  END IF;

  IF OLD.gateway_submission_started_at IS NOT NULL THEN
    IF NEW.gateway_submission_started_at IS DISTINCT FROM OLD.gateway_submission_started_at
       OR NEW.gateway_abandoned_at IS NOT NULL
       OR NEW.gateway_status = 'not_submitted' THEN
      RAISE EXCEPTION 'Submitted gateway identity must remain reserved for reconciliation'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF OLD.status = 'cancelled' AND OLD.gateway_status = 'not_submitted' THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.gateway_status IS DISTINCT FROM OLD.gateway_status
       OR NEW.gateway_submission_started_at IS DISTINCT FROM OLD.gateway_submission_started_at
       OR NEW.gateway_abandoned_at IS DISTINCT FROM OLD.gateway_abandoned_at
       OR NEW.gateway_failure_reason IS DISTINCT FROM OLD.gateway_failure_reason
       OR NEW.gateway_response IS DISTINCT FROM OLD.gateway_response
       OR NEW.gateway_verified_at IS DISTINCT FROM OLD.gateway_verified_at THEN
      RAISE EXCEPTION 'A not-submitted gateway session is terminal'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_gateway_protocol_v2_state ON public.payments;
CREATE TRIGGER trg_enforce_gateway_protocol_v2_state
  BEFORE INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_gateway_protocol_v2_state();

-- Extend the existing financing settlement guard with exactly two additions:
-- (1) prepared-v2 sessions may be proven not submitted and released locally;
-- (2) Moyasar's official refunded status is a terminal provider result.
CREATE OR REPLACE FUNCTION public.enforce_financing_payment_settlement()
RETURNS TRIGGER AS $$
DECLARE
  is_paid_transition BOOLEAN := FALSE;
  allocated_amount NUMERIC(12,2);
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.financing_plan_id IS NOT NULL THEN
      RAISE EXCEPTION 'Financing payment rows cannot be deleted'
        USING ERRCODE = '23514';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.financing_plan_id IS NOT NULL THEN
    IF NEW.financing_plan_id IS DISTINCT FROM OLD.financing_plan_id
       OR NEW.payer_id IS DISTINCT FROM OLD.payer_id
       OR NEW.amount IS DISTINCT FROM OLD.amount
       OR NEW.financing_payment_scope IS DISTINCT FROM OLD.financing_payment_scope
       OR NEW.gateway_provider IS DISTINCT FROM OLD.gateway_provider
       OR NEW.gateway_payment_id IS DISTINCT FROM OLD.gateway_payment_id THEN
      RAISE EXCEPTION 'Financing payment charge identity is immutable'
        USING ERRCODE = '23514';
    END IF;

    IF OLD.status = 'paid' AND (
      NEW.status IS DISTINCT FROM OLD.status
      OR NEW.gateway_status IS DISTINCT FROM OLD.gateway_status
      OR NEW.gateway_verified_at IS DISTINCT FROM OLD.gateway_verified_at
      OR NEW.gateway_response IS DISTINCT FROM OLD.gateway_response
    ) THEN
      RAISE EXCEPTION 'A settled financing payment is immutable'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status
       AND NOT (
         OLD.status IN ('pending', 'pending_verification')
         AND NEW.status = 'pending_verification'
       )
       AND NOT (NEW.status = 'paid')
       AND NOT (
         OLD.status = 'pending'
         AND OLD.gateway_protocol_version = 2
         AND OLD.gateway_status = 'prepared_v2'
         AND OLD.gateway_submission_started_at IS NULL
         AND NEW.status = 'cancelled'
         AND NEW.gateway_status = 'not_submitted'
         AND NEW.gateway_submission_started_at IS NULL
         AND NEW.gateway_verified_at IS NULL
         AND NEW.gateway_failure_reason IN (
           'CLIENT_CANCELLED_BEFORE_PROVIDER_SUBMISSION',
           'SESSION_EXPIRED_BEFORE_PROVIDER_SUBMISSION'
         )
       )
       AND NOT (
         OLD.status IN ('pending', 'pending_verification')
         AND NEW.gateway_verified_at IS NOT NULL
         AND NEW.gateway_response IS NOT NULL
         AND (
           (NEW.status = 'failed' AND LOWER(BTRIM(NEW.gateway_status)) = 'failed')
           OR (NEW.status = 'cancelled' AND LOWER(BTRIM(NEW.gateway_status)) IN ('voided', 'canceled', 'cancelled'))
           OR (NEW.status = 'refunded' AND LOWER(BTRIM(NEW.gateway_status)) = 'refunded')
         )
       ) THEN
      RAISE EXCEPTION 'Financing payment status may change only from verified provider evidence'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF NEW.financing_plan_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.financing_payment_scope NOT IN ('next', 'all') THEN
    RAISE EXCEPTION 'Financing payment scope must be next or all'
      USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.financing_repayment_plans p
     WHERE p.id = NEW.financing_plan_id
       AND p.member_id = NEW.payer_id
  ) THEN
    RAISE EXCEPTION 'Financing payment payer must own the repayment plan'
      USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    is_paid_transition := NEW.status = 'paid'
      AND (
        OLD.status IS DISTINCT FROM 'paid'
        OR OLD.financing_plan_id IS DISTINCT FROM NEW.financing_plan_id
      );
  ELSE
    is_paid_transition := NEW.status = 'paid';
  END IF;

  IF is_paid_transition THEN
    IF NULLIF(BTRIM(NEW.gateway_provider), '') IS NULL
       OR NULLIF(BTRIM(NEW.gateway_payment_id::text), '') IS NULL
       OR COALESCE(LOWER(BTRIM(NEW.gateway_status)), '') <> 'paid'
       OR NEW.gateway_verified_at IS NULL
       OR NEW.gateway_amount_minor IS DISTINCT FROM ROUND(NEW.amount * 100)::bigint
       OR COALESCE(UPPER(BTRIM(NEW.gateway_currency)), '') <> 'SAR' THEN
      RAISE EXCEPTION 'Financing payment requires verified gateway settlement'
        USING ERRCODE = '23514';
    END IF;

    SELECT COALESCE(SUM(a.amount), 0)
      INTO allocated_amount
      FROM public.financing_payment_allocations a
     WHERE a.payment_id = NEW.id;

    IF allocated_amount IS DISTINCT FROM NEW.amount
       OR EXISTS (
         SELECT 1
           FROM public.financing_payment_allocations a
           LEFT JOIN public.financing_installments i ON i.id = a.installment_id
             WHERE a.payment_id = NEW.id
            AND (
              a.plan_id IS DISTINCT FROM NEW.financing_plan_id
              OR i.plan_id IS DISTINCT FROM NEW.financing_plan_id
            )
       ) THEN
      RAISE EXCEPTION 'Financing payment requires exact same-plan installment allocation before settlement'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_financing_payment_settlement ON public.payments;
CREATE TRIGGER trg_enforce_financing_payment_settlement
  BEFORE INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_financing_payment_settlement();

-- Override the 20260731 pending-refund guard after protocol-v2 columns exist.
-- A provider status word is not proof of a full refund: Moyasar can report a
-- partially refunded payment with status=refunded. Generic SQL/admin writes
-- therefore need the exact refunded minor amount and a provider refund time
-- before resolving the local full-refund obligation.
CREATE OR REPLACE FUNCTION public.enforce_gateway_pending_refund_state()
RETURNS TRIGGER AS $$
DECLARE
  response_id TEXT;
  response_given_id TEXT;
  response_status TEXT;
  response_currency TEXT;
  response_amount BIGINT;
  response_captured BIGINT;
  response_captured_at TEXT;
  response_refunded BIGINT;
  response_refunded_at TEXT;
  response_voided_at TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'pending_refund' THEN
      RAISE EXCEPTION 'A pending-refund gateway payment cannot be deleted'
        USING ERRCODE = '23514';
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.status = 'pending_refund'
     OR (TG_OP = 'UPDATE' AND OLD.status = 'pending_refund') THEN
    IF jsonb_typeof(NEW.gateway_response) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'Pending-refund payment requires verified gateway evidence'
        USING ERRCODE = '23514';
    END IF;

    response_id := NULLIF(BTRIM(NEW.gateway_response->>'id'), '');
    response_given_id := NULLIF(BTRIM(NEW.gateway_response->>'given_id'), '');
    response_status := LOWER(BTRIM(COALESCE(NEW.gateway_response->>'status', '')));
    response_currency := UPPER(BTRIM(COALESCE(NEW.gateway_response->>'currency', '')));
    response_captured := NULL;
    response_captured_at := NULLIF(BTRIM(NEW.gateway_response->>'captured_at'), '');
    response_refunded := NULL;
    response_refunded_at := NULLIF(BTRIM(NEW.gateway_response->>'refunded_at'), '');
    response_voided_at := NULLIF(BTRIM(NEW.gateway_response->>'voided_at'), '');
    BEGIN
      response_amount := (NEW.gateway_response->>'amount')::bigint;
      IF NULLIF(BTRIM(NEW.gateway_response->>'captured'), '') IS NOT NULL THEN
        response_captured := (NEW.gateway_response->>'captured')::bigint;
      END IF;
      IF NULLIF(BTRIM(NEW.gateway_response->>'refunded'), '') IS NOT NULL THEN
        response_refunded := (NEW.gateway_response->>'refunded')::bigint;
      END IF;
    EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
      RAISE EXCEPTION 'Pending-refund payment has invalid gateway amount evidence'
        USING ERRCODE = '23514';
    END;

    IF NEW.financing_plan_id IS NOT NULL
       OR NEW.category IS DISTINCT FROM 'subscription'
       OR LOWER(BTRIM(COALESCE(NEW.gateway_provider, ''))) <> 'moyasar'
       OR NULLIF(BTRIM(NEW.gateway_payment_id::text), '') IS NULL
       OR response_id IS DISTINCT FROM BTRIM(NEW.gateway_payment_id::text)
       OR (response_given_id IS NOT NULL
           AND response_given_id IS DISTINCT FROM BTRIM(NEW.gateway_payment_id::text))
       OR NEW.gateway_verified_at IS NULL
       OR NEW.gateway_amount_minor IS DISTINCT FROM ROUND(NEW.amount * 100)::bigint
       OR response_amount IS DISTINCT FROM NEW.gateway_amount_minor
       OR NULLIF(BTRIM(NEW.gateway_currency), '') IS NULL
       OR response_currency IS DISTINCT FROM UPPER(BTRIM(NEW.gateway_currency)) THEN
      RAISE EXCEPTION 'Pending-refund payment requires matching gateway identity, amount, and currency'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.status = 'pending_refund' THEN
      IF NOT (
           (
             LOWER(BTRIM(COALESCE(NEW.gateway_status, ''))) = 'paid'
             AND response_status = 'paid'
           )
           OR (
             LOWER(BTRIM(COALESCE(NEW.gateway_status, ''))) = 'captured'
             AND response_status = 'captured'
             AND response_captured IS NOT DISTINCT FROM NEW.gateway_amount_minor
             AND (
               NOT (NEW.gateway_response ? 'captured_at')
               OR response_captured_at IS NOT NULL
             )
           )
         )
         OR NEW.gateway_failure_reason IS DISTINCT FROM
              'SUBSCRIPTION_LIMIT_EXCEEDED_AFTER_CAPTURE' THEN
        RAISE EXCEPTION 'Pending-refund payment requires exact full paid/captured provider evidence and review reason'
          USING ERRCODE = '23514';
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'pending_refund' THEN
    IF NEW.payer_id IS DISTINCT FROM OLD.payer_id
       OR NEW.beneficiary_id IS DISTINCT FROM OLD.beneficiary_id
       OR NEW.amount IS DISTINCT FROM OLD.amount
       OR NEW.category IS DISTINCT FROM OLD.category
       OR NEW.financing_plan_id IS DISTINCT FROM OLD.financing_plan_id
       OR NEW.gateway_provider IS DISTINCT FROM OLD.gateway_provider
       OR NEW.gateway_payment_id IS DISTINCT FROM OLD.gateway_payment_id
       OR NEW.gateway_amount_minor IS DISTINCT FROM OLD.gateway_amount_minor
       OR NEW.gateway_currency IS DISTINCT FROM OLD.gateway_currency THEN
      RAISE EXCEPTION 'Pending-refund gateway charge identity is immutable'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status
       AND NOT (
         NEW.status = 'refunded'
         AND LOWER(BTRIM(COALESCE(NEW.gateway_status, ''))) = 'refunded'
         AND response_status = 'refunded'
         AND response_refunded IS NOT DISTINCT FROM NEW.gateway_amount_minor
         AND response_refunded_at IS NOT NULL
       )
       AND NOT (
         NEW.status = 'cancelled'
         AND LOWER(BTRIM(COALESCE(NEW.gateway_status, ''))) = 'voided'
         AND response_status = 'voided'
         AND response_captured IS NOT DISTINCT FROM NEW.gateway_amount_minor
         AND response_voided_at IS NOT NULL
       ) THEN
      RAISE EXCEPTION 'Pending-refund resolution requires exact full refund or captured-void evidence with provider timestamp'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_gateway_pending_refund_state ON public.payments;
CREATE TRIGGER trg_enforce_gateway_pending_refund_state
  BEFORE INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_gateway_pending_refund_state();

-- Provider refunds and verified provider cancellations are terminal audit
-- evidence. A delayed/retried historical paid webhook must not resurrect or
-- credit either result, even if an application regression reaches the DB.
-- `cancelled/not_submitted` is deliberately excluded: that is a separate
-- local proof that no provider submission began, guarded by protocol v2 above.
-- The original function name is retained so rerunning this additive migration
-- upgrades databases that already installed the refunded-only version.
CREATE OR REPLACE FUNCTION public.enforce_gateway_refunded_terminal_state()
RETURNS TRIGGER AS $$
DECLARE
  old_is_refunded BOOLEAN :=
    OLD.status = 'refunded'
    AND NULLIF(BTRIM(OLD.gateway_provider), '') IS NOT NULL;
  old_is_verified_provider_cancellation BOOLEAN :=
    OLD.status = 'cancelled'
    AND LOWER(BTRIM(COALESCE(OLD.gateway_status, ''))) IN ('voided', 'canceled', 'cancelled')
    AND OLD.gateway_verified_at IS NOT NULL
    AND NULLIF(BTRIM(OLD.gateway_provider), '') IS NOT NULL;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF old_is_refunded THEN
      RAISE EXCEPTION 'A refunded gateway payment is terminal and cannot be deleted'
        USING ERRCODE = '23514';
    ELSIF old_is_verified_provider_cancellation THEN
      RAISE EXCEPTION 'A verified provider cancellation is terminal and cannot be deleted'
        USING ERRCODE = '23514';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE'
     AND (old_is_refunded OR old_is_verified_provider_cancellation)
     AND (
       NEW.status IS DISTINCT FROM OLD.status
       OR NEW.payer_id IS DISTINCT FROM OLD.payer_id
       OR NEW.beneficiary_id IS DISTINCT FROM OLD.beneficiary_id
       OR NEW.amount IS DISTINCT FROM OLD.amount
       OR NEW.category IS DISTINCT FROM OLD.category
       OR NEW.financing_plan_id IS DISTINCT FROM OLD.financing_plan_id
       OR NEW.gateway_provider IS DISTINCT FROM OLD.gateway_provider
       OR NEW.gateway_payment_id IS DISTINCT FROM OLD.gateway_payment_id
       OR NEW.gateway_status IS DISTINCT FROM OLD.gateway_status
       OR NEW.gateway_amount_minor IS DISTINCT FROM OLD.gateway_amount_minor
       OR NEW.gateway_currency IS DISTINCT FROM OLD.gateway_currency
       OR NEW.gateway_response IS DISTINCT FROM OLD.gateway_response
       OR NEW.gateway_verified_at IS DISTINCT FROM OLD.gateway_verified_at
       OR NEW.gateway_failure_reason IS DISTINCT FROM OLD.gateway_failure_reason
     ) THEN
    IF old_is_verified_provider_cancellation THEN
      RAISE EXCEPTION 'A verified provider cancellation is terminal financial evidence'
        USING ERRCODE = '23514';
    ELSE
      RAISE EXCEPTION 'A refunded gateway payment is terminal financial evidence'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_gateway_refunded_terminal_state ON public.payments;
CREATE TRIGGER trg_enforce_gateway_refunded_terminal_state
  BEFORE UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_gateway_refunded_terminal_state();

COMMIT;
