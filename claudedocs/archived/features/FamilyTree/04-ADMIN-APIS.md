# 04-ADMIN-APIS.md
# Al-Shuail Admin Management APIs - Claude Code Instructions

## 📋 OVERVIEW

Create comprehensive admin management APIs for:
- Member approval workflow
- Subdivision (فخوذ) assignment
- Role-based access control
- Admin operations audit logging

**Prerequisites**: Files 01, 02, 03 completed

---

## 🎯 IMPLEMENTATION CHECKLIST

```
□ Admin authentication endpoints
□ Member approval APIs
□ Subdivision management
□ User role management
□ Audit logging system
□ Admin dashboard statistics
```

---

## 📁 FILE STRUCTURE TO CREATE

```
backend/
├── routes/
│   ├── admin.routes.js          ← Create this
│   └── approval.routes.js       ← Create this
├── controllers/
│   ├── admin.controller.js      ← Create this
│   └── approval.controller.js   ← Create this
├── middleware/
│   ├── auth.middleware.js       ← Update from 03
│   └── rbac.middleware.js       ← Create this (Role-Based Access)
└── utils/
    └── audit-logger.js          ← Create this
```

---

## STEP 1: ROLE-BASED ACCESS CONTROL MIDDLEWARE

### File: `backend/middleware/rbac.middleware.js`

```javascript
// Role-Based Access Control Middleware
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Role hierarchy
const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  FINANCIAL_MANAGER: 'financial_manager',
  FAMILY_TREE_MANAGER: 'family_tree_manager',
  VIEWER: 'viewer'
};

// Permission sets
const PERMISSIONS = {
  MANAGE_MEMBERS: 'manage_members',
  APPROVE_MEMBERS: 'approve_members',
  MANAGE_FINANCES: 'manage_finances',
  MANAGE_FAMILY_TREE: 'manage_family_tree',
  VIEW_REPORTS: 'view_reports',
  MANAGE_USERS: 'manage_users'
};

/**
 * Check if user has required role
 */
const requireRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;

      // Get user role
      const { data: user, error } = await supabase
        .from('users')
        .select('role, permissions, is_active')
        .eq('id', userId)
        .single();

      if (error || !user) {
        return res.status(403).json({
          success: false,
          message: 'غير مصرح لك بالوصول'
        });
      }

      // Check if user is active
      if (!user.is_active) {
        return res.status(403).json({
          success: false,
          message: 'حسابك غير نشط'
        });
      }

      // Check if user has required role
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: 'ليس لديك صلاحية كافية'
        });
      }

      // Attach role and permissions to request
      req.userRole = user.role;
      req.userPermissions = user.permissions || {};
      
      next();
    } catch (error) {
      console.error('RBAC Error:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في التحقق من الصلاحيات'
      });
    }
  };
};

/**
 * Check if user has specific permission
 */
const requirePermission = (...requiredPermissions) => {
  return async (req, res, next) => {
    try {
      const permissions = req.userPermissions || {};

      // Super admin has all permissions
      if (req.userRole === ROLES.SUPER_ADMIN) {
        return next();
      }

      // Check if user has all required permissions
      const hasPermission = requiredPermissions.every(
        perm => permissions[perm] === true
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'ليس لديك صلاحية لهذه العملية'
        });
      }

      next();
    } catch (error) {
      console.error('Permission Check Error:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في التحقق من الصلاحيات'
      });
    }
  };
};

module.exports = {
  requireRole,
  requirePermission,
  ROLES,
  PERMISSIONS
};
```

**Command to create:**
```bash
cat > backend/middleware/rbac.middleware.js << 'EOF'
[paste code above]
EOF
```

---

## STEP 2: AUDIT LOGGING UTILITY

### File: `backend/utils/audit-logger.js`

```javascript
// Audit Logger for tracking admin actions
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Log admin action to audit_logs table
 */
async function logAuditEvent({
  userId,
  actionType,
  targetType,
  targetId,
  details,
  ipAddress,
  userAgent
}) {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action_type: actionType,
        target_type: targetType,
        target_id: targetId,
        details: details,
        ip_address: ipAddress,
        user_agent: userAgent,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Audit Log Error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Audit Logger Exception:', error);
    return null;
  }
}

/**
 * Express middleware to automatically log actions
 */
function auditMiddleware(actionType) {
  return async (req, res, next) => {
    // Store original send function
    const originalSend = res.send;

    // Override send function
    res.send = function(data) {
      // Only log successful operations (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        logAuditEvent({
          userId: req.user?.id,
          actionType: actionType,
          targetType: req.params.type || 'unknown',
          targetId: req.params.id || null,
          details: {
            method: req.method,
            path: req.path,
            body: req.body,
            query: req.query
          },
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent')
        });
      }

      // Call original send
      originalSend.call(this, data);
    };

    next();
  };
}

module.exports = {
  logAuditEvent,
  auditMiddleware
};
```

