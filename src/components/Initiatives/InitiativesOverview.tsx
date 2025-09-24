import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  LightBulbIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  UsersIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import InitiativeCard from './InitiativeCard';
import ContributionModal from './ContributionModal';
import InitiativeCategories from './InitiativeCategories';
import InitiativeProgress from './InitiativeProgress';
import {
  Initiative,
  Contribution,
  ContributionFormData,
  InitiativeCategory,
  InitiativeFilters,
  InitiativeStatistics
} from './types';
import { ARABIC_LABELS, CURRENCY } from '../../constants/arabic';
import { formatArabicNumber, formatArabicCurrency, formatArabicPercentage } from '../../utils/arabic';
import { apiService } from '../../services/api';
import { useResponsive, getTouchStyles, getResponsiveGridStyles, getResponsiveSpacing } from '../../utils/responsive';
import { useStaggeredAnimation, injectAnimationKeyframes } from '../../utils/animations';

// Mock data for testing
const mockInitiatives: Initiative[] = [
  {
    id: '1',
    title: 'مشروع تعليم الأطفال المحتاجين',
    description: 'برنامج شامل لتعليم وتدريب الأطفال من الأسر المحتاجة وتوفير المستلزمات التعليمية والدعم الأكاديمي.',
    category: 'education',
    targetAmount: 100000,
    raisedAmount: 75000,
    startDate: new Date('2024-01-15'),
    endDate: new Date('2024-06-15'),
    status: 'active',
    organizerId: 'user1',
    organizerName: 'أحمد السعيد',
    tags: ['تعليم', 'أطفال', 'دعم'],
    isUrgent: false,
    beneficiaries: '50 طفل من الأسر المحتاجة',
    location: 'الرياض والمنطقة الشرقية',
    createdDate: new Date('2024-01-01'),
    updatedDate: new Date('2024-02-01')
  },
  {
    id: '2',
    title: 'حملة العلاج الطبي العاجل',
    description: 'توفير العلاج الطبي العاجل للمرضى غير القادرين على تحمل تكاليف العلاج في المستشفيات الخاصة.',
    category: 'health',
    targetAmount: 200000,
    raisedAmount: 45000,
    startDate: new Date('2024-02-01'),
    endDate: new Date('2024-05-01'),
    status: 'active',
    organizerId: 'user2',
    organizerName: 'فاطمة الأحمد',
    tags: ['صحة', 'علاج', 'طوارئ'],
    isUrgent: true,
    beneficiaries: 'المرضى المحتاجين',
    location: 'مستشفيات المملكة',
    createdDate: new Date('2024-01-20'),
    updatedDate: new Date('2024-02-10')
  },
  {
    id: '3',
    title: 'بناء مركز تقني للشباب',
    description: 'إنشاء مركز تقني متطور لتدريب الشباب على أحدث التقنيات والبرمجة وريادة الأعمال.',
    category: 'technology',
    targetAmount: 500000,
    raisedAmount: 320000,
    startDate: new Date('2024-01-01'),
    status: 'active',
    organizerId: 'user3',
    organizerName: 'خالد المطيري',
    tags: ['تقنية', 'شباب', 'تدريب'],
    isUrgent: false,
    beneficiaries: '100 شاب وشابة',
    location: 'جدة',
    createdDate: new Date('2023-12-15'),
    updatedDate: new Date('2024-01-30')
  }
];

const mockContributions: Contribution[] = [
  {
    id: '1',
    initiativeId: '1',
    memberId: 'user1',
    memberName: 'محمد السعيد',
    amount: 5000,
    paymentMethod: 'bank_transfer',
    status: 'approved',
    contributionDate: new Date('2024-02-01'),
    isAnonymous: false
  },
  {
    id: '2',
    initiativeId: '1',
    memberId: 'user2',
    memberName: 'عائشة الزهراني',
    amount: 2000,
    paymentMethod: 'cash',
    status: 'approved',
    contributionDate: new Date('2024-02-05'),
    isAnonymous: false
  },
  {
    id: '3',
    initiativeId: '2',
    memberId: 'user3',
    memberName: 'مساهم مجهول',
    amount: 10000,
    paymentMethod: 'digital_wallet',
    status: 'approved',
    contributionDate: new Date('2024-02-08'),
    isAnonymous: true
  }
];

