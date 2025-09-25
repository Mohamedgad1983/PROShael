/**
 * EnhancedLoadingStates - Premium loading states with smooth animations
 * No jumping, vibrating, or jarring animations - only smooth, 60fps transitions
 */

import React from 'react';
import '../../styles/pwa-design-system.css';

// Skeleton Loader Component
export const SkeletonLoader = ({ type = 'card', count = 1 }) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <div className="pwa-glass-card" style={{ padding: 'var(--pwa-space-5)' }}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full pwa-skeleton"></div>
              <div className="flex-1 space-y-3">
                <div className="h-4 pwa-skeleton" style={{ width: '60%' }}></div>
                <div className="h-3 pwa-skeleton" style={{ width: '100%' }}></div>
                <div className="h-3 pwa-skeleton" style={{ width: '80%' }}></div>
              </div>
            </div>
          </div>
        );

      case 'list-item':
        return (
          <div className="pwa-glass-card flex items-center gap-4" style={{ padding: 'var(--pwa-space-4)' }}>
            <div className="w-10 h-10 rounded-lg pwa-skeleton"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 pwa-skeleton" style={{ width: '70%' }}></div>
              <div className="h-3 pwa-skeleton" style={{ width: '40%' }}></div>
            </div>
            <div className="w-16 h-8 rounded-lg pwa-skeleton"></div>
          </div>
        );

      case 'stat':
        return (
          <div className="pwa-glass-card text-center" style={{ padding: 'var(--pwa-space-4)' }}>
            <div className="w-16 h-16 mx-auto mb-3 rounded-xl pwa-skeleton"></div>
            <div className="h-3 mb-2 pwa-skeleton" style={{ width: '80%', margin: '0 auto 8px' }}></div>
            <div className="h-5 mb-2 pwa-skeleton" style={{ width: '60%', margin: '0 auto 8px' }}></div>
            <div className="h-3 pwa-skeleton" style={{ width: '40%', margin: '0 auto' }}></div>
          </div>
        );

      case 'notification':
        return (
          <div className="pwa-glass-card flex gap-3" style={{ padding: 'var(--pwa-space-4)' }}>
            <div className="w-8 h-8 rounded-full pwa-skeleton flex-shrink-0"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 pwa-skeleton" style={{ width: '50%' }}></div>
              <div className="h-3 pwa-skeleton" style={{ width: '90%' }}></div>
              <div className="h-3 pwa-skeleton" style={{ width: '70%' }}></div>
            </div>
          </div>
        );

      case 'balance':
        return (
          <div className="pwa-glass-card" style={{ padding: 'var(--pwa-space-6)' }}>
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-3">
                <div className="h-3 pwa-skeleton" style={{ width: '80px' }}></div>
                <div className="h-8 pwa-skeleton" style={{ width: '150px' }}></div>
              </div>
              <div className="w-16 h-16 rounded-full pwa-skeleton"></div>
            </div>
            <div className="h-2 mb-4 pwa-skeleton rounded-full"></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="h-12 pwa-skeleton rounded-xl"></div>
              <div className="h-12 pwa-skeleton rounded-xl"></div>
            </div>
          </div>
        );

      default:
        return <div className="h-20 pwa-skeleton rounded-xl"></div>;
    }
  };

  return (
    <div className="space-y-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="pwa-animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
          {renderSkeleton()}
        </div>
      ))}
    </div>
  );
};

// Spinner Component with no vibration
export const Spinner = ({
  size = 'medium',
  color = 'primary',
  message = '',
  fullScreen = false
}) => {
  const sizeClasses = {
    small: 'w-6 h-6',
    medium: 'w-10 h-10',
    large: 'w-16 h-16'
  };

  const colorStyles = {
    primary: 'var(--pwa-primary-500)',
    secondary: 'var(--pwa-secondary-500)',
    white: 'white',
    dark: 'var(--pwa-neutral-900)'
  };

  const spinnerContent = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div
        className={`${sizeClasses[size]} border-3 rounded-full pwa-animate-spin`}
        style={{
          borderColor: `${colorStyles[color]}33`,
          borderTopColor: colorStyles[color],
          animation: 'pwa-spin 1s cubic-bezier(0.5, 0, 0.5, 1) infinite'
        }}
      ></div>
      {message && (
        <p className="pwa-body-small pwa-animate-fade-in" style={{
          color: fullScreen ? 'var(--pwa-neutral-700)' : 'var(--pwa-neutral-600)'
        }}>
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{
        background: 'var(--pwa-glass-white)',
        backdropFilter: 'blur(var(--pwa-blur-xl))',
        zIndex: 'var(--pwa-z-max)'
      }}>
        {spinnerContent}
      </div>
    );
  }

  return spinnerContent;
};

// Progress Bar Component
export const ProgressBar = ({
  progress = 0,
  color = 'primary',
  height = 'default',
  animated = true,
  showLabel = false,
  label = ''
}) => {
  const heightClasses = {
    thin: 'h-1',
    default: 'h-2',
    thick: 'h-3',
    large: 'h-4'
  };

  const colorStyles = {
    primary: 'var(--pwa-gradient-primary)',
    secondary: 'var(--pwa-gradient-secondary)',
    success: 'var(--pwa-success)',
    warning: 'var(--pwa-warning)',
    error: 'var(--pwa-error)'
  };

  return (
    <div className="w-full">
      {(showLabel || label) && (
        <div className="flex justify-between mb-2">
          <span className="pwa-body-small" style={{ color: 'var(--pwa-neutral-600)' }}>
            {label}
          </span>
          <span className="pwa-body-small" style={{ color: 'var(--pwa-neutral-600)' }}>
            {Math.round(progress)}%
          </span>
        </div>
      )}
      <div className={`${heightClasses[height]} bg-gray-200 rounded-full overflow-hidden`}>
        <div
          className={`h-full rounded-full transition-all duration-700 ${animated ? 'pwa-animate-shimmer' : ''}`}
          style={{
            width: `${Math.min(100, Math.max(0, progress))}%`,
            background: colorStyles[color],
            transition: 'width 0.7s cubic-bezier(0.4, 0.0, 0.2, 1)',
            backgroundSize: animated ? '200% 100%' : 'auto'
          }}
        ></div>
      </div>
    </div>
  );
};

// Dots Loader Component
export const DotsLoader = ({ color = 'primary', size = 'medium' }) => {
  const sizeClasses = {
    small: 'w-2 h-2',
    medium: 'w-3 h-3',
    large: 'w-4 h-4'
  };

  const colorStyles = {
    primary: 'var(--pwa-primary-500)',
    secondary: 'var(--pwa-secondary-500)',
    white: 'white',
    dark: 'var(--pwa-neutral-900)'
  };

  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`${sizeClasses[size]} rounded-full`}
          style={{
            backgroundColor: colorStyles[color],
            animation: `pwa-bounce 1.4s ease-in-out ${i * 0.16}s infinite both`
          }}
        ></div>
      ))}
    </div>
  );
};

// Pulse Placeholder Component
export const PulsePlaceholder = ({ lines = 3, showAvatar = false }) => {
  return (
    <div className="pwa-glass-card pwa-animate-fade-in" style={{ padding: 'var(--pwa-space-5)' }}>
      <div className="flex items-start gap-4">
        {showAvatar && (
          <div className="w-12 h-12 rounded-full pwa-animate-pulse" style={{
            background: 'var(--pwa-neutral-200)'
          }}></div>
        )}
        <div className="flex-1 space-y-3">
          {Array.from({ length: lines }, (_, i) => (
            <div
              key={i}
              className="h-3 rounded pwa-animate-pulse"
              style={{
                background: 'var(--pwa-neutral-200)',
                width: `${100 - (i * 15)}%`,
                animationDelay: `${i * 0.1}s`
              }}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Success Animation Component
export const SuccessAnimation = ({ message = 'تمت العملية بنجاح', onComplete }) => {
  React.useEffect(() => {
    if (onComplete) {
      const timer = setTimeout(onComplete, 2000);
      return () => clearTimeout(timer);
    }
  }, [onComplete]);

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{
      background: 'var(--pwa-glass-white)',
      backdropFilter: 'blur(var(--pwa-blur-xl))',
      zIndex: 'var(--pwa-z-max)'
    }}>
      <div className="text-center pwa-animate-scale-in">
        <div className="w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center"
             style={{
               background: 'var(--pwa-gradient-primary)',
               boxShadow: '0 20px 40px rgba(16, 185, 129, 0.3)'
             }}>
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M5 13l4 4L19 7"
                  style={{
                    strokeDasharray: 28,
                    strokeDashoffset: 28,
                    animation: 'draw-check 0.5s ease-out 0.3s forwards'
                  }}/>
          </svg>
        </div>
        <h2 className="pwa-heading-2 mb-2" style={{ color: 'var(--pwa-neutral-900)' }}>
          {message}
        </h2>
      </div>
    </div>
  );
};

// Error State Component
export const ErrorState = ({
  title = 'حدث خطأ',
  message = 'يرجى المحاولة مرة أخرى',
  onRetry,
  icon = '❌'
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 pwa-animate-fade-in">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="pwa-heading-3 mb-2" style={{ color: 'var(--pwa-neutral-900)' }}>
        {title}
      </h3>
      <p className="pwa-body-small mb-6" style={{ color: 'var(--pwa-neutral-600)' }}>
        {message}
      </p>
      {onRetry && (
        <button className="pwa-btn pwa-btn-primary" onClick={onRetry}>
          إعادة المحاولة
        </button>
      )}
    </div>
  );
};

// Empty State Component
export const EmptyState = ({
  title = 'لا توجد بيانات',
  message = 'لا توجد بيانات لعرضها حالياً',
  icon = '📭',
  action = null
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 pwa-animate-fade-in">
      <div className="text-6xl mb-4 opacity-50">{icon}</div>
      <h3 className="pwa-heading-3 mb-2" style={{ color: 'var(--pwa-neutral-700)' }}>
        {title}
      </h3>
      <p className="pwa-body-small mb-6" style={{ color: 'var(--pwa-neutral-500)' }}>
        {message}
      </p>
      {action}
    </div>
  );
};

// Add CSS for check animation
const style = document.createElement('style');
style.textContent = `
  @keyframes draw-check {
    to {
      stroke-dashoffset: 0;
    }
  }
`;
document.head.appendChild(style);

export default {
  SkeletonLoader,
  Spinner,
  ProgressBar,
  DotsLoader,
  PulsePlaceholder,
  SuccessAnimation,
  ErrorState,
  EmptyState
};