# Super Admin Permission Granting Workflow
## Complete Guide for Role Assignment and Permission Management

---

## Executive Summary

This document provides a **comprehensive, step-by-step workflow** for Super Admins to grant permissions to other administrators within the AlShuail Family Management System. It covers the complete process from user registration to permission assignment, with security considerations and audit trails.

**Key Principle**: "*Users must be registered members of the program; Super Admins have the authority to grant permissions to Admins within their assigned scope.*"

---

## Table of Contents

1. [Role Hierarchy and Permissions](#1-role-hierarchy-and-permissions)
2. [Prerequisites](#2-prerequisites)
3. [Step-by-Step Workflow](#3-step-by-step-workflow)
4. [Database Operations](#4-database-operations)
5. [API Endpoints](#5-api-endpoints)
6. [Security Considerations](#6-security-considerations)
7. [Audit Trail](#7-audit-trail)
8. [Common Scenarios](#8-common-scenarios)
9. [Troubleshooting](#9-troubleshooting)
10. [Future UI Implementation](#10-future-ui-implementation)

---

## 1. Role Hierarchy and Permissions

### Role Priority System

| Priority | Role Name | Arabic Name | Scope |
|----------|-----------|-------------|-------|
| 100 | super_admin | مشرف النظام | Full system access, grant/revoke all permissions |
| 80 | financial_manager | مدير مالي | Financial operations, transactions, reports |
| 70 | family_tree_admin | مدير شجرة العائلة | Family tree management, genealogy |
| 60 | occasions_initiatives_diyas_admin | مدير المناسبات والمبادرات والديات | Events, community initiatives, diyat |
| 10 | user_member | عضو عادي | Self-service, view own data only |

### Permission Matrix

| Permission | super_admin | financial_manager | family_tree_admin | occasions_admin | user_member |
|------------|-------------|-------------------|-------------------|-----------------|-------------|
| all_access | ✅ | ❌ | ❌ | ❌ | ❌ |
| manage_users | ✅ | ❌ | ❌ | ❌ | ❌ |
| manage_members | ✅ | ❌ | ❌ | ❌ | ❌ |
| manage_finances | ✅ | ✅ | ❌ | ❌ | ❌ |
| manage_family_tree | ✅ | ❌ | ✅ | ❌ | ❌ |
| manage_occasions | ✅ | ❌ | ❌ | ✅ | ❌ |
| manage_initiatives | ✅ | ❌ | ❌ | ✅ | ❌ |
| manage_diyas | ✅ | ❌ | ❌ | ✅ | ❌ |
| view_reports | ✅ | ✅ | ✅ | ✅ | ❌ |
| system_settings | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 2. Prerequisites

### For the User Being Promoted

✅ **Must be registered** in the `members` table
✅ **Must have verified** email/phone (if email_verified/phone_verified columns exist)
✅ **Must be active**: `is_active = true`
✅ **Must NOT be suspended**: `suspended_at IS NULL` OR `reactivated_at IS NOT NULL`
✅ **Must be family member**: Valid relationship in family tree

### For the Super Admin Granting Permission

✅ **Must be authenticated** with valid JWT token
✅ **Must have role**: `super_admin`
✅ **Must have permission**: `all_access = true` or `manage_users = true`
✅ **Cannot be suspended**

---

## 3. Step-by-Step Workflow

### Phase 1: Verify User Eligibility

**Step 1.1**: Check if user exists and is active

```sql
SELECT
  id,
  email,
  phone,
  full_name_arabic,
  role,
  is_active,
  suspended_at,
  reactivated_at
FROM members
WHERE id = 'USER_ID_HERE'
  AND is_active = true
  AND (suspended_at IS NULL OR reactivated_at IS NOT NULL);
```

**Expected Result**: Should return exactly 1 row with user details.

**Step 1.2**: Verify user is not already at desired role level

```sql
SELECT role, permissions
FROM members
WHERE id = 'USER_ID_HERE';
```

If `role = 'super_admin'`, cannot be changed (prevent accidental demotion).
If `role` equals target role, no action needed (already assigned).

---

### Phase 2: Update User Role

**Step 2.1**: Update the role in members table

```sql
UPDATE members
SET
  role = 'NEW_ROLE_HERE',
  updated_at = NOW()
WHERE id = 'USER_ID_HERE'
  AND is_active = true
  AND role != 'super_admin'; -- Prevent accidental super_admin changes

-- Example: Promote to financial_manager
UPDATE members
SET
  role = 'financial_manager',
  updated_at = NOW()
WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  AND is_active = true;
```

---

### Phase 3: Update User Permissions

**Step 3.1**: Set permissions based on role

```sql
-- For financial_manager
UPDATE members
SET permissions = jsonb_build_object(
  'all_access', false,
  'manage_users', false,
  'manage_members', false,
  'manage_finances', true,
  'manage_family_tree', false,
  'manage_occasions', false,
  'manage_initiatives', false,
  'manage_diyas', false,
  'view_reports', true,
  'system_settings', false
)
WHERE id = 'USER_ID_HERE';

-- For family_tree_admin
UPDATE members
SET permissions = jsonb_build_object(
  'all_access', false,
  'manage_users', false,
  'manage_members', false,
  'manage_finances', false,
  'manage_family_tree', true,
  'manage_occasions', false,
  'manage_initiatives', false,
  'manage_diyas', false,
  'view_reports', true,
  'system_settings', false
)
WHERE id = 'USER_ID_HERE';

-- For occasions_initiatives_diyas_admin
UPDATE members
SET permissions = jsonb_build_object(
  'all_access', false,
  'manage_users', false,
  'manage_members', false,
  'manage_finances', false,
  'manage_family_tree', false,
  'manage_occasions', true,
  'manage_initiatives', true,
  'manage_diyas', true,
  'view_reports', true,
  'system_settings', false
)
WHERE id = 'USER_ID_HERE';
```

**Step 3.2**: Verify permissions were updated

```sql
SELECT
  id,
  email,
  full_name_arabic,
  role,
  permissions
FROM members
WHERE id = 'USER_ID_HERE';
```

---

### Phase 4: Log the Action

**Step 4.1**: Insert audit log entry

```sql
INSERT INTO audit_logs (
  user_id,
  user_email,
  user_role,
  action_type,
  resource_type,
  resource_id,
  details,
  ip_address,
  user_agent,
  created_at
) VALUES (
  'SUPER_ADMIN_ID',
  'admin@alshuail.com',
  'super_admin',
  'role_change',
  'member',
  'TARGET_USER_ID',
  jsonb_build_object(
    'old_role', 'user_member',
    'new_role', 'financial_manager',
    'reason', 'Promoted due to financial expertise'
  ),
  '192.168.1.100',
  'Mozilla/5.0...',
  NOW()
);
```

---

### Phase 5: Notify the User

**Step 5.1**: Send email/SMS notification (if implemented)

```sql
-- Insert notification record
INSERT INTO notifications (
  user_id,
  title_arabic,
  message_arabic,
  type,
  is_read,
  created_at
) VALUES (
  'TARGET_USER_ID',
  'تم ترقية صلاحياتك',
  'تم منحك صلاحيات مدير مالي. يمكنك الآن الوصول إلى إدارة العمليات المالية.',
  'role_change',
  false,
  NOW()
);
```

---

## 4. Database Operations

### Complete Transaction Example

```sql
BEGIN;

-- 1. Verify user eligibility
DO $$
DECLARE
  v_user_id UUID := 'TARGET_USER_ID_HERE';
  v_admin_id UUID := 'SUPER_ADMIN_ID_HERE';
  v_new_role VARCHAR := 'financial_manager';
  v_old_role VARCHAR;
  v_is_eligible BOOLEAN;
BEGIN
  -- Check if user exists and is eligible
  SELECT
    role,
    (is_active = true AND (suspended_at IS NULL OR reactivated_at IS NOT NULL))
  INTO v_old_role, v_is_eligible
  FROM members
  WHERE id = v_user_id;

  IF NOT v_is_eligible THEN
    RAISE EXCEPTION 'User is not eligible for role change';
  END IF;

  IF v_old_role = 'super_admin' THEN
    RAISE EXCEPTION 'Cannot change super_admin role';
  END IF;

  -- 2. Update role
  UPDATE members
  SET
    role = v_new_role,
    updated_at = NOW()
  WHERE id = v_user_id;

  -- 3. Update permissions based on new role
  UPDATE members
  SET permissions =
    CASE v_new_role
      WHEN 'financial_manager' THEN jsonb_build_object(
        'all_access', false,
        'manage_finances', true,
        'view_reports', true
      )
      WHEN 'family_tree_admin' THEN jsonb_build_object(
        'all_access', false,
        'manage_family_tree', true,
        'view_reports', true
      )
      WHEN 'occasions_initiatives_diyas_admin' THEN jsonb_build_object(
        'all_access', false,
        'manage_occasions', true,
        'manage_initiatives', true,
        'manage_diyas', true,
        'view_reports', true
      )
      ELSE jsonb_build_object('all_access', false)
    END
  WHERE id = v_user_id;

  -- 4. Log the action
  INSERT INTO audit_logs (
    user_id,
    action_type,
    resource_type,
    resource_id,
    details
  ) VALUES (
    v_admin_id,
    'role_change',
    'member',
    v_user_id,
    jsonb_build_object(
      'old_role', v_old_role,
      'new_role', v_new_role
    )
  );

  RAISE NOTICE 'Role changed successfully from % to %', v_old_role, v_new_role;
END $$;

COMMIT;
```

---

## 5. API Endpoints

### Current Implementation

The backend currently supports role management through the members API:

**Endpoint**: `PUT /api/members/:id/role`

**Authentication**: Required (JWT Bearer token)
**Authorization**: super_admin only

**Request**:
```http
PUT https://proshael.onrender.com/api/members/a1b2c3d4-e5f6-7890-abcd-ef1234567890/role
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "role": "financial_manager",
  "reason": "Promoted due to financial expertise"
}
```

**Response (Success)**:
```json
{
  "success": true,
  "message": "تم تحديث صلاحيات العضو بنجاح",
  "member": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "member@alshuail.com",
    "role": "financial_manager",
    "permissions": {
      "all_access": false,
      "manage_finances": true,
      "view_reports": true
    }
  }
}
```

**Response (Error)**:
```json
{
  "success": false,
  "error": "Cannot modify super_admin role",
  "code": "FORBIDDEN_OPERATION"
}
```

### Future Enhanced Endpoint (Recommended)

**Endpoint**: `POST /api/admin/grant-permissions`

**Request**:
```json
{
  "member_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "new_role": "financial_manager",
  "permissions": {
    "manage_finances": true,
    "view_reports": true
  },
  "reason": "Promoted due to financial expertise",
  "notify_user": true
}
```

---

## 6. Security Considerations

### Access Control Checks

✅ **Authentication**: Verify JWT token is valid and not expired
✅ **Authorization**: Verify requester has super_admin role
✅ **Suspension Check**: Verify super_admin is not suspended
✅ **Target Validation**: Verify target user exists and is active
✅ **Self-Protection**: Prevent super_admin from demoting themselves
✅ **Role Protection**: Prevent modification of other super_admins

### SQL Injection Prevention

```javascript
// ✅ CORRECT: Parameterized query
const { data, error } = await supabase
  .from('members')
  .update({ role: newRole })
  .eq('id', memberId);

// ❌ WRONG: String concatenation (vulnerable)
const query = `UPDATE members SET role='${newRole}' WHERE id='${memberId}'`;
```

### Rate Limiting

```javascript
// Recommended: Limit role changes per admin per hour
const rateLimitKey = `role_change:${adminId}`;
const maxChanges = 10; // per hour
const ttl = 3600; // 1 hour in seconds

// Check rate limit before processing
if (await redisClient.get(rateLimitKey) >= maxChanges) {
  return res.status(429).json({
    success: false,
    error: 'تجاوزت الحد الأقصى لتغييرات الصلاحيات في الساعة'
  });
}

// Increment counter
await redisClient.incr(rateLimitKey);
await redisClient.expire(rateLimitKey, ttl);
```

---

## 7. Audit Trail

### What to Log

Every permission change MUST be logged with:

1. **Who**: Super admin ID, email, role
2. **What**: Action type (role_change, permission_grant, permission_revoke)
3. **When**: Timestamp (automatic)
4. **Where**: IP address, user agent
5. **Why**: Reason provided by admin
6. **Target**: Member ID, old role, new role

### Audit Log Query

```sql
-- View all role changes
SELECT
  al.created_at,
  m_admin.full_name_arabic as admin_name,
  al.action_type,
  m_target.full_name_arabic as target_name,
  al.details->>'old_role' as old_role,
  al.details->>'new_role' as new_role,
  al.details->>'reason' as reason
FROM audit_logs al
JOIN members m_admin ON al.user_id = m_admin.id
JOIN members m_target ON al.resource_id = m_target.id
WHERE al.action_type = 'role_change'
ORDER BY al.created_at DESC
LIMIT 50;
```

### Audit Report for Member

```sql
-- View all permission changes for specific member
SELECT
  created_at,
  action_type,
  details->>'old_role' as previous_role,
  details->>'new_role' as current_role,
  details->>'reason' as reason
FROM audit_logs
WHERE resource_type = 'member'
  AND resource_id = 'TARGET_MEMBER_ID'
  AND action_type IN ('role_change', 'permission_grant', 'permission_revoke')
ORDER BY created_at DESC;
```

---

## 8. Common Scenarios

### Scenario 1: Promote Regular Member to Financial Manager

**Context**: Regular member has accounting background, needs financial access

**Steps**:
```sql
-- 1. Verify member
SELECT id, email, full_name_arabic, role
FROM members
WHERE email = 'finance.expert@alshuail.com';

-- 2. Update role and permissions
UPDATE members
SET
  role = 'financial_manager',
  permissions = jsonb_build_object(
    'all_access', false,
    'manage_finances', true,
    'view_reports', true
  ),
  updated_at = NOW()
WHERE email = 'finance.expert@alshuail.com'
  AND role != 'super_admin';

-- 3. Log action
INSERT INTO audit_logs (user_id, action_type, details)
VALUES (
  'SUPER_ADMIN_ID',
  'role_change',
  jsonb_build_object(
    'target_email', 'finance.expert@alshuail.com',
    'old_role', 'user_member',
    'new_role', 'financial_manager',
    'reason', 'Has accounting certification and 5 years experience'
  )
);
```

---

### Scenario 2: Assign Family Tree Management Rights

**Context**: Senior family member needs to manage genealogy

**Steps**:
```sql
UPDATE members
SET
  role = 'family_tree_admin',
  permissions = jsonb_build_object(
    'all_access', false,
    'manage_family_tree', true,
    'view_reports', true
  ),
  updated_at = NOW()
WHERE id = 'MEMBER_ID_HERE'
  AND is_active = true;
```

---

### Scenario 3: Grant Multiple Permissions to Events Coordinator

**Context**: Member will manage occasions, initiatives, and diyat

**Steps**:
```sql
UPDATE members
SET
  role = 'occasions_initiatives_diyas_admin',
  permissions = jsonb_build_object(
    'all_access', false,
    'manage_occasions', true,
    'manage_initiatives', true,
    'manage_diyas', true,
    'view_reports', true
  ),
  updated_at = NOW()
WHERE id = 'MEMBER_ID_HERE';
```

---

### Scenario 4: Demote Admin Back to Regular Member

**Context**: Admin role no longer needed

**Steps**:
```sql
UPDATE members
SET
  role = 'user_member',
  permissions = jsonb_build_object('all_access', false),
  updated_at = NOW()
WHERE id = 'ADMIN_ID_HERE'
  AND role != 'super_admin'; -- Protect super_admin from demotion

-- Log demotion
INSERT INTO audit_logs (user_id, action_type, details)
VALUES (
  'SUPER_ADMIN_ID',
  'role_change',
  jsonb_build_object(
    'old_role', 'financial_manager',
    'new_role', 'user_member',
    'reason', 'Admin role term ended'
  )
);
```

---

### Scenario 5: Temporarily Suspend Admin (Not Demote)

**Context**: Admin under investigation, suspend access but keep role

**Steps**:
```sql
-- Suspend (keeps role, removes access)
UPDATE members
SET
  suspended_at = NOW(),
  suspended_by = 'SUPER_ADMIN_ID',
  suspension_reason = 'Under investigation for policy violation',
  updated_at = NOW()
WHERE id = 'ADMIN_ID_HERE';

-- Later: Reactivate
UPDATE members
SET
  reactivated_at = NOW(),
  reactivated_by = 'SUPER_ADMIN_ID',
  reactivation_notes = 'Investigation cleared, reinstating access',
  updated_at = NOW()
WHERE id = 'ADMIN_ID_HERE';
```

---

## 9. Troubleshooting

### Issue 1: "User not found" Error

**Cause**: Member ID doesn't exist in database
**Solution**:
```sql
-- Verify member exists
SELECT id, email, full_name_arabic FROM members WHERE email = 'user@example.com';
```

---

### Issue 2: "Cannot change super_admin role" Error

**Cause**: Attempting to modify a super_admin
**Solution**: Super admins can only be managed directly in database by database admins. Contact system administrator.

---

### Issue 3: Permission Change Not Reflected

**Cause**: User needs to log out and log back in for new JWT token
**Solution**:
1. User logs out
2. User logs back in
3. New JWT token includes updated role and permissions

---

### Issue 4: Audit Log Not Created

**Cause**: Audit logging failed but role change succeeded
**Solution**: Manually create audit log entry:
```sql
INSERT INTO audit_logs (user_id, action_type, resource_type, resource_id, details)
VALUES (
  'SUPER_ADMIN_ID',
  'role_change',
  'member',
  'TARGET_MEMBER_ID',
  jsonb_build_object('old_role', 'OLD_ROLE', 'new_role', 'NEW_ROLE', 'reason', 'REASON')
);
```

---

## 10. Future UI Implementation

### Recommended Admin Interface

**Page**: `/admin/manage-permissions`

**Features**:
1. **Member Search**
   - Search by name, email, phone
   - Filter by current role
   - Filter by active/suspended status

2. **Permission Editor**
   - Dropdown for role selection
   - Checkboxes for granular permissions (if needed)
   - Reason text field (required)
   - Preview of permission changes

3. **Confirmation Dialog**
   - Show member details
   - Show old vs new role
   - Show permission changes
   - Require confirmation

4. **Audit Trail Viewer**
   - View history of permission changes
   - Filter by admin, target member, date range
   - Export audit logs

### Wireframe Concept

```
┌─────────────────────────────────────────────┐
│  Manage User Permissions                    │
├─────────────────────────────────────────────┤
│  Search: [_______________] 🔍               │
│  Filter: [All Roles ▼] [Active Only ☑]    │
├─────────────────────────────────────────────┤
│  📋 Members List                            │
│  ┌──────────────────────────────────────┐  │
│  │ Ahmed Al-Shuail                      │  │
│  │ ahmed@alshuail.com                   │  │
│  │ Current Role: user_member            │  │
│  │ [Change Permissions] [View History]  │  │
│  ├──────────────────────────────────────┤  │
│  │ Fatima Al-Shuail                     │  │
│  │ fatima@alshuail.com                  │  │
│  │ Current Role: financial_manager      │  │
│  │ [Change Permissions] [View History]  │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘

When "Change Permissions" clicked:

┌─────────────────────────────────────────────┐
│  Change Permissions for Ahmed Al-Shuail     │
├─────────────────────────────────────────────┤
│  Current Role: user_member                  │
│  New Role: [Select Role ▼]                 │
│           ├─ financial_manager              │
│           ├─ family_tree_admin              │
│           └─ occasions_admin                │
│                                             │
│  Reason (required):                         │
│  [_____________________________________]    │
│                                             │
│  Permissions Preview:                       │
│  ┌──────────────────────────────────────┐  │
│  │ ✅ Manage Finances                   │  │
│  │ ✅ View Reports                      │  │
│  │ ❌ Manage Family Tree                │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  [Cancel]  [Confirm Change]                │
└─────────────────────────────────────────────┘
```

---

## 11. API Implementation Reference

### Backend Route Example (Node.js/Express)

```javascript
// src/routes/admin.js
import express from 'express';
import { supabase } from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Change user role - Super Admin only
router.put('/members/:memberId/role',
  authenticateToken,
  requireRole(['super_admin']),
  async (req, res) => {
    try {
      const { memberId } = req.params;
      const { new_role, reason } = req.body;
      const adminId = req.user.id;

      // Validate input
      if (!new_role || !reason) {
        return res.status(400).json({
          success: false,
          error: 'الدور الجديد والسبب مطلوبان'
        });
      }

      const validRoles = [
        'user_member',
        'financial_manager',
        'family_tree_admin',
        'occasions_initiatives_diyas_admin'
      ];

      if (!validRoles.includes(new_role)) {
        return res.status(400).json({
          success: false,
          error: 'الدور المحدد غير صحيح'
        });
      }

      // Get current member data
      const { data: currentMember, error: fetchError } = await supabase
        .from('members')
        .select('id, role, is_active, suspended_at, reactivated_at')
        .eq('id', memberId)
        .single();

      if (fetchError || !currentMember) {
        return res.status(404).json({
          success: false,
          error: 'العضو غير موجود'
        });
      }

      // Check if member is eligible
      if (!currentMember.is_active) {
        return res.status(400).json({
          success: false,
          error: 'العضو غير نشط'
        });
      }

      if (currentMember.suspended_at && !currentMember.reactivated_at) {
        return res.status(400).json({
          success: false,
          error: 'العضو موقوف حالياً'
        });
      }

      // Prevent changing super_admin role
      if (currentMember.role === 'super_admin') {
        return res.status(403).json({
          success: false,
          error: 'لا يمكن تعديل صلاحيات المشرف العام'
        });
      }

      // Define permissions based on role
      const rolePermissions = {
        user_member: {
          all_access: false
        },
        financial_manager: {
          all_access: false,
          manage_finances: true,
          view_reports: true
        },
        family_tree_admin: {
          all_access: false,
          manage_family_tree: true,
          view_reports: true
        },
        occasions_initiatives_diyas_admin: {
          all_access: false,
          manage_occasions: true,
          manage_initiatives: true,
          manage_diyas: true,
          view_reports: true
        }
      };

      // Update role and permissions
      const { data: updatedMember, error: updateError } = await supabase
        .from('members')
        .update({
          role: new_role,
          permissions: rolePermissions[new_role],
          updated_at: new Date().toISOString()
        })
        .eq('id', memberId)
        .select()
        .single();

      if (updateError) {
        return res.status(500).json({
          success: false,
          error: 'فشل تحديث الصلاحيات'
        });
      }

      // Log the action
      await supabase
        .from('audit_logs')
        .insert({
          user_id: adminId,
          user_email: req.user.email,
          user_role: req.user.role,
          action_type: 'role_change',
          resource_type: 'member',
          resource_id: memberId,
          details: {
            old_role: currentMember.role,
            new_role: new_role,
            reason: reason
          },
          ip_address: req.ip
        });

      return res.json({
        success: true,
        message: 'تم تحديث صلاحيات العضو بنجاح',
        member: {
          id: updatedMember.id,
          email: updatedMember.email,
          role: updatedMember.role,
          permissions: updatedMember.permissions
        }
      });

    } catch (error) {
      console.error('Error changing member role:', error);
      return res.status(500).json({
        success: false,
        error: 'خطأ في الخادم'
      });
    }
  }
);

export default router;
```

---

## 12. Summary Checklist

### For Super Admin Granting Permissions

- [ ] Verify member is registered and active
- [ ] Verify member is not suspended
- [ ] Determine appropriate role based on responsibilities
- [ ] Update member role in database
- [ ] Update member permissions based on role
- [ ] Log the permission change in audit_logs
- [ ] (Optional) Notify the member via email/SMS
- [ ] Verify member logs out and back in for new token
- [ ] Confirm member can access new features

### For System Implementation

- [ ] Role change API endpoint implemented
- [ ] Role validation logic in place
- [ ] Permission mapping defined for each role
- [ ] Audit logging functional
- [ ] RLS policies enforcing role-based access
- [ ] Frontend UI for role management (future)
- [ ] Email/SMS notification system (future)

---

## 13. Related Documentation

- **Main Settings Fix**: `D:\PROShael\claudedocs\SETTINGS_SYSTEM_FIX_COMPLETE.md`
- **QA Verification**: `D:\PROShael\claudedocs\QA_VERIFICATION_REPORT.md`
- **RBAC Schema**: `D:\PROShael\alshuail-backend\src\database\rbac-schema.sql`
- **Suspension System**: `D:\PROShael\alshuail-backend\migrations\20250124_add_suspension_and_super_admin_system.sql`

---

**Document Version**: 1.0
**Last Updated**: 2025-02-07
**Status**: ✅ Complete and Ready for Implementation
