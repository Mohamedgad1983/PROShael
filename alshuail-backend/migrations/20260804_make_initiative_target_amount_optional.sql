-- Initiatives may be informational or community programs with no fixed
-- financial target. The application stores NULL for those initiatives.
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'initiatives' AND column_name = 'target_amount'
  ) THEN
    ALTER TABLE public.initiatives ALTER COLUMN target_amount DROP NOT NULL;
    COMMENT ON COLUMN public.initiatives.target_amount IS
      'Optional financial target. NULL means the initiative has no fixed monetary goal.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'activities' AND column_name = 'target_amount'
  ) THEN
    ALTER TABLE public.activities ALTER COLUMN target_amount DROP NOT NULL;
  END IF;
END
$$;

COMMIT;
