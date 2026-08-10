-- Audited operator dispositions for terminal gateway reconciliation reviews.
--
-- The review action log is append-only. Requeue/resolve changes only the
-- gateway_payment_reconciliation_state cursor under an application row lock;
-- it never changes payments, balances, financing plans or installments.
BEGIN;

CREATE TABLE IF NOT EXISTS public.gateway_reconciliation_review_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  action VARCHAR(20) NOT NULL,
  reason VARCHAR(500) NOT NULL,
  actor_id UUID NOT NULL,
  actor_source VARCHAR(20) NOT NULL,
  actor_role VARCHAR(30) NOT NULL,
  previous_last_result VARCHAR(30) NOT NULL,
  previous_review_reason VARCHAR(80) NOT NULL,
  previous_check_count INTEGER NOT NULL,
  previous_consecutive_not_found INTEGER NOT NULL,
  previous_consecutive_failures INTEGER NOT NULL,
  previous_provider_http_status SMALLINT,
  previous_provider_status VARCHAR(30),
  previous_evidence_hash VARCHAR(64),
  request_ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT gateway_reconciliation_review_action_check
    CHECK (action IN ('requeue', 'resolve')),
  CONSTRAINT gateway_reconciliation_review_actor_role_check
    CHECK (actor_role = 'super_admin'),
  CONSTRAINT gateway_reconciliation_review_actor_source_check
    CHECK (actor_source IN ('users', 'members')),
  CONSTRAINT gateway_reconciliation_review_reason_check
    CHECK (
      char_length(BTRIM(reason)) BETWEEN 12 AND 500
      AND char_length(regexp_replace(reason, '[^ء-ي]', '', 'g')) >= 8
    ),
  CONSTRAINT gateway_reconciliation_review_previous_state_check
    CHECK (previous_last_result = 'review_required'),
  CONSTRAINT gateway_reconciliation_review_previous_reason_check
    CHECK (previous_review_reason IN (
      'provider_not_found_bounded',
      'gateway_evidence_mismatch',
      'gateway_financial_exception',
      'legacy_manual_review'
    )),
  CONSTRAINT gateway_reconciliation_review_counts_check
    CHECK (
      previous_check_count >= 0
      AND previous_consecutive_not_found >= 0
      AND previous_consecutive_failures >= 0
    ),
  CONSTRAINT gateway_reconciliation_review_http_status_check
    CHECK (
      previous_provider_http_status IS NULL
      OR previous_provider_http_status BETWEEN 100 AND 599
    ),
  CONSTRAINT gateway_reconciliation_review_hash_check
    CHECK (
      previous_evidence_hash IS NULL
      OR previous_evidence_hash ~ '^[0-9a-f]{64}$'
    )
);

-- The admin authentication system intentionally supports privileged identities
-- stored in either users or members. Upgrade an earlier local rehearsal of this
-- migration safely instead of retaining a users-only foreign key.
ALTER TABLE public.gateway_reconciliation_review_actions
  DROP CONSTRAINT IF EXISTS gateway_reconciliation_review_actions_actor_id_fkey;
ALTER TABLE public.gateway_reconciliation_review_actions
  ADD COLUMN IF NOT EXISTS actor_source VARCHAR(20);

