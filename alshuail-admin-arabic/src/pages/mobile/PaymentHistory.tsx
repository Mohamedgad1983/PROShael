import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FunnelIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  DocumentTextIcon,
  EyeIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import BottomNav from '../../components/mobile/BottomNav';
import '../../styles/mobile/PaymentHistory.css';

interface Payment {
  id: string;
  amount: number;
  date: string;
  hijri_date?: string;
  status: 'approved' | 'pending' | 'rejected';
  notes?: string;
  receipt_url?: string;
  on_behalf_of?: {
    full_name: string;
    membership_number: string;
  };
  reviewed_by?: string;
  reviewed_at?: string;
}

const PaymentHistory: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const statusConfig = {
    approved: {
      label: 'معتمد',
      color: '#34C759',
      bgColor: '#34C75910',
      icon: CheckCircleIcon
    },
    pending: {
      label: 'قيد المراجعة',
      color: '#FF9500',
      bgColor: '#FF950010',
      icon: ClockIcon
    },
    rejected: {
      label: 'مرفوض',
      color: '#FF3B30',
      bgColor: '#FF3B3010',
      icon: XCircleIcon
    }
  };

  const months = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  useEffect(() => {
    fetchPayments();
  }, []);

  useEffect(() => {
    filterPayments();
  }, [payments, activeFilter, selectedYear, selectedMonth]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL || 'https://proshael.onrender.com';

      const response = await fetch(`${apiUrl}/api/member/payments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPayments(data);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterPayments = () => {
    let filtered = [...payments];

    // Filter by status
    if (activeFilter !== 'all') {
      filtered = filtered.filter(p => p.status === activeFilter);
    }

    // Filter by year
    filtered = filtered.filter(p => {
      const year = new Date(p.date).getFullYear();
      return year === selectedYear;
    });

    // Filter by month
    if (selectedMonth !== null) {
      filtered = filtered.filter(p => {
        const month = new Date(p.date).getMonth();
        return month === selectedMonth;
      });
    }

    setFilteredPayments(filtered);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getHijriDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const formatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      return formatter.format(date);
    } catch {
      return '';
    }
  };

  const calculateTotals = () => {
    const approved = filteredPayments
      .filter(p => p.status === 'approved')
      .reduce((sum, p) => sum + p.amount, 0);
    const pending = filteredPayments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0);
    const total = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

    return { approved, pending, total };
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <div className="mobile-loading">
        <div className="loading-spinner"></div>
        <p>جاري تحميل السجل...</p>
      </div>
    );
  }

  return (
    <div className="mobile-payment-history">
      {/* Header */}
      <div className="history-header">
        <h1>سجل المدفوعات</h1>
        <button
          className="filter-toggle"
          onClick={() => setShowFilters(!showFilters)}
        >
          <FunnelIcon className="icon" />
        </button>
      </div>

      {/* Statistics */}
      <div className="payment-statistics">
        <div className="stat-card total">
          <span className="stat-label">إجمالي المدفوعات</span>
          <span className="stat-value">{totals.total.toLocaleString()} ريال</span>
        </div>
        <div className="stat-card approved">
          <span className="stat-label">معتمد</span>
          <span className="stat-value">{totals.approved.toLocaleString()} ريال</span>
        </div>
        <div className="stat-card pending">
          <span className="stat-label">قيد المراجعة</span>
          <span className="stat-value">{totals.pending.toLocaleString()} ريال</span>
        </div>
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            className="filters-section"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            {/* Status Filter */}
            <div className="filter-group">
              <label>الحالة</label>
              <div className="filter-buttons">
                <button
                  className={activeFilter === 'all' ? 'active' : ''}
                  onClick={() => setActiveFilter('all')}
                >
                  الكل
                </button>
                <button
                  className={activeFilter === 'approved' ? 'active' : ''}
                  onClick={() => setActiveFilter('approved')}
                >
                  معتمد
                </button>
                <button
                  className={activeFilter === 'pending' ? 'active' : ''}
                  onClick={() => setActiveFilter('pending')}
                >
                  قيد المراجعة
                </button>
                <button
                  className={activeFilter === 'rejected' ? 'active' : ''}
                  onClick={() => setActiveFilter('rejected')}
                >
                  مرفوض
                </button>
              </div>
            </div>

            {/* Year Filter */}
            <div className="filter-group">
              <label>السنة</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {[2024, 2025, 2026].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {/* Month Filter */}
            <div className="filter-group">
              <label>الشهر</label>
              <select
                value={selectedMonth ?? ''}
                onChange={(e) => setSelectedMonth(e.target.value === '' ? null : Number(e.target.value))}
              >
                <option value="">جميع الشهور</option>
                {months.map((month, index) => (
                  <option key={index} value={index}>{month}</option>
                ))}
              </select>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payments List */}
      <div className="payments-list">
        {filteredPayments.length > 0 ? (
          filteredPayments.map((payment, index) => {
            const StatusIcon = statusConfig[payment.status].icon;
            return (
              <motion.div
                key={payment.id}
                className="payment-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedPayment(payment)}
              >
                <div className="payment-main">
                  <div className="payment-amount">
                    <span className="amount">{payment.amount.toLocaleString()}</span>
                    <span className="currency">ريال</span>
                  </div>
                  <div
                    className="payment-status"
                    style={{
                      color: statusConfig[payment.status].color,
                      backgroundColor: statusConfig[payment.status].bgColor
                    }}
                  >
                    <StatusIcon className="icon" />
                    <span>{statusConfig[payment.status].label}</span>
                  </div>
                </div>
                <div className="payment-details">
                  <div className="payment-date">
                    <CalendarIcon className="icon" />
                    <span>{formatDate(payment.date)}</span>
                  </div>
                  {payment.hijri_date && (
                    <div className="hijri-date">{getHijriDate(payment.date)}</div>
                  )}
                  {payment.on_behalf_of && (
                    <div className="on-behalf">
                      دفعت عن: {payment.on_behalf_of.full_name}
                    </div>
                  )}
                </div>
                {payment.receipt_url && (
                  <div className="receipt-indicator">
                    <DocumentTextIcon className="icon" />
                  </div>
                )}
              </motion.div>
            );
          })
        ) : (
          <div className="empty-state">
            <p>لا توجد مدفوعات</p>
          </div>
        )}
      </div>

      {/* Payment Details Modal */}
      {selectedPayment && (
        <div className="modal-overlay" onClick={() => setSelectedPayment(null)}>
          <motion.div
            className="payment-modal"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>تفاصيل الدفعة</h3>

            <div className="modal-detail">
              <span className="label">المبلغ:</span>
              <span className="value">{selectedPayment.amount.toLocaleString()} ريال</span>
            </div>

            <div className="modal-detail">
              <span className="label">التاريخ:</span>
              <span className="value">{formatDate(selectedPayment.date)}</span>
            </div>

            <div className="modal-detail">
              <span className="label">التاريخ الهجري:</span>
              <span className="value">{getHijriDate(selectedPayment.date)}</span>
            </div>

            <div className="modal-detail">
              <span className="label">الحالة:</span>
              <span
                className="value status"
                style={{ color: statusConfig[selectedPayment.status].color }}
              >
                {statusConfig[selectedPayment.status].label}
              </span>
            </div>

            {selectedPayment.on_behalf_of && (
              <div className="modal-detail">
                <span className="label">دفعت عن:</span>
                <span className="value">
                  {selectedPayment.on_behalf_of.full_name}
                  ({selectedPayment.on_behalf_of.membership_number})
                </span>
              </div>
            )}

            {selectedPayment.notes && (
              <div className="modal-detail">
                <span className="label">ملاحظات:</span>
                <span className="value">{selectedPayment.notes}</span>
              </div>
            )}

            {selectedPayment.reviewed_by && (
              <div className="modal-detail">
                <span className="label">تمت المراجعة بواسطة:</span>
                <span className="value">{selectedPayment.reviewed_by}</span>
              </div>
            )}

            {selectedPayment.receipt_url && (
              <div className="receipt-actions">
                <button className="view-receipt">
                  <EyeIcon className="icon" />
                  عرض الإيصال
                </button>
                <button className="download-receipt">
                  <ArrowDownTrayIcon className="icon" />
                  تحميل
                </button>
              </div>
            )}

            <button
              className="modal-close"
              onClick={() => setSelectedPayment(null)}
            >
              إغلاق
            </button>
          </motion.div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default PaymentHistory;