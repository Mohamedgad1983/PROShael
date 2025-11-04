# Member Suspension System - Complete Implementation Plan
## تخطيط كامل لنظام إيقاف الأعضاء

**Date**: 2025-01-24
**Status**: Ready for Phase 3-5 Implementation
**Previous**: Phase 1 (Database) ✅ | Phase 2 (UI) ✅

---

## 📊 System Overview

### What's Been Done:
1. ✅ Database schema with suspension tracking
2. ✅ Super admin role system
3. ✅ Dashboard UI with suspend/activate buttons
4. ✅ Placeholder JavaScript functions

### What Needs Implementation:
1. ⏳ Backend API endpoints
2. ⏳ Super admin authorization middleware
3. ⏳ Mobile app authentication check
4. ⏳ Dashboard API integration
5. ⏳ End-to-end testing

---

## 🔧 Phase 3: Backend API Implementation

### File 1: Super Admin Authorization Middleware

**Location**: `alshuail-backend/src/middleware/superAdminAuth.js`

```javascript
import { supabase } from '../config/database.js';
import { log } from '../utils/logger.js';

/**
 * Middleware to check if authenticated user is a super admin
 * Must be used AFTER authenticateToken middleware
 */
export const requireSuperAdmin = async (req, res, next) => {
  try {
    // Get user info from authenticateToken middleware
    const userId = req.user?.id;
    const userEmail = req.user?.email;

    if (!userId && !userEmail) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'يجب تسجيل الدخول أولاً',
        message_en: 'Authentication required'
      });
    }

    // Check if user has super_admin role
    const { data: user, error } = await supabase
      .from('users')
      .select('role, email')
      .eq('id', userId)
      .single();

    if (error) {
      log.error('[SuperAdmin] Error checking role:', { error, userId });
      return res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'خطأ في التحقق من الصلاحيات'
      });
    }

    if (user.role !== 'super_admin') {
      log.warn('[SuperAdmin] Access denied:', {
        userId,
        email: user.email,
        role: user.role,
        path: req.path
      });

      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'هذه العملية متاحة للمشرف العام فقط',
        message_en: 'Super admin access required',
        requiredRole: 'super_admin',
        currentRole: user.role
      });
    }

    // User is super admin, attach to request
    req.superAdmin = {
      id: userId,
      email: user.email,
      role: user.role
    };

    log.info('[SuperAdmin] Access granted:', {
      userId,
      email: user.email,
      path: req.path
    });

    next();
  } catch (error) {
    log.error('[SuperAdmin] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'خطأ في الخادم'
    });
  }
};

/**
 * Check if a user email is super admin (utility function)
 */
export const isSuperAdmin = async (email) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('email', email)
      .single();

    if (error) return false;
    return data?.role === 'super_admin';
  } catch (error) {
    log.error('[SuperAdmin] Check error:', error);
    return false;
  }
};
```

---

### File 2: Member Suspension Controller

**Location**: `alshuail-backend/src/controllers/memberSuspensionController.js`

