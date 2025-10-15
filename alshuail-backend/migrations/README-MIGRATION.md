# 🔧 Database Migration: documents_metadata Table

## 🚨 URGENT: Required for Document Upload Feature

The document upload feature requires the `documents_metadata` table in Supabase. This table was missing from the initial deployment.

---

## ⚡ Quick Fix (5 minutes)

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your **Al-Shuail** project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Run the Migration
1. Open the file: `create-documents-metadata-table.sql`
2. Copy **ALL** content (Ctrl+A, Ctrl+C)
3. Paste into Supabase SQL Editor
4. Click **RUN** button (or press Ctrl+Enter)

### Step 3: Verify Table Created
Run this query to confirm:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'documents_metadata'
ORDER BY ordinal_position;
```

**Expected Result**: Should show 14 columns:
- id
- member_id
- uploaded_by
- title
- description
- category
- file_path
- file_size
- file_type
- original_name
- status
- created_at
- updated_at
- deleted_at

### Step 4: Test Document Upload
After table is created, try uploading a document again from the web interface.

---

## 📋 What This Migration Does

1. ✅ Creates `documents_metadata` table
2. ✅ Adds 10 document category constraints
3. ✅ Creates 5 indexes for performance
4. ✅ Sets up auto-update trigger for `updated_at`
5. ✅ Enables Row Level Security (RLS)
6. ✅ Creates 5 RLS policies for access control

---

## 🔒 RLS Policies Created

| Policy | Who | What |
|--------|-----|------|
| Super Admin Full Access | Super Admin | All operations |
| Members view own | Members | SELECT own documents |
| Members insert own | Members | INSERT own documents |
| Members update own | Members | UPDATE own documents |
| Members delete own | Members | DELETE own documents |

---

## 🗂️ Table Structure

```sql
documents_metadata
├── id (UUID, Primary Key)
├── member_id (UUID, Foreign Key → members.id)
├── uploaded_by (UUID)
├── title (TEXT)
├── description (TEXT)
├── category (TEXT) - 10 predefined values
├── file_path (TEXT, Unique)
├── file_size (INTEGER)
├── file_type (TEXT)
├── original_name (TEXT)
├── status (TEXT) - 'active' or 'deleted'
├── created_at (TIMESTAMP)
├── updated_at (TIMESTAMP)
└── deleted_at (TIMESTAMP)
```

---

## ❓ Why Was This Missing?

The `documents_metadata` table wasn't included in the initial database setup. This table is essential because:

1. It stores metadata about uploaded documents
2. Links documents to members
3. Tracks document categories
4. Enables document search and filtering
5. Provides audit trail (who uploaded, when)

---

## 🧪 Testing After Migration

### Test 1: Table Exists
```sql
SELECT COUNT(*) FROM documents_metadata;
-- Expected: 0 (empty table)
```

### Test 2: Insert Test Record
```sql
INSERT INTO documents_metadata (
  member_id,
  uploaded_by,
  title,
  category,
  file_path,
  file_size,
  file_type,
  original_name
) VALUES (
  (SELECT id FROM members LIMIT 1),
  (SELECT id FROM members LIMIT 1),
  'Test Document',
  'national_id',
  'test-path/test.pdf',
  100000,
  'application/pdf',
  'test.pdf'
);
```

### Test 3: Query Test Record
```sql
SELECT * FROM documents_metadata;
```

### Test 4: Delete Test Record
```sql
DELETE FROM documents_metadata WHERE title = 'Test Document';
```

---

## 🔄 Rollback (If Needed)

If you need to undo this migration:

```sql
DROP TABLE IF EXISTS documents_metadata CASCADE;
```

**⚠️ Warning**: This will delete all document metadata (but NOT the actual files in Supabase Storage).

---

## 📝 Notes

- **No downtime**: Table creation is instant
- **No data loss**: This is a new table, no existing data affected
- **Automatic**: Triggers and RLS are set up automatically
- **Secure**: RLS policies prevent unauthorized access
- **Indexed**: Performance-optimized for common queries

---

## ✅ Success Criteria

After running this migration:

1. ✅ `documents_metadata` table exists
2. ✅ 14 columns created
3. ✅ 5 indexes created
4. ✅ 1 trigger created (auto-update timestamp)
5. ✅ 5 RLS policies active
6. ✅ Document upload works from web interface

---

## 🚀 Deploy to Production

This migration is **safe to run in production**:
- No breaking changes
- No data modifications
- Instant execution
- No API downtime

**Run it now in your Supabase dashboard!**

---

**Created**: October 15, 2025
**Required For**: Document Upload Feature
**Priority**: 🔴 **HIGH** - Blocking production feature
