-- Complete the expenses lifecycle columns used by create, edit, approval and
-- soft-delete operations.  The statements are additive and safe to re-run.

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS description_en TEXT,
  ADD COLUMN IF NOT EXISTS approval_notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_by UUID,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS rejected_by UUID,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITHOUT TIME ZONE,
  ADD COLUMN IF NOT EXISTS deleted_by UUID,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITHOUT TIME ZONE,
  ADD COLUMN IF NOT EXISTS receipt_image_url TEXT;

CREATE INDEX IF NOT EXISTS idx_expenses_updated_by
  ON expenses(updated_by) WHERE updated_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_deleted_at
  ON expenses(deleted_at) WHERE deleted_at IS NOT NULL;

COMMENT ON COLUMN expenses.approval_notes IS
  'Notes recorded by the financial approver.';

COMMENT ON COLUMN expenses.updated_by IS
  'Actor who last edited the expense; intentionally has no FK because admin identities can come from multiple actor tables.';
