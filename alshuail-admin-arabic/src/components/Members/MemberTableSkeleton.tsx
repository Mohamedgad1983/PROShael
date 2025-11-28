/**
 * Member Table Skeleton Component
 * Beautiful loading animation for member table
 * Shows while fetching data from API
 */

import React from 'react';

interface MemberTableSkeletonProps {
  rows?: number;
}

const MemberTableSkeleton: React.FC<MemberTableSkeletonProps> = ({ rows = 10 }) => {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <tr
          key={`skeleton-${index}`}
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {/* Checkbox column */}
          <td style={{ padding: '1rem' }}>
            <div
              style={{
                width: '16px',
                height: '16px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '4px',
                animation: 'shimmer 1.5s infinite',
              }}
            />
          </td>

          {/* Name column */}
          <td style={{ padding: '1rem' }}>
            <div
              style={{
                height: '16px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '4px',
                width: '80%',
                animation: 'shimmer 1.5s infinite',
                animationDelay: '0.1s',
              }}
            />
          </td>

          {/* Phone column */}
          <td style={{ padding: '1rem' }}>
            <div
              style={{
                height: '16px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '4px',
                width: '60%',
                animation: 'shimmer 1.5s infinite',
                animationDelay: '0.2s',
              }}
            />
          </td>

          {/* Status badge column */}
          <td style={{ padding: '1rem' }}>
            <div
              style={{
                height: '24px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '12px',
                width: '70px',
                animation: 'shimmer 1.5s infinite',
                animationDelay: '0.3s',
              }}
            />
          </td>

          {/* Membership type column */}
          <td style={{ padding: '1rem' }}>
            <div
              style={{
                height: '16px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '4px',
                width: '50%',
                animation: 'shimmer 1.5s infinite',
                animationDelay: '0.4s',
              }}
            />
          </td>

          {/* Actions column */}
          <td style={{ padding: '1rem' }}>
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                justifyContent: 'flex-end',
              }}
            >
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    width: '32px',
                    height: '32px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    animation: 'shimmer 1.5s infinite',
                    animationDelay: `${0.5 + i * 0.1}s`,
                  }}
                />
              ))}
            </div>
          </td>
        </tr>
      ))}

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
    </>
  );
};

export default MemberTableSkeleton;
