/**
 * SkeletonLoaders - Mobile-optimized skeleton loading components
 * Features: Shimmer animations, mobile-specific layouts, Arabic RTL support
 */

import React, { memo } from 'react';
import '../../styles/skeleton-loaders.css';

// Base skeleton component with shimmer effect
const SkeletonBase = ({
  className = '',
  width = '100%',
  height = '20px',
  borderRadius = '8px',
  children,
  animate = true
}) => (
  <div
    className={`skeleton-base ${animate ? 'skeleton-animate' : ''} ${className}`}
    style={{ width, height, borderRadius }}
    aria-hidden="true"
  >
    {children}
  </div>
);

// Mobile dashboard skeleton
export const MobileDashboardSkeleton = () => (
  <div className="mobile-skeleton-container" dir="rtl">
    {/* Header skeleton */}
    <div className="skeleton-header">
      <div className="flex items-center justify-between p-4">
        <div className="flex-1">
          <SkeletonBase width="60%" height="16px" className="mb-2" />
          <SkeletonBase width="80%" height="20px" className="mb-1" />
          <SkeletonBase width="40%" height="12px" />
        </div>
        <div className="flex items-center gap-3">
          <SkeletonBase width="40px" height="40px" borderRadius="50%" />
          <SkeletonBase width="40px" height="40px" borderRadius="50%" />
        </div>
      </div>
    </div>

    {/* Balance card skeleton */}
    <div className="skeleton-card">
      <div className="flex items-center justify-between mb-4">
        <SkeletonBase width="30%" height="16px" />
        <SkeletonBase width="24px" height="24px" borderRadius="6px" />
      </div>
      <SkeletonBase width="50%" height="32px" className="mb-2" />
      <SkeletonBase width="40%" height="14px" className="mb-4" />
      <div className="flex gap-4">
        <div className="flex-1">
          <SkeletonBase width="80%" height="12px" className="mb-1" />
          <SkeletonBase width="60%" height="16px" />
        </div>
        <div className="flex-1">
          <SkeletonBase width="80%" height="12px" className="mb-1" />
          <SkeletonBase width="60%" height="16px" />
        </div>
      </div>
    </div>

    {/* Quick actions skeleton */}
    <div className="skeleton-card">
      <SkeletonBase width="40%" height="20px" className="mb-4" />
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="text-center">
            <SkeletonBase width="48px" height="48px" borderRadius="12px" className="mx-auto mb-2" />
            <SkeletonBase width="80%" height="14px" className="mx-auto" />
          </div>
        ))}
      </div>
    </div>

    {/* Notifications skeleton */}
    <div className="skeleton-card">
      <SkeletonBase width="40%" height="20px" className="mb-4" />
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-start gap-3">
            <SkeletonBase width="40px" height="40px" borderRadius="10px" />
            <div className="flex-1">
              <SkeletonBase width="90%" height="16px" className="mb-1" />
              <SkeletonBase width="70%" height="12px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Member list skeleton
export const MemberListSkeleton = ({ count = 5 }) => (
  <div className="space-y-3" dir="rtl">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="skeleton-card">
        <div className="flex items-center gap-3">
          <SkeletonBase width="48px" height="48px" borderRadius="50%" />
          <div className="flex-1">
            <SkeletonBase width="70%" height="16px" className="mb-1" />
            <SkeletonBase width="50%" height="12px" />
          </div>
          <SkeletonBase width="24px" height="24px" borderRadius="6px" />
        </div>
      </div>
    ))}
  </div>
);

// Payment card skeleton
export const PaymentCardSkeleton = () => (
  <div className="skeleton-card" dir="rtl">
    <div className="flex items-center justify-between mb-4">
      <SkeletonBase width="40%" height="18px" />
      <SkeletonBase width="20%" height="16px" />
    </div>
    <SkeletonBase width="60%" height="24px" className="mb-2" />
    <SkeletonBase width="40%" height="14px" className="mb-4" />
    <div className="flex justify-between items-center">
      <SkeletonBase width="30%" height="14px" />
      <SkeletonBase width="80px" height="32px" borderRadius="16px" />
    </div>
  </div>
);

// Form field skeleton
export const FormFieldSkeleton = ({ withLabel = true }) => (
  <div className="space-y-2" dir="rtl">
    {withLabel && <SkeletonBase width="30%" height="14px" />}
    <SkeletonBase width="100%" height="44px" borderRadius="12px" />
  </div>
);

// Navigation skeleton
export const NavigationSkeleton = () => (
  <div className="fixed bottom-0 left-0 right-0 skeleton-nav">
    <div className="flex items-center justify-around py-2">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="flex flex-col items-center">
          <SkeletonBase width="24px" height="24px" borderRadius="6px" className="mb-1" />
          <SkeletonBase width="40px" height="10px" />
        </div>
      ))}
    </div>
  </div>
);

