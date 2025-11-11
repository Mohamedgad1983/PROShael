/**
 * Reusable Status Badge Component
 * Consistent badge styling for status indicators
 */

import React from 'react';
import { commonStyles } from '../sharedStyles';

interface StatusBadgeProps {
  type: 'success' | 'error' | 'warning' | 'info';
  children: React.ReactNode;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  type,
  children,
  icon,
  style
}) => {
  return (
    <span
      style={{
        ...commonStyles.badge[type],
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        ...style
      }}
    >
      {icon && icon}
      {children}
    </span>
  );
};
