-- Additive migration for iOS Moyasar payment gateway tracking.
-- Keeps the existing payments workflow intact while allowing online payments
-- to be verified and reconciled against Moyasar by gateway payment id.

BEGIN;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS gateway_provider TEXT,
  ADD COLUMN IF NOT EXISTS gateway_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS gateway_status TEXT,
  ADD COLUMN IF NOT EXISTS gateway_amount_minor INTEGER,
  ADD COLUMN IF NOT EXISTS gateway_currency TEXT,
  ADD COLUMN IF NOT EXISTS gateway_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS gateway_response JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_payments_gateway_provider_payment_id
  ON payments(gateway_provider, gateway_payment_id)
  WHERE gateway_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_gateway_status
  ON payments(gateway_status)
  WHERE gateway_status IS NOT NULL;

COMMENT ON COLUMN payments.gateway_provider IS 'Payment gateway provider name, e.g. moyasar.';
COMMENT ON COLUMN payments.gateway_payment_id IS 'Provider payment id. For Moyasar this is the given_id/payment id.';
COMMENT ON COLUMN payments.gateway_status IS 'Raw provider payment status.';
COMMENT ON COLUMN payments.gateway_amount_minor IS 'Gateway amount in minor currency unit, e.g. SAR halalas.';
COMMENT ON COLUMN payments.gateway_currency IS 'Gateway ISO-4217 currency.';
COMMENT ON COLUMN payments.gateway_verified_at IS 'Last backend verification timestamp.';
COMMENT ON COLUMN payments.gateway_response IS 'Last sanitized gateway response payload.';

COMMIT;
