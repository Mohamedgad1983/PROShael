/**
 * Apple Dashboard - Unified Component Wrapper
 * Maps AppleDashboard to UnifiedDashboard with Apple design configuration
 * This maintains backward compatibility with existing imports
 */

import React from 'react';
import UnifiedDashboard, { DASHBOARD_VARIANTS } from './UnifiedDashboard';

interface AppleDashboardProps {
  onLogout: () => void;
}

const AppleDashboard: React.FC<AppleDashboardProps> = ({ onLogout }) => {
  return (
    <UnifiedDashboard
      config={DASHBOARD_VARIANTS.apple}
      onLogout={onLogout}
    />
  );
};

export default AppleDashboard;
