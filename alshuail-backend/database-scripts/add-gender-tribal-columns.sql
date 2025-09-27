-- Add gender and tribal_section columns to members table if they don't exist
-- This script ensures the columns needed for member management are present

-- Add gender column
ALTER TABLE members
ADD COLUMN IF NOT EXISTS gender VARCHAR(20);

-- Add tribal_section column
ALTER TABLE members
ADD COLUMN IF NOT EXISTS tribal_section VARCHAR(100);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_members_gender
ON members(gender);

CREATE INDEX IF NOT EXISTS idx_members_tribal_section
ON members(tribal_section);

-- Add other commonly used columns if missing
ALTER TABLE members
ADD COLUMN IF NOT EXISTS national_id VARCHAR(50);

ALTER TABLE members
ADD COLUMN IF NOT EXISTS date_of_birth DATE;

ALTER TABLE members
ADD COLUMN IF NOT EXISTS city VARCHAR(100);

ALTER TABLE members
ADD COLUMN IF NOT EXISTS district VARCHAR(100);

ALTER TABLE members
ADD COLUMN IF NOT EXISTS address TEXT;

ALTER TABLE members
ADD COLUMN IF NOT EXISTS occupation VARCHAR(100);

ALTER TABLE members
ADD COLUMN IF NOT EXISTS employer VARCHAR(100);

ALTER TABLE members
ADD COLUMN IF NOT EXISTS nationality VARCHAR(50) DEFAULT 'سعودي';

ALTER TABLE members
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT false;

ALTER TABLE members
ADD COLUMN IF NOT EXISTS membership_status VARCHAR(20) DEFAULT 'active';

ALTER TABLE members
ADD COLUMN IF NOT EXISTS membership_date DATE;

ALTER TABLE members
ADD COLUMN IF NOT EXISTS membership_type VARCHAR(50) DEFAULT 'regular';

ALTER TABLE members
ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE members
ADD COLUMN IF NOT EXISTS password VARCHAR(255);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_members_status_completed
ON members(membership_status, profile_completed);

CREATE INDEX IF NOT EXISTS idx_members_gender_tribal
ON members(gender, tribal_section);

-- Grant necessary permissions
GRANT ALL ON members TO authenticated;
GRANT ALL ON members TO service_role;

-- Verify columns were added
SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'members'
AND column_name IN ('gender', 'tribal_section', 'national_id', 'date_of_birth', 'city', 'district', 'address', 'occupation', 'employer')
ORDER BY column_name;