-- Persist and protect enhanced initiative-donation review decisions.
--
-- Reviewer identities can originate from either users or members in the
-- existing authentication model, so rejected_by_id deliberately has no hard
-- foreign key to only one principal table. The authenticated route remains
-- responsible for resolving the reviewer and writing the canonical UUID.

BEGIN;

ALTER TABLE public.initiative_donations
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS rejected_by_id UUID,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

-- approved_by was introduced with a users-only foreign key. Privileged JWT
-- identities also legitimately originate from members, so a hard reference to
-- either one of the two principal tables would reject valid reviewers. Keep the
-- authenticated UUID as immutable audit evidence, matching rejected_by_id.
DO $$
DECLARE
  approved_by_fk NAME;
BEGIN
  FOR approved_by_fk IN
    SELECT constraint_row.conname
      FROM pg_constraint constraint_row
      JOIN pg_attribute column_row
        ON column_row.attrelid = constraint_row.conrelid
       AND column_row.attnum = ANY(constraint_row.conkey)
     WHERE constraint_row.conrelid = 'public.initiative_donations'::regclass
       AND constraint_row.contype = 'f'
       AND column_row.attname = 'approved_by'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.initiative_donations DROP CONSTRAINT %I',
      approved_by_fk
    );
  END LOOP;
END $$;

COMMENT ON COLUMN public.initiative_donations.rejection_reason IS
  'Required member-facing reason recorded when a pending donation is rejected.';
COMMENT ON COLUMN public.initiative_donations.rejected_by_id IS
  'Authenticated reviewer UUID; intentionally supports users- or members-backed principals.';
COMMENT ON COLUMN public.initiative_donations.rejected_at IS
  'Server timestamp of the first and immutable rejection decision.';
COMMENT ON COLUMN public.initiative_donations.approved_by IS
  'Authenticated reviewer UUID; intentionally supports users- or members-backed principals.';

ALTER TABLE public.initiative_donations
  DROP CONSTRAINT IF EXISTS chk_initiative_donation_rejection_audit;
ALTER TABLE public.initiative_donations
  ADD CONSTRAINT chk_initiative_donation_rejection_audit
  CHECK (
    (
      LOWER(BTRIM(COALESCE(status, ''))) = 'rejected'
      AND rejection_reason IS NOT NULL
      AND CHAR_LENGTH(BTRIM(rejection_reason)) BETWEEN 10 AND 500
      AND CHAR_LENGTH(
        REGEXP_REPLACE(BTRIM(rejection_reason), '[^[:alnum:]ء-ي]+', '', 'g')
      ) >= 8
      AND rejected_by_id IS NOT NULL
      AND rejected_at IS NOT NULL
      AND approved_by IS NULL
      AND approval_date IS NULL
    )
    OR
    (
      LOWER(BTRIM(COALESCE(status, ''))) <> 'rejected'
      AND rejection_reason IS NULL
      AND rejected_by_id IS NULL
      AND rejected_at IS NULL
    )
  ) NOT VALID;

-- Existing historical rows are not rewritten with invented audit facts.
-- NOT VALID still enforces the complete audit tuple on every new or updated
-- row while allowing old incomplete rejected rows to remain frozen evidence.
ALTER TABLE public.initiative_donations
  DROP CONSTRAINT IF EXISTS chk_initiative_donation_approval_audit;
ALTER TABLE public.initiative_donations
  ADD CONSTRAINT chk_initiative_donation_approval_audit
  CHECK (
    (
      LOWER(BTRIM(COALESCE(status, ''))) IN ('approved', 'completed', 'confirmed')
      AND approved_by IS NOT NULL
      AND approval_date IS NOT NULL
      AND rejection_reason IS NULL
      AND rejected_by_id IS NULL
      AND rejected_at IS NULL
    )
    OR (
      LOWER(BTRIM(COALESCE(status, ''))) NOT IN ('approved', 'completed', 'confirmed')
      AND approved_by IS NULL
      AND approval_date IS NULL
    )
  ) NOT VALID;

CREATE OR REPLACE FUNCTION public.protect_initiative_donation_review_audit()
RETURNS TRIGGER AS $$
DECLARE
  old_status TEXT := LOWER(BTRIM(COALESCE(OLD.status, '')));
  new_status TEXT;
  old_was_approved BOOLEAN;
  old_was_rejected BOOLEAN;
  old_was_reviewed BOOLEAN;
