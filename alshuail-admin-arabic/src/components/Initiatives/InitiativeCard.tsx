import React from 'react';
import {
  HeartIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import { Initiative, InitiativeCategory } from './types';
import { ARABIC_LABELS, CURRENCY } from '../../constants/arabic';
import { formatArabicNumber, formatArabicCurrency, formatArabicDate, formatArabicPercentage, getUpcomingTimeArabic } from '../../utils/arabic';
import { useResponsive, getTouchStyles, getResponsiveSpacing } from '../../utils/responsive';
import { useAnimation, getHoverStyles, getPressStyles } from '../../utils/animations';

interface InitiativeCardProps {
  initiative: Initiative;
  onContribute?: (initiative: Initiative) => void;
  onView?: (initiative: Initiative) => void;
  onEdit?: (initiative: Initiative) => void;
}

const getCategoryColor = (category: InitiativeCategory): string => {
  switch (category) {
    case 'education': return '#3b82f6';
    case 'health': return '#ef4444';
    case 'charity': return '#10b981';
    case 'community': return '#f59e0b';
    case 'environment': return '#84cc16';
    case 'technology': return '#8b5cf6';
    case 'emergency': return '#dc2626';
    case 'infrastructure': return '#6b7280';
    default: return '#6b7280';
  }
};

const getCategoryLabel = (category: InitiativeCategory): string => {
  switch (category) {
    case 'education': return ARABIC_LABELS.education;
    case 'health': return ARABIC_LABELS.health;
    case 'charity': return ARABIC_LABELS.charity;
    case 'community': return ARABIC_LABELS.community;
    case 'environment': return ARABIC_LABELS.environment;
    case 'technology': return ARABIC_LABELS.technology;
    case 'emergency': return 'طوارئ';
    case 'infrastructure': return 'بنية تحتية';
    default: return category;
  }
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'active': return '#10b981';
    case 'completed': return '#3b82f6';
    case 'paused': return '#f59e0b';
    case 'cancelled': return '#ef4444';
    case 'draft': return '#6b7280';
    default: return '#6b7280';
  }
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'active': return ARABIC_LABELS.active;
    case 'completed': return ARABIC_LABELS.completed;
    case 'paused': return 'متوقف مؤقتاً';
    case 'cancelled': return ARABIC_LABELS.cancelled;
    case 'draft': return 'مسودة';
    default: return status;
  }
};

const isUrgentDeadline = (endDate?: Date): boolean => {
  if (!endDate) return false;
  const now = new Date();
  const diffTime = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 7 && diffDays > 0;
};

const isNearComplete = (progress: number): boolean => {
  return progress >= 90;
};

const getDaysLeft = (endDate?: Date): number | undefined => {
  if (!endDate) return undefined;
  const now = new Date();
  const diffTime = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};

