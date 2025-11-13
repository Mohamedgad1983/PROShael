/**
 * Reusable Settings Input Component
 * Consistent input styling with label, error state, and validation
 */

import React from 'react';
import { commonStyles, COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../sharedStyles';

interface SettingsInputProps {
  label: string;
  value: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  error?: string; // Can be boolean or string (error message)
  disabled?: boolean;
  required?: boolean;
  style?: React.CSSProperties;
}

export const SettingsInput: React.FC<SettingsInputProps> = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  error,
  disabled = false,
  required = false,
  style
}) => {
  const hasError = Boolean(error);
  const errorMessage = typeof error === 'string' ? error : undefined;
  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: SPACING.sm,
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.gray700
  };

  const inputStyle: React.CSSProperties = {
    ...commonStyles.input,
    ...(hasError && {
      borderColor: COLORS.error,
      background: COLORS.errorBg
    }),
    ...(disabled && {
      opacity: 0.6,
      cursor: 'not-allowed'
    }),
    ...style
  };

  const errorStyle: React.CSSProperties = {
    marginTop: SPACING.xs,
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.errorText,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.xs
  };

  return (
    <div style={{ marginBottom: SPACING.lg }}>
      <label style={labelStyle}>
        {label}
        {required && <span style={{ color: COLORS.error, marginRight: '4px' }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        style={inputStyle}
      />
      {hasError && errorMessage && (
        <div style={errorStyle}>
          ⚠️ {errorMessage}
        </div>
      )}
    </div>
  );
};
