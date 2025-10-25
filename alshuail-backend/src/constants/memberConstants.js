/**
 * Member Status Constants
 * Centralized status values and error messages for member management
 */

// Member status enumeration
export const MEMBER_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  INACTIVE: 'inactive',
  PENDING: 'pending'
};

// Error codes
export const ERROR_CODES = {
  INVALID_INPUT: 'INVALID_INPUT',
  MEMBER_NOT_FOUND: 'MEMBER_NOT_FOUND',
  ALREADY_SUSPENDED: 'ALREADY_SUSPENDED',
  NOT_SUSPENDED: 'NOT_SUSPENDED',
  DATABASE_ERROR: 'DATABASE_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN'
};

// Arabic error messages
export const ERROR_MESSAGES = {
  INVALID_INPUT: {
    MEMBER_ID_REQUIRED: 'معرف العضو مطلوب',
    MEMBER_ID_INVALID: 'معرف العضو غير صالح',
    SUSPENSION_REASON_REQUIRED: 'يجب إدخال سبب الإيقاف',
    SUSPENSION_REASON_TOO_LONG: 'سبب الإيقاف طويل جداً (الحد الأقصى 500 حرف)',
    REACTIVATION_NOTES_TOO_LONG: 'ملاحظات التفعيل طويلة جداً (الحد الأقصى 500 حرف)'
  },
  MEMBER_NOT_FOUND: 'العضو غير موجود',
  ALREADY_SUSPENDED: 'العضو موقوف بالفعل',
  NOT_SUSPENDED: 'العضو غير موقوف',
  DATABASE_ERROR: {
    SUSPEND_FAILED: 'خطأ في إيقاف العضو',
    ACTIVATE_FAILED: 'خطأ في تفعيل العضو',
    FETCH_FAILED: 'خطأ في جلب بيانات العضو'
  },
  SERVER_ERROR: 'خطأ في الخادم',
  UNAUTHORIZED: 'غير مصرح',
  FORBIDDEN: 'غير مسموح'
};

// Success messages
export const SUCCESS_MESSAGES = {
  MEMBER_SUSPENDED: 'تم إيقاف العضو بنجاح',
  MEMBER_ACTIVATED: 'تم تفعيل العضو بنجاح',
  DEFAULT_ACTIVATION_NOTE: 'تم التفعيل بواسطة المشرف العام'
};

// Validation limits
export const VALIDATION_LIMITS = {
  SUSPENSION_REASON_MAX_LENGTH: 500,
  REACTIVATION_NOTES_MAX_LENGTH: 500
};

// Database column names (to prevent typos)
export const MEMBER_COLUMNS = {
  ID: 'id',
  FULL_NAME: 'full_name',
  MEMBERSHIP_STATUS: 'membership_status',
  SUSPENDED_AT: 'suspended_at',
  SUSPENDED_BY: 'suspended_by',
  SUSPENSION_REASON: 'suspension_reason',
  REACTIVATED_AT: 'reactivated_at',
  REACTIVATED_BY: 'reactivated_by',
  REACTIVATION_NOTES: 'reactivation_notes',
  UPDATED_AT: 'updated_at'
};
