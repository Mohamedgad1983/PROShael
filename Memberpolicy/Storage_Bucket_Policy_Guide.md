# 🔒 Al-Shuail Storage Bucket Policies - Complete Guide

## 📋 Overview

This guide explains the updated storage bucket policies for the Al-Shuail Family Management System.

**Date**: October 15, 2025  
**Status**: Ready to Deploy  
**File**: `Update_Storage_Bucket_Policies.sql`

---

## ðŸŽ¯ What Changed

### Before (Old Policies):
- ❌ Only "related users" could access files
- ❌ Members couldn't access their own files
- ❌ Super admin didn't have universal access

### After (New Policies):
- ✅ **Super Admin** - Full access to ALL buckets
- ✅ **Members** - Can access their own files only
- ✅ **Financial Managers** - Can manage financial reports
- ✅ **Public** - Can view competition media (read-only)

---

## ðŸ—‚ï¸ Storage Buckets & Access Rules

### 1. **member-photos** Bucket

**Purpose**: Store member profile photos and personal images

**File Path Structure**:
```
member-photos/
  â"œâ"€â"€ {member_id_1}/
  â"‚   â"œâ"€â"€ profile.jpg
  â"‚   â""â"€â"€ family_photo.jpg
  â""â"€â"€ {member_id_2}/
      â""â"€â"€ profile.png
```

**Access Rules**:
| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| Super Admin | ✅ All | ✅ All | ✅ All | ✅ All |
| Member (Own) | ✅ | ✅ | ✅ | ✅ |
| Member (Others) | ❌ | ❌ | ❌ | ❌ |

**Example**:
- Member with ID `abc-123` can only access `member-photos/abc-123/*`
- Super admin can access `member-photos/*/*`

---

### 2. **member-documents** Bucket

**Purpose**: Store member personal documents (ID, certificates, etc.)

**File Path Structure**:
```
member-documents/
  â"œâ"€â"€ {member_id_1}/
  â"‚   â"œâ"€â"€ national_id.pdf
  â"‚   â"œâ"€â"€ birth_certificate.pdf
  â"‚   â""â"€â"€ diploma.pdf
  â""â"€â"€ {member_id_2}/
      â""â"€â"€ passport.pdf
```

**Access Rules**:
| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| Super Admin | ✅ All | ✅ All | ✅ All | ✅ All |
| Member (Own) | ✅ | ✅ | ✅ | ✅ |
| Member (Others) | ❌ | ❌ | ❌ | ❌ |

**Example**:
- Member can upload their ID: `member-documents/{their_member_id}/national_id.pdf`
- Member CANNOT view other members' documents
- Super admin can view all documents

---

### 3. **financial-reports** Bucket

**Purpose**: Store financial reports, bank statements, expense receipts

**File Path Structure**:
```
financial-reports/
  â"œâ"€â"€ 2025/
  â"‚   â"œâ"€â"€ Q1_report.pdf
  â"‚   â"œâ"€â"€ Q2_report.pdf
  â"‚   â""â"€â"€ expenses/
  â"‚       â""â"€â"€ january_expenses.xlsx
  â""â"€â"€ bank_statements/
      â""â"€â"€ january_2025.pdf
```

**Access Rules**:
| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| Super Admin | ✅ | ✅ | ✅ | ✅ |
| Financial Manager | ✅ | ✅ | ✅ | ❌ |
| Admin | ✅ | ✅ | ✅ | ❌ |
| Member | ❌ | ❌ | ❌ | ❌ |

**Example**:
- Financial manager can upload reports
- Only super admin can delete reports
- Regular members cannot see financial reports

---

### 4. **competition-media** Bucket (Public)

**Purpose**: Store competition photos, videos, promotional content

**File Path Structure**:
```
competition-media/
  â"œâ"€â"€ 2025/
  â"‚   â"œâ"€â"€ ramadan_competition/
  â"‚   â"‚   â"œâ"€â"€ poster.jpg
  â"‚   â"‚   â""â"€â"€ winner_photo.jpg
  â"‚   â""â"€â"€ quran_competition/
  â"‚       â""â"€â"€ event_photos/
  â""â"€â"€ announcements/
```

**Access Rules**:
| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| Super Admin | ✅ | ✅ | ✅ | ✅ |
| Public (Anyone) | ✅ | ❌ | ❌ | ❌ |
| Authenticated | ✅ | ✅ | Own Only | Own Only |

