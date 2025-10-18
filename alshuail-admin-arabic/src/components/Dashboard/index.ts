/**
 * Dashboard Components Export Index
 * Centralized export for all dashboard-related components
 */

// Main unified component
export { default as UnifiedDashboard } from './UnifiedDashboard';
export type { DashboardConfig, UnifiedDashboardProps, DashboardVariant, ThemeMode } from './UnifiedDashboard';

// Variant wrappers (backward compatible)
export { default as AppleDashboard } from './AppleDashboardWrapper';
export { default as IslamicPremiumDashboard } from './IslamicPremiumDashboardWrapper';
export { default as SimpleDashboard } from './SimpleDashboardWrapper';
export { default as PremiumDashboard } from './PremiumDashboardWrapper';
export { default as CompleteDashboard } from './CompleteDashboardWrapper';

// Sub-components
export { DesktopNavigation, MobileNavigation } from './DashboardNavigation';
export type { NavigationItem } from './DashboardNavigation';

export { default as OverviewStats } from './OverviewStats';
export type { OverviewStat } from './OverviewStats';

export { default as OverviewCharts } from './OverviewCharts';

export { default as RecentActivities } from './RecentActivities';
export type { ActivityItem } from './RecentActivities';

// Configuration
export { DASHBOARD_CONFIG, getDashboardConfig, getVariantStyles, COLOR_SCHEMES, FEATURE_FLAGS, LAYOUT_CONFIG, TYPOGRAPHY_CONFIG } from './dashboardConfig';

// Styles
export { default as dashboardStyles } from './styles';
