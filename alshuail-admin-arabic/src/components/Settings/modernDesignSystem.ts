/**
 * Modern Design System for Settings UI
 * Enterprise-grade design tokens following Material Design and Ant Design principles
 *
 * Features:
 * - Complete typography system with Arabic (Tajawal) and English (Inter) fonts
 * - Comprehensive color palette with semantic colors
 * - 8px grid spacing system
 * - Elevation/shadow system
 * - Animation/transition system
 * - Responsive breakpoints
 * - Dark mode support
 * - RTL/LTR support
 *
 * @version 2.0.0
 * @date 2025-11-13
 */

// ============================================================================
// TYPOGRAPHY SYSTEM
// ============================================================================

export const FONTS = {
  // Arabic font stack (Tajawal primary)
  arabic: "'Tajawal', 'IBM Plex Sans Arabic', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",

  // English font stack (Inter primary)
  english: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",

  // Monospace for code/numbers
  mono: "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Droid Sans Mono', monospace"
} as const;

export const FONT_SIZES = {
  display: '48px',    // 3rem - Hero text, page headers
  h1: '32px',         // 2rem - Main headings
  h2: '24px',         // 1.5rem - Section headings
  h3: '20px',         // 1.25rem - Subsection headings
  bodyLg: '16px',     // 1rem - Large body text
  body: '14px',       // 0.875rem - Standard body text
  bodySm: '13px',     // 0.8125rem - Small body text
  caption: '12px',    // 0.75rem - Labels, helper text
  tiny: '11px'        // 0.6875rem - Metadata, timestamps
} as const;

export const FONT_WEIGHTS = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700'
} as const;

export const LINE_HEIGHTS = {
  tight: '1.2',       // Headings
  normal: '1.5',      // Body text
  relaxed: '1.75'     // Long-form content
} as const;

// ============================================================================
// COLOR SYSTEM
// ============================================================================

export const COLORS = {
  // Primary Brand Colors
  primary: {
    50: '#F5F7FF',
    100: '#EBF0FF',
    200: '#D6E0FF',
    300: '#A3BBFF',
    400: '#7095FF',
    500: '#667EEA',   // Main brand color
    600: '#5568D3',
    700: '#4453BC',
    800: '#343FA5',
    900: '#232B8E'
  },

  // Secondary Accent
  secondary: {
    50: '#FAF5FF',
    100: '#F3E8FF',
    200: '#E9D5FF',
    300: '#D8B4FE',
    400: '#C084FC',
    500: '#A855F7',
    600: '#9333EA',
    700: '#7E22CE',
    800: '#6B21A8',
    900: '#581C87'
  },

  // Semantic Colors
  success: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#10B981',   // Main success color
    600: '#059669',
    700: '#047857',
    800: '#065F46',
    900: '#064E3B'
  },

  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',   // Main warning color
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F'
  },

  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',   // Main error color
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D'
  },

  info: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',   // Main info color
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A'
  },

  // Neutral Grays (Light Mode)
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827'
  },

  // Base colors
  white: '#FFFFFF',
  black: '#000000',
  background: '#FFFFFF',  // Light mode background
  surface: '#F9FAFB',     // Light mode surface (gray-50)
  elevated: '#F3F4F6',    // Light mode elevated (gray-100)

  // Transparent
  transparent: 'transparent',

  // Current (for borders)
  current: 'currentColor'
} as const;

// Dark Mode Color Overrides
export const DARK_COLORS = {
  // Background layers
  background: '#0F172A',  // Slate 900
  surface: '#1E293B',     // Slate 800
  elevated: '#334155',    // Slate 700

  // Primary adjustments for dark mode
  primary: {
    ...COLORS.primary,
    500: '#818CF8'        // Lighter for dark backgrounds
  },

  // Secondary remains same
  secondary: COLORS.secondary,

  // Text colors (inverted for dark mode)
  text: {
    primary: '#F1F5F9',   // Slate 100
    secondary: '#CBD5E1', // Slate 300
    tertiary: '#94A3B8',  // Slate 400
    disabled: '#64748B'   // Slate 500
  },

  // Adjusted semantic colors for dark mode
  success: {
    ...COLORS.success,
    500: '#34D399'
  },

  error: {
    ...COLORS.error,
    500: '#F87171'
  },

  warning: {
    ...COLORS.warning,
    500: '#FBBF24'
  },

  info: {
    ...COLORS.info,
    500: '#60A5FA'
  },

  // Neutral Grays (Dark Mode - inverted from light mode)
  gray: {
    50: '#1E293B',   // Darker for dark mode
    100: '#334155',
    200: '#475569',
    300: '#64748B',
    400: '#94A3B8',
    500: '#CBD5E1',
    600: '#E2E8F0',
    700: '#F1F5F9',
    800: '#F8FAFC',
    900: '#FFFFFF'
  },

  // Base colors
  white: '#FFFFFF',
  black: '#000000',

  // Transparent
  transparent: 'transparent',
  current: 'currentColor'
} as const;

