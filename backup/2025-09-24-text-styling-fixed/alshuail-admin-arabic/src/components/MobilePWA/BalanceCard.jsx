/**
 * BalanceCard - Enhanced balance display with color coding and progress
 * Features: Color coding (green ≥3000, red <3000), progress bar, Arabic numerals
 */

import React from 'react';
import { useMobile, useHapticFeedback } from '../../hooks/useMobile';
import '../../styles/mobile-arabic.css';

const BalanceCard = ({
  balance = 0,
  minimumBalance = 3000,
  currency = 'ريال',
  lastPaymentDate = null,
  nextPaymentDue = null,
  onViewDetails = null
}) => {
  const { viewport } = useMobile();
  const { feedback } = useHapticFeedback();

  // Convert numbers to Arabic numerals
  const toArabicNumerals = (num) => {
    if (num === null || num === undefined) return '';
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return String(num).replace(/[0-9]/g, (digit) => arabicNumerals[parseInt(digit)]);
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Determine balance status
  const isAboveMinimum = balance >= minimumBalance;
  const progressPercentage = Math.min((balance / minimumBalance) * 100, 100);
  const shortfall = minimumBalance - balance;

  // Status colors and icons
  const statusConfig = {
    good: {
      bgClass: 'bg-success bg-opacity-20',
      borderClass: 'border-success',
      textClass: 'text-success',
      icon: '✅',
      message: 'رصيدك ممتاز'
    },
    warning: {
      bgClass: 'bg-warning bg-opacity-20',
      borderClass: 'border-warning',
      textClass: 'text-warning',
      icon: '⚠️',
      message: 'قريب من الحد الأدنى'
    },
    critical: {
      bgClass: 'bg-error bg-opacity-20',
      borderClass: 'border-error',
      textClass: 'text-error',
      icon: '❌',
      message: 'أقل من الحد الأدنى'
    }
  };

  // Determine current status
  let currentStatus = 'good';
  if (balance < minimumBalance) {
    currentStatus = 'critical';
  } else if (balance < minimumBalance * 1.2) {
    currentStatus = 'warning';
  }

  const status = statusConfig[currentStatus];

  // Handle card tap
  const handleCardTap = () => {
    feedback('light');
    if (onViewDetails) {
      onViewDetails();
    }
  };

  return (
    <div
      className={`glass-card cursor-pointer transition-all hover:transform hover:scale-[1.02] ${
        status.bgClass
      } ${status.borderClass} border`}
      onClick={handleCardTap}
    >

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${status.bgClass} rounded-lg flex items-center justify-center text-lg`}>
            {status.icon}
          </div>
          <div>
            <h3 className="font-semibold text-white">الرصيد الحالي</h3>
            <p className={`text-xs ${status.textClass}`}>{status.message}</p>
          </div>
        </div>

        {/* Menu button */}
        <button
          className="touch-target glass rounded-lg opacity-70 hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            feedback('light');
          }}
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </div>

      {/* Main balance display */}
      <div className="text-center mb-6">
        <div className="mb-2">
          <span className={`text-4xl font-bold ${
            viewport.isMobile ? 'text-3xl' : 'text-4xl'
          } text-white`}>
            {toArabicNumerals(formatCurrency(balance))}
          </span>
          <span className="text-slate-300 text-lg mr-2">{currency}</span>
        </div>

        {!isAboveMinimum && (
          <p className="text-sm text-slate-300">
            يحتاج {toArabicNumerals(formatCurrency(shortfall))} {currency} للوصول للحد الأدنى
          </p>
        )}
      </div>

      {/* Progress bar to minimum balance */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span>التقدم نحو الحد الأدنى</span>
          <span>{toArabicNumerals(Math.round(progressPercentage))}%</span>
        </div>

        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ease-out ${
              isAboveMinimum ? 'bg-success' :
              progressPercentage > 70 ? 'bg-warning' : 'bg-error'
            }`}
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
          <span>{toArabicNumerals(0)}</span>
          <span>{toArabicNumerals(formatCurrency(minimumBalance))} {currency}</span>
        </div>
      </div>

      {/* Payment information */}
      {(lastPaymentDate || nextPaymentDue) && (
        <div className={`border-t border-slate-600 pt-4 ${
          viewport.isMobile ? 'space-y-2' : 'flex justify-between'
        }`}>
          {lastPaymentDate && (
            <div className="text-center">
              <p className="text-xs text-slate-400">آخر دفعة</p>
              <p className="text-sm text-white font-medium">
                {toArabicNumerals(lastPaymentDate)}
              </p>
            </div>
          )}

          {nextPaymentDue && (
            <div className="text-center">
              <p className="text-xs text-slate-400">الدفعة التالية</p>
              <p className="text-sm text-white font-medium">
                {toArabicNumerals(nextPaymentDue)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div className={`border-t border-slate-600 pt-4 mt-4 ${
        viewport.isMobile ? 'space-y-2' : 'flex gap-2'
      }`}>
        <button
          className="btn btn-primary flex-1 text-sm py-2"
          onClick={(e) => {
            e.stopPropagation();
            feedback('medium');
          }}
        >
          💳 دفع مبلغ
        </button>

        <button
          className="btn btn-secondary flex-1 text-sm py-2"
          onClick={(e) => {
            e.stopPropagation();
            feedback('light');
          }}
        >
          📊 كشف الحساب
        </button>
      </div>

    </div>
  );
};

export default BalanceCard;