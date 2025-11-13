/**
 * Appearance Settings Component
 * Phase 2 - Feature 5.2
 * Allows users to customize theme mode, colors, font size, and UI preferences
 */

import React, { useState, useEffect } from 'react';
import {
  PaintBrushIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
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
  AppearanceSettings as AppearanceSettingsType,
  ThemeMode,
  FontSize,
  THEME_MODE_LABELS,
  FONT_SIZE_LABELS,
  PRESET_COLORS,
  DEFAULT_APPEARANCE_SETTINGS,
  applyAllAppearanceSettings
} from '../../types/appearanceSettings';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001';

interface Message {
  type: 'success' | 'error' | 'info';
  text: string;
}

const AppearanceSettings: React.FC = () => {
  const [settings, setSettings] = useState<AppearanceSettingsType>(DEFAULT_APPEARANCE_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState<AppearanceSettingsType>(DEFAULT_APPEARANCE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [customColor, setCustomColor] = useState('');
  const [showCustomColor, setShowCustomColor] = useState(false);

  // Fetch appearance settings on mount
  useEffect(() => {
    fetchAppearanceSettings();
  }, []);

  // Track changes
  useEffect(() => {
    const changed =
      settings.theme_mode !== originalSettings.theme_mode ||
      settings.primary_color !== originalSettings.primary_color ||
      settings.font_size !== originalSettings.font_size ||
      settings.compact_mode !== originalSettings.compact_mode ||
      settings.animations_enabled !== originalSettings.animations_enabled;

    setHasChanges(changed);
  }, [settings, originalSettings]);

  // Apply live preview
  useEffect(() => {
    applyAllAppearanceSettings(settings);
  }, [settings]);

  const fetchAppearanceSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/api/user/profile/appearance-settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        const fetchedSettings = response.data.settings;
        setSettings(fetchedSettings);
        setOriginalSettings(fetchedSettings);
        // Apply current settings
        applyAllAppearanceSettings(fetchedSettings);
      }
    } catch (error: any) {
      console.error('Failed to fetch appearance settings:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'فشل في جلب إعدادات المظهر'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);

      // Check if any changes made
      if (!hasChanges) {
        setMessage({
          type: 'info',
          text: 'لم يتم إجراء أي تغييرات'
        });
        return;
      }

      // Prepare updates (only changed fields)
      const updates: Partial<AppearanceSettingsType> = {};
      if (settings.theme_mode !== originalSettings.theme_mode) updates.theme_mode = settings.theme_mode;
      if (settings.primary_color !== originalSettings.primary_color) updates.primary_color = settings.primary_color;
      if (settings.font_size !== originalSettings.font_size) updates.font_size = settings.font_size;
      if (settings.compact_mode !== originalSettings.compact_mode) updates.compact_mode = settings.compact_mode;
      if (settings.animations_enabled !== originalSettings.animations_enabled) updates.animations_enabled = settings.animations_enabled;

      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_BASE}/api/user/profile/appearance-settings`,
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
          text: 'تم حفظ إعدادات المظهر بنجاح'
        });
        // Apply updated settings
        applyAllAppearanceSettings(updatedSettings);
      }
    } catch (error: any) {
      console.error('Save appearance settings error:', error);

      if (error.response?.status === 429) {
        const retryAfter = error.response.data.retryAfter || 60;
        setMessage({
          type: 'error',
          text: `تم تجاوز الحد الأقصى للمحاولات. يرجى المحاولة بعد ${retryAfter} دقيقة`
        });
      } else {
        setMessage({
          type: 'error',
          text: error.response?.data?.message || 'فشل في حفظ إعدادات المظهر'
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(originalSettings);
    setCustomColor('');
    setShowCustomColor(false);
    applyAllAppearanceSettings(originalSettings);
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
      const response = await axios.put(
        `${API_BASE}/api/user/profile/appearance-settings`,
        DEFAULT_APPEARANCE_SETTINGS,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        const resetSettings = response.data.settings;
        setSettings(resetSettings);
        setOriginalSettings(resetSettings);
        setCustomColor('');
        setShowCustomColor(false);
        setMessage({
          type: 'success',
          text: 'تم إعادة تعيين الإعدادات إلى القيم الافتراضية'
        });
        applyAllAppearanceSettings(resetSettings);
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

  const handleThemeModeChange = (mode: ThemeMode) => {
    setSettings(prev => ({ ...prev, theme_mode: mode }));
  };

  const handlePrimaryColorChange = (color: string) => {
    setSettings(prev => ({ ...prev, primary_color: color }));
    if (PRESET_COLORS.some(c => c.hex === color)) {
      setShowCustomColor(false);
    }
  };

  const handleCustomColorSubmit = () => {
    if (!customColor) return;

    // Validate hex color format
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexRegex.test(customColor)) {
      setMessage({
        type: 'error',
        text: 'صيغة اللون غير صحيحة. استخدم صيغة HEX (مثال: #1976d2)'
      });
      return;
    }

    setSettings(prev => ({ ...prev, primary_color: customColor }));
    setMessage(null);
  };

  const handleFontSizeChange = (size: FontSize) => {
    setSettings(prev => ({ ...prev, font_size: size }));
  };

  const handleCompactModeToggle = () => {
    setSettings(prev => ({ ...prev, compact_mode: !prev.compact_mode }));
  };

  const handleAnimationsToggle = () => {
    setSettings(prev => ({ ...prev, animations_enabled: !prev.animations_enabled }));
  };

  // Auto-dismiss messages after 5 seconds
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

  const themeButtonStyle = (isActive: boolean): React.CSSProperties => ({
    flex: 1,
    padding: SPACING.lg,
    border: `2px solid ${isActive ? COLORS.primary : COLORS.border}`,
    borderRadius: BORDER_RADIUS.lg,
    background: isActive ? COLORS.primaryLight + '20' : COLORS.white,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: SPACING.sm
  });

  const colorOptionStyle = (isActive: boolean, color: string): React.CSSProperties => ({
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: color,
    border: `3px solid ${isActive ? COLORS.gray900 : 'transparent'}`,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.2)' : '0 2px 6px rgba(0,0,0,0.1)'
  });

  const fontSizeButtonStyle = (isActive: boolean): React.CSSProperties => ({
    flex: 1,
    padding: SPACING.lg,
    border: `2px solid ${isActive ? COLORS.primary : COLORS.border}`,
    borderRadius: BORDER_RADIUS.lg,
    background: isActive ? COLORS.primaryLight + '20' : COLORS.white,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textAlign: 'center'
  });

  const toggleStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    background: COLORS.gray50,
    borderRadius: BORDER_RADIUS.md,
    cursor: 'pointer'
  });

  const switchStyle = (isActive: boolean): React.CSSProperties => ({
    width: '48px',
    height: '24px',
    borderRadius: '12px',
    background: isActive ? COLORS.primary : COLORS.gray300,
    position: 'relative' as const,
    transition: 'background 0.3s ease'
  });

  const switchKnobStyle = (isActive: boolean): React.CSSProperties => ({
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: COLORS.white,
    position: 'absolute' as const,
    top: '2px',
    left: isActive ? '26px' : '2px',
    transition: 'left 0.3s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
  });

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: SPACING['4xl'] }}>
        <div style={{ fontSize: TYPOGRAPHY.lg, color: COLORS.gray400, marginBottom: SPACING.xl }}>
          جاري تحميل إعدادات المظهر...
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
        <PaintBrushIcon style={{ width: '32px', height: '32px' }} />
        المظهر
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

        {/* Theme Mode Section */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            وضع المظهر
          </div>
          <div style={sectionDescriptionStyle}>
            اختر السمة المفضلة لديك
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: SPACING.md }}>
            <button
              style={themeButtonStyle(settings.theme_mode === 'light')}
              onClick={() => handleThemeModeChange('light')}
              onMouseEnter={(e) => {
                if (settings.theme_mode !== 'light') {
                  e.currentTarget.style.borderColor = COLORS.primary;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (settings.theme_mode !== 'light') {
                  e.currentTarget.style.borderColor = COLORS.border;
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              <SunIcon style={{ width: '32px', height: '32px', color: settings.theme_mode === 'light' ? COLORS.primary : COLORS.gray600 }} />
              <div style={{ fontWeight: TYPOGRAPHY.medium, fontSize: TYPOGRAPHY.base }}>
                {THEME_MODE_LABELS.light.ar}
              </div>
              <div style={{ fontSize: TYPOGRAPHY.xs, color: COLORS.gray500 }}>
                {THEME_MODE_LABELS.light.en}
              </div>
            </button>

            <button
              style={themeButtonStyle(settings.theme_mode === 'dark')}
              onClick={() => handleThemeModeChange('dark')}
              onMouseEnter={(e) => {
                if (settings.theme_mode !== 'dark') {
                  e.currentTarget.style.borderColor = COLORS.primary;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (settings.theme_mode !== 'dark') {
                  e.currentTarget.style.borderColor = COLORS.border;
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              <MoonIcon style={{ width: '32px', height: '32px', color: settings.theme_mode === 'dark' ? COLORS.primary : COLORS.gray600 }} />
              <div style={{ fontWeight: TYPOGRAPHY.medium, fontSize: TYPOGRAPHY.base }}>
                {THEME_MODE_LABELS.dark.ar}
              </div>
              <div style={{ fontSize: TYPOGRAPHY.xs, color: COLORS.gray500 }}>
                {THEME_MODE_LABELS.dark.en}
              </div>
            </button>

            <button
              style={themeButtonStyle(settings.theme_mode === 'auto')}
              onClick={() => handleThemeModeChange('auto')}
              onMouseEnter={(e) => {
                if (settings.theme_mode !== 'auto') {
                  e.currentTarget.style.borderColor = COLORS.primary;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (settings.theme_mode !== 'auto') {
                  e.currentTarget.style.borderColor = COLORS.border;
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              <ComputerDesktopIcon style={{ width: '32px', height: '32px', color: settings.theme_mode === 'auto' ? COLORS.primary : COLORS.gray600 }} />
              <div style={{ fontWeight: TYPOGRAPHY.medium, fontSize: TYPOGRAPHY.base }}>
                {THEME_MODE_LABELS.auto.ar}
              </div>
              <div style={{ fontSize: TYPOGRAPHY.xs, color: COLORS.gray500 }}>
                {THEME_MODE_LABELS.auto.en}
              </div>
            </button>
          </div>
        </div>

        {/* Primary Color Section */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            اللون الأساسي
          </div>
          <div style={sectionDescriptionStyle}>
            اختر اللون الرئيسي للنظام
          </div>

          <div style={{ display: 'flex', gap: SPACING.lg, flexWrap: 'wrap', marginBottom: SPACING.lg }}>
            {PRESET_COLORS.map((colorOption) => (
              <button
                key={colorOption.hex}
                style={colorOptionStyle(settings.primary_color === colorOption.hex, colorOption.hex)}
                onClick={() => handlePrimaryColorChange(colorOption.hex)}
                title={`${colorOption.nameAr} (${colorOption.name})`}
                onMouseEnter={(e) => {
                  if (settings.primary_color !== colorOption.hex) {
                    e.currentTarget.style.transform = 'scale(1.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (settings.primary_color !== colorOption.hex) {
                    e.currentTarget.style.transform = 'scale(1)';
                  }
                }}
              >
                {settings.primary_color === colorOption.hex && (
                  <CheckCircleIcon style={{ width: '24px', height: '24px', color: COLORS.white, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
                )}
              </button>
            ))}
          </div>

          {/* Custom Color */}
          <div>
            <button
              style={{
                ...commonStyles.button.secondary,
                marginBottom: showCustomColor ? SPACING.md : 0
              }}
              onClick={() => setShowCustomColor(!showCustomColor)}
            >
              {showCustomColor ? 'إخفاء اللون المخصص' : 'لون مخصص'}
            </button>

            {showCustomColor && (
              <div style={{ display: 'flex', gap: SPACING.md, alignItems: 'center', marginTop: SPACING.md }}>
                <input
                  type="text"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  placeholder="#1976d2"
                  style={{
                    ...commonStyles.input,
                    flex: 1,
                    fontFamily: 'monospace'
                  }}
                />
                <SettingsButton
                  variant="primary"
                  onClick={handleCustomColorSubmit}
                  disabled={!customColor}
                >
                  تطبيق
                </SettingsButton>
              </div>
            )}
          </div>
        </div>

        {/* Font Size Section */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            حجم الخط
          </div>
          <div style={sectionDescriptionStyle}>
            اختر حجم الخط المناسب لك
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: SPACING.md }}>
            <button
              style={fontSizeButtonStyle(settings.font_size === 'small')}
              onClick={() => handleFontSizeChange('small')}
              onMouseEnter={(e) => {
                if (settings.font_size !== 'small') {
                  e.currentTarget.style.borderColor = COLORS.primary;
                }
              }}
              onMouseLeave={(e) => {
                if (settings.font_size !== 'small') {
                  e.currentTarget.style.borderColor = COLORS.border;
                }
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: TYPOGRAPHY.medium }}>
                {FONT_SIZE_LABELS.small.ar}
              </div>
              <div style={{ fontSize: '12px', color: COLORS.gray500 }}>
                {FONT_SIZE_LABELS.small.en}
              </div>
            </button>

            <button
              style={fontSizeButtonStyle(settings.font_size === 'medium')}
              onClick={() => handleFontSizeChange('medium')}
              onMouseEnter={(e) => {
                if (settings.font_size !== 'medium') {
                  e.currentTarget.style.borderColor = COLORS.primary;
                }
              }}
              onMouseLeave={(e) => {
                if (settings.font_size !== 'medium') {
                  e.currentTarget.style.borderColor = COLORS.border;
                }
              }}
            >
              <div style={{ fontSize: '16px', fontWeight: TYPOGRAPHY.medium }}>
                {FONT_SIZE_LABELS.medium.ar}
              </div>
              <div style={{ fontSize: '14px', color: COLORS.gray500 }}>
                {FONT_SIZE_LABELS.medium.en}
              </div>
            </button>

            <button
              style={fontSizeButtonStyle(settings.font_size === 'large')}
              onClick={() => handleFontSizeChange('large')}
              onMouseEnter={(e) => {
                if (settings.font_size !== 'large') {
                  e.currentTarget.style.borderColor = COLORS.primary;
                }
              }}
              onMouseLeave={(e) => {
                if (settings.font_size !== 'large') {
                  e.currentTarget.style.borderColor = COLORS.border;
                }
              }}
            >
              <div style={{ fontSize: '18px', fontWeight: TYPOGRAPHY.medium }}>
                {FONT_SIZE_LABELS.large.ar}
              </div>
              <div style={{ fontSize: '16px', color: COLORS.gray500 }}>
                {FONT_SIZE_LABELS.large.en}
              </div>
            </button>
          </div>
        </div>

        {/* UI Preferences Section */}
        <div style={{ ...sectionStyle, borderBottom: 'none' }}>
          <div style={sectionTitleStyle}>
            تفضيلات الواجهة
          </div>
          <div style={sectionDescriptionStyle}>
            خيارات إضافية لتحسين تجربة الاستخدام
          </div>

          <div style={{ display: 'grid', gap: SPACING.md }}>
            {/* Compact Mode */}
            <div
              style={toggleStyle(settings.compact_mode)}
              onClick={handleCompactModeToggle}
            >
              <div>
                <div style={{ fontSize: TYPOGRAPHY.base, fontWeight: TYPOGRAPHY.medium, color: COLORS.gray900, marginBottom: SPACING.xs }}>
                  الوضع المدمج
                </div>
                <div style={{ fontSize: TYPOGRAPHY.sm, color: COLORS.gray500 }}>
                  تقليل المساحات بين العناصر لعرض محتوى أكثر
                </div>
              </div>
              <div style={switchStyle(settings.compact_mode)}>
                <div style={switchKnobStyle(settings.compact_mode)} />
              </div>
            </div>

            {/* Animations */}
            <div
              style={toggleStyle(settings.animations_enabled)}
              onClick={handleAnimationsToggle}
            >
              <div>
                <div style={{ fontSize: TYPOGRAPHY.base, fontWeight: TYPOGRAPHY.medium, color: COLORS.gray900, marginBottom: SPACING.xs }}>
                  الحركات والتأثيرات
                </div>
                <div style={{ fontSize: TYPOGRAPHY.sm, color: COLORS.gray500 }}>
                  تفعيل الحركات الانتقالية في الواجهة
                </div>
              </div>
              <div style={switchStyle(settings.animations_enabled)}>
                <div style={switchKnobStyle(settings.animations_enabled)} />
              </div>
            </div>
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

export default AppearanceSettings;
