import React, { useState } from 'react';
import {
  XMarkIcon,
  BellIcon,
  CalendarIcon,
  ClockIcon,
  UsersIcon,
  TagIcon,
  PaperClipIcon,
  ExclamationTriangleIcon,
  SpeakerWaveIcon,
  InformationCircleIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import {
  NotificationFormData,
  NotificationType,
  NotificationPriority,
  RecipientType,
  GroupInfo,
  RoleInfo
} from './types';
import { ARABIC_LABELS } from '../../constants/arabic';

interface CreateNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: NotificationFormData) => void;
  isLoading?: boolean;
  groups?: GroupInfo[];
  roles?: RoleInfo[];
  members?: Array<{ id: string; name: string; email?: string }>;
}

const notificationTypes: { value: NotificationType; label: string; icon: React.ComponentType<any>; color: string }[] = [
  { value: 'general', label: ARABIC_LABELS.general, icon: InformationCircleIcon, color: '#6b7280' },
  { value: 'urgent', label: ARABIC_LABELS.urgent, icon: ExclamationTriangleIcon, color: '#ef4444' },
  { value: 'reminder', label: ARABIC_LABELS.reminder, icon: ClockIcon, color: '#f59e0b' },
  { value: 'announcement', label: ARABIC_LABELS.announcement, icon: SpeakerWaveIcon, color: '#3b82f6' },
  { value: 'invitation', label: 'دعوة', icon: EnvelopeIcon, color: '#8b5cf6' },
  { value: 'payment', label: 'دفع', icon: BellIcon, color: '#10b981' },
  { value: 'system', label: 'نظام', icon: InformationCircleIcon, color: '#6b7280' },
  { value: 'welcome', label: 'ترحيب', icon: SpeakerWaveIcon, color: '#f97316' }
];

const priorities: { value: NotificationPriority; label: string; color: string }[] = [
  { value: 'low', label: ARABIC_LABELS.low, color: '#10b981' },
  { value: 'medium', label: ARABIC_LABELS.medium, color: '#3b82f6' },
  { value: 'high', label: ARABIC_LABELS.high, color: '#f59e0b' },
  { value: 'urgent', label: ARABIC_LABELS.urgent, color: '#ef4444' }
];

const recipientTypes: { value: RecipientType; label: string; description: string }[] = [
  { value: 'all', label: ARABIC_LABELS.sendToAll, description: 'إرسال لجميع الأعضاء' },
  { value: 'group', label: ARABIC_LABELS.sendToGroup, description: 'إرسال لمجموعة محددة' },
  { value: 'role', label: 'حسب الدور', description: 'إرسال حسب دور المستخدم' },
  { value: 'individual', label: 'أفراد محددين', description: 'اختيار أعضاء محددين' },
  { value: 'custom', label: 'مخصص', description: 'تحديد معايير مخصصة' }
];

