-- ============================================================================
-- AL-SHUAIL STORAGE BUCKET POLICIES UPDATE
-- Update Date: October 15, 2025
-- Purpose: Allow members to access their own files + super admin full access
-- ============================================================================

-- This script updates all storage bucket policies to support:
-- 1. Super Admin - Full access to everything
-- 2. Members - Access to their own files only
-- 3. Maintained existing access patterns

-- ============================================================================
-- STEP 1: DROP EXISTING POLICIES (Clean slate)
-- ============================================================================

-- Member Photos Bucket
DROP POLICY IF EXISTS "Super Admin Full Access - member-photos" ON storage.objects;
DROP POLICY IF EXISTS "Members can view their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Members can upload their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Members can update their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Members can delete their own photos" ON storage.objects;

-- Member Documents Bucket
DROP POLICY IF EXISTS "Super Admin Full Access - member-documents" ON storage.objects;
DROP POLICY IF EXISTS "Members can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Members can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Members can update their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Members can delete their own documents" ON storage.objects;

-- Financial Reports Bucket
DROP POLICY IF EXISTS "Super Admin Full Access - financial-reports" ON storage.objects;
DROP POLICY IF EXISTS "Financial managers can access reports" ON storage.objects;

-- Competition Media Bucket (Public)
DROP POLICY IF EXISTS "Public Access - competition-media" ON storage.objects;
DROP POLICY IF EXISTS "Super Admin Full Access - competition-media" ON storage.objects;

-- ============================================================================
-- STEP 2: CREATE HELPER FUNCTION - Check if user is super admin
-- ============================================================================

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 3: CREATE HELPER FUNCTION - Get member_id from user
-- ============================================================================

CREATE OR REPLACE FUNCTION get_member_id_from_user()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT member_id FROM users
    WHERE id = auth.uid()
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 4: MEMBER-PHOTOS BUCKET POLICIES
-- ============================================================================

-- Policy 1: Super Admin can do EVERYTHING in member-photos
CREATE POLICY "Super Admin Full Access - member-photos"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'member-photos' 
  AND is_super_admin()
)
WITH CHECK (
  bucket_id = 'member-photos' 
  AND is_super_admin()
);

-- Policy 2: Members can VIEW their own photos
-- Path format: member-photos/{member_id}/filename.jpg
CREATE POLICY "Members can view their own photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'member-photos'
  AND (
    (storage.foldername(name))[1] = get_member_id_from_user()::text
    OR is_super_admin()
  )
);

-- Policy 3: Members can UPLOAD their own photos
CREATE POLICY "Members can upload their own photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'member-photos'
  AND (
    (storage.foldername(name))[1] = get_member_id_from_user()::text
    OR is_super_admin()
  )
);

-- Policy 4: Members can UPDATE their own photos
CREATE POLICY "Members can update their own photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'member-photos'
  AND (
    (storage.foldername(name))[1] = get_member_id_from_user()::text
    OR is_super_admin()
  )
)
WITH CHECK (
  bucket_id = 'member-photos'
  AND (
    (storage.foldername(name))[1] = get_member_id_from_user()::text
    OR is_super_admin()
  )
);

-- Policy 5: Members can DELETE their own photos
CREATE POLICY "Members can delete their own photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'member-photos'
  AND (
    (storage.foldername(name))[1] = get_member_id_from_user()::text
    OR is_super_admin()
  )
);

-- ============================================================================
-- STEP 5: MEMBER-DOCUMENTS BUCKET POLICIES
-- ============================================================================

-- Policy 1: Super Admin can do EVERYTHING in member-documents
CREATE POLICY "Super Admin Full Access - member-documents"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'member-documents' 
  AND is_super_admin()
)
WITH CHECK (
  bucket_id = 'member-documents' 
  AND is_super_admin()
);

-- Policy 2: Members can VIEW their own documents
CREATE POLICY "Members can view their own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'member-documents'
  AND (
    (storage.foldername(name))[1] = get_member_id_from_user()::text
    OR is_super_admin()
  )
);

-- Policy 3: Members can UPLOAD their own documents
CREATE POLICY "Members can upload their own documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'member-documents'
  AND (
    (storage.foldername(name))[1] = get_member_id_from_user()::text
    OR is_super_admin()
  )
);

