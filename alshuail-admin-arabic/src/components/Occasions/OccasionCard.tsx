import React, { memo } from 'react';
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UsersIcon,
  TagIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import { Occasion, OccasionType } from './types';
import { ARABIC_LABELS } from '../../constants/arabic';
import { formatArabicDate, formatArabicTime, formatArabicNumber, getUpcomingTimeArabic } from '../../utils/arabic';
import { useResponsive, getTouchStyles, getResponsiveSpacing } from '../../utils/responsive';
import { useAnimation, getHoverStyles, getPressStyles } from '../../utils/animations';

interface OccasionCardProps {
  occasion: Occasion;
  onEdit?: (occasion: Occasion) => void;
  onView?: (occasion: Occasion) => void;
  onRSVP?: (occasion: Occasion) => void;
}

const getOccasionTypeColor = (type: OccasionType): string => {
  switch (type) {
    case 'wedding': return '#ec4899';
    case 'birth': return '#10b981';
    case 'graduation': return '#3b82f6';
    case 'celebration': return '#f59e0b';
    case 'conference': return '#8b5cf6';
    case 'meeting': return '#6b7280';
    case 'charity': return '#ef4444';
    case 'social': return '#06b6d4';
    case 'religious': return '#84cc16';
    case 'family': return '#f97316';
    default: return '#6b7280';
  }
};

const getOccasionTypeLabel = (type: OccasionType): string => {
  switch (type) {
    case 'wedding': return ARABIC_LABELS.wedding;
    case 'birth': return ARABIC_LABELS.birth;
    case 'graduation': return ARABIC_LABELS.graduation;
    case 'celebration': return ARABIC_LABELS.celebration;
    case 'conference': return ARABIC_LABELS.conference;
    case 'meeting': return ARABIC_LABELS.meeting;
    case 'charity': return ARABIC_LABELS.charity;
    case 'social': return 'اجتماعي';
    case 'religious': return 'ديني';
    case 'family': return 'عائلي';
    default: return type;
  }
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'published': return '#10b981';
    case 'draft': return '#6b7280';
    case 'cancelled': return '#ef4444';
    case 'completed': return '#3b82f6';
    case 'postponed': return '#f59e0b';
    default: return '#6b7280';
  }
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'published': return 'منشور';
    case 'draft': return 'مسودة';
    case 'cancelled': return ARABIC_LABELS.cancelled;
    case 'completed': return ARABIC_LABELS.completed;
    case 'postponed': return 'مؤجل';
    default: return status;
  }
};

const isUpcoming = (date: Date): boolean => {
  return new Date(date) > new Date();
};

const getDateStatus = (date: Date): 'upcoming' | 'today' | 'past' => {
  const today = new Date();
  const occDate = new Date(date);
  const todayStr = today.toDateString();
  const occDateStr = occDate.toDateString();

  if (occDateStr === todayStr) return 'today';
  if (occDate > today) return 'upcoming';
  return 'past';
};