**Command to create:**
```bash
cat > backend/utils/audit-logger.js << 'EOF'
[paste code above]
EOF
```

---

## STEP 3: APPROVAL CONTROLLER

### File: `backend/controllers/approval.controller.js`

```javascript
// Member Approval Controller
const { createClient } = require('@supabase/supabase-js');
const { logAuditEvent } = require('../utils/audit-logger');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Get all pending member approvals
 * GET /api/approvals/pending
 */
exports.getPendingApprovals = async (req, res) => {
  try {
    const { data: members, error } = await supabase
      .from('members')
      .select(`
        *,
        family_branches (
          id,
          branch_name
        )
      `)
      .eq('registration_status', 'pending_approval')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get Pending Error:', error);
      return res.status(500).json({
        success: false,
        message: 'خطأ في جلب الطلبات المعلقة'
      });
    }

    res.json({
      success: true,
      count: members.length,
      data: members
    });
  } catch (error) {
    console.error('Exception:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
};

/**
 * Get member details for approval review
 * GET /api/approvals/:memberId
 */
exports.getMemberForApproval = async (req, res) => {
  try {
    const { memberId } = req.params;

    const { data: member, error } = await supabase
      .from('members')
      .select(`
        *,
        family_branches (
          id,
          branch_name
        ),
        member_photos (
          id,
          photo_url,
          photo_type
        )
      `)
      .eq('id', memberId)
      .single();

    if (error || !member) {
      return res.status(404).json({
        success: false,
        message: 'العضو غير موجود'
      });
    }

    res.json({
      success: true,
      data: member
    });
  } catch (error) {
    console.error('Exception:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
};

/**
 * Approve a member
 * POST /api/approvals/:memberId/approve
 */
exports.approveMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    const adminId = req.user.id;
    const { notes } = req.body;

    // Update member status
    const { data: member, error: updateError } = await supabase
      .from('members')
      .update({
        registration_status: 'approved',
        is_active: true,
        approved_by: adminId,
        approved_at: new Date().toISOString(),
        approval_notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId)
      .select()
      .single();

    if (updateError) {
      console.error('Approval Error:', updateError);
      return res.status(500).json({
        success: false,
        message: 'خطأ في الموافقة على العضو'
      });
    }

    // Log audit event
    await logAuditEvent({
      userId: adminId,
      actionType: 'MEMBER_APPROVED',
      targetType: 'member',
      targetId: memberId,
      details: {
        member_name: member.full_name_ar,
        notes: notes
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // TODO: Send WhatsApp notification to member
    // This will be implemented in file 07

    res.json({
      success: true,
      message: 'تمت الموافقة على العضو بنجاح',
      data: member
    });
  } catch (error) {
    console.error('Exception:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
};

/**
 * Reject a member
 * POST /api/approvals/:memberId/reject
 */
exports.rejectMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    const adminId = req.user.id;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'يجب إدخال سبب الرفض'
      });
    }

    // Update member status
    const { data: member, error: updateError } = await supabase
      .from('members')
      .update({
        registration_status: 'rejected',
        is_active: false,
        rejected_by: adminId,
        rejected_at: new Date().toISOString(),
        rejection_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId)
      .select()
      .single();

    if (updateError) {
      console.error('Rejection Error:', updateError);
      return res.status(500).json({
        success: false,
        message: 'خطأ في رفض العضو'
      });
    }

    // Log audit event
    await logAuditEvent({
      userId: adminId,
      actionType: 'MEMBER_REJECTED',
      targetType: 'member',
      targetId: memberId,
      details: {
        member_name: member.full_name_ar,
        reason: reason
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // TODO: Send WhatsApp notification to member
    // This will be implemented in file 07

    res.json({
      success: true,
      message: 'تم رفض العضو',
      data: member
    });
  } catch (error) {
    console.error('Exception:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
};

/**
 * Get approval statistics
 * GET /api/approvals/stats
 */
exports.getApprovalStats = async (req, res) => {
  try {
    // Count by status
    const { data: stats, error } = await supabase
      .from('members')
      .select('registration_status', { count: 'exact' });

    if (error) {
      console.error('Stats Error:', error);
      return res.status(500).json({
        success: false,
        message: 'خطأ في جلب الإحصائيات'
      });
    }

    // Group by status
    const statusCounts = {
      pending_approval: 0,
      approved: 0,
      rejected: 0,
      incomplete: 0
    };

    stats.forEach(member => {
      const status = member.registration_status || 'incomplete';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    res.json({
      success: true,
      data: statusCounts
    });
  } catch (error) {
    console.error('Exception:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
};

module.exports = exports;
```