const InitiativesOverview: React.FC = () => {
  const { isMobile, isTablet, breakpoint } = useResponsive();
  const { getItemStyles } = useStaggeredAnimation(4, 'fadeIn', 150);

  React.useEffect(() => {
    injectAnimationKeyframes();
  }, []);

  const [initiatives, setInitiatives] = useState<Initiative[]>(mockInitiatives);
  const [contributions, setContributions] = useState<Contribution[]>(mockContributions);
  const [loading, setLoading] = useState(false);
  const [showContributionModal, setShowContributionModal] = useState(false);
  const [selectedInitiative, setSelectedInitiative] = useState<Initiative | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<InitiativeCategory | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const filteredInitiatives = initiatives.filter(initiative => {
    if (searchTerm && !initiative.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !initiative.description.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (selectedCategory && initiative.category !== selectedCategory) {
      return false;
    }
    return true;
  });

  const categoryCounts = initiatives.reduce((acc, initiative) => {
    acc[initiative.category] = (acc[initiative.category] || 0) + 1;
    return acc;
  }, {} as Record<InitiativeCategory, number>);

  const statistics: InitiativeStatistics = {
    totalInitiatives: initiatives.length,
    activeInitiatives: initiatives.filter(i => i.status === 'active').length,
    completedInitiatives: initiatives.filter(i => i.status === 'completed').length,
    totalRaised: initiatives.reduce((sum, i) => sum + i.raisedAmount, 0),
    totalContributions: contributions.filter(c => c.status === 'approved').length,
    averageContribution: contributions.length > 0 ?
      contributions.filter(c => c.status === 'approved').reduce((sum, c) => sum + c.amount, 0) / contributions.filter(c => c.status === 'approved').length : 0,
    mostPopularCategory: 'education',
    successRate: initiatives.length > 0 ?
      Math.round((initiatives.filter(i => i.raisedAmount >= i.targetAmount).length / initiatives.length) * 100) : 0
  };

  const handleContribute = async (formData: ContributionFormData) => {
    if (!selectedInitiative) return;

    setLoading(true);
    try {
      // API call would go here
      const newContribution: Contribution = {
        id: Date.now().toString(),
        initiativeId: selectedInitiative.id,
        memberId: 'current_user',
        memberName: formData.isAnonymous ? 'مساهم مجهول' : 'المستخدم الحالي',
        amount: formData.amount,
        paymentMethod: formData.paymentMethod,
        status: 'pending',
        contributionDate: new Date(),
        notes: formData.notes,
        isAnonymous: formData.isAnonymous
      };

      setContributions(prev => [...prev, newContribution]);

      // Update initiative raised amount
      setInitiatives(prev => prev.map(initiative =>
        initiative.id === selectedInitiative.id ?
          { ...initiative, raisedAmount: initiative.raisedAmount + formData.amount } :
          initiative
      ));

      setShowContributionModal(false);
      setSelectedInitiative(null);
    } catch (error) {
      console.error('Error creating contribution:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number): string => {
    return formatArabicNumber(amount);
  };

  const containerStyle: React.CSSProperties = {
    padding: getResponsiveSpacing(breakpoint, { xs: '16px', sm: '20px', md: '24px' }),
    direction: 'rtl' as const,
    minHeight: '100vh',
    maxWidth: '100%',
    overflow: 'hidden'
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    justifyContent: 'space-between',
    alignItems: isMobile ? 'flex-start' : 'center',
    marginBottom: isMobile ? '20px' : '24px',
    gap: isMobile ? '12px' : '16px'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: isMobile ? '24px' : '28px',
    fontWeight: '700',
    color: '#1f2937',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: isMobile ? '8px' : '12px',
    fontFamily: 'Cairo, Tajawal, sans-serif',
    letterSpacing: '-0.025em'
  };

  const actionsStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: isMobile ? '8px' : '12px',
    flexWrap: isMobile ? 'wrap' : 'nowrap',
    width: isMobile ? '100%' : 'auto'
  };

  const buttonStyle: React.CSSProperties = {
    ...getTouchStyles(isMobile),
    borderRadius: '12px',
    border: 'none',
    fontSize: isMobile ? '15px' : '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    userSelect: 'none' as const,
    WebkitTapHighlightColor: 'transparent',
    flex: isMobile ? '1' : 'none'
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
    ...getResponsiveGridStyles(breakpoint, { xs: 1, sm: 2, md: 2, lg: 4 }),
    gap: isMobile ? '12px' : '16px',
    marginBottom: isMobile ? '24px' : '32px'
  };

  const statCardStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: isMobile ? '12px' : '16px',
    padding: isMobile ? '16px' : '24px',
    textAlign: 'center' as const,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden'
  };

  const statValueStyle: React.CSSProperties = {
    fontSize: isMobile ? '28px' : '32px',
    fontWeight: '700',
    marginBottom: isMobile ? '6px' : '8px',
    fontFamily: 'Cairo, Tajawal, sans-serif',
    letterSpacing: '-0.02em'
  };

  const statLabelStyle: React.CSSProperties = {
    fontSize: isMobile ? '13px' : '14px',
    color: '#6b7280',
    fontWeight: '500',
    lineHeight: '1.4'
  };

  const controlsStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    justifyContent: 'space-between',
    alignItems: isMobile ? 'stretch' : 'center',
    marginBottom: isMobile ? '20px' : '24px',
    gap: isMobile ? '12px' : '16px'
  };

  const searchStyle: React.CSSProperties = {
    position: 'relative',
    flex: isMobile ? 'none' : 1,
    width: isMobile ? '100%' : 'auto',
    maxWidth: isMobile ? '100%' : '400px',
    order: isMobile ? -1 : 0
  };

  const searchInputStyle: React.CSSProperties = {
    width: '100%',
    padding: isMobile ? '14px 16px 14px 48px' : '12px 16px 12px 44px',
    border: '1px solid rgba(0, 0, 0, 0.2)',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '14px',
    background: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(10px)',
    outline: 'none',
    transition: 'all 0.3s ease',
    direction: 'rtl' as const,
    fontFamily: 'Cairo, Tajawal, sans-serif'
  };

  const searchIconStyle: React.CSSProperties = {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#6b7280'
  };

  const contentStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : isTablet ? '250px 1fr' : '300px 1fr',
    gap: isMobile ? '16px' : '24px',
    alignItems: 'start'
  };

  const sidebarStyle: React.CSSProperties = {
    position: isMobile ? 'static' : 'sticky' as const,
    top: isMobile ? 'auto' : '24px',
    order: isMobile ? 1 : 0
  };

  const mainContentStyle: React.CSSProperties = {
    minHeight: '400px'
  };

  const initiativesGridStyle: React.CSSProperties = {
    display: 'grid',
    gap: isMobile ? '12px' : '16px',
    gridTemplateColumns: '1fr',
    order: isMobile ? 0 : 1
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
          <LightBulbIcon style={{ width: '32px', height: '32px' }} />
          {ARABIC_LABELS.initiativesOverview}
        </h1>

        <div style={actionsStyle}>
          <button
            style={primaryButtonStyle}
            onClick={() => {/* Handle create initiative */}}
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
            {ARABIC_LABELS.createInitiative}
          </button>
        </div>
      </div>

      <div style={statsGridStyle}>
        <div
          style={{
            ...statCardStyle,
            ...getItemStyles(0),
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)'
          }}
          onMouseEnter={(e) => {
            if (!isMobile) {
              e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(102, 126, 234, 0.2)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isMobile) {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        >
          <ChartBarIcon style={{
            width: isMobile ? '28px' : '32px',
            height: isMobile ? '28px' : '32px',
            color: '#667eea',
            margin: `0 auto ${isMobile ? '12px' : '16px'}`
          }} />
          <div style={{ ...statValueStyle, color: '#667eea' }}>
            {formatArabicNumber(statistics.totalInitiatives)}
          </div>
          <div style={statLabelStyle}>إجمالي المبادرات</div>
        </div>

        <div
          style={{
            ...statCardStyle,
            ...getItemStyles(1),
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)'
          }}
          onMouseEnter={(e) => {
            if (!isMobile) {
              e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(16, 185, 129, 0.2)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isMobile) {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        >
          <ClockIcon style={{
            width: isMobile ? '28px' : '32px',
            height: isMobile ? '28px' : '32px',
            color: '#10b981',
            margin: `0 auto ${isMobile ? '12px' : '16px'}`
          }} />
          <div style={{ ...statValueStyle, color: '#10b981' }}>
            {formatArabicNumber(statistics.activeInitiatives)}
          </div>
          <div style={statLabelStyle}>المبادرات النشطة</div>
        </div>

        <div
          style={{
            ...statCardStyle,
            ...getItemStyles(2),
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.1) 100%)'
          }}
          onMouseEnter={(e) => {
            if (!isMobile) {
              e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(245, 158, 11, 0.2)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isMobile) {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        >
          <CurrencyDollarIcon style={{
            width: isMobile ? '28px' : '32px',
            height: isMobile ? '28px' : '32px',
            color: '#f59e0b',
            margin: `0 auto ${isMobile ? '12px' : '16px'}`
          }} />
          <div style={{ ...statValueStyle, color: '#f59e0b' }}>
            {formatArabicCurrency(statistics.totalRaised)}
          </div>
          <div style={statLabelStyle}>إجمالي المجموع</div>
        </div>

        <div
          style={{
            ...statCardStyle,
            ...getItemStyles(3),
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%)'
          }}
          onMouseEnter={(e) => {
            if (!isMobile) {
              e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(59, 130, 246, 0.2)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isMobile) {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        >
          <UsersIcon style={{
            width: isMobile ? '28px' : '32px',
            height: isMobile ? '28px' : '32px',
            color: '#3b82f6',
            margin: `0 auto ${isMobile ? '12px' : '16px'}`
          }} />
          <div style={{ ...statValueStyle, color: '#3b82f6' }}>
            {formatArabicNumber(statistics.totalContributions)}
          </div>
          <div style={statLabelStyle}>إجمالي المساهمات</div>
        </div>
      </div>

      <div style={controlsStyle}>
        <div style={searchStyle}>
          <MagnifyingGlassIcon style={{ ...searchIconStyle, width: '20px', height: '20px' }} />
          <input
            type="text"
            style={searchInputStyle}
            placeholder="البحث في المبادرات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button
          style={secondaryButtonStyle}
          onClick={() => setShowFilters(!showFilters)}
        >
          <FunnelIcon style={{ width: '20px', height: '20px' }} />
          {ARABIC_LABELS.filter}
        </button>
      </div>

      <div style={contentStyle}>
        <div style={sidebarStyle}>
          <InitiativeCategories
            selectedCategory={selectedCategory}
            onCategorySelect={setSelectedCategory}
            categoryCounts={categoryCounts}
          />

          {selectedInitiative && (
            <InitiativeProgress
              initiative={selectedInitiative}
              contributions={contributions.filter(c => c.initiativeId === selectedInitiative.id)}
            />
          )}
        </div>

        <div style={mainContentStyle}>
          <div style={initiativesGridStyle}>
            {filteredInitiatives.length > 0 ? (
              filteredInitiatives.map((initiative) => (
                <InitiativeCard
                  key={initiative.id}
                  initiative={initiative}
                  onContribute={(initiative) => {
                    setSelectedInitiative(initiative);
                    setShowContributionModal(true);
                  }}
                  onView={(initiative) => {
                    setSelectedInitiative(initiative);
                  }}
                  onEdit={(initiative) => {
                    // Handle edit
                  }}
                />
              ))
            ) : (
              <div style={emptyStateStyle}>
                <LightBulbIcon style={{ width: '48px', height: '48px', margin: '0 auto 16px', opacity: 0.5 }} />
                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>لا توجد مبادرات</h3>
                <p style={{ margin: 0, fontSize: '14px' }}>
                  {searchTerm || selectedCategory ? 'لم يتم العثور على مبادرات تطابق البحث' : 'لم يتم إنشاء أي مبادرات بعد'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showContributionModal && selectedInitiative && (
        <ContributionModal
          isOpen={showContributionModal}
          onClose={() => {
            setShowContributionModal(false);
            setSelectedInitiative(null);
          }}
          initiative={selectedInitiative}
          onSubmit={handleContribute}
          isLoading={loading}
        />
      )}
    </div>
  );
};

export default InitiativesOverview;