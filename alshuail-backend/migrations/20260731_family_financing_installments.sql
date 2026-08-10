-- ============================================================================
-- Family financing + marriage-support repayment plans
-- Date: 2026-07-31
--
-- Adds a shared, auditable repayment engine for:
--   • family_financing  (the member-facing replacement for "loan")
--   • marriage_support
--
-- A plan is activated only when funds are disbursed. Financing debt is tracked
-- exclusively by plan.outstanding_amount, installments, allocations, and the
-- immutable financing ledger. members.current_balance remains the independent
-- 2021-2025 subscription source of truth and is never changed by financing.
--
-- LEGACY POLICY: this migration deliberately does not backfill completed loan
-- or marriage-support requests. A historical request without a plan remains a
-- historical request without a plan until a separately reviewed reconciliation
-- is approved. NULL financing_terms_snapshot marks pre-snapshot rows; valid
-- older non-NULL snapshots also remain immutable/grandfathered at disbursement.
-- ============================================================================

BEGIN;

ALTER TABLE public.loan_settings
  ADD COLUMN IF NOT EXISTS financing_tiers JSONB NOT NULL DEFAULT
    '[{"principal":3000,"fee":450},{"principal":6000,"fee":750},{"principal":10000,"fee":1050}]'::jsonb,
  ADD COLUMN IF NOT EXISTS default_installment_count INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS max_installment_count INTEGER NOT NULL DEFAULT 12;

UPDATE public.loan_settings
SET min_loan_amount = 3000,
    max_loan_amount = 10000,
    default_installment_count = 10,
    max_installment_count = 12,
    financing_tiers = '[{"principal":3000,"fee":450},{"principal":6000,"fee":750},{"principal":10000,"fee":1050}]'::jsonb,
    updated_at = NOW()
WHERE id = 1
  AND (
    min_loan_amount IS DISTINCT FROM 3000 OR
    max_loan_amount IS DISTINCT FROM 10000 OR
    default_installment_count IS DISTINCT FROM 10 OR
    max_installment_count IS DISTINCT FROM 12 OR
    financing_tiers IS DISTINCT FROM
      '[{"principal":3000,"fee":450},{"principal":6000,"fee":750},{"principal":10000,"fee":1050}]'::jsonb
  );

ALTER TABLE public.loan_settings
  DROP CONSTRAINT IF EXISTS loan_settings_default_installment_count_range,
  DROP CONSTRAINT IF EXISTS loan_settings_max_installment_count_range;

ALTER TABLE public.loan_settings
  ADD CONSTRAINT loan_settings_default_installment_count_range
    CHECK (default_installment_count BETWEEN 1 AND 12),
  ADD CONSTRAINT loan_settings_max_installment_count_range
    CHECK (max_installment_count BETWEEN 1 AND 12);

ALTER TABLE public.loan_requests
  ADD COLUMN IF NOT EXISTS financing_fee_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS total_repayment_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS financing_terms_snapshot JSONB;

CREATE TABLE IF NOT EXISTS public.financing_repayment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_type VARCHAR(40) NOT NULL
    CHECK (program_type IN ('family_financing', 'marriage_support')),
  request_id UUID NOT NULL,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
  principal_amount NUMERIC(12,2) NOT NULL CHECK (principal_amount > 0),
  fee_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (fee_amount >= 0),
  total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount > 0),
  outstanding_amount NUMERIC(12,2) NOT NULL CHECK (outstanding_amount >= 0),
  installment_count INTEGER NOT NULL CHECK (installment_count BETWEEN 1 AND 12),
  first_due_date DATE NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'active'
    CHECK (status IN ('scheduled', 'active', 'overdue', 'paid', 'cancelled')),
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  created_by_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (program_type, request_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.financing_repayment_plans'::regclass
       AND conname = 'financing_plans_amount_consistency'
  ) THEN
    ALTER TABLE public.financing_repayment_plans
      ADD CONSTRAINT financing_plans_amount_consistency
      CHECK (total_amount = principal_amount + fee_amount);
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.financing_repayment_plans'::regclass
       AND conname = 'financing_plans_outstanding_range'
  ) THEN
    ALTER TABLE public.financing_repayment_plans
      ADD CONSTRAINT financing_plans_outstanding_range
      CHECK (outstanding_amount <= total_amount);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.financing_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.financing_repayment_plans(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL CHECK (installment_number BETWEEN 1 AND 12),
  due_date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  status VARCHAR(30) NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'due', 'partially_paid', 'paid', 'overdue')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (plan_id, installment_number),
  CHECK (paid_amount <= amount)
);

-- Additive metadata on payments. Existing payment paths remain unchanged.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS financing_plan_id UUID,
  ADD COLUMN IF NOT EXISTS financing_payment_scope VARCHAR(20),
  ADD COLUMN IF NOT EXISTS gateway_provider VARCHAR(40),
  ADD COLUMN IF NOT EXISTS gateway_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS gateway_status VARCHAR(40),
  ADD COLUMN IF NOT EXISTS gateway_failure_reason TEXT,
  ADD COLUMN IF NOT EXISTS gateway_amount_minor BIGINT,
  ADD COLUMN IF NOT EXISTS gateway_currency VARCHAR(3),
  ADD COLUMN IF NOT EXISTS gateway_response JSONB,
  ADD COLUMN IF NOT EXISTS gateway_verified_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.payments'::regclass
      AND conname = 'payments_financing_plan_fkey'
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_financing_plan_fkey
      FOREIGN KEY (financing_plan_id)
      REFERENCES public.financing_repayment_plans(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.financing_payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.financing_repayment_plans(id) ON DELETE CASCADE,
  installment_id UUID NOT NULL REFERENCES public.financing_installments(id) ON DELETE RESTRICT,
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (payment_id, installment_id)
);

-- Allocation rows are append-only audit evidence. Settlement inserts them in
-- the same transaction before the payment becomes paid; no supported workflow
-- ever edits or removes an allocation afterward.
CREATE OR REPLACE FUNCTION public.prevent_financing_allocation_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT EXISTS (
      SELECT 1
        FROM public.payments p
        JOIN public.financing_installments i ON i.id = NEW.installment_id
       WHERE p.id = NEW.payment_id
         AND p.financing_plan_id = NEW.plan_id
         AND i.plan_id = NEW.plan_id
         AND p.status IN ('pending', 'pending_verification')
    ) THEN
      RAISE EXCEPTION 'Financing allocation must match an open payment and same-plan installment'
        USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Financing payment allocations are immutable'
    USING ERRCODE = '23514';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_financing_allocation_mutation
  ON public.financing_payment_allocations;
CREATE TRIGGER trg_prevent_financing_allocation_mutation
  BEFORE INSERT OR UPDATE OR DELETE ON public.financing_payment_allocations
  FOR EACH ROW EXECUTE FUNCTION public.prevent_financing_allocation_mutation();

-- A paid financing row must have been allocated by the settlement service and
-- must carry a verified gateway identity. This blocks generic admin payment
-- status endpoints (and ad-hoc INSERTs) from crediting a financing balance.
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

  -- Once a row belongs to financing, generic status/process/bulk endpoints
  -- cannot detach it or change its immutable charge identity. Provider-backed
  -- terminal failures are the sole non-paid terminal transition allowed.
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
         OLD.status IN ('pending', 'pending_verification')
         AND NEW.gateway_verified_at IS NOT NULL
         AND NEW.gateway_response IS NOT NULL
         AND (
           (NEW.status = 'failed' AND LOWER(BTRIM(NEW.gateway_status)) IN ('failed', 'canceled', 'cancelled'))
           OR (NEW.status = 'cancelled' AND LOWER(BTRIM(NEW.gateway_status)) IN ('voided', 'canceled', 'cancelled'))
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

-- A provider capture that can no longer be credited because the member reached
-- the SAR 3,000 subscription cap is financial evidence, not a failed checkout.
-- Keep it in an explicit terminal review state so webhooks can acknowledge it
-- without crediting the subscription or losing the refund obligation. This is
-- deliberately a transition guard, not a broad status CHECK: production has
-- historical payment statuses that must remain readable and unchanged.
CREATE OR REPLACE FUNCTION public.enforce_gateway_pending_refund_state()
RETURNS TRIGGER AS $$
DECLARE
  response_id TEXT;
  response_given_id TEXT;
  response_status TEXT;
  response_currency TEXT;
  response_amount BIGINT;
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
    BEGIN
      response_amount := (NEW.gateway_response->>'amount')::bigint;
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
      IF LOWER(BTRIM(COALESCE(NEW.gateway_status, ''))) NOT IN ('paid', 'captured')
         OR response_status NOT IN ('paid', 'captured')
         OR NEW.gateway_failure_reason IS DISTINCT FROM
              'SUBSCRIPTION_LIMIT_EXCEEDED_AFTER_CAPTURE' THEN
        RAISE EXCEPTION 'Pending-refund payment requires paid provider evidence and review reason'
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
       ) THEN
      RAISE EXCEPTION 'Pending-refund payment requires verified provider refund resolution'
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.payments'::regclass
       AND conname = 'payments_financing_paid_gateway_check'
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_financing_paid_gateway_check
      CHECK (
        financing_plan_id IS NULL OR
        status <> 'paid' OR
        (
          NULLIF(BTRIM(gateway_provider), '') IS NOT NULL AND
          NULLIF(BTRIM(gateway_payment_id::text), '') IS NOT NULL AND
          COALESCE(LOWER(BTRIM(gateway_status)), '') = 'paid' AND
          gateway_verified_at IS NOT NULL AND
          gateway_amount_minor = ROUND(amount * 100)::bigint AND
          COALESCE(UPPER(BTRIM(gateway_currency)), '') = 'SAR'
        )
      ) NOT VALID;
  END IF;
