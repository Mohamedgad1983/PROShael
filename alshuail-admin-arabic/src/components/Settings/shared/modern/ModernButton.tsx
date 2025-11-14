/**
 * ModernButton Component
 * Enterprise-grade button component with multiple variants, sizes, and states
 *
 * Features:
 * - 4 variants: primary, secondary, ghost, link
 * - 3 sizes: small, medium, large
 * - Loading state with spinner
 * - Icon support (left/right)
 * - Full accessibility (ARIA, keyboard)
 * - RTL/LTR support
 * - Dark mode support
 * - Smooth animations
 *
 * @version 2.0.0
 * @date 2025-11-13
 */

import React, { memo,  ButtonHTMLAttributes, ReactNode } from 'react';
import { getTheme } from '../../modernDesignSystem';

// ============================================================================
// TYPES
// ============================================================================

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'link';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ModernButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  /**
   * Button variant style
   * @default 'primary'
   */
  variant?: ButtonVariant;

  /**
   * Button size
   * @default 'medium'
   */
  size?: ButtonSize;

  /**
   * Loading state - shows spinner and disables interaction
   * @default false
   */
  loading?: boolean;

  /**
   * Disabled state
   * @default false
   */
  disabled?: boolean;

  /**
   * Icon to display on the left side (LTR) or right side (RTL)
   */
  icon?: ReactNode;

  /**
   * Icon to display on the right side (LTR) or left side (RTL)
   */
  iconRight?: ReactNode;

  /**
   * Full width button
   * @default false
   */
  fullWidth?: boolean;

  /**
   * Button type
   * @default 'button'
   */
  type?: 'button' | 'submit' | 'reset';

  /**
   * Dark mode
   * @default false
   */
  isDarkMode?: boolean;

  /**
   * RTL mode
   * @default true
   */
  isRTL?: boolean;

  /**
   * Button content
   */
  children: ReactNode;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Custom styles
   */
  style?: React.CSSProperties;

  /**
   * Click handler
   */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;

  /**
   * Accessible label (overrides children for screen readers)
   */
  ariaLabel?: string;
}

// ============================================================================
// LOADING SPINNER COMPONENT
// ============================================================================

const LoadingSpinner: React.FC<{ size: ButtonSize; isDarkMode: boolean }> = ({ size, isDarkMode }) => {
  const spinnerSize = size === 'small' ? '14px' : size === 'large' ? '20px' : '16px';
  const theme = getTheme(isDarkMode);

  return (
    <svg
      width={spinnerSize}
      height={spinnerSize}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        animation: 'spin 0.8s linear infinite'
      }}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        strokeOpacity="0.25"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </svg>
  );
};

// ============================================================================
// MODERN BUTTON COMPONENT
// ============================================================================

export const ModernButton: React.FC<ModernButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  icon,
  iconRight,
  fullWidth = false,
  type = 'button',
  isDarkMode = false,
  isRTL = true,
  children,
  className = '',
  style = {},
  onClick,
  ariaLabel,
  ...rest
}) => {
  const theme = getTheme(isDarkMode, isRTL);
  const isDisabled = disabled || loading;

  // ========================================================================
  // STYLES
  // ========================================================================

  const baseStyles: React.CSSProperties = {
    // Layout
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    position: 'relative',

    // Sizing
    height: theme.componentSizes.button[size].height,
    padding: theme.componentSizes.button[size].padding,
    width: fullWidth ? '100%' : 'auto',
    minWidth: size === 'small' ? '64px' : size === 'large' ? '120px' : '96px',

    // Typography
    fontFamily: theme.fonts.primary,
    fontSize: theme.componentSizes.button[size].fontSize,
    fontWeight: theme.fontWeight.semibold,
    lineHeight: theme.lineHeight.tight,
    textDecoration: variant === 'link' ? 'none' : 'none',
    whiteSpace: 'nowrap',

    // Border
    border: 'none',
    borderRadius: theme.borderRadius.lg,
    outline: 'none',

    // Cursor & Interaction
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    userSelect: 'none' as const,
    WebkitTapHighlightColor: 'transparent',

    // Transitions
    transition: `
      ${theme.transitions.common.all},
      ${theme.transitions.common.transform},
      ${theme.transitions.common.shadow}
    `,

    // Accessibility
    opacity: isDisabled ? 0.6 : 1,

    // Direction
    direction: isRTL ? 'rtl' : 'ltr'
  };

  // Variant-specific styles
  const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      background: `linear-gradient(135deg, ${theme.colors.primary[500]} 0%, ${theme.colors.primary[600]} 100%)`,
      color: theme.colors.white,
      boxShadow: theme.shadows.sm
    },

    secondary: {
      background: 'transparent',
      color: isDarkMode ? theme.colors.primary[400] : theme.colors.primary[600],
      border: `2px solid ${isDarkMode ? theme.colors.primary[400] : theme.colors.primary[500]}`,
      boxShadow: 'none'
    },

    ghost: {
      background: 'transparent',
      color: isDarkMode ? theme.colors.primary[400] : theme.colors.primary[600],
      boxShadow: 'none'
    },

    link: {
      background: 'transparent',
      color: isDarkMode ? theme.colors.primary[400] : theme.colors.primary[600],
      padding: '0',
      height: 'auto',
      minWidth: 'auto',
      boxShadow: 'none'
    }
  };

  // Hover styles (applied via onMouseEnter/onMouseLeave)
  const [isHovered, setIsHovered] = React.useState(false);
  const [isPressed, setIsPressed] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);

  const hoverStyles: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      background: `linear-gradient(135deg, ${theme.colors.primary[600]} 0%, ${theme.colors.primary[700]} 100%)`,
      boxShadow: theme.shadows.md,
      transform: 'translateY(-2px)'
    },

    secondary: {
      background: isDarkMode ? `${theme.colors.primary[400]}15` : `${theme.colors.primary[500]}10`,
      borderColor: theme.colors.primary[600]
    },

    ghost: {
      background: isDarkMode ? `${theme.colors.primary[400]}15` : `${theme.colors.primary[500]}10`
    },

    link: {
      textDecoration: 'underline'
    }
  };

  // Active/pressed styles
  const activeStyles: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      background: `linear-gradient(135deg, ${theme.colors.primary[700]} 0%, ${theme.colors.primary[800]} 100%)`,
      transform: 'translateY(0px)',
      boxShadow: theme.shadows.sm
    },

    secondary: {
      background: isDarkMode ? `${theme.colors.primary[400]}25` : `${theme.colors.primary[500]}20`,
      borderColor: theme.colors.primary[700]
    },

    ghost: {
      background: isDarkMode ? `${theme.colors.primary[400]}25` : `${theme.colors.primary[500]}20`
    },

    link: {
      color: theme.colors.primary[700]
    }
  };

  // Focus styles
  const focusStyles: React.CSSProperties = {
    outline: `2px solid ${theme.colors.primary[500]}`,
    outlineOffset: '2px'
  };

  // Combine all styles
  const computedStyles: React.CSSProperties = {
    ...baseStyles,
    ...variantStyles[variant],
    ...(isHovered && !isDisabled ? hoverStyles[variant] : {}),
    ...(isPressed && !isDisabled ? activeStyles[variant] : {}),
    ...(isFocused && !isDisabled ? focusStyles : {}),
    ...style
  };

  // ========================================================================
  // EVENT HANDLERS
  // ========================================================================

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (isDisabled) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  const handleMouseEnter = () => {
    if (!isDisabled) setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setIsPressed(false);
  };

  const handleMouseDown = () => {
    if (!isDisabled) setIsPressed(true);
  };

  const handleMouseUp = () => {
    setIsPressed(false);
  };

  const handleFocus = () => {
    if (!isDisabled) setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={className}
      style={computedStyles}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onFocus={handleFocus}
      onBlur={handleBlur}
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
      aria-busy={loading}
      aria-disabled={isDisabled}
      {...rest}
    >
      {/* Loading Spinner */}
      {loading && (
        <span style={{ display: 'flex', alignItems: 'center' }}>
          <LoadingSpinner size={size} isDarkMode={isDarkMode} />
        </span>
      )}

      {/* Left Icon (or right in RTL) */}
      {!loading && icon && (
        <span style={{ display: 'flex', alignItems: 'center', fontSize: theme.componentSizes.icon.medium }}>
          {icon}
        </span>
      )}

      {/* Button Text */}
      {!loading && (
        <span style={{ opacity: loading ? 0 : 1 }}>
          {children}
        </span>
      )}

      {/* Right Icon (or left in RTL) */}
      {!loading && iconRight && (
        <span style={{ display: 'flex', alignItems: 'center', fontSize: theme.componentSizes.icon.medium }}>
          {iconRight}
        </span>
      )}
    </button>
  );
};

export default ModernButton;
