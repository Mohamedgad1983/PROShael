import React, { useState } from 'react';
import {
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
  CalendarIcon,
  UsersIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  SpeakerWaveIcon,
  EnvelopeIcon,
  BellIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeSlashIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import {
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationStatus
} from './types';
import { ARABIC_LABELS } from '../../constants/arabic';

interface NotificationsListProps {
  notifications: Notification[];
  onView: (notification: Notification) => void;
  onEdit: (notification: Notification) => void;
  onDelete: (notification: Notification) => void;
  onMarkAsRead?: (notificationId: string) => void;
  loading?: boolean;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

const NotificationsList: React.FC<NotificationsListProps> = ({
  notifications,
  onView,
  onEdit,
  onDelete,
  onMarkAsRead,
  loading = false,
  currentPage = 1,
  totalPages = 1,
  onPageChange
}) => {
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'urgent': return ExclamationTriangleIcon;
      case 'reminder': return ClockIcon;
      case 'announcement': return SpeakerWaveIcon;
      case 'invitation': return EnvelopeIcon;
      case 'payment': return BellIcon;
      case 'system': return InformationCircleIcon;
      case 'welcome': return SpeakerWaveIcon;
      default: return InformationCircleIcon;
    }
  };

  const getTypeColor = (type: NotificationType): string => {
    switch (type) {
      case 'urgent': return '#ef4444';
      case 'reminder': return '#f59e0b';
      case 'announcement': return '#3b82f6';
      case 'invitation': return '#8b5cf6';
      case 'payment': return '#10b981';
      case 'system': return '#6b7280';
      case 'welcome': return '#f97316';
      default: return '#6b7280';
    }
  };

  const getTypeLabel = (type: NotificationType): string => {
    switch (type) {
      case 'general': return ARABIC_LABELS.general;
      case 'urgent': return ARABIC_LABELS.urgent;
      case 'reminder': return ARABIC_LABELS.reminder;
      case 'announcement': return ARABIC_LABELS.announcement;
      case 'invitation': return 'دعوة';
      case 'payment': return 'دفع';
      case 'system': return 'نظام';
      case 'welcome': return 'ترحيب';
      default: return type;
    }
  };

  const getPriorityColor = (priority: NotificationPriority): string => {
    switch (priority) {
      case 'urgent': return '#dc2626';
      case 'high': return '#f59e0b';
      case 'medium': return '#3b82f6';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getPriorityLabel = (priority: NotificationPriority): string => {
    switch (priority) {
      case 'urgent': return ARABIC_LABELS.urgent;
      case 'high': return ARABIC_LABELS.high;
      case 'medium': return ARABIC_LABELS.medium;
      case 'low': return ARABIC_LABELS.low;
      default: return priority;
    }
  };

  const getStatusColor = (status: NotificationStatus): string => {
    switch (status) {
      case 'sent': return '#10b981';
      case 'scheduled': return '#3b82f6';
      case 'sending': return '#f59e0b';
      case 'failed': return '#ef4444';
      case 'cancelled': return '#6b7280';
      case 'draft': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const getStatusLabel = (status: NotificationStatus): string => {
    switch (status) {
      case 'draft': return 'مسودة';
      case 'scheduled': return 'مجدول';
      case 'sending': return 'جاري الإرسال';
      case 'sent': return 'تم الإرسال';
      case 'failed': return 'فشل';
      case 'cancelled': return 'ملغي';
      default: return status;
    }
  };

  const getRecipientTypeLabel = (type: string): string => {
    switch (type) {
      case 'all': return 'الجميع';
      case 'group': return 'مجموعة';
      case 'role': return 'دور';
      case 'individual': return 'أفراد';
      case 'custom': return 'مخصص';
      default: return type;
    }
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const calculateReadRate = (notification: Notification): number => {
    if (notification.totalRecipients === 0) return 0;
    return Math.round((notification.readCount / notification.totalRecipients) * 100);
  };

  const handleSelectAll = () => {
    if (selectedNotifications.length === notifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(notifications.map(n => n.id));
    }
  };

  const handleSelectNotification = (notificationId: string) => {
    setSelectedNotifications(prev =>
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  const containerStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    direction: 'rtl' as const
  };

  const headerStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.6)',
    padding: '16px 20px',
    borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1f2937',
    margin: 0
  };

  const bulkActionsStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  };

  const actionButtonStyle: React.CSSProperties = {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  };

  const notificationItemStyle: React.CSSProperties = {
    padding: '20px',
    borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
    transition: 'all 0.2s ease',
    background: 'rgba(255, 255, 255, 0.3)'
  };

  const notificationHeaderStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px'
  };

  const notificationTitleStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '4px',
    lineHeight: '1.4'
  };

  const notificationMetaStyle: React.CSSProperties = {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '8px',
    flexWrap: 'wrap'
  };

  const badgeStyle: React.CSSProperties = {
    padding: '2px 6px',
    borderRadius: '8px',
    fontSize: '10px',
    fontWeight: '600',
    color: 'white',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2px'
  };

  const actionsStyle: React.CSSProperties = {
    display: 'flex',
    gap: '4px',
    alignItems: 'center'
  };

  const iconButtonStyle: React.CSSProperties = {
    padding: '6px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const paginationStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
    padding: '16px',
    background: 'rgba(255, 255, 255, 0.6)',
    borderTop: '1px solid rgba(0, 0, 0, 0.1)'
  };

  const pageButtonStyle: React.CSSProperties = {
    padding: '8px 12px',
    border: '1px solid rgba(0, 0, 0, 0.2)',
    borderRadius: '6px',
    background: 'rgba(255, 255, 255, 0.8)',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease'
  };

  const activePageStyle: React.CSSProperties = {
    ...pageButtonStyle,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none'
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={{ padding: '40px', textAlign: 'center' as const, color: '#6b7280' }}>
          جاري التحميل...
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h3 style={titleStyle}>
          الإشعارات ({notifications.length})
        </h3>

        {selectedNotifications.length > 0 && (
          <div style={bulkActionsStyle}>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>
              {selectedNotifications.length} محدد
            </span>
            {onMarkAsRead && (
              <button
                style={{
                  ...actionButtonStyle,
                  background: '#10b981',
                  color: 'white'
                }}
                onClick={() => {
                  selectedNotifications.forEach(id => onMarkAsRead(id));
                  setSelectedNotifications([]);
                }}
              >
                <CheckCircleIcon style={{ width: '14px', height: '14px', marginLeft: '4px' }} />
                تحديد كمقروء
              </button>
            )}
            <button
              style={{
                ...actionButtonStyle,
                background: '#ef4444',
                color: 'white'
              }}
              onClick={() => {
                selectedNotifications.forEach(id => {
                  const notification = notifications.find(n => n.id === id);
                  if (notification) onDelete(notification);
                });
                setSelectedNotifications([]);
              }}
            >
              <TrashIcon style={{ width: '14px', height: '14px', marginLeft: '4px' }} />
              حذف
            </button>
          </div>
        )}
      </div>

      {notifications.length > 0 && (
        <div style={{
          padding: '12px 20px',
          background: 'rgba(255, 255, 255, 0.4)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <input
            type="checkbox"
            checked={selectedNotifications.length === notifications.length}
            onChange={handleSelectAll}
            style={{ width: '16px', height: '16px' }}
          />
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
            تحديد الكل
          </span>
        </div>
      )}

      <div>
        {notifications.length > 0 ? (
          notifications.map((notification) => {
            const TypeIcon = getTypeIcon(notification.type);
            const typeColor = getTypeColor(notification.type);
            const priorityColor = getPriorityColor(notification.priority);
            const statusColor = getStatusColor(notification.status);
            const readRate = calculateReadRate(notification);

            return (
              <div
                key={notification.id}
                style={notificationItemStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                }}
              >
                <div style={notificationHeaderStyle}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <input
                        type="checkbox"
                        checked={selectedNotifications.includes(notification.id)}
                        onChange={() => handleSelectNotification(notification.id)}
                        style={{ width: '16px', height: '16px', marginTop: '2px' }}
                      />

                      <div style={{ flex: 1 }}>
                        <h4 style={notificationTitleStyle}>
                          {notification.title}
                        </h4>

                        <div style={notificationMetaStyle}>
                          <span style={{
                            ...badgeStyle,
                            background: typeColor
                          }}>
                            <TypeIcon style={{ width: '12px', height: '12px' }} />
                            {getTypeLabel(notification.type)}
                          </span>

                          <span style={{
                            ...badgeStyle,
                            background: priorityColor
                          }}>
                            {getPriorityLabel(notification.priority)}
                          </span>

                          <span style={{
                            ...badgeStyle,
                            background: statusColor
                          }}>
                            {getStatusLabel(notification.status)}
                          </span>

                          <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <UsersIcon style={{ width: '12px', height: '12px' }} />
                            {getRecipientTypeLabel(notification.recipientType)}
                          </span>

                          <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <CalendarIcon style={{ width: '12px', height: '12px' }} />
                            {notification.sentDate ? formatDate(notification.sentDate) :
                             notification.scheduledDate ? `مجدول: ${formatDate(notification.scheduledDate)}` :
                             formatDate(notification.createdDate)}
                          </span>
                        </div>

                        <p style={{
                          fontSize: '14px',
                          color: '#6b7280',
                          lineHeight: '1.5',
                          margin: '0 0 12px 0'
                        }}>
                          {notification.message.length > 150
                            ? `${notification.message.substring(0, 150)}...`
                            : notification.message}
                        </p>

                        <div style={{
                          display: 'flex',
                          gap: '16px',
                          alignItems: 'center',
                          fontSize: '12px',
                          color: '#6b7280'
                        }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <UsersIcon style={{ width: '14px', height: '14px' }} />
                            {notification.totalRecipients} مستقبل
                          </span>

                          {notification.status === 'sent' && (
                            <span style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: readRate > 50 ? '#10b981' : '#f59e0b'
                            }}>
                              <EyeSlashIcon style={{ width: '14px', height: '14px' }} />
                              {notification.readCount} قرأوا ({readRate}%)
                            </span>
                          )}

                          <span>بواسطة: {notification.senderName}</span>

                          {notification.tags.length > 0 && (
                            <span>
                              العلامات: {notification.tags.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={actionsStyle}>
                    <button
                      style={{
                        ...iconButtonStyle,
                        background: 'rgba(59, 130, 246, 0.1)',
                        color: '#3b82f6'
                      }}
                      onClick={() => onView(notification)}
                      title="عرض التفاصيل"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                      }}
                    >
                      <EyeIcon style={{ width: '16px', height: '16px' }} />
                    </button>

                    {notification.status === 'draft' && (
                      <button
                        style={{
                          ...iconButtonStyle,
                          background: 'rgba(16, 185, 129, 0.1)',
                          color: '#10b981'
                        }}
                        onClick={() => onEdit(notification)}
                        title="تعديل"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
                        }}
                      >
                        <PencilSquareIcon style={{ width: '16px', height: '16px' }} />
                      </button>
                    )}

                    <button
                      style={{
                        ...iconButtonStyle,
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444'
                      }}
                      onClick={() => onDelete(notification)}
                      title="حذف"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                      }}
                    >
                      <TrashIcon style={{ width: '16px', height: '16px' }} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{
            padding: '40px',
            textAlign: 'center' as const,
            color: '#6b7280'
          }}>
            <BellIcon style={{ width: '48px', height: '48px', margin: '0 auto 16px', opacity: 0.5 }} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>لا توجد إشعارات</h3>
            <p style={{ margin: 0, fontSize: '14px' }}>
              لم يتم إنشاء أي إشعارات بعد
            </p>
          </div>
        )}
      </div>

      {totalPages > 1 && onPageChange && (
        <div style={paginationStyle}>
          <button
            style={{
              ...pageButtonStyle,
              opacity: currentPage === 1 ? 0.5 : 1,
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
            }}
            onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronRightIcon style={{ width: '16px', height: '16px' }} />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              style={page === currentPage ? activePageStyle : pageButtonStyle}
              onClick={() => onPageChange(page)}
            >
              {page}
            </button>
          ))}

          <button
            style={{
              ...pageButtonStyle,
              opacity: currentPage === totalPages ? 0.5 : 1,
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
            }}
            onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronLeftIcon style={{ width: '16px', height: '16px' }} />
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationsList;