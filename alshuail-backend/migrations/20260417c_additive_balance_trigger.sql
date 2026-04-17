-- Migration: Switch update_member_balance() trigger from SUM-recompute to additive.
-- Date:      2026-04-17 (same day as status-standardization migration)
-- Background:
--   The previous trigger (introduced 2025-01-23) recomputed
--     members.current_balance = SUM(payments.amount WHERE payer_id = m.id AND status = 'paid')
--   on every INSERT/UPDATE/DELETE of a payment row. That's correct IF every
--   historical payment is present in the `payments` table — but in this DB most
--   members' balances were imported/set through other means (import scripts,
--   balance_adjustments, manual SQL), so most of them have zero rows in
--   payments. Running the recompute UPDATE wipes those legitimate balances to 0.
--
-- Fix:
--   Replace the trigger with additive logic:
--     INSERT with status='paid'             → balance += NEW.amount
--     UPDATE non-paid → paid                 → balance += NEW.amount
--     UPDATE paid    → non-paid              → balance -= OLD.amount
--     UPDATE paid    → paid (amount changed) → balance += (NEW.amount - OLD.amount)
--     DELETE of a paid row                   → balance -= OLD.amount
--
--   This preserves the pre-existing balance (whatever its source) and only
--   adjusts by the delta of each payment. No more mass overwrite, even if the
--   entire payments table is recomputed row by row.
--
-- Idempotent: yes — DROP + CREATE OR REPLACE.
-- Rollback:   see bottom of file.

BEGIN;

DROP TRIGGER IF EXISTS trg_update_member_balance ON payments;
DROP FUNCTION IF EXISTS update_member_balance() CASCADE;

CREATE OR REPLACE FUNCTION update_member_balance()
RETURNS TRIGGER AS $$
DECLARE
  old_paid BOOLEAN;
  new_paid BOOLEAN;
  delta    NUMERIC(12,2);
BEGIN
  IF (TG_OP = 'INSERT') THEN
    -- Only adjust when the new row lands on 'paid'
    IF NEW.status = 'paid' AND NEW.payer_id IS NOT NULL THEN
      UPDATE members
         SET current_balance = COALESCE(current_balance, 0) + COALESCE(NEW.amount, 0),
             updated_at      = NOW()
       WHERE id = NEW.payer_id;
    END IF;
    RETURN NEW;
  END IF;

  IF (TG_OP = 'UPDATE') THEN
    old_paid := (OLD.status = 'paid');
    new_paid := (NEW.status = 'paid');

    IF NOT old_paid AND new_paid THEN
      -- Transition INTO paid (admin approval): add new amount
      IF NEW.payer_id IS NOT NULL THEN
        UPDATE members
           SET current_balance = COALESCE(current_balance, 0) + COALESCE(NEW.amount, 0),
               updated_at      = NOW()
         WHERE id = NEW.payer_id;
      END IF;
    ELSIF old_paid AND NOT new_paid THEN
      -- Transition OUT of paid (cancelled/refunded): subtract old amount
      IF OLD.payer_id IS NOT NULL THEN
        UPDATE members
           SET current_balance = COALESCE(current_balance, 0) - COALESCE(OLD.amount, 0),
               updated_at      = NOW()
         WHERE id = OLD.payer_id;
      END IF;
    ELSIF old_paid AND new_paid THEN
      -- Stay paid but amount or payer may have changed.
      -- If payer changed, move the delta: subtract from old, add to new.
      IF OLD.payer_id IS DISTINCT FROM NEW.payer_id THEN
        IF OLD.payer_id IS NOT NULL THEN
          UPDATE members
             SET current_balance = COALESCE(current_balance, 0) - COALESCE(OLD.amount, 0),
                 updated_at      = NOW()
           WHERE id = OLD.payer_id;
        END IF;
        IF NEW.payer_id IS NOT NULL THEN
          UPDATE members
             SET current_balance = COALESCE(current_balance, 0) + COALESCE(NEW.amount, 0),
                 updated_at      = NOW()
           WHERE id = NEW.payer_id;
        END IF;
      ELSE
        -- Same payer, just amount delta
        delta := COALESCE(NEW.amount, 0) - COALESCE(OLD.amount, 0);
        IF delta <> 0 AND NEW.payer_id IS NOT NULL THEN
          UPDATE members
             SET current_balance = COALESCE(current_balance, 0) + delta,
                 updated_at      = NOW()
           WHERE id = NEW.payer_id;
        END IF;
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  IF (TG_OP = 'DELETE') THEN
    IF OLD.status = 'paid' AND OLD.payer_id IS NOT NULL THEN
      UPDATE members
         SET current_balance = COALESCE(current_balance, 0) - COALESCE(OLD.amount, 0),
             updated_at      = NOW()
       WHERE id = OLD.payer_id;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_member_balance
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_member_balance();

-- Leave the partial index (`idx_payments_payer_status` on status='paid') alone;
-- it's still useful for reports.

-- Post-migration sanity
DO $$
DECLARE
  trig_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgname = 'trg_update_member_balance'
       AND tgrelid = 'payments'::regclass
  ) INTO trig_exists;

  RAISE NOTICE '=== additive balance trigger migration: post-state ===';
  RAISE NOTICE 'trigger installed: %', trig_exists;

  IF NOT trig_exists THEN
    RAISE EXCEPTION 'Migration failed: trg_update_member_balance was not installed';
  END IF;
END $$;

COMMIT;

-- =============================================================================
-- ROLLBACK (reverts to the SUM-recompute behavior from 2025-01-23 migration;
-- NOT recommended unless you've re-imported all historical payments first).
-- =============================================================================
-- BEGIN;
-- DROP TRIGGER IF EXISTS trg_update_member_balance ON payments;
-- DROP FUNCTION IF EXISTS update_member_balance() CASCADE;
-- -- Then re-run the body of migrations/20260417_standardize_payment_status_to_paid.sql
-- -- (Steps 3-5: CREATE OR REPLACE FUNCTION, CREATE TRIGGER, and the recompute UPDATE)
-- COMMIT;
