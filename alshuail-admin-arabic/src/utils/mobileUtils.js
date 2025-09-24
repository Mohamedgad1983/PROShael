/**
 * Mobile Utilities for Al-Shuail PWA
 * Provides mobile-specific functionality and optimizations
 */

// Device Detection
export const DeviceDetection = {
  // Check if device is mobile
  isMobile: () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  },

  // Check if device is iOS
  isIOS: () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  },

  // Check if device is Android
  isAndroid: () => {
    return /Android/i.test(navigator.userAgent);
  },

  // Check if device is in standalone mode (PWA)
  isStandalone: () => {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  },

  // Get device orientation
  getOrientation: () => {
    if (window.screen.orientation) {
      return window.screen.orientation.angle;
    }
    return window.orientation || 0;
  },

  // Check if device supports touch
  isTouchDevice: () => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }
};

// Safe Area Utilities
export const SafeArea = {
  // Get safe area insets
  getInsets: () => {
    const style = getComputedStyle(document.documentElement);
    return {
      top: parseInt(style.getPropertyValue('--safe-area-top') || '0'),
      bottom: parseInt(style.getPropertyValue('--safe-area-bottom') || '0'),
      left: parseInt(style.getPropertyValue('--safe-area-left') || '0'),
      right: parseInt(style.getPropertyValue('--safe-area-right') || '0')
    };
  },

  // Apply safe area padding to element
  applySafeArea: (element, sides = ['top', 'bottom', 'left', 'right']) => {
    const insets = SafeArea.getInsets();
    sides.forEach(side => {
      if (insets[side] > 0) {
        element.style[`padding${side.charAt(0).toUpperCase() + side.slice(1)}`] = `${insets[side]}px`;
      }
    });
  }
};

// Viewport Utilities
export const ViewportUtils = {
  // Get viewport dimensions
  getDimensions: () => {
    return {
      width: Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0),
      height: Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
    };
  },

  // Check if viewport is mobile size
  isMobileViewport: () => {
    const { width } = ViewportUtils.getDimensions();
    return width <= 768;
  },

  // Get breakpoint name
  getBreakpoint: () => {
    const { width } = ViewportUtils.getDimensions();
    if (width <= 374) return 'xs';
    if (width <= 428) return 'sm';
    if (width <= 768) return 'md';
    if (width <= 1024) return 'lg';
    return 'xl';
  },

  // Listen for viewport changes
  onResize: (callback) => {
    let timeoutId;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        callback(ViewportUtils.getDimensions());
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }
};

// Touch Utilities
export const TouchUtils = {
  // Prevent zoom on double tap
  preventZoom: () => {
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (event) => {
      const now = new Date().getTime();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    }, false);
  },

  // Add touch feedback to elements
  addTouchFeedback: (element) => {
    element.addEventListener('touchstart', () => {
      element.style.transform = 'scale(0.95)';
      element.style.opacity = '0.8';
    });

    element.addEventListener('touchend', () => {
      element.style.transform = 'scale(1)';
      element.style.opacity = '1';
    });

    element.addEventListener('touchcancel', () => {
      element.style.transform = 'scale(1)';
      element.style.opacity = '1';
    });
  },

  // Handle swipe gestures
  addSwipeListener: (element, callbacks) => {
    let startX, startY, startTime;

    element.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      startTime = Date.now();
    });

    element.addEventListener('touchend', (e) => {
      if (!startX || !startY) return;

      const touch = e.changedTouches[0];
      const endX = touch.clientX;
      const endY = touch.clientY;
      const endTime = Date.now();

      const deltaX = endX - startX;
      const deltaY = endY - startY;
      const deltaTime = endTime - startTime;

      // Minimum swipe distance and maximum time
      const minDistance = 50;
      const maxTime = 300;

      if (deltaTime > maxTime) return;

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (Math.abs(deltaX) > minDistance) {
          if (deltaX > 0) {
            callbacks.onSwipeRight && callbacks.onSwipeRight();
          } else {
            callbacks.onSwipeLeft && callbacks.onSwipeLeft();
          }
        }
      } else {
        // Vertical swipe
        if (Math.abs(deltaY) > minDistance) {
          if (deltaY > 0) {
            callbacks.onSwipeDown && callbacks.onSwipeDown();
          } else {
            callbacks.onSwipeUp && callbacks.onSwipeUp();
          }
        }
      }

      startX = startY = null;
    });
  }
};

// Haptic Feedback
export const HapticFeedback = {
  // Light haptic feedback
  light: () => {
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  },

  // Medium haptic feedback
  medium: () => {
    if (navigator.vibrate) {
      navigator.vibrate(20);
    }
  },

  // Heavy haptic feedback
  heavy: () => {
    if (navigator.vibrate) {
      navigator.vibrate([30, 10, 30]);
    }
  },

  // Success feedback
  success: () => {
    if (navigator.vibrate) {
      navigator.vibrate([10, 10, 10]);
    }
  },

  // Error feedback
  error: () => {
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  }
};

