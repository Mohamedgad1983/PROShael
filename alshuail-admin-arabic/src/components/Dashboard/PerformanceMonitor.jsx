import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  ChartBarIcon,
  ClockIcon,
  ServerIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

// Web Vitals metrics collection
const PerformanceMonitor = memo(() => {
  const [metrics, setMetrics] = useState({
    FCP: null, // First Contentful Paint
    LCP: null, // Largest Contentful Paint
    FID: null, // First Input Delay
    CLS: null, // Cumulative Layout Shift
    TTFB: null, // Time to First Byte
    TTI: null, // Time to Interactive
  });

  const [resourceMetrics, setResourceMetrics] = useState({
    jsSize: 0,
    cssSize: 0,
    imageSize: 0,
    totalSize: 0,
    requestCount: 0,
    loadTime: 0,
  });

  const [memoryMetrics, setMemoryMetrics] = useState({
    usedJSHeapSize: 0,
    totalJSHeapSize: 0,
    jsHeapSizeLimit: 0,
    usage: 0,
  });

  const [apiMetrics, setApiMetrics] = useState({
    averageResponseTime: 0,
    slowestEndpoint: null,
    fastestEndpoint: null,
    errorRate: 0,
    successRate: 100,
  });

  // Collect Web Vitals
  useEffect(() => {
    if ('PerformanceObserver' in window) {
      // Observe Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        setMetrics(prev => ({ ...prev, LCP: lastEntry.renderTime || lastEntry.loadTime }));
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // Observe First Input Delay
      const fidObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const firstInput = entries[0];
        if (firstInput) {
          setMetrics(prev => ({ ...prev, FID: firstInput.processingStart - firstInput.startTime }));
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // Observe Cumulative Layout Shift
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            setMetrics(prev => ({ ...prev, CLS: clsValue }));
          }
        }
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });

      return () => {
        lcpObserver.disconnect();
        fidObserver.disconnect();
        clsObserver.disconnect();
      };
    }
  }, []);

  // Collect Navigation Timing metrics
  useEffect(() => {
    const collectNavigationMetrics = () => {
      if (window.performance && window.performance.timing) {
        const timing = window.performance.timing;
        const navigationStart = timing.navigationStart;

        setMetrics(prev => ({
          ...prev,
          TTFB: timing.responseStart - navigationStart,
          FCP: timing.domContentLoadedEventEnd - navigationStart,
          TTI: timing.loadEventEnd - navigationStart,
        }));

        // Collect resource metrics
        const resources = window.performance.getEntriesByType('resource');
        let jsSize = 0, cssSize = 0, imageSize = 0, totalSize = 0;

        resources.forEach(resource => {
          const size = resource.transferSize || 0;
          totalSize += size;

          if (resource.name.endsWith('.js')) jsSize += size;
          else if (resource.name.endsWith('.css')) cssSize += size;
          else if (resource.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) imageSize += size;
        });

        setResourceMetrics({
          jsSize: Math.round(jsSize / 1024),
          cssSize: Math.round(cssSize / 1024),
          imageSize: Math.round(imageSize / 1024),
          totalSize: Math.round(totalSize / 1024),
          requestCount: resources.length,
          loadTime: timing.loadEventEnd - navigationStart,
        });
      }
    };

    // Wait for page load
    if (document.readyState === 'complete') {
      collectNavigationMetrics();
    } else {
      window.addEventListener('load', collectNavigationMetrics);
      return () => window.removeEventListener('load', collectNavigationMetrics);
    }
  }, []);

  // Monitor memory usage
  useEffect(() => {
    const checkMemory = () => {
      if (performance.memory) {
        const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = performance.memory;
        setMemoryMetrics({
          usedJSHeapSize: Math.round(usedJSHeapSize / 1048576), // Convert to MB
          totalJSHeapSize: Math.round(totalJSHeapSize / 1048576),
          jsHeapSizeLimit: Math.round(jsHeapSizeLimit / 1048576),
          usage: Math.round((usedJSHeapSize / jsHeapSizeLimit) * 100),
        });
      }
    };

    const interval = setInterval(checkMemory, 5000);
    checkMemory();

    return () => clearInterval(interval);
  }, []);

  // Monitor API performance
  useEffect(() => {
    const originalFetch = window.fetch;
    const apiCalls = [];

    window.fetch = async function(...args) {
      const startTime = performance.now();
      const url = args[0];

      try {
        const response = await originalFetch.apply(this, args);
        const endTime = performance.now();
        const duration = endTime - startTime;

        apiCalls.push({
          url,
          duration,
          status: response.status,
          success: response.ok,
        });

        // Keep only last 50 calls
        if (apiCalls.length > 50) apiCalls.shift();

        // Calculate metrics
        const avgTime = apiCalls.reduce((acc, call) => acc + call.duration, 0) / apiCalls.length;
        const errors = apiCalls.filter(call => !call.success).length;
        const successRate = ((apiCalls.length - errors) / apiCalls.length) * 100;

        const slowest = apiCalls.reduce((max, call) => call.duration > max.duration ? call : max, apiCalls[0]);
        const fastest = apiCalls.reduce((min, call) => call.duration < min.duration ? call : min, apiCalls[0]);

        setApiMetrics({
          averageResponseTime: Math.round(avgTime),
          slowestEndpoint: slowest ? { url: slowest.url.split('?')[0], time: Math.round(slowest.duration) } : null,
          fastestEndpoint: fastest ? { url: fastest.url.split('?')[0], time: Math.round(fastest.duration) } : null,
          errorRate: (errors / apiCalls.length) * 100,
          successRate,
        });

        return response;
      } catch (error) {
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const getScoreColor = (value, thresholds) => {
    if (value <= thresholds.good) return 'text-green-600';
    if (value <= thresholds.warning) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreIcon = (value, thresholds) => {
    if (value <= thresholds.good) {
      return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
    }
    if (value <= thresholds.warning) {
      return <ClockIcon className="w-5 h-5 text-yellow-600" />;
    }
    return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />;
  };

  return (
    <div className="performance-monitor">
      <div className="monitor-header">
        <h2 className="monitor-title">
          <ChartBarIcon className="w-6 h-6" />
          مراقب الأداء
        </h2>
      </div>

      <div className="metrics-grid">
        {/* Web Vitals */}
        <div className="metric-card">
          <h3 className="metric-title">Core Web Vitals</h3>
          <div className="metric-items">
            <div className="metric-item">
              <span className="metric-label">LCP (Largest Contentful Paint)</span>
              <span className={getScoreColor(metrics.LCP, { good: 2500, warning: 4000 })}>
                {metrics.LCP ? `${Math.round(metrics.LCP)}ms` : '...'}
              </span>
              {getScoreIcon(metrics.LCP, { good: 2500, warning: 4000 })}
            </div>
            <div className="metric-item">
              <span className="metric-label">FID (First Input Delay)</span>
              <span className={getScoreColor(metrics.FID, { good: 100, warning: 300 })}>
                {metrics.FID ? `${Math.round(metrics.FID)}ms` : '...'}
              </span>
              {getScoreIcon(metrics.FID, { good: 100, warning: 300 })}
            </div>
            <div className="metric-item">
              <span className="metric-label">CLS (Cumulative Layout Shift)</span>
              <span className={getScoreColor(metrics.CLS, { good: 0.1, warning: 0.25 })}>
                {metrics.CLS ? metrics.CLS.toFixed(3) : '...'}
              </span>
              {getScoreIcon(metrics.CLS, { good: 0.1, warning: 0.25 })}
            </div>
          </div>
        </div>

        {/* Resource Metrics */}
        <div className="metric-card">
          <h3 className="metric-title">
            <DocumentTextIcon className="w-5 h-5" />
            موارد الصفحة
          </h3>
          <div className="metric-items">
            <div className="metric-item">
              <span className="metric-label">JavaScript</span>
              <span>{resourceMetrics.jsSize} KB</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">CSS</span>
              <span>{resourceMetrics.cssSize} KB</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Images</span>
              <span>{resourceMetrics.imageSize} KB</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Total Size</span>
              <span className="font-bold">{resourceMetrics.totalSize} KB</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Requests</span>
              <span>{resourceMetrics.requestCount}</span>
            </div>
          </div>
        </div>

        {/* Memory Metrics */}
        <div className="metric-card">
          <h3 className="metric-title">
            <ServerIcon className="w-5 h-5" />
            استخدام الذاكرة
          </h3>
          <div className="metric-items">
            <div className="metric-item">
              <span className="metric-label">Used Heap</span>
              <span>{memoryMetrics.usedJSHeapSize} MB</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Total Heap</span>
              <span>{memoryMetrics.totalJSHeapSize} MB</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Heap Limit</span>
              <span>{memoryMetrics.jsHeapSizeLimit} MB</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Usage</span>
              <span className={memoryMetrics.usage > 80 ? 'text-red-600' : ''}>
                {memoryMetrics.usage}%
              </span>
            </div>
          </div>
        </div>

        {/* API Performance */}
        <div className="metric-card">
          <h3 className="metric-title">
            <ServerIcon className="w-5 h-5" />
            أداء API
          </h3>
          <div className="metric-items">
            <div className="metric-item">
              <span className="metric-label">Avg Response Time</span>
              <span>{apiMetrics.averageResponseTime}ms</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Success Rate</span>
              <span className={apiMetrics.successRate < 95 ? 'text-yellow-600' : 'text-green-600'}>
                {apiMetrics.successRate.toFixed(1)}%
              </span>
            </div>
            {apiMetrics.slowestEndpoint && (
              <div className="metric-item">
                <span className="metric-label">Slowest</span>
                <span className="text-xs">{apiMetrics.slowestEndpoint.time}ms</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Performance Score */}
      <div className="performance-score">
        <h3>Performance Score</h3>
        <div className="score-value">
          {calculatePerformanceScore(metrics, resourceMetrics)}
        </div>
      </div>
    </div>
  );
});

// Calculate overall performance score
function calculatePerformanceScore(metrics, resourceMetrics) {
  let score = 100;

  // Deduct points for poor Web Vitals
  if (metrics.LCP > 4000) score -= 20;
  else if (metrics.LCP > 2500) score -= 10;

  if (metrics.FID > 300) score -= 15;
  else if (metrics.FID > 100) score -= 7;

  if (metrics.CLS > 0.25) score -= 15;
  else if (metrics.CLS > 0.1) score -= 7;

  // Deduct points for large resources
  if (resourceMetrics.totalSize > 5000) score -= 20;
  else if (resourceMetrics.totalSize > 3000) score -= 10;

  return Math.max(0, score);
}

PerformanceMonitor.displayName = 'PerformanceMonitor';

export default PerformanceMonitor;