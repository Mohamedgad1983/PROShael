/**
 * Complete Dashboard - Unified Component Wrapper
 * Maps CompleteDashboard to UnifiedDashboard with complete configuration
 */

import React from 'react';
import UnifiedDashboard, { DASHBOARD_VARIANTS } from './UnifiedDashboard';

import { logger } from '../../utils/logger';

const CompleteDashboard: React.FC = () => {
  return (
    <UnifiedDashboard
      config={DASHBOARD_VARIANTS.complete}
      onLogout={() => logger.debug('Logout')}
    />
  );
};

export default React.memo(CompleteDashboard);
