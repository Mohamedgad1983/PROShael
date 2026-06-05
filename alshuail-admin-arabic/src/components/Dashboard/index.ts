/**
 * Dashboard Components Export Index
 * Centralized export for all dashboard-related components
 */

// Main unified component
// Variant wrappers (backward compatible)
export { default as AppleDashboard } from './AppleDashboardWrapper';
export { default as CompleteDashboard } from './CompleteDashboardWrapper';
// Configuration
export { COLOR_SCHEMES,DASHBOARD_CONFIG,FEATURE_FLAGS,getDashboardConfig,getVariantStyles,LAYOUT_CONFIG,TYPOGRAPHY_CONFIG } from './dashboardConfig';
// Sub-components
export { DesktopNavigation,MobileNavigation } from './DashboardNavigation';
export type { NavigationItem } from './DashboardNavigation';
export { default as IslamicPremiumDashboard } from './IslamicPremiumDashboardWrapper';
export { default as OverviewCharts } from './OverviewCharts';
export { default as OverviewStats } from './OverviewStats';
export type { OverviewStat } from './OverviewStats';
export { default as PremiumDashboard } from './PremiumDashboardWrapper';
export { default as RecentActivities } from './RecentActivities';
export type { ActivityItem } from './RecentActivities';
export { default as SimpleDashboard } from './SimpleDashboardWrapper';
// Styles
export { default as dashboardStyles } from './styles';
export { default as UnifiedDashboard } from './UnifiedDashboard';
export type { DashboardConfig,DashboardVariant,ThemeMode,UnifiedDashboardProps } from './UnifiedDashboard';
