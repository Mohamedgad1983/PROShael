import React, { memo,  useState } from 'react';
import {
  XMarkIcon,
  CurrencyDollarIcon,
  CreditCardIcon,
  EyeSlashIcon,
  EyeIcon,
  ChatBubbleLeftIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import { Initiative, ContributionFormData } from './types';
import { ARABIC_LABELS, CURRENCY } from '../../constants/arabic';

interface ContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initiative: Initiative | null;
  onSubmit: (data: ContributionFormData) => void;
  isLoading?: boolean;
}

const paymentMethods = [
  { value: 'bank_transfer', label: ARABIC_LABELS.bankTransfer },
  { value: 'cash', label: ARABIC_LABELS.cash },
  { value: 'credit_card', label: ARABIC_LABELS.creditCard },
  { value: 'digital_wallet', label: ARABIC_LABELS.digitalWallet },
  { value: 'app_payment', label: ARABIC_LABELS.appPayment }
];

const ContributionModal: React.FC<ContributionModalProps> = ({
  isOpen,
  onClose,
  initiative,
  onSubmit,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<ContributionFormData>({
    amount: 100,
    paymentMethod: 'bank_transfer',
    notes: '',
    isAnonymous: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen || !initiative) return null;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.amount || formData.amount < 50) {
      newErrors.amount = ARABIC_LABELS.minimumContribution;
    }

    if (formData.amount > (initiative.targetAmount - initiative.raisedAmount)) {
      newErrors.amount = 'المبلغ أكبر من المطلوب';
    }

    if (!formData.paymentMethod) {
      newErrors.paymentMethod = ARABIC_LABELS.fieldRequired;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('ar-SA').format(amount);
  };

  const progressPercentage = Math.min((initiative.raisedAmount / initiative.targetAmount) * 100, 100);
  const remaining = initiative.targetAmount - initiative.raisedAmount;
  const newProgressPercentage = Math.min(((initiative.raisedAmount + formData.amount) / initiative.targetAmount) * 100, 100);

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  };

  const modalStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.8) 100%)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '20px',
    padding: '32px',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
    direction: 'rtl' as const
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  const closeButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '8px',
    transition: 'background 0.2s ease'
  };

  const initiativeInfoStyle: React.CSSProperties = {
    background: 'rgba(99, 102, 241, 0.1)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '24px'
  };

  const progressBarStyle: React.CSSProperties = {
    width: '100%',
    height: '8px',
    background: 'rgba(0, 0, 0, 0.1)',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '8px'
  };

  const progressFillStyle: React.CSSProperties = {
    height: '100%',
    background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
    borderRadius: '4px',
    width: `${progressPercentage}%`,
    transition: 'width 0.3s ease'
  };

  const newProgressFillStyle: React.CSSProperties = {
    height: '100%',
    background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
    borderRadius: '4px',
    width: `${newProgressPercentage}%`,
    transition: 'width 0.3s ease',
    opacity: 0.7
  };

  const formGroupStyle: React.CSSProperties = {
    marginBottom: '20px'
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '6px'
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid rgba(0, 0, 0, 0.2)',
    borderRadius: '12px',
    fontSize: '14px',
    background: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(10px)',
    outline: 'none',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
    direction: 'rtl' as const
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer'
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: '80px',
    resize: 'vertical' as const
  };

  const errorStyle: React.CSSProperties = {
    color: '#ef4444',
    fontSize: '12px',
    marginTop: '4px'
  };

  const checkboxContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px'
  };

  const submitButtonStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginTop: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  };

  const disabledButtonStyle: React.CSSProperties = {
    ...submitButtonStyle,
    opacity: 0.6,
    cursor: 'not-allowed'
  };

  const presetAmountsStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    marginBottom: '12px'
  };

  const presetButtonStyle: React.CSSProperties = {
    padding: '8px 12px',
    border: '1px solid rgba(0, 0, 0, 0.2)',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.8)',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s ease'
  };

  const activePresetStyle: React.CSSProperties = {
    ...presetButtonStyle,
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none'
  };

  const impactStyle: React.CSSProperties = {
    background: 'rgba(16, 185, 129, 0.1)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '20px'
  };

  const presetAmounts = [100, 250, 500, 1000, 2000, 5000];

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>
            <HeartIcon style={{ width: '28px', height: '28px', color: '#10b981' }} />
            المساهمة في المبادرة
          </h2>
          <button
            style={closeButtonStyle}
            onClick={onClose}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
            }}
          >
            <XMarkIcon style={{ width: '24px', height: '24px' }} />
          </button>
        </div>

        <div style={initiativeInfoStyle}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: '600' }}>
            {initiative.title}
          </h3>

          <div style={{ marginBottom: '12px' }}>
            <div style={progressBarStyle}>
              <div style={progressFillStyle} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#6b7280' }}>
              <span>{formatAmount(initiative.raisedAmount)} {CURRENCY.symbol}</span>
              <span>{formatAmount(initiative.targetAmount)} {CURRENCY.symbol}</span>
            </div>
          </div>

          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            <div>المجموع المطلوب: {formatAmount(remaining)} {CURRENCY.symbol}</div>
            <div>نسبة الإنجاز: {progressPercentage.toFixed(1)}%</div>
          </div>
        </div>

        {formData.amount > 0 && (
          <div style={impactStyle}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: '#10b981' }}>
              تأثير مساهمتك
            </h4>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
              ستصبح نسبة الإنجاز: {newProgressPercentage.toFixed(1)}%
            </div>
            <div style={progressBarStyle}>
              <div style={newProgressFillStyle} />
            </div>
            <div style={{ fontSize: '12px', color: '#059669', fontWeight: '600' }}>
              +{formData.amount} {CURRENCY.symbol} مساهمتك
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={formGroupStyle}>
            <label style={labelStyle}>
              <CurrencyDollarIcon style={{ width: '16px', height: '16px', display: 'inline', marginLeft: '4px' }} />
              {ARABIC_LABELS.amount} * (الحد الأدنى: 50 {CURRENCY.symbol})
            </label>

            <div style={presetAmountsStyle}>
              {presetAmounts.map(amount => (
                <button
                  key={amount}
                  type="button"
                  style={formData.amount === amount ? activePresetStyle : presetButtonStyle}
                  onClick={() => setFormData(prev => ({ ...prev, amount }))}
                  onMouseEnter={(e) => {
                    if (formData.amount !== amount) {
                      e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (formData.amount !== amount) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)';
                    }
                  }}
                >
                  {formatAmount(amount)}
                </button>
              ))}
            </div>

            <input
              type="number"
              style={{
                ...inputStyle,
                borderColor: errors.amount ? '#ef4444' : 'rgba(0, 0, 0, 0.2)'
              }}
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: parseInt(e.target.value) || 0 }))}
              placeholder="أدخل المبلغ"
              min="50"
              max={remaining}
            />
            {errors.amount && <div style={errorStyle}>{errors.amount}</div>}
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>
              <CreditCardIcon style={{ width: '16px', height: '16px', display: 'inline', marginLeft: '4px' }} />
              {ARABIC_LABELS.paymentMethod} *
            </label>
            <select
              style={{
                ...selectStyle,
                borderColor: errors.paymentMethod ? '#ef4444' : 'rgba(0, 0, 0, 0.2)'
              }}
              value={formData.paymentMethod}
              onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
            >
              {paymentMethods.map(method => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
            {errors.paymentMethod && <div style={errorStyle}>{errors.paymentMethod}</div>}
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>
              <ChatBubbleLeftIcon style={{ width: '16px', height: '16px', display: 'inline', marginLeft: '4px' }} />
              ملاحظات (اختيارية)
            </label>
            <textarea
              style={textareaStyle}
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="أي ملاحظات أو رسالة للمبادرة..."
            />
          </div>

          <div style={checkboxContainerStyle}>
            <input
              type="checkbox"
              id="isAnonymous"
              checked={formData.isAnonymous}
              onChange={(e) => setFormData(prev => ({ ...prev, isAnonymous: e.target.checked }))}
              style={{ width: '16px', height: '16px' }}
            />
            <label htmlFor="isAnonymous" style={{ fontSize: '14px', color: '#374151', cursor: 'pointer' }}>
              {formData.isAnonymous ? (
                <>
                  <EyeSlashIcon style={{ width: '16px', height: '16px', display: 'inline', marginLeft: '4px' }} />
                  مساهمة مجهولة
                </>
              ) : (
                <>
                  <EyeIcon style={{ width: '16px', height: '16px', display: 'inline', marginLeft: '4px' }} />
                  إظهار اسمي
                </>
              )}
            </label>
          </div>

          <button
            type="submit"
            style={isLoading ? disabledButtonStyle : submitButtonStyle}
            disabled={isLoading}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(16, 185, 129, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            <HeartIcon style={{ width: '20px', height: '20px' }} />
            {isLoading ? ARABIC_LABELS.loading : `ساهم بـ ${formatAmount(formData.amount)} ${CURRENCY.symbol}`}
          </button>
        </form>
      </div>
    </div>
  );
};

export default memo(ContributionModal);