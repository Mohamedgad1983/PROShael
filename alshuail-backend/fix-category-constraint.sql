-- Fix category check constraint to accept English values
-- The frontend sends: general, announcement, urgent, event
-- We need to update the constraint to accept these values

-- First, drop the existing constraint
ALTER TABLE news_announcements
DROP CONSTRAINT IF EXISTS news_announcements_category_check;

-- Add new constraint that accepts both English and Arabic values
ALTER TABLE news_announcements
ADD CONSTRAINT news_announcements_category_check
CHECK (category IN ('general', 'announcement', 'urgent', 'event', 'عام', 'إعلان', 'عاجل', 'حدث'));

-- Verify the constraint
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'news_announcements'::regclass
AND conname = 'news_announcements_category_check';
