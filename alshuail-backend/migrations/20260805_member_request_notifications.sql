BEGIN;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS member_id UUID,
  ADD COLUMN IF NOT EXISTS target_audience VARCHAR(50),
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'notifications_member_id_fkey'
       AND conrelid = 'public.notifications'::regclass
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_member_id_fkey
      FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;
  END IF;
END
$$;

UPDATE public.notifications n
   SET member_id = m.id
  FROM public.members m
 WHERE n.member_id IS NULL
   AND n.user_id = m.id;

UPDATE public.notifications n
   SET member_id = u.member_id
  FROM public.users u
 WHERE n.member_id IS NULL
   AND n.user_id = u.id
   AND u.member_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_member_created
  ON public.notifications(member_id, created_at DESC)
  WHERE member_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_member_unread
  ON public.notifications(member_id, is_read, created_at DESC)
  WHERE member_id IS NOT NULL AND deleted_at IS NULL;

COMMIT;