// ============================================================================
// SPACING SYSTEM (8px Grid)
// ============================================================================

export const SPACING = {
  '3xs': '2px',    // 0.125rem
  '2xs': '4px',    // 0.25rem
  'xs': '8px',     // 0.5rem
  'sm': '12px',    // 0.75rem
  'md': '16px',    // 1rem
  'lg': '24px',    // 1.5rem
  'xl': '32px',    // 2rem
  '2xl': '40px',   // 2.5rem
  '3xl': '48px',   // 3rem
  '4xl': '64px',   // 4rem
  '5xl': '80px',   // 5rem
  '6xl': '96px'    // 6rem
} as const;

// ============================================================================
// BORDER RADIUS SYSTEM
// ============================================================================

export const BORDER_RADIUS = {
  none: '0px',
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  '2xl': '16px',
  '3xl': '24px',
  full: '9999px'
} as const;

// ============================================================================
// SHADOW/ELEVATION SYSTEM
// ============================================================================

export const SHADOWS = {
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  none: 'none'
} as const;

// Dark mode shadows (more pronounced)
export const DARK_SHADOWS = {
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.3)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.4), 0 1px 2px -1px rgb(0 0 0 / 0.4)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.4)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.4), 0 4px 6px -4px rgb(0 0 0 / 0.4)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.4), 0 8px 10px -6px rgb(0 0 0 / 0.4)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.5)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.3)',
  none: 'none'
} as const;

// ============================================================================
// ANIMATION/TRANSITION SYSTEM
// ============================================================================

export const TRANSITIONS = {
  // Duration
  duration: {
    instant: '75ms',
    fast: '150ms',
    normal: '250ms',
    slow: '350ms',
    slower: '500ms'
  },

  // Easing functions
  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',       // Material Design sharp
    standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',  // Material Design standard
    emphasized: 'cubic-bezier(0.0, 0, 0.2, 1)'   // Material Design emphasized
  },

  // Common transitions
  common: {
    all: 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)',
    color: 'color 250ms cubic-bezier(0.4, 0, 0.2, 1)',
    background: 'background-color 250ms cubic-bezier(0.4, 0, 0.2, 1)',
    border: 'border-color 250ms cubic-bezier(0.4, 0, 0.2, 1)',
    opacity: 'opacity 250ms cubic-bezier(0.4, 0, 0.2, 1)',
    transform: 'transform 250ms cubic-bezier(0.4, 0, 0.2, 1)',
    shadow: 'box-shadow 250ms cubic-bezier(0.4, 0, 0.2, 1)'
  }
} as const;

// ============================================================================
// Z-INDEX SYSTEM
// ============================================================================

export const Z_INDEX = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  notification: 1080
} as const;

// ============================================================================
// BREAKPOINTS (Mobile-first)
// ============================================================================

export const BREAKPOINTS = {
  xs: '320px',    // Small phones
  sm: '640px',    // Large phones
  md: '768px',    // Tablets
  lg: '1024px',   // Small desktops
  xl: '1280px',   // Large desktops
  '2xl': '1536px' // Extra large screens
} as const;

// Media query helpers
export const MEDIA_QUERIES = {
  xs: `@media (min-width: ${BREAKPOINTS.xs})`,
  sm: `@media (min-width: ${BREAKPOINTS.sm})`,
  md: `@media (min-width: ${BREAKPOINTS.md})`,
  lg: `@media (min-width: ${BREAKPOINTS.lg})`,
  xl: `@media (min-width: ${BREAKPOINTS.xl})`,
  '2xl': `@media (min-width: ${BREAKPOINTS['2xl']})`,

  // Max-width queries
  maxXs: `@media (max-width: ${BREAKPOINTS.xs})`,
  maxSm: `@media (max-width: ${BREAKPOINTS.sm})`,
  maxMd: `@media (max-width: ${BREAKPOINTS.md})`,
  maxLg: `@media (max-width: ${BREAKPOINTS.lg})`,
  maxXl: `@media (max-width: ${BREAKPOINTS.xl})`,
  max2xl: `@media (max-width: ${BREAKPOINTS['2xl']})`
} as const;

