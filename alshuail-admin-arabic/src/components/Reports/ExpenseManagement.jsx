import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import ErrorDisplay from '../Common/ErrorDisplay';
import LoadingSpinner from '../Common/LoadingSpinner';
import ExpenseVoucher from './ExpenseVoucher';
import './ExpenseManagement.css';

const ExpenseManagement = ({ dateFilter, onExpenseChange }) => {
  const { user, token, hasPermission } = useAuth();

  // Check permissions on component mount
  useEffect(() => {
    // Allow access for financial_manager and super_admin roles
    const userRole = user?.role;
    const hasAccess = userRole === 'super_admin' ||
                      userRole === 'financial_manager' ||
                      userRole === 'operational_manager' ||
                      hasPermission('view_finances') ||
                      hasPermission('manage_finances');

    if (!hasAccess) {
      setError({
        message_ar: 'ليس لديك صلاحية لعرض أو إدارة المصروفات',
        retryable: false
      });
    }
  }, [hasPermission, user]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastFetchTime, setLastFetchTime] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showVoucher, setShowVoucher] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [createdExpense, setCreatedExpense] = useState(null);

  const [newExpense, setNewExpense] = useState({
    title_ar: '',
    title_en: '',
    description_ar: '',
    description_en: '',
    amount: '',
    category: '',
    receipt_image: null,
    notes: ''
  });

  const [categories] = useState([
    { value: 'operations', label_ar: 'تشغيلية', label_en: 'Operations' },
    { value: 'activities', label_ar: 'أنشطة', label_en: 'Activities' },
    { value: 'maintenance', label_ar: 'صيانة', label_en: 'Maintenance' },
    { value: 'utilities', label_ar: 'مرافق', label_en: 'Utilities' },
    { value: 'supplies', label_ar: 'مستلزمات', label_en: 'Supplies' },
    { value: 'travel', label_ar: 'سفر', label_en: 'Travel' },
    { value: 'marketing', label_ar: 'تسويق', label_en: 'Marketing' },
    { value: 'other', label_ar: 'أخرى', label_en: 'Other' }
  ]);

  useEffect(() => {
    fetchExpenses();
  }, [dateFilter, statusFilter, categoryFilter, sortBy, sortOrder]);

  const fetchExpenses = useCallback(async (isRetry = false) => {
    // Prevent rapid successive calls
    const now = Date.now();
    if (lastFetchTime && (now - lastFetchTime) < 1000 && !isRetry) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (dateFilter.hijri_month) params.append('hijri_month', dateFilter.hijri_month);
      if (dateFilter.hijri_year) params.append('hijri_year', dateFilter.hijri_year);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      params.append('sort_by', sortBy);
      params.append('sort_order', sortOrder);
      if (searchTerm) params.append('search', searchTerm);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://proshael.onrender.com'}/api/expenses?${params}`, {
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
        setExpenses(data.data?.expenses || data.data || []); // Handle both structures
        setRetryCount(0); // Reset retry count on success
        setLastFetchTime(now);
      } else {
        throw new Error(data.message_ar || 'خطأ في تحميل المصروفات');
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);

      let errorMessage = 'خطأ في الاتصال بالخادم';

      if (error.name === 'AbortError') {
        errorMessage = 'انتهت مهلة الاتصال. يرجى المحاولة مرة أخرى.';
      } else if (error.message.includes('HTTP 401')) {
        errorMessage = 'انتهت صلاحية جلسة العمل. يرجى تسجيل الدخول مرة أخرى.';
      } else if (error.message.includes('HTTP 403')) {
        errorMessage = 'ليس لديك صلاحية لعرض المصروفات.';
      } else if (error.message.includes('HTTP 429')) {
        errorMessage = 'تم تجاوز الحد الأقصى للطلبات. يرجى الانتظار قليلاً.';
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
  }, [dateFilter, statusFilter, categoryFilter, sortBy, sortOrder, searchTerm, token, lastFetchTime]);

  const handleCreateExpense = async (e) => {
    e.preventDefault();

    // Validation
    if (!newExpense.title_ar || !newExpense.amount || !newExpense.category) {
      console.log('Validation failed:', {
        title_ar: newExpense.title_ar,
        amount: newExpense.amount,
        category: newExpense.category
      });
      setError({
        message_ar: 'يرجى ملء جميع الحقول المطلوبة',
        retryable: false
      });
      return;
    }

    // Amount validation
    const amount = parseFloat(newExpense.amount);
    if (isNaN(amount) || amount <= 0) {
      setError({
        message_ar: 'يرجى إدخال مبلغ صحيح',
        retryable: false
      });
      return;
    }

    if (amount > 1000000) {
      setError({
        message_ar: 'المبلغ كبير جداً. يرجى التحقق من القيمة',
        retryable: false
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      Object.keys(newExpense).forEach(key => {
        if (newExpense[key] !== null && newExpense[key] !== '') {
          formData.append(key, newExpense[key]);
        }
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s for file upload

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://proshael.onrender.com'}/api/expenses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        // Store the created expense for voucher
        const newExpenseData = {
          ...newExpense,
          id: data.data?.id || Date.now(),
          created_at: new Date().toISOString(),
          status: 'pending',
          created_by_name: user?.name || 'المستخدم'
        };

        setCreatedExpense(newExpenseData);
        setShowVoucher(true);

        setNewExpense({
          title_ar: '',
          title_en: '',
          description_ar: '',
          description_en: '',
          amount: '',
          category: '',
          receipt_image: null,
          notes: ''
        });
        setShowCreateForm(false);
        fetchExpenses(true);
        onExpenseChange && onExpenseChange();
      } else {
        throw new Error(data.message_ar || 'خطأ في إنشاء المصروف');
      }
    } catch (error) {
      console.error('Error creating expense:', error);

      let errorMessage = 'خطأ في الاتصال بالخادم';

      if (error.name === 'AbortError') {
        errorMessage = 'انتهت مهلة رفع الملف. يرجى المحاولة مرة أخرى.';
      } else if (error.message.includes('HTTP 413')) {
        errorMessage = 'برفق الملف مشعش حجم الصورة كبير جداً.';
      } else if (error.message.includes('HTTP 400')) {
        errorMessage = 'بيانات غير صحيحة. يرجى التحقق من جميع الحقول.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError({
        message_ar: errorMessage,
        originalError: error,
        retryable: !error.message.includes('HTTP 4')
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveExpense = async (expenseId) => {
    if (!expenseId) {
      setError({
        message_ar: 'معرف المصروف غير صحيح',
        retryable: false
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://proshael.onrender.com'}/api/expenses/${expenseId}/approval`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'approved' }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        fetchExpenses(true);
        onExpenseChange && onExpenseChange();
      } else {
        throw new Error(data.message_ar || 'خطأ في الموافقة على المصروف');
      }
    } catch (error) {
      console.error('Error approving expense:', error);

      let errorMessage = 'خطأ في الموافقة على المصروف';

      if (error.name === 'AbortError') {
        errorMessage = 'انتهت مهلة الاتصال. يرجى المحاولة مرة أخرى.';
      } else if (error.message.includes('HTTP 409')) {
        errorMessage = 'لا يمكن الموافقة على هذا المصروف في الوقت الحالي.';
      } else if (error.message.includes('HTTP 404')) {
        errorMessage = 'لم يتم العثور على المصروف. قد يكون محذوفاً.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError({
        message_ar: errorMessage,
        originalError: error,
        retryable: !error.message.includes('HTTP 4') || error.name === 'AbortError'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRejectExpense = async (expenseId, reason) => {
    if (!expenseId) {
      setError({
        message_ar: 'معرف المصروف غير صحيح',
        retryable: false
      });
      return;
    }

    if (!reason || reason.trim().length < 3) {
      setError({
        message_ar: 'يرجى إدخال سبب واضح للرفض',
        retryable: false
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://proshael.onrender.com'}/api/expenses/${expenseId}/approval`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'rejected', rejection_reason: reason.trim() }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        fetchExpenses(true);
        onExpenseChange && onExpenseChange();
      } else {
        throw new Error(data.message_ar || 'خطأ في رفض المصروف');
      }
    } catch (error) {
      console.error('Error rejecting expense:', error);

      let errorMessage = 'خطأ في رفض المصروف';

      if (error.name === 'AbortError') {
        errorMessage = 'انتهت مهلة الاتصال. يرجى المحاولة مرة أخرى.';
      } else if (error.message.includes('HTTP 409')) {
        errorMessage = 'لا يمكن رفض هذا المصروف في الوقت الحالي.';
      } else if (error.message.includes('HTTP 404')) {
        errorMessage = 'لم يتم العثور على المصروف. قد يكون محذوفاً.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError({
        message_ar: errorMessage,
        originalError: error,
        retryable: !error.message.includes('HTTP 4') || error.name === 'AbortError'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'orange';
      case 'approved': return 'green';
      case 'rejected': return 'red';
      default: return 'gray';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'في الانتظار';
      case 'approved': return 'موافق عليه';
      case 'rejected': return 'مرفوض';
      default: return 'غير محدد';
    }
  };

  const formatHijriDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  const formatGregorianDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA');
  };

  return (
    <div className="expense-management" dir="rtl">
      {/* Header */}
      <div className="expense-header glass-morphism">
        <div className="header-actions">
          <h2>إدارة المصروفات</h2>
          {hasPermission('manage_finances') && (
            <button
              className="create-btn hover-lift ripple-effect"
              onClick={() => setShowCreateForm(!showCreateForm)}
              disabled={loading}
            >
              <span className="btn-icon">➕</span>
              إضافة مصروف جديد
            </button>
          )}
          {!hasPermission('manage_finances') && hasPermission('view_finances') && (
            <div className="view-only-notice">
              <span className="notice-icon">👁️</span>
              عرض فقط - لا يمكنك إضافة أو تعديل المصروفات
            </div>
          )}
        </div>

        {/* Filters and Search */}
        <div className="filters-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="البحث في المصروفات..."
              value={searchTerm}
              onChange={(e) => {
                e.stopPropagation();
                setSearchTerm(e.target.value);
              }}
              onFocus={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="search-input"
              autoComplete="off"
              disabled={loading}
            />
            <button className="search-btn" onClick={fetchExpenses} disabled={loading}>
              🔍
            </button>
          </div>

          <div className="filter-controls">
            <select
              value={statusFilter}
              onChange={(e) => {
                e.stopPropagation();
                setStatusFilter(e.target.value);
              }}
              onFocus={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="filter-select"
              disabled={loading}
            >
              <option value="all">جميع الحالات</option>
              <option value="pending">في الانتظار</option>
              <option value="approved">موافق عليه</option>
              <option value="rejected">مرفوض</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => {
                e.stopPropagation();
                setCategoryFilter(e.target.value);
              }}
              onFocus={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="filter-select"
              disabled={loading}
            >
              <option value="all">جميع الفئات</option>
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label_ar}
                </option>
              ))}
            </select>

            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                e.stopPropagation();
                const [field, order] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(order);
              }}
              onFocus={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="filter-select"
              disabled={loading}
            >
              <option value="created_at-desc">الأحدث أولاً</option>
              <option value="created_at-asc">الأقدم أولاً</option>
              <option value="amount-desc">المبلغ (الأعلى)</option>
              <option value="amount-asc">المبلغ (الأقل)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Create Expense Form */}
      {showCreateForm && hasPermission('manage_finances') && (
        <div className="create-expense-form glass-morphism animate-float">
          <form onSubmit={handleCreateExpense}>
            <div className="form-header">
              <h3>إضافة مصروف جديد</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowCreateForm(false)}
              >
                ✕
              </button>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>العنوان (عربي) *</label>
                <input
                  type="text"
                  value={newExpense.title_ar}
                  onChange={(e) => setNewExpense(prev => ({
                    ...prev,
                    title_ar: e.target.value
                  }))}
                  required
                  className="form-input"
                  autoComplete="off"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #ccc',
                    borderRadius: '10px',
                    fontSize: '16px',
                    backgroundColor: 'white',
                    color: 'black',
                    boxSizing: 'border-box',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    appearance: 'none'
                  }}
                />
              </div>

              <div className="form-group">
                <label>العنوان (إنجليزي)</label>
                <input
                  type="text"
                  value={newExpense.title_en}
                  onChange={(e) => setNewExpense(prev => ({
                    ...prev,
                    title_en: e.target.value
                  }))}
                  className="form-input"
                  autoComplete="off"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #ccc',
                    borderRadius: '10px',
                    fontSize: '16px',
                    backgroundColor: 'white',
                    color: 'black',
                    boxSizing: 'border-box',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    appearance: 'none'
                  }}
                />
              </div>

              <div className="form-group">
                <label>المبلغ (ر.س) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1000000"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense(prev => ({
                    ...prev,
                    amount: e.target.value
                  }))}
                  required
                  className="form-input"
                  autoComplete="off"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #ccc',
                    borderRadius: '10px',
                    fontSize: '16px',
                    backgroundColor: 'white',
                    color: 'black',
                    boxSizing: 'border-box',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    appearance: 'none'
                  }}
                />
              </div>

              <div className="form-group">
                <label>الفئة *</label>
                <select
                  value={newExpense.category}
                  onChange={(e) => setNewExpense(prev => ({
                    ...prev,
                    category: e.target.value
                  }))}
                  required
                  className="form-select"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #ccc',
                    borderRadius: '10px',
                    fontSize: '16px',
                    backgroundColor: 'white',
                    color: 'black',
                    boxSizing: 'border-box',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">اختر الفئة</option>
                  {categories.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label_ar}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group full-width">
                <label>الوصف (عربي)</label>
                <textarea
                  value={newExpense.description_ar}
                  onChange={(e) => setNewExpense(prev => ({
                    ...prev,
                    description_ar: e.target.value
                  }))}
                  className="form-textarea"
                  rows="3"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #ccc',
                    borderRadius: '10px',
                    fontSize: '16px',
                    backgroundColor: 'white',
                    color: 'black',
                    boxSizing: 'border-box',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div className="form-group full-width">
                <label>الوصف (إنجليزي)</label>
                <textarea
                  value={newExpense.description_en}
                  onChange={(e) => setNewExpense(prev => ({
                    ...prev,
                    description_en: e.target.value
                  }))}
                  className="form-textarea"
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>صورة الإيصال</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setNewExpense(prev => ({
                    ...prev,
                    receipt_image: e.target.files[0]
                  }))}
                  className="form-file"
                />
              </div>

              <div className="form-group">
                <label>ملاحظات</label>
                <textarea
                  value={newExpense.notes}
                  onChange={(e) => setNewExpense(prev => ({
                    ...prev,
                    notes: e.target.value
                  }))}
                  className="form-textarea"
                  rows="2"
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="submit-btn hover-lift ripple-effect"
                disabled={loading}
              >
                <span className="btn-icon">💾</span>
                حفظ المصروف
              </button>
              <button
                type="button"
                className="cancel-btn hover-lift"
                onClick={() => setShowCreateForm(false)}
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <ErrorDisplay
          error={error}
          onRetry={error.retryable ? () => {
            setRetryCount(prev => prev + 1);
            fetchExpenses(true);
          } : null}
          onDismiss={() => setError(null)}
          title="خطأ في تحميل المصروفات"
          showDetails={process.env.NODE_ENV === 'development'}
        />
      )}

      {/* Expenses List */}
      <div className="expenses-list">
        {loading && (
          <LoadingSpinner
            size="large"
            message={retryCount > 0 ? `إعادة المحاولة ${retryCount}... جاري تحميل المصروفات` : 'جاري تحميل المصروفات...'}
            overlay={true}
          />
        )}

        {!loading && expenses.length === 0 && (
          <div className="empty-state glass-morphism">
            <div className="empty-icon">📝</div>
            <h3>لا توجد مصروفات</h3>
            <p>لم يتم العثور على مصروفات تطابق المعايير المحددة</p>
          </div>
        )}

        {!loading && expenses.length > 0 && (
          <div className="expenses-grid">
            {expenses.map(expense => (
              <div
                key={expense.id}
                className="expense-card glass-morphism hover-lift"
              >
                <div className="expense-header">
                  <div className="expense-title">
                    <h4>{expense.title_ar}</h4>
                    {expense.title_en && (
                      <p className="title-en">{expense.title_en}</p>
                    )}
                  </div>
                  <div className={`expense-status status-${expense.status}`}>
                    <span className="status-indicator" style={{ color: getStatusColor(expense.status) }}>
                      ●
                    </span>
                    {getStatusText(expense.status)}
                  </div>
                </div>

                <div className="expense-details">
                  <div className="expense-amount">
                    <span className="amount-label">المبلغ:</span>
                    <span className="amount-value">
                      {parseFloat(expense.amount).toLocaleString('ar-SA')} ر.س
                    </span>
                  </div>

                  <div className="expense-category">
                    <span className="category-label">الفئة:</span>
                    <span className="category-value">
                      {categories.find(c => c.value === expense.category)?.label_ar || expense.category}
                    </span>
                  </div>

                  <div className="expense-date">
                    <div className="hijri-date">
                      {formatHijriDate(expense.created_at)}
                    </div>
                    <div className="gregorian-date">
                      ({formatGregorianDate(expense.created_at)})
                    </div>
                  </div>

                  {expense.description_ar && (
                    <div className="expense-description">
                      <p>{expense.description_ar}</p>
                    </div>
                  )}

                  {expense.notes && (
                    <div className="expense-notes">
                      <span className="notes-label">ملاحظات:</span>
                      <p>{expense.notes}</p>
                    </div>
                  )}

                  {expense.receipt_image_url && (
                    <div className="expense-receipt">
                      <img
                        src={expense.receipt_image_url}
                        alt="إيصال المصروف"
                        className="receipt-image"
                      />
                    </div>
                  )}
                </div>

                <div className="expense-actions">
                  <button
                    className="voucher-btn hover-lift ripple-effect"
                    onClick={() => {
                      setSelectedExpense(expense);
                      setShowVoucher(true);
                    }}
                    title="عرض السند"
                  >
                    <span className="btn-icon">🧾</span>
                    عرض السند
                  </button>
                  {expense.status === 'pending' && hasPermission('manage_finances') && (
                    <>
                      <button
                        className="approve-btn hover-lift ripple-effect"
                        onClick={() => handleApproveExpense(expense.id)}
                        disabled={loading}
                        title="الموافقة على المصروف"
                      >
                        <span className="btn-icon">✅</span>
                        موافقة
                      </button>
                      <button
                        className="reject-btn hover-lift ripple-effect"
                        onClick={() => {
                          const reason = prompt('سبب الرفض (مطلوب):');
                          if (reason && reason.trim().length >= 3) {
                            handleRejectExpense(expense.id, reason);
                          } else if (reason) {
                            setError({
                              message_ar: 'يرجى إدخال سبب واضح للرفض (3 أحرف على الأقل)',
                              retryable: false
                            });
                          }
                        }}
                        disabled={loading}
                        title="رفض المصروف"
                      >
                        <span className="btn-icon">❌</span>
                        رفض
                      </button>
                    </>
                  )}
                </div>

                {expense.status === 'pending' && !hasPermission('manage_finances') && hasPermission('view_finances') && (
                  <div className="expense-status-notice">
                    <span className="status-icon">⏳</span>
                    في انتظار الموافقة من الإدارة المالية
                  </div>
                )}

                {expense.status === 'rejected' && expense.rejection_reason && (
                  <div className="rejection-reason">
                    <span className="reason-label">سبب الرفض:</span>
                    <p>{expense.rejection_reason}</p>
                  </div>
                )}

                <div className="expense-print-actions">
                  <button
                    className="voucher-btn hover-lift"
                    onClick={() => {
                      setSelectedExpense(expense);
                      setShowVoucher(true);
                    }}
                    title="عرض وطباعة السند"
                  >
                    <span className="btn-icon">🧾</span>
                    سند الصرف
                  </button>
                </div>

                <div className="expense-footer">
                  <span className="created-by">
                    تم إنشاؤه بواسطة: {expense.created_by_name || 'غير محدد'}
                  </span>
                  {expense.approved_by_name && (
                    <span className="approved-by">
                      تمت الموافقة بواسطة: {expense.approved_by_name}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Voucher Modal */}
      {showVoucher && (selectedExpense || createdExpense) && (
        <ExpenseVoucher
          expense={selectedExpense || createdExpense}
          onClose={() => {
            setShowVoucher(false);
            setSelectedExpense(null);
            setCreatedExpense(null);
          }}
        />
      )}
    </div>
  );
};

export default ExpenseManagement;