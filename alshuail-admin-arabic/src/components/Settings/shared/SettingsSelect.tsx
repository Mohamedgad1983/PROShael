/**
 * Reusable Settings Select Component
 * Consistent select/dropdown styling with label and validation
 */

import React from 'react';
import { commonStyles, COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../sharedStyles';

interface SettingsSelectOption {
  value: string;
  label: string;
}

interface SettingsSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SettingsSelectOption[];
  placeholder?: string;
  error?: boolean;
  errorMessage?: string;
  disabled?: boolean;
  required?: boolean;
  style?: React.CSSProperties;
}

export const SettingsSelect: React.FC<SettingsSelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = 'اختر...',
  error = false,
  errorMessage,
  disabled = false,
  required = false,
  style
}) => {
  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: SPACING.sm,
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.gray700
  };

  const selectStyle: React.CSSProperties = {
    ...commonStyles.input,
    cursor: disabled ? 'not-allowed' : 'pointer',
    ...(error && {
      borderColor: COLORS.error,
      background: COLORS.errorBg
    }),
    ...(disabled && {
      opacity: 0.6
    }),
    ...style
  };

  const errorStyle: React.CSSProperties = {
    marginTop: SPACING.xs,
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.errorText
  };

  return (
    <div style={{ marginBottom: SPACING.lg }}>
      <label style={labelStyle}>
        {label}
        {required && <span style={{ color: COLORS.error, marginRight: '4px' }}>*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        style={selectStyle}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && errorMessage && (
        <div style={errorStyle}>{errorMessage}</div>
      )}
    </div>
  );
};
