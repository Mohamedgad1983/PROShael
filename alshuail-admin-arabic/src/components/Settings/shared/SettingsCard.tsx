/**
 * Reusable Settings Card Component
 * Consistent card styling across all Settings sections
 */

import React from 'react';
import { commonStyles } from '../sharedStyles';

interface SettingsCardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const SettingsCard: React.FC<SettingsCardProps> = ({ children, style }) => {
  return (
    <div style={{ ...commonStyles.card, ...style }}>
      {children}
    </div>
  );
};
