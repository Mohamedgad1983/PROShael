/**
 * Mobile PWA Payment Types
 * Type definitions for mobile payment system components
 * Extends the existing payment types with mobile-specific properties
 */

// Mobile Payment Types
export const MOBILE_PAYMENT_TYPES = {
  SUBSCRIPTION: 'subscription',
  INITIATIVE: 'initiative',
  DIYA: 'diya'
};

export const MOBILE_PAYMENT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  PAID: 'paid',
  REJECTED: 'rejected',
  OVERDUE: 'overdue'
};

export const MOBILE_PAYMENT_METHODS = {
  APP_PAYMENT: 'app_payment',
  BANK_TRANSFER: 'bank_transfer',
  DIGITAL_WALLET: 'digital_wallet'
};

// Mobile Payment Configuration
export const MOBILE_PAYMENT_CONFIG = {
  MIN_PAYMENT_AMOUNT: 50, // SAR
  MIN_BALANCE_REQUIREMENT: 3000, // SAR
  MAX_RECEIPT_SIZE: 5 * 1024 * 1024, // 5MB
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  DEBOUNCE_SEARCH_DELAY: 300, // ms
  PAGINATION_LIMIT: 20,
  EXPORT_FORMATS: ['pdf', 'excel']
};

// Mobile Payment Categories
export const MOBILE_PAYMENT_CATEGORIES = {
  [MOBILE_PAYMENT_TYPES.SUBSCRIPTION]: {
    id: 'subscription',
    titleAr: 'اشتراك شهري',
    titleEn: 'Monthly Subscription',
    subtitleAr: 'رسوم العضوية الشهرية',
    subtitleEn: 'Monthly membership fees',
    icon: '💳',
    color: 'from-blue-500 to-blue-600',
    defaultAmount: 100,
    requiresDescription: false,
    category: 'subscription'
  },
  [MOBILE_PAYMENT_TYPES.INITIATIVE]: {
    id: 'initiative',
    titleAr: 'مبادرة',
    titleEn: 'Initiative',
    subtitleAr: 'مساهمة في مبادرات العائلة',
    subtitleEn: 'Contribution to family initiatives',
    icon: '🎯',
    color: 'from-green-500 to-green-600',
    defaultAmount: 200,
    requiresDescription: true,
    category: 'donation'
  },
  [MOBILE_PAYMENT_TYPES.DIYA]: {
    id: 'diya',
    titleAr: 'دية',
    titleEn: 'Diya',
    subtitleAr: 'دفع دية أو تعويض',
    subtitleEn: 'Diya or compensation payment',
    icon: '⚖️',
    color: 'from-purple-500 to-purple-600',
    defaultAmount: 500,
    requiresDescription: true,
    category: 'penalty'
  }
};

// Status Styling Configuration
export const STATUS_STYLES = {
  [MOBILE_PAYMENT_STATUS.PENDING]: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    icon: '⏳',
    labelAr: 'قيد المراجعة',
    labelEn: 'Under Review'
  },
  [MOBILE_PAYMENT_STATUS.APPROVED]: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    icon: '✅',
    labelAr: 'مقبولة',
    labelEn: 'Approved'
  },
  [MOBILE_PAYMENT_STATUS.PAID]: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    icon: '💚',
    labelAr: 'مدفوعة',
    labelEn: 'Paid'
  },
  [MOBILE_PAYMENT_STATUS.REJECTED]: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    icon: '❌',
    labelAr: 'مرفوضة',
    labelEn: 'Rejected'
  },
  [MOBILE_PAYMENT_STATUS.OVERDUE]: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    icon: '⚠️',
    labelAr: 'متأخرة',
    labelEn: 'Overdue'
  }
};

// Filter Options
export const FILTER_OPTIONS = {
  TYPE: [
    { value: 'all', labelAr: 'جميع الأنواع', labelEn: 'All Types', icon: '📋' },
    { value: 'subscription', labelAr: 'اشتراكات', labelEn: 'Subscriptions', icon: '💳' },
    { value: 'initiative', labelAr: 'مبادرات', labelEn: 'Initiatives', icon: '🎯' },
    { value: 'diya', labelAr: 'ديات', labelEn: 'Diyas', icon: '⚖️' }
  ],
  STATUS: [
    { value: 'all', labelAr: 'جميع الحالات', labelEn: 'All Statuses', icon: '📋' },
    { value: 'pending', labelAr: 'قيد المراجعة', labelEn: 'Pending', icon: '⏳' },
    { value: 'approved', labelAr: 'مقبولة', labelEn: 'Approved', icon: '✅' },
    { value: 'paid', labelAr: 'مدفوعة', labelEn: 'Paid', icon: '💚' },
    { value: 'rejected', labelAr: 'مرفوضة', labelEn: 'Rejected', icon: '❌' }
  ],
  DATE_RANGE: [
    { value: 'all', labelAr: 'جميع التواريخ', labelEn: 'All Dates' },
    { value: 'today', labelAr: 'اليوم', labelEn: 'Today' },
    { value: 'week', labelAr: 'آخر أسبوع', labelEn: 'Last Week' },
    { value: 'month', labelAr: 'آخر شهر', labelEn: 'Last Month' },
    { value: 'quarter', labelAr: 'آخر 3 أشهر', labelEn: 'Last Quarter' },
    { value: 'year', labelAr: 'آخر سنة', labelEn: 'Last Year' },
    { value: 'custom', labelAr: 'فترة محددة', labelEn: 'Custom Range' }
  ]
};

// Validation Rules
export const VALIDATION_RULES = {
  AMOUNT: {
    min: MOBILE_PAYMENT_CONFIG.MIN_PAYMENT_AMOUNT,
    max: 1000000, // 1M SAR
    messageAr: `الحد الأدنى للدفع هو ${MOBILE_PAYMENT_CONFIG.MIN_PAYMENT_AMOUNT} ريال`,
    messageEn: `Minimum payment amount is ${MOBILE_PAYMENT_CONFIG.MIN_PAYMENT_AMOUNT} SAR`
  },
  DESCRIPTION: {
    minLength: 5,
    maxLength: 500,
    messageAr: 'يجب أن يكون الوصف بين 5 و 500 حرف',
    messageEn: 'Description must be between 5 and 500 characters'
  },
  RECEIPT: {
    maxSize: MOBILE_PAYMENT_CONFIG.MAX_RECEIPT_SIZE,
    allowedTypes: MOBILE_PAYMENT_CONFIG.SUPPORTED_IMAGE_TYPES,
    messageAr: 'يجب رفع صورة بصيغة JPG، PNG، أو WebP (حد أقصى 5 ميجابايت)',
    messageEn: 'Please upload JPG, PNG, or WebP image (max 5MB)'
  },
  MEMBER_SEARCH: {
    minLength: 2,
    messageAr: 'اكتب على الأقل حرفين للبحث',
    messageEn: 'Type at least 2 characters to search'
  }
};

// Animation Configurations
export const ANIMATION_CONFIG = {
  MODAL: {
    duration: 300,
    easing: 'ease-out'
  },
  STEP_TRANSITION: {
    duration: 200,
    easing: 'ease-in-out'
  },
  FLOATING: {
    duration: 3000,
    easing: 'ease-in-out'
  },
  PULSE: {
    duration: 1500,
    easing: 'ease-in-out'
  }
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK: {
    ar: 'خطأ في الاتصال بالشبكة',
    en: 'Network connection error'
  },
  PAYMENT_FAILED: {
    ar: 'فشل في معالجة الدفعة',
    en: 'Payment processing failed'
  },
  INVALID_AMOUNT: {
    ar: 'مبلغ غير صالح',
    en: 'Invalid amount'
  },
  MEMBER_NOT_FOUND: {
    ar: 'العضو غير موجود',
    en: 'Member not found'
  },
  INSUFFICIENT_BALANCE: {
    ar: 'رصيد غير كافي',
    en: 'Insufficient balance'
  },
  UPLOAD_FAILED: {
    ar: 'فشل في رفع الملف',
    en: 'File upload failed'
  },
  VALIDATION_FAILED: {
    ar: 'فشل في التحقق من البيانات',
    en: 'Data validation failed'
  }
};

// Success Messages
export const SUCCESS_MESSAGES = {
  PAYMENT_CREATED: {
    ar: 'تم إنشاء الدفعة بنجاح',
    en: 'Payment created successfully'
  },
  RECEIPT_UPLOADED: {
    ar: 'تم رفع الإيصال بنجاح',
    en: 'Receipt uploaded successfully'
  },
  EXPORT_COMPLETED: {
    ar: 'تم تصدير البيانات بنجاح',
    en: 'Data exported successfully'
  }
};