const CreateNotificationModal: React.FC<CreateNotificationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  groups = [],
  roles = [],
  members = []
}) => {
  const [formData, setFormData] = useState<NotificationFormData>({
    title: '',
    message: '',
    type: 'general',
    priority: 'medium',
    recipientType: 'all',
    selectedRecipients: [],
    selectedGroups: [],
    selectedRoles: [],
    scheduledDate: '',
    scheduledTime: '',
    tags: [],
    attachments: []
  });

  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewMode, setPreviewMode] = useState(false);

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = ARABIC_LABELS.fieldRequired;
    }

    if (!formData.message.trim()) {
      newErrors.message = ARABIC_LABELS.fieldRequired;
    }

    if (formData.recipientType === 'group' && formData.selectedGroups?.length === 0) {
      newErrors.recipients = 'يجب اختيار مجموعة واحدة على الأقل';
    }

    if (formData.recipientType === 'role' && formData.selectedRoles?.length === 0) {
      newErrors.recipients = 'يجب اختيار دور واحد على الأقل';
    }

    if (formData.recipientType === 'individual' && formData.selectedRecipients.length === 0) {
      newErrors.recipients = 'يجب اختيار عضو واحد على الأقل';
    }

    if (formData.scheduledDate && !formData.scheduledTime) {
      newErrors.scheduledTime = 'يجب تحديد وقت الإرسال';
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
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const getTypeConfig = (type: NotificationType) => {
    return notificationTypes.find(t => t.value === type) || notificationTypes[0];
  };

  const getPriorityConfig = (priority: NotificationPriority) => {
    return priorities.find(p => p.value === priority) || priorities[0];
  };

  const typeConfig = getTypeConfig(formData.type);
  const priorityConfig = getPriorityConfig(formData.priority);
  const TypeIcon = typeConfig.icon;

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
    minHeight: '100px',
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

  const typeGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '8px',
    marginTop: '8px'
  };

  const typeOptionStyle: React.CSSProperties = {
    padding: '12px 8px',
    border: '1px solid rgba(0, 0, 0, 0.2)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'center' as const,
    fontSize: '12px',
    fontWeight: '600',
    background: 'rgba(255, 255, 255, 0.8)'
  };

  const priorityGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
    marginTop: '8px'
  };

  const recipientGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '8px',
    marginTop: '8px'
  };

  const recipientOptionStyle: React.CSSProperties = {
    padding: '12px',
    border: '1px solid rgba(0, 0, 0, 0.2)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    background: 'rgba(255, 255, 255, 0.8)'
  };

  const previewStyle: React.CSSProperties = {
    background: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '20px'
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

  const toggleButtonStyle: React.CSSProperties = {
    padding: '8px 16px',
    background: 'rgba(59, 130, 246, 0.1)',
    color: '#3b82f6',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '16px'
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>
            <TypeIcon style={{ width: '28px', height: '28px', color: typeConfig.color }} />
            {ARABIC_LABELS.createNotification}
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

        <button
          style={toggleButtonStyle}
          onClick={() => setPreviewMode(!previewMode)}
        >
          {previewMode ? 'وضع التحرير' : 'معاينة الإشعار'}
        </button>

        {previewMode ? (
          <div style={previewStyle}>
            <h4 style={{ margin: '0 0 8px 0', color: typeConfig.color, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TypeIcon style={{ width: '20px', height: '20px' }} />
              {formData.title || 'عنوان الإشعار'}
            </h4>
            <p style={{ margin: '0 0 12px 0', lineHeight: '1.5' }}>
              {formData.message || 'نص الإشعار...'}
            </p>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px', color: '#6b7280' }}>
              <span style={{
                background: priorityConfig.color,
                color: 'white',
                padding: '2px 6px',
                borderRadius: '8px',
                fontSize: '10px'
              }}>
                {priorityConfig.label}
              </span>
              <span>{typeConfig.label}</span>
              {formData.tags.length > 0 && (
                <span>• {formData.tags.join(', ')}</span>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>عنوان الإشعار *</label>
              <input
                type="text"
                style={{
                  ...inputStyle,
                  borderColor: errors.title ? '#ef4444' : 'rgba(0, 0, 0, 0.2)'
                }}
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="عنوان مختصر وواضح للإشعار"
              />
              {errors.title && <div style={errorStyle}>{errors.title}</div>}
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>نص الإشعار *</label>
              <textarea
                style={{
                  ...textareaStyle,
                  borderColor: errors.message ? '#ef4444' : 'rgba(0, 0, 0, 0.2)'
                }}
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                placeholder="المحتوى التفصيلي للإشعار..."
              />
              {errors.message && <div style={errorStyle}>{errors.message}</div>}
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>نوع الإشعار</label>
              <div style={typeGridStyle}>
                {notificationTypes.map((type) => {
                  const Icon = type.icon;
                  const isSelected = formData.type === type.value;
                  return (
                    <div
                      key={type.value}
                      style={{
                        ...typeOptionStyle,
                        background: isSelected ? `${type.color}15` : 'rgba(255, 255, 255, 0.8)',
                        borderColor: isSelected ? type.color : 'rgba(0, 0, 0, 0.2)',
                        color: isSelected ? type.color : '#374151'
                      }}
                      onClick={() => setFormData(prev => ({ ...prev, type: type.value }))}
                    >
                      <Icon style={{ width: '20px', height: '20px', margin: '0 auto 4px' }} />
                      <div>{type.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>الأولوية</label>
              <div style={priorityGridStyle}>
                {priorities.map((priority) => {
                  const isSelected = formData.priority === priority.value;
                  return (
                    <div
                      key={priority.value}
                      style={{
                        ...typeOptionStyle,
                        background: isSelected ? `${priority.color}15` : 'rgba(255, 255, 255, 0.8)',
                        borderColor: isSelected ? priority.color : 'rgba(0, 0, 0, 0.2)',
                        color: isSelected ? priority.color : '#374151'
                      }}
                      onClick={() => setFormData(prev => ({ ...prev, priority: priority.value }))}
                    >
                      {priority.label}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>
                <UsersIcon style={{ width: '16px', height: '16px', display: 'inline', marginLeft: '4px' }} />
                المستقبلون *
              </label>
              <div style={recipientGridStyle}>
                {recipientTypes.map((type) => {
                  const isSelected = formData.recipientType === type.value;
                  return (
                    <div
                      key={type.value}
                      style={{
                        ...recipientOptionStyle,
                        background: isSelected ? 'rgba(102, 126, 234, 0.1)' : 'rgba(255, 255, 255, 0.8)',
                        borderColor: isSelected ? '#667eea' : 'rgba(0, 0, 0, 0.2)'
                      }}
                      onClick={() => setFormData(prev => ({ ...prev, recipientType: type.value }))}
                    >
                      <div style={{ fontWeight: '600', marginBottom: '4px' }}>{type.label}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{type.description}</div>
                    </div>
                  );
                })}
              </div>
              {errors.recipients && <div style={errorStyle}>{errors.recipients}</div>}
            </div>

            {formData.recipientType === 'group' && (
              <div style={formGroupStyle}>
                <label style={labelStyle}>اختيار المجموعات</label>
                <select
                  multiple
                  style={{ ...selectStyle, minHeight: '100px' }}
                  value={formData.selectedGroups}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => option.value);
                    setFormData(prev => ({ ...prev, selectedGroups: values }));
                  }}
                >
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name} ({group.memberCount} عضو)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {formData.recipientType === 'role' && (
              <div style={formGroupStyle}>
                <label style={labelStyle}>اختيار الأدوار</label>
                <select
                  multiple
                  style={{ ...selectStyle, minHeight: '100px' }}
                  value={formData.selectedRoles}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => option.value);
                    setFormData(prev => ({ ...prev, selectedRoles: values }));
                  }}
                >
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>
                      {role.name} ({role.memberCount} عضو)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {formData.recipientType === 'individual' && (
              <div style={formGroupStyle}>
                <label style={labelStyle}>اختيار الأعضاء</label>
                <select
                  multiple
                  style={{ ...selectStyle, minHeight: '150px' }}
                  value={formData.selectedRecipients}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => option.value);
                    setFormData(prev => ({ ...prev, selectedRecipients: values }));
                  }}
                >
                  {members.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.name} {member.email && `(${member.email})`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={formGroupStyle}>
                <label style={labelStyle}>
                  <CalendarIcon style={{ width: '16px', height: '16px', display: 'inline', marginLeft: '4px' }} />
                  تاريخ الإرسال (اختياري)
                </label>
                <input
                  type="date"
                  style={inputStyle}
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                />
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>
                  <ClockIcon style={{ width: '16px', height: '16px', display: 'inline', marginLeft: '4px' }} />
                  وقت الإرسال
                </label>
                <input
                  type="time"
                  style={{
                    ...inputStyle,
                    borderColor: errors.scheduledTime ? '#ef4444' : 'rgba(0, 0, 0, 0.2)'
                  }}
                  value={formData.scheduledTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                />
                {errors.scheduledTime && <div style={errorStyle}>{errors.scheduledTime}</div>}
              </div>
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>
                <TagIcon style={{ width: '16px', height: '16px', display: 'inline', marginLeft: '4px' }} />
                العلامات
              </label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
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
                  style={{
                    padding: '8px 16px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                  onClick={handleAddTag}
                >
                  إضافة
                </button>
              </div>
              {formData.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {formData.tags.map((tag, index) => (
                    <span
                      key={index}
                      style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
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
                          fontSize: '14px'
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              style={submitButtonStyle}
              disabled={isLoading}
            >
              {isLoading ? ARABIC_LABELS.loading :
               formData.scheduledDate ? 'جدولة الإرسال' : 'إرسال الآن'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default CreateNotificationModal;