// ============================================================================
// COMPONENT-SPECIFIC CONSTANTS
// ============================================================================

export const COMPONENT_SIZES = {
  button: {
    small: { height: '32px', padding: '0 12px', fontSize: FONT_SIZES.bodySm },
    medium: { height: '40px', padding: '0 16px', fontSize: FONT_SIZES.body },
    large: { height: '48px', padding: '0 20px', fontSize: FONT_SIZES.bodyLg }
  },

  input: {
    small: { height: '32px', padding: '0 12px', fontSize: FONT_SIZES.bodySm },
    medium: { height: '40px', padding: '0 16px', fontSize: FONT_SIZES.body },
    large: { height: '48px', padding: '0 20px', fontSize: FONT_SIZES.bodyLg }
  },

  icon: {
    tiny: '12px',
    small: '16px',
    medium: '20px',
    large: '24px',
    xlarge: '32px'
  }
} as const;

// ============================================================================
// ACCESSIBILITY
// ============================================================================

export const ACCESSIBILITY = {
  // Minimum touch target size (WCAG 2.5.5 - AAA)
  minTouchTarget: '44px',

  // Focus outline
  focusOutline: `2px solid ${COLORS.primary[500]}`,
  focusOutlineOffset: '2px',

  // Reduced motion preference
  reducedMotion: '@media (prefers-reduced-motion: reduce)'
} as const;

// ============================================================================
// RTL/LTR UTILITIES
// ============================================================================

export const RTL_UTILS = {
  // Get direction-aware property
  getDirectionalProperty: (property: 'left' | 'right', isRTL: boolean): 'left' | 'right' => {
    if (isRTL) {
      return property === 'left' ? 'right' : 'left';
    }
    return property;
  },

  // Padding/Margin helpers
  paddingStart: (value: string, isRTL: boolean) => ({
    [isRTL ? 'paddingRight' : 'paddingLeft']: value
  }),

  paddingEnd: (value: string, isRTL: boolean) => ({
    [isRTL ? 'paddingLeft' : 'paddingRight']: value
  }),

  marginStart: (value: string, isRTL: boolean) => ({
    [isRTL ? 'marginRight' : 'marginLeft']: value
  }),

  marginEnd: (value: string, isRTL: boolean) => ({
    [isRTL ? 'marginLeft' : 'marginRight']: value
  })
} as const;

// ============================================================================
// THEME UTILITIES
// ============================================================================

/**
 * Get complete theme configuration based on dark mode state and language
 */
export const getTheme = (isDarkMode: boolean = false, isRTL: boolean = true) => {
  const colors = isDarkMode ? DARK_COLORS : COLORS;
  const shadows = isDarkMode ? DARK_SHADOWS : SHADOWS;
  const fontFamily = isRTL ? FONTS.arabic : FONTS.english;

  return {
    colors,
    shadows,
    spacing: SPACING,
    borderRadius: BORDER_RADIUS,
    fonts: { ...FONTS, primary: fontFamily },
    fontSize: FONT_SIZES,
    fontWeight: FONT_WEIGHTS,
    lineHeight: LINE_HEIGHTS,
    transitions: TRANSITIONS,
    zIndex: Z_INDEX,
    breakpoints: BREAKPOINTS,
    componentSizes: COMPONENT_SIZES,
    accessibility: ACCESSIBILITY,
    isDarkMode,
    isRTL
  };
};

/**
 * Type for the complete theme object
 */
export type Theme = ReturnType<typeof getTheme>;

// ============================================================================
// EXPORT DEFAULT THEME
// ============================================================================

export const defaultTheme = getTheme(false, true); // Light mode, RTL (Arabic default)

export default {
  FONTS,
  FONT_SIZES,
  FONT_WEIGHTS,
  LINE_HEIGHTS,
  COLORS,
  DARK_COLORS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  DARK_SHADOWS,
  TRANSITIONS,
  Z_INDEX,
  BREAKPOINTS,
  MEDIA_QUERIES,
  COMPONENT_SIZES,
  ACCESSIBILITY,
  RTL_UTILS,
  getTheme,
  defaultTheme
};
