/**
 * ModernInput Component
 * Material Design text input with floating label, validation, and icons
 *
 * Features:
 * - Floating label animation
 * - Validation states (success, error, warning)
 * - Prefix/suffix icons
 * - Helper text
 * - Character counter
 * - Clear button
 * - Password visibility toggle
 * - Auto-resize (textarea)
 * - Dark mode support
 * - RTL/LTR support
 * - Full accessibility
 *
 * @version 2.0.0
 * @date 2025-11-13
 */

import React, { memo,  InputHTMLAttributes, TextareaHTMLAttributes, ReactNode, useState, useEffect, useRef } from 'react';
import { getTheme } from '../../modernDesignSystem';
import { EyeIcon, EyeSlashIcon, XMarkIcon } from '@heroicons/react/24/outline';

// ============================================================================
// TYPES
// ============================================================================

export type InputSize = 'small' | 'medium' | 'large';
export type InputVariant = 'outlined' | 'filled';
export type InputValidation = 'default' | 'success' | 'error' | 'warning';

interface BaseInputProps {
  /**
   * Input label
   */
  label?: string;

  /**
   * Input size
   * @default 'medium'
   */
  size?: InputSize;

  /**
   * Input variant
   * @default 'outlined'
   */
  variant?: InputVariant;

  /**
   * Validation state
   * @default 'default'
   */
  validation?: InputValidation;

  /**
   * Helper text below input
   */
  helperText?: string;

  /**
   * Prefix icon or content
   */
  prefix?: ReactNode;

  /**
   * Suffix icon or content
   */
  suffix?: ReactNode;

  /**
   * Show clear button when input has value
   * @default false
   */
  clearable?: boolean;

  /**
   * Show character counter
   * @default false
   */
  showCounter?: boolean;

  /**
   * Full width input
   * @default false
   */
  fullWidth?: boolean;

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

export interface ModernInputProps extends BaseInputProps, Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
  /**
   * Multiline input (renders textarea)
   * @default false
   */
  multiline?: false;

  /**
   * Input type
   * @default 'text'
   */
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
}

export interface ModernTextareaProps extends BaseInputProps, Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'prefix'> {
  /**
   * Multiline input (renders textarea)
   */
  multiline: true;

  /**
   * Auto-resize textarea based on content
   * @default false
   */
  autoResize?: boolean;

  /**
   * Minimum rows for textarea
   * @default 3
   */
  minRows?: number;

  /**
   * Maximum rows for textarea
   * @default 10
   */
  maxRows?: number;
}

export type ModernInputCombinedProps = ModernInputProps | ModernTextareaProps;

// ============================================================================
// MODERN INPUT COMPONENT
// ============================================================================

export const ModernInput: React.FC<ModernInputCombinedProps> = (props) => {
  const {
    label,
    size = 'medium',
    variant = 'outlined',
    validation = 'default',
    helperText,
    prefix,
    suffix,
    clearable = false,
    showCounter = false,
    fullWidth = false,
    isDarkMode = false,
    isRTL = true,
    style = {},
    className = '',
    disabled = false,
    value: controlledValue,
    onChange,
    maxLength,
    multiline,
    ...restProps
  } = props;

  const theme = getTheme(isDarkMode, isRTL);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // State
  const [isFocused, setIsFocused] = useState(false);
  const [internalValue, setInternalValue] = useState(controlledValue || '');
  const [showPassword, setShowPassword] = useState(false);

  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const hasValue = !!value && String(value).length > 0;
  const isFloating = isFocused || hasValue;

  // Handle password type
  const isPasswordType = !props.multiline && (props as ModernInputProps).type === 'password';
  const inputType = isPasswordType && showPassword ? 'text' : !props.multiline ? (props as ModernInputProps).type : undefined;

  // Auto-resize textarea
  useEffect(() => {
    if (props.multiline && (props as ModernTextareaProps).autoResize && inputRef.current) {
      const textarea = inputRef.current as HTMLTextAreaElement;
      textarea.style.height = 'auto';
      const minRows = (props as ModernTextareaProps).minRows || 3;
      const maxRows = (props as ModernTextareaProps).maxRows || 10;
      const lineHeight = parseInt(theme.fontSize.body) * 1.5;
      const minHeight = lineHeight * minRows;
      const maxHeight = lineHeight * maxRows;
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = `${Math.min(Math.max(scrollHeight, minHeight), maxHeight)}px`;
    }
  }, [value, props.multiline]);

  // ========================================================================
  // STYLES
  // ========================================================================

  // Validation colors
  const validationColors = {
    default: {
      border: isDarkMode ? theme.colors.gray[600] : theme.colors.gray[300],
      borderFocus: theme.colors.primary[500],
      text: isDarkMode ? theme.colors.gray[300] : theme.colors.gray[700],
      helper: isDarkMode ? theme.colors.gray[400] : theme.colors.gray[600]
    },
    success: {
      border: theme.colors.success[500],
      borderFocus: theme.colors.success[600],
      text: theme.colors.success[600],
      helper: theme.colors.success[600]
    },
    error: {
      border: theme.colors.error[500],
      borderFocus: theme.colors.error[600],
      text: theme.colors.error[600],
      helper: theme.colors.error[600]
    },
    warning: {
      border: theme.colors.warning[500],
      borderFocus: theme.colors.warning[600],
      text: theme.colors.warning[600],
      helper: theme.colors.warning[600]
    }
  };

  const currentColors = validationColors[validation];

  // Container styles
  const containerStyles: React.CSSProperties = {
    position: 'relative',
    width: fullWidth ? '100%' : 'auto',
    marginBottom: helperText || showCounter ? theme.spacing.lg : '0',
    fontFamily: theme.fonts.primary,
    ...style
  };

  // Input wrapper styles
  const wrapperStyles: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    borderRadius: theme.borderRadius.lg,
    border: `2px solid ${isFocused ? currentColors.borderFocus : currentColors.border}`,
    background: variant === 'filled'
      ? (isDarkMode ? theme.colors.surface : theme.colors.gray[50])
      : (isDarkMode ? theme.colors.background : theme.colors.white),
    transition: theme.transitions.common.all,
    opacity: disabled ? 0.6 : 1,
    cursor: disabled ? 'not-allowed' : 'text'
  };

  // Input base styles
  const inputBaseStyles: React.CSSProperties = {
    flex: 1,
    width: '100%',
    height: theme.componentSizes.input[size].height,
    // Fix: Always use consistent padding when label exists, add top padding when floating
    padding: label && isFloating
      ? `${theme.spacing.xl} ${theme.spacing.md} ${theme.spacing.xs}`
      : theme.componentSizes.input[size].padding,
    paddingLeft: prefix ? theme.spacing['2xl'] : theme.componentSizes.input[size].padding.split(' ')[1],
    paddingRight: (suffix || clearable || isPasswordType) ? theme.spacing['2xl'] : theme.componentSizes.input[size].padding.split(' ')[1],
    border: 'none',
    outline: 'none',
    background: 'transparent',
    fontSize: theme.componentSizes.input[size].fontSize,
    fontWeight: theme.fontWeight.regular,
    color: currentColors.text,
    fontFamily: theme.fonts.primary,
    transition: theme.transitions.common.all,
    direction: isRTL ? 'rtl' : 'ltr',
    resize: props.multiline ? 'none' : undefined,
    position: 'relative',
    zIndex: 1 // Ensure input is below label (label is zIndex: 10)
  };

  // Label styles - FIXED: Label must be positioned OUTSIDE input border when floating
  const labelStyles: React.CSSProperties = {
    position: 'absolute',
    // CRITICAL FIX: Move label ABOVE the input border when floating, not inside
    top: isFloating ? '-10px' : '50%',
    [isRTL ? 'right' : 'left']: prefix ? theme.spacing['3xl'] : theme.spacing.md,
    transform: isFloating ? 'translateY(0)' : 'translateY(-50%)',
    fontSize: isFloating ? theme.fontSize.caption : theme.fontSize.body,
    fontWeight: theme.fontWeight.medium,
    color: isFocused ? currentColors.borderFocus : currentColors.helper,
    background: variant === 'outlined'
      ? (isDarkMode ? theme.colors.background : theme.colors.white)
      : 'transparent',
    padding: isFloating ? `0 ${theme.spacing['2xs']}` : '0',
    transition: `all 200ms ${theme.transitions.easing.standard}`,
    pointerEvents: 'none',
    zIndex: 10, // Stays above input text and border
    whiteSpace: 'nowrap',
    fontFamily: theme.fonts.primary
  };

  // Icon/affix styles
  const affixStyles: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: currentColors.helper,
    pointerEvents: 'none',
    fontSize: theme.componentSizes.icon.medium
  };

  const prefixStyles: React.CSSProperties = {
    ...affixStyles,
    [isRTL ? 'right' : 'left']: theme.spacing.md
  };

  const suffixStyles: React.CSSProperties = {
    ...affixStyles,
    [isRTL ? 'left' : 'right']: theme.spacing.md,
    pointerEvents: 'auto',
    cursor: 'pointer'
  };

  // Helper text styles
  const helperStyles: React.CSSProperties = {
    marginTop: theme.spacing['2xs'],
    fontSize: theme.fontSize.caption,
    color: currentColors.helper,
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.md,
    display: 'flex',
    justifyContent: 'space-between',
    fontFamily: theme.fonts.primary
  };

  // ========================================================================
  // EVENT HANDLERS
  // ========================================================================

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (controlledValue === undefined) {
      setInternalValue(e.target.value);
    }
    if (!multiline && onChange) {
      (onChange as React.ChangeEventHandler<HTMLInputElement>)(e);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (controlledValue === undefined) {
      setInternalValue(e.target.value);
    }
    if (multiline && onChange) {
      (onChange as React.ChangeEventHandler<HTMLTextAreaElement>)(e);
    }
  };

  const handleClear = () => {
    if (controlledValue === undefined) {
      setInternalValue('');
    }
    if (onChange && inputRef.current) {
      const event = {
        target: { ...inputRef.current, value: '' }
      } as React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
      onChange(event as any);
    }
    inputRef.current?.focus();
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div style={containerStyles} className={className}>
      <div style={wrapperStyles}>
        {/* Prefix */}
        {prefix && <span style={prefixStyles}>{prefix}</span>}

        {/* Label */}
        {label && <label style={labelStyles}>{label}</label>}

        {/* Input or Textarea */}
        {props.multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            style={inputBaseStyles}
            value={value}
            onChange={handleTextareaChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            maxLength={maxLength}
            rows={(props as ModernTextareaProps).minRows || 3}
            aria-label={label}
            aria-invalid={validation === 'error'}
            aria-describedby={helperText ? `${label}-helper` : undefined}
            {...(restProps as TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            style={inputBaseStyles}
            value={value}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            maxLength={maxLength}
            type={inputType || 'text'}
            aria-label={label}
            aria-invalid={validation === 'error'}
            aria-describedby={helperText ? `${label}-helper` : undefined}
            {...(restProps as InputHTMLAttributes<HTMLInputElement>)}
          />
        )}

        {/* Clear Button */}
        {clearable && hasValue && !disabled && (
          <span style={suffixStyles} onClick={handleClear}>
            <XMarkIcon style={{ width: '16px', height: '16px' }} />
          </span>
        )}

        {/* Password Toggle */}
        {isPasswordType && !clearable && (
          <span style={suffixStyles} onClick={togglePasswordVisibility}>
            {showPassword ? (
              <EyeSlashIcon style={{ width: '20px', height: '20px' }} />
            ) : (
              <EyeIcon style={{ width: '20px', height: '20px' }} />
            )}
          </span>
        )}

        {/* Suffix */}
        {suffix && !clearable && !isPasswordType && (
          <span style={{ ...suffixStyles, pointerEvents: 'none' }}>{suffix}</span>
        )}
      </div>

      {/* Helper Text and Counter */}
      {(helperText || showCounter) && (
        <div style={helperStyles} id={`${label}-helper`}>
          <span>{helperText}</span>
          {showCounter && maxLength && (
            <span style={{ color: currentColors.helper }}>
              {String(value).length}/{maxLength}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default memo(ModernInput);
