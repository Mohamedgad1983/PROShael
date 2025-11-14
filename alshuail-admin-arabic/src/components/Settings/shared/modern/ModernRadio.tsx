/**
 * ModernRadio Component
 * Custom-styled radio button with proper focus states and accessibility
 *
 * Features:
 * - Custom visual design (circle with inner dot)
 * - 3 sizes: small, medium, large
 * - Label support with description
 * - Validation states (error, success, warning)
 * - Disabled state
 * - Group support (radio group container)
 * - Smooth animations
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

export type RadioSize = 'small' | 'medium' | 'large';
export type RadioValidation = 'default' | 'success' | 'error' | 'warning';

export interface ModernRadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type' | 'onChange'> {
  /**
   * Checked state
   */
  checked?: boolean;

  /**
   * Change handler
   */
  onChange?: (checked: boolean) => void;

  /**
   * Radio value
   */
  value?: string | number;

  /**
   * Radio size
   * @default 'medium'
   */
  size?: RadioSize;

  /**
   * Validation state
   * @default 'default'
   */
  validation?: RadioValidation;

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

export interface ModernRadioGroupProps {
  /**
   * Radio group children
   */
  children: ReactNode;

  /**
   * Selected value
   */
  value?: string | number;

  /**
   * Change handler
   */
  onChange?: (value: string | number) => void;

  /**
   * Group name (for native radio grouping)
   */
  name?: string;

  /**
   * Group label
   */
  label?: string;

  /**
   * Layout direction
   * @default 'vertical'
   */
  direction?: 'horizontal' | 'vertical';

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
    dotSize: 8,
    gap: 8,
    fontSize: '14px'
  },
  medium: {
    size: 20,
    dotSize: 10,
    gap: 12,
    fontSize: '14px'
  },
  large: {
    size: 24,
    dotSize: 12,
    gap: 16,
    fontSize: '16px'
  }
};

// ============================================================================
// MODERN RADIO COMPONENT
// ============================================================================

export const ModernRadio: React.FC<ModernRadioProps> = ({
  checked = false,
  onChange,
  value,
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

  // State for hover and focus
  const [isHovered, setIsHovered] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);

  // ========================================================================
  // STYLES
  // ========================================================================

  // Validation colors
  const validationColors = {
    default: {
      border: isDarkMode ? theme.colors.gray[600] : theme.colors.gray[400],
      borderChecked: theme.colors.primary[500],
      dot: theme.colors.primary[500],
      text: isDarkMode ? theme.colors.gray[300] : theme.colors.gray[700],
      helper: isDarkMode ? theme.colors.gray[400] : theme.colors.gray[600]
    },
    success: {
      border: theme.colors.success[500],
      borderChecked: theme.colors.success[600],
      dot: theme.colors.success[500],
      text: theme.colors.success[600],
      helper: theme.colors.success[600]
    },
    error: {
      border: theme.colors.error[500],
      borderChecked: theme.colors.error[600],
      dot: theme.colors.error[500],
      text: theme.colors.error[600],
      helper: theme.colors.error[600]
    },
    warning: {
      border: theme.colors.warning[500],
      borderChecked: theme.colors.warning[600],
      dot: theme.colors.warning[500],
      text: theme.colors.warning[600],
      helper: theme.colors.warning[600]
    }
  };

  const currentColors = validationColors[validation];

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

  // Radio button wrapper styles
  const radioWrapperStyles: React.CSSProperties = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  };

  // Outer circle styles
  const outerCircleStyles: React.CSSProperties = {
    width: `${sizeConfig.size}px`,
    height: `${sizeConfig.size}px`,
    borderRadius: '50%',
    border: `2px solid ${checked ? currentColors.borderChecked : currentColors.border}`,
    background: isDarkMode ? theme.colors.background : theme.colors.white,
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

  // Inner dot styles
  const innerDotStyles: React.CSSProperties = {
    width: `${sizeConfig.dotSize}px`,
    height: `${sizeConfig.dotSize}px`,
    borderRadius: '50%',
    background: currentColors.dot,
    transform: checked ? 'scale(1)' : 'scale(0)',
    transition: `transform 200ms ${theme.transitions.easing.standard}`,
    opacity: checked ? 1 : 0
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

  // Hidden native radio (for accessibility)
  const hiddenRadioStyles: React.CSSProperties = {
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
    onChange?.(true);
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

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <label style={containerStyles} className={className}>
      {/* Hidden native radio for accessibility */}
      <input
        type="radio"
        checked={checked}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        value={value}
        style={hiddenRadioStyles}
        aria-label={label}
        aria-checked={checked}
        aria-disabled={disabled}
        {...rest}
      />

      {/* Visual radio button */}
      <div
        style={radioWrapperStyles}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        role="radio"
        aria-checked={checked}
        tabIndex={disabled ? -1 : 0}
      >
        <div style={outerCircleStyles}>
          <div style={innerDotStyles} />
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

// ============================================================================
// MODERN RADIO GROUP COMPONENT
// ============================================================================

export const ModernRadioGroup: React.FC<ModernRadioGroupProps> = ({
  children,
  value,
  onChange,
  name,
  label,
  direction = 'vertical',
  isDarkMode = false,
  isRTL = true,
  style = {},
  className = ''
}) => {
  const theme = getTheme(isDarkMode, isRTL);

  // Group container styles
  const groupStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: direction === 'vertical' ? 'column' : 'row',
    gap: direction === 'vertical' ? theme.spacing.md : theme.spacing.lg,
    fontFamily: theme.fonts.primary,
    direction: isRTL ? 'rtl' : 'ltr',
    ...style
  };

  // Group label styles
  const groupLabelStyles: React.CSSProperties = {
    fontSize: theme.fontSize.body,
    fontWeight: theme.fontWeight.semibold,
    color: isDarkMode ? theme.colors.gray[300] : theme.colors.gray[700],
    marginBottom: theme.spacing.sm,
    fontFamily: theme.fonts.primary
  };

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div className={className}>
      {label && <div style={groupLabelStyles}>{label}</div>}
      <div style={groupStyles} role="radiogroup" aria-label={label}>
        {React.Children.map(children, (child) => {
          if (React.isValidElement<ModernRadioProps>(child) && child.type === ModernRadio) {
            const radioProps = child.props as ModernRadioProps;
            return React.cloneElement(child as React.ReactElement<ModernRadioProps>, {
              name: name || radioProps.name,
              checked: radioProps.value === value,
              onChange: (checked: boolean) => {
                if (checked && radioProps.value !== undefined) {
                  onChange?.(radioProps.value);
                }
                radioProps.onChange?.(checked);
              },
              isDarkMode,
              isRTL
            });
          }
          return child;
        })}
      </div>
    </div>
  );
};

export default memo(ModernRadio);