**Command to create:**
```bash
cat > backend/controllers/approval.controller.js << 'EOF'
[paste code above]
EOF
```

---

## STEP 4: ADMIN CONTROLLER

### File: `backend/controllers/admin.controller.js`

```javascript
// Admin Management Controller
const { createClient } = require('@supabase/supabase-js');
const { logAuditEvent } = require('../utils/audit-logger');
const { sendWhatsAppOTP } = require('../services/whatsapp.service'); // Will create in 07

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Add new member (Admin only)
 * POST /api/admin/members
 */
exports.addMember = async (req, res) => {
  try {
    const {
      full_name_ar,
      full_name_en,
      phone,
      family_branch_id
    } = req.body;

    const adminId = req.user.id;

    // Validate required fields
    if (!full_name_ar || !phone || !family_branch_id) {
      return res.status(400).json({
        success: false,
        message: 'الاسم والهاتف والفخذ مطلوبة'
      });
    }

    // Validate phone format (Saudi or Kuwaiti)
    const phoneRegex = /^(\+966|966)?5[0-9]{8}$|^(\+965|965)?[569][0-9]{7}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف غير صحيح. يجب أن يكون سعودي (+966) أو كويتي (+965)'
      });
    }

    // Check if phone already exists
    const { data: existing } = await supabase
      .from('members')
      .select('id')
      .eq('phone', phone)
      .single();

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف مسجل مسبقاً'
      });
    }

    // Generate unique member ID (SH-XXXX format)
    const memberId = await generateMemberId();

    // Insert member
    const { data: member, error: insertError } = await supabase
      .from('members')
      .insert({
        member_id: memberId,
        full_name_ar: full_name_ar,
        full_name_en: full_name_en || null,
        phone: phone,
        family_branch_id: family_branch_id,
        registration_status: 'incomplete',
        is_active: false,
        added_by: adminId,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert Error:', insertError);
      return res.status(500).json({
        success: false,
        message: 'خطأ في إضافة العضو'
      });
    }

    // Log audit event
    await logAuditEvent({
      userId: adminId,
      actionType: 'MEMBER_ADDED',
      targetType: 'member',
      targetId: member.id,
      details: {
        member_name: full_name_ar,
        phone: phone,
        family_branch_id: family_branch_id
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Send WhatsApp invitation
    try {
      await sendWhatsAppOTP(phone, 'registration_invite', {
        member_name: full_name_ar,
        registration_link: `${process.env.MOBILE_APP_URL}/register/${member.id}`
      });
    } catch (whatsappError) {
      console.error('WhatsApp Error:', whatsappError);
      // Don't fail the request if WhatsApp fails
    }

    res.status(201).json({
      success: true,
      message: 'تمت إضافة العضو بنجاح. سيتم إرسال دعوة عبر واتساب',
      data: member
    });
  } catch (error) {
    console.error('Exception:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
};

/**
 * Update member subdivision assignment
 * PUT /api/admin/members/:memberId/subdivision
 */
exports.updateMemberSubdivision = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { family_branch_id } = req.body;
    const adminId = req.user.id;

    if (!family_branch_id) {
      return res.status(400).json({
        success: false,
        message: 'الفخذ مطلوب'
      });
    }

    // Update member
    const { data: member, error: updateError } = await supabase
      .from('members')
      .update({
        family_branch_id: family_branch_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId)
      .select()
      .single();

    if (updateError) {
      console.error('Update Error:', updateError);
      return res.status(500).json({
        success: false,
        message: 'خطأ في تحديث الفخذ'
      });
    }

    // Log audit event
    await logAuditEvent({
      userId: adminId,
      actionType: 'SUBDIVISION_CHANGED',
      targetType: 'member',
      targetId: memberId,
      details: {
        new_branch_id: family_branch_id
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: 'تم تحديث الفخذ بنجاح',
      data: member
    });
  } catch (error) {
    console.error('Exception:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
};

/**
 * Get all family branches (subdivisions/فخوذ)
 * GET /api/admin/subdivisions
 */
exports.getSubdivisions = async (req, res) => {
  try {
    const { data: branches, error } = await supabase
      .from('family_branches')
      .select('*')
      .order('branch_name', { ascending: true });

    if (error) {
      console.error('Get Branches Error:', error);
      return res.status(500).json({
        success: false,
        message: 'خطأ في جلب الفخوذ'
      });
    }

    res.json({
      success: true,
      data: branches
    });
  } catch (error) {
    console.error('Exception:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
};

/**
 * Dashboard statistics
 * GET /api/admin/dashboard/stats
 */
exports.getDashboardStats = async (req, res) => {
  try {
    // Total members
    const { count: totalMembers } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true });

    // Active members
    const { count: activeMembers } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Pending approvals
    const { count: pendingApprovals } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('registration_status', 'pending_approval');

    // This month registrations
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: thisMonthRegistrations } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString());

    res.json({
      success: true,
      data: {
        total_members: totalMembers || 0,
        active_members: activeMembers || 0,
        pending_approvals: pendingApprovals || 0,
        this_month_registrations: thisMonthRegistrations || 0
      }
    });
  } catch (error) {
    console.error('Exception:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
};

/**
 * Helper: Generate unique member ID
 */
async function generateMemberId() {
  // Get latest member ID
  const { data: latest } = await supabase
    .from('members')
    .select('member_id')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  let nextNumber = 1;
  
  if (latest && latest.member_id) {
    const match = latest.member_id.match(/SH-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1]) + 1;
    }
  }

  return `SH-${String(nextNumber).padStart(4, '0')}`;
}

module.exports = exports;
```

