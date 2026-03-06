import React, { memo,  useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import HijriDateFilter from '../Common/HijriDateFilter';
import ExpenseManagement from './ExpenseManagement';
import ReportsDashboard from './ReportsDashboard';
import ErrorDisplay from '../Common/ErrorDisplay';
import LoadingSpinner from '../Common/LoadingSpinner';
import { logger } from '../../utils/logger';

import './FinancialReports.css';

const FinancialReports = () => {
  // Use auth context with proper error handling
  const { user, token, hasPermission } = useAuth();

  // Verify authentication is available
  if (!user || !token) {
    return (
      <div className="financial-reports-container" dir="rtl">
        <div className="access-denied glass-morphism">
          <div className="access-denied-icon">🔒</div>
          <h2>مطلوب تسجيل الدخول</h2>
          <p>يرجى تسجيل الدخول للوصول إلى التقارير المالية</p>
        </div>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState('dashboard');
  const [dateFilter, setDateFilter] = useState({
    hijri_month: null,
    hijri_year: null
  });
  const [loading, setLoading] = useState(false);
  const [financialSummary, setFinancialSummary] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netIncome: 0,
    pendingExpenses: 0,
    monthlyGrowth: 0
  });
  const [error, setError] = useState(null);

  // Check if user has financial management permissions
  useEffect(() => {
    if (!hasPermission('manage_finances') && !hasPermission('view_finances')) {
      setError('ليس لديك صلاحية للوصول إلى التقارير المالية');
    }
  }, [user, hasPermission]);

  // Fetch financial summary when component mounts or date filter changes
  useEffect(() => {
    if (hasPermission('view_finances') || hasPermission('manage_finances')) {
      fetchFinancialSummary();
    }
  }, [dateFilter, hasPermission]);

  const fetchFinancialSummary = useCallback(async (isRetry = false) => {
    setLoading(true);
    if (!isRetry) {
      setError(null);
    }

    try {
      const params = new URLSearchParams();
      if (dateFilter.hijri_month) {
        params.append('hijri_month', dateFilter.hijri_month);
      }
      if (dateFilter.hijri_year) {
        params.append('hijri_year', dateFilter.hijri_year);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/reports/financial-summary?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setFinancialSummary(data.data || {
          totalRevenue: 0,
          totalExpenses: 0,
          netIncome: 0,
          pendingExpenses: 0,
          monthlyGrowth: 0
        });
      } else {
        throw new Error(data.message_ar || 'خطأ في تحميل البيانات المالية');
      }
    } catch (error) {
      logger.error('Error fetching financial summary:', { error });

      let errorMessage = 'خطأ في الاتصال بالخادم';

      if (error.name === 'AbortError') {
        errorMessage = 'انتهت مهلة الاتصال. يرجى المحاولة مرة أخرى.';
      } else if (error.message.includes('HTTP 401')) {
        errorMessage = 'انتهت صلاحية جلسة العمل. يرجى تسجيل الدخول مرة أخرى.';
      } else if (error.message.includes('HTTP 403')) {
        errorMessage = 'ليس لديك صلاحية لعرض التقارير المالية.';
      } else if (error.message.includes('HTTP 5')) {
        errorMessage = 'خطأ في الخادم. يرجى المحاولة لاحقاً.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError({
        message_ar: errorMessage,
        originalError: error,
        retryable: !error.message.includes('HTTP 401') && !error.message.includes('HTTP 403')
      });
    } finally {
      setLoading(false);
    }
  }, [dateFilter, token, hasPermission]);

  const handleDateFilterChange = (filter) => {
    setDateFilter(prevFilter => ({
      ...prevFilter,
      ...filter
    }));
  };

  const exportToExcel = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateFilter.hijri_month) {
        params.append('hijri_month', dateFilter.hijri_month);
      }
      if (dateFilter.hijri_year) {
        params.append('hijri_year', dateFilter.hijri_year);
      }
      params.append('format', 'excel');

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/reports/forensic?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `financial-report-${Date.now()}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setError('خطأ في تصدير التقرير');
      }
    } catch (error) {
      logger.error('Error exporting to Excel:', { error });
      setError('خطأ في تصدير التقرير');
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateFilter.hijri_month) {
        params.append('hijri_month', dateFilter.hijri_month);
      }
      if (dateFilter.hijri_year) {
        params.append('hijri_year', dateFilter.hijri_year);
      }
      params.append('format', 'pdf');

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/reports/forensic?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `financial-report-${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setError('خطأ في تصدير التقرير');
      }
    } catch (error) {
      logger.error('Error exporting to PDF:', { error });
      setError('خطأ في تصدير التقرير');
    } finally {
      setLoading(false);
    }
  };

  if (error && !hasPermission('view_finances') && !hasPermission('manage_finances')) {
    return (
      <div className="financial-reports-container" dir="rtl">
        <div className="access-denied glass-morphism">
          <div className="access-denied-icon">🔒</div>
          <h2>غير مصرح لك بالوصول</h2>
          <p>{error}</p>
          <p>يرجى التواصل مع المدير للحصول على الصلاحيات المطلوبة</p>
        </div>
      </div>
    );
  }

  return (
    <div className="financial-reports-container" dir="rtl">
      {/* Header */}
      <div className="financial-header glass-morphism-intense">
        <div className="header-content">
          <div className="header-text">
            <h1 className="text-gradient">التقارير المالية</h1>
            <p>إدارة شاملة للمالية والمصروفات</p>
          </div>
          <div className="header-actions">
            <button
              className="export-btn excel-btn hover-lift ripple-effect"
              onClick={exportToExcel}
              disabled={loading}
            >
              <span className="btn-icon">📊</span>
              تصدير Excel
            </button>
            <button
              className="export-btn pdf-btn hover-lift ripple-effect"
              onClick={exportToPDF}
              disabled={loading}
            >
              <span className="btn-icon">📄</span>
              تصدير PDF
            </button>
          </div>
        </div>
      </div>

      {/* Date Filter */}
      <div className="date-filter-section glass-morphism">
        <HijriDateFilter
          onFilterChange={handleDateFilterChange}
          selectedMonth={dateFilter.hijri_month}
          selectedYear={dateFilter.hijri_year}
        />
      </div>

      {/* Financial Summary Cards */}
      <div className="financial-summary-cards">
        <div className="summary-card revenue-card glass-morphism hover-lift animate-float">
          <div className="card-icon">💰</div>
          <div className="card-content">
            <h3>إجمالي الإيرادات</h3>
            <div className="amount">{financialSummary.totalRevenue?.toLocaleString('en-US')} ر.س</div>
            <div className={`growth ${financialSummary.monthlyGrowth >= 0 ? 'positive' : 'negative'}`}>
              {financialSummary.monthlyGrowth >= 0 ? '📈' : '📉'}
              {Math.abs(financialSummary.monthlyGrowth)}% هذا الشهر
            </div>
          </div>
        </div>

        <div className="summary-card expenses-card glass-morphism hover-lift animate-float">
          <div className="card-icon">💸</div>
          <div className="card-content">
            <h3>إجمالي المصروفات</h3>
            <div className="amount">{financialSummary.totalExpenses?.toLocaleString('en-US')} ر.س</div>
            <div className="expenses-breakdown">
              <span className="pending-count">{financialSummary.pendingExpenses} في الانتظار</span>
            </div>
          </div>
        </div>

        <div className="summary-card net-income-card glass-morphism hover-lift animate-float">
          <div className="card-icon">💹</div>
          <div className="card-content">
            <h3>صافي الدخل</h3>
            <div className={`amount ${financialSummary.netIncome >= 0 ? 'positive' : 'negative'}`}>
              {financialSummary.netIncome?.toLocaleString('en-US')} ر.س
            </div>
            <div className="profit-margin">
              هامش الربح: {financialSummary.totalRevenue > 0 ?
                ((financialSummary.netIncome / financialSummary.totalRevenue) * 100).toFixed(1) : 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="nav-tabs glass-morphism">
        <button
          className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''} hover-glow ripple-effect`}
          onClick={() => setActiveTab('dashboard')}
          title="عرض الملخص المالي والإحصائيات"
        >
          <span className="tab-icon">📊</span>
          لوحة التحكم
        </button>
        {(hasPermission('manage_finances') || hasPermission('view_finances')) && (
          <button
            className={`tab-btn ${activeTab === 'expenses' ? 'active' : ''} hover-glow ripple-effect`}
            onClick={() => setActiveTab('expenses')}
            title={hasPermission('manage_finances') ? 'إدارة وموافقة المصروفات' : 'عرض المصروفات فقط'}
          >
            <span className="tab-icon">💼</span>
            {hasPermission('manage_finances') ? 'إدارة المصروفات' : 'المصروفات'}
          </button>
        )}
        {hasPermission('view_finances') && (
          <button
            className={`tab-btn ${activeTab === 'reports' ? 'active' : ''} hover-glow ripple-effect`}
            onClick={() => setActiveTab('reports')}
            title="عرض التقارير التفصيلية والتحليلات"
          >
            <span className="tab-icon">📈</span>
            التقارير التفصيلية
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {loading && (
          <LoadingSpinner
            size="large"
            message="جاري تحميل التقارير المالية..."
            overlay={true}
          />
        )}

        {error && (
          <ErrorDisplay
            error={error}
            onRetry={error.retryable ? () => fetchFinancialSummary(true) : null}
            onDismiss={() => setError(null)}
            title="خطأ في تحميل التقارير"
            showDetails={process.env.NODE_ENV === 'development'}
          />
        )}

        {!loading && !error && (
          <>
            {activeTab === 'dashboard' && (
              <ReportsDashboard
                dateFilter={dateFilter}
                financialSummary={financialSummary}
                onRefresh={fetchFinancialSummary}
              />
            )}

            {activeTab === 'expenses' && (hasPermission('manage_finances') || hasPermission('view_finances')) && (
              <ExpenseManagement
                dateFilter={dateFilter}
                onExpenseChange={fetchFinancialSummary}
              />
            )}

            {activeTab === 'reports' && hasPermission('view_finances') && (
              <div className="detailed-reports glass-morphism">
                <h3>التقارير التفصيلية</h3>
                <div className="reports-content">
                  <div className="report-section">
                    <h4>📊 تقارير الفئات</h4>
                    <p>تحليل المصروفات والإيرادات حسب الفئات المختلفة</p>
                    <button className="generate-report-btn" disabled>
                      قريباً... تحليل الفئات
                    </button>
                  </div>

                  <div className="report-section">
                    <h4>📈 التقارير الشهرية</h4>
                    <p>مقارنة الأداء المالي عبر الأشهر المختلفة</p>
                    <button className="generate-report-btn" disabled>
                      قريباً... التحليل الشهري
                    </button>
                  </div>

                  <div className="report-section">
                    <h4>💰 تقارير التدفق النقدي</h4>
                    <p>تتبع التدفقات النقدية الداخلة والخارجة</p>
                    <button className="generate-report-btn" disabled>
                      قريباً... تحليل التدفق النقدي
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default memo(FinancialReports);