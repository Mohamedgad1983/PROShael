-- Financing gateway full-refund / void reversals.
--
-- Original payment allocations remain immutable. A provider reversal is
-- represented by a separate immutable event and one immutable offset row per
-- original allocation. Only exact, full, provider-verified refunded/voided
-- evidence may move a settled financing payment out of paid.
--
-- This migration is additive, forward-only, and safe to apply repeatedly.
-- It is intentionally dated after the 20260810 gateway/reminder migrations so
-- their guard definitions cannot overwrite the reversal-aware settlement guard.

BEGIN;

CREATE TABLE IF NOT EXISTS public.financing_payment_reversals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  plan_id UUID NOT NULL REFERENCES public.financing_repayment_plans(id) ON DELETE RESTRICT,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
  reversal_kind VARCHAR(20) NOT NULL,
  target_payment_status VARCHAR(30) NOT NULL,
  gateway_provider VARCHAR(40) NOT NULL,
  gateway_payment_id TEXT NOT NULL,
  provider_status VARCHAR(30) NOT NULL,
  amount_minor BIGINT NOT NULL,
  currency VARCHAR(3) NOT NULL,
  provider_response JSONB NOT NULL,
  provider_verified_at TIMESTAMPTZ NOT NULL,
  evidence_source VARCHAR(30) NOT NULL,
  reversed_by_id UUID,
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT financing_payment_reversals_payment_unique UNIQUE (payment_id),
  CONSTRAINT financing_payment_reversals_idempotency_unique UNIQUE (idempotency_key),
  CONSTRAINT financing_payment_reversals_amount_positive CHECK (amount_minor > 0),
  CONSTRAINT financing_payment_reversals_currency_nonempty CHECK (BTRIM(currency) <> ''),
  CONSTRAINT financing_payment_reversals_source_check CHECK (
    evidence_source IN ('webhook', 'reconciliation', 'provider_api')
  ),
  CONSTRAINT financing_payment_reversals_terminal_mapping CHECK (
    (
      reversal_kind = 'refund'
      AND target_payment_status = 'refunded'
      AND provider_status = 'refunded'
    )
    OR
    (
      reversal_kind = 'void'
      AND target_payment_status = 'cancelled'
      AND provider_status = 'voided'
    )
  )
);

ALTER TABLE public.financing_payment_reversals
  ADD COLUMN IF NOT EXISTS evidence_source VARCHAR(30),
  ADD COLUMN IF NOT EXISTS reversed_by_id UUID,
  ADD COLUMN IF NOT EXISTS provider_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.financing_payment_reversal_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reversal_id UUID NOT NULL
    REFERENCES public.financing_payment_reversals(id) ON DELETE RESTRICT,
  original_allocation_id UUID NOT NULL
    REFERENCES public.financing_payment_allocations(id) ON DELETE RESTRICT,
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  plan_id UUID NOT NULL REFERENCES public.financing_repayment_plans(id) ON DELETE RESTRICT,
  installment_id UUID NOT NULL REFERENCES public.financing_installments(id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT financing_reversal_allocation_original_unique
    UNIQUE (reversal_id, original_allocation_id),
  CONSTRAINT financing_reversal_allocation_installment_unique
    UNIQUE (reversal_id, installment_id)
);

