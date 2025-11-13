/**
 * Language & Region Settings Component
 * Phase 3 - Feature 5.3
 * Allows users to customize language, region, timezone, date/time formats, and currency preferences
 */

import React, { useState, useEffect } from 'react';
import {
  LanguageIcon,
  GlobeAltIcon,
  ClockIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import {
  SettingsCard,
  SettingsButton
} from './shared';
import {
  COLORS,
  SPACING,
  TYPOGRAPHY,
  BORDER_RADIUS,
  commonStyles
} from './sharedStyles';
import {
  LanguageSettings as LanguageSettingsType,
  Language,
  DateFormat,
  TimeFormat,
  NumberFormat,
  WeekStart,
  LANGUAGE_LABELS,
  DATE_FORMAT_LABELS,
  TIME_FORMAT_LABELS,
  NUMBER_FORMAT_LABELS,
  WEEK_START_LABELS,
  COMMON_REGIONS,
  COMMON_CURRENCIES,
  DEFAULT_LANGUAGE_SETTINGS,
  applyLanguageSettings
} from '../../types/languageSettings';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001';

interface Message {
  type: 'success' | 'error' | 'info';
  text: string;
}

const LanguageSettings: React.FC = () => {
  const [settings, setSettings] = useState<LanguageSettingsType>(DEFAULT_LANGUAGE_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState<LanguageSettingsType>(DEFAULT_LANGUAGE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch language settings on mount
  useEffect(() => {
    fetchLanguageSettings();
  }, []);

  // Track changes
  useEffect(() => {
    const changed =
      settings.language !== originalSettings.language ||
      settings.region !== originalSettings.region ||
      settings.timezone !== originalSettings.timezone ||
      settings.date_format !== originalSettings.date_format ||
      settings.time_format !== originalSettings.time_format ||
      settings.number_format !== originalSettings.number_format ||
      settings.currency !== originalSettings.currency ||
      settings.week_start !== originalSettings.week_start;

    setHasChanges(changed);
  }, [settings, originalSettings]);

  // Apply live preview
  useEffect(() => {
    applyLanguageSettings(settings);
  }, [settings]);

  const fetchLanguageSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/api/user/profile/language-settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        const fetchedSettings = response.data.settings;
        setSettings(fetchedSettings);
        setOriginalSettings(fetchedSettings);
        applyLanguageSettings(fetchedSettings);
      }
    } catch (error: any) {
      console.error('Failed to fetch language settings:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'فشل في جلب إعدادات اللغة والمنطقة'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);

      if (!hasChanges) {
        setMessage({
          type: 'info',
          text: 'لم يتم إجراء أي تغييرات'
        });
        return;
      }

      // Prepare updates (only changed fields)
      const updates: Partial<LanguageSettingsType> = {};
      if (settings.language !== originalSettings.language) updates.language = settings.language;
      if (settings.region !== originalSettings.region) updates.region = settings.region;
      if (settings.timezone !== originalSettings.timezone) updates.timezone = settings.timezone;
      if (settings.date_format !== originalSettings.date_format) updates.date_format = settings.date_format;
      if (settings.time_format !== originalSettings.time_format) updates.time_format = settings.time_format;
      if (settings.number_format !== originalSettings.number_format) updates.number_format = settings.number_format;
      if (settings.currency !== originalSettings.currency) updates.currency = settings.currency;
      if (settings.week_start !== originalSettings.week_start) updates.week_start = settings.week_start;

      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_BASE}/api/user/profile/language-settings`,
        updates,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        const updatedSettings = response.data.settings;
        setSettings(updatedSettings);
        setOriginalSettings(updatedSettings);
        setMessage({
          type: 'success',
          text: 'تم حفظ إعدادات اللغة والمنطقة بنجاح'
        });
        applyLanguageSettings(updatedSettings);
      }
    } catch (error: any) {
      console.error('Save language settings error:', error);

      if (error.response?.status === 429) {
        const retryAfter = error.response.data.retryAfter || 60;
        setMessage({
          type: 'error',
          text: `تم تجاوز الحد الأقصى للمحاولات. يرجى المحاولة بعد ${retryAfter} دقيقة`
        });
      } else {
        setMessage({
          type: 'error',
          text: error.response?.data?.message || 'فشل في حفظ إعدادات اللغة والمنطقة'
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(originalSettings);
    applyLanguageSettings(originalSettings);
    setMessage({
      type: 'info',
      text: 'تم إلغاء التغييرات'
    });
  };

  const handleResetToDefaults = async () => {
    if (!window.confirm('هل أنت متأكد من إعادة تعيين جميع الإعدادات إلى القيم الافتراضية؟')) return;

    try {
      setSaving(true);
      setMessage(null);

      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `${API_BASE}/api/user/profile/language-settings`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        const resetSettings = response.data.settings;
        setSettings(resetSettings);
        setOriginalSettings(resetSettings);
        setMessage({
          type: 'success',
          text: 'تم إعادة تعيين الإعدادات إلى القيم الافتراضية'
        });
        applyLanguageSettings(resetSettings);
      }
    } catch (error: any) {
      console.error('Reset to defaults error:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'فشل في إعادة تعيين الإعدادات'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRegionChange = (regionCode: string) => {
    const region = COMMON_REGIONS.find(r => r.code === regionCode);
    if (region) {
      setSettings(prev => ({
        ...prev,
        region: region.code,
        timezone: region.timezone,
        currency: region.currency
      }));
    }
  };

  // Auto-dismiss success messages after 5 seconds
  useEffect(() => {
    if (message && message.type === 'success') {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Styles
  const messageStyle = (type: Message['type']): React.CSSProperties => ({
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xl,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.md,
    background: type === 'success' ? COLORS.successBg :
                type === 'error' ? COLORS.errorBg : COLORS.infoBg,
    color: type === 'success' ? COLORS.successText :
           type === 'error' ? COLORS.errorText : COLORS.infoText,
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.medium
  });

  const sectionStyle: React.CSSProperties = {
    marginBottom: SPACING['4xl'],
    paddingBottom: SPACING['4xl'],
    borderBottom: `1px solid ${COLORS.border}`
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.gray900,
    marginBottom: SPACING.xs,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.md
  };

  const sectionDescriptionStyle: React.CSSProperties = {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.gray500,
    marginBottom: SPACING.xl
  };

  const optionButtonStyle = (isActive: boolean): React.CSSProperties => ({
    flex: 1,
    padding: SPACING.lg,
    border: `2px solid ${isActive ? COLORS.primary : COLORS.border}`,
    borderRadius: BORDER_RADIUS.lg,
    background: isActive ? COLORS.primaryLight + '20' : COLORS.white,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textAlign: 'center'
  });

  const regionCardStyle = (isActive: boolean): React.CSSProperties => ({
    padding: SPACING.md,
    border: `2px solid ${isActive ? COLORS.primary : COLORS.border}`,
    borderRadius: BORDER_RADIUS.md,
    background: isActive ? COLORS.primaryLight + '15' : COLORS.white,
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  });

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: SPACING['4xl'] }}>
        <div style={{ fontSize: TYPOGRAPHY.lg, color: COLORS.gray400, marginBottom: SPACING.xl }}>
          جاري تحميل إعدادات اللغة والمنطقة...
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{
        fontSize: TYPOGRAPHY['2xl'],
        fontWeight: TYPOGRAPHY.bold,
        marginBottom: SPACING['3xl'],
        color: COLORS.gray900,
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.md
      }}>
        <LanguageIcon style={{ width: '32px', height: '32px' }} />
        اللغة والمنطقة
      </div>

      <SettingsCard>
        {/* Messages */}
        {message && (
          <div style={messageStyle(message.type)}>
            {message.type === 'success' && <CheckCircleIcon style={{ width: '20px', height: '20px' }} />}
            {message.type === 'error' && <ExclamationCircleIcon style={{ width: '20px', height: '20px' }} />}
            {message.type === 'info' && <ExclamationCircleIcon style={{ width: '20px', height: '20px' }} />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Language Section */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            <LanguageIcon style={{ width: '20px', height: '20px' }} />
            لغة الواجهة
          </div>
          <div style={sectionDescriptionStyle}>
            اختر لغة عرض النظام
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: SPACING.md }}>
            {(['ar', 'en', 'both'] as Language[]).map((lang) => (
              <button
                key={lang}
                style={optionButtonStyle(settings.language === lang)}
                onClick={() => setSettings(prev => ({ ...prev, language: lang }))}
                onMouseEnter={(e) => {
                  if (settings.language !== lang) {
                    e.currentTarget.style.borderColor = COLORS.primary;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (settings.language !== lang) {
                    e.currentTarget.style.borderColor = COLORS.border;
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                <div style={{ fontWeight: TYPOGRAPHY.medium, fontSize: TYPOGRAPHY.base, marginBottom: SPACING.xs }}>
                  {LANGUAGE_LABELS[lang].ar}
                </div>
                <div style={{ fontSize: TYPOGRAPHY.xs, color: COLORS.gray500 }}>
                  {LANGUAGE_LABELS[lang].en}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Region Section */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            <GlobeAltIcon style={{ width: '20px', height: '20px' }} />
            المنطقة
          </div>
          <div style={sectionDescriptionStyle}>
            اختر منطقتك أو بلدك
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: SPACING.md }}>
            {COMMON_REGIONS.map((region) => (
              <button
                key={region.code}
                style={regionCardStyle(settings.region === region.code)}
                onClick={() => handleRegionChange(region.code)}
              >
                <div style={{ fontWeight: TYPOGRAPHY.medium, marginBottom: SPACING.xs }}>
                  {region.nameAr}
                </div>
                <div style={{ fontSize: TYPOGRAPHY.xs, color: COLORS.gray500 }}>
                  {region.name} ({region.code})
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Date Format Section */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            <CalendarIcon style={{ width: '20px', height: '20px' }} />
            تنسيق التاريخ
          </div>
          <div style={sectionDescriptionStyle}>
            اختر طريقة عرض التاريخ
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: SPACING.md }}>
            {(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] as DateFormat[]).map((format) => (
              <button
                key={format}
                style={optionButtonStyle(settings.date_format === format)}
                onClick={() => setSettings(prev => ({ ...prev, date_format: format }))}
              >
                <div style={{ fontWeight: TYPOGRAPHY.medium, marginBottom: SPACING.xs }}>
                  {DATE_FORMAT_LABELS[format].ar}
                </div>
                <div style={{ fontSize: TYPOGRAPHY.xs, color: COLORS.gray500, marginBottom: SPACING.xs }}>
                  {DATE_FORMAT_LABELS[format].en}
                </div>
                <div style={{ fontSize: TYPOGRAPHY.xs, color: COLORS.primary, fontFamily: 'monospace' }}>
                  {DATE_FORMAT_LABELS[format].example}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Time Format Section */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            <ClockIcon style={{ width: '20px', height: '20px' }} />
            تنسيق الوقت
          </div>
          <div style={sectionDescriptionStyle}>
            اختر نظام الوقت (12 ساعة أو 24 ساعة)
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: SPACING.md }}>
            {(['12h', '24h'] as TimeFormat[]).map((format) => (
              <button
                key={format}
                style={optionButtonStyle(settings.time_format === format)}
                onClick={() => setSettings(prev => ({ ...prev, time_format: format }))}
              >
                <div style={{ fontWeight: TYPOGRAPHY.medium, marginBottom: SPACING.xs }}>
                  {TIME_FORMAT_LABELS[format].ar}
                </div>
                <div style={{ fontSize: TYPOGRAPHY.xs, color: COLORS.gray500, marginBottom: SPACING.xs }}>
                  {TIME_FORMAT_LABELS[format].en}
                </div>
                <div style={{ fontSize: TYPOGRAPHY.xs, color: COLORS.primary, fontFamily: 'monospace' }}>
                  {TIME_FORMAT_LABELS[format].example}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Number Format Section */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            نظام الأرقام
          </div>
          <div style={sectionDescriptionStyle}>
            اختر نظام كتابة الأرقام
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: SPACING.md }}>
            {(['western', 'arabic'] as NumberFormat[]).map((format) => (
              <button
                key={format}
                style={optionButtonStyle(settings.number_format === format)}
                onClick={() => setSettings(prev => ({ ...prev, number_format: format }))}
              >
                <div style={{ fontWeight: TYPOGRAPHY.medium, marginBottom: SPACING.xs }}>
                  {NUMBER_FORMAT_LABELS[format].ar}
                </div>
                <div style={{ fontSize: TYPOGRAPHY.xs, color: COLORS.gray500, marginBottom: SPACING.xs }}>
                  {NUMBER_FORMAT_LABELS[format].en}
                </div>
                <div style={{ fontSize: TYPOGRAPHY.base, color: COLORS.primary, fontFamily: 'monospace' }}>
                  {NUMBER_FORMAT_LABELS[format].example}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Week Start Section */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            بداية الأسبوع
          </div>
          <div style={sectionDescriptionStyle}>
            اختر اليوم الأول من الأسبوع
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: SPACING.md }}>
            {(['saturday', 'sunday', 'monday'] as WeekStart[]).map((day) => (
              <button
                key={day}
                style={optionButtonStyle(settings.week_start === day)}
                onClick={() => setSettings(prev => ({ ...prev, week_start: day }))}
              >
                <div style={{ fontWeight: TYPOGRAPHY.medium, marginBottom: SPACING.xs }}>
                  {WEEK_START_LABELS[day].ar}
                </div>
                <div style={{ fontSize: TYPOGRAPHY.xs, color: COLORS.gray500 }}>
                  {WEEK_START_LABELS[day].en}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Currency Section */}
        <div style={{ ...sectionStyle, borderBottom: 'none' }}>
          <div style={sectionTitleStyle}>
            <CurrencyDollarIcon style={{ width: '20px', height: '20px' }} />
            العملة
          </div>
          <div style={sectionDescriptionStyle}>
            اختر العملة المفضلة لعرض المبالغ المالية
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: SPACING.md }}>
            {COMMON_CURRENCIES.map((curr) => (
              <button
                key={curr.code}
                style={regionCardStyle(settings.currency === curr.code)}
                onClick={() => setSettings(prev => ({ ...prev, currency: curr.code }))}
              >
                <div style={{ fontWeight: TYPOGRAPHY.medium, marginBottom: SPACING.xs }}>
                  {curr.nameAr} ({curr.symbol})
                </div>
                <div style={{ fontSize: TYPOGRAPHY.xs, color: COLORS.gray500 }}>
                  {curr.name} - {curr.code}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: SPACING.md,
          marginTop: SPACING['3xl'],
          paddingTop: SPACING['3xl'],
          borderTop: `1px solid ${COLORS.border}`
        }}>
          <SettingsButton
            variant="primary"
            onClick={handleSave}
            disabled={saving || !hasChanges}
          >
            {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </SettingsButton>

          <SettingsButton
            variant="secondary"
            onClick={handleReset}
            disabled={saving || !hasChanges}
          >
            إلغاء
          </SettingsButton>

          <SettingsButton
            variant="danger"
            onClick={handleResetToDefaults}
            disabled={saving}
          >
            إعادة تعيين الافتراضية
          </SettingsButton>
        </div>

        {/* Preview Info */}
        <div style={{
          marginTop: SPACING.xl,
          padding: SPACING.lg,
          background: COLORS.infoBg,
          borderRadius: BORDER_RADIUS.md,
          fontSize: TYPOGRAPHY.sm,
          color: COLORS.infoText,
          display: 'flex',
          alignItems: 'center',
          gap: SPACING.md
        }}>
          <ExclamationCircleIcon style={{ width: '20px', height: '20px' }} />
          <span>التغييرات تطبق فوراً كمعاينة. اضغط "حفظ التغييرات" لتثبيت الإعدادات.</span>
        </div>
      </SettingsCard>
    </div>
  );
};

export default LanguageSettings;
