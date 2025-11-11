// CRITICAL: Force-include Access Control component
// This import MUST stay at the top to prevent tree-shaking
// DO NOT REMOVE - Required for production builds
import './force-include-access-control';

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { registerServiceWorker, initPerformanceMonitoring } from './utils/performance';

// Initialize performance monitoring
initPerformanceMonitoring();

// FORCE UNREGISTER ALL SERVICE WORKERS - FIXES CACHING BUG (RUNS ONCE)
if ('serviceWorker' in navigator && !sessionStorage.getItem('sw_cleaned')) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister();
      console.log('🗑️ Service worker unregistered to clear cache');
    }
    // Mark as cleaned for this session
    sessionStorage.setItem('sw_cleaned', 'true');
  });
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Report web vitals for performance tracking
reportWebVitals((metric) => {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(metric);
  }

  // You can also send to analytics here
  // Example: sendToAnalytics(metric);
});