**Example**:
- Anyone (even without login) can view competition photos
- Authenticated users can upload
- Only uploader or super admin can delete

---

## ðŸ"¨ Installation Steps

### Step 1: Backup Current Policies (Recommended)

```sql
-- Save current policies to a backup file
COPY (
  SELECT policyname, cmd, qual, with_check
  FROM pg_policies
  WHERE schemaname = 'storage' AND tablename = 'objects'
) TO '/tmp/storage_policies_backup.csv' WITH CSV HEADER;
```

### Step 2: Run the Update Script

1. Open Supabase SQL Editor
2. Copy the entire content of `Update_Storage_Bucket_Policies.sql`
3. Paste into SQL Editor
4. Click **RUN**

### Step 3: Verify Installation

Run this verification query:

```sql
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
ORDER BY bucket, cmd;
```

**Expected Result**: Should show 5 policies per bucket (SELECT, INSERT, UPDATE, DELETE, + Super Admin)

---

## ðŸ§ª Testing the Policies

### Test 1: Super Admin Access

```javascript
// Super admin should be able to access ALL files
const { data, error } = await supabase
  .storage
  .from('member-photos')
  .list('', { limit: 100 });

// Should return all folders/files
console.log('Super admin sees:', data.length, 'items');
```

### Test 2: Member Access (Own Files)

```javascript
// Member should only see their own folder
const { data: user } = await supabase.auth.getUser();
const memberId = user.member_id;

const { data, error } = await supabase
  .storage
  .from('member-photos')
  .list(memberId);

// Should succeed - member can see their own files
console.log('Member sees their own files:', data);
```

### Test 3: Member Access (Others' Files) - Should Fail

```javascript
// Member tries to access another member's files
const otherMemberId = 'some-other-member-id';

const { data, error } = await supabase
  .storage
  .from('member-photos')
  .list(otherMemberId);

// Should fail - member cannot see others' files
console.log('Error (expected):', error);
```

### Test 4: Member Upload

```javascript
// Member uploads to their own folder
const { data: user } = await supabase.auth.getUser();
const memberId = user.member_id;

const file = new File(['test'], 'profile.jpg', { type: 'image/jpeg' });

const { data, error } = await supabase
  .storage
  .from('member-photos')
  .upload(`${memberId}/profile.jpg`, file);

// Should succeed
console.log('Upload result:', data);
```

---

## âš™ï¸ Helper Functions

The script creates two important helper functions:

### 1. `is_super_admin()`

**Purpose**: Check if current user is a super admin

**Usage in SQL**:
```sql
SELECT is_super_admin(); -- Returns true/false
```

**How it works**:
```sql
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
```

### 2. `get_member_id_from_user()`

**Purpose**: Get the member_id for the current authenticated user

**Usage in SQL**:
```sql
SELECT get_member_id_from_user(); -- Returns UUID or NULL
```

**How it works**:
```sql
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
```

---

## ðŸš¨ Important Requirements

### 1. Users Table Must Have member_id Column

```sql
-- Check if column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name = 'member_id';

-- If missing, add it
ALTER TABLE users 
ADD COLUMN member_id UUID REFERENCES members(id);
```

### 2. Link Users to Members

When creating a new user account, you MUST link them to a member:

```sql
-- Example: Create user and link to member
INSERT INTO users (id, email, phone, password_hash, role, member_id)
VALUES (
  gen_random_uuid(),
  'member@example.com',
  '0501234567',
  crypt('password', gen_salt('bf')),
  'member',
  (SELECT id FROM members WHERE phone = '0501234567') -- Link to member
);
```

### 3. File Upload Path Format

When uploading files from your application, use this format:

```javascript
// CORRECT ✅
const memberId = currentUser.member_id;
const filePath = `${memberId}/profile.jpg`;

supabase.storage
  .from('member-photos')
  .upload(filePath, file);

// WRONG ❌
const filePath = `profile.jpg`; // Missing member_id folder!
```

---

## 🔧 Frontend Implementation Example

### React Component - Upload Member Photo

