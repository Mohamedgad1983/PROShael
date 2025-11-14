import React, { memo,  useState } from 'react';
import {
  XMarkIcon,
  LightBulbIcon,
  CalendarIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  UsersIcon,
  TagIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { ARABIC_LABELS, CURRENCY } from '../../constants/arabic';

interface CreateInitiativeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading?: boolean;
}

const initiativeTypes = [
  { value: 'educational', label: 'تعليمية' },
  { value: 'social', label: 'اجتماعية' },
  { value: 'charitable', label: 'خيرية' },
  { value: 'cultural', label: 'ثقافية' },
  { value: 'environmental', label: 'بيئية' },
  { value: 'health', label: 'صحية' },
  { value: 'economic', label: 'اقتصادية' }
];

const CreateInitiativeModal: React.FC<CreateInitiativeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false
}) => {
  const [formData, setFormData] = useState({
    title: '',
    type: 'charitable',
    description: '',
    targetAmount: '',
    startDate: '',
    endDate: '',
    location: '',
    maxParticipants: '',
    tags: [] as string[],
    startDay: '',
    startMonth: '',
    startYear: '',
    endDay: '',
    endMonth: '',
    endYear: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tagInput, setTagInput] = useState('');

  // Hijri months
  const hijriMonths = [
    { value: '01', label: 'محرم' },
    { value: '02', label: 'صفر' },
    { value: '03', label: 'ربيع الأول' },
    { value: '04', label: 'ربيع الآخر' },
    { value: '05', label: 'جمادى الأولى' },
    { value: '06', label: 'جمادى الآخرة' },
    { value: '07', label: 'رجب' },
    { value: '08', label: 'شعبان' },
    { value: '09', label: 'رمضان' },
    { value: '10', label: 'شوال' },
    { value: '11', label: 'ذو القعدة' },
    { value: '12', label: 'ذو الحجة' }
  ];

  // Generate days (1-30)
  const days = Array.from({ length: 30 }, (_, i) => ({
    value: String(i + 1).padStart(2, '0'),
    label: String(i + 1)
  }));

  // Generate years (1445-1450)
  const currentHijriYear = 1446;
  const years = Array.from({ length: 10 }, (_, i) => ({
    value: String(currentHijriYear - 2 + i),
    label: String(currentHijriYear - 2 + i)
  }));

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'عنوان المبادرة مطلوب';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'وصف المبادرة مطلوب';
    }

    if (!formData.targetAmount || parseFloat(formData.targetAmount) <= 0) {
      newErrors.targetAmount = 'المبلغ المستهدف مطلوب';
    }

    if (!formData.startDay || !formData.startMonth || !formData.startYear) {
      newErrors.startDate = 'تاريخ البداية مطلوب';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Combine date parts
    const startDate = `${formData.startDay}/${formData.startMonth}/${formData.startYear}`;
    const endDate = formData.endDay && formData.endMonth && formData.endYear
      ? `${formData.endDay}/${formData.endMonth}/${formData.endYear}`
      : '';

    onSubmit({
      ...formData,
      startDate,
      endDate
    });
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      handleChange('tags', [...formData.tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (index: number) => {
    handleChange('tags', formData.tags.filter((_, i) => i !== index));
  };

  // Styles
  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)'
  };

  const modalStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '16px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    animation: 'slideUp 0.3s ease-out'
  };

  const headerStyle: React.CSSProperties = {
    padding: '24px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#111827',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: 0
  };

  const closeButtonStyle: React.CSSProperties = {
    padding: '8px',
    borderRadius: '8px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    transition: 'background 0.2s'
  };

  const bodyStyle: React.CSSProperties = {
    padding: '24px'
  };

  const formGroupStyle: React.CSSProperties = {
    marginBottom: '20px'
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151'
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    transition: 'border-color 0.2s',
    outline: 'none'
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: '100px',
    resize: 'vertical'
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
    backgroundColor: 'white',
    color: '#1e40af'
  };

  const errorStyle: React.CSSProperties = {
    color: '#dc2626',
    fontSize: '12px',
    marginTop: '4px'
  };

  const tagContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '8px'
  };

  const tagStyle: React.CSSProperties = {
    backgroundColor: '#f3f4f6',
    padding: '4px 12px',
    borderRadius: '16px',
    fontSize: '12px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px'
  };

  const submitButtonStyle: React.CSSProperties = {
    padding: '12px 24px',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    width: '100%'
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>
            <LightBulbIcon style={{ width: '28px', height: '28px', color: '#667eea' }} />
            إضافة مبادرة جديدة
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

        <form onSubmit={handleSubmit} style={bodyStyle}>
          <div style={formGroupStyle}>
            <label style={labelStyle}>عنوان المبادرة</label>
            <input
              type="text"
              style={inputStyle}
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="أدخل عنوان المبادرة"
            />
            {errors.title && <div style={errorStyle}>{errors.title}</div>}
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>نوع المبادرة</label>
            <select
              style={selectStyle}
              value={formData.type}
              onChange={(e) => handleChange('type', e.target.value)}
            >
              {initiativeTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>وصف المبادرة</label>
            <textarea
              style={textareaStyle}
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="أدخل وصف تفصيلي للمبادرة"
            />
            {errors.description && <div style={errorStyle}>{errors.description}</div>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>{`المبلغ المستهدف (${CURRENCY})`}</label>
              <input
                type="number"
                style={inputStyle}
                value={formData.targetAmount}
                onChange={(e) => handleChange('targetAmount', e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
              {errors.targetAmount && <div style={errorStyle}>{errors.targetAmount}</div>}
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>العدد الأقصى للمشاركين</label>
              <input
                type="number"
                style={inputStyle}
                value={formData.maxParticipants}
                onChange={(e) => handleChange('maxParticipants', e.target.value)}
                placeholder="غير محدود"
                min="1"
              />
            </div>
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>تاريخ البداية (هجري)</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1.5fr', gap: '8px' }}>
              <select
                style={selectStyle}
                value={formData.startDay}
                onChange={(e) => handleChange('startDay', e.target.value)}
              >
                <option value="" style={{ backgroundColor: 'white', color: '#374151' }}>اليوم</option>
                {days.map(day => (
                  <option key={day.value} value={day.value} style={{ backgroundColor: 'white', color: '#1e40af' }}>
                    {day.label}
                  </option>
                ))}
              </select>
              <select
                style={selectStyle}
                value={formData.startMonth}
                onChange={(e) => handleChange('startMonth', e.target.value)}
              >
                <option value="" style={{ backgroundColor: 'white', color: '#374151' }}>الشهر</option>
                {hijriMonths.map(month => (
                  <option key={month.value} value={month.value} style={{ backgroundColor: 'white', color: '#1e40af' }}>
                    {month.label}
                  </option>
                ))}
              </select>
              <select
                style={selectStyle}
                value={formData.startYear}
                onChange={(e) => handleChange('startYear', e.target.value)}
              >
                <option value="" style={{ backgroundColor: 'white', color: '#374151' }}>السنة</option>
                {years.map(year => (
                  <option key={year.value} value={year.value} style={{ backgroundColor: 'white', color: '#1e40af' }}>
                    {year.label} هـ
                  </option>
                ))}
              </select>
            </div>
            {errors.startDate && <div style={errorStyle}>{errors.startDate}</div>}
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>تاريخ النهاية (هجري - اختياري)</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1.5fr', gap: '8px' }}>
              <select
                style={selectStyle}
                value={formData.endDay}
                onChange={(e) => handleChange('endDay', e.target.value)}
              >
                <option value="" style={{ backgroundColor: 'white', color: '#374151' }}>اليوم</option>
                {days.map(day => (
                  <option key={day.value} value={day.value} style={{ backgroundColor: 'white', color: '#1e40af' }}>
                    {day.label}
                  </option>
                ))}
              </select>
              <select
                style={selectStyle}
                value={formData.endMonth}
                onChange={(e) => handleChange('endMonth', e.target.value)}
              >
                <option value="" style={{ backgroundColor: 'white', color: '#374151' }}>الشهر</option>
                {hijriMonths.map(month => (
                  <option key={month.value} value={month.value} style={{ backgroundColor: 'white', color: '#1e40af' }}>
                    {month.label}
                  </option>
                ))}
              </select>
              <select
                style={selectStyle}
                value={formData.endYear}
                onChange={(e) => handleChange('endYear', e.target.value)}
              >
                <option value="" style={{ backgroundColor: 'white', color: '#374151' }}>السنة</option>
                {years.map(year => (
                  <option key={year.value} value={year.value} style={{ backgroundColor: 'white', color: '#1e40af' }}>
                    {year.label} هـ
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>الموقع</label>
            <input
              type="text"
              style={inputStyle}
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value)}
              placeholder="أدخل موقع المبادرة"
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>الوسوم</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                style={{ ...inputStyle, flex: 1 }}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="أدخل وسم وانقر على إضافة"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <button
                type="button"
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
                onClick={handleAddTag}
              >
                إضافة
              </button>
            </div>
            {formData.tags.length > 0 && (
              <div style={tagContainerStyle}>
                {formData.tags.map((tag, index) => (
                  <span key={index} style={tagStyle}>
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(index)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        marginLeft: '4px'
                      }}
                    >
                      <XMarkIcon style={{ width: '14px', height: '14px' }} />
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
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#e5e7eb';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f3f4f6';
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

export default memo(CreateInitiativeModal);