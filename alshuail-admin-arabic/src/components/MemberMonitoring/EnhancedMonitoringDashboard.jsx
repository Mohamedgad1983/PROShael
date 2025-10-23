import React, { useEffect, useRef } from 'react';

/**
 * Enhanced Monitoring Dashboard Component
 * Loads the standalone enhanced monitoring dashboard with full API integration
 * Passes authentication token to iframe using postMessage
 */
const EnhancedMonitoringDashboard = () => {
  const iframeRef = useRef(null);

  useEffect(() => {
    // Send token to iframe when it loads
    const handleIframeLoad = () => {
      const token = localStorage.getItem('token');
      if (token && iframeRef.current) {
        iframeRef.current.contentWindow.postMessage(
          { type: 'AUTH_TOKEN', token },
          window.location.origin
        );
      }
    };

    const iframe = iframeRef.current;
    if (iframe) {
      iframe.addEventListener('load', handleIframeLoad);
      return () => iframe.removeEventListener('load', handleIframeLoad);
    }
  }, []);

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <iframe
        ref={iframeRef}
        src="/monitoring-standalone/index.html"
        title="Enhanced Member Monitoring Dashboard"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block'
        }}
        allow="fullscreen"
      />
    </div>
  );
};

export default EnhancedMonitoringDashboard;
