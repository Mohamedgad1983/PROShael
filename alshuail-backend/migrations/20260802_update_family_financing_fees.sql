-- Keep the fixed financing packages and financing-aware member-balance trigger
-- consistent for existing databases and fresh installs. Run after 20260801.

BEGIN;

ALTER TABLE public.loan_settings
  ALTER COLUMN financing_tiers SET DEFAULT
    '[{"principal":3000,"fee":450},{"principal":6000,"fee":750},{"principal":10000,"fee":1050}]'::jsonb;

UPDATE public.loan_settings
SET financing_tiers =
      '[{"principal":3000,"fee":450},{"principal":6000,"fee":750},{"principal":10000,"fee":1050}]'::jsonb,
    updated_at = NOW()
WHERE financing_tiers IS DISTINCT FROM
      '[{"principal":3000,"fee":450},{"principal":6000,"fee":750},{"principal":10000,"fee":1050}]'::jsonb;

-- members.current_balance is the subscription-only 2021-2025 ledger. Explicitly
-- exclude financing rows from this trigger; their source of truth is the plan,
-- installments, allocations, and financing_balance_transactions.
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
    old_affects := OLD.status = 'paid' AND OLD.category = 'subscription' AND NOT old_financing;
    old_target := COALESCE(OLD.beneficiary_id, OLD.payer_id);
  END IF;

  IF TG_OP <> 'DELETE' THEN
    new_financing := NULLIF(to_jsonb(NEW)->>'financing_plan_id', '') IS NOT NULL;
    new_affects := NEW.status = 'paid' AND NEW.category = 'subscription' AND NOT new_financing;
    new_target := COALESCE(NEW.beneficiary_id, NEW.payer_id);
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

COMMIT;
