# ðŸš€ Storage Bucket Policies - Quick Start

## âš¡ 3-Minute Implementation

### Step 1: Prepare (1 minute)

Check if users table has member_id column:

```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'member_id';
```

If not found, add it:

```sql
ALTER TABLE users ADD COLUMN member_id UUID REFERENCES members(id);
```

### Step 2: Apply Policies (1 minute)

1. Open Supabase SQL Editor
2. Copy entire content from `Update_Storage_Bucket_Policies.sql`
3. Paste and click **RUN**

### Step 3: Verify (1 minute)

```sql
-- Should show ~20 policies (5 per bucket × 4 buckets)
SELECT COUNT(*) as total_policies
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND (
    policyname LIKE '%member-photos%' 
    OR policyname LIKE '%member-documents%'
    OR policyname LIKE '%financial-reports%'
    OR policyname LIKE '%competition-media%'
  );
```

Expected result: **20 policies**

---

## ðŸ"‹ What You Get

✅ **Super Admin**: Full access to all buckets  
✅ **Members**: Can only access their own files  
✅ **Financial Managers**: Can manage financial reports  
✅ **Public**: Can view competition media

---

## 📁 File Path Format (IMPORTANT!)

When uploading files, use this structure:

```javascript
// Member Photos
member-photos/{member_id}/profile.jpg

// Member Documents
member-documents/{member_id}/national_id.pdf

// Financial Reports (no member_id needed)
financial-reports/2025/Q1_report.pdf

// Competition Media (no member_id needed)
competition-media/2025/ramadan_competition/poster.jpg
```

---

## ðŸ§ª Quick Test

```javascript
// Test 1: Get current user's member_id
const { data: user } = await supabase.auth.getUser();
console.log('User:', user);

// Test 2: Upload to own folder
const memberId = user.user_metadata.member_id; // or from users table
const { data, error } = await supabase
  .storage
  .from('member-photos')
  .upload(`${memberId}/test.jpg`, file);

console.log('Upload result:', data, error);
```

---

## âš ï¸ Critical Requirements

1. ✅ `users.member_id` column must exist
2. ✅ Every user must have member_id populated
3. ✅ File paths must include member_id for personal buckets
4. ✅ Super admin must have `role = 'super_admin'` in users table

---

## 🔧 Link Users to Members

When creating user accounts:

```sql
-- During user registration
INSERT INTO users (id, email, phone, password_hash, role, member_id, is_active)
VALUES (
  gen_random_uuid(),
  'member@email.com',
  '0501234567',
  crypt('password', gen_salt('bf')),
  'member',
  (SELECT id FROM members WHERE phone = '0501234567'), -- Important!
  true
);
```

Or update existing users:

```sql
-- Link existing users to members by phone
UPDATE users u
SET member_id = m.id
FROM members m
WHERE u.phone = m.phone
  AND u.member_id IS NULL;
```

---

## ðŸ'¡ Pro Tips

**Tip 1**: Always get member_id from the users table
```javascript
const { data } = await supabase
  .from('users')
  .select('member_id')
  .eq('id', currentUserId)
  .single();
```

**Tip 2**: Use upsert for profile photos (replaces existing)
```javascript
await supabase.storage
  .from('member-photos')
  .upload(`${memberId}/profile.jpg`, file, { upsert: true });
```

**Tip 3**: Super admin can list all member folders
```javascript
const { data } = await supabase.storage
  .from('member-photos')
  .list('', { limit: 1000 }); // Returns all member_id folders
```

---

## 🎯 Access Matrix

| Action | Super Admin | Member (Own) | Member (Other) |
|--------|-------------|--------------|----------------|
| View own photos | ✅ | ✅ | ❌ |
| View others' photos | ✅ | ❌ | ❌ |
| Upload own photos | ✅ | ✅ | ❌ |
| Delete own photos | ✅ | ✅ | ❌ |
| Delete others' photos | ✅ | ❌ | ❌ |

---

## 📞 Need Help?

See `Storage_Bucket_Policy_Guide.md` for:
- Detailed explanations
- Frontend code examples
- Troubleshooting guide
- Testing procedures

---

**Status**: ✅ Ready to Deploy  
**Time to Implement**: 3 minutes  
**Files Created**: 3 (SQL + Guide + Quick Start)

---

## ðŸš€ Deploy Now!

1. Run `Update_Storage_Bucket_Policies.sql` in Supabase
2. Test with your super admin account
3. Test with a member account
4. You're done!

**Good luck!** 🎉