const OccasionCard: React.FC<OccasionCardProps> = ({
  occasion,
  onEdit,
  onView,
  onRSVP
}) => {
  const { isMobile, isTablet, breakpoint } = useResponsive();
  const { animationStyles } = useAnimation('fadeIn', true, { duration: 400 });

  const typeColor = getOccasionTypeColor(occasion.type);
  const statusColor = getStatusColor(occasion.status);
  const dateStatus = getDateStatus(occasion.date);
  const isOccasionUpcoming = isUpcoming(occasion.date);

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    border: `2px solid ${dateStatus === 'today' ? '#f59e0b' : 'rgba(255, 255, 255, 0.2)'}`,
    borderRadius: isMobile ? '12px' : '16px',
    padding: getResponsiveSpacing(breakpoint, { xs: '16px', sm: '20px', md: '24px' }),
    marginBottom: isMobile ? '12px' : '16px',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: dateStatus === 'today'
      ? '0 8px 32px rgba(245, 158, 11, 0.2), 0 4px 16px rgba(0, 0, 0, 0.1)'
      : '0 8px 32px rgba(0, 0, 0, 0.1)',
    direction: 'rtl' as const,
    minHeight: isMobile ? 'auto' : '280px',
    ...animationStyles,
    ...(dateStatus === 'today' && {
      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(255, 255, 255, 0.1) 100%)'
    })
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    justifyContent: 'space-between',
    alignItems: isMobile ? 'flex-start' : 'flex-start',
    marginBottom: isMobile ? '12px' : '16px',
    gap: isMobile ? '8px' : '16px'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: isMobile ? '18px' : '20px',
    fontWeight: '700',
    color: dateStatus === 'today' ? '#92400e' : '#1f2937',
    marginBottom: isMobile ? '6px' : '8px',
    lineHeight: '1.4',
    fontFamily: 'Cairo, Tajawal, sans-serif',
    letterSpacing: '-0.025em'
  };

  const typeTagStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${typeColor} 0%, ${typeColor}cc 100%)`,
    color: 'white',
    padding: isMobile ? '6px 12px' : '4px 12px',
    borderRadius: '20px',
    fontSize: isMobile ? '13px' : '12px',
    fontWeight: '600',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    boxShadow: `0 2px 8px ${typeColor}40`,
    transition: 'all 0.2s ease',
    ...getTouchStyles(isMobile)
  };

  const statusTagStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${statusColor} 0%, ${statusColor}cc 100%)`,
    color: 'white',
    padding: isMobile ? '6px 10px' : '4px 8px',
    borderRadius: '12px',
    fontSize: isMobile ? '12px' : '11px',
    fontWeight: '600',
    position: 'absolute' as const,
    top: isMobile ? '12px' : '16px',
    left: isMobile ? '12px' : '16px',
    zIndex: 10,
    boxShadow: `0 2px 8px ${statusColor}40`,
    animation: dateStatus === 'today' ? 'pulse 2s infinite' : 'none'
  };

  const infoItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: isMobile ? '10px' : '8px',
    color: '#6b7280',
    fontSize: isMobile ? '15px' : '14px',
    marginBottom: isMobile ? '10px' : '8px',
    padding: isMobile ? '4px 0' : '2px 0',
    transition: 'color 0.2s ease'
  };

  const iconStyle: React.CSSProperties = {
    width: isMobile ? '18px' : '16px',
    height: isMobile ? '18px' : '16px',
    flexShrink: 0,
    color: dateStatus === 'today' ? '#f59e0b' : undefined
  };

  const buttonStyle: React.CSSProperties = {
    ...getTouchStyles(isMobile),
    borderRadius: isMobile ? '12px' : '8px',
    border: 'none',
    fontSize: isMobile ? '15px' : '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    marginLeft: isMobile ? '0' : '8px',
    marginBottom: isMobile ? '8px' : '0',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    userSelect: 'none' as const,
    WebkitTapHighlightColor: 'transparent'
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white'
  };

  const secondaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: 'rgba(255, 255, 255, 0.8)',
    color: '#374151',
    border: '1px solid rgba(0, 0, 0, 0.1)'
  };

  const actionsStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    justifyContent: isMobile ? 'stretch' : 'flex-end',
    alignItems: isMobile ? 'stretch' : 'center',
    marginTop: isMobile ? '12px' : '16px',
    paddingTop: isMobile ? '12px' : '16px',
    borderTop: '1px solid rgba(0, 0, 0, 0.1)',
    gap: isMobile ? '8px' : '8px'
  };

  return (
    <div
      style={cardStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.1)';
      }}
    >
      <div style={statusTagStyle}>
        {getStatusLabel(occasion.status)}
      </div>

      <div style={headerStyle}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h3 style={titleStyle}>{occasion.title}</h3>
            {dateStatus === 'today' && (
              <StarIcon style={{ width: '20px', height: '20px', color: '#f59e0b', animation: 'bounce 1s infinite' }} />
            )}
          </div>
          <div style={typeTagStyle}>
            <TagIcon style={{ ...iconStyle, width: '14px', height: '14px' }} />
            {getOccasionTypeLabel(occasion.type)}
          </div>
        </div>
        {dateStatus === 'today' && (
          <div style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: '600',
            whiteSpace: 'nowrap'
          }}>
            اليوم
          </div>
        )}
      </div>

      <p style={{
        color: '#6b7280',
        fontSize: '14px',
        lineHeight: '1.5',
        marginBottom: '16px'
      }}>
        {occasion.description}
      </p>

      <div style={{ marginBottom: isMobile ? '12px' : '16px' }}>
        <div style={infoItemStyle}>
          <CalendarIcon style={iconStyle} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontWeight: '600' }}>{formatArabicDate(occasion.date)}</span>
            {isOccasionUpcoming && (
              <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '500' }}>
                {getUpcomingTimeArabic(occasion.date)}
              </span>
            )}
          </div>
        </div>

        <div style={infoItemStyle}>
          <ClockIcon style={iconStyle} />
          <span style={{ fontWeight: '600' }}>{formatArabicTime(occasion.time)}</span>
        </div>

        <div style={infoItemStyle}>
          <MapPinIcon style={iconStyle} />
          <span style={{
            lineHeight: '1.4',
            wordBreak: 'break-word' as const
          }}>{occasion.location}</span>
        </div>

        {occasion.maxAttendees && (
          <div style={infoItemStyle}>
            <UsersIcon style={iconStyle} />
            <span>الحد الأقصى: {formatArabicNumber(occasion.maxAttendees)} شخص</span>
          </div>
        )}
      </div>

      {occasion.tags.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {occasion.tags.map((tag, index) => (
              <span
                key={index}
                style={{
                  background: 'rgba(99, 102, 241, 0.1)',
                  color: '#6366f1',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={actionsStyle}>
        {onRSVP && occasion.status === 'published' && isOccasionUpcoming && (
          <button
            style={{
              ...primaryButtonStyle,
              background: dateStatus === 'today'
                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              transform: 'translateZ(0)',
              animation: dateStatus === 'today' ? 'pulse 2s infinite' : 'none'
            }}
            onClick={() => onRSVP(occasion)}
            onMouseEnter={(e) => {
              if (!isMobile) {
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                e.currentTarget.style.boxShadow = dateStatus === 'today'
                  ? '0 8px 20px rgba(245, 158, 11, 0.4)'
                  : '0 8px 20px rgba(102, 126, 234, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isMobile) {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
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
            {dateStatus === 'today' ? 'تأكيد الحضور اليوم' : ARABIC_LABELS.rsvp}
          </button>
        )}

        {onView && (
          <button
            style={secondaryButtonStyle}
            onClick={() => onView(occasion)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)';
            }}
          >
            {ARABIC_LABELS.view}
          </button>
        )}

        {onEdit && (
          <button
            style={secondaryButtonStyle}
            onClick={() => onEdit(occasion)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)';
            }}
          >
            {ARABIC_LABELS.edit}
          </button>
        )}
      </div>
    </div>
  );
};

export default memo(OccasionCard);