END $$;

ALTER TABLE public.payments
  VALIDATE CONSTRAINT payments_financing_paid_gateway_check;

CREATE TABLE IF NOT EXISTS public.financing_balance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.financing_repayment_plans(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
  transaction_type VARCHAR(30) NOT NULL
    CHECK (transaction_type IN ('disbursement_debit', 'installment_credit')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  balance_before NUMERIC(12,2),
  balance_after NUMERIC(12,2),
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN public.financing_balance_transactions.balance_before IS
  'Financing outstanding amount before this event; never members.current_balance.';
COMMENT ON COLUMN public.financing_balance_transactions.balance_after IS
  'Financing outstanding amount after this event; never members.current_balance.';

CREATE TABLE IF NOT EXISTS public.financing_reminder_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installment_id UUID NOT NULL REFERENCES public.financing_installments(id) ON DELETE CASCADE,
  reminder_type VARCHAR(30) NOT NULL,
  channel VARCHAR(30),
  delivery_status VARCHAR(30) NOT NULL DEFAULT 'queued',
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_error TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (installment_id, reminder_type)
);

ALTER TABLE public.financing_reminder_log
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.financing_reminder_log'::regclass
       AND conname = 'financing_reminder_attempt_count_nonnegative'
  ) THEN
    ALTER TABLE public.financing_reminder_log
      ADD CONSTRAINT financing_reminder_attempt_count_nonnegative
      CHECK (attempt_count >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_financing_plans_member
  ON public.financing_repayment_plans(member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_financing_plans_request
  ON public.financing_repayment_plans(program_type, request_id);
CREATE INDEX IF NOT EXISTS idx_financing_installments_due
  ON public.financing_installments(status, due_date);
CREATE INDEX IF NOT EXISTS idx_payments_financing_plan
  ON public.payments(financing_plan_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_pending_refund_review
  ON public.payments(gateway_verified_at, created_at)
  WHERE status = 'pending_refund';
CREATE INDEX IF NOT EXISTS idx_financing_allocations_payment
  ON public.financing_payment_allocations(payment_id);

-- Only one unsettled checkout can exist for a plan. The service reuses an
-- equivalent row and rejects a conflicting scope, preventing two callbacks
-- from consuming two installments accidentally.
CREATE UNIQUE INDEX IF NOT EXISTS uq_financing_one_open_intent_per_plan
  ON public.payments(financing_plan_id)
  WHERE financing_plan_id IS NOT NULL
    AND status IN ('pending', 'pending_verification');

-- A verified provider transaction may settle exactly one internal payment.
-- Expression normalisation prevents case/whitespace variants from bypassing
-- replay protection while preserving legacy rows with no gateway identity.
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_gateway_identity
  ON public.payments (
    LOWER(BTRIM(gateway_provider)),
    BTRIM(gateway_payment_id::text)
  )
  WHERE NULLIF(BTRIM(gateway_provider), '') IS NOT NULL
    AND NULLIF(BTRIM(gateway_payment_id::text), '') IS NOT NULL;

DROP TRIGGER IF EXISTS update_financing_plans_updated_at ON public.financing_repayment_plans;
CREATE TRIGGER update_financing_plans_updated_at
  BEFORE UPDATE ON public.financing_repayment_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_financing_installments_updated_at ON public.financing_installments;
CREATE TRIGGER update_financing_installments_updated_at
  BEFORE UPDATE ON public.financing_installments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.financing_repayment_plans IS
  'Repayment plans created atomically at future disbursement; historical completed requests are intentionally not backfilled.';
COMMENT ON COLUMN public.loan_requests.financing_terms_snapshot IS
  'Immutable request-time financing policy. NULL marks pre-snapshot legacy data; older non-NULL snapshots are also grandfathered and never repriced.';

COMMIT;