```javascript
import { supabase } from '../config/database.js';
import { log } from '../utils/logger.js';

/**
 * Suspend a member (Super Admin only)
 * POST /api/members/:memberId/suspend
 */
export const suspendMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { reason } = req.body;
    const superAdmin = req.superAdmin; // From requireSuperAdmin middleware

    // Validate inputs
    if (!memberId) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'معرف العضو مطلوب'
      });
    }

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'يجب إدخال سبب الإيقاف'
      });
    }

    // Check if member exists
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, full_name_arabic, membership_status')
      .eq('id', memberId)
      .single();

    if (memberError || !member) {
      return res.status(404).json({
        success: false,
        error: 'MEMBER_NOT_FOUND',
        message: 'العضو غير موجود'
      });
    }

    // Check if already suspended
    if (member.membership_status === 'suspended') {
      return res.status(400).json({
        success: false,
        error: 'ALREADY_SUSPENDED',
        message: 'العضو موقوف بالفعل'
      });
    }

    // Suspend the member
    const { data: updatedMember, error: updateError } = await supabase
      .from('members')
      .update({
        membership_status: 'suspended',
        suspended_at: new Date().toISOString(),
        suspended_by: superAdmin.id,
        suspension_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId)
      .select()
      .single();

    if (updateError) {
      log.error('[Suspend] Database error:', { updateError, memberId });
      return res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'خطأ في إيقاف العضو'
      });
    }

    log.info('[Suspend] Member suspended successfully:', {
      memberId,
      memberName: member.full_name_arabic,
      suspendedBy: superAdmin.email,
      reason
    });

    // Return success
    res.json({
      success: true,
      message: 'تم إيقاف العضو بنجاح',
      data: {
        member: {
          id: updatedMember.id,
          name: updatedMember.full_name_arabic,
          status: updatedMember.membership_status,
          suspended_at: updatedMember.suspended_at,
          suspended_by: superAdmin.email,
          suspension_reason: updatedMember.suspension_reason
        }
      }
    });

  } catch (error) {
    log.error('[Suspend] Unexpected error:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'خطأ في الخادم'
    });
  }
};

/**
 * Activate a suspended member (Super Admin only)
 * POST /api/members/:memberId/activate
 */
export const activateMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { notes } = req.body;
    const superAdmin = req.superAdmin;

    // Validate inputs
    if (!memberId) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'معرف العضو مطلوب'
      });
    }

    // Check if member exists
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, full_name_arabic, membership_status')
      .eq('id', memberId)
      .single();

    if (memberError || !member) {
      return res.status(404).json({
        success: false,
        error: 'MEMBER_NOT_FOUND',
        message: 'العضو غير موجود'
      });
    }

    // Check if actually suspended
    if (member.membership_status !== 'suspended') {
      return res.status(400).json({
        success: false,
        error: 'NOT_SUSPENDED',
        message: 'العضو غير موقوف'
      });
    }

    // Activate the member
    const { data: updatedMember, error: updateError } = await supabase
      .from('members')
      .update({
        membership_status: 'active',
        reactivated_at: new Date().toISOString(),
        reactivated_by: superAdmin.id,
        reactivation_notes: notes || 'تم التفعيل بواسطة المشرف العام',
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId)
      .select()
      .single();

    if (updateError) {
      log.error('[Activate] Database error:', { updateError, memberId });
      return res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'خطأ في تفعيل العضو'
      });
    }

    log.info('[Activate] Member activated successfully:', {
      memberId,
      memberName: member.full_name_arabic,
      activatedBy: superAdmin.email,
      notes
    });

    // Return success
    res.json({
      success: true,
      message: 'تم تفعيل العضو بنجاح',
      data: {
        member: {
          id: updatedMember.id,
          name: updatedMember.full_name_arabic,
          status: updatedMember.membership_status,
          reactivated_at: updatedMember.reactivated_at,
          reactivated_by: superAdmin.email,
          reactivation_notes: updatedMember.reactivation_notes
        }
      }
    });

  } catch (error) {
    log.error('[Activate] Unexpected error:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'خطأ في الخادم'
    });
  }
};

/**
 * Get suspension history for a member
 * GET /api/members/:memberId/suspension-history
 */
export const getSuspensionHistory = async (req, res) => {
  try {
    const { memberId } = req.params;

    const { data: member, error } = await supabase
      .from('members')
      .select(`
        id,
        full_name_arabic,
        membership_status,
        suspended_at,
        suspended_by,
        suspension_reason,
        reactivated_at,
        reactivated_by,
        reactivation_notes
      `)
      .eq('id', memberId)
      .single();

    if (error || !member) {
      return res.status(404).json({
        success: false,
        error: 'MEMBER_NOT_FOUND',
        message: 'العضو غير موجود'
      });
    }

    res.json({
      success: true,
      data: {
        member: {
          id: member.id,
          name: member.full_name_arabic,
          current_status: member.membership_status
        },
        suspension_info: member.suspended_at ? {
          suspended_at: member.suspended_at,
          suspended_by: member.suspended_by,
          reason: member.suspension_reason,
          reactivated_at: member.reactivated_at,
          reactivated_by: member.reactivated_by,
          notes: member.reactivation_notes
        } : null
      }
    });

  } catch (error) {
    log.error('[SuspensionHistory] Error:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'خطأ في الخادم'
    });
  }
};
```

