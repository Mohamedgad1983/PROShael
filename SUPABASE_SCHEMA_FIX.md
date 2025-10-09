# Supabase Schema Fix for News Management

## Issue
The `news_announcements` table is missing the `is_published` column, causing errors when creating news articles.

## Solution
Run this SQL in your Supabase SQL Editor:

```sql
-- Add is_published column to news_announcements table
ALTER TABLE news_announcements
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_news_announcements_is_published
ON news_announcements(is_published);

-- Update existing records (if any) to set is_published based on published_at
UPDATE news_announcements
SET is_published = (published_at IS NOT NULL)
WHERE is_published IS NULL;

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'news_announcements' AND column_name = 'is_published';
```

## Steps to Apply
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the above SQL
4. Click "Run" to execute
5. Verify the column was added by checking the last SELECT statement results

## Alternative: Complete News Table Schema
If the table is missing other columns, here's the complete schema:

```sql
CREATE TABLE IF NOT EXISTS news_announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category VARCHAR(50) DEFAULT 'general',
    priority VARCHAR(20) DEFAULT 'normal',
    title_ar TEXT NOT NULL,
    title_en TEXT,
    content_ar TEXT NOT NULL,
    content_en TEXT,
    author_id UUID REFERENCES users(id),
    media_urls JSONB DEFAULT '[]'::jsonb,
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    scheduled_for TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_news_category ON news_announcements(category);
CREATE INDEX IF NOT EXISTS idx_news_priority ON news_announcements(priority);
CREATE INDEX IF NOT EXISTS idx_news_is_published ON news_announcements(is_published);
CREATE INDEX IF NOT EXISTS idx_news_published_at ON news_announcements(published_at);
CREATE INDEX IF NOT EXISTS idx_news_author_id ON news_announcements(author_id);
```

After adding the column, restart the backend server if needed.
