import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import './styles/modern-login.css';
import StyledDashboard from './components/StyledDashboard';
import MemberRegistration from './components/Members/MemberRegistration';
import AppleRegistrationForm from './components/Members/AppleRegistrationForm';
import PremiumRegistration from './components/Registration/PremiumRegistration';
import MemberMobileApp from './components/MemberMobile/MemberMobileApp';
import { RoleProvider } from './contexts/RoleContext';
import { AuthProvider } from './contexts/AuthContext';
import logo from './assets/logo.svg';
import { showToast } from './utils/toast';

// Admin Dashboard Component
const AdminDashboard: React.FC = () => {
  const [formData, setFormData] = React.useState({
    email: '',
    password: ''
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
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
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
    setFormData({ email: '', password: '' });
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
                    placeholder="example@alshuail.com"
                    className="modern-input-field"
                    required
                    dir="ltr"
                  />
                  <svg className="modern-input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
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

            {/* Member Mobile App - For normal users */}
            <Route path="/member" element={<MemberMobileApp />} />
            <Route path="/member/*" element={<MemberMobileApp />} />

            {/* Admin routes */}
            <Route path="/admin/*" element={<AdminDashboard />} />
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