import React, { lazy, Suspense, useState, useCallback, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import './styles/apple-design-system.css';
import { RoleProvider } from './contexts/RoleContext';
import { AuthProvider } from './contexts/AuthContext';
import logo from './assets/logo.svg';

// Lazy load heavy components
const StyledDashboard = lazy(() => import('./components/StyledDashboard'));
const MemberRegistration = lazy(() => import('./components/Members/MemberRegistration'));
const AppleRegistrationForm = lazy(() => import('./components/Members/AppleRegistrationForm'));
const PremiumRegistration = lazy(() => import('./components/Registration/PremiumRegistration'));

// Loading component with skeleton
const LoadingFallback: React.FC = () => (
  <div className="loading-container" style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  }}>
    <div className="loading-spinner">
      <div className="spinner" style={{
        width: '50px',
        height: '50px',
        border: '4px solid rgba(255, 255, 255, 0.3)',
        borderTopColor: 'white',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  </div>
);

// Memoized Admin Dashboard Component
const AdminDashboard: React.FC = React.memo(() => {
  // Use callback to prevent recreation on every render
  const getInitialLoginState = useCallback(() => {
    const savedSession = localStorage.getItem('isLoggedIn');
    return savedSession === 'true';
  }, []);

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [isLoggedIn, setIsLoggedIn] = useState(getInitialLoginState);
  const [isLoading, setIsLoading] = useState(false);

  // Memoized API URL
  const apiUrl = useMemo(() =>
    process.env.REACT_APP_API_URL || 'http://localhost:5001',
    []
  );

  // Optimized change handler with useCallback
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  // Optimized submit handler
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading) return;
    setIsLoading(true);

    try {
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        // Batch localStorage updates
        const updates = {
          isLoggedIn: 'true',
          token: data.token,
          user: JSON.stringify(data.user),
          userEmail: formData.email
        };

        Object.entries(updates).forEach(([key, value]) => {
          localStorage.setItem(key, value);
        });

        setIsLoggedIn(true);
      } else {
        alert(data.error || 'فشل تسجيل الدخول');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('خطأ في الاتصال بالخادم');
    } finally {
      setIsLoading(false);
    }
  }, [formData, apiUrl, isLoading]);

  // Optimized logout handler
  const handleLogout = useCallback(() => {
    setIsLoggedIn(false);
    setFormData({ email: '', password: '' });

    // Clear all auth data in one go
    const keysToRemove = ['isLoggedIn', 'userEmail', 'token', 'user', 'auth_token', 'user_data'];
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }, []);

  if (isLoggedIn) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <StyledDashboard onLogout={handleLogout} />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center login-page" dir="rtl">
      <div className="login-container glass-effect">
        <div className="login-card">
          <div className="logo-container">
            <img src={logo} alt="Al-Shuail Logo" className="logo" loading="lazy" />
          </div>
          <h1 className="login-title">لوحة تحكم عائلة الشعيل</h1>
          <p className="login-subtitle">مرحباً بك في نظام الإدارة</p>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email" className="form-label">البريد الإلكتروني</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-input"
                placeholder="أدخل البريد الإلكتروني"
                required
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">كلمة المرور</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="form-input"
                placeholder="أدخل كلمة المرور"
                required
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={isLoading}
            >
              {isLoading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
});

AdminDashboard.displayName = 'AdminDashboard';

// Main App Component with optimizations
function App() {
  return (
    <AuthProvider>
      <RoleProvider>
        <Router>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<AdminDashboard />} />
              <Route path="/register/:token" element={
                <Suspense fallback={<LoadingFallback />}>
                  <MemberRegistration />
                </Suspense>
              } />
              <Route path="/apple-register/:token" element={
                <Suspense fallback={<LoadingFallback />}>
                  <AppleRegistrationForm />
                </Suspense>
              } />
              <Route path="/premium-register/:token" element={
                <Suspense fallback={<LoadingFallback />}>
                  <PremiumRegistration />
                </Suspense>
              } />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Suspense>
        </Router>
      </RoleProvider>
    </AuthProvider>
  );
}

export default App;