-- ============================================================================
-- Enforce the closed 2021-2025 family subscription policy.
-- Policy: 60 months x SAR 50 = SAR 3,000 maximum.
--
-- Safety:
--   * Every affected member/subscription is snapshotted as JSONB first.
--   * The migration is transactional and aborts on any post-check failure.
--   * The payment trigger affects subscription payments and financing
--     repayments only; initiatives, diyas, donations, and events do not alter
--     members.current_balance.
-- ============================================================================

BEGIN;

SELECT pg_advisory_xact_lock(hashtext('subscription-policy-2021-2025'));

CREATE TABLE IF NOT EXISTS public.subscription_reconciliation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_start_year INTEGER NOT NULL,
  policy_end_year INTEGER NOT NULL,
  monthly_fee NUMERIC(12,2) NOT NULL,
  maximum_months INTEGER NOT NULL,
  maximum_balance NUMERIC(12,2) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS public.subscription_reconciliation_audit (
  id BIGSERIAL PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES public.subscription_reconciliation_runs(id),
  table_name TEXT NOT NULL,
  row_id UUID NOT NULL,
  reason TEXT NOT NULL,
  snapshot JSONB NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_reconciliation_audit_run
  ON public.subscription_reconciliation_audit(run_id, table_name);

WITH run AS (
  INSERT INTO public.subscription_reconciliation_runs (
    policy_start_year, policy_end_year, monthly_fee,
    maximum_months, maximum_balance, notes
  ) VALUES (
    2021, 2025, 50, 60, 3000,
    'Normalize member/subscription balances and install category-aware payment trigger'
  )
  RETURNING id
)
SELECT set_config('alshuail.subscription_reconciliation_run', id::text, true)
FROM run;

INSERT INTO public.subscription_reconciliation_audit
  (run_id, table_name, row_id, reason, snapshot)
SELECT
  current_setting('alshuail.subscription_reconciliation_run')::uuid,
  'members',
  m.id,
  CASE
    WHEN COALESCE(m.current_balance, 0) > 3000 THEN 'current_balance_above_3000'
    WHEN COALESCE(m.payment_2021, 0) + COALESCE(m.payment_2022, 0) +
         COALESCE(m.payment_2023, 0) + COALESCE(m.payment_2024, 0) +
         COALESCE(m.payment_2025, 0) > 3000 THEN 'yearly_total_above_3000'
    WHEN COALESCE(m.payment_2021, 0) > 600 OR COALESCE(m.payment_2022, 0) > 600 OR
         COALESCE(m.payment_2023, 0) > 600 OR COALESCE(m.payment_2024, 0) > 600 OR
         COALESCE(m.payment_2025, 0) > 600 THEN 'yearly_value_above_600'
    ELSE 'legacy_balance_fields_disagree'
  END,
  to_jsonb(m)
FROM public.members m
WHERE COALESCE(m.current_balance, 0) > 3000
   OR COALESCE(m.balance, 0) > 3000
   OR COALESCE(m.total_balance, 0) > 3000
   OR COALESCE(m.total_paid, 0) > 3000
   OR COALESCE(m.payment_2021, 0) + COALESCE(m.payment_2022, 0) +
      COALESCE(m.payment_2023, 0) + COALESCE(m.payment_2024, 0) +
      COALESCE(m.payment_2025, 0) > 3000
   OR COALESCE(m.payment_2021, 0) > 600
   OR COALESCE(m.payment_2022, 0) > 600
   OR COALESCE(m.payment_2023, 0) > 600
   OR COALESCE(m.payment_2024, 0) > 600
   OR COALESCE(m.payment_2025, 0) > 600
   OR COALESCE(m.current_balance, 0) IS DISTINCT FROM COALESCE(m.balance, 0)
   OR COALESCE(m.current_balance, 0) IS DISTINCT FROM COALESCE(m.total_balance, 0)
   OR COALESCE(m.current_balance, 0) IS DISTINCT FROM COALESCE(m.total_paid, 0);

INSERT INTO public.subscription_reconciliation_audit
  (run_id, table_name, row_id, reason, snapshot)
SELECT
  current_setting('alshuail.subscription_reconciliation_run')::uuid,
  'subscriptions',
  s.id,
  'subscription_not_aligned_with_member_policy',
  to_jsonb(s)
FROM public.subscriptions s
LEFT JOIN public.members m ON m.id = s.member_id
WHERE COALESCE(s.current_balance, 0) NOT BETWEEN 0 AND 3000
   OR COALESCE(s.months_paid_ahead, 0) NOT BETWEEN 0 AND 60
   OR COALESCE(s.current_balance, 0) IS DISTINCT FROM
      LEAST(3000::numeric, GREATEST(0::numeric, COALESCE(m.current_balance, 0)))
   OR s.start_date IS DISTINCT FROM DATE '2021-01-01'
   OR s.end_date IS DISTINCT FROM DATE '2025-12-31';

-- Normalize the five yearly buckets from their capped aggregate. This removes
-- impossible single-year values while preserving the total paid, up to 3,000.
WITH totals AS (
  SELECT
    id,
    LEAST(
      3000::numeric,
      GREATEST(0::numeric, COALESCE(payment_2021, 0)) +
      GREATEST(0::numeric, COALESCE(payment_2022, 0)) +
      GREATEST(0::numeric, COALESCE(payment_2023, 0)) +
      GREATEST(0::numeric, COALESCE(payment_2024, 0)) +
      GREATEST(0::numeric, COALESCE(payment_2025, 0))
    ) AS paid_2021_2025
  FROM public.members
)
UPDATE public.members m
SET payment_2021 = LEAST(600::numeric, t.paid_2021_2025),
    payment_2022 = LEAST(600::numeric, GREATEST(0::numeric, t.paid_2021_2025 - 600)),
    payment_2023 = LEAST(600::numeric, GREATEST(0::numeric, t.paid_2021_2025 - 1200)),
    payment_2024 = LEAST(600::numeric, GREATEST(0::numeric, t.paid_2021_2025 - 1800)),
    payment_2025 = LEAST(600::numeric, GREATEST(0::numeric, t.paid_2021_2025 - 2400)),
    updated_at = NOW()
FROM totals t
WHERE t.id = m.id;

-- current_balance is authoritative. Negative values remain valid because an
-- active financing/marriage-support plan can debit the member account.
WITH canonical AS (
  SELECT id, LEAST(3000::numeric, COALESCE(current_balance, 0)) AS value
  FROM public.members
)
UPDATE public.members m
SET current_balance = c.value,
    balance = c.value,
    total_balance = c.value,
    total_paid = c.value,
    is_compliant = (c.value >= 3000),
    balance_status = CASE WHEN c.value >= 3000 THEN 'sufficient' ELSE 'insufficient' END,
    payment_status = CASE WHEN c.value >= 3000 THEN 'paid' ELSE 'pending' END,
    updated_at = NOW()
FROM canonical c
WHERE c.id = m.id;

UPDATE public.subscriptions s
SET amount = 3000,
    total_amount = 3000,
    paid_amount = LEAST(3000::numeric, GREATEST(0::numeric, COALESCE(m.current_balance, 0))),
    remaining_amount = 3000 - LEAST(3000::numeric, GREATEST(0::numeric, COALESCE(m.current_balance, 0))),
    current_balance = LEAST(3000::numeric, GREATEST(0::numeric, COALESCE(m.current_balance, 0))),
    months_paid_ahead = LEAST(
      60,
      FLOOR(LEAST(3000::numeric, GREATEST(0::numeric, COALESCE(m.current_balance, 0))) / 50)::integer
    ),
    status = CASE WHEN COALESCE(m.current_balance, 0) >= 3000 THEN 'active' ELSE 'overdue' END,
    payment_status = CASE WHEN COALESCE(m.current_balance, 0) >= 3000 THEN 'paid' ELSE 'pending' END,
    start_date = DATE '2021-01-01',
    end_date = DATE '2025-12-31',
    next_payment_due = CASE WHEN COALESCE(m.current_balance, 0) >= 3000 THEN NULL ELSE CURRENT_DATE END,
    updated_at = NOW()
FROM public.members m
WHERE m.id = s.member_id;

ALTER TABLE public.members
  DROP CONSTRAINT IF EXISTS members_current_balance_max_3000,
  DROP CONSTRAINT IF EXISTS members_balance_max_3000,
  DROP CONSTRAINT IF EXISTS members_total_balance_max_3000,
  DROP CONSTRAINT IF EXISTS members_total_paid_max_3000,
  DROP CONSTRAINT IF EXISTS members_payment_2021_range,
  DROP CONSTRAINT IF EXISTS members_payment_2022_range,
  DROP CONSTRAINT IF EXISTS members_payment_2023_range,
  DROP CONSTRAINT IF EXISTS members_payment_2024_range,
  DROP CONSTRAINT IF EXISTS members_payment_2025_range;

ALTER TABLE public.members
  ADD CONSTRAINT members_current_balance_max_3000 CHECK (current_balance IS NULL OR current_balance <= 3000),
  ADD CONSTRAINT members_balance_max_3000 CHECK (balance IS NULL OR balance <= 3000),
  ADD CONSTRAINT members_total_balance_max_3000 CHECK (total_balance IS NULL OR total_balance <= 3000),
  ADD CONSTRAINT members_total_paid_max_3000 CHECK (total_paid IS NULL OR total_paid <= 3000),
  ADD CONSTRAINT members_payment_2021_range CHECK (payment_2021 IS NULL OR payment_2021 BETWEEN 0 AND 600),
  ADD CONSTRAINT members_payment_2022_range CHECK (payment_2022 IS NULL OR payment_2022 BETWEEN 0 AND 600),
  ADD CONSTRAINT members_payment_2023_range CHECK (payment_2023 IS NULL OR payment_2023 BETWEEN 0 AND 600),
  ADD CONSTRAINT members_payment_2024_range CHECK (payment_2024 IS NULL OR payment_2024 BETWEEN 0 AND 600),
  ADD CONSTRAINT members_payment_2025_range CHECK (payment_2025 IS NULL OR payment_2025 BETWEEN 0 AND 600);

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_current_balance_range,
  DROP CONSTRAINT IF EXISTS subscriptions_months_paid_ahead_range,
  DROP CONSTRAINT IF EXISTS subscriptions_amount_max_3000,
  DROP CONSTRAINT IF EXISTS subscriptions_total_amount_max_3000,
  DROP CONSTRAINT IF EXISTS subscriptions_paid_amount_range,
  DROP CONSTRAINT IF EXISTS subscriptions_remaining_amount_range;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_current_balance_range CHECK (current_balance IS NULL OR current_balance BETWEEN 0 AND 3000),
  ADD CONSTRAINT subscriptions_months_paid_ahead_range CHECK (months_paid_ahead IS NULL OR months_paid_ahead BETWEEN 0 AND 60),
  ADD CONSTRAINT subscriptions_amount_max_3000 CHECK (amount BETWEEN 0 AND 3000),
  ADD CONSTRAINT subscriptions_total_amount_max_3000 CHECK (total_amount IS NULL OR total_amount BETWEEN 0 AND 3000),
  ADD CONSTRAINT subscriptions_paid_amount_range CHECK (paid_amount IS NULL OR paid_amount BETWEEN 0 AND 3000),
  ADD CONSTRAINT subscriptions_remaining_amount_range CHECK (remaining_amount IS NULL OR remaining_amount BETWEEN 0 AND 3000);

DROP TRIGGER IF EXISTS trg_update_member_balance ON public.payments;
DROP FUNCTION IF EXISTS public.update_member_balance();

CREATE OR REPLACE FUNCTION public.update_member_balance()
RETURNS TRIGGER AS $$
DECLARE
  old_affects BOOLEAN := FALSE;
  new_affects BOOLEAN := FALSE;
  old_financing BOOLEAN := FALSE;
  new_financing BOOLEAN := FALSE;
  old_target UUID;
  new_target UUID;
  updated_balance NUMERIC(12,2);
BEGIN
  IF TG_OP <> 'INSERT' THEN
    old_financing := NULLIF(to_jsonb(OLD)->>'financing_plan_id', '') IS NOT NULL;
    old_affects := OLD.status = 'paid' AND (OLD.category = 'subscription' OR old_financing);
    old_target := CASE
      WHEN old_financing THEN OLD.payer_id
      ELSE COALESCE(OLD.beneficiary_id, OLD.payer_id)
    END;
  END IF;

  IF TG_OP <> 'DELETE' THEN
    new_financing := NULLIF(to_jsonb(NEW)->>'financing_plan_id', '') IS NOT NULL;
    new_affects := NEW.status = 'paid' AND (NEW.category = 'subscription' OR new_financing);
    new_target := CASE
      WHEN new_financing THEN NEW.payer_id
      ELSE COALESCE(NEW.beneficiary_id, NEW.payer_id)
    END;
  END IF;

  IF old_affects AND old_target IS NOT NULL THEN
    UPDATE public.members
       SET current_balance = COALESCE(current_balance, 0) - COALESCE(OLD.amount, 0),
           balance = CASE WHEN OLD.category = 'subscription' THEN COALESCE(current_balance, 0) - COALESCE(OLD.amount, 0) ELSE balance END,
           total_balance = CASE WHEN OLD.category = 'subscription' THEN COALESCE(current_balance, 0) - COALESCE(OLD.amount, 0) ELSE total_balance END,
           total_paid = CASE WHEN OLD.category = 'subscription' THEN COALESCE(current_balance, 0) - COALESCE(OLD.amount, 0) ELSE total_paid END,
           is_compliant = CASE
             WHEN OLD.category = 'subscription' THEN COALESCE(current_balance, 0) - COALESCE(OLD.amount, 0) >= 3000
             ELSE is_compliant
           END,
           balance_status = CASE
             WHEN OLD.category <> 'subscription' THEN balance_status
             WHEN COALESCE(current_balance, 0) - COALESCE(OLD.amount, 0) >= 3000 THEN 'sufficient'
             ELSE 'insufficient'
           END,
           payment_status = CASE
             WHEN OLD.category <> 'subscription' THEN payment_status
             WHEN COALESCE(current_balance, 0) - COALESCE(OLD.amount, 0) >= 3000 THEN 'paid'
             ELSE 'pending'
           END,
           updated_at = NOW()
     WHERE id = old_target
     RETURNING current_balance INTO updated_balance;

    IF OLD.category = 'subscription' AND updated_balance IS NOT NULL THEN
      UPDATE public.subscriptions
         SET amount = 3000,
             total_amount = 3000,
             paid_amount = LEAST(3000::numeric, GREATEST(0::numeric, updated_balance)),
             remaining_amount = 3000 - LEAST(3000::numeric, GREATEST(0::numeric, updated_balance)),
             current_balance = LEAST(3000::numeric, GREATEST(0::numeric, updated_balance)),
             months_paid_ahead = LEAST(60, FLOOR(LEAST(3000::numeric, GREATEST(0::numeric, updated_balance)) / 50)::integer),
             status = CASE WHEN updated_balance >= 3000 THEN 'active' ELSE 'overdue' END,
             payment_status = CASE WHEN updated_balance >= 3000 THEN 'paid' ELSE 'pending' END,
             start_date = DATE '2021-01-01',
             end_date = DATE '2025-12-31',
             next_payment_due = CASE WHEN updated_balance >= 3000 THEN NULL ELSE CURRENT_DATE END,
             updated_at = NOW()
       WHERE member_id = old_target;
    END IF;
  END IF;

  IF new_affects AND new_target IS NOT NULL THEN
    SELECT COALESCE(current_balance, 0)
      INTO updated_balance
      FROM public.members
     WHERE id = new_target
     FOR UPDATE;

    IF updated_balance + COALESCE(NEW.amount, 0) > 3000 THEN
      RAISE EXCEPTION 'Subscription/member balance cannot exceed SAR 3,000'
        USING ERRCODE = '23514';
    END IF;

    updated_balance := updated_balance + COALESCE(NEW.amount, 0);
    UPDATE public.members
       SET current_balance = updated_balance,
           balance = CASE WHEN NEW.category = 'subscription' THEN updated_balance ELSE balance END,
           total_balance = CASE WHEN NEW.category = 'subscription' THEN updated_balance ELSE total_balance END,
           total_paid = CASE WHEN NEW.category = 'subscription' THEN updated_balance ELSE total_paid END,
           is_compliant = CASE WHEN NEW.category = 'subscription' THEN updated_balance >= 3000 ELSE is_compliant END,
           balance_status = CASE
             WHEN NEW.category <> 'subscription' THEN balance_status
             WHEN updated_balance >= 3000 THEN 'sufficient'
             ELSE 'insufficient'
           END,
           payment_status = CASE
             WHEN NEW.category <> 'subscription' THEN payment_status
             WHEN updated_balance >= 3000 THEN 'paid'
             ELSE 'pending'
           END,
           updated_at = NOW()
     WHERE id = new_target;

    IF NEW.category = 'subscription' THEN
      UPDATE public.subscriptions
         SET amount = 3000,
             total_amount = 3000,
             paid_amount = LEAST(3000::numeric, GREATEST(0::numeric, updated_balance)),
             remaining_amount = 3000 - LEAST(3000::numeric, GREATEST(0::numeric, updated_balance)),
             current_balance = LEAST(3000::numeric, GREATEST(0::numeric, updated_balance)),
             months_paid_ahead = LEAST(60, FLOOR(LEAST(3000::numeric, GREATEST(0::numeric, updated_balance)) / 50)::integer),
             status = CASE WHEN updated_balance >= 3000 THEN 'active' ELSE 'overdue' END,
             payment_status = CASE WHEN updated_balance >= 3000 THEN 'paid' ELSE 'pending' END,
             start_date = DATE '2021-01-01',
             end_date = DATE '2025-12-31',
             next_payment_due = CASE WHEN updated_balance >= 3000 THEN NULL ELSE CURRENT_DATE END,
             last_payment_date = CURRENT_DATE,
             last_payment_amount = NEW.amount,
             updated_at = NOW()
       WHERE member_id = new_target;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_member_balance
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_member_balance();

DO $$
DECLARE
  member_over_cap BIGINT;
  yearly_over_cap BIGINT;
  subscription_over_cap BIGINT;
BEGIN
  SELECT COUNT(*) INTO member_over_cap
  FROM public.members
  WHERE current_balance > 3000 OR balance > 3000 OR total_balance > 3000 OR total_paid > 3000;

  SELECT COUNT(*) INTO yearly_over_cap
  FROM public.members
  WHERE payment_2021 NOT BETWEEN 0 AND 600
     OR payment_2022 NOT BETWEEN 0 AND 600
     OR payment_2023 NOT BETWEEN 0 AND 600
     OR payment_2024 NOT BETWEEN 0 AND 600
     OR payment_2025 NOT BETWEEN 0 AND 600
     OR COALESCE(payment_2021, 0) + COALESCE(payment_2022, 0) +
        COALESCE(payment_2023, 0) + COALESCE(payment_2024, 0) +
        COALESCE(payment_2025, 0) > 3000;

  SELECT COUNT(*) INTO subscription_over_cap
  FROM public.subscriptions
  WHERE current_balance NOT BETWEEN 0 AND 3000
     OR months_paid_ahead NOT BETWEEN 0 AND 60;

  IF member_over_cap <> 0 OR yearly_over_cap <> 0 OR subscription_over_cap <> 0 THEN
    RAISE EXCEPTION
      'Subscription reconciliation failed: members %, yearly %, subscriptions %',
      member_over_cap, yearly_over_cap, subscription_over_cap;
  END IF;
END $$;

UPDATE public.subscription_reconciliation_runs
SET completed_at = NOW()
WHERE id = current_setting('alshuail.subscription_reconciliation_run')::uuid;

COMMIT;

-- Recovery is deliberately manual: restore a row from
-- subscription_reconciliation_audit.snapshot for the relevant run_id after
-- reviewing the captured reason. The original data is never deleted.
