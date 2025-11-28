// Application Constants - File 06 Integration

// User Roles
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  FINANCIAL_MANAGER: 'financial_manager',
  FAMILY_TREE_MANAGER: 'family_tree_manager',
  VIEWER: 'viewer',
  MEMBER: 'member'
};

// Role Display Names (Arabic)
export const ROLE_NAMES_AR = {
  [ROLES.SUPER_ADMIN]: 'مدير عام',
  [ROLES.ADMIN]: 'مسؤول',
  [ROLES.FINANCIAL_MANAGER]: 'مدير مالي',
  [ROLES.FAMILY_TREE_MANAGER]: 'مدير شجرة العائلة',
  [ROLES.VIEWER]: 'مشاهد',
  [ROLES.MEMBER]: 'عضو'
};

// Role Display Names (English)
export const ROLE_NAMES_EN = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.ADMIN]: 'Admin',
  [ROLES.FINANCIAL_MANAGER]: 'Financial Manager',
  [ROLES.FAMILY_TREE_MANAGER]: 'Family Tree Manager',
  [ROLES.VIEWER]: 'Viewer',
  [ROLES.MEMBER]: 'Member'
};

// Member Registration Status
export const REGISTRATION_STATUS = {
  PENDING: 'pending_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended'
};

// Status Display Names (Arabic)
export const STATUS_NAMES_AR = {
  [REGISTRATION_STATUS.PENDING]: 'قيد الانتظار',
  [REGISTRATION_STATUS.APPROVED]: 'موافق عليه',
  [REGISTRATION_STATUS.REJECTED]: 'مرفوض',
  [REGISTRATION_STATUS.ACTIVE]: 'نشط',
  [REGISTRATION_STATUS.INACTIVE]: 'غير نشط',
  [REGISTRATION_STATUS.SUSPENDED]: 'موقوف'
};

// Status Display Names (English)
export const STATUS_NAMES_EN = {
  [REGISTRATION_STATUS.PENDING]: 'Pending',
  [REGISTRATION_STATUS.APPROVED]: 'Approved',
  [REGISTRATION_STATUS.REJECTED]: 'Rejected',
  [REGISTRATION_STATUS.ACTIVE]: 'Active',
  [REGISTRATION_STATUS.INACTIVE]: 'Inactive',
  [REGISTRATION_STATUS.SUSPENDED]: 'Suspended'
};

// Gender
export const GENDER = {
  MALE: 'male',
  FEMALE: 'female'
};

// Gender Display Names (Arabic)
export const GENDER_NAMES_AR = {
  [GENDER.MALE]: 'ذكر',
  [GENDER.FEMALE]: 'أنثى'
};

// Gender Display Names (English)
export const GENDER_NAMES_EN = {
  [GENDER.MALE]: 'Male',
  [GENDER.FEMALE]: 'Female'
};

// Relationship Types
export const RELATIONSHIP_TYPES = {
  FATHER: 'father',
  MOTHER: 'mother',
  SPOUSE: 'spouse',
  CHILD: 'child',
  SIBLING: 'sibling',
  GRANDFATHER: 'grandfather',
  GRANDMOTHER: 'grandmother',
  GRANDSON: 'grandson',
  GRANDDAUGHTER: 'granddaughter'
};

// Relationship Display Names (Arabic)
export const RELATIONSHIP_NAMES_AR = {
  [RELATIONSHIP_TYPES.FATHER]: 'الأب',
  [RELATIONSHIP_TYPES.MOTHER]: 'الأم',
  [RELATIONSHIP_TYPES.SPOUSE]: 'الزوج/الزوجة',
  [RELATIONSHIP_TYPES.CHILD]: 'الابن/الابنة',
  [RELATIONSHIP_TYPES.SIBLING]: 'الأخ/الأخت',
  [RELATIONSHIP_TYPES.GRANDFATHER]: 'الجد',
  [RELATIONSHIP_TYPES.GRANDMOTHER]: 'الجدة',
  [RELATIONSHIP_TYPES.GRANDSON]: 'الحفيد',
  [RELATIONSHIP_TYPES.GRANDDAUGHTER]: 'الحفيدة'
};

