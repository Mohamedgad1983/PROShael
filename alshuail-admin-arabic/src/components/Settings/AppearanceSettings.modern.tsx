/**
 * Appearance Settings Component - MODERNIZED
 * Phase 2 - Feature 5.2 - Complete UI Modernization
 *
 * Modern Component Library Integration:
 * - ModernCard for structured layout
 * - ModernButton for all actions
 * - ModernInput for custom color input
 * - ModernSwitch for toggle preferences
 * - ModernBadge for status indicators
 * - ModernDivider for section separation
 * - ModernSkeleton for loading states
 * - ModernTooltip for helpful hints
 *
 * Design Improvements:
 * - Professional typography hierarchy
 * - Consistent spacing (8px grid)
 * - Material Design elevation system
 * - Smooth transitions and animations
 * - Improved color accessibility
 * - Enhanced visual feedback
 * - Live preview indicators
 */

import React, { memo,  useState, useEffect } from 'react';
import {
  PaintBrushIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import { logger } from '../../utils/logger';

// Modern component library imports
import {
  ModernCard,
  ModernButton,
  ModernInput,
  ModernSwitch,
  ModernBadge,
  ModernDivider,
  ModernSkeleton,
  ModernTooltip
} from './shared/modern';

// Theme utilities
import { getTheme } from './modernDesignSystem';
import { useTheme } from '../../contexts/ThemeContext';

// Type imports
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
  type: 'success' | 'error' | 'info' | 'warning';
  text: string;
}

