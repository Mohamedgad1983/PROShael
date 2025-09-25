import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
<<<<<<< HEAD
import { registerServiceWorker, initPerformanceMonitoring } from './utils/performance';

// Initialize performance monitoring
initPerformanceMonitoring();

// Register service worker for caching
registerServiceWorker();
=======
>>>>>>> a5fb1535e6a5072e663226a993218935989cb409

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

<<<<<<< HEAD
// Report web vitals for performance tracking
reportWebVitals((metric) => {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(metric);
  }

  // You can also send to analytics here
  // Example: sendToAnalytics(metric);
});
=======
// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
>>>>>>> a5fb1535e6a5072e663226a993218935989cb409
