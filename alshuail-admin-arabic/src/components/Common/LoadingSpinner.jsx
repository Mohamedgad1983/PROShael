import React from 'react';

const LoadingSpinner = ({
  size = 'medium',
  message = 'جاري التحميل...',
  overlay = false,
  fullScreen = false,
  className = ''
}) => {
  const sizeClasses = {
    small: 'spinner-small',
    medium: 'spinner-medium',
    large: 'spinner-large'
  };

  const containerClass = `
    loading-spinner-container
    ${overlay ? 'loading-overlay' : ''}
    ${fullScreen ? 'loading-fullscreen' : ''}
    ${className}
  `.trim();

  return (
    <div className={containerClass} dir="rtl">
      <div className="loading-content">
        <div className={`loading-spinner ${sizeClasses[size]}`}>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
        </div>
        {message && <p className="loading-message">{message}</p>}
      </div>

      <style jsx>{`
        .loading-spinner-container {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }

        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(2px);
          z-index: 1000;
        }

        .loading-fullscreen {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(5px);
          z-index: 9999;
        }

        .loading-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .loading-spinner {
          position: relative;
          display: inline-block;
        }

        .spinner-small {
          width: 24px;
          height: 24px;
        }

        .spinner-medium {
          width: 40px;
          height: 40px;
        }

        .spinner-large {
          width: 64px;
          height: 64px;
        }

        .spinner-ring {
          position: absolute;
          border: 3px solid transparent;
          border-top: 3px solid #007bff;
          border-radius: 50%;
          animation: spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
        }

        .spinner-small .spinner-ring {
          width: 24px;
          height: 24px;
          border-width: 2px;
        }

        .spinner-medium .spinner-ring {
          width: 40px;
          height: 40px;
          border-width: 3px;
        }

        .spinner-large .spinner-ring {
          width: 64px;
          height: 64px;
          border-width: 4px;
        }

        .spinner-ring:nth-child(1) {
          animation-delay: -0.45s;
          border-top-color: #007bff;
        }

        .spinner-ring:nth-child(2) {
          animation-delay: -0.3s;
          border-top-color: #28a745;
        }

        .spinner-ring:nth-child(3) {
          animation-delay: -0.15s;
          border-top-color: #ffc107;
        }

        .spinner-ring:nth-child(4) {
          animation-delay: 0s;
          border-top-color: #dc3545;
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
            opacity: 1;
          }
          50% {
            transform: rotate(180deg);
            opacity: 0.6;
          }
          100% {
            transform: rotate(360deg);
            opacity: 1;
          }
        }

        .loading-message {
          color: #666;
          font-size: 1rem;
          font-weight: 500;
          margin: 0;
          text-align: center;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.6;
          }
        }

        /* Dark theme support */
        @media (prefers-color-scheme: dark) {
          .loading-overlay, .loading-fullscreen {
            background: rgba(0, 0, 0, 0.8);
          }

          .loading-message {
            color: #fff;
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .spinner-ring {
            animation: spin 2s linear infinite;
          }

          .loading-message {
            animation: none;
          }
        }

        /* RTL support */
        [dir="rtl"] .loading-spinner {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
};

// Skeleton loader for content
export const SkeletonLoader = ({ lines = 3, height = '1rem', className = '' }) => (
  <div className={`skeleton-loader ${className}`}>
    {Array.from({ length: lines }).map((_, index) => (
      <div
        key={index}
        className="skeleton-line"
        style={{
          height,
          width: index === lines - 1 ? '70%' : '100%'
        }}
      />
    ))}

    <style jsx>{`
      .skeleton-loader {
        padding: 1rem 0;
      }

      .skeleton-line {
        background: linear-gradient(
          90deg,
          #f0f0f0 25%,
          #e0e0e0 50%,
          #f0f0f0 75%
        );
        background-size: 200% 100%;
        animation: shimmer 2s infinite;
        border-radius: 4px;
        margin-bottom: 0.5rem;
      }

      .skeleton-line:last-child {
        margin-bottom: 0;
      }

      @keyframes shimmer {
        0% {
          background-position: -200% 0;
        }
        100% {
          background-position: 200% 0;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .skeleton-line {
          animation: none;
          background: #e0e0e0;
        }
      }
    `}</style>
  </div>
);

export default React.memo(LoadingSpinner);