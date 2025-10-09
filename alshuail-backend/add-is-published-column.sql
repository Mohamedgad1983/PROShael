-- Add is_published column to news_announcements table
-- This column is required for the News Management functionality

ALTER TABLE news_announcements
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

-- Update existing rows to have is_published = true if they have a publish_date
UPDATE news_announcements
SET is_published = true
WHERE publish_date IS NOT NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_news_announcements_is_published
ON news_announcements(is_published);

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'news_announcements' AND column_name = 'is_published';