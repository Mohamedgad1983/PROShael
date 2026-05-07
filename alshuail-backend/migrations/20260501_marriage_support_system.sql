-- ============================================================================
-- Migration: Marriage Support System (برنامج دعم المقبلين على الزواج)
-- Created: 2026-05-01
--
-- Adds the schema for the marriage-support workflow that runs alongside
-- the existing initiatives table. A request is opened by a member, a
-- dedicated fundraising initiative is activated for it, the committee
-- chair enters auxiliary financial inputs, the system calculates the
-- final support amount, four parties sign electronically (beneficiary →
-- witness 1 → witness 2 → committee chair), the fund chairman approves,
-- and the fund disburses.
--
-- Tables:
--   • marriage_support_requests          core request + workflow state +
--                                        calculation inputs/outputs
--   • marriage_support_signatures        one row per signer, with SHA256
--                                        hash + IP + timestamp
--   • marriage_support_status_history    append-only audit trail
--   • marriage_support_settings          tunable business parameters
--                                        (singleton row, id = 1)
--
-- Existing tables modified:
--   • initiatives  — adds `type` column (fundraising | marriage_support)
--                    and `linked_marriage_request_id` back-reference.
--
-- Design notes:
--   • Actor / participant columns are plain UUID without FKs. Admins live
--     in the `users` table (not `members`), and witnesses can also be
--     admins or members — see gotcha #3 in the sprint handoff. Only the
--     beneficiary `member_id` keeps its FK because a beneficiary is
--     always a member.
--   • Calculation inputs and the four computed amounts are stored on the
--     request row. Settings used at calculation time are snapshotted so
--     historical records survive future setting changes.
--   • State machine (see `status` CHECK below) is enforced at the service
--     layer; the CHECK is defense-in-depth.
--
-- State machine:
--
--   submitted ─► under_committee_review ─► data_entered ─► awaiting_signatures
--                                          └► rejected             │
--                                                                  ▼ (4 sigs)
--                                                          signatures_complete
--                                                                  │
--                                                                  ▼ (chairman)
--                                                          approved_by_chairman
--                                                                  │
--                                                                  ▼ (fund pays)
--                                                              completed
--
--   Member can cancel only while status ∈ {submitted, under_committee_review}.
--
-- Idempotent — safe to re-run.
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. marriage_support_requests
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.marriage_support_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Sequence number — formatted as "YYYY-NNNN" (e.g. "2026-0001"). Resets
    -- with every gregorian year. Generated atomically server-side via
    -- pg_advisory_xact_lock (same generator as loans).
    sequence_number     VARCHAR(15) UNIQUE NOT NULL,
    sequence_year       INTEGER NOT NULL,
    sequence_in_year    INTEGER NOT NULL,

    -- Beneficiary — always a member.
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE RESTRICT,

    -- Personal data SNAPSHOT — copied from member record at submit time.
    applicant_name      TEXT NOT NULL,
    national_id         TEXT NOT NULL,
    date_of_birth       DATE,

    -- Marriage details
    spouse_name_ar      TEXT NOT NULL,
    spouse_national_id  TEXT,
    marriage_date       DATE NOT NULL,

    -- ─── linked initiative ────────────────────────────────────────────────
    -- Each marriage support request gets its own fundraising initiative
    -- (type = 'marriage_support'). The committee chair "activates" the
    -- initiative after reviewing the request; until then this is NULL.
    linked_initiative_id UUID,  -- FK added at end of migration (see §6)

    -- ─── calculation inputs (entered by committee chair) ─────────────────
    -- Filled when status moves to data_entered. NULL beforehand.
    contributions_sum                NUMERIC(12,2),  -- sum of contributions to linked initiative
    previous_ananiyat_count_auto     INTEGER,        -- auto-computed from member's past marriage_support payments
    previous_ananiyat_count_override INTEGER,        -- optional manual override (committee chair)
    additional_support_balance       NUMERIC(12,2) DEFAULT 0,
    special_ananiya_value            NUMERIC(12,2) DEFAULT 0,

    -- ─── settings snapshot at calculation time ───────────────────────────
    snapshot_competition_discount_rate    NUMERIC(5,4),
    snapshot_marriage_support_minimum     NUMERIC(12,2),
    snapshot_ananiyat_per_unit            NUMERIC(12,2),
    snapshot_additional_support_multiplier NUMERIC(5,4),

    -- ─── calculation outputs (rounded to integer per spec) ───────────────
    initial_total        NUMERIC(12,2),
    after_discount       NUMERIC(12,2),
    competitive_balance  NUMERIC(12,2),
    final_amount         NUMERIC(12,2),
    calculated_at        TIMESTAMPTZ,

    -- ─── witnesses (selected by committee chair) ─────────────────────────
    -- Plain UUIDs (no FK) to match the loan precedent — see header note.
    witness_1_id          UUID,
    witness_2_id          UUID,
    witness_1_name        TEXT,  -- snapshot at selection time
    witness_2_name        TEXT,  -- snapshot at selection time

    -- ─── PDF (إقرار الدين) ──────────────────────────────────────────────
    pdf_url               TEXT,
    pdf_generated_at      TIMESTAMPTZ,
    -- SHA256 of the canonical request payload at PDF-generation time.
    -- Each signature's data_hash must match this; if request data changes
    -- after PDF generation, the document is invalidated (service layer).
    pdf_data_hash         TEXT,

    -- ─── workflow ────────────────────────────────────────────────────────
    status VARCHAR(40) NOT NULL DEFAULT 'submitted'
        CHECK (status IN (
            'submitted',
            'under_committee_review',
            'data_entered',
            'awaiting_signatures',
            'signatures_complete',
            'approved_by_chairman',
            'completed',
            'rejected',
            'cancelled'
        )),

    -- Marriage contract (uploaded by member at submission)
    marriage_contract_url TEXT,

    -- Committee-side
    committee_chair_id     UUID,                  -- no FK (may be admin in users)
    reviewed_at            TIMESTAMPTZ,
    committee_note         TEXT,

    -- Chairman-side
    chairman_id            UUID,                  -- no FK (super_admin in users)
    chairman_approved_at   TIMESTAMPTZ,
    chairman_note          TEXT,

    -- Disbursement
    disbursed_at              TIMESTAMPTZ,
    disbursed_amount          NUMERIC(12,2),
    disbursed_by_id           UUID,               -- no FK
    disbursement_expense_id   UUID,               -- soft link to expenses table

    -- Negative outcomes
    rejection_reason       TEXT,
    rejected_at            TIMESTAMPTZ,
    rejected_by_id         UUID,                  -- no FK
    cancelled_at           TIMESTAMPTZ,
    cancelled_by_id        UUID,                  -- no FK

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (sequence_year, sequence_in_year)
);

COMMENT ON TABLE public.marriage_support_requests IS
    'Marriage support requests (طلبات دعم المقبلين على الزواج). Workflow: submit → committee review → data entry → 4 signatures → chairman approval → disbursement.';
COMMENT ON COLUMN public.marriage_support_requests.previous_ananiyat_count_auto IS
    'Auto-counted from past payments to marriage_support initiatives. Committee chair can override via _override column.';
COMMENT ON COLUMN public.marriage_support_requests.snapshot_competition_discount_rate IS
    'Snapshot of marriage_support_settings.competition_discount_rate at calculation time. Preserves history if settings change.';
COMMENT ON COLUMN public.marriage_support_requests.pdf_data_hash IS
    'SHA256 hash of the canonical request payload at PDF generation time. Each signature must match.';

CREATE INDEX IF NOT EXISTS idx_marriage_requests_member         ON public.marriage_support_requests(member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marriage_requests_status         ON public.marriage_support_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marriage_requests_year_seq       ON public.marriage_support_requests(sequence_year, sequence_in_year);
CREATE INDEX IF NOT EXISTS idx_marriage_requests_linked_init    ON public.marriage_support_requests(linked_initiative_id);
CREATE INDEX IF NOT EXISTS idx_marriage_requests_pending_committee ON public.marriage_support_requests(status)
    WHERE status IN ('submitted', 'under_committee_review', 'data_entered', 'awaiting_signatures');
CREATE INDEX IF NOT EXISTS idx_marriage_requests_pending_chairman ON public.marriage_support_requests(status)
    WHERE status = 'signatures_complete';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. marriage_support_signatures
-- ─────────────────────────────────────────────────────────────────────────────
-- One row per (request, signer_role). The four expected roles are:
--   beneficiary, witness_1, witness_2, committee_chair
--
-- Each signature snapshots:
--   • member_id of the signer (no FK — could be member or admin/users-table actor)
--   • signed_at   — server timestamp
--   • ip_address  — client IP at signing
--   • user_agent  — optional UA string
--   • data_hash   — SHA256 of canonical request data; must match the
--                   request's pdf_data_hash to be considered valid.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.marriage_support_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES marriage_support_requests(id) ON DELETE CASCADE,

    signer_role VARCHAR(20) NOT NULL CHECK (signer_role IN (
        'beneficiary',
        'witness_1',
        'witness_2',
        'committee_chair'
    )),

    signer_member_id UUID NOT NULL,        -- no FK (see header note)
    signer_name      TEXT NOT NULL,        -- snapshot at signing time

    signed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address       INET,
    user_agent       TEXT,

    data_hash        TEXT NOT NULL,        -- SHA256 of canonical request data
    signature_method VARCHAR(40) NOT NULL DEFAULT 'mobile_app_consent',

    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Each signer role can only sign once per request.
    UNIQUE (request_id, signer_role)
);

COMMENT ON TABLE public.marriage_support_signatures IS
    'Electronic signatures for marriage support requests. Sequential order: beneficiary → witness_1 → witness_2 → committee_chair.';
COMMENT ON COLUMN public.marriage_support_signatures.data_hash IS
    'SHA256 of canonical request data at signing time. Must match request.pdf_data_hash for the signature to be considered valid.';

CREATE INDEX IF NOT EXISTS idx_marriage_sigs_request ON public.marriage_support_signatures(request_id, signed_at);
CREATE INDEX IF NOT EXISTS idx_marriage_sigs_signer  ON public.marriage_support_signatures(signer_member_id, signed_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. marriage_support_status_history
-- ─────────────────────────────────────────────────────────────────────────────
-- Append-only audit trail. Mirrors loan_request_status_history.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.marriage_support_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES marriage_support_requests(id) ON DELETE CASCADE,
    from_status VARCHAR(40),
    to_status   VARCHAR(40) NOT NULL,
    changed_by_id UUID,                    -- no FK (could be member or admin)
    actor_role    VARCHAR(40),             -- e.g. 'member', 'marriage_committee_chair', 'super_admin'
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    note TEXT,
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_marriage_history_request ON public.marriage_support_status_history(request_id, changed_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. marriage_support_settings (single-row tunables)
-- ─────────────────────────────────────────────────────────────────────────────
-- Editable from admin panel. New rows are NEVER inserted — exactly one row.
-- Snapshotted into each request at calculation time.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.marriage_support_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),

    -- Discount applied to (contributions + ananiyat * per_unit) before
    -- comparing to the minimum. 0.25 = 25% off.
    competition_discount_rate    NUMERIC(5,4) NOT NULL DEFAULT 0.25
        CHECK (competition_discount_rate >= 0 AND competition_discount_rate < 1),

    -- Floor — competitive_balance = max(after_discount, this).
    marriage_support_minimum     NUMERIC(12,2) NOT NULL DEFAULT 10000
        CHECK (marriage_support_minimum >= 0),

    -- Ananiya unit value — multiplied by previous_ananiyat_count when
    -- computing initial_total.
    ananiyat_per_unit            NUMERIC(12,2) NOT NULL DEFAULT 500
        CHECK (ananiyat_per_unit >= 0),

    -- Multiplier applied to additional_support_balance in the final formula.
    additional_support_multiplier NUMERIC(5,4) NOT NULL DEFAULT 1.5
        CHECK (additional_support_multiplier >= 0),

    -- Whether the feature is open to members (kill-switch).
    enabled                      BOOLEAN NOT NULL DEFAULT true,

    updated_by_id                UUID,             -- no FK
    updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.marriage_support_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Extend `initiatives` with type + back-reference
-- ─────────────────────────────────────────────────────────────────────────────
-- An initiative can be either a regular fundraiser or a marriage-support
-- collection vehicle. When type = 'marriage_support', linked_marriage_request_id
-- points to the request the initiative is funding.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'initiatives'
          AND column_name = 'type'
    ) THEN
        ALTER TABLE public.initiatives
            ADD COLUMN type VARCHAR(30) NOT NULL DEFAULT 'fundraising'
            CHECK (type IN ('fundraising', 'marriage_support'));
        COMMENT ON COLUMN public.initiatives.type IS
            'fundraising = regular initiative; marriage_support = vehicle for a single marriage_support_requests row.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'initiatives'
          AND column_name = 'linked_marriage_request_id'
    ) THEN
        ALTER TABLE public.initiatives
            ADD COLUMN linked_marriage_request_id UUID;
        COMMENT ON COLUMN public.initiatives.linked_marriage_request_id IS
            'Soft reference to marriage_support_requests(id). Set when type = marriage_support.';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_initiatives_type ON public.initiatives(type);
