-- Archive bank-transfer request receipts as immutable financial evidence.
--
-- Backfill policy (deliberately fail-closed): receipt_url/receipt_filename do
-- not prove that file bytes exist in the private document store. Existing
-- rows therefore remain NULL and must be remediated by an operator who can
-- upload and link the original evidence. No metadata is fabricated here.
BEGIN;

ALTER TABLE public.bank_transfer_requests
  ADD COLUMN IF NOT EXISTS receipt_document_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.bank_transfer_requests'::regclass
       AND conname = 'bank_transfer_requests_receipt_document_id_fkey'
  ) THEN
    ALTER TABLE public.bank_transfer_requests
      ADD CONSTRAINT bank_transfer_requests_receipt_document_id_fkey
      FOREIGN KEY (receipt_document_id)
      REFERENCES public.documents_metadata(id)
      ON DELETE RESTRICT
      NOT VALID;
  END IF;
END $$;

ALTER TABLE public.bank_transfer_requests
  VALIDATE CONSTRAINT bank_transfer_requests_receipt_document_id_fkey;

CREATE INDEX IF NOT EXISTS idx_bank_transfer_requests_receipt_document_id
  ON public.bank_transfer_requests(receipt_document_id)
  WHERE receipt_document_id IS NOT NULL;

COMMENT ON COLUMN public.bank_transfer_requests.receipt_document_id IS
  'Active documents_metadata receipt owned by requester_id. Legacy URL-only rows stay NULL and require manual evidence remediation.';

CREATE OR REPLACE FUNCTION public.require_archived_bank_transfer_request_receipt()
RETURNS trigger AS $$
DECLARE
  requires_validation BOOLEAN := FALSE;
  valid_receipt BOOLEAN := FALSE;
BEGIN
  IF TG_OP = 'INSERT' THEN
    requires_validation :=
      LOWER(BTRIM(COALESCE(NEW.status, 'pending'))) IN ('pending', 'approved')
      OR NEW.receipt_document_id IS NOT NULL;
  ELSE
    requires_validation :=
      (
        LOWER(BTRIM(COALESCE(NEW.status, ''))) = 'approved'
        AND LOWER(BTRIM(COALESCE(OLD.status, ''))) <> 'approved'
      )
      OR NEW.receipt_document_id IS DISTINCT FROM OLD.receipt_document_id
      OR NEW.requester_id IS DISTINCT FROM OLD.requester_id;
  END IF;

  IF NOT requires_validation THEN
    RETURN NEW;
  END IF;

  IF NEW.receipt_document_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(
      hashtextextended(NEW.receipt_document_id::text, 0)
    );
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM public.documents_metadata d
     WHERE d.id = NEW.receipt_document_id
       AND d.member_id = NEW.requester_id
       AND d.category = 'receipts'
       AND d.status = 'active'
  ) INTO valid_receipt;

  IF NOT COALESCE(valid_receipt, FALSE) THEN
    RAISE EXCEPTION 'Bank-transfer request requires an active archived receipt owned by its requester'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_require_archived_bank_transfer_request_receipt
  ON public.bank_transfer_requests;
CREATE TRIGGER trg_require_archived_bank_transfer_request_receipt
  BEFORE INSERT OR UPDATE ON public.bank_transfer_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.require_archived_bank_transfer_request_receipt();

COMMENT ON FUNCTION public.require_archived_bank_transfer_request_receipt() IS
  'Fails closed for new/approved bank-transfer requests unless their active receipt is archived and owned by requester_id.';

-- Extend the existing append-only financial-evidence guard so a receipt
-- cannot be soft-deleted or relabelled while it is attached to a request,
-- even before the resulting payment is approved.
CREATE OR REPLACE FUNCTION public.protect_referenced_financial_document()
RETURNS trigger AS $$
DECLARE
  referenced BOOLEAN;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(OLD.id::text, 0));

  SELECT (
    EXISTS (SELECT 1 FROM public.payments p WHERE p.receipt_document_id = OLD.id)
    OR EXISTS (SELECT 1 FROM public.initiative_donations d WHERE d.receipt_document_id = OLD.id)
    OR EXISTS (SELECT 1 FROM public.activity_contributions c WHERE c.receipt_document_id = OLD.id)
    OR EXISTS (
      SELECT 1
        FROM public.bank_transfer_requests btr
       WHERE btr.receipt_document_id = OLD.id
    )
  ) INTO referenced;

  IF NOT referenced THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Referenced financial evidence is immutable'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.member_id IS DISTINCT FROM OLD.member_id
    OR NEW.category IS DISTINCT FROM OLD.category
    OR NEW.file_path IS DISTINCT FROM OLD.file_path
    OR NEW.file_size IS DISTINCT FROM OLD.file_size
    OR NEW.file_type IS DISTINCT FROM OLD.file_type
    OR NEW.original_name IS DISTINCT FROM OLD.original_name
    OR NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Referenced financial evidence is immutable'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_referenced_financial_document
  ON public.documents_metadata;
CREATE TRIGGER trg_protect_referenced_financial_document
  BEFORE UPDATE OR DELETE ON public.documents_metadata
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_referenced_financial_document();

DO $$
DECLARE
  legacy_unarchived_count BIGINT;
BEGIN
  SELECT COUNT(*)
    INTO legacy_unarchived_count
    FROM public.bank_transfer_requests
   WHERE receipt_document_id IS NULL;

  RAISE NOTICE '% legacy bank-transfer request(s) remain unarchived and require manual evidence remediation',
    legacy_unarchived_count;
END $$;

COMMIT;
