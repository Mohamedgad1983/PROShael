-- Migration: Standardize payment status to 'paid' (from mixed 'completed'/'paid')
-- Date:      2026-04-17
-- Purpose:   Unify the payment completion status so the balance trigger, admin
--            analytics queries, member-facing balance reads, and statement
--            controllers all agree. Before this migration, the trigger watched
--            for 'completed' while admin approval wrote 'paid', so approved
--            payments never updated members.current_balance.
-- Idempotent: YES — safe to rerun.
-- Rollback:  See bottom of file.

BEGIN;

-- 1. Snapshot the pre-migration state for auditing
DO $$
DECLARE
  completed_before INTEGER;
  paid_before      INTEGER;
  mixed_members    INTEGER;
BEGIN
  SELECT COUNT(*) INTO completed_before FROM payments WHERE status = 'completed';
  SELECT COUNT(*) INTO paid_before      FROM payments WHERE status = 'paid';
  SELECT COUNT(DISTINCT payer_id) INTO mixed_members
    FROM payments WHERE status IN ('completed', 'paid');

  RAISE NOTICE '=== payment-status migration: pre-state ===';
  RAISE NOTICE 'payments.status = ''completed'' : %', completed_before;
  RAISE NOTICE 'payments.status = ''paid''      : %', paid_before;
  RAISE NOTICE 'distinct payers affected        : %', mixed_members;
END $$;

-- 2. Normalize existing rows: 'completed' -> 'paid'
UPDATE payments
   SET status = 'paid',
       updated_at = NOW()
 WHERE status = 'completed';

-- 3. Drop and recreate the balance-update trigger function to watch 'paid'
DROP TRIGGER IF EXISTS trg_update_member_balance ON payments;
DROP FUNCTION IF EXISTS update_member_balance() CASCADE;

CREATE OR REPLACE FUNCTION update_member_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    -- Recompute balance when the row lands on 'paid' status
    IF NEW.status = 'paid' THEN
      UPDATE members
         SET current_balance = COALESCE(
               (SELECT SUM(p.amount)
                  FROM payments p
                 WHERE p.payer_id = NEW.payer_id
                   AND p.status   = 'paid'), 0),
             updated_at = NOW()
       WHERE id = NEW.payer_id;
    END IF;

    -- Also recompute if the row transitioned AWAY from 'paid'
    IF (TG_OP = 'UPDATE' AND OLD.status = 'paid' AND NEW.status <> 'paid') THEN
      UPDATE members
         SET current_balance = COALESCE(
               (SELECT SUM(p.amount)
                  FROM payments p
                 WHERE p.payer_id = NEW.payer_id
                   AND p.status   = 'paid'), 0),
             updated_at = NOW()
       WHERE id = NEW.payer_id;
    END IF;

    RETURN NEW;
  END IF;

  IF (TG_OP = 'DELETE') THEN
    IF OLD.status = 'paid' THEN
      UPDATE members
         SET current_balance = COALESCE(
               (SELECT SUM(p.amount)
                  FROM payments p
                 WHERE p.payer_id = OLD.payer_id
                   AND p.status   = 'paid'), 0),
             updated_at = NOW()
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

-- 4. Rebuild the partial index to match the new status value
DROP INDEX IF EXISTS idx_payments_payer_status;
CREATE INDEX idx_payments_payer_status
  ON payments(payer_id, status)
  WHERE status = 'paid';

-- 5. Full recompute of every member's current_balance (covers any drift
--    introduced during the mixed-state era)
UPDATE members m
   SET current_balance = COALESCE(
         (SELECT SUM(p.amount)
            FROM payments p
           WHERE p.payer_id = m.id
             AND p.status   = 'paid'), 0),
       updated_at = NOW();

-- 6. Post-migration verification
DO $$
DECLARE
  completed_after INTEGER;
  paid_after      INTEGER;
  members_synced  INTEGER;
  members_total   INTEGER;
BEGIN
  SELECT COUNT(*) INTO completed_after FROM payments WHERE status = 'completed';
  SELECT COUNT(*) INTO paid_after      FROM payments WHERE status = 'paid';
  SELECT COUNT(*) INTO members_total   FROM members;
  SELECT COUNT(*) INTO members_synced  FROM members WHERE current_balance IS NOT NULL;

  RAISE NOTICE '=== payment-status migration: post-state ===';
  RAISE NOTICE 'payments.status = ''completed''  : % (must be 0)', completed_after;
  RAISE NOTICE 'payments.status = ''paid''       : %', paid_after;
  RAISE NOTICE 'members with computed balance    : % / %', members_synced, members_total;

  IF completed_after > 0 THEN
    RAISE EXCEPTION 'Migration failed: % rows still have status = ''completed''', completed_after;
  END IF;
END $$;

COMMIT;

-- =============================================================================
-- ROLLBACK (run manually if needed)
-- =============================================================================
-- BEGIN;
-- UPDATE payments SET status = 'completed', updated_at = NOW() WHERE status = 'paid';
-- DROP TRIGGER IF EXISTS trg_update_member_balance ON payments;
-- DROP FUNCTION IF EXISTS update_member_balance() CASCADE;
-- -- Then re-run the original migration file:
-- --   migrations/20250123_add_member_balance_system.sql
-- DROP INDEX IF EXISTS idx_payments_payer_status;
-- CREATE INDEX idx_payments_payer_status ON payments(payer_id, status)
--   WHERE status = 'completed';
-- COMMIT;
