-- Migration: Link mobile-uploaded payment receipts to the documents_metadata system
-- Date:      2026-04-17
-- Purpose:   When a member uploads a receipt from the iOS/mobile app, the file
--            should be persisted on disk under the member's document folder
--            (same storage used by /admin/documents) and a row should be
--            inserted into documents_metadata with category = 'receipts'.
--            This migration prepares the schema:
--              1. Extend the CHECK constraint on documents_metadata.category
--                 to include 'receipts' (new category).
--              2. Add payments.receipt_document_id FK so admins can open the
--                 receipt straight from the approval queue.
-- Idempotent: YES — uses IF [NOT] EXISTS and constraint-exists guards.
-- Rollback:  See the block at the bottom (commented).

BEGIN;

-- 1. Extend the documents_metadata.category CHECK constraint to allow 'receipts'
--    Drop the old constraint (name assigned automatically on table creation)
--    and replace with one that includes the new category.
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
    FROM pg_constraint
   WHERE conrelid = 'documents_metadata'::regclass
     AND contype  = 'c'
     AND pg_get_constraintdef(oid) LIKE '%category%'
   LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE documents_metadata DROP CONSTRAINT %I', constraint_name);
    RAISE NOTICE 'Dropped old category CHECK constraint: %', constraint_name;
  END IF;
END $$;

ALTER TABLE documents_metadata
  ADD CONSTRAINT documents_metadata_category_check
  CHECK (category IN (
    'national_id',
    'marriage_certificate',
    'property_deed',
    'birth_certificate',
    'death_certificate',
    'passport',
    'driver_license',
    'education',
    'medical',
    'receipts',        -- NEW: payment receipts uploaded by members
    'other'
  ));

-- 2. Add the receipt_document_id column on payments (FK to documents_metadata)
--    ON DELETE SET NULL so deleting a document doesn't orphan the payment row.
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS receipt_document_id UUID
    REFERENCES documents_metadata(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payments_receipt_document_id
  ON payments(receipt_document_id)
  WHERE receipt_document_id IS NOT NULL;

COMMENT ON COLUMN payments.receipt_document_id IS
  'FK to documents_metadata row holding the uploaded receipt file. Set when a '
  'member uploads a receipt via /api/payments/mobile/upload-receipt/:paymentId. '
  'NULL when no receipt was uploaded.';

-- 3. Verification
DO $$
DECLARE
  has_receipts_allowed BOOLEAN;
  has_fk_column        BOOLEAN;
BEGIN
  -- Does the CHECK constraint now allow 'receipts'?
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'documents_metadata'::regclass
       AND contype  = 'c'
       AND pg_get_constraintdef(oid) LIKE '%receipts%'
  ) INTO has_receipts_allowed;

  -- Does payments.receipt_document_id exist?
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name  = 'payments'
       AND column_name = 'receipt_document_id'
  ) INTO has_fk_column;

  RAISE NOTICE '=== receipt integration migration: post-state ===';
  RAISE NOTICE 'documents_metadata category allows "receipts" : %', has_receipts_allowed;
  RAISE NOTICE 'payments.receipt_document_id column exists    : %', has_fk_column;

  IF NOT has_receipts_allowed THEN
    RAISE EXCEPTION 'Migration failed: "receipts" not allowed in documents_metadata.category';
  END IF;

  IF NOT has_fk_column THEN
    RAISE EXCEPTION 'Migration failed: payments.receipt_document_id was not created';
  END IF;
END $$;

COMMIT;

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- BEGIN;
-- ALTER TABLE payments DROP COLUMN IF EXISTS receipt_document_id;
-- DROP INDEX IF EXISTS idx_payments_receipt_document_id;
-- ALTER TABLE documents_metadata DROP CONSTRAINT IF EXISTS documents_metadata_category_check;
-- ALTER TABLE documents_metadata ADD CONSTRAINT documents_metadata_category_check
--   CHECK (category IN (
--     'national_id','marriage_certificate','property_deed','birth_certificate',
--     'death_certificate','passport','driver_license','education','medical','other'
--   ));
-- COMMIT;
