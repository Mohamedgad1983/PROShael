import React from 'react';
import './VisualAlertSystem.css';

// Visual Alert Component for Member Balance Status
const VisualAlertSystem = ({ balance, memberName, memberId }) => {
  const minimumBalance = 3000;

  // Determine alert level and styling
  const getAlertConfig = () => {
    if (balance === 0) {
      return {
        level: 'ZERO_BALANCE',
        color: '#991B1B',
        bgColor: 'rgba(153, 27, 27, 0.1)',
        borderColor: '#DC2626',
        icon: '🚨',
        message: 'رصيد صفر - يجب السداد فوراً',
        pulseAnimation: true
      };
    } else if (balance < 1000) {
      return {
        level: 'CRITICAL',
        color: '#DC2626',
        bgColor: 'rgba(220, 38, 38, 0.1)',
        borderColor: '#EF4444',
        icon: '⚠️',
        message: `رصيد حرج - ${balance} ريال فقط`,
        pulseAnimation: true
      };
    } else if (balance < 3000) {
      return {
        level: 'WARNING',
        color: '#F59E0B',
        bgColor: 'rgba(245, 158, 11, 0.1)',
        borderColor: '#FBBF24',
        icon: '⚡',
        message: `أقل من الحد الأدنى - نقص ${3000 - balance} ريال`,
        pulseAnimation: false
      };
    } else {
      return {
        level: 'SUFFICIENT',
        color: '#10B981',
        bgColor: 'rgba(16, 185, 129, 0.1)',
        borderColor: '#34D399',
        icon: '✅',
        message: 'الرصيد كافي',
        pulseAnimation: false
      };
    }
  };

  const alertConfig = getAlertConfig();
  const percentageComplete = Math.min(100, (balance / minimumBalance) * 100);

  return (
    <div
      className={`visual-alert-container ${alertConfig.level.toLowerCase()} ${alertConfig.pulseAnimation ? 'pulse' : ''}`}
      style={{
        backgroundColor: alertConfig.bgColor,
        borderColor: alertConfig.borderColor
      }}
    >
      {/* Alert Header */}
      <div className="alert-header">
        <span className="alert-icon" style={{ color: alertConfig.color }}>
          {alertConfig.icon}
        </span>
        <div className="alert-info">
          <h3 className="member-name">{memberName}</h3>
          <span className="member-id">رقم العضوية: {memberId}</span>
        </div>
      </div>

      {/* Balance Display */}
      <div className="balance-section">
        <div className="balance-amount" style={{ color: alertConfig.color }}>
          <span className="amount">{new Intl.NumberFormat('ar-SA').format(balance)}</span>
          <span className="currency">ريال</span>
        </div>
        <div className="balance-status">
          {alertConfig.message}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-section">
        <div className="progress-header">
          <span>التقدم نحو الحد الأدنى</span>
          <span className="percentage">{percentageComplete.toFixed(1)}%</span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${percentageComplete}%`,
              backgroundColor: alertConfig.color
            }}
          />
        </div>
        <div className="progress-labels">
          <span>0 ريال</span>
          <span className="target">3000 ريال</span>
        </div>
      </div>

      {/* Action Button for Critical Cases */}
      {alertConfig.level !== 'SUFFICIENT' && (
        <div className="alert-actions">
          <button className="action-btn send-reminder" style={{ borderColor: alertConfig.color }}>
            <span>📧</span>
            إرسال تذكير
          </button>
          <button className="action-btn view-statement" style={{ borderColor: alertConfig.color }}>
            <span>📄</span>
            عرض الكشف
          </button>
        </div>
      )}

      {/* Animated Border for Critical Alerts */}
      {alertConfig.pulseAnimation && (
        <div className="animated-border" style={{ borderColor: alertConfig.color }} />
      )}
    </div>
  );
};

// Alert Summary Card Component
export const AlertSummaryCard = ({ statistics }) => {
  const { totalMembers, compliantMembers, nonCompliantMembers } = statistics;
  const complianceRate = totalMembers > 0 ? (compliantMembers / totalMembers) * 100 : 0;

  return (
    <div className="alert-summary-card">
      <h2 className="summary-title">
        <span className="icon">📊</span>
        ملخص التنبيهات المالية
      </h2>

      <div className="summary-stats">
        <div className="stat-item critical">
          <div className="stat-icon">🚨</div>
          <div className="stat-details">
            <span className="stat-label">حالات حرجة</span>
            <span className="stat-value">{statistics.criticalCount || 0}</span>
          </div>
        </div>

        <div className="stat-item warning">
          <div className="stat-icon">⚡</div>
          <div className="stat-details">
            <span className="stat-label">تحذيرات</span>
            <span className="stat-value">{statistics.warningCount || 0}</span>
          </div>
        </div>

        <div className="stat-item sufficient">
          <div className="stat-icon">✅</div>
          <div className="stat-details">
            <span className="stat-label">أرصدة كافية</span>
            <span className="stat-value">{compliantMembers}</span>
          </div>
        </div>
      </div>

      <div className="compliance-meter">
        <div className="meter-header">
          <span>نسبة الالتزام</span>
          <span className="rate">{complianceRate.toFixed(1)}%</span>
        </div>
        <div className="meter-bar">
          <div
            className="meter-fill"
            style={{
              width: `${complianceRate}%`,
              backgroundColor: complianceRate >= 70 ? '#10B981' : complianceRate >= 50 ? '#F59E0B' : '#DC2626'
            }}
          />
        </div>
      </div>
    </div>
  );
};

// Mini Alert Badge Component (for use in tables/lists)
export const AlertBadge = ({ balance }) => {
  const minimumBalance = 3000;

  const getBadgeConfig = () => {
    if (balance === 0) {
      return { text: 'صفر', color: '#991B1B', bg: '#FEE2E2' };
    } else if (balance < 1000) {
      return { text: 'حرج', color: '#DC2626', bg: '#FEE2E2' };
    } else if (balance < minimumBalance) {
      return { text: 'تحذير', color: '#F59E0B', bg: '#FEF3C7' };
    } else {
      return { text: 'كافي', color: '#10B981', bg: '#D1FAE5' };
    }
  };

  const config = getBadgeConfig();

  return (
    <span
      className="alert-badge"
      style={{
        color: config.color,
        backgroundColor: config.bg,
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600'
      }}
    >
      {config.text}
    </span>
  );
};

export default VisualAlertSystem;