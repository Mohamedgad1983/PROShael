/**
 * Performance Optimization Utilities
 * Phase 4 Performance Optimization
 *
 * This file contains utilities and patterns for optimizing React component performance
 */

import React from 'react';

/**
 * Enhanced memo with custom comparison function
 * Useful for components with complex prop comparisons
 */
export const createMemoComponent = <P extends object>(
  Component: React.FC<P>,
  propsAreEqual?: (prevProps: P, nextProps: P) => boolean
) => {
  return React.memo(Component, propsAreEqual);
};

/**
 * Deep equality comparison for props
 * Use with React.memo custom comparison
 */
export const deepPropsEqual = (prevProps: any, nextProps: any): boolean => {
  if (Object.keys(prevProps).length !== Object.keys(nextProps).length) {
    return false;
  }

  for (const key in prevProps) {
    if (JSON.stringify(prevProps[key]) !== JSON.stringify(nextProps[key])) {
      return false;
    }
  }

  return true;
};

/**
 * Shallow equality check for primitive props only
 */
export const shallowPropsEqual = (prevProps: any, nextProps: any): boolean => {
  const keys = Object.keys(prevProps);
  if (keys.length !== Object.keys(nextProps).length) {
    return false;
  }

  for (const key of keys) {
    if (prevProps[key] !== nextProps[key]) {
      return false;
    }
  }

  return true;
};

/**
 * Performance metrics utility for React DevTools Profiler
 */
export const logRenderTime = (componentName: string, renderTime: number) => {
  if (renderTime > 16.67) { // More than one frame at 60fps
    console.warn(
      `⚠️  Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms (target: <16.67ms)`
    );
  }
};

/**
 * Cache invalidation helper for expensive computations
 */
export class ComputationCache {
  private cache: Map<string, { value: any; timestamp: number; ttl: number }> = new Map();

  set(key: string, value: any, ttlMs: number = 5000) {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > cached.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return cached.value;
  }

  clear() {
    this.cache.clear();
  }

  clearKey(key: string) {
    this.cache.delete(key);
  }
}

/**
 * Debounce hook for expensive operations
 */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => clearTimeout(handler);
  }, [value, delayMs]);

  return debouncedValue;
}

/**
 * Throttle hook for performance-intensive callbacks
 */
export function useThrottle<T>(value: T, delayMs: number): T {
  const [throttledValue, setThrottledValue] = React.useState<T>(value);
  const lastRanRef = React.useRef<number>(Date.now());

  React.useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRanRef.current >= delayMs) {
        setThrottledValue(value);
        lastRanRef.current = Date.now();
      }
    }, delayMs - (Date.now() - lastRanRef.current));

    return () => clearTimeout(handler);
  }, [value, delayMs]);

  return throttledValue;
}

/**
 * useAsync hook for data fetching with cleanup
 */
export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  immediate: boolean = true,
  dependencies: any[] = []
) {
  const [status, setStatus] = React.useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [value, setValue] = React.useState<T | null>(null);
  const [error, setError] = React.useState<Error | null>(null);

  const execute = React.useCallback(async () => {
    setStatus('pending');
    setValue(null);
    setError(null);
    try {
      const response = await asyncFunction();
      setValue(response);
      setStatus('success');
      return response;
    } catch (error) {
      setError(error as Error);
      setStatus('error');
    }
  }, [asyncFunction]);

  React.useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate, ...dependencies]);

  return { execute, status, value, error };
}

/**
 * usePrevious hook to track previous value
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = React.useRef<T>();

  React.useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * useLocalStorage hook with type safety
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = React.useState<T>(() => {
    try {
      const item = typeof window !== 'undefined' ? window.localStorage?.getItem(key) : null;
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading from localStorage for key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = React.useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        if (typeof window !== 'undefined') {
          window.localStorage?.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.error(`Error writing to localStorage for key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue] as const;
}

/**
 * useVisibility hook to optimize rendering of off-screen components
 */
export function useVisibility(elementRef: React.RefObject<HTMLElement>) {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    if (!elementRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(elementRef.current);

    return () => {
      observer.disconnect();
    };
  }, [elementRef]);

  return isVisible;
}

/**
 * Performance monitoring utility
 */
export class PerformanceMonitor {
  private marks: Map<string, number> = new Map();

  start(label: string) {
    this.marks.set(label, performance.now());
  }

  end(label: string): number {
    const startTime = this.marks.get(label);
    if (!startTime) {
      console.warn(`Performance mark "${label}" not found`);
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`⏱️  ${label}: ${duration.toFixed(2)}ms`);

    this.marks.delete(label);
    return duration;
  }

  clear() {
    this.marks.clear();
  }
}

export default {
  createMemoComponent,
  deepPropsEqual,
  shallowPropsEqual,
  logRenderTime,
  ComputationCache,
  useDebounce,
  useThrottle,
  useAsync,
  usePrevious,
  useLocalStorage,
  useVisibility,
  PerformanceMonitor,
};
