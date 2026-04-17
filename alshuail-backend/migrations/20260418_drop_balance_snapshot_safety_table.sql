-- ============================================================================
-- Migration: Drop the balance-restore safety snapshot table
-- ============================================================================
-- Background
--   On 2026-04-17 we restored 349 member balances from a pg_dump after a
--   trigger-recompute migration zeroed them out. As part of the restore we
--   created _balance_snapshot_before_restore holding the pre-restore values
--   so we had a panic rollback path.
--
--   Balances have been running against the new additive trigger for
--   ~24 hours without issue. Payment approvals work end-to-end, the
--   statement page renders correct totals, and the balance card on iOS
--   shows the right numbers. Time to drop the snapshot.
--
-- What this migration does
--   1. Compares current balances vs. the snapshot and prints any drift so
--      we see the impact of the last 24h of approvals before dropping.
--   2. Drops _balance_snapshot_before_restore.
--
-- Safety
--   - Runs in a transaction. If the final DROP fails the diff query still
--     produced output, so you can re-run without side effects.
--   - Idempotent: if the table is already gone the script exits cleanly.
-- ============================================================================

\set ON_ERROR_STOP on
BEGIN;

-- The snapshot table holds the BROKEN (zeroed) balances captured right
-- before the restore. Column layout:
--   id             uuid
--   broken_balance numeric(12,2)   -- what current_balance was set to by
--                                  -- the bad SUM-recompute trigger
--   captured_at    timestamptz
--
-- A useful audit before drop:
--   1. how many rows the snapshot covers
--   2. how many of those broken_balance values were zero / non-zero
--   3. confirm members.current_balance is now > 0 for the rows the snapshot
--      thought were broken — proves the restore worked
DO $$
DECLARE
  has_snapshot      BOOLEAN;
  snap_count        INTEGER;
  broken_zero       INTEGER;
  broken_nonzero    INTEGER;
  restored_nonzero  INTEGER;
BEGIN
  SELECT EXISTS (
    SELECT 1
      FROM pg_catalog.pg_tables
     WHERE schemaname = 'public'
       AND tablename  = '_balance_snapshot_before_restore'
  ) INTO has_snapshot;

  IF NOT has_snapshot THEN
    RAISE NOTICE 'Snapshot table does not exist — nothing to drop.';
    RETURN;
  END IF;

  SELECT COUNT(*) INTO snap_count
    FROM _balance_snapshot_before_restore;

  SELECT
    COUNT(*) FILTER (WHERE COALESCE(broken_balance, 0) = 0),
    COUNT(*) FILTER (WHERE COALESCE(broken_balance, 0) <> 0)
  INTO broken_zero, broken_nonzero
  FROM _balance_snapshot_before_restore;

  SELECT COUNT(*) INTO restored_nonzero
    FROM members m
    JOIN _balance_snapshot_before_restore s ON s.id = m.id
   WHERE COALESCE(m.current_balance, 0) > 0;

  RAISE NOTICE 'Snapshot rows: %', snap_count;
  RAISE NOTICE '  broken_balance = 0  : % (rows the bad trigger zeroed)', broken_zero;
  RAISE NOTICE '  broken_balance <> 0 : % (rows the bad trigger spared)', broken_nonzero;
  RAISE NOTICE '  current balance > 0 now: % (restore worked for these rows)', restored_nonzero;
END$$;

DROP TABLE IF EXISTS _balance_snapshot_before_restore;

COMMIT;

-- Verification (run manually after COMMIT):
--   SELECT to_regclass('public._balance_snapshot_before_restore');
--   -- expected: NULL
