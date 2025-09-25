import React, { useState } from 'react';
import {
  XMarkIcon,
  UserIcon,
  CreditCardIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  BanknotesIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface Member {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

interface PaymentConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (paymentData: PaymentConfirmationData) => void;
  member: Member;
  amount: number;
  isLoading?: boolean;
}

interface PaymentConfirmationData {
  memberId: string;
  amount: number;
  duration: 'monthly' | 'yearly' | 'lifetime';
  paymentMethod: 'card' | 'bank_transfer' | 'cash' | 'digital_wallet';
  notes?: string;
}

type SubscriptionDuration = 'monthly' | 'yearly' | 'lifetime';
type PaymentMethod = 'card' | 'bank_transfer' | 'cash' | 'digital_wallet';

const PaymentConfirmationModal: React.FC<PaymentConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  member,
  amount,
  isLoading = false
}) => {
  const [duration, setDuration] = useState<SubscriptionDuration>('monthly');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const durationOptions = [
    {
      value: 'monthly' as const,
      label: 'شهري',
      description: 'يتجدد كل شهر',
      icon: CalendarDaysIcon,
      color: '#3b82f6',
      multiplier: 1
    },
    {
      value: 'yearly' as const,
      label: 'سنوي',
      description: 'يتجدد كل عام (خصم 10%)',
      icon: CalendarDaysIcon,
      color: '#10b981',
      multiplier: 12 * 0.9 // 10% discount
    },
    {
      value: 'lifetime' as const,
      label: 'مدى الحياة',
      description: 'دفعة واحدة مدى الحياة',
      icon: CheckCircleIcon,
      color: '#8b5cf6',
      multiplier: 24 // Equivalent to 2 years
    }
  ];

  const paymentMethods = [
    {
      value: 'card' as const,
      label: 'بطاقة ائتمان',
      description: 'فيزا، ماستركارد، مدى',
      icon: CreditCardIcon,
      available: true
    },
    {
      value: 'bank_transfer' as const,
      label: 'تحويل بنكي',
      description: 'تحويل مباشر للحساب البنكي',
      icon: BanknotesIcon,
      available: true
    },
    {
      value: 'digital_wallet' as const,
      label: 'المحفظة الرقمية',
      description: 'أبل باي، جوجل باي، STC باي',
      icon: CreditCardIcon,
      available: true
    },
    {
      value: 'cash' as const,
      label: 'دفع نقدي',
      description: 'دفع نقدي في المقر',
      icon: BanknotesIcon,
      available: false
    }
  ];

  const calculateTotalAmount = (): number => {
    const selectedDuration = durationOptions.find(d => d.value === duration);
    return Math.round(amount * (selectedDuration?.multiplier || 1));
  };

  const formatArabicNumber = (num: number): string => {
    return num.toLocaleString('ar-SA');
  };

  const handleConfirm = async () => {
    setIsProcessing(true);

    try {
      const paymentData: PaymentConfirmationData = {
        memberId: member.id,
        amount: calculateTotalAmount(),
        duration,
        paymentMethod,
        notes: notes.trim() || undefined
      };

      await onConfirm(paymentData);
    } catch (error) {
      console.error('Payment confirmation error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedDuration = durationOptions.find(d => d.value === duration);
  const selectedPaymentMethod = paymentMethods.find(p => p.value === paymentMethod);
  const totalAmount = calculateTotalAmount();
  const savings = duration === 'yearly' ? Math.round(amount * 12 * 0.1) : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-content">
            <div className="header-icon">
              <CreditCardIcon />
            </div>
            <div className="header-text">
              <h2>تأكيد عملية الاشتراك</h2>
              <p>راجع تفاصيل الاشتراك قبل التأكيد</p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <XMarkIcon />
          </button>
        </div>

        <div className="modal-body">
          {/* Member Information */}
          <div className="section member-section">
            <h3>معلومات العضو</h3>
            <div className="member-card">
              <div className="member-avatar">
                {member.avatar ? (
                  <img src={member.avatar} alt={member.name} />
                ) : (
                  <UserIcon />
                )}
              </div>
              <div className="member-info">
                <h4>{member.name}</h4>
                {member.email && <p className="member-email">{member.email}</p>}
                {member.phone && <p className="member-phone">{member.phone}</p>}
              </div>
            </div>
          </div>

          {/* Subscription Duration */}
          <div className="section duration-section">
            <h3>مدة الاشتراك</h3>
            <div className="duration-options">
              {durationOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = duration === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`duration-option ${isSelected ? 'selected' : ''}`}
                    onClick={() => setDuration(option.value)}
                  >
                    <div className="option-icon" style={{ color: option.color }}>
                      <Icon />
                    </div>
                    <div className="option-content">
                      <div className="option-label">{option.label}</div>
                      <div className="option-description">{option.description}</div>
                      {option.value === 'yearly' && (
                        <div className="savings-badge">توفير 10%</div>
                      )}
                    </div>
                    <div className="option-price">
                      {formatArabicNumber(Math.round(amount * option.multiplier))} ريال
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Method */}
          <div className="section payment-method-section">
            <h3>طريقة الدفع</h3>
            <div className="payment-methods">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                const isSelected = paymentMethod === method.value;
                const isAvailable = method.available;

                return (
                  <button
                    key={method.value}
                    type="button"
                    className={`payment-method ${isSelected ? 'selected' : ''} ${
                      !isAvailable ? 'disabled' : ''
                    }`}
                    onClick={() => isAvailable && setPaymentMethod(method.value)}
                    disabled={!isAvailable}
                  >
                    <div className="method-icon">
                      <Icon />
                    </div>
                    <div className="method-content">
                      <div className="method-label">{method.label}</div>
                      <div className="method-description">{method.description}</div>
                      {!isAvailable && (
                        <div className="unavailable-badge">غير متاح حالياً</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Summary */}
          <div className="section summary-section">
            <h3>ملخص الدفع</h3>
            <div className="payment-summary">
              <div className="summary-row">
                <span>مبلغ الاشتراك الأساسي:</span>
                <span>{formatArabicNumber(amount)} ريال</span>
              </div>

              <div className="summary-row">
                <span>المدة المختارة:</span>
                <span>{selectedDuration?.label}</span>
              </div>

              {duration === 'yearly' && savings > 0 && (
                <div className="summary-row savings">
                  <span>الخصم (10%):</span>
                  <span>-{formatArabicNumber(savings)} ريال</span>
                </div>
              )}

              <div className="summary-row total">
                <span>المبلغ الإجمالي:</span>
                <span>{formatArabicNumber(totalAmount)} ريال</span>
              </div>

              <div className="summary-row">
                <span>طريقة الدفع:</span>
                <span>{selectedPaymentMethod?.label}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="section notes-section">
            <h3>ملاحظات إضافية (اختياري)</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أضف أي ملاحظات حول هذا الاشتراك..."
              className="notes-textarea"
              rows={3}
              maxLength={500}
            />
            <div className="char-count">{notes.length}/500</div>
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn-cancel"
            onClick={onClose}
            disabled={isProcessing}
          >
            إلغاء
          </button>
          <button
            type="button"
            className="btn-confirm"
            onClick={handleConfirm}
            disabled={isProcessing || isLoading}
          >
            {isProcessing ? (
              <>
                <ClockIcon className="loading-icon" />
                جاري المعالجة...
              </>
            ) : (
              <>
                <CheckCircleIcon />
                تأكيد الاشتراك
              </>
            )}
          </button>
        </div>
      </div>

    </div>
  );
};

export default PaymentConfirmationModal;