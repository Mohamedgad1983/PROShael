import React from 'react';
import { BellIcon } from '@heroicons/react/24/outline';

interface NotificationBadgeProps {
  count: number;
  maxCount?: number;
  showZero?: boolean;
  size?: 'small' | 'medium' | 'large';
  color?: string;
  onClick?: () => void;
  className?: string;
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  maxCount = 99,
  showZero = false,
  size = 'medium',
  color = '#ef4444',
  onClick,
  className = ''
}) => {
  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();
  const shouldShow = count > 0 || showZero;

  const getSizeConfig = () => {
    switch (size) {
      case 'small':
        return {
          iconSize: '20px',
          badgeSize: '16px',
          badgePosition: { top: '-4px', left: '-4px' },
          fontSize: '10px',
          minWidth: '16px'
        };
      case 'large':
        return {
          iconSize: '32px',
          badgeSize: '20px',
          badgePosition: { top: '-6px', left: '-6px' },
          fontSize: '12px',
          minWidth: '20px'
        };
      default:
        return {
          iconSize: '24px',
          badgeSize: '18px',
          badgePosition: { top: '-5px', left: '-5px' },
          fontSize: '11px',
          minWidth: '18px'
        };
    }
  };

  const sizeConfig = getSizeConfig();

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: onClick ? 'pointer' : 'default',
    transition: 'all 0.2s ease'
  };

  const iconStyle: React.CSSProperties = {
    width: sizeConfig.iconSize,
    height: sizeConfig.iconSize,
    color: '#6b7280',
    transition: 'color 0.2s ease'
  };

  const badgeStyle: React.CSSProperties = {
    position: 'absolute' as const,
    top: sizeConfig.badgePosition.top,
    left: sizeConfig.badgePosition.left,
    minWidth: sizeConfig.minWidth,
    height: sizeConfig.badgeSize,
    background: color,
    color: 'white',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: sizeConfig.fontSize,
    fontWeight: '600',
    padding: '0 4px',
    border: '2px solid white',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    animation: count > 0 ? 'notification-pulse 2s infinite' : 'none'
  };

  const pulseStyle = React.useMemo(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes notification-pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
      }
      @keyframes notification-shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-2px); }
        75% { transform: translateX(2px); }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // pulseStyle is applied directly in the JSX

  const handleClick = () => {
    if (onClick) {
      // Add shake animation on click
      const element = document.querySelector(`.notification-badge-${className}`);
      if (element) {
        (element as HTMLElement).style.animation = 'notification-shake 0.5s ease-in-out';
        setTimeout(() => {
          (element as HTMLElement).style.animation = '';
        }, 500);
      }
      onClick();
    }
  };

  return (
    <div
      style={containerStyle}
      onClick={handleClick}
      className={`notification-badge-${className}`}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'scale(1.05)';
          const icon = e.currentTarget.querySelector('svg');
          if (icon) {
            (icon as SVGElement).style.color = color;
          }
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'scale(1)';
          const icon = e.currentTarget.querySelector('svg');
          if (icon) {
            (icon as SVGElement).style.color = '#6b7280';
          }
        }
      }}
    >
      <BellIcon style={iconStyle} />

      {shouldShow && (
        <div
          style={badgeStyle}
          onAnimationEnd={(e) => {
            // Reset animation after pulse completes
            if (count === 0) {
              e.currentTarget.style.animation = 'none';
            }
          }}
        >
          {displayCount}
        </div>
      )}
    </div>
  );
};

export default React.memo(NotificationBadge);