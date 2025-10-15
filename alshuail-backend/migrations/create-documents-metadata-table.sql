-- ============================================================================
-- CREATE DOCUMENTS_METADATA TABLE
-- Purpose: Store metadata for member documents uploaded to Supabase Storage
-- Created: October 15, 2025
-- ============================================================================

-- Drop table if exists (for clean re-creation)
DROP TABLE IF EXISTS documents_metadata CASCADE;

-- Create documents_metadata table
CREATE TABLE documents_metadata (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL, -- Can reference either members(id) or users(id)

  -- Document Information
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL CHECK (category IN (
    'national_id',
    'marriage_certificate',
    'property_deed',
    'birth_certificate',
    'death_certificate',
    'passport',
    'driver_license',
    'education',
    'medical',
    'other'
  )),

  -- File Information
  file_path TEXT NOT NULL UNIQUE, -- Path in Supabase Storage
  file_size INTEGER NOT NULL, -- File size in bytes
  file_type TEXT NOT NULL, -- MIME type (application/pdf, image/jpeg, etc.)
  original_name TEXT NOT NULL, -- Original filename

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deleted')),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index on member_id for fast member document queries
CREATE INDEX idx_documents_metadata_member_id ON documents_metadata(member_id);

-- Index on category for filtering by document type
CREATE INDEX idx_documents_metadata_category ON documents_metadata(category);

-- Index on status for filtering active/deleted documents
CREATE INDEX idx_documents_metadata_status ON documents_metadata(status);

-- Index on created_at for sorting by upload date
CREATE INDEX idx_documents_metadata_created_at ON documents_metadata(created_at DESC);

-- Composite index for member + status queries (common use case)
CREATE INDEX idx_documents_metadata_member_status ON documents_metadata(member_id, status);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_documents_metadata_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_documents_metadata_updated_at
  BEFORE UPDATE ON documents_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_documents_metadata_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE documents_metadata ENABLE ROW LEVEL SECURITY;

-- Policy 1: Super Admin can do everything
CREATE POLICY "Super Admin Full Access - documents_metadata"
ON documents_metadata
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'super_admin'
    AND users.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'super_admin'
    AND users.is_active = true
  )
);

-- Policy 2: Members can view their own documents metadata
CREATE POLICY "Members can view their own documents metadata"
ON documents_metadata
FOR SELECT
TO authenticated
USING (
  member_id = (
    SELECT member_id FROM users
    WHERE users.id = auth.uid()
    AND users.is_active = true
  )
);

-- Policy 3: Members can insert their own documents metadata
CREATE POLICY "Members can insert their own documents metadata"
ON documents_metadata
FOR INSERT
TO authenticated
WITH CHECK (
  member_id = (
    SELECT member_id FROM users
    WHERE users.id = auth.uid()
    AND users.is_active = true
  )
);

-- Policy 4: Members can update their own documents metadata
CREATE POLICY "Members can update their own documents metadata"
ON documents_metadata
FOR UPDATE
TO authenticated
USING (
  member_id = (
    SELECT member_id FROM users
    WHERE users.id = auth.uid()
    AND users.is_active = true
  )
)
WITH CHECK (
  member_id = (
    SELECT member_id FROM users
    WHERE users.id = auth.uid()
    AND users.is_active = true
  )
);

-- Policy 5: Members can delete (soft delete) their own documents metadata
CREATE POLICY "Members can delete their own documents metadata"
ON documents_metadata
FOR DELETE
TO authenticated
USING (
  member_id = (
    SELECT member_id FROM users
    WHERE users.id = auth.uid()
    AND users.is_active = true
  )
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'documents_metadata'
ORDER BY ordinal_position;

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'documents_metadata';

-- Check RLS policies
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'documents_metadata';

-- Check triggers
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'documents_metadata';

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Uncomment to insert sample data
/*
INSERT INTO documents_metadata (
  member_id,
  uploaded_by,
  title,
  description,
  category,
  file_path,
  file_size,
  file_type,
  original_name,
  status
) VALUES (
  (SELECT id FROM members LIMIT 1), -- Replace with actual member_id
  (SELECT id FROM members LIMIT 1), -- Replace with actual uploader_id
  'Test National ID',
  'Test document for verification',
  'national_id',
  'test-member-id/national_id/1728984000000_test.pdf',
  1024000,
  'application/pdf',
  'test_national_id.pdf',
  'active'
);
*/

-- ============================================================================
-- NOTES
-- ============================================================================

/*
Table: documents_metadata
Purpose: Store metadata for documents uploaded to Supabase Storage

Key Features:
- Member isolation via foreign key
- 10 predefined document categories
- Soft delete support (status column)
- File information tracking
- RLS policies for security
- Automatic timestamp updates
- Optimized indexes for common queries

Document Categories:
1. national_id - الهوية الوطنية
2. marriage_certificate - عقد الزواج
3. property_deed - صك الملكية
4. birth_certificate - شهادة الميلاد
5. death_certificate - شهادة الوفاة
6. passport - جواز السفر
7. driver_license - رخصة القيادة
8. education - الشهادات التعليمية
9. medical - التقارير الطبية
10. other - أخرى

File Path Format:
{member_id}/{category}/{timestamp}_{filename}
Example: abc-123-uuid/national_id/1728984000000_national_id.pdf

Integration:
- Works with Supabase Storage bucket 'member-documents'
- Uses RLS policies for access control
- Coordinated with storage bucket policies
- Supports signed URLs for secure downloads
*/
