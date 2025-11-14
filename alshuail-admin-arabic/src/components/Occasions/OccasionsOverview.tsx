import React, { memo,  useState, useEffect } from 'react';
import {
  PlusIcon,
  CalendarDaysIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  UsersIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import OccasionCard from './OccasionCard';
import CreateOccasionModal from './CreateOccasionModal';
import RSVPModal from './RSVPModal';
import OccasionsCalendar from './OccasionsCalendar';
import { Occasion, OccasionFormData, RSVP, RSVPStatus, OccasionFilters, OccasionStatistics } from './types';
import { ARABIC_LABELS } from '../../constants/arabic';
import { apiService } from '../../services/api';
import { useResponsive } from '../../utils/responsive';
import { formatArabicNumber } from '../../utils/arabic';

import { logger } from '../../utils/logger';

// Mock data for testing
const mockOccasions: Occasion[] = [
  {
    id: '1',
    title: 'زفاف أحمد وفاطمة',
    description: 'حفل زفاف مبارك للعضوين أحمد محمد وفاطمة عبد الله. الدعوة عامة لجميع أفراد العائلة.',
    type: 'wedding',
    date: new Date('2024-03-15'),
    time: '19:00',
    location: 'قاعة الفردوس - الرياض',
    organizerId: 'user1',
    organizerName: 'محمد السعيد',
    status: 'published',
    maxAttendees: 200,
    rsvpDeadline: new Date('2024-03-10'),
    isPublic: true,
    tags: ['زفاف', 'احتفال', 'عائلة'],
    createdDate: new Date('2024-02-01'),
    updatedDate: new Date('2024-02-01')
  },
  {
    id: '2',
    title: 'تخرج سارة من الجامعة',
    description: 'احتفال بتخرج سارة عبد الرحمن من كلية الطب. حفل تكريم وعشاء.',
    type: 'graduation',
    date: new Date('2024-03-20'),
    time: '17:00',
    location: 'فندق الريتز كارلتون - جدة',
    organizerId: 'user2',
    organizerName: 'عبد الرحمن الأحمد',
    status: 'published',
    maxAttendees: 100,
    isPublic: false,
    tags: ['تخرج', 'تعليم', 'طب'],
    createdDate: new Date('2024-02-05'),
    updatedDate: new Date('2024-02-10')
  },
  {
    id: '3',
    title: 'اجتماع مجلس العائلة الشهري',
    description: 'الاجتماع الشهري لمجلس إدارة العائلة لمناقشة القضايا الإدارية والمالية.',
    type: 'meeting',
    date: new Date('2024-03-25'),
    time: '15:00',
    location: 'مكتب إدارة العائلة - الرياض',
    organizerId: 'user3',
    organizerName: 'خالد الشعيل',
    status: 'published',
    maxAttendees: 20,
    isPublic: false,
    tags: ['اجتماع', 'إدارة', 'مالية'],
    createdDate: new Date('2024-02-15'),
    updatedDate: new Date('2024-02-15')
  }
];

const mockRSVPs: RSVP[] = [
  {
    id: '1',
    occasionId: '1',
    memberId: 'user1',
    memberName: 'محمد السعيد',
    status: 'confirmed',
    responseDate: new Date('2024-02-05'),
    guestCount: 2
  },
  {
    id: '2',
    occasionId: '1',
    memberId: 'user2',
    memberName: 'فاطمة الأحمد',
    status: 'confirmed',
    responseDate: new Date('2024-02-08'),
    guestCount: 3,
    notes: 'سنحضر مع الأطفال'
  }
];

const OccasionsOverview: React.FC = () => {
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [rsvps, setRSVPs] = useState<RSVP[]>(mockRSVPs);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRSVPModal, setShowRSVPModal] = useState(false);
  const [selectedOccasion, setSelectedOccasion] = useState<Occasion | null>(null);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [filters, setFilters] = useState<OccasionFilters>({});
  const [searchTerm, setSearchTerm] = useState('');

  const { isMobile, isTablet, breakpoint } = useResponsive();

  // Debug logging for modal state
  useEffect(() => {
    logger.debug('showCreateModal state changed:', { showCreateModal });
  }, [showCreateModal]);

  // Load occasions from API
  const loadOccasions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to fetch from API, fallback to mock data if needed
      try {
        const response = await apiService.getOccasions();
        if (response.status === 'success' && response.data) {
          // Map API data to component format
          const mappedOccasions: Occasion[] = response.data.occasions.map((event: any) => ({
            id: event.id,
            title: event.title || event.title_en || 'مناسبة',
            description: event.description || event.description_en || '',
            type: event.event_type || 'general',
            date: new Date(event.start_date),
            time: event.start_time || '00:00',
            location: event.location || '',
            organizerId: event.organizer || 'unknown',
            organizerName: 'منظم المناسبة', // Would need to join with members table
            status: event.status === 'upcoming' ? 'published' : event.status,
            maxAttendees: event.max_attendees || undefined,
            isPublic: event.visibility === 'public',
            tags: event.tags || [],
            createdDate: new Date(event.created_at),
            updatedDate: new Date(event.updated_at)
          }));
          setOccasions(mappedOccasions);
        } else {
          throw new Error('فشل في جلب البيانات');
        }
      } catch (apiError) {
        logger.warn('API call failed, using mock data:', { apiError });
        setOccasions(mockOccasions);
        setError('تم استخدام البيانات التجريبية - تحقق من الاتصال بالخادم');
      }
    } catch (err) {
      logger.error('Error loading occasions:', { err });
      setOccasions(mockOccasions);
      setError('خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadOccasions();
  }, []);

  const filteredOccasions = occasions.filter(occasion => {
    if (searchTerm && !occasion.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !occasion.description.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (filters.type && occasion.type !== filters.type) {
      return false;
    }
    if (filters.status && occasion.status !== filters.status) {
      return false;
    }
    if (filters.dateRange) {
      const occasionDate = new Date(occasion.date);
      if (occasionDate < filters.dateRange.start || occasionDate > filters.dateRange.end) {
        return false;
      }
    }
    return true;
  });

  const statistics: OccasionStatistics = {
    totalOccasions: occasions.length,
    upcomingOccasions: occasions.filter(o => new Date(o.date) > new Date()).length,
    completedOccasions: occasions.filter(o => o.status === 'completed').length,
    totalAttendees: rsvps.filter(r => r.status === 'confirmed').reduce((sum, r) => sum + r.guestCount, 0),
    averageAttendance: rsvps.length > 0 ? Math.round(rsvps.filter(r => r.status === 'confirmed').length / occasions.length * 100) : 0,
    mostPopularType: 'wedding'
  };

  const handleCreateOccasion = async (formData: OccasionFormData) => {
    setLoading(true);
    try {
      // Prepare API data
      const occasionData = {
        title: formData.title,
        description: formData.description,
        start_date: formData.date,
        start_time: formData.time,
        location: formData.location,
        event_type: formData.type,
        max_attendees: formData.maxAttendees,
        status: 'completed', // Use status that works with DB
        visibility: formData.isPublic ? 'public' : 'private',
        tags: formData.tags || []
      };

      try {
        const response = await apiService.createOccasion(occasionData);
        if (response.status === 'success' && response.data) {
          // Reload occasions to get fresh data
          await loadOccasions();
          setShowCreateModal(false);
        } else {
          throw new Error(response.message_ar || 'فشل في إنشاء المناسبة');
        }
      } catch (apiError) {
        logger.warn('API creation failed, adding locally:', { apiError });

        // Fallback to local addition
        const newOccasion: Occasion = {
          id: Date.now().toString(),
          ...formData,
          date: new Date(formData.date),
          organizerId: 'current_user',
          organizerName: 'المستخدم الحالي',
          status: 'published',
          rsvpDeadline: formData.rsvpDeadline ? new Date(formData.rsvpDeadline) : undefined,
          createdDate: new Date(),
          updatedDate: new Date()
        };

        setOccasions(prev => [newOccasion, ...prev]);
        setShowCreateModal(false);
        setError('تم إضافة المناسبة محلياً - تحقق من الاتصال بالخادم');
      }
    } catch (error) {
      logger.error('Error creating occasion:', { error });
      setError('خطأ في إنشاء المناسبة');
    } finally {
      setLoading(false);
    }
  };

  const handleRSVP = async (status: RSVPStatus, guestCount: number, notes?: string) => {
    if (!selectedOccasion) return;

    setLoading(true);
    try {
      // API call would go here
      const newRSVP: RSVP = {
        id: Date.now().toString(),
        occasionId: selectedOccasion.id,
        memberId: 'current_user',
        memberName: 'المستخدم الحالي',
        status,
        responseDate: new Date(),
        guestCount,
        notes
      };

      setRSVPs(prev => {
        const existing = prev.find(r => r.occasionId === selectedOccasion.id && r.memberId === 'current_user');
        if (existing) {
          return prev.map(r => r.id === existing.id ? { ...r, status, guestCount, notes } : r);
        }
        return [...prev, newRSVP];
      });

      setShowRSVPModal(false);
    } catch (error) {
      logger.error('Error submitting RSVP:', { error });
    } finally {
      setLoading(false);
    }
  };

  const containerStyle: React.CSSProperties = {
    padding: '24px',
    direction: 'rtl' as const,
    minHeight: '100vh'
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1f2937',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  };

  const actionsStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap'
  };

  const buttonStyle: React.CSSProperties = {
    padding: '12px 20px',
    borderRadius: '12px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
  };

  const secondaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: 'rgba(255, 255, 255, 0.8)',
    color: '#374151',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    backdropFilter: 'blur(10px)'
  };

  const statsGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px',
    marginBottom: '32px'
  };

  const statCardStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '16px',
    padding: '24px',
    textAlign: 'center' as const,
    transition: 'all 0.3s ease'
  };

  const statValueStyle: React.CSSProperties = {
    fontSize: '32px',
    fontWeight: '700',
    marginBottom: '8px'
  };

  const statLabelStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500'
  };

  const controlsStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    gap: '16px',
    flexWrap: 'wrap'
  };

  const searchStyle: React.CSSProperties = {
    position: 'relative',
    flex: 1,
    maxWidth: '400px'
  };

  const searchInputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px 12px 44px',
    border: '1px solid rgba(0, 0, 0, 0.2)',
    borderRadius: '12px',
    fontSize: '14px',
    background: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(10px)',
    outline: 'none',
    transition: 'all 0.2s ease',
    direction: 'rtl' as const
  };

  const searchIconStyle: React.CSSProperties = {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#6b7280'
  };

  const viewToggleStyle: React.CSSProperties = {
    display: 'flex',
    background: 'rgba(255, 255, 255, 0.8)',
    borderRadius: '12px',
    padding: '4px',
    border: '1px solid rgba(0, 0, 0, 0.1)'
  };

  const toggleButtonStyle: React.CSSProperties = {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    background: 'transparent'
  };

  const activeToggleStyle: React.CSSProperties = {
    ...toggleButtonStyle,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white'
  };

  const contentStyle: React.CSSProperties = {
    marginTop: '24px'
  };

  const occasionsGridStyle: React.CSSProperties = {
    display: 'grid',
    gap: isMobile ? '12px' : '16px',
    gridTemplateColumns: '1fr'
  };

  const emptyStateStyle: React.CSSProperties = {
    textAlign: 'center' as const,
    padding: '48px 24px',
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '16px',
    color: '#6b7280'
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>
          <CalendarDaysIcon style={{ width: '32px', height: '32px' }} />
          {ARABIC_LABELS.occasionsOverview}
        </h1>

        <div style={actionsStyle}>
          <button
            style={primaryButtonStyle}
            onClick={() => {
              logger.debug('Create button clicked');
              setShowCreateModal(true);
            }}
            onMouseEnter={(e) => {
              if (!isMobile) {
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isMobile) {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
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
            <PlusIcon style={{ width: '20px', height: '20px' }} />
            {ARABIC_LABELS.createOccasion}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          backgroundColor: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '16px',
          color: '#dc2626',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>⚠️</span>
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: '#dc2626',
              cursor: 'pointer',
              fontSize: '18px'
            }}
          >
            ×
          </button>
        </div>
      )}

      <div style={statsGridStyle}>
        <div
          style={{
            ...statCardStyle,
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <ChartBarIcon style={{ width: '32px', height: '32px', color: '#667eea', margin: '0 auto 16px' }} />
          <div style={{ ...statValueStyle, color: '#667eea' }}>
            {formatArabicNumber(statistics.totalOccasions)}
          </div>
          <div style={statLabelStyle}>إجمالي المناسبات</div>
        </div>

        <div
          style={{
            ...statCardStyle,
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <ClockIcon style={{ width: '32px', height: '32px', color: '#10b981', margin: '0 auto 16px' }} />
          <div style={{ ...statValueStyle, color: '#10b981' }}>
            {formatArabicNumber(statistics.upcomingOccasions)}
          </div>
          <div style={statLabelStyle}>المناسبات القادمة</div>
        </div>

        <div
          style={{
            ...statCardStyle,
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <CheckCircleIcon style={{ width: '32px', height: '32px', color: '#3b82f6', margin: '0 auto 16px' }} />
          <div style={{ ...statValueStyle, color: '#3b82f6' }}>
            {formatArabicNumber(statistics.completedOccasions)}
          </div>
          <div style={statLabelStyle}>المناسبات المكتملة</div>
        </div>

        <div
          style={{
            ...statCardStyle,
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.1) 100%)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <UsersIcon style={{ width: '32px', height: '32px', color: '#f59e0b', margin: '0 auto 16px' }} />
          <div style={{ ...statValueStyle, color: '#f59e0b' }}>
            {formatArabicNumber(statistics.totalAttendees)}
          </div>
          <div style={statLabelStyle}>إجمالي الحضور</div>
        </div>
      </div>

      <div style={controlsStyle}>
        <div style={searchStyle}>
          <MagnifyingGlassIcon style={{ ...searchIconStyle, width: '20px', height: '20px' }} />
          <input
            type="text"
            style={searchInputStyle}
            placeholder="البحث في المناسبات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={viewToggleStyle}>
          <button
            style={view === 'list' ? activeToggleStyle : toggleButtonStyle}
            onClick={() => setView('list')}
          >
            قائمة
          </button>
          <button
            style={view === 'calendar' ? activeToggleStyle : toggleButtonStyle}
            onClick={() => setView('calendar')}
          >
            تقويم
          </button>
        </div>

        <button style={secondaryButtonStyle}>
          <FunnelIcon style={{ width: '20px', height: '20px' }} />
          {ARABIC_LABELS.filter}
        </button>
      </div>

      <div style={contentStyle}>
        {view === 'list' ? (
          <div style={occasionsGridStyle}>
            {filteredOccasions.length > 0 ? (
              filteredOccasions.map((occasion) => (
                <OccasionCard
                  key={occasion.id}
                  occasion={occasion}
                  onEdit={(occasion) => {
                    setSelectedOccasion(occasion);
                    setShowCreateModal(true);
                  }}
                  onView={(occasion) => {
                    setSelectedOccasion(occasion);
                    setShowRSVPModal(true);
                  }}
                  onRSVP={(occasion) => {
                    setSelectedOccasion(occasion);
                    setShowRSVPModal(true);
                  }}
                />
              ))
            ) : (
              <div style={emptyStateStyle}>
                <CalendarDaysIcon style={{ width: '48px', height: '48px', margin: '0 auto 16px', opacity: 0.5 }} />
                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>لا توجد مناسبات</h3>
                <p style={{ margin: 0, fontSize: '14px' }}>
                  {searchTerm ? 'لم يتم العثور على مناسبات تطابق البحث' : 'لم يتم إنشاء أي مناسبات بعد'}
                </p>
              </div>
            )}
          </div>
        ) : (
          <OccasionsCalendar
            occasions={filteredOccasions}
            onEventClick={(occasion) => {
              setSelectedOccasion(occasion);
              setShowRSVPModal(true);
            }}
          />
        )}
      </div>

      {showCreateModal && (
        <CreateOccasionModal
          isOpen={showCreateModal}
          onClose={() => {
            logger.debug('Modal closing');
            setShowCreateModal(false);
            setSelectedOccasion(null);
          }}
          onSubmit={handleCreateOccasion}
          isLoading={loading}
        />
      )}

      {showRSVPModal && selectedOccasion && (
        <RSVPModal
          isOpen={showRSVPModal}
          onClose={() => {
            setShowRSVPModal(false);
            setSelectedOccasion(null);
          }}
          occasion={selectedOccasion}
          allRSVPs={rsvps.filter(r => r.occasionId === selectedOccasion.id)}
          onSubmitRSVP={handleRSVP}
          isLoading={loading}
          isManagementMode={false}
        />
      )}
    </div>
  );
};

export default memo(OccasionsOverview);