// Table skeleton
export const TableSkeleton = ({ rows = 5, columns = 4 }) => (
  <div className="skeleton-table" dir="rtl">
    {/* Header */}
    <div className="flex gap-4 p-4 border-b border-slate-200">
      {Array.from({ length: columns }).map((_, i) => (
        <SkeletonBase key={i} width="20%" height="14px" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex gap-4 p-4 border-b border-slate-100">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <SkeletonBase key={colIndex} width="20%" height="16px" />
        ))}
      </div>
    ))}
  </div>
);

// Chart skeleton
export const ChartSkeleton = ({ height = '200px' }) => (
  <div className="skeleton-card">
    <SkeletonBase width="40%" height="18px" className="mb-4" />
    <div className="flex items-end gap-2" style={{ height }}>
      {[40, 60, 30, 80, 50, 70, 45].map((h, i) => (
        <SkeletonBase
          key={i}
          width="12%"
          height={`${h}%`}
          borderRadius="4px 4px 0 0"
        />
      ))}
    </div>
  </div>
);

// Statistics card skeleton
export const StatsCardSkeleton = () => (
  <div className="skeleton-card text-center">
    <SkeletonBase width="32px" height="32px" borderRadius="8px" className="mx-auto mb-3" />
    <SkeletonBase width="60%" height="14px" className="mx-auto mb-2" />
    <SkeletonBase width="40%" height="20px" className="mx-auto" />
  </div>
);

// Search bar skeleton
export const SearchBarSkeleton = () => (
  <div className="skeleton-card" dir="rtl">
    <div className="flex items-center gap-3">
      <SkeletonBase width="24px" height="24px" borderRadius="6px" />
      <SkeletonBase width="100%" height="20px" />
    </div>
  </div>
);

// Profile header skeleton
export const ProfileHeaderSkeleton = () => (
  <div className="skeleton-card text-center" dir="rtl">
    <SkeletonBase width="80px" height="80px" borderRadius="50%" className="mx-auto mb-4" />
    <SkeletonBase width="60%" height="20px" className="mx-auto mb-2" />
    <SkeletonBase width="40%" height="14px" className="mx-auto mb-4" />
    <div className="flex justify-center gap-4">
      <SkeletonBase width="80px" height="32px" borderRadius="16px" />
      <SkeletonBase width="80px" height="32px" borderRadius="16px" />
    </div>
  </div>
);

// Notification skeleton
export const NotificationSkeleton = ({ count = 3 }) => (
  <div className="space-y-3" dir="rtl">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="skeleton-card">
        <div className="flex items-start gap-3">
          <SkeletonBase width="40px" height="40px" borderRadius="10px" />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <SkeletonBase width="60%" height="16px" />
              <SkeletonBase width="30%" height="12px" />
            </div>
            <SkeletonBase width="80%" height="14px" className="mb-1" />
            <SkeletonBase width="60%" height="12px" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

// Activity feed skeleton
export const ActivityFeedSkeleton = ({ count = 5 }) => (
  <div className="space-y-4" dir="rtl">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="flex items-center gap-3">
        <SkeletonBase width="32px" height="32px" borderRadius="8px" />
        <div className="flex-1">
          <SkeletonBase width="70%" height="14px" className="mb-1" />
          <SkeletonBase width="50%" height="12px" />
        </div>
        <SkeletonBase width="60px" height="12px" />
      </div>
    ))}
  </div>
);

// Full page skeleton for major transitions
export const FullPageSkeleton = ({ type = 'dashboard' }) => {
  switch (type) {
    case 'dashboard':
      return <MobileDashboardSkeleton />;
    case 'list':
      return (
        <div className="space-y-4 p-4">
          <SearchBarSkeleton />
          <MemberListSkeleton count={8} />
        </div>
      );
    case 'profile':
      return (
        <div className="space-y-4 p-4">
          <ProfileHeaderSkeleton />
          <div className="grid grid-cols-2 gap-4">
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </div>
          <ActivityFeedSkeleton />
        </div>
      );
    default:
      return <MobileDashboardSkeleton />;
  }
};

// Skeleton provider for consistent loading states
export const SkeletonProvider = ({ loading, skeleton, children, fallback = null }) => {
  if (loading) {
    return skeleton || fallback || <div>Loading...</div>;
  }
  return children;
};

export default {
  MobileDashboardSkeleton,
  MemberListSkeleton,
  PaymentCardSkeleton,
  FormFieldSkeleton,
  NavigationSkeleton,
  TableSkeleton,
  ChartSkeleton,
  StatsCardSkeleton,
  SearchBarSkeleton,
  ProfileHeaderSkeleton,
  NotificationSkeleton,
  ActivityFeedSkeleton,
  FullPageSkeleton,
  SkeletonProvider
};