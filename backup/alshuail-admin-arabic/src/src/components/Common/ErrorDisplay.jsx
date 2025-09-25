import React from 'react';

const ErrorDisplay = ({
  error,
  onRetry,
  onDismiss,
  title = 'حدث خطأ',
  type = 'error', // 'error', 'warning', 'info'
  showDetails = false,
  className = ''
}) => {
  const getErrorMessage = (error) => {
    if (typeof error === 'string') {
      return error;
    }

    if (error?.message_ar) {
      return error.message_ar;
    }

    if (error?.message) {
      return error.message;
    }

    // Network errors
    if (error?.name === 'NetworkError' || error?.code === 'NETWORK_ERROR') {
      return 'خطأ في الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.';
    }

    // API errors
    if (error?.status) {
      switch (error.status) {
        case 401:
          return 'انتهت صلاحية جلسة العمل. يرجى تسجيل الدخول مرة أخرى.';
        case 403:
          return 'ليس لديك صلاحية للوصول إلى هذا المورد.';
        case 404:
          return 'لم يتم العثور على المورد المطلوب.';
        case 429:
          return 'تم تجاوز الحد الأقصى للطلبات. يرجى المحاولة لاحقاً.';
        case 500:
          return 'خطأ في الخادم. يرجى المحاولة لاحقاً.';
        case 503:
          return 'الخدمة غير متاحة مؤقتاً. يرجى المحاولة لاحقاً.';
        default:
          return `خطأ في الخادم (${error.status})`;
      }
    }

    return 'حدث خطأ غير متوقع';
  };

  const getTypeConfig = (type) => {
    const configs = {
      error: {
        icon: '❌',
        bgColor: '#fee',
        borderColor: '#dc3545',
        textColor: '#721c24'
      },
      warning: {
        icon: '⚠️',
        bgColor: '#fff3cd',
        borderColor: '#ffc107',
        textColor: '#856404'
      },
      info: {
        icon: 'ℹ️',
        bgColor: '#d1ecf1',
        borderColor: '#17a2b8',
        textColor: '#0c5460'
      }
    };

    return configs[type] || configs.error;
  };

  const typeConfig = getTypeConfig(type);
  const errorMessage = getErrorMessage(error);

  return (
    <div className={`error-display ${type} ${className}`} dir="rtl">
      <div className="error-content">
        <div className="error-header">
          <div className="error-icon">{typeConfig.icon}</div>
          <div className="error-text">
            <h4 className="error-title">{title}</h4>
            <p className="error-message">{errorMessage}</p>
          </div>
          {onDismiss && (
            <button
              className="dismiss-btn"
              onClick={onDismiss}
              aria-label="إغلاق"
              title="إغلاق"
            >
              ✕
            </button>
          )}
        </div>

        {showDetails && error && typeof error === 'object' && (
          <details className="error-details">
            <summary>تفاصيل تقنية</summary>
            <pre className="error-stack">
              {JSON.stringify(error, null, 2)}
            </pre>
          </details>
        )}

        {onRetry && (
          <div className="error-actions">
            <button
              className="retry-btn hover-lift ripple-effect"
              onClick={onRetry}
            >
              <span className="btn-icon">🔄</span>
              إعادة المحاولة
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .error-display {
          margin: 1rem 0;
          border-radius: 8px;
          border: 1px solid ${typeConfig.borderColor};
          background: ${typeConfig.bgColor};
          color: ${typeConfig.textColor};
          animation: slideIn 0.3s ease-out;
        }

        .error-content {
          padding: 1rem;
        }

        .error-header {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }

        .error-icon {
          font-size: 1.25rem;
          flex-shrink: 0;
        }

        .error-text {
          flex: 1;
          min-width: 0;
        }

        .error-title {
          margin: 0 0 0.25rem 0;
          font-size: 1rem;
          font-weight: 600;
          color: inherit;
        }

        .error-message {
          margin: 0;
          font-size: 0.9rem;
          line-height: 1.4;
          word-break: break-word;
        }

        .dismiss-btn {
          background: none;
          border: none;
          color: inherit;
          font-size: 1.25rem;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 4px;
          transition: background-color 0.2s;
          flex-shrink: 0;
        }

        .dismiss-btn:hover {
          background: rgba(0, 0, 0, 0.1);
        }

        .error-details {
          margin-top: 1rem;
          border-top: 1px solid rgba(0, 0, 0, 0.1);
          padding-top: 1rem;
        }

        .error-details summary {
          cursor: pointer;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: inherit;
        }

        .error-stack {
          background: rgba(0, 0, 0, 0.05);
          padding: 0.75rem;
          border-radius: 4px;
          font-size: 0.75rem;
          overflow-x: auto;
          border: 1px solid rgba(0, 0, 0, 0.1);
          direction: ltr;
          text-align: left;
        }

        .error-actions {
          margin-top: 1rem;
          display: flex;
          gap: 0.5rem;
        }

        .retry-btn {
          background: ${typeConfig.borderColor};
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          transition: all 0.3s ease;
        }

        .retry-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .btn-icon {
          font-size: 1rem;
        }

        .hover-lift:hover {
          transform: translateY(-1px);
        }

        .ripple-effect {
          position: relative;
          overflow: hidden;
        }

        .ripple-effect:before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
          transition: width 0.4s, height 0.4s;
          transform: translate(-50%, -50%);
        }

        .ripple-effect:active:before {
          width: 200px;
          height: 200px;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Accessibility improvements */
        @media (prefers-reduced-motion: reduce) {
          .error-display {
            animation: none;
          }

          .retry-btn:hover {
            transform: none;
          }

          .ripple-effect:before {
            transition: none;
          }
        }

        /* High contrast mode */
        @media (prefers-contrast: high) {
          .error-display {
            border-width: 2px;
          }

          .dismiss-btn:hover {
            background: rgba(0, 0, 0, 0.2);
          }
        }
      `}</style>
    </div>
  );
};

// Toast notification for temporary errors
export const ErrorToast = ({ error, onClose, autoClose = 5000 }) => {
  React.useEffect(() => {
    if (autoClose > 0) {
      const timer = setTimeout(onClose, autoClose);
      return () => clearTimeout(timer);
    }
  }, [autoClose, onClose]);

  return (
    <div className="error-toast" dir="rtl">
      <ErrorDisplay
        error={error}
        onDismiss={onClose}
        type="error"
        className="toast-error"
      />

      <style jsx>{`
        .error-toast {
          position: fixed;
          top: 1rem;
          right: 1rem;
          z-index: 10000;
          max-width: 400px;
          animation: slideInRight 0.3s ease-out;
        }

        .error-toast :global(.toast-error) {
          margin: 0;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @media (max-width: 768px) {
          .error-toast {
            top: 0.5rem;
            right: 0.5rem;
            left: 0.5rem;
            max-width: none;
          }
        }
      `}</style>
    </div>
  );
};

export default ErrorDisplay;