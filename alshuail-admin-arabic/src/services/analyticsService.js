// Analytics Service for User Behavior Tracking
// src/services/analyticsService.js

class AnalyticsService {
  constructor() {
    this.events = [];
    this.sessionId = this.generateSessionId();
    this.userId = null;
    this.initialized = false;
  }

  init(config = {}) {
    this.userId = config.userId;
    this.initialized = true;

    // Track page views automatically
    this.trackPageView(window.location.pathname);

    // Track navigation
    window.addEventListener('popstate', () => {
      this.trackPageView(window.location.pathname);
    });

    // Track errors
    window.addEventListener('error', (event) => {
      this.trackError({
        message: event.message,
        stack: event.error?.stack,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    // Track performance metrics
    this.trackPerformanceMetrics();

    console.log('[Analytics] Initialized');
  }

  generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  track(eventName, properties = {}) {
    if (!this.initialized) {
      console.warn('[Analytics] Not initialized');
      return;
    }

    const event = {
      eventName,
      properties,
      userId: this.userId,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    this.events.push(event);

    // Send to backend
    this.sendEvent(event);

    console.log('[Analytics] Event tracked:', eventName, properties);
  }

  trackPageView(path) {
    this.track('page_view', {
      path,
      title: document.title,
      referrer: document.referrer,
    });
  }

  trackClick(element, label) {
    this.track('click', {
      element,
      label,
    });
  }

  trackError(error) {
    this.track('error', {
      message: error.message,
      stack: error.stack,
      filename: error.filename,
      lineno: error.lineno,
      colno: error.colno,
    });
  }

  trackPerformanceMetrics() {
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      const navigationStart = timing.navigationStart;

      window.addEventListener('load', () => {
        setTimeout(() => {
          const metrics = {
            dns: timing.domainLookupEnd - timing.domainLookupStart,
            tcp: timing.connectEnd - timing.connectStart,
            ttfb: timing.responseStart - navigationStart,
            download: timing.responseEnd - timing.responseStart,
            dom: timing.domComplete - timing.domLoading,
            loadComplete: timing.loadEventEnd - navigationStart,
          };

          this.track('performance_metrics', metrics);
        }, 0);
      });
    }

    // Track Core Web Vitals
    if ('PerformanceObserver' in window) {
      // LCP
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.track('lcp', { value: lastEntry.renderTime || lastEntry.loadTime });
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // FID
      const fidObserver = new PerformanceObserver((entryList) => {
        const firstInput = entryList.getEntries()[0];
        if (firstInput) {
          this.track('fid', {
            value: firstInput.processingStart - firstInput.startTime
          });
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // CLS
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        this.track('cls', { value: clsValue });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    }
  }

  trackUserAction(action, category, label, value) {
    this.track('user_action', {
      action,
      category,
      label,
      value,
    });
  }

  async sendEvent(event) {
    try {
      // Send to analytics endpoint
      await fetch('/api/analytics/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(event),
      });
    } catch (error) {
      console.error('[Analytics] Failed to send event:', error);
      // Store for retry
      this.storeEventForRetry(event);
    }
  }

  storeEventForRetry(event) {
    const storedEvents = JSON.parse(localStorage.getItem('analytics_queue') || '[]');
    storedEvents.push(event);
    localStorage.setItem('analytics_queue', JSON.stringify(storedEvents));
  }

  async flushQueue() {
    const queue = JSON.parse(localStorage.getItem('analytics_queue') || '[]');

    for (const event of queue) {
      await this.sendEvent(event);
    }

    localStorage.removeItem('analytics_queue');
  }
}

export const analyticsService = new AnalyticsService();
