/**
 * useMobile Hook for Al-Shuail PWA
 * React hook for mobile-specific functionality and responsive behavior
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  DeviceDetection,
  ViewportUtils,
  NetworkUtils,
  SafeArea,
  PWAUtils,
  TouchUtils,
  HapticFeedback
} from '../utils/mobileUtils';

// Hook for device detection
export const useDeviceDetection = () => {
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: DeviceDetection.isMobile(),
    isIOS: DeviceDetection.isIOS(),
    isAndroid: DeviceDetection.isAndroid(),
    isStandalone: DeviceDetection.isStandalone(),
    isTouchDevice: DeviceDetection.isTouchDevice()
  });

  useEffect(() => {
    // Re-check on mount and orientation change
    const checkDevice = () => {
      setDeviceInfo({
        isMobile: DeviceDetection.isMobile(),
        isIOS: DeviceDetection.isIOS(),
        isAndroid: DeviceDetection.isAndroid(),
        isStandalone: DeviceDetection.isStandalone(),
        isTouchDevice: DeviceDetection.isTouchDevice()
      });
    };

    window.addEventListener('orientationchange', checkDevice);
    return () => window.removeEventListener('orientationchange', checkDevice);
  }, []);

  return deviceInfo;
};

// Hook for viewport and breakpoint management
export const useViewport = () => {
  const [viewport, setViewport] = useState({
    width: 0,
    height: 0,
    breakpoint: 'sm',
    isMobile: true
  });

  useEffect(() => {
    const updateViewport = () => {
      const dimensions = ViewportUtils.getDimensions();
      const breakpoint = ViewportUtils.getBreakpoint();

      setViewport({
        width: dimensions.width,
        height: dimensions.height,
        breakpoint,
        isMobile: ViewportUtils.isMobileViewport()
      });
    };

    updateViewport();
    const cleanup = ViewportUtils.onResize(updateViewport);

    return cleanup;
  }, []);

  return viewport;
};

// Hook for safe area management
export const useSafeArea = () => {
  const [safeArea, setSafeArea] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0
  });

  useEffect(() => {
    const updateSafeArea = () => {
      setSafeArea(SafeArea.getInsets());
    };

    updateSafeArea();

    // Listen for orientation changes that might affect safe area
    window.addEventListener('orientationchange', updateSafeArea);
    window.addEventListener('resize', updateSafeArea);

    return () => {
      window.removeEventListener('orientationchange', updateSafeArea);
      window.removeEventListener('resize', updateSafeArea);
    };
  }, []);

  const applySafeArea = useCallback((sides = ['top', 'bottom']) => {
    const style = {};
    sides.forEach(side => {
      if (safeArea[side] > 0) {
        style[`padding${side.charAt(0).toUpperCase() + side.slice(1)}`] = `${safeArea[side]}px`;
      }
    });
    return style;
  }, [safeArea]);

  return { safeArea, applySafeArea };
};

// Hook for network status
export const useNetworkStatus = () => {
  const [networkStatus, setNetworkStatus] = useState({
    isOnline: NetworkUtils.isOnline(),
    isSlowConnection: NetworkUtils.isSlowConnection(),
    connectionInfo: NetworkUtils.getConnectionInfo()
  });

  useEffect(() => {
    const updateNetworkStatus = (online) => {
      setNetworkStatus({
        isOnline: online,
        isSlowConnection: NetworkUtils.isSlowConnection(),
        connectionInfo: NetworkUtils.getConnectionInfo()
      });
    };

    const cleanup = NetworkUtils.onNetworkChange(updateNetworkStatus);

    // Update connection info periodically
    const interval = setInterval(() => {
      setNetworkStatus(prev => ({
        ...prev,
        isSlowConnection: NetworkUtils.isSlowConnection(),
        connectionInfo: NetworkUtils.getConnectionInfo()
      }));
    }, 30000); // Every 30 seconds

    return () => {
      cleanup();
      clearInterval(interval);
    };
  }, []);

  return networkStatus;
};

// Hook for PWA installation
export const usePWAInstall = () => {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(PWAUtils.isInstalled());

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      setIsInstallable(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (installPrompt) {
      const result = await PWAUtils.showInstallPrompt(installPrompt);
      setInstallPrompt(null);
      setIsInstallable(false);
      return result;
    }
    return { outcome: 'dismissed' };
  }, [installPrompt]);

  return {
    isInstallable,
    isInstalled,
    promptInstall
  };
};

// Hook for touch gestures
export const useSwipeGesture = (callbacks = {}) => {
  const elementRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    TouchUtils.addSwipeListener(element, callbacks);
  }, [callbacks]);

  return elementRef;
};

// Hook for haptic feedback
export const useHapticFeedback = () => {
  const { isIOS, isAndroid } = useDeviceDetection();
  const canVibrate = navigator.vibrate && (isIOS || isAndroid);

  const feedback = useCallback((type = 'light') => {
    if (!canVibrate) return;

    switch (type) {
      case 'light':
        HapticFeedback.light();
        break;
      case 'medium':
        HapticFeedback.medium();
        break;
      case 'heavy':
        HapticFeedback.heavy();
        break;
      case 'success':
        HapticFeedback.success();
        break;
      case 'error':
        HapticFeedback.error();
        break;
      default:
        HapticFeedback.light();
    }
  }, [canVibrate]);

  return { feedback, canVibrate };
};

// Hook for responsive classes
export const useResponsiveClasses = (baseClasses = '', responsiveClasses = {}) => {
  const { breakpoint } = useViewport();

  const classes = useCallback(() => {
    let result = baseClasses;

    // Add breakpoint-specific classes
    Object.entries(responsiveClasses).forEach(([bp, cls]) => {
      if (breakpoint === bp ||
          (bp === 'mobile' && ['xs', 'sm'].includes(breakpoint)) ||
          (bp === 'tablet' && ['md'].includes(breakpoint)) ||
          (bp === 'desktop' && ['lg', 'xl'].includes(breakpoint))) {
        result += ` ${cls}`;
      }
    });

    return result.trim();
  }, [baseClasses, responsiveClasses, breakpoint]);

  return classes();
};

// Hook for orientation
export const useOrientation = () => {
  const [orientation, setOrientation] = useState({
    angle: DeviceDetection.getOrientation(),
    isPortrait: Math.abs(DeviceDetection.getOrientation()) !== 90,
    isLandscape: Math.abs(DeviceDetection.getOrientation()) === 90
  });

  useEffect(() => {
    const handleOrientationChange = () => {
      const angle = DeviceDetection.getOrientation();
      setOrientation({
        angle,
        isPortrait: Math.abs(angle) !== 90,
        isLandscape: Math.abs(angle) === 90
      });
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, []);

  return orientation;
};

// Hook for bottom sheet management
export const useBottomSheet = (initialOpen = false) => {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const { feedback } = useHapticFeedback();
  const containerRef = useRef(null);

  const open = useCallback(() => {
    setIsOpen(true);
    feedback('light');
    // Prevent body scroll when sheet is open
    document.body.style.overflow = 'hidden';
  }, [feedback]);

  const close = useCallback(() => {
    setIsOpen(false);
    feedback('light');
    // Restore body scroll
    document.body.style.overflow = '';
  }, [feedback]);

  const toggle = useCallback(() => {
    isOpen ? close() : open();
  }, [isOpen, open, close]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        close();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, close]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return {
    isOpen,
    open,
    close,
    toggle,
    containerRef
  };
};

// Hook for pull-to-refresh
export const usePullToRefresh = (onRefresh, threshold = 50) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef(null);
  const startY = useRef(0);
  const { feedback } = useHapticFeedback();

  const handleTouchStart = useCallback((e) => {
    startY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e) => {
    const currentY = e.touches[0].clientY;
    const container = containerRef.current;

    if (!container || container.scrollTop > 0) return;

    const distance = currentY - startY.current;
    if (distance > 0) {
      e.preventDefault();
      setPullDistance(Math.min(distance, threshold * 2));
    }
  }, [threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      feedback('medium');

      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
  }, [pullDistance, threshold, isRefreshing, onRefresh, feedback]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    containerRef,
    isRefreshing,
    pullDistance,
    pullProgress: Math.min(pullDistance / threshold, 1)
  };
};

// Main mobile hook that combines multiple utilities
export const useMobile = () => {
  const device = useDeviceDetection();
  const viewport = useViewport();
  const { safeArea, applySafeArea } = useSafeArea();
  const network = useNetworkStatus();
  const pwa = usePWAInstall();
  const orientation = useOrientation();
  const { feedback } = useHapticFeedback();

  return {
    device,
    viewport,
    safeArea,
    applySafeArea,
    network,
    pwa,
    orientation,
    haptic: { feedback }
  };
};

// Export all hooks
export default {
  useDeviceDetection,
  useViewport,
  useSafeArea,
  useNetworkStatus,
  usePWAInstall,
  useSwipeGesture,
  useHapticFeedback,
  useResponsiveClasses,
  useOrientation,
  useBottomSheet,
  usePullToRefresh,
  useMobile
};