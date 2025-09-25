/**
 * MobileSettings - Mobile-optimized app settings and preferences
 * Features: Theme settings, notifications, privacy, account management
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useMobile, useHapticFeedback } from '../../hooks/useMobile';
import performanceMonitor, { trackUserAction, measureRender } from '../../utils/performanceMonitor';
import '../../styles/mobile-arabic.css';

const MobileSettings = ({ user, isOnline = true, onLogout, device, viewport }) => {
  const { applySafeArea } = useMobile();
  const { feedback } = useHapticFeedback();

  // Component state
  const [settingsState, setSettingsState] = useState({
    notifications: {
      payments: true,
      activities: true,
      reminders: true,
      system: false,
      marketing: false
    },
    privacy: {
      profileVisible: true,
      activityVisible: false,
      contactSharing: false
    },
    app: {
      theme: 'dark', // dark, light, auto
      language: 'ar', // ar, en
      biometric: false,
      autoUpdate: true,
      dataUsage: 'wifi' // wifi, mobile, both
    },
    account: {
      twoFactor: false,
      loginNotifications: true,
      sessionTimeout: 30 // minutes
    }
  });

  const [activeSection, setActiveSection] = useState('general');

  // Performance monitoring
  const renderMonitor = useMemo(() => measureRender('MobileSettings'), []);

  // Handle setting change
  const handleSettingChange = useCallback((section, key, value) => {
    setSettingsState(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));

    trackUserAction('setting-change', { section, key, value });
    feedback('light');

    // Save to localStorage for persistence
    const updatedSettings = {
      ...settingsState,
      [section]: {
        ...settingsState[section],
        [key]: value
      }
    };
    localStorage.setItem('pwa_settings', JSON.stringify(updatedSettings));
  }, [settingsState, feedback]);

  // Toggle setting
  const toggleSetting = useCallback((section, key) => {
    const currentValue = settingsState[section][key];
    handleSettingChange(section, key, !currentValue);
  }, [settingsState, handleSettingChange]);

  // Clear app data
  const handleClearData = useCallback(async () => {
    if (window.confirm('هل أنت متأكد من حذف جميع البيانات المحفوظة؟')) {
      try {
        trackUserAction('clear-app-data');
        feedback('medium');

        // Clear localStorage
        const keysToKeep = ['pwa_token', 'pwa_user'];
        const allKeys = Object.keys(localStorage);
        allKeys.forEach(key => {
          if (!keysToKeep.includes(key)) {
            localStorage.removeItem(key);
          }
        });

        // Clear cache if supported
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        }

        feedback('success');
        alert('تم حذف البيانات بنجاح');
      } catch (error) {
        console.error('Failed to clear data:', error);
        feedback('error');
      }
    }
  }, [feedback]);

  // Export data
  const handleExportData = useCallback(async () => {
    try {
      trackUserAction('export-user-data');
      feedback('medium');

      const userData = {
        profile: user,
        settings: settingsState,
        exportDate: new Date().toISOString(),
        version: '1.0.0'
      };

      const blob = new Blob([JSON.stringify(userData, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `بياناتي-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      feedback('success');
    } catch (error) {
      console.error('Export failed:', error);
      feedback('error');
    }
  }, [user, settingsState, feedback]);

  // Test notifications
  const handleTestNotification = useCallback(() => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('تطبيق آل شعيل', {
          body: 'هذا اختبار للإشعارات',
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png'
        });
        feedback('success');
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification('تطبيق آل شعيل', {
              body: 'تم تفعيل الإشعارات بنجاح',
              icon: '/icon-192x192.png'
            });
            feedback('success');
          }
        });
      }
    }
    trackUserAction('test-notification');
  }, [feedback]);

  // Settings sections
  const renderGeneralSettings = () => (
    <div className="space-y-4">
      {/* App theme */}
      <div className="glass-card">
        <h3 className="text-lg font-semibold text-white mb-4">المظهر</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-300">المظهر</span>
            <select
              className="bg-black bg-opacity-20 border border-white border-opacity-20 rounded-lg px-3 py-2 text-white text-sm"
              value={settingsState.app.theme}
              onChange={(e) => handleSettingChange('app', 'theme', e.target.value)}
            >
              <option value="dark">مظلم</option>
              <option value="light">فاتح</option>
              <option value="auto">تلقائي</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-300">اللغة</span>
            <select
              className="bg-black bg-opacity-20 border border-white border-opacity-20 rounded-lg px-3 py-2 text-white text-sm"
              value={settingsState.app.language}
              onChange={(e) => handleSettingChange('app', 'language', e.target.value)}
            >
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data usage */}
      <div className="glass-card">
        <h3 className="text-lg font-semibold text-white mb-4">استخدام البيانات</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-300">تحديث البيانات</span>
            <select
              className="bg-black bg-opacity-20 border border-white border-opacity-20 rounded-lg px-3 py-2 text-white text-sm"
              value={settingsState.app.dataUsage}
              onChange={(e) => handleSettingChange('app', 'dataUsage', e.target.value)}
            >
              <option value="wifi">WiFi فقط</option>
              <option value="mobile">بيانات الجوال</option>
              <option value="both">جميع الشبكات</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-slate-300 block">التحديث التلقائي</span>
              <span className="text-slate-400 text-sm">تحديث التطبيق تلقائياً</span>
            </div>
            <button
              className={`w-12 h-6 rounded-full transition-colors ${
                settingsState.app.autoUpdate ? 'bg-accent' : 'bg-slate-600'
              }`}
              onClick={() => toggleSetting('app', 'autoUpdate')}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  settingsState.app.autoUpdate ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Notifications settings
  const renderNotificationSettings = () => (
    <div className="space-y-4">
      <div className="glass-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">الإشعارات</h3>
          <button
            className="px-3 py-1 bg-accent bg-opacity-20 text-accent rounded-lg text-sm"
            onClick={handleTestNotification}
          >
            اختبار
          </button>
        </div>

        <div className="space-y-4">
          {[
            { key: 'payments', label: 'إشعارات المدفوعات', desc: 'تذكير بالمدفوعات المستحقة' },
            { key: 'activities', label: 'إشعارات الأنشطة', desc: 'دعوات للفعاليات والأنشطة' },
            { key: 'reminders', label: 'التذكيرات', desc: 'تذكيرات عامة ومواعيد مهمة' },
            { key: 'system', label: 'إشعارات النظام', desc: 'تحديثات التطبيق والنظام' },
            { key: 'marketing', label: 'الإشعارات التسويقية', desc: 'عروض وأخبار العائلة' }
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <span className="text-slate-300 block">{item.label}</span>
                <span className="text-slate-400 text-sm">{item.desc}</span>
              </div>
              <button
                className={`w-12 h-6 rounded-full transition-colors ${
                  settingsState.notifications[item.key] ? 'bg-accent' : 'bg-slate-600'
                }`}
                onClick={() => toggleSetting('notifications', item.key)}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settingsState.notifications[item.key] ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Privacy settings
  const renderPrivacySettings = () => (
    <div className="space-y-4">
      <div className="glass-card">
        <h3 className="text-lg font-semibold text-white mb-4">الخصوصية</h3>
        <div className="space-y-4">
          {[
            { key: 'profileVisible', label: 'إظهار الملف الشخصي', desc: 'يمكن للأعضاء رؤية ملفك الشخصي' },
            { key: 'activityVisible', label: 'إظهار النشاط', desc: 'يمكن للأعضاء رؤية نشاطك' },
            { key: 'contactSharing', label: 'مشاركة معلومات الاتصال', desc: 'السماح بمشاركة رقم الهاتف والبريد' }
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <span className="text-slate-300 block">{item.label}</span>
                <span className="text-slate-400 text-sm">{item.desc}</span>
              </div>
              <button
                className={`w-12 h-6 rounded-full transition-colors ${
                  settingsState.privacy[item.key] ? 'bg-accent' : 'bg-slate-600'
                }`}
                onClick={() => toggleSetting('privacy', item.key)}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settingsState.privacy[item.key] ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Account security */}
      <div className="glass-card">
        <h3 className="text-lg font-semibold text-white mb-4">الأمان</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-slate-300 block">التحقق بخطوتين</span>
              <span className="text-slate-400 text-sm">حماية إضافية للحساب</span>
            </div>
            <button
              className={`w-12 h-6 rounded-full transition-colors ${
                settingsState.account.twoFactor ? 'bg-accent' : 'bg-slate-600'
              }`}
              onClick={() => toggleSetting('account', 'twoFactor')}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  settingsState.account.twoFactor ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-300">مهلة انتهاء الجلسة</span>
            <select
              className="bg-black bg-opacity-20 border border-white border-opacity-20 rounded-lg px-3 py-2 text-white text-sm"
              value={settingsState.account.sessionTimeout}
              onChange={(e) => handleSettingChange('account', 'sessionTimeout', parseInt(e.target.value))}
            >
              <option value={15}>15 دقيقة</option>
              <option value={30}>30 دقيقة</option>
              <option value={60}>ساعة واحدة</option>
              <option value={240}>4 ساعات</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  // Account management
  const renderAccountSettings = () => (
    <div className="space-y-4">
      {/* Data management */}
      <div className="glass-card">
        <h3 className="text-lg font-semibold text-white mb-4">إدارة البيانات</h3>
        <div className="space-y-3">
          <button
            className="w-full flex items-center justify-between p-4 bg-black bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
            onClick={handleExportData}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">📤</span>
              <div className="text-left">
                <span className="text-white block">تصدير البيانات</span>
                <span className="text-slate-400 text-sm">تحميل نسخة من بياناتك</span>
              </div>
            </div>
            <span className="text-slate-400">›</span>
          </button>

          <button
            className="w-full flex items-center justify-between p-4 bg-red-500 bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors border border-red-500 border-opacity-30"
            onClick={handleClearData}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">🗑️</span>
              <div className="text-left">
                <span className="text-red-400 block">محو البيانات</span>
                <span className="text-red-300 text-sm">حذف جميع البيانات المحفوظة</span>
              </div>
            </div>
            <span className="text-red-400">›</span>
          </button>
        </div>
      </div>

      {/* Account actions */}
      <div className="glass-card">
        <h3 className="text-lg font-semibold text-white mb-4">إعدادات الحساب</h3>
        <div className="space-y-3">
          <button
            className="w-full flex items-center justify-between p-4 bg-black bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
            onClick={() => feedback('light')}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">🔑</span>
              <span className="text-white">تغيير كلمة المرور</span>
            </div>
            <span className="text-slate-400">›</span>
          </button>

          <button
            className="w-full flex items-center justify-between p-4 bg-red-500 bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors border border-red-500 border-opacity-30"
            onClick={() => {
              if (window.confirm('هل أنت متأكد من تسجيل الخروج؟')) {
                trackUserAction('logout-from-settings');
                onLogout();
              }
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">🚪</span>
              <span className="text-red-400">تسجيل الخروج</span>
            </div>
            <span className="text-red-400">›</span>
          </button>
        </div>
      </div>

      {/* App info */}
      <div className="glass-card">
        <h3 className="text-lg font-semibold text-white mb-4">معلومات التطبيق</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-300">الإصدار</span>
            <span className="text-white">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-300">آخر تحديث</span>
            <span className="text-white">2024-01-15</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-300">حجم البيانات المحفوظة</span>
            <span className="text-white">2.3 MB</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-primary" dir="rtl">
      {/* Safe area container */}
      <div className="safe-area-container pb-20">

        {/* Header */}
        <header
          className="glass-nav sticky top-0 z-40"
          style={applySafeArea(['top'])}
        >
          <div className="container py-4">
            <h1 className="text-xl font-bold text-white mb-4">الإعدادات</h1>

            {/* Section tabs */}
            <div className="flex gap-1 bg-black bg-opacity-20 rounded-xl p-1 overflow-x-auto">
              {[
                { id: 'general', label: 'عام' },
                { id: 'notifications', label: 'الإشعارات' },
                { id: 'privacy', label: 'الخصوصية' },
                { id: 'account', label: 'الحساب' }
              ].map(section => (
                <button
                  key={section.id}
                  className={`flex-shrink-0 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                    activeSection === section.id
                      ? 'bg-white bg-opacity-20 text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  onClick={() => {
                    setActiveSection(section.id);
                    feedback('light');
                  }}
                >
                  {section.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="container py-6">
          {activeSection === 'general' && renderGeneralSettings()}
          {activeSection === 'notifications' && renderNotificationSettings()}
          {activeSection === 'privacy' && renderPrivacySettings()}
          {activeSection === 'account' && renderAccountSettings()}
        </main>

      </div>

      {/* Offline indicator */}
      {!isOnline && (
        <div className="fixed bottom-24 left-4 right-4 glass-card border border-yellow-500 border-opacity-50">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
            <p className="text-yellow-400 text-sm">وضع عدم الاتصال - التغييرات ستُحفظ محلياً</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileSettings;