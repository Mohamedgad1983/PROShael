import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute = ({
  children,
  requiredRole = null,
  requiredPermission = null,
  fallback = null
}) => {
  const { user, isAuthenticated, loading, hasRole, hasPermission } = useAuth();

  if (loading) {
    return (
      <div className="loading-container" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '200px',
        fontFamily: 'Cairo, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #f3f3f3',
            borderTop: '3px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 10px'
          }}></div>
          <p style={{ color: '#666', fontSize: '14px' }}>جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return fallback || (
      <div className="unauthorized-container" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '300px',
        fontFamily: 'Cairo, sans-serif',
        direction: 'rtl'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '40px',
          background: '#fff',
          borderRadius: '10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          maxWidth: '400px'
        }}>
          <h2 style={{ color: '#333', marginBottom: '15px' }}>الوصول مقيد</h2>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            يجب تسجيل الدخول للوصول إلى هذه الصفحة
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#667eea',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontFamily: 'Cairo, sans-serif'
            }}
          >
            تسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div className="insufficient-permissions" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '300px',
        fontFamily: 'Cairo, sans-serif',
        direction: 'rtl'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '40px',
          background: '#fff',
          borderRadius: '10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          maxWidth: '400px'
        }}>
          <h2 style={{ color: '#e74c3c', marginBottom: '15px' }}>صلاحيات غير كافية</h2>
          <p style={{ color: '#666', marginBottom: '15px' }}>
            لا تملك الصلاحيات اللازمة للوصول إلى هذه الصفحة
          </p>
          <p style={{ color: '#999', fontSize: '12px' }}>
            دورك الحالي: {user?.role}<br />
            الدور المطلوب: {requiredRole}
          </p>
        </div>
      </div>
    );
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="insufficient-permissions" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '300px',
        fontFamily: 'Cairo, sans-serif',
        direction: 'rtl'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '40px',
          background: '#fff',
          borderRadius: '10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          maxWidth: '400px'
        }}>
          <h2 style={{ color: '#e74c3c', marginBottom: '15px' }}>صلاحيات غير كافية</h2>
          <p style={{ color: '#666', marginBottom: '15px' }}>
            لا تملك الصلاحية المطلوبة للوصول إلى هذه الصفحة
          </p>
          <p style={{ color: '#999', fontSize: '12px' }}>
            الصلاحية المطلوبة: {requiredPermission}
          </p>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;