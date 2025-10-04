import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import './styles/modern-login.css';
import StyledDashboard from './components/StyledDashboard';
import MemberRegistration from './components/Members/MemberRegistration';
import AppleRegistrationForm from './components/Members/AppleRegistrationForm';
import PremiumRegistration from './components/Registration/PremiumRegistration';
import { RoleProvider } from './contexts/RoleContext';
import { AuthProvider } from './contexts/AuthContext';
import { AdminRoute, MemberRoute, PublicRoute } from './utils/RouteGuard';
import logo from './assets/logo.svg';
import { showToast } from './utils/toast';

// Mobile Pages
import MobileLogin from './pages/mobile/Login';
import ChangePassword from './pages/mobile/ChangePassword';
import MobileDashboard from './pages/mobile/Dashboard';
import MobileProfile from './pages/mobile/Profile';
import MobilePayment from './pages/mobile/Payment';
import MobilePaymentHistory from './pages/mobile/PaymentHistory';
import MobileNotifications from './pages/mobile/Notifications';

// Admin Dashboard Component
const AdminDashboard: React.FC = () => {
  const [formData, setFormData] = React.useState({
    email: '',
    password: '',
    role: 'super_admin' // Default to super admin for admin login
  });
  // Check localStorage for existing session
  const [isLoggedIn, setIsLoggedIn] = React.useState(() => {
    const savedSession = localStorage.getItem('isLoggedIn');
    return savedSession === 'true';
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Optimized login - instant response
    const API_URL = process.env.REACT_APP_API_URL || 'https://proshael.onrender.com';

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          role: formData.role || 'super_admin'
        })
      });

      const data = await response.json();

      if (data.success) {
        // Save login state and user data instantly
        setIsLoggedIn(true);
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('userEmail', formData.email);

        // Pre-cache dashboard data
        localStorage.setItem('loginTime', Date.now().toString());
      } else {
        showToast({
          message: data.error || 'فشل تسجيل الدخول',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      showToast({
        message: 'خطأ في الاتصال بالخادم. يرجى المحاولة مرة أخرى',
        type: 'error'
      });
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setFormData({ email: '', password: '', role: 'super_admin' });
    // Clear all auth data from localStorage
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
  };

  if (isLoggedIn) {
    return <StyledDashboard onLogout={handleLogout} />;
  }

  return (
    <div className="modern-login-container" dir="rtl">
      {/* Geometric Background Pattern */}
      <div className="modern-bg-pattern"></div>

      {/* Animated Circles Background */}
      <div className="modern-circles">
        <div className="circle circle-1"></div>
        <div className="circle circle-2"></div>
        <div className="circle circle-3"></div>
      </div>

      {/* Main Content */}
      <main className="modern-main-content">
        <div className="modern-login-card">
          {/* Card Header with Gradient */}
          <div className="modern-card-header">
            <div className="modern-logo-wrapper">
              <img
                src={logo}
                alt="Shuail Al-Anzi Fund"
              />
            </div>
            <h1 className="modern-title">صندوق شعيل العنزي</h1>
            <p className="modern-subtitle">Shuail Al-Anzi Fund</p>
            <p className="modern-system-text">S.A.F Management System</p>
          </div>

          {/* Login Form Container */}
          <div className="modern-form-container">
            {/* Welcome Text */}
            <div className="modern-welcome">
              <h2 className="modern-welcome-title">مرحباً بك</h2>
              <p className="modern-welcome-subtitle">سجّل دخولك للوصول إلى لوحة التحكم</p>
            </div>

            <form className="modern-login-form" onSubmit={handleSubmit} dir="rtl">
              <div className="modern-input-group">
                <label htmlFor="email" className="modern-input-label">
                  البريد الإلكتروني
                </label>
                <div className="modern-input-wrapper">
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="admin@alshuail.com"
                    className="modern-input-field"
                    required
                    dir="ltr"
                  />
                  <svg className="modern-input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
              </div>

              <div className="modern-input-group">
                <label htmlFor="password" className="modern-input-label">
                  كلمة المرور
                </label>
                <div className="modern-input-wrapper">
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="modern-input-field"
                    required
                    dir="ltr"
                  />
                  <svg className="modern-input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>

              <button type="submit" className="modern-login-button">
                <span>تسجيل الدخول</span>
                <svg className="modern-button-arrow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </form>

            {/* Footer Links */}
            <div className="modern-footer-links">
              <p className="modern-secure-text">
                <svg className="modern-lock-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                اتصال آمن ومشفر
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="modern-footer">
        <p>&copy; 2024 نظام الشعيل. جميع الحقوق محفوظة.</p>
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <RoleProvider>
        <Router>
          <Routes>
            {/* Public member registration route */}
            <Route path="/register/:token" element={<MemberRegistration />} />

            {/* Apple-style registration form */}
            <Route path="/apple-register" element={<AppleRegistrationForm />} />

            {/* Premium registration form - New Route */}
            <Route path="/premium-register" element={<PremiumRegistration />} />

            {/* Mobile PWA Routes - Member Interface */}
            <Route path="/mobile" element={<Navigate to="/mobile/login" replace />} />
            <Route path="/mobile/login" element={<MobileLogin />} />
            <Route path="/mobile/change-password" element={<MemberRoute><ChangePassword /></MemberRoute>} />
            <Route path="/mobile/dashboard" element={<MemberRoute><MobileDashboard /></MemberRoute>} />
            <Route path="/mobile/profile" element={<MemberRoute><MobileProfile /></MemberRoute>} />
            <Route path="/mobile/payment" element={<MemberRoute><MobilePayment /></MemberRoute>} />
            <Route path="/mobile/payment-history" element={<MemberRoute><MobilePaymentHistory /></MemberRoute>} />
            <Route path="/mobile/notifications" element={<MemberRoute><MobileNotifications /></MemberRoute>} />

            {/* Redirect old /member routes to new /mobile routes */}
            <Route path="/member" element={<Navigate to="/mobile/login" replace />} />
            <Route path="/member/*" element={<Navigate to="/mobile/login" replace />} />

            {/* Family Tree Route */}
            <Route path="/family-tree" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

            {/* Admin routes */}
            <Route path="/admin/*" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/login" element={<AdminDashboard />} />

            {/* Default route redirects to login */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Catch all route redirects to login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </RoleProvider>
    </AuthProvider>
  );
};

export default App;