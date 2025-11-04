-- Migration: Add Member Balance System with Auto-Update Triggers
-- Created: 2025-01-23
-- Purpose: Add current_balance to members table and create triggers for real-time balance updates

-- Step 1: Add current_balance column to members table
ALTER TABLE members
ADD COLUMN IF NOT EXISTS current_balance DECIMAL(10,2) DEFAULT 0;

-- Step 2: Calculate and populate initial balances from existing payments
UPDATE members m
SET current_balance = COALESCE(
  (
    SELECT SUM(p.amount)
    FROM payments p
    WHERE p.payer_id = m.id
    AND p.status = 'completed'
  ),
  0
);

-- Step 3: Create function to update member balance
CREATE OR REPLACE FUNCTION update_member_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- When payment is inserted or updated
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    -- Only update if payment status is 'completed'
    IF NEW.status = 'completed' THEN
      UPDATE members
      SET current_balance = COALESCE(
        (
          SELECT SUM(p.amount)
          FROM payments p
          WHERE p.payer_id = NEW.payer_id
          AND p.status = 'completed'
        ),
        0
      ),
      updated_at = NOW()
      WHERE id = NEW.payer_id;
    END IF;

    -- If payment was completed but now changed to another status
    IF (TG_OP = 'UPDATE' AND OLD.status = 'completed' AND NEW.status != 'completed') THEN
      UPDATE members
      SET current_balance = COALESCE(
        (
          SELECT SUM(p.amount)
          FROM payments p
          WHERE p.payer_id = NEW.payer_id
          AND p.status = 'completed'
        ),
        0
      ),
      updated_at = NOW()
      WHERE id = NEW.payer_id;
    END IF;

    RETURN NEW;
  END IF;

  -- When payment is deleted
  IF (TG_OP = 'DELETE') THEN
    IF OLD.status = 'completed' THEN
      UPDATE members
      SET current_balance = COALESCE(
        (
          SELECT SUM(p.amount)
          FROM payments p
          WHERE p.payer_id = OLD.payer_id
          AND p.status = 'completed'
        ),
        0
      ),
      updated_at = NOW()
      WHERE id = OLD.payer_id;
    END IF;

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger on payments table
DROP TRIGGER IF EXISTS trg_update_member_balance ON payments;

CREATE TRIGGER trg_update_member_balance
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_member_balance();

-- Step 5: Add index for performance optimization
CREATE INDEX IF NOT EXISTS idx_payments_payer_status
ON payments(payer_id, status)
WHERE status = 'completed';

-- Step 6: Add comment for documentation
COMMENT ON COLUMN members.current_balance IS 'Auto-calculated total of all completed payments. Updated via trigger on payments table.';
COMMENT ON FUNCTION update_member_balance() IS 'Automatically recalculates member balance when payments are inserted, updated, or deleted';
COMMENT ON TRIGGER trg_update_member_balance ON payments IS 'Auto-updates member.current_balance whenever payment records change';

-- Step 7: Verify the setup
DO $$
DECLARE
  member_count INTEGER;
  balance_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO member_count FROM members;
  SELECT COUNT(*) INTO balance_count FROM members WHERE current_balance IS NOT NULL;

  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Total members: %', member_count;
  RAISE NOTICE 'Members with balance calculated: %', balance_count;

  IF member_count = balance_count THEN
    RAISE NOTICE '✓ All member balances initialized correctly';
  ELSE
    RAISE WARNING '⚠ Some members may have NULL balances';
  END IF;
END $$;
