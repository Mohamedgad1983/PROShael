/**
 * Islamic Premium Dashboard - Unified Component Wrapper
 * Maps IslamicPremiumDashboard to UnifiedDashboard with Islamic design configuration
 * This maintains backward compatibility with existing imports
 */

import React from 'react';
import UnifiedDashboard, { DASHBOARD_VARIANTS } from './UnifiedDashboard';

import { logger } from '../../utils/logger';

const IslamicPremiumDashboard: React.FC = () => {
  return (
    <UnifiedDashboard
      config={DASHBOARD_VARIANTS.islamic}
      onLogout={() => logger.debug('Logout')}
    />
  );
};

export default React.memo(IslamicPremiumDashboard);
