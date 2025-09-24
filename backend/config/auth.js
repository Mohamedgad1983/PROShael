// إعدادات المصادقة - Authentication Configuration
module.exports = {
  jwt: {
    secret: process.env.JWT_SECRET || 'default_secret_change_in_production',
    expiresIn: process.env.JWT_EXPIRE || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRE || '30d'
  },

  // أدوار المستخدمين السبعة - Seven User Roles
  roles: {
    ADMIN: 'مدير النظام',
    PRESIDENT: 'رئيس الأسرة',
    BOARD_MEMBER: 'عضو مجلس الإدارة',
    TREASURER: 'أمين الصندوق',
    SECRETARY: 'الأمين العام',
    MEMBER: 'عضو عادي',
    GUEST: 'ضيف'
  },

  // أذونات كل دور - Permissions per role
  permissions: {
    ADMIN: ['*'], // جميع الصلاحيات
    PRESIDENT: ['members:*', 'events:*', 'announcements:*', 'reports:view'],
    BOARD_MEMBER: ['members:view', 'members:edit', 'events:*', 'announcements:create'],
    TREASURER: ['members:view', 'payments:*', 'reports:*', 'financial:*'],
    SECRETARY: ['members:*', 'documents:*', 'announcements:*'],
    MEMBER: ['profile:edit', 'events:view', 'announcements:view', 'payments:own'],
    GUEST: ['events:view', 'announcements:view']
  }
};