/**
 * Performance Profiler Component
 * React Profiler wrapper for monitoring component render performance
 * Measures phase duration and re-render causes
 */

import React, { memo,  Profiler, ProfilerOnRenderCallback } from 'react';

import { logger } from '../../../utils/logger';

interface PerformanceMetrics {
  id: string;
  phase: 'mount' | 'update';
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
}

interface PerformanceProfilerProps {
  /** Unique identifier for this profiled component */
  id: string;
  /** Component children to profile */
  children: React.ReactNode;
  /** Enable/disable profiling (default: enabled in development) */
  enabled?: boolean;
  /** Callback for custom performance logging */
  onRender?: (metrics: PerformanceMetrics) => void;
  /** Threshold in milliseconds to log slow renders (default: 16ms) */
  slowRenderThreshold?: number;
  /** Enable console logging (default: true in development) */
  enableLogging?: boolean;
}

// Performance metrics storage
const performanceMetrics: Map<string, PerformanceMetrics[]> = new Map();

// Performance utilities
export const PerformanceUtils = {
  /**
   * Get all metrics for a profiled component
   */
  getMetrics(id: string): PerformanceMetrics[] {
    return performanceMetrics.get(id) || [];
  },

  /**
   * Get average render duration for a component
   */
  getAverageDuration(id: string): number {
    const metrics = performanceMetrics.get(id) || [];
    if (metrics.length === 0) return 0;

    const sum = metrics.reduce((acc, m) => acc + m.actualDuration, 0);
    return sum / metrics.length;
  },

  /**
   * Get slow renders (above threshold)
   */
  getSlowRenders(id: string, threshold: number = 16): PerformanceMetrics[] {
    const metrics = performanceMetrics.get(id) || [];
    return metrics.filter(m => m.actualDuration > threshold);
  },

  /**
   * Get performance summary for a component
   */
  getSummary(id: string) {
    const metrics = performanceMetrics.get(id) || [];
    if (metrics.length === 0) {
      return {
        id,
        totalRenders: 0,
        averageDuration: 0,
        slowRenders: 0,
        mountTime: 0,
        updateTime: 0
      };
    }

    const mounts = metrics.filter(m => m.phase === 'mount');
    const updates = metrics.filter(m => m.phase === 'update');
    const slowRenders = metrics.filter(m => m.actualDuration > 16);

    return {
      id,
      totalRenders: metrics.length,
      averageDuration: this.getAverageDuration(id),
      slowRenders: slowRenders.length,
      mountTime: mounts.reduce((acc, m) => acc + m.actualDuration, 0) / Math.max(mounts.length, 1),
      updateTime: updates.reduce((acc, m) => acc + m.actualDuration, 0) / Math.max(updates.length, 1),
      mounts: mounts.length,
      updates: updates.length
    };
  },

  /**
   * Clear all metrics
   */
  clearMetrics(id?: string) {
    if (id) {
      performanceMetrics.delete(id);
    } else {
      performanceMetrics.clear();
    }
  },

  /**
   * Export metrics to console or external logging
   */
  exportMetrics(id?: string) {
    if (id) {
      const summary = this.getSummary(id);
      console.table([summary]);
    } else {
      const allSummaries = Array.from(performanceMetrics.keys()).map(k => this.getSummary(k));
      console.table(allSummaries);
    }
  }
};

// Make utilities available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).__PERFORMANCE_UTILS__ = PerformanceUtils;
}

/**
 * Performance Profiler Component
 * Wraps components with React Profiler for performance monitoring
 */
export const PerformanceProfiler: React.FC<PerformanceProfilerProps> = ({
  id,
  children,
  enabled = process.env.NODE_ENV === 'development',
  onRender: customOnRender,
  slowRenderThreshold = 16,
  enableLogging = process.env.NODE_ENV === 'development'
}) => {
  const handleRender = (
    profileId: string,
    phase: 'mount' | 'update',
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number
  ) => {
    const metrics: PerformanceMetrics = {
      id: profileId,
      phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime
    };

    // Store metrics
    const existing = performanceMetrics.get(profileId) || [];
    existing.push(metrics);

    // Keep only last 100 measurements
    if (existing.length > 100) {
      existing.shift();
    }

    performanceMetrics.set(profileId, existing);

    // Log slow renders
    if (enableLogging && actualDuration > slowRenderThreshold) {
      logger.warn(`[Performance] Slow ${phase} detected in "${profileId}": ${actualDuration.toFixed(2)}ms`,
        {
          actualDuration: `${actualDuration.toFixed(2)}ms`,
          baseDuration: `${baseDuration.toFixed(2)}ms`,
          startTime: `${startTime.toFixed(2)}ms`
        }
      );
    }

    // Log all renders in verbose mode
    if (enableLogging && process.env.REACT_APP_VERBOSE_PROFILING === 'true') {
      logger.debug(`[Performance] ${phase} in "${profileId}": ${actualDuration.toFixed(2)}ms`,
        {
          actualDuration: `${actualDuration.toFixed(2)}ms`,
          baseDuration: `${baseDuration.toFixed(2)}ms`,
          performance: actualDuration < slowRenderThreshold ? '✅ Good' : '⚠️ Slow'
        }
      );
    }

    // Custom callback
    if (customOnRender) {
      customOnRender(metrics);
    }
  };

  // If profiling disabled, return children directly
  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <Profiler id={id} onRender={handleRender}>
      {children}
    </Profiler>
  );
};

export default memo(PerformanceProfiler);
