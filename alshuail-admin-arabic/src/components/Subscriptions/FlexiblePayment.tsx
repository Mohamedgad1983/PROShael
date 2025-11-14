import React, { memo,  useState, useCallback, useEffect } from 'react';
import './FlexiblePayment.css';

// Define interfaces for type safety
interface QuickAmount {
  value: number;
  label: string;
  popular?: boolean;
}

interface PaymentState {
  amount: number | '';
  selectedQuickAmount: number | null;
  customAmount: string;
  isValid: boolean;
  error: string | null;
  isLoading: boolean;
  showModal: boolean;
}

interface FlexiblePaymentProps {
  onPaymentSubmit?: (amount: number) => Promise<void>;
  minAmount?: number;
  currency?: string;
  className?: string;
}

const FlexiblePayment: React.FC<FlexiblePaymentProps> = ({
  onPaymentSubmit,
  minAmount = 50,
  currency = 'ريال',
  className = ''
}) => {
  // Quick amount options with Arabic labels
  const quickAmounts: QuickAmount[] = [
    { value: 50, label: 'مساهمة بسيطة' },
    { value: 100, label: 'مساهمة عادية', popular: true },
    { value: 200, label: 'مساهمة جيدة' },
    { value: 500, label: 'مساهمة ممتازة' },
    { value: 1000, label: 'مساهمة كبيرة' },
    { value: 2000, label: 'مساهمة مميزة' },
  ];

  // State management
  const [state, setState] = useState<PaymentState>({
    amount: '',
    selectedQuickAmount: null,
    customAmount: '',
    isValid: false,
    error: null,
    isLoading: false,
    showModal: false
  });

  // Format number with Arabic locale
  const formatAmount = useCallback((amount: number): string => {
    return new Intl.NumberFormat('ar-SA', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }, []);

  // Validate payment amount
  const validateAmount = useCallback((amount: number | string): { isValid: boolean; error: string | null } => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

    if (isNaN(numAmount) || numAmount <= 0) {
      return { isValid: false, error: 'يرجى إدخال مبلغ صحيح' };
    }

    if (numAmount < minAmount) {
      return { isValid: false, error: `الحد الأدنى للمبلغ هو ${formatAmount(minAmount)} ${currency}` };
    }

    if (numAmount % 50 !== 0) {
      return { isValid: false, error: 'المبلغ يجب أن يكون من مضاعفات الـ 50 ريال' };
    }

    return { isValid: true, error: null };
  }, [minAmount, currency, formatAmount]);

  // Handle quick amount selection
  const handleQuickAmountClick = useCallback((amount: number) => {
    const validation = validateAmount(amount);

    setState(prev => ({
      ...prev,
      amount,
      selectedQuickAmount: amount,
      customAmount: '',
      isValid: validation.isValid,
      error: validation.error
    }));
  }, [validateAmount]);

  // Handle custom amount input
  const handleCustomAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d]/g, ''); // Only allow digits
    const numValue = value ? parseInt(value, 10) : 0;

    const validation = validateAmount(numValue);

    setState(prev => ({
      ...prev,
      amount: numValue || '',
      selectedQuickAmount: null,
      customAmount: value,
      isValid: validation.isValid,
      error: validation.error
    }));
  }, [validateAmount]);

  // Handle amount control buttons (add/subtract)
  const handleAmountControl = useCallback((operation: 'add' | 'subtract', value: number) => {
    const currentAmount = typeof state.amount === 'number' ? state.amount : 0;
    let newAmount: number;

    if (operation === 'add') {
      newAmount = currentAmount + value;
    } else {
      newAmount = Math.max(minAmount, currentAmount - value);
    }

    const validation = validateAmount(newAmount);

    setState(prev => ({
      ...prev,
      amount: newAmount,
      selectedQuickAmount: null,
      customAmount: newAmount.toString(),
      isValid: validation.isValid,
      error: validation.error
    }));
  }, [state.amount, minAmount, validateAmount]);

  // Handle payment submission
  const handlePaymentSubmit = useCallback(async () => {
    if (!state.isValid || typeof state.amount !== 'number') return;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      if (onPaymentSubmit) {
        await onPaymentSubmit(state.amount);
      }

      // Show success modal
      setState(prev => ({
        ...prev,
        isLoading: false,
        showModal: true
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'حدث خطأ أثناء معالجة الدفع. يرجى المحاولة مرة أخرى.'
      }));
    }
  }, [state.isValid, state.amount, onPaymentSubmit]);

  // Handle modal close
  const handleModalClose = useCallback(() => {
    setState(prev => ({ ...prev, showModal: false }));
  }, []);

  // Auto-format custom amount input
  useEffect(() => {
    if (state.customAmount && typeof state.amount === 'number') {
      const formatted = formatAmount(state.amount);
      if (state.customAmount !== formatted) {
        setState(prev => ({ ...prev, customAmount: formatted }));
      }
    }
  }, [state.amount, state.customAmount, formatAmount]);

  return (
    <>
      <div className={`flexible-payment-container ${className}`}>
        {state.isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <div className="loading-text">جاري معالجة الدفع...</div>
          </div>
        )}

        {/* Header */}
        <div className="payment-header">
          <h2 className="payment-title">نظام الدفع المرن</h2>
          <p className="payment-subtitle">
            ادعم العائلة بأي مبلغ تريده، ابتداءً من {formatAmount(minAmount)} {currency}
          </p>
          <div className="minimum-amount-notice">
            <div className="amount-hint">
              <div className="amount-hint-icon">ℹ</div>
              <div className="amount-hint-tooltip">
                المبلغ يجب أن يكون من مضاعفات الـ 50 ريال
              </div>
            </div>
            الحد الأدنى: {formatAmount(minAmount)} {currency} (مضاعفات 50)
          </div>
        </div>

        {/* Quick Amount Selection */}
        <div className="payment-quick-amounts">
          {quickAmounts.map((quickAmount) => (
            <button
              key={quickAmount.value}
              type="button"
              className={`quick-amount-btn ${
                state.selectedQuickAmount === quickAmount.value ? 'selected' : ''
              }`}
              onClick={() => handleQuickAmountClick(quickAmount.value)}
              aria-label={`دفع ${formatAmount(quickAmount.value)} ${currency}`}
            >
              {quickAmount.popular && (
                <div className="popular-badge">الأكثر شيوعاً</div>
              )}
              <div className="amount-value">
                {formatAmount(quickAmount.value)} {currency}
              </div>
              <div className="amount-label">{quickAmount.label}</div>
            </button>
          ))}
        </div>

        {/* Custom Amount Section */}
        <div className="custom-amount-section">
          <div className="section-divider"></div>
          <label className="custom-amount-label">
            <span>مبلغ مخصص</span>
            <div className="amount-hint">
              <div className="amount-hint-icon">؟</div>
              <div className="amount-hint-tooltip">
                يمكنك إدخال أي مبلغ من مضاعفات الـ 50 ريال
              </div>
            </div>
          </label>

          <div className="custom-amount-input-wrapper">
            <input
              type="text"
              className="custom-amount-input"
              placeholder={`أدخل مبلغاً (الحد الأدنى ${formatAmount(minAmount)})`}
              value={state.customAmount}
              onChange={handleCustomAmountChange}
              dir="rtl"
              inputMode="numeric"
              aria-label="مبلغ الدفع المخصص"
              aria-describedby="amount-validation"
            />
            <div className="currency-badge">{currency}</div>
          </div>

          {/* Amount Control Buttons */}
          <div className="amount-controls">
            <button
              type="button"
              className="amount-control-btn"
              onClick={() => handleAmountControl('subtract', 50)}
              disabled={typeof state.amount === 'number' && state.amount <= minAmount}
            >
              - 50
            </button>
            <button
              type="button"
              className="amount-control-btn"
              onClick={() => handleAmountControl('add', 50)}
            >
              + 50
            </button>
            <button
              type="button"
              className="amount-control-btn"
              onClick={() => handleAmountControl('add', 100)}
            >
              + 100
            </button>
          </div>

          {/* Validation Message */}
          {(state.error || (state.isValid && state.amount)) && (
            <div
              id="amount-validation"
              className={`validation-message ${
                state.error ? 'validation-error' : 'validation-success'
              }`}
            >
              <span className="validation-icon">
                {state.error ? '⚠' : '✓'}
              </span>
              {state.error || `مبلغ صحيح: ${formatAmount(state.amount as number)} ${currency}`}
            </div>
          )}
        </div>

        {/* Payment Button */}
        <button
          type="button"
          className="payment-submit-btn"
          onClick={handlePaymentSubmit}
          disabled={!state.isValid || state.isLoading}
          aria-label={`تأكيد الدفع بمبلغ ${state.amount ? formatAmount(state.amount as number) + ' ' + currency : ''}`}
        >
          {state.isLoading ? (
            <>
              <div className="payment-loading"></div>
              جاري المعالجة...
            </>
          ) : (
            <>
              تأكيد الدفع
              {state.amount && (
                <span> • {formatAmount(state.amount as number)} {currency}</span>
              )}
            </>
          )}
        </button>
      </div>

      {/* Payment Confirmation Modal */}
      {state.showModal && (
        <div className="payment-modal-overlay" onClick={handleModalClose}>
          <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-btn"
              onClick={handleModalClose}
              aria-label="إغلاق"
            >
              ×
            </button>

            <div className="success-checkmark"></div>

            <div className="payment-summary">
              <div className="payment-amount-display">
                {formatAmount(state.amount as number)} {currency}
              </div>
              <div className="payment-description">
                تم تأكيد مساهمتك بنجاح
              </div>
            </div>

            <div className="payment-details">
              <div className="detail-row">
                <span className="detail-label">المبلغ المدفوع</span>
                <span className="detail-value">
                  {formatAmount(state.amount as number)} {currency}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">رقم المعاملة</span>
                <span className="detail-value">
                  #{Math.random().toString(36).substr(2, 9).toUpperCase()}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">التاريخ</span>
                <span className="detail-value">
                  {new Date().toLocaleDateString('ar-SA')}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">الإجمالي</span>
                <span className="detail-value">
                  {formatAmount(state.amount as number)} {currency}
                </span>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="modal-btn modal-btn-primary"
                onClick={handleModalClose}
              >
                تم
              </button>
              <button
                type="button"
                className="modal-btn modal-btn-secondary"
                onClick={() => window.print()}
              >
                طباعة الإيصال
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default memo(FlexiblePayment);