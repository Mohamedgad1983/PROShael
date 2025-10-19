import React, { memo } from 'react';
import { ExclamationTriangleIcon, BellIcon } from '@heroicons/react/24/outline';

const MemberMonitoringHeader = memo(({ statistics, issueCount, onShowNotifications }) => {
  return (
    <div className="monitoring-header">
      <h1 className="monitoring-title">لوحة مراقبة الأعضاء</h1>

      <div className="header-stats">
        <div className="stat-card">
          <div className="stat-label">إجمالي الأعضاء</div>
          <div className="stat-value">{statistics?.totalMembers || 0}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">الأعضاء النشطون</div>
          <div className="stat-value">{statistics?.activeMembers || 0}</div>
        </div>

        <div className="stat-card warning">
          <div className="stat-label">
            <ExclamationTriangleIcon className="w-5 h-5" />
            مخالفات مالية
          </div>
          <div className="stat-value">{issueCount}</div>
        </div>

        <button
          className="notification-button"
          onClick={onShowNotifications}
          aria-label="عرض الإشعارات"
        >
          <BellIcon className="w-6 h-6" />
          {issueCount > 0 && (
            <span className="notification-badge">{issueCount}</span>
          )}
        </button>
      </div>
    </div>
  );
});

MemberMonitoringHeader.displayName = 'MemberMonitoringHeader';

export default MemberMonitoringHeader;