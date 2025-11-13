/**
 * Shared Styles for Settings Components
 * Centralized constants for consistent styling and improved performance
 */

export const COLORS = {
  // Primary gradient
  primaryGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  primaryColor: '#667eea',
  primaryDark: '#764ba2',
  primaryLight: 'rgba(102, 126, 234, 0.1)',

  // Primary alias
  primary: '#667eea',

  // Status colors
  success: '#10B981',
  successBg: '#D1FAE5',
  successText: '#065F46',
  error: '#EF4444',
  errorBg: '#FEE2E2',
  errorText: '#991B1B',
  warning: '#F59E0B',
  warningBg: '#FEF3C7',
  warningText: '#92400E',
  info: '#3B82F6',
  infoBg: '#DBEAFE',
  infoText: '#1E40AF',

  // Neutral colors (Light mode)
  white: '#FFFFFF',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  border: 'rgba(0, 0, 0, 0.1)',

  // Accent colors
  blue50: '#DBEAFE',
  blue600: '#1E40AF',
  green50: '#D1FAE5',
  green600: '#065F46',
  red50: '#FEE2E2',
  red600: '#991B1B'
} as const;

// Dark mode color palette
export const DARK_COLORS = {
  // Primary gradient (adjusted for dark mode)
  primaryGradient: 'linear-gradient(135deg, #818CF8 0%, #A78BFA 100%)',
  primaryColor: '#818CF8',
  primaryDark: '#A78BFA',
  primaryLight: 'rgba(129, 140, 248, 0.15)',

  // Status colors (adjusted for dark mode)
  success: '#34D399',
  successBg: 'rgba(52, 211, 153, 0.15)',
  successText: '#6EE7B7',
  error: '#F87171',
  errorBg: 'rgba(248, 113, 113, 0.15)',
  errorText: '#FCA5A5',
  warning: '#FBBF24',
  warningBg: 'rgba(251, 191, 36, 0.15)',
  warningText: '#FCD34D',

  // Neutral colors (Dark mode)
  white: '#1F2937',
  gray50: '#374151',
  gray100: '#4B5563',
  gray200: '#6B7280',
  gray300: '#9CA3AF',
  gray400: '#D1D5DB',
  gray500: '#E5E7EB',
  gray600: '#F3F4F6',
  gray700: '#F9FAFB',
  gray800: '#FFFFFF',
  gray900: '#FFFFFF',
  border: 'rgba(255, 255, 255, 0.1)',

  // Accent colors (adjusted for dark mode)
  blue50: 'rgba(96, 165, 250, 0.15)',
  blue600: '#60A5FA',
  green50: 'rgba(52, 211, 153, 0.15)',
  green600: '#34D399',
  red50: 'rgba(248, 113, 113, 0.15)',
  red600: '#F87171'
} as const;

export const SPACING = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '30px',
  '4xl': '40px'
} as const;

export const TYPOGRAPHY = {
  // Font sizes
  xs: '11px',
  sm: '12px',
  base: '14px',
  lg: '16px',
  xl: '18px',
  '2xl': '24px',
  '3xl': '32px',

  // Font weights
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700'
} as const;

export const BORDER_RADIUS = {
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '20px',
  full: '9999px'
} as const;

export const SHADOWS = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  premium: '0 10px 40px rgba(0, 0, 0, 0.1)'
} as const;

