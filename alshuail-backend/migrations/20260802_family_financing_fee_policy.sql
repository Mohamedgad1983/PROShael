-- ============================================================================
-- Family-financing fixed fee policy + production schema repair
-- Date: 2026-08-02
--
-- Production had application code that referenced requested_item_amount while
-- the May migration had not been applied. This migration is self-contained and
-- idempotent: it repairs those missing columns and installs the fixed packages.
-- ============================================================================

BEGIN;

ALTER TABLE public.loan_settings
  ADD COLUMN IF NOT EXISTS item_price_multiplier NUMERIC(5,4) NOT NULL DEFAULT 1.15,
  ADD COLUMN IF NOT EXISTS financing_tiers JSONB NOT NULL DEFAULT
    '[{"principal":3000,"fee":500},{"principal":6000,"fee":800},{"principal":10000,"fee":1400}]'::jsonb;

UPDATE public.loan_settings
SET min_loan_amount = 3000,
    max_loan_amount = 10000,
    admin_fee_rate = 0,
    financing_tiers =
      '[{"principal":3000,"fee":500},{"principal":6000,"fee":800},{"principal":10000,"fee":1400}]'::jsonb,
    updated_at = NOW()
WHERE id = 1;

ALTER TABLE public.loan_settings
  ALTER COLUMN admin_fee_rate SET DEFAULT 0,
  ALTER COLUMN financing_tiers SET DEFAULT
    '[{"principal":3000,"fee":500},{"principal":6000,"fee":800},{"principal":10000,"fee":1400}]'::jsonb;

ALTER TABLE public.loan_requests
  ADD COLUMN IF NOT EXISTS requested_item_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS item_price_multiplier NUMERIC(5,4) NOT NULL DEFAULT 1.15,
  ADD COLUMN IF NOT EXISTS financing_fee_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS total_repayment_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS financing_terms_snapshot JSONB;

COMMENT ON COLUMN public.loan_requests.requested_item_amount IS
  'Base family-financing package selected by the member.';
COMMENT ON COLUMN public.loan_requests.financing_fee_amount IS
  'Fixed programme fee snapshotted when the request is submitted.';
COMMENT ON COLUMN public.loan_requests.total_repayment_amount IS
  'Principal plus fixed programme fee snapshotted at submission.';

ALTER TABLE public.loan_requests
  DROP CONSTRAINT IF EXISTS loan_requests_requested_item_amount_range,
  DROP CONSTRAINT IF EXISTS loan_requests_requested_item_amount_tier,
  DROP CONSTRAINT IF EXISTS loan_requests_financing_fee_nonnegative,
  DROP CONSTRAINT IF EXISTS loan_requests_total_repayment_consistent;

ALTER TABLE public.loan_requests
  ADD CONSTRAINT loan_requests_requested_item_amount_tier
    CHECK (requested_item_amount IS NULL OR requested_item_amount IN (3000, 6000, 10000)),
  ADD CONSTRAINT loan_requests_financing_fee_nonnegative
    CHECK (financing_fee_amount IS NULL OR financing_fee_amount >= 0),
  ADD CONSTRAINT loan_requests_total_repayment_consistent
    CHECK (
      total_repayment_amount IS NULL
      OR requested_item_amount IS NULL
      OR financing_fee_amount IS NULL
      OR total_repayment_amount = requested_item_amount + financing_fee_amount
    );

ALTER TABLE public.loan_settings
  DROP CONSTRAINT IF EXISTS loan_settings_item_price_multiplier_range;

ALTER TABLE public.loan_settings
  ADD CONSTRAINT loan_settings_item_price_multiplier_range
    CHECK (item_price_multiplier >= 1 AND item_price_multiplier <= 2);

COMMIT;