BEGIN
  old_was_approved := old_status IN ('approved', 'completed', 'confirmed')
    OR OLD.approved_by IS NOT NULL
    OR OLD.approval_date IS NOT NULL;
  old_was_rejected := old_status = 'rejected'
    OR OLD.rejection_reason IS NOT NULL
    OR OLD.rejected_by_id IS NOT NULL
    OR OLD.rejected_at IS NOT NULL;
  old_was_reviewed := old_was_approved
    OR old_was_rejected;

  IF TG_OP = 'DELETE' THEN
    IF old_was_reviewed THEN
      RAISE EXCEPTION 'Reviewed initiative donation evidence cannot be deleted'
        USING ERRCODE = '23514';
    END IF;
    RETURN OLD;
  END IF;

  new_status := LOWER(BTRIM(COALESCE(NEW.status, '')));

  IF old_was_reviewed AND (
    NEW.initiative_id IS DISTINCT FROM OLD.initiative_id
    OR NEW.member_id IS DISTINCT FROM OLD.member_id
    OR NEW.amount IS DISTINCT FROM OLD.amount
    OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
    OR NEW.payment_reference IS DISTINCT FROM OLD.payment_reference
    OR NEW.payment_date IS DISTINCT FROM OLD.payment_date
    OR NEW.receipt_document_id IS DISTINCT FROM OLD.receipt_document_id
  ) THEN
    RAISE EXCEPTION 'Reviewed initiative donation financial identity is immutable'
      USING ERRCODE = '23514';
  END IF;

  IF old_was_rejected AND (
    new_status IS DISTINCT FROM old_status
    OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
    OR NEW.rejected_by_id IS DISTINCT FROM OLD.rejected_by_id
    OR NEW.rejected_at IS DISTINCT FROM OLD.rejected_at
  ) THEN
    RAISE EXCEPTION 'Rejected initiative donation audit is immutable'
      USING ERRCODE = '23514';
  END IF;

  IF old_was_approved AND (
    new_status NOT IN ('approved', 'completed', 'confirmed')
    OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
    OR NEW.approval_date IS DISTINCT FROM OLD.approval_date
  ) THEN
    RAISE EXCEPTION 'Approved initiative donation review audit is immutable'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_initiative_donation_review_audit
  ON public.initiative_donations;
CREATE TRIGGER trg_protect_initiative_donation_review_audit
  BEFORE UPDATE OR DELETE ON public.initiative_donations
  FOR EACH ROW EXECUTE FUNCTION public.protect_initiative_donation_review_audit();

-- A bank receipt is one item of financial evidence and may prove only one
-- approved donation. The advisory lock makes the cross-row assertion safe for
-- concurrent reviews while preserving any historical duplicates for audit.
CREATE OR REPLACE FUNCTION public.enforce_unique_approved_initiative_receipt()
RETURNS TRIGGER AS $$
DECLARE
  new_is_approved BOOLEAN;
BEGIN
  new_is_approved := LOWER(BTRIM(COALESCE(NEW.status, '')))
      IN ('approved', 'completed', 'confirmed')
    OR NEW.approved_by IS NOT NULL;

  IF new_is_approved AND NEW.receipt_document_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(
      hashtextextended(NEW.receipt_document_id::text, 0)
    );

    IF EXISTS (
      SELECT 1
        FROM public.initiative_donations existing
       WHERE existing.id <> NEW.id
         AND existing.receipt_document_id = NEW.receipt_document_id
         AND (
           LOWER(BTRIM(COALESCE(existing.status, '')))
             IN ('approved', 'completed', 'confirmed')
           OR existing.approved_by IS NOT NULL
         )
    ) THEN
      RAISE EXCEPTION 'Initiative receipt is already claimed by an approved donation'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_unique_approved_initiative_receipt
  ON public.initiative_donations;
CREATE TRIGGER trg_enforce_unique_approved_initiative_receipt
  BEFORE INSERT OR UPDATE ON public.initiative_donations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_unique_approved_initiative_receipt();

CREATE INDEX IF NOT EXISTS idx_initiative_donations_pending_review
  ON public.initiative_donations (created_at, id)
  WHERE LOWER(BTRIM(COALESCE(status, ''))) = 'pending';

COMMIT;
