import React, { memo,  useState, useEffect } from 'react';
import {
  PlusIcon,
  BellIcon,
  ChartBarIcon,
  UsersIcon,
  EyeIcon,
  ClockIcon,
  EnvelopeOpenIcon,
  ExclamationTriangleIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import NotificationsList from './NotificationsList';
import CreateNotificationModal from './CreateNotificationModal';
import NotificationFilters from './NotificationFilters';
import NotificationBadge from './NotificationBadge';
import {
  Notification,
  NotificationFormData,
  NotificationFilters as INotificationFilters,
  NotificationStatistics,
  GroupInfo,
  RoleInfo
} from './types';
import { ARABIC_LABELS } from '../../constants/arabic';
import { formatArabicNumber, formatArabicPercentage, getRelativeTimeArabic } from '../../utils/arabic';
import { useResponsive, getTouchStyles, getResponsiveGridStyles, getResponsiveSpacing } from '../../utils/responsive';
import { useStaggeredAnimation, injectAnimationKeyframes } from '../../utils/animations';

import { logger } from '../../utils/logger';

// Mock data for testing
const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'إشعار عاجل - اجتماع مجلس العائلة',
    message: 'يرجى حضور اجتماع مجلس العائلة الطارئ غداً الساعة 3 عصراً في مكتب الإدارة. سيتم مناقشة أمور مهمة تخص جميع الأعضاء.',
    type: 'urgent',
    priority: 'urgent',
    status: 'sent',
    recipientType: 'all',
    recipients: [],
    senderId: 'admin1',
    senderName: 'إدارة العائلة',
    sentDate: new Date('2024-02-20T10:00:00'),
    readCount: 45,
    totalRecipients: 67,
    tags: ['اجتماع', 'عاجل', 'مجلس'],
    relatedEntity: {
      type: 'occasion',
      id: 'meeting-1',
      title: 'اجتماع مجلس العائلة'
    },
    createdDate: new Date('2024-02-20T09:30:00'),
    updatedDate: new Date('2024-02-20T09:30:00')
  },
  {
    id: '2',
    title: 'تذكير بدفع الاشتراك الشهري',
    message: 'تذكير ودي بأن موعد دفع الاشتراك الشهري يحل خلال 3 أيام. يرجى التكرم بتسديد المبلغ في الوقت المحدد.',
    type: 'reminder',
    priority: 'medium',
    status: 'sent',
    recipientType: 'group',
    recipients: [],
    senderId: 'finance1',
    senderName: 'قسم المالية',
    sentDate: new Date('2024-02-19T14:00:00'),
    readCount: 23,
    totalRecipients: 45,
    tags: ['دفع', 'اشتراك', 'تذكير'],
    relatedEntity: {
      type: 'payment',
      id: 'subscription-feb',
      title: 'اشتراك فبراير'
    },
    createdDate: new Date('2024-02-19T13:45:00'),
    updatedDate: new Date('2024-02-19T13:45:00')
  },
  {
    id: '3',
    title: 'إعلان عن مبادرة خيرية جديدة',
    message: 'بإذن الله تم إطلاق مبادرة خيرية جديدة لدعم الأسر المحتاجة في المنطقة. ندعو جميع الأعضاء للمشاركة والمساهمة.',
    type: 'announcement',
    priority: 'high',
    status: 'sent',
    recipientType: 'all',
    recipients: [],
    senderId: 'charity1',
    senderName: 'لجنة الأعمال الخيرية',
    sentDate: new Date('2024-02-18T16:30:00'),
    readCount: 56,
    totalRecipients: 67,
    tags: ['خيري', 'مبادرة', 'إعلان'],
    relatedEntity: {
      type: 'initiative',
      id: 'charity-initiative-1',
      title: 'مبادرة دعم الأسر'
    },
    createdDate: new Date('2024-02-18T16:00:00'),
    updatedDate: new Date('2024-02-18T16:00:00')
  },
  {
    id: '4',
    title: 'دعوة لحفل زفاف أحمد وفاطمة',
    message: 'تشرفنا دعوتكم لحضور حفل زفاف الأخ أحمد والأخت فاطمة يوم الجمعة القادم في قاعة الاحتفالات الكبرى.',
    type: 'invitation',
    priority: 'medium',
    status: 'scheduled',
    recipientType: 'all',
    recipients: [],
    senderId: 'events1',
    senderName: 'لجنة المناسبات',
    scheduledDate: new Date('2024-02-21T09:00:00'),
    readCount: 0,
    totalRecipients: 67,
    tags: ['زفاف', 'دعوة', 'احتفال'],
    relatedEntity: {
      type: 'occasion',
      id: 'wedding-1',
      title: 'زفاف أحمد وفاطمة'
    },
    createdDate: new Date('2024-02-17T12:00:00'),
    updatedDate: new Date('2024-02-17T12:00:00')
  },
  {
    id: '5',
    title: 'مسودة - إشعار تحديث النظام',
    message: 'سيتم تحديث نظام إدارة العائلة يوم السبت من الساعة 12 ظهراً حتى 2 عصراً. قد يواجه المستخدمون انقطاع مؤقت في الخدمة.',
    type: 'system',
    priority: 'low',
    status: 'draft',
    recipientType: 'all',
    recipients: [],
    senderId: 'admin1',
    senderName: 'إدارة النظام',
    readCount: 0,
    totalRecipients: 0,
    tags: ['نظام', 'تحديث', 'صيانة'],
    createdDate: new Date('2024-02-20T11:30:00'),
    updatedDate: new Date('2024-02-20T11:45:00')
  }
];

const mockGroups: GroupInfo[] = [
  { id: 'group1', name: 'مجلس الإدارة', memberCount: 12, description: 'أعضاء مجلس إدارة العائلة' },
  { id: 'group2', name: 'اللجنة المالية', memberCount: 8, description: 'المسؤولون عن الشؤون المالية' },
  { id: 'group3', name: 'لجنة المناسبات', memberCount: 15, description: 'منظمو الفعاليات والمناسبات' },
  { id: 'group4', name: 'الأعضاء الجدد', memberCount: 23, description: 'الأعضاء المنضمون حديثاً' }
];

const mockRoles: RoleInfo[] = [
  { id: 'admin', name: 'مدير', memberCount: 5 },
  { id: 'financial', name: 'مدير مالي', memberCount: 3 },
  { id: 'organizer', name: 'منظم', memberCount: 12 },
  { id: 'member', name: 'عضو', memberCount: 47 }
];

const mockMembers = [
  { id: 'user1', name: 'أحمد محمد السعيد', email: 'ahmad@family.com' },
  { id: 'user2', name: 'فاطمة عبد الله', email: 'fatima@family.com' },
  { id: 'user3', name: 'خالد يوسف المطيري', email: 'khalid@family.com' },
  { id: 'user4', name: 'سارة أحمد الزهراني', email: 'sara@family.com' }
];