**Command to create:**
```bash
cat > backend/controllers/admin.controller.js << 'EOF'
[paste code above]
EOF
```

---

## STEP 5: ADMIN ROUTES

### File: `backend/routes/admin.routes.js`

```javascript
// Admin Routes
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { requireRole, ROLES } = require('../middleware/rbac.middleware');
const { auditMiddleware } = require('../utils/audit-logger');

// All routes require authentication and admin role
router.use(authenticateToken);
router.use(requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN));

/**
 * Member Management
 */
router.post(
  '/members',
  auditMiddleware('MEMBER_ADDED'),
  adminController.addMember
);

router.put(
  '/members/:memberId/subdivision',
  auditMiddleware('SUBDIVISION_UPDATED'),
  adminController.updateMemberSubdivision
);

/**
 * Subdivisions (فخوذ)
 */
router.get('/subdivisions', adminController.getSubdivisions);

/**
 * Dashboard
 */
router.get('/dashboard/stats', adminController.getDashboardStats);

module.exports = router;
```

**Command to create:**
```bash
cat > backend/routes/admin.routes.js << 'EOF'
[paste code above]
EOF
```

---

### File: `backend/routes/approval.routes.js`

```javascript
// Approval Routes
const express = require('express');
const router = express.Router();
const approvalController = require('../controllers/approval.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { requireRole, requirePermission, ROLES, PERMISSIONS } = require('../middleware/rbac.middleware');
const { auditMiddleware } = require('../utils/audit-logger');

// All routes require authentication
router.use(authenticateToken);

/**
 * Get pending approvals
 */
router.get(
  '/pending',
  requirePermission(PERMISSIONS.APPROVE_MEMBERS),
  approvalController.getPendingApprovals
);

/**
 * Get member details for review
 */
router.get(
  '/:memberId',
  requirePermission(PERMISSIONS.APPROVE_MEMBERS),
  approvalController.getMemberForApproval
);

/**
 * Approve member
 */
router.post(
  '/:memberId/approve',
  requirePermission(PERMISSIONS.APPROVE_MEMBERS),
  auditMiddleware('MEMBER_APPROVED'),
  approvalController.approveMember
);

/**
 * Reject member
 */
router.post(
  '/:memberId/reject',
  requirePermission(PERMISSIONS.APPROVE_MEMBERS),
  auditMiddleware('MEMBER_REJECTED'),
  approvalController.rejectMember
);

/**
 * Get approval statistics
 */
router.get('/stats', approvalController.getApprovalStats);

module.exports = router;
```

