import React from 'react';

/**
 * Enhanced Monitoring Dashboard Component
 * Loads the standalone enhanced monitoring dashboard with full API integration
 */
const EnhancedMonitoringDashboard = () => {
  return (
    <div style={{
      width: '100%',
      height: '100vh',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <iframe
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
