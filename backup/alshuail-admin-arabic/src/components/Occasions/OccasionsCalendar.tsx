import React, { useState, useMemo } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  ClockIcon,
  MapPinIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import { CalendarEvent, Occasion } from './types';
import { ARABIC_LABELS, HIJRI_MONTHS } from '../../constants/arabic';

interface OccasionsCalendarProps {
  occasions: Occasion[];
  onDateSelect?: (date: Date) => void;
  onEventClick?: (occasion: Occasion) => void;
  selectedDate?: Date;
}

const OccasionsCalendar: React.FC<OccasionsCalendarProps> = ({
  occasions,
  onDateSelect,
  onEventClick,
  selectedDate
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  const formatHijriDate = (date: Date): string => {
    // Simple Hijri date conversion (approximate)
    const hijriYear = Math.floor((date.getFullYear() - 622) * 1.0307) + 1;
    const hijriMonth = HIJRI_MONTHS[date.getMonth()];
    return `${date.getDate()} ${hijriMonth} ${hijriYear}`;
  };

  const formatGregorianDate = (date: Date): string => {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  const getMonthData = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Previous month's days
    const prevMonth = new Date(year, month - 1, 0);
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonth.getDate() - i),
        isCurrentMonth: false
      });
    }

    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        date: new Date(year, month, day),
        isCurrentMonth: true
      });
    }

    // Next month's days to fill the grid
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        date: new Date(year, month + 1, day),
        isCurrentMonth: false
      });
    }

    return days;
  };

  const getEventsForDate = (date: Date): Occasion[] => {
    return occasions.filter(occasion => {
      const occasionDate = new Date(occasion.date);
      return (
        occasionDate.getFullYear() === date.getFullYear() &&
        occasionDate.getMonth() === date.getMonth() &&
        occasionDate.getDate() === date.getDate()
      );
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  const isSelected = (date: Date): boolean => {
    if (!selectedDate) return false;
    return (
      date.getFullYear() === selectedDate.getFullYear() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getDate() === selectedDate.getDate()
    );
  };

  const monthData = getMonthData();

  const calendarStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    direction: 'rtl' as const,
    minHeight: '600px'
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
    margin: 0
  };

  const navigationStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  const navButtonStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.8)',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    borderRadius: '8px',
    padding: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const monthYearStyle: React.CSSProperties = {
    textAlign: 'center' as const,
    margin: '0 16px'
  };

  const weekHeaderStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '1px',
    marginBottom: '8px'
  };

  const weekDayStyle: React.CSSProperties = {
    textAlign: 'center' as const,
    padding: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#6b7280',
    background: 'rgba(255, 255, 255, 0.5)',
    borderRadius: '8px'
  };

  const calendarGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '1px'
  };

  const dayCellStyle: React.CSSProperties = {
    minHeight: '80px',
    padding: '4px',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.3)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column'
  };

  const dayNumberStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: '600',
    textAlign: 'center' as const,
    marginBottom: '4px',
    padding: '4px'
  };

  const eventDotStyle: React.CSSProperties = {
    width: '6px',
    height: '6px',
    borderRadius: '3px',
    margin: '1px'
  };

  const eventItemStyle: React.CSSProperties = {
    fontSize: '10px',
    padding: '2px 4px',
    borderRadius: '4px',
    marginBottom: '2px',
    color: 'white',
    fontWeight: '500',
    cursor: 'pointer',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  };

  const todayButtonStyle: React.CSSProperties = {
    ...navButtonStyle,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    fontWeight: '600',
    fontSize: '14px',
    padding: '8px 16px'
  };

  const viewModeButtonStyle: React.CSSProperties = {
    ...navButtonStyle,
    fontSize: '14px',
    fontWeight: '600',
    padding: '8px 12px'
  };

  const sidebarStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.6)',
    borderRadius: '12px',
    padding: '16px',
    marginTop: '16px'
  };

  const eventListStyle: React.CSSProperties = {
    maxHeight: '200px',
    overflowY: 'auto'
  };

  const eventCardStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.8)',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  };

  const weekDays = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س']; // Arabic abbreviated days

  const monthName = new Intl.DateTimeFormat('ar-SA', { month: 'long' }).format(currentDate);
  const year = currentDate.getFullYear();

  const upcomingEvents = occasions
    .filter(occasion => new Date(occasion.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  return (
    <div style={calendarStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>
          <CalendarDaysIcon style={{ width: '28px', height: '28px', display: 'inline', marginLeft: '8px' }} />
          {ARABIC_LABELS.occasionCalendar}
        </h2>

        <div style={navigationStyle}>
          <button
            style={viewModeButtonStyle}
            onClick={() => setViewMode(viewMode === 'month' ? 'week' : 'month')}
          >
            {viewMode === 'month' ? 'عرض الأسبوع' : 'عرض الشهر'}
          </button>

          <button style={todayButtonStyle} onClick={goToToday}>
            {ARABIC_LABELS.today}
          </button>

          <button
            style={navButtonStyle}
            onClick={() => navigateMonth('next')}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 1)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <ChevronLeftIcon style={{ width: '20px', height: '20px' }} />
          </button>

          <div style={monthYearStyle}>
            <div style={{ fontSize: '18px', fontWeight: '700' }}>{monthName} {year}</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              {formatHijriDate(currentDate)}
            </div>
          </div>

          <button
            style={navButtonStyle}
            onClick={() => navigateMonth('prev')}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 1)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <ChevronRightIcon style={{ width: '20px', height: '20px' }} />
          </button>
        </div>
      </div>

      <div style={weekHeaderStyle}>
        {weekDays.map((day, index) => (
          <div key={index} style={weekDayStyle}>
            {day}
          </div>
        ))}
      </div>

      <div style={calendarGridStyle}>
        {monthData.map((dayData, index) => {
          const dayEvents = getEventsForDate(dayData.date);
          const isCurrentMonth = dayData.isCurrentMonth;
          const isTodayDate = isToday(dayData.date);
          const isSelectedDate = isSelected(dayData.date);

          return (
            <div
              key={index}
              style={{
                ...dayContainerStyle,
                opacity: isCurrentMonth ? 1 : 0.5,
                background: isTodayDate
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : isSelectedDate
                  ? 'rgba(102, 126, 234, 0.2)'
                  : 'rgba(255, 255, 255, 0.3)',
                color: isTodayDate ? 'white' : '#1f2937'
              }}
              onClick={() => onDateSelect?.(dayData.date)}
              onMouseEnter={(e) => {
                if (!isTodayDate && !isSelectedDate) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.6)';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isTodayDate && !isSelectedDate) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                  e.currentTarget.style.transform = 'scale(1)';
                }
              }}
            >
              <div style={dayNumberStyle}>
                {dayData.date.getDate()}
              </div>

              <div style={{ flex: 1, overflow: 'hidden' }}>
                {dayEvents.slice(0, 3).map((occasion, eventIndex) => (
                  <div
                    key={eventIndex}
                    style={{
                      ...eventItemStyle,
                      background: getOccasionTypeColor(occasion.type)
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick?.(occasion);
                    }}
                    title={occasion.title}
                  >
                    {occasion.title}
                  </div>
                ))}

                {dayEvents.length > 3 && (
                  <div style={{
                    fontSize: '9px',
                    color: '#6b7280',
                    textAlign: 'center' as const,
                    fontWeight: '600'
                  }}>
                    +{dayEvents.length - 3} أخرى
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={sidebarStyle}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>
          المناسبات القادمة
        </h4>

        <div style={eventListStyle}>
          {upcomingEvents.map((occasion) => (
            <div
              key={occasion.id}
              style={eventCardStyle}
              onClick={() => onEventClick?.(occasion)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 1)';
                e.currentTarget.style.transform = 'translateX(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)';
                e.currentTarget.style.transform = 'translateX(0)';
              }}
            >
              <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>
                {occasion.title}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <CalendarDaysIcon style={{ width: '12px', height: '12px' }} />
                  {new Intl.DateTimeFormat('ar-SA', { month: 'short', day: 'numeric' }).format(occasion.date)}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <ClockIcon style={{ width: '12px', height: '12px' }} />
                  {occasion.time}
                </span>
              </div>
            </div>
          ))}

          {upcomingEvents.length === 0 && (
            <div style={{
              textAlign: 'center' as const,
              color: '#6b7280',
              fontSize: '14px',
              padding: '20px'
            }}>
              لا توجد مناسبات قادمة
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper function to get occasion type color
const getOccasionTypeColor = (type: string): string => {
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

const dayContainerStyle: React.CSSProperties = {
  minHeight: '80px',
  padding: '4px',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column'
};

export default OccasionsCalendar;