**Command to create:**
```bash
cat > backend/routes/approval.routes.js << 'EOF'
[paste code above]
EOF
```

---

## STEP 6: UPDATE SERVER.JS

Add the new routes to your server.js:

```javascript
// Add to backend/server.js

// Import new routes
const adminRoutes = require('./routes/admin.routes');
const approvalRoutes = require('./routes/approval.routes');

// Register routes (add after registration routes)
app.use('/api/admin', adminRoutes);
app.use('/api/approvals', approvalRoutes);
```

**Command to update:**
```bash
# Add these lines after the existing routes in server.js
cat >> backend/server.js << 'EOF'

// Admin Management Routes
const adminRoutes = require('./routes/admin.routes');
const approvalRoutes = require('./routes/approval.routes');

app.use('/api/admin', adminRoutes);
app.use('/api/approvals', approvalRoutes);
EOF
```

---

## STEP 7: TEST THE APIS

### Test 1: Add Member (Admin)
```bash
curl -X POST http://localhost:3000/api/admin/members \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "full_name_ar": "أحمد محمد الشعيل",
    "full_name_en": "Ahmed Mohammed Al-Shuail",
    "phone": "+966501234567",
    "family_branch_id": "uuid-of-branch"
  }'
```

### Test 2: Get Pending Approvals
```bash
curl http://localhost:3000/api/approvals/pending \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Test 3: Approve Member
```bash
curl -X POST http://localhost:3000/api/approvals/MEMBER_ID/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "notes": "تم التحقق من البيانات"
  }'
```

### Test 4: Get Dashboard Stats
```bash
curl http://localhost:3000/api/admin/dashboard/stats \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## ✅ VERIFICATION CHECKLIST

After implementation, verify:

```
□ Admin can add members with Saudi/Kuwaiti phone numbers
□ Phone validation works correctly
□ Members appear in pending approvals
□ Admin can approve/reject members
□ Audit logs are created for all actions
□ Role-based access control works
□ Dashboard statistics display correctly
□ Subdivision assignment works
```

---

## 🔧 TROUBLESHOOTING

### Issue: "Permission Denied"
**Solution**: Check user role in database:
```sql
SELECT id, email, role, permissions FROM users WHERE email = 'admin@alshuail.com';
```

### Issue: Phone validation fails
**Solution**: Check phone format:
- Saudi: +966 5X XXX XXXX (must start with +966 5)
- Kuwait: +965 XXXX XXXX (must start with +965)

### Issue: Audit logs not created
**Solution**: Check audit_logs table exists:
```sql
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5;
```

---

## 📊 DATABASE QUERIES FOR TESTING

```sql
-- View all pending approvals
SELECT 
  m.id,
  m.member_id,
  m.full_name_ar,
  m.phone,
  m.registration_status,
  fb.branch_name
FROM members m
LEFT JOIN family_branches fb ON m.family_branch_id = fb.id
WHERE m.registration_status = 'pending_approval';

-- View audit logs
SELECT 
  al.*,
  u.email as user_email
FROM audit_logs al
LEFT JOIN users u ON al.user_id = u.id
ORDER BY al.created_at DESC
LIMIT 10;

-- Count members by status
SELECT 
  registration_status,
  COUNT(*) as count
FROM members
GROUP BY registration_status;
```

---

## 📝 NEXT STEPS

After completing this file:
- ✅ Admin can manage members
- ✅ Approval workflow implemented
- ✅ Audit logging working
- ⏭️ **NEXT**: File 05 - Family Tree APIs

---

## 🎯 COMPLETION CRITERIA

This file is complete when:
1. ✅ All 6 files created successfully
2. ✅ Server starts without errors
3. ✅ All test curls return expected results
4. ✅ Audit logs appear in database
5. ✅ RBAC permissions work correctly

---

**Status**: Ready for Claude Code execution
**Estimated Time**: 20-30 minutes
**Dependencies**: Files 01, 02, 03 must be completed first
**Next File**: 05-FAMILY-TREE-APIS.md