---

### File 3: Suspension Routes

**Location**: `alshuail-backend/src/routes/memberSuspensionRoutes.js`

```javascript
import express from 'express';
import {
  suspendMember,
  activateMember,
  getSuspensionHistory
} from '../controllers/memberSuspensionController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/superAdminAuth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/members/:memberId/suspend
 * @desc    Suspend a member (Super Admin only)
 * @access  Super Admin
 */
router.post('/:memberId/suspend', requireSuperAdmin, suspendMember);

/**
 * @route   POST /api/members/:memberId/activate
 * @desc    Activate a suspended member (Super Admin only)
 * @access  Super Admin
 */
router.post('/:memberId/activate', requireSuperAdmin, activateMember);

/**
 * @route   GET /api/members/:memberId/suspension-history
 * @desc    Get suspension history for a member
 * @access  Authenticated (Admin)
 */
router.get('/:memberId/suspension-history', getSuspensionHistory);

export default router;
```

---

### File 4: Register Routes in Server.js

**Location**: `alshuail-backend/server.js`

Add this import at the top with other route imports:
```javascript
import memberSuspensionRoutes from './src/routes/memberSuspensionRoutes.js';
```

Add this line with other route registrations (around line 257):
```javascript
app.use('/api/members', memberSuspensionRoutes);
```

---

## 📱 Phase 4: Mobile App Authentication Check

### File: Mobile Auth Middleware Update

**Location**: `alshuail-backend/src/middleware/auth.js`

Add this function after `authenticateToken`:

```javascript
/**
 * Check if member is suspended and block login
 * Use this in mobile app login endpoints
 */
export const checkMemberSuspension = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email;

    if (!userId && !userEmail) {
      return next(); // No user to check, proceed
    }

    // Find member record by user ID or email
    const { data: member, error } = await supabase
      .from('members')
      .select('id, full_name_arabic, membership_status, suspended_at, suspension_reason')
      .or(`user_id.eq.${userId},email.eq.${userEmail}`)
      .single();

    if (error && error.code !== 'PGRST116') {
      // Error other than "not found"
      log.error('[SuspensionCheck] Database error:', error);
      return next(); // Allow login on error (fail open)
    }

    // If member is suspended, block login
    if (member && member.membership_status === 'suspended') {
      log.warn('[SuspensionCheck] Suspended member attempted login:', {
        memberId: member.id,
        memberName: member.full_name_arabic,
        suspendedAt: member.suspended_at
      });

      return res.status(403).json({
        success: false,
        error: 'ACCOUNT_SUSPENDED',
        message: 'تم إيقاف حسابك. للمزيد من المعلومات، يرجى التواصل مع الإدارة.',
        message_en: 'Your account has been suspended. Please contact administration.',
        suspended_at: member.suspended_at,
        reason: member.suspension_reason
      });
    }

    // Member is not suspended or doesn't exist, allow login
    next();
  } catch (error) {
    log.error('[SuspensionCheck] Unexpected error:', error);
    next(); // Allow login on unexpected error (fail open)
  }
};
```

### Apply to Mobile Login Endpoints

In your mobile auth routes, add the check:

```javascript
// Example: Mobile app login
router.post('/mobile/login',
  authenticateToken,
  checkMemberSuspension, // Add this check
  async (req, res) => {
    // Your login logic here
  }
);
```

---

## 🖥️ Phase 5: Dashboard API Integration

### File: Update Monitoring Dashboard JavaScript

**Location**: `alshuail-admin-arabic/public/monitoring-standalone/index.html`

