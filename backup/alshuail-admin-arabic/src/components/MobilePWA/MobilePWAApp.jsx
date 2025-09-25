/**
 * MobilePWAApp - Main PWA container with optimized routing and performance
 * Features: Code splitting, lazy loading, offline support, performance monitoring
 */

import React, { Suspense, lazy, useState, useEffect, useCallback, useMemo } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useMobile } from '../../hooks/useMobile';
import performanceMonitor, { trackPageView, trackUserAction, isMobileDevice, isSlowNetwork } from '../../utils/performanceMonitor';
import { FullPageSkeleton, SkeletonProvider } from '../Common/SkeletonLoaders';
import '../../styles/pwa-emergency-fix.css';
import '../../styles/mobile-arabic.css';

// Lazy-loaded components with code splitting
const MobileLoginScreen = lazy(() =>
  import('./ModernMobileLogin').then(module => {
    trackPageView('mobile-login');
    return module;
  })
);

const MobileDashboard = lazy(() =>
  import('./EnhancedMobileDashboard').then(module => {
    trackPageView('mobile-dashboard');
    return module;
  })
);

const MobilePayments = lazy(() =>
  import('./MobilePayments').then(module => {
    trackPageView('mobile-payments');
    return module;
  })
);

const MobileNotifications = lazy(() =>
  import('./MobileNotifications').then(module => {
    trackPageView('mobile-notifications');
    return module;
  })
);

const MobileProfile = lazy(() =>
  import('./PremiumProfile').then(module => {
    trackPageView('mobile-profile');
    return module;
  })
);

const MobileReports = lazy(() =>
  import('./MobileReports').then(module => {
    trackPageView('mobile-reports');
    return module;
  })
);

const MobileSettings = lazy(() =>
  import('./MobileSettings').then(module => {
    trackPageView('mobile-settings');
    return module;
  })
);

const MobilePWAApp = () => {
  // Apply emergency fix CSS class to root
  React.useEffect(() => {
    document.body.classList.add('pwa-app');
    return () => document.body.classList.remove('pwa-app');
  }, []);

  const navigate = useNavigate();
  const location = useLocation();
  const { device, viewport, applySafeArea } = useMobile();

  // Authentication state
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    user: null,
    loading: true,
    token: null
  });

  // PWA state
  const [pwaState, setPwaState] = useState({
    isOnline: navigator.onLine,
    canInstall: false,
    deferredPrompt: null,
    isInstalled: false,
    updateAvailable: false
  });

  // Performance state
  const [performanceState, setPerformanceState] = useState({
    isSlowNetwork: false,
    batteryOptimized: false,
    preloadEnabled: true
  });

  // Initialize PWA features
  useEffect(() => {
    // Simplified initialization without complex monitoring
    checkAuthentication();
  }, []);

  // Initialize PWA features
  const initializePWA = useCallback(() => {
    // Service Worker registration
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('SW registered:', registration);

          // Check for updates
          registration.addEventListener('updatefound', () => {
            setPwaState(prev => ({ ...prev, updateAvailable: true }));
          });
        })
        .catch(error => console.error('SW registration failed:', error));
    }

    // Install prompt handling
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setPwaState(prev => ({
        ...prev,
        canInstall: true,
        deferredPrompt: e
      }));
    });

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setPwaState(prev => ({ ...prev, isInstalled: true }));
    }

    // Online/offline monitoring
    window.addEventListener('online', () => {
      setPwaState(prev => ({ ...prev, isOnline: true }));
      trackUserAction('network-online');
    });

    window.addEventListener('offline', () => {
      setPwaState(prev => ({ ...prev, isOnline: false }));
      trackUserAction('network-offline');
    });
  }, []);

  // Check authentication status
  const checkAuthentication = useCallback(() => {
    try {
      const token = localStorage.getItem('pwa_token');
      const userData = localStorage.getItem('pwa_user');

      if (token && userData) {
        setAuthState({
          isAuthenticated: true,
          user: JSON.parse(userData),
          loading: false,
          token: token
        });
      } else {
        setAuthState({
          isAuthenticated: false,
          user: null,
          loading: false,
          token: null
        });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthState({
        isAuthenticated: false,
        user: null,
        loading: false,
        token: null
      });
    }
  }, []);

  // Setup performance monitoring
  const setupPerformanceMonitoring = useCallback(() => {
    // Monitor Core Web Vitals specific to mobile
    performanceMonitor.trackEvent('pwa-init', {
      device: device.type,
      viewport: `${viewport.width}x${viewport.height}`,
      isMobile: isMobileDevice(),
      isSlowNetwork: isSlowNetwork()
    });

    // Monitor route changes
    const unlisten = () => {
      trackPageView(location.pathname);
    };

    return unlisten;
  }, [device, viewport, location.pathname]);

  // Setup network monitoring
  const setupNetworkMonitoring = useCallback(() => {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

    if (connection) {
      const checkNetworkSpeed = () => {
        const isSlowConn = connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g';
        setPerformanceState(prev => ({
          ...prev,
          isSlowNetwork: isSlowConn,
          preloadEnabled: !isSlowConn
        }));
      };

      checkNetworkSpeed();
      connection.addEventListener('change', checkNetworkSpeed);

      return () => connection.removeEventListener('change', checkNetworkSpeed);
    }
  }, []);

  // Setup battery optimization
  const setupBatteryOptimization = useCallback(async () => {
    if ('getBattery' in navigator) {
      try {
        const battery = await navigator.getBattery();

        const checkBattery = () => {
          const lowBattery = battery.level < 0.2 && !battery.charging;
          setPerformanceState(prev => ({
            ...prev,
            batteryOptimized: lowBattery,
            preloadEnabled: !lowBattery
          }));
        };

        checkBattery();
        battery.addEventListener('levelchange', checkBattery);
        battery.addEventListener('chargingchange', checkBattery);
      } catch (error) {
        console.warn('Battery API not available:', error);
      }
    }
  }, []);

  // Handle login
  const handleLogin = useCallback(async (credentials) => {
    try {
      trackUserAction('login-attempt', { phone: credentials.phone });

      // Check for test credentials first
      const cleanPhone = credentials.phone.replace(/[\s-]/g, '');
      const isTestUser = (cleanPhone === '0501234567' && credentials.password === 'password123') ||
                         (cleanPhone === '0555555555' && credentials.password === 'password123') ||
                         (cleanPhone === '0512345678' && credentials.password === 'password123');

      if (isTestUser) {
        // Mock successful login for test credentials
        const userData = {
          id: 'test-user-' + cleanPhone,
          name: cleanPhone === '0501234567' ? 'أحمد محمد الشعيل' : 'عضو تجريبي',
          phone: cleanPhone,
          membershipId: cleanPhone === '0501234567' ? 'SH001' : 'SH002',
          avatar: null,
          role: 'member',
          balance: cleanPhone === '0501234567' ? 2500 : 3500,
          minimumBalance: 3000,
          joinDate: '2023-06-15',
          totalPaid: 450
        };

        const token = 'test-token-' + Date.now();

        // Store authentication data
        localStorage.setItem('pwa_token', token);
        localStorage.setItem('pwa_user', JSON.stringify(userData));

        if (credentials.rememberMe) {
          localStorage.setItem('pwa_remember', 'true');
        }

        // Update authentication state
        setAuthState({
          isAuthenticated: true,
          user: userData,
          loading: false,
          token: token
        });

        trackUserAction('login-success', { userId: userData.id });
        navigate('/pwa/dashboard');
        return;
      }

      // Try actual API call for non-test users
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

      const response = await fetch(`${API_URL}/api/auth/mobile-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      if (!response.ok) {
        throw new Error('رقم الهاتف أو كلمة المرور غير صحيحة');
      }

      const data = await response.json();

      if (data.success || data.token) {
        const userData = {
          id: data.user.id,
          name: data.user.name,
          phone: credentials.phone,
          membershipId: data.user.membershipId || 'SH001',
          avatar: data.user.avatar,
          role: data.user.role || 'member'
        };

        // Store authentication data
        localStorage.setItem('pwa_token', data.token);
        localStorage.setItem('pwa_user', JSON.stringify(userData));

        if (credentials.rememberMe) {
          localStorage.setItem('pwa_remember', 'true');
        }

        setAuthState({
          isAuthenticated: true,
          user: userData,
          loading: false,
          token: data.token
        });

        trackUserAction('login-success', { userId: userData.id });
        navigate('/pwa/dashboard');
      } else {
        throw new Error(data.error || 'فشل تسجيل الدخول');
      }
    } catch (error) {
      console.error('Login failed:', error);
      trackUserAction('login-error', { error: error.message });
      throw error;
    }
  }, [navigate]);

  // Handle logout
  const handleLogout = useCallback(() => {
    trackUserAction('logout');

    // Clear authentication data
    localStorage.removeItem('pwa_token');
    localStorage.removeItem('pwa_user');
    localStorage.removeItem('pwa_remember');

    setAuthState({
      isAuthenticated: false,
      user: null,
      loading: false,
      token: null
    });

    navigate('/pwa/login');
  }, [navigate]);

  // Handle PWA installation
  const handleInstallPWA = useCallback(async () => {
    if (pwaState.deferredPrompt) {
      trackUserAction('pwa-install-prompt');

      pwaState.deferredPrompt.prompt();
      const { outcome } = await pwaState.deferredPrompt.userChoice;

      trackUserAction('pwa-install-result', { outcome });

      if (outcome === 'accepted') {
        setPwaState(prev => ({
          ...prev,
          canInstall: false,
          deferredPrompt: null,
          isInstalled: true
        }));
      }
    }
  }, [pwaState.deferredPrompt]);

  // Handle app update
  const handleUpdateApp = useCallback(() => {
    trackUserAction('pwa-update');
    window.location.reload();
  }, []);

  // Optimized route components based on performance
  const OptimizedSuspense = useMemo(() => {
    const fallbackComponent = ({ type = 'dashboard' }) => {
      // Use simpler loading for slow networks/low battery
      if (performanceState.isSlowNetwork || performanceState.batteryOptimized) {
        return (
          <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--pwa-gradient-premium)' }} dir="rtl">
            <div className="text-white text-center pwa-animate-fade-in">
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full pwa-animate-spin mx-auto mb-4"></div>
              <p className="pwa-body">جاري التحميل...</p>
            </div>
          </div>
        );
      }

      return <FullPageSkeleton type={type} />;
    };

    return ({ children, fallback }) => (
      <Suspense fallback={fallback || <fallbackComponent />}>
        {children}
      </Suspense>
    );
  }, [performanceState]);

  // Common props for all pages
  const pageProps = useMemo(() => ({
    user: authState.user,
    isOnline: pwaState.isOnline,
    onLogout: handleLogout,
    device: device,
    viewport: viewport
  }), [authState.user, pwaState.isOnline, handleLogout, device, viewport]);

  // Loading state
  if (authState.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--pwa-gradient-premium)' }} dir="rtl">
        <div className="pwa-glass-card text-center pwa-animate-scale-in" style={{ maxWidth: '320px' }}>
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full pwa-animate-spin mx-auto mb-6" style={{ borderColor: 'var(--pwa-primary-500)', borderTopColor: 'transparent' }}></div>
          <h2 className="pwa-heading-2 mb-2" style={{ color: 'var(--pwa-neutral-900)' }}>آل شعيل</h2>
          <p className="pwa-body-small" style={{ color: 'var(--pwa-neutral-600)' }}>جاري تحضير التطبيق...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pwa-app" dir="rtl">
      {/* PWA Status Bar */}
      {!pwaState.isOnline && (
        <div className="fixed top-0 left-0 right-0 text-white text-center py-3 pwa-body-small pwa-animate-slide-in-down" style={{ background: 'var(--pwa-error)', zIndex: 'var(--pwa-z-max)' }}>
          <div className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21.192 21.192m-5.656-5.656a3 3 0 10-4.243-4.243m4.243 4.243L12.707 12.707m2.829-2.829a3 3 0 00-4.243 0" />
            </svg>
            <span>لا يوجد اتصال بالإنترنت - وضع عدم الاتصال</span>
          </div>
        </div>
      )}

      {pwaState.updateAvailable && (
        <div className="fixed top-0 left-0 right-0 text-white text-center py-3 pwa-body-small pwa-animate-slide-in-down" style={{ background: 'var(--pwa-info)', zIndex: 'var(--pwa-z-max)' }}>
          <div className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5 pwa-animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <button
              onClick={handleUpdateApp}
              className="hover:underline font-medium"
            >
              تحديث متاح - اضغط للتحديث
            </button>
          </div>
        </div>
      )}

      {/* Install Prompt */}
      {pwaState.canInstall && !pwaState.isInstalled && (
        <div className="fixed bottom-20 left-4 right-4 pwa-glass-card pwa-animate-slide-in-up" style={{ zIndex: 'var(--pwa-z-90)', padding: 'var(--pwa-space-5)' }}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="pwa-heading-3 mb-1" style={{ color: 'var(--pwa-neutral-900)' }}>تثبيت التطبيق</h3>
              <p className="pwa-body-small" style={{ color: 'var(--pwa-neutral-600)' }}>للحصول على تجربة أفضل وأداء أسرع</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setPwaState(prev => ({ ...prev, canInstall: false }))}
                className="pwa-btn pwa-btn-glass"
                style={{ padding: 'var(--pwa-space-2) var(--pwa-space-4)' }}
              >
                لاحقاً
              </button>
              <button
                onClick={handleInstallPWA}
                className="pwa-btn pwa-btn-primary pwa-btn-shimmer"
                style={{ padding: 'var(--pwa-space-2) var(--pwa-space-5)' }}
              >
                تثبيت الآن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Routes */}
      <Routes>
        {/* Login Route */}
        <Route
          path="/login"
          element={
            authState.isAuthenticated ? (
              <Navigate to="/pwa/dashboard" replace />
            ) : (
              <OptimizedSuspense fallback={<FullPageSkeleton type="login" />}>
                <MobileLoginScreen onLogin={handleLogin} />
              </OptimizedSuspense>
            )
          }
        />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            authState.isAuthenticated ? (
              <OptimizedSuspense fallback={<FullPageSkeleton type="dashboard" />}>
                <MobileDashboard {...pageProps} />
              </OptimizedSuspense>
            ) : (
              <Navigate to="/pwa/login" replace />
            )
          }
        />

        <Route
          path="/payments"
          element={
            authState.isAuthenticated ? (
              <OptimizedSuspense fallback={<FullPageSkeleton type="list" />}>
                <MobilePayments {...pageProps} />
              </OptimizedSuspense>
            ) : (
              <Navigate to="/pwa/login" replace />
            )
          }
        />

        <Route
          path="/notifications"
          element={
            authState.isAuthenticated ? (
              <OptimizedSuspense fallback={<FullPageSkeleton type="list" />}>
                <MobileNotifications {...pageProps} />
              </OptimizedSuspense>
            ) : (
              <Navigate to="/pwa/login" replace />
            )
          }
        />

        <Route
          path="/reports"
          element={
            authState.isAuthenticated ? (
              <OptimizedSuspense fallback={<FullPageSkeleton type="dashboard" />}>
                <MobileReports {...pageProps} />
              </OptimizedSuspense>
            ) : (
              <Navigate to="/pwa/login" replace />
            )
          }
        />

        <Route
          path="/profile"
          element={
            authState.isAuthenticated ? (
              <OptimizedSuspense fallback={<FullPageSkeleton type="profile" />}>
                <MobileProfile {...pageProps} />
              </OptimizedSuspense>
            ) : (
              <Navigate to="/pwa/login" replace />
            )
          }
        />

        <Route
          path="/settings"
          element={
            authState.isAuthenticated ? (
              <OptimizedSuspense fallback={<FullPageSkeleton type="list" />}>
                <MobileSettings {...pageProps} />
              </OptimizedSuspense>
            ) : (
              <Navigate to="/pwa/login" replace />
            )
          }
        />

        {/* Default redirect */}
        <Route
          path="/"
          element={
            <Navigate
              to={authState.isAuthenticated ? "/pwa/dashboard" : "/pwa/login"}
              replace
            />
          }
        />

        {/* Catch all */}
        <Route
          path="*"
          element={
            <Navigate
              to={authState.isAuthenticated ? "/pwa/dashboard" : "/pwa/login"}
              replace
            />
          }
        />
      </Routes>
    </div>
  );
};

export default MobilePWAApp;