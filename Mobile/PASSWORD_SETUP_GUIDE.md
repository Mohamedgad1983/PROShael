# 🔐 AL-SHUAIL MOBILE PWA - PASSWORD SETUP GUIDE

## Complete Step-by-Step Instructions

**Date**: October 3, 2025
**Target**: 344 Members
**Default Password**: `123456`
**Status**: ✅ Scripts Ready to Run

---

## 📋 WHAT WE'VE DONE

✅ **Generated bcrypt hash for password "123456"**
- Hash: `$2b$10$Q6lwLnLhnFcjWbDijquFEO0YmkiZ3r6se8Y6etyjAs9o4wU2clU1K`
- Verified: ✅ Password matches correctly
- Ready for production: ✅ Yes

✅ **Created complete SQL script**
- File: `alshuail-backend/scripts/setup-default-passwords.sql`
- Status: Ready to run in Supabase Dashboard
- Contains: Full setup, verification, and audit logging

✅ **Created password hash generator**
- File: `alshuail-backend/scripts/generate-default-password-hash.js`
- Status: Can be re-run anytime if needed

---

## 🚀 QUICK START (3 STEPS)

### **STEP 1: Open Supabase Dashboard**

1. Go to: https://supabase.com
2. Login to your account
3. Select project: `oneiggrfzagqjbkdinin`
4. Click: **SQL Editor** (left sidebar)
5. Click: **New Query**

---

### **STEP 2: Copy & Run SQL Script**

1. Open file: `D:\PROShael\alshuail-backend\scripts\setup-default-passwords.sql`
2. **Copy the ENTIRE script** (all 400+ lines)
3. **Paste** into Supabase SQL Editor
4. Click: **RUN** button (or press F5)
5. **Wait** for completion (~30 seconds)

---

### **STEP 3: Verify Results**

Look for this output in the SQL Editor:

```
========================================
🎉 PASSWORD SETUP COMPLETED SUCCESSFULLY!
========================================

📝 SUMMARY:
  • Default Password: 123456
  • All regular members have passwords set
  • Members will be forced to change password on first login
  • Admin accounts were NOT affected

VERIFICATION RESULTS
========================================
Total Regular Members: 344
Members with Password: 344
Requires Password Change: 344
First-Time Login: 344
Admin Accounts (Protected): [your admin count]
========================================
```

✅ **SUCCESS** if all numbers match!

---

## 📊 EXPECTED RESULTS

### What the Script Does:

1. **Adds Columns** (if not exist):
   - `password_hash` - Stores encrypted password
   - `is_first_login` - Tracks first-time login
   - `requires_password_change` - Forces password change
   - `password_changed_at` - Audit timestamp
   - `last_login` - Last login time
   - `login_attempts` - Security counter
   - `account_locked_until` - Account lock mechanism

2. **Sets Default Password** for all 344 members:
   - Password: `123456`
   - Hash: `$2b$10$Q6lwLnLhnFcjWbDijquFEO0YmkiZ3r6se8Y6etyjAs9o4wU2clU1K`
   - Only affects regular members (role = 'member')
   - **Does NOT affect** admin accounts

3. **Marks All Members** for forced password change:
   - `is_first_login = true`
   - `requires_password_change = true`

4. **Displays Verification**:
   - Total members count
   - Members with passwords
   - Sample data (first 10 members)
   - Admin accounts status

5. **Creates Audit Log** (if table exists):
   - Action: `PASSWORD_RESET_BULK`
   - Description: Default passwords set
   - Timestamp: Current time

---

## 🧪 TEST IMMEDIATELY AFTER SETUP

### Test Login with Postman:

```http
POST https://proshael.onrender.com/api/auth/login
Content-Type: application/json

{
  "phone": "0599000001",
  "password": "123456"
}
```

**Replace** `0599000001` with a **real member phone** from your database.

### Expected Response:

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "full_name_ar": "أحمد محمد الشعيل",
    "phone": "0599000001",
    "role": "member",
    "membership_number": "SH-10001"
  },
  "requires_password_change": true,
  "is_first_login": true
}
```

✅ **If you see** `requires_password_change: true` → **SUCCESS!**

---

## 🔄 IF YOU NEED TO RE-GENERATE HASH

Run this command:

```bash
cd D:\PROShael\alshuail-backend
node scripts/generate-default-password-hash.js
```

**Output:**
```
🔐 AL-SHUAIL PASSWORD HASH GENERATOR

✅ HASH GENERATED SUCCESSFULLY!

======================================================================
COPY THIS HASH FOR YOUR SQL SCRIPT:
======================================================================
$2b$10$Q6lwLnLhnFcjWbDijquFEO0YmkiZ3r6se8Y6etyjAs9o4wU2clU1K
======================================================================

✅ VERIFICATION SUCCESSFUL!
   Password "123456" matches the generated hash

🚀 Ready to use in production!
```

Copy the new hash and update the SQL script if needed.

---

## 📱 MEMBER COMMUNICATION TEMPLATE

After successful setup, send this to all 344 members via WhatsApp:

```
🌟 مرحباً بك في نظام إدارة عائلة الشعيل

تم تفعيل حسابك في النظام الإلكتروني

📱 معلومات الدخول:
• رقم الجوال: [PHONE_NUMBER]
• كلمة المرور المؤقتة: 123456

