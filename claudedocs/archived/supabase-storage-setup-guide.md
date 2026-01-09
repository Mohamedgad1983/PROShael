# Supabase Storage Setup Guide - Document Upload Fix

## 🎯 Problem
Document upload fails with "فشل رفع المستند" error.

## ✅ Solution
Configure Supabase Storage policies to allow:
- **Super Admin**: Access all documents, upload for any member
- **Regular Member**: Only access their own documents

---

## 📋 Step-by-Step Setup

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project: **oneiggrfzagqjbkdinin**
3. Click "SQL Editor" in left sidebar
4. Click "New Query"

### Step 2: Run the Policy Setup Script
Copy and paste this entire SQL script:

```sql
-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (cleanup)
DROP POLICY IF EXISTS "Service role full access" ON storage.objects;
DROP POLICY IF EXISTS "Admin can upload for any member" ON storage.objects;
DROP POLICY IF EXISTS "Members can view own documents" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete any document" ON storage.objects;
DROP POLICY IF EXISTS "Admin can update any document" ON storage.objects;

-- POLICY 1: Backend service role - Full access
CREATE POLICY "Service role full access"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'member-documents')
WITH CHECK (bucket_id = 'member-documents');

-- POLICY 2: Admin upload - Can upload for any member
CREATE POLICY "Admin can upload for any member"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'member-documents'
  AND (auth.jwt() ->> 'role')::text = 'super_admin'
);

-- POLICY 3: View documents - Admin sees all, members see own
CREATE POLICY "Members can view own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'member-documents'
  AND (
    (auth.jwt() ->> 'role')::text = 'super_admin'
    OR
    (storage.foldername(name))[1] = (auth.jwt() ->> 'user_id')::text
  )
);

-- POLICY 4: Admin delete - Can delete any
CREATE POLICY "Admin can delete any document"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'member-documents'
  AND (auth.jwt() ->> 'role')::text = 'super_admin'
);

-- POLICY 5: Admin update - Can update any
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
```

### Step 3: Click "Run" to execute

### Step 4: Verify Policies Were Created
Run this verification query:
```sql
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND policyname LIKE '%member-documents%'
ORDER BY policyname;
```

You should see 5 policies listed.

---

## 🧪 Testing

After setting up policies, test the upload:

1. Log in to admin app: https://alshuail-admin.pages.dev/login
2. Go to Documents page
3. Try uploading a PDF or image
4. Should see: "تم رفع المستند بنجاح" ✅

If still fails, check browser console for the detailed error message (we improved error handling).

---

## 🔧 Troubleshooting

### If Upload Still Fails:

**Check 1: JWT Token includes role**
Your backend must include `role: 'super_admin'` in JWT:
- File: `alshuail-backend/controllers/authController.js`
- Look for JWT generation
- Ensure role is included in payload

**Check 2: Bucket is exactly named**
- Must be: `member-documents` (not `member_documents` or `memberDocuments`)

**Check 3: Service Key is set**
Backend needs SUPABASE_SERVICE_KEY (not anon key):
- Check: `alshuail-backend/.env`
- Variable: `SUPABASE_SERVICE_KEY=your_service_role_key`

**Check 4: Bucket exists and is configured**
- Bucket name: `member-documents`
- File size limit: 10MB (default: 50MB)
- Allowed MIME types: application/pdf, image/jpeg, image/png

---

## 📄 SQL Script Location

The complete SQL script is saved at:
`alshuail-backend/migrations/setup-document-storage-policies.sql`

You can also run it directly from there.

---

## ✅ Expected Result

After setup:
- ✅ Super admin can upload documents for any member
- ✅ Documents stored in format: `{member_id}/{category}/{timestamp}_{filename}`
- ✅ Super admin can view/delete all documents
- ✅ Regular members can only view their own documents
- ✅ Upload succeeds with "تم رفع المستند بنجاح"

**Try the SQL script now in Supabase Dashboard and the upload should work!**