CREATE INDEX IF NOT EXISTS idx_initiatives_linked_marriage ON public.initiatives(linked_marriage_request_id)
    WHERE linked_marriage_request_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Cross-link FK from marriage_support_requests → initiatives
-- ─────────────────────────────────────────────────────────────────────────────
-- We deliberately do NOT FK initiatives.linked_marriage_request_id back to
-- marriage_support_requests because the legacy `activities` table also feeds
-- the same UI and we don't want to constrain initiative deletion behavior
-- across two tables. The reverse direction (request.linked_initiative_id →
-- initiatives.id) is fine to FK because initiative IDs are stable UUIDs.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'marriage_requests_linked_initiative_fkey'
    ) THEN
        ALTER TABLE public.marriage_support_requests
            ADD CONSTRAINT marriage_requests_linked_initiative_fkey
            FOREIGN KEY (linked_initiative_id)
            REFERENCES public.initiatives(id)
            ON DELETE SET NULL;
    END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. updated_at triggers
-- ─────────────────────────────────────────────────────────────────────────────
-- Reuse update_updated_at_column() from the loan migration. Defensive create
-- in case this migration runs standalone.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
    ) THEN
        EXECUTE $f$
            CREATE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $body$
            BEGIN
                NEW.updated_at = NOW();
                RETURN NEW;
            END;
            $body$ LANGUAGE plpgsql;
        $f$;
    END IF;
END $$;

DROP TRIGGER IF EXISTS update_marriage_requests_updated_at ON public.marriage_support_requests;
CREATE TRIGGER update_marriage_requests_updated_at
    BEFORE UPDATE ON public.marriage_support_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_marriage_settings_updated_at ON public.marriage_support_settings;
CREATE TRIGGER update_marriage_settings_updated_at
    BEFORE UPDATE ON public.marriage_support_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- ============================================================================
-- Verification queries (read-only — run manually after applying):
--
--   SELECT column_name, data_type, is_nullable
--     FROM information_schema.columns
--    WHERE table_schema = 'public'
--      AND table_name = 'marriage_support_requests'
--    ORDER BY ordinal_position;
--
--   SELECT * FROM public.marriage_support_settings;
--   -- expect: 1 row with defaults (0.25, 10000, 500, 1.5, enabled=true)
--
--   SELECT column_name FROM information_schema.columns
--    WHERE table_schema = 'public' AND table_name = 'initiatives'
--      AND column_name IN ('type', 'linked_marriage_request_id');
--   -- expect: 2 rows
-- ============================================================================
