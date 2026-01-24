/**
 * Bank Reconciliation Modal Component
 * Allows financial managers to reconcile fund balance with bank statements
 * Feature: 001-fund-balance-system (User Story 4)
 *
 * Constitution Compliance:
 * - Principle I: Arabic-First (Arabic labels as primary)
 * - Principle V: Financial Accuracy (variance calculation)
 * - Principle VI: Fund Balance Integrity (bank reconciliation)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';
import {
  XMarkIcon,
  ScaleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.alshailfund.com/api';

interface Snapshot {
  id: string;
  snapshot_date: string;
  total_revenue: number;
  total_expenses: number;
  total_internal_diya: number;
  calculated_balance: number;
  bank_statement_balance: number;
  variance: number;
  notes: string | null;
  created_at: string;
  is_reconciled: boolean;
  variance_status: string;
  variance_status_en: string;
  snapshot_date_formatted: string;
}

interface FundBalance {
  total_revenue: number;
  total_expenses: number;
  total_internal_diya: number;
  current_balance: number;
}

interface BankReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: FundBalance | null;
  onReconciliationComplete?: () => void;
}

const BankReconciliationModal: React.FC<BankReconciliationModalProps> = ({
  isOpen,
  onClose,
  currentBalance,
  onReconciliationComplete
}) => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<'reconcile' | 'history'>('reconcile');
  const [bankBalance, setBankBalance] = useState('');
  const [snapshotDate, setSnapshotDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Calculate variance in real-time
  const calculatedVariance = bankBalance && currentBalance
    ? parseFloat(bankBalance) - currentBalance.current_balance
    : 0;

  const fetchSnapshots = useCallback(async () => {
    if (!token) return;
    setLoadingHistory(true);

    try {
      const response = await fetch(`${API_URL}/fund/snapshots?limit=20`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setSnapshots(data.data || []);
      }
    } catch (err) {
      logger.error('Error fetching snapshots:', { error: err });
    } finally {
      setLoadingHistory(false);
    }
  }, [token]);

  useEffect(() => {
    if (isOpen && activeTab === 'history') {
      fetchSnapshots();
    }
  }, [isOpen, activeTab, fetchSnapshots]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!bankBalance || !snapshotDate) {
      setError('يرجى إدخال رصيد البنك وتاريخ المطابقة');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/fund/snapshot`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bank_statement_balance: parseFloat(bankBalance),
          snapshot_date: snapshotDate,
          notes: notes || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      if (data.success) {
        setSuccess(data.message || 'تم حفظ المطابقة بنجاح');
        setBankBalance('');
        setNotes('');
        onReconciliationComplete?.();

        // Switch to history tab to show new record
        setTimeout(() => {
          setActiveTab('history');
          fetchSnapshots();
        }, 1500);
      } else {
        throw new Error(data.error || 'Failed to create snapshot');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطأ في حفظ المطابقة';
      logger.error('Error creating snapshot:', { error: errorMessage });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" dir="rtl">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-l from-emerald-50 to-teal-50 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-200 rounded-xl">
                <ScaleIcon className="h-6 w-6 text-emerald-700" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">مطابقة بنكية</h2>
                <p className="text-xs text-gray-500">Bank Reconciliation</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/50 rounded-xl transition-colors"
            >
              <XMarkIcon className="h-6 w-6 text-gray-500" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('reconcile')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === 'reconcile'
                  ? 'text-emerald-700 border-b-2 border-emerald-500 bg-emerald-50/50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <ScaleIcon className="h-4 w-4 inline-block ml-2" />
              مطابقة جديدة
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === 'history'
                  ? 'text-emerald-700 border-b-2 border-emerald-500 bg-emerald-50/50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <ClockIcon className="h-4 w-4 inline-block ml-2" />
              سجل المطابقات
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'reconcile' ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Current Balance Display */}
                {currentBalance && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">الرصيد المحسوب في النظام</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs text-gray-500">الإيرادات</span>
                        <p className="text-lg font-bold text-green-700">{formatCurrency(currentBalance.total_revenue)}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">المصروفات</span>
                        <p className="text-lg font-bold text-red-700">{formatCurrency(currentBalance.total_expenses)}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">الدية الداخلية</span>
                        <p className="text-lg font-bold text-purple-700">{formatCurrency(currentBalance.total_internal_diya)}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">الرصيد الحالي</span>
                        <p className="text-xl font-bold text-emerald-700">{formatCurrency(currentBalance.current_balance)} ريال</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bank Balance Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    رصيد كشف البنك (ريال سعودي) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={bankBalance}
                    onChange={(e) => setBankBalance(e.target.value)}
                    placeholder="أدخل الرصيد من كشف حساب البنك"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-lg"
                    required
                  />
                </div>

                {/* Variance Display */}
                {bankBalance && currentBalance && (
                  <div className={`p-4 rounded-xl ${Math.abs(calculatedVariance) < 0.01 ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
                    <div className="flex items-center gap-2">
                      {Math.abs(calculatedVariance) < 0.01 ? (
                        <CheckCircleIcon className="h-6 w-6 text-green-600" />
                      ) : (
                        <ExclamationTriangleIcon className="h-6 w-6 text-amber-600" />
                      )}
                      <span className="font-medium">
                        {Math.abs(calculatedVariance) < 0.01 ? 'الرصيد مطابق' : 'يوجد فرق في الرصيد'}
                      </span>
                    </div>
                    {Math.abs(calculatedVariance) >= 0.01 && (
                      <p className={`text-lg font-bold mt-2 ${calculatedVariance > 0 ? 'text-green-700' : 'text-red-700'}`}>
                        الفرق: {calculatedVariance > 0 ? '+' : ''}{formatCurrency(calculatedVariance)} ريال
                        <span className="text-sm font-normal text-gray-500 mr-2">
                          ({calculatedVariance > 0 ? 'فائض في البنك' : 'نقص في البنك'})
                        </span>
                      </p>
                    )}
                  </div>
                )}

                {/* Snapshot Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    تاريخ المطابقة *
                  </label>
                  <input
                    type="date"
                    value={snapshotDate}
                    onChange={(e) => setSnapshotDate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    required
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ملاحظات (اختياري)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="أضف ملاحظات حول هذه المطابقة..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                  />
                </div>

                {/* Error/Success Messages */}
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
                    <ExclamationTriangleIcon className="h-5 w-5" />
                    {error}
                  </div>
                )}
                {success && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 flex items-center gap-2">
                    <CheckCircleIcon className="h-5 w-5" />
                    {success}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || !bankBalance}
                  className="w-full py-3 px-6 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <DocumentTextIcon className="h-5 w-5" />
                      حفظ المطابقة
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* History Tab */
              <div>
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-12">
                    <span className="animate-spin text-4xl">⏳</span>
                  </div>
                ) : snapshots.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <ScaleIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>لا توجد مطابقات سابقة</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {snapshots.map((snapshot) => (
                      <div
                        key={snapshot.id}
                        className={`p-4 rounded-xl border ${
                          snapshot.is_reconciled
                            ? 'bg-green-50 border-green-200'
                            : 'bg-amber-50 border-amber-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {snapshot.is_reconciled ? (
                              <CheckCircleIcon className="h-5 w-5 text-green-600" />
                            ) : (
                              <ExclamationTriangleIcon className="h-5 w-5 text-amber-600" />
                            )}
                            <span className="font-medium">{snapshot.snapshot_date_formatted || snapshot.snapshot_date}</span>
                          </div>
                          <span className={`text-sm px-2 py-1 rounded-full ${
                            snapshot.is_reconciled
                              ? 'bg-green-200 text-green-800'
                              : 'bg-amber-200 text-amber-800'
                          }`}>
                            {snapshot.variance_status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500">رصيد النظام:</span>
                            <span className="font-medium mr-2">{formatCurrency(snapshot.calculated_balance)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">رصيد البنك:</span>
                            <span className="font-medium mr-2">{formatCurrency(snapshot.bank_statement_balance)}</span>
                          </div>
                          {!snapshot.is_reconciled && (
                            <div className="col-span-2">
                              <span className="text-gray-500">الفرق:</span>
                              <span className={`font-bold mr-2 ${snapshot.variance > 0 ? 'text-green-700' : 'text-red-700'}`}>
                                {snapshot.variance > 0 ? '+' : ''}{formatCurrency(snapshot.variance)}
                              </span>
                            </div>
                          )}
                          {snapshot.notes && (
                            <div className="col-span-2 mt-2 pt-2 border-t border-gray-200">
                              <span className="text-gray-500">ملاحظات: </span>
                              <span>{snapshot.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BankReconciliationModal;
