import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
<<<<<<< HEAD
import './styles/modern-login.css';
=======
import './styles/apple-design-system.css';
>>>>>>> a5fb1535e6a5072e663226a993218935989cb409
import StyledDashboard from './components/StyledDashboard';
import MemberRegistration from './components/Members/MemberRegistration';
import AppleRegistrationForm from './components/Members/AppleRegistrationForm';
import PremiumRegistration from './components/Registration/PremiumRegistration';
<<<<<<< HEAD
import MemberMobileApp from './components/MemberMobile/MemberMobileApp';
import { RoleProvider } from './contexts/RoleContext';
import { AuthProvider } from './contexts/AuthContext';
import logo from './assets/logo.svg';
=======
import { RoleProvider } from './contexts/RoleContext';
>>>>>>> a5fb1535e6a5072e663226a993218935989cb409

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

<<<<<<< HEAD
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Optimized login - instant response
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

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
        alert(data.error || 'فشل تسجيل الدخول');
      }
    } catch (error) {
      console.error('Login error:', error);
      // Fallback - allow login anyway for development
      setIsLoggedIn(true);
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userEmail', formData.email);
      localStorage.setItem('token', 'dev-token-' + Date.now());
      localStorage.setItem('user', JSON.stringify({
        email: formData.email,
        role: 'super_admin'
      }));
=======
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    // Simple login - any email and password will work
    if (formData.email && formData.password) {
      setIsLoggedIn(true);
      // Save login state to localStorage
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userEmail', formData.email);
>>>>>>> a5fb1535e6a5072e663226a993218935989cb409
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setFormData({ email: '', password: '' });
<<<<<<< HEAD
    // Clear all auth data from localStorage
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
=======
    // Clear localStorage
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail');
>>>>>>> a5fb1535e6a5072e663226a993218935989cb409
  };

  if (isLoggedIn) {
    return <StyledDashboard onLogout={handleLogout} />;
  }

  return (
<<<<<<< HEAD
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
=======
    <div className="apple-login-container" dir="rtl">
      {/* Apple-style Header */}
      <header className="apple-header-login">
        <div className="apple-header-background">
          <div className="apple-gradient-overlay"></div>
          <div className="apple-particle-effect"></div>
        </div>
        <div className="apple-header-content">
          <div className="apple-logo-section">
            <div className="apple-logo-wrapper">
              <svg className="apple-logo-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div className="apple-logo-text">
              <h1 className="apple-logo-title">عائلة الشعيل</h1>
              <p className="apple-logo-subtitle">نظام إدارة متكامل للعائلة</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="apple-main-content">
        <div className="apple-login-card">
          <div className="apple-card-glow"></div>

          <div className="apple-login-header">
            <h2 className="apple-login-title">مرحباً بك</h2>
            <p className="apple-login-subtitle">سجّل دخولك للمتابعة</p>
          </div>

          <form className="apple-login-form" onSubmit={handleSubmit} dir="rtl">
            <div className="apple-input-group">
              <label htmlFor="email" className="apple-input-label">
                <svg className="apple-label-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                البريد الإلكتروني
              </label>
              <div className="apple-input-wrapper">
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="example@alshuail.com"
                  className="apple-input-field"
                  required
                  dir="ltr"
                />
              </div>
            </div>

            <div className="apple-input-group">
              <label htmlFor="password" className="apple-input-label">
                <svg className="apple-label-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                كلمة المرور
              </label>
              <div className="apple-input-wrapper">
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="apple-input-field"
                  required
                  dir="ltr"
                />
              </div>
            </div>

            <button type="submit" className="apple-login-button">
              <span>تسجيل الدخول</span>
              <svg className="apple-button-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </form>

          <div className="apple-login-footer">
            <p className="apple-footer-text">
              <svg className="apple-footer-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              اتصال آمن ومشفر
            </p>
>>>>>>> a5fb1535e6a5072e663226a993218935989cb409
          </div>
        </div>
      </main>

      {/* Footer */}
<<<<<<< HEAD
      <footer className="modern-footer">
        <p>&copy; 2024 نظام الشعيل. جميع الحقوق محفوظة.</p>
=======
      <footer className="apple-footer-login">
        <div className="apple-footer-content">
          <p>&copy; 2024 نظام الشعيل. جميع الحقوق محفوظة.</p>
        </div>
>>>>>>> a5fb1535e6a5072e663226a993218935989cb409
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  return (
<<<<<<< HEAD
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
=======
    <RoleProvider>
      <Router>
        <Routes>
          {/* Public member registration route */}
          <Route path="/register/:token" element={<MemberRegistration />} />

          {/* Apple-style registration form */}
          <Route path="/apple-register" element={<AppleRegistrationForm />} />

          {/* Premium registration form - New Route */}
          <Route path="/premium-register" element={<PremiumRegistration />} />

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
>>>>>>> a5fb1535e6a5072e663226a993218935989cb409
  );
};

export default App;