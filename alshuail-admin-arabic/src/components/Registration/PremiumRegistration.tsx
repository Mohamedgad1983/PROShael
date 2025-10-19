import React, { useState, useRef, useEffect } from 'react';
import {
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  IdentificationIcon,
  CalendarDaysIcon,
  MapPinIcon,
  HomeIcon,
  UserGroupIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  HeartIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  PhotoIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowRightIcon,
  SparklesIcon,
  StarIcon,
  CheckIcon,
  BanknotesIcon,
  GlobeAltIcon,
  DevicePhoneMobileIcon,
  CreditCardIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid, StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import './PremiumRegistration.css';

interface FormData {
  // Personal Information
  fullName: string;
  nationalId: string;
  phone: string;
  email: string;
  birthDate: string;
  birthDateHijri: string;
  gender: 'male' | 'female' | '';
  nationality: string;

  // Address Information
  country: string;
  city: string;
  district: string;
  street: string;
  buildingNumber: string;
  postalCode: string;
  additionalNumber: string;

  // Family Information
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed' | '';
  numberOfDependents: number;
  spouseName?: string;
  familyMembers: Array<{
    name: string;
    relationship: string;
    birthDate: string;
    nationalId: string;
  }>;

  // Professional Information
  occupation: string;
  employer: string;
  employmentType: string;
  monthlyIncome: string;
  educationLevel: string;
  specialization?: string;

  // Additional Information
  hasHealthConditions: boolean;
  healthConditions?: string;
  needsAssistance: boolean;
  assistanceType?: string;
  emergencyContact: string;
  emergencyPhone: string;

  // Documents
  nationalIdDocument?: File;
  profilePhoto?: File;
  familyCard?: File;
}

interface ValidationError {
  field: string;
  message: string;
}

const PremiumRegistration: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    nationalId: '',
    phone: '',
    email: '',
    birthDate: '',
    birthDateHijri: '',
    gender: '',
    nationality: 'saudi',
    country: 'السعودية',
    city: '',
    district: '',
    street: '',
    buildingNumber: '',
    postalCode: '',
    additionalNumber: '',
    maritalStatus: '',
    numberOfDependents: 0,
    familyMembers: [],
    occupation: '',
    employer: '',
    employmentType: 'full-time',
    monthlyIncome: '',
    educationLevel: '',
    hasHealthConditions: false,
    needsAssistance: false,
    emergencyContact: '',
    emergencyPhone: ''
  });

  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [activeField, setActiveField] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState(20);
  const formRef = useRef<HTMLDivElement>(null);

  const totalSteps = 5;
  const stepTitles = [
    'البيانات الأساسية',
    'العنوان السكني',
    'البيانات الأسرية',
    'البيانات الوظيفية',
    'البيانات التكميلية'
  ];

  const stepIcons = [
    UserIcon,
    HomeIcon,
    UserGroupIcon,
    BriefcaseIcon,
    DocumentTextIcon
  ];

  // Animation on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      formRef.current?.classList.add('form-visible');
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Update progress
  useEffect(() => {
    setProgressPercent((currentStep / totalSteps) * 100);
  }, [currentStep]);

  // Auto-save to localStorage
  useEffect(() => {
    const saveTimer = setTimeout(() => {
      localStorage.setItem('premiumRegistrationFormData', JSON.stringify(formData));
    }, 1000);
    return () => clearTimeout(saveTimer);
  }, [formData]);

  // Load saved data on mount
  useEffect(() => {
    const savedData = localStorage.getItem('premiumRegistrationFormData');
    if (savedData) {
      try {
        setFormData(JSON.parse(savedData));
      } catch (e) {
        console.error('Failed to load saved data');
      }
    }
  }, []);

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error for this field
    setErrors(prev => prev.filter(error => error.field !== field));
  };

  const validateStep = (step: number): boolean => {
    const newErrors: ValidationError[] = [];

    switch(step) {
      case 1:
        if (!formData.fullName || formData.fullName.length < 3) {
          newErrors.push({ field: 'fullName', message: 'الاسم الكامل مطلوب (3 أحرف على الأقل)' });
        }
        if (!formData.nationalId || formData.nationalId.length !== 10) {
          newErrors.push({ field: 'nationalId', message: 'رقم الهوية يجب أن يكون 10 أرقام' });
        }
        if (!formData.phone || !formData.phone.match(/^(05|5)(5|0|3|6|4|9|1|8|7)([0-9]{7})$/)) {
          newErrors.push({ field: 'phone', message: 'رقم الجوال غير صحيح' });
        }
        if (formData.email && !formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
          newErrors.push({ field: 'email', message: 'البريد الإلكتروني غير صحيح' });
        }
        if (!formData.gender) {
          newErrors.push({ field: 'gender', message: 'يرجى تحديد الجنس' });
        }
        break;

      case 2:
        if (!formData.city) {
          newErrors.push({ field: 'city', message: 'المدينة مطلوبة' });
        }
        if (!formData.district) {
          newErrors.push({ field: 'district', message: 'الحي مطلوب' });
        }
        if (!formData.street) {
          newErrors.push({ field: 'street', message: 'اسم الشارع مطلوب' });
        }
        break;

      case 3:
        if (!formData.maritalStatus) {
          newErrors.push({ field: 'maritalStatus', message: 'الحالة الاجتماعية مطلوبة' });
        }
        if (formData.maritalStatus === 'married' && !formData.spouseName) {
          newErrors.push({ field: 'spouseName', message: 'اسم الزوج/الزوجة مطلوب' });
        }
        break;

      case 4:
        if (!formData.occupation) {
          newErrors.push({ field: 'occupation', message: 'المهنة مطلوبة' });
        }
        if (!formData.employmentType) {
          newErrors.push({ field: 'employmentType', message: 'نوع التوظيف مطلوب' });
        }
        break;

      case 5:
        if (!formData.emergencyContact) {
          newErrors.push({ field: 'emergencyContact', message: 'اسم شخص الطوارئ مطلوب' });
        }
        if (!formData.emergencyPhone) {
          newErrors.push({ field: 'emergencyPhone', message: 'رقم هاتف الطوارئ مطلوب' });
        }
        break;
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePreviousStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      return;
    }

    setIsSubmitting(true);

    try {
      // API call to submit the form
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/members/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setSubmitSuccess(true);
        localStorage.removeItem('premiumRegistrationFormData');

        // Show success animation
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 500);
      } else {
        throw new Error('Registration failed');
      }
    } catch (error) {
      console.error('Submission error:', error);
      setErrors([{ field: 'submit', message: 'حدث خطأ أثناء التسجيل. يرجى المحاولة مرة أخرى.' }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderProgressBar = () => (
    <div className="progress-bar-container">
      <div className="progress-bar-track">
        <div
          className="progress-bar-fill"
          style={{ width: `${progressPercent}%` }}
        >
          <div className="progress-bar-glow"></div>
        </div>
      </div>
      <div className="progress-text">
        <span className="progress-step">الخطوة {currentStep} من {totalSteps}</span>
        <span className="progress-percent">{Math.round(progressPercent)}%</span>
      </div>
    </div>
  );

  const renderStepIndicator = () => (
    <div className="step-indicator-wrapper">
      <div className="step-indicator">
        {[...Array(totalSteps)].map((_, index) => {
          const StepIcon = stepIcons[index];
          const isActive = index + 1 === currentStep;
          const isCompleted = index + 1 < currentStep;

          return (
            <React.Fragment key={index}>
              <div
                className={`step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                onClick={() => isCompleted && setCurrentStep(index + 1)}
              >
                <div className="step-icon">
                  {isCompleted ? (
                    <CheckCircleIconSolid className="w-6 h-6" />
                  ) : (
                    <StepIcon className="w-5 h-5" />
                  )}
                </div>
                <span className="step-label">{stepTitles[index]}</span>
                {isActive && <div className="step-active-indicator"></div>}
              </div>
              {index < totalSteps - 1 && (
                <div className={`step-connector ${index + 1 < currentStep ? 'completed' : ''}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );

  const renderPersonalInfo = () => (
    <div className="form-section animate-slide-up">
      <div className="section-header">
        <div className="section-icon-wrapper">
          <UserIcon className="section-icon" />
        </div>
        <div className="section-text">
          <h2 className="section-title">البيانات الأساسية</h2>
          <p className="section-subtitle">معلوماتك الشخصية الأساسية المطلوبة للتسجيل</p>
        </div>
      </div>

      <div className="form-grid">
        <div className="input-group large">
          <label className="input-label required">
            <UserIcon className="label-icon" />
            الاسم الكامل
          </label>
          <div className="input-wrapper">
            <input
              type="text"
              className={`input-field ${errors.find(e => e.field === 'fullName') ? 'error' : ''} ${activeField === 'fullName' ? 'focused' : ''}`}
              placeholder="الاسم كما في الهوية الوطنية"
              value={formData.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              onFocus={() => setActiveField('fullName')}
              onBlur={() => setActiveField('')}
            />
            {activeField === 'fullName' && (
              <div className="field-hint">الاسم الرباعي كاملاً كما هو مسجل في الهوية</div>
            )}
          </div>
        </div>

        <div className="input-group">
          <label className="input-label required">
            <IdentificationIcon className="label-icon" />
            رقم الهوية الوطنية
          </label>
          <div className="input-wrapper">
            <input
              type="text"
              className={`input-field ${errors.find(e => e.field === 'nationalId') ? 'error' : ''}`}
              placeholder="1XXXXXXXXX"
              maxLength={10}
              value={formData.nationalId}
              onChange={(e) => handleInputChange('nationalId', e.target.value.replace(/\D/g, ''))}
              onFocus={() => setActiveField('nationalId')}
              onBlur={() => setActiveField('')}
              dir="ltr"
            />
            <div className="input-icon">
              <CreditCardIcon className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>

        <div className="input-group">
          <label className="input-label required">
            <PhoneIcon className="label-icon" />
            رقم الجوال
          </label>
          <div className="input-wrapper">
            <input
              type="tel"
              className={`input-field ${errors.find(e => e.field === 'phone') ? 'error' : ''}`}
              placeholder="05XXXXXXXX"
              maxLength={10}
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value.replace(/\D/g, ''))}
              onFocus={() => setActiveField('phone')}
              onBlur={() => setActiveField('')}
              dir="ltr"
            />
            <div className="input-icon">
              <DevicePhoneMobileIcon className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">
            <EnvelopeIcon className="label-icon" />
            البريد الإلكتروني
          </label>
          <div className="input-wrapper">
            <input
              type="email"
              className={`input-field ${errors.find(e => e.field === 'email') ? 'error' : ''}`}
              placeholder="example@domain.com"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              onFocus={() => setActiveField('email')}
              onBlur={() => setActiveField('')}
              dir="ltr"
            />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label required">
            <UserIcon className="label-icon" />
            الجنس
          </label>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                name="gender"
                value="male"
                checked={formData.gender === 'male'}
                onChange={(e) => handleInputChange('gender', e.target.value)}
                className="radio-input"
              />
              <span className="radio-text">ذكر</span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="gender"
                value="female"
                checked={formData.gender === 'female'}
                onChange={(e) => handleInputChange('gender', e.target.value)}
                className="radio-input"
              />
              <span className="radio-text">أنثى</span>
            </label>
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">
            <CalendarDaysIcon className="label-icon" />
            تاريخ الميلاد
          </label>
          <div className="input-wrapper">
            <input
              type="date"
              className="input-field"
              value={formData.birthDate}
              onChange={(e) => handleInputChange('birthDate', e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">
            <CalendarDaysIcon className="label-icon" />
            تاريخ الميلاد الهجري
          </label>
          <div className="input-wrapper">
            <input
              type="text"
              className="input-field"
              placeholder="1445/01/01"
              value={formData.birthDateHijri}
              onChange={(e) => handleInputChange('birthDateHijri', e.target.value)}
              dir="ltr"
            />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">
            <GlobeAltIcon className="label-icon" />
            الجنسية
          </label>
          <select
            className="input-field"
            value={formData.nationality}
            onChange={(e) => handleInputChange('nationality', e.target.value)}
          >
            <option value="saudi">سعودي</option>
            <option value="gcc">خليجي</option>
            <option value="arab">عربي</option>
            <option value="other">أخرى</option>
          </select>
        </div>
      </div>

      <div className="document-upload-section">
        <h3 className="upload-section-title">
          <PhotoIcon className="w-5 h-5" />
          المرفقات المطلوبة
        </h3>
        <div className="upload-grid">
          <div className="upload-card">
            <input
              type="file"
              id="nationalIdDoc"
              accept="image/*,.pdf"
              onChange={(e) => handleInputChange('nationalIdDocument', e.target.files?.[0])}
              className="hidden"
            />
            <label htmlFor="nationalIdDoc" className="upload-label">
              <div className="upload-icon-wrapper">
                <DocumentTextIcon className="upload-icon" />
              </div>
              <span className="upload-title">صورة الهوية الوطنية</span>
              <span className="upload-hint">PNG, JPG, PDF - حتى 5MB</span>
              {formData.nationalIdDocument && (
                <div className="upload-success">
                  <CheckCircleIcon className="w-5 h-5" />
                  {formData.nationalIdDocument.name}
                </div>
              )}
            </label>
          </div>

          <div className="upload-card">
            <input
              type="file"
              id="profilePhoto"
              accept="image/*"
              onChange={(e) => handleInputChange('profilePhoto', e.target.files?.[0])}
              className="hidden"
            />
            <label htmlFor="profilePhoto" className="upload-label">
              <div className="upload-icon-wrapper">
                <PhotoIcon className="upload-icon" />
              </div>
              <span className="upload-title">الصورة الشخصية</span>
              <span className="upload-hint">PNG, JPG - حتى 2MB</span>
              {formData.profilePhoto && (
                <div className="upload-success">
                  <CheckCircleIcon className="w-5 h-5" />
                  {formData.profilePhoto.name}
                </div>
              )}
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAddressInfo = () => (
    <div className="form-section animate-slide-up">
      <div className="section-header">
        <div className="section-icon-wrapper">
          <HomeIcon className="section-icon" />
        </div>
        <div className="section-text">
          <h2 className="section-title">العنوان السكني</h2>
          <p className="section-subtitle">عنوان السكن الحالي بالتفصيل</p>
        </div>
      </div>

      <div className="form-grid">
        <div className="input-group">
          <label className="input-label required">
            <MapPinIcon className="label-icon" />
            المدينة
          </label>
          <select
            className={`input-field ${errors.find(e => e.field === 'city') ? 'error' : ''}`}
            value={formData.city}
            onChange={(e) => handleInputChange('city', e.target.value)}
          >
            <option value="">اختر المدينة</option>
            <option value="riyadh">الرياض</option>
            <option value="jeddah">جدة</option>
            <option value="makkah">مكة المكرمة</option>
            <option value="madinah">المدينة المنورة</option>
            <option value="dammam">الدمام</option>
            <option value="khobar">الخبر</option>
            <option value="dhahran">الظهران</option>
            <option value="abha">أبها</option>
            <option value="tabuk">تبوك</option>
            <option value="hail">حائل</option>
            <option value="qassim">القصيم</option>
          </select>
        </div>

        <div className="input-group">
          <label className="input-label required">
            <BuildingOfficeIcon className="label-icon" />
            الحي
          </label>
          <input
            type="text"
            className={`input-field ${errors.find(e => e.field === 'district') ? 'error' : ''}`}
            placeholder="اسم الحي"
            value={formData.district}
            onChange={(e) => handleInputChange('district', e.target.value)}
          />
        </div>

        <div className="input-group">
          <label className="input-label required">
            <HomeIcon className="label-icon" />
            الشارع
          </label>
          <input
            type="text"
            className={`input-field ${errors.find(e => e.field === 'street') ? 'error' : ''}`}
            placeholder="اسم الشارع"
            value={formData.street}
            onChange={(e) => handleInputChange('street', e.target.value)}
          />
        </div>

        <div className="input-group">
          <label className="input-label">
            <HomeIcon className="label-icon" />
            رقم المبنى
          </label>
          <input
            type="text"
            className="input-field"
            placeholder="رقم المبنى"
            value={formData.buildingNumber}
            onChange={(e) => handleInputChange('buildingNumber', e.target.value)}
          />
        </div>

        <div className="input-group">
          <label className="input-label">
            <EnvelopeIcon className="label-icon" />
            الرمز البريدي
          </label>
          <input
            type="text"
            className="input-field"
            placeholder="12345"
            maxLength={5}
            value={formData.postalCode}
            onChange={(e) => handleInputChange('postalCode', e.target.value.replace(/\D/g, ''))}
            dir="ltr"
          />
        </div>

        <div className="input-group">
          <label className="input-label">
            <HomeIcon className="label-icon" />
            الرقم الإضافي
          </label>
          <input
            type="text"
            className="input-field"
            placeholder="1234"
            maxLength={4}
            value={formData.additionalNumber}
            onChange={(e) => handleInputChange('additionalNumber', e.target.value.replace(/\D/g, ''))}
            dir="ltr"
          />
        </div>
      </div>

      <div className="address-preview-card">
        <div className="address-preview-header">
          <MapPinIcon className="w-6 h-6 text-blue-600" />
          <h3>معاينة العنوان</h3>
        </div>
        <div className="address-preview-content">
          {formData.street && formData.district && formData.city ? (
            <p>{formData.street}، {formData.district}، {formData.city}
              {formData.buildingNumber && ` - مبنى رقم ${formData.buildingNumber}`}
              {formData.postalCode && ` - ${formData.postalCode}`}
            </p>
          ) : (
            <p className="text-gray-400">سيظهر العنوان الكامل هنا بعد إدخال البيانات</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderFamilyInfo = () => (
    <div className="form-section animate-slide-up">
      <div className="section-header">
        <div className="section-icon-wrapper">
          <UserGroupIcon className="section-icon" />
        </div>
        <div className="section-text">
          <h2 className="section-title">البيانات الأسرية</h2>
          <p className="section-subtitle">معلومات عن الأسرة والمعالين</p>
        </div>
      </div>

      <div className="form-grid">
        <div className="input-group">
          <label className="input-label required">
            <HeartIcon className="label-icon" />
            الحالة الاجتماعية
          </label>
          <select
            className={`input-field ${errors.find(e => e.field === 'maritalStatus') ? 'error' : ''}`}
            value={formData.maritalStatus}
            onChange={(e) => handleInputChange('maritalStatus', e.target.value)}
          >
            <option value="">اختر الحالة</option>
            <option value="single">أعزب / عزباء</option>
            <option value="married">متزوج / متزوجة</option>
            <option value="divorced">مطلق / مطلقة</option>
            <option value="widowed">أرمل / أرملة</option>
          </select>
        </div>

        {formData.maritalStatus === 'married' && (
          <div className="input-group">
            <label className="input-label required">
              <UserIcon className="label-icon" />
              اسم الزوج / الزوجة
            </label>
            <input
              type="text"
              className={`input-field ${errors.find(e => e.field === 'spouseName') ? 'error' : ''}`}
              placeholder="الاسم الكامل"
              value={formData.spouseName || ''}
              onChange={(e) => handleInputChange('spouseName', e.target.value)}
            />
          </div>
        )}

        <div className="input-group">
          <label className="input-label">
            <UserGroupIcon className="label-icon" />
            عدد المعالين
          </label>
          <div className="number-input-wrapper">
            <button
              type="button"
              className="number-button"
              onClick={() => handleInputChange('numberOfDependents', Math.max(0, formData.numberOfDependents - 1))}
            >
              -
            </button>
            <input
              type="number"
              className="input-field number-field"
              value={formData.numberOfDependents}
              onChange={(e) => handleInputChange('numberOfDependents', parseInt(e.target.value) || 0)}
              min="0"
              max="20"
            />
            <button
              type="button"
              className="number-button"
              onClick={() => handleInputChange('numberOfDependents', Math.min(20, formData.numberOfDependents + 1))}
            >
              +
            </button>
          </div>
        </div>
      </div>

      {formData.numberOfDependents > 0 && (
        <div className="dependents-section">
          <h3 className="subsection-title">
            <UserGroupIcon className="w-5 h-5" />
            بيانات المعالين
          </h3>
          <div className="dependents-grid">
            {[...Array(Math.min(formData.numberOfDependents, 10))].map((_, index) => (
              <div key={index} className="dependent-card">
                <div className="dependent-header">
                  <span className="dependent-number">المعال {index + 1}</span>
                </div>
                <div className="dependent-fields">
                  <input
                    type="text"
                    className="input-field small"
                    placeholder="الاسم الكامل"
                    value={formData.familyMembers[index]?.name || ''}
                    onChange={(e) => {
                      const updatedMembers = [...formData.familyMembers];
                      if (!updatedMembers[index]) {
                        updatedMembers[index] = {
                          name: '',
                          relationship: '',
                          birthDate: '',
                          nationalId: ''
                        };
                      }
                      updatedMembers[index].name = e.target.value;
                      handleInputChange('familyMembers', updatedMembers);
                    }}
                  />
                  <select
                    className="input-field small"
                    value={formData.familyMembers[index]?.relationship || ''}
                    onChange={(e) => {
                      const updatedMembers = [...formData.familyMembers];
                      if (!updatedMembers[index]) {
                        updatedMembers[index] = {
                          name: '',
                          relationship: '',
                          birthDate: '',
                          nationalId: ''
                        };
                      }
                      updatedMembers[index].relationship = e.target.value;
                      handleInputChange('familyMembers', updatedMembers);
                    }}
                  >
                    <option value="">صلة القرابة</option>
                    <option value="son">ابن</option>
                    <option value="daughter">ابنة</option>
                    <option value="parent">والد / والدة</option>
                    <option value="sibling">أخ / أخت</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderProfessionalInfo = () => (
    <div className="form-section animate-slide-up">
      <div className="section-header">
        <div className="section-icon-wrapper">
          <BriefcaseIcon className="section-icon" />
        </div>
        <div className="section-text">
          <h2 className="section-title">البيانات الوظيفية</h2>
          <p className="section-subtitle">معلومات العمل والتعليم</p>
        </div>
      </div>

      <div className="form-grid">
        <div className="input-group">
          <label className="input-label required">
            <BriefcaseIcon className="label-icon" />
            المهنة
          </label>
          <input
            type="text"
            className={`input-field ${errors.find(e => e.field === 'occupation') ? 'error' : ''}`}
            placeholder="المسمى الوظيفي"
            value={formData.occupation}
            onChange={(e) => handleInputChange('occupation', e.target.value)}
          />
        </div>

        <div className="input-group">
          <label className="input-label">
            <BuildingOfficeIcon className="label-icon" />
            جهة العمل
          </label>
          <input
            type="text"
            className="input-field"
            placeholder="اسم الشركة أو المؤسسة"
            value={formData.employer}
            onChange={(e) => handleInputChange('employer', e.target.value)}
          />
        </div>

        <div className="input-group">
          <label className="input-label required">
            <BriefcaseIcon className="label-icon" />
            نوع التوظيف
          </label>
          <select
            className={`input-field ${errors.find(e => e.field === 'employmentType') ? 'error' : ''}`}
            value={formData.employmentType}
            onChange={(e) => handleInputChange('employmentType', e.target.value)}
          >
            <option value="full-time">دوام كامل</option>
            <option value="part-time">دوام جزئي</option>
            <option value="self-employed">عمل حر</option>
            <option value="retired">متقاعد</option>
            <option value="unemployed">غير موظف</option>
          </select>
        </div>

        <div className="input-group">
          <label className="input-label">
            <BanknotesIcon className="label-icon" />
            الدخل الشهري
          </label>
          <select
            className="input-field"
            value={formData.monthlyIncome}
            onChange={(e) => handleInputChange('monthlyIncome', e.target.value)}
          >
            <option value="">اختر النطاق</option>
            <option value="less-3000">أقل من 3,000 ريال</option>
            <option value="3000-5000">3,000 - 5,000 ريال</option>
            <option value="5000-10000">5,000 - 10,000 ريال</option>
            <option value="10000-15000">10,000 - 15,000 ريال</option>
            <option value="15000-20000">15,000 - 20,000 ريال</option>
            <option value="20000-30000">20,000 - 30,000 ريال</option>
            <option value="more-30000">أكثر من 30,000 ريال</option>
          </select>
        </div>

        <div className="input-group">
          <label className="input-label">
            <AcademicCapIcon className="label-icon" />
            المستوى التعليمي
          </label>
          <select
            className="input-field"
            value={formData.educationLevel}
            onChange={(e) => handleInputChange('educationLevel', e.target.value)}
          >
            <option value="">اختر المستوى</option>
            <option value="primary">ابتدائي</option>
            <option value="intermediate">متوسط</option>
            <option value="secondary">ثانوي</option>
            <option value="diploma">دبلوم</option>
            <option value="bachelor">بكالوريوس</option>
            <option value="master">ماجستير</option>
            <option value="phd">دكتوراه</option>
          </select>
        </div>

        <div className="input-group">
          <label className="input-label">
            <AcademicCapIcon className="label-icon" />
            التخصص
          </label>
          <input
            type="text"
            className="input-field"
            placeholder="التخصص الدراسي"
            value={formData.specialization || ''}
            onChange={(e) => handleInputChange('specialization', e.target.value)}
          />
        </div>
      </div>
    </div>
  );

  const renderAdditionalInfo = () => (
    <div className="form-section animate-slide-up">
      <div className="section-header">
        <div className="section-icon-wrapper">
          <DocumentTextIcon className="section-icon" />
        </div>
        <div className="section-text">
          <h2 className="section-title">البيانات التكميلية</h2>
          <p className="section-subtitle">معلومات إضافية للطوارئ والاحتياجات الخاصة</p>
        </div>
      </div>

      <div className="form-grid">
        <div className="input-group">
          <label className="input-label required">
            <PhoneIcon className="label-icon" />
            اسم شخص للطوارئ
          </label>
          <input
            type="text"
            className={`input-field ${errors.find(e => e.field === 'emergencyContact') ? 'error' : ''}`}
            placeholder="الاسم الكامل"
            value={formData.emergencyContact}
            onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
          />
        </div>

        <div className="input-group">
          <label className="input-label required">
            <PhoneIcon className="label-icon" />
            رقم هاتف الطوارئ
          </label>
          <input
            type="tel"
            className={`input-field ${errors.find(e => e.field === 'emergencyPhone') ? 'error' : ''}`}
            placeholder="05XXXXXXXX"
            maxLength={10}
            value={formData.emergencyPhone}
            onChange={(e) => handleInputChange('emergencyPhone', e.target.value.replace(/\D/g, ''))}
            dir="ltr"
          />
        </div>
      </div>

      <div className="checkbox-sections">
        <div className="checkbox-group">
          <label className="premium-checkbox">
            <input
              type="checkbox"
              className="checkbox-input"
              checked={formData.hasHealthConditions}
              onChange={(e) => handleInputChange('hasHealthConditions', e.target.checked)}
            />
            <span className="checkbox-box">
              {formData.hasHealthConditions && <CheckIcon className="w-4 h-4" />}
            </span>
            <span className="checkbox-text">
              <ShieldCheckIcon className="w-5 h-5" />
              لدي حالة صحية تتطلب رعاية خاصة
            </span>
          </label>

          {formData.hasHealthConditions && (
            <div className="conditional-field animate-fade-in">
              <textarea
                className="input-field textarea"
                placeholder="يرجى توضيح الحالة الصحية..."
                rows={3}
                value={formData.healthConditions || ''}
                onChange={(e) => handleInputChange('healthConditions', e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="checkbox-group">
          <label className="premium-checkbox">
            <input
              type="checkbox"
              className="checkbox-input"
              checked={formData.needsAssistance}
              onChange={(e) => handleInputChange('needsAssistance', e.target.checked)}
            />
            <span className="checkbox-box">
              {formData.needsAssistance && <CheckIcon className="w-4 h-4" />}
            </span>
            <span className="checkbox-text">
              <HeartIcon className="w-5 h-5" />
              أحتاج إلى مساعدة من العائلة
            </span>
          </label>

          {formData.needsAssistance && (
            <div className="conditional-field animate-fade-in">
              <textarea
                className="input-field textarea"
                placeholder="يرجى توضيح نوع المساعدة المطلوبة..."
                rows={3}
                value={formData.assistanceType || ''}
                onChange={(e) => handleInputChange('assistanceType', e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      <div className="summary-section">
        <h3 className="summary-title">
          <CheckCircleIcon className="w-6 h-6" />
          ملخص البيانات المدخلة
        </h3>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">الاسم:</span>
            <span className="summary-value">{formData.fullName || '---'}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">رقم الهوية:</span>
            <span className="summary-value">{formData.nationalId || '---'}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">رقم الجوال:</span>
            <span className="summary-value">{formData.phone || '---'}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">المدينة:</span>
            <span className="summary-value">
              {formData.city ?
                {
                  'riyadh': 'الرياض',
                  'jeddah': 'جدة',
                  'makkah': 'مكة المكرمة',
                  'madinah': 'المدينة المنورة',
                  'dammam': 'الدمام',
                  'khobar': 'الخبر',
                  'dhahran': 'الظهران',
                  'abha': 'أبها',
                  'tabuk': 'تبوك',
                  'hail': 'حائل',
                  'qassim': 'القصيم'
                }[formData.city] || formData.city
                : '---'
              }
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">الحالة الاجتماعية:</span>
            <span className="summary-value">
              {formData.maritalStatus ?
                {
                  'single': 'أعزب / عزباء',
                  'married': 'متزوج / متزوجة',
                  'divorced': 'مطلق / مطلقة',
                  'widowed': 'أرمل / أرملة'
                }[formData.maritalStatus]
                : '---'
              }
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">المهنة:</span>
            <span className="summary-value">{formData.occupation || '---'}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSuccessScreen = () => (
    <div className="success-screen animate-scale-up">
      <div className="success-animation">
        <div className="success-circle">
          <div className="success-circle-fill"></div>
          <CheckCircleIconSolid className="success-icon" />
        </div>
        <div className="success-sparkles">
          {[...Array(12)].map((_, i) => (
            <div key={i} className={`sparkle sparkle-${i + 1}`}>
              <StarIconSolid className="w-4 h-4" />
            </div>
          ))}
        </div>
      </div>

      <h1 className="success-title">تم التسجيل بنجاح!</h1>
      <p className="success-message">
        شكراً لك على إكمال التسجيل في نظام عائلة الشعيل
      </p>

      <div className="success-details">
        <div className="success-detail-card">
          <div className="detail-icon">
            <DocumentTextIcon className="w-6 h-6" />
          </div>
          <div className="detail-content">
            <span className="detail-label">رقم المرجع</span>
            <span className="detail-value">REG-{new Date().getFullYear()}-{Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
          </div>
        </div>

        <div className="success-detail-card">
          <div className="detail-icon">
            <CalendarDaysIcon className="w-6 h-6" />
          </div>
          <div className="detail-content">
            <span className="detail-label">تاريخ التسجيل</span>
            <span className="detail-value">{new Date().toLocaleDateString('ar-SA')}</span>
          </div>
        </div>
      </div>

      <div className="success-actions">
        <button
          className="primary-button large"
          onClick={() => window.location.href = '/'}
        >
          <HomeIcon className="w-5 h-5" />
          العودة للصفحة الرئيسية
        </button>
      </div>
    </div>
  );

  if (submitSuccess) {
    return renderSuccessScreen();
  }

  return (
    <div className="premium-registration-container">
      {/* Premium Header */}
      <header className="premium-header">
        <div className="header-background">
          <div className="gradient-overlay"></div>
          <div className="pattern-overlay"></div>
        </div>
        <div className="header-content">
          <div className="logo-section">
            <div className="logo-wrapper">
              <SparklesIcon className="logo-icon" />
            </div>
            <div className="logo-text">
              <h1 className="logo-title">عائلة الشعيل</h1>
              <p className="logo-subtitle">نظام التسجيل الإلكتروني المتقدم</p>
            </div>
          </div>

          <div className="header-badges">
            <div className="badge">
              <StarIconSolid className="badge-icon" />
              <span>نظام محمي</span>
            </div>
            <div className="badge">
              <ShieldCheckIcon className="badge-icon" />
              <span>SSL مشفر</span>
            </div>
            <div className="badge">
              <CheckCircleIconSolid className="badge-icon" />
              <span>معتمد</span>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      {renderProgressBar()}

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Form Container */}
      <div className="form-container" ref={formRef}>
        <div className="form-wrapper">
          {/* Error Messages */}
          {errors.length > 0 && (
            <div className="error-banner animate-shake">
              <ExclamationCircleIcon className="error-icon" />
              <div className="error-messages">
                {errors.map((error, index) => (
                  <p key={index} className="error-message">{error.message}</p>
                ))}
              </div>
            </div>
          )}

          {/* Form Steps */}
          <div className="form-content">
            {currentStep === 1 && renderPersonalInfo()}
            {currentStep === 2 && renderAddressInfo()}
            {currentStep === 3 && renderFamilyInfo()}
            {currentStep === 4 && renderProfessionalInfo()}
            {currentStep === 5 && renderAdditionalInfo()}
          </div>

          {/* Navigation */}
          <div className="form-navigation">
            {currentStep > 1 && (
              <button
                className="nav-button secondary"
                onClick={handlePreviousStep}
                disabled={isSubmitting}
              >
                <ArrowRightIcon className="button-icon rotate-180" />
                <span>السابق</span>
              </button>
            )}

            <div className="nav-spacer"></div>

            {currentStep < totalSteps ? (
              <button
                className="nav-button primary"
                onClick={handleNextStep}
                disabled={isSubmitting}
              >
                <span>التالي</span>
                <ArrowRightIcon className="button-icon" />
              </button>
            ) : (
              <button
                className={`nav-button submit ${isSubmitting ? 'loading' : ''}`}
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="button-loader"></div>
                    <span>جاري الإرسال...</span>
                  </>
                ) : (
                  <>
                    <CheckIcon className="button-icon" />
                    <span>إرسال الطلب</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="registration-footer">
        <div className="footer-content">
          <p className="footer-text">© 2024 عائلة الشعيل - جميع الحقوق محفوظة</p>
          <div className="footer-links">
            <a href="/privacy">سياسة الخصوصية</a>
            <span className="separator">•</span>
            <a href="/terms">الشروط والأحكام</a>
            <span className="separator">•</span>
            <a href="/support">الدعم الفني</a>
          </div>
        </div>
      </footer>
    </div>
  );
};


// Phase 4: Performance Optimization - Memoize to prevent unnecessary re-renders
export default React.memo(PremiumRegistration);