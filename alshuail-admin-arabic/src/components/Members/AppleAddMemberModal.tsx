import {
BriefcaseIcon,DevicePhoneMobileIcon,EnvelopeIcon,ExclamationTriangleIcon,HashtagIcon,IdentificationIcon,MapPinIcon,PaperAirplaneIcon,PhoneIcon,PhotoIcon,ShieldCheckIcon,UserIcon,UserPlusIcon,XMarkIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';
import React,{ memo,useEffect,useRef,useState } from 'react';
import { logger } from '../../utils/logger';
import { HijriDatePicker } from '../Common/HijriDatePicker';

import '../../styles/apple-design-system.css';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMemberAdded: (member: any) => void;
}

interface FormData {
  full_name: string;
  membership_number: string;
  phone: string;
  whatsapp_number: string;
  email: string;
  national_id: string;
  employer: string;
  address: string;
  birth_date: string;
  social_security_beneficiary: boolean;
  send_registration_link: boolean;
  membership_type: 'standard' | 'premium' | 'trial';
  family_members_count: number;
  notes: string;
}

interface ValidationError {
  field: string;
  message: string;
}

const AppleAddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  onMemberAdded
}) => {
  const [formData, setFormData] = useState<FormData>({
    full_name: '',
    membership_number: '',
    phone: '',
    whatsapp_number: '',
    email: '',
    national_id: '',
    employer: '',
    address: '',
    birth_date: '',
    social_security_beneficiary: false,
    send_registration_link: true,
    membership_type: 'standard',
    family_members_count: 1,
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [success, setSuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [, setFocusedField] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Focus management
  useEffect(() => {
    if (isOpen && firstInputRef.current) {
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 300);
    }
  }, [isOpen]);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Generate membership number automatically
  const generateMembershipNumber = (): string => {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const timestamp = Date.now().toString().slice(-4);
    return `SH-${timestamp}-${randomNum}`;
  };

  // Handle input changes with validation
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear field-specific errors
    setErrors(prev => prev.filter(error => error.field !== name));
  };

  // Real-time validation
  const validateField = (fieldName: string, value: any): ValidationError | null => {
    switch (fieldName) {
      case 'full_name':
        if (!value?.trim()) return { field: fieldName, message: 'الاسم الكامل مطلوب' };
        if (value.trim().length < 3) return { field: fieldName, message: 'الاسم يجب أن يكون 3 أحرف على الأقل' };
        break;

      case 'phone':
        if (!value?.trim()) return { field: fieldName, message: 'رقم الهاتف مطلوب' };
        const phoneRegex = /^(05|5)(5|0|3|6|4|9|1|8|7)([0-9]{7})$/;
        if (!phoneRegex.test(value.replace(/\D/g, ''))) {
          return { field: fieldName, message: 'رقم الهاتف غير صحيح (يجب أن يبدأ بـ 05)' };
        }
        break;

      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return { field: fieldName, message: 'البريد الإلكتروني غير صحيح' };
        }
        break;

      case 'national_id':
        if (value && !/^\d{10}$/.test(value)) {
          return { field: fieldName, message: 'رقم الهوية يجب أن يكون 10 أرقام' };
        }
        break;

      case 'birth_date':
        if (value) {
          const birthYear = new Date(value).getFullYear();
          const currentYear = new Date().getFullYear();
          if (currentYear - birthYear > 100 || currentYear - birthYear < 0) {
            return { field: fieldName, message: 'تاريخ الميلاد غير صحيح' };
          }
        }
        break;
    }

    return null;
  };

  // Validate entire form
  const validateForm = (): ValidationError[] => {
    const validationErrors: ValidationError[] = [];

    Object.entries(formData).forEach(([key, value]) => {
      const error = validateField(key, value);
      if (error) validationErrors.push(error);
    });

    return validationErrors;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors([]);

    try {
      // Generate membership number if not provided
      const membershipNumber = formData.membership_number || generateMembershipNumber();

      // Prepare member data
      const memberData = {
        ...formData,
        membership_number: membershipNumber,
        whatsapp_number: formData.whatsapp_number || formData.phone,
        registration_date: new Date().toISOString(),
        status: 'active',
        profile_completed: !!(formData.email && formData.national_id),
        total_payments: 0
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      setSuccess(true);

      // Call success callback after animation
      setTimeout(() => {
        onMemberAdded(memberData);
        resetForm();
        onClose();
      }, 1500);

    } catch (error) {
      logger.error('Error adding member:', { error });
      setErrors([{ field: 'general', message: 'حدث خطأ أثناء إضافة العضو. يرجى المحاولة مرة أخرى.' }]);
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      full_name: '',
      membership_number: '',
      phone: '',
      whatsapp_number: '',
      email: '',
      national_id: '',
      employer: '',
      address: '',
      birth_date: '',
      social_security_beneficiary: false,
      send_registration_link: true,
      membership_type: 'standard',
      family_members_count: 1,
      notes: ''
    });
    setErrors([]);
    setSuccess(false);
    setCurrentStep(1);
    setFocusedField(null);
  };

  // Get field error
  const getFieldError = (fieldName: string): string | undefined => {
    return errors.find(error => error.field === fieldName)?.message;
  };

  // Check if field has error
  const hasFieldError = (fieldName: string): boolean => {
    return errors.some(error => error.field === fieldName);
  };

  // Multi-step form navigation
  const nextStep = () => {
    const step1Fields = ['full_name', 'phone'];
    const step1Errors = step1Fields.filter(field => {
      const error = validateField(field, formData[field as keyof FormData]);
      return error !== null;
    });

    if (step1Errors.length > 0) {
      const newErrors = step1Fields.map(field =>
        validateField(field, formData[field as keyof FormData])
      ).filter(Boolean) as ValidationError[];
      setErrors(newErrors);
      return;
    }

    setCurrentStep(2);
    setErrors([]);
  };

  const prevStep = () => {
    setCurrentStep(1);
    setErrors([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 apple-flex-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div
        ref={modalRef}
        className="w-full max-w-2xl apple-glass rounded-3xl shadow-2xl overflow-hidden apple-animate-scale-in"
        style={{ maxHeight: '90vh' }}
      >
        {/* Modal Header */}
        <div className="apple-flex-between items-center p-6 border-b border-white/10">
          <div className="apple-flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl apple-flex-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
              <UserPlusIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="apple-title-2 text-gray-900">إضافة عضو جديد</h2>
              <p className="apple-caption-1 text-gray-600">
                الخطوة {currentStep} من 2 - {currentStep === 1 ? 'البيانات الأساسية' : 'البيانات التفصيلية'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="apple-button apple-button-secondary !min-h-10 !px-3"
            disabled={loading}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 py-4">
          <div className="apple-flex items-center gap-4">
            <div className="apple-flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full apple-flex-center text-sm font-semibold ${
                currentStep >= 1 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                1
              </div>
              <span className={`apple-caption-1 ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-500'}`}>
                البيانات الأساسية
              </span>
            </div>
            <div className={`flex-1 h-1 rounded-full ${currentStep >= 2 ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
            <div className="apple-flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full apple-flex-center text-sm font-semibold ${
                currentStep >= 2 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                2
              </div>
              <span className={`apple-caption-1 ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-500'}`}>
                البيانات التفصيلية
              </span>
            </div>
          </div>
        </div>

        {/* Success State */}
        {success && (
          <div className="absolute inset-0 apple-flex-center bg-white/95 backdrop-blur-sm z-10">
            <div className="text-center apple-animate-bounce-in">
              <div className="w-20 h-20 rounded-full apple-flex-center mx-auto mb-6 bg-green-100">
                <CheckCircleIconSolid className="w-12 h-12 text-green-600" />
              </div>
              <h3 className="apple-title-2 text-gray-900 mb-2">تم إضافة العضو بنجاح!</h3>
              <p className="apple-body text-gray-600">سيتم إرسال رابط التسجيل قريباً</p>
            </div>
          </div>
        )}

        {/* Form Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* General Errors */}
            {errors.some(error => error.field === 'general') && (
              <div className="apple-flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="apple-caption-1 text-red-700">
                  {errors.find(error => error.field === 'general')?.message}
                </p>
              </div>
            )}

            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-6 apple-animate-slide-up">
                {/* Profile Picture */}
                <div className="text-center">
                  <div className="w-24 h-24 rounded-2xl apple-flex-center mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors cursor-pointer group">
                    <PhotoIcon className="w-8 h-8 text-gray-400 group-hover:text-blue-500 transition-colors" />
                  </div>
                  <p className="apple-caption-1 text-gray-600">اضغط لإضافة صورة شخصية (اختياري)</p>
                </div>

                {/* Full Name */}
                <div className="apple-input-floating">
                  <input
                    ref={firstInputRef}
                    type="text"
                    name="full_name"
                    placeholder=" "
                    value={formData.full_name}
                    onChange={handleInputChange}
                    onFocus={() => setFocusedField('full_name')}
                    onBlur={() => setFocusedField(null)}
                    className={`apple-input ${hasFieldError('full_name') ? 'border-red-400 bg-red-50' : ''}`}
                    required
                  />
                  <label>الاسم الكامل *</label>
                  <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  {hasFieldError('full_name') && (
                    <p className="apple-caption-1 text-red-600 mt-1">{getFieldError('full_name')}</p>
                  )}
                </div>

                {/* Phone Number */}
                <div className="apple-input-floating">
                  <input
                    type="tel"
                    name="phone"
                    placeholder=" "
                    value={formData.phone}
                    onChange={handleInputChange}
                    onFocus={() => setFocusedField('phone')}
                    onBlur={() => setFocusedField(null)}
                    className={`apple-input ${hasFieldError('phone') ? 'border-red-400 bg-red-50' : ''}`}
                    required
                  />
                  <label>رقم الهاتف *</label>
                  <PhoneIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  {hasFieldError('phone') && (
                    <p className="apple-caption-1 text-red-600 mt-1">{getFieldError('phone')}</p>
                  )}
                </div>

                {/* WhatsApp Number */}
                <div className="apple-input-floating">
                  <input
                    type="tel"
                    name="whatsapp_number"
                    placeholder=" "
                    value={formData.whatsapp_number}
                    onChange={handleInputChange}
                    className="apple-input"
                  />
                  <label>رقم الواتساب (اختياري)</label>
                  <DevicePhoneMobileIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <p className="apple-caption-2 text-gray-500 mt-1">
                    إذا لم يتم تعبئته، سيتم استخدام رقم الهاتف الأساسي
                  </p>
                </div>

                {/* Email */}
                <div className="apple-input-floating">
                  <input
                    type="email"
                    name="email"
                    placeholder=" "
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`apple-input ${hasFieldError('email') ? 'border-red-400 bg-red-50' : ''}`}
                  />
                  <label>البريد الإلكتروني (اختياري)</label>
                  <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  {hasFieldError('email') && (
                    <p className="apple-caption-1 text-red-600 mt-1">{getFieldError('email')}</p>
                  )}
                </div>

                {/* Membership Type */}
                <div>
                  <label className="apple-caption-1 text-gray-600 block mb-3">نوع العضوية</label>
                  <div className="apple-grid apple-grid-3 gap-3">
                    {[
                      { value: 'trial', label: 'تجريبي', icon: '🆓', color: 'from-gray-400 to-gray-500' },
                      { value: 'standard', label: 'عادي', icon: '👤', color: 'from-blue-500 to-indigo-600' },
                      { value: 'premium', label: 'مميز', icon: '⭐', color: 'from-purple-500 to-pink-600' }
                    ].map((type) => (
                      <label
                        key={type.value}
                        className={`apple-card p-4 cursor-pointer transition-all hover:scale-105 ${
                          formData.membership_type === type.value ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                        }`}
                      >
                        <input
                          type="radio"
                          name="membership_type"
                          value={type.value}
                          checked={formData.membership_type === type.value}
                          onChange={handleInputChange}
                          className="sr-only"
                        />
                        <div className="text-center">
                          <div className={`w-12 h-12 rounded-xl apple-flex-center mx-auto mb-2 text-white bg-gradient-to-br ${type.color}`}>
                            <span className="text-xl">{type.icon}</span>
                          </div>
                          <p className="apple-callout text-gray-900">{type.label}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Detailed Information */}
            {currentStep === 2 && (
              <div className="space-y-6 apple-animate-slide-up">
                {/* Membership Number */}
                <div className="apple-input-floating">
                  <input
                    type="text"
                    name="membership_number"
                    placeholder=" "
                    value={formData.membership_number}
                    onChange={handleInputChange}
                    className="apple-input"
                  />
                  <label>رقم العضوية (اختياري)</label>
                  <HashtagIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <p className="apple-caption-2 text-gray-500 mt-1">
                    إذا لم يتم تعبئته، سيتم إنشاء رقم تلقائياً
                  </p>
                </div>

                {/* National ID */}
                <div className="apple-input-floating">
                  <input
                    type="text"
                    name="national_id"
                    placeholder=" "
                    value={formData.national_id}
                    onChange={handleInputChange}
                    className={`apple-input ${hasFieldError('national_id') ? 'border-red-400 bg-red-50' : ''}`}
                    maxLength={10}
                  />
                  <label>رقم الهوية الوطنية (اختياري)</label>
                  <IdentificationIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  {hasFieldError('national_id') && (
                    <p className="apple-caption-1 text-red-600 mt-1">{getFieldError('national_id')}</p>
                  )}
                </div>

                {/* Birth Date */}
                <div>
                  <HijriDatePicker
                    value={formData.birth_date}
                    onChange={(gregorianDate) => {
                      setFormData(prev => ({ ...prev, birth_date: gregorianDate }));
                    }}
                    label="تاريخ الميلاد (اختياري)"
                    placeholder="اختر التاريخ الهجري"
                    showGregorian={true}
                  />
                  {hasFieldError('birth_date') && (
                    <p className="apple-caption-1 text-red-600 mt-1">{getFieldError('birth_date')}</p>
                  )}
                </div>

                {/* Address */}
                <div className="apple-input-floating">
                  <input
                    type="text"
                    name="address"
                    placeholder=" "
                    value={formData.address}
                    onChange={handleInputChange}
                    className="apple-input"
                  />
                  <label>العنوان (اختياري)</label>
                  <MapPinIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>

                {/* Employer */}
                <div className="apple-input-floating">
                  <input
                    type="text"
                    name="employer"
                    placeholder=" "
                    value={formData.employer}
                    onChange={handleInputChange}
                    className="apple-input"
                  />
                  <label>جهة العمل (اختياري)</label>
                  <BriefcaseIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>

                {/* Family Members Count */}
                <div>
                  <label className="apple-caption-1 text-gray-600 block mb-2">عدد أفراد الأسرة</label>
                  <input
                    type="number"
                    name="family_members_count"
                    value={formData.family_members_count}
                    onChange={handleInputChange}
                    min="1"
                    max="20"
                    className="apple-input"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="apple-caption-1 text-gray-600 block mb-2">ملاحظات إضافية (اختياري)</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    className="apple-input resize-none"
                    placeholder="أي ملاحظات أو معلومات إضافية..."
                  />
                </div>

                {/* Checkboxes */}
                <div className="space-y-4">
                  <label className="apple-flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="social_security_beneficiary"
                      checked={formData.social_security_beneficiary}
                      onChange={handleInputChange}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="apple-flex items-center gap-2">
                      <ShieldCheckIcon className="w-5 h-5 text-gray-400" />
                      <span className="apple-callout text-gray-900">مستفيد من الضمان الاجتماعي</span>
                    </div>
                  </label>

                  <label className="apple-flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="send_registration_link"
                      checked={formData.send_registration_link}
                      onChange={handleInputChange}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="apple-flex items-center gap-2">
                      <PaperAirplaneIcon className="w-5 h-5 text-gray-400" />
                      <span className="apple-callout text-gray-900">إرسال رابط إكمال التسجيل</span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="apple-flex gap-3 pt-6 border-t border-gray-200">
              {currentStep === 1 ? (
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    className="apple-button apple-button-secondary flex-1"
                    disabled={loading}
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={nextStep}
                    className="apple-button apple-button-primary flex-1"
                    disabled={loading}
                  >
                    التالي
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={prevStep}
                    className="apple-button apple-button-secondary flex-1"
                    disabled={loading}
                  >
                    السابق
                  </button>
                  <button
                    type="submit"
                    className="apple-button apple-button-primary flex-1 apple-flex items-center justify-center gap-2"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>جاري الإضافة...</span>
                      </>
                    ) : (
                      <>
                        <UserPlusIcon className="w-4 h-4" />
                        <span>إضافة العضو</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default memo(AppleAddMemberModal);