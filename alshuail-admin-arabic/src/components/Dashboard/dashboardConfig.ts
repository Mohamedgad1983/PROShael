/**
 * Dashboard Configuration System
 * Centralized configuration for all dashboard variants
 *
 * Usage:
 * import { DASHBOARD_CONFIG, getDashboardConfig } from './dashboardConfig';
 * const config = getDashboardConfig('apple');
 */

import { DashboardConfig, DashboardVariant } from './UnifiedDashboard';

// Color schemes for different variants
export const COLOR_SCHEMES = {
  apple: {
    primary: '#667eea',
    secondary: '#764ba2',
    accent: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
  },
  islamic: {
    primary: '#0a8a70',
    secondary: '#584eb2',
    accent: '#5856d6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
  },
  premium: {
    primary: '#8b5cf6',
    secondary: '#6366f1',
    accent: '#06b6d4',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
  },
  simple: {
    primary: '#3b82f6',
    secondary: '#1e40af',
    accent: '#2563eb',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
  },
  complete: {
    primary: '#667eea',
    secondary: '#764ba2',
    accent: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
  },
};

// Feature configurations
export const FEATURE_FLAGS = {
  apple: {
    charts: true,
    prayerTimes: false,
    darkMode: true,
    search: true,
    notifications: true,
    exportData: true,
    customTheme: true,
  },
  islamic: {
    charts: true,
    prayerTimes: true,
    darkMode: true,
    search: true,
    notifications: true,
    exportData: true,
    hijriDate: true,
    islamicPatterns: true,
  },
  premium: {
    charts: true,
    prayerTimes: false,
    darkMode: true,
    search: true,
    notifications: true,
    exportData: true,
    advancedAnalytics: true,
    customReports: true,
  },
  simple: {
    charts: false,
    prayerTimes: false,
    darkMode: false,
    search: false,
    notifications: true,
    exportData: false,
  },
  complete: {
    charts: true,
    prayerTimes: false,
    darkMode: true,
    search: true,
    notifications: true,
    exportData: true,
    advancedAnalytics: true,
    customReports: true,
  },
};

// Layout configurations
export const LAYOUT_CONFIG = {
  apple: {
    sidebarWidth: '320px',
    headerHeight: '80px',
    gridColumns: '4',
    spacing: '1.5rem',
    borderRadius: '12px',
  },
  islamic: {
    sidebarWidth: '280px',
    headerHeight: '80px',
    gridColumns: '4',
    spacing: '1.5rem',
    borderRadius: '16px',
  },
  premium: {
    sidebarWidth: '300px',
    headerHeight: '80px',
    gridColumns: '4',
    spacing: '1.5rem',
    borderRadius: '20px',
  },
  simple: {
    sidebarWidth: '250px',
    headerHeight: '60px',
    gridColumns: '3',
    spacing: '1rem',
    borderRadius: '8px',
  },
  complete: {
    sidebarWidth: '320px',
    headerHeight: '80px',
    gridColumns: '4',
    spacing: '1.5rem',
    borderRadius: '16px',
  },
};

// Typography configurations
export const TYPOGRAPHY_CONFIG = {
  apple: {
    fontFamily: 'Tajawal, Cairo, -apple-system, BlinkMacSystemFont, sans-serif',
    headerSize: '24px',
    titleSize: '18px',
    bodySize: '14px',
    captionSize: '12px',
  },
  islamic: {
    fontFamily: 'Cairo, Tajawal, -apple-system, BlinkMacSystemFont, sans-serif',
    headerSize: '24px',
    titleSize: '18px',
    bodySize: '14px',
    captionSize: '12px',
  },
  premium: {
    fontFamily: 'Tajawal, Cairo, -apple-system, BlinkMacSystemFont, sans-serif',
    headerSize: '26px',
    titleSize: '20px',
    bodySize: '14px',
    captionSize: '12px',
  },
  simple: {
    fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
    headerSize: '20px',
    titleSize: '16px',
    bodySize: '13px',
    captionSize: '11px',
  },
  complete: {
    fontFamily: 'Tajawal, Cairo, -apple-system, BlinkMacSystemFont, sans-serif',
    headerSize: '24px',
    titleSize: '18px',
    bodySize: '14px',
    captionSize: '12px',
  },
};

// Get complete configuration for a variant
export const getDashboardConfig = (variant: DashboardVariant): DashboardConfig => {
  return {
    variant,
    theme: 'light',
    language: 'ar',
    hasCharts: FEATURE_FLAGS[variant].charts,
    hasPrayerTimes: FEATURE_FLAGS[variant].prayerTimes,
    sidebarCollapsible: true,
    enableSearch: FEATURE_FLAGS[variant].search,
    enableNotifications: FEATURE_FLAGS[variant].notifications,
  };
};

// Get variant-specific style configuration
export const getVariantStyles = (variant: DashboardVariant) => {
  return {
    colors: COLOR_SCHEMES[variant],
    features: FEATURE_FLAGS[variant],
    layout: LAYOUT_CONFIG[variant],
    typography: TYPOGRAPHY_CONFIG[variant],
  };
};

// Export all configurations
export const DASHBOARD_CONFIG = {
  variants: ['apple', 'islamic', 'premium', 'simple', 'complete'] as const,
  colors: COLOR_SCHEMES,
  features: FEATURE_FLAGS,
  layout: LAYOUT_CONFIG,
  typography: TYPOGRAPHY_CONFIG,
  getDashboardConfig,
  getVariantStyles,
};

export default DASHBOARD_CONFIG;
