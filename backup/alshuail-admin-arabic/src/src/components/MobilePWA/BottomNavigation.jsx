/**
 * BottomNavigation - Mobile navigation bar with safe area support
 * Features: Touch-optimized tabs, badges, active states, haptic feedback
 */

import React from 'react';
import { useMobile, useHapticFeedback } from '../../hooks/useMobile';
import '../../styles/mobile-arabic.css';

const BottomNavigation = ({
  activeTab = 'dashboard',
  onTabChange,
  badgeCounts = {},
  isVisible = true
}) => {
  const { applySafeArea, viewport } = useMobile();
  const { feedback } = useHapticFeedback();

  // Navigation tabs configuration
  const navigationTabs = [
    {
      id: 'dashboard',
      title: 'الرئيسية',
      icon: '🏠',
      activeIcon: '🏠',
      route: '/dashboard'
    },
    {
      id: 'payments',
      title: 'المدفوعات',
      icon: '💳',
      activeIcon: '💳',
      route: '/payments'
    },
    {
      id: 'events',
      title: 'الأنشطة',
      icon: '🎉',
      activeIcon: '🎉',
      route: '/events'
    },
    {
      id: 'notifications',
      title: 'الإشعارات',
      icon: '🔔',
      activeIcon: '🔔',
      route: '/notifications'
    },
    {
      id: 'profile',
      title: 'الملف',
      icon: '👤',
      activeIcon: '👤',
      route: '/profile'
    }
  ];

  // Convert numbers to Arabic numerals
  const toArabicNumerals = (num) => {
    if (num === null || num === undefined) return '';
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return String(num).replace(/[0-9]/g, (digit) => arabicNumerals[parseInt(digit)]);
  };

  // Handle tab selection
  const handleTabSelect = (tab) => {
    if (tab.id === activeTab) {
      // Double tap on active tab - could scroll to top
      feedback('heavy');
    } else {
      feedback('medium');
    }

    if (onTabChange) {
      onTabChange(tab);
    }
  };

  // Get badge count for tab
  const getBadgeCount = (tabId) => {
    return badgeCounts[tabId] || 0;
  };

  if (!isVisible) return null;

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-50 bg-glass backdrop-blur-xl border-t border-slate-600 transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={applySafeArea(['bottom'])}
    >

      {/* Navigation container */}
      <div className="container px-2">
        <div className="flex items-center justify-around py-2">

          {navigationTabs.map((tab) => (
            <NavigationTab
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeTab}
              badgeCount={getBadgeCount(tab.id)}
              onSelect={handleTabSelect}
              toArabicNumerals={toArabicNumerals}
              isMobile={viewport.isMobile}
            />
          ))}

        </div>
      </div>

      {/* Center floating action button */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <button
          className="w-14 h-14 bg-gradient-accent rounded-full shadow-xl flex items-center justify-center
            hover:scale-110 active:scale-95 transition-all duration-200
            border-4 border-slate-900"
          onClick={() => {
            feedback('heavy');
            // Could open quick action menu
          }}
          aria-label="إجراءات سريعة"
        >
          <span className="text-white text-xl">⚡</span>
        </button>
      </div>

    </nav>
  );
};

// Individual navigation tab component
const NavigationTab = ({
  tab,
  isActive,
  badgeCount,
  onSelect,
  toArabicNumerals,
  isMobile
}) => {
  const { feedback } = useHapticFeedback();

  const handlePress = () => {
    onSelect(tab);
  };

  const handleLongPress = () => {
    feedback('heavy');
    // Could show tab context menu
  };

  return (
    <button
      className={`relative flex flex-col items-center justify-center p-2 min-w-[50px] rounded-lg
        transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-50
        ${isActive
          ? 'text-accent transform scale-105'
          : 'text-slate-400 hover:text-slate-300 active:scale-95'
        }
        ${isMobile ? 'px-1' : 'px-2'}
      `}
      onClick={handlePress}
      onContextMenu={(e) => {
        e.preventDefault();
        handleLongPress();
      }}
      aria-label={tab.title}
      aria-current={isActive ? 'page' : undefined}
    >

      {/* Icon container */}
      <div className="relative mb-1">

        {/* Background glow for active state */}
        {isActive && (
          <div className="absolute inset-0 bg-accent bg-opacity-20 rounded-lg blur-sm scale-150"></div>
        )}

        {/* Icon */}
        <div className={`relative text-lg ${isMobile ? 'text-base' : 'text-lg'}`}>
          {isActive ? tab.activeIcon : tab.icon}
        </div>

        {/* Badge */}
        {badgeCount > 0 && (
          <div className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-error rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold leading-none">
              {badgeCount > 99 ? '٩٩+' : toArabicNumerals(badgeCount)}
            </span>
          </div>
        )}

        {/* Active indicator dot */}
        {isActive && (
          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-accent rounded-full"></div>
        )}

      </div>

      {/* Label */}
      <span className={`text-xs font-medium leading-tight text-center
        ${isActive ? 'text-accent' : 'text-slate-400'}
        ${isMobile ? 'text-xs' : 'text-xs'}
      `}>
        {tab.title}
      </span>

      {/* Ripple effect */}
      <div className="absolute inset-0 rounded-lg overflow-hidden">
        <div className="ripple-effect"></div>
      </div>

    </button>
  );
};

export default BottomNavigation;