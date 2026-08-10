-- Close legacy/manual aliases around the canonical Moyasar v2 payment path.
--
-- Historical electronic rows are deliberately preserved in place. New rows
-- using any electronic alias must start as a canonical, unsubmitted protocol
-- v2 Moyasar session. Historical bare aliases may receive harmless descriptive
-- edits only; their financial identity/state cannot be rewritten or deleted.
-- Cash, bank transfer, and check rows are outside this trigger's scope.
BEGIN;

CREATE OR REPLACE FUNCTION public.is_electronic_payment_alias(method TEXT)
RETURNS BOOLEAN AS $$
  SELECT LOWER(BTRIM(COALESCE(method, ''))) IN (
    'app_payment', 'apple_pay', 'card', 'credit_card', 'knet', 'moyasar', 'online'
  );
$$ LANGUAGE SQL IMMUTABLE PARALLEL SAFE;

CREATE OR REPLACE FUNCTION public.enforce_electronic_payment_alias_boundary()
RETURNS TRIGGER AS $$
DECLARE
  old_method TEXT;
  new_method TEXT;
  old_electronic BOOLEAN := FALSE;
  new_electronic BOOLEAN := FALSE;
  old_canonical_identity BOOLEAN := FALSE;
  new_canonical_identity BOOLEAN := FALSE;
  new_canonical_prepared BOOLEAN := FALSE;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    old_method := LOWER(BTRIM(COALESCE(OLD.payment_method, '')));
    old_electronic := public.is_electronic_payment_alias(old_method);
    old_canonical_identity :=
      old_electronic
      AND LOWER(BTRIM(COALESCE(OLD.gateway_provider, ''))) = 'moyasar'
      AND NULLIF(BTRIM(COALESCE(OLD.gateway_payment_id::text, '')), '') IS NOT NULL
      AND OLD.gateway_protocol_version = 2
      AND OLD.gateway_amount_minor = ROUND(OLD.amount::numeric * 100)::bigint
      AND UPPER(BTRIM(COALESCE(OLD.gateway_currency, ''))) = 'SAR'
      AND (OLD.category = 'subscription' OR OLD.financing_plan_id IS NOT NULL);
  END IF;

  IF TG_OP <> 'DELETE' THEN
    new_method := LOWER(BTRIM(COALESCE(NEW.payment_method, '')));
    new_electronic := public.is_electronic_payment_alias(new_method);
    new_canonical_identity :=
      new_electronic
      AND LOWER(BTRIM(COALESCE(NEW.gateway_provider, ''))) = 'moyasar'
      AND NULLIF(BTRIM(COALESCE(NEW.gateway_payment_id::text, '')), '') IS NOT NULL
      AND NEW.gateway_protocol_version = 2
      AND NEW.gateway_amount_minor = ROUND(NEW.amount::numeric * 100)::bigint
      AND UPPER(BTRIM(COALESCE(NEW.gateway_currency, ''))) = 'SAR'
      AND (NEW.category = 'subscription' OR NEW.financing_plan_id IS NOT NULL);
    new_canonical_prepared :=
      new_canonical_identity
      AND NEW.status = 'pending'
      AND NEW.gateway_status = 'prepared_v2'
      AND NEW.gateway_submission_started_at IS NULL
      AND NEW.gateway_abandoned_at IS NULL
      AND NEW.gateway_verified_at IS NULL;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF new_electronic AND NOT new_canonical_prepared THEN
      RAISE EXCEPTION 'Electronic payment aliases require a canonical prepared Moyasar protocol-v2 session'
        USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF old_electronic
       OR LOWER(BTRIM(COALESCE(OLD.status, ''))) IN (
         'paid', 'refunded', 'pending_refund'
       ) THEN
      RAISE EXCEPTION 'Electronic, settled, or refund-required payment evidence cannot be hard-deleted'
        USING ERRCODE = '23514';
    END IF;
    RETURN OLD;
  END IF;

  IF NOT old_electronic AND NOT new_electronic THEN
    RETURN NEW;
  END IF;

  IF NOT old_electronic AND new_electronic THEN
    RAISE EXCEPTION 'A manual payment cannot be relabelled as an electronic payment'
      USING ERRCODE = '23514';
  END IF;

  -- Bare historical aliases stay visible for audit. Only descriptive metadata
  -- may be corrected; money, ownership, state and provider evidence are frozen.
  IF old_electronic AND NOT old_canonical_identity THEN
    IF (to_jsonb(NEW) - ARRAY[
          'title', 'description', 'notes', 'updated_at'
        ]::text[]) IS DISTINCT FROM
       (to_jsonb(OLD) - ARRAY[
          'title', 'description', 'notes', 'updated_at'
        ]::text[]) THEN
      RAISE EXCEPTION 'Historical bare electronic payment financial state is immutable'
        USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  -- Canonical v2 rows may move only inside the existing gateway state machine.
  -- This trigger freezes their exact charge identity while migrations 20260810,
  -- 20260813 and 20260815 validate fresh provider evidence and state transitions.
  IF NOT new_electronic OR NOT new_canonical_identity THEN
    RAISE EXCEPTION 'Canonical gateway payment identity cannot leave the electronic workflow'
      USING ERRCODE = '23514';
  END IF;

  IF new_method IS DISTINCT FROM old_method
     AND NOT (new_method = 'moyasar' AND old_method <> 'moyasar') THEN
    RAISE EXCEPTION 'Canonical gateway payment method may only normalize to moyasar'
      USING ERRCODE = '23514';
  END IF;

  IF (to_jsonb(NEW) - ARRAY[
        'status', 'payment_method', 'gateway_status', 'gateway_response',
        'gateway_verified_at', 'gateway_failure_reason',
        'gateway_submission_started_at', 'gateway_abandoned_at',
        'processed_at', 'approved_at', 'title', 'description', 'notes', 'updated_at'
      ]::text[]) IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY[
        'status', 'payment_method', 'gateway_status', 'gateway_response',
        'gateway_verified_at', 'gateway_failure_reason',
        'gateway_submission_started_at', 'gateway_abandoned_at',
        'processed_at', 'approved_at', 'title', 'description', 'notes', 'updated_at'
      ]::text[]) THEN
    RAISE EXCEPTION 'Canonical gateway charge identity is immutable'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE PLPGSQL;

DROP TRIGGER IF EXISTS trg_enforce_electronic_payment_alias_boundary
  ON public.payments;
CREATE TRIGGER trg_enforce_electronic_payment_alias_boundary
  BEFORE INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_electronic_payment_alias_boundary();

COMMENT ON FUNCTION public.enforce_electronic_payment_alias_boundary() IS
  'Rejects new bare electronic aliases and freezes historical electronic financial evidence while preserving canonical Moyasar protocol v2.';

COMMIT;
