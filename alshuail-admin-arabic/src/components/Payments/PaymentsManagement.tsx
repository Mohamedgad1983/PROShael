import React, { memo,  useState, useEffect } from 'react';
import { ARABIC_LABELS } from '../../constants/arabic';
import PaymentsOverview from './PaymentsOverview';
import PaymentsTable from './PaymentsTable';
import CreatePaymentForm from './CreatePaymentForm';
import PaymentDetailsModal from './PaymentDetailsModal';
import { logger } from '../../utils/logger';

import {
  Payment,
  PaymentFilters,
  PaymentFormData,
  PaymentAction,
  PaymentStatistics
} from './types';

// Mock members data
const mockMembers = [
  {
    id: 'member1',
    name: 'أحمد محمد السعيد',
    avatar: '/avatars/member1.jpg'
  },
  {
    id: 'member2',
    name: 'فاطمة عبد الله النجار',
    avatar: '/avatars/member2.jpg'
  },
  {
    id: 'member3',
    name: 'خالد يوسف الأحمد',
    avatar: '/avatars/member3.jpg'
  },
  {
    id: 'member4',
    name: 'مريم علي الزهراني',
    avatar: '/avatars/member4.jpg'
  },
  {
    id: 'member5',
    name: 'عبد الرحمن صالح الغامدي',
    avatar: '/avatars/member5.jpg'
  }
];

// Mock payments data
const mockPayments: Payment[] = [
  {
    id: '1',
    referenceNumber: 'PAY-20240101-1234',
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
    createdBy: 'أحمد المدير'
  },
  {
    id: '2',
    referenceNumber: 'PAY-20240102-5678',
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
    createdBy: 'أحمد المدير',
    approvedBy: 'سارة المحاسبة',
    approvedDate: new Date('2024-01-08')
  },
  {
    id: '3',
    referenceNumber: 'PAY-20240103-9012',
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
    createdBy: 'أحمد المدير'
  },
  {
    id: '4',
    referenceNumber: 'PAY-20240104-3456',
    memberId: 'member4',
    memberName: 'مريم علي الزهراني',
    amount: 100,
    category: 'donation',
    type: 'one_time',
    method: 'digital_wallet',
    status: 'paid',
    description: 'تبرع لصالح الأنشطة الخيرية',
    dueDate: new Date('2024-01-05'),
    paidDate: new Date('2024-01-03'),
    createdDate: new Date('2024-01-01'),
    createdBy: 'أحمد المدير',
    approvedBy: 'سارة المحاسبة',
    approvedDate: new Date('2024-01-03')
  },
  {
    id: '5',
    referenceNumber: 'PAY-20240105-7890',
    memberId: 'member5',
    memberName: 'عبد الرحمن صالح الغامدي',
    amount: 250,
    category: 'subscription',
    type: 'flexible',
    method: 'bank_transfer',
    status: 'rejected',
    description: 'اشتراك مرن - فبراير 2024',
    dueDate: new Date('2024-02-01'),
    createdDate: new Date('2024-01-15'),
    createdBy: 'أحمد المدير',
    refundReason: 'عدم توفر الأموال الكافية'
  }
];

const PaymentsManagement: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>(mockPayments);
  const [filters, setFilters] = useState<PaymentFilters>({
    status: [],
    category: [],
    method: [],
    search: ''
  });
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Filter payments based on current filters
  const filteredPayments = payments.filter(payment => {
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

  const handleCreatePayment = async (formData: PaymentFormData) => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      const newPayment: Payment = {
        id: `payment_${Date.now()}`,
        referenceNumber: `PAY-${Date.now().toString().slice(-8)}-${Math.random().toString().slice(-4)}`,
        memberId: formData.memberId,
        memberName: mockMembers.find(m => m.id === formData.memberId)?.name || 'غير معروف',
        memberAvatar: mockMembers.find(m => m.id === formData.memberId)?.avatar,
        amount: formData.amount,
        category: formData.category,
        type: formData.type,
        method: formData.method,
        status: 'pending',
        description: formData.description,
        dueDate: formData.dueDate,
        createdDate: new Date(),
        createdBy: 'المستخدم الحالي',
        isRecurring: formData.isRecurring,
        recurringPeriod: formData.recurringPeriod,
        tags: formData.tags
      };

      setPayments(prev => [newPayment, ...prev]);
      setShowCreateForm(false);

      // Show success notification
      alert('تم إنشاء الدفعة بنجاح');
    } catch (error) {
      logger.error('Error creating payment:', { error });
      alert('حدث خطأ أثناء إنشاء الدفعة');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentAction = async (paymentId: string, action: PaymentAction) => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      setPayments(prev => prev.map(payment => {
        if (payment.id === paymentId) {
          const updatedPayment = { ...payment };

          switch (action.type) {
            case 'approve':
              updatedPayment.status = 'approved';
              updatedPayment.approvedBy = 'المستخدم الحالي';
              updatedPayment.approvedDate = new Date();
              break;

            case 'reject':
              updatedPayment.status = 'rejected';
              updatedPayment.refundReason = action.reason;
              break;

            case 'refund':
              updatedPayment.status = 'refunded';
              updatedPayment.refundReason = action.reason;
              updatedPayment.refundDate = new Date();
              break;

            case 'cancel':
              updatedPayment.status = 'cancelled';
              break;

            case 'receipt':
              // Generate receipt logic
              updatedPayment.receiptUrl = `/receipts/${paymentId}.pdf`;
              break;
          }

          return updatedPayment;
        }
        return payment;
      }));

      // Show success notification
      const actionLabels = {
        approve: 'تمت الموافقة على الدفعة',
        reject: 'تم رفض الدفعة',
        refund: 'تم استرداد الدفعة',
        cancel: 'تم إلغاء الدفعة',
        receipt: 'تم إنشاء الإيصال'
      };

      alert(actionLabels[action.type]);

      // Close details modal if open
      if (showDetailsModal) {
        setShowDetailsModal(false);
        setSelectedPayment(null);
      }
    } catch (error) {
      logger.error('Error performing payment action:', { error });
      alert('حدث خطأ أثناء تنفيذ الإجراء');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSelect = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowDetailsModal(true);
  };

  const handleFilterChange = (newFilters: PaymentFilters) => {
    setFilters(newFilters);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Overview Section */}
      <PaymentsOverview
        onCreatePayment={() => setShowCreateForm(true)}
        onFilterChange={handleFilterChange}
      />

      {/* Payments Table */}
      <PaymentsTable
        payments={filteredPayments}
        filters={filters}
        onFilterChange={handleFilterChange}
        onPaymentSelect={handlePaymentSelect}
        onPaymentAction={handlePaymentAction}
        loading={loading}
      />

      {/* Create Payment Form Modal */}
      <CreatePaymentForm
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onSubmit={handleCreatePayment}
        members={mockMembers}
      />

      {/* Payment Details Modal */}
      <PaymentDetailsModal
        payment={selectedPayment}
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedPayment(null);
        }}
        onAction={(action: PaymentAction) => {
          if (selectedPayment) {
            handlePaymentAction(selectedPayment.id, action);
          }
        }}
      />
    </div>
  );
};

export default memo(PaymentsManagement);