const AppearanceSettings: React.FC = () => {
  // Get theme context
  const { isDarkMode, updateTheme } = useTheme();
  const theme = getTheme(isDarkMode, true);

  // State
  const [settings, setSettings] = useState<AppearanceSettingsType>(DEFAULT_APPEARANCE_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState<AppearanceSettingsType>(DEFAULT_APPEARANCE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [customColor, setCustomColor] = useState('');
  const [showCustomColor, setShowCustomColor] = useState(false);

  // ========================================================================
  // EFFECTS
  // ========================================================================

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

  // Apply live preview only (not saved yet)
  useEffect(() => {
    if (hasChanges) {
      applyAllAppearanceSettings(settings);
      logger.debug('Live preview applied', {
        component: 'AppearanceSettings',
        theme: settings.theme_mode,
        color: settings.primary_color
      });
    }
  }, [settings, hasChanges]);

  // Auto-dismiss success messages after 5 seconds
  useEffect(() => {
    if (message && message.type === 'success') {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // ========================================================================
  // API HANDLERS
  // ========================================================================

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
        applyAllAppearanceSettings(fetchedSettings);
        logger.debug('Appearance settings fetched successfully', {
          component: 'AppearanceSettings',
          theme: fetchedSettings.theme_mode
        });
      }
    } catch (error: any) {
      logger.error('Failed to fetch appearance settings', error, {
        component: 'AppearanceSettings'
      });
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

      if (!hasChanges) {
        setMessage({
          type: 'info',
          text: 'لم يتم إجراء أي تغييرات'
        });
        return;
      }

      // Store previous settings for rollback on failure
      const previousSettings = originalSettings;

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
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data.success) {
        const updatedSettings = response.data.settings;
        setSettings(updatedSettings);
        setOriginalSettings(updatedSettings);
        setMessage({
          type: 'success',
          text: 'تم حفظ إعدادات المظهر بنجاح'
        });
        // Re-apply to ensure server response is used
        applyAllAppearanceSettings(updatedSettings);
        logger.info('Appearance settings saved successfully', {
          component: 'AppearanceSettings',
          updates: Object.keys(updates)
        });
      }
    } catch (error: any) {
      // Rollback to previous settings on failure
      setSettings(originalSettings);
      applyAllAppearanceSettings(originalSettings);

      logger.error('Failed to save appearance settings - rolled back', error, {
        component: 'AppearanceSettings',
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
          text: `فشل في حفظ إعدادات المظهر. تم التراجع عن التغييرات.`
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
        { headers: { 'Authorization': `Bearer ${token}` } }
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
        logger.info('Appearance settings reset to defaults', {
          component: 'AppearanceSettings'
        });
      }
    } catch (error: any) {
      logger.error('Failed to reset appearance settings', error, {
        component: 'AppearanceSettings'
      });
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'فشل في إعادة تعيين الإعدادات'
      });
    } finally {
      setSaving(false);
    }
  };

  // ========================================================================
  // SETTINGS HANDLERS
  // ========================================================================

  const handleThemeModeChange = (mode: ThemeMode) => {
    setSettings(prev => ({ ...prev, theme_mode: mode }));
    // Apply theme immediately via ThemeProvider
    updateTheme({ mode: mode === 'light' ? 'light' : mode === 'dark' ? 'dark' : 'auto' });
  };

  const handlePrimaryColorChange = (color: string) => {
    setSettings(prev => ({ ...prev, primary_color: color }));
    if (PRESET_COLORS.some(c => c.hex === color)) {
      setShowCustomColor(false);
    }
    // Map color hex to named color if it's a preset
    const presetColor = PRESET_COLORS.find(c => c.hex === color);
    if (presetColor) {
      updateTheme({ primaryColor: presetColor.name as any });
    }
  };

  const handleCustomColorSubmit = () => {
    if (!customColor) return;

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
    // Apply font size immediately via ThemeProvider
    updateTheme({ fontSize: size });
  };

  // ========================================================================
  // RENDER HELPERS
  // ========================================================================

  const renderMessage = () => {
    if (!message) return null;

    const iconMap = {
      success: CheckCircleIcon,
      error: ExclamationCircleIcon,
      info: InformationCircleIcon,
      warning: ExclamationCircleIcon
    };

    const Icon = iconMap[message.type];

    return (
      <div style={{ marginBottom: theme.spacing.xl }}>
        <ModernCard
          elevation="sm"
          padding="md"
          style={{
            background: message.type === 'success' ? theme.colors.success[50] :
                       message.type === 'error' ? theme.colors.error[50] :
                       message.type === 'warning' ? theme.colors.warning[50] :
                       theme.colors.info[50],
            border: `1px solid ${
              message.type === 'success' ? theme.colors.success[200] :
              message.type === 'error' ? theme.colors.error[200] :
              message.type === 'warning' ? theme.colors.warning[200] :
              theme.colors.info[200]
            }`
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
            <Icon style={{
              width: '20px',
              height: '20px',
              color: message.type === 'success' ? theme.colors.success[600] :
                     message.type === 'error' ? theme.colors.error[600] :
                     message.type === 'warning' ? theme.colors.warning[600] :
                     theme.colors.info[600]
            }} />
            <span style={{
              fontSize: theme.fontSize.body,
              fontWeight: theme.fontWeight.medium,
              color: message.type === 'success' ? theme.colors.success[700] :
                     message.type === 'error' ? theme.colors.error[700] :
                     message.type === 'warning' ? theme.colors.warning[700] :
                     theme.colors.info[700]
            }}>
              {message.text}
            </span>
          </div>
        </ModernCard>
      </div>
    );
  };

  // ========================================================================
  // LOADING STATE
  // ========================================================================

  if (loading) {
    return (
      <div>
        <div style={{
          fontSize: theme.fontSize['2xl'],
          fontWeight: theme.fontWeight.bold,
          marginBottom: theme.spacing['3xl'],
          color: theme.colors.gray[700],
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.md
        }}>
          <PaintBrushIcon style={{ width: '32px', height: '32px' }} />
          المظهر
        </div>

        <ModernCard elevation="md" padding="lg">
          <ModernSkeleton variant="text" width="40%" height="24px" style={{ marginBottom: theme.spacing.lg }} />
          <ModernSkeleton variant="text" width="60%" height="16px" style={{ marginBottom: theme.spacing.xl }} />

          <ModernSkeleton variant="rounded" width="100%" height="120px" style={{ marginBottom: theme.spacing.xl }} />
          <ModernSkeleton variant="rounded" width="100%" height="120px" style={{ marginBottom: theme.spacing.xl }} />
          <ModernSkeleton variant="rounded" width="100%" height="120px" />
        </ModernCard>
      </div>
    );
  }

  // ========================================================================
  // MAIN RENDER
  // ========================================================================

  return (
    <div>
      {/* Page Title */}
      <div style={{
        fontSize: theme.fontSize['2xl'],
        fontWeight: theme.fontWeight.bold,
        marginBottom: theme.spacing['3xl'],
        color: theme.colors.gray[700],
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing.md
      }}>
        <PaintBrushIcon style={{ width: '32px', height: '32px', color: theme.colors.primary[500] }} />
        المظهر
        {hasChanges && (
          <ModernBadge variant="warning" badgeStyle="subtle" size="small">
            تغييرات غير محفوظة
          </ModernBadge>
        )}
      </div>

      <ModernCard elevation="md" padding="none">
        <div style={{ padding: theme.spacing.xl }}>
          {/* Messages */}
          {renderMessage()}

          {/* Theme Mode Section */}
          <div style={{ marginBottom: theme.spacing['4xl'] }}>
            <div style={{
              fontSize: theme.fontSize.bodyLg,
              fontWeight: theme.fontWeight.semibold,
              color: theme.colors.gray[700],
              marginBottom: theme.spacing.xs
            }}>
              وضع المظهر
            </div>
            <div style={{
              fontSize: theme.fontSize.bodySm,
              color: theme.colors.gray[600],
              marginBottom: theme.spacing.lg
            }}>
              اختر السمة المفضلة لديك
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: theme.spacing.md }}>
              {(['light', 'dark', 'auto'] as ThemeMode[]).map((mode) => {
                const isActive = settings.theme_mode === mode;
                const icons = {
                  light: SunIcon,
                  dark: MoonIcon,
                  auto: ComputerDesktopIcon
                };
                const Icon = icons[mode];

                return (
                  <ModernCard
                    key={mode}
                    elevation={isActive ? 'md' : 'sm'}
                    hoverable={!isActive}
                    padding="md"
                    onClick={() => handleThemeModeChange(mode)}
                    style={{
                      border: `2px solid ${isActive ? theme.colors.primary[500] : 'transparent'}`,
                      background: isActive ? `${theme.colors.primary[500]}10` : theme.colors.white,
                      cursor: 'pointer',
                      transition: theme.transitions.common.all
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: theme.spacing.sm, textAlign: 'center' }}>
                      <Icon style={{
                        width: '32px',
                        height: '32px',
                        color: isActive ? theme.colors.primary[500] : theme.colors.gray[600]
                      }} />
                      <div style={{
                        fontWeight: theme.fontWeight.semibold,
                        fontSize: theme.fontSize.body,
                        color: theme.colors.gray[700]
                      }}>
                        {THEME_MODE_LABELS[mode].ar}
                      </div>
                      <div style={{
                        fontSize: theme.fontSize.caption,
                        color: theme.colors.gray[500]
                      }}>
                        {THEME_MODE_LABELS[mode].en}
                      </div>
                      {isActive && (
                        <ModernBadge variant="primary" badgeStyle="solid" size="small">
                          <CheckCircleIcon style={{ width: '12px', height: '12px' }} />
                        </ModernBadge>
                      )}
                    </div>
                  </ModernCard>
                );
              })}
            </div>
          </div>

          <ModernDivider spacing={2} />

          {/* Primary Color Section */}
          <div style={{ marginBottom: theme.spacing['4xl'] }}>
            <div style={{
              fontSize: theme.fontSize.bodyLg,
              fontWeight: theme.fontWeight.semibold,
              color: theme.colors.gray[700],
              marginBottom: theme.spacing.xs
            }}>
              اللون الأساسي
            </div>
            <div style={{
              fontSize: theme.fontSize.bodySm,
              color: theme.colors.gray[600],
              marginBottom: theme.spacing.lg
            }}>
              اختر اللون الرئيسي للنظام
            </div>

            <div style={{ display: 'flex', gap: theme.spacing.md, flexWrap: 'wrap', marginBottom: theme.spacing.lg }}>
              {PRESET_COLORS.map((colorOption) => {
                const isActive = settings.primary_color === colorOption.hex;

                return (
                  <ModernTooltip
                    key={colorOption.hex}
                    content={`${colorOption.nameAr} (${colorOption.name})`}
                    placement="top"
                  >
                    <button
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        background: colorOption.hex,
                        border: `3px solid ${isActive ? theme.colors.gray[900] : 'transparent'}`,
                        cursor: 'pointer',
                        transition: theme.transitions.common.all,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: isActive ? theme.shadows.lg : theme.shadows.sm,
                        transform: isActive ? 'scale(1.1)' : 'scale(1)'
                      }}
                      onClick={() => handlePrimaryColorChange(colorOption.hex)}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      {isActive && (
                        <CheckCircleIcon style={{
                          width: '24px',
                          height: '24px',
                          color: theme.colors.white,
                          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                        }} />
                      )}
                    </button>
                  </ModernTooltip>
                );
              })}
            </div>

            {/* Custom Color */}
            <ModernButton
              variant="secondary"
              size="medium"
              onClick={() => setShowCustomColor(!showCustomColor)}
              style={{ marginBottom: showCustomColor ? theme.spacing.md : 0 }}
            >
              {showCustomColor ? 'إخفاء اللون المخصص' : 'لون مخصص'}
            </ModernButton>

            {showCustomColor && (
              <div style={{ display: 'flex', gap: theme.spacing.md, marginTop: theme.spacing.md }}>
                <ModernInput
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  placeholder="#1976d2"
                  size="medium"
                  variant="outlined"
                  style={{ flex: 1, fontFamily: 'monospace' }}
                />
                <ModernButton
                  variant="primary"
                  size="medium"
                  onClick={handleCustomColorSubmit}
                  disabled={!customColor}
                >
                  تطبيق
                </ModernButton>
              </div>
            )}
          </div>

          <ModernDivider spacing={2} />

          {/* Font Size Section */}
          <div style={{ marginBottom: theme.spacing['4xl'] }}>
            <div style={{
              fontSize: theme.fontSize.bodyLg,
              fontWeight: theme.fontWeight.semibold,
              color: theme.colors.gray[700],
              marginBottom: theme.spacing.xs
            }}>
              حجم الخط
            </div>
            <div style={{
              fontSize: theme.fontSize.bodySm,
              color: theme.colors.gray[600],
              marginBottom: theme.spacing.lg
            }}>
              اختر حجم الخط المناسب لك
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: theme.spacing.md }}>
              {(['small', 'medium', 'large'] as FontSize[]).map((size) => {
                const isActive = settings.font_size === size;
                const fontSizes = {
                  small: '14px',
                  medium: '16px',
                  large: '18px'
                };

                return (
                  <ModernCard
                    key={size}
                    elevation={isActive ? 'md' : 'sm'}
                    hoverable={!isActive}
                    padding="md"
                    onClick={() => handleFontSizeChange(size)}
                    style={{
                      border: `2px solid ${isActive ? theme.colors.primary[500] : 'transparent'}`,
                      background: isActive ? `${theme.colors.primary[500]}10` : theme.colors.white,
                      cursor: 'pointer',
                      transition: theme.transitions.common.all,
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontSize: fontSizes[size], fontWeight: theme.fontWeight.semibold, color: theme.colors.gray[700] }}>
                      {FONT_SIZE_LABELS[size].ar}
                    </div>
                    <div style={{ fontSize: theme.fontSize.caption, color: theme.colors.gray[500], marginTop: theme.spacing.xs }}>
                      {FONT_SIZE_LABELS[size].en}
                    </div>
                  </ModernCard>
                );
              })}
            </div>
          </div>

          <ModernDivider spacing={2} />

          {/* UI Preferences Section */}
          <div>
            <div style={{
              fontSize: theme.fontSize.bodyLg,
              fontWeight: theme.fontWeight.semibold,
              color: theme.colors.gray[700],
              marginBottom: theme.spacing.xs
            }}>
              تفضيلات الواجهة
            </div>
            <div style={{
              fontSize: theme.fontSize.bodySm,
              color: theme.colors.gray[600],
              marginBottom: theme.spacing.lg
            }}>
              خيارات إضافية لتحسين تجربة الاستخدام
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
              <ModernSwitch
                checked={settings.compact_mode}
                onChange={(checked) => {
                  setSettings(prev => ({ ...prev, compact_mode: checked }));
                  updateTheme({ compactMode: checked });
                }}
                size="medium"
                label="الوضع المدمج"
                description="تقليل المساحات بين العناصر لعرض محتوى أكثر"
                labelPosition="right"
              />

              <ModernSwitch
                checked={settings.animations_enabled}
                onChange={(checked) => {
                  setSettings(prev => ({ ...prev, animations_enabled: checked }));
                  updateTheme({ animationsEnabled: checked });
                }}
                size="medium"
                label="الحركات والتأثيرات"
                description="تفعيل الحركات الانتقالية في الواجهة"
                labelPosition="right"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div style={{
          padding: theme.spacing.xl,
          borderTop: `1px solid ${theme.colors.gray[200]}`,
          background: theme.colors.gray[50],
          display: 'flex',
          gap: theme.spacing.md,
          flexWrap: 'wrap'
        }}>
          <ModernButton
            variant="primary"
            size="large"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            loading={saving}
          >
            {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
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
          >
            إعادة تعيين الافتراضية
          </ModernButton>
        </div>

        {/* Live Preview Info */}
        <div style={{
          padding: theme.spacing.lg,
          background: theme.colors.info[50],
          borderTop: `1px solid ${theme.colors.info[200]}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
            <InformationCircleIcon style={{ width: '20px', height: '20px', color: theme.colors.info[600], flexShrink: 0 }} />
            <span style={{ fontSize: theme.fontSize.bodySm, color: theme.colors.info[700] }}>
              التغييرات تطبق فوراً كمعاينة. اضغط "حفظ التغييرات" لتثبيت الإعدادات.
            </span>
          </div>
        </div>
      </ModernCard>
    </div>
  );
};

export default memo(AppearanceSettings);
