/**
 * @fileoverview Balance Adjustment Modal Component
 * @description Modal for financial managers and super admins to adjust member balances
 * @version 1.0.0
 *
 * @features
 * - Adjust member balance (credit/debit/correction)
 * - Target specific years (past 5 years)
 * - Target specific months within a year
 * - Require reason for adjustment with audit trail
 * - Show adjustment history
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  PlusCircleIcon,
  MinusCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  AdjustmentsHorizontalIcon,
  CalendarIcon,
  DocumentTextIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { logger } from '../../utils/logger';
import './BalanceAdjustmentModal.css';

const BalanceAdjustmentModal = ({ isOpen, onClose, member, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [adjustmentHistory, setAdjustmentHistory] = useState([]);
  const [balanceSummary, setBalanceSummary] = useState(null);
  const [activeTab, setActiveTab] = useState('adjust'); // 'adjust' | 'history' | 'summary'

  // Form state
  const [formData, setFormData] = useState({
    adjustment_type: 'credit',
    amount: '',
    target_year: '',
    target_month: '',
    reason: '',
    notes: ''
  });

  const API_URL = process.env.REACT_APP_API_URL || 'https://api.alshailfund.com/api';
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - 5 + i); // Past 5 years + current
  const months = [
    { value: 1, label: 'يناير' },
    { value: 2, label: 'فبراير' },
    { value: 3, label: 'مارس' },
    { value: 4, label: 'أبريل' },
    { value: 5, label: 'مايو' },
    { value: 6, label: 'يونيو' },
    { value: 7, label: 'يوليو' },
    { value: 8, label: 'أغسطس' },
    { value: 9, label: 'سبتمبر' },
    { value: 10, label: 'أكتوبر' },
    { value: 11, label: 'نوفمبر' },
    { value: 12, label: 'ديسمبر' }
  ];

  const adjustmentTypes = [
    { value: 'credit', label: 'إضافة رصيد', icon: PlusCircleIcon, color: 'green' },
    { value: 'debit', label: 'خصم رصيد', icon: MinusCircleIcon, color: 'red' },
    { value: 'correction', label: 'تصحيح الرصيد', icon: AdjustmentsHorizontalIcon, color: 'blue' },
    { value: 'yearly_payment', label: 'دفعة سنوية', icon: CalendarIcon, color: 'purple' }
  ];

  // Load adjustment history and balance summary when modal opens
  useEffect(() => {
    if (isOpen && member?.id) {
      loadAdjustmentHistory();
      loadBalanceSummary();
    }
  }, [isOpen, member?.id]);

  const loadAdjustmentHistory = async () => {
    if (!member?.id) return;
    setHistoryLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_URL}/balance-adjustments/member/${member.id}?limit=20`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAdjustmentHistory(data.data || []);
      }
    } catch (err) {
      logger.error('Error loading adjustment history:', { err });
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadBalanceSummary = async () => {
    if (!member?.id) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_URL}/balance-adjustments/summary/${member.id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setBalanceSummary(data.data || null);
      }
    } catch (err) {
      logger.error('Error loading balance summary:', { err });
    }
  };

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
    setSuccess('');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('الرجاء إدخال مبلغ صحيح');
      return;
    }

    if (!formData.reason || formData.reason.trim().length < 5) {
      setError('الرجاء إدخال سبب التعديل (5 أحرف على الأقل)');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const payload = {
        member_id: member.id,
        adjustment_type: formData.adjustment_type,
        amount: parseFloat(formData.amount),
        target_year: formData.target_year ? parseInt(formData.target_year) : null,
        target_month: formData.target_month ? parseInt(formData.target_month) : null,
        reason: formData.reason.trim(),
        notes: formData.notes.trim() || null
      };

      const response = await fetch(`${API_URL}/balance-adjustments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(`تم تعديل الرصيد بنجاح. الرصيد الجديد: ${data.data.new_balance} ريال`);

        // Reset form
        setFormData({
          adjustment_type: 'credit',
          amount: '',
          target_year: '',
          target_month: '',
          reason: '',
          notes: ''
        });

        // Reload history and summary
        await loadAdjustmentHistory();
        await loadBalanceSummary();

        // Notify parent component
        if (onSuccess) {
          onSuccess(data.data);
        }

      } else {
        setError(data.error || data.message || 'فشل في تعديل الرصيد');
      }
    } catch (err) {
      logger.error('Error adjusting balance:', { err });
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAdjustmentTypeLabel = (type) => {
    const types = {
      credit: { label: 'إضافة', color: 'green' },
      debit: { label: 'خصم', color: 'red' },
      correction: { label: 'تصحيح', color: 'blue' },
      initial_balance: { label: 'رصيد أولي', color: 'purple' },
      yearly_payment: { label: 'دفعة سنوية', color: 'indigo' },
      bulk_restore: { label: 'استعادة جماعية', color: 'orange' }
    };
    return types[type] || { label: type, color: 'gray' };
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="balance-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="balance-modal-container"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="balance-modal-header">
            <div className="header-info">
              <h2 className="modal-title">
                <AdjustmentsHorizontalIcon className="title-icon" />
                تعديل رصيد العضو
              </h2>
              <p className="member-info-text">
                {member?.full_name} - {member?.membership_number || member?.member_no}
              </p>
            </div>
            <button onClick={onClose} className="close-btn">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Current Balance Display */}
          <div className="current-balance-display">
            <div className="balance-label">الرصيد الحالي</div>
            <div className="balance-value">
              {new Intl.NumberFormat('ar-SA').format(balanceSummary?.member?.current_balance || member?.balance || 0)} ريال
            </div>
          </div>

          {/* Tabs */}
          <div className="modal-tabs">
            <button
              className={`tab-btn ${activeTab === 'adjust' ? 'active' : ''}`}
              onClick={() => setActiveTab('adjust')}
            >
              <AdjustmentsHorizontalIcon className="tab-icon" />
              تعديل الرصيد
            </button>
            <button
              className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <ClockIcon className="tab-icon" />
              سجل التعديلات
            </button>
            <button
              className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
              onClick={() => setActiveTab('summary')}
            >
              <DocumentTextIcon className="tab-icon" />
              ملخص الرصيد
            </button>
          </div>

          {/* Tab Content */}
          <div className="modal-content">
            {/* Adjust Tab */}
            {activeTab === 'adjust' && (
              <form onSubmit={handleSubmit} className="adjustment-form">
                {/* Adjustment Type Selection */}
                <div className="form-group">
                  <label className="form-label">نوع التعديل</label>
                  <div className="adjustment-type-grid">
                    {adjustmentTypes.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        className={`type-btn ${formData.adjustment_type === type.value ? 'active' : ''} type-${type.color}`}
                        onClick={() => setFormData(prev => ({ ...prev, adjustment_type: type.value }))}
                      >
                        <type.icon className="type-icon" />
                        <span>{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount Input */}
                <div className="form-group">
                  <label className="form-label">
                    {formData.adjustment_type === 'correction' ? 'الرصيد الجديد' : 'المبلغ'}
                    <span className="required">*</span>
                  </label>
                  <div className="amount-input-wrapper">
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleInputChange}
                      placeholder={formData.adjustment_type === 'correction' ? 'أدخل الرصيد الجديد' : 'أدخل المبلغ'}
                      min="0"
                      step="50"
                      className="form-input amount-input"
                      required
                    />
                    <span className="currency-label">ريال</span>
                  </div>
                  <p className="input-hint">
                    {formData.adjustment_type === 'correction'
                      ? 'سيتم تعيين الرصيد إلى هذا المبلغ مباشرة'
                      : 'الحد الأقصى للرصيد: 3,600 ريال'}
                  </p>
                </div>

                {/* Target Year Selection */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">السنة المستهدفة (اختياري)</label>
                    <select
                      name="target_year"
                      value={formData.target_year}
                      onChange={handleInputChange}
                      className="form-select"
                    >
                      <option value="">جميع السنوات</option>
                      {years.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>

                  {/* Target Month Selection */}
                  <div className="form-group">
                    <label className="form-label">الشهر المستهدف (اختياري)</label>
                    <select
                      name="target_month"
                      value={formData.target_month}
                      onChange={handleInputChange}
                      className="form-select"
                      disabled={!formData.target_year}
                    >
                      <option value="">جميع الأشهر</option>
                      {months.map(month => (
                        <option key={month.value} value={month.value}>{month.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Reason Input */}
                <div className="form-group">
                  <label className="form-label">
                    سبب التعديل
                    <span className="required">*</span>
                  </label>
                  <textarea
                    name="reason"
                    value={formData.reason}
                    onChange={handleInputChange}
                    placeholder="أدخل سبب التعديل (مطلوب للتدقيق)"
                    className="form-textarea"
                    rows={3}
                    required
                  />
                </div>

                {/* Notes Input */}
                <div className="form-group">
                  <label className="form-label">ملاحظات إضافية (اختياري)</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="أي ملاحظات إضافية..."
                    className="form-textarea"
                    rows={2}
                  />
                </div>

                {/* Error/Success Messages */}
                {error && (
                  <div className="message-box error">
                    <ExclamationTriangleIcon className="message-icon" />
                    {error}
                  </div>
                )}

                {success && (
                  <div className="message-box success">
                    <CheckCircleIcon className="message-icon" />
                    {success}
                  </div>
                )}

                {/* Submit Button */}
                <div className="form-actions">
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn btn-secondary"
                    disabled={loading}
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <ArrowPathIcon className="btn-icon spinning" />
                        جاري التعديل...
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="btn-icon" />
                        تأكيد التعديل
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="history-section">
                {historyLoading ? (
                  <div className="loading-state">
                    <ArrowPathIcon className="loading-icon spinning" />
                    <span>جاري التحميل...</span>
                  </div>
                ) : adjustmentHistory.length === 0 ? (
                  <div className="empty-state">
                    <ClockIcon className="empty-icon" />
                    <p>لا يوجد تعديلات سابقة</p>
                  </div>
                ) : (
                  <div className="history-list">
                    {adjustmentHistory.map((item) => {
                      const typeInfo = getAdjustmentTypeLabel(item.adjustment_type);
                      return (
                        <div key={item.id} className="history-item">
                          <div className="history-item-header">
                            <span className={`type-badge type-${typeInfo.color}`}>
                              {typeInfo.label}
                            </span>
                            <span className="history-date">{formatDate(item.created_at)}</span>
                          </div>
                          <div className="history-item-body">
                            <div className="history-amounts">
                              <div className="amount-change">
                                <span className="label">المبلغ:</span>
                                <span className={`value ${item.adjustment_type === 'debit' ? 'negative' : 'positive'}`}>
                                  {item.adjustment_type === 'debit' ? '-' : '+'}{item.amount} ريال
                                </span>
                              </div>
                              <div className="balance-change">
                                <span className="old-balance">{item.previous_balance} ريال</span>
                                <span className="arrow">→</span>
                                <span className="new-balance">{item.new_balance} ريال</span>
                              </div>
                            </div>
                            <div className="history-reason">
                              <strong>السبب:</strong> {item.reason}
                            </div>
                            {item.target_year && (
                              <div className="history-target">
                                <CalendarIcon className="w-4 h-4" />
                                {item.target_year}
                                {item.target_month && ` - شهر ${item.target_month}`}
                              </div>
                            )}
                            <div className="history-admin">
                              <span>بواسطة: {item.adjusted_by_email || 'غير معروف'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Summary Tab */}
            {activeTab === 'summary' && balanceSummary && (
              <div className="summary-section">
                {/* Yearly Breakdown */}
                <div className="summary-card">
                  <h4 className="summary-card-title">
                    <CalendarIcon className="title-icon" />
                    المدفوعات السنوية
                  </h4>
                  <div className="yearly-breakdown">
                    {Object.entries(balanceSummary.yearly_breakdown || {}).map(([year, amount]) => (
                      <div key={year} className="year-row">
                        <span className="year-label">{year}</span>
                        <div className="year-bar">
                          <div
                            className="year-bar-fill"
                            style={{ width: `${Math.min(100, (amount / 600) * 100)}%` }}
                          />
                        </div>
                        <span className="year-amount">{amount} ريال</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Balance Summary */}
                <div className="summary-stats-grid">
                  <div className="summary-stat">
                    <div className="stat-label">إجمالي المدفوعات السنوية</div>
                    <div className="stat-value positive">
                      {new Intl.NumberFormat('ar-SA').format(balanceSummary.total_from_yearly_payments || 0)} ريال
                    </div>
                  </div>
                  <div className="summary-stat">
                    <div className="stat-label">الرصيد الحالي</div>
                    <div className="stat-value">
                      {new Intl.NumberFormat('ar-SA').format(balanceSummary.member?.current_balance || 0)} ريال
                    </div>
                  </div>
                  {balanceSummary.balance_discrepancy !== 0 && (
                    <div className="summary-stat warning">
                      <div className="stat-label">فرق الرصيد</div>
                      <div className="stat-value">
                        {new Intl.NumberFormat('ar-SA').format(balanceSummary.balance_discrepancy)} ريال
                      </div>
                    </div>
                  )}
                </div>

                {/* Subscription Status */}
                {balanceSummary.subscription && (
                  <div className="subscription-info">
                    <h4>حالة الاشتراك</h4>
                    <div className="subscription-details">
                      <div className="detail-item">
                        <span className="label">الحالة:</span>
                        <span className={`status-badge status-${balanceSummary.subscription.status}`}>
                          {balanceSummary.subscription.status === 'active' ? 'نشط' : 'متأخر'}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="label">الأشهر المدفوعة مقدماً:</span>
                        <span className="value">{balanceSummary.subscription.months_paid_ahead || 0} شهر</span>
                      </div>
                      {balanceSummary.subscription.next_payment_due && (
                        <div className="detail-item">
                          <span className="label">موعد الدفع القادم:</span>
                          <span className="value">
                            {new Date(balanceSummary.subscription.next_payment_due).toLocaleDateString('ar-SA')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BalanceAdjustmentModal;
