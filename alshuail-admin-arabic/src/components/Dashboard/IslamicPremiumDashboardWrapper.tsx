/**
 * Islamic Premium Dashboard - Unified Component Wrapper
 * Maps IslamicPremiumDashboard to UnifiedDashboard with Islamic design configuration
 * This maintains backward compatibility with existing imports
 */

import React from 'react';
import UnifiedDashboard, { DASHBOARD_VARIANTS } from './UnifiedDashboard';

const IslamicPremiumDashboard: React.FC = () => {
  return (
    <UnifiedDashboard
      config={DASHBOARD_VARIANTS.islamic}
      onLogout={() => console.log('Logout')}
    />
  );
};

export default IslamicPremiumDashboard;
