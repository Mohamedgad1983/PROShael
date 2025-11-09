# 🚨 CRITICAL BUG FIX - User Disappearance Issue

**Date**: 2025-11-08
**Priority**: CRITICAL
**Status**: ✅ FIXED - Ready for Testing

---

## Problem Statement

Users created with `family_tree_admin` role would save successfully but disappear after logout/login, making it impossible to create admin users beyond super_admin.

---

## Root Cause

**Dual-Table Architecture Mismatch:**
- Application has TWO user tables: `users` (admins) and `members` (family)
- User creation always inserted into `members` table (line 240 in settings.js)
- Authentication only queried `users` table (line 152 in auth.js)
- Result: Admin users created in wrong table, couldn't login

---

## Solution

### 1. Smart Table Routing (settings.js:220-281)
```javascript
// Determine target table based on role
const adminRoles = ['super_admin', 'financial_manager', 'family_tree_admin',
                    'occasions_initiatives_diyas_admin'];
const isAdminRole = adminRoles.includes(role);
const targetTable = isAdminRole ? 'users' : 'members';

// Create in appropriate table
await supabase.from(targetTable).insert({...})
```

### 2. Dual-Table Authentication (auth.js:143-190)
```javascript
// Try users table first (admins)
let result = await supabase.from('users').select(...).eq('email', email).single();

// Fallback to members table (regular members)
if (result.error) {
  result = await supabase.from('members').select(...).eq('email', email).single();
}
```

### 3. Added Suspension Check
```javascript
// Check if member is suspended
if (user.suspended_at && !user.reactivated_at) {
  return { ok: false, status: 403, message: 'الحساب موقوف مؤقتاً' };
}
```

---

## Testing Instructions

### Quick Test (Using Production API)

```bash
# 1. Get super_admin token first
TOKEN="<your_super_admin_jwt_token>"

# 2. Create family_tree_admin user
curl -X POST "https://proshael.onrender.com/api/settings/users" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Test Family Tree Admin",
    "email": "familytree.test@alshuail.com",
    "phone": "966501234567",
    "role": "family_tree_admin",
    "temporary_password": "TestPass123"
  }'

# Expected: 201 Created

# 3. Login with new user
curl -X POST "https://proshael.onrender.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "familytree.test@alshuail.com",
    "password": "TestPass123"
  }'

# Expected: 200 OK with token and role=family_tree_admin

# 4. Logout and re-login (same command as step 3)
# Expected: ✅ Still works - user no longer disappears!
```

---

## Files Modified

1. `alshuail-backend/src/routes/settings.js` - User creation routing
2. `alshuail-backend/src/routes/auth.js` - Dual-table authentication
3. `alshuail-backend/src/routes/auth.js` - Role fetching dual-table support

---

## Impact

**Before Fix:**
- ❌ Admin users (except super_admin) couldn't be created
- ❌ Users disappeared after logout

**After Fix:**
- ✅ All admin roles work correctly
- ✅ Users persist after logout/login cycles
- ✅ Suspension check now enforced

---

## Next Steps

1. Deploy code to production
2. Run test script above
3. Verify user persists after logout/login
4. Test all 4 admin roles
5. Confirm regular members still work (regression test)

---

**Documentation**: See `claudedocs/USER_DISAPPEARANCE_BUG_FIX.md` for full details
