-- Initiative contributions are manual bank transfers. A pending row is not
-- financial evidence unless its receipt is archived, and it must never be
-- counted without that evidence. This migration is forward-only and must run
-- after 20260814_require_bank_transfer_receipts.sql.
BEGIN;

CREATE OR REPLACE FUNCTION public.require_initiative_contribution_evidence()
RETURNS trigger AS $$
DECLARE
  new_status TEXT := LOWER(BTRIM(COALESCE(NEW.status, '')));
  old_status TEXT := CASE
    WHEN TG_OP = 'UPDATE' THEN LOWER(BTRIM(COALESCE(OLD.status, '')))
    ELSE ''
  END;
  new_successful BOOLEAN;
  old_successful BOOLEAN;
  valid_receipt BOOLEAN;
  identity_changed BOOLEAN := FALSE;
BEGIN
  new_successful := new_status IN ('confirmed', 'completed', 'approved')
    OR (TG_TABLE_NAME = 'initiative_donations'
        AND NULLIF(to_jsonb(NEW)->>'approved_by', '') IS NOT NULL);
  old_successful := TG_OP = 'UPDATE'
    AND (old_status IN ('confirmed', 'completed', 'approved')
      OR (TG_TABLE_NAME = 'initiative_donations'
          AND NULLIF(to_jsonb(OLD)->>'approved_by', '') IS NOT NULL));

  IF TG_OP = 'UPDATE' THEN
    identity_changed := NEW.member_id IS DISTINCT FROM OLD.member_id
      OR NEW.amount IS DISTINCT FROM OLD.amount
      OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
      OR NEW.receipt_document_id IS DISTINCT FROM OLD.receipt_document_id
      OR (to_jsonb(NEW)->>'activity_id') IS DISTINCT FROM (to_jsonb(OLD)->>'activity_id')
      OR (to_jsonb(NEW)->>'initiative_id') IS DISTINCT FROM (to_jsonb(OLD)->>'initiative_id');

    IF old_successful AND identity_changed THEN
      RAISE EXCEPTION 'Approved initiative contribution financial identity is immutable'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF TG_OP = 'INSERT' OR new_successful
     OR (TG_OP = 'UPDATE' AND (
       NEW.payment_method IS DISTINCT FROM OLD.payment_method
       OR NEW.receipt_document_id IS DISTINCT FROM OLD.receipt_document_id
     )) THEN
    IF LOWER(BTRIM(COALESCE(NEW.payment_method, ''))) <> 'bank_transfer' THEN
      RAISE EXCEPTION 'Initiative contributions require bank_transfer evidence'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.receipt_document_id IS NULL THEN
      RAISE EXCEPTION 'Initiative contribution requires an archived receipt'
        USING ERRCODE = '23514';
    END IF;

    PERFORM pg_advisory_xact_lock(
      hashtextextended(NEW.receipt_document_id::text, 0)
    );
    SELECT EXISTS (
      SELECT 1
        FROM public.documents_metadata d
       WHERE d.id = NEW.receipt_document_id
         AND d.member_id = NEW.member_id
         AND d.category = 'receipts'
         AND d.status = 'active'
    ) INTO valid_receipt;

    IF NOT COALESCE(valid_receipt, FALSE) THEN
      RAISE EXCEPTION 'Initiative receipt must be active and owned by the contributor'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_require_activity_contribution_evidence
  ON public.activity_contributions;
CREATE TRIGGER trg_require_activity_contribution_evidence
  BEFORE INSERT OR UPDATE ON public.activity_contributions
  FOR EACH ROW EXECUTE FUNCTION public.require_initiative_contribution_evidence();

DROP TRIGGER IF EXISTS trg_require_initiative_donation_evidence
  ON public.initiative_donations;
CREATE TRIGGER trg_require_initiative_donation_evidence
  BEFORE INSERT OR UPDATE ON public.initiative_donations
  FOR EACH ROW EXECUTE FUNCTION public.require_initiative_contribution_evidence();

COMMENT ON FUNCTION public.require_initiative_contribution_evidence() IS
  'Requires active contributor-owned bank-transfer receipts and freezes approved financial identity.';

-- Recalculate the legacy activities total from its contribution ledger. This
-- makes retries and concurrent approvals idempotent instead of adding the same
-- amount more than once.
CREATE OR REPLACE FUNCTION public.recalculate_activity_contribution_amount()
RETURNS trigger AS $$
DECLARE
  target_activity_id UUID;
BEGIN
  target_activity_id := CASE
    WHEN TG_OP = 'DELETE' THEN OLD.activity_id
    ELSE NEW.activity_id
  END;

  UPDATE public.activities a
     SET current_amount = totals.amount,
         updated_at = NOW()
    FROM (
      SELECT COALESCE(SUM(c.amount), 0) AS amount
        FROM public.activity_contributions c
       WHERE c.activity_id = target_activity_id
         AND LOWER(BTRIM(COALESCE(c.status, ''))) = 'confirmed'
    ) totals
   WHERE a.id = target_activity_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recalculate_activity_contribution_amount
  ON public.activity_contributions;
CREATE TRIGGER trg_recalculate_activity_contribution_amount
  AFTER INSERT OR UPDATE OR DELETE ON public.activity_contributions
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_activity_contribution_amount();

COMMENT ON FUNCTION public.recalculate_activity_contribution_amount() IS
  'Rebuilds activities.current_amount from confirmed contribution ledger rows.';

COMMIT;
