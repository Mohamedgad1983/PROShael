-- Set the approved operating fees for future goods-financing requests.
-- Historical request snapshots remain immutable and are not repriced here.

BEGIN;

ALTER TABLE public.loan_settings
  ALTER COLUMN financing_tiers SET DEFAULT
    '[{"principal":3000,"fee":500},{"principal":6000,"fee":800},{"principal":10000,"fee":1400}]'::jsonb;

UPDATE public.loan_settings
SET financing_tiers =
      '[{"principal":3000,"fee":500},{"principal":6000,"fee":800},{"principal":10000,"fee":1400}]'::jsonb,
    updated_at = NOW()
WHERE financing_tiers IS DISTINCT FROM
      '[{"principal":3000,"fee":500},{"principal":6000,"fee":800},{"principal":10000,"fee":1400}]'::jsonb;

COMMIT;