Replace the placeholder functions (around line 2866-2877):

```javascript
async function suspendMember(memberId) {
    const member = allMembers.find(m => (m.member_number || m.id) === memberId);
    const memberName = member ? (member.full_name_arabic || member.name) : 'العضو';

    const reason = prompt(
        `إيقاف العضو: ${memberName}\n\n` +
        `يرجى إدخال سبب الإيقاف:\n` +
        `(سيتم إخطار العضو ولن يتمكن من الدخول للتطبيق)`
    );

    if (!reason || reason.trim() === '') {
        alert('⚠️ يجب إدخال سبب الإيقاف');
        return;
    }

    if (!confirm(`تأكيد إيقاف العضو: ${memberName}?\n\nالسبب: ${reason}\n\nملاحظة: فقط المشرف العام يمكنه إعادة التفعيل.`)) {
        return;
    }

    try {
        // Show loading
        const btn = event.target.closest('button');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        // Call API to suspend member
        const response = await fetch(`https://proshael.onrender.com/api/members/${memberId}/suspend`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ reason })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'فشل في إيقاف العضو');
        }

        // Success
        alert(`✅ ${result.message}\n\nالعضو: ${memberName}\nالحالة: موقوف`);

        // Refresh dashboard
        await initDashboard();

    } catch (error) {
        console.error('[Suspend] Error:', error);

        // Show error based on type
        if (error.message.includes('FORBIDDEN')) {
            alert('⚠️ عذراً، هذه العملية متاحة للمشرف العام فقط');
        } else if (error.message.includes('ALREADY_SUSPENDED')) {
            alert('⚠️ العضو موقوف بالفعل');
        } else {
            alert(`❌ خطأ: ${error.message}`);
        }

        // Restore button
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-ban"></i>';
    }
}

