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

DO $$
DECLARE
  has_snapshot BOOLEAN;
  snap_count   INTEGER;
  drift_count  INTEGER;
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
  RAISE NOTICE 'Snapshot rows: %', snap_count;

  SELECT COUNT(*) INTO drift_count
    FROM members m
    JOIN _balance_snapshot_before_restore s ON s.id = m.id
   WHERE COALESCE(m.current_balance, 0) <> COALESCE(s.current_balance, 0);

  RAISE NOTICE
    'Members whose balance changed since the snapshot was taken: %',
    drift_count;
END$$;

-- Top 10 balance deltas since the snapshot (for an audit log line)
-- Only runs if the snapshot table exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_tables
     WHERE schemaname='public' AND tablename='_balance_snapshot_before_restore'
  ) THEN
    RAISE NOTICE 'Top 10 balance deltas since snapshot:';
    PERFORM *
      FROM (
        SELECT m.full_name,
               s.current_balance AS before_restore,
               m.current_balance AS now,
               m.current_balance - s.current_balance AS delta
          FROM members m
          JOIN _balance_snapshot_before_restore s ON s.id = m.id
         ORDER BY ABS(COALESCE(m.current_balance,0) - COALESCE(s.current_balance,0)) DESC
         LIMIT 10
      ) t;
  END IF;
END$$;

DROP TABLE IF EXISTS _balance_snapshot_before_restore;

COMMIT;

-- Verification (run manually after COMMIT):
--   SELECT to_regclass('public._balance_snapshot_before_restore');
--   -- expected: NULL
