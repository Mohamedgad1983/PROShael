import React, { memo,  useState, useEffect } from 'react';
import './CrisisDashboard.css';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const CrisisDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    // Overall Statistics
    totalMembers: 288,
    compliantMembers: 28,
    nonCompliantMembers: 260,
    complianceRate: 9.7,

    // Financial Statistics
    fundTarget: 864000,
    currentTotal: 387040,
    shortfall: 476960,
    averageBalance: 1344,

    // Member Categories
    categories: {
      zeroBalance: 1,
      veryLow: 116,  // 1-999 SAR
      medium: 143,   // 1000-2999 SAR
      compliant: 28  // 3000+ SAR
    },

    // Tribal Sections Performance
    tribalSections: [
      { name: 'الفخذ الأول', members: 45, compliant: 8, rate: 17.8, total: 68500 },
      { name: 'الفخذ الثاني', members: 38, compliant: 5, rate: 13.2, total: 52000 },
      { name: 'الفخذ الثالث', members: 42, compliant: 4, rate: 9.5, total: 45000 },
      { name: 'الفخذ الرابع', members: 35, compliant: 3, rate: 8.6, total: 38000 },
      { name: 'الفخذ الخامس', members: 33, compliant: 3, rate: 9.1, total: 42000 },
      { name: 'الفخذ السادس', members: 31, compliant: 2, rate: 6.5, total: 35540 },
      { name: 'الفخذ السابع', members: 32, compliant: 2, rate: 6.3, total: 48000 },
      { name: 'الفخذ الثامن', members: 32, compliant: 1, rate: 3.1, total: 58000 }
    ],

    // Recent Activity
    recentPayments: 5,
    lastUpdateTime: new Date().toLocaleString('ar-SA')
  });

  // Pie chart data for compliance
  const compliancePieData = [
    { name: 'ملتزمون', value: dashboardData.compliantMembers, color: '#34c759' },
    { name: 'غير ملتزمين', value: dashboardData.nonCompliantMembers, color: '#ff3b30' }
  ];

  // Bar chart data for member categories
  const categoriesData = [
    { category: 'رصيد صفر', count: dashboardData.categories.zeroBalance, color: '#000000' },
    { category: 'منخفض جداً\n(1-999)', count: dashboardData.categories.veryLow, color: '#ff3b30' },
    { category: 'متوسط\n(1000-2999)', count: dashboardData.categories.medium, color: '#ff9500' },
    { category: 'ملتزم\n(3000+)', count: dashboardData.categories.compliant, color: '#34c759' }
  ];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getComplianceColor = (rate) => {
    if (rate >= 20) return '#34c759';
    if (rate >= 10) return '#ff9500';
    return '#ff3b30';
  };

  return (
    <div className="crisis-dashboard">
      {/* Crisis Alert Header */}
      <div className="crisis-alert">
        <div className="alert-icon-wrapper">
          <svg className="alert-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="alert-content">
          <h1 className="alert-title">تحذير: الصندوق في حالة حرجة</h1>
          <p className="alert-message">
            90.3% من الأعضاء تحت الحد الأدنى المطلوب - يجب اتخاذ إجراء عاجل
          </p>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="metrics-grid">
        {/* Compliance Rate - CRITICAL */}
        <div className="metric-card critical">
          <div className="metric-header">
            <span className="metric-label">نسبة الالتزام</span>
            <span className="metric-badge critical">حرج</span>
          </div>
          <div className="metric-value">
            <span className="value-number">{dashboardData.complianceRate}%</span>
            <span className="value-subtitle">فقط من الأعضاء ملتزمون</span>
          </div>
          <div className="metric-breakdown">
            <span className="breakdown-item green">
              <span className="count">{dashboardData.compliantMembers}</span> ملتزم
            </span>
            <span className="breakdown-item red">
              <span className="count">{dashboardData.nonCompliantMembers}</span> غير ملتزم
            </span>
          </div>
        </div>

        {/* Financial Shortfall */}
        <div className="metric-card warning">
          <div className="metric-header">
            <span className="metric-label">العجز المالي</span>
            <span className="metric-badge warning">عاجل</span>
          </div>
          <div className="metric-value">
            <span className="value-number">{formatCurrency(dashboardData.shortfall)}</span>
            <span className="value-currency">ريال</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: '44.8%' }}></div>
          </div>
          <div className="metric-details">
            <span>المحصل: {formatCurrency(dashboardData.currentTotal)} ريال</span>
            <span>الهدف: {formatCurrency(dashboardData.fundTarget)} ريال</span>
          </div>
        </div>

        {/* Total Members */}
        <div className="metric-card info">
          <div className="metric-header">
            <span className="metric-label">إجمالي الأعضاء</span>
          </div>
          <div className="metric-value">
            <span className="value-number">{dashboardData.totalMembers}</span>
            <span className="value-subtitle">عضو</span>
          </div>
          <div className="metric-details">
            <span>متوسط الرصيد: {formatCurrency(dashboardData.averageBalance)} ريال</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-row">
        {/* Compliance Pie Chart */}
        <div className="chart-card">
          <h3 className="chart-title">توزيع الالتزام</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={compliancePieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.value} (${((entry.value/dashboardData.totalMembers)*100).toFixed(1)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {compliancePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="chart-legend">
              {compliancePieData.map((item, index) => (
                <div key={index} className="legend-item">
                  <span className="legend-color" style={{ backgroundColor: item.color }}></span>
                  <span className="legend-label">{item.name}</span>
                  <span className="legend-value">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Member Categories Bar Chart */}
        <div className="chart-card">
          <h3 className="chart-title">فئات الأعضاء حسب الرصيد</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#007AFF">
                  {categoriesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tribal Sections Performance Table */}
      <div className="sections-card">
        <div className="sections-header">
          <h3 className="sections-title">أداء الأفخاذ الثمانية</h3>
          <span className="sections-subtitle">تحليل الالتزام حسب الفخذ</span>
        </div>
        <div className="sections-table-wrapper">
          <table className="sections-table">
            <thead>
              <tr>
                <th>الفخذ</th>
                <th>عدد الأعضاء</th>
                <th>الملتزمون</th>
                <th>نسبة الالتزام</th>
                <th>إجمالي الأرصدة</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {dashboardData.tribalSections.map((section, index) => (
                <tr key={index} className={section.rate < 10 ? 'critical-row' : ''}>
                  <td className="section-name">{section.name}</td>
                  <td className="text-center">{section.members}</td>
                  <td className="text-center">
                    <span className="compliant-count">{section.compliant}</span>
                  </td>
                  <td className="text-center">
                    <div className="rate-badge" style={{ color: getComplianceColor(section.rate) }}>
                      {section.rate.toFixed(1)}%
                    </div>
                  </td>
                  <td className="text-center">{formatCurrency(section.total)} ريال</td>
                  <td className="text-center">
                    <span className={`status-indicator ${section.rate >= 10 ? 'warning' : 'critical'}`}>
                      {section.rate >= 10 ? 'يحتاج تحسين' : 'حرج'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td><strong>الإجمالي</strong></td>
                <td className="text-center"><strong>{dashboardData.totalMembers}</strong></td>
                <td className="text-center"><strong>{dashboardData.compliantMembers}</strong></td>
                <td className="text-center">
                  <strong style={{ color: '#ff3b30' }}>{dashboardData.complianceRate}%</strong>
                </td>
                <td className="text-center"><strong>{formatCurrency(dashboardData.currentTotal)} ريال</strong></td>
                <td className="text-center">
                  <span className="status-indicator critical">حرج</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Action Required Cards */}
      <div className="action-cards">
        <div className="action-card urgent">
          <div className="action-icon">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="action-content">
            <h4>إجراءات عاجلة مطلوبة</h4>
            <ul className="action-list">
              <li>إرسال تنبيهات عاجلة للأعضاء غير الملتزمين (260 عضو)</li>
              <li>تفعيل حملة جمع الاشتراكات المتأخرة</li>
              <li>متابعة الأعضاء ذوي الرصيد الصفر فوراً</li>
              <li>وضع خطة طوارئ للوصول للحد الأدنى</li>
            </ul>
          </div>
        </div>

        <div className="action-card warning">
          <div className="action-icon">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="action-content">
            <h4>أهداف الأسبوع القادم</h4>
            <ul className="action-list">
              <li>رفع نسبة الالتزام إلى 15% (43 عضو)</li>
              <li>تحصيل 50,000 ريال إضافية</li>
              <li>متابعة 116 عضو في فئة "منخفض جداً"</li>
              <li>تحديث بيانات التواصل لجميع الأعضاء</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="dashboard-footer">
        <div className="footer-stat">
          <span className="footer-label">آخر تحديث:</span>
          <span className="footer-value">{dashboardData.lastUpdateTime}</span>
        </div>
        <div className="footer-stat">
          <span className="footer-label">مدفوعات اليوم:</span>
          <span className="footer-value">{dashboardData.recentPayments}</span>
        </div>
        <div className="footer-stat">
          <span className="footer-label">الهدف الأسبوعي:</span>
          <span className="footer-value">50,000 ريال</span>
        </div>
      </div>
    </div>
  );
};

export default memo(CrisisDashboard);