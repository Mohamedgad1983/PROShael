/**
 * Simple Dashboard - Unified Component Wrapper
 * Maps SimpleDashboard to UnifiedDashboard with minimal configuration
 */

import React from 'react';
import UnifiedDashboard, { DASHBOARD_VARIANTS } from './UnifiedDashboard';

import { logger } from '../../utils/logger';

const SimpleDashboard: React.FC = () => {
  return (
    <UnifiedDashboard
      config={DASHBOARD_VARIANTS.simple}
      onLogout={() => logger.debug('Logout')}
    />
  );
};

export default React.memo(SimpleDashboard);