// Component Default Props
export const COMPONENT_DEFAULTS = {
  PAYMENT_MODAL: {
    initialPaymentType: MOBILE_PAYMENT_TYPES.SUBSCRIPTION,
    showCloseButton: true,
    enableBackdropClose: true
  },
  MEMBER_SEARCH: {
    placeholder: 'ابحث عن عضو...',
    debounceDelay: MOBILE_PAYMENT_CONFIG.DEBOUNCE_SEARCH_DELAY,
    maxResults: 10
  },
  ACCOUNT_STATEMENT: {
    pageSize: MOBILE_PAYMENT_CONFIG.PAGINATION_LIMIT,
    showExport: true,
    showFilters: true
  }
};

// API Endpoints
export const API_ENDPOINTS = {
  PAYMENTS: '/payments',
  MEMBERS: '/members',
  UPLOAD_RECEIPT: '/payments/upload-receipt',
  MEMBER_SEARCH: '/members/search',
  MEMBER_BALANCE: '/members/:id/balance',
  EXPORT_HISTORY: '/payments/export/:id'
};

// Device Detection Utilities
export const DEVICE_INFO = {
  isMobile: () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
  isIOS: () => /iPad|iPhone|iPod/.test(navigator.userAgent),
  isAndroid: () => /Android/.test(navigator.userAgent),
  supportsTouchEvents: () => 'ontouchstart' in window,
  supportsFileAPI: () => window.File && window.FileReader && window.FileList && window.Blob,
  supportsCamera: () => navigator.mediaDevices && navigator.mediaDevices.getUserMedia
};

// Currency Formatting
export const CURRENCY_CONFIG = {
  locale: 'ar-SA',
  currency: 'SAR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
};

// Date Formatting
export const DATE_CONFIG = {
  locale: 'ar-SA',
  options: {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  },
  timeOptions: {
    hour: '2-digit',
    minute: '2-digit'
  }
};

// Component State Types (for TypeScript-like documentation)
export const STATE_SHAPES = {
  PAYMENT_FORM: {
    type: 'string', // MOBILE_PAYMENT_TYPES
    amount: 'string',
    description: 'string',
    payOnBehalf: 'boolean',
    onBehalfMemberId: 'string|null',
    memberId: 'string'
  },
  MEMBER_SEARCH: {
    query: 'string',
    members: 'array',
    isLoading: 'boolean',
    isOpen: 'boolean',
    error: 'string',
    highlightedIndex: 'number'
  },
  ACCOUNT_STATEMENT: {
    transactions: 'array',
    filteredTransactions: 'array',
    isLoading: 'boolean',
    error: 'string',
    hasMore: 'boolean',
    currentBalance: 'number',
    filters: 'object',
    showFilters: 'boolean',
    isExporting: 'boolean'
  }
};

// Export utility functions
export const UTILS = {
  formatCurrency: (amount, locale = CURRENCY_CONFIG.locale) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: CURRENCY_CONFIG.currency,
      minimumFractionDigits: CURRENCY_CONFIG.minimumFractionDigits,
      maximumFractionDigits: CURRENCY_CONFIG.maximumFractionDigits
    }).format(amount);
  },

  formatDate: (date, locale = DATE_CONFIG.locale, options = DATE_CONFIG.options) => {
    return new Date(date).toLocaleDateString(locale, options);
  },

  formatDateTime: (date, locale = DATE_CONFIG.locale) => {
    return new Date(date).toLocaleString(locale, {
      ...DATE_CONFIG.options,
      ...DATE_CONFIG.timeOptions
    });
  },

  validateAmount: (amount) => {
    const numAmount = parseFloat(amount);
    return numAmount >= VALIDATION_RULES.AMOUNT.min && numAmount <= VALIDATION_RULES.AMOUNT.max;
  },

  validateFile: (file) => {
    return (
      file.size <= VALIDATION_RULES.RECEIPT.maxSize &&
      VALIDATION_RULES.RECEIPT.allowedTypes.includes(file.type)
    );
  },

  debounce: (func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
  },

  generateId: () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
};

export default {
  MOBILE_PAYMENT_TYPES,
  MOBILE_PAYMENT_STATUS,
  MOBILE_PAYMENT_METHODS,
  MOBILE_PAYMENT_CONFIG,
  MOBILE_PAYMENT_CATEGORIES,
  STATUS_STYLES,
  FILTER_OPTIONS,
  VALIDATION_RULES,
  ANIMATION_CONFIG,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  COMPONENT_DEFAULTS,
  API_ENDPOINTS,
  DEVICE_INFO,
  CURRENCY_CONFIG,
  DATE_CONFIG,
  STATE_SHAPES,
  UTILS
};