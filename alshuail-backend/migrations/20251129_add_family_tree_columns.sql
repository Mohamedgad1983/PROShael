-- Migration: Add Family Tree Columns to Members Table
-- Date: 2025-11-29
-- Purpose: Add parent_member_id, spouse_id, and generation_level columns for family tree functionality

-- Add parent_member_id column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'members' AND column_name = 'parent_member_id'
    ) THEN
        ALTER TABLE members ADD COLUMN parent_member_id UUID REFERENCES members(id);
        COMMENT ON COLUMN members.parent_member_id IS 'Reference to parent member for family tree';
    END IF;
END $$;

-- Add spouse_id column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'members' AND column_name = 'spouse_id'
    ) THEN
        ALTER TABLE members ADD COLUMN spouse_id UUID REFERENCES members(id);
        COMMENT ON COLUMN members.spouse_id IS 'Reference to spouse member for family tree';
    END IF;
END $$;

-- Add generation_level column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'members' AND column_name = 'generation_level'
    ) THEN
        ALTER TABLE members ADD COLUMN generation_level INTEGER DEFAULT 0;
        COMMENT ON COLUMN members.generation_level IS 'Generation level in family tree (0 = root ancestor)';
    END IF;
END $$;

-- Add full_name_ar column if not exists (alias for full_name in Arabic)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'members' AND column_name = 'full_name_ar'
    ) THEN
        -- If full_name exists, create full_name_ar as computed or copy
        ALTER TABLE members ADD COLUMN full_name_ar TEXT;
        -- Copy existing full_name to full_name_ar
        UPDATE members SET full_name_ar = full_name WHERE full_name_ar IS NULL;
        COMMENT ON COLUMN members.full_name_ar IS 'Full name in Arabic';
    END IF;
END $$;

-- Add full_name_en column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'members' AND column_name = 'full_name_en'
    ) THEN
        ALTER TABLE members ADD COLUMN full_name_en TEXT;
        COMMENT ON COLUMN members.full_name_en IS 'Full name in English';
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_members_parent_member_id ON members(parent_member_id);
CREATE INDEX IF NOT EXISTS idx_members_spouse_id ON members(spouse_id);
CREATE INDEX IF NOT EXISTS idx_members_generation_level ON members(generation_level);

-- Verify columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'members'
AND column_name IN ('parent_member_id', 'spouse_id', 'generation_level', 'full_name_ar', 'full_name_en')
ORDER BY column_name;
