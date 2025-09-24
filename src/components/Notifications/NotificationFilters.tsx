import React from 'react';
import {
  FunnelIcon,
  XMarkIcon,
  CalendarIcon,
  TagIcon,
  EyeSlashIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import {
  NotificationFilters as INotificationFilters,
  NotificationType,
  NotificationPriority,
  NotificationStatus,
  RecipientType
} from './types';
import { ARABIC_LABELS } from '../../constants/arabic';

interface NotificationFiltersProps {
  filters: INotificationFilters;
  onFiltersChange: (filters: INotificationFilters) => void;
  onClearFilters: () => void;
  className?: string;
}

const typeOptions: { value: NotificationType; label: string }[] = [
  { value: 'general', label: ARABIC_LABELS.general },
  { value: 'urgent', label: ARABIC_LABELS.urgent },
  { value: 'reminder', label: ARABIC_LABELS.reminder },
  { value: 'announcement', label: ARABIC_LABELS.announcement },
  { value: 'invitation', label: 'دعوة' },
  { value: 'payment', label: 'دفع' },
  { value: 'system', label: 'نظام' },
  { value: 'welcome', label: 'ترحيب' }
];

const priorityOptions: { value: NotificationPriority; label: string }[] = [
  { value: 'low', label: ARABIC_LABELS.low },
  { value: 'medium', label: ARABIC_LABELS.medium },
  { value: 'high', label: ARABIC_LABELS.high },
  { value: 'urgent', label: ARABIC_LABELS.urgent }
];

const statusOptions: { value: NotificationStatus; label: string }[] = [
  { value: 'draft', label: 'مسودة' },
  { value: 'scheduled', label: 'مجدول' },
  { value: 'sending', label: 'جاري الإرسال' },
  { value: 'sent', label: 'تم الإرسال' },
  { value: 'failed', label: 'فشل' },
  { value: 'cancelled', label: 'ملغي' }
];

const recipientTypeOptions: { value: RecipientType; label: string }[] = [
  { value: 'all', label: 'الجميع' },
  { value: 'group', label: 'مجموعة' },
  { value: 'role', label: 'دور' },
  { value: 'individual', label: 'أفراد' },
  { value: 'custom', label: 'مخصص' }
];

const NotificationFilters: React.FC<NotificationFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
  className = ''
}) => {
  const updateFilter = (key: keyof INotificationFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const updateDateRange = (field: 'start' | 'end', date: string) => {
    const dateRange = filters.dateRange || { start: new Date(), end: new Date() };
    onFiltersChange({
      ...filters,
      dateRange: {
        ...dateRange,
        [field]: date ? new Date(date) : undefined
      }
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => {
    if (value === undefined || value === '') return false;
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(v => v !== undefined);
    }
    return true;
  });

  const containerStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '16px',
    padding: '20px',
    direction: 'rtl' as const
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1f2937',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  const clearButtonStyle: React.CSSProperties = {
    padding: '6px 12px',
    background: hasActiveFilters ? '#ef4444' : 'rgba(107, 114, 128, 0.1)',
    color: hasActiveFilters ? 'white' : '#6b7280',
    border: 'none',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: hasActiveFilters ? 'pointer' : 'not-allowed',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  };

  const filtersGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '16px'
  };

  const filterGroupStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151'
  };

  const selectStyle: React.CSSProperties = {
    padding: '8px 12px',
    border: '1px solid rgba(0, 0, 0, 0.2)',
    borderRadius: '8px',
    fontSize: '14px',
    background: 'rgba(255, 255, 255, 0.8)',
    cursor: 'pointer',
    outline: 'none'
  };

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px',
    border: '1px solid rgba(0, 0, 0, 0.2)',
    borderRadius: '8px',
    fontSize: '14px',
    background: 'rgba(255, 255, 255, 0.8)',
    outline: 'none',
    direction: 'rtl' as const
  };

  const checkboxGroupStyle: React.CSSProperties = {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    flexWrap: 'wrap'
  };

  const checkboxItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    cursor: 'pointer'
  };

  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    background: 'rgba(102, 126, 234, 0.1)',
    color: '#667eea',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600'
  };

  return (
    <div style={containerStyle} className={className}>
      <div style={headerStyle}>
        <h3 style={titleStyle}>
          <FunnelIcon style={{ width: '20px', height: '20px' }} />
          {ARABIC_LABELS.notificationFilters}
        </h3>
        <button
          style={clearButtonStyle}
          onClick={onClearFilters}
          disabled={!hasActiveFilters}
          onMouseEnter={(e) => {
            if (hasActiveFilters) {
              e.currentTarget.style.background = '#dc2626';
            }
          }}
          onMouseLeave={(e) => {
            if (hasActiveFilters) {
              e.currentTarget.style.background = '#ef4444';
            }
          }}
        >
          <XMarkIcon style={{ width: '14px', height: '14px' }} />
          مسح الفلاتر
        </button>
      </div>

      <div style={filtersGridStyle}>
        <div style={filterGroupStyle}>
          <label style={labelStyle}>نوع الإشعار</label>
          <select
            style={selectStyle}
            value={filters.type || ''}
            onChange={(e) => updateFilter('type', e.target.value || undefined)}
          >
            <option value="">جميع الأنواع</option>
            {typeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div style={filterGroupStyle}>
          <label style={labelStyle}>الأولوية</label>
          <select
            style={selectStyle}
            value={filters.priority || ''}
            onChange={(e) => updateFilter('priority', e.target.value || undefined)}
          >
            <option value="">جميع الأولويات</option>
            {priorityOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div style={filterGroupStyle}>
          <label style={labelStyle}>الحالة</label>
          <select
            style={selectStyle}
            value={filters.status || ''}
            onChange={(e) => updateFilter('status', e.target.value || undefined)}
          >
            <option value="">جميع الحالات</option>
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div style={filterGroupStyle}>
          <label style={labelStyle}>نوع المستقبل</label>
          <select
            style={selectStyle}
            value={filters.recipientType || ''}
            onChange={(e) => updateFilter('recipientType', e.target.value || undefined)}
          >
            <option value="">جميع الأنواع</option>
            {recipientTypeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={filtersGridStyle}>
        <div style={filterGroupStyle}>
          <label style={labelStyle}>
            <CalendarIcon style={{ width: '16px', height: '16px', display: 'inline', marginLeft: '4px' }} />
            من تاريخ
          </label>
          <input
            type="date"
            style={inputStyle}
            value={filters.dateRange?.start ? filters.dateRange.start.toISOString().split('T')[0] : ''}
            onChange={(e) => updateDateRange('start', e.target.value)}
          />
        </div>

        <div style={filterGroupStyle}>
          <label style={labelStyle}>
            <CalendarIcon style={{ width: '16px', height: '16px', display: 'inline', marginLeft: '4px' }} />
            إلى تاريخ
          </label>
          <input
            type="date"
            style={inputStyle}
            value={filters.dateRange?.end ? filters.dateRange.end.toISOString().split('T')[0] : ''}
            onChange={(e) => updateDateRange('end', e.target.value)}
          />
        </div>

        <div style={filterGroupStyle}>
          <label style={labelStyle}>
            <TagIcon style={{ width: '16px', height: '16px', display: 'inline', marginLeft: '4px' }} />
            البحث
          </label>
          <input
            type="text"
            style={inputStyle}
            value={filters.search || ''}
            onChange={(e) => updateFilter('search', e.target.value || undefined)}
            placeholder="البحث في العنوان أو المحتوى..."
          />
        </div>
      </div>

      <div style={checkboxGroupStyle}>
        <div
          style={checkboxItemStyle}
          onClick={() => updateFilter('unreadOnly', !filters.unreadOnly)}
        >
          <input
            type="checkbox"
            checked={filters.unreadOnly || false}
            onChange={() => {}}
            style={{ width: '16px', height: '16px' }}
          />
          <EyeSlashIcon style={{ width: '16px', height: '16px', color: '#6b7280' }} />
          <span>غير مقروء فقط</span>
        </div>
      </div>

      {hasActiveFilters && (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(0, 0, 0, 0.1)' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
            الفلاتر النشطة:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {filters.type && (
              <span style={badgeStyle}>
                النوع: {typeOptions.find(t => t.value === filters.type)?.label}
              </span>
            )}
            {filters.priority && (
              <span style={badgeStyle}>
                الأولوية: {priorityOptions.find(p => p.value === filters.priority)?.label}
              </span>
            )}
            {filters.status && (
              <span style={badgeStyle}>
                الحالة: {statusOptions.find(s => s.value === filters.status)?.label}
              </span>
            )}
            {filters.recipientType && (
              <span style={badgeStyle}>
                المستقبل: {recipientTypeOptions.find(r => r.value === filters.recipientType)?.label}
              </span>
            )}
            {filters.search && (
              <span style={badgeStyle}>
                البحث: "{filters.search}"
              </span>
            )}
            {filters.unreadOnly && (
              <span style={badgeStyle}>
                <EyeSlashIcon style={{ width: '12px', height: '12px' }} />
                غير مقروء فقط
              </span>
            )}
            {filters.dateRange && (filters.dateRange.start || filters.dateRange.end) && (
              <span style={badgeStyle}>
                <CalendarIcon style={{ width: '12px', height: '12px' }} />
                فترة زمنية
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationFilters;