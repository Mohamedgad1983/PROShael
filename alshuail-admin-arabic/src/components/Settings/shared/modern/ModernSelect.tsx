/**
 * ModernSelect Component
 * Advanced dropdown component with search, multi-select, and keyboard navigation
 *
 * Features:
 * - Search/filter options
 * - Single/multi-select modes
 * - Keyboard navigation (Arrow keys, Enter, Escape, Tab)
 * - Custom option rendering
 * - Grouped options support
 * - Loading state
 * - Empty state
 * - Validation states (success, error, warning)
 * - Clearable selection
 * - Dark mode support
 * - RTL/LTR support
 * - Full accessibility (ARIA)
 *
 * @version 2.0.0
 * @date 2025-11-13
 */

import React, { memo,  SelectHTMLAttributes, ReactNode, useState, useRef, useEffect } from 'react';
import { getTheme } from '../../modernDesignSystem';
import { ChevronDownIcon, XMarkIcon, MagnifyingGlassIcon, CheckIcon } from '@heroicons/react/24/outline';

// ============================================================================
// TYPES
// ============================================================================

export type SelectSize = 'small' | 'medium' | 'large';
export type SelectValidation = 'default' | 'success' | 'error' | 'warning';

export interface SelectOption {
  /**
   * Unique option value
   */
  value: string | number;

  /**
   * Display label
   */
  label: string;

  /**
   * Disabled option
   */
  disabled?: boolean;

  /**
   * Option group (for grouped options)
   */
  group?: string;

  /**
   * Custom icon/element before label
   */
  icon?: ReactNode;

  /**
   * Additional metadata
   */
  data?: any;
}

export interface ModernSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size' | 'value' | 'onChange'> {
  /**
   * Select options
   */
  options: SelectOption[];

  /**
   * Selected value(s)
   */
  value?: string | number | (string | number)[];

  /**
   * Change handler
   */
  onChange?: (value: string | number | (string | number)[]) => void;

  /**
   * Select label
   */
  label?: string;

  /**
   * Placeholder text
   */
  placeholder?: string;

  /**
   * Select size
   * @default 'medium'
   */
  size?: SelectSize;

  /**
   * Validation state
   * @default 'default'
   */
  validation?: SelectValidation;

  /**
   * Helper text below select
   */
  helperText?: string;

  /**
   * Enable search/filter
   * @default false
   */
  searchable?: boolean;

  /**
   * Multi-select mode
   * @default false
   */
  multiple?: boolean;

  /**
   * Clearable selection
   * @default false
   */
  clearable?: boolean;

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
   * Full width select
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

  /**
   * Empty state message
   */
  emptyMessage?: string;
}

// ============================================================================
// MODERN SELECT COMPONENT
// ============================================================================

export const ModernSelect: React.FC<ModernSelectProps> = ({
  options = [],
  value,
  onChange,
  label,
  placeholder = 'Select...',
  size = 'medium',
  validation = 'default',
  helperText,
  searchable = false,
  multiple = false,
  clearable = false,
  loading = false,
  disabled = false,
  fullWidth = false,
  isDarkMode = false,
  isRTL = true,
  style = {},
  className = '',
  emptyMessage = 'No options available',
  ...rest
}) => {
  const theme = getTheme(isDarkMode, isRTL);
  const selectRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // State
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Normalize value to array for consistent handling
  const selectedValues = Array.isArray(value) ? value : value !== undefined ? [value] : [];

  // Filter options based on search query
  const filteredOptions = searchable && searchQuery
    ? options.filter(opt =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  // Group options if any have group property
  const hasGroups = options.some(opt => opt.group);
  const groupedOptions: Record<string, SelectOption[]> = {};
  if (hasGroups) {
    filteredOptions.forEach(opt => {
      const group = opt.group || 'Other';
      if (!groupedOptions[group]) groupedOptions[group] = [];
      groupedOptions[group].push(opt);
    });
  }

  // Get display label for selected value(s)
  const getDisplayLabel = () => {
    if (selectedValues.length === 0) return placeholder;
    if (multiple) {
      return selectedValues.length === 1
        ? options.find(opt => opt.value === selectedValues[0])?.label || placeholder
        : `${selectedValues.length} selected`;
    }
    return options.find(opt => opt.value === selectedValues[0])?.label || placeholder;
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  // ========================================================================
  // STYLES
  // ========================================================================

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

  const containerStyles: React.CSSProperties = {
    position: 'relative',
    width: fullWidth ? '100%' : 'auto',
    marginBottom: helperText ? theme.spacing.lg : '0',
    fontFamily: theme.fonts.primary,
    ...style
  };

  const selectBoxStyles: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: theme.componentSizes.input[size].height,
    padding: theme.componentSizes.input[size].padding,
    borderRadius: theme.borderRadius.lg,
    border: `2px solid ${isOpen ? currentColors.borderFocus : currentColors.border}`,
    background: isDarkMode ? theme.colors.background : theme.colors.white,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    transition: theme.transitions.common.all,
    direction: isRTL ? 'rtl' : 'ltr'
  };

  const labelStyles: React.CSSProperties = {
    display: 'block',
    marginBottom: theme.spacing.xs,
    fontSize: theme.fontSize.bodySm,
    fontWeight: theme.fontWeight.medium,
    color: currentColors.text,
    fontFamily: theme.fonts.primary
  };

  const displayTextStyles: React.CSSProperties = {
    flex: 1,
    fontSize: theme.componentSizes.input[size].fontSize,
    color: selectedValues.length > 0 ? currentColors.text : currentColors.helper,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  };

  const iconContainerStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.xs,
    color: currentColors.helper
  };

  const dropdownStyles: React.CSSProperties = {
    position: 'absolute',
    top: `calc(100% + ${theme.spacing.xs})`,
    left: 0,
    right: 0,
    maxHeight: '300px',
    background: isDarkMode ? theme.colors.background : theme.colors.white,
    border: `1px solid ${isDarkMode ? theme.colors.gray[700] : theme.colors.gray[200]}`,
    borderRadius: theme.borderRadius.lg,
    boxShadow: theme.shadows.lg,
    overflow: 'auto',
    zIndex: theme.zIndex.dropdown,
    opacity: isOpen ? 1 : 0,
    visibility: isOpen ? 'visible' : 'hidden',
    transform: isOpen ? 'translateY(0)' : 'translateY(-8px)',
    transition: `all 200ms ${theme.transitions.easing.standard}`
  };

  const searchInputStyles: React.CSSProperties = {
    width: '100%',
    padding: theme.spacing.md,
    border: 'none',
    borderBottom: `1px solid ${isDarkMode ? theme.colors.gray[700] : theme.colors.gray[200]}`,
    outline: 'none',
    fontSize: theme.fontSize.body,
    fontFamily: theme.fonts.primary,
    background: 'transparent',
    color: currentColors.text
  };

  const optionStyles = (isHighlighted: boolean, isSelected: boolean, isDisabled: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    fontSize: theme.fontSize.body,
    color: isDisabled
      ? currentColors.helper
      : isSelected
      ? theme.colors.primary[500]
      : currentColors.text,
    background: isHighlighted
      ? isDarkMode ? theme.colors.gray[800] : theme.colors.gray[50]
      : 'transparent',
    opacity: isDisabled ? 0.5 : 1,
    transition: theme.transitions.common.all,
    fontFamily: theme.fonts.primary
  });

  const groupLabelStyles: React.CSSProperties = {
    padding: `${theme.spacing.md} ${theme.spacing.md} ${theme.spacing.xs}`,
    fontSize: theme.fontSize.caption,
    fontWeight: theme.fontWeight.semibold,
    color: currentColors.helper,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontFamily: theme.fonts.primary
  };

  const helperStyles: React.CSSProperties = {
    marginTop: theme.spacing['2xs'],
    fontSize: theme.fontSize.caption,
    color: currentColors.helper,
    fontFamily: theme.fonts.primary
  };

  // ========================================================================
  // EVENT HANDLERS
  // ========================================================================

  const handleToggle = () => {
    if (!disabled && !loading) {
      setIsOpen(!isOpen);
      setSearchQuery('');
      setHighlightedIndex(-1);
    }
  };

  const handleOptionClick = (option: SelectOption) => {
    if (option.disabled) return;

    let newValue: string | number | (string | number)[];

    if (multiple) {
      const currentValues = selectedValues as (string | number)[];
      if (currentValues.includes(option.value)) {
        newValue = currentValues.filter(v => v !== option.value);
      } else {
        newValue = [...currentValues, option.value];
      }
    } else {
      newValue = option.value;
      setIsOpen(false);
    }

    onChange?.(newValue);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.(multiple ? [] : '');
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled || loading) return;

    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleOptionClick(filteredOptions[highlightedIndex]);
        }
        break;

      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;

      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex(prev =>
            prev < filteredOptions.length - 1 ? prev + 1 : prev
          );
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setHighlightedIndex(prev => (prev > 0 ? prev - 1 : prev));
        }
        break;
    }
  };

  // ========================================================================
  // RENDER
  // ========================================================================

  const isSelected = (option: SelectOption) => selectedValues.includes(option.value);

  const renderOptions = () => {
    if (loading) {
      return (
        <div style={{ padding: theme.spacing.lg, textAlign: 'center', color: currentColors.helper }}>
          Loading...
        </div>
      );
    }

    if (filteredOptions.length === 0) {
      return (
        <div style={{ padding: theme.spacing.lg, textAlign: 'center', color: currentColors.helper }}>
          {emptyMessage}
        </div>
      );
    }

    if (hasGroups) {
      return Object.entries(groupedOptions).map(([group, opts]) => (
        <div key={group}>
          <div style={groupLabelStyles}>{group}</div>
          {opts.map((opt, idx) => {
            const globalIndex = filteredOptions.findIndex(o => o.value === opt.value);
            return (
              <div
                key={opt.value}
                style={optionStyles(highlightedIndex === globalIndex, isSelected(opt), !!opt.disabled)}
                onClick={() => handleOptionClick(opt)}
                onMouseEnter={() => setHighlightedIndex(globalIndex)}
              >
                {multiple && (
                  <div style={{
                    width: '18px',
                    height: '18px',
                    border: `2px solid ${theme.colors.primary[500]}`,
                    borderRadius: theme.borderRadius.sm,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isSelected(opt) ? theme.colors.primary[500] : 'transparent'
                  }}>
                    {isSelected(opt) && <CheckIcon style={{ width: '12px', height: '12px', color: theme.colors.white }} />}
                  </div>
                )}
                {opt.icon && <span style={{ display: 'flex', alignItems: 'center' }}>{opt.icon}</span>}
                <span style={{ flex: 1 }}>{opt.label}</span>
                {!multiple && isSelected(opt) && (
                  <CheckIcon style={{ width: '16px', height: '16px', color: theme.colors.primary[500] }} />
                )}
              </div>
            );
          })}
        </div>
      ));
    }

    return filteredOptions.map((opt, idx) => (
      <div
        key={opt.value}
        style={optionStyles(highlightedIndex === idx, isSelected(opt), !!opt.disabled)}
        onClick={() => handleOptionClick(opt)}
        onMouseEnter={() => setHighlightedIndex(idx)}
      >
        {multiple && (
          <div style={{
            width: '18px',
            height: '18px',
            border: `2px solid ${theme.colors.primary[500]}`,
            borderRadius: theme.borderRadius.sm,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isSelected(opt) ? theme.colors.primary[500] : 'transparent'
          }}>
            {isSelected(opt) && <CheckIcon style={{ width: '12px', height: '12px', color: theme.colors.white }} />}
          </div>
        )}
        {opt.icon && <span style={{ display: 'flex', alignItems: 'center' }}>{opt.icon}</span>}
        <span style={{ flex: 1 }}>{opt.label}</span>
        {!multiple && isSelected(opt) && (
          <CheckIcon style={{ width: '16px', height: '16px', color: theme.colors.primary[500] }} />
        )}
      </div>
    ));
  };

  return (
    <div style={containerStyles} className={className} ref={selectRef}>
      {label && <label style={labelStyles}>{label}</label>}

      <div
        style={selectBoxStyles}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={label}
        aria-disabled={disabled}
      >
        <span style={displayTextStyles}>{getDisplayLabel()}</span>

        <div style={iconContainerStyles}>
          {clearable && selectedValues.length > 0 && !disabled && (
            <XMarkIcon
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              onClick={handleClear}
            />
          )}
          <ChevronDownIcon
            style={{
              width: '16px',
              height: '16px',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: theme.transitions.common.transform
            }}
          />
        </div>
      </div>

      <div style={dropdownStyles} role="listbox">
        {searchable && (
          <div style={{ position: 'relative' }}>
            <MagnifyingGlassIcon
              style={{
                position: 'absolute',
                top: '50%',
                [isRTL ? 'right' : 'left']: theme.spacing.md,
                transform: 'translateY(-50%)',
                width: '16px',
                height: '16px',
                color: currentColors.helper
              }}
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search..."
              style={{
                ...searchInputStyles,
                [isRTL ? 'paddingRight' : 'paddingLeft']: theme.spacing['3xl']
              }}
            />
          </div>
        )}
        {renderOptions()}
      </div>

      {helperText && <div style={helperStyles}>{helperText}</div>}
    </div>
  );
};

export default memo(ModernSelect);
