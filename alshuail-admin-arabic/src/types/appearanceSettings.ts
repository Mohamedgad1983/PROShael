/**
 * Appearance Settings Type Definitions
 * Complete type-safe structure for user appearance/theme preferences
 *
 * Database Storage: users.appearance_settings JSONB field
 * Last Modified: 2025-11-13
 */

/**
 * Theme mode options
 */
export type ThemeMode = 'light' | 'dark' | 'auto';

/**
 * Font size options
 */
export type FontSize = 'small' | 'medium' | 'large';

/**
 * Complete appearance settings structure
 * Stored in users.appearance_settings JSONB field
 */
export interface AppearanceSettings {
  /**
   * Theme mode (light/dark/auto)
   * Auto follows system preference
   * @default "auto"
   */
  theme_mode: ThemeMode;

  /**
   * Primary color (hex code)
   * Used for branding and accent colors
   * @default "#1976d2" (blue)
   */
  primary_color: string;

  /**
   * Font size preference
   * @default "medium"
   */
  font_size: FontSize;

  /**
   * Compact mode (reduced spacing)
   * @default false
   */
  compact_mode: boolean;

  /**
   * Enable/disable animations
   * @default true
   */
  animations_enabled: boolean;

  /**
   * Last updated timestamp (ISO 8601)
   * Auto-updated on every settings change
   */
  updated_at?: string;
}

/**
 * Default appearance settings for new users
 */
export const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettings = {
  theme_mode: 'auto',
  primary_color: '#1976d2',
  font_size: 'medium',
  compact_mode: false,
  animations_enabled: true
};

/**
 * Validation helper: Check if hex color code is valid
 */
export function isValidHexColor(color: string): boolean {
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexRegex.test(color);
}

/**
 * Validation helper: Check if theme mode is valid
 */
export function isValidThemeMode(mode: unknown): mode is ThemeMode {
  const validModes: ThemeMode[] = ['light', 'dark', 'auto'];
  return validModes.includes(mode as ThemeMode);
}

/**
 * Validation helper: Check if font size is valid
 */
export function isValidFontSize(size: unknown): size is FontSize {
  const validSizes: FontSize[] = ['small', 'medium', 'large'];
  return validSizes.includes(size as FontSize);
}

/**
 * Validation helper: Validate entire appearance settings object
 */
export function validateAppearanceSettings(settings: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!settings || typeof settings !== 'object') {
    return { valid: false, errors: ['Settings must be an object'] };
  }

  const s = settings as Partial<AppearanceSettings>;

  // Validate theme_mode
  if (!isValidThemeMode(s.theme_mode)) {
    errors.push('theme_mode must be one of: light, dark, auto');
  }

  // Validate primary_color
  if (s.primary_color !== undefined) {
    if (typeof s.primary_color !== 'string') {
      errors.push('primary_color must be a string');
    } else if (!isValidHexColor(s.primary_color)) {
      errors.push('primary_color must be a valid hex color code (e.g., #1976d2)');
    }
  }

  // Validate font_size
  if (!isValidFontSize(s.font_size)) {
    errors.push('font_size must be one of: small, medium, large');
  }

  // Validate compact_mode
  if (typeof s.compact_mode !== 'boolean') {
    errors.push('compact_mode must be a boolean');
  }

  // Validate animations_enabled
  if (typeof s.animations_enabled !== 'boolean') {
    errors.push('animations_enabled must be a boolean');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Bilingual labels for theme modes
 */
export const THEME_MODE_LABELS: Record<ThemeMode, { ar: string; en: string }> = {
  light: {
    ar: 'فاتح',
    en: 'Light'
  },
  dark: {
    ar: 'داكن',
    en: 'Dark'
  },
  auto: {
    ar: 'تلقائي (حسب النظام)',
    en: 'Auto (System)'
  }
};

/**
 * Bilingual labels for font sizes
 */
export const FONT_SIZE_LABELS: Record<FontSize, { ar: string; en: string }> = {
  small: {
    ar: 'صغير',
    en: 'Small'
  },
  medium: {
    ar: 'متوسط',
    en: 'Medium'
  },
  large: {
    ar: 'كبير',
    en: 'Large'
  }
};

/**
 * Preset color palettes for quick selection
 */
export const PRESET_COLORS = [
  { name: 'Blue', nameAr: 'أزرق', hex: '#1976d2' },
  { name: 'Green', nameAr: 'أخضر', hex: '#388e3c' },
  { name: 'Purple', nameAr: 'بنفسجي', hex: '#7b1fa2' },
  { name: 'Orange', nameAr: 'برتقالي', hex: '#f57c00' },
  { name: 'Red', nameAr: 'أحمر', hex: '#d32f2f' },
  { name: 'Teal', nameAr: 'أزرق مخضر', hex: '#00796b' },
  { name: 'Pink', nameAr: 'وردي', hex: '#c2185b' },
  { name: 'Indigo', nameAr: 'نيلي', hex: '#303f9f' }
];

/**
 * Apply theme mode to document
 */
export function applyThemeMode(mode: ThemeMode): void {
  const root = document.documentElement;

  if (mode === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    root.setAttribute('data-theme', mode);
  }
}

/**
 * Apply font size to document
 */
export function applyFontSize(size: FontSize): void {
  const root = document.documentElement;
  root.setAttribute('data-font-size', size);
}

/**
 * Apply compact mode to document
 */
export function applyCompactMode(enabled: boolean): void {
  const root = document.documentElement;
  if (enabled) {
    root.setAttribute('data-compact', 'true');
  } else {
    root.removeAttribute('data-compact');
  }
}

/**
 * Apply animations setting to document
 */
export function applyAnimations(enabled: boolean): void {
  const root = document.documentElement;
  if (!enabled) {
    root.setAttribute('data-no-animations', 'true');
  } else {
    root.removeAttribute('data-no-animations');
  }
}

/**
 * Apply primary color to document
 */
export function applyPrimaryColor(color: string): void {
  const root = document.documentElement;
  root.style.setProperty('--primary-color', color);
}

/**
 * Apply all appearance settings to document
 */
export function applyAllAppearanceSettings(settings: AppearanceSettings): void {
  applyThemeMode(settings.theme_mode);
  applyFontSize(settings.font_size);
  applyCompactMode(settings.compact_mode);
  applyAnimations(settings.animations_enabled);
  applyPrimaryColor(settings.primary_color);
}
