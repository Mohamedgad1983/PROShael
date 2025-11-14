import React, { memo,  useState, useEffect } from 'react';
import {
  BellIcon,
  InboxIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  TrashIcon,
  ArchiveBoxIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  BellAlertIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  ChatBubbleLeftRightIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  HeartIcon,
  SparklesIcon,
  StarIcon,
  FireIcon,
  ArrowTrendingUpIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
// CSS styles are inline

const AppleNotificationsCenter = () => {
  const [activeTab, setActiveTab] = useState('inbox');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedNotifications, setSelectedNotifications] = useState([]);

  // Mock data for notifications
  const mockNotifications = [
    {
      id: 1,
      title: 'طلب عضوية جديد',
      message: 'تم تقديم طلب عضوية جديد من محمد أحمد الشعيل',
      type: 'member_request',
      priority: 'high',
      status: 'unread',
      timestamp: '2024-01-20T10:30:00Z',
      sender: 'نظام العضوية',
      action_required: true,
      data: {
        member_name: 'محمد أحمد الشعيل',
        request_id: 'REQ-2024-001'
      }
    },
    {
      id: 2,
      title: 'تذكير بموعد الاجتماع',
      message: 'اجتماع العائلة الشهري غداً الساعة 7:30 مساءً',
      type: 'reminder',
      priority: 'medium',
      status: 'unread',
      timestamp: '2024-01-20T09:15:00Z',
      sender: 'تقويم المناسبات',
      action_required: false,
      data: {
        event_title: 'اجتماع العائلة الشهري',
        event_date: '2024-01-21T19:30:00Z'
      }
    },
    {
      id: 3,
      title: 'تم استلام دفعة مالية',
      message: 'تم استلام دفعة مالية بقيمة 5,000 ر.س من أحمد الشعيل',
      type: 'payment',
      priority: 'medium',
      status: 'read',
      timestamp: '2024-01-20T08:45:00Z',
      sender: 'النظام المالي',
      action_required: false,
      data: {
        amount: 5000,
        payer: 'أحمد الشعيل',
        payment_id: 'PAY-2024-015'
      }
    },
    {
      id: 4,
      title: 'تحديث مهم في النظام',
      message: 'تم إطلاق ميزات جديدة في نظام إدارة العائلة',
      type: 'system',
      priority: 'low',
      status: 'read',
      timestamp: '2024-01-19T14:20:00Z',
      sender: 'إدارة النظام',
      action_required: false,
      data: {
        version: '2.1.0',
        features: ['تحسين الأداء', 'واجهة جديدة', 'ميزات أمان']
      }
    },
    {
      id: 5,
      title: 'حادث يتطلب انتباه',
      message: 'تم الإبلاغ عن حادث جديد يحتاج للمراجعة - قضية DY-2024-004',
      type: 'emergency',
      priority: 'high',
      status: 'unread',
      timestamp: '2024-01-19T16:30:00Z',
      sender: 'إدارة الديات',
      action_required: true,
      data: {
        case_number: 'DY-2024-004',
        incident_type: 'حادث منزلي'
      }
    },
    {
      id: 6,
      title: 'انتهاء صلاحية اشتراك',
      message: 'اشتراك فاطمة الشعيل سينتهي خلال 7 أيام',
      type: 'subscription',
      priority: 'medium',
      status: 'unread',
      timestamp: '2024-01-19T11:00:00Z',
      sender: 'نظام الاشتراكات',
      action_required: true,
      data: {
        member_name: 'فاطمة الشعيل',
        expiry_date: '2024-01-27',
        subscription_type: 'العضوية الأساسية'
      }
    }
  ];

  useEffect(() => {
    setNotifications(mockNotifications);
  }, []);

  // Helper functions
  const getNotificationTypeInfo = (type) => {
    const types = {
      member_request: { label: 'طلب عضوية', icon: UserGroupIcon, color: '#007AFF', gradient: 'from-blue-500 to-indigo-500' },
      payment: { label: 'مالي', icon: CurrencyDollarIcon, color: '#30D158', gradient: 'from-green-500 to-emerald-500' },
      reminder: { label: 'تذكير', icon: ClockIcon, color: '#FF9500', gradient: 'from-orange-500 to-amber-500' },
      emergency: { label: 'طارئ', icon: ExclamationTriangleIcon, color: '#FF3B30', gradient: 'from-red-500 to-pink-500' },
      system: { label: 'نظام', icon: Cog6ToothIcon, color: '#8E8E93', gradient: 'from-gray-500 to-gray-600' },
      subscription: { label: 'اشتراك', icon: StarIcon, color: '#5856D6', gradient: 'from-purple-500 to-indigo-500' },
      announcement: { label: 'إعلان', icon: BellAlertIcon, color: '#FF2D92', gradient: 'from-pink-500 to-rose-500' },
      default: { label: 'عام', icon: InformationCircleIcon, color: '#8E8E93', gradient: 'from-gray-500 to-gray-600' }
    };
    return types[type] || types.default;
  };

  const getPriorityInfo = (priority) => {
    const priorities = {
      high: { label: 'عالية', color: '#FF3B30', icon: FireIcon },
      medium: { label: 'متوسطة', color: '#FF9500', icon: StarIcon },
      low: { label: 'منخفضة', color: '#30D158', icon: InformationCircleIcon }
    };
    return priorities[priority] || priorities.medium;
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));

    if (diffInMinutes < 1) return 'الآن';
    if (diffInMinutes < 60) return `منذ ${diffInMinutes} دقيقة`;
    if (diffInMinutes < 1440) return `منذ ${Math.floor(diffInMinutes / 60)} ساعة`;
    return `منذ ${Math.floor(diffInMinutes / 1440)} يوم`;
  };

  // Calculate statistics
  const totalNotifications = notifications.length;
  const unreadCount = notifications.filter(n => n.status === 'unread').length;
  const highPriorityCount = notifications.filter(n => n.priority === 'high').length;
  const actionRequiredCount = notifications.filter(n => n.action_required).length;

  // Notification tabs
  const notificationTabs = [
    { id: 'inbox', label: 'صندوق الوارد', icon: InboxIcon },
    { id: 'unread', label: 'غير مقروءة', icon: BellIcon },
    { id: 'important', label: 'مهمة', icon: ExclamationTriangleIcon },
    { id: 'archived', label: 'المؤرشف', icon: ArchiveBoxIcon },
    { id: 'settings', label: 'الإعدادات', icon: Cog6ToothIcon }
  ];

  const AppleStatCard = ({ title, value, icon: Icon, gradient, subtitle, trend, trendValue }) => (
    <div style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(249, 250, 251, 0.9))', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(229, 231, 235, 0.5)', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', padding: '24px', transform: 'scale(1)', transition: 'transform 0.3s', cursor: 'pointer' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)' }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}>
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-gray-900 shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${gradient})`,
            animation: 'apple-glow 3s ease-in-out infinite'
          }}
        >
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${trend === 'up' ? 'text-red-400' : 'text-green-400'}`}>
            <span>{trendValue}</span>
            <ArrowTrendingUpIcon className={`w-4 h-4 ${trend === 'down' ? 'rotate-180' : ''}`} />
          </div>
        )}
      </div>
      <div className="space-y-1">
        <h3 className="text-sm text-gray-600 font-medium">{title}</h3>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );

  const AppleNotificationCard = ({ notification, isSelected, onSelect }) => {
    const typeInfo = getNotificationTypeInfo(notification.type);
    const priorityInfo = getPriorityInfo(notification.priority);
    const TypeIcon = typeInfo.icon;
    const PriorityIcon = priorityInfo.icon;

    return (
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(249, 250, 251, 0.9))',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(229, 231, 235, 0.5)',
          borderRadius: '16px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          padding: '16px',
          transition: 'all 0.3s',
          cursor: 'pointer',
          borderLeft: notification.status === 'unread' ? '4px solid #3B82F6' : '1px solid rgba(229, 231, 235, 0.5)',
          ...(isSelected ? { boxShadow: '0 0 0 2px #3B82F6' } : {})
        }}
        onClick={() => onSelect(notification.id)}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(243, 244, 246, 0.5)' }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
      >
        <div className="flex items-start gap-4">
          {/* Selection Checkbox */}
          <div className="flex items-center pt-1">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                onSelect(notification.id);
              }}
              style={{ width: '16px', height: '16px', borderRadius: '4px', border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer' }}
            />
          </div>

          {/* Notification Icon */}
          <div
            className={`w-10 h-10 rounded-xl bg-gradient-to-r ${typeInfo.gradient} flex items-center justify-center text-gray-900 shadow-lg flex-shrink-0`}
          >
            <TypeIcon className="w-5 h-5" />
          </div>

          {/* Notification Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <h3 className={`text-lg font-semibold ${notification.status === 'unread' ? 'text-gray-900' : 'text-gray-700'}`}>
                  {notification.title}
                </h3>
                {notification.status === 'unread' && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {notification.action_required && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-orange-500/20 text-orange-400">
                    <ExclamationTriangleIcon className="w-3 h-3" />
                    يتطلب إجراء
                  </div>
                )}
                <div
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
                  style={{ backgroundColor: `${priorityInfo.color}20`, color: priorityInfo.color }}
                >
                  <PriorityIcon className="w-3 h-3" />
                  {priorityInfo.label}
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{notification.message}</p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>من: {notification.sender}</span>
                <span>{formatTimeAgo(notification.timestamp)}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={{ padding: '8px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#1f2937', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <EyeIcon className="w-4 h-4" />
                </button>
                <button style={{ padding: '8px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#1f2937', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ArchiveBoxIcon className="w-4 h-4" />
                </button>
                <button style={{ padding: '8px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#1f2937', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Action Buttons for notifications that require action */}
            {notification.action_required && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                <button style={{ padding: '6px 12px', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#1f2937', border: 'none', borderRadius: '100px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckIcon className="w-3 h-3" />
                  موافقة
                </button>
                <button style={{ padding: '6px 12px', background: 'linear-gradient(135deg, #EF4444, #DC2626)', color: '#1f2937', border: 'none', borderRadius: '100px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <XMarkIcon className="w-3 h-3" />
                  رفض
                </button>
                <button style={{ padding: '6px 12px', background: 'linear-gradient(135deg, #3B82F6, #2563EB)', color: '#1f2937', border: 'none', borderRadius: '100px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <EyeIcon className="w-3 h-3" />
                  عرض التفاصيل
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const handleSelectNotification = (id) => {
    setSelectedNotifications(prev =>
      prev.includes(id)
        ? prev.filter(nId => nId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const visibleNotifications = getFilteredNotifications();
    const allSelected = visibleNotifications.every(n => selectedNotifications.includes(n.id));

    if (allSelected) {
      setSelectedNotifications(prev => prev.filter(id => !visibleNotifications.find(n => n.id === id)));
    } else {
      setSelectedNotifications(prev => [...new Set([...prev, ...visibleNotifications.map(n => n.id)])]);
    }
  };

  const getFilteredNotifications = () => {
    return notifications.filter(notification => {
      const matchesTab = () => {
        switch (activeTab) {
          case 'unread': return notification.status === 'unread';
          case 'important': return notification.priority === 'high' || notification.action_required;
          case 'archived': return notification.status === 'archived';
          default: return true;
        }
      };

      return matchesTab() &&
        (!filterType || notification.type === filterType) &&
        (!filterStatus || notification.status === filterStatus) &&
        (!searchQuery ||
          notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          notification.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
          notification.sender.toLowerCase().includes(searchQuery.toLowerCase())
        );
    });
  };

  const renderTabContent = () => {
    const filteredNotifications = getFilteredNotifications();

    switch (activeTab) {
      case 'settings':
        return (
          <div className="space-y-6">
            <div style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(249, 250, 251, 0.9))', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(229, 231, 235, 0.5)', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', padding: '24px' }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center">
                  <Cog6ToothIcon className="w-5 h-5 text-gray-900" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">إعدادات الإشعارات</h3>
                  <p className="text-sm text-gray-600">تخصيص تفضيلات الإشعارات</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Notification Channels */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-4">قنوات الإشعارات</h4>
                  <div className="space-y-4">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#f9fafb', borderRadius: '12px' }}>
                      <div className="flex items-center gap-3">
                        <BellIcon className="w-5 h-5 text-blue-400" />
                        <div>
                          <p className="text-gray-900 font-medium">إشعارات النظام</p>
                          <p className="text-sm text-gray-600">إشعارات داخل التطبيق</p>
                        </div>
                      </div>
                      <label style={{ position: 'relative', display: 'inline-block', width: '51px', height: '24px' }}>
                        <input type="checkbox" defaultChecked style={{ opacity: 0, width: 0, height: 0 }} />
                        <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#34D399', transition: '0.4s', borderRadius: '24px' }}></span>
                      </label>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#f9fafb', borderRadius: '12px' }}>
                      <div className="flex items-center gap-3">
                        <EnvelopeIcon className="w-5 h-5 text-green-400" />
                        <div>
                          <p className="text-gray-900 font-medium">البريد الإلكتروني</p>
                          <p className="text-sm text-gray-600">إشعارات عبر البريد الإلكتروني</p>
                        </div>
                      </div>
                      <label style={{ position: 'relative', display: 'inline-block', width: '51px', height: '24px' }}>
                        <input type="checkbox" defaultChecked style={{ opacity: 0, width: 0, height: 0 }} />
                        <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#34D399', transition: '0.4s', borderRadius: '24px' }}></span>
                      </label>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#f9fafb', borderRadius: '12px' }}>
                      <div className="flex items-center gap-3">
                        <DevicePhoneMobileIcon className="w-5 h-5 text-orange-400" />
                        <div>
                          <p className="text-gray-900 font-medium">الرسائل النصية</p>
                          <p className="text-sm text-gray-600">إشعارات عبر الرسائل النصية</p>
                        </div>
                      </div>
                      <label style={{ position: 'relative', display: 'inline-block', width: '51px', height: '24px' }}>
                        <input type="checkbox" style={{ opacity: 0, width: 0, height: 0 }} />
                        <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#6B7280', transition: '0.4s', borderRadius: '24px' }}></span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Notification Types */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-4">أنواع الإشعارات</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries({
                      'member_request': 'طلبات العضوية',
                      'payment': 'المدفوعات',
                      'reminder': 'التذكيرات',
                      'emergency': 'الطوارئ',
                      'system': 'النظام',
                      'subscription': 'الاشتراكات'
                    }).map(([type, label]) => (
                      <div key={type} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
                        <span className="text-gray-900">{label}</span>
                        <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '20px' }}>
                          <input type="checkbox" defaultChecked style={{ opacity: 0, width: 0, height: 0 }} />
                          <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#34D399', transition: '0.4s', borderRadius: '20px' }}></span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              <AppleStatCard
                title="إجمالي الإشعارات"
                value={totalNotifications.toString()}
                icon={BellIcon}
                gradient="#007AFF, #5856D6"
              />
              <AppleStatCard
                title="غير مقروءة"
                value={unreadCount.toString()}
                icon={InboxIcon}
                gradient="#FF9500, #FFCC02"
                trend="up"
                trendValue={`+${unreadCount}`}
              />
              <AppleStatCard
                title="أولوية عالية"
                value={highPriorityCount.toString()}
                icon={ExclamationTriangleIcon}
                gradient="#FF3B30, #FF453A"
                trend="up"
                trendValue={`+${highPriorityCount}`}
              />
              <AppleStatCard
                title="تتطلب إجراء"
                value={actionRequiredCount.toString()}
                icon={CheckCircleIcon}
                gradient="#30D158, #32D74B"
                subtitle="إشعارات تفاعلية"
              />
            </div>

            {/* Filters and Actions */}
            <div style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(249, 250, 251, 0.9))', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(229, 231, 235, 0.5)', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', padding: '16px' }}>
              <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="flex flex-wrap gap-4">
                  <div style={{ position: 'relative' }}>
                    <MagnifyingGlassIcon style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#9ca3af', pointerEvents: 'none' }} />
                    <input
                      type="text"
                      placeholder="البحث في الإشعارات..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ width: '100%', padding: '12px 16px 12px 44px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', color: '#1f2937', fontSize: '14px', outline: 'none' }}
                    />
                  </div>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    style={{ padding: '12px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', color: '#1f2937', fontSize: '14px', outline: 'none' }}
                  >
                    <option value="">جميع الأنواع</option>
                    <option value="member_request">طلبات العضوية</option>
                    <option value="payment">مالي</option>
                    <option value="reminder">تذكير</option>
                    <option value="emergency">طارئ</option>
                    <option value="system">نظام</option>
                    <option value="subscription">اشتراك</option>
                  </select>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={{ padding: '12px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', color: '#1f2937', fontSize: '14px', outline: 'none' }}
                  >
                    <option value="">جميع الحالات</option>
                    <option value="unread">غير مقروءة</option>
                    <option value="read">مقروءة</option>
                    <option value="archived">مؤرشفة</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSelectAll}
                    style={{ padding: '8px 12px', background: 'linear-gradient(135deg, #3B82F6, #2563EB)', color: '#1f2937', border: 'none', borderRadius: '100px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    تحديد الكل
                  </button>
                  {selectedNotifications.length > 0 && (
                    <>
                      <button style={{ padding: '8px 12px', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#1f2937', border: 'none', borderRadius: '100px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        وضع علامة كمقروءة
                      </button>
                      <button style={{ padding: '8px 12px', background: 'linear-gradient(135deg, #F97316, #EA580C)', color: '#1f2937', border: 'none', borderRadius: '100px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        أرشفة
                      </button>
                      <button style={{ padding: '8px 12px', background: 'linear-gradient(135deg, #EF4444, #DC2626)', color: '#1f2937', border: 'none', borderRadius: '100px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        حذف
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Notifications List */}
            <div className="space-y-3">
              {filteredNotifications.length > 0 ? (
                filteredNotifications.map((notification) => (
                  <AppleNotificationCard
                    key={notification.id}
                    notification={notification}
                    isSelected={selectedNotifications.includes(notification.id)}
                    onSelect={handleSelectNotification}
                  />
                ))
              ) : (
                <div style={{ background: 'rgba(248, 250, 252, 1)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
                  <BellIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">لا توجد إشعارات</h3>
                  <p className="text-gray-600">
                    {activeTab === 'unread' ? 'تمت قراءة جميع الإشعارات' : 'لا توجد إشعارات في هذا القسم'}
                  </p>
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="p-6 space-y-6" dir="rtl" style={{ backgroundColor: 'white', minHeight: '100vh' }}>
      {/* Apple Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', padding: '8px', background: 'linear-gradient(135deg, rgba(243, 244, 246, 0.9), rgba(249, 250, 251, 0.9))', backdropFilter: 'blur(10px)', borderRadius: '16px', marginBottom: '24px' }}>
        {notificationTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 20px',
                background: isActive ? 'linear-gradient(135deg, #007AFF, #5856D6)' : 'transparent',
                border: 'none',
                color: isActive ? 'white' : '#86868B',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '100px',
                transition: 'all 0.3s'
              }}
            >
              <Icon className="w-5 h-5" />
              <span>{tab.label}</span>
              {tab.id === 'unread' && unreadCount > 0 && (
                <span className="ml-2 px-2 py-1 bg-red-500 text-gray-900 text-xs rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div style={{ animation: 'apple-fade-up 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}>
        {renderTabContent()}
      </div>
    </div>
  );
};

export default memo(AppleNotificationsCenter);