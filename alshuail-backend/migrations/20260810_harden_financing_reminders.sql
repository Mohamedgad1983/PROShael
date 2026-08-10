-- Durable, idempotent financing installment reminders.
--
-- This migration is intentionally additive. 20260731 is already deployed and
-- must remain immutable. The in-app notification is the authoritative delivery;
-- push is a separately leased, retryable wake-up using a stable collapse key.

BEGIN;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_idempotency_key
  ON public.notifications(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.notifications'::regclass
       AND conname = 'notifications_idempotency_key_nonempty'
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_idempotency_key_nonempty
      CHECK (idempotency_key IS NULL OR BTRIM(idempotency_key) <> '');
  END IF;
END $$;

ALTER TABLE public.financing_reminder_log
  ADD COLUMN IF NOT EXISTS scheduled_for DATE,
  ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS claim_token UUID,
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notification_id UUID,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS collapse_key VARCHAR(64),
  ADD COLUMN IF NOT EXISTS external_status VARCHAR(30) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS external_attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS external_delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS external_last_error TEXT;

ALTER TABLE public.financing_reminder_log
  ALTER COLUMN delivery_status SET DEFAULT 'pending',
  ALTER COLUMN sent_at DROP NOT NULL,
  ALTER COLUMN sent_at DROP DEFAULT;

UPDATE public.financing_reminder_log
   SET delivery_status = 'pending'
 WHERE delivery_status = 'queued';

UPDATE public.financing_reminder_log l
   SET scheduled_for = CASE l.reminder_type
         WHEN 'due_7_days' THEN i.due_date - 7
         WHEN 'due_3_days' THEN i.due_date - 3
         WHEN 'due_tomorrow' THEN i.due_date - 1
         WHEN 'due_today' THEN i.due_date
         WHEN 'overdue_1_day' THEN i.due_date + 1
         WHEN 'overdue_7_days' THEN i.due_date + 7
         ELSE NULL
       END
  FROM public.financing_installments i
 WHERE i.id = l.installment_id
   AND l.scheduled_for IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM public.financing_reminder_log
     WHERE scheduled_for IS NULL
        OR reminder_type NOT IN (
          'due_7_days', 'due_3_days', 'due_tomorrow',
          'due_today', 'overdue_1_day', 'overdue_7_days'
        )
  ) THEN
    RAISE EXCEPTION
      'Unknown financing reminder rows must be reviewed before reminder hardening';
  END IF;
END $$;

UPDATE public.financing_reminder_log
   SET delivered_at = COALESCE(delivered_at, sent_at),
       external_status = CASE
         WHEN channel = 'push' THEN 'sent'
         ELSE 'skipped'
       END,
       external_delivered_at = CASE
         WHEN channel = 'push' THEN COALESCE(external_delivered_at, sent_at)
         ELSE external_delivered_at
       END
 WHERE delivery_status = 'sent';

UPDATE public.financing_reminder_log
   SET sent_at = NULL
 WHERE delivery_status <> 'sent';

ALTER TABLE public.financing_reminder_log
  ALTER COLUMN scheduled_for SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.financing_reminder_log'::regclass
       AND conname = 'financing_reminder_type_check'
  ) THEN
    ALTER TABLE public.financing_reminder_log
      ADD CONSTRAINT financing_reminder_type_check
      CHECK (reminder_type IN (
        'due_7_days', 'due_3_days', 'due_tomorrow',
        'due_today', 'overdue_1_day', 'overdue_7_days'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.financing_reminder_log'::regclass
       AND conname = 'financing_reminder_delivery_status_check'
  ) THEN
    ALTER TABLE public.financing_reminder_log
      ADD CONSTRAINT financing_reminder_delivery_status_check
      CHECK (delivery_status IN (
        'pending', 'processing', 'sent', 'failed', 'cancelled', 'superseded'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.financing_reminder_log'::regclass
       AND conname = 'financing_reminder_external_status_check'
  ) THEN
    ALTER TABLE public.financing_reminder_log
      ADD CONSTRAINT financing_reminder_external_status_check
      CHECK (external_status IN ('pending', 'sending', 'sent', 'failed', 'skipped'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.financing_reminder_log'::regclass
       AND conname = 'financing_reminder_external_attempt_count_nonnegative'
  ) THEN
    ALTER TABLE public.financing_reminder_log
      ADD CONSTRAINT financing_reminder_external_attempt_count_nonnegative
      CHECK (external_attempt_count >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_financing_reminders_due_jobs
  ON public.financing_reminder_log(next_attempt_at, scheduled_for, id)
  WHERE delivery_status IN ('pending', 'failed', 'processing');

CREATE INDEX IF NOT EXISTS idx_financing_reminders_delivery_leases
  ON public.financing_reminder_log(lease_expires_at, id)
  WHERE delivery_status = 'processing';

CREATE INDEX IF NOT EXISTS idx_financing_reminders_external_jobs
  ON public.financing_reminder_log(next_attempt_at, lease_expires_at, id)
  WHERE delivery_status = 'sent'
    AND external_status IN ('pending', 'failed', 'sending');

-- Backfill durable jobs for any plan created before this migration. This does
-- not create or change a repayment plan, amount, payment, or member balance.
INSERT INTO public.financing_reminder_log (
  installment_id,
  reminder_type,
  scheduled_for,
  delivery_status,
  attempt_count,
  next_attempt_at,
  sent_at,
  updated_at
)
SELECT
  i.id,
  milestone.reminder_type,
  i.due_date + milestone.offset_days,
  'pending',
  0,
  NOW(),
  NULL,
  NOW()
FROM public.financing_installments i
JOIN public.financing_repayment_plans p ON p.id = i.plan_id
CROSS JOIN (
  VALUES
    ('due_7_days'::varchar, -7),
    ('due_3_days'::varchar, -3),
    ('due_tomorrow'::varchar, -1),
    ('due_today'::varchar, 0),
    ('overdue_1_day'::varchar, 1),
    ('overdue_7_days'::varchar, 7)
) AS milestone(reminder_type, offset_days)
WHERE p.status IN ('active', 'overdue')
  AND i.paid_amount < i.amount
ON CONFLICT (installment_id, reminder_type) DO NOTHING;

COMMIT;
