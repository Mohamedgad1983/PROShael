/**
 * ModernSwitch Component
 * iOS-style toggle switch with smooth animations and multiple sizes
 *
 * Features:
 * - iOS-style design with smooth slide animation
 * - 3 sizes: small, medium, large
 * - Loading state with spinner
 * - Disabled state
 * - Label support (left/right positioning)
 * - Description text
 * - Validation states (success, error, warning)
 * - Dark mode support
 * - RTL/LTR support
 * - Full accessibility (ARIA, keyboard)
 *
 * @version 2.0.0
 * @date 2025-11-13
 */

import React, { memo,  InputHTMLAttributes, ReactNode } from 'react';
import { getTheme } from '../../modernDesignSystem';

// ============================================================================
// TYPES
// ============================================================================

export type SwitchSize = 'small' | 'medium' | 'large';
export type SwitchValidation = 'default' | 'success' | 'error' | 'warning';

export interface ModernSwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type' | 'onChange'> {
  /**
   * Checked state
   */
  checked?: boolean;

  /**
   * Change handler
   */
  onChange?: (checked: boolean) => void;

  /**
   * Switch size
   * @default 'medium'
   */
  size?: SwitchSize;

  /**
   * Validation state
   * @default 'default'
   */
  validation?: SwitchValidation;

  /**
   * Label text
   */
  label?: string;

  /**
   * Description/helper text
   */
  description?: string;

  /**
   * Label position
   * @default 'right'
   */
  labelPosition?: 'left' | 'right';

  /**
   * Loading state
   * @default false
   */
  loading?: boolean;

  /**
   * Disabled state
   * @default false
   */
  disabled?: boolean;

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
   * Custom styles
   */
  style?: React.CSSProperties;

  /**
   * Additional CSS classes
   */
  className?: string;
}

// ============================================================================
// SIZE CONFIGURATION
// ============================================================================

const SIZE_CONFIG = {
  small: {
    width: 36,
    height: 20,
    thumbSize: 16,
    thumbOffset: 2
  },
  medium: {
    width: 44,
    height: 24,
    thumbSize: 20,
    thumbOffset: 2
  },
  large: {
    width: 56,
    height: 32,
    thumbSize: 28,
    thumbOffset: 2
  }
};

// ============================================================================
// LOADING SPINNER COMPONENT
// ============================================================================

const LoadingSpinner: React.FC<{ size: SwitchSize; isDarkMode: boolean }> = ({ size, isDarkMode }) => {
  const sizeConfig = SIZE_CONFIG[size];
  const spinnerSize = sizeConfig.thumbSize * 0.6;

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
// MODERN SWITCH COMPONENT
// ============================================================================

export const ModernSwitch: React.FC<ModernSwitchProps> = ({
  checked = false,
  onChange,
  size = 'medium',
  validation = 'default',
  label,
  description,
  labelPosition = 'right',
  loading = false,
  disabled = false,
  isDarkMode = false,
  isRTL = true,
  style = {},
  className = '',
  ...rest
}) => {
  const theme = getTheme(isDarkMode, isRTL);
  const sizeConfig = SIZE_CONFIG[size];
  const isDisabled = disabled || loading;

  // State for hover effect
  const [isHovered, setIsHovered] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);

  // ========================================================================
  // STYLES
  // ========================================================================

  // Validation colors
  const validationColors = {
    default: {
      track: checked
        ? theme.colors.primary[500]
        : isDarkMode ? theme.colors.gray[700] : theme.colors.gray[300],
      trackHover: checked
        ? theme.colors.primary[600]
        : isDarkMode ? theme.colors.gray[600] : theme.colors.gray[400],
      thumb: theme.colors.white,
      text: isDarkMode ? theme.colors.gray[300] : theme.colors.gray[700],
      helper: isDarkMode ? theme.colors.gray[400] : theme.colors.gray[600]
    },
    success: {
      track: checked ? theme.colors.success[500] : isDarkMode ? theme.colors.gray[700] : theme.colors.gray[300],
      trackHover: checked ? theme.colors.success[600] : isDarkMode ? theme.colors.gray[600] : theme.colors.gray[400],
      thumb: theme.colors.white,
      text: theme.colors.success[600],
      helper: theme.colors.success[600]
    },
    error: {
      track: checked ? theme.colors.error[500] : isDarkMode ? theme.colors.gray[700] : theme.colors.gray[300],
      trackHover: checked ? theme.colors.error[600] : isDarkMode ? theme.colors.gray[600] : theme.colors.gray[400],
      thumb: theme.colors.white,
      text: theme.colors.error[600],
      helper: theme.colors.error[600]
    },
    warning: {
      track: checked ? theme.colors.warning[500] : isDarkMode ? theme.colors.gray[700] : theme.colors.gray[300],
      trackHover: checked ? theme.colors.warning[600] : isDarkMode ? theme.colors.gray[600] : theme.colors.gray[400],
      thumb: theme.colors.white,
      text: theme.colors.warning[600],
      helper: theme.colors.warning[600]
    }
  };

  const currentColors = validationColors[validation];

  // Container styles
  const containerStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    fontFamily: theme.fonts.primary,
    direction: isRTL ? 'rtl' : 'ltr',
    flexDirection: labelPosition === 'left' ? 'row-reverse' : 'row',
    ...style
  };

  // Switch wrapper styles
  const switchWrapperStyles: React.CSSProperties = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.6 : 1
  };

  // Track styles (background)
  const trackStyles: React.CSSProperties = {
    position: 'relative',
    width: `${sizeConfig.width}px`,
    height: `${sizeConfig.height}px`,
    borderRadius: `${sizeConfig.height / 2}px`,
    background: isHovered && !isDisabled ? currentColors.trackHover : currentColors.track,
    transition: `all 250ms ${theme.transitions.easing.standard}`,
    boxShadow: isFocused && !isDisabled
      ? `0 0 0 4px ${theme.colors.primary[500]}20`
      : 'none',
    outline: 'none'
  };

  // Thumb styles (sliding circle)
  const thumbStyles: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: checked
      ? `${sizeConfig.width - sizeConfig.thumbSize - sizeConfig.thumbOffset}px`
      : `${sizeConfig.thumbOffset}px`,
    transform: 'translateY(-50%)',
    width: `${sizeConfig.thumbSize}px`,
    height: `${sizeConfig.thumbSize}px`,
    borderRadius: '50%',
    background: currentColors.thumb,
    boxShadow: theme.shadows.sm,
    transition: `all 250ms ${theme.transitions.easing.standard}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: checked ? currentColors.track : theme.colors.gray[400]
  };

  // Label/description container styles
  const labelContainerStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing['2xs'],
    cursor: isDisabled ? 'not-allowed' : 'pointer'
  };

  // Label text styles
  const labelStyles: React.CSSProperties = {
    fontSize: theme.fontSize.body,
    fontWeight: theme.fontWeight.medium,
    color: currentColors.text,
    lineHeight: theme.lineHeight.tight,
    fontFamily: theme.fonts.primary
  };

  // Description text styles
  const descriptionStyles: React.CSSProperties = {
    fontSize: theme.fontSize.bodySm,
    fontWeight: theme.fontWeight.regular,
    color: currentColors.helper,
    lineHeight: theme.lineHeight.normal,
    fontFamily: theme.fonts.primary
  };

  // Hidden checkbox (for accessibility)
  const hiddenCheckboxStyles: React.CSSProperties = {
    position: 'absolute',
    opacity: 0,
    width: 0,
    height: 0
  };

  // ========================================================================
  // EVENT HANDLERS
  // ========================================================================

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isDisabled) return;
    onChange?.(e.target.checked);
  };

  const handleClick = () => {
    if (isDisabled) return;
    onChange?.(!checked);
  };

  const handleMouseEnter = () => {
    if (!isDisabled) setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleFocus = () => {
    if (!isDisabled) setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isDisabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onChange?.(!checked);
    }
  };

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <label style={containerStyles} className={className}>
      {/* Hidden native checkbox for accessibility */}
      <input
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={isDisabled}
        style={hiddenCheckboxStyles}
        aria-label={label}
        aria-checked={checked}
        aria-disabled={isDisabled}
        {...rest}
      />

      {/* Visual switch */}
      <div
        style={switchWrapperStyles}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onKeyDown={handleKeyDown}
        role="switch"
        aria-checked={checked}
        tabIndex={isDisabled ? -1 : 0}
      >
        <div style={trackStyles}>
          <div style={thumbStyles}>
            {loading && <LoadingSpinner size={size} isDarkMode={isDarkMode} />}
          </div>
        </div>
      </div>

      {/* Label and description */}
      {(label || description) && (
        <div style={labelContainerStyles} onClick={handleClick}>
          {label && <span style={labelStyles}>{label}</span>}
          {description && <span style={descriptionStyles}>{description}</span>}
        </div>
      )}
    </label>
  );
};

export default ModernSwitch;
