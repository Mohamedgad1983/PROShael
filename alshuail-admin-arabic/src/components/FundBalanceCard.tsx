/**
 * Fund Balance Card Component
 * Displays current fund balance with breakdown and low balance warning
 * Feature: 001-fund-balance-system (User Story 1)
 *
 * Constitution Compliance:
 * - Principle I: Arabic-First (Arabic labels as primary)
 * - Principle V: Financial Accuracy (displays accurate balance)
 * - Principle VI: Fund Balance Integrity (shows real-time balance)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';
import {
  BanknotesIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ScaleIcon
} from '@heroicons/react/24/outline';
import BankReconciliationModal from './BankReconciliationModal';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.alshailfund.com/api';

interface FundBalanceData {
  total_revenue: number;
  total_expenses: number;
  total_internal_diya: number;
  current_balance: number;
  is_low_balance: boolean;
  min_threshold: number;
  currency: string;
  last_calculated: string;
}

interface FundBalanceCardProps {
  onReconciliationClick?: () => void;
  compact?: boolean;
  showReconciliationButton?: boolean;
}

const FundBalanceCard: React.FC<FundBalanceCardProps> = ({
  onReconciliationClick,
  compact = false,
  showReconciliationButton = true
}) => {
  const { token } = useAuth();
  const [balance, setBalance] = useState<FundBalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [showReconciliationModal, setShowReconciliationModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!token) return;

    try {
      setIsRefreshing(true);
      const response = await fetch(`${API_URL}/fund/balance`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setBalance(data.data);
        setLastRefresh(new Date());
        setError(null);
      } else {
        throw new Error(data.error || 'Failed to fetch balance');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطأ في جلب الرصيد';
      logger.error('Error fetching fund balance:', { error: errorMessage });
      setError(errorMessage);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchBalance();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const handleRefresh = () => {
    fetchBalance();
  };

  if (loading && !balance) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="animate-pulse flex flex-col gap-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-10 bg-gray-200 rounded w-2/3"></div>
          <div className="flex gap-4">
            <div className="h-4 bg-gray-200 rounded flex-1"></div>
            <div className="h-4 bg-gray-200 rounded flex-1"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !balance) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-center gap-3 text-red-700">
          <ExclamationTriangleIcon className="h-6 w-6" />
          <div>
            <p className="font-semibold">خطأ في جلب رصيد الصندوق</p>
            <p className="text-sm">{error}</p>
          </div>
          <button
            onClick={handleRefresh}
            className="mr-auto px-3 py-1 bg-red-100 hover:bg-red-200 rounded-lg text-sm"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  if (!balance) return null;

  const isLowBalance = balance.is_low_balance;

  const handleReconciliationClick = () => {
    if (onReconciliationClick) {
      onReconciliationClick();
    } else if (showReconciliationButton) {
      setShowReconciliationModal(true);
    }
  };

  const handleReconciliationComplete = () => {
    fetchBalance();
    setShowReconciliationModal(false);
  };

  // Compact version for sidebar or smaller displays
  if (compact) {
    return (
      <div className={`rounded-xl p-4 ${isLowBalance ? 'bg-amber-50 border-2 border-amber-300' : 'bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200'}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <BanknotesIcon className={`h-5 w-5 ${isLowBalance ? 'text-amber-600' : 'text-emerald-600'}`} />
            <span className="text-sm font-medium text-gray-700">رصيد الصندوق</span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-1 hover:bg-white/50 rounded-full transition-colors"
          >
            <ArrowPathIcon className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''} text-gray-500`} />
          </button>
        </div>
        <div className={`text-2xl font-bold ${isLowBalance ? 'text-amber-700' : 'text-emerald-700'}`}>
          {formatCurrency(balance.current_balance)} <span className="text-sm font-normal">ريال</span>
        </div>
        {isLowBalance && (
          <div className="flex items-center gap-1 mt-2 text-amber-600 text-xs">
            <ExclamationTriangleIcon className="h-4 w-4" />
            <span>الرصيد منخفض</span>
          </div>
        )}
      </div>
    );
  }

  // Full version
  return (
    <div className={`rounded-2xl shadow-lg overflow-hidden ${isLowBalance ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300' : 'bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-200'}`}>
      {/* Header */}
      <div className={`px-6 py-4 ${isLowBalance ? 'bg-amber-100/50' : 'bg-emerald-100/50'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isLowBalance ? 'bg-amber-200' : 'bg-emerald-200'}`}>
              <BanknotesIcon className={`h-6 w-6 ${isLowBalance ? 'text-amber-700' : 'text-emerald-700'}`} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">رصيد الصندوق</h3>
              <p className="text-xs text-gray-500">Fund Balance</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {showReconciliationButton && (
              <button
                onClick={handleReconciliationClick}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${isLowBalance ? 'bg-amber-200 hover:bg-amber-300 text-amber-800' : 'bg-emerald-200 hover:bg-emerald-300 text-emerald-800'}`}
              >
                <ScaleIcon className="h-4 w-4 inline-block ml-1" />
                مطابقة بنكية
              </button>
            )}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`p-2 rounded-lg transition-colors ${isLowBalance ? 'hover:bg-amber-200' : 'hover:bg-emerald-200'}`}
              title="تحديث الرصيد"
            >
              <ArrowPathIcon className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''} ${isLowBalance ? 'text-amber-600' : 'text-emerald-600'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Balance Display */}
      <div className="px-6 py-6">
        <div className="text-center mb-6">
          <div className={`text-4xl font-bold mb-1 ${isLowBalance ? 'text-amber-700' : 'text-emerald-700'}`}>
            {formatCurrency(balance.current_balance)}
            <span className="text-lg font-normal mr-2">ريال سعودي</span>
          </div>
          {isLowBalance && (
            <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 bg-amber-200 rounded-full text-amber-800 text-sm">
              <ExclamationTriangleIcon className="h-4 w-4" />
              <span>تحذير: الرصيد أقل من {formatCurrency(balance.min_threshold)} ريال</span>
            </div>
          )}
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-3 gap-4">
          {/* Revenue */}
          <div className="bg-white/60 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-1 mb-2">
              <ArrowTrendingUpIcon className="h-4 w-4 text-green-600" />
              <span className="text-xs text-gray-500">الإيرادات</span>
            </div>
            <div className="text-lg font-bold text-green-700">
              {formatCurrency(balance.total_revenue)}
            </div>
            <div className="text-xs text-gray-400">Revenue</div>
          </div>

          {/* Expenses */}
          <div className="bg-white/60 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-1 mb-2">
              <ArrowTrendingDownIcon className="h-4 w-4 text-red-600" />
              <span className="text-xs text-gray-500">المصروفات</span>
            </div>
            <div className="text-lg font-bold text-red-700">
              {formatCurrency(balance.total_expenses)}
            </div>
            <div className="text-xs text-gray-400">Expenses</div>
          </div>

          {/* Internal Diya */}
          <div className="bg-white/60 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-1 mb-2">
              <ArrowTrendingDownIcon className="h-4 w-4 text-purple-600" />
              <span className="text-xs text-gray-500">الدية الداخلية</span>
            </div>
            <div className="text-lg font-bold text-purple-700">
              {formatCurrency(balance.total_internal_diya)}
            </div>
            <div className="text-xs text-gray-400">Internal Diya</div>
          </div>
        </div>

        {/* Last Updated */}
        {lastRefresh && (
          <div className="text-center mt-4 text-xs text-gray-400">
            آخر تحديث: {lastRefresh.toLocaleTimeString('ar-SA')}
          </div>
        )}
      </div>

      {/* Bank Reconciliation Modal */}
      <BankReconciliationModal
        isOpen={showReconciliationModal}
        onClose={() => setShowReconciliationModal(false)}
        currentBalance={balance.current_balance}
        onReconciliationComplete={handleReconciliationComplete}
      />
    </div>
  );
};

export default FundBalanceCard;
