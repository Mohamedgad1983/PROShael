import React, { Component } from 'react';

import { logger } from '../../utils/logger';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      errorId: Date.now().toString()
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    logger.error('ErrorBoundary caught an error:', { error, errorInfo });

    this.setState({
      error,
      errorInfo
    });

    // Log to error reporting service if available
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: error.toString(),
        fatal: false
      });
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  render() {
    if (this.state.hasError) {
      const { children } = this.props;
      const { error, errorId } = this.state;

      return (
        <div className="error-boundary" dir="rtl">
          <div className="error-container glass-morphism">
            <div className="error-icon">⚠️</div>
            <h2>حدث خطأ غير متوقع</h2>
            <p>نعتذر عن هذا الإزعاج. حدث خطأ في النظام.</p>

            {process.env.NODE_ENV === 'development' && error && (
              <details className="error-details">
                <summary>تفاصيل الخطأ (وضع التطوير)</summary>
                <pre className="error-stack">
                  {error.toString()}
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div className="error-actions">
              <button
                className="retry-btn hover-lift ripple-effect"
                onClick={this.handleRetry}
              >
                <span className="btn-icon">🔄</span>
                إعادة المحاولة
              </button>

              <button
                className="home-btn hover-lift"
                onClick={() => window.location.href = '/'}
              >
                <span className="btn-icon">🏠</span>
                العودة للصفحة الرئيسية
              </button>
            </div>

            <div className="error-id">
              معرف الخطأ: {errorId}
            </div>
          </div>

          <style jsx>{`
            .error-boundary {
              min-height: 400px;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 2rem;
            }

            .error-container {
              max-width: 600px;
              width: 100%;
              text-align: center;
              padding: 3rem 2rem;
              border-radius: 16px;
              background: rgba(255, 255, 255, 0.95);
              backdrop-filter: blur(10px);
              border: 1px solid rgba(255, 255, 255, 0.2);
              box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            }

            .error-icon {
              font-size: 4rem;
              margin-bottom: 1rem;
            }

            .error-container h2 {
              color: #dc3545;
              margin-bottom: 1rem;
              font-size: 1.5rem;
            }

            .error-container p {
              color: #666;
              margin-bottom: 2rem;
              font-size: 1.1rem;
            }

            .error-details {
              margin: 2rem 0;
              text-align: right;
            }

            .error-details summary {
              cursor: pointer;
              color: #007bff;
              margin-bottom: 1rem;
              font-weight: bold;
            }

            .error-stack {
              background: #f8f9fa;
              padding: 1rem;
              border-radius: 8px;
              overflow-x: auto;
              font-size: 0.875rem;
              color: #333;
              border: 1px solid #dee2e6;
              text-align: left;
              direction: ltr;
            }

            .error-actions {
              display: flex;
              gap: 1rem;
              justify-content: center;
              margin-bottom: 2rem;
              flex-wrap: wrap;
            }

            .retry-btn, .home-btn {
              padding: 0.75rem 1.5rem;
              border: none;
              border-radius: 8px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.3s ease;
              display: flex;
              align-items: center;
              gap: 0.5rem;
              font-size: 1rem;
            }

            .retry-btn {
              background: linear-gradient(135deg, #28a745, #20c997);
              color: white;
            }

            .home-btn {
              background: linear-gradient(135deg, #6c757d, #5a6268);
              color: white;
            }

            .retry-btn:hover, .home-btn:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }

            .error-id {
              font-size: 0.875rem;
              color: #6c757d;
              font-family: monospace;
            }

            .btn-icon {
              font-size: 1.1rem;
            }

            .hover-lift:hover {
              transform: translateY(-2px);
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
              transition: width 0.6s, height 0.6s;
              transform: translate(-50%, -50%);
            }

            .ripple-effect:active:before {
              width: 300px;
              height: 300px;
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

export default React.memo(ErrorBoundary);