UPDATE public.gateway_reconciliation_review_actions action_row
   SET actor_source = CASE
     WHEN EXISTS (SELECT 1 FROM public.users u WHERE u.id = action_row.actor_id) THEN 'users'
     WHEN EXISTS (SELECT 1 FROM public.members m WHERE m.id = action_row.actor_id) THEN 'members'
     ELSE NULL
   END
 WHERE actor_source IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM public.gateway_reconciliation_review_actions
     WHERE actor_source IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot determine reconciliation review actor provenance';
  END IF;

  ALTER TABLE public.gateway_reconciliation_review_actions
    ALTER COLUMN actor_source SET NOT NULL;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.gateway_reconciliation_review_actions'::regclass
       AND conname = 'gateway_reconciliation_review_actor_source_check'
  ) THEN
    ALTER TABLE public.gateway_reconciliation_review_actions
      ADD CONSTRAINT gateway_reconciliation_review_actor_source_check
      CHECK (actor_source IN ('users', 'members'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_gateway_reconciliation_review_actions_payment
  ON public.gateway_reconciliation_review_actions(payment_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gateway_reconciliation_review_actions_actor
  ON public.gateway_reconciliation_review_actions(actor_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.prevent_gateway_reconciliation_review_action_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Gateway reconciliation review audit actions are append-only'
    USING ERRCODE = '23514';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.enforce_gateway_reconciliation_review_actor()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.actor_role <> 'super_admin' THEN
    RAISE EXCEPTION 'Gateway reconciliation review actor must be a super administrator'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.actor_source = 'users' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.users
       WHERE id = NEW.actor_id
         AND role = 'super_admin'
         AND is_active IS TRUE
    ) THEN
      RAISE EXCEPTION 'Gateway reconciliation review users actor is not active and privileged'
        USING ERRCODE = '23514';
    END IF;
  ELSIF NEW.actor_source = 'members' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.members
       WHERE id = NEW.actor_id
         AND role = 'super_admin'
         AND is_active IS TRUE
         AND membership_status = 'active'
         AND (
           suspended_at IS NULL
           OR (
             reactivated_at IS NOT NULL
             AND reactivated_at >= suspended_at
           )
         )
    ) THEN
      RAISE EXCEPTION 'Gateway reconciliation review members actor is not active and privileged'
        USING ERRCODE = '23514';
    END IF;
  ELSE
    RAISE EXCEPTION 'Gateway reconciliation review actor source is invalid'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_gateway_reconciliation_review_actor
  ON public.gateway_reconciliation_review_actions;
CREATE TRIGGER trg_enforce_gateway_reconciliation_review_actor
  BEFORE INSERT ON public.gateway_reconciliation_review_actions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_gateway_reconciliation_review_actor();

DROP TRIGGER IF EXISTS trg_prevent_gateway_reconciliation_review_action_mutation
  ON public.gateway_reconciliation_review_actions;
CREATE TRIGGER trg_prevent_gateway_reconciliation_review_action_mutation
  BEFORE UPDATE OR DELETE ON public.gateway_reconciliation_review_actions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_gateway_reconciliation_review_action_mutation();

-- A reviewed resolve is a deliberate terminal disposition, not merely a null
-- next_check_at value. Protect it against direct SQL cursor resurrection or
-- deletion; otherwise the scheduler could recreate the state from payments.
CREATE OR REPLACE FUNCTION public.enforce_gateway_reconciliation_resolved_disposition()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM public.gateway_reconciliation_review_actions action_row
     WHERE action_row.payment_id = OLD.payment_id
       AND action_row.action = 'resolve'
  ) THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Resolved gateway reconciliation state cannot be deleted'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.last_result IS DISTINCT FROM 'terminal'
       OR NEW.next_check_at IS NOT NULL
       OR NEW.claim_token IS NOT NULL
       OR NEW.lease_expires_at IS NOT NULL
       OR NEW.review_reason IS NOT NULL THEN
      RAISE EXCEPTION 'Resolved gateway reconciliation state cannot resume automation'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_gateway_reconciliation_resolved_disposition
  ON public.gateway_payment_reconciliation_state;
CREATE TRIGGER trg_enforce_gateway_reconciliation_resolved_disposition
  BEFORE UPDATE OR DELETE ON public.gateway_payment_reconciliation_state
  FOR EACH ROW EXECUTE FUNCTION public.enforce_gateway_reconciliation_resolved_disposition();

COMMENT ON TABLE public.gateway_reconciliation_review_actions IS
  'Immutable audit of super-admin requeue/resolve decisions for terminal gateway reconciliation reviews.';

COMMENT ON COLUMN public.gateway_reconciliation_review_actions.reason IS
  'Meaningful Arabic rationale supplied by the reviewing super administrator.';

COMMENT ON COLUMN public.gateway_reconciliation_review_actions.actor_source IS
  'Authenticated privileged identity source: users or members.';

COMMIT;
