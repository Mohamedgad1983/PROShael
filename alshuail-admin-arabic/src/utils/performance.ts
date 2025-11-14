// Performance optimization utilities
import { logger } from './logger';


// Debounce function for search and input handlers
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

// Throttle function for scroll and resize handlers
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

// Virtual scrolling helper for large lists
export interface VirtualScrollOptions {
  items: any[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export function calculateVisibleRange(
  scrollTop: number,
  options: VirtualScrollOptions
) {
  const { items, itemHeight, containerHeight, overscan = 3 } = options;

  const startIndex = Math.max(
    0,
    Math.floor(scrollTop / itemHeight) - overscan
  );

  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  return {
    startIndex,
    endIndex,
    visibleItems: items.slice(startIndex, endIndex + 1),
    offsetY: startIndex * itemHeight,
    totalHeight: items.length * itemHeight
  };
}

// Image lazy loading with intersection observer
export function lazyLoadImages(selector: string = 'img[data-src]') {
  const images = document.querySelectorAll<HTMLImageElement>(selector);

  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          const src = img.dataset.src;

          if (src) {
            img.src = src;
            img.removeAttribute('data-src');
            img.classList.add('loaded');
            observer.unobserve(img);
          }
        }
      });
    }, {
      rootMargin: '50px 0px',
      threshold: 0.01
    });

    images.forEach(img => imageObserver.observe(img));
  } else {
    // Fallback for older browsers
    images.forEach(img => {
      const src = img.dataset.src;
      if (src) {
        img.src = src;
        img.removeAttribute('data-src');
      }
    });
  }
}

// Measure component render performance
export function measurePerformance(componentName: string) {
  const startMark = `${componentName}-start`;
  const endMark = `${componentName}-end`;
  const measureName = `${componentName}-render`;

  return {
    start: () => {
      if (performance.mark) {
        performance.mark(startMark);
      }
    },
    end: () => {
      if (performance.mark && performance.measure) {
        performance.mark(endMark);
        performance.measure(measureName, startMark, endMark);

        const measure = performance.getEntriesByName(measureName)[0];
        if (measure) {
          logger.debug(`${componentName} rendered in ${measure.duration.toFixed(2)}ms`);
        }

        // Clean up marks
        performance.clearMarks(startMark);
        performance.clearMarks(endMark);
        performance.clearMeasures(measureName);
      }
    }
  };
}

// Request idle callback wrapper
export function whenIdle(callback: () => void, timeout: number = 2000) {
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(callback, { timeout });
  } else {
    setTimeout(callback, 0);
  }
}

// Prefetch data for anticipated user actions
export function prefetchData(urls: string[]) {
  if ('IntersectionObserver' in window && 'fetch' in window) {
    urls.forEach(url => {
      whenIdle(() => {
        fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
          }
        }).catch(() => {
          // Silently fail prefetch
        });
      });
    });
  }
}

// Memory management - clean up large objects
export function cleanupMemory(obj: any) {
  if (obj && typeof obj === 'object') {
    Object.keys(obj).forEach(key => {
      delete obj[key];
    });
  }
}

// Register service worker with PWA capabilities
export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      // Register our new PWA service worker
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      logger.debug('🚀 PWA Service Worker registered successfully:', { scope: registration.scope });

      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          logger.debug('🔄 New service worker installing...');

          newWorker.addEventListener('statechange', () => {
            logger.debug('SW state changed:', { state: newWorker.state });

            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              logger.debug('✅ New service worker available');

              // Show update notification to user
              showUpdateNotification();
            }
          });
        }
      });

      // Listen for controlling service worker change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        logger.debug('🔄 Service worker controller changed, reloading...');
        window.location.reload();
      });

      // Check if there's a waiting service worker
      if (registration.waiting) {
        logger.debug('⏳ Service worker waiting to activate');
        showUpdateNotification();
      }

      // Periodic update check (every 30 minutes)
      setInterval(() => {
        registration.update();
      }, 30 * 60 * 1000);

      return registration;
    } catch (error) {
      logger.error('❌ Service Worker registration failed:', { error });
      throw error;
    }
  } else {
    logger.warn('⚠️ Service Workers not supported in this browser');
  }
}

// Show update notification to user
function showUpdateNotification() {
  // Create a toast notification for updates
  const notification = document.createElement('div');
  notification.id = 'sw-update-notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #007AFF 0%, #5856D6 100%);
    color: white;
    padding: 16px 20px;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(10px);
    z-index: 10000;
    max-width: 300px;
    font-family: 'Cairo', sans-serif;
    direction: rtl;
    text-align: center;
    transform: translateX(100%);
    transition: transform 0.3s ease;
  `;

  notification.innerHTML = `
    <div style="margin-bottom: 10px; font-weight: 600;">تحديث متوفر</div>
    <div style="margin-bottom: 15px; font-size: 0.9rem; opacity: 0.9;">
      يوجد تحديث جديد للتطبيق. يرجى إعادة تحميل الصفحة للحصول على أحدث الميزات.
    </div>
    <button id="sw-update-btn" style="
      background: white;
      color: #007AFF;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      margin-left: 10px;
    ">تحديث الآن</button>
    <button id="sw-dismiss-btn" style="
      background: transparent;
      color: white;
      border: 1px solid rgba(255,255,255,0.5);
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
    ">لاحقاً</button>
  `;

  document.body.appendChild(notification);

  // Animate in
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 100);

  // Handle update button click
  const updateBtn = notification.querySelector('#sw-update-btn');
  updateBtn?.addEventListener('click', () => {
    // Tell the waiting service worker to activate
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  });

  // Handle dismiss button click
  const dismissBtn = notification.querySelector('#sw-dismiss-btn');
  dismissBtn?.addEventListener('click', () => {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => notification.remove(), 300);
  });

  // Auto dismiss after 10 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => notification.remove(), 300);
    }
  }, 10000);
}

// Performance monitoring
export function initPerformanceMonitoring() {
  // Monitor Largest Contentful Paint
  if ('PerformanceObserver' in window) {
    try {
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        logger.debug('LCP:', { value: `${lastEntry.renderTime || lastEntry.loadTime}ms` });
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {
      // LCP observer not supported
    }

    // Monitor First Input Delay
    try {
      const fidObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach(entry => {
          // Type assertion for first-input entries
          const fidEntry = entry as any;
          if (fidEntry.processingStart) {
            const delay = fidEntry.processingStart - fidEntry.startTime;
            logger.debug('FID:', { delay: `${delay}ms` });
          }
        });
      });
      fidObserver.observe({ type: 'first-input', buffered: true });
    } catch (e) {
      // FID observer not supported
    }
  }

  // Monitor memory usage (if available)
  if ('memory' in performance) {
    setInterval(() => {
      const memInfo = (performance as any).memory;
      const usedMB = (memInfo.usedJSHeapSize / 1048576).toFixed(2);
      const totalMB = (memInfo.totalJSHeapSize / 1048576).toFixed(2);

      if (parseFloat(usedMB) > parseFloat(totalMB) * 0.9) {
        logger.warn(`High memory usage: ${usedMB}MB / ${totalMB}MB`);
      }
    }, 30000); // Check every 30 seconds
  }
}

export default {
  debounce,
  throttle,
  calculateVisibleRange,
  lazyLoadImages,
  measurePerformance,
  whenIdle,
  prefetchData,
  cleanupMemory,
  registerServiceWorker,
  initPerformanceMonitoring
};