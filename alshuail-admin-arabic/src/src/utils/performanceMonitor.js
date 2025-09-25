/**
 * Performance Monitor - Core Web Vitals tracking and optimization
 * Features: LCP, FID, CLS tracking, API monitoring, error tracking, mobile optimization
 */

import React from 'react';

// Performance metrics collection
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      lcp: null,
      fid: null,
      cls: null,
      ttfb: null,
      fcp: null,
      loadTime: null,
      apiCalls: [],
      errors: [],
      networkInfo: null,
      deviceInfo: null
    };

    this.observers = new Map();
    this.startTime = performance.now();
    this.initialized = false;

    // Initialize monitoring
    this.init();
  }

  // Initialize performance monitoring
  init() {
    if (this.initialized) return;

    try {
      // Monitor Core Web Vitals
      this.observeLCP();
      this.observeFID();
      this.observeCLS();
      this.observeTTFB();
      this.observeFCP();

      // Monitor load performance
      this.monitorLoadTime();

      // Monitor network and device info
      this.collectDeviceInfo();
      this.collectNetworkInfo();

      // Monitor API calls
      this.interceptFetch();

      // Monitor errors
      this.monitorErrors();

      // Monitor memory usage (mobile specific)
      this.monitorMemory();

      // Monitor long tasks
      this.observeLongTasks();

      this.initialized = true;
      console.log('🚀 Performance monitoring initialized');
    } catch (error) {
      console.warn('Performance monitoring failed to initialize:', error);
    }
  }

  // Largest Contentful Paint (LCP) - should be under 2.5s
  observeLCP() {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];

        this.metrics.lcp = {
          value: lastEntry.startTime,
          rating: this.getRating(lastEntry.startTime, [2500, 4000]), // Good < 2.5s, Poor > 4s
          element: lastEntry.element?.tagName || 'unknown',
          url: lastEntry.url || window.location.href,
          timestamp: Date.now()
        };

        this.logMetric('LCP', this.metrics.lcp);
      });

      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.set('lcp', observer);
    } catch (error) {
      console.warn('LCP observation failed:', error);
    }
  }

  // First Input Delay (FID) - should be under 100ms
  observeFID() {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.metrics.fid = {
            value: entry.processingStart - entry.startTime,
            rating: this.getRating(entry.processingStart - entry.startTime, [100, 300]),
            inputType: entry.name,
            timestamp: Date.now()
          };

          this.logMetric('FID', this.metrics.fid);
        });
      });

      observer.observe({ entryTypes: ['first-input'] });
      this.observers.set('fid', observer);
    } catch (error) {
      console.warn('FID observation failed:', error);
    }
  }

  // Cumulative Layout Shift (CLS) - should be under 0.1
  observeCLS() {
    if (!('PerformanceObserver' in window)) return;

    try {
      let clsValue = 0;
      let sessionValue = 0;
      let sessionEntries = [];

      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();

        entries.forEach((entry) => {
          if (!entry.hadRecentInput) {
            const firstSessionEntry = sessionEntries[0];
            const lastSessionEntry = sessionEntries[sessionEntries.length - 1];

            if (sessionValue &&
                entry.startTime - lastSessionEntry.startTime < 1000 &&
                entry.startTime - firstSessionEntry.startTime < 5000) {
              sessionValue += entry.value;
              sessionEntries.push(entry);
            } else {
              sessionValue = entry.value;
              sessionEntries = [entry];
            }

            if (sessionValue > clsValue) {
              clsValue = sessionValue;

              this.metrics.cls = {
                value: clsValue,
                rating: this.getRating(clsValue, [0.1, 0.25]), // Good < 0.1, Poor > 0.25
                entries: sessionEntries.length,
                timestamp: Date.now()
              };

              this.logMetric('CLS', this.metrics.cls);
            }
          }
        });
      });

      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.set('cls', observer);
    } catch (error) {
      console.warn('CLS observation failed:', error);
    }
  }

  // Time to First Byte (TTFB) - should be under 800ms
  observeTTFB() {
    try {
      if ('navigation' in performance && performance.navigation.type !== undefined) {
        const navEntry = performance.getEntriesByType('navigation')[0];
        if (navEntry) {
          const ttfb = navEntry.responseStart - navEntry.fetchStart;

          this.metrics.ttfb = {
            value: ttfb,
            rating: this.getRating(ttfb, [800, 1800]), // Good < 800ms, Poor > 1.8s
            timestamp: Date.now()
          };

          this.logMetric('TTFB', this.metrics.ttfb);
        }
      }
    } catch (error) {
      console.warn('TTFB measurement failed:', error);
    }
  }

  // First Contentful Paint (FCP) - should be under 1.8s
  observeFCP() {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            this.metrics.fcp = {
              value: entry.startTime,
              rating: this.getRating(entry.startTime, [1800, 3000]), // Good < 1.8s, Poor > 3s
              timestamp: Date.now()
            };

            this.logMetric('FCP', this.metrics.fcp);
          }
        });
      });

      observer.observe({ entryTypes: ['paint'] });
      this.observers.set('fcp', observer);
    } catch (error) {
      console.warn('FCP observation failed:', error);
    }
  }

  // Monitor page load time
  monitorLoadTime() {
    if (document.readyState === 'complete') {
      this.calculateLoadTime();
    } else {
      window.addEventListener('load', () => {
        this.calculateLoadTime();
      });
    }
  }

  calculateLoadTime() {
    const loadTime = performance.now() - this.startTime;

    this.metrics.loadTime = {
      value: loadTime,
      rating: this.getRating(loadTime, [3000, 5000]), // Good < 3s, Poor > 5s
      timestamp: Date.now()
    };

    this.logMetric('Load Time', this.metrics.loadTime);
  }

  // Monitor long tasks that block the main thread
  observeLongTasks() {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.duration > 50) { // Tasks longer than 50ms
            console.warn(`Long task detected: ${entry.duration.toFixed(2)}ms`, {
              name: entry.name,
              startTime: entry.startTime,
              duration: entry.duration
            });

            this.trackEvent('long-task', {
              duration: entry.duration,
              name: entry.name,
              startTime: entry.startTime
            });
          }
        });
      });

      observer.observe({ entryTypes: ['longtask'] });
      this.observers.set('longtask', observer);
    } catch (error) {
      console.warn('Long task observation failed:', error);
    }
  }

  // Collect device information
  collectDeviceInfo() {
    this.metrics.deviceInfo = {
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        colorDepth: window.screen.colorDepth
      },
      devicePixelRatio: window.devicePixelRatio,
      hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
      maxTouchPoints: navigator.maxTouchPoints || 0,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      language: navigator.language,
      languages: navigator.languages,
      isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    };
  }

  // Collect network information
  collectNetworkInfo() {
    if ('connection' in navigator) {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

      this.metrics.networkInfo = {
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 'unknown',
        rtt: connection.rtt || 'unknown',
        saveData: connection.saveData || false,
        type: connection.type || 'unknown'
      };

      // Monitor network changes
      connection.addEventListener('change', () => {
        this.collectNetworkInfo();
        this.trackEvent('network-change', this.metrics.networkInfo);
      });
    }
  }

  // Monitor memory usage (especially important for mobile)
  monitorMemory() {
    if ('memory' in performance) {
      const memoryInfo = performance.memory;

      const memoryMetrics = {
        usedJSHeapSize: memoryInfo.usedJSHeapSize,
        totalJSHeapSize: memoryInfo.totalJSHeapSize,
        jsHeapSizeLimit: memoryInfo.jsHeapSizeLimit,
        usagePercentage: (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit * 100).toFixed(2)
      };

      this.trackEvent('memory-usage', memoryMetrics);

      // Warn if memory usage is high (>80%)
      if (memoryMetrics.usagePercentage > 80) {
        console.warn('High memory usage detected:', memoryMetrics);
      }

      // Monitor memory every 30 seconds
      setInterval(() => {
        this.monitorMemory();
      }, 30000);
    }
  }

  // Intercept fetch API calls to monitor API performance
  interceptFetch() {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const startTime = performance.now();
      const url = args[0];

      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        const duration = endTime - startTime;

        const apiCall = {
          url: url.toString(),
          method: args[1]?.method || 'GET',
          status: response.status,
          duration: duration,
          success: response.ok,
          timestamp: Date.now(),
          size: response.headers.get('content-length') || 'unknown'
        };

        this.metrics.apiCalls.push(apiCall);

        // Keep only last 50 API calls
        if (this.metrics.apiCalls.length > 50) {
          this.metrics.apiCalls = this.metrics.apiCalls.slice(-50);
        }

        // Log slow API calls
        if (duration > 2000) {
          console.warn(`Slow API call: ${url} took ${duration.toFixed(2)}ms`);
        }

        this.trackEvent('api-call', apiCall);

        return response;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;

        const apiError = {
          url: url.toString(),
          method: args[1]?.method || 'GET',
          duration: duration,
          success: false,
          error: error.message,
          timestamp: Date.now()
        };

        this.metrics.apiCalls.push(apiError);
        this.trackEvent('api-error', apiError);

        throw error;
      }
    };
  }

  // Monitor JavaScript errors
  monitorErrors() {
    window.addEventListener('error', (event) => {
      const error = {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        timestamp: Date.now(),
        type: 'javascript'
      };

      this.metrics.errors.push(error);
      this.trackEvent('error', error);

      console.error('JavaScript error tracked:', error);
    });

    window.addEventListener('unhandledrejection', (event) => {
      const error = {
        message: event.reason?.message || 'Unhandled promise rejection',
        stack: event.reason?.stack,
        timestamp: Date.now(),
        type: 'promise'
      };

      this.metrics.errors.push(error);
      this.trackEvent('promise-error', error);

      console.error('Promise rejection tracked:', error);
    });
  }

  // Rate metrics as good, needs improvement, or poor
  getRating(value, thresholds) {
    if (value <= thresholds[0]) return 'good';
    if (value <= thresholds[1]) return 'needs-improvement';
    return 'poor';
  }

  // Log metric with visual indicators
  logMetric(name, metric) {
    const emoji = metric.rating === 'good' ? '✅' : metric.rating === 'needs-improvement' ? '⚠️' : '❌';
    console.log(`${emoji} ${name}: ${metric.value.toFixed(2)}ms (${metric.rating})`);
  }

  // Track custom events
  trackEvent(eventName, data) {
    try {
      // Send to analytics service if available
      if (window.gtag) {
        window.gtag('event', eventName, {
          custom_parameter: JSON.stringify(data)
        });
      }

      // Send to custom analytics endpoint
      this.sendToAnalytics(eventName, data);
    } catch (error) {
      console.warn('Event tracking failed:', error);
    }
  }

  // Send metrics to analytics endpoint
  async sendToAnalytics(eventName, data) {
    try {
      const payload = {
        event: eventName,
        data: data,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        sessionId: this.getSessionId()
      };

      // Use sendBeacon for better reliability
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/analytics', JSON.stringify(payload));
      } else {
        // Fallback to fetch
        fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true
        }).catch(() => {}); // Ignore errors
      }
    } catch (error) {
      console.warn('Analytics send failed:', error);
    }
  }

  // Get or create session ID
  getSessionId() {
    if (!this.sessionId) {
      this.sessionId = sessionStorage.getItem('performance-session-id') ||
        'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('performance-session-id', this.sessionId);
    }
    return this.sessionId;
  }

  // Get performance summary
  getSummary() {
    return {
      coreWebVitals: {
        lcp: this.metrics.lcp,
        fid: this.metrics.fid,
        cls: this.metrics.cls
      },
      loadMetrics: {
        ttfb: this.metrics.ttfb,
        fcp: this.metrics.fcp,
        loadTime: this.metrics.loadTime
      },
      apiPerformance: {
        totalCalls: this.metrics.apiCalls.length,
        averageResponseTime: this.getAverageApiTime(),
        slowCalls: this.metrics.apiCalls.filter(call => call.duration > 2000).length,
        errorRate: this.getApiErrorRate()
      },
      errors: {
        total: this.metrics.errors.length,
        recent: this.metrics.errors.slice(-5)
      },
      device: this.metrics.deviceInfo,
      network: this.metrics.networkInfo
    };
  }

  // Calculate average API response time
  getAverageApiTime() {
    if (this.metrics.apiCalls.length === 0) return 0;

    const total = this.metrics.apiCalls.reduce((sum, call) => sum + call.duration, 0);
    return (total / this.metrics.apiCalls.length).toFixed(2);
  }

  // Calculate API error rate
  getApiErrorRate() {
    if (this.metrics.apiCalls.length === 0) return 0;

    const errors = this.metrics.apiCalls.filter(call => !call.success).length;
    return ((errors / this.metrics.apiCalls.length) * 100).toFixed(2);
  }

  // Generate performance report
  generateReport() {
    const summary = this.getSummary();

    console.group('📊 Performance Report');
    console.log('Core Web Vitals:', summary.coreWebVitals);
    console.log('Load Metrics:', summary.loadMetrics);
    console.log('API Performance:', summary.apiPerformance);
    console.log('Error Summary:', summary.errors);
    console.log('Device Info:', summary.device);
    console.log('Network Info:', summary.network);
    console.groupEnd();

    return summary;
  }

  // Cleanup observers
  cleanup() {
    this.observers.forEach(observer => {
      try {
        observer.disconnect();
      } catch (error) {
        console.warn('Observer cleanup failed:', error);
      }
    });
    this.observers.clear();
  }

  // Start monitoring a specific component
  startComponentMonitor(componentName) {
    const startTime = performance.now();

    return {
      end: () => {
        const duration = performance.now() - startTime;
        this.trackEvent('component-render', {
          component: componentName,
          duration: duration,
          timestamp: Date.now()
        });

        if (duration > 16) { // More than one frame (60fps)
          console.warn(`Slow component render: ${componentName} took ${duration.toFixed(2)}ms`);
        }

        return duration;
      }
    };
  }

  // Monitor React component performance
  wrapComponent(Component, name) {
    return function PerformanceWrapper(props) {
      const monitor = performanceMonitor.startComponentMonitor(name);

      React.useEffect(() => {
        monitor.end();
      });

      return React.createElement(Component, props);
    };
  }
}

// Create global instance
const performanceMonitor = new PerformanceMonitor();

// Export for use in components
export default performanceMonitor;

// Utility functions for components
export const measureRender = (componentName) => {
  return performanceMonitor.startComponentMonitor(componentName);
};

export const trackPageView = (pageName) => {
  performanceMonitor.trackEvent('page-view', {
    page: pageName,
    url: window.location.href,
    timestamp: Date.now()
  });
};

export const trackUserAction = (action, data = {}) => {
  performanceMonitor.trackEvent('user-action', {
    action: action,
    ...data,
    timestamp: Date.now()
  });
};

// Mobile-specific optimization utilities
export const isMobileDevice = () => {
  return performanceMonitor.metrics.deviceInfo?.isMobile || false;
};

export const isSlowNetwork = () => {
  const effectiveType = performanceMonitor.metrics.networkInfo?.effectiveType;
  return effectiveType === 'slow-2g' || effectiveType === '2g';
};

export const shouldOptimizeForBattery = () => {
  return isMobileDevice() && isSlowNetwork();
};

// Performance optimization recommendations
export const getOptimizationRecommendations = () => {
  const summary = performanceMonitor.getSummary();
  const recommendations = [];

  // Check LCP
  if (summary.coreWebVitals.lcp?.rating === 'poor') {
    recommendations.push({
      metric: 'LCP',
      issue: 'Largest Contentful Paint is too slow',
      suggestions: [
        'Optimize images and use WebP format',
        'Remove unused CSS and JavaScript',
        'Use a CDN for faster content delivery',
        'Implement lazy loading for non-critical resources'
      ]
    });
  }

  // Check FID
  if (summary.coreWebVitals.fid?.rating === 'poor') {
    recommendations.push({
      metric: 'FID',
      issue: 'First Input Delay is too high',
      suggestions: [
        'Break up long-running JavaScript tasks',
        'Remove non-critical third-party scripts',
        'Use web workers for heavy computations',
        'Implement code splitting'
      ]
    });
  }

  // Check CLS
  if (summary.coreWebVitals.cls?.rating === 'poor') {
    recommendations.push({
      metric: 'CLS',
      issue: 'Cumulative Layout Shift is too high',
      suggestions: [
        'Reserve space for images and embeds',
        'Avoid inserting content above existing content',
        'Use CSS aspect-ratio for dynamic content',
        'Preload web fonts'
      ]
    });
  }

  // Check API performance
  if (summary.apiPerformance.averageResponseTime > 2000) {
    recommendations.push({
      metric: 'API',
      issue: 'API response times are slow',
      suggestions: [
        'Implement request caching',
        'Optimize database queries',
        'Use pagination for large datasets',
        'Implement request debouncing'
      ]
    });
  }

  return recommendations;
};

// Initialize monitoring when module loads
if (typeof window !== 'undefined') {
  // Performance monitoring is automatically initialized

  // Report performance on page unload
  window.addEventListener('beforeunload', () => {
    performanceMonitor.generateReport();
  });

  // Generate report every 30 seconds in development
  if (process.env.NODE_ENV === 'development') {
    setInterval(() => {
      performanceMonitor.generateReport();
    }, 30000);
  }
}