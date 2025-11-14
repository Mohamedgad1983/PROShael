import React, { memo,  useState, useEffect } from 'react';
import {
  CalendarIcon,
  BanknotesIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  UserIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import './HijriGroupedPayments.css';

const HijriGroupedPayments = ({ payments = [], onPaymentClick }) => {
  const [expandedGroups, setExpandedGroups] = useState({});
  const [groupedPayments, setGroupedPayments] = useState({});

  useEffect(() => {
    groupPaymentsByHijriMonth(payments);
  }, [payments]);

  const groupPaymentsByHijriMonth = (paymentsData) => {
    const grouped = paymentsData.reduce((groups, payment) => {
      const key = `${payment.hijri_month_name || 'غير محدد'} ${payment.hijri_year || ''}`;

      if (!groups[key]) {
        groups[key] = {
          hijri_month: payment.hijri_month,
          hijri_year: payment.hijri_year,
          hijri_month_name: payment.hijri_month_name,
          payments: [],
          total_amount: 0,
          paid_amount: 0,
          pending_amount: 0,
          paid_count: 0,
          pending_count: 0
        };
      }

      groups[key].payments.push(payment);
      groups[key].total_amount += Number(payment.amount || 0);

      if (payment.status === 'paid' || payment.status === 'approved') {
        groups[key].paid_amount += Number(payment.amount || 0);
        groups[key].paid_count++;
      } else if (payment.status === 'pending') {
        groups[key].pending_amount += Number(payment.amount || 0);
        groups[key].pending_count++;
      }

      return groups;
    }, {});

    // Sort groups by hijri year and month (descending)
    const sortedGroups = Object.keys(grouped)
      .sort((a, b) => {
        const groupA = grouped[a];
        const groupB = grouped[b];

        if (groupA.hijri_year !== groupB.hijri_year) {
          return (groupB.hijri_year || 0) - (groupA.hijri_year || 0);
        }
        return (groupB.hijri_month || 0) - (groupA.hijri_month || 0);
      })
      .reduce((obj, key) => {
        obj[key] = grouped[key];
        return obj;
      }, {});

    setGroupedPayments(sortedGroups);

    // Auto-expand first group
    const firstKey = Object.keys(sortedGroups)[0];
    if (firstKey) {
      setExpandedGroups({ [firstKey]: true });
    }
  };

  const toggleGroup = (groupKey) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid':
      case 'approved':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'rejected':
      case 'cancelled':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusLabel = (status) => {
    const statusLabels = {
      pending: 'قيد الانتظار',
      paid: 'مدفوع',
      approved: 'موافق عليه',
      rejected: 'مرفوض',
      cancelled: 'ملغي',
      overdue: 'متأخر',
      refunded: 'مسترد'
    };
    return statusLabels[status] || status;
  };

  const getMonthClassName = (monthName) => {
    if (monthName?.includes('رمضان')) return 'month-ramadan';
    if (monthName?.includes('ذو الحجة')) return 'month-dhul-hijjah';
    if (monthName?.includes('محرم') || monthName?.includes('رجب') ||
        monthName?.includes('ذو القعدة')) return 'month-sacred';
    return '';
  };

  if (Object.keys(groupedPayments).length === 0) {
    return (
      <div className="hijri-grouped-empty" dir="rtl">
        <CalendarIcon className="h-16 w-16 text-gray-400 mb-4" />
        <p className="text-gray-400 text-lg">لا توجد مدفوعات للعرض</p>
      </div>
    );
  }

  return (
    <div className="hijri-grouped-payments" dir="rtl">
      {Object.entries(groupedPayments).map(([monthYear, group]) => (
        <div
          key={monthYear}
          className={`hijri-month-group ${getMonthClassName(group.hijri_month_name)}`}
        >
          {/* Month Header */}
          <div
            className="hijri-month-header"
            onClick={() => toggleGroup(monthYear)}
          >
            <div className="header-content">
              <div className="header-left">
                <button className="expand-btn">
                  {expandedGroups[monthYear] ? (
                    <ChevronDownIcon className="h-5 w-5" />
                  ) : (
                    <ChevronRightIcon className="h-5 w-5" />
                  )}
                </button>
                <CalendarIcon className="h-6 w-6 text-blue-400" />
                <h3 className="month-title">{monthYear}</h3>
              </div>

              <div className="header-stats">
                <div className="stat-item">
                  <span className="stat-label">المعاملات:</span>
                  <span className="stat-value">{group.payments.length}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">المجموع:</span>
                  <span className="stat-value total">{formatCurrency(group.total_amount)}</span>
                </div>
                {group.paid_count > 0 && (
                  <div className="stat-item paid">
                    <CheckCircleIcon className="h-4 w-4" />
                    <span>{group.paid_count}</span>
                  </div>
                )}
                {group.pending_count > 0 && (
                  <div className="stat-item pending">
                    <ClockIcon className="h-4 w-4" />
                    <span>{group.pending_count}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            {group.total_amount > 0 && (
              <div className="progress-bar">
                <div
                  className="progress-fill paid"
                  style={{ width: `${(group.paid_amount / group.total_amount) * 100}%` }}
                />
              </div>
            )}
          </div>

          {/* Month Payments List */}
          {expandedGroups[monthYear] && (
            <div className="month-payments-list">
              {group.payments.map(payment => (
                <div
                  key={payment.id}
                  className="payment-card"
                  onClick={() => onPaymentClick && onPaymentClick(payment)}
                >
                  <div className="payment-header">
                    <div className="payment-member">
                      <UserIcon className="h-5 w-5 text-gray-400" />
                      <span className="member-name">
                        {payment.payer?.full_name || payment.memberName || 'عضو غير محدد'}
                      </span>
                    </div>
                    <div className="payment-status">
                      {getStatusIcon(payment.status)}
                      <span className={`status-text status-${payment.status}`}>
                        {getStatusLabel(payment.status)}
                      </span>
                    </div>
                  </div>

                  <div className="payment-body">
                    <div className="payment-amount">
                      <BanknotesIcon className="h-5 w-5 text-green-400" />
                      <span className="amount-value">{formatCurrency(payment.amount)}</span>
                    </div>

                    <div className="payment-dates">
                      <div className="date-hijri">
                        <CalendarIcon className="h-4 w-4" />
                        <span className="date-text">
                          {payment.hijri_day} {payment.hijri_month_name}
                        </span>
                      </div>
                      <div className="date-gregorian">
                        {payment.gregorian_formatted ||
                         new Date(payment.created_at || payment.createdDate).toLocaleDateString('ar-SA')}
                      </div>
                    </div>
                  </div>

                  {payment.category && (
                    <div className="payment-category">
                      <span className="category-badge">
                        {getCategoryLabel(payment.category)}
                      </span>
                    </div>
                  )}

                  {payment.notes && (
                    <div className="payment-notes">
                      <p className="notes-text">{payment.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Helper function for category labels
const getCategoryLabel = (category) => {
  const categories = {
    subscription: 'اشتراك',
    donation: 'تبرع',
    zakat: 'زكاة',
    sadaqah: 'صدقة',
    project: 'مشروع',
    event: 'مناسبة',
    service: 'خدمة',
    other: 'أخرى'
  };
  return categories[category] || category;
};

export default memo(HijriGroupedPayments);