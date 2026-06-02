// @ts-nocheck
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { logger } from '../../utils/logger';
import { API_ORIGIN } from '../../utils/apiConfig';

import './MemberSubscriptionView.css';

// ========================================
// TYPES & INTERFACES
// ========================================
interface MemberSubscription {
  status: 'active' | 'overdue';
  current_balance: number;
  months_paid_ahead: number;
  next_payment_due: string;
  last_payment_date?: string;
  last_payment_amount?: number;
  plan_name?: string;
}

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  receipt_number?: string;
  months_purchased: number;
  status: string;
}

// ========================================
// MAIN COMPONENT
// ========================================
const MemberSubscriptionView: React.FC = () => {
  const [subscription, setSubscription] = useState<MemberSubscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayModal, setShowPayModal] = useState(false);

  const API_BASE = API_ORIGIN;
  const token = localStorage.getItem('token');
  const axiosConfig = {
    headers: { Authorization: `Bearer ${token}` }
  };

  useEffect(() => {
    fetchSubscription();
    fetchPaymentHistory();
  }, []);

  const fetchSubscription = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/api/subscriptions/member/subscription`, axiosConfig);
      setSubscription(data.subscription);
    } catch (error) {
      logger.error('فشل في تحميل الاشتراك:', { error });
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/api/subscriptions/member/subscription/payments?limit=10`, axiosConfig);
      setPayments(data.payments);
    } catch (error) {
      logger.error('فشل في تحميل السجل:', { error });
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p className="loading-text">جاري التحميل...</p>
      </div>
    );
  }

  if (!subscription) {
    // Check if user is admin testing the page
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const isAdmin = user && ['admin', 'super_admin', 'moderator', 'financial_manager'].includes(user.role);

    return (
      <div className="error-screen">
        <div className="error-icon">⚠️</div>
        <h2>لم يتم العثور على اشتراك</h2>
        {isAdmin ? (
          <div style={{ maxWidth: '500px', margin: '0 auto' }}>
            <p style={{ marginBottom: '1rem' }}>
              أنت مسجل دخول كمسؤول ولا يوجد اشتراك مرتبط بحسابك.
            </p>
            <p style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
              لعرض بيانات اشتراك عضو حقيقي:
            </p>
            <ul style={{ textAlign: 'right', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', marginBottom: '1.5rem' }}>
              <li>قم بتسجيل الخروج</li>
              <li>سجل دخول كعضو: 0555555555 / 123456</li>
              <li>أو استخدم لوحة تحكم المسؤول لعرض جميع الاشتراكات</li>
            </ul>
            <button
              onClick={() => window.location.href = '/admin/subscriptions'}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '0.5rem',
                color: 'white',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              📊 انتقل إلى لوحة تحكم الاشتراكات
            </button>
          </div>
        ) : (
          <p>يرجى التواصل مع الإدارة</p>
        )}
      </div>
    );
  }

  const isOverdue = subscription.status === 'overdue';
  const daysUntilDue = Math.ceil(
    (new Date(subscription.next_payment_due).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="member-subscription-view">
      <div className="content-container">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">💳 اشتراكي</h1>
          <button
            onClick={() => {
              fetchSubscription();
              fetchPaymentHistory();
            }}
            className="refresh-icon-btn"
          >
            🔄
          </button>
        </div>

        {/* Subscription Status Card */}
        <div className={`subscription-card ${isOverdue ? 'card-overdue' : 'card-active'}`}>
          {/* Status Badge */}
          <div className="card-header">
            <span className={`status-badge-mobile ${isOverdue ? 'badge-overdue' : 'badge-active'}`}>
              {isOverdue ? '⚠️ متأخر' : '✅ نشط'}
            </span>
          </div>

          {/* Plan Info */}
          <div className="plan-info">
            <h2 className="plan-subtitle">اشتراك شهري</h2>
            <h1 className="plan-price">50 ريال</h1>
            <p className="plan-period">لكل شهر</p>
          </div>

          {/* Progress Bar */}
          <div className="progress-container">
            <div className="progress-header">
              <span className="progress-label">أشهر مدفوعة مسبقاً</span>
              <span className="progress-value">{subscription.months_paid_ahead} شهر</span>
            </div>
            <div className="progress-bar-bg">
              <div
                className={`progress-bar-fill ${isOverdue ? 'fill-red' : 'fill-green'}`}
                style={{ width: `${Math.min(100, (subscription.months_paid_ahead / 12) * 100)}%` }}
              />
            </div>
          </div>

          {/* Info Rows */}
          <div className="info-rows">
            <InfoRow
              label="الرصيد الحالي"
              value={`${subscription.current_balance} ريال`}
              highlight
            />
            <InfoRow
              label="تاريخ الدفعة القادمة"
              value={formatDate(subscription.next_payment_due)}
              subtext={isOverdue ? `متأخر بـ ${Math.abs(daysUntilDue)} يوم` : `بعد ${daysUntilDue} يوم`}
            />
            {subscription.last_payment_date && (
              <InfoRow
                label="آخر دفعة"
                value={`${subscription.last_payment_amount} ريال`}
                subtext={formatDate(subscription.last_payment_date)}
              />
            )}
          </div>

          {/* Warning if overdue */}
          {isOverdue && (
            <div className="warning-box">
              ⚠️ اشتراكك متأخر. يرجى الدفع في أقرب وقت للحفاظ على الخدمات.
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="action-buttons-container">
          <button
            onClick={() => setShowPayModal(true)}
            className="action-btn primary-btn"
          >
            💳 دفع الآن
          </button>

          <button
            onClick={() => setShowPayModal(true)}
            className="action-btn secondary-btn"
          >
            📅 دفع عدة أشهر
          </button>
        </div>

        {/* Payment History */}
        <div className="payment-history-section">
          <h3 className="history-title">
            <span>📋</span>
            سجل الدفعات
          </h3>

          {payments.length === 0 ? (
            <p className="empty-message">لا توجد دفعات سابقة</p>
          ) : (
            <div className="payments-list">
              {payments.map((payment) => (
                <PaymentHistoryItem key={payment.id} payment={payment} />
              ))}
            </div>
          )}

          {payments.length > 0 && (
            <button className="view-more-btn">
              عرض المزيد
            </button>
          )}
        </div>
      </div>

      {/* Pay Multiple Months Modal */}
      {showPayModal && (
        <PayMultipleModal
          onClose={() => setShowPayModal(false)}
          onConfirm={(months) => {
            alert(`سيتم توجيهك لدفع ${months} شهر (${months * 50} ريال)`);
            setShowPayModal(false);
          }}
        />
      )}
    </div>
  );
};

// ========================================
// SUB-COMPONENTS
// ========================================
const InfoRow: React.FC<{
  label: string;
  value: string;
  subtext?: string;
  highlight?: boolean;
}> = ({ label, value, subtext, highlight }) => (
  <div className={`info-row ${highlight ? 'info-highlight' : ''}`}>
    <span className="info-label">{label}</span>
    <div className="info-value-container">
      <div className="info-value">{value}</div>
      {subtext && <div className="info-subtext">{subtext}</div>}
    </div>
  </div>
);

const PaymentHistoryItem: React.FC<{ payment: Payment }> = ({ payment }) => (
  <div className="payment-item">
    <div className="payment-header">
      <div className="payment-amount-info">
        <div className="payment-amount">{payment.amount} ريال</div>
        <div className="payment-months">{payment.months_purchased} شهر</div>
      </div>
      <span className="payment-status-badge">
        مكتمل ✓
      </span>
    </div>
    <div className="payment-details">
      <span>{formatDate(payment.payment_date)}</span>
      <span>{getPaymentMethodLabel(payment.payment_method)}</span>
    </div>
    {payment.receipt_number && (
      <div className="payment-receipt">إيصال: {payment.receipt_number}</div>
    )}
  </div>
);

const PayMultipleModal: React.FC<{
  onClose: () => void;
  onConfirm: (months: number) => void;
}> = ({ onClose, onConfirm }) => {
  const [selectedMonths, setSelectedMonths] = useState(1);

  const monthOptions = [
    { months: 1, label: '1 شهر', amount: 50 },
    { months: 2, label: '2 شهر', amount: 100 },
    { months: 3, label: '3 أشهر', amount: 150 },
    { months: 6, label: '6 أشهر', amount: 300 },
    { months: 12, label: '12 شهر', amount: 600 },
  ];

  return (
    <div className="pay-modal-overlay" onClick={onClose}>
      <div className="pay-modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="pay-modal-title">دفع عدة أشهر</h2>

        <div className="month-options">
          {monthOptions.map((option) => (
            <button
              key={option.months}
              onClick={() => setSelectedMonths(option.months)}
              className={`month-option ${selectedMonths === option.months ? 'option-selected' : ''}`}
            >
              <span className="option-label">{option.label}</span>
              <span className="option-amount">{option.amount} ريال</span>
            </button>
          ))}
        </div>

        <div className="total-box">
          <div className="total-row">
            <span>المجموع:</span>
            <span className="total-amount">{selectedMonths * 50} ريال</span>
          </div>
        </div>

        <div className="modal-actions">
          <button
            onClick={() => onConfirm(selectedMonths)}
            className="confirm-payment-btn"
          >
            تأكيد الدفع
          </button>
          <button
            onClick={onClose}
            className="cancel-payment-btn"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};

// ========================================
// HELPER FUNCTIONS
// ========================================
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
};

const getPaymentMethodLabel = (method: string) => {
  const labels: Record<string, string> = {
    cash: 'نقدي',
    bank_transfer: 'تحويل بنكي',
    online: 'أونلاين'
  };
  return labels[method] || method;
};

export default MemberSubscriptionView;
