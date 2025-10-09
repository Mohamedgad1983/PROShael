/**
import { log } from './logger.js';
 * Comprehensive Error Code System
 * Provides specific error codes and messages for better debugging
 */

export const ErrorCodes = {
  // Authentication Errors (1000-1099)
  AUTH_INVALID_CREDENTIALS: {
    code: 'AUTH_1001',
    message: 'Invalid username or password',
    messageAr: 'اسم المستخدم أو كلمة المرور غير صحيحة',
    httpStatus: 401
  },
  AUTH_TOKEN_EXPIRED: {
    code: 'AUTH_1002',
    message: 'Authentication token has expired',
    messageAr: 'انتهت صلاحية رمز المصادقة',
    httpStatus: 401
  },
  AUTH_TOKEN_INVALID: {
    code: 'AUTH_1003',
    message: 'Invalid authentication token',
    messageAr: 'رمز المصادقة غير صالح',
    httpStatus: 401
  },
  AUTH_INSUFFICIENT_PRIVILEGES: {
    code: 'AUTH_1004',
    message: 'Insufficient privileges to perform this action',
    messageAr: 'صلاحيات غير كافية للقيام بهذا الإجراء',
    httpStatus: 403
  },
  AUTH_SESSION_EXPIRED: {
    code: 'AUTH_1005',
    message: 'Your session has expired. Please login again',
    messageAr: 'انتهت جلستك. يرجى تسجيل الدخول مرة أخرى',
    httpStatus: 401
  },

  // Financial Report Errors (2000-2099)
  REPORT_ACCESS_DENIED: {
    code: 'REPORT_2001',
    message: 'Access denied: Financial Manager authorization required',
    messageAr: 'الوصول مرفوض: مطلوب تصريح المدير المالي',
    httpStatus: 403
  },
  REPORT_DATE_RANGE_INVALID: {
    code: 'REPORT_2002',
    message: 'Invalid date range. End date must be after start date',
    messageAr: 'نطاق التاريخ غير صالح. يجب أن يكون تاريخ النهاية بعد تاريخ البداية',
    httpStatus: 400
  },
  REPORT_TYPE_NOT_FOUND: {
    code: 'REPORT_2003',
    message: 'Report type not found or not supported',
    messageAr: 'نوع التقرير غير موجود أو غير مدعوم',
    httpStatus: 404
  },
  REPORT_GENERATION_FAILED: {
    code: 'REPORT_2004',
    message: 'Failed to generate report. Please try again later',
    messageAr: 'فشل إنشاء التقرير. يرجى المحاولة مرة أخرى لاحقاً',
    httpStatus: 500
  },
  REPORT_EXPORT_FAILED: {
    code: 'REPORT_2005',
    message: 'Failed to export report in the requested format',
    messageAr: 'فشل تصدير التقرير بالصيغة المطلوبة',
    httpStatus: 500
  },
  REPORT_DATA_NOT_FOUND: {
    code: 'REPORT_2006',
    message: 'No data found for the specified criteria',
    messageAr: 'لم يتم العثور على بيانات للمعايير المحددة',
    httpStatus: 404
  },
  REPORT_PARAMETER_MISSING: {
    code: 'REPORT_2007',
    message: 'Required report parameters are missing',
    messageAr: 'معاملات التقرير المطلوبة مفقودة',
    httpStatus: 400
  },
  REPORT_TOO_LARGE: {
    code: 'REPORT_2008',
    message: 'Report data exceeds maximum size limit. Please narrow your criteria',
    messageAr: 'بيانات التقرير تتجاوز الحد الأقصى. يرجى تضييق معاييرك',
    httpStatus: 413
  },

  // Database Errors (3000-3099)
  DB_CONNECTION_FAILED: {
    code: 'DB_3001',
    message: 'Database connection failed',
    messageAr: 'فشل الاتصال بقاعدة البيانات',
    httpStatus: 503
  },
  DB_QUERY_FAILED: {
    code: 'DB_3002',
    message: 'Database query failed',
    messageAr: 'فشل استعلام قاعدة البيانات',
    httpStatus: 500
  },
  DB_TRANSACTION_FAILED: {
    code: 'DB_3003',
    message: 'Database transaction failed',
    messageAr: 'فشلت معاملة قاعدة البيانات',
    httpStatus: 500
  },
  DB_TIMEOUT: {
    code: 'DB_3004',
    message: 'Database operation timed out',
    messageAr: 'انتهت مهلة عملية قاعدة البيانات',
    httpStatus: 504
  },
  DB_DUPLICATE_ENTRY: {
    code: 'DB_3005',
    message: 'Duplicate entry found in database',
    messageAr: 'تم العثور على إدخال مكرر في قاعدة البيانات',
    httpStatus: 409
  },

  // Validation Errors (4000-4099)
  VALIDATION_FAILED: {
    code: 'VAL_4001',
    message: 'Input validation failed',
    messageAr: 'فشل التحقق من صحة الإدخال',
    httpStatus: 400
  },
  VALIDATION_INVALID_EMAIL: {
    code: 'VAL_4002',
    message: 'Invalid email format',
    messageAr: 'صيغة البريد الإلكتروني غير صالحة',
    httpStatus: 400
  },
  VALIDATION_INVALID_PHONE: {
    code: 'VAL_4003',
    message: 'Invalid phone number format',
    messageAr: 'صيغة رقم الهاتف غير صالحة',
    httpStatus: 400
  },
  VALIDATION_INVALID_DATE: {
    code: 'VAL_4004',
    message: 'Invalid date format',
    messageAr: 'صيغة التاريخ غير صالحة',
    httpStatus: 400
  },
  VALIDATION_INVALID_AMOUNT: {
    code: 'VAL_4005',
    message: 'Invalid amount. Must be a positive number',
    messageAr: 'المبلغ غير صالح. يجب أن يكون رقماً موجباً',
    httpStatus: 400
  },
  VALIDATION_HIJRI_DATE_INVALID: {
    code: 'VAL_4006',
    message: 'Invalid Hijri date format',
    messageAr: 'صيغة التاريخ الهجري غير صالحة',
    httpStatus: 400
  },

  // Member Errors (5000-5099)
  MEMBER_NOT_FOUND: {
    code: 'MEM_5001',
    message: 'Member not found',
    messageAr: 'العضو غير موجود',
    httpStatus: 404
  },
  MEMBER_ALREADY_EXISTS: {
    code: 'MEM_5002',
    message: 'Member with this information already exists',
    messageAr: 'العضو بهذه المعلومات موجود بالفعل',
    httpStatus: 409
  },
  MEMBER_INACTIVE: {
    code: 'MEM_5003',
    message: 'Member account is inactive',
    messageAr: 'حساب العضو غير نشط',
    httpStatus: 403
  },
  MEMBER_REGISTRATION_FAILED: {
    code: 'MEM_5004',
    message: 'Member registration failed',
    messageAr: 'فشل تسجيل العضو',
    httpStatus: 500
  },

  // Payment Errors (6000-6099)
  PAYMENT_FAILED: {
    code: 'PAY_6001',
    message: 'Payment processing failed',
    messageAr: 'فشلت معالجة الدفع',
    httpStatus: 402
  },
  PAYMENT_INSUFFICIENT_FUNDS: {
    code: 'PAY_6002',
    message: 'Insufficient funds for payment',
    messageAr: 'رصيد غير كافي للدفع',
    httpStatus: 402
  },
  PAYMENT_METHOD_INVALID: {
    code: 'PAY_6003',
    message: 'Invalid payment method',
    messageAr: 'طريقة الدفع غير صالحة',
    httpStatus: 400
  },
  PAYMENT_NOT_FOUND: {
    code: 'PAY_6004',
    message: 'Payment record not found',
    messageAr: 'سجل الدفع غير موجود',
    httpStatus: 404
  },
  PAYMENT_ALREADY_PROCESSED: {
    code: 'PAY_6005',
    message: 'Payment has already been processed',
    messageAr: 'تمت معالجة الدفع بالفعل',
    httpStatus: 409
  },

  // File Operation Errors (7000-7099)
  FILE_UPLOAD_FAILED: {
    code: 'FILE_7001',
    message: 'File upload failed',
    messageAr: 'فشل رفع الملف',
    httpStatus: 500
  },
  FILE_TOO_LARGE: {
    code: 'FILE_7002',
    message: 'File size exceeds maximum limit',
    messageAr: 'حجم الملف يتجاوز الحد الأقصى',
    httpStatus: 413
  },
  FILE_TYPE_INVALID: {
    code: 'FILE_7003',
    message: 'Invalid file type. Supported types: Excel, CSV, PDF',
    messageAr: 'نوع الملف غير صالح. الأنواع المدعومة: Excel، CSV، PDF',
    httpStatus: 415
  },
  FILE_NOT_FOUND: {
    code: 'FILE_7004',
    message: 'File not found',
    messageAr: 'الملف غير موجود',
    httpStatus: 404
  },

  // Rate Limiting Errors (8000-8099)
  RATE_LIMIT_EXCEEDED: {
    code: 'RATE_8001',
    message: 'Too many requests. Please try again later',
    messageAr: 'طلبات كثيرة جداً. يرجى المحاولة مرة أخرى لاحقاً',
    httpStatus: 429
  },
  RATE_LIMIT_REPORT_GENERATION: {
    code: 'RATE_8002',
    message: 'Report generation limit exceeded. Maximum 10 reports per hour',
    messageAr: 'تم تجاوز حد إنشاء التقارير. الحد الأقصى 10 تقارير في الساعة',
    httpStatus: 429
  },

  // System Errors (9000-9099)
  SYSTEM_ERROR: {
    code: 'SYS_9001',
    message: 'An unexpected system error occurred',
    messageAr: 'حدث خطأ غير متوقع في النظام',
    httpStatus: 500
  },
  SYSTEM_MAINTENANCE: {
    code: 'SYS_9002',
    message: 'System is under maintenance. Please try again later',
    messageAr: 'النظام قيد الصيانة. يرجى المحاولة مرة أخرى لاحقاً',
    httpStatus: 503
  },
  SYSTEM_OVERLOADED: {
    code: 'SYS_9003',
    message: 'System is currently overloaded. Please try again',
    messageAr: 'النظام محمل حالياً. يرجى المحاولة مرة أخرى',
    httpStatus: 503
  }
};

