-- =====================================================
-- Supabase Storage Policies for member-documents Bucket
-- Purpose: Super admin can access all, members can only access own
-- =====================================================

-- Step 1: Enable RLS (Row Level Security) on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies (if any)
DROP POLICY IF EXISTS "Service role full access" ON storage.objects;
DROP POLICY IF EXISTS "Admin can upload for any member" ON storage.objects;
DROP POLICY IF EXISTS "Members can view own documents" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete any document" ON storage.objects;
DROP POLICY IF EXISTS "Admin can update any document" ON storage.objects;

-- =====================================================
-- POLICY 1: Service Role (Backend) - Full Access
-- Allows backend to upload/delete for any member
-- =====================================================
CREATE POLICY "Service role full access"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'member-documents')
WITH CHECK (bucket_id = 'member-documents');

-- =====================================================
-- POLICY 2: Admin Upload - Can upload for any member
-- Uses JWT claim: role = 'super_admin'
-- File path format: {member_id}/{category}/{filename}
-- =====================================================
CREATE POLICY "Admin can upload for any member"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'member-documents'
  AND (auth.jwt() ->> 'role')::text = 'super_admin'
);

-- =====================================================
-- POLICY 3: Member View Own - Can only see their own documents
-- Uses JWT claim: user_id matches folder path
-- File path format: {user_id}/{category}/{filename}
-- =====================================================
CREATE POLICY "Members can view own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'member-documents'
  AND (
    -- Super admin can see all
    (auth.jwt() ->> 'role')::text = 'super_admin'
    OR
    -- Regular members can only see own (user_id matches folder)
    (storage.foldername(name))[1] = (auth.jwt() ->> 'user_id')::text
  )
);

-- =====================================================
-- POLICY 4: Admin Delete - Can delete any document
-- =====================================================
CREATE POLICY "Admin can delete any document"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'member-documents'
  AND (auth.jwt() ->> 'role')::text = 'super_admin'
);

-- =====================================================
-- POLICY 5: Admin Update - Can update any document
-- =====================================================
CREATE POLICY "Admin can update any document"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'member-documents'
  AND (auth.jwt() ->> 'role')::text = 'super_admin'
)
WITH CHECK (
  bucket_id = 'member-documents'
  AND (auth.jwt() ->> 'role')::text = 'super_admin'
);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if policies are created
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
ORDER BY policyname;

-- =====================================================
-- NOTES FOR IMPLEMENTATION
-- =====================================================

/*
1. Run this SQL in Supabase SQL Editor

2. Make sure your JWT tokens include:
   - user_id: The member's ID
   - role: 'super_admin' for admins, 'member' for regular members

3. File upload path structure must be:
   {user_id}/{category}/{timestamp}_{filename}
   Example: 123/national_id/1234567890_passport.pdf

4. The backend code (documentStorage.js line 73) already uses this format:
   return `${userId}/${category}/${timestamp}_${sanitizedFilename}`;

5. Test after running:
   - Admin upload: Should work for any member
   - Member access: Should only see their own documents
   - Admin view: Should see all documents

6. If uploads still fail, check:
   - Backend env has SUPABASE_SERVICE_KEY (not anon key)
   - JWT tokens are being generated with correct role claim
   - Bucket exists and is named exactly 'member-documents'
*/
