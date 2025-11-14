import React, { memo,  useState } from 'react';
import {
  XMarkIcon,
  UserIcon,
  BanknotesIcon,
  CalendarIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  PrinterIcon,
  DocumentArrowDownIcon,
  TagIcon,
  BuildingLibraryIcon,
  CreditCardIcon,
  DevicePhoneMobileIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { ARABIC_LABELS } from '../../constants/arabic';
import { PaymentDetailsModalProps, PaymentAction, PaymentHistoryEntry } from './types';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  toArabicNumerals,
  getPaymentStatusColor,
  getPaymentCategoryColor,
  getPaymentMethodIcon
} from './utils';

const PaymentDetailsModal: React.FC<PaymentDetailsModalProps> = ({
  payment,
  isOpen,
  onClose,
  onAction,
  history = []
}) => {
  const [showConfirmDialog, setShowConfirmDialog] = useState<{
    action: PaymentAction;
    show: boolean;
  }>({ action: { type: 'approve' }, show: false });
  const [refundReason, setRefundReason] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  // Mock history data if not provided
  const mockHistory: PaymentHistoryEntry[] = [
    {
      id: '1',
      action: 'إنشاء الدفعة',
      actionBy: 'أحمد المدير',
      actionDate: new Date('2024-01-01T10:00:00'),
      newStatus: 'pending',
      notes: 'تم إنشاء دفعة جديدة'
    },
    {
      id: '2',
      action: 'مراجعة المدفوعات',
      actionBy: 'سارة المحاسبة',
      actionDate: new Date('2024-01-02T14:30:00'),
      notes: 'تمت المراجعة والتأكد من البيانات'
    }
  ];

  const paymentHistory = history.length > 0 ? history : mockHistory;

  if (!isOpen || !payment) return null;

  const handleAction = (action: PaymentAction) => {
    if (action.type === 'refund' || action.type === 'reject') {
      setShowConfirmDialog({ action, show: true });
    } else {
      onAction(action);
    }
  };

  const handleConfirmAction = () => {
    const action = showConfirmDialog.action;
    if (action.type === 'refund') {
      onAction({ ...action, reason: refundReason });
    } else if (action.type === 'reject') {
      onAction({ ...action, reason: rejectReason });
    } else {
      onAction(action);
    }
    setShowConfirmDialog({ action: { type: 'approve' }, show: false });
    setRefundReason('');
    setRejectReason('');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'معلق', color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon },
      approved: { label: 'موافق عليه', color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
      paid: { label: 'مدفوع', color: 'bg-blue-100 text-blue-800', icon: CheckCircleIcon },
      overdue: { label: 'متأخر', color: 'bg-red-100 text-red-800', icon: ExclamationTriangleIcon },
      rejected: { label: 'مرفوض', color: 'bg-gray-100 text-gray-800', icon: XCircleIcon },
      refunded: { label: 'مسترد', color: 'bg-purple-100 text-purple-800', icon: ArrowPathIcon },
      cancelled: { label: 'ملغي', color: 'bg-gray-100 text-gray-800', icon: XCircleIcon }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        <Icon className="h-4 w-4" />
        {config.label}
      </span>
    );
  };

  const getCategoryBadge = (category: string) => {
    const categoryConfig = {
      subscription: { label: 'اشتراك', color: 'bg-blue-100 text-blue-800' },
      activity: { label: 'نشاط', color: 'bg-purple-100 text-purple-800' },
      membership: { label: 'عضوية', color: 'bg-green-100 text-green-800' },
      donation: { label: 'تبرع', color: 'bg-yellow-100 text-yellow-800' },
      penalty: { label: 'غرامة', color: 'bg-red-100 text-red-800' },
      refund: { label: 'استرداد', color: 'bg-gray-100 text-gray-800' }
    };

    const config = categoryConfig[category as keyof typeof categoryConfig];
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-sm font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getPaymentMethodLabel = (method: string) => {
    const methodLabels = {
      cash: 'نقدي',
      bank_transfer: 'حوالة بنكية',
      credit_card: 'بطاقة ائتمان',
      debit_card: 'بطاقة مدين',
      digital_wallet: 'محفظة رقمية',
      app_payment: 'دفع إلكتروني',
      check: 'شيك'
    };
    return methodLabels[method as keyof typeof methodLabels];
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/20">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white">
                {ARABIC_LABELS.paymentDetails}
              </h2>
              <span className="text-sm text-gray-400">
                #{payment.referenceNumber}
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Status and Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {getStatusBadge(payment.status)}
                {getCategoryBadge(payment.category)}
              </div>

              <div className="flex gap-2">
                {payment.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleAction({ type: 'approve' })}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 transition-colors"
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                      {ARABIC_LABELS.approvePayment}
                    </button>
                    <button
                      onClick={() => handleAction({ type: 'reject' })}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors"
                    >
                      <XCircleIcon className="h-4 w-4" />
                      {ARABIC_LABELS.rejectPayment}
                    </button>
                  </>
                )}

                {(payment.status === 'approved' || payment.status === 'paid') && (
                  <>
                    <button
                      onClick={() => handleAction({ type: 'receipt' })}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors"
                    >
                      <DocumentTextIcon className="h-4 w-4" />
                      {ARABIC_LABELS.generateReceipt}
                    </button>
                    <button
                      onClick={() => handleAction({ type: 'refund' })}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-colors"
                    >
                      <ArrowPathIcon className="h-4 w-4" />
                      {ARABIC_LABELS.refundPayment}
                    </button>
                  </>
                )}

                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-500/20 text-gray-300 rounded-lg hover:bg-gray-500/30 transition-colors"
                >
                  <PrinterIcon className="h-4 w-4" />
                  {ARABIC_LABELS.print}
                </button>
              </div>
            </div>

            {/* Payment Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Member Information */}
              <div className="bg-white/5 rounded-lg p-4 space-y-3">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <UserIcon className="h-5 w-5" />
                  معلومات العضو
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    {payment.memberAvatar ? (
                      <img
                        src={payment.memberAvatar}
                        alt={payment.memberName}
                        className="h-10 w-10 rounded-full"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gray-600 flex items-center justify-center">
                        <span className="text-sm font-medium text-white">
                          {payment.memberName.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-white font-medium">{payment.memberName}</p>
                      <p className="text-gray-400 text-sm">رقم العضو: {payment.memberId}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="bg-white/5 rounded-lg p-4 space-y-3">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <BanknotesIcon className="h-5 w-5" />
                  معلومات الدفع
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">المبلغ:</span>
                    <span className="text-white font-semibold text-lg">
                      {formatCurrency(payment.amount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">طريقة الدفع:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getPaymentMethodIcon(payment.method)}</span>
                      <span className="text-white">{getPaymentMethodLabel(payment.method)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">النوع:</span>
                    <span className="text-white">
                      {payment.type === 'regular' && 'عادي'}
                      {payment.type === 'flexible' && 'مرن'}
                      {payment.type === 'installment' && 'تقسيط'}
                      {payment.type === 'one_time' && 'دفعة واحدة'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="bg-white/5 rounded-lg p-4 space-y-3">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  التواريخ
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">التاريخ الهجري:</span>
                    <div className="text-right">
                      <div className="text-white font-semibold text-lg">
                        {payment.hijri_formatted || payment.hijri_date_string || 'غير محدد'}
                      </div>
                      <div className="text-gray-400 text-sm">
                        ({formatDate(payment.createdDate)})
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">تاريخ الاستحقاق:</span>
                    <span className={`${new Date(payment.dueDate) < new Date() && payment.status === 'pending' ? 'text-red-400' : 'text-white'}`}>
                      {formatDate(payment.dueDate)}
                    </span>
                  </div>
                  {payment.paidDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">تاريخ الدفع:</span>
                      <span className="text-green-400">{formatDate(payment.paidDate)}</span>
                    </div>
                  )}
                  {payment.approvedDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">تاريخ الموافقة:</span>
                      <span className="text-white">{formatDate(payment.approvedDate)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Information */}
              <div className="bg-white/5 rounded-lg p-4 space-y-3">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <DocumentTextIcon className="h-5 w-5" />
                  معلومات إضافية
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">أنشئ بواسطة:</span>
                    <span className="text-white">{payment.createdBy}</span>
                  </div>
                  {payment.approvedBy && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">وافق عليه:</span>
                      <span className="text-white">{payment.approvedBy}</span>
                    </div>
                  )}
                  {payment.isRecurring && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">دفعة متكررة:</span>
                      <span className="text-blue-400">
                        {payment.recurringPeriod === 'monthly' && 'شهرياً'}
                        {payment.recurringPeriod === 'quarterly' && 'كل ثلاثة أشهر'}
                        {payment.recurringPeriod === 'yearly' && 'سنوياً'}
                      </span>
                    </div>
                  )}
                  {payment.receiptUrl && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">الإيصال:</span>
                      <a
                        href={payment.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      >
                        <DocumentArrowDownIcon className="h-4 w-4" />
                        تحميل الإيصال
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            {payment.description && (
              <div className="bg-white/5 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <DocumentTextIcon className="h-5 w-5" />
                  {ARABIC_LABELS.description}
                </h3>
                <p className="text-gray-300">{payment.description}</p>
              </div>
            )}

            {/* Tags */}
            {payment.tags && payment.tags.length > 0 && (
              <div className="bg-white/5 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <TagIcon className="h-5 w-5" />
                  العلامات
                </h3>
                <div className="flex flex-wrap gap-2">
                  {payment.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* History Timeline */}
            <div className="bg-white/5 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <ClockIcon className="h-5 w-5" />
                تاريخ الإجراءات
              </h3>
              <div className="space-y-4">
                {paymentHistory.map((entry, index) => (
                  <div key={entry.id} className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="h-2 w-2 bg-blue-400 rounded-full mt-2"></div>
                      {index < paymentHistory.length - 1 && (
                        <div className="h-8 w-0.5 bg-gray-600 mr-0.75 mt-1"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-white font-medium">{entry.action}</p>
                        <span className="text-xs text-gray-400">
                          {formatDateTime(entry.actionDate)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">بواسطة: {entry.actionBy}</p>
                      {entry.notes && (
                        <p className="text-sm text-gray-300 mt-1">{entry.notes}</p>
                      )}
                      {entry.previousStatus && entry.newStatus && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs bg-gray-600 text-gray-300 px-2 py-0.5 rounded">
                            {entry.previousStatus}
                          </span>
                          <span className="text-xs text-gray-400">←</span>
                          <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                            {entry.newStatus}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-60 p-4" dir="rtl">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-yellow-400" />
              <h3 className="text-lg font-semibold text-white">
                تأكيد الإجراء
              </h3>
            </div>

            <p className="text-gray-300 mb-4">
              {showConfirmDialog.action.type === 'refund' && 'هل أنت متأكد من رغبتك في استرداد هذه الدفعة؟'}
              {showConfirmDialog.action.type === 'reject' && 'هل أنت متأكد من رغبتك في رفض هذه الدفعة؟'}
            </p>

            {(showConfirmDialog.action.type === 'refund' || showConfirmDialog.action.type === 'reject') && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  سبب {showConfirmDialog.action.type === 'refund' ? 'الاسترداد' : 'الرفض'} *
                </label>
                <textarea
                  value={showConfirmDialog.action.type === 'refund' ? refundReason : rejectReason}
                  onChange={(e) => {
                    if (showConfirmDialog.action.type === 'refund') {
                      setRefundReason(e.target.value);
                    } else {
                      setRejectReason(e.target.value);
                    }
                  }}
                  placeholder="اكتب السبب هنا..."
                  rows={3}
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmDialog({ action: { type: 'approve' }, show: false })}
                className="flex-1 py-2 px-4 bg-gray-500/20 text-gray-300 rounded-lg hover:bg-gray-500/30 transition-colors"
              >
                {ARABIC_LABELS.cancel}
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={
                  (showConfirmDialog.action.type === 'refund' && !refundReason.trim()) ||
                  (showConfirmDialog.action.type === 'reject' && !rejectReason.trim())
                }
                className="flex-1 py-2 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default memo(PaymentDetailsModal);