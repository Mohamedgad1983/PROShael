// Utility functions for payment management

import { CURRENCY, HIJRI_MONTHS } from '../../constants/arabic';
import { PaymentCategory, PaymentMethod, PaymentStatus, PaymentValidation, PaymentFormData } from './types';
import { formatHijriDate, getCurrentHijriDate, isOverdue, getDaysUntil } from '../../utils/hijriDateUtils';

// Arabic numerals mapping
const ARABIC_NUMERALS = {
  '0': '٠',
  '1': '١',
  '2': '٢',
  '3': '٣',
  '4': '٤',
  '5': '٥',
  '6': '٦',
  '7': '٧',
  '8': '٨',
  '9': '٩'
};

// Convert English numerals to Arabic numerals
export const toArabicNumerals = (num: number | string): string => {
  return num.toString().replace(/[0-9]/g, (digit) => ARABIC_NUMERALS[digit as keyof typeof ARABIC_NUMERALS]);
};

// Format currency in Arabic
export const formatCurrency = (amount: number): string => {
  const formattedAmount = new Intl.NumberFormat('ar-SA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);

  return `${toArabicNumerals(formattedAmount)} ${CURRENCY.symbol}`;
};

// Format date in Arabic (using Hijri as primary)
export const formatDate = (date: Date | string | undefined): string => {
  // Return Hijri date with Arabic numerals
  const hijriFormatted = formatHijriDate(date);
  return toArabicNumerals(hijriFormatted);
};

// Format datetime in Arabic
export const formatDateTime = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    calendar: 'gregory'
  };

  const formatted = new Intl.DateTimeFormat('ar-SA', options).format(date);
  return toArabicNumerals(formatted);
};

// Generate payment reference number
export const generatePaymentReference = (): string => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString().slice(-4);
  return `PAY-${timestamp}-${random}`;
};

// Validate payment amount for subscriptions (must be multiples of 50 SAR)
export const validateSubscriptionAmount = (amount: number, category: PaymentCategory): boolean => {
  if (category === 'subscription') {
    return amount >= 50 && amount % 50 === 0;
  }
  return amount >= 1;
};

// Get payment status color
export const getPaymentStatusColor = (status: PaymentStatus): string => {
  const colors = {
    pending: '#f59e0b',
    approved: '#10b981',
    paid: '#059669',
    overdue: '#ef4444',
    rejected: '#dc2626',
    refunded: '#6b7280',
    cancelled: '#9ca3af'
  };
  return colors[status];
};

// Get payment category color
export const getPaymentCategoryColor = (category: PaymentCategory): string => {
  const colors = {
    subscription: '#3b82f6',
    activity: '#8b5cf6',
    membership: '#10b981',
    donation: '#f59e0b',
    penalty: '#ef4444',
    refund: '#6b7280'
  };
  return colors[category];
};

// Get payment method icon
export const getPaymentMethodIcon = (method: PaymentMethod): string => {
  const icons = {
    cash: '💰',
    bank_transfer: '🏦',
    credit_card: '💳',
    debit_card: '💳',
    digital_wallet: '📱',
    app_payment: '📱',
    check: '📋'
  };
  return icons[method];
};

// Validate payment form data
export const validatePaymentForm = (data: PaymentFormData): PaymentValidation => {
  const errors: PaymentValidation['errors'] = {};

  // Member ID validation
  if (!data.memberId || data.memberId.trim() === '') {
    errors.memberId = 'يجب اختيار عضو';
  }

  // Amount validation
  if (!data.amount || data.amount <= 0) {
    errors.amount = 'يجب إدخال مبلغ صحيح';
  } else if (!validateSubscriptionAmount(data.amount, data.category)) {
    errors.amount = 'مبلغ الاشتراك يجب أن يكون من مضاعفات ٥٠ ريال';
  }

  // Category validation
  if (!data.category) {
    errors.category = 'يجب اختيار فئة الدفع';
  }

  // Payment method validation
  if (!data.method) {
    errors.method = 'يجب اختيار طريقة الدفع';
  }

  // Due date validation
  if (!data.dueDate) {
    errors.dueDate = 'يجب تحديد تاريخ الاستحقاق';
  } else if (data.dueDate < new Date()) {
    errors.dueDate = 'تاريخ الاستحقاق لا يمكن أن يكون في الماضي';
  }

  // Recurring payment validation
  if (data.isRecurring && !data.recurringPeriod) {
    errors.recurringPeriod = 'يجب تحديد فترة التكرار';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Calculate payment statistics
export const calculatePaymentStats = (payments: any[]) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const stats = {
    totalPayments: payments.length,
    totalRevenue: 0,
    pendingPayments: 0,
    pendingAmount: 0,
    overduePayments: 0,
    overdueAmount: 0,
    approvedPayments: 0,
    approvedAmount: 0,
    monthlyRevenue: 0,
    yearlyRevenue: 0
  };

  payments.forEach(payment => {
    // Total revenue from paid payments
    if (payment.status === 'paid' || payment.status === 'approved') {
      stats.totalRevenue += payment.amount;
    }

    // Pending payments
    if (payment.status === 'pending') {
      stats.pendingPayments++;
      stats.pendingAmount += payment.amount;
    }

    // Overdue payments
    if (payment.status === 'overdue' ||
        (payment.status === 'pending' && new Date(payment.dueDate) < now)) {
      stats.overduePayments++;
      stats.overdueAmount += payment.amount;
    }

    // Approved payments
    if (payment.status === 'approved' || payment.status === 'paid') {
      stats.approvedPayments++;
      stats.approvedAmount += payment.amount;
    }

    // Monthly revenue
    if ((payment.status === 'paid' || payment.status === 'approved') &&
        payment.paidDate && new Date(payment.paidDate) >= startOfMonth) {
      stats.monthlyRevenue += payment.amount;
    }

    // Yearly revenue
    if ((payment.status === 'paid' || payment.status === 'approved') &&
        payment.paidDate && new Date(payment.paidDate) >= startOfYear) {
      stats.yearlyRevenue += payment.amount;
    }
  });

  return stats;
};

// Filter payments based on criteria
export const filterPayments = (payments: any[], filters: any) => {
  return payments.filter(payment => {
    // Status filter
    if (filters.status && filters.status.length > 0) {
      if (!filters.status.includes(payment.status)) return false;
    }

    // Category filter
    if (filters.category && filters.category.length > 0) {
      if (!filters.category.includes(payment.category)) return false;
    }

    // Method filter
    if (filters.method && filters.method.length > 0) {
      if (!filters.method.includes(payment.method)) return false;
    }

    // Date range filter
    if (filters.dateRange) {
      const paymentDate = new Date(payment.createdDate);
      if (paymentDate < filters.dateRange.start || paymentDate > filters.dateRange.end) {
        return false;
      }
    }

    // Amount range filter
    if (filters.amountRange) {
      if (payment.amount < filters.amountRange.min || payment.amount > filters.amountRange.max) {
        return false;
      }
    }

    // Member filter
    if (filters.memberId && payment.memberId !== filters.memberId) {
      return false;
    }

    // Search filter
    if (filters.search && filters.search.trim() !== '') {
      const searchTerm = filters.search.toLowerCase();
      const searchFields = [
        payment.memberName,
        payment.referenceNumber,
        payment.description,
        payment.amount.toString()
      ];

      if (!searchFields.some(field =>
        field && field.toString().toLowerCase().includes(searchTerm)
      )) {
        return false;
      }
    }

    return true;
  });
};

// Sort payments
export const sortPayments = (payments: any[], sortBy: string, sortOrder: 'asc' | 'desc' = 'desc') => {
  return [...payments].sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];

    // Handle date fields
    if (sortBy.includes('Date')) {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }

    // Handle numeric fields
    if (sortBy === 'amount') {
      aValue = Number(aValue);
      bValue = Number(bValue);
    }

    // Handle string fields
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });
};

// Export payment data to CSV
export const exportPaymentsToCSV = (payments: any[]) => {
  const headers = [
    'رقم المرجع',
    'اسم العضو',
    'المبلغ',
    'الفئة',
    'طريقة الدفع',
    'الحالة',
    'تاريخ الإنشاء',
    'تاريخ الاستحقاق',
    'تاريخ الدفع'
  ];

  const rows = payments.map(payment => [
    payment.referenceNumber,
    payment.memberName,
    formatCurrency(payment.amount),
    payment.category,
    payment.method,
    payment.status,
    formatDate(new Date(payment.createdDate)),
    formatDate(new Date(payment.dueDate)),
    payment.paidDate ? formatDate(new Date(payment.paidDate)) : ''
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `payments_${formatDate(new Date())}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};