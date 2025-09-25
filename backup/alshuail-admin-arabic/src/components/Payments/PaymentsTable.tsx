import React, { useState, useMemo } from 'react';
import {
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  EllipsisVerticalIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';
import { ARABIC_LABELS } from '../../constants/arabic';
import { Payment, PaymentsTableProps, PaymentAction } from './types';
import {
  formatCurrency,
  formatDate,
  toArabicNumerals,
  getPaymentStatusColor,
  getPaymentCategoryColor,
  getPaymentMethodIcon
} from './utils';

const PaymentsTable: React.FC<PaymentsTableProps> = ({
  payments,
  filters,
  onFilterChange,
  onPaymentSelect,
  onPaymentAction,
  loading = false,
  pagination
}) => {
  const [sortBy, setSortBy] = useState<string>('createdDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);

  // Mock data for demonstration
  const mockPayments: Payment[] = [
    {
      id: '1',
      referenceNumber: 'PAY-12345678-1234',
      memberId: 'member1',
      memberName: 'أحمد محمد السعيد',
      memberAvatar: '/avatars/member1.jpg',
      amount: 150,
      category: 'subscription',
      type: 'regular',
      method: 'bank_transfer',
      status: 'pending',
      description: 'اشتراك شهري - يناير 2024',
      dueDate: new Date('2024-01-15'),
      createdDate: new Date('2024-01-01'),
      createdBy: 'admin1'
    },
    {
      id: '2',
      referenceNumber: 'PAY-12345678-5678',
      memberId: 'member2',
      memberName: 'فاطمة عبد الله النجار',
      amount: 300,
      category: 'activity',
      type: 'one_time',
      method: 'cash',
      status: 'approved',
      description: 'مشاركة في فعالية خيرية',
      dueDate: new Date('2024-01-10'),
      paidDate: new Date('2024-01-08'),
      createdDate: new Date('2023-12-28'),
      createdBy: 'admin1',
      approvedBy: 'admin2',
      approvedDate: new Date('2024-01-08')
    },
    {
      id: '3',
      referenceNumber: 'PAY-12345678-9012',
      memberId: 'member3',
      memberName: 'خالد يوسف الأحمد',
      amount: 200,
      category: 'membership',
      type: 'regular',
      method: 'credit_card',
      status: 'overdue',
      description: 'رسوم عضوية سنوية',
      dueDate: new Date('2023-12-20'),
      createdDate: new Date('2023-12-01'),
      createdBy: 'admin1'
    }
  ];

  const sortedPayments = useMemo(() => {
    const paymentsToSort = payments.length > 0 ? payments : mockPayments;
    return [...paymentsToSort].sort((a, b) => {
      let aValue: any = a[sortBy as keyof Payment];
      let bValue: any = b[sortBy as keyof Payment];

      // Handle undefined values
      if (aValue === undefined || aValue === null) aValue = '';
      if (bValue === undefined || bValue === null) bValue = '';

      if (sortBy.includes('Date')) {
        aValue = new Date(aValue as Date).getTime();
        bValue = new Date(bValue as Date).getTime();
      } else if (sortBy === 'amount') {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      } else if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      } else {
        // Provide default values for any undefined cases
        aValue = aValue ?? '';
        bValue = bValue ?? '';
      }

      // Direct comparison with type-safe values
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }, [payments, mockPayments, sortBy, sortOrder]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleSelectPayment = (paymentId: string) => {
    setSelectedPayments(prev => {
      if (prev.includes(paymentId)) {
        return prev.filter(id => id !== paymentId);
      } else {
        return [...prev, paymentId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedPayments.length === sortedPayments.length) {
      setSelectedPayments([]);
    } else {
      setSelectedPayments(sortedPayments.map(p => p.id));
    }
  };

  const handleAction = (paymentId: string, action: PaymentAction) => {
    onPaymentAction(paymentId, action);
    setShowActionMenu(null);
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      paid: 'bg-blue-100 text-blue-800 border-blue-200',
      overdue: 'bg-red-100 text-red-800 border-red-200',
      rejected: 'bg-gray-100 text-gray-800 border-gray-200',
      refunded: 'bg-purple-100 text-purple-800 border-purple-200',
      cancelled: 'bg-gray-100 text-gray-800 border-gray-200'
    };

    const statusLabels = {
      pending: 'معلق',
      approved: 'موافق عليه',
      paid: 'مدفوع',
      overdue: 'متأخر',
      rejected: 'مرفوض',
      refunded: 'مسترد',
      cancelled: 'ملغي'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[status as keyof typeof statusColors]}`}>
        {statusLabels[status as keyof typeof statusLabels]}
      </span>
    );
  };

  const getCategoryBadge = (category: string) => {
    const categoryColors = {
      subscription: 'bg-blue-100 text-blue-800',
      activity: 'bg-purple-100 text-purple-800',
      membership: 'bg-green-100 text-green-800',
      donation: 'bg-yellow-100 text-yellow-800',
      penalty: 'bg-red-100 text-red-800',
      refund: 'bg-gray-100 text-gray-800'
    };

    const categoryLabels = {
      subscription: 'اشتراك',
      activity: 'نشاط',
      membership: 'عضوية',
      donation: 'تبرع',
      penalty: 'غرامة',
      refund: 'استرداد'
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${categoryColors[category as keyof typeof categoryColors]}`}>
        {categoryLabels[category as keyof typeof categoryLabels]}
      </span>
    );
  };

  const SortButton: React.FC<{ field: string; children: React.ReactNode }> = ({ field, children }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 text-right hover:text-blue-300 transition-colors"
    >
      {children}
      {sortBy === field && (
        sortOrder === 'asc' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />
      )}
    </button>
  );

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-8" dir="rtl">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <span className="mr-3 text-white">{ARABIC_LABELS.loading}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl overflow-hidden" dir="rtl">
      {/* Table Header */}
      <div className="px-6 py-4 border-b border-white/20">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            قائمة المدفوعات ({toArabicNumerals(sortedPayments.length)})
          </h2>

          {selectedPayments.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-300">
                تم تحديد {toArabicNumerals(selectedPayments.length)} عنصر
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    selectedPayments.forEach(id =>
                      handleAction(id, { type: 'approve' })
                    );
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 transition-colors text-sm"
                >
                  <CheckCircleIcon className="h-4 w-4" />
                  موافقة
                </button>
                <button
                  onClick={() => {
                    selectedPayments.forEach(id =>
                      handleAction(id, { type: 'reject' })
                    );
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
                >
                  <XCircleIcon className="h-4 w-4" />
                  رفض
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-white/5">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={selectedPayments.length === sortedPayments.length && sortedPayments.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                <SortButton field="referenceNumber">
                  {ARABIC_LABELS.paymentReference}
                </SortButton>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                <SortButton field="memberName">
                  اسم العضو
                </SortButton>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                <SortButton field="amount">
                  {ARABIC_LABELS.amount}
                </SortButton>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                <SortButton field="category">
                  {ARABIC_LABELS.paymentCategory}
                </SortButton>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                <SortButton field="method">
                  {ARABIC_LABELS.paymentMethod}
                </SortButton>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                <SortButton field="status">
                  {ARABIC_LABELS.status}
                </SortButton>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                <SortButton field="dueDate">
                  {ARABIC_LABELS.dueDate}
                </SortButton>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                الإجراءات
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {sortedPayments.map((payment) => (
              <tr
                key={payment.id}
                className="hover:bg-white/5 transition-colors cursor-pointer"
                onClick={() => onPaymentSelect(payment)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedPayments.includes(payment.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleSelectPayment(payment.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-white">
                    {payment.referenceNumber}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {payment.memberAvatar ? (
                      <img
                        className="h-8 w-8 rounded-full ml-3"
                        src={payment.memberAvatar}
                        alt={payment.memberName}
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center ml-3">
                        <span className="text-xs font-medium text-white">
                          {payment.memberName.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="text-sm font-medium text-white">
                      {payment.memberName}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-semibold text-white">
                    {formatCurrency(payment.amount)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getCategoryBadge(payment.category)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="ml-2 text-lg">
                      {getPaymentMethodIcon(payment.method)}
                    </span>
                    <span className="text-sm text-gray-300">
                      {payment.method === 'cash' && 'نقدي'}
                      {payment.method === 'bank_transfer' && 'حوالة بنكية'}
                      {payment.method === 'credit_card' && 'بطاقة ائتمان'}
                      {payment.method === 'debit_card' && 'بطاقة مدين'}
                      {payment.method === 'digital_wallet' && 'محفظة رقمية'}
                      {payment.method === 'app_payment' && 'دفع إلكتروني'}
                      {payment.method === 'check' && 'شيك'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(payment.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {formatDate(payment.dueDate)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowActionMenu(showActionMenu === payment.id ? null : payment.id);
                      }}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <EllipsisVerticalIcon className="h-5 w-5" />
                    </button>

                    {showActionMenu === payment.id && (
                      <div className="absolute left-0 mt-2 w-48 bg-white/90 backdrop-blur-sm rounded-md shadow-lg z-10 border border-gray-200">
                        <div className="py-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onPaymentSelect(payment);
                              setShowActionMenu(null);
                            }}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-right"
                          >
                            <EyeIcon className="h-4 w-4" />
                            {ARABIC_LABELS.view}
                          </button>

                          {payment.status === 'pending' && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAction(payment.id, { type: 'approve' });
                                }}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-green-700 hover:bg-green-50 w-full text-right"
                              >
                                <CheckCircleIcon className="h-4 w-4" />
                                {ARABIC_LABELS.approvePayment}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAction(payment.id, { type: 'reject' });
                                }}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-red-700 hover:bg-red-50 w-full text-right"
                              >
                                <XCircleIcon className="h-4 w-4" />
                                {ARABIC_LABELS.rejectPayment}
                              </button>
                            </>
                          )}

                          {(payment.status === 'approved' || payment.status === 'paid') && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAction(payment.id, { type: 'receipt' });
                                }}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-blue-700 hover:bg-blue-50 w-full text-right"
                              >
                                <DocumentTextIcon className="h-4 w-4" />
                                {ARABIC_LABELS.generateReceipt}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAction(payment.id, { type: 'refund' });
                                }}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-purple-700 hover:bg-purple-50 w-full text-right"
                              >
                                <ArrowPathIcon className="h-4 w-4" />
                                {ARABIC_LABELS.refundPayment}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="px-6 py-4 border-t border-white/20">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-300">
              عرض {toArabicNumerals(((pagination.page - 1) * pagination.pageSize) + 1)} إلى{' '}
              {toArabicNumerals(Math.min(pagination.page * pagination.pageSize, pagination.total))} من{' '}
              {toArabicNumerals(pagination.total)} نتيجة
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => pagination.onPageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>

              <span className="px-3 py-1 bg-white/10 rounded text-sm text-white">
                {toArabicNumerals(pagination.page)}
              </span>

              <button
                onClick={() => pagination.onPageChange(pagination.page + 1)}
                disabled={pagination.page * pagination.pageSize >= pagination.total}
                className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {sortedPayments.length === 0 && (
        <div className="px-6 py-12 text-center">
          <div className="text-gray-400 mb-4">
            <BanknotesIcon className="h-12 w-12 mx-auto mb-4" />
            <p className="text-lg font-medium">لا توجد مدفوعات</p>
            <p className="text-sm">لم يتم العثور على مدفوعات تطابق المعايير المحددة</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsTable;