-- ============================================================================
-- Migration: Loan Request System (طلب سلفة مستردة)
-- Created: 2026-04-27
--
-- Adds the schema for member-initiated refundable loan requests with a
-- multi-stage approval workflow (member → fund admin → Brouj Al-Riyadah
-- partner → fund disbursement).
--
-- Tables:
--   • loan_requests              core request + workflow state
--   • loan_request_documents     attachments (ID, salary cert, statements,
--                                Najiz acknowledgment, fee receipt, etc.)
--   • loan_request_status_history audit trail of every state transition
--   • loan_settings              tunable business parameters
--                                (admin fee %, min/max amount, DBR cap)
--
-- Idempotent — safe to re-run.
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. loan_requests
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.loan_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Sequence number — formatted as "YYYY-NNNN" (e.g. "2026-0001"). Resets
    -- with every gregorian year. Generated atomically server-side.
    sequence_number     VARCHAR(15) UNIQUE NOT NULL,
    sequence_year       INTEGER NOT NULL,
    sequence_in_year    INTEGER NOT NULL,

    member_id UUID NOT NULL REFERENCES members(id) ON DELETE RESTRICT,

    -- Personal data SNAPSHOT — copied from member record at submit time so
    -- subsequent profile edits don't change the historical record.
    applicant_name      TEXT NOT NULL,
    national_id         TEXT NOT NULL,
    date_of_birth       DATE NOT NULL,

    -- Employment — only "government" is accepted (validated by the controller,
    -- enforced again here so direct DB inserts can't bypass it).
    employment_type     VARCHAR(30) NOT NULL CHECK (employment_type = 'government'),

    -- Financials (in SAR)
    monthly_salary       NUMERIC(10,2) NOT NULL CHECK (monthly_salary > 0),
    monthly_obligations  NUMERIC(10,2) NOT NULL CHECK (monthly_obligations >= 0),
    loan_amount          NUMERIC(10,2) NOT NULL CHECK (loan_amount BETWEEN 1000 AND 100000),

    -- Admin fee (10% of loan_amount by default — the rate at the time of
    -- creation is snapshotted in admin_fee_rate so historical records are
    -- accurate even if the setting changes later).
    admin_fee_rate       NUMERIC(5,4) NOT NULL DEFAULT 0.10,
    admin_fee_amount     NUMERIC(10,2) GENERATED ALWAYS AS (loan_amount * admin_fee_rate) STORED,
    admin_fee_collected  BOOLEAN DEFAULT false,

    terms_accepted_at    TIMESTAMPTZ NOT NULL,

    -- ─── workflow ──────────────────────────────────────────────────────────
    status VARCHAR(40) NOT NULL DEFAULT 'submitted'
        CHECK (status IN (
            'draft',
            'submitted',
            'under_fund_review',
            'approved_by_fund',
            'forwarded_to_brouj',
            'brouj_processing',
            'najiz_uploaded',
            'fee_collected',
            'ready_for_disbursement',
            'completed',
            'rejected',
            'cancelled'
        )),

    -- Fund-side review
    reviewed_by_fund_id    UUID REFERENCES members(id),
    reviewed_by_fund_at    TIMESTAMPTZ,
    fund_review_note       TEXT,

    -- Forwarding to Brouj
    forwarded_to_brouj_at  TIMESTAMPTZ,
    forwarded_by_id        UUID REFERENCES members(id),

    -- Brouj-side processing
    processed_by_brouj_id  UUID REFERENCES members(id),
    najiz_uploaded_at      TIMESTAMPTZ,
    fee_collected_at       TIMESTAMPTZ,

    -- Disbursement
    disbursed_at              TIMESTAMPTZ,
    disbursed_amount          NUMERIC(10,2),
    disbursement_expense_id   UUID, -- FK to expenses table set later (see below)

    -- Negative outcomes
    rejection_reason       TEXT,
    rejected_at            TIMESTAMPTZ,
    rejected_by_id         UUID REFERENCES members(id),
    cancelled_at           TIMESTAMPTZ,
    cancelled_by_id        UUID REFERENCES members(id),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Per-year sequence uniqueness (defense-in-depth — the generator already
    -- holds an advisory lock to prevent collisions).
    UNIQUE (sequence_year, sequence_in_year)
);

COMMENT ON TABLE public.loan_requests IS
    'Refundable loan requests (طلبات السلف المستردة). Multi-stage workflow: member → fund admin → Brouj partner → disbursement.';
