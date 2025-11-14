/**
 * ThemeContext - Global Theme Management
 * Manages dark mode, primary color, and font size preferences
 *
 * @version 1.0.0
 * @date 2025-01-13
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type ThemeMode = 'light' | 'dark' | 'auto';
export type PrimaryColor = 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'teal' | 'pink' | 'indigo';
export type FontSize = 'small' | 'medium' | 'large';

export interface ThemeSettings {
  mode: ThemeMode;
  primaryColor: PrimaryColor;
  fontSize: FontSize;
  compactMode: boolean;
  animationsEnabled: boolean;
}

export interface ThemeContextType {
  settings: ThemeSettings;
  isDarkMode: boolean;
  updateTheme: (newSettings: Partial<ThemeSettings>) => void;
  resetTheme: () => void;
}

// ============================================================================
// DEFAULT SETTINGS
// ============================================================================

const DEFAULT_SETTINGS: ThemeSettings = {
  mode: 'auto',
  primaryColor: 'blue',
  fontSize: 'medium',
  compactMode: false,
  animationsEnabled: true
};

// ============================================================================
// CONTEXT
// ============================================================================

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Load settings from localStorage
  const [settings, setSettings] = useState<ThemeSettings>(() => {
    const saved = localStorage.getItem('theme_settings');
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  // Determine actual dark mode state (considering 'auto' mode)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (settings.mode === 'dark') return true;
    if (settings.mode === 'light') return false;
    // Auto mode - check system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Listen to system theme changes when in auto mode
  useEffect(() => {
    if (settings.mode !== 'auto') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [settings.mode]);

  // Update isDarkMode when theme mode changes
  useEffect(() => {
    if (settings.mode === 'dark') {
      setIsDarkMode(true);
    } else if (settings.mode === 'light') {
      setIsDarkMode(false);
    } else {
      // Auto mode
      setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }, [settings.mode]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;

    // Apply dark mode class
    if (isDarkMode) {
      root.classList.add('dark-mode');
      root.style.setProperty('--theme-mode', 'dark');
    } else {
      root.classList.remove('dark-mode');
      root.style.setProperty('--theme-mode', 'light');
    }

    // Apply primary color
    root.style.setProperty('--primary-color', settings.primaryColor);

    // Apply font size
    const fontSizeMap = {
      small: '14px',
      medium: '16px',
      large: '18px'
    };
    root.style.setProperty('--base-font-size', fontSizeMap[settings.fontSize]);

    // Apply compact mode
    if (settings.compactMode) {
      root.classList.add('compact-mode');
    } else {
      root.classList.remove('compact-mode');
    }

    // Apply animations
    if (!settings.animationsEnabled) {
      root.classList.add('no-animations');
    } else {
      root.classList.remove('no-animations');
    }
  }, [isDarkMode, settings]);

  // Update theme settings
  const updateTheme = (newSettings: Partial<ThemeSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('theme_settings', JSON.stringify(updated));
  };

  // Reset to default
  const resetTheme = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.setItem('theme_settings', JSON.stringify(DEFAULT_SETTINGS));
  };

  const value: ThemeContextType = {
    settings,
    isDarkMode,
    updateTheme,
    resetTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// ============================================================================
// HOOK
// ============================================================================

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export default ThemeContext;
