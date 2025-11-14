import React, { memo,  useState, useEffect } from 'react';
import { CreditCardIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface FlexiblePaymentInputProps {
  onAmountChange: (amount: number | null) => void;
  onValidation: (isValid: boolean) => void;
  className?: string;
}

interface PaymentAmount {
  value: number;
  label: string;
  isRecommended?: boolean;
}

const FlexiblePaymentInput: React.FC<FlexiblePaymentInputProps> = ({
  onAmountChange,
  onValidation,
  className = ''
}) => {
  const [customAmount, setCustomAmount] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [validationError, setValidationError] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);

  // Quick amount options (multiples of 50 starting from 50)
  const quickAmounts: PaymentAmount[] = [
    { value: 50, label: '50 ريال', isRecommended: true },
    { value: 100, label: '100 ريال' },
    { value: 200, label: '200 ريال' },
    { value: 500, label: '500 ريال' },
    { value: 1000, label: '1000 ريال' }
  ];

  /**
   * Validates the payment amount according to business rules
   * - Must be at least 50 SAR
   * - Must be a multiple of 50
   * - No upper limit
   */
  const validateAmount = (amount: string | number): string | null => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

    // Check if it's a valid number
    if (isNaN(numAmount) || numAmount <= 0) {
      return "يرجى إدخال رقم صحيح";
    }

    // Check minimum amount (50 SAR)
    if (numAmount < 50) {
      return "الحد الأدنى للاشتراك 50 ريال";
    }

    // Check if it's a multiple of 50
    if (numAmount % 50 !== 0) {
      return "المبلغ يجب أن يكون من مضاعفات الـ 50 ريال";
    }

    return null;
  };

  /**
   * Handles selection of predefined amounts
   */
  const handleAmountSelection = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
    setIsCustomMode(false);
    setValidationError('');
    onAmountChange(amount);
    onValidation(true);
  };

  /**
   * Handles custom amount input
   */
  const handleCustomInput = (value: string) => {
    setCustomAmount(value);
    setSelectedAmount(null);

    // Clear validation if empty
    if (value === '') {
      setValidationError('');
      onAmountChange(null);
      onValidation(false);
      return;
    }

    // Validate the input
    const error = validateAmount(value);
    setValidationError(error || '');

    if (!error && value) {
      const amount = parseFloat(value);
      onAmountChange(amount);
      onValidation(true);
    } else {
      onAmountChange(null);
      onValidation(false);
    }
  };

  /**
   * Toggles between quick select and custom input modes
   */
  const toggleCustomMode = () => {
    setIsCustomMode(!isCustomMode);
    if (!isCustomMode) {
      // Switching to custom mode
      setSelectedAmount(null);
      setCustomAmount('');
    } else {
      // Switching back to quick select
      setCustomAmount('');
      setValidationError('');
    }
    onAmountChange(null);
    onValidation(false);
  };

  /**
   * Format number to Arabic locale
   */
  const formatArabicNumber = (num: number): string => {
    return num.toLocaleString('ar-SA');
  };

  return (
    <div className={`flexible-payment-input ${className}`}>
      <div className="payment-header">
        <div className="payment-icon">
          <CreditCardIcon />
        </div>
        <div className="payment-title">
          <h3>اختر مبلغ الاشتراك</h3>
          <p>الحد الأدنى 50 ريال من مضاعفات الـ 50 (50، 100، 150... إلى ما لا نهاية)</p>
        </div>
      </div>

      {!isCustomMode ? (
        /* Quick Amount Selection */
        <div className="quick-amounts-section">
          <div className="quick-amounts-grid">
            {quickAmounts.map((amount) => (
              <button
                key={amount.value}
                type="button"
                className={`quick-amount-btn ${
                  selectedAmount === amount.value ? 'selected' : ''
                } ${amount.isRecommended ? 'recommended' : ''}`}
                onClick={() => handleAmountSelection(amount.value)}
              >
                <div className="amount-value">
                  {formatArabicNumber(amount.value)}
                </div>
                <div className="amount-currency">ريال</div>
                {amount.isRecommended && (
                  <div className="recommended-badge">الأساسي</div>
                )}
              </button>
            ))}
          </div>

          <div className="custom-amount-toggle">
            <button
              type="button"
              className="toggle-custom-btn"
              onClick={toggleCustomMode}
            >
              أدخل مبلغ مخصص
            </button>
          </div>
        </div>
      ) : (
        /* Custom Amount Input */
        <div className="custom-amount-section">
          <div className="custom-input-wrapper">
            <div className="input-group">
              <input
                type="number"
                value={customAmount}
                onChange={(e) => handleCustomInput(e.target.value)}
                placeholder="أدخل المبلغ"
                className={`custom-amount-input ${validationError ? 'error' : ''}`}
                min="50"
                step="50"
              />
              <span className="input-suffix">ريال</span>
            </div>

            {validationError && (
              <div className="validation-error">
                <ExclamationTriangleIcon className="error-icon" />
                <span>{validationError}</span>
              </div>
            )}

            {customAmount && !validationError && (
              <div className="validation-success">
                <CheckCircleIcon className="success-icon" />
                <span>المبلغ صحيح ومقبول</span>
              </div>
            )}
          </div>

          <div className="custom-amount-hints">
            <p>أمثلة صحيحة: 50، 100، 150، 200، 250، 300... إلخ</p>
          </div>

          <div className="back-to-quick">
            <button
              type="button"
              className="back-to-quick-btn"
              onClick={toggleCustomMode}
            >
              العودة للخيارات السريعة
            </button>
          </div>
        </div>
      )}

      {/* Payment Summary */}
      {(selectedAmount || (customAmount && !validationError)) && (
        <div className="payment-summary">
          <div className="summary-card">
            <div className="summary-row">
              <span className="summary-label">مبلغ الاشتراك:</span>
              <span className="summary-value">
                {formatArabicNumber(selectedAmount || parseFloat(customAmount))} ريال
              </span>
            </div>
            <div className="summary-row">
              <span className="summary-label">نوع الدفع:</span>
              <span className="summary-value">دفعة واحدة</span>
            </div>
            <div className="summary-note">
              <p>يمكنك تجديد الاشتراك بأي مبلغ آخر في أي وقت</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default memo(FlexiblePaymentInput);