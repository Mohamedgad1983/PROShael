import React, { memo,  useState } from 'react';
import {
  XMarkIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UsersIcon,
  TagIcon,
  GlobeAltIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';
import { OccasionFormData, OccasionType } from './types';
import { ARABIC_LABELS } from '../../constants/arabic';

interface CreateOccasionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: OccasionFormData) => void;
  isLoading?: boolean;
}

const occasionTypes: { value: OccasionType; label: string }[] = [
  { value: 'wedding', label: ARABIC_LABELS.wedding },
  { value: 'birth', label: ARABIC_LABELS.birth },
  { value: 'graduation', label: ARABIC_LABELS.graduation },
  { value: 'celebration', label: ARABIC_LABELS.celebration },
  { value: 'conference', label: ARABIC_LABELS.conference },
  { value: 'meeting', label: ARABIC_LABELS.meeting },
  { value: 'charity', label: ARABIC_LABELS.charity },
  { value: 'social', label: 'اجتماعي' },
  { value: 'religious', label: 'ديني' },
  { value: 'family', label: 'عائلي' }
];

const CreateOccasionModal: React.FC<CreateOccasionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<any>({
    title: '',
    description: '',
    type: 'celebration',
    date: '',
    time: '',
    location: '',
    maxAttendees: undefined,
    rsvpDeadline: '',
    // Hijri date fields
    eventDay: '',
    eventMonth: '',
    eventYear: '1446',
    rsvpDay: '',
    rsvpMonth: '',
    rsvpYear: '1446',
    isPublic: true,
    tags: []
  });

  const [tagInput, setTagInput] = useState('');
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

    if (!formData.date) {
      newErrors.date = ARABIC_LABELS.fieldRequired;
    }

    if (!formData.time) {
      newErrors.time = ARABIC_LABELS.fieldRequired;
    }

    if (!formData.location.trim()) {
      newErrors.location = ARABIC_LABELS.fieldRequired;
    }

    if (formData.maxAttendees && formData.maxAttendees < 1) {
      newErrors.maxAttendees = 'عدد الحضور يجب أن يكون أكبر من صفر';
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

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData((prev: any) => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData((prev: any) => ({
      ...prev,
      tags: prev.tags.filter((tag: any) => tag !== tagToRemove)
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
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
    maxWidth: '600px',
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
    margin: 0
  };

  const closeButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '8px',
    transition: 'background 0.2s ease'
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
    gap: '8px',
    marginBottom: '16px'
  };

  const tagContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginTop: '8px'
  };

  const tagStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  };

  const tagInputStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    marginTop: '8px'
  };

  const addButtonStyle: React.CSSProperties = {
    padding: '8px 12px',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '12px',
    cursor: 'pointer',
    fontWeight: '600'
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
          <h2 style={titleStyle}>{ARABIC_LABELS.createOccasion}</h2>
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
          <div style={formGroupStyle}>
            <label style={labelStyle}>
              <CalendarIcon style={{ width: '16px', height: '16px', display: 'inline', marginLeft: '4px' }} />
              {ARABIC_LABELS.name} *
            </label>
            <input
              type="text"
              style={{
                ...inputStyle,
                borderColor: errors.title ? '#ef4444' : 'rgba(0, 0, 0, 0.2)'
              }}
              value={formData.title}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, title: e.target.value }))}
              placeholder="اسم المناسبة"
            />
            {errors.title && <div style={errorStyle}>{errors.title}</div>}
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>
              {ARABIC_LABELS.description} *
            </label>
            <textarea
              style={{
                ...textareaStyle,
                borderColor: errors.description ? '#ef4444' : 'rgba(0, 0, 0, 0.2)'
              }}
              value={formData.description}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, description: e.target.value }))}
              placeholder="وصف المناسبة وتفاصيلها"
            />
            {errors.description && <div style={errorStyle}>{errors.description}</div>}
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>
              <TagIcon style={{ width: '16px', height: '16px', display: 'inline', marginLeft: '4px' }} />
              {ARABIC_LABELS.occasionType} *
            </label>
            <select
              style={selectStyle}
              value={formData.type}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, type: e.target.value as OccasionType }))}
            >
              {occasionTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>
                <CalendarIcon style={{ width: '16px', height: '16px', display: 'inline', marginLeft: '4px' }} />
                التاريخ (هجري) *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <select
                  style={{
                    ...inputStyle,
                    borderColor: errors.date ? '#ef4444' : 'rgba(0, 0, 0, 0.2)'
                  }}
                  value={formData.eventDay || ''}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, eventDay: e.target.value }))}
                >
                  <option value="">اليوم</option>
                  {Array.from({ length: 30 }, (_, i) => (
                    <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                      {i + 1}
                    </option>
                  ))}
                </select>
                <select
                  style={{
                    ...inputStyle,
                    borderColor: errors.date ? '#ef4444' : 'rgba(0, 0, 0, 0.2)'
                  }}
                  value={formData.eventMonth || ''}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, eventMonth: e.target.value }))}
                >
                  <option value="">الشهر</option>
                  <option value="01">محرم</option>
                  <option value="02">صفر</option>
                  <option value="03">ربيع الأول</option>
                  <option value="04">ربيع الآخر</option>
                  <option value="05">جمادى الأولى</option>
                  <option value="06">جمادى الآخرة</option>
                  <option value="07">رجب</option>
                  <option value="08">شعبان</option>
                  <option value="09">رمضان</option>
                  <option value="10">شوال</option>
                  <option value="11">ذو القعدة</option>
                  <option value="12">ذو الحجة</option>
                </select>
                <select
                  style={{
                    ...inputStyle,
                    borderColor: errors.date ? '#ef4444' : 'rgba(0, 0, 0, 0.2)'
                  }}
                  value={formData.eventYear || '1446'}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, eventYear: e.target.value }))}
                >
                  <option value="">السنة</option>
                  {Array.from({ length: 6 }, (_, i) => (
                    <option key={i} value={String(1445 + i)}>
                      {1445 + i} هـ
                    </option>
                  ))}
                </select>
              </div>
              {errors.date && <div style={errorStyle}>{errors.date}</div>}
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>
                <ClockIcon style={{ width: '16px', height: '16px', display: 'inline', marginLeft: '4px' }} />
                {ARABIC_LABELS.occasionTime} *
              </label>
              <input
                type="time"
                style={{
                  ...inputStyle,
                  borderColor: errors.time ? '#ef4444' : 'rgba(0, 0, 0, 0.2)'
                }}
                value={formData.time}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, time: e.target.value }))}
              />
              {errors.time && <div style={errorStyle}>{errors.time}</div>}
            </div>
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>
              <MapPinIcon style={{ width: '16px', height: '16px', display: 'inline', marginLeft: '4px' }} />
              {ARABIC_LABELS.occasionLocation} *
            </label>
            <input
              type="text"
              style={{
                ...inputStyle,
                borderColor: errors.location ? '#ef4444' : 'rgba(0, 0, 0, 0.2)'
              }}
              value={formData.location}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, location: e.target.value }))}
              placeholder="مكان إقامة المناسبة"
            />
            {errors.location && <div style={errorStyle}>{errors.location}</div>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>
                <UsersIcon style={{ width: '16px', height: '16px', display: 'inline', marginLeft: '4px' }} />
                الحد الأقصى للحضور
              </label>
              <input
                type="number"
                style={{
                  ...inputStyle,
                  borderColor: errors.maxAttendees ? '#ef4444' : 'rgba(0, 0, 0, 0.2)'
                }}
                value={formData.maxAttendees || ''}
                onChange={(e) => setFormData((prev: any) => ({
                  ...prev,
                  maxAttendees: e.target.value ? parseInt(e.target.value) : undefined
                }))}
                placeholder="غير محدود"
                min="1"
              />
              {errors.maxAttendees && <div style={errorStyle}>{errors.maxAttendees}</div>}
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>
                آخر موعد للتأكيد (هجري)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <select
                  style={inputStyle}
                  value={formData.rsvpDay || ''}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, rsvpDay: e.target.value }))}
                >
                  <option value="" style={{ backgroundColor: 'white', color: '#374151' }}>اليوم</option>
                  {Array.from({ length: 30 }, (_, i) => (
                    <option key={i + 1} value={String(i + 1).padStart(2, '0')} style={{ backgroundColor: 'white', color: '#1e40af' }}>
                      {i + 1}
                    </option>
                  ))}
                </select>
                <select
                  style={inputStyle}
                  value={formData.rsvpMonth || ''}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, rsvpMonth: e.target.value }))}
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
                  style={inputStyle}
                  value={formData.rsvpYear || '1446'}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, rsvpYear: e.target.value }))}
                >
                  <option value="" style={{ backgroundColor: 'white', color: '#374151' }}>السنة</option>
                  {Array.from({ length: 6 }, (_, i) => (
                    <option key={i} value={String(1445 + i)} style={{ backgroundColor: 'white', color: '#1e40af' }}>
                      {1445 + i} هـ
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div style={checkboxContainerStyle}>
            <input
              type="checkbox"
              id="isPublic"
              checked={formData.isPublic}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, isPublic: e.target.checked }))}
              style={{ width: '16px', height: '16px' }}
            />
            <label htmlFor="isPublic" style={{ fontSize: '14px', color: '#374151', cursor: 'pointer' }}>
              {formData.isPublic ? (
                <>
                  <GlobeAltIcon style={{ width: '16px', height: '16px', display: 'inline', marginLeft: '4px' }} />
                  مناسبة عامة
                </>
              ) : (
                <>
                  <LockClosedIcon style={{ width: '16px', height: '16px', display: 'inline', marginLeft: '4px' }} />
                  مناسبة خاصة
                </>
              )}
            </label>
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>العلامات</label>
            <div style={tagInputStyle}>
              <input
                type="text"
                style={{ ...inputStyle, flex: 1 }}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="أضف علامة جديدة"
              />
              <button
                type="button"
                style={addButtonStyle}
                onClick={handleAddTag}
              >
                إضافة
              </button>
            </div>
            {formData.tags.length > 0 && (
              <div style={tagContainerStyle}>
                {formData.tags.map((tag: any, index: any) => (
                  <span key={index} style={tagStyle}>
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        padding: '0',
                        marginRight: '4px'
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
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

export default memo(CreateOccasionModal);