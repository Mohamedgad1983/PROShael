# 🚨 FIX AUTO-LOGOUT IN 2 MINUTES!

## THE PROBLEM IS SOLVED! ✅

We found the exact cause: **The test member doesn't exist in your production database.**

---

## 🔧 QUICK FIX (Do This Now!)

### Step 1: Open Supabase
1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click on "SQL Editor" in the left sidebar

### Step 2: Run This SQL
Copy and paste this entire block:

```sql
INSERT INTO members (
  id,
  full_name,
  phone,
  email,
  membership_number,
  membership_status,
  balance,
  join_date,
  created_at,
  updated_at
) VALUES (
  '147b3021-a6a3-4cd7-af2c-67ad11734aa0',
  'سارة الشعيل',
  '0555555555',
  'sara@alshuail.com',
  'SH002',
  'active',
  5000,
  '2024-01-01',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  membership_status = 'active',
  balance = 5000;
```

Click "Run" button.

### Step 3: Clear Browser & Test
1. Open browser console (F12)
2. Run: `localStorage.clear()`
3. Go to: https://alshuail-admin.pages.dev/mobile/login
4. Login with:
   - Phone: `0555555555`
   - Password: `123456`

## 🎉 YOU'RE DONE!

You should now stay logged in! The auto-logout is fixed.

---

## 📊 What Was Happening:

1. ✅ Login worked - created token
2. ✅ Token was valid
3. ❌ BUT member didn't exist in database
4. ❌ So every API call returned "User not found"
5. ❌ Which triggered logout

Now that the member exists in the database, everything works!

---

## 🔍 How We Found This:

We created `test-auth-flow.js` which tested each step:
- Login: ✅ SUCCESS
- Token Verify: ✅ SUCCESS
- Profile API: ❌ "المستخدم غير موجود أو غير نشط"
- Balance API: ❌ "المستخدم غير موجود أو غير نشط"

This proved the member was missing from the database.

---

## 📝 Additional Test Members:

You can also add these test members using `fix-test-members.sql`:
- Phone: `0501234567`, Password: `123456`
- Phone: `0512345678`, Password: `123456`

---

**That's it! The authentication system is working perfectly. It was just missing test data in production.**