-- ============================================================================
-- Migration: Drop "actor" FK constraints on loan tables
-- Created: 2026-04-30
--
-- The original migration referenced members(id) for every "who did this"
-- column (reviewed_by_fund_id, forwarded_by_id, processed_by_brouj_id,
-- rejected_by_id, cancelled_by_id, uploaded_by, changed_by_id). But fund
-- staff and Brouj partners live in the separate `users` table, not
-- `members`, so every state transition fails with a FK violation.
--
-- Fix: drop the FK constraints on action/audit columns. They stay as plain
-- UUIDs that the application resolves against either users or members
-- depending on context. The `member_id` (the loan's owner) keeps its FK
-- because that's always a member.
--
-- Idempotent: each DROP CONSTRAINT IF EXISTS is safe to re-run.
-- ============================================================================

BEGIN;

-- Discover and drop the system-generated FK constraint names.
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN
        SELECT conname, conrelid::regclass AS table_name
        FROM pg_constraint
        WHERE contype = 'f'
          AND conrelid::regclass IN (
              'loan_requests'::regclass,
              'loan_request_documents'::regclass,
              'loan_request_status_history'::regclass
          )
          -- Only drop FKs that point at members on actor/audit columns.
          -- We INTENTIONALLY keep loan_requests.member_id → members(id)
          -- because that one really is always a member.
          AND conname NOT IN (
              'loan_requests_member_id_fkey'
          )
          AND confrelid::regclass = 'members'::regclass
    LOOP
        EXECUTE format(
            'ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I',
            constraint_record.table_name,
            constraint_record.conname
        );
        RAISE NOTICE 'Dropped FK %.% (referenced members)',
            constraint_record.table_name, constraint_record.conname;
    END LOOP;
END $$;

-- Verification: list remaining FKs on loan tables (should only be member_id).
SELECT conrelid::regclass AS table_name, conname, confrelid::regclass AS references
FROM pg_constraint
WHERE contype = 'f'
  AND conrelid::regclass IN (
      'loan_requests'::regclass,
      'loan_request_documents'::regclass,
      'loan_request_status_history'::regclass
  );

COMMIT;
