/**
 * Mobile responsiveness utilities and breakpoint helpers
 */

import React, { useState, useEffect } from 'react';

// Breakpoint definitions (matching TailwindCSS v4)
export const BREAKPOINTS = {
  xs: 475,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * Get current breakpoint based on window width
 */
export const getCurrentBreakpoint = (): Breakpoint => {
  if (typeof window === 'undefined') return 'lg';

  const width = window.innerWidth;

  if (width < BREAKPOINTS.xs) return 'xs';
  if (width < BREAKPOINTS.sm) return 'sm';
  if (width < BREAKPOINTS.md) return 'md';
  if (width < BREAKPOINTS.lg) return 'lg';
  if (width < BREAKPOINTS.xl) return 'xl';
  return '2xl';
};

/**
 * Check if current viewport is mobile
 */
export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < BREAKPOINTS.md;
};

/**
 * Check if current viewport is tablet
 */
export const isTablet = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= BREAKPOINTS.md && window.innerWidth < BREAKPOINTS.lg;
};

/**
 * Check if current viewport is desktop
 */
export const isDesktop = (): boolean => {
  if (typeof window === 'undefined') return true;
  return window.innerWidth >= BREAKPOINTS.lg;
};

/**
 * Hook for responsive behavior
 */
export const useResponsive = () => {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(getCurrentBreakpoint());

  useEffect(() => {
    const handleResize = () => {
      setBreakpoint(getCurrentBreakpoint());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    breakpoint,
    isMobile: breakpoint === 'xs' || breakpoint === 'sm',
    isTablet: breakpoint === 'md',
    isDesktop: breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === '2xl',
    width: typeof window !== 'undefined' ? window.innerWidth : 1024
  };
};

/**
 * Touch-friendly button styles
 */
export const getTouchStyles = (isMobile: boolean): React.CSSProperties => ({
  minHeight: isMobile ? '44px' : 'auto',
  minWidth: isMobile ? '44px' : 'auto',
  padding: isMobile ? '12px 16px' : '8px 12px',
  fontSize: isMobile ? '16px' : '14px',
  // Prevent zoom on iOS
  WebkitTapHighlightColor: 'transparent',
  touchAction: 'manipulation'
});

/**
 * Mobile-optimized modal styles
 */
export const getMobileModalStyles = (isMobile: boolean): React.CSSProperties => ({
  position: 'fixed' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 1000,
  display: 'flex',
  alignItems: isMobile ? 'flex-end' : 'center',
  justifyContent: 'center',
  padding: isMobile ? '0' : '20px',
  background: 'rgba(0, 0, 0, 0.5)',
  backdropFilter: 'blur(4px)'
});

/**
 * Mobile-optimized modal content styles
 */
export const getMobileModalContentStyles = (isMobile: boolean): React.CSSProperties => ({
  background: 'white',
  borderRadius: isMobile ? '20px 20px 0 0' : '16px',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  maxHeight: isMobile ? '90vh' : '80vh',
  width: isMobile ? '100%' : 'auto',
  maxWidth: isMobile ? '100%' : '500px',
  overflow: 'hidden',
  animation: isMobile ? 'slideUp 0.3s ease-out' : 'scaleIn 0.2s ease-out'
});

/**
 * Grid layout styles for different breakpoints
 */
export const getResponsiveGridStyles = (
  breakpoint: Breakpoint,
  columns: { xs?: number; sm?: number; md?: number; lg?: number; xl?: number }
): React.CSSProperties => {
  const getColumnCount = () => {
    switch (breakpoint) {
      case 'xs':
        return columns.xs || 1;
      case 'sm':
        return columns.sm || columns.xs || 1;
      case 'md':
        return columns.md || columns.sm || columns.xs || 2;
      case 'lg':
        return columns.lg || columns.md || columns.sm || 3;
      case 'xl':
      case '2xl':
        return columns.xl || columns.lg || columns.md || 4;
      default:
        return 1;
    }
  };

  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${getColumnCount()}, 1fr)`,
    gap: breakpoint === 'xs' || breakpoint === 'sm' ? '12px' : '16px'
  };
};

/**
 * Responsive padding/margin utilities
 */
export const getResponsiveSpacing = (
  breakpoint: Breakpoint,
  spacing: { xs?: string; sm?: string; md?: string; lg?: string }
): string => {
  switch (breakpoint) {
    case 'xs':
      return spacing.xs || '12px';
    case 'sm':
      return spacing.sm || spacing.xs || '16px';
    case 'md':
      return spacing.md || spacing.sm || '20px';
    case 'lg':
    case 'xl':
    case '2xl':
      return spacing.lg || spacing.md || '24px';
    default:
      return '16px';
  }
};

/**
 * Responsive font sizes
 */
export const getResponsiveFontSize = (
  breakpoint: Breakpoint,
  sizes: { xs?: string; sm?: string; md?: string; lg?: string }
): string => {
  switch (breakpoint) {
    case 'xs':
      return sizes.xs || '14px';
    case 'sm':
      return sizes.sm || sizes.xs || '16px';
    case 'md':
      return sizes.md || sizes.sm || '18px';
    case 'lg':
    case 'xl':
    case '2xl':
      return sizes.lg || sizes.md || '20px';
    default:
      return '16px';
  }
};

/**
 * Swipe gesture detection
 */
export interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

export const useSwipeGestures = (handlers: SwipeHandlers, threshold: number = 50) => {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;

    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    if (absDeltaX > threshold || absDeltaY > threshold) {
      if (absDeltaX > absDeltaY) {
        // Horizontal swipe
        if (deltaX > 0) {
          handlers.onSwipeRight?.();
        } else {
          handlers.onSwipeLeft?.();
        }
      } else {
        // Vertical swipe
        if (deltaY > 0) {
          handlers.onSwipeDown?.();
        } else {
          handlers.onSwipeUp?.();
        }
      }
    }

    setTouchStart(null);
  };

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd
  };
};

/**
 * Safe area padding for mobile devices
 */
export const getSafeAreaPadding = (): React.CSSProperties => ({
  paddingTop: 'env(safe-area-inset-top)',
  paddingBottom: 'env(safe-area-inset-bottom)',
  paddingLeft: 'env(safe-area-inset-left)',
  paddingRight: 'env(safe-area-inset-right)'
});

/**
 * Responsive table styles
 */
export const getResponsiveTableStyles = (isMobile: boolean): React.CSSProperties => {
  if (isMobile) {
    return {
      display: 'block',
      overflow: 'auto',
      whiteSpace: 'nowrap',
      WebkitOverflowScrolling: 'touch',
      scrollbarWidth: 'thin',
      scrollbarColor: '#cbd5e0 transparent'
    };
  }

  return {
    display: 'table',
    width: '100%'
  };
};

/**
 * Mobile card view for tables
 */
export const getMobileCardStyles = (): React.CSSProperties => ({
  display: 'block',
  background: 'white',
  borderRadius: '12px',
  padding: '16px',
  marginBottom: '12px',
  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  border: '1px solid rgba(0, 0, 0, 0.1)'
});

/**
 * Responsive image styles
 */
export const getResponsiveImageStyles = (
  breakpoint: Breakpoint,
  aspectRatio: string = '16/9'
): React.CSSProperties => ({
  width: '100%',
  height: 'auto',
  aspectRatio,
  objectFit: 'cover' as const,
  borderRadius: breakpoint === 'xs' || breakpoint === 'sm' ? '8px' : '12px'
});

/**
 * Loading skeleton styles
 */
export const getSkeletonStyles = (
  width: string = '100%',
  height: string = '20px'
): React.CSSProperties => ({
  width,
  height,
  background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
  backgroundSize: '200% 100%',
  animation: 'skeleton-loading 1.5s infinite',
  borderRadius: '4px'
});

// Add CSS animations to the document
export const injectResponsiveAnimations = () => {
  if (typeof document === 'undefined') return;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideUp {
      from {
        transform: translateY(100%);
      }
      to {
        transform: translateY(0);
      }
    }

    @keyframes scaleIn {
      from {
        transform: scale(0.9);
        opacity: 0;
      }
      to {
        transform: scale(1);
        opacity: 1;
      }
    }

    @keyframes skeleton-loading {
      0% {
        background-position: 200% 0;
      }
      100% {
        background-position: -200% 0;
      }
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }

    @keyframes bounce {
      0%, 20%, 53%, 80%, 100% {
        transform: translate3d(0, 0, 0);
      }
      40%, 43% {
        transform: translate3d(0, -8px, 0);
      }
      70% {
        transform: translate3d(0, -4px, 0);
      }
      90% {
        transform: translate3d(0, -2px, 0);
      }
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes slideInRight {
      from {
        transform: translateX(100%);
      }
      to {
        transform: translateX(0);
      }
    }

    @keyframes slideInLeft {
      from {
        transform: translateX(-100%);
      }
      to {
        transform: translateX(0);
      }
    }
  `;

  document.head.appendChild(style);
};

// React hooks imported at the top