// Relationship Display Names (English)
export const RELATIONSHIP_NAMES_EN = {
  [RELATIONSHIP_TYPES.FATHER]: 'Father',
  [RELATIONSHIP_TYPES.MOTHER]: 'Mother',
  [RELATIONSHIP_TYPES.SPOUSE]: 'Spouse',
  [RELATIONSHIP_TYPES.CHILD]: 'Child',
  [RELATIONSHIP_TYPES.SIBLING]: 'Sibling',
  [RELATIONSHIP_TYPES.GRANDFATHER]: 'Grandfather',
  [RELATIONSHIP_TYPES.GRANDMOTHER]: 'Grandmother',
  [RELATIONSHIP_TYPES.GRANDSON]: 'Grandson',
  [RELATIONSHIP_TYPES.GRANDDAUGHTER]: 'Granddaughter'
};

// Audit Action Types
export const AUDIT_ACTIONS = {
  MEMBER_CREATED: 'member_created',
  MEMBER_UPDATED: 'member_updated',
  MEMBER_DELETED: 'member_deleted',
  MEMBER_APPROVED: 'member_approved',
  MEMBER_REJECTED: 'member_rejected',
  SUBDIVISION_ASSIGNED: 'subdivision_assigned',
  ROLE_CHANGED: 'role_changed',
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout'
};

// Audit Action Display Names (Arabic)
export const AUDIT_ACTION_NAMES_AR = {
  [AUDIT_ACTIONS.MEMBER_CREATED]: 'إضافة عضو',
  [AUDIT_ACTIONS.MEMBER_UPDATED]: 'تحديث عضو',
  [AUDIT_ACTIONS.MEMBER_DELETED]: 'حذف عضو',
  [AUDIT_ACTIONS.MEMBER_APPROVED]: 'الموافقة على عضو',
  [AUDIT_ACTIONS.MEMBER_REJECTED]: 'رفض عضو',
  [AUDIT_ACTIONS.SUBDIVISION_ASSIGNED]: 'تعيين فخذ',
  [AUDIT_ACTIONS.ROLE_CHANGED]: 'تغيير الدور',
  [AUDIT_ACTIONS.LOGIN_SUCCESS]: 'تسجيل دخول ناجح',
  [AUDIT_ACTIONS.LOGIN_FAILED]: 'فشل تسجيل الدخول',
  [AUDIT_ACTIONS.LOGOUT]: 'تسجيل خروج'
};

// Country Codes
export const COUNTRY_CODES = {
  SAUDI_ARABIA: '+966',
  KUWAIT: '+965'
};

// API Endpoints Base
export const API_BASE_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : 'https://api.alshailfund.com/api';

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100]
};

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'YYYY-MM-DD',
  DISPLAY_AR: 'DD/MM/YYYY',
  API: 'YYYY-MM-DD',
  DATETIME: 'YYYY-MM-DD HH:mm:ss'
};

// Validation Rules
export const VALIDATION = {
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 100,
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  MIN_AGE: 0,
  MAX_AGE: 150,
  SAUDI_PHONE_LENGTH: 9, // without country code
  KUWAIT_PHONE_LENGTH: 8, // without country code
  SAUDI_NATIONAL_ID_LENGTH: 10,
  KUWAIT_CIVIL_ID_LENGTH: 12
};

// File Upload
export const FILE_UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
};

// Notification Types
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

// Table Column Keys
export const TABLE_COLUMNS = {
  MEMBERS: ['id', 'full_name_ar', 'phone', 'family_branch', 'registration_status', 'created_at'],
  APPROVALS: ['member_id', 'full_name_ar', 'phone', 'family_branch', 'created_at', 'actions'],
  SUBDIVISIONS: ['branch_name', 'member_count', 'description'],
  AUDIT_LOGS: ['user_email', 'action_type', 'details', 'created_at']
};

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  THEME: 'theme',
  LANGUAGE: 'language'
};

// Default Values
export const DEFAULTS = {
  LANGUAGE: 'ar',
  THEME: 'light',
  COUNTRY_CODE: COUNTRY_CODES.SAUDI_ARABIA
};
