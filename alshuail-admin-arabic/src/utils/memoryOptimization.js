// Memory optimization utilities

// Debounce function to prevent excessive re-renders
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle function for scroll/resize events
export function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Memory-efficient array operations
export const arrayUtils = {
  // Chunk large arrays for processing
  chunk: (arr, size) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  },

  // Process large arrays in batches
  processBatch: async (arr, processor, batchSize = 100) => {
    const results = [];
    const chunks = arrayUtils.chunk(arr, batchSize);

    for (const chunk of chunks) {
      const batchResults = await Promise.all(chunk.map(processor));
      results.push(...batchResults);

      // Allow browser to breathe
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    return results;
  },

  // Memory-efficient filter
  filterLarge: (arr, predicate, maxMemory = 1000) => {
    if (arr.length <= maxMemory) {
      return arr.filter(predicate);
    }

    const result = [];
    const chunks = arrayUtils.chunk(arr, maxMemory);

    for (const chunk of chunks) {
      result.push(...chunk.filter(predicate));
    }

    return result;
  }
};

// Cache with size limits
export class LimitedCache {
  constructor(maxSize = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  get(key) {
    return this.cache.get(key);
  }

  clear() {
    this.cache.clear();
  }
}

// Cleanup function for event listeners
export class EventManager {
  constructor() {
    this.listeners = [];
  }

  addEventListener(element, event, handler, options) {
    element.addEventListener(event, handler, options);
    this.listeners.push({ element, event, handler, options });
  }

  removeAllListeners() {
    this.listeners.forEach(({ element, event, handler, options }) => {
      element.removeEventListener(event, handler, options);
    });
    this.listeners = [];
  }
}

// Intersection Observer for lazy loading
export function createLazyLoader(callback, options = {}) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        callback(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, {
    rootMargin: '50px',
    threshold: 0.01,
    ...options
  });

  return {
    observe: (element) => observer.observe(element),
    disconnect: () => observer.disconnect()
  };
}