// Status Bar Utilities (for PWA)
export const StatusBar = {
  // Set status bar style
  setStyle: (style = 'default') => {
    const metaTag = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (metaTag) {
      metaTag.setAttribute('content', style);
    } else {
      const newMetaTag = document.createElement('meta');
      newMetaTag.name = 'apple-mobile-web-app-status-bar-style';
      newMetaTag.content = style;
      document.head.appendChild(newMetaTag);
    }
  },

  // Hide status bar
  hide: () => {
    StatusBar.setStyle('black-translucent');
  },

  // Show status bar
  show: () => {
    StatusBar.setStyle('default');
  }
};

// Performance Utilities
export const PerformanceUtils = {
  // Optimize images for mobile
  optimizeImage: (img, maxWidth = 400) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
    canvas.width = img.width * ratio;
    canvas.height = img.height * ratio;

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8);
  },

  // Debounce function for performance
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Throttle function for performance
  throttle: (func, limit) => {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
};

// Network Utilities
export const NetworkUtils = {
  // Check if online
  isOnline: () => navigator.onLine,

  // Get connection info
  getConnectionInfo: () => {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      };
    }
    return null;
  },

  // Check if slow connection
  isSlowConnection: () => {
    const connection = NetworkUtils.getConnectionInfo();
    if (connection) {
      return connection.effectiveType === 'slow-2g' ||
             connection.effectiveType === '2g' ||
             connection.saveData;
    }
    return false;
  },

  // Listen for network changes
  onNetworkChange: (callback) => {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }
};

// Storage Utilities
export const StorageUtils = {
  // Check storage quota
  getStorageEstimate: async () => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      return await navigator.storage.estimate();
    }
    return null;
  },

  // Persistent storage
  requestPersistentStorage: async () => {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      return await navigator.storage.persist();
    }
    return false;
  },

  // Clear cache
  clearCache: async () => {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    }
  }
};

// PWA Install Utilities
export const PWAUtils = {
  // Check if PWA is installable
  isInstallable: () => {
    return 'beforeinstallprompt' in window;
  },

  // Show install prompt
  showInstallPrompt: (promptEvent) => {
    if (promptEvent) {
      promptEvent.prompt();
      return promptEvent.userChoice;
    }
    return Promise.resolve({ outcome: 'dismissed' });
  },

  // Check if installed
  isInstalled: () => {
    return DeviceDetection.isStandalone();
  }
};

// Accessibility Utilities
export const A11yUtils = {
  // Check if user prefers reduced motion
  prefersReducedMotion: () => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  // Check if user prefers high contrast
  prefersHighContrast: () => {
    return window.matchMedia('(prefers-contrast: high)').matches;
  },

  // Check if user prefers dark mode
  prefersDarkMode: () => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  },

  // Add screen reader text
  addScreenReaderText: (element, text) => {
    const srText = document.createElement('span');
    srText.className = 'sr-only';
    srText.textContent = text;
    element.appendChild(srText);
  }
};

// RTL Utilities
export const RTLUtils = {
  // Check if document is RTL
  isRTL: () => {
    return document.documentElement.dir === 'rtl' ||
           document.body.dir === 'rtl' ||
           getComputedStyle(document.documentElement).direction === 'rtl';
  },

  // Set RTL direction
  setRTL: (element = document.documentElement) => {
    element.dir = 'rtl';
    element.style.direction = 'rtl';
  },

  // Set LTR direction
  setLTR: (element = document.documentElement) => {
    element.dir = 'ltr';
    element.style.direction = 'ltr';
  },

  // Get logical property value based on direction
  getLogicalProperty: (rtlValue, ltrValue) => {
    return RTLUtils.isRTL() ? rtlValue : ltrValue;
  }
};

// Initialize mobile optimizations
export const initializeMobileOptimizations = () => {
  // Prevent zoom on form inputs (iOS)
  if (DeviceDetection.isIOS()) {
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
    document.head.appendChild(meta);
  }

  // Set appropriate status bar style
  if (DeviceDetection.isIOS()) {
    StatusBar.setStyle('black-translucent');
  }

  // Prevent zoom on double tap
  TouchUtils.preventZoom();

  // Add touch feedback to buttons
  document.querySelectorAll('.btn, .touch-target').forEach(TouchUtils.addTouchFeedback);

  // Request persistent storage
  PWAUtils.isInstallable() && StorageUtils.requestPersistentStorage();

  // Set CSS custom properties for JS access
  const root = document.documentElement;
  root.style.setProperty('--is-mobile', DeviceDetection.isMobile() ? '1' : '0');
  root.style.setProperty('--is-ios', DeviceDetection.isIOS() ? '1' : '0');
  root.style.setProperty('--is-android', DeviceDetection.isAndroid() ? '1' : '0');
  root.style.setProperty('--is-standalone', DeviceDetection.isStandalone() ? '1' : '0');
};

// Export all utilities as default
export default {
  DeviceDetection,
  SafeArea,
  ViewportUtils,
  TouchUtils,
  HapticFeedback,
  StatusBar,
  PerformanceUtils,
  NetworkUtils,
  StorageUtils,
  PWAUtils,
  A11yUtils,
  RTLUtils,
  initializeMobileOptimizations
};