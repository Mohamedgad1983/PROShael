import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { logger } from '../../utils/logger';

import './SubscriptionDashboard.css';

// ========================================
// TYPES & INTERFACES
// ========================================
interface SubscriptionStats {
  total_members: number;
  active: number;
  overdue: number;
  monthly_revenue: number;
  overdue_amount: number;
  avg_months_ahead: number;
}

interface Subscription {
  member_id: string;
  member_name: string;
  phone: string;
  status: 'active' | 'overdue';
  current_balance: number;
  months_paid_ahead: number;
  next_payment_due: string;
  last_payment_date?: string;
  last_payment_amount?: number;
}

// ========================================
// MAIN COMPONENT
// ========================================
const SubscriptionDashboard: React.FC = () => {
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'overdue'>('all');

  // Modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Subscription | null>(null);

  const API_BASE = process.env.REACT_APP_API_URL || 'https://proshael.onrender.com';
  const token = localStorage.getItem('token');

  const axiosConfig = {
    headers: { Authorization: `Bearer ${token}` }
  };

  // Fetch stats
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/api/subscriptions/admin/subscriptions/stats`, axiosConfig);
      setStats(data);
    } catch (error) {
      logger.error('فشل في تحميل الإحصائيات:', { error });
    }
  };

  // Fetch subscriptions
  useEffect(() => {
    fetchSubscriptions();
  }, [currentPage, searchTerm, statusFilter]);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      });

      const { data } = await axios.get(
        `${API_BASE}/api/subscriptions/admin/subscriptions?${params}`,
        axiosConfig
      );

      setSubscriptions(data.subscriptions);
      setTotalPages(Math.ceil(data.total / 20));
    } catch (error) {
      logger.error('فشل في تحميل الاشتراكات:', { error });
    } finally {
      setLoading(false);
    }
  };

  // Record payment handler
  const handleRecordPayment = async (paymentData: {
    amount: number;
    months: number;
    payment_method: string;
    receipt_number: string;
    notes: string;
  }) => {
    if (!selectedMember) return;

    try {
      const { data } = await axios.post(
        `${API_BASE}/api/subscriptions/admin/subscriptions/payment`,
        {
          member_id: selectedMember.member_id,
          ...paymentData
        },
        axiosConfig
      );

      alert(`تم تسجيل الدفعة بنجاح!\nالرصيد الجديد: ${data.new_balance} ريال\nأشهر مدفوعة: ${data.months_ahead}`);

      fetchStats();
      fetchSubscriptions();
      setShowPaymentModal(false);
    } catch (error) {
      logger.error('فشل في تسجيل الدفعة:', { error });
      alert('حدث خطأ أثناء تسجيل الدفعة');
    }
  };

  // Send reminder handler
  const handleSendReminder = async (memberId: string) => {
    try {
      const { data } = await axios.post(
        `${API_BASE}/api/subscriptions/admin/subscriptions/reminder`,
        { member_ids: [memberId] },
        axiosConfig
      );

      alert(`تم إرسال التذكير بنجاح! (${data.sent} رسالة)`);
    } catch (error) {
      logger.error('فشل في إرسال التذكير:', { error });
      alert('حدث خطأ أثناء إرسال التذكير');
    }
  };

  return (
    <div className="subscription-dashboard rtl" dir="rtl">
      {/* Header */}
      <div className="dashboard-header">
        <h1 className="dashboard-title">💳 إدارة الاشتراكات</h1>
        <button
          onClick={() => {
            fetchStats();
            fetchSubscriptions();
          }}
          className="refresh-btn"
        >
          🔄 تحديث
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <StatCard
          title="إجمالي الأعضاء"
          value={stats?.total_members || 0}
          icon="👥"
          color="blue"
        />
        <StatCard
          title="اشتراكات نشطة"
          value={stats?.active || 0}
          icon="✅"
          color="green"
        />
        <StatCard
          title="متأخرون"
          value={stats?.overdue || 0}
          icon="⚠️"
          color="red"
        />
        <StatCard
          title="الإيرادات الشهرية"
          value={`${stats?.monthly_revenue || 0} ريال`}
          icon="💰"
          color="teal"
        />
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-grid">
          <input
            type="text"
            placeholder="ابحث بالاسم أو رقم الهاتف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="filter-select"
          >
            <option value="all">الكل</option>
            <option value="active">نشط</option>
            <option value="overdue">متأخر</option>
          </select>

          <button onClick={() => fetchSubscriptions()} className="filter-btn">
            🔄 تحديث
          </button>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="table-container">
        <table className="subscriptions-table">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>الهاتف</th>
              <th>الحالة</th>
              <th>الرصيد</th>
              <th>أشهر مدفوعة</th>
              <th>الدفعة القادمة</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="loading-cell">
                  جاري التحميل...
                </td>
              </tr>
            ) : subscriptions.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-cell">
                  لا توجد نتائج
                </td>
              </tr>
            ) : (
              subscriptions.map((sub) => (
                <tr key={sub.member_id} className="table-row">
                  <td>{sub.member_name}</td>
                  <td className="phone-cell">{sub.phone}</td>
                  <td>
                    <StatusBadge status={sub.status} />
                  </td>
                  <td>{sub.current_balance} ريال</td>
                  <td>{sub.months_paid_ahead} شهر</td>
                  <td>{formatDate(sub.next_payment_due)}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        onClick={() => {
                          setSelectedMember(sub);
                          setShowPaymentModal(true);
                        }}
                        className="action-btn payment-btn"
                      >
                        تسجيل دفعة
                      </button>
                      {sub.status === 'overdue' && (
                        <button
                          onClick={() => handleSendReminder(sub.member_id)}
                          className="action-btn reminder-btn"
                        >
                          إرسال تذكير
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="pagination">
        <button
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="page-btn"
        >
          السابق
        </button>
        <span className="page-info">
          صفحة {currentPage} من {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="page-btn"
        >
          التالي
        </button>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedMember && (
        <PaymentModal
          member={selectedMember}
          onSubmit={handleRecordPayment}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </div>
  );
};

// ========================================
// SUB-COMPONENTS
// ========================================
const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: string;
  color: string;
}> = ({ title, value, icon, color }) => (
  <div className={`stat-card stat-card-${color}`}>
    <div className="stat-content">
      <div className="stat-text">
        <p className="stat-title">{title}</p>
        <h3 className="stat-value">{value}</h3>
      </div>
      <span className="stat-icon">{icon}</span>
    </div>
  </div>
);

const StatusBadge: React.FC<{ status: 'active' | 'overdue' }> = ({ status }) => (
  <span className={`status-badge status-${status}`}>
    {status === 'active' ? 'نشط ✓' : 'متأخر ⚠️'}
  </span>
);

const PaymentModal: React.FC<{
  member: Subscription;
  onSubmit: (data: any) => void;
  onClose: () => void;
}> = ({ member, onSubmit, onClose }) => {
  const [amount, setAmount] = useState(50);
  const [months, setMonths] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setAmount(months * 50);
  }, [months]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ amount, months, payment_method: paymentMethod, receipt_number: receiptNumber, notes });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">تسجيل دفعة جديدة</h2>

        <div className="member-info">
          <p><strong>الاسم:</strong> {member.member_name}</p>
          <p><strong>الهاتف:</strong> {member.phone}</p>
          <p><strong>الرصيد الحالي:</strong> {member.current_balance} ريال</p>
        </div>

        <form onSubmit={handleSubmit} className="payment-form">
          <div className="form-group">
            <label>عدد الأشهر</label>
            <select
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              required
            >
              <option value={1}>1 شهر (50 ريال)</option>
              <option value={2}>2 شهر (100 ريال)</option>
              <option value={3}>3 أشهر (150 ريال)</option>
              <option value={6}>6 أشهر (300 ريال)</option>
              <option value={12}>12 شهر (600 ريال)</option>
            </select>
          </div>

          <div className="form-group">
            <label>المبلغ (ريال)</label>
            <input type="number" value={amount} readOnly />
          </div>

          <div className="form-group">
            <label>طريقة الدفع</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              required
            >
              <option value="cash">نقدي</option>
              <option value="bank_transfer">تحويل بنكي</option>
              <option value="online">دفع أونلاين</option>
            </select>
          </div>

          <div className="form-group">
            <label>رقم الإيصال</label>
            <input
              type="text"
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(e.target.value)}
              placeholder="REC-2025-001"
            />
          </div>

          <div className="form-group">
            <label>ملاحظات</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="ملاحظات إضافية..."
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="submit-btn">
              تسجيل الدفعة
            </button>
            <button type="button" onClick={onClose} className="cancel-btn">
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Helper function
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ar-SA');
};

export default SubscriptionDashboard;