/**
 * Create a standardized error response
 */
export const createErrorResponse = (errorKey, additionalInfo = {}) => {
  const error = ErrorCodes[errorKey] || ErrorCodes.SYSTEM_ERROR;

  return {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      messageAr: error.messageAr,
      timestamp: new Date().toISOString(),
      ...additionalInfo
    }
  };
};

/**
 * Error handler middleware
 */
export const errorHandler = (err, req, res, next) => {
  log.error('Error occurred:', err);

  // Check if it's a known error
  const knownError = Object.values(ErrorCodes).find(e => e.code === err.code);

  if (knownError) {
    return res.status(knownError.httpStatus).json(createErrorResponse(err.code));
  }

  // Handle Supabase errors
  if (err.message?.includes('JWT')) {
    return res.status(401).json(createErrorResponse('AUTH_TOKEN_INVALID'));
  }

  if (err.message?.includes('duplicate')) {
    return res.status(409).json(createErrorResponse('DB_DUPLICATE_ENTRY', {
      field: err.field
    }));
  }

  if (err.message?.includes('timeout')) {
    return res.status(504).json(createErrorResponse('DB_TIMEOUT'));
  }

  // Default error response
  return res.status(500).json(createErrorResponse('SYSTEM_ERROR', {
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  }));
};

/**
 * Async error wrapper for route handlers
 */
export const asyncErrorWrapper = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default {
  ErrorCodes,
  createErrorResponse,
  errorHandler,
  asyncErrorWrapper
};