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
  BanknotesIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid, StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { logger } from '../../utils/logger';

import './AppleRegistrationForm.css';

interface FormData {
  // Personal Information
  fullName: string;
  nationalId: string;
  phone: string;
  email: string;
  birthDate: string;
  birthDateHijri: string;

  // Address Information
  city: string;
  district: string;
  street: string;
  buildingNumber: string;
  postalCode: string;

  // Family Information
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed' | '';
  numberOfDependents: number;
  familyMembers: Array<{
    name: string;
    relationship: string;
    birthDate: string;
    nationalId: string;
  }>;

  // Professional Information
  occupation: string;
  employer: string;
  monthlyIncome: string;
  educationLevel: string;

  // Additional Information
  hasHealthConditions: boolean;
  healthConditions?: string;
  needsAssistance: boolean;
  assistanceType?: string;

  // Documents
  nationalIdDocument?: File;
  profilePhoto?: File;
}

interface ValidationError {
  field: string;
  message: string;
}

const AppleRegistrationForm: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    nationalId: '',
    phone: '',
    email: '',
    birthDate: '',
    birthDateHijri: '',
    city: '',
    district: '',
    street: '',
    buildingNumber: '',
    postalCode: '',
    maritalStatus: '',
    numberOfDependents: 0,
    familyMembers: [],
    occupation: '',
    employer: '',
    monthlyIncome: '',
    educationLevel: '',
    hasHealthConditions: false,
    needsAssistance: false
  });

  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [activeField, setActiveField] = useState<string>('');
  const formRef = useRef<HTMLDivElement>(null);

  const totalSteps = 5;
  const stepTitles = [
    'المعلومات الشخصية',
    'معلومات العنوان',
    'المعلومات العائلية',
    'المعلومات المهنية',
    'معلومات إضافية'
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

  // Auto-save to localStorage
  useEffect(() => {
    const saveTimer = setTimeout(() => {
      localStorage.setItem('registrationFormData', JSON.stringify(formData));
    }, 1000);
    return () => clearTimeout(saveTimer);
  }, [formData]);

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
        if (!formData.fullName) {
          newErrors.push({ field: 'fullName', message: 'الاسم الكامل مطلوب' });
        }
        if (!formData.nationalId || formData.nationalId.length !== 10) {
          newErrors.push({ field: 'nationalId', message: 'رقم الهوية يجب أن يكون 10 أرقام' });
        }
        if (!formData.phone || !formData.phone.match(/^05\d{8}$/)) {
          newErrors.push({ field: 'phone', message: 'رقم الجوال غير صحيح' });
        }
        break;

      case 2:
        if (!formData.city) {
          newErrors.push({ field: 'city', message: 'المدينة مطلوبة' });
        }
        if (!formData.district) {
          newErrors.push({ field: 'district', message: 'الحي مطلوب' });
        }
        break;

      case 3:
        if (!formData.maritalStatus) {
          newErrors.push({ field: 'maritalStatus', message: 'الحالة الاجتماعية مطلوبة' });
        }
        break;

      case 4:
        if (!formData.occupation) {
          newErrors.push({ field: 'occupation', message: 'المهنة مطلوبة' });
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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      setSubmitSuccess(true);
      localStorage.removeItem('registrationFormData');

      // Show success animation
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 500);
    } catch (error) {
      logger.error('Submission error:', { error });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="step-indicator-container">
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
              </div>
              {index < totalSteps - 1 && (
                <div className={`step-line ${index + 1 < currentStep ? 'completed' : ''}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );

  const renderPersonalInfo = () => (
    <div className="form-section animate-slide-in">
      <div className="section-header">
        <UserIcon className="section-icon" />
        <h2 className="section-title">المعلومات الشخصية</h2>
        <p className="section-subtitle">يرجى إدخال معلوماتك الشخصية بدقة</p>
      </div>

      <div className="form-grid">
        <div className="input-group">
          <label className="input-label">
            <UserIcon className="label-icon" />
            الاسم الكامل
          </label>
          <div className="input-wrapper">
            <input
              type="text"
              className={`input-field ${errors.find(e => e.field === 'fullName') ? 'error' : ''}`}
              placeholder="أدخل اسمك الكامل"
              value={formData.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              onFocus={() => setActiveField('fullName')}
              onBlur={() => setActiveField('')}
            />
            {activeField === 'fullName' && (
              <div className="field-hint">الاسم كما هو مسجل في الهوية الوطنية</div>
            )}
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">
            <IdentificationIcon className="label-icon" />
            رقم الهوية الوطنية
          </label>
          <div className="input-wrapper">
            <input
              type="text"
              className={`input-field ${errors.find(e => e.field === 'nationalId') ? 'error' : ''}`}
              placeholder="1234567890"
              maxLength={10}
              value={formData.nationalId}
              onChange={(e) => handleInputChange('nationalId', e.target.value.replace(/\D/g, ''))}
              onFocus={() => setActiveField('nationalId')}
              onBlur={() => setActiveField('')}
            />
            {activeField === 'nationalId' && (
              <div className="field-hint">10 أرقام بدون أي رموز</div>
            )}
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">
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
            {activeField === 'phone' && (
              <div className="field-hint">رقم جوال سعودي يبدأ بـ 05</div>
            )}
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
              className="input-field"
              placeholder="example@domain.com"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              onFocus={() => setActiveField('email')}
              onBlur={() => setActiveField('')}
              dir="ltr"
            />
            {activeField === 'email' && (
              <div className="field-hint">اختياري - للتواصل الإلكتروني</div>
            )}
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
              onFocus={() => setActiveField('birthDate')}
              onBlur={() => setActiveField('')}
            />
            {activeField === 'birthDate' && (
              <div className="field-hint">التاريخ الميلادي</div>
            )}
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
              onFocus={() => setActiveField('birthDateHijri')}
              onBlur={() => setActiveField('')}
              dir="ltr"
            />
            {activeField === 'birthDateHijri' && (
              <div className="field-hint">التاريخ الهجري بصيغة: سنة/شهر/يوم</div>
            )}
          </div>
        </div>
      </div>

      <div className="document-upload-section">
        <h3 className="upload-title">
          <PhotoIcon className="w-5 h-5" />
          رفع المستندات
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
              <DocumentTextIcon className="upload-icon" />
              <span className="upload-text">صورة الهوية الوطنية</span>
              <span className="upload-hint">PNG, JPG, PDF - حتى 5MB</span>
              {formData.nationalIdDocument && (
                <div className="upload-success">
                  <CheckCircleIcon className="w-5 h-5" />
                  تم الرفع بنجاح
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
              <PhotoIcon className="upload-icon" />
              <span className="upload-text">الصورة الشخصية</span>
              <span className="upload-hint">PNG, JPG - حتى 2MB</span>
              {formData.profilePhoto && (
                <div className="upload-success">
                  <CheckCircleIcon className="w-5 h-5" />
                  تم الرفع بنجاح
                </div>
              )}
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAddressInfo = () => (
    <div className="form-section animate-slide-in">
      <div className="section-header">
        <HomeIcon className="section-icon" />
        <h2 className="section-title">معلومات العنوان</h2>
        <p className="section-subtitle">عنوان السكن الحالي</p>
      </div>

      <div className="form-grid">
        <div className="input-group">
          <label className="input-label">
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
          </select>
        </div>

        <div className="input-group">
          <label className="input-label">
            <MapPinIcon className="label-icon" />
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
          <label className="input-label">
            <HomeIcon className="label-icon" />
            الشارع
          </label>
          <input
            type="text"
            className="input-field"
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
      </div>

      <div className="map-preview">
        <div className="map-placeholder">
          <MapPinIcon className="w-12 h-12 text-gray-400" />
          <p className="text-gray-500 mt-2">موقع العنوان على الخريطة</p>
        </div>
      </div>
    </div>
  );

  const renderFamilyInfo = () => (
    <div className="form-section animate-slide-in">
      <div className="section-header">
        <UserGroupIcon className="section-icon" />
        <h2 className="section-title">المعلومات العائلية</h2>
        <p className="section-subtitle">معلومات الأسرة والمعالين</p>
      </div>

      <div className="form-grid">
        <div className="input-group">
          <label className="input-label">
            <HeartIcon className="label-icon" />
            الحالة الاجتماعية
          </label>
          <select
            className={`input-field ${errors.find(e => e.field === 'maritalStatus') ? 'error' : ''}`}
            value={formData.maritalStatus}
            onChange={(e) => handleInputChange('maritalStatus', e.target.value)}
          >
            <option value="">اختر الحالة</option>
            <option value="single">أعزب</option>
            <option value="married">متزوج</option>
            <option value="divorced">مطلق</option>
            <option value="widowed">أرمل</option>
          </select>
        </div>

        <div className="input-group">
          <label className="input-label">
            <UserGroupIcon className="label-icon" />
            عدد المعالين
          </label>
          <input
            type="number"
            className="input-field"
            placeholder="0"
            min="0"
            value={formData.numberOfDependents}
            onChange={(e) => handleInputChange('numberOfDependents', parseInt(e.target.value) || 0)}
          />
        </div>
      </div>

      {formData.numberOfDependents > 0 && (
        <div className="family-members-section">
          <h3 className="subsection-title">معلومات المعالين</h3>
          <div className="family-members-grid">
            {[...Array(Math.min(formData.numberOfDependents, 10))].map((_, index) => (
              <div key={index} className="family-member-card">
                <div className="member-header">
                  <UserIcon className="w-5 h-5" />
                  <span>المعال {index + 1}</span>
                </div>
                <div className="member-fields">
                  <input
                    type="text"
                    className="input-field small"
                    placeholder="الاسم الكامل"
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
                    <option value="wife">زوجة</option>
                    <option value="parent">والد/والدة</option>
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
    <div className="form-section animate-slide-in">
      <div className="section-header">
        <BriefcaseIcon className="section-icon" />
        <h2 className="section-title">المعلومات المهنية</h2>
        <p className="section-subtitle">معلومات العمل والتعليم</p>
      </div>

      <div className="form-grid">
        <div className="input-group">
          <label className="input-label">
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
            <BriefcaseIcon className="label-icon" />
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
            <option value="more-20000">أكثر من 20,000 ريال</option>
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
      </div>
    </div>
  );

  const renderAdditionalInfo = () => (
    <div className="form-section animate-slide-in">
      <div className="section-header">
        <DocumentTextIcon className="section-icon" />
        <h2 className="section-title">معلومات إضافية</h2>
        <p className="section-subtitle">معلومات صحية واحتياجات خاصة</p>
      </div>

      <div className="checkbox-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            className="checkbox-input"
            checked={formData.hasHealthConditions}
            onChange={(e) => handleInputChange('hasHealthConditions', e.target.checked)}
          />
          <span className="checkbox-text">
            <ShieldCheckIcon className="w-5 h-5" />
            لدي حالة صحية تتطلب رعاية خاصة
          </span>
        </label>

        {formData.hasHealthConditions && (
          <div className="conditional-field">
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
        <label className="checkbox-label">
          <input
            type="checkbox"
            className="checkbox-input"
            checked={formData.needsAssistance}
            onChange={(e) => handleInputChange('needsAssistance', e.target.checked)}
          />
          <span className="checkbox-text">
            <HeartIcon className="w-5 h-5" />
            أحتاج إلى مساعدة من العائلة
          </span>
        </label>

        {formData.needsAssistance && (
          <div className="conditional-field">
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

      <div className="summary-section">
        <h3 className="summary-title">
          <CheckCircleIcon className="w-5 h-5" />
          ملخص البيانات
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
            <span className="summary-value">{formData.city || '---'}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSuccessScreen = () => (
    <div className="success-screen animate-scale-in">
      <div className="success-icon-wrapper">
        <div className="success-icon-bg"></div>
        <CheckCircleIconSolid className="success-icon" />
      </div>

      <h1 className="success-title">تم التسجيل بنجاح!</h1>
      <p className="success-message">
        شكراً لك على إكمال التسجيل. سيتم مراجعة طلبك والتواصل معك قريباً.
      </p>

      <div className="success-details">
        <div className="detail-item">
          <span className="detail-label">رقم المرجع:</span>
          <span className="detail-value">REG-2024-{Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">التاريخ:</span>
          <span className="detail-value">{new Date().toLocaleDateString('ar-SA')}</span>
        </div>
      </div>

      <div className="success-actions">
        <button
          className="primary-button"
          onClick={() => window.location.href = '/'}
        >
          العودة للصفحة الرئيسية
        </button>
      </div>
    </div>
  );

  if (submitSuccess) {
    return renderSuccessScreen();
  }

  return (
    <div className="apple-registration-container">
      {/* Premium Header */}
      <header className="premium-header">
        <div className="header-background">
          <div className="gradient-overlay"></div>
          <div className="particle-effect"></div>
        </div>
        <div className="header-content">
          <div className="logo-section">
            <div className="logo-wrapper">
              <SparklesIcon className="logo-icon" />
            </div>
            <div className="logo-text">
              <h1 className="logo-title">عائلة الشعيل</h1>
              <p className="logo-subtitle">نظام التسجيل الإلكتروني</p>
            </div>
          </div>

          <div className="header-info">
            <div className="info-item">
              <StarIconSolid className="info-icon" />
              <span>تسجيل آمن ومشفر</span>
            </div>
            <div className="info-item">
              <CheckCircleIconSolid className="info-icon" />
              <span>معتمد من الإدارة</span>
            </div>
          </div>
        </div>
      </header>

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
          {currentStep === 1 && renderPersonalInfo()}
          {currentStep === 2 && renderAddressInfo()}
          {currentStep === 3 && renderFamilyInfo()}
          {currentStep === 4 && renderProfessionalInfo()}
          {currentStep === 5 && renderAdditionalInfo()}

          {/* Navigation Buttons */}
          <div className="form-navigation">
            {currentStep > 1 && (
              <button
                className="secondary-button"
                onClick={handlePreviousStep}
                disabled={isSubmitting}
              >
                السابق
              </button>
            )}

            {currentStep < totalSteps ? (
              <button
                className="primary-button"
                onClick={handleNextStep}
                disabled={isSubmitting}
              >
                <span>التالي</span>
                <ArrowRightIcon className="button-icon" />
              </button>
            ) : (
              <button
                className={`primary-button ${isSubmitting ? 'loading' : ''}`}
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="button-spinner"></div>
                    <span>جاري الإرسال...</span>
                  </>
                ) : (
                  <>
                    <span>إرسال الطلب</span>
                    <CheckIcon className="button-icon" />
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


// Phase 4: Performance Optimization - Memoize to prevent unnecessary re-renders
export default React.memo(AppleRegistrationForm);