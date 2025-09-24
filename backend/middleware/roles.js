// وسطاء فحص الأدوار - Role Checking Middleware
const { roles, permissions } = require('../config/auth');

// التحقق من دور المستخدم
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح - Unauthorized'
      });
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `ليس لديك الصلاحية المطلوبة. الأدوار المسموحة: ${allowedRoles.map(r => roles[r]).join(', ')}`
      });
    }

    next();
  };
};

// التحقق من صلاحية محددة
const requirePermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح - Unauthorized'
      });
    }

    const userRole = req.user.role;
    const userPermissions = permissions[userRole] || [];

    // المدير له كل الصلاحيات
    if (userPermissions.includes('*')) {
      return next();
    }

    // التحقق من الصلاحية المحددة
    const hasPermission = userPermissions.some(permission => {
      // التحقق من المطابقة الكاملة
      if (permission === requiredPermission) return true;

      // التحقق من الصلاحيات بالنمط (مثل members:*)
      const [resource, action] = permission.split(':');
      const [reqResource, reqAction] = requiredPermission.split(':');

      if (resource === reqResource && action === '*') return true;

      return false;
    });

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `ليس لديك الصلاحية المطلوبة: ${requiredPermission}`
      });
    }

    next();
  };
};

// التحقق من ملكية المورد
const requireOwnership = (resourceGetter) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح - Unauthorized'
      });
    }

    try {
      const resource = await resourceGetter(req);

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'المورد غير موجود - Resource not found'
        });
      }

      // المدير يمكنه الوصول لكل شيء
      if (req.user.role === 'ADMIN') {
        req.resource = resource;
        return next();
      }

      // التحقق من الملكية
      if (resource.userId !== req.user.id && resource.createdBy !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'ليس لديك صلاحية الوصول لهذا المورد'
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'خطأ في التحقق من الملكية'
      });
    }
  };
};

// التحقق من انتماء المستخدم للعائلة
const requireFamilyMembership = () => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح - Unauthorized'
      });
    }

    if (!req.user.familyId) {
      return res.status(403).json({
        success: false,
        message: 'يجب أن تكون عضواً في العائلة للوصول لهذا المورد'
      });
    }

    next();
  };
};

module.exports = {
  requireRole,
  requirePermission,
  requireOwnership,
  requireFamilyMembership
};