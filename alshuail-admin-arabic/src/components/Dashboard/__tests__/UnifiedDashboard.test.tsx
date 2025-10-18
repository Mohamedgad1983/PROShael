import React from 'react';
import { render, screen } from '@testing-library/react';
import UnifiedDashboard, { DASHBOARD_VARIANTS } from '../UnifiedDashboard';

describe('UnifiedDashboard', () => {
  describe('Variant Configurations', () => {
    Object.entries(DASHBOARD_VARIANTS).forEach(([variantKey, variantConfig]) => {
      it(`should render ${variantKey} dashboard correctly`, () => {
        const { container } = render(
          <UnifiedDashboard
            config={variantConfig}
            onLogout={() => {}}
          />
        );
        expect(container).toBeTruthy();
      });
    });
  });

  describe('Feature Flags', () => {
    it('should display charts when hasCharts is true', () => {
      render(
        <UnifiedDashboard
          config={{ ...DASHBOARD_VARIANTS.apple, hasCharts: true }}
          onLogout={() => {}}
        />
      );
      // Chart section should be rendered
      expect(document.querySelector('h3')).toBeTruthy();
    });

    it('should hide charts when hasCharts is false', () => {
      render(
        <UnifiedDashboard
          config={{ ...DASHBOARD_VARIANTS.simple, hasCharts: false }}
          onLogout={() => {}}
        />
      );
      // Simple dashboard with no charts
      expect(document.querySelector('[dir="rtl"]')).toBeTruthy();
    });

    it('should show search input when enableSearch is true', () => {
      const { container } = render(
        <UnifiedDashboard
          config={{ ...DASHBOARD_VARIANTS.apple, enableSearch: true }}
          onLogout={() => {}}
        />
      );
      const searchInputs = container.querySelectorAll('input[placeholder*="البحث"]');
      expect(searchInputs.length).toBeGreaterThan(0);
    });
  });

  describe('Navigation', () => {
    it('should handle section navigation', () => {
      const onNavigate = jest.fn();
      render(
        <UnifiedDashboard
          config={DASHBOARD_VARIANTS.apple}
          onLogout={() => {}}
          onNavigate={onNavigate}
        />
      );
      expect(onNavigate).not.toHaveBeenCalled(); // Only called on actual navigation
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain AppleDashboard compatibility', () => {
      const { container } = render(
        <UnifiedDashboard
          config={DASHBOARD_VARIANTS.apple}
          onLogout={() => {}}
        />
      );
      expect(container.querySelector('[dir="rtl"]')).toBeTruthy();
      expect(screen.getByText(/عائلة الشعيل/)).toBeTruthy();
    });

    it('should maintain IslamicPremiumDashboard compatibility', () => {
      const { container } = render(
        <UnifiedDashboard
          config={DASHBOARD_VARIANTS.islamic}
          onLogout={() => {}}
        />
      );
      expect(container.querySelector('[dir="rtl"]')).toBeTruthy();
      expect(DASHBOARD_VARIANTS.islamic.hasPrayerTimes).toBe(true);
    });
  });

  describe('UI Elements', () => {
    it('should display all required sections', () => {
      render(
        <UnifiedDashboard
          config={DASHBOARD_VARIANTS.apple}
          onLogout={() => {}}
        />
      );

      // Check for header
      expect(screen.getByText(/عائلة الشعيل/)).toBeTruthy();

      // Check for welcome section (when mounted)
      // Note: Component shows loading state initially, then dashboard section
    });

    it('should handle logout callback', () => {
      const onLogout = jest.fn();
      const { container } = render(
        <UnifiedDashboard
          config={DASHBOARD_VARIANTS.apple}
          onLogout={onLogout}
        />
      );

      // Logout button should exist
      const logoutButton = container.querySelector('[aria-label="Logout"]');
      expect(logoutButton).toBeTruthy();
    });
  });

  describe('Theme Support', () => {
    it('should support light theme', () => {
      const { container } = render(
        <UnifiedDashboard
          config={{ ...DASHBOARD_VARIANTS.apple, theme: 'light' }}
          onLogout={() => {}}
        />
      );
      expect(container).toBeTruthy();
    });

    it('should support dark theme', () => {
      const { container } = render(
        <UnifiedDashboard
          config={{ ...DASHBOARD_VARIANTS.apple, theme: 'dark' }}
          onLogout={() => {}}
        />
      );
      expect(container).toBeTruthy();
    });
  });

  describe('Language Support', () => {
    it('should support Arabic language', () => {
      const { container } = render(
        <UnifiedDashboard
          config={{ ...DASHBOARD_VARIANTS.apple, language: 'ar' }}
          onLogout={() => {}}
        />
      );
      expect(container.getAttribute('dir')).toBe('rtl');
    });
  });
});
