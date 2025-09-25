<<<<<<< HEAD
export const ARABIC_LABELS = {
  // Navigation
  dashboard: 'الرئيسية',
  activities: 'الأنشطة',
  members: 'الأعضاء',
  contributions: 'المساهمات',
  reports: 'التقارير',
  settings: 'الإعدادات',
  logout: 'تسجيل الخروج',

  // Dashboard
  totalActivities: 'إجمالي الأنشطة',
  totalMembers: 'إجمالي الأعضاء',
  totalContributions: 'إجمالي المساهمات',
  pendingApprovals: 'في انتظار الموافقة',
  monthlyRevenue: 'الإيرادات الشهرية',
  activeMembers: 'الأعضاء النشطين',

  // Activities
  familyOccasions: 'المناسبات العائلية',
  charitableInitiatives: 'المبادرات الخيرية',
  diyasAndCompensations: 'الديات والتعويضات',
  addNewActivity: 'إضافة نشاط جديد',
  editActivity: 'تعديل النشاط',
  deleteActivity: 'حذف النشاط',
  approveActivity: 'الموافقة على النشاط',
  rejectActivity: 'رفض النشاط',

  // Members
  addNewMember: 'إضافة عضو جديد',
  editMember: 'تعديل العضو',
  deleteMember: 'حذف العضو',
  memberRole: 'دور العضو',
  memberStatus: 'حالة العضو',
  lastLogin: 'آخر تسجيل دخول',

  // Contributions
  approveContribution: 'الموافقة على المساهمة',
  rejectContribution: 'رفض المساهمة',
  paymentMethod: 'طريقة الدفع',
  contributionAmount: 'مبلغ المساهمة',
  contributionDate: 'تاريخ المساهمة',

  // Common
  save: 'حفظ',
  cancel: 'إلغاء',
  edit: 'تعديل',
  delete: 'حذف',
  view: 'عرض',
  search: 'بحث',
  filter: 'تصفية',
  export: 'تصدير',
  print: 'طباعة',
  refresh: 'تحديث',
=======
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
>>>>>>> a5fb1535e6a5072e663226a993218935989cb409
  loading: 'جاري التحميل...',
  error: 'خطأ',
  success: 'نجح',
  warning: 'تحذير',
  info: 'معلومات',
<<<<<<< HEAD

  // Forms
  required: 'مطلوب',
  email: 'البريد الإلكتروني',
  phone: 'رقم الهاتف',
  name: 'الاسم',
  description: 'الوصف',
  date: 'التاريخ',
  amount: 'المبلغ',
  status: 'الحالة',

  // Status
  active: 'نشط',
  inactive: 'غير نشط',
  pending: 'معلق',
  approved: 'موافق عليه',
  rejected: 'مرفوض',
  completed: 'مكتمل',
  cancelled: 'ملغي',

  // Roles
  superAdmin: 'مدير عام',
  admin: 'مدير',
  financialManager: 'مدير مالي',
  organizer: 'منظم',
  member: 'عضو',

  // Payments
  payments: 'المدفوعات',
  paymentsOverview: 'نظرة عامة على المدفوعات',
  createPayment: 'إنشاء دفعة جديدة',
  paymentDetails: 'تفاصيل الدفع',
  paymentHistory: 'تاريخ المدفوعات',
  paymentReference: 'رقم المرجع',
  totalPayments: 'إجمالي المدفوعات',
  pendingPayments: 'المدفوعات المعلقة',
  overduePayments: 'المدفوعات المتأخرة',
  totalRevenue: 'إجمالي الإيرادات',
  paymentCategory: 'فئة الدفع',
  paymentType: 'نوع الدفع',
  dueDate: 'تاريخ الاستحقاق',
  paidDate: 'تاريخ الدفع',
  approvePayment: 'الموافقة على الدفع',
  rejectPayment: 'رفض الدفع',
  refundPayment: 'استرداد الدفع',
  generateReceipt: 'إنشاء إيصال',
  printReceipt: 'طباعة الإيصال',
  paymentApproved: 'تمت الموافقة على الدفع',
  paymentRejected: 'تم رفض الدفع',
  paymentRefunded: 'تم استرداد الدفع',
  subscriptionPayment: 'دفع اشتراك',
  activityPayment: 'دفع نشاط',
  membershipFee: 'رسوم العضوية',
  donationPayment: 'دفع تبرع',

  // Payment Methods
  cash: 'نقدي',
  bankTransfer: 'حوالة بنكية',
  appPayment: 'دفع إلكتروني',
  digitalWallet: 'محفظة رقمية',
  creditCard: 'بطاقة ائتمان',
  debitCard: 'بطاقة مدين',
  check: 'شيك',

  // Validation Messages
  fieldRequired: 'هذا الحقل مطلوب',
  invalidEmail: 'البريد الإلكتروني غير صحيح',
  invalidPhone: 'رقم الهاتف غير صحيح',
  passwordTooShort: 'كلمة المرور قصيرة جداً',
  amountTooLow: 'المبلغ أقل من الحد الأدنى (50 ريال)',

  // Success Messages
  activityCreated: 'تم إنشاء النشاط بنجاح',
  memberAdded: 'تم إضافة العضو بنجاح',
  contributionApproved: 'تم الموافقة على المساهمة',
  dataExported: 'تم تصدير البيانات بنجاح',

  // Error Messages
  networkError: 'خطأ في الاتصال',
  serverError: 'خطأ في الخادم',
  unauthorized: 'غير مصرح',
  forbidden: 'ممنوع',
  notFound: 'غير موجود',

  // Occasions
  occasions: 'المناسبات',
  occasionsOverview: 'نظرة عامة على المناسبات',
  createOccasion: 'إنشاء مناسبة جديدة',
  occasionDetails: 'تفاصيل المناسبة',
  occasionCalendar: 'تقويم المناسبات',
  occasionType: 'نوع المناسبة',
  occasionLocation: 'مكان المناسبة',
  occasionTime: 'وقت المناسبة',
  rsvp: 'تأكيد الحضور',
  rsvpManagement: 'إدارة تأكيد الحضور',
  attendees: 'الحضور',
  confirmed: 'مؤكد',
  declined: 'معتذر',
  maybe: 'ربما',
  wedding: 'زفاف',
  birth: 'ولادة',
  graduation: 'تخرج',
  celebration: 'احتفال',
  conference: 'مؤتمر',
  meeting: 'اجتماع',

  // Initiatives
  initiatives: 'المبادرات',
  initiativesOverview: 'نظرة عامة على المبادرات',
  createInitiative: 'إنشاء مبادرة جديدة',
  initiativeDetails: 'تفاصيل المبادرة',
  initiativeCategories: 'فئات المبادرات',
  initiativeProgress: 'تقدم المبادرة',
  targetAmount: 'المبلغ المستهدف',
  raisedAmount: 'المبلغ المجمع',
  contribution: 'المساهمة',
  contribute: 'ساهم',
  minimumContribution: 'الحد الأدنى للمساهمة (50 ريال)',
  education: 'التعليم',
  health: 'الصحة',
  charity: 'الخير',
  community: 'المجتمع',
  environment: 'البيئة',
  technology: 'التكنولوجيا',

  // Diyas
  diyas: 'الديات',
  diyasOverview: 'نظرة عامة على الديات',
  createDiya: 'إنشاء دية جديدة',
  diyaDetails: 'تفاصيل الدية',
  diyaStatus: 'حالة الدية',
  caseDetails: 'تفاصيل القضية',
  compensationAmount: 'مبلغ التعويض',
  minimumDiya: 'الحد الأدنى للدية (50 ريال)',
  caseType: 'نوع القضية',
  accidentalDamage: 'ضرر عارض',
  intentionalDamage: 'ضرر مقصود',
  medicalCompensation: 'تعويض طبي',
  propertyDamage: 'ضرر في الممتلكات',
  resolved: 'تم الحل',
  investigating: 'قيد التحقيق',
  awaitingPayment: 'في انتظار الدفع',

  // Notifications
  notifications: 'الإشعارات',
  notificationsCenter: 'مركز الإشعارات',
  createNotification: 'إنشاء إشعار جديد',
  notificationDetails: 'تفاصيل الإشعار',
  notificationFilters: 'مرشحات الإشعارات',
  unreadNotifications: 'الإشعارات غير المقروءة',
  markAsRead: 'تحديد كمقروء',
  markAllAsRead: 'تحديد الكل كمقروء',
  notificationType: 'نوع الإشعار',
  notificationPriority: 'أولوية الإشعار',
  sendToAll: 'إرسال للجميع',
  sendToGroup: 'إرسال للمجموعة',
  general: 'عام',
  urgent: 'عاجل',
  reminder: 'تذكير',
  announcement: 'إعلان',
  high: 'عالية',
  medium: 'متوسطة',
  low: 'منخفضة',
  read: 'مقروء',
  unread: 'غير مقروء',

  // Calendar
  calendar: 'التقويم',
  hijriDate: 'التاريخ الهجري',
  gregorianDate: 'التاريخ الميلادي',
  today: 'اليوم',
  tomorrow: 'غداً',
  thisWeek: 'هذا الأسبوع',
  thisMonth: 'هذا الشهر',
  nextMonth: 'الشهر القادم',

  // Progress and Stats
  progress: 'التقدم',
  percentage: 'النسبة المئوية',
  goal: 'الهدف',
  achieved: 'تم تحقيقه',
  remaining: 'المتبقي',
  contributors: 'المساهمون',
  totalContributors: 'إجمالي المساهمين',
  averageContribution: 'متوسط المساهمة',
};

export const CURRENCY = {
  symbol: 'ر.س',
  code: 'SAR',
  name: 'ريال سعودي'
};

export const HIJRI_MONTHS = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني',
  'جمادى الأولى', 'جمادى الثانية', 'رجب', 'شعبان',
  'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
];
=======
  
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
>>>>>>> a5fb1535e6a5072e663226a993218935989cb409