🔐 الخطوات:
1. افتح الرابط: alshuail-admin.pages.dev
2. سجل دخولك برقم جوالك وكلمة المرور
3. ستُطلب منك تغيير كلمة المرور للأمان
4. يمكنك تفعيل البصمة لتسجيل دخول سريع

⚠️ مهم: غيّر كلمة المرور فوراً بعد أول دخول

للدعم الفني: [SUPPORT_PHONE]
```

---

## 🔍 TROUBLESHOOTING

### Problem: Script fails with "column already exists"

**Solution**: This is OK! The script checks for existing columns and skips them.

---

### Problem: "0 rows updated"

**Possible Causes**:
1. Members already have passwords set
2. No members with role='member' in database
3. Wrong table name

**Check with**:
```sql
SELECT COUNT(*) FROM members WHERE role='member';
```

---

### Problem: Can't login with "123456"

**Check**:
```sql
SELECT
    phone,
    LEFT(password_hash, 30) as hash_preview,
    is_first_login
FROM members
WHERE phone = '0599000001';  -- Replace with test phone
```

If `password_hash` is NULL, the script didn't run successfully.

---

### Problem: Admin accounts affected

**Check**:
```sql
SELECT
    full_name_ar,
    role,
    password_hash
FROM members
WHERE role IN ('admin', 'super_admin');
```

Admin password_hash should **NOT** be: `$2b$10$Q6lwLnLhnFcjWbDijquFEO0YmkiZ3r6se8Y6etyjAs9o4wU2clU1K`

If it was changed, restore from backup immediately!

---

## 🔒 SECURITY NOTES

### Password Strength Requirements (for new passwords):

When members change password, enforce:
- ✅ Minimum 8 characters
- ✅ At least 1 uppercase letter
- ✅ At least 1 lowercase letter
- ✅ At least 1 number
- ✅ At least 1 special character (@$!%*?&#)

### Account Lockout Policy:

- After 5 failed login attempts
- Lock account for 15 minutes
- Send notification to member

### Password Expiry:

- Force password change every 90 days (optional)
- Send reminder 7 days before expiry

---

## 📊 DATABASE SCHEMA CHANGES

### New Columns Added to `members` table:

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `password_hash` | VARCHAR(255) | NULL | Encrypted password |
| `is_first_login` | BOOLEAN | true | First-time login flag |
| `requires_password_change` | BOOLEAN | true | Force password change |
| `password_changed_at` | TIMESTAMP | NULL | Last password change |
| `last_login` | TIMESTAMP | NULL | Last login time |
| `login_attempts` | INTEGER | 0 | Failed login counter |
| `account_locked_until` | TIMESTAMP | NULL | Account lock time |

---

## ✅ VERIFICATION CHECKLIST

After running the SQL script:

- [ ] Total members = 344 (or your actual count)
- [ ] Members with password = 344
- [ ] All members have `is_first_login = true`
- [ ] All members have `requires_password_change = true`
- [ ] Admin accounts NOT affected
- [ ] Sample login test successful
- [ ] Postman test returns correct JWT token
- [ ] Response includes `requires_password_change: true`

---

## 📁 FILES CREATED

1. **Password Hash Generator**:
   - Location: `D:\PROShael\alshuail-backend\scripts\generate-default-password-hash.js`
   - Purpose: Generate new bcrypt hashes
   - Usage: `node scripts/generate-default-password-hash.js`

2. **SQL Setup Script**:
   - Location: `D:\PROShael\alshuail-backend\scripts\setup-default-passwords.sql`
   - Purpose: Complete password setup for all 344 members
   - Usage: Copy & paste into Supabase SQL Editor

3. **This Guide**:
   - Location: `D:\PROShael\Mobile\PASSWORD_SETUP_GUIDE.md`
   - Purpose: Complete instructions and reference

---

## 🎯 NEXT STEPS AFTER PASSWORD SETUP

1. ✅ **Password Setup Complete** (this guide)
2. 🔜 **Deploy Password Change Flow** (frontend component)
3. 🔜 **Add Face ID / Biometric Auth** (optional feature)
4. 🔜 **Test Complete Login Flow** (end-to-end)
5. 🔜 **Send WhatsApp Messages** (344 members)
6. 🔜 **Monitor First Logins** (dashboard)
7. 🔜 **Continue Mobile App Development** (Phase 1)

---

## 🆘 NEED HELP?

### Contact Information:

- **Technical Support**: [Your Phone/Email]
- **Database Issues**: Check Supabase logs
- **Authentication Issues**: Check backend API logs at Render.com

### Emergency Rollback:

If something goes wrong, run this:

```sql
-- EMERGENCY ROLLBACK - Removes all passwords
UPDATE members
SET
    password_hash = NULL,
    is_first_login = NULL,
    requires_password_change = NULL
WHERE role = 'member';
```

Then re-run the setup script.

---

## ✅ SUCCESS CONFIRMATION

You'll know everything worked when:

1. ✅ SQL script completes with no errors
2. ✅ Verification shows 344/344 members with passwords
3. ✅ Test login returns JWT token
4. ✅ Response includes `requires_password_change: true`
5. ✅ Admin accounts still have their original passwords

---

**READY TO RUN THE SCRIPT?**

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Open: `scripts/setup-default-passwords.sql`
4. Copy entire content
5. Paste in SQL Editor
6. Click **RUN**
7. Watch for success messages! 🎉

---

**Generated**: October 3, 2025
**Version**: 1.0
**Status**: ✅ Ready for Production

---

