// Arabic language constants and mappings

// Common Arabic phrases and labels
export const ARABIC_LABELS = {
  // General
  yes: 'نعم',
  no: 'لا',
  save: 'حفظ',
  cancel: 'إلغاء',
  delete: 'حذف',
  edit: 'تعديل',
  view: 'عرض',
  add: 'إضافة',
  search: 'بحث',
  filter: 'تصفية',
  export: 'تصدير',
  import: 'استيراد',
  loading: 'جاري التحميل...',
  error: 'خطأ',
  success: 'نجح',
  warning: 'تحذير',
  info: 'معلومات',
  
  // Navigation
  dashboard: 'لوحة التحكم',
  members: 'الأعضاء',
  payments: 'المدفوعات',
  reports: 'التقارير',
  settings: 'الإعدادات',
  activities: 'الأنشطة',
  occasions: 'المناسبات',
  initiatives: 'المبادرات',
  notifications: 'الإشعارات',
  
  // Member fields
  fullName: 'الاسم الكامل',
  nationalId: 'رقم الهوية',
  phone: 'رقم الهاتف',
  email: 'البريد الإلكتروني',
  birthDate: 'تاريخ الميلاد',
  address: 'العنوان',
  city: 'المدينة',
  occupation: 'المهنة',
  membershipNumber: 'رقم العضوية',
  status: 'الحالة',
  
  // Status values
  active: 'نشط',
  inactive: 'غير نشط',
  pending: 'في الانتظار',
  approved: 'موافق عليه',
  rejected: 'مرفوض',
  suspended: 'موقوف',
  
  // Payment types
  monthly: 'شهري',
  annual: 'سنوي',
  donation: 'تبرع',
  fee: 'رسوم',
  subscription: 'اشتراك',
  
  // Gender
  male: 'ذكر',
  female: 'أنثى',
  
  // Marital status
  single: 'أعزب',
  married: 'متزوج',
  divorced: 'مطلق',
  widowed: 'أرمل',
  
  // Education levels
  primarySchool: 'ابتدائي',
  middleSchool: 'متوسط',
  highSchool: 'ثانوي',
  diploma: 'دبلوم',
  bachelor: 'بكالوريوس',
  master: 'ماجستير',
  phd: 'دكتوراه',
  
  // Employment types
  government: 'حكومي',
  private: 'خاص',
  selfEmployed: 'عمل حر',
  retired: 'متقاعد',
  unemployed: 'عاطل عن العمل',
  student: 'طالب',
};

// Arabic number words
export const ARABIC_NUMBERS = {
  0: 'صفر',
  1: 'واحد',
  2: 'اثنان',
  3: 'ثلاثة',
  4: 'أربعة',
  5: 'خمسة',
  6: 'ستة',
  7: 'سبعة',
  8: 'ثمانية',
  9: 'تسعة',
  10: 'عشرة',
  11: 'أحد عشر',
  12: 'اثنا عشر',
  13: 'ثلاثة عشر',
  14: 'أربعة عشر',
  15: 'خمسة عشر',
  16: 'ستة عشر',
  17: 'سبعة عشر',
  18: 'ثمانية عشر',
  19: 'تسعة عشر',
  20: 'عشرون',
  30: 'ثلاثون',
  40: 'أربعون',
  50: 'خمسون',
  60: 'ستون',
  70: 'سبعون',
  80: 'ثمانون',
  90: 'تسعون',
  100: 'مائة',
  1000: 'ألف',
};

// Saudi regions and cities
export const SAUDI_REGIONS = {
  riyadh: 'الرياض',
  makkah: 'مكة المكرمة',
  madinah: 'المدينة المنورة',
  qassim: 'القصيم',
  eastern: 'الشرقية',
  asir: 'عسير',
  tabuk: 'تبوك',
  hail: 'حائل',
  northern: 'الحدود الشمالية',
  jazan: 'جازان',
  najran: 'نجران',
  albaha: 'الباحة',
  jouf: 'الجوف',
};

export const SAUDI_CITIES = {
  // Riyadh Region
  riyadh: 'الرياض',
  alkharj: 'الخرج',
  aldiriyah: 'الدرعية',
  
  // Makkah Region
  makkah: 'مكة المكرمة',
  jeddah: 'جدة',
  taif: 'الطائف',
  
  // Madinah Region
  madinah: 'المدينة المنورة',
  yanbu: 'ينبع',
  
  // Eastern Region
  dammam: 'الدمام',
  khobar: 'الخبر',
  dhahran: 'الظهران',
  jubail: 'الجبيل',
  qatif: 'القطيف',
  
  // Other major cities
  abha: 'أبها',
  khamismushait: 'خميس مشيط',
  tabuk: 'تبوك',
  buraidah: 'بريدة',
  unaizah: 'عنيزة',
  hail: 'حائل',
  arar: 'عرعر',
  sakaka: 'سكاكا',
  jazan: 'جازان',
  najran: 'نجران',
  albaha: 'الباحة',
};

// Common Arabic patterns for validation
export const ARABIC_PATTERNS = {
  arabicText: /^[\u0600-\u06FF\s]+$/,
  arabicTextWithNumbers: /^[\u0600-\u06FF\d\s]+$/,
  saudiPhone: /^(\+966|966|0)?5[0-9]{8}$/,
  saudiNationalId: /^[12]\d{9}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  postalCode: /^\d{5}$/,
};

// Error messages in Arabic
export const ARABIC_ERRORS = {
  required: 'هذا الحقل مطلوب',
  invalidEmail: 'البريد الإلكتروني غير صحيح',
  invalidPhone: 'رقم الهاتف غير صحيح',
  invalidNationalId: 'رقم الهوية غير صحيح',
  passwordTooShort: 'كلمة المرور قصيرة جداً',
  passwordsDoNotMatch: 'كلمات المرور غير متطابقة',
  nameRequired: 'الاسم مطلوب',
  dateInvalid: 'التاريخ غير صحيح',
  numberInvalid: 'الرقم غير صحيح',
  fileRequired: 'الملف مطلوب',
  fileTooLarge: 'حجم الملف كبير جداً',
  invalidFileType: 'نوع الملف غير مدعوم',
  networkError: 'خطأ في الشبكة',
  serverError: 'خطأ في الخادم',
  unauthorized: 'غير مخول للوصول',
  forbidden: 'ممنوع الوصول',
  notFound: 'غير موجود',
  duplicateEntry: 'البيانات موجودة مسبقاً',
};

// Success messages in Arabic
export const ARABIC_SUCCESS = {
  saved: 'تم الحفظ بنجاح',
  updated: 'تم التحديث بنجاح',
  deleted: 'تم الحذف بنجاح',
  created: 'تم الإنشاء بنجاح',
  imported: 'تم الاستيراد بنجاح',
  exported: 'تم التصدير بنجاح',
  uploaded: 'تم الرفع بنجاح',
  sent: 'تم الإرسال بنجاح',
  registered: 'تم التسجيل بنجاح',
  loginSuccess: 'تم تسجيل الدخول بنجاح',
  logoutSuccess: 'تم تسجيل الخروج بنجاح',
};

// Validation messages
export const VALIDATION_MESSAGES = {
  ar: {
    required: 'هذا الحقل مطلوب',
    email: 'يرجى إدخال بريد إلكتروني صحيح',
    phone: 'يرجى إدخال رقم هاتف صحيح',
    nationalId: 'يرجى إدخال رقم هوية صحيح',
    minLength: (min: number) => `يجب أن يكون أكثر من ${min} أحرف`,
    maxLength: (max: number) => `يجب أن يكون أقل من ${max} حرف`,
    pattern: 'التنسيق غير صحيح',
    number: 'يجب أن يكون رقماً',
    date: 'يرجى إدخال تاريخ صحيح',
  },
};

export default {
  ARABIC_LABELS,
  ARABIC_NUMBERS,
  SAUDI_REGIONS,
  SAUDI_CITIES,
  ARABIC_PATTERNS,
  ARABIC_ERRORS,
  ARABIC_SUCCESS,
  VALIDATION_MESSAGES,
};