import React, { memo } from 'react';
import {
  ClockIcon,
  MagnifyingGlassIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  DocumentCheckIcon,
  XCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { DiyaStatus as IDiyaStatus, DiyaPriority } from './types';
import { ARABIC_LABELS } from '../../constants/arabic';

interface DiyaStatusProps {
  status: IDiyaStatus;
  priority: DiyaPriority;
  onStatusChange?: (newStatus: IDiyaStatus) => void;
  isEditable?: boolean;
}

const getStatusConfig = (status: IDiyaStatus) => {
  switch (status) {
    case 'reported':
      return {
        label: 'مُبلغ عنه',
        icon: ExclamationCircleIcon,
        color: '#f59e0b',
        bgColor: 'rgba(245, 158, 11, 0.1)',
        description: 'تم تسجيل القضية ولم تبدأ المراجعة'
      };
    case 'investigating':
      return {
        label: ARABIC_LABELS.investigating,
        icon: MagnifyingGlassIcon,
        color: '#3b82f6',
        bgColor: 'rgba(59, 130, 246, 0.1)',
        description: 'جاري التحقيق وجمع المعلومات'
      };
    case 'mediation':
      return {
        label: 'وساطة',
        icon: ChatBubbleLeftRightIcon,
        color: '#8b5cf6',
        bgColor: 'rgba(139, 92, 246, 0.1)',
        description: 'جاري التوسط بين الأطراف'
      };
    case 'resolved':
      return {
        label: ARABIC_LABELS.resolved,
        icon: CheckCircleIcon,
        color: '#10b981',
        bgColor: 'rgba(16, 185, 129, 0.1)',
        description: 'تم حل القضية والاتفاق على التعويض'
      };
    case 'awaitingPayment':
      return {
        label: ARABIC_LABELS.awaitingPayment,
        icon: CurrencyDollarIcon,
        color: '#f97316',
        bgColor: 'rgba(249, 115, 22, 0.1)',
        description: 'في انتظار دفع التعويض'
      };
    case 'completed':
      return {
        label: ARABIC_LABELS.completed,
        icon: DocumentCheckIcon,
        color: '#059669',
        bgColor: 'rgba(5, 150, 105, 0.1)',
        description: 'تم إنهاء القضية بالكامل'
      };
    case 'cancelled':
      return {
        label: ARABIC_LABELS.cancelled,
        icon: XCircleIcon,
        color: '#ef4444',
        bgColor: 'rgba(239, 68, 68, 0.1)',
        description: 'تم إلغاء القضية'
      };
    case 'appealed':
      return {
        label: 'مستأنف',
        icon: ExclamationCircleIcon,
        color: '#dc2626',
        bgColor: 'rgba(220, 38, 38, 0.1)',
        description: 'تم استئناف القرار'
      };
    default:
      return {
        label: status,
        icon: ClockIcon,
        color: '#6b7280',
        bgColor: 'rgba(107, 114, 128, 0.1)',
        description: 'حالة غير محددة'
      };
  }
};

const getPriorityConfig = (priority: DiyaPriority) => {
  switch (priority) {
    case 'urgent':
      return {
        label: ARABIC_LABELS.urgent,
        color: '#dc2626',
        bgColor: 'rgba(220, 38, 38, 0.1)'
      };
    case 'high':
      return {
        label: ARABIC_LABELS.high,
        color: '#f59e0b',
        bgColor: 'rgba(245, 158, 11, 0.1)'
      };
    case 'medium':
      return {
        label: ARABIC_LABELS.medium,
        color: '#3b82f6',
        bgColor: 'rgba(59, 130, 246, 0.1)'
      };
    case 'low':
      return {
        label: ARABIC_LABELS.low,
        color: '#10b981',
        bgColor: 'rgba(16, 185, 129, 0.1)'
      };
    default:
      return {
        label: priority,
        color: '#6b7280',
        bgColor: 'rgba(107, 114, 128, 0.1)'
      };
  }
};

const getNextStatuses = (currentStatus: IDiyaStatus): IDiyaStatus[] => {
  switch (currentStatus) {
    case 'reported':
      return ['investigating', 'cancelled'];
    case 'investigating':
      return ['mediation', 'resolved', 'cancelled'];
    case 'mediation':
      return ['resolved', 'appealed', 'cancelled'];
    case 'resolved':
      return ['awaitingPayment', 'completed', 'appealed'];
    case 'awaitingPayment':
      return ['completed', 'appealed'];
    case 'completed':
      return ['appealed'];
    case 'cancelled':
      return ['reported'];
    case 'appealed':
      return ['investigating', 'mediation'];
    default:
      return [];
  }
};

const DiyaStatus: React.FC<DiyaStatusProps> = ({
  status,
  priority,
  onStatusChange,
  isEditable = false
}) => {
  const statusConfig = getStatusConfig(status);
  const priorityConfig = getPriorityConfig(priority);
  const nextStatuses = getNextStatuses(status);
  const StatusIcon = statusConfig.icon;

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
    marginBottom: '16px'
  };

  const statusBadgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '600',
    color: statusConfig.color,
    background: statusConfig.bgColor,
    border: `1px solid ${statusConfig.color}20`
  };

  const priorityBadgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    color: priorityConfig.color,
    background: priorityConfig.bgColor
  };

  const descriptionStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '16px',
    lineHeight: '1.5'
  };

  const actionsStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  };

  const actionButtonStyle: React.CSSProperties = {
    padding: '6px 12px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    background: 'rgba(255, 255, 255, 0.8)',
    color: '#374151'
  };

  const timelineStyle: React.CSSProperties = {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid rgba(0, 0, 0, 0.1)'
  };

  const timelineItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '4px'
  };

  const getStatusTimeline = (): Array<{ status: IDiyaStatus; isCompleted: boolean; isCurrent: boolean }> => {
    const allStatuses: IDiyaStatus[] = ['reported', 'investigating', 'mediation', 'resolved', 'awaitingPayment', 'completed'];
    const currentIndex = allStatuses.indexOf(status);

    return allStatuses.map((s, index) => ({
      status: s,
      isCompleted: index < currentIndex,
      isCurrent: index === currentIndex
    }));
  };

  const timeline = getStatusTimeline();

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={statusBadgeStyle}>
          <StatusIcon style={{ width: '20px', height: '20px' }} />
          {statusConfig.label}
        </div>
        <div style={priorityBadgeStyle}>
          {priorityConfig.label}
        </div>
      </div>

      <div style={descriptionStyle}>
        {statusConfig.description}
      </div>

      {isEditable && nextStatuses.length > 0 && onStatusChange && (
        <div>
          <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
            تحديث الحالة:
          </div>
          <div style={actionsStyle}>
            {nextStatuses.map((nextStatus) => {
              const nextConfig = getStatusConfig(nextStatus);
              return (
                <button
                  key={nextStatus}
                  style={{
                    ...actionButtonStyle,
                    color: nextConfig.color,
                    background: nextConfig.bgColor
                  }}
                  onClick={() => onStatusChange(nextStatus)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = nextConfig.color;
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = nextConfig.bgColor;
                    e.currentTarget.style.color = nextConfig.color;
                  }}
                >
                  {nextConfig.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div style={timelineStyle}>
        <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
          مراحل القضية:
        </div>
        {timeline.map((item, index) => {
          const itemConfig = getStatusConfig(item.status);
          const ItemIcon = itemConfig.icon;

          return (
            <div
              key={item.status}
              style={{
                ...timelineItemStyle,
                color: item.isCurrent ? itemConfig.color : item.isCompleted ? '#10b981' : '#d1d5db',
                fontWeight: item.isCurrent ? '600' : '400'
              }}
            >
              <ItemIcon style={{
                width: '16px',
                height: '16px',
                color: item.isCurrent ? itemConfig.color : item.isCompleted ? '#10b981' : '#d1d5db'
              }} />
              <span>{itemConfig.label}</span>
              {item.isCurrent && (
                <span style={{
                  background: itemConfig.color,
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '8px',
                  fontSize: '10px',
                  fontWeight: '600'
                }}>
                  الحالية
                </span>
              )}
              {item.isCompleted && (
                <CheckCircleIcon style={{ width: '14px', height: '14px', color: '#10b981' }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default memo(DiyaStatus);