/**
 * Stats Card Skeleton Component
 * Loading animation for statistics cards
 * Shows while fetching statistics from API
 */

import React from 'react';

const StatsCardSkeleton: React.FC = () => {
  return (
    <div
      style={{
        padding: '1.5rem',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.2)',
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* Icon and Label Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1rem',
        }}
      >
        {/* Icon skeleton */}
        <div
          style={{
            width: '50px',
            height: '50px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '12px',
            animation: 'shimmer 1.5s infinite',
          }}
        />

        {/* Label skeleton */}
        <div
          style={{
            height: '14px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '4px',
            width: '120px',
            animation: 'shimmer 1.5s infinite',
            animationDelay: '0.2s',
          }}
        />
      </div>

      {/* Value skeleton */}
      <div
        style={{
          height: '24px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '4px',
          width: '80px',
          animation: 'shimmer 1.5s infinite',
          animationDelay: '0.4s',
        }}
      />

      {/* CSS Animation */}
      <style>{`
        @keyframes shimmer {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
};

export default StatsCardSkeleton;