COMMENT ON COLUMN public.loan_requests.sequence_number IS
    'Human-readable serial. Format: YYYY-NNNN. Resets every gregorian year.';
COMMENT ON COLUMN public.loan_requests.admin_fee_rate IS
    'Snapshot of fee rate at creation time so history is preserved even if the setting changes.';

CREATE INDEX IF NOT EXISTS idx_loan_requests_member        ON public.loan_requests(member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loan_requests_status        ON public.loan_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loan_requests_year_seq      ON public.loan_requests(sequence_year, sequence_in_year);
CREATE INDEX IF NOT EXISTS idx_loan_requests_brouj_pending ON public.loan_requests(status)
    WHERE status IN ('forwarded_to_brouj', 'brouj_processing', 'najiz_uploaded', 'fee_collected');

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. loan_request_documents
-- ─────────────────────────────────────────────────────────────────────────────
-- Reuses the same shape as documents_metadata so admin tooling can render
-- them with the existing previewer. Kept as a separate table because the FK
-- is to loan_requests rather than members directly.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.loan_request_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_request_id UUID NOT NULL REFERENCES loan_requests(id) ON DELETE CASCADE,

    -- One of:
    --   id_copy              صورة الهوية
    --   salary_certificate   مشهد راتب مختم وحديث
    --   financial_statement  كشف حساب 3 أشهر أو مشهد سمة (one or the other)
    --   najiz_acknowledgment إقرار الدين الصادر من ناجز (uploaded by Brouj)
    --   fee_receipt          إيصال تحصيل الرسوم 10% (uploaded by Brouj)
    document_type VARCHAR(40) NOT NULL CHECK (document_type IN (
        'id_copy',
        'salary_certificate',
        'financial_statement',
        'najiz_acknowledgment',
        'fee_receipt'
    )),

    file_path     TEXT NOT NULL,    -- relative path under uploads dir
    file_size     INTEGER,
    file_type     VARCHAR(50),
    original_name VARCHAR(255),

    uploaded_by   UUID REFERENCES members(id),
    uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Soft delete (not exposed for legal compliance)
    deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_loan_docs_request ON public.loan_request_documents(loan_request_id, document_type);
CREATE INDEX IF NOT EXISTS idx_loan_docs_active  ON public.loan_request_documents(loan_request_id) WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. loan_request_status_history
-- ─────────────────────────────────────────────────────────────────────────────
-- Append-only audit trail. Every state transition is recorded so admins can
-- always see who did what when, even after the workflow finishes.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.loan_request_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_request_id UUID NOT NULL REFERENCES loan_requests(id) ON DELETE CASCADE,
    from_status VARCHAR(40),
    to_status   VARCHAR(40) NOT NULL,
    changed_by_id UUID REFERENCES members(id),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    note TEXT
);

CREATE INDEX IF NOT EXISTS idx_loan_history_request ON public.loan_request_status_history(loan_request_id, changed_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. loan_settings (single-row tunables)
-- ─────────────────────────────────────────────────────────────────────────────
-- Editable by fund_chairman / super_admin from the admin panel without
-- redeploying. New rows are NEVER inserted — there's exactly one settings row.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.loan_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),

    -- Admin fee charged by Brouj as percentage of loan_amount.
    admin_fee_rate          NUMERIC(5,4) NOT NULL DEFAULT 0.10,

    -- Loan amount bounds in SAR.
    min_loan_amount         NUMERIC(10,2) NOT NULL DEFAULT 1000,
    max_loan_amount         NUMERIC(10,2) NOT NULL DEFAULT 10000,

    -- Debt-burden ratio cap. Obligations / salary must be ≤ this.
    max_dbr                 NUMERIC(5,4) NOT NULL DEFAULT 0.50,

    -- Allowed employment types (CSV) — frontend reads this to populate the
    -- dropdown. For now only 'government' is accepted, but settable later.
    allowed_employment_types TEXT NOT NULL DEFAULT 'government',

    -- Whether the feature is open to members at all (kill-switch).
    enabled                 BOOLEAN NOT NULL DEFAULT true,

    updated_by_id           UUID REFERENCES members(id),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.loan_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. updated_at trigger (reuse existing function if present, else create)
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

DROP TRIGGER IF EXISTS update_loan_requests_updated_at ON public.loan_requests;
CREATE TRIGGER update_loan_requests_updated_at
    BEFORE UPDATE ON public.loan_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_loan_settings_updated_at ON public.loan_settings;
CREATE TRIGGER update_loan_settings_updated_at
    BEFORE UPDATE ON public.loan_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;
