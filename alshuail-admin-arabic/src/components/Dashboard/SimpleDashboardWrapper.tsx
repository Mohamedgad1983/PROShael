/**
 * Simple Dashboard - Unified Component Wrapper
 * Maps SimpleDashboard to UnifiedDashboard with minimal configuration
 */

import React from 'react';
import UnifiedDashboard, { DASHBOARD_VARIANTS } from './UnifiedDashboard';

const SimpleDashboard: React.FC = () => {
  return (
    <UnifiedDashboard
      config={DASHBOARD_VARIANTS.simple}
      onLogout={() => console.log('Logout')}
    />
  );
};

export default React.memo(SimpleDashboard);
