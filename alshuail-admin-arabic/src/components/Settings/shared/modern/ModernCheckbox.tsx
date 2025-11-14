/**
 * ModernCheckbox Component
 * Custom-styled checkbox with indeterminate state support
 *
 * Features:
 * - Custom visual design (square with checkmark)
 * - 3 sizes: small, medium, large
 * - 3 states: unchecked, checked, indeterminate
 * - Label support with description
 * - Validation states (error, success, warning)
 * - Disabled state
 * - Smooth animations (checkmark transition)
 * - Dark mode support
 * - RTL/LTR support
 * - Full accessibility (ARIA, keyboard)
 *
 * @version 2.0.0
 * @date 2025-11-13
 */

import React, { memo,  InputHTMLAttributes, ReactNode } from 'react';
import { getTheme } from '../../modernDesignSystem';
import { CheckIcon, MinusIcon } from '@heroicons/react/24/outline';

// ============================================================================
// TYPES
// ============================================================================

export type CheckboxSize = 'small' | 'medium' | 'large';
export type CheckboxValidation = 'default' | 'success' | 'error' | 'warning';

export interface ModernCheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type' | 'onChange'> {
  /**
   * Checked state
   */
  checked?: boolean;

  /**
   * Indeterminate state (partially checked)
   * @default false
   */
  indeterminate?: boolean;

  /**
   * Change handler
   */
  onChange?: (checked: boolean) => void;

  /**
   * Checkbox size
   * @default 'medium'
   */
  size?: CheckboxSize;

  /**
   * Validation state
   * @default 'default'
   */
  validation?: CheckboxValidation;

  /**
   * Label text
   */
  label?: string;

  /**
   * Description/helper text
   */
  description?: string;

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
    size: 16,
    iconSize: 12,
    gap: 8,
    fontSize: '14px'
  },
  medium: {
    size: 20,
    iconSize: 16,
    gap: 12,
    fontSize: '14px'
  },
  large: {
    size: 24,
    iconSize: 20,
    gap: 16,
    fontSize: '16px'
  }
};

// ============================================================================
// MODERN CHECKBOX COMPONENT
// ============================================================================

export const ModernCheckbox: React.FC<ModernCheckboxProps> = ({
  checked = false,
  indeterminate = false,
  onChange,
  size = 'medium',
  validation = 'default',
  label,
  description,
  disabled = false,
  isDarkMode = false,
  isRTL = true,
  style = {},
  className = '',
  ...rest
}) => {
  const theme = getTheme(isDarkMode, isRTL);
  const sizeConfig = SIZE_CONFIG[size];
  const checkboxRef = React.useRef<HTMLInputElement>(null);

  // State for hover and focus
  const [isHovered, setIsHovered] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);

  // Sync indeterminate state with native checkbox
  React.useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  // ========================================================================
  // STYLES
  // ========================================================================

  // Validation colors
  const validationColors = {
    default: {
      border: isDarkMode ? theme.colors.gray[600] : theme.colors.gray[400],
      borderChecked: theme.colors.primary[500],
      background: theme.colors.primary[500],
      icon: theme.colors.white,
      text: isDarkMode ? theme.colors.gray[300] : theme.colors.gray[700],
      helper: isDarkMode ? theme.colors.gray[400] : theme.colors.gray[600]
    },
    success: {
      border: theme.colors.success[500],
      borderChecked: theme.colors.success[600],
      background: theme.colors.success[500],
      icon: theme.colors.white,
      text: theme.colors.success[600],
      helper: theme.colors.success[600]
    },
    error: {
      border: theme.colors.error[500],
      borderChecked: theme.colors.error[600],
      background: theme.colors.error[500],
      icon: theme.colors.white,
      text: theme.colors.error[600],
      helper: theme.colors.error[600]
    },
    warning: {
      border: theme.colors.warning[500],
      borderChecked: theme.colors.warning[600],
      background: theme.colors.warning[500],
      icon: theme.colors.white,
      text: theme.colors.warning[600],
      helper: theme.colors.warning[600]
    }
  };

  const currentColors = validationColors[validation];
  const isCheckedOrIndeterminate = checked || indeterminate;

  // Container styles
  const containerStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'flex-start',
    gap: `${sizeConfig.gap}px`,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    fontFamily: theme.fonts.primary,
    direction: isRTL ? 'rtl' : 'ltr',
    ...style
  };

  // Checkbox button wrapper styles
  const checkboxWrapperStyles: React.CSSProperties = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  };

  // Checkbox box styles
  const checkboxBoxStyles: React.CSSProperties = {
    width: `${sizeConfig.size}px`,
    height: `${sizeConfig.size}px`,
    borderRadius: theme.borderRadius.sm,
    border: `2px solid ${isCheckedOrIndeterminate ? currentColors.borderChecked : currentColors.border}`,
    background: isCheckedOrIndeterminate
      ? currentColors.background
      : (isDarkMode ? theme.colors.background : theme.colors.white),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: `all 200ms ${theme.transitions.easing.standard}`,
    boxShadow: isFocused && !disabled
      ? `0 0 0 4px ${theme.colors.primary[500]}20`
      : isHovered && !disabled
      ? theme.shadows.sm
      : 'none'
  };

  // Icon styles
  const iconStyles: React.CSSProperties = {
    width: `${sizeConfig.iconSize}px`,
    height: `${sizeConfig.iconSize}px`,
    color: currentColors.icon,
    transform: isCheckedOrIndeterminate ? 'scale(1)' : 'scale(0)',
    transition: `transform 200ms ${theme.transitions.easing.standard}`,
    opacity: isCheckedOrIndeterminate ? 1 : 0
  };

  // Label/description container styles
  const labelContainerStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing['2xs'],
    paddingTop: size === 'small' ? '0' : size === 'medium' ? '2px' : '4px'
  };

  // Label text styles
  const labelStyles: React.CSSProperties = {
    fontSize: sizeConfig.fontSize,
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

  // Hidden native checkbox (for accessibility)
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
    if (disabled) return;
    onChange?.(e.target.checked);
  };

  const handleClick = () => {
    if (disabled) return;
    onChange?.(!checked);
  };

  const handleMouseEnter = () => {
    if (!disabled) setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleFocus = () => {
    if (!disabled) setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
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
        ref={checkboxRef}
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        style={hiddenCheckboxStyles}
        aria-label={label}
        aria-checked={indeterminate ? 'mixed' : checked}
        aria-disabled={disabled}
        {...rest}
      />

      {/* Visual checkbox button */}
      <div
        style={checkboxWrapperStyles}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onKeyDown={handleKeyDown}
        role="checkbox"
        aria-checked={indeterminate ? 'mixed' : checked}
        tabIndex={disabled ? -1 : 0}
      >
        <div style={checkboxBoxStyles}>
          {indeterminate ? (
            <MinusIcon style={iconStyles} />
          ) : (
            <CheckIcon style={iconStyles} />
          )}
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

export default memo(ModernCheckbox);
