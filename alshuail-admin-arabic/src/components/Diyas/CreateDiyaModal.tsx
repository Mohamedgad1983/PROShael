import React, { memo,  useState } from 'react';
import {
  XMarkIcon,
  ScaleIcon,
  CalendarIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  UserPlusIcon,
  DocumentTextIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import { DiyaFormData, DiyaCaseType, DiyaPriority, PartyRole } from './types';
import { ARABIC_LABELS, CURRENCY } from '../../constants/arabic';

interface CreateDiyaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DiyaFormData) => void;
  isLoading?: boolean;
}

const caseTypes: { value: DiyaCaseType; label: string }[] = [
  { value: 'accidentalDamage', label: ARABIC_LABELS.accidentalDamage },
  { value: 'intentionalDamage', label: ARABIC_LABELS.intentionalDamage },
  { value: 'medicalCompensation', label: ARABIC_LABELS.medicalCompensation },
  { value: 'propertyDamage', label: ARABIC_LABELS.propertyDamage },
  { value: 'vehicleAccident', label: 'حادث مروري' },
  { value: 'personalInjury', label: 'إصابة شخصية' },
  { value: 'death', label: 'وفاة' },
  { value: 'financial', label: 'مالي' }
];

const priorities: { value: DiyaPriority; label: string; color: string }[] = [
  { value: 'urgent', label: ARABIC_LABELS.urgent, color: '#dc2626' },
  { value: 'high', label: ARABIC_LABELS.high, color: '#f59e0b' },
  { value: 'medium', label: ARABIC_LABELS.medium, color: '#3b82f6' },
  { value: 'low', label: ARABIC_LABELS.low, color: '#10b981' }
];

const partyRoles: { value: PartyRole; label: string }[] = [
  { value: 'complainant', label: 'المشتكي' },
  { value: 'respondent', label: 'المشتكى عليه' },
  { value: 'witness', label: 'شاهد' },
  { value: 'guardian', label: 'ولي أمر' },
  { value: 'representative', label: 'ممثل قانوني' }
];

