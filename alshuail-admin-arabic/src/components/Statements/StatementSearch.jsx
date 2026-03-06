import React, { memo,  useState } from 'react';
import VisualAlertSystem, { AlertBadge } from './VisualAlertSystem';
import { logger } from '../../utils/logger';

import './StatementSearch.css';

const StatementSearch = () => {
  const [searchType, setSearchType] = useState('phone'); // phone, name, memberId
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [error, setError] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || 'https://api.alshailfund.com';

  // Handle search
  const handleSearch = async () => {
    if (!searchValue.trim()) {
      setError('الرجاء إدخال قيمة للبحث');
      return;
    }

    setLoading(true);
    setError(null);
    setSearchResults(null);

    try {
      let endpoint = '';
      const params = new URLSearchParams();

      switch (searchType) {
        case 'phone':
          endpoint = '/api/statements/search/phone';
          params.append('phone', searchValue);
          break;
        case 'name':
          endpoint = '/api/statements/search/name';
          params.append('name', searchValue);
          break;
        case 'memberId':
          endpoint = '/api/statements/search/member-id';
          params.append('memberId', searchValue);
          break;
        default:
          throw new Error('نوع بحث غير صحيح');
      }

      const response = await fetch(`${API_URL}${endpoint}?${params}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'خطأ في البحث');
      }

      // Handle single or multiple results
      const results = Array.isArray(data.data) ? data.data : [data.data];
      setSearchResults(results);

    } catch (err) {
      logger.error('Search error:', { err });
      setError(err.message || 'حدث خطأ أثناء البحث');
    } finally {
      setLoading(false);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'غير محدد';
    return new Date(dateString).toLocaleDateString('ar-SA');
  };

  return (
    <div className="statement-search-container">
      {/* Search Header */}
      <div className="search-header">
        <h1 className="page-title">
          <span className="icon">🔍</span>
          البحث عن كشف حساب العضو
        </h1>
        <p className="page-subtitle">
          ابحث عن كشف الحساب باستخدام رقم الهاتف، الاسم، أو رقم العضوية
        </p>
      </div>

      {/* Search Form */}
      <div className="search-form-card">
        <div className="search-type-selector">
          <button
            className={`type-btn ${searchType === 'phone' ? 'active' : ''}`}
            onClick={() => setSearchType('phone')}
          >
            📱 رقم الهاتف
          </button>
          <button
            className={`type-btn ${searchType === 'name' ? 'active' : ''}`}
            onClick={() => setSearchType('name')}
          >
            👤 الاسم
          </button>
          <button
            className={`type-btn ${searchType === 'memberId' ? 'active' : ''}`}
            onClick={() => setSearchType('memberId')}
          >
            🆔 رقم العضوية
          </button>
        </div>

        <div className="search-input-group">
          <input
            type="text"
            className="search-input"
            placeholder={
              searchType === 'phone' ? 'أدخل رقم الهاتف (مثال: 0501234567)' :
              searchType === 'name' ? 'أدخل الاسم (3 أحرف على الأقل)' :
              'أدخل رقم العضوية (مثال: SH-10001)'
            }
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyPress={handleKeyPress}
            dir="rtl"
          />
          <button
            className="search-button"
            onClick={handleSearch}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                جاري البحث...
              </>
            ) : (
              <>
                <span>🔍</span>
                بحث
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}
      </div>

      {/* Search Results */}
      {searchResults && searchResults.length > 0 && (
        <div className="search-results">
          <h2 className="results-title">
            نتائج البحث ({searchResults.length} عضو)
          </h2>

          {searchResults.map((member, index) => (
            <div key={index} className="result-card">
              {/* Visual Alert System */}
              <VisualAlertSystem
                balance={member.currentBalance}
                memberName={member.fullName}
                memberId={member.memberId}
              />

              {/* Statement Details */}
              <div className="statement-details">
                <h3 className="details-title">تفاصيل الكشف</h3>

                <div className="details-grid">
                  <div className="detail-item">
                    <span className="detail-label">رقم الهاتف:</span>
                    <span className="detail-value">{member.phone}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">تاريخ الانضمام:</span>
                    <span className="detail-value">{formatDate(member.memberSince)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">إجمالي المدفوعات:</span>
                    <span className="detail-value">{member.statistics?.totalPayments || 0}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">آخر دفعة:</span>
                    <span className="detail-value">{formatDate(member.statistics?.lastPaymentDate)}</span>
                  </div>
                </div>

                {/* Subscription Info */}
                {member.subscription && (
                  <div className="subscription-info">
                    <h4>معلومات الاشتراك</h4>
                    <div className="subscription-details">
                      <span>النوع: {member.subscription.type}</span>
                      <span>المبلغ: {member.subscription.amount} ريال</span>
                      <span>الحالة: <AlertBadge balance={member.currentBalance} /></span>
                    </div>
                  </div>
                )}

                {/* Recent Transactions */}
                {member.recentTransactions && member.recentTransactions.length > 0 && (
                  <div className="transactions-section">
                    <h4>آخر العمليات</h4>
                    <div className="transactions-list">
                      {member.recentTransactions.slice(0, 5).map((transaction, idx) => (
                        <div key={idx} className="transaction-item">
                          <div className="transaction-info">
                            <span className="transaction-date">{formatDate(transaction.date)}</span>
                            <span className="transaction-desc">{transaction.description}</span>
                          </div>
                          <span className="transaction-amount">
                            {new Intl.NumberFormat('en-US').format(transaction.amount)} ريال
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="statement-actions">
                  <button className="action-btn primary">
                    <span>📄</span>
                    تحميل كشف PDF
                  </button>
                  <button className="action-btn secondary">
                    <span>📧</span>
                    إرسال بالبريد
                  </button>
                  <button className="action-btn secondary">
                    <span>🖨️</span>
                    طباعة
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {searchResults && searchResults.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon">📭</span>
          <h3>لا توجد نتائج</h3>
          <p>لم يتم العثور على أعضاء مطابقين لبحثك</p>
        </div>
      )}
    </div>
  );
};

export default memo(StatementSearch);