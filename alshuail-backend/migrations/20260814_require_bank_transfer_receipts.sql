-- A member-created bank transfer is not financial evidence by itself. Only an
-- archived receipt linked through documents_metadata can move it to paid.
BEGIN;

CREATE OR REPLACE FUNCTION public.require_bank_transfer_receipt_for_payment()
RETURNS trigger AS $$
DECLARE
  valid_receipt BOOLEAN;
BEGIN
  IF LOWER(BTRIM(COALESCE(NEW.payment_method, ''))) IN ('bank_transfer', 'transfer')
     AND NEW.status = 'paid' THEN
    IF NEW.receipt_document_id IS NOT NULL THEN
      PERFORM pg_advisory_xact_lock(hashtextextended(NEW.receipt_document_id::text, 0));
    END IF;
    SELECT EXISTS (
      SELECT 1
        FROM public.documents_metadata d
       WHERE d.id = NEW.receipt_document_id
         AND d.status = 'active'
         AND d.category = 'receipts'
         AND d.member_id = NEW.payer_id
    ) INTO valid_receipt;
    IF NOT COALESCE(valid_receipt, FALSE) THEN
      RAISE EXCEPTION 'Bank-transfer payment requires an active archived receipt owned by its payer'
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_require_bank_transfer_receipt_for_payment ON public.payments;
CREATE TRIGGER trg_require_bank_transfer_receipt_for_payment
  BEFORE INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.require_bank_transfer_receipt_for_payment();

COMMENT ON FUNCTION public.require_bank_transfer_receipt_for_payment() IS
  'Rejects bank-transfer approval, including legacy transfer aliases, until a receipt is archived in documents_metadata.';

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

DROP TRIGGER IF EXISTS trg_protect_referenced_financial_document ON public.documents_metadata;
CREATE TRIGGER trg_protect_referenced_financial_document
  BEFORE UPDATE OR DELETE ON public.documents_metadata
  FOR EACH ROW EXECUTE FUNCTION public.protect_referenced_financial_document();

COMMENT ON FUNCTION public.protect_referenced_financial_document() IS
  'Keeps payment and initiative receipt evidence append-only after it is referenced.';

COMMIT;
