-- Marriage-support signature workflow hardening
--
-- 1. Makes participant lookups efficient for the beneficiary and both witnesses.
-- 2. Prevents signed/PDF-bound request data from being changed after issuance.
-- 3. Repairs the narrow legacy invariant where all four valid signatures exist
--    but the request remained in awaiting_signatures after a process failure.

BEGIN;

CREATE INDEX IF NOT EXISTS idx_marriage_requests_witness_1
    ON public.marriage_support_requests (witness_1_id, created_at DESC)
    WHERE witness_1_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_marriage_requests_witness_2
    ON public.marriage_support_requests (witness_2_id, created_at DESC)
    WHERE witness_2_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.protect_issued_marriage_support_payload()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IN (
        'awaiting_signatures',
        'signatures_complete',
        'approved_by_chairman',
        'completed'
    ) AND (
        NEW.member_id IS DISTINCT FROM OLD.member_id OR
        NEW.applicant_name IS DISTINCT FROM OLD.applicant_name OR
        NEW.national_id IS DISTINCT FROM OLD.national_id OR
        NEW.date_of_birth IS DISTINCT FROM OLD.date_of_birth OR
        NEW.spouse_name_ar IS DISTINCT FROM OLD.spouse_name_ar OR
        NEW.spouse_national_id IS DISTINCT FROM OLD.spouse_national_id OR
        NEW.marriage_date IS DISTINCT FROM OLD.marriage_date OR
        NEW.linked_initiative_id IS DISTINCT FROM OLD.linked_initiative_id OR
        NEW.contributions_sum IS DISTINCT FROM OLD.contributions_sum OR
        NEW.previous_ananiyat_count_auto IS DISTINCT FROM OLD.previous_ananiyat_count_auto OR
        NEW.previous_ananiyat_count_override IS DISTINCT FROM OLD.previous_ananiyat_count_override OR
        NEW.additional_support_balance IS DISTINCT FROM OLD.additional_support_balance OR
        NEW.special_ananiya_value IS DISTINCT FROM OLD.special_ananiya_value OR
        NEW.snapshot_competition_discount_rate IS DISTINCT FROM OLD.snapshot_competition_discount_rate OR
        NEW.snapshot_marriage_support_minimum IS DISTINCT FROM OLD.snapshot_marriage_support_minimum OR
        NEW.snapshot_ananiyat_per_unit IS DISTINCT FROM OLD.snapshot_ananiyat_per_unit OR
        NEW.snapshot_additional_support_multiplier IS DISTINCT FROM OLD.snapshot_additional_support_multiplier OR
        NEW.initial_total IS DISTINCT FROM OLD.initial_total OR
        NEW.after_discount IS DISTINCT FROM OLD.after_discount OR
        NEW.competitive_balance IS DISTINCT FROM OLD.competitive_balance OR
        NEW.final_amount IS DISTINCT FROM OLD.final_amount OR
        NEW.witness_1_id IS DISTINCT FROM OLD.witness_1_id OR
        NEW.witness_2_id IS DISTINCT FROM OLD.witness_2_id OR
        NEW.witness_1_name IS DISTINCT FROM OLD.witness_1_name OR
        NEW.witness_2_name IS DISTINCT FROM OLD.witness_2_name OR
        NEW.pdf_url IS DISTINCT FROM OLD.pdf_url OR
        NEW.pdf_generated_at IS DISTINCT FROM OLD.pdf_generated_at OR
        NEW.pdf_data_hash IS DISTINCT FROM OLD.pdf_data_hash
    ) THEN
        RAISE EXCEPTION USING
            ERRCODE = '23514',
            MESSAGE = 'Issued marriage-support signing data is immutable; reject or use an audited reissue workflow';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_issued_marriage_support_payload
    ON public.marriage_support_requests;

CREATE TRIGGER protect_issued_marriage_support_payload
    BEFORE UPDATE ON public.marriage_support_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_issued_marriage_support_payload();

-- Recover only requests that already contain the complete ordered role set and
-- whose signature hashes still match the issued request hash. No signatures are
-- created or inferred by this repair.
WITH recoverable AS (
    SELECT r.id
    FROM public.marriage_support_requests r
    JOIN public.marriage_support_signatures s ON s.request_id = r.id
    WHERE r.status = 'awaiting_signatures'
      AND r.pdf_data_hash IS NOT NULL
      AND s.data_hash = r.pdf_data_hash
    GROUP BY r.id
    HAVING COUNT(DISTINCT s.signer_role) = 4
       AND COUNT(DISTINCT s.signer_role) FILTER (
           WHERE s.signer_role IN ('beneficiary', 'witness_1', 'witness_2', 'committee_chair')
       ) = 4
       AND BOOL_AND(
           CASE s.signer_role
               WHEN 'beneficiary' THEN s.signer_member_id = r.member_id
               WHEN 'witness_1' THEN s.signer_member_id = r.witness_1_id
               WHEN 'witness_2' THEN s.signer_member_id = r.witness_2_id
               WHEN 'committee_chair' THEN s.signer_member_id = r.committee_chair_id
               ELSE FALSE
           END
       )
), repaired AS (
    UPDATE public.marriage_support_requests r
       SET status = 'signatures_complete'
      FROM recoverable x
     WHERE r.id = x.id
     RETURNING r.id
)
INSERT INTO public.marriage_support_status_history (
    request_id,
    from_status,
    to_status,
    changed_by_id,
    actor_role,
    note,
    metadata
)
SELECT
    id,
    'awaiting_signatures',
    'signatures_complete',
    NULL,
    'system',
    'إصلاح تلقائي: كانت التوقيعات الأربعة الصحيحة موجودة ولم تتقدم حالة الطلب',
    jsonb_build_object('repair', '20260809_harden_marriage_signature_workflow')
FROM repaired;

COMMIT;