async function activateMember(memberId) {
    const member = allMembers.find(m => (m.member_number || m.id) === memberId);
    const memberName = member ? (member.full_name_arabic || member.name) : 'العضو';

    const notes = prompt(
        `تفعيل العضو: ${memberName}\n\n` +
        `يرجى إدخال ملاحظات (اختياري):`
    );

    if (!confirm(`تأكيد تفعيل العضو: ${memberName}?`)) {
        return;
    }

    try {
        // Show loading
        const btn = event.target.closest('button');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        // Call API to activate member
        const response = await fetch(`https://proshael.onrender.com/api/members/${memberId}/activate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ notes: notes || 'تم التفعيل بواسطة المشرف العام' })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'فشل في تفعيل العضو');
        }

        // Success
        alert(`✅ ${result.message}\n\nالعضو: ${memberName}\nالحالة: نشط`);

        // Refresh dashboard
        await initDashboard();

    } catch (error) {
        console.error('[Activate] Error:', error);

        // Show error based on type
        if (error.message.includes('FORBIDDEN')) {
            alert('⚠️ عذراً، هذه العملية متاحة للمشرف العام فقط');
        } else if (error.message.includes('NOT_SUSPENDED')) {
            alert('⚠️ العضو غير موقوف');
        } else {
            alert(`❌ خطأ: ${error.message}`);
        }

        // Restore button
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check"></i>';
    }
}
```

---

## 🧪 Phase 6: Testing Workflow

### Test 1: Super Admin Authorization
```bash
# Try to suspend as regular admin (should fail)
curl -X POST https://proshael.onrender.com/api/members/MEMBER_ID/suspend \
  -H "Authorization: Bearer REGULAR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Test"}'

# Expected: 403 Forbidden - "هذه العملية متاحة للمشرف العام فقط"
```

### Test 2: Suspend Member
```bash
# Suspend as super admin (should succeed)
curl -X POST https://proshael.onrender.com/api/members/MEMBER_ID/suspend \
  -H "Authorization: Bearer SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "عدم سداد الاشتراكات"}'

# Expected: 200 OK - Member suspended successfully
```

### Test 3: Mobile App Login Block
```bash
# Try to login with suspended member account
curl -X POST https://proshael.onrender.com/api/auth/mobile/login \
  -H "Content-Type: application/json" \
  -d '{"email": "suspended@member.com", "password": "pass"}'

# Expected: 403 Forbidden - "تم إيقاف حسابك"
```

### Test 4: Activate Member
```bash
# Activate suspended member as super admin
curl -X POST https://proshael.onrender.com/api/members/MEMBER_ID/activate \
  -H "Authorization: Bearer SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notes": "تم حل المشكلة"}'

# Expected: 200 OK - Member activated successfully
```

### Test 5: Dashboard UI
1. Login as super admin to dashboard
2. Find active member → Click suspend → Enter reason → Confirm
3. Verify member shows as "موقوف" with Activate button
4. Click Activate → Enter notes → Confirm
5. Verify member shows as "نشط" with Suspend button

---

## 📊 Implementation Checklist

### Backend (Phase 3):
- [ ] Create `superAdminAuth.js` middleware
- [ ] Create `memberSuspensionController.js` controller
- [ ] Create `memberSuspensionRoutes.js` routes
- [ ] Register routes in `server.js`
- [ ] Test endpoints with Postman/curl

### Mobile App (Phase 4):
- [ ] Add `checkMemberSuspension` to auth middleware
- [ ] Apply to mobile login endpoints
- [ ] Test with suspended member account
- [ ] Verify error message in Arabic

### Dashboard (Phase 5):
- [ ] Update `suspendMember()` function with API call
- [ ] Update `activateMember()` function with API call
- [ ] Add loading states and error handling
- [ ] Test in browser with real accounts

### Testing (Phase 6):
- [ ] Test super admin authorization
- [ ] Test suspend workflow end-to-end
- [ ] Test activate workflow end-to-end
- [ ] Test mobile app login block
- [ ] Test error scenarios

---

## 🎯 Success Criteria

### Functional Requirements:
✅ Only super admins can suspend/activate members
✅ Suspended members cannot login to mobile app
✅ Dashboard shows suspend/activate buttons correctly
✅ Suspension reason is required and stored
✅ Activation notes are optional but stored
✅ All actions are logged with timestamp and admin ID

### User Experience:
✅ Clear Arabic error messages
✅ Confirmation dialogs before actions
✅ Loading states during API calls
✅ Dashboard refreshes after successful action
✅ Appropriate success/error notifications

### Security:
✅ JWT authentication required
✅ Super admin role verification
✅ Input validation on backend
✅ SQL injection prevention (Supabase handles)
✅ Audit trail (who, when, why)

---

## 📝 Notes for Implementation

### Important Considerations:
1. **Token Management**: Ensure dashboard has valid JWT token with super_admin role
2. **Error Handling**: Always show user-friendly Arabic messages
3. **Loading States**: Disable buttons during API calls to prevent double-clicks
4. **Data Refresh**: Always refresh dashboard after successful suspend/activate
5. **Logging**: Use Winston logger for all suspension actions (audit trail)

### Future Enhancements:
- Email notification to suspended member
- SMS notification option
- Suspension history log (multiple suspensions)
- Bulk suspend/activate operations
- Scheduled automatic unsuspension
- Member appeal system

---

## 🚀 Deployment Steps

1. **Backend Deployment**:
   ```bash
   cd alshuail-backend
   git add .
   git commit -m "feat: Add member suspension system with super admin authorization"
   git push origin main
   # Render will auto-deploy
   ```

2. **Frontend Deployment**:
   ```bash
   cd alshuail-admin-arabic
   npm run build
   wrangler pages deploy build --project-name alshuail-admin
   ```

3. **Verification**:
   - Check backend logs on Render for successful deployment
   - Test API endpoints with Postman
   - Test dashboard UI in production
   - Test mobile app login with suspended account

---

**Report Generated**: 2025-01-24
**Status**: Ready for Implementation
**Estimated Time**: 4-6 hours for complete implementation and testing
