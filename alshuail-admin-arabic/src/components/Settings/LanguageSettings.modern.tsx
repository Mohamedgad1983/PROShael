/**
 * Language & Region Settings Component - MODERNIZED VERSION
 * Phase 3 - Feature 5.3
 * Allows users to customize language, region, timezone, date/time formats, and currency preferences
 *
 * @version 2.0.0 (Modern Design System)
 * @date 2025-11-13
 */

import React, { memo,  useState, useEffect } from 'react';
import {
  LanguageIcon,
  GlobeAltIcon,
  ClockIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import { logger } from '../../utils/logger';
import {
  ModernCard,
  ModernButton,
  ModernBadge,
  ModernDivider,
  ModernSkeleton
} from './shared/modern';
import { getTheme } from './modernDesignSystem';
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
  type: 'success' | 'error' | 'info' | 'warning';
  text: string;
}

const LanguageSettings: React.FC = () => {
  const theme = getTheme(false, true); // Light mode, RTL

  const [settings, setSettings] = useState<LanguageSettingsType>(DEFAULT_LANGUAGE_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState<LanguageSettingsType>(DEFAULT_LANGUAGE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // =========================================================================
  // DATA FETCHING & EFFECTS
  // =========================================================================

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

  // Apply live preview only (not saved yet)
  useEffect(() => {
    if (hasChanges) {
      applyLanguageSettings(settings);
      logger.debug('Live preview applied', {
        component: 'LanguageSettings',
        language: settings.language,
        region: settings.region
      });
    }
  }, [settings, hasChanges]);

  // Auto-dismiss success messages
  useEffect(() => {
    if (message && message.type === 'success') {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

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
        logger.debug('Language settings fetched successfully', {
          component: 'LanguageSettings',
          language: fetchedSettings.language,
          region: fetchedSettings.region
        });
      }
    } catch (error: any) {
      logger.error('Failed to fetch language settings', error, {
        component: 'LanguageSettings'
      });
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'فشل في جلب إعدادات اللغة والمنطقة'
      });
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // ACTION HANDLERS
  // =========================================================================

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

      // Store previous settings for rollback on failure
      const previousSettings = originalSettings;

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
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data.success) {
        const updatedSettings = response.data.settings;
        setSettings(updatedSettings);
        setOriginalSettings(updatedSettings);
        setMessage({
          type: 'success',
          text: 'تم حفظ إعدادات اللغة والمنطقة بنجاح'
        });
        // Re-apply to ensure server response is used
        applyLanguageSettings(updatedSettings);
        logger.info('Language settings saved successfully', {
          component: 'LanguageSettings',
          updates: Object.keys(updates)
        });
      }
    } catch (error: any) {
      // Rollback to previous settings on failure
      setSettings(originalSettings);
      applyLanguageSettings(originalSettings);

      logger.error('Failed to save language settings - rolled back', error, {
        component: 'LanguageSettings',
        rolledBack: true
      });

      if (error.response?.status === 429) {
        const retryAfter = error.response.data.retryAfter || 60;
        setMessage({
          type: 'error',
          text: `تم تجاوز الحد الأقصى للمحاولات. تم التراجع عن التغييرات. المحاولة بعد ${retryAfter} دقيقة`
        });
      } else {
        setMessage({
          type: 'error',
          text: `فشل في حفظ إعدادات اللغة والمنطقة. تم التراجع عن التغييرات.`
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
        { headers: { 'Authorization': `Bearer ${token}` } }
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
        logger.info('Language settings reset to defaults', {
          component: 'LanguageSettings'
        });
      }
    } catch (error: any) {
      logger.error('Failed to reset language settings', error, {
        component: 'LanguageSettings'
      });
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

  // =========================================================================
  // MESSAGE RENDERING
  // =========================================================================

  const renderMessage = () => {
    if (!message) return null;

    const messageColors = {
      success: {
        background: theme.colors.success[50],
        border: theme.colors.success[200],
        text: theme.colors.success[700]
      },
      error: {
        background: theme.colors.error[50],
        border: theme.colors.error[200],
        text: theme.colors.error[700]
      },
      info: {
        background: theme.colors.info[50],
        border: theme.colors.info[200],
        text: theme.colors.info[700]
      },
      warning: {
        background: theme.colors.warning[50],
        border: theme.colors.warning[200],
        text: theme.colors.warning[700]
      }
    };

    const colors = messageColors[message.type];
    const Icon = message.type === 'success' ? CheckCircleIcon :
                 message.type === 'error' ? XMarkIcon :
                 message.type === 'warning' ? ExclamationCircleIcon :
                 InformationCircleIcon;

    return (
      <ModernCard
        elevation="sm"
        padding="md"
        style={{
          background: colors.background,
          border: `1px solid ${colors.border}`,
          marginBottom: theme.spacing.xl
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
          <Icon style={{ width: '20px', height: '20px', color: colors.text, flexShrink: 0 }} />
          <span style={{
            fontSize: theme.fontSize.body,
            fontWeight: theme.fontWeight.medium,
            color: colors.text,
            fontFamily: theme.fonts.primary
          }}>
            {message.text}
          </span>
        </div>
      </ModernCard>
    );
  };

  // =========================================================================
  // OPTION BUTTON COMPONENT
  // =========================================================================

  interface OptionButtonProps {
    isActive: boolean;
    onClick: () => void;
    title: string;
    subtitle?: string;
    example?: string;
  }

  const OptionButton: React.FC<OptionButtonProps> = ({ isActive, onClick, title, subtitle, example }) => {
    return (
      <ModernCard
        elevation={isActive ? 'md' : 'sm'}
        hoverable={!isActive}
        padding="md"
        onClick={onClick}
        style={{
          border: `2px solid ${isActive ? theme.colors.primary[500] : 'transparent'}`,
          background: isActive ? `${theme.colors.primary[500]}08` : theme.colors.white,
          cursor: 'pointer',
          transition: `all 200ms ${theme.transitions.easing.standard}`,
          textAlign: 'center'
        }}
      >
        <div style={{
          fontSize: theme.fontSize.body,
          fontWeight: theme.fontWeight.medium,
          color: theme.colors.gray[700],
          marginBottom: subtitle ? theme.spacing.xs : (example ? theme.spacing.xs : 0),
          fontFamily: theme.fonts.primary
        }}>
          {title}
        </div>
        {subtitle && (
          <div style={{
            fontSize: theme.fontSize.bodySm,
            color: theme.colors.gray[600],
            marginBottom: example ? theme.spacing.xs : 0,
            fontFamily: theme.fonts.primary
          }}>
            {subtitle}
          </div>
        )}
        {example && (
          <div style={{
            fontSize: theme.fontSize.bodySm,
            color: theme.colors.primary[600],
            fontFamily: 'monospace',
            fontWeight: theme.fontWeight.medium
          }}>
            {example}
          </div>
        )}
        {isActive && (
          <div style={{ marginTop: theme.spacing.xs }}>
            <ModernBadge variant="primary" size="small">
              <CheckCircleIcon style={{ width: '14px', height: '14px', marginLeft: '4px' }} />
              مفعل
            </ModernBadge>
          </div>
        )}
      </ModernCard>
    );
  };

  // =========================================================================
  // LOADING STATE
  // =========================================================================

  if (loading) {
    return (
      <div>
        <div style={{
          fontSize: theme.fontSize.h2,
          fontWeight: theme.fontWeight.bold,
          marginBottom: theme.spacing['3xl'],
          color: theme.colors.gray[700],
          fontFamily: theme.fonts.primary,
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.md
        }}>
          <LanguageIcon style={{ width: '32px', height: '32px' }} />
          اللغة والمنطقة
        </div>

        <ModernCard elevation="md" padding="lg">
          <ModernSkeleton variant="text" width="40%" height="24px" />
          <ModernSkeleton variant="rounded" width="100%" height="120px" style={{ marginTop: theme.spacing.lg }} />
          <ModernDivider style={{ margin: `${theme.spacing.xl} 0` }} />
          <ModernSkeleton variant="text" width="40%" height="24px" />
          <ModernSkeleton variant="rounded" width="100%" height="120px" style={{ marginTop: theme.spacing.lg }} />
        </ModernCard>
      </div>
    );
  }

  // =========================================================================
  // MAIN RENDER
  // =========================================================================

  return (
    <div>
      {/* Page Header */}
      <div style={{
        fontSize: theme.fontSize.h2,
        fontWeight: theme.fontWeight.bold,
        marginBottom: theme.spacing['3xl'],
        color: theme.colors.gray[700],
        fontFamily: theme.fonts.primary,
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing.md
      }}>
        <LanguageIcon style={{ width: '32px', height: '32px' }} />
        اللغة والمنطقة
        {hasChanges && (
          <ModernBadge variant="warning" size="medium">
            تغييرات غير محفوظة
          </ModernBadge>
        )}
      </div>

      {/* Global Messages */}
      {renderMessage()}

      {/* Main Card */}
      <ModernCard elevation="md" padding="none">
        {/* =====================================================================
            LANGUAGE SECTION
        ===================================================================== */}
        <div style={{ padding: theme.spacing['3xl'] }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.md,
            marginBottom: theme.spacing.xs
          }}>
            <LanguageIcon style={{ width: '24px', height: '24px', color: theme.colors.primary[500] }} />
            <div style={{
              fontSize: theme.fontSize.h3,
              fontWeight: theme.fontWeight.semibold,
              color: theme.colors.gray[700],
              fontFamily: theme.fonts.primary
            }}>
              لغة الواجهة
            </div>
          </div>
          <div style={{
            fontSize: theme.fontSize.bodySm,
            color: theme.colors.gray[600],
            marginBottom: theme.spacing.xl,
            fontFamily: theme.fonts.primary
          }}>
            اختر لغة عرض النظام
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: theme.spacing.md }}>
            {(['ar', 'en', 'both'] as Language[]).map((lang) => (
              <OptionButton
                key={lang}
                isActive={settings.language === lang}
                onClick={() => setSettings(prev => ({ ...prev, language: lang }))}
                title={LANGUAGE_LABELS[lang].ar}
                subtitle={LANGUAGE_LABELS[lang].en}
              />
            ))}
          </div>
        </div>

        <ModernDivider />

        {/* =====================================================================
            REGION SECTION
        ===================================================================== */}
        <div style={{ padding: theme.spacing['3xl'] }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.md,
            marginBottom: theme.spacing.xs
          }}>
            <GlobeAltIcon style={{ width: '24px', height: '24px', color: theme.colors.primary[500] }} />
            <div style={{
              fontSize: theme.fontSize.h3,
              fontWeight: theme.fontWeight.semibold,
              color: theme.colors.gray[700],
              fontFamily: theme.fonts.primary
            }}>
              المنطقة
            </div>
          </div>
          <div style={{
            fontSize: theme.fontSize.bodySm,
            color: theme.colors.gray[600],
            marginBottom: theme.spacing.xl,
            fontFamily: theme.fonts.primary
          }}>
            اختر منطقتك أو بلدك (سيتم تحديث المنطقة الزمنية والعملة تلقائياً)
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: theme.spacing.md }}>
            {COMMON_REGIONS.map((region) => (
              <OptionButton
                key={region.code}
                isActive={settings.region === region.code}
                onClick={() => handleRegionChange(region.code)}
                title={region.nameAr}
                subtitle={`${region.name} (${region.code})`}
              />
            ))}
          </div>
        </div>

        <ModernDivider />

        {/* =====================================================================
            DATE FORMAT SECTION
        ===================================================================== */}
        <div style={{ padding: theme.spacing['3xl'] }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.md,
            marginBottom: theme.spacing.xs
          }}>
            <CalendarIcon style={{ width: '24px', height: '24px', color: theme.colors.primary[500] }} />
            <div style={{
              fontSize: theme.fontSize.h3,
              fontWeight: theme.fontWeight.semibold,
              color: theme.colors.gray[700],
              fontFamily: theme.fonts.primary
            }}>
              تنسيق التاريخ
            </div>
          </div>
          <div style={{
            fontSize: theme.fontSize.bodySm,
            color: theme.colors.gray[600],
            marginBottom: theme.spacing.xl,
            fontFamily: theme.fonts.primary
          }}>
            اختر طريقة عرض التاريخ
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: theme.spacing.md }}>
            {(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] as DateFormat[]).map((format) => (
              <OptionButton
                key={format}
                isActive={settings.date_format === format}
                onClick={() => setSettings(prev => ({ ...prev, date_format: format }))}
                title={DATE_FORMAT_LABELS[format].ar}
                subtitle={DATE_FORMAT_LABELS[format].en}
                example={DATE_FORMAT_LABELS[format].example}
              />
            ))}
          </div>
        </div>

        <ModernDivider />

        {/* =====================================================================
            TIME FORMAT SECTION
        ===================================================================== */}
        <div style={{ padding: theme.spacing['3xl'] }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.md,
            marginBottom: theme.spacing.xs
          }}>
            <ClockIcon style={{ width: '24px', height: '24px', color: theme.colors.primary[500] }} />
            <div style={{
              fontSize: theme.fontSize.h3,
              fontWeight: theme.fontWeight.semibold,
              color: theme.colors.gray[700],
              fontFamily: theme.fonts.primary
            }}>
              تنسيق الوقت
            </div>
          </div>
          <div style={{
            fontSize: theme.fontSize.bodySm,
            color: theme.colors.gray[600],
            marginBottom: theme.spacing.xl,
            fontFamily: theme.fonts.primary
          }}>
            اختر نظام الوقت (12 ساعة أو 24 ساعة)
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: theme.spacing.md }}>
            {(['12h', '24h'] as TimeFormat[]).map((format) => (
              <OptionButton
                key={format}
                isActive={settings.time_format === format}
                onClick={() => setSettings(prev => ({ ...prev, time_format: format }))}
                title={TIME_FORMAT_LABELS[format].ar}
                subtitle={TIME_FORMAT_LABELS[format].en}
                example={TIME_FORMAT_LABELS[format].example}
              />
            ))}
          </div>
        </div>

        <ModernDivider />

        {/* =====================================================================
            NUMBER FORMAT SECTION
        ===================================================================== */}
        <div style={{ padding: theme.spacing['3xl'] }}>
          <div style={{
            fontSize: theme.fontSize.h3,
            fontWeight: theme.fontWeight.semibold,
            color: theme.colors.gray[700],
            marginBottom: theme.spacing.xs,
            fontFamily: theme.fonts.primary
          }}>
            نظام الأرقام
          </div>
          <div style={{
            fontSize: theme.fontSize.bodySm,
            color: theme.colors.gray[600],
            marginBottom: theme.spacing.xl,
            fontFamily: theme.fonts.primary
          }}>
            اختر نظام كتابة الأرقام
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: theme.spacing.md }}>
            {(['western', 'arabic'] as NumberFormat[]).map((format) => (
              <OptionButton
                key={format}
                isActive={settings.number_format === format}
                onClick={() => setSettings(prev => ({ ...prev, number_format: format }))}
                title={NUMBER_FORMAT_LABELS[format].ar}
                subtitle={NUMBER_FORMAT_LABELS[format].en}
                example={NUMBER_FORMAT_LABELS[format].example}
              />
            ))}
          </div>
        </div>

        <ModernDivider />

        {/* =====================================================================
            WEEK START SECTION
        ===================================================================== */}
        <div style={{ padding: theme.spacing['3xl'] }}>
          <div style={{
            fontSize: theme.fontSize.h3,
            fontWeight: theme.fontWeight.semibold,
            color: theme.colors.gray[700],
            marginBottom: theme.spacing.xs,
            fontFamily: theme.fonts.primary
          }}>
            بداية الأسبوع
          </div>
          <div style={{
            fontSize: theme.fontSize.bodySm,
            color: theme.colors.gray[600],
            marginBottom: theme.spacing.xl,
            fontFamily: theme.fonts.primary
          }}>
            اختر اليوم الأول من الأسبوع
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: theme.spacing.md }}>
            {(['saturday', 'sunday', 'monday'] as WeekStart[]).map((day) => (
              <OptionButton
                key={day}
                isActive={settings.week_start === day}
                onClick={() => setSettings(prev => ({ ...prev, week_start: day }))}
                title={WEEK_START_LABELS[day].ar}
                subtitle={WEEK_START_LABELS[day].en}
              />
            ))}
          </div>
        </div>

        <ModernDivider />

        {/* =====================================================================
            CURRENCY SECTION
        ===================================================================== */}
        <div style={{ padding: theme.spacing['3xl'] }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.md,
            marginBottom: theme.spacing.xs
          }}>
            <CurrencyDollarIcon style={{ width: '24px', height: '24px', color: theme.colors.primary[500] }} />
            <div style={{
              fontSize: theme.fontSize.h3,
              fontWeight: theme.fontWeight.semibold,
              color: theme.colors.gray[700],
              fontFamily: theme.fonts.primary
            }}>
              العملة
            </div>
          </div>
          <div style={{
            fontSize: theme.fontSize.bodySm,
            color: theme.colors.gray[600],
            marginBottom: theme.spacing.xl,
            fontFamily: theme.fonts.primary
          }}>
            اختر العملة المفضلة لعرض المبالغ المالية
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: theme.spacing.md }}>
            {COMMON_CURRENCIES.map((curr) => (
              <OptionButton
                key={curr.code}
                isActive={settings.currency === curr.code}
                onClick={() => setSettings(prev => ({ ...prev, currency: curr.code }))}
                title={`${curr.nameAr} (${curr.symbol})`}
                subtitle={`${curr.name} - ${curr.code}`}
              />
            ))}
          </div>
        </div>

        <ModernDivider />

        {/* =====================================================================
            ACTION BUTTONS
        ===================================================================== */}
        <div style={{
          padding: theme.spacing['3xl'],
          background: theme.colors.gray[50],
          borderRadius: `0 0 ${theme.borderRadius.xl} ${theme.borderRadius.xl}`
        }}>
          <div style={{ display: 'flex', gap: theme.spacing.md, flexWrap: 'wrap' }}>
            <ModernButton
              variant="primary"
              size="large"
              onClick={handleSave}
              disabled={saving || !hasChanges}
              loading={saving}
            >
              حفظ التغييرات
            </ModernButton>

            <ModernButton
              variant="secondary"
              size="large"
              onClick={handleReset}
              disabled={saving || !hasChanges}
            >
              إلغاء
            </ModernButton>

            <ModernButton
              variant="ghost"
              size="large"
              onClick={handleResetToDefaults}
              disabled={saving}
              style={{ color: theme.colors.error[500] }}
            >
              إعادة تعيين الافتراضية
            </ModernButton>
          </div>

          {/* Preview Info Banner */}
          <ModernCard
            elevation="none"
            padding="md"
            style={{
              marginTop: theme.spacing.lg,
              background: theme.colors.info[50],
              border: `1px solid ${theme.colors.info[200]}`
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
              <InformationCircleIcon style={{
                width: '20px',
                height: '20px',
                color: theme.colors.info[600],
                flexShrink: 0
              }} />
              <span style={{
                fontSize: theme.fontSize.bodySm,
                color: theme.colors.info[700],
                fontFamily: theme.fonts.primary
              }}>
                التغييرات تطبق فوراً كمعاينة. اضغط "حفظ التغييرات" لتثبيت الإعدادات.
              </span>
            </div>
          </ModernCard>
        </div>
      </ModernCard>
    </div>
  );
};

export default memo(LanguageSettings);