CREATE INDEX IF NOT EXISTS idx_financing_reversals_plan_created
  ON public.financing_payment_reversals(plan_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_financing_reversal_allocations_payment
  ON public.financing_payment_reversal_allocations(payment_id, installment_id);

-- The financing ledger records a compensating debit. It remains independent
-- from members.current_balance, which is subscription-only.
ALTER TABLE public.financing_balance_transactions
  DROP CONSTRAINT IF EXISTS financing_balance_transactions_transaction_type_check;
ALTER TABLE public.financing_balance_transactions
  DROP CONSTRAINT IF EXISTS financing_balance_transactions_type_check_v2;
ALTER TABLE public.financing_balance_transactions
  ADD CONSTRAINT financing_balance_transactions_type_check_v2
  CHECK (transaction_type IN (
    'disbursement_debit',
    'installment_credit',
    'installment_reversal_debit'
  ));

-- Reopened installments reuse their durable reminder rows, but each reopening
-- increments a generation. The reminder service includes that generation in
-- both its inbox idempotency identity and its provider collapse identity.
ALTER TABLE public.financing_reminder_log
  ADD COLUMN IF NOT EXISTS generation INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS reopened_by_reversal_id UUID;

CREATE TABLE IF NOT EXISTS public.financing_reminder_generation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id UUID NOT NULL,
  installment_id UUID NOT NULL REFERENCES public.financing_installments(id) ON DELETE RESTRICT,
  reminder_type VARCHAR(30) NOT NULL,
  generation INTEGER NOT NULL CHECK (generation > 0),
  reversal_id UUID NOT NULL
    REFERENCES public.financing_payment_reversals(id) ON DELETE RESTRICT,
  reminder_snapshot JSONB NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT financing_reminder_history_generation_unique
    UNIQUE (reminder_id, generation)
);

CREATE INDEX IF NOT EXISTS idx_financing_reminder_history_installment
  ON public.financing_reminder_generation_history(
    installment_id,
    reminder_type,
    generation DESC
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.financing_reminder_log'::regclass
       AND conname = 'financing_reminder_generation_positive'
  ) THEN
    ALTER TABLE public.financing_reminder_log
      ADD CONSTRAINT financing_reminder_generation_positive CHECK (generation > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.financing_reminder_log'::regclass
       AND conname = 'financing_reminder_reversal_fkey'
  ) THEN
    ALTER TABLE public.financing_reminder_log
      ADD CONSTRAINT financing_reminder_reversal_fkey
      FOREIGN KEY (reopened_by_reversal_id)
      REFERENCES public.financing_payment_reversals(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_idempotency_key
  ON public.notifications(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.validate_financing_reversal_insert()
RETURNS TRIGGER AS $$
DECLARE
  payment_row public.payments%ROWTYPE;
  response_id TEXT;
  response_given_id TEXT;
  response_status TEXT;
  response_currency TEXT;
  response_amount BIGINT;
  response_refunded BIGINT;
  response_captured BIGINT;
BEGIN
  SELECT *
    INTO payment_row
    FROM public.payments
   WHERE id = NEW.payment_id;

  IF NOT FOUND OR payment_row.financing_plan_id IS NULL THEN
    RAISE EXCEPTION 'Financing reversal requires an existing financing payment'
      USING ERRCODE = '23514';
  END IF;
  IF payment_row.status IS DISTINCT FROM 'paid' THEN
    RAISE EXCEPTION 'Financing reversal evidence may be appended only for a paid payment'
      USING ERRCODE = '23514';
  END IF;
  IF NEW.plan_id IS DISTINCT FROM payment_row.financing_plan_id
     OR NEW.member_id IS DISTINCT FROM payment_row.payer_id
     OR LOWER(BTRIM(NEW.gateway_provider)) IS DISTINCT FROM
          LOWER(BTRIM(payment_row.gateway_provider))
     OR BTRIM(NEW.gateway_payment_id) IS DISTINCT FROM
          BTRIM(payment_row.gateway_payment_id::text)
     OR NEW.amount_minor IS DISTINCT FROM ROUND(payment_row.amount * 100)::bigint
     OR NEW.amount_minor IS DISTINCT FROM payment_row.gateway_amount_minor
     OR UPPER(BTRIM(NEW.currency)) IS DISTINCT FROM
          UPPER(BTRIM(payment_row.gateway_currency)) THEN
    RAISE EXCEPTION 'Financing reversal identity, amount, or currency does not match the settled payment'
      USING ERRCODE = '23514';
  END IF;
  IF NEW.idempotency_key IS DISTINCT FROM
       ('financing-payment:' || NEW.payment_id::text || ':provider-reversal') THEN
    RAISE EXCEPTION 'Financing reversal requires its deterministic idempotency key'
      USING ERRCODE = '23514';
  END IF;
  IF NEW.provider_verified_at IS NULL
     OR jsonb_typeof(NEW.provider_response) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Financing reversal requires verified provider evidence'
      USING ERRCODE = '23514';
  END IF;

  response_id := NULLIF(BTRIM(NEW.provider_response->>'id'), '');
  response_given_id := NULLIF(BTRIM(NEW.provider_response->>'given_id'), '');
  response_status := LOWER(BTRIM(COALESCE(NEW.provider_response->>'status', '')));
  response_currency := UPPER(BTRIM(COALESCE(NEW.provider_response->>'currency', '')));
  BEGIN
    response_amount := (NEW.provider_response->>'amount')::bigint;
  EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
    RAISE EXCEPTION 'Financing reversal provider amount is invalid'
      USING ERRCODE = '23514';
  END;

  IF response_id IS DISTINCT FROM BTRIM(NEW.gateway_payment_id)
     OR (response_given_id IS NOT NULL
         AND response_given_id IS DISTINCT FROM BTRIM(NEW.gateway_payment_id))
     OR response_status IS DISTINCT FROM NEW.provider_status
     OR response_amount IS DISTINCT FROM NEW.amount_minor
     OR response_currency IS DISTINCT FROM UPPER(BTRIM(NEW.currency)) THEN
    RAISE EXCEPTION 'Financing reversal requires exact full provider evidence'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.provider_status = 'refunded' THEN
    BEGIN
      response_refunded := (NEW.provider_response->>'refunded')::bigint;
    EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
      RAISE EXCEPTION 'Financing refund evidence has an invalid refunded amount'
        USING ERRCODE = '23514';
    END;
    IF response_refunded IS DISTINCT FROM NEW.amount_minor
       OR NULLIF(BTRIM(NEW.provider_response->>'refunded_at'), '') IS NULL THEN
      RAISE EXCEPTION 'Partial financing refunds require quarantine and financial review'
        USING ERRCODE = '23514';
    END IF;
  ELSIF NEW.provider_status = 'voided' THEN
    BEGIN
      response_captured := (NEW.provider_response->>'captured')::bigint;
    EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
      RAISE EXCEPTION 'Financing void evidence has an invalid captured amount'
        USING ERRCODE = '23514';
    END;
    IF response_captured IS DISTINCT FROM NEW.amount_minor
       OR NULLIF(BTRIM(NEW.provider_response->>'voided_at'), '') IS NULL THEN
      RAISE EXCEPTION 'Financing void evidence requires exact full captured amount and voided_at'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.prevent_financing_reversal_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Financing reversal evidence is append-only'
    USING ERRCODE = '23514';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.prevent_financing_reminder_history_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Financing reminder generation history is append-only'
    USING ERRCODE = '23514';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_financing_reminder_history_mutation
  ON public.financing_reminder_generation_history;
CREATE TRIGGER trg_prevent_financing_reminder_history_mutation
  BEFORE UPDATE OR DELETE ON public.financing_reminder_generation_history
  FOR EACH ROW EXECUTE FUNCTION public.prevent_financing_reminder_history_mutation();

DROP TRIGGER IF EXISTS trg_validate_financing_reversal_insert
  ON public.financing_payment_reversals;
CREATE TRIGGER trg_validate_financing_reversal_insert
  BEFORE INSERT ON public.financing_payment_reversals
  FOR EACH ROW EXECUTE FUNCTION public.validate_financing_reversal_insert();

DROP TRIGGER IF EXISTS trg_prevent_financing_reversal_mutation
  ON public.financing_payment_reversals;
CREATE TRIGGER trg_prevent_financing_reversal_mutation
  BEFORE UPDATE OR DELETE ON public.financing_payment_reversals
  FOR EACH ROW EXECUTE FUNCTION public.prevent_financing_reversal_mutation();

CREATE OR REPLACE FUNCTION public.validate_financing_reversal_allocation_insert()
RETURNS TRIGGER AS $$
DECLARE
  reversal_row public.financing_payment_reversals%ROWTYPE;
  allocation_row public.financing_payment_allocations%ROWTYPE;
BEGIN
  SELECT * INTO reversal_row
    FROM public.financing_payment_reversals
   WHERE id = NEW.reversal_id;
  SELECT * INTO allocation_row
    FROM public.financing_payment_allocations
   WHERE id = NEW.original_allocation_id;

  IF reversal_row.id IS NULL OR allocation_row.id IS NULL
     OR NEW.payment_id IS DISTINCT FROM reversal_row.payment_id
     OR NEW.plan_id IS DISTINCT FROM reversal_row.plan_id
     OR NEW.payment_id IS DISTINCT FROM allocation_row.payment_id
     OR NEW.plan_id IS DISTINCT FROM allocation_row.plan_id
     OR NEW.installment_id IS DISTINCT FROM allocation_row.installment_id
     OR NEW.amount IS DISTINCT FROM allocation_row.amount THEN
    RAISE EXCEPTION 'Reversal allocation must exactly offset one original allocation'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_financing_reversal_allocation_insert
  ON public.financing_payment_reversal_allocations;
CREATE TRIGGER trg_validate_financing_reversal_allocation_insert
  BEFORE INSERT ON public.financing_payment_reversal_allocations
  FOR EACH ROW EXECUTE FUNCTION public.validate_financing_reversal_allocation_insert();

DROP TRIGGER IF EXISTS trg_prevent_financing_reversal_allocation_mutation
  ON public.financing_payment_reversal_allocations;
CREATE TRIGGER trg_prevent_financing_reversal_allocation_mutation
  BEFORE UPDATE OR DELETE ON public.financing_payment_reversal_allocations
  FOR EACH ROW EXECUTE FUNCTION public.prevent_financing_reversal_mutation();

CREATE OR REPLACE FUNCTION public.prevent_financing_ledger_mutation()
RETURNS TRIGGER AS $$
DECLARE
  reversal_row public.financing_payment_reversals%ROWTYPE;
  payment_status TEXT;
  reversed_amount NUMERIC(12,2);
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'Financing balance transactions are append-only'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.transaction_type = 'installment_reversal_debit' THEN
    SELECT r.*
      INTO reversal_row
      FROM public.financing_payment_reversals r
     WHERE r.payment_id = NEW.payment_id;

    SELECT p.status
      INTO payment_status
      FROM public.payments p
     WHERE p.id = NEW.payment_id;

    SELECT COALESCE(SUM(amount), 0)
      INTO reversed_amount
      FROM public.financing_payment_reversal_allocations
     WHERE reversal_id = reversal_row.id;

    IF reversal_row.id IS NULL
       OR payment_status IS DISTINCT FROM 'paid'
       OR NEW.plan_id IS DISTINCT FROM reversal_row.plan_id
       OR NEW.member_id IS DISTINCT FROM reversal_row.member_id
       OR NEW.amount IS DISTINCT FROM (reversal_row.amount_minor::numeric / 100)
       OR reversed_amount IS DISTINCT FROM NEW.amount
       OR NEW.idempotency_key IS DISTINCT FROM
            ('financing-payment:' || NEW.payment_id::text || ':reversal-ledger')
       OR NEW.balance_before IS NULL
       OR NEW.balance_after IS NULL
       OR NEW.balance_after IS DISTINCT FROM NEW.balance_before + NEW.amount
       OR NOT EXISTS (
         SELECT 1
           FROM public.financing_repayment_plans plan
          WHERE plan.id = NEW.plan_id
            AND plan.outstanding_amount = NEW.balance_after
       ) THEN
      RAISE EXCEPTION 'Financing reversal ledger must exactly offset the settled payment'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_financing_ledger_mutation
  ON public.financing_balance_transactions;
CREATE TRIGGER trg_prevent_financing_ledger_mutation
  BEFORE INSERT OR UPDATE OR DELETE ON public.financing_balance_transactions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_financing_ledger_mutation();

CREATE OR REPLACE FUNCTION public.financing_payment_has_exact_reversal(
  p_payment_id UUID,
  p_plan_id UUID,
  p_member_id UUID,
  p_amount NUMERIC,
  p_target_status TEXT,
  p_gateway_provider TEXT,
  p_gateway_payment_id TEXT,
  p_gateway_status TEXT,
  p_gateway_amount_minor BIGINT,
  p_gateway_currency TEXT,
  p_gateway_response JSONB,
  p_gateway_failure_reason TEXT
)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.financing_payment_reversals r
      JOIN public.financing_repayment_plans plan ON plan.id = r.plan_id
     WHERE r.payment_id = p_payment_id
       AND r.plan_id = p_plan_id
       AND r.member_id = p_member_id
       AND r.target_payment_status = p_target_status
       AND r.gateway_provider = LOWER(BTRIM(p_gateway_provider))
       AND r.gateway_payment_id = BTRIM(p_gateway_payment_id)
       AND r.provider_status = LOWER(BTRIM(p_gateway_status))
       AND r.amount_minor = p_gateway_amount_minor
       AND r.amount_minor = ROUND(p_amount * 100)::bigint
       AND r.currency = UPPER(BTRIM(p_gateway_currency))
       AND r.provider_response IS NOT DISTINCT FROM p_gateway_response
       AND p_gateway_failure_reason = CASE r.reversal_kind
             WHEN 'refund' THEN 'FINANCING_PROVIDER_FULL_REFUND'
             ELSE 'FINANCING_PROVIDER_FULL_VOID'
           END
       AND plan.paid_at IS NULL
       AND plan.status IN ('active', 'overdue')
       AND plan.outstanding_amount = plan.total_amount - (
         SELECT COALESCE(SUM(i.paid_amount), 0)
           FROM public.financing_installments i
          WHERE i.plan_id = plan.id
       )
       AND (
         SELECT COALESCE(SUM(a.amount), 0)
           FROM public.financing_payment_allocations a
          WHERE a.payment_id = p_payment_id
       ) = p_amount
       AND (
         SELECT COALESCE(SUM(ra.amount), 0)
           FROM public.financing_payment_reversal_allocations ra
          WHERE ra.reversal_id = r.id
       ) = p_amount
       AND NOT EXISTS (
         SELECT 1
           FROM public.financing_payment_allocations a
           LEFT JOIN public.financing_payment_reversal_allocations ra
             ON ra.reversal_id = r.id
            AND ra.original_allocation_id = a.id
            AND ra.amount = a.amount
          WHERE a.payment_id = p_payment_id
            AND ra.id IS NULL
       )
       AND EXISTS (
         SELECT 1
           FROM public.financing_balance_transactions ledger
          WHERE ledger.payment_id = p_payment_id
            AND ledger.plan_id = p_plan_id
            AND ledger.member_id = p_member_id
            AND ledger.transaction_type = 'installment_reversal_debit'
            AND ledger.amount = p_amount
            AND ledger.balance_after = ledger.balance_before + ledger.amount
            AND ledger.idempotency_key =
                  ('financing-payment:' || p_payment_id::text || ':reversal-ledger')
       )
  );
$$ LANGUAGE sql STABLE;

-- Replace the latest settlement guard, preserving protocol-v2 behavior while
-- allowing exactly one additional transition: paid -> refunded/cancelled when
-- the complete append-only reversal package already exists.
CREATE OR REPLACE FUNCTION public.enforce_financing_payment_settlement()
RETURNS TRIGGER AS $$
DECLARE
  is_paid_transition BOOLEAN := FALSE;
  allocated_amount NUMERIC(12,2);
  exact_reversal BOOLEAN := FALSE;
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
       OR NEW.gateway_payment_id IS DISTINCT FROM OLD.gateway_payment_id
       OR NEW.gateway_amount_minor IS DISTINCT FROM OLD.gateway_amount_minor
       OR NEW.gateway_currency IS DISTINCT FROM OLD.gateway_currency THEN
      RAISE EXCEPTION 'Financing payment charge identity is immutable'
        USING ERRCODE = '23514';
    END IF;

    IF OLD.status = 'paid' THEN
      exact_reversal := public.financing_payment_has_exact_reversal(
        NEW.id,
        NEW.financing_plan_id,
        NEW.payer_id,
        NEW.amount,
        NEW.status,
        NEW.gateway_provider,
        NEW.gateway_payment_id::text,
        NEW.gateway_status,
        NEW.gateway_amount_minor,
        NEW.gateway_currency,
        NEW.gateway_response,
        NEW.gateway_failure_reason
      );

      IF (
        NEW.status IS DISTINCT FROM OLD.status
        OR NEW.gateway_status IS DISTINCT FROM OLD.gateway_status
        OR NEW.gateway_verified_at IS DISTINCT FROM OLD.gateway_verified_at
        OR NEW.gateway_response IS DISTINCT FROM OLD.gateway_response
        OR NEW.gateway_failure_reason IS DISTINCT FROM OLD.gateway_failure_reason
      ) AND NOT exact_reversal THEN
        RAISE EXCEPTION 'A settled financing payment requires exact full reversal evidence'
          USING ERRCODE = '23514';
      END IF;
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status
       AND NOT (
         OLD.status IN ('pending', 'pending_verification')
         AND NEW.status = 'pending_verification'
       )
       AND NOT (NEW.status = 'paid')
       AND NOT (OLD.status = 'paid' AND exact_reversal)
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

CREATE OR REPLACE FUNCTION public.enforce_financing_reversal_terminal_state()
RETURNS TRIGGER AS $$
DECLARE
  reversal_row public.financing_payment_reversals%ROWTYPE;
BEGIN
  SELECT *
    INTO reversal_row
    FROM public.financing_payment_reversals r
   WHERE r.payment_id = OLD.id;

  IF reversal_row.id IS NOT NULL THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'A reversed financing payment is terminal and cannot be deleted'
        USING ERRCODE = '23514';
    END IF;
    IF OLD.status = 'paid'
       AND NEW.status = reversal_row.target_payment_status
       AND public.financing_payment_has_exact_reversal(
         NEW.id,
         NEW.financing_plan_id,
         NEW.payer_id,
         NEW.amount,
         NEW.status,
         NEW.gateway_provider,
         NEW.gateway_payment_id::text,
         NEW.gateway_status,
         NEW.gateway_amount_minor,
         NEW.gateway_currency,
         NEW.gateway_response,
         NEW.gateway_failure_reason
       ) THEN
      RETURN NEW;
    END IF;
    IF (to_jsonb(NEW) - 'updated_at') IS DISTINCT FROM
       (to_jsonb(OLD) - 'updated_at') THEN
      RAISE EXCEPTION 'A reversed financing payment is terminal financial evidence'
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_financing_reversal_terminal_state
  ON public.payments;
CREATE TRIGGER trg_enforce_financing_reversal_terminal_state
  BEFORE UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_financing_reversal_terminal_state();

-- Early rehearsal drafts generated reminder identities in database triggers.
-- Remove them explicitly so a repeat application cannot retain that unsafe
-- behavior: application conflict recovery must query the exact key it wrote.
DROP TRIGGER IF EXISTS trg_apply_financing_reminder_generation
  ON public.notifications;
DROP FUNCTION IF EXISTS public.apply_financing_reminder_generation();
DROP TRIGGER IF EXISTS trg_apply_financing_reminder_collapse_generation
  ON public.financing_reminder_log;
DROP FUNCTION IF EXISTS public.apply_financing_reminder_collapse_generation();

COMMENT ON TABLE public.financing_payment_reversals IS
  'Immutable full provider refund/void evidence for one settled financing payment.';
COMMENT ON TABLE public.financing_payment_reversal_allocations IS
  'Immutable one-for-one offsets; original financing payment allocations are never edited or deleted.';
COMMENT ON COLUMN public.financing_reminder_log.generation IS
  'Incremented when a provider reversal reopens an installment so fresh reminder notifications use a new idempotency generation.';
COMMENT ON TABLE public.financing_reminder_generation_history IS
  'Append-only snapshot of each durable reminder generation before a reversal reopens the installment.';

COMMIT;