// Common style objects (memoized for performance)
export const commonStyles = {
  container: {
    minHeight: '100vh',
    background: COLORS.primaryGradient,
    padding: SPACING.xl,
    direction: 'rtl' as const
  },

  card: {
    background: `${COLORS.white}f2`, // 95% opacity
    backdropFilter: 'blur(20px)',
    borderRadius: BORDER_RADIUS['2xl'],
    padding: SPACING['3xl'],
    boxShadow: SHADOWS.premium
  },

  header: {
    fontSize: TYPOGRAPHY['3xl'],
    fontWeight: TYPOGRAPHY.bold,
    background: COLORS.primaryGradient,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },

  button: {
    primary: {
      background: COLORS.primaryGradient,
      color: COLORS.white,
      border: 'none',
      borderRadius: BORDER_RADIUS.md,
      fontSize: TYPOGRAPHY.base,
      fontWeight: TYPOGRAPHY.semibold,
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      padding: `${SPACING.md} ${SPACING['2xl']}`
    },
    secondary: {
      background: COLORS.gray100,
      color: COLORS.gray700,
      border: 'none',
      borderRadius: BORDER_RADIUS.md,
      fontSize: TYPOGRAPHY.base,
      fontWeight: TYPOGRAPHY.medium,
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      padding: `${SPACING.md} ${SPACING['2xl']}`
    },
    danger: {
      background: `linear-gradient(135deg, ${COLORS.error} 0%, #DC2626 100%)`,
      color: COLORS.white,
      border: 'none',
      borderRadius: BORDER_RADIUS.md,
      fontSize: TYPOGRAPHY.base,
      fontWeight: TYPOGRAPHY.semibold,
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      padding: `${SPACING.md} ${SPACING['2xl']}`
    }
  },

  input: {
    padding: `${SPACING.md} ${SPACING.lg}`,
    border: `1px solid ${COLORS.gray300}`,
    borderRadius: BORDER_RADIUS.md,
    fontSize: TYPOGRAPHY.base,
    outline: 'none',
    transition: 'border-color 0.3s ease',
    width: '100%'
  },

  badge: {
    success: {
      background: COLORS.successBg,
      color: COLORS.successText,
      padding: `${SPACING.xs} ${SPACING.sm}`,
      borderRadius: BORDER_RADIUS.sm,
      fontSize: TYPOGRAPHY.xs,
      fontWeight: TYPOGRAPHY.semibold
    },
    error: {
      background: COLORS.errorBg,
      color: COLORS.errorText,
      padding: `${SPACING.xs} ${SPACING.sm}`,
      borderRadius: BORDER_RADIUS.sm,
      fontSize: TYPOGRAPHY.xs,
      fontWeight: TYPOGRAPHY.semibold
    },
    warning: {
      background: COLORS.warningBg,
      color: COLORS.warningText,
      padding: `${SPACING.xs} ${SPACING.sm}`,
      borderRadius: BORDER_RADIUS.sm,
      fontSize: TYPOGRAPHY.xs,
      fontWeight: TYPOGRAPHY.semibold
    },
    info: {
      background: COLORS.blue50,
      color: COLORS.blue600,
      padding: `${SPACING.xs} ${SPACING.sm}`,
      borderRadius: BORDER_RADIUS.sm,
      fontSize: TYPOGRAPHY.xs,
      fontWeight: TYPOGRAPHY.semibold
    }
  }
} as const;

// Dark mode utility - Returns appropriate color scheme based on dark mode state
export const getColors = (isDarkMode: boolean = false) => {
  return isDarkMode ? DARK_COLORS : COLORS;
};

// Message styles with types
export const getMessageStyle = (
  type: 'success' | 'error' | 'warning',
  isDarkMode: boolean = false
): React.CSSProperties => {
  const colorScheme = getColors(isDarkMode);
  const colors = {
    success: { bg: colorScheme.successBg, text: colorScheme.successText, border: colorScheme.success },
    error: { bg: colorScheme.errorBg, text: colorScheme.errorText, border: colorScheme.error },
    warning: { bg: colorScheme.warningBg, text: colorScheme.warningText, border: colorScheme.warning }
  };

  return {
    background: colors[type].bg,
    color: colors[type].text,
    border: `1px solid ${colors[type].border}`,
    borderRadius: BORDER_RADIUS.md,
    padding: `${SPACING.md} ${SPACING.lg}`,
    marginBottom: SPACING.xl,
    fontSize: TYPOGRAPHY.base,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm
  };
};

// Get theme-aware common styles
export const getThemedStyles = (isDarkMode: boolean = false) => {
  const colors = getColors(isDarkMode);

  return {
    container: {
      ...commonStyles.container,
      background: colors.primaryGradient
    },
    card: {
      ...commonStyles.card,
      background: isDarkMode ? `${colors.white}dd` : `${colors.white}f2`,
      boxShadow: isDarkMode
        ? '0 10px 40px rgba(0, 0, 0, 0.3)'
        : SHADOWS.premium
    },
    header: {
      ...commonStyles.header,
      background: colors.primaryGradient
    },
    button: {
      primary: {
        ...commonStyles.button.primary,
        background: colors.primaryGradient
      },
      secondary: {
        ...commonStyles.button.secondary,
        background: colors.gray100,
        color: colors.gray700
      },
      danger: {
        ...commonStyles.button.danger,
        background: `linear-gradient(135deg, ${colors.error} 0%, #DC2626 100%)`
      }
    },
    input: {
      ...commonStyles.input,
      border: `1px solid ${colors.gray300}`,
      background: colors.white,
      color: colors.gray800
    },
    badge: {
      success: {
        ...commonStyles.badge.success,
        background: colors.successBg,
        color: colors.successText
      },
      error: {
        ...commonStyles.badge.error,
        background: colors.errorBg,
        color: colors.errorText
      },
      warning: {
        ...commonStyles.badge.warning,
        background: colors.warningBg,
        color: colors.warningText
      },
      info: {
        ...commonStyles.badge.info,
        background: colors.blue50,
        color: colors.blue600
      }
    }
  };
};