const CreateDiyaModal: React.FC<CreateDiyaModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<any>({
    title: '',
    description: '',
    caseType: 'accidentalDamage',
    compensationAmount: 100,
    priority: 'medium',
    caseDateOccurred: '',
    // Hijri date fields
    caseDay: '',
    caseMonth: '',
    caseYear: '1446',
    caseDetails: {
      location: '',
      damageDescription: '',
      estimatedCost: undefined,
      insuranceClaim: false
    },
    involvedParties: [
      {
        name: '',
        role: 'complainant',
        contactInfo: { phone: '', email: '' },
        relationship: '',
        isResponsible: false
      }
    ]
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = ARABIC_LABELS.fieldRequired;
    }

    if (!formData.description.trim()) {
      newErrors.description = ARABIC_LABELS.fieldRequired;
    }

    if (!formData.caseDateOccurred) {
      newErrors.caseDateOccurred = ARABIC_LABELS.fieldRequired;
    }

    if (!formData.compensationAmount || formData.compensationAmount < 50) {
      newErrors.compensationAmount = ARABIC_LABELS.minimumDiya;
    }

    if (!formData.caseDetails.location.trim()) {
      newErrors.location = ARABIC_LABELS.fieldRequired;
    }

    if (!formData.caseDetails.damageDescription.trim()) {
      newErrors.damageDescription = ARABIC_LABELS.fieldRequired;
    }

    if (formData.involvedParties.some((party: any) => !party.name.trim())) {
      newErrors.involvedParties = 'جميع الأطراف يجب أن تحتوي على أسماء';
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

  const addParty = () => {
    setFormData((prev: any) => ({
      ...prev,
      involvedParties: [
        ...prev.involvedParties,
        {
          name: '',
          role: 'witness',
          contactInfo: { phone: '', email: '' },
          relationship: '',
          isResponsible: false
        }
      ]
    }));
  };

  const removeParty = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      involvedParties: prev.involvedParties.filter((_: any, i: any) => i !== index)
    }));
  };

  const updateParty = (index: number, field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      involvedParties: prev.involvedParties.map((party: any, i: any) =>
        i === index ? { ...party, [field]: value } : party
      )
    }));
  };

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
    maxWidth: '700px',
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

  const sectionStyle: React.CSSProperties = {
    marginBottom: '24px',
    padding: '20px',
    background: 'rgba(255, 255, 255, 0.6)',
    borderRadius: '12px',
    border: '1px solid rgba(0, 0, 0, 0.1)'
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  const formGroupStyle: React.CSSProperties = {
    marginBottom: '16px'
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

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: '80px',
    resize: 'vertical' as const
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer'
  };

  const errorStyle: React.CSSProperties = {
    color: '#ef4444',
    fontSize: '12px',
    marginTop: '4px'
  };

  const checkboxContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  const partyCardStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.8)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '12px',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    position: 'relative'
  };

  const removeButtonStyle: React.CSSProperties = {
    position: 'absolute' as const,
    top: '8px',
    left: '8px',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const addButtonStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  };

  const submitButtonStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginTop: '20px'
  };

  const disabledButtonStyle: React.CSSProperties = {
    ...submitButtonStyle,
    opacity: 0.6,
    cursor: 'not-allowed'
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>
            <ScaleIcon style={{ width: '28px', height: '28px', color: '#667eea' }} />
            {ARABIC_LABELS.createDiya}
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

        <form onSubmit={handleSubmit}>
          {/* Basic Information */}
          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>
              <DocumentTextIcon style={{ width: '20px', height: '20px' }} />
              معلومات أساسية
            </h3>

            <div style={formGroupStyle}>
              <label style={labelStyle}>عنوان القضية *</label>
              <input
                type="text"
                style={{
                  ...inputStyle,
                  borderColor: errors.title ? '#ef4444' : 'rgba(0, 0, 0, 0.2)'
                }}
                value={formData.title}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, title: e.target.value }))}
                placeholder="عنوان مختصر للقضية"
              />
              {errors.title && <div style={errorStyle}>{errors.title}</div>}
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>الوصف التفصيلي *</label>
              <textarea
                style={{
                  ...textareaStyle,
                  borderColor: errors.description ? '#ef4444' : 'rgba(0, 0, 0, 0.2)'
                }}
                value={formData.description}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, description: e.target.value }))}
                placeholder="وصف مفصل للقضية والأضرار المترتبة عليها"
              />
              {errors.description && <div style={errorStyle}>{errors.description}</div>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={formGroupStyle}>
                <label style={labelStyle}>نوع القضية *</label>
                <select
                  style={selectStyle}
                  value={formData.caseType}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, caseType: e.target.value as DiyaCaseType }))}
                >
                  {caseTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>الأولوية *</label>
                <select
                  style={selectStyle}
                  value={formData.priority}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, priority: e.target.value as DiyaPriority }))}
                >
                  {priorities.map(priority => (
                    <option key={priority.value} value={priority.value}>
                      {priority.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={formGroupStyle}>
                <label style={labelStyle}>تاريخ وقوع الحادث (هجري) *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <select
                    style={{
                      ...inputStyle,
                      borderColor: errors.caseDateOccurred ? '#ef4444' : 'rgba(0, 0, 0, 0.2)'
                    }}
                    value={formData.caseDay || ''}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, caseDay: e.target.value }))}
                  >
                    <option value="" style={{ backgroundColor: 'white', color: '#374151' }}>اليوم</option>
                    {Array.from({ length: 30 }, (_, i) => (
                      <option key={i + 1} value={String(i + 1).padStart(2, '0')} style={{ backgroundColor: 'white', color: '#1e40af' }}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                  <select
                    style={{
                      ...inputStyle,
                      borderColor: errors.caseDateOccurred ? '#ef4444' : 'rgba(0, 0, 0, 0.2)'
                    }}
                    value={formData.caseMonth || ''}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, caseMonth: e.target.value }))}
                  >
                    <option value="" style={{ backgroundColor: 'white', color: '#374151' }}>الشهر</option>
                    <option value="01" style={{ backgroundColor: 'white', color: '#1e40af' }}>محرم</option>
                    <option value="02" style={{ backgroundColor: 'white', color: '#1e40af' }}>صفر</option>
                    <option value="03" style={{ backgroundColor: 'white', color: '#1e40af' }}>ربيع الأول</option>
                    <option value="04" style={{ backgroundColor: 'white', color: '#1e40af' }}>ربيع الآخر</option>
                    <option value="05" style={{ backgroundColor: 'white', color: '#1e40af' }}>جمادى الأولى</option>
                    <option value="06" style={{ backgroundColor: 'white', color: '#1e40af' }}>جمادى الآخرة</option>
                    <option value="07" style={{ backgroundColor: 'white', color: '#1e40af' }}>رجب</option>
                    <option value="08" style={{ backgroundColor: 'white', color: '#1e40af' }}>شعبان</option>
                    <option value="09" style={{ backgroundColor: 'white', color: '#1e40af' }}>رمضان</option>
                    <option value="10" style={{ backgroundColor: 'white', color: '#1e40af' }}>شوال</option>
                    <option value="11" style={{ backgroundColor: 'white', color: '#1e40af' }}>ذو القعدة</option>
                    <option value="12" style={{ backgroundColor: 'white', color: '#1e40af' }}>ذو الحجة</option>
                  </select>
                  <select
                    style={{
                      ...inputStyle,
                      borderColor: errors.caseDateOccurred ? '#ef4444' : 'rgba(0, 0, 0, 0.2)'
                    }}
                    value={formData.caseYear || '1446'}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, caseYear: e.target.value }))}
                  >
                    <option value="" style={{ backgroundColor: 'white', color: '#374151' }}>السنة</option>
                    {Array.from({ length: 6 }, (_, i) => (
                      <option key={i} value={String(1445 + i)} style={{ backgroundColor: 'white', color: '#1e40af' }}>
                        {1445 + i} هـ
                      </option>
                    ))}
                  </select>
                </div>
                {errors.caseDateOccurred && <div style={errorStyle}>{errors.caseDateOccurred}</div>}
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>
                  <CurrencyDollarIcon style={{ width: '16px', height: '16px', display: 'inline', marginLeft: '4px' }} />
                  مبلغ التعويض * (الحد الأدنى: 50 {CURRENCY.symbol})
                </label>
                <input
                  type="number"
                  style={{
                    ...inputStyle,
                    borderColor: errors.compensationAmount ? '#ef4444' : 'rgba(0, 0, 0, 0.2)'
                  }}
                  value={formData.compensationAmount}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, compensationAmount: parseInt(e.target.value) || 0 }))}
                  min="50"
                />
                {errors.compensationAmount && <div style={errorStyle}>{errors.compensationAmount}</div>}
              </div>
            </div>
          </div>

          {/* Case Details */}
          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>
              <MapPinIcon style={{ width: '20px', height: '20px' }} />
              تفاصيل القضية
            </h3>

            <div style={formGroupStyle}>
              <label style={labelStyle}>مكان وقوع الحادث *</label>
              <input
                type="text"
                style={{
                  ...inputStyle,
                  borderColor: errors.location ? '#ef4444' : 'rgba(0, 0, 0, 0.2)'
                }}
                value={formData.caseDetails.location}
                onChange={(e) => setFormData((prev: any) => ({
                  ...prev,
                  caseDetails: { ...prev.caseDetails, location: e.target.value }
                }))}
                placeholder="المدينة، الحي، الشارع"
              />
              {errors.location && <div style={errorStyle}>{errors.location}</div>}
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>وصف الأضرار *</label>
              <textarea
                style={{
                  ...textareaStyle,
                  borderColor: errors.damageDescription ? '#ef4444' : 'rgba(0, 0, 0, 0.2)'
                }}
                value={formData.caseDetails.damageDescription}
                onChange={(e) => setFormData((prev: any) => ({
                  ...prev,
                  caseDetails: { ...prev.caseDetails, damageDescription: e.target.value }
                }))}
                placeholder="وصف مفصل للأضرار الجسدية أو المادية"
              />
              {errors.damageDescription && <div style={errorStyle}>{errors.damageDescription}</div>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'end' }}>
              <div style={formGroupStyle}>
                <label style={labelStyle}>التكلفة المقدرة ({CURRENCY.symbol})</label>
                <input
                  type="number"
                  style={inputStyle}
                  value={formData.caseDetails.estimatedCost || ''}
                  onChange={(e) => setFormData((prev: any) => ({
                    ...prev,
                    caseDetails: {
                      ...prev.caseDetails,
                      estimatedCost: e.target.value ? parseInt(e.target.value) : undefined
                    }
                  }))}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div style={checkboxContainerStyle}>
                <input
                  type="checkbox"
                  id="insuranceClaim"
                  checked={formData.caseDetails.insuranceClaim}
                  onChange={(e) => setFormData((prev: any) => ({
                    ...prev,
                    caseDetails: { ...prev.caseDetails, insuranceClaim: e.target.checked }
                  }))}
                  style={{ width: '16px', height: '16px' }}
                />
                <label htmlFor="insuranceClaim" style={{ fontSize: '14px', color: '#374151', cursor: 'pointer' }}>
                  يوجد مطالبة تأمينية
                </label>
              </div>
            </div>
          </div>

          {/* Involved Parties */}
          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>
              <UserPlusIcon style={{ width: '20px', height: '20px' }} />
              الأطراف المعنية
            </h3>

            {formData.involvedParties.map((party: any, index: any) => (
              <div key={index} style={partyCardStyle}>
                {formData.involvedParties.length > 1 && (
                  <button
                    type="button"
                    style={removeButtonStyle}
                    onClick={() => removeParty(index)}
                    title="حذف الطرف"
                  >
                    ×
                  </button>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={formGroupStyle}>
                    <label style={labelStyle}>الاسم *</label>
                    <input
                      type="text"
                      style={inputStyle}
                      value={party.name}
                      onChange={(e) => updateParty(index, 'name', e.target.value)}
                      placeholder="الاسم الكامل"
                    />
                  </div>

                  <div style={formGroupStyle}>
                    <label style={labelStyle}>الدور *</label>
                    <select
                      style={selectStyle}
                      value={party.role}
                      onChange={(e) => updateParty(index, 'role', e.target.value as PartyRole)}
                    >
                      {partyRoles.map(role => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={formGroupStyle}>
                    <label style={labelStyle}>رقم الهاتف</label>
                    <input
                      type="tel"
                      style={inputStyle}
                      value={party.contactInfo?.phone || ''}
                      onChange={(e) => updateParty(index, 'contactInfo', { ...party.contactInfo, phone: e.target.value })}
                      placeholder="05xxxxxxxx"
                    />
                  </div>

                  <div style={formGroupStyle}>
                    <label style={labelStyle}>البريد الإلكتروني</label>
                    <input
                      type="email"
                      style={inputStyle}
                      value={party.contactInfo?.email || ''}
                      onChange={(e) => updateParty(index, 'contactInfo', { ...party.contactInfo, email: e.target.value })}
                      placeholder="example@email.com"
                    />
                  </div>
                </div>

                <div style={formGroupStyle}>
                  <label style={labelStyle}>صلة القرابة/العلاقة</label>
                  <input
                    type="text"
                    style={inputStyle}
                    value={party.relationship || ''}
                    onChange={(e) => updateParty(index, 'relationship', e.target.value)}
                    placeholder="مثل: أب، أخ، صديق، زميل"
                  />
                </div>

                <div style={checkboxContainerStyle}>
                  <input
                    type="checkbox"
                    id={`responsible-${index}`}
                    checked={party.isResponsible}
                    onChange={(e) => updateParty(index, 'isResponsible', e.target.checked)}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <label htmlFor={`responsible-${index}`} style={{ fontSize: '14px', color: '#374151', cursor: 'pointer' }}>
                    مسؤول عن الأضرار
                  </label>
                </div>
              </div>
            ))}

            {errors.involvedParties && <div style={errorStyle}>{errors.involvedParties}</div>}

            <button
              type="button"
              style={addButtonStyle}
              onClick={addParty}
            >
              <UserPlusIcon style={{ width: '20px', height: '20px' }} />
              إضافة طرف آخر
            </button>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px 24px',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e5e7eb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }}
            >
              رجوع
            </button>
            <button
              type="submit"
              style={{
                ...submitButtonStyle,
                flex: 1
              }}
              disabled={isLoading}
            >
              {isLoading ? ARABIC_LABELS.loading : ARABIC_LABELS.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default memo(CreateDiyaModal);