/**
 * Premium Dashboard Variants - Unified Component Wrappers
 * AlShuailPremiumDashboard, AlShuailCorrectedDashboard, UltraPremiumDashboard
 * All map to UnifiedDashboard with premium configuration
 */

import React from 'react';
import UnifiedDashboard, { DASHBOARD_VARIANTS } from './UnifiedDashboard';

import { logger } from '../../utils/logger';

const PremiumDashboard: React.FC = () => {
  return (
    <UnifiedDashboard
      config={DASHBOARD_VARIANTS.premium}
      onLogout={() => logger.debug('Logout')}
    />
  );
};

// Aliases for existing premium variants
export const AlShuailPremiumDashboard = PremiumDashboard;
export const AlShuailCorrectedDashboard = PremiumDashboard;
export const UltraPremiumDashboard = PremiumDashboard;

export default React.memo(PremiumDashboard);