const NotificationsCenter: React.FC = () => {
  const { isMobile, isTablet, breakpoint } = useResponsive();
  const { getItemStyles } = useStaggeredAnimation(6, 'fadeIn', 120);

  React.useEffect(() => {
    injectAnimationKeyframes();
  }, []);

  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [filters, setFilters] = useState<INotificationFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const filteredNotifications = notifications.filter(notification => {
    if (filters.type && notification.type !== filters.type) return false;
    if (filters.priority && notification.priority !== filters.priority) return false;
    if (filters.status && notification.status !== filters.status) return false;
    if (filters.recipientType && notification.recipientType !== filters.recipientType) return false;
    if (filters.unreadOnly && notification.readCount >= notification.totalRecipients) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (!notification.title.toLowerCase().includes(searchLower) &&
          !notification.message.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    if (filters.dateRange) {
      const notificationDate = notification.sentDate || notification.createdDate;
      if (filters.dateRange.start && notificationDate < filters.dateRange.start) return false;
      if (filters.dateRange.end && notificationDate > filters.dateRange.end) return false;
    }
    return true;
  });

  const statistics: NotificationStatistics = {
    totalNotifications: notifications.length,
    sentNotifications: notifications.filter(n => n.status === 'sent').length,
    pendingNotifications: notifications.filter(n => ['draft', 'scheduled'].includes(n.status)).length,
    totalRecipients: notifications.reduce((sum, n) => sum + n.totalRecipients, 0),
    totalReads: notifications.reduce((sum, n) => sum + n.readCount, 0),
    readRate: notifications.length > 0 ?
      Math.round((notifications.reduce((sum, n) => sum + n.readCount, 0) /
                 notifications.reduce((sum, n) => sum + n.totalRecipients, 0)) * 100) : 0,
    mostUsedType: 'general',
    recentActivity: notifications.filter(n => {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return (n.sentDate || n.createdDate) > dayAgo;
    }).length
  };

  const unreadCount = notifications.filter(n =>
    n.status === 'sent' && n.readCount < n.totalRecipients
  ).length;

  const handleCreateNotification = async (formData: NotificationFormData) => {
    setLoading(true);
    try {
      // API call would go here
      const newNotification: Notification = {
        id: Date.now().toString(),
        title: formData.title,
        message: formData.message,
        type: formData.type,
        priority: formData.priority,
        status: formData.scheduledDate ? 'scheduled' : 'sent',
        recipientType: formData.recipientType,
        recipients: [],
        senderId: 'current_user',
        senderName: 'المستخدم الحالي',
        scheduledDate: formData.scheduledDate ? new Date(`${formData.scheduledDate}T${formData.scheduledTime}`) : undefined,
        sentDate: !formData.scheduledDate ? new Date() : undefined,
        readCount: 0,
        totalRecipients: formData.recipientType === 'all' ? 67 : formData.selectedRecipients.length,
        tags: formData.tags,
        createdDate: new Date(),
        updatedDate: new Date()
      };

      setNotifications(prev => [newNotification, ...prev]);
      setShowCreateModal(false);
    } catch (error) {
      logger.error('Error creating notification:', { error });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      // API call would go here
      setNotifications(prev => prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, readCount: notification.totalRecipients }
          : notification
      ));
    } catch (error) {
      logger.error('Error marking as read:', { error });
    }
  };

  const handleDeleteNotification = async (notification: Notification) => {
    if (window.confirm('هل تريد حذف هذا الإشعار؟')) {
      try {
        // API call would go here
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      } catch (error) {
        logger.error('Error deleting notification:', { error });
      }
    }
  };

  const clearFilters = () => {
    setFilters({});
  };

  const formatNumber = (num: number): string => {
    return formatArabicNumber(num);
  };

  const containerStyle: React.CSSProperties = {
    padding: getResponsiveSpacing(breakpoint, { xs: '16px', sm: '20px', md: '24px' }),
    direction: 'rtl' as const,
    minHeight: '100vh',
    maxWidth: '100%',
    overflow: 'hidden'
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    justifyContent: 'space-between',
    alignItems: isMobile ? 'flex-start' : 'center',
    marginBottom: isMobile ? '20px' : '24px',
    gap: isMobile ? '12px' : '16px'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: isMobile ? '24px' : '28px',
    fontWeight: '700',
    color: '#1f2937',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: isMobile ? '8px' : '12px',
    fontFamily: 'Cairo, Tajawal, sans-serif',
    letterSpacing: '-0.025em'
  };

  const actionsStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: isMobile ? '8px' : '12px',
    flexWrap: isMobile ? 'wrap' : 'nowrap',
    width: isMobile ? '100%' : 'auto'
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...getTouchStyles(isMobile),
    borderRadius: '12px',
    border: 'none',
    fontSize: isMobile ? '15px' : '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
    userSelect: 'none' as const,
    WebkitTapHighlightColor: 'transparent',
    flex: isMobile ? '1' : 'none'
  };

  const secondaryButtonStyle: React.CSSProperties = {
    ...getTouchStyles(isMobile),
    borderRadius: '12px',
    border: '1px solid rgba(0, 0, 0, 0.2)',
    fontSize: isMobile ? '15px' : '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    background: 'rgba(255, 255, 255, 0.8)',
    color: '#374151',
    backdropFilter: 'blur(10px)',
    userSelect: 'none' as const,
    WebkitTapHighlightColor: 'transparent',
    flex: isMobile ? '1' : 'none'
  };

  const statsGridStyle: React.CSSProperties = {
    ...getResponsiveGridStyles(breakpoint, { xs: 1, sm: 2, md: 3, lg: 6 }),
    gap: isMobile ? '12px' : '16px',
    marginBottom: isMobile ? '24px' : '32px'
  };

  const statCardStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: isMobile ? '12px' : '16px',
    padding: isMobile ? '16px' : '24px',
    textAlign: 'center' as const,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden'
  };

  const statValueStyle: React.CSSProperties = {
    fontSize: isMobile ? '24px' : '32px',
    fontWeight: '700',
    marginBottom: isMobile ? '6px' : '8px',
    fontFamily: 'Cairo, Tajawal, sans-serif',
    letterSpacing: '-0.02em'
  };

  const statLabelStyle: React.CSSProperties = {
    fontSize: isMobile ? '12px' : '14px',
    color: '#6b7280',
    fontWeight: '500',
    lineHeight: '1.4'
  };

  const contentGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' :
      showFilters ? (isTablet ? '250px 1fr' : '300px 1fr') : '1fr',
    gap: isMobile ? '16px' : '24px',
    alignItems: 'start'
  };

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const paginatedNotifications = filteredNotifications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>
          <BellIcon style={{ width: '32px', height: '32px' }} />
          {ARABIC_LABELS.notificationsCenter}
          <NotificationBadge count={unreadCount} size="large" />
        </h1>

        <div style={actionsStyle}>
          <button
            style={secondaryButtonStyle}
            onClick={() => setShowFilters(!showFilters)}
          >
            <FunnelIcon style={{ width: '20px', height: '20px' }} />
            {showFilters ? 'إخفاء الفلاتر' : 'عرض الفلاتر'}
          </button>

          <button
            style={primaryButtonStyle}
            onClick={() => setShowCreateModal(true)}
            onMouseEnter={(e) => {
              if (!isMobile) {
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isMobile) {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
              }
            }}
            onTouchStart={(e) => {
              if (isMobile) {
                e.currentTarget.style.transform = 'scale(0.98)';
              }
            }}
            onTouchEnd={(e) => {
              if (isMobile) {
                e.currentTarget.style.transform = 'scale(1)';
              }
            }}
          >
            <PlusIcon style={{ width: '20px', height: '20px' }} />
            {ARABIC_LABELS.createNotification}
          </button>
        </div>
      </div>

      <div style={statsGridStyle}>
        <div
          style={{
            ...statCardStyle,
            ...getItemStyles(0),
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)'
          }}
          onMouseEnter={(e) => {
            if (!isMobile) {
              e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(102, 126, 234, 0.2)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isMobile) {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        >
          <ChartBarIcon style={{
            width: isMobile ? '24px' : '32px',
            height: isMobile ? '24px' : '32px',
            color: '#667eea',
            margin: `0 auto ${isMobile ? '12px' : '16px'}`
          }} />
          <div style={{ ...statValueStyle, color: '#667eea' }}>
            {formatNumber(statistics.totalNotifications)}
          </div>
          <div style={statLabelStyle}>إجمالي الإشعارات</div>
        </div>

        <div
          style={{
            ...statCardStyle,
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)'
          }}
          onMouseEnter={(e) => {
            if (!isMobile) {
              e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.2)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isMobile) {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        >
          <EnvelopeOpenIcon style={{
            width: isMobile ? '24px' : '32px',
            height: isMobile ? '24px' : '32px',
            color: '#10b981',
            margin: `0 auto ${isMobile ? '12px' : '16px'}`
          }} />
          <div style={{ ...statValueStyle, color: '#10b981' }}>
            {formatNumber(statistics.sentNotifications)}
          </div>
          <div style={statLabelStyle}>الإشعارات المرسلة</div>
        </div>

        <div
          style={{
            ...statCardStyle,
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.1) 100%)'
          }}
          onMouseEnter={(e) => {
            if (!isMobile) {
              e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.2)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isMobile) {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        >
          <ClockIcon style={{
            width: isMobile ? '24px' : '32px',
            height: isMobile ? '24px' : '32px',
            color: '#f59e0b',
            margin: `0 auto ${isMobile ? '12px' : '16px'}`,
            animation: statistics.pendingNotifications > 0 ? 'pulse 2s infinite' : 'none'
          }} />
          <div style={{ ...statValueStyle, color: '#f59e0b' }}>
            {formatNumber(statistics.pendingNotifications)}
          </div>
          <div style={statLabelStyle}>في الانتظار</div>
        </div>

        <div
          style={{
            ...statCardStyle,
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%)'
          }}
          onMouseEnter={(e) => {
            if (!isMobile) {
              e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.2)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isMobile) {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        >
          <UsersIcon style={{
            width: isMobile ? '24px' : '32px',
            height: isMobile ? '24px' : '32px',
            color: '#3b82f6',
            margin: `0 auto ${isMobile ? '12px' : '16px'}`
          }} />
          <div style={{ ...statValueStyle, color: '#3b82f6' }}>
            {formatNumber(statistics.totalRecipients)}
          </div>
          <div style={statLabelStyle}>إجمالي المستقبلين</div>
        </div>

        <div
          style={{
            ...statCardStyle,
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%)'
          }}
          onMouseEnter={(e) => {
            if (!isMobile) {
              e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.2)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isMobile) {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        >
          <EyeIcon style={{
            width: isMobile ? '24px' : '32px',
            height: isMobile ? '24px' : '32px',
            color: '#8b5cf6',
            margin: `0 auto ${isMobile ? '12px' : '16px'}`
          }} />
          <div style={{ ...statValueStyle, color: '#8b5cf6' }}>
            {formatArabicPercentage(statistics.readRate)}
          </div>
          <div style={statLabelStyle}>معدل القراءة</div>
        </div>

        <div
          style={{
            ...statCardStyle,
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)'
          }}
          onMouseEnter={(e) => {
            if (!isMobile) {
              e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.2)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isMobile) {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        >
          <ExclamationTriangleIcon style={{
            width: isMobile ? '24px' : '32px',
            height: isMobile ? '24px' : '32px',
            color: '#ef4444',
            margin: `0 auto ${isMobile ? '12px' : '16px'}`,
            animation: statistics.recentActivity > 0 ? 'pulse 2s infinite' : 'none'
          }} />
          <div style={{ ...statValueStyle, color: '#ef4444' }}>
            {formatNumber(statistics.recentActivity)}
          </div>
          <div style={statLabelStyle}>النشاط الأخير (24 ساعة)</div>
        </div>
      </div>

      <div style={contentGridStyle}>
        {showFilters && (
          <div style={{
            position: isMobile ? 'static' : 'sticky' as const,
            top: isMobile ? 'auto' : '24px',
            order: isMobile ? 1 : 0,
            marginBottom: isMobile ? '16px' : '0'
          }}>
            <NotificationFilters
              filters={filters}
              onFiltersChange={setFilters}
              onClearFilters={clearFilters}
            />
          </div>
        )}

        <div style={{
          order: isMobile && showFilters ? 0 : 1,
          minHeight: isMobile ? 'auto' : '600px'
        }}>
          <NotificationsList
            notifications={paginatedNotifications}
            onView={(notification) => {
              setSelectedNotification(notification);
              // Could open a details modal here
            }}
            onEdit={(notification) => {
              setSelectedNotification(notification);
              setShowCreateModal(true);
            }}
            onDelete={handleDeleteNotification}
            onMarkAsRead={handleMarkAsRead}
            loading={loading}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {showCreateModal && (
        <CreateNotificationModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedNotification(null);
          }}
          onSubmit={handleCreateNotification}
          isLoading={loading}
          groups={mockGroups}
          roles={mockRoles}
          members={mockMembers}
        />
      )}
    </div>
  );
};

export default memo(NotificationsCenter);