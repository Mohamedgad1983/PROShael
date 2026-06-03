/**
 * Reusable Settings Button Component
 * Consistent button styling with variants
 */

import React from 'react';
import { commonStyles } from '../sharedStyles';

interface SettingsButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
}

export const SettingsButton: React.FC<SettingsButtonProps> = ({
  variant = 'primary',
  children,
  onClick,
  disabled = false,
  icon,
  style
}) => {
  return (
    <button
      style={{
        ...commonStyles.button[variant],
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style
      }}
      onClick={onClick}
      disabled={disabled}
    >
      {icon && icon}
      {children}
    </button>
  );
};