const InitiativeCard: React.FC<InitiativeCardProps> = ({
  initiative,
  onContribute,
  onView,
  onEdit
}) => {
  const { isMobile, isTablet, breakpoint } = useResponsive();
  const { animationStyles } = useAnimation('fadeIn', true, { duration: 400 });

  const categoryColor = getCategoryColor(initiative.category);
  const statusColor = getStatusColor(initiative.status);
  const progressPercentage = Math.min((initiative.raisedAmount / initiative.targetAmount) * 100, 100);
  const remaining = initiative.targetAmount - initiative.raisedAmount;
  const daysLeft = getDaysLeft(initiative.endDate);
  const isDeadlineUrgent = isUrgentDeadline(initiative.endDate);
  const isAlmostComplete = isNearComplete(progressPercentage);

  const cardStyle: React.CSSProperties = {
    background: isAlmostComplete
      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(255, 255, 255, 0.1) 100%)'
      : isDeadlineUrgent
      ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(255, 255, 255, 0.1) 100%)'
      : 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    border: `2px solid ${isAlmostComplete ? '#10b981' : isDeadlineUrgent ? '#ef4444' : 'rgba(255, 255, 255, 0.2)'}`,
    borderRadius: isMobile ? '12px' : '16px',
    padding: getResponsiveSpacing(breakpoint, { xs: '16px', sm: '20px', md: '24px' }),
    marginBottom: isMobile ? '12px' : '16px',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: isAlmostComplete
      ? '0 8px 32px rgba(16, 185, 129, 0.2), 0 4px 16px rgba(0, 0, 0, 0.1)'
      : isDeadlineUrgent
      ? '0 8px 32px rgba(239, 68, 68, 0.2), 0 4px 16px rgba(0, 0, 0, 0.1)'
      : '0 8px 32px rgba(0, 0, 0, 0.1)',
    direction: 'rtl' as const,
    minHeight: isMobile ? 'auto' : '320px',
    ...animationStyles
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
    color: isAlmostComplete ? '#065f46' : isDeadlineUrgent ? '#991b1b' : '#1f2937',
    marginBottom: isMobile ? '6px' : '8px',
    lineHeight: '1.4',
    fontFamily: 'Cairo, Tajawal, sans-serif',
    letterSpacing: '-0.025em'
  };

  const categoryTagStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${categoryColor} 0%, ${categoryColor}cc 100%)`,
    color: 'white',
    padding: isMobile ? '6px 12px' : '4px 12px',
    borderRadius: '20px',
    fontSize: isMobile ? '13px' : '12px',
    fontWeight: '600',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    boxShadow: `0 2px 8px ${categoryColor}40`,
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
    animation: isDeadlineUrgent || isAlmostComplete ? 'pulse 2s infinite' : 'none'
  };

  const urgentBadgeStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
    color: 'white',
    padding: isMobile ? '6px 10px' : '4px 8px',
    borderRadius: '12px',
    fontSize: isMobile ? '12px' : '11px',
    fontWeight: '600',
    position: 'absolute' as const,
    top: isMobile ? '12px' : '16px',
    left: initiative.status !== 'draft' ? (isMobile ? '70px' : '80px') : (isMobile ? '12px' : '16px'),
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    zIndex: 10,
    animation: 'pulse 1.5s infinite',
    boxShadow: '0 2px 8px rgba(220, 38, 38, 0.4)'
  };

  const progressContainerStyle: React.CSSProperties = {
    marginBottom: '16px'
  };

  const progressBarStyle: React.CSSProperties = {
    width: '100%',
    height: isMobile ? '10px' : '8px',
    background: 'rgba(0, 0, 0, 0.1)',
    borderRadius: '6px',
    overflow: 'hidden',
    marginBottom: '8px',
    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)'
  };

  const progressFillStyle: React.CSSProperties = {
    height: '100%',
    background: isAlmostComplete
      ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
      : `linear-gradient(90deg, ${categoryColor} 0%, ${categoryColor}80 100%)`,
    borderRadius: '6px',
    width: `${progressPercentage}%`,
    transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: `0 0 10px ${isAlmostComplete ? '#10b981' : categoryColor}40`,
    position: 'relative',
    overflow: 'hidden'
  };

  const progressInfoStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '14px',
    color: '#6b7280'
  };

  const amountStyle: React.CSSProperties = {
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: '700',
    color: isAlmostComplete ? '#10b981' : categoryColor,
    marginBottom: '4px',
    fontFamily: 'Cairo, Tajawal, sans-serif'
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
    color: isDeadlineUrgent ? '#ef4444' : isAlmostComplete ? '#10b981' : undefined
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
    background: `linear-gradient(135deg, ${categoryColor} 0%, ${categoryColor}80 100%)`,
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

  const imageStyle: React.CSSProperties = {
    width: isMobile ? '60px' : '80px',
    height: isMobile ? '60px' : '80px',
    borderRadius: isMobile ? '8px' : '12px',
    objectFit: 'cover' as const,
    marginLeft: isMobile ? '0' : '16px',
    marginTop: isMobile ? '8px' : '0',
    order: isMobile ? 1 : 0
  };

  return (
    <div
      style={cardStyle}
      onMouseEnter={(e) => {
        if (!isMobile) {
          e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
          e.currentTarget.style.boxShadow = isAlmostComplete
            ? '0 16px 48px rgba(16, 185, 129, 0.3), 0 8px 24px rgba(0, 0, 0, 0.15)'
            : isDeadlineUrgent
            ? '0 16px 48px rgba(239, 68, 68, 0.3), 0 8px 24px rgba(0, 0, 0, 0.15)'
            : '0 16px 48px rgba(0, 0, 0, 0.2)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isMobile) {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.boxShadow = isAlmostComplete
            ? '0 8px 32px rgba(16, 185, 129, 0.2), 0 4px 16px rgba(0, 0, 0, 0.1)'
            : isDeadlineUrgent
            ? '0 8px 32px rgba(239, 68, 68, 0.2), 0 4px 16px rgba(0, 0, 0, 0.1)'
            : '0 8px 32px rgba(0, 0, 0, 0.1)';
        }
      }}
    >
      <div style={statusTagStyle}>
        {getStatusLabel(initiative.status)}
      </div>

      {initiative.isUrgent && (
        <div style={urgentBadgeStyle}>
          <ExclamationTriangleIcon style={{ width: '12px', height: '12px' }} />
          عاجل
        </div>
      )}

      <div style={headerStyle}>
        <div style={{ flex: 1 }}>
          <h3 style={titleStyle}>{initiative.title}</h3>
          <div style={categoryTagStyle}>
            <TagIcon style={iconStyle} />
            {getCategoryLabel(initiative.category)}
          </div>
        </div>
        {initiative.image && (
          <img
            src={initiative.image}
            alt={initiative.title}
            style={imageStyle}
          />
        )}
      </div>

      <p style={{
        color: '#6b7280',
        fontSize: '14px',
        lineHeight: '1.5',
        marginBottom: '16px'
      }}>
        {initiative.description}
      </p>

      <div style={progressContainerStyle}>
        <div style={progressBarStyle}>
          <div style={progressFillStyle} />
        </div>
        <div style={progressInfoStyle}>
          <div>
            <div style={amountStyle}>
              {formatArabicCurrency(initiative.raisedAmount)}
            </div>
            <div style={{ fontSize: isMobile ? '13px' : '12px' }}>
              من {formatArabicCurrency(initiative.targetAmount)}
            </div>
          </div>
          <div style={{ textAlign: 'left' as const }}>
            <div style={{
              fontWeight: '600',
              color: isAlmostComplete ? '#10b981' : '#1f2937',
              fontSize: isMobile ? '16px' : '14px'
            }}>
              {formatArabicPercentage(progressPercentage)}
            </div>
            <div style={{ fontSize: '12px' }}>
              مكتمل
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={infoItemStyle}>
          <CalendarIcon style={iconStyle} />
          <span>بدأت في {formatArabicDate(initiative.startDate)}</span>
        </div>

        {initiative.endDate && (
          <div style={{ ...infoItemStyle, color: isDeadlineUrgent ? '#ef4444' : '#6b7280' }}>
            <ClockIcon style={iconStyle} />
            <span style={{ fontWeight: isDeadlineUrgent ? '600' : 'normal' }}>
              {daysLeft !== undefined ? (
                daysLeft > 0 ? `${formatArabicNumber(daysLeft)} يوم متبقي` : 'انتهت المهلة'
              ) : (
                `حتى ${formatArabicDate(initiative.endDate!)}`
              )}
            </span>
          </div>
        )}

        {initiative.location && (
          <div style={infoItemStyle}>
            <MapPinIcon style={iconStyle} />
            <span>{initiative.location}</span>
          </div>
        )}

        {initiative.beneficiaries && (
          <div style={infoItemStyle}>
            <UsersIcon style={iconStyle} />
            <span>{initiative.beneficiaries}</span>
          </div>
        )}

        {remaining > 0 && (
          <div style={{
            ...infoItemStyle,
            color: isDeadlineUrgent ? '#ef4444' : '#6b7280',
            background: isMobile && remaining > 0 ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
            padding: isMobile && remaining > 0 ? '8px' : '2px 0',
            borderRadius: isMobile && remaining > 0 ? '8px' : '0',
            border: isMobile && remaining > 0 ? '1px solid rgba(59, 130, 246, 0.2)' : 'none'
          }}>
            <CurrencyDollarIcon style={iconStyle} />
            <span style={{ fontWeight: '600' }}>
              يحتاج {formatArabicCurrency(remaining)}
            </span>
          </div>
        )}
      </div>

      {initiative.tags.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {initiative.tags.map((tag, index) => (
              <span
                key={index}
                style={{
                  background: `${categoryColor}20`,
                  color: categoryColor,
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
        {onContribute && initiative.status === 'active' && remaining > 0 && (
          <button
            style={{
              ...primaryButtonStyle,
              background: isAlmostComplete
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : isDeadlineUrgent
                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                : `linear-gradient(135deg, ${categoryColor} 0%, ${categoryColor}80 100%)`,
              animation: isDeadlineUrgent ? 'pulse 2s infinite' : 'none',
              transform: 'translateZ(0)'
            }}
            onClick={() => onContribute(initiative)}
            onMouseEnter={(e) => {
              if (!isMobile) {
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                e.currentTarget.style.boxShadow = isAlmostComplete
                  ? '0 8px 20px rgba(16, 185, 129, 0.4)'
                  : isDeadlineUrgent
                  ? '0 8px 20px rgba(239, 68, 68, 0.4)'
                  : `0 8px 20px ${categoryColor}40`;
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
            <HeartIcon style={iconStyle} />
            {isAlmostComplete ? 'إكمال المبادرة' : isDeadlineUrgent ? 'ساهم الآن - عاجل!' : ARABIC_LABELS.contribute}
          </button>
        )}

        {onView && (
          <button
            style={secondaryButtonStyle}
            onClick={() => onView(initiative)}
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
            onClick={() => onEdit(initiative)}
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

export default InitiativeCard;