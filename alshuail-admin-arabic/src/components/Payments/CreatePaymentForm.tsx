import React, { memo,  useState, useEffect } from 'react';
import {
  XMarkIcon,
  UserIcon,
  BanknotesIcon,
  CalendarIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CreditCardIcon,
  BuildingLibraryIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline';
import { ARABIC_LABELS } from '../../constants/arabic';
import { CreatePaymentFormProps, PaymentFormData, PaymentCategory, PaymentMethod, PaymentType, PaymentValidation } from './types';
import { validatePaymentForm, formatCurrency, toArabicNumerals, generatePaymentReference } from './utils';

import { logger } from '../../utils/logger';

const CreatePaymentForm: React.FC<CreatePaymentFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  members
}) => {
  const [formData, setFormData] = useState<PaymentFormData>({
    memberId: '',
    amount: 0,
    category: 'subscription',
    type: 'regular',
    method: 'cash',
    description: '',
    dueDate: new Date(),
    isRecurring: false,
    tags: []
  });

  const [validation, setValidation] = useState<PaymentValidation>({
    isValid: true,
    errors: {}
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);

  // Preset amounts for subscriptions (multiples of 50 SAR)
  const presetAmounts = [50, 100, 150, 200, 300, 500, 1000];

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        memberId: '',
        amount: 0,
        category: 'subscription',
        type: 'regular',
        method: 'cash',
        description: '',
        dueDate: new Date(),
        isRecurring: false,
        tags: []
      });
      setValidation({ isValid: true, errors: {} });
      setSearchTerm('');
    }
  }, [isOpen]);

  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (field: keyof PaymentFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear validation error for this field
    if (validation.errors && validation.errors[field]) {
      setValidation(prev => ({
        ...prev,
        errors: { ...prev.errors, [field]: undefined }
      }));
    }
  };

  const handleAmountChange = (amount: number) => {
    handleInputChange('amount', amount);

    // Auto-suggest subscription amounts
    if (formData.category === 'subscription' && amount % 50 !== 0) {
      const nearestValid = Math.round(amount / 50) * 50;
      if (nearestValid !== amount) {
        // Show suggestion in UI
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationResult = validatePaymentForm(formData);
    setValidation(validationResult);

    if (!validationResult.isValid) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      logger.error('Error creating payment:', { error });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    const icons = {
      cash: BanknotesIcon,
      bank_transfer: BuildingLibraryIcon,
      credit_card: CreditCardIcon,
      debit_card: CreditCardIcon,
      digital_wallet: DevicePhoneMobileIcon,
      app_payment: DevicePhoneMobileIcon,
      check: DocumentTextIcon
    };
    return icons[method];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/20">
          <h2 className="text-xl font-bold text-white">
            {ARABIC_LABELS.createPayment}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Member Selection */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
              <UserIcon className="h-4 w-4" />
              اختيار العضو *
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowMemberDropdown(true);
                }}
                onFocus={() => setShowMemberDropdown(true)}
                placeholder="البحث عن عضو..."
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              {showMemberDropdown && filteredMembers.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredMembers.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => {
                        handleInputChange('memberId', member.id);
                        setSearchTerm(member.name);
                        setShowMemberDropdown(false);
                      }}
                      className="w-full p-3 text-right hover:bg-gray-100 flex items-center gap-3"
                    >
                      {member.avatar ? (
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="h-8 w-8 rounded-full"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-600">
                            {member.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <span className="text-gray-800">{member.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {validation.errors?.memberId && (
              <p className="text-red-400 text-sm flex items-center gap-1">
                <ExclamationTriangleIcon className="h-4 w-4" />
                {validation.errors?.memberId}
              </p>
            )}
          </div>

          {/* Payment Category */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              {ARABIC_LABELS.paymentCategory} *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { value: 'subscription', label: 'اشتراك', color: 'bg-blue-500' },
                { value: 'activity', label: 'نشاط', color: 'bg-purple-500' },
                { value: 'membership', label: 'عضوية', color: 'bg-green-500' },
                { value: 'donation', label: 'تبرع', color: 'bg-yellow-500' },
                { value: 'penalty', label: 'غرامة', color: 'bg-red-500' }
              ].map((category) => (
                <button
                  key={category.value}
                  type="button"
                  onClick={() => handleInputChange('category', category.value as PaymentCategory)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    formData.category === category.value
                      ? `${category.color} border-white text-white`
                      : 'bg-white/10 border-white/20 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
            {validation.errors?.category && (
              <p className="text-red-400 text-sm">{validation.errors?.category}</p>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
              <BanknotesIcon className="h-4 w-4" />
              {ARABIC_LABELS.amount} *
            </label>

            {/* Preset amounts for subscriptions */}
            {formData.category === 'subscription' && (
              <div className="mb-3">
                <p className="text-xs text-gray-400 mb-2">مبالغ اقتراحية (مضاعفات ٥٠ ريال):</p>
                <div className="flex flex-wrap gap-2">
                  {presetAmounts.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => handleAmountChange(amount)}
                      className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                        formData.amount === amount
                          ? 'bg-blue-500 text-white'
                          : 'bg-white/10 text-gray-300 hover:bg-white/20'
                      }`}
                    >
                      {formatCurrency(amount)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="relative">
              <input
                type="number"
                value={formData.amount || ''}
                onChange={(e) => handleAmountChange(Number(e.target.value))}
                placeholder="0"
                min="1"
                step={formData.category === 'subscription' ? 50 : 1}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                ر.س
              </span>
            </div>

            {formData.category === 'subscription' && formData.amount > 0 && formData.amount % 50 !== 0 && (
              <p className="text-yellow-400 text-sm flex items-center gap-1">
                <ExclamationTriangleIcon className="h-4 w-4" />
                يُفضل أن يكون مبلغ الاشتراك من مضاعفات ٥٠ ريال
              </p>
            )}

            {validation.errors?.amount && (
              <p className="text-red-400 text-sm">{validation.errors?.amount}</p>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              {ARABIC_LABELS.paymentMethod} *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { value: 'cash', label: 'نقدي', icon: BanknotesIcon },
                { value: 'bank_transfer', label: 'حوالة بنكية', icon: BuildingLibraryIcon },
                { value: 'credit_card', label: 'بطاقة ائتمان', icon: CreditCardIcon },
                { value: 'digital_wallet', label: 'محفظة رقمية', icon: DevicePhoneMobileIcon }
              ].map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => handleInputChange('method', method.value as PaymentMethod)}
                  className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                    formData.method === method.value
                      ? 'bg-blue-500 border-white text-white'
                      : 'bg-white/10 border-white/20 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  <method.icon className="h-5 w-5" />
                  <span className="text-xs">{method.label}</span>
                </button>
              ))}
            </div>
            {validation.errors?.method && (
              <p className="text-red-400 text-sm">{validation.errors?.method}</p>
            )}
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
              <CalendarIcon className="h-4 w-4" />
              {ARABIC_LABELS.dueDate} *
            </label>
            <input
              type="date"
              value={formData.dueDate.toISOString().split('T')[0]}
              onChange={(e) => handleInputChange('dueDate', new Date(e.target.value))}
              min={new Date().toISOString().split('T')[0]}
              className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {validation.errors?.dueDate && (
              <p className="text-red-400 text-sm">{validation.errors?.dueDate}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
              <DocumentTextIcon className="h-4 w-4" />
              {ARABIC_LABELS.description}
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="وصف إضافي للدفعة..."
              rows={3}
              className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Recurring Payment */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isRecurring"
                checked={formData.isRecurring || false}
                onChange={(e) => handleInputChange('isRecurring', e.target.checked)}
                className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isRecurring" className="text-sm text-gray-300">
                دفعة متكررة
              </label>
            </div>

            {formData.isRecurring && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  فترة التكرار *
                </label>
                <select
                  value={formData.recurringPeriod || ''}
                  onChange={(e) => handleInputChange('recurringPeriod', e.target.value)}
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">اختر فترة التكرار</option>
                  <option value="monthly">شهرياً</option>
                  <option value="quarterly">كل ثلاثة أشهر</option>
                  <option value="yearly">سنوياً</option>
                </select>
                {validation.errors?.recurringPeriod && (
                  <p className="text-red-400 text-sm">{validation.errors?.recurringPeriod}</p>
                )}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-6 border-t border-white/20">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-gray-500/20 text-gray-300 rounded-lg hover:bg-gray-500/30 transition-colors"
            >
              {ARABIC_LABELS.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  جاري الإنشاء...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-5 w-5" />
                  {ARABIC_LABELS.createPayment}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default memo(CreatePaymentForm);