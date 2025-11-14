import React, { memo,  useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

import { logger } from '../../utils/logger';

const ReportsDashboard = ({ dateFilter, financialSummary, onRefresh }) => {
  const { token } = useAuth();
  const [analytics, setAnalytics] = useState({
    expensesByCategory: [],
    monthlyTrends: [],
    cashFlow: [],
    topContributors: [],
    budgetVariance: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chartType, setChartType] = useState('pie');

  useEffect(() => {
    fetchAnalytics();
  }, [dateFilter]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFilter.hijri_month) params.append('hijri_month', dateFilter.hijri_month);
      if (dateFilter.hijri_year) params.append('hijri_year', dateFilter.hijri_year);

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/financial/analytics?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setAnalytics(data.data);
      } else {
        setError(data.message_ar || 'خطأ في تحميل التحليلات');
      }
    } catch (error) {
      logger.error('Error fetching analytics:', { error });
      setError('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return parseFloat(amount || 0).toLocaleString('ar-SA') + ' ر.س';
  };

  const formatPercentage = (value) => {
    return `${parseFloat(value || 0).toFixed(1)}%`;
  };

  const getCategoryIcon = (category) => {
    const icons = {
      operations: '⚙️',
      activities: '🎯',
      maintenance: '🔧',
      utilities: '💡',
      supplies: '📦',
      travel: '✈️',
      marketing: '📢',
      other: '📝'
    };
    return icons[category] || '📋';
  };

  const getCategoryColor = (category, index) => {
    const colors = [
      '#667eea', '#764ba2', '#f093fb', '#f5576c',
      '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
      '#ffecd2', '#fcb69f', '#a8edea', '#fed6e3'
    ];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <div className="reports-dashboard loading" dir="rtl">
        <div className="loading-state glass-morphism">
          <div className="loading-spinner animate-shimmer"></div>
          <p>جاري تحميل التحليلات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reports-dashboard" dir="rtl">
      {/* Dashboard Header */}
      <div className="dashboard-header glass-morphism">
        <div className="header-content">
          <h2>لوحة التحكم المالية</h2>
          <button
            className="refresh-btn hover-lift ripple-effect"
            onClick={() => {
              fetchAnalytics();
              onRefresh && onRefresh();
            }}
          >
            <span className="btn-icon">🔄</span>
            تحديث البيانات
          </button>
        </div>

        {dateFilter.hijri_month || dateFilter.hijri_year ? (
          <div className="filter-summary">
            <span className="filter-label">تصفية البيانات:</span>
            {dateFilter.hijri_year && (
              <span className="filter-value">السنة الهجرية {dateFilter.hijri_year}</span>
            )}
            {dateFilter.hijri_month && (
              <span className="filter-value">الشهر الهجري {dateFilter.hijri_month}</span>
            )}
          </div>
        ) : (
          <div className="filter-summary">
            <span className="filter-label">عرض جميع البيانات</span>
          </div>
        )}
      </div>

      {error && (
        <div className="error-message glass-morphism">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button
            className="retry-btn hover-lift"
            onClick={() => {
              setError(null);
              fetchAnalytics();
            }}
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Key Metrics Row */}
      <div className="metrics-row">
        <div className="metric-card revenue-metric glass-morphism hover-lift animate-float">
          <div className="metric-icon">💰</div>
          <div className="metric-content">
            <h3>إجمالي الإيرادات</h3>
            <div className="metric-value">
              {formatCurrency(financialSummary.totalRevenue)}
            </div>
            <div className="metric-change positive">
              ↗️ {formatPercentage(financialSummary.monthlyGrowth)}
            </div>
          </div>
        </div>

        <div className="metric-card expenses-metric glass-morphism hover-lift animate-float">
          <div className="metric-icon">💸</div>
          <div className="metric-content">
            <h3>إجمالي المصروفات</h3>
            <div className="metric-value">
              {formatCurrency(financialSummary.totalExpenses)}
            </div>
            <div className="metric-pending">
              ⏳ {financialSummary.pendingExpenses} في الانتظار
            </div>
          </div>
        </div>

        <div className="metric-card profit-metric glass-morphism hover-lift animate-float">
          <div className="metric-icon">💹</div>
          <div className="metric-content">
            <h3>صافي الربح</h3>
            <div className={`metric-value ${financialSummary.netIncome >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(financialSummary.netIncome)}
            </div>
            <div className="metric-margin">
              هامش: {formatPercentage(
                financialSummary.totalRevenue > 0 ?
                (financialSummary.netIncome / financialSummary.totalRevenue) * 100 : 0
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        {/* Expenses by Category */}
        <div className="chart-container glass-morphism">
          <div className="chart-header">
            <h3>المصروفات حسب الفئة</h3>
            <div className="chart-controls">
              <button
                className={`chart-type-btn ${chartType === 'pie' ? 'active' : ''}`}
                onClick={() => setChartType('pie')}
              >
                🥧 دائري
              </button>
              <button
                className={`chart-type-btn ${chartType === 'bar' ? 'active' : ''}`}
                onClick={() => setChartType('bar')}
              >
                📊 أعمدة
              </button>
            </div>
          </div>

          {analytics.expensesByCategory && analytics.expensesByCategory.length > 0 ? (
            <div className="chart-content">
              {chartType === 'pie' ? (
                <div className="pie-chart">
                  <div className="pie-chart-visual">
                    {analytics.expensesByCategory.map((item, index) => {
                      const total = analytics.expensesByCategory.reduce((sum, cat) => sum + parseFloat(cat.total_amount), 0);
                      const percentage = (parseFloat(item.total_amount) / total) * 100;
                      const rotation = analytics.expensesByCategory
                        .slice(0, index)
                        .reduce((sum, cat) => sum + (parseFloat(cat.total_amount) / total) * 360, 0);

                      return (
                        <div
                          key={item.category}
                          className="pie-slice"
                          style={{
                            '--percentage': percentage,
                            '--rotation': rotation,
                            '--color': getCategoryColor(item.category, index)
                          }}
                        />
                      );
                    })}
                  </div>
                  <div className="pie-legend">
                    {analytics.expensesByCategory.map((item, index) => (
                      <div key={item.category} className="legend-item">
                        <div
                          className="legend-color"
                          style={{ backgroundColor: getCategoryColor(item.category, index) }}
                        />
                        <span className="legend-label">
                          {getCategoryIcon(item.category)} {item.category_name_ar}
                        </span>
                        <span className="legend-value">
                          {formatCurrency(item.total_amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bar-chart">
                  {analytics.expensesByCategory.map((item, index) => {
                    const maxAmount = Math.max(...analytics.expensesByCategory.map(cat => parseFloat(cat.total_amount)));
                    const percentage = (parseFloat(item.total_amount) / maxAmount) * 100;

                    return (
                      <div key={item.category} className="bar-item">
                        <div className="bar-label">
                          {getCategoryIcon(item.category)} {item.category_name_ar}
                        </div>
                        <div className="bar-visual">
                          <div
                            className="bar-fill"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: getCategoryColor(item.category, index)
                            }}
                          />
                        </div>
                        <div className="bar-value">
                          {formatCurrency(item.total_amount)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="chart-empty">
              <div className="empty-icon">📊</div>
              <p>لا توجد بيانات مصروفات للعرض</p>
            </div>
          )}
        </div>

        {/* Monthly Trends */}
        <div className="chart-container glass-morphism">
          <h3>الاتجاهات الشهرية</h3>
          {analytics.monthlyTrends && analytics.monthlyTrends.length > 0 ? (
            <div className="trends-chart">
              {analytics.monthlyTrends.map((trend, index) => (
                <div key={trend.month} className="trend-item">
                  <div className="trend-month">{trend.month_name_ar}</div>
                  <div className="trend-values">
                    <div className="trend-revenue">
                      <span className="trend-label">إيرادات:</span>
                      <span className="trend-value revenue">
                        {formatCurrency(trend.total_revenue)}
                      </span>
                    </div>
                    <div className="trend-expenses">
                      <span className="trend-label">مصروفات:</span>
                      <span className="trend-value expenses">
                        {formatCurrency(trend.total_expenses)}
                      </span>
                    </div>
                    <div className="trend-net">
                      <span className="trend-label">صافي:</span>
                      <span className={`trend-value ${trend.net_income >= 0 ? 'positive' : 'negative'}`}>
                        {formatCurrency(trend.net_income)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="chart-empty">
              <div className="empty-icon">📈</div>
              <p>لا توجد بيانات اتجاهات للعرض</p>
            </div>
          )}
        </div>
      </div>

      {/* Additional Analytics */}
      <div className="analytics-grid">
        {/* Top Contributors */}
        <div className="analytics-card glass-morphism">
          <h3>أعلى المساهمين</h3>
          {analytics.topContributors && analytics.topContributors.length > 0 ? (
            <div className="contributors-list">
              {analytics.topContributors.map((contributor, index) => (
                <div key={contributor.member_id} className="contributor-item">
                  <div className="contributor-rank">#{index + 1}</div>
                  <div className="contributor-info">
                    <div className="contributor-name">{contributor.member_name}</div>
                    <div className="contributor-amount">
                      {formatCurrency(contributor.total_contribution)}
                    </div>
                  </div>
                  <div className="contributor-badge">
                    {index === 0 && '🥇'}
                    {index === 1 && '🥈'}
                    {index === 2 && '🥉'}
                    {index > 2 && '⭐'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-contributors">
              <div className="empty-icon">👥</div>
              <p>لا توجد بيانات مساهمين</p>
            </div>
          )}
        </div>

        {/* Budget Variance */}
        <div className="analytics-card glass-morphism">
          <h3>انحراف الميزانية</h3>
          {analytics.budgetVariance && analytics.budgetVariance.length > 0 ? (
            <div className="variance-list">
              {analytics.budgetVariance.map((item) => (
                <div key={item.category} className="variance-item">
                  <div className="variance-category">
                    {getCategoryIcon(item.category)} {item.category_name_ar}
                  </div>
                  <div className="variance-amounts">
                    <div className="budgeted">
                      مخطط: {formatCurrency(item.budgeted_amount)}
                    </div>
                    <div className="actual">
                      فعلي: {formatCurrency(item.actual_amount)}
                    </div>
                    <div className={`variance ${item.variance >= 0 ? 'positive' : 'negative'}`}>
                      {item.variance >= 0 ? '↗️' : '↘️'} {formatCurrency(Math.abs(item.variance))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-variance">
              <div className="empty-icon">📊</div>
              <p>لا توجد بيانات ميزانية</p>
            </div>
          )}
        </div>

        {/* Cash Flow Summary */}
        <div className="analytics-card cash-flow-card glass-morphism">
          <h3>ملخص التدفق النقدي</h3>
          <div className="cash-flow-summary">
            <div className="cash-flow-item inflow">
              <div className="flow-icon">💰</div>
              <div className="flow-content">
                <div className="flow-label">التدفق الداخل</div>
                <div className="flow-amount positive">
                  {formatCurrency(financialSummary.totalRevenue)}
                </div>
              </div>
            </div>

            <div className="cash-flow-item outflow">
              <div className="flow-icon">💸</div>
              <div className="flow-content">
                <div className="flow-label">التدفق الخارج</div>
                <div className="flow-amount negative">
                  {formatCurrency(financialSummary.totalExpenses)}
                </div>
              </div>
            </div>

            <div className="cash-flow-item net">
              <div className="flow-icon">📊</div>
              <div className="flow-content">
                <div className="flow-label">صافي التدفق</div>
                <div className={`flow-amount ${financialSummary.netIncome >= 0 ? 'positive' : 'negative'}`}>
                  {formatCurrency(financialSummary.netIncome)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions glass-morphism">
        <h3>إجراءات سريعة</h3>
        <div className="actions-grid">
          <button className="action-btn hover-lift ripple-effect">
            <span className="action-icon">📊</span>
            <span className="action-label">تصدير تقرير شامل</span>
          </button>
          <button className="action-btn hover-lift ripple-effect">
            <span className="action-icon">📧</span>
            <span className="action-label">إرسال تقرير بالبريد</span>
          </button>
          <button className="action-btn hover-lift ripple-effect">
            <span className="action-icon">📅</span>
            <span className="action-label">جدولة تقرير دوري</span>
          </button>
          <button className="action-btn hover-lift ripple-effect">
            <span className="action-icon">⚙️</span>
            <span className="action-label">إعدادات التقارير</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default memo(ReportsDashboard);