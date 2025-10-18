/**
 * Complete Dashboard - Unified Component Wrapper
 * Maps CompleteDashboard to UnifiedDashboard with complete configuration
 */

import React from 'react';
import UnifiedDashboard, { DASHBOARD_VARIANTS } from './UnifiedDashboard';

const CompleteDashboard: React.FC = () => {
  return (
    <UnifiedDashboard
      config={DASHBOARD_VARIANTS.complete}
      onLogout={() => console.log('Logout')}
    />
  );
};

export default CompleteDashboard;
