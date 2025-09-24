/**
 * PaymentModal Component
 * Bottom sheet modal for mobile payment processing
 * Features: Multi-step flow, pay-on-behalf, receipt upload, Arabic RTL support
 */

import React, { useState, useEffect, useRef } from 'react';
import { paymentService } from './PaymentService.js';
import MemberSearch from './MemberSearch.jsx';
import '../../styles/pwa-emergency-fix.css';

const PaymentModal = ({
  isOpen,
  onClose,
  onPaymentComplete,
  currentMember,
  initialPaymentType = 'subscription'
}) => {
  // Modal state
  const [step, setStep] = useState(1);
  const [isVisible, setIsVisible] = useState(false);

  // Payment form state
  const [paymentData, setPaymentData] = useState({
    type: initialPaymentType,
    amount: '',
    description: '',
    payOnBehalf: false,
    onBehalfMemberId: null,
    memberId: currentMember?.id
  });

  // UI state
  const [selectedMember, setSelectedMember] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState({});
  const [memberBalance, setMemberBalance] = useState(null);

  // Refs
  const modalRef = useRef(null);
  const fileInputRef = useRef(null);

  // Payment steps
  const steps = [
    { number: 1, title: 'نوع الدفعة', subtitle: 'اختر نوع الدفعة والمبلغ' },
    { number: 2, title: 'تفاصيل الدفع', subtitle: 'أدخل التفاصيل المطلوبة' },
    { number: 3, title: 'رفع الإيصال', subtitle: 'ارفق إيصال الدفع' },
    { number: 4, title: 'مراجعة وتأكيد', subtitle: 'راجع البيانات قبل الإرسال' }
  ];

  const paymentTypes = [
    {
      id: 'subscription',
      title: 'اشتراك شهري',
      subtitle: 'رسوم العضوية الشهرية',
      icon: '💳',
      color: 'from-blue-500 to-blue-600',
      defaultAmount: 100
    },
    {
      id: 'initiative',
      title: 'مبادرة',
      subtitle: 'مساهمة في مبادرات العائلة',
      icon: '🎯',
      color: 'from-green-500 to-green-600',
      defaultAmount: 200
    },
    {
      id: 'diya',
      title: 'دية',
      subtitle: 'دفع دية أو تعويض',
      icon: '⚖️',
      color: 'from-purple-500 to-purple-600',
      defaultAmount: 500
    }
  ];

  // Initialize modal
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
      resetForm();
    } else {
      document.body.style.overflow = 'unset';
      setTimeout(() => setIsVisible(false), 300);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Load member balance when payOnBehalf changes
  useEffect(() => {
    if (paymentData.payOnBehalf && selectedMember) {
      loadMemberBalance(selectedMember.id);
    } else if (!paymentData.payOnBehalf && currentMember) {
      loadMemberBalance(currentMember.id);
    }
  }, [paymentData.payOnBehalf, selectedMember, currentMember]);

  // Reset form to initial state
  const resetForm = () => {
    setStep(1);
    setPaymentData({
      type: initialPaymentType,
      amount: '',
      description: '',
      payOnBehalf: false,
      onBehalfMemberId: null,
      memberId: currentMember?.id
    });
    setSelectedMember(null);
    setReceiptFile(null);
    setReceiptPreview(null);
    setErrors({});
    setMemberBalance(null);
    setIsProcessing(false);
  };

  // Load member balance
  const loadMemberBalance = async (memberId) => {
    try {
      const balance = await paymentService.getMemberBalance(memberId);
      setMemberBalance(balance);
    } catch (error) {
      console.error('Error loading balance:', error);
    }
  };

  // Handle payment type selection
  const handleTypeSelect = (type) => {
    const selectedType = paymentTypes.find(t => t.id === type);
    setPaymentData(prev => ({
      ...prev,
      type,
      amount: selectedType?.defaultAmount.toString() || ''
    }));
    setErrors(prev => ({ ...prev, type: null }));
  };

  // Handle amount change
  const handleAmountChange = (value) => {
    const numericValue = value.replace(/[^\d]/g, '');
    setPaymentData(prev => ({ ...prev, amount: numericValue }));
    setErrors(prev => ({ ...prev, amount: null }));
  };

  // Handle pay-on-behalf toggle
  const handlePayOnBehalfToggle = () => {
    setPaymentData(prev => ({
      ...prev,
      payOnBehalf: !prev.payOnBehalf,
      onBehalfMemberId: null
    }));
    setSelectedMember(null);
    setMemberBalance(null);
  };

  // Handle member selection
  const handleMemberSelect = (member) => {
    setSelectedMember(member);
    setPaymentData(prev => ({
      ...prev,
      onBehalfMemberId: member.id
    }));
    setErrors(prev => ({ ...prev, onBehalfMemberId: null }));
  };

  // Handle receipt file selection
  const handleReceiptSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validation = paymentService.validateReceiptImage(file);
    if (!validation.isValid) {
      setErrors(prev => ({ ...prev, receipt: validation.errors.join(', ') }));
      return;
    }

    setReceiptFile(file);
    setErrors(prev => ({ ...prev, receipt: null }));

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => setReceiptPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  // Validate current step
  const validateStep = (stepNumber) => {
    const newErrors = {};

    switch (stepNumber) {
      case 1:
        if (!paymentData.type) newErrors.type = 'يجب اختيار نوع الدفعة';
        if (!paymentData.amount || parseInt(paymentData.amount) < 50) {
          newErrors.amount = 'الحد الأدنى للدفع 50 ريال';
        }
        break;

      case 2:
        if (paymentData.payOnBehalf && !selectedMember) {
          newErrors.onBehalfMemberId = 'يجب اختيار العضو للدفع نيابة عنه';
        }
        if ((paymentData.type === 'initiative' || paymentData.type === 'diya') && !paymentData.description.trim()) {
          newErrors.description = 'يجب إدخال وصف';
        }
        if (paymentData.payOnBehalf && selectedMember && !selectedMember.hasMinimumBalance) {
          newErrors.balance = 'العضو المختار لا يملك الحد الأدنى من الرصيد';
        }
        break;

      case 3:
        if (!receiptFile) newErrors.receipt = 'يجب رفع صورة الإيصال';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Navigate to next step
  const nextStep = () => {
    if (validateStep(step)) {
      setStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  // Navigate to previous step
  const prevStep = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  // Process payment
  const processPayment = async () => {
    if (!validateStep(4)) return;

    setIsProcessing(true);

    try {
      // Create payment
      const paymentResult = await paymentService.createPayment(paymentData);

      // Upload receipt and complete payment
      const completeResult = await paymentService.completePayment(
        paymentResult.paymentId,
        receiptFile
      );

      // Success
      onPaymentComplete({
        ...completeResult,
        referenceNumber: paymentResult.referenceNumber
      });

      onClose();
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  // Format currency display
  const formatCurrency = (amount) => {
    return paymentService.formatCurrency(parseInt(amount) || 0);
  };

  // Get current payment type details
  const getCurrentPaymentType = () => {
    return paymentTypes.find(t => t.id === paymentData.type);
  };

  if (!isVisible) return null;

  return (
    <div className="modal-overlay" style={{ display: isOpen ? 'flex' : 'none' }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        onClick={onClose}
        style={{ background: 'rgba(0, 0, 0, 0.8)' }}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="modal-content"
        dir="rtl"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          maxHeight: '90vh',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 className="text-title">دفع جديد</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {steps.map((s, index) => (
                  <div
                    key={s.number}
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: step > s.number ? 'var(--success)' : step === s.number ? 'var(--button-primary)' : 'var(--border-primary)'
                    }}
                  />
                ))}
              </div>
            </div>
            <button
              onClick={onClose}
              className="modal-close"
            >
              <svg style={{ width: '24px', height: '24px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Step Info */}
          <div style={{ marginTop: '8px' }}>
            <h3 className="text-subtitle">{steps[step - 1]?.title}</h3>
            <p className="text-caption">{steps[step - 1]?.subtitle}</p>
          </div>
        </div>

        {/* Modal Content */}
        <div style={{ padding: '24px', overflowY: 'auto', maxHeight: 'calc(90vh - 120px)' }}>
          {/* Step 1: Payment Type & Amount */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Payment Types */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  نوع الدفعة
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {paymentTypes.map(type => (
                    <button
                      key={type.id}
                      onClick={() => handleTypeSelect(type.id)}
                      className="modern-card"
                      style={{
                        padding: '16px',
                        border: paymentData.type === type.id ? '2px solid var(--button-primary)' : '2px solid var(--border-primary)',
                        background: paymentData.type === type.id ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-card)',
                        borderRadius: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          background: 'var(--button-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '20px'
                        }}>
                          {type.icon}
                        </div>
                        <div style={{ flex: 1, textAlign: 'right' }}>
                          <h4 className="text-body" style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{type.title}</h4>
                          <p className="text-caption">{type.subtitle}</p>
                        </div>
                        {paymentData.type === type.id && (
                          <div style={{ color: 'var(--button-primary)' }}>
                            <svg style={{ width: '24px', height: '24px' }} fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                {errors.type && <p className="text-caption" style={{ marginTop: '8px', color: 'var(--error)' }}>{errors.type}</p>}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  المبلغ (ريال سعودي)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={paymentData.amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="أدخل المبلغ"
                    className="form-input"
                    style={{
                      textAlign: 'right',
                      border: errors.amount ? '2px solid var(--error)' : '2px solid var(--border-primary)'
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }}>
                    ريال
                  </div>
                </div>
                {paymentData.amount && (
                  <p className="text-caption" style={{ marginTop: '8px' }}>
                    المبلغ: {formatCurrency(paymentData.amount)}
                  </p>
                )}
                {errors.amount && <p className="text-caption" style={{ marginTop: '8px', color: 'var(--error)' }}>{errors.amount}</p>}
              </div>
            </div>
          )}

          {/* Step 2: Payment Details */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Pay on Behalf Toggle */}
              <div>
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer">
                  <div>
                    <h4 className="font-semibold text-gray-900">الدفع نيابة عن عضو آخر</h4>
                    <p className="text-sm text-gray-500">اختر هذا الخيار للدفع نيابة عن عضو آخر</p>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={paymentData.payOnBehalf}
                      onChange={handlePayOnBehalfToggle}
                      className="sr-only"
                    />
                    <div className={`
                      w-12 h-6 rounded-full transition-colors duration-200
                      ${paymentData.payOnBehalf ? 'bg-blue-500' : 'bg-gray-300'}
                    `}>
                      <div className={`
                        w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200
                        ${paymentData.payOnBehalf ? 'transform translate-x-6' : 'transform translate-x-1'}
                        mt-0.5
                      `} />
                    </div>
                  </div>
                </label>
              </div>

              {/* Member Search (when pay on behalf is enabled) */}
              {paymentData.payOnBehalf && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    اختر العضو
                  </label>
                  <MemberSearch
                    onMemberSelect={handleMemberSelect}
                    selectedMember={selectedMember}
                    excludeMemberId={currentMember?.id}
                    placeholder="ابحث عن العضو..."
                  />
                  {errors.onBehalfMemberId && (
                    <p className="mt-2 text-sm text-red-600">{errors.onBehalfMemberId}</p>
                  )}
                  {errors.balance && (
                    <p className="mt-2 text-sm text-red-600">{errors.balance}</p>
                  )}
                </div>
              )}

              {/* Balance Display */}
              {memberBalance && (
                <div className={`
                  p-4 rounded-xl border-2
                  ${memberBalance.hasMinimumBalance ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}
                `}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        رصيد {paymentData.payOnBehalf ? 'العضو المختار' : 'العضو'}
                      </h4>
                      <p className="text-2xl font-bold mt-1">
                        {formatCurrency(memberBalance.balance)}
                      </p>
                    </div>
                    <div className={`
                      text-3xl
                      ${memberBalance.hasMinimumBalance ? 'text-green-500' : 'text-red-500'}
                    `}>
                      {memberBalance.hasMinimumBalance ? '✓' : '⚠️'}
                    </div>
                  </div>
                  <p className={`
                    text-sm mt-2
                    ${memberBalance.hasMinimumBalance ? 'text-green-700' : 'text-red-700'}
                  `}>
                    {memberBalance.hasMinimumBalance
                      ? 'الرصيد يلبي الحد الأدنى المطلوب'
                      : `الحد الأدنى المطلوب: ${formatCurrency(3000)}`
                    }
                  </p>
                </div>
              )}

              {/* Description (for initiatives and diyas) */}
              {(paymentData.type === 'initiative' || paymentData.type === 'diya') && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    وصف {paymentData.type === 'initiative' ? 'المبادرة' : 'الدية'}
                  </label>
                  <textarea
                    value={paymentData.description}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder={`أدخل وصف ${paymentData.type === 'initiative' ? 'المبادرة' : 'الدية'}`}
                    rows={3}
                    className={`
                      w-full px-4 py-3 text-right border-2 rounded-xl resize-none
                      transition-colors duration-200
                      ${errors.description ? 'border-red-300' : 'border-gray-200 focus:border-blue-500'}
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20
                    `}
                  />
                  {errors.description && (
                    <p className="mt-2 text-sm text-red-600">{errors.description}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Receipt Upload */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  إيصال الدفع
                </label>

                {/* File Upload Area */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
                    transition-colors duration-200
                    ${receiptFile ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'}
                  `}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleReceiptSelect}
                    className="hidden"
                  />

                  {receiptPreview ? (
                    <div className="space-y-4">
                      <img
                        src={receiptPreview}
                        alt="معاينة الإيصال"
                        className="max-h-48 mx-auto rounded-lg shadow-md"
                      />
                      <div className="text-green-600">
                        <svg className="h-8 w-8 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <p className="font-semibold mt-2">تم رفع الإيصال بنجاح</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500">
                      <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="font-semibold mt-3">انقر لرفع صورة الإيصال</p>
                      <p className="text-sm">JPG, PNG, WebP (حد أقصى 5 ميجابايت)</p>
                    </div>
                  )}
                </div>

                {errors.receipt && (
                  <p className="mt-2 text-sm text-red-600">{errors.receipt}</p>
                )}

                {/* Camera/Gallery Options */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <button
                    onClick={() => {
                      fileInputRef.current.setAttribute('capture', 'environment');
                      fileInputRef.current.click();
                    }}
                    className="flex items-center justify-center gap-2 p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-sm font-medium">كاميرا</span>
                  </button>
                  <button
                    onClick={() => {
                      fileInputRef.current.removeAttribute('capture');
                      fileInputRef.current.click();
                    }}
                    className="flex items-center justify-center gap-2 p-3 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition-colors"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm font-medium">معرض الصور</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review & Confirm */}
          {step === 4 && (
            <div className="space-y-6">
              {/* Payment Summary */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">ملخص الدفعة</h3>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">نوع الدفعة:</span>
                    <span className="font-semibold">{getCurrentPaymentType()?.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">المبلغ:</span>
                    <span className="font-bold text-xl text-green-600">{formatCurrency(paymentData.amount)}</span>
                  </div>
                  {paymentData.payOnBehalf && selectedMember && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">الدفع نيابة عن:</span>
                        <span className="font-semibold">{selectedMember.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">رقم العضوية:</span>
                        <span>#{selectedMember.membershipNumber}</span>
                      </div>
                    </>
                  )}
                  {paymentData.description && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">الوصف:</span>
                      <span className="max-w-48 text-left">{paymentData.description}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Receipt Preview */}
              {receiptPreview && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-3">الإيصال المرفق</h4>
                  <img
                    src={receiptPreview}
                    alt="معاينة الإيصال"
                    className="w-full max-h-48 object-contain rounded-lg border border-gray-200"
                  />
                </div>
              )}

              {/* Terms Notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex gap-3">
                  <span className="text-amber-600 text-xl">⚠️</span>
                  <div className="text-sm text-amber-800">
                    <p className="font-semibold mb-1">ملاحظة مهمة:</p>
                    <p>سيتم مراجعة الدفعة والإيصال من قبل الإدارة المالية. قد تستغرق العملية 1-3 أيام عمل للموافقة النهائية.</p>
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex gap-3">
                    <span className="text-red-600 text-xl">❌</span>
                    <p className="text-sm text-red-800">{errors.submit}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4">
          <div className="flex gap-3">
            {step > 1 && (
              <button
                onClick={prevStep}
                disabled={isProcessing}
                className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                السابق
              </button>
            )}

            {step < steps.length ? (
              <button
                onClick={nextStep}
                disabled={isProcessing}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50"
              >
                التالي
              </button>
            ) : (
              <button
                onClick={processPayment}
                disabled={isProcessing}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>جارٍ المعالجة...</span>
                  </>
                ) : (
                  <>
                    <span>تأكيد الدفع</span>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;