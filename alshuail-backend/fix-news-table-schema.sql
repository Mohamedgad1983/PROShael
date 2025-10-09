-- Complete schema fix for news_announcements table
-- Run this in Supabase SQL Editor

-- First, let's see what columns currently exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'news_announcements'
ORDER BY ordinal_position;

-- Add all missing columns that the code expects

-- Add media_urls column for storing image/video attachments as JSON
ALTER TABLE news_announcements
ADD COLUMN IF NOT EXISTS media_urls JSONB DEFAULT '[]'::jsonb;

-- Add author_id to track who created the news
ALTER TABLE news_announcements
ADD COLUMN IF NOT EXISTS author_id UUID;

-- Add scheduled_for for scheduled publishing
ALTER TABLE news_announcements
ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMP WITH TIME ZONE;

-- Add English language support columns if they don't exist
ALTER TABLE news_announcements
ADD COLUMN IF NOT EXISTS title_en TEXT;

ALTER TABLE news_announcements
ADD COLUMN IF NOT EXISTS content_en TEXT;

-- Add timestamps if they don't exist
ALTER TABLE news_announcements
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE news_announcements
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_news_media_urls ON news_announcements USING GIN (media_urls);
CREATE INDEX IF NOT EXISTS idx_news_author_id ON news_announcements(author_id);
CREATE INDEX IF NOT EXISTS idx_news_scheduled_for ON news_announcements(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_news_created_at ON news_announcements(created_at);

-- Add foreign key constraint for author_id (optional - only if users table exists)
-- Uncomment the next line if you want to enforce the relationship
-- ALTER TABLE news_announcements ADD CONSTRAINT fk_news_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL;

-- Verify all columns are now present
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'news_announcements'
ORDER BY ordinal_position;