```jsx
import { useState } from 'react';
import { supabase } from './supabaseClient';

function MemberPhotoUpload() {
  const [uploading, setUploading] = useState(false);
  
  const uploadPhoto = async (event) => {
    try {
      setUploading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get member_id from user
      const { data: userData } = await supabase
        .from('users')
        .select('member_id')
        .eq('id', user.id)
        .single();
      
      const memberId = userData.member_id;
      
      if (!memberId) {
        throw new Error('Member ID not found');
      }
      
      // Upload file
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `profile.${fileExt}`;
      const filePath = `${memberId}/${fileName}`;
      
      const { data, error } = await supabase.storage
        .from('member-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true // Replace if exists
        });
      
      if (error) throw error;
      
      alert('Photo uploaded successfully!');
    } catch (error) {
      alert(error.message);
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={uploadPhoto}
        disabled={uploading}
      />
    </div>
  );
}
```

---

## 🔄 Rollback Instructions

If you need to undo the changes, run this script:

```sql
-- Drop all new policies
DROP POLICY IF EXISTS "Super Admin Full Access - member-photos" ON storage.objects;
DROP POLICY IF EXISTS "Members can view their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Members can upload their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Members can update their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Members can delete their own photos" ON storage.objects;

DROP POLICY IF EXISTS "Super Admin Full Access - member-documents" ON storage.objects;
DROP POLICY IF EXISTS "Members can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Members can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Members can update their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Members can delete their own documents" ON storage.objects;

DROP POLICY IF EXISTS "Super Admin Full Access - financial-reports" ON storage.objects;
DROP POLICY IF EXISTS "Financial managers can view reports" ON storage.objects;
DROP POLICY IF EXISTS "Financial managers can upload reports" ON storage.objects;
DROP POLICY IF EXISTS "Financial managers can update reports" ON storage.objects;
DROP POLICY IF EXISTS "Only super admin can delete reports" ON storage.objects;

DROP POLICY IF EXISTS "Super Admin Full Access - competition-media" ON storage.objects;
DROP POLICY IF EXISTS "Public can view competition media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload competition media" ON storage.objects;
DROP POLICY IF EXISTS "Owner or admin can update competition media" ON storage.objects;
DROP POLICY IF EXISTS "Owner or admin can delete competition media" ON storage.objects;

-- Drop helper functions
DROP FUNCTION IF EXISTS is_super_admin();
DROP FUNCTION IF EXISTS get_member_id_from_user();
```

---

## âœ… Checklist Before Going Live

- [ ] Backup current policies
- [ ] Verify `users.member_id` column exists
- [ ] Link all existing users to members
- [ ] Run the update script
- [ ] Verify policies with test queries
- [ ] Test super admin access
- [ ] Test member access (own files)
- [ ] Test member access denied (others' files)
- [ ] Test file upload/download
- [ ] Update frontend code to use correct paths
- [ ] Test in staging environment
- [ ] Deploy to production

---

## 📞 Support & Troubleshooting

### Common Issues:

**Issue 1**: "member_id column does not exist"
```sql
-- Solution: Add the column
ALTER TABLE users ADD COLUMN member_id UUID REFERENCES members(id);
```

**Issue 2**: "Permission denied" when member tries to upload
```sql
-- Solution: Check if member_id is set for the user
SELECT id, email, member_id FROM users WHERE email = 'member@example.com';

-- If NULL, update it
UPDATE users SET member_id = (SELECT id FROM members WHERE email = 'member@example.com') 
WHERE email = 'member@example.com';
```

**Issue 3**: "Path not found" errors
- Ensure file paths follow format: `{member_id}/filename.ext`
- Check that member_id is a valid UUID

---

## 📊 Policy Summary Table

| Bucket | Super Admin | Member (Own) | Member (Other) | Financial Mgr | Public |
|--------|-------------|--------------|----------------|---------------|--------|
| **member-photos** | ✅ ALL | ✅ ALL | ❌ | ❌ | ❌ |
| **member-documents** | ✅ ALL | ✅ ALL | ❌ | ❌ | ❌ |
| **financial-reports** | ✅ ALL | ❌ | ❌ | ✅ View/Upload/Update | ❌ |
| **competition-media** | ✅ ALL | ✅ Upload/Own | ❌ | ❌ | ✅ View Only |

---

**Last Updated**: October 15, 2025  
**Version**: 1.0  
**Status**: Production Ready

---

## 🎉 Conclusion

Your storage buckets are now properly secured with:
- ✅ Super admin universal access
- ✅ Member self-service (own files only)
- ✅ Role-based access control
- ✅ Public competition media
- ✅ Secure financial reports

The system is ready for production use!