-- Policy 4: Members can UPDATE their own documents
CREATE POLICY "Members can update their own documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'member-documents'
  AND (
    (storage.foldername(name))[1] = get_member_id_from_user()::text
    OR is_super_admin()
  )
)
WITH CHECK (
  bucket_id = 'member-documents'
  AND (
    (storage.foldername(name))[1] = get_member_id_from_user()::text
    OR is_super_admin()
  )
);

-- Policy 5: Members can DELETE their own documents
CREATE POLICY "Members can delete their own documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'member-documents'
  AND (
    (storage.foldername(name))[1] = get_member_id_from_user()::text
    OR is_super_admin()
  )
);

-- ============================================================================
-- STEP 6: FINANCIAL-REPORTS BUCKET POLICIES
-- ============================================================================

-- Policy 1: Super Admin can do EVERYTHING
CREATE POLICY "Super Admin Full Access - financial-reports"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'financial-reports' 
  AND is_super_admin()
)
WITH CHECK (
  bucket_id = 'financial-reports' 
  AND is_super_admin()
);

-- Policy 2: Financial Managers can VIEW reports
CREATE POLICY "Financial managers can view reports"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'financial-reports'
  AND (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('financial_manager', 'admin')
      AND is_active = true
    )
  )
);

-- Policy 3: Financial Managers and Admins can UPLOAD reports
CREATE POLICY "Financial managers can upload reports"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'financial-reports'
  AND (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('financial_manager', 'admin', 'super_admin')
      AND is_active = true
    )
  )
);

-- Policy 4: Financial Managers can UPDATE reports
CREATE POLICY "Financial managers can update reports"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'financial-reports'
  AND (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('financial_manager', 'admin')
      AND is_active = true
    )
  )
)
WITH CHECK (
  bucket_id = 'financial-reports'
  AND (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('financial_manager', 'admin')
      AND is_active = true
    )
  )
);

-- Policy 5: Only Super Admin can DELETE reports
CREATE POLICY "Only super admin can delete reports"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'financial-reports'
  AND is_super_admin()
);

-- ============================================================================
-- STEP 7: COMPETITION-MEDIA BUCKET POLICIES
-- ============================================================================

-- Policy 1: Super Admin Full Access
CREATE POLICY "Super Admin Full Access - competition-media"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'competition-media' 
  AND is_super_admin()
)
WITH CHECK (
  bucket_id = 'competition-media' 
  AND is_super_admin()
);

-- Policy 2: Public can VIEW competition media
CREATE POLICY "Public can view competition media"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'competition-media'
);

-- Policy 3: Authenticated users can UPLOAD
CREATE POLICY "Authenticated users can upload competition media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'competition-media'
);

-- Policy 4: Only uploader or super admin can UPDATE
CREATE POLICY "Owner or admin can update competition media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'competition-media'
  AND (
    owner = auth.uid()
    OR is_super_admin()
  )
)
WITH CHECK (
  bucket_id = 'competition-media'
  AND (
    owner = auth.uid()
    OR is_super_admin()
  )
);

-- Policy 5: Only uploader or super admin can DELETE
CREATE POLICY "Owner or admin can delete competition media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'competition-media'
  AND (
    owner = auth.uid()
    OR is_super_admin()
  )
);

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

SELECT 
  policyname,
  cmd as operation,
  CASE 
    WHEN policyname LIKE '%member-photos%' THEN 'member-photos'
    WHEN policyname LIKE '%member-documents%' THEN 'member-documents'
    WHEN policyname LIKE '%financial-reports%' THEN 'financial-reports'
    WHEN policyname LIKE '%competition-media%' THEN 'competition-media'
  END as bucket
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND (
    policyname LIKE '%member-photos%' 
    OR policyname LIKE '%member-documents%'
    OR policyname LIKE '%financial-reports%'
    OR policyname LIKE '%competition-media%'
  )
ORDER BY bucket, cmd;

-- ============================================================================
-- IMPORTANT NOTES
-- ============================================================================

/*
FILE PATH STRUCTURE (CRITICAL):
  - member-photos/{member_id}/filename.ext
  - member-documents/{member_id}/filename.ext
  
PERMISSIONS SUMMARY:
  1. Super Admin: Full access to ALL buckets
  2. Members: Access only to their own files (based on member_id)
  3. Financial Managers: Can view/upload/update financial reports
  4. Public: Can view competition media
  
REQUIREMENTS:
  - users table MUST have 'member_id' column
  - users.member_id MUST be populated
  - File paths MUST follow the structure above
*/
