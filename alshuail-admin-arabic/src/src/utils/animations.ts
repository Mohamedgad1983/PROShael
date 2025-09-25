/**
 * Animation utilities for smooth transitions and interactive elements
 */

import React from 'react';

export type AnimationType =
  | 'fadeIn'
  | 'slideUp'
  | 'slideDown'
  | 'slideLeft'
  | 'slideRight'
  | 'scaleIn'
  | 'scaleOut'
  | 'pulse'
  | 'bounce'
  | 'shake'
  | 'rotate';

export interface AnimationConfig {
  duration?: number;
  delay?: number;
  easing?: string;
  fillMode?: 'forwards' | 'backwards' | 'both' | 'none';
  iterationCount?: number | 'infinite';
}

/**
 * Default animation configurations
 */
export const ANIMATION_PRESETS: Record<AnimationType, AnimationConfig> = {
  fadeIn: {
    duration: 300,
    easing: 'ease-out',
    fillMode: 'forwards'
  },
  slideUp: {
    duration: 400,
    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    fillMode: 'forwards'
  },
  slideDown: {
    duration: 400,
    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    fillMode: 'forwards'
  },
  slideLeft: {
    duration: 300,
    easing: 'ease-out',
    fillMode: 'forwards'
  },
  slideRight: {
    duration: 300,
    easing: 'ease-out',
    fillMode: 'forwards'
  },
  scaleIn: {
    duration: 200,
    easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    fillMode: 'forwards'
  },
  scaleOut: {
    duration: 150,
    easing: 'ease-in',
    fillMode: 'forwards'
  },
  pulse: {
    duration: 1000,
    easing: 'ease-in-out',
    iterationCount: 'infinite'
  },
  bounce: {
    duration: 600,
    easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    fillMode: 'forwards'
  },
  shake: {
    duration: 500,
    easing: 'ease-in-out'
  },
  rotate: {
    duration: 1000,
    easing: 'linear',
    iterationCount: 'infinite'
  }
};

/**
 * Get animation styles for CSS
 */
export const getAnimationStyles = (
  type: AnimationType,
  config?: Partial<AnimationConfig>
): React.CSSProperties => {
  const preset = ANIMATION_PRESETS[type];
  const finalConfig = { ...preset, ...config };

  return {
    animation: `${type} ${finalConfig.duration}ms ${finalConfig.easing || 'ease'} ${finalConfig.delay || 0}ms ${finalConfig.iterationCount || 1} ${finalConfig.fillMode || 'forwards'}`
  };
};

/**
 * Hook for managing animation states
 */
export const useAnimation = (
  type: AnimationType,
  trigger: boolean = true,
  config?: Partial<AnimationConfig>
) => {
  const [isAnimating, setIsAnimating] = React.useState(false);
  const [hasCompleted, setHasCompleted] = React.useState(false);

  const animationStyles = React.useMemo(() => {
    if (!trigger) return {};
    return getAnimationStyles(type, config);
  }, [type, trigger, config]);

  React.useEffect(() => {
    if (trigger && !hasCompleted) {
      setIsAnimating(true);
      const duration = config?.duration || ANIMATION_PRESETS[type].duration || 300;

      const timer = setTimeout(() => {
        setIsAnimating(false);
        setHasCompleted(true);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [trigger, hasCompleted, type, config]);

  const reset = () => {
    setIsAnimating(false);
    setHasCompleted(false);
  };

  return {
    animationStyles,
    isAnimating,
    hasCompleted,
    reset
  };
};

/**
 * Staggered animation hook for lists
 */
export const useStaggeredAnimation = (
  itemCount: number,
  type: AnimationType = 'fadeIn',
  staggerDelay: number = 100,
  config?: Partial<AnimationConfig>
) => {
  const [visibleItems, setVisibleItems] = React.useState<number[]>([]);

  React.useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    for (let i = 0; i < itemCount; i++) {
      const timer = setTimeout(() => {
        setVisibleItems(prev => [...prev, i]);
      }, i * staggerDelay);

      timers.push(timer);
    }

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [itemCount, staggerDelay]);

  const getItemStyles = (index: number): React.CSSProperties => {
    if (!visibleItems.includes(index)) {
      return { opacity: 0 };
    }

    return getAnimationStyles(type, config);
  };

  const reset = () => {
    setVisibleItems([]);
  };

  return {
    getItemStyles,
    visibleItems,
    reset
  };
};

/**
 * Loading animation styles
 */
export const getLoadingSpinnerStyles = (size: number = 24, color: string = '#667eea'): React.CSSProperties => ({
  width: size,
  height: size,
  border: `2px solid ${color}20`,
  borderTop: `2px solid ${color}`,
  borderRadius: '50%',
  animation: 'spin 1s linear infinite'
});

/**
 * Progress bar animation styles
 */
export const getProgressBarStyles = (
  progress: number,
  duration: number = 500,
  color: string = '#667eea'
): React.CSSProperties => ({
  width: '100%',
  height: '6px',
  background: `${color}20`,
  borderRadius: '3px',
  overflow: 'hidden',
  position: 'relative'
});

export const getProgressBarFillStyles = (
  progress: number,
  duration: number = 500,
  color: string = '#667eea'
): React.CSSProperties => ({
  position: 'absolute',
  top: 0,
  left: 0,
  height: '100%',
  width: `${progress}%`,
  background: color,
  borderRadius: '3px',
  transition: `width ${duration}ms ease-out`
});

/**
 * Skeleton loading animation
 */
export const getSkeletonLoadingStyles = (
  width: string = '100%',
  height: string = '20px',
  borderRadius: string = '4px'
): React.CSSProperties => ({
  width,
  height,
  borderRadius,
  background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
  backgroundSize: '200% 100%',
  animation: 'skeleton 1.5s infinite'
});

/**
 * Hover animation styles
 */
export const getHoverStyles = (
  scale: number = 1.05,
  duration: number = 200
): React.CSSProperties => ({
  transition: `transform ${duration}ms ease, box-shadow ${duration}ms ease`,
  cursor: 'pointer'
});

export const getHoverActiveStyles = (
  scale: number = 1.05
): React.CSSProperties => ({
  transform: `scale(${scale})`,
  boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)'
});

/**
 * Press animation styles
 */
export const getPressStyles = (
  scale: number = 0.95,
  duration: number = 100
): React.CSSProperties => ({
  transition: `transform ${duration}ms ease`
});

export const getPressActiveStyles = (
  scale: number = 0.95
): React.CSSProperties => ({
  transform: `scale(${scale})`
});

/**
 * Floating animation for call-to-action elements
 */
export const getFloatingStyles = (
  yOffset: number = 4,
  duration: number = 2000
): React.CSSProperties => ({
  animation: `float ${duration}ms ease-in-out infinite`
});

/**
 * Notification badge pulse animation
 */
export const getBadgePulseStyles = (color: string = '#ef4444'): React.CSSProperties => ({
  position: 'relative'
});

export const getBadgePulseAfterStyles = (color: string = '#ef4444'): React.CSSProperties => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '100%',
  height: '100%',
  borderRadius: '50%',
  background: color,
  animation: 'pulse-ring 2s infinite'
});

/**
 * Success checkmark animation
 */
export const getCheckmarkStyles = (
  size: number = 24,
  color: string = '#10b981'
): React.CSSProperties => ({
  width: size,
  height: size,
  borderRadius: '50%',
  border: `2px solid ${color}`,
  position: 'relative',
  display: 'inline-block',
  animation: 'checkmark-scale 0.3s ease-in-out'
});

export const getCheckmarkBeforeStyles = (
  size: number = 24,
  color: string = '#10b981'
): React.CSSProperties => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%) rotate(45deg)',
  width: size * 0.25,
  height: size * 0.5,
  border: `2px solid ${color}`,
  borderTop: 'none',
  borderLeft: 'none',
  animation: 'checkmark-draw 0.3s ease-in-out 0.1s forwards',
  opacity: 0
});

/**
 * Error shake animation
 */
export const getErrorShakeStyles = (): React.CSSProperties => ({
  animation: 'shake 0.5s ease-in-out'
});

/**
 * Toast notification slide-in animation
 */
export const getToastSlideStyles = (
  position: 'top' | 'bottom' | 'left' | 'right' = 'top'
): React.CSSProperties => {
  const transforms = {
    top: 'translateY(-100%)',
    bottom: 'translateY(100%)',
    left: 'translateX(-100%)',
    right: 'translateX(100%)'
  };

  return {
    animation: `slide-in-${position} 0.3s ease-out forwards`,
    transform: transforms[position]
  };
};

/**
 * Modal backdrop fade animation
 */
export const getBackdropFadeStyles = (): React.CSSProperties => ({
  animation: 'backdrop-fade 0.2s ease-out forwards',
  opacity: 0
});

/**
 * Inject animation keyframes into document
 */
export const injectAnimationKeyframes = () => {
  if (typeof document === 'undefined') return;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    @keyframes slideDown {
      from { transform: translateY(-20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    @keyframes slideLeft {
      from { transform: translateX(20px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }

    @keyframes slideRight {
      from { transform: translateX(-20px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }

    @keyframes scaleIn {
      from { transform: scale(0.9); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    @keyframes scaleOut {
      from { transform: scale(1); opacity: 1; }
      to { transform: scale(0.9); opacity: 0; }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    @keyframes bounce {
      0%, 20%, 53%, 80%, 100% { transform: translate3d(0, 0, 0); }
      40%, 43% { transform: translate3d(0, -8px, 0); }
      70% { transform: translate3d(0, -4px, 0); }
      90% { transform: translate3d(0, -2px, 0); }
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
      20%, 40%, 60%, 80% { transform: translateX(4px); }
    }

    @keyframes rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    @keyframes skeleton {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-4px); }
    }

    @keyframes pulse-ring {
      0% { transform: translate(-50%, -50%) scale(0.8); opacity: 1; }
      100% { transform: translate(-50%, -50%) scale(1.8); opacity: 0; }
    }

    @keyframes checkmark-scale {
      0% { transform: scale(0); }
      100% { transform: scale(1); }
    }

    @keyframes checkmark-draw {
      0% { opacity: 0; }
      100% { opacity: 1; }
    }

    @keyframes slide-in-top {
      from { transform: translateY(-100%); }
      to { transform: translateY(0); }
    }

    @keyframes slide-in-bottom {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }

    @keyframes slide-in-left {
      from { transform: translateX(-100%); }
      to { transform: translateX(0); }
    }

    @keyframes slide-in-right {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    @keyframes backdrop-fade {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    /* Progress bar animations */
    @keyframes progress-fill {
      from { width: 0%; }
    }

    /* Gradient shimmer for loading states */
    @keyframes shimmer {
      0% { background-position: -468px 0; }
      100% { background-position: 468px 0; }
    }
  `;

  document.head.appendChild(style);
};