/**
 * System Settings Component
 * Premium Apple-inspired interface for system configuration
 * Features glassmorphism effects, sophisticated animations, and full RTL support
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import '../Members/AppleDesignSystem.css';
import {
  ServerIcon,
  GlobeAltIcon,
  BellIcon,
  ShieldCheckIcon,
  DatabaseIcon,
  KeyIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CloudIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  CogIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ClockIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

const SystemSettings = () => {
  const { user, hasPermission } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [activeCategory, setActiveCategory] = useState('general');

  // System settings state
  const [settings, setSettings] = useState({
    general: {
      siteName: 'نظام عائلة الشعيل',
      siteDescription: 'نظام إدارة شؤون عائلة الشعيل',
      contactEmail: 'info@alshuail.com',
      supportPhone: '+966551234567',
      timezone: 'Asia/Riyadh',
      language: 'ar',
      dateFormat: 'hijri',
      enableMaintenance: false
    },
    notifications: {
      emailNotifications: true,
      smsNotifications: true,
      pushNotifications: true,
      welcomeEmails: true,
      paymentReminders: true,
      eventNotifications: true,
      systemAlerts: true
    },
    security: {
      enforceStrongPasswords: true,
      twoFactorAuth: false,
      sessionTimeout: 120, // minutes
      loginAttempts: 5,
      passwordExpiry: 90, // days
      enableAuditLogs: true,
      ipWhitelist: '',
      requireEmailVerification: true
    },
    api: {
      rateLimitPerHour: 1000,
      enableApiDocs: true,
      apiVersion: 'v1',
      webhookUrl: '',
      apiKey: 'sk_live_************************',
      secretKey: 'sk_secret_************************'
    },
    backup: {
      autoBackup: true,
      backupFrequency: 'daily',
      retentionDays: 30,
      cloudStorage: true,
      lastBackup: '2024-12-20T10:30:00Z'
    },
    performance: {
      enableCaching: true,
      cacheExpiry: 3600, // seconds
      enableCompression: true,
      maxFileSize: 10, // MB
      enableCDN: false,
      optimizeImages: true
    }
  });

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // Simulate API call
      setTimeout(() => {
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error loading settings:', error);
      setLoading(false);
      setMessage({ type: 'error', text: 'خطأ في تحميل الإعدادات' });
    }
  };

  const saveSettings = async (category) => {
    setSaving(true);
    try {
      // Simulate API call
      setTimeout(() => {
        setMessage({ type: 'success', text: 'تم حفظ الإعدادات بنجاح' });
        setSaving(false);
      }, 1000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'خطأ في حفظ الإعدادات' });
      setSaving(false);
    }
  };

  const updateSetting = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  // Categories configuration
  const categories = [
    {
      id: 'general',
      name: 'الإعدادات العامة',
      icon: CogIcon,
      color: 'linear-gradient(135deg, var(--apple-blue-500) 0%, var(--apple-blue-600) 100%)',
      description: 'إعدادات النظام الأساسية والمعلومات العامة'
    },
    {
      id: 'notifications',
      name: 'الإشعارات',
      icon: BellIcon,
      color: 'linear-gradient(135deg, var(--apple-green-500) 0%, var(--apple-emerald-600) 100%)',
      description: 'إعدادات الإشعارات والتنبيهات'
    },
    {
      id: 'security',
      name: 'الأمان',
      icon: ShieldCheckIcon,
      color: 'linear-gradient(135deg, var(--apple-red-500) 0%, var(--apple-rose-600) 100%)',
      description: 'إعدادات الأمان وحماية النظام'
    },
    {
      id: 'api',
      name: 'API والتكامل',
      icon: KeyIcon,
      color: 'linear-gradient(135deg, var(--apple-purple-500) 0%, var(--apple-violet-600) 100%)',
      description: 'إعدادات واجهة البرمجة والتكامل الخارجي'
    },
    {
      id: 'backup',
      name: 'النسخ الاحتياطي',
      icon: DatabaseIcon,
      color: 'linear-gradient(135deg, var(--apple-amber-500) 0%, var(--apple-orange-600) 100%)',
      description: 'إعدادات النسخ الاحتياطي واسترداد البيانات'
    },
    {
      id: 'performance',
      name: 'الأداء',
      icon: ChartBarIcon,
      color: 'linear-gradient(135deg, var(--apple-cyan-500) 0%, var(--apple-sky-600) 100%)',
      description: 'إعدادات تحسين الأداء والسرعة'
    }
  ];

  // Category Navigation
  const CategoryNavigation = () => (
    <div className="glass-container" style={{ marginBottom: '2rem', padding: '1rem' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem'
      }}>
        {categories.map((category) => {
          const Icon = category.icon;
          const isActive = activeCategory === category.id;

          return (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className="slide-in-up"
              style={{
                padding: '1rem',
                background: isActive
                  ? category.color
                  : 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'var(--glass-blur)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: 'var(--radius-xl)',
                color: isActive ? 'white' : 'var(--apple-gray-800)',
                cursor: 'pointer',
                transition: 'all var(--duration-normal) var(--ease-apple)',
                textAlign: 'right',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                boxShadow: isActive ? 'var(--apple-shadow-lg)' : 'var(--apple-shadow-sm)',
                transform: isActive ? 'translateY(-2px)' : 'translateY(0)'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = 'var(--apple-shadow-md)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'var(--apple-shadow-sm)';
                }
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                background: isActive ? 'rgba(255, 255, 255, 0.2)' : category.color,
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Icon style={{
                  width: '20px',
                  height: '20px',
                  color: isActive ? 'white' : 'white'
                }} />
              </div>
              <div style={{ flex: 1, textAlign: 'right' }}>
                <div style={{
                  fontWeight: '600',
                  fontSize: '14px',
                  marginBottom: '0.25rem'
                }}>
                  {category.name}
                </div>
                <div style={{
                  fontSize: '12px',
                  opacity: 0.8,
                  lineHeight: '1.3'
                }}>
                  {category.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  // Settings Form Component
  const SettingsForm = ({ category }) => {
    const categoryData = categories.find(c => c.id === category);
    const categorySettings = settings[category];

    if (!categoryData || !categorySettings) return null;

    const renderFormField = (key, value, type = 'text', options = null) => {
      const fieldId = `${category}-${key}`;

      return (
        <div key={key} style={{ marginBottom: '1.5rem' }}>
          <label
            htmlFor={fieldId}
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--apple-gray-700)',
              marginBottom: '0.5rem'
            }}
          >
            {getFieldLabel(key)}
          </label>

          {type === 'select' ? (
            <select
              id={fieldId}
              value={value}
              onChange={(e) => updateSetting(category, key, e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'var(--glass-blur)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: 'var(--radius-lg)',
                fontSize: '14px',
                color: 'var(--apple-gray-800)',
                transition: 'all var(--duration-normal) var(--ease-apple)'
              }}
            >
              {options && options.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : type === 'textarea' ? (
            <textarea
              id={fieldId}
              value={value}
              onChange={(e) => updateSetting(category, key, e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'var(--glass-blur)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: 'var(--radius-lg)',
                fontSize: '14px',
                color: 'var(--apple-gray-800)',
                resize: 'vertical',
                minHeight: '80px',
                transition: 'all var(--duration-normal) var(--ease-apple)'
              }}
            />
          ) : type === 'checkbox' ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              background: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'var(--glass-blur)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: 'var(--radius-lg)',
              cursor: 'pointer',
              transition: 'all var(--duration-normal) var(--ease-apple)'
            }}
            onClick={() => updateSetting(category, key, !value)}
            >
              <div style={{
                width: '20px',
                height: '20px',
                background: value ? 'linear-gradient(135deg, var(--apple-green-500) 0%, var(--apple-emerald-600) 100%)' : 'rgba(255, 255, 255, 0.8)',
                border: value ? 'none' : '2px solid var(--apple-gray-300)',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all var(--duration-normal) var(--ease-apple)'
              }}>
                {value && <CheckCircleIcon style={{ width: '14px', height: '14px', color: 'white' }} />}
              </div>
              <span style={{ fontSize: '14px', color: 'var(--apple-gray-700)' }}>
                تفعيل هذا الإعداد
              </span>
            </div>
          ) : type === 'password' ? (
            <div style={{ position: 'relative' }}>
              <input
                id={fieldId}
                type={showApiKeys ? 'text' : 'password'}
                value={value}
                onChange={(e) => updateSetting(category, key, e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 3rem 0.75rem 1rem',
                  background: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'var(--glass-blur)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: '14px',
                  color: 'var(--apple-gray-800)',
                  fontFamily: 'monospace',
                  transition: 'all var(--duration-normal) var(--ease-apple)'
                }}
              />
              <button
                type="button"
                onClick={() => setShowApiKeys(!showApiKeys)}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--apple-gray-500)',
                  padding: '4px'
                }}
              >
                {showApiKeys ? (
                  <EyeSlashIcon style={{ width: '18px', height: '18px' }} />
                ) : (
                  <EyeIcon style={{ width: '18px', height: '18px' }} />
                )}
              </button>
            </div>
          ) : (
            <input
              id={fieldId}
              type={type}
              value={value}
              onChange={(e) => updateSetting(category, key, type === 'number' ? parseInt(e.target.value) : e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'var(--glass-blur)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: 'var(--radius-lg)',
                fontSize: '14px',
                color: 'var(--apple-gray-800)',
                transition: 'all var(--duration-normal) var(--ease-apple)'
              }}
            />
          )}
        </div>
      );
    };

    const getFieldLabel = (key) => {
      const labels = {
        // General
        siteName: 'اسم الموقع',
        siteDescription: 'وصف الموقع',
        contactEmail: 'البريد الإلكتروني للتواصل',
        supportPhone: 'رقم هاتف الدعم',
        timezone: 'المنطقة الزمنية',
        language: 'اللغة',
        dateFormat: 'تنسيق التاريخ',
        enableMaintenance: 'وضع الصيانة',

        // Notifications
        emailNotifications: 'إشعارات البريد الإلكتروني',
        smsNotifications: 'إشعارات الرسائل النصية',
        pushNotifications: 'الإشعارات الفورية',
        welcomeEmails: 'رسائل الترحيب',
        paymentReminders: 'تذكيرات الدفع',
        eventNotifications: 'إشعارات الأحداث',
        systemAlerts: 'تنبيهات النظام',

        // Security
        enforceStrongPasswords: 'فرض كلمات مرور قوية',
        twoFactorAuth: 'المصادقة الثنائية',
        sessionTimeout: 'انتهاء صلاحية الجلسة (دقائق)',
        loginAttempts: 'محاولات تسجيل الدخول المسموحة',
        passwordExpiry: 'انتهاء صلاحية كلمة المرور (أيام)',
        enableAuditLogs: 'تفعيل سجلات التدقيق',
        ipWhitelist: 'قائمة عناوين IP المسموحة',
        requireEmailVerification: 'طلب تأكيد البريد الإلكتروني',

        // API
        rateLimitPerHour: 'حد الطلبات في الساعة',
        enableApiDocs: 'تفعيل وثائق API',
        apiVersion: 'إصدار API',
        webhookUrl: 'رابط Webhook',
        apiKey: 'مفتاح API',
        secretKey: 'المفتاح السري',

        // Backup
        autoBackup: 'النسخ الاحتياطي التلقائي',
        backupFrequency: 'تكرار النسخ الاحتياطي',
        retentionDays: 'مدة الاحتفاظ (أيام)',
        cloudStorage: 'التخزين السحابي',
        lastBackup: 'آخر نسخة احتياطية',

        // Performance
        enableCaching: 'تفعيل التخزين المؤقت',
        cacheExpiry: 'انتهاء صلاحية الكاش (ثواني)',
        enableCompression: 'تفعيل الضغط',
        maxFileSize: 'الحد الأقصى لحجم الملف (MB)',
        enableCDN: 'تفعيل CDN',
        optimizeImages: 'تحسين الصور'
      };
      return labels[key] || key;
    };

    const getFieldOptions = (key) => {
      const optionsMap = {
        timezone: [
          { value: 'Asia/Riyadh', label: 'الرياض (GMT+3)' },
          { value: 'Asia/Kuwait', label: 'الكويت (GMT+3)' },
          { value: 'Asia/Dubai', label: 'دبي (GMT+4)' }
        ],
        language: [
          { value: 'ar', label: 'العربية' },
          { value: 'en', label: 'English' }
        ],
        dateFormat: [
          { value: 'hijri', label: 'هجري' },
          { value: 'gregorian', label: 'ميلادي' },
          { value: 'both', label: 'كلاهما' }
        ],
        backupFrequency: [
          { value: 'daily', label: 'يومي' },
          { value: 'weekly', label: 'أسبوعي' },
          { value: 'monthly', label: 'شهري' }
        ],
        apiVersion: [
          { value: 'v1', label: 'الإصدار 1' },
          { value: 'v2', label: 'الإصدار 2' }
        ]
      };
      return optionsMap[key] || null;
    };

    const getFieldType = (key, value) => {
      if (typeof value === 'boolean') return 'checkbox';
      if (typeof value === 'number') return 'number';
      if (key.includes('password') || key.includes('Key')) return 'password';
      if (key.includes('Email')) return 'email';
      if (key.includes('Phone')) return 'tel';
      if (key.includes('Url')) return 'url';
      if (key === 'siteDescription' || key === 'ipWhitelist') return 'textarea';
      if (getFieldOptions(key)) return 'select';
      return 'text';
    };

    return (
      <div className="glass-container slide-in-up" style={{ padding: '2rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: categoryData.color,
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <categoryData.icon style={{ width: '24px', height: '24px', color: 'white' }} />
            </div>
            <div>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: 'var(--apple-gray-900)',
                marginBottom: '0.25rem'
              }}>
                {categoryData.name}
              </h3>
              <p style={{
                fontSize: '0.875rem',
                color: 'var(--apple-gray-600)'
              }}>
                {categoryData.description}
              </p>
            </div>
          </div>

          <button
            onClick={() => saveSettings(category)}
            disabled={saving}
            className="apple-button-primary"
            style={{ minWidth: '120px' }}
          >
            {saving ? (
              <>
                <div className="loading-spinner" style={{ width: '16px', height: '16px', marginLeft: '0.5rem' }}></div>
                جاري الحفظ...
              </>
            ) : (
              <>
                <CheckCircleIcon style={{ width: '16px', height: '16px' }} />
                حفظ الإعدادات
              </>
            )}
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem'
        }}>
          {Object.entries(categorySettings).map(([key, value]) => {
            const fieldType = getFieldType(key, value);
            const fieldOptions = getFieldOptions(key);

            return renderFormField(key, value, fieldType, fieldOptions);
          })}
        </div>
      </div>
    );
  };

  // Message Toast
  const MessageToast = () => {
    if (!message) return null;

    return (
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        padding: '1rem 1.5rem',
        background: message.type === 'success'
          ? 'linear-gradient(135deg, var(--apple-green-500) 0%, var(--apple-emerald-600) 100%)'
          : 'linear-gradient(135deg, var(--apple-red-500) 0%, var(--apple-rose-500) 100%)',
        color: 'white',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--apple-shadow-lg)',
        animation: 'slideInUp 0.3s ease-out',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem'
      }}>
        {message.type === 'success' ? (
          <CheckCircleIcon style={{ width: '20px', height: '20px' }} />
        ) : (
          <ExclamationTriangleIcon style={{ width: '20px', height: '20px' }} />
        )}
        <span>{message.text}</span>
        <button
          onClick={() => setMessage(null)}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            padding: '0.25rem',
            marginRight: '0.5rem'
          }}
        >
          ×
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
        <div className="loading-spinner" style={{ width: '40px', height: '40px', marginLeft: '1rem' }}></div>
        <span style={{ fontSize: '1.125rem', color: 'var(--apple-gray-600)' }}>
          جاري تحميل إعدادات النظام...
        </span>
      </div>
    );
  }

  return (
    <div>
      {/* Category Navigation */}
      <CategoryNavigation />

      {/* Settings Form */}
      <SettingsForm category={activeCategory} />

      {/* Message Toast */}
      <MessageToast />
    </div>
  );
};

export default SystemSettings;