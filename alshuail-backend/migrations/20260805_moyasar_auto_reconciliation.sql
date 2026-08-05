BEGIN;

-- Required by the Moyasar verification/webhook path and the payment-date filter.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- Keeps cleanup of abandoned local checkout sessions cheap as volume grows.
CREATE INDEX IF NOT EXISTS idx_payments_moyasar_created_sessions
  ON public.payments(created_at)
  WHERE gateway_provider = 'moyasar'
    AND status = 'pending'
    AND gateway_status = 'created';

COMMIT;
