/**
 * QuickActions - Action buttons grid for main mobile actions
 * Features: Touch-optimized grid, haptic feedback, accessibility
 */

import React from 'react';
import { useMobile, useHapticFeedback } from '../../hooks/useMobile';
import '../../styles/mobile-arabic.css';

const QuickActions = ({ onActionSelect }) => {
  const { viewport } = useMobile();
  const { feedback } = useHapticFeedback();

  // Quick action items
  const actions = [
    {
      id: 'pay',
      title: 'دفع مبلغ',
      description: 'دفع الاشتراك الشهري',
      icon: '💳',
      color: 'bg-gradient-to-br from-blue-500 to-blue-600',
      route: '/payment'
    },
    {
      id: 'statement',
      title: 'كشف الحساب',
      description: 'عرض كشف الحساب',
      icon: '📊',
      color: 'bg-gradient-to-br from-green-500 to-green-600',
      route: '/statement'
    },
    {
      id: 'events',
      title: 'الأنشطة',
      description: 'الأنشطة والفعاليات',
      icon: '🎉',
      color: 'bg-gradient-to-br from-purple-500 to-purple-600',
      route: '/events'
    },
    {
      id: 'profile',
      title: 'الملف الشخصي',
      description: 'إدارة البيانات',
      icon: '👤',
      color: 'bg-gradient-to-br from-orange-500 to-orange-600',
      route: '/profile'
    },
    {
      id: 'documents',
      title: 'المستندات',
      description: 'الوثائق والملفات',
      icon: '📄',
      color: 'bg-gradient-to-br from-teal-500 to-teal-600',
      route: '/documents'
    },
    {
      id: 'support',
      title: 'الدعم',
      description: 'المساعدة والتواصل',
      icon: '🆘',
      color: 'bg-gradient-to-br from-red-500 to-red-600',
      route: '/support'
    },
    {
      id: 'notifications',
      title: 'الإشعارات',
      description: 'الرسائل والتنبيهات',
      icon: '🔔',
      color: 'bg-gradient-to-br from-yellow-500 to-yellow-600',
      route: '/notifications'
    },
    {
      id: 'settings',
      title: 'الإعدادات',
      description: 'إعدادات التطبيق',
      icon: '⚙️',
      color: 'bg-gradient-to-br from-gray-500 to-gray-600',
      route: '/settings'
    }
  ];

  // Handle action selection
  const handleActionSelect = (action) => {
    feedback('medium');

    if (onActionSelect) {
      onActionSelect(action);
    }
  };

  // Determine grid layout based on screen size
  const getGridCols = () => {
    if (viewport.breakpoint === 'xs') return 'grid-cols-2';
    if (viewport.breakpoint === 'sm') return 'grid-cols-2';
    return 'grid-cols-3';
  };

  return (
    <div className="glass-card">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">الإجراءات السريعة</h3>
        <div className="w-8 h-8 bg-gradient-accent rounded-lg flex items-center justify-center">
          <span className="text-white text-sm">⚡</span>
        </div>
      </div>

      {/* Actions grid */}
      <div className={`grid ${getGridCols()} gap-4`}>
        {actions.map((action) => (
          <ActionButton
            key={action.id}
            action={action}
            onSelect={handleActionSelect}
            isMobile={viewport.isMobile}
          />
        ))}
      </div>

      {/* Quick tips */}
      <div className="mt-6 pt-4 border-t border-slate-600">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>💡</span>
          <span>اضغط مطولاً للمزيد من الخيارات</span>
        </div>
      </div>

    </div>
  );
};

// Action button component
const ActionButton = ({ action, onSelect, isMobile }) => {
  const { feedback } = useHapticFeedback();

  const handlePress = () => {
    onSelect(action);
  };

  const handleLongPress = () => {
    feedback('heavy');
    // Could show context menu or additional options
  };

  return (
    <button
      className={`relative overflow-hidden rounded-xl ${action.color} p-4 text-white shadow-lg
        transform transition-all duration-200 hover:scale-105 active:scale-95
        focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50
        ${isMobile ? 'min-h-[100px]' : 'min-h-[120px]'}
      `}
      onClick={handlePress}
      onContextMenu={(e) => {
        e.preventDefault();
        handleLongPress();
      }}
      aria-label={`${action.title} - ${action.description}`}
    >

      {/* Background pattern */}
      <div className="absolute inset-0 bg-white bg-opacity-10 background-pattern"></div>

      {/* Shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white via-transparent opacity-0 hover:opacity-20 transition-opacity duration-500 shimmer-effect"></div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center h-full justify-center">

        {/* Icon */}
        <div className={`text-2xl mb-2 ${isMobile ? 'text-xl' : 'text-2xl'}`}>
          {action.icon}
        </div>

        {/* Title */}
        <h4 className={`font-semibold mb-1 ${isMobile ? 'text-sm' : 'text-base'}`}>
          {action.title}
        </h4>

        {/* Description (hidden on small mobile) */}
        {!isMobile && (
          <p className="text-xs opacity-90 leading-tight">
            {action.description}
          </p>
        )}

        {/* Badge for notifications (example) */}
        {action.id === 'notifications' && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold">3</span>
          </div>
        )}

      </div>

      {/* Ripple effect container */}
      <div className="absolute inset-0 overflow-hidden rounded-xl">
        <div className="ripple-effect"></div>
      </div>

    </button>
  );
};

export default QuickActions;