/**
 * VirtualScrollList - High-performance virtual scrolling for mobile
 * Features: Windowing, lazy rendering, smooth scrolling, mobile optimization
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useMobile } from '../../hooks/useMobile';
import performanceMonitor from '../../utils/performanceMonitor';

const VirtualScrollList = ({
  items = [],
  itemHeight = 80,
  containerHeight = 400,
  renderItem,
  overscan = 5,
  threshold = 0.1,
  onLoadMore,
  hasNextPage = false,
  loading = false,
  className = '',
  direction = 'rtl',
  estimatedItemHeight,
  onScroll: onScrollProp,
  getItemKey,
  loadingComponent: LoadingComponent,
  emptyComponent: EmptyComponent,
  errorComponent: ErrorComponent,
  error = null
}) => {
  const { device, viewport } = useMobile();
  const containerRef = useRef(null);
  const scrollElementRef = useRef(null);
  const observerRef = useRef(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);

  // Virtual scrolling state
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [itemHeights, setItemHeights] = useState(new Map());

  // Performance monitoring
  const renderMonitor = useRef(null);

  // Calculate dynamic item heights if estimatedItemHeight is provided
  const useVariableHeight = Boolean(estimatedItemHeight);
  const actualItemHeight = useVariableHeight ? estimatedItemHeight : itemHeight;

  // Memoized calculations for virtual window
  const virtualItems = useMemo(() => {
    if (!items.length) return { virtualItems: [], totalHeight: 0 };

    const monitor = performanceMonitor.startComponentMonitor('VirtualScrollList-calculate');

    const containerHeight_ = containerHeight;
    const itemHeight_ = actualItemHeight;
    const overscan_ = Math.max(1, overscan);

    // Calculate visible range
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight_) - overscan_);
    const endIndex = Math.min(
      items.length - 1,
      Math.floor((scrollTop + containerHeight_) / itemHeight_) + overscan_
    );

    // Generate virtual items
    const virtualItems_ = [];
    for (let i = startIndex; i <= endIndex; i++) {
      const item = items[i];
      if (item) {
        virtualItems_.push({
          index: i,
          item,
          top: i * itemHeight_,
          height: itemHeight_,
          key: getItemKey ? getItemKey(item, i) : `item-${i}`
        });
      }
    }

    const totalHeight = items.length * itemHeight_;

    monitor.end();

    return { virtualItems: virtualItems_, totalHeight, startIndex, endIndex };
  }, [items, scrollTop, actualItemHeight, containerHeight, overscan, getItemKey]);

  // Throttled scroll handler for better performance
  const handleScroll = useCallback((e) => {
    const scrollTop_ = e.target.scrollTop;
    setScrollTop(scrollTop_);

    // Update scrolling state
    if (!isScrollingRef.current) {
      setIsScrolling(true);
      isScrollingRef.current = true;
    }

    // Clear previous timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Set timeout to detect scroll end
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
      isScrollingRef.current = false;
    }, 150);

    // Call external scroll handler
    if (onScrollProp) {
      onScrollProp(e);
    }

    // Infinite scroll detection
    if (hasNextPage && !loading && onLoadMore) {
      const { scrollTop: st, scrollHeight, clientHeight } = e.target;
      const scrollPercentage = (st + clientHeight) / scrollHeight;

      if (scrollPercentage > (1 - threshold)) {
        onLoadMore();
      }
    }
  }, [hasNextPage, loading, onLoadMore, threshold, onScrollProp]);

  // Intersection Observer for lazy loading trigger
  useEffect(() => {
    if (!hasNextPage || !onLoadMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            onLoadMore();
          }
        });
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, onLoadMore, loading]);

  // Optimize scroll listener
  useEffect(() => {
    const scrollElement = scrollElementRef.current;
    if (!scrollElement) return;

    // Use passive event listener for better performance
    const options = { passive: true };
    scrollElement.addEventListener('scroll', handleScroll, options);

    return () => {
      scrollElement.removeEventListener('scroll', handleScroll, options);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleScroll]);

  // Track render performance
  useEffect(() => {
    renderMonitor.current = performanceMonitor.startComponentMonitor('VirtualScrollList-render');

    return () => {
      if (renderMonitor.current) {
        renderMonitor.current.end();
      }
    };
  });

  // Dynamic height measurement for variable height items
  const measureItemHeight = useCallback((index, height) => {
    if (useVariableHeight) {
      setItemHeights(prev => {
        const newHeights = new Map(prev);
        newHeights.set(index, height);
        return newHeights;
      });
    }
  }, [useVariableHeight]);

  // Render loading state
  if (loading && items.length === 0) {
    return (
      <div
        className={`virtual-scroll-container ${className}`}
        style={{ height: containerHeight }}
        dir={direction}
      >
        {LoadingComponent ? (
          <LoadingComponent />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="animate-pulse text-slate-400">جاري التحميل...</div>
          </div>
        )}
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div
        className={`virtual-scroll-container ${className}`}
        style={{ height: containerHeight }}
        dir={direction}
      >
        {ErrorComponent ? (
          <ErrorComponent error={error} />
        ) : (
          <div className="flex items-center justify-center h-full text-red-400">
            حدث خطأ في تحميل البيانات
          </div>
        )}
      </div>
    );
  }

  // Render empty state
  if (items.length === 0) {
    return (
      <div
        className={`virtual-scroll-container ${className}`}
        style={{ height: containerHeight }}
        dir={direction}
      >
        {EmptyComponent ? (
          <EmptyComponent />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400">
            لا توجد بيانات
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`virtual-scroll-container ${className}`}
      style={{ height: containerHeight }}
      dir={direction}
    >
      <div
        ref={scrollElementRef}
        className="virtual-scroll-content"
        style={{
          height: '100%',
          overflow: 'auto',
          position: 'relative',
          // Optimize scrolling on mobile
          WebkitOverflowScrolling: 'touch',
          scrollBehavior: device.isMobile ? 'auto' : 'smooth'
        }}
      >
        {/* Virtual container */}
        <div
          className="virtual-scroll-inner"
          style={{
            height: virtualItems.totalHeight,
            position: 'relative'
          }}
        >
          {/* Render visible items */}
          {virtualItems.virtualItems.map((virtualItem) => (
            <VirtualItem
              key={virtualItem.key}
              virtualItem={virtualItem}
              renderItem={renderItem}
              isScrolling={isScrolling}
              measureHeight={measureItemHeight}
              useVariableHeight={useVariableHeight}
            />
          ))}

          {/* Infinite scroll trigger */}
          {hasNextPage && (
            <div
              ref={observerRef}
              className="virtual-scroll-trigger"
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 1
              }}
            />
          )}
        </div>

        {/* Loading indicator for infinite scroll */}
        {loading && hasNextPage && (
          <div className="virtual-scroll-loading">
            <div className="flex items-center justify-center py-4">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
              <span className="text-slate-400">جاري تحميل المزيد...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Individual virtual item component
const VirtualItem = React.memo(({
  virtualItem,
  renderItem,
  isScrolling,
  measureHeight,
  useVariableHeight
}) => {
  const itemRef = useRef(null);

  // Measure height for variable height items
  useEffect(() => {
    if (useVariableHeight && itemRef.current) {
      const height = itemRef.current.getBoundingClientRect().height;
      measureHeight(virtualItem.index, height);
    }
  }, [virtualItem.index, measureHeight, useVariableHeight]);

  return (
    <div
      ref={itemRef}
      className="virtual-scroll-item"
      style={{
        position: 'absolute',
        top: virtualItem.top,
        left: 0,
        right: 0,
        height: useVariableHeight ? 'auto' : virtualItem.height,
        minHeight: virtualItem.height
      }}
      data-index={virtualItem.index}
    >
      {/* Render item with performance optimization */}
      <div
        className={`virtual-item-content ${isScrolling ? 'scrolling' : ''}`}
        style={{
          // Optimize rendering during scroll
          willChange: isScrolling ? 'transform' : 'auto',
          backfaceVisibility: 'hidden',
          transform: 'translateZ(0)'
        }}
      >
        {renderItem(virtualItem.item, virtualItem.index, {
          isScrolling,
          isVisible: true,
          virtualItem
        })}
      </div>
    </div>
  );
});

VirtualItem.displayName = 'VirtualItem';

// Hook for using virtual scroll with external state
export const useVirtualScroll = ({
  items,
  itemHeight = 80,
  containerHeight = 400,
  overscan = 5
}) => {
  const [scrollTop, setScrollTop] = useState(0);

  const virtualItems = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
    );

    const virtualItems_ = [];
    for (let i = startIndex; i <= endIndex; i++) {
      if (items[i]) {
        virtualItems_.push({
          index: i,
          item: items[i],
          top: i * itemHeight,
          height: itemHeight,
          key: `item-${i}`
        });
      }
    }

    return {
      virtualItems: virtualItems_,
      totalHeight: items.length * itemHeight,
      startIndex,
      endIndex
    };
  }, [items, scrollTop, itemHeight, containerHeight, overscan]);

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  return {
    virtualItems: virtualItems.virtualItems,
    totalHeight: virtualItems.totalHeight,
    handleScroll,
    startIndex: virtualItems.startIndex,
    endIndex: virtualItems.endIndex
  };
};

export default VirtualScrollList;