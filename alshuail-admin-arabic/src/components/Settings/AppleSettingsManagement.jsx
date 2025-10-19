import React, {  useState, useEffect , useCallback } from 'react';
import {
  Cog6ToothIcon,
  UserIcon,
  ShieldCheckIcon,
  BellIcon,
  PaintBrushIcon,
  GlobeAltIcon,
  CircleStackIcon,
  CloudIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  DocumentTextIcon,
  ChartBarIcon,
  UsersIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  PhotoIcon,
  LanguageIcon,
  ClockIcon,
  MapPinIcon,
  EnvelopeIcon,
  PhoneIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  PencilIcon,
  PlusIcon,
  InformationCircleIcon,
  SparklesIcon,
  SunIcon,
  MoonIcon,
  StarIcon
} from '@heroicons/react/24/outline';
// CSS styles are inline

const AppleSettingsManagement = () => {
  // Performance optimized event handlers
  const handleRefresh = useCallback(() => {
    // Refresh logic here
  }, []);

  const handleFilterChange = useCallback((filterType, value) => {
    // Filter logic here
  }, []);

  const handlePageChange = useCallback((page) => {
    // Pagination logic here
  }, []);

  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    general: {
      familyName: 'آل الشعيل',
      language: 'ar',
      timezone: 'Asia/Riyadh',
      dateFormat: 'hijri',
      theme: 'auto',
      currency: 'SAR'
    },
    profile: {
      adminName: 'محمد الشعيل',
      adminEmail: 'admin@alshuail.com',
      adminPhone: '+966501234567',
      position: 'رئيس العائلة',
      profileImage: null
    },
    security: {
      twoFactorEnabled: true,
      sessionTimeout: 30,
      passwordExpiry: 90,
      loginNotifications: true,
      ipWhitelist: [],
      backupCodes: 5
    },
    notifications: {
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      memberRequests: true,
      payments: true,
      emergencies: true,
      meetings: true,
      reports: false
    },
    privacy: {
      profileVisibility: 'family',
      dataRetention: 365,
      analyticsTracking: true,
      errorReporting: true,
      dataSharingConsent: false
    },
    backup: {
      autoBackup: true,
      backupFrequency: 'weekly',
      backupLocation: 'cloud',
      retentionPeriod: 90,
      lastBackup: '2024-01-20T10:30:00Z'
    }
  });

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Settings tabs
  const settingsTabs = [
    { id: 'general', label: 'عام', icon: Cog6ToothIcon },
    { id: 'profile', label: 'الملف الشخصي', icon: UserIcon },
    { id: 'security', label: 'الأمان', icon: ShieldCheckIcon },
    { id: 'notifications', label: 'الإشعارات', icon: BellIcon },
    { id: 'privacy', label: 'الخصوصية', icon: EyeIcon },
    { id: 'backup', label: 'النسخ الاحتياطي', icon: CircleStackIcon },
    { id: 'advanced', label: 'متقدم', icon: SparklesIcon }
  ];

  const AppleSettingCard = ({ title, description, icon: Icon, children, gradient }) => (
    <div style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(249, 250, 251, 0.9))', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(229, 231, 235, 0.5)', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', padding: '24px' }}>
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-900 shadow-lg"
          style={{
            background: gradient || 'linear-gradient(135deg, #007AFF, #5856D6)'
          }}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {description && <p className="text-sm text-gray-600">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );

  const AppleToggle = ({ label, description, checked, onChange, disabled = false }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#f9fafb', borderRadius: '12px' }}>
      <div className="flex-1">
        <p className="text-gray-900 font-medium">{label}</p>
        {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
      </div>
      <label style={{ position: 'relative', display: 'inline-block', width: '51px', height: '24px', opacity: disabled ? 0.5 : 1 }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          style={{ opacity: 0, width: 0, height: 0 }}
        />
        <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: checked ? '#34D399' : '#6B7280', transition: '0.4s', borderRadius: '24px' }}></span>
      </label>
    </div>
  );

  const AppleInput = ({ label, value, onChange, type = 'text', placeholder, disabled = false }) => (
    <div>
      <label className="block text-sm text-gray-600 mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        style={{ width: '100%', padding: '12px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', color: '#1f2937', fontSize: '14px', outline: 'none' }}
      />
    </div>
  );

  const AppleSelect = ({ label, value, onChange, options, disabled = false }) => (
    <div>
      <label className="block text-sm text-gray-600 mb-2">{label}</label>
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        style={{ width: '100%', padding: '12px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', color: '#1f2937', fontSize: '14px', outline: 'none' }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  const handleSettingChange = (section, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6">
            <AppleSettingCard
              title="الإعدادات الأساسية"
              description="إعدادات النظام الأساسية"
              icon={Cog6ToothIcon}
              gradient="linear-gradient(135deg, #007AFF, #5856D6)"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AppleInput
                  label="اسم العائلة"
                  value={settings.general.familyName}
                  onChange={(e) => handleSettingChange('general', 'familyName', e.target.value)}
                />
                <AppleSelect
                  label="اللغة"
                  value={settings.general.language}
                  onChange={(e) => handleSettingChange('general', 'language', e.target.value)}
                  options={[
                    { value: 'ar', label: 'العربية' },
                    { value: 'en', label: 'English' }
                  ]}
                />
                <AppleSelect
                  label="المنطقة الزمنية"
                  value={settings.general.timezone}
                  onChange={(e) => handleSettingChange('general', 'timezone', e.target.value)}
                  options={[
                    { value: 'Asia/Riyadh', label: 'الرياض (GMT+3)' },
                    { value: 'Asia/Dubai', label: 'دبي (GMT+4)' },
                    { value: 'Asia/Kuwait', label: 'الكويت (GMT+3)' }
                  ]}
                />
                <AppleSelect
                  label="تنسيق التاريخ"
                  value={settings.general.dateFormat}
                  onChange={(e) => handleSettingChange('general', 'dateFormat', e.target.value)}
                  options={[
                    { value: 'hijri', label: 'هجري' },
                    { value: 'gregorian', label: 'ميلادي' },
                    { value: 'both', label: 'الاثنان معاً' }
                  ]}
                />
                <AppleSelect
                  label="العملة"
                  value={settings.general.currency}
                  onChange={(e) => handleSettingChange('general', 'currency', e.target.value)}
                  options={[
                    { value: 'SAR', label: 'ريال سعودي (ر.س)' },
                    { value: 'USD', label: 'دولار أمريكي ($)' },
                    { value: 'EUR', label: 'يورو (€)' }
                  ]}
                />
                <AppleSelect
                  label="المظهر"
                  value={settings.general.theme}
                  onChange={(e) => handleSettingChange('general', 'theme', e.target.value)}
                  options={[
                    { value: 'auto', label: 'تلقائي' },
                    { value: 'light', label: 'فاتح' },
                    { value: 'dark', label: 'داكن' }
                  ]}
                />
              </div>
            </AppleSettingCard>

            <AppleSettingCard
              title="إعدادات العرض"
              description="تخصيص واجهة المستخدم"
              icon={PaintBrushIcon}
              gradient="linear-gradient(135deg, #30D158, #32D74B)"
            >
              <div className="space-y-4">
                <AppleToggle
                  label="الوضع المضغوط"
                  description="عرض المزيد من المحتوى في المساحة نفسها"
                  checked={false}
                  onChange={() => {}}
                />
                <AppleToggle
                  label="الرسوم المتحركة"
                  description="تفعيل التأثيرات البصرية والانتقالات"
                  checked={true}
                  onChange={() => {}}
                />
                <AppleToggle
                  label="الأصوات"
                  description="تشغيل الأصوات للتنبيهات والإجراءات"
                  checked={false}
                  onChange={() => {}}
                />
              </div>
            </AppleSettingCard>
          </div>
        );

      case 'profile':
        return (
          <div className="space-y-6">
            <AppleSettingCard
              title="المعلومات الشخصية"
              description="إدارة معلومات ملفك الشخصي"
              icon={UserIcon}
              gradient="linear-gradient(135deg, #FF9500, #FFCC02)"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 flex items-center gap-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-gray-900 text-2xl font-bold">
                    م
                  </div>
                  <div className="flex-1">
                    <button style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #3B82F6, #2563EB)', color: '#1f2937', border: 'none', borderRadius: '100px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <PhotoIcon className="w-4 h-4" />
                      تغيير الصورة
                    </button>
                    <p className="text-sm text-gray-600">صورة JPG أو PNG بحجم أقصى 2 ميجابايت</p>
                  </div>
                </div>
                <AppleInput
                  label="الاسم الكامل"
                  value={settings.profile.adminName}
                  onChange={(e) => handleSettingChange('profile', 'adminName', e.target.value)}
                />
                <AppleInput
                  label="المنصب"
                  value={settings.profile.position}
                  onChange={(e) => handleSettingChange('profile', 'position', e.target.value)}
                />
                <AppleInput
                  label="البريد الإلكتروني"
                  type="email"
                  value={settings.profile.adminEmail}
                  onChange={(e) => handleSettingChange('profile', 'adminEmail', e.target.value)}
                />
                <AppleInput
                  label="رقم الهاتف"
                  type="tel"
                  value={settings.profile.adminPhone}
                  onChange={(e) => handleSettingChange('profile', 'adminPhone', e.target.value)}
                />
              </div>
            </AppleSettingCard>

            <AppleSettingCard
              title="كلمة المرور"
              description="إدارة كلمة مرور حسابك"
              icon={KeyIcon}
              gradient="linear-gradient(135deg, #FF3B30, #FF453A)"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                  <div>
                    <p className="text-gray-900 font-medium">كلمة المرور الحالية</p>
                    <p className="text-sm text-gray-600">آخر تغيير منذ 45 يوماً</p>
                  </div>
                  <button
                    onClick={() => setShowPasswordModal(true)}
                    style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #3B82F6, #2563EB)', color: '#1f2937', border: 'none', borderRadius: '100px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <PencilIcon className="w-4 h-4" />
                    تغيير
                  </button>
                </div>
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                  <div className="flex items-start gap-3">
                    <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-yellow-400 font-medium">تذكير أمني</p>
                      <p className="text-sm text-yellow-300">ننصح بتغيير كلمة المرور كل 90 يوماً</p>
                    </div>
                  </div>
                </div>
              </div>
            </AppleSettingCard>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <AppleSettingCard
              title="المصادقة الثنائية"
              description="حماية إضافية لحسابك"
              icon={ShieldCheckIcon}
              gradient="linear-gradient(135deg, #30D158, #32D74B)"
            >
              <div className="space-y-4">
                <AppleToggle
                  label="تفعيل المصادقة الثنائية"
                  description="إضافة طبقة حماية إضافية عند تسجيل الدخول"
                  checked={settings.security.twoFactorEnabled}
                  onChange={(e) => handleSettingChange('security', 'twoFactorEnabled', e.target.checked)}
                />
                {settings.security.twoFactorEnabled && (
                  <div className="ml-8 space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <span className="text-gray-700">رموز النسخ الاحتياطي</span>
                      <span className="text-green-400 font-medium">{settings.security.backupCodes} متبقي</span>
                    </div>
                    <button style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', color: '#1f2937', border: 'none', borderRadius: '100px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      تنزيل رموز جديدة
                    </button>
                  </div>
                )}
              </div>
            </AppleSettingCard>

            <AppleSettingCard
              title="إعدادات الجلسة"
              description="إدارة جلسات الدخول"
              icon={ClockIcon}
              gradient="linear-gradient(135deg, #FF9500, #FFCC02)"
            >
              <div className="space-y-4">
                <AppleSelect
                  label="انتهاء الجلسة (بالدقائق)"
                  value={settings.security.sessionTimeout}
                  onChange={(e) => handleSettingChange('security', 'sessionTimeout', parseInt(e.target.value))}
                  options={[
                    { value: '15', label: '15 دقيقة' },
                    { value: '30', label: '30 دقيقة' },
                    { value: '60', label: 'ساعة واحدة' },
                    { value: '120', label: 'ساعتان' }
                  ]}
                />
                <AppleToggle
                  label="إشعارات تسجيل الدخول"
                  description="تلقي إشعار عند تسجيل دخول جديد"
                  checked={settings.security.loginNotifications}
                  onChange={(e) => handleSettingChange('security', 'loginNotifications', e.target.checked)}
                />
              </div>
            </AppleSettingCard>

            <AppleSettingCard
              title="سجل الأنشطة"
              description="مراقبة النشاطات الأمنية"
              icon={DocumentTextIcon}
              gradient="linear-gradient(135deg, #5856D6, #AF52DE)"
            >
              <div className="space-y-3">
                <div className="p-3 bg-white/5 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">آخر تسجيل دخول</span>
                    <span className="text-gray-900">اليوم 10:30 ص</span>
                  </div>
                </div>
                <div className="p-3 bg-white/5 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">آخر تغيير كلمة مرور</span>
                    <span className="text-gray-900">منذ 45 يوماً</span>
                  </div>
                </div>
                <button style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #3B82F6, #2563EB)', color: '#1f2937', border: 'none', borderRadius: '100px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <EyeIcon className="w-4 h-4" />
                  عرض السجل الكامل
                </button>
              </div>
            </AppleSettingCard>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <AppleSettingCard
              title="قنوات الإشعارات"
              description="اختر كيفية تلقي الإشعارات"
              icon={BellIcon}
              gradient="linear-gradient(135deg, #FF3B30, #FF453A)"
            >
              <div className="space-y-4">
                <AppleToggle
                  label="البريد الإلكتروني"
                  description="تلقي إشعارات عبر البريد الإلكتروني"
                  checked={settings.notifications.emailNotifications}
                  onChange={(e) => handleSettingChange('notifications', 'emailNotifications', e.target.checked)}
                />
                <AppleToggle
                  label="الرسائل النصية"
                  description="تلقي إشعارات عبر الرسائل النصية"
                  checked={settings.notifications.smsNotifications}
                  onChange={(e) => handleSettingChange('notifications', 'smsNotifications', e.target.checked)}
                />
                <AppleToggle
                  label="إشعارات النظام"
                  description="إشعارات داخل التطبيق"
                  checked={settings.notifications.pushNotifications}
                  onChange={(e) => handleSettingChange('notifications', 'pushNotifications', e.target.checked)}
                />
              </div>
            </AppleSettingCard>

            <AppleSettingCard
              title="أنواع الإشعارات"
              description="اختر الأحداث التي تريد تلقي إشعارات بشأنها"
              icon={CheckCircleIcon}
              gradient="linear-gradient(135deg, #30D158, #32D74B)"
            >
              <div className="space-y-4">
                <AppleToggle
                  label="طلبات العضوية"
                  description="عند تقديم طلبات عضوية جديدة"
                  checked={settings.notifications.memberRequests}
                  onChange={(e) => handleSettingChange('notifications', 'memberRequests', e.target.checked)}
                />
                <AppleToggle
                  label="المدفوعات"
                  description="عند استلام أو انتهاء دفعات مالية"
                  checked={settings.notifications.payments}
                  onChange={(e) => handleSettingChange('notifications', 'payments', e.target.checked)}
                />
                <AppleToggle
                  label="الطوارئ"
                  description="للحالات الطارئة والمهمة"
                  checked={settings.notifications.emergencies}
                  onChange={(e) => handleSettingChange('notifications', 'emergencies', e.target.checked)}
                  disabled={true}
                />
                <AppleToggle
                  label="الاجتماعات"
                  description="تذكيرات بالاجتماعات والمناسبات"
                  checked={settings.notifications.meetings}
                  onChange={(e) => handleSettingChange('notifications', 'meetings', e.target.checked)}
                />
                <AppleToggle
                  label="التقارير"
                  description="تقارير دورية ونتائج تحليلية"
                  checked={settings.notifications.reports}
                  onChange={(e) => handleSettingChange('notifications', 'reports', e.target.checked)}
                />
              </div>
            </AppleSettingCard>
          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-6">
            <AppleSettingCard
              title="الخصوصية والبيانات"
              description="إدارة خصوصية بياناتك"
              icon={EyeIcon}
              gradient="linear-gradient(135deg, #5856D6, #AF52DE)"
            >
              <div className="space-y-4">
                <AppleSelect
                  label="مستوى الخصوصية"
                  value={settings.privacy.profileVisibility}
                  onChange={(e) => handleSettingChange('privacy', 'profileVisibility', e.target.value)}
                  options={[
                    { value: 'public', label: 'عام' },
                    { value: 'family', label: 'العائلة فقط' },
                    { value: 'private', label: 'خاص' }
                  ]}
                />
                <AppleToggle
                  label="تتبع التحليلات"
                  description="السماح بجمع بيانات التحليلات لتحسين النظام"
                  checked={settings.privacy.analyticsTracking}
                  onChange={(e) => handleSettingChange('privacy', 'analyticsTracking', e.target.checked)}
                />
                <AppleToggle
                  label="تقارير الأخطاء"
                  description="إرسال تقارير الأخطاء تلقائياً لتحسين النظام"
                  checked={settings.privacy.errorReporting}
                  onChange={(e) => handleSettingChange('privacy', 'errorReporting', e.target.checked)}
                />
              </div>
            </AppleSettingCard>

            <AppleSettingCard
              title="الاحتفاظ بالبيانات"
              description="إدارة مدة الاحتفاظ بالبيانات"
              icon={CircleStackIcon}
              gradient="linear-gradient(135deg, #FF9500, #FFCC02)"
            >
              <div className="space-y-4">
                <AppleSelect
                  label="فترة الاحتفاظ بالبيانات (بالأيام)"
                  value={settings.privacy.dataRetention}
                  onChange={(e) => handleSettingChange('privacy', 'dataRetention', parseInt(e.target.value))}
                  options={[
                    { value: '90', label: '90 يوماً' },
                    { value: '180', label: '180 يوماً' },
                    { value: '365', label: 'سنة واحدة' },
                    { value: '730', label: 'سنتان' }
                  ]}
                />
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <div className="flex items-start gap-3">
                    <InformationCircleIcon className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-blue-400 font-medium">معلومة مهمة</p>
                      <p className="text-sm text-blue-300">سيتم حذف البيانات تلقائياً بعد انتهاء فترة الاحتفاظ</p>
                    </div>
                  </div>
                </div>
              </div>
            </AppleSettingCard>
          </div>
        );

      case 'backup':
        return (
          <div className="space-y-6">
            <AppleSettingCard
              title="النسخ الاحتياطي التلقائي"
              description="إعدادات النسخ الاحتياطي للبيانات"
              icon={CircleStackIcon}
              gradient="linear-gradient(135deg, #30D158, #32D74B)"
            >
              <div className="space-y-4">
                <AppleToggle
                  label="تفعيل النسخ الاحتياطي التلقائي"
                  description="إنشاء نسخ احتياطية بشكل دوري"
                  checked={settings.backup.autoBackup}
                  onChange={(e) => handleSettingChange('backup', 'autoBackup', e.target.checked)}
                />
                {settings.backup.autoBackup && (
                  <div className="ml-8 space-y-4">
                    <AppleSelect
                      label="تكرار النسخ الاحتياطي"
                      value={settings.backup.backupFrequency}
                      onChange={(e) => handleSettingChange('backup', 'backupFrequency', e.target.value)}
                      options={[
                        { value: 'daily', label: 'يومياً' },
                        { value: 'weekly', label: 'أسبوعياً' },
                        { value: 'monthly', label: 'شهرياً' }
                      ]}
                    />
                    <AppleSelect
                      label="موقع النسخ الاحتياطي"
                      value={settings.backup.backupLocation}
                      onChange={(e) => handleSettingChange('backup', 'backupLocation', e.target.value)}
                      options={[
                        { value: 'cloud', label: 'التخزين السحابي' },
                        { value: 'local', label: 'التخزين المحلي' }
                      ]}
                    />
                  </div>
                )}
              </div>
            </AppleSettingCard>

            <AppleSettingCard
              title="إدارة النسخ الاحتياطية"
              description="عرض وإدارة النسخ الاحتياطية الموجودة"
              icon={CloudIcon}
              gradient="linear-gradient(135deg, #007AFF, #5856D6)"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                  <div>
                    <p className="text-gray-900 font-medium">آخر نسخة احتياطية</p>
                    <p className="text-sm text-gray-600">
                      {new Date(settings.backup.lastBackup).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                  <CheckCircleIcon className="w-6 h-6 text-green-400" />
                </div>
                <div className="flex gap-3">
                  <button style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#1f2937', border: 'none', borderRadius: '100px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    إنشاء نسخة احتياطية
                  </button>
                  <button style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #3B82F6, #2563EB)', color: '#1f2937', border: 'none', borderRadius: '100px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ArrowUpTrayIcon className="w-4 h-4" />
                    استعادة النسخة
                  </button>
                </div>
              </div>
            </AppleSettingCard>
          </div>
        );

      case 'advanced':
        return (
          <div className="space-y-6">
            <AppleSettingCard
              title="إعدادات النظام المتقدمة"
              description="إعدادات للمستخدمين المتقدمين"
              icon={SparklesIcon}
              gradient="linear-gradient(135deg, #FF3B30, #FF453A)"
            >
              <div className="space-y-4">
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <div className="flex items-start gap-3">
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-400 font-medium">تحذير</p>
                      <p className="text-sm text-red-300">هذه الإعدادات للمستخدمين المتقدمين فقط</p>
                    </div>
                  </div>
                </div>
                <button style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #F97316, #EA580C)', color: '#1f2937', border: 'none', borderRadius: '100px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CircleStackIcon className="w-4 h-4" />
                  إعادة تعيين قاعدة البيانات
                </button>
                <button style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', color: '#1f2937', border: 'none', borderRadius: '100px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  تصدير جميع البيانات
                </button>
                <button style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #EF4444, #DC2626)', color: '#1f2937', border: 'none', borderRadius: '100px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrashIcon className="w-4 h-4" />
                  حذف الحساب نهائياً
                </button>
              </div>
            </AppleSettingCard>

            <AppleSettingCard
              title="معلومات النظام"
              description="تفاصيل إصدار النظام والأداء"
              icon={InformationCircleIcon}
              gradient="linear-gradient(135deg, #8E8E93, #636366)"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <span className="text-gray-700">إصدار النظام</span>
                  <span className="text-gray-900">2.1.0</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <span className="text-gray-700">آخر تحديث</span>
                  <span className="text-gray-900">15 يناير 2024</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <span className="text-gray-700">استخدام التخزين</span>
                  <span className="text-gray-900">2.3 جيجابايت</span>
                </div>
                <button style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #3B82F6, #2563EB)', color: '#1f2937', border: 'none', borderRadius: '100px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircleIcon className="w-4 h-4" />
                  فحص التحديثات
                </button>
              </div>
            </AppleSettingCard>
          </div>
        );

      default:
        return null;
    }
  };

  const handleSaveSettings = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      // Show success message
    }, 1000);
  };

  return (
    <div className="p-6 space-y-6" dir="rtl" style={{ backgroundColor: 'white', minHeight: '100vh' }}>
      {/* Apple Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', padding: '8px', background: 'linear-gradient(135deg, rgba(243, 244, 246, 0.9), rgba(249, 250, 251, 0.9))', backdropFilter: 'blur(10px)', borderRadius: '16px', marginBottom: '24px' }}>
        {settingsTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 20px',
                background: isActive ? 'linear-gradient(135deg, #007AFF, #5856D6)' : 'transparent',
                border: 'none',
                color: isActive ? 'white' : '#86868B',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '100px',
                transition: 'all 0.3s'
              }}
            >
              <Icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div style={{ animation: 'apple-fade-up 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}>
        {renderTabContent()}
      </div>

      {/* Save Button */}
      <div className="fixed bottom-8 left-8 z-50">
        <button
          onClick={handleSaveSettings}
          disabled={loading}
          style={{
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #10B981, #059669)',
            color: 'white',
            border: 'none',
            borderRadius: '100px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            opacity: loading ? 0.5 : 1,
            transform: 'scale(1)',
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => !loading && (e.target.style.transform = 'scale(1.05)')}
          onMouseLeave={(e) => !loading && (e.target.style.transform = 'scale(1)')}
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <CheckCircleIcon className="w-4 h-4" />
          )}
          {loading ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </button>
      </div>
    </div>
  );
};


// Phase 4: Performance Optimization - Memoize to prevent unnecessary re-renders
export default React.memo(AppleSettingsManagement);