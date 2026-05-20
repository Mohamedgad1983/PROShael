-- ============================================================================
-- Migration: Loan item-price financing policy
-- Created: 2026-05-20
--
-- Policy change:
-- - Members enter the base amount they need for the item (1,000–10,000 SAR).
-- - Backend stores the calculated total item value as loan_amount.
-- - The multiplier is snapshotted per request; it is not presented to members
--   as an admin/service fee.
--
-- Existing legacy fee columns remain for backwards compatibility, but new
-- requests use admin_fee_rate = 0 because the total value is already calculated.
-- ============================================================================

BEGIN;

ALTER TABLE public.loan_settings
  ADD COLUMN IF NOT EXISTS item_price_multiplier NUMERIC(5,4) NOT NULL DEFAULT 1.15;

UPDATE public.loan_settings
SET item_price_multiplier = 1.15,
    admin_fee_rate = 0,
    updated_at = NOW()
WHERE id = 1;

ALTER TABLE public.loan_settings
  ALTER COLUMN admin_fee_rate SET DEFAULT 0;

ALTER TABLE public.loan_requests
  ADD COLUMN IF NOT EXISTS requested_item_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS item_price_multiplier NUMERIC(5,4) NOT NULL DEFAULT 1.15;

COMMENT ON COLUMN public.loan_requests.requested_item_amount IS
  'Base item amount entered by the member before backend total-value calculation.';

COMMENT ON COLUMN public.loan_requests.item_price_multiplier IS
  'Snapshot of the backend multiplier used to calculate loan_amount as total item value.';

-- Keep constraints idempotent by dropping/recreating them.
ALTER TABLE public.loan_requests
  DROP CONSTRAINT IF EXISTS loan_requests_requested_item_amount_range;

ALTER TABLE public.loan_requests
  ADD CONSTRAINT loan_requests_requested_item_amount_range
  CHECK (
    requested_item_amount IS NULL
    OR requested_item_amount BETWEEN 1000 AND 10000
  );

ALTER TABLE public.loan_settings
  DROP CONSTRAINT IF EXISTS loan_settings_item_price_multiplier_range;

ALTER TABLE public.loan_settings
  ADD CONSTRAINT loan_settings_item_price_multiplier_range
  CHECK (item_price_multiplier >= 1 AND item_price_multiplier <= 2);

COMMIT;
