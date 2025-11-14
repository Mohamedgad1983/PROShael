import React, { memo,  useState, useEffect } from 'react';
import {
  PlusIcon,
  ScaleIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ClockIcon,
  DocumentCheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import DiyasTable from './DiyasTable';
import CreateDiyaModal from './CreateDiyaModal';
import DiyaDetailsModal from './DiyaDetailsModal';
import DiyaStatus from './DiyaStatus';
import {
  Diya,
  DiyaFormData,
  DiyaStatistics,
  DiyaStatus as IDiyaStatus
} from './types';
import { ARABIC_LABELS, CURRENCY } from '../../constants/arabic';
import { formatArabicNumber, formatArabicCurrency, formatArabicPercentage } from '../../utils/arabic';
import { useResponsive, getTouchStyles, getResponsiveGridStyles, getResponsiveSpacing } from '../../utils/responsive';
import { useStaggeredAnimation, injectAnimationKeyframes } from '../../utils/animations';

import { logger } from '../../utils/logger';

// Mock data for testing
const mockDiyas: Diya[] = [
  {
    id: '1',
    title: 'حادث مروري - طريق الملك فهد',
    description: 'تصادم بين مركبتين نتج عنه أضرار مادية وإصابات طفيفة. المطلوب تعويض الأضرار المادية وتكاليف العلاج.',
    caseType: 'vehicleAccident',
    compensationAmount: 25000,
    status: 'investigating',
    priority: 'high',
    caseDateOccurred: new Date('2024-02-15'),
    reportedDate: new Date('2024-02-16'),
    reportedById: 'user1',
    reportedByName: 'أحمد محمد السعيد',
    involvedParties: [
      {
        id: '1',
        name: 'أحمد محمد السعيد',
        role: 'complainant',
        contactInfo: { phone: '0501234567', email: 'ahmad@email.com' },
        relationship: 'السائق المتضرر',
        isResponsible: false
      },
      {
        id: '2',
        name: 'خالد عبد الله النجار',
        role: 'respondent',
        contactInfo: { phone: '0509876543' },
        relationship: 'السائق المسؤول',
        isResponsible: true
      }
    ],
    caseDetails: {
      location: 'طريق الملك فهد - الرياض',
      damageDescription: 'أضرار في مقدمة السيارة وكسر في المصد الأمامي والمصابيح',
      estimatedCost: 15000,
      insuranceClaim: true
    },
    documents: [
      {
        id: '1',
        name: 'تقرير الشرطة المرورية',
        type: 'policeReport',
        url: '/documents/police-report-1.pdf',
        uploadedBy: 'أحمد المحقق',
        uploadedDate: new Date('2024-02-17'),
        size: 1024000
      }
    ],
    createdDate: new Date('2024-02-16'),
    updatedDate: new Date('2024-02-20')
  },
  {
    id: '2',
    title: 'تعويض طبي - حالة طوارئ',
    description: 'حالة طبية طارئة تتطلب تدخل جراحي عاجل للمريض غير القادر على تحمل التكاليف.',
    caseType: 'medicalCompensation',
    compensationAmount: 80000,
    status: 'resolved',
    priority: 'urgent',
    caseDateOccurred: new Date('2024-01-20'),
    reportedDate: new Date('2024-01-21'),
    reportedById: 'user2',
    reportedByName: 'فاطمة عبد الرحمن',
    involvedParties: [
      {
        id: '1',
        name: 'فاطمة عبد الرحمن',
        role: 'complainant',
        contactInfo: { phone: '0551234567', email: 'fatima@email.com' },
        relationship: 'والدة المريض',
        isResponsible: false
      }
    ],
    caseDetails: {
      location: 'مستشفى الملك فيصل التخصصي - الرياض',
      damageDescription: 'حالة طبية طارئة تتطلب عملية جراحية عاجلة في القلب',
      estimatedCost: 75000,
      medicalReports: ['تقرير الطبيب المعالج', 'نتائج الفحوصات'],
      insuranceClaim: false
    },
    resolutionDetails: {
      resolutionDate: new Date('2024-02-10'),
      resolutionMethod: 'familyCouncil',
      agreedAmount: 80000,
      paymentTerms: 'دفعة واحدة خلال 30 يوم',
      mediatorName: 'د. محمد الشعيل',
      notes: 'تم الاتفاق على التكفل بكامل تكاليف العملية'
    },
    paymentDetails: {
      totalAmount: 80000,
      paidAmount: 80000,
      remainingAmount: 0,
      paymentMethod: 'حوالة بنكية',
      paymentDate: new Date('2024-02-15'),
      bankReference: 'TXN789456123'
    },
    documents: [
      {
        id: '1',
        name: 'التقرير الطبي',
        type: 'medicalReport',
        url: '/documents/medical-report-1.pdf',
        uploadedBy: 'د. عبد الله الطبيب',
        uploadedDate: new Date('2024-01-22'),
        size: 2048000
      }
    ],
    createdDate: new Date('2024-01-21'),
    updatedDate: new Date('2024-02-15')
  },
  {
    id: '3',
    title: 'أضرار في الممتلكات - سقوط جدار',
    description: 'سقوط جدار نتيجة أعمال البناء المجاورة مما تسبب في أضرار بالممتلكات والسيارة.',
    caseType: 'propertyDamage',
    compensationAmount: 45000,
    status: 'awaitingPayment',
    priority: 'medium',
    caseDateOccurred: new Date('2024-01-30'),
    reportedDate: new Date('2024-01-31'),
    reportedById: 'user3',
    reportedByName: 'سارة أحمد الزهراني',
    involvedParties: [
      {
        id: '1',
        name: 'سارة أحمد الزهراني',
        role: 'complainant',
        contactInfo: { phone: '0561234567' },
        relationship: 'صاحبة الممتلكات',
        isResponsible: false
      },
      {
        id: '2',
        name: 'شركة المقاولات المتحدة',
        role: 'respondent',
        contactInfo: { phone: '0114567890', email: 'info@contracting.com' },
        relationship: 'شركة البناء المسؤولة',
        isResponsible: true
      }
    ],
    caseDetails: {
      location: 'حي النخيل - الرياض',
      damageDescription: 'تهدم جزئي في الجدار الخارجي وأضرار في السيارة المركونة',
      estimatedCost: 40000,
      insuranceClaim: true
    },
    resolutionDetails: {
      resolutionDate: new Date('2024-02-20'),
      resolutionMethod: 'mediation',
      agreedAmount: 45000,
      paymentTerms: 'ثلاث دفعات متساوية',
      mediatorName: 'المهندس خالد المطيري'
    },
    paymentDetails: {
      totalAmount: 45000,
      paidAmount: 15000,
      remainingAmount: 30000,
      paymentMethod: 'أقساط شهرية',
      installments: [
        {
          id: '1',
          amount: 15000,
          dueDate: new Date('2024-02-25'),
          paidDate: new Date('2024-02-23'),
          status: 'paid'
        },
        {
          id: '2',
          amount: 15000,
          dueDate: new Date('2024-03-25'),
          status: 'pending'
        },
        {
          id: '3',
          amount: 15000,
          dueDate: new Date('2024-04-25'),
          status: 'pending'
        }
      ]
    },
    documents: [],
    createdDate: new Date('2024-01-31'),
    updatedDate: new Date('2024-02-23')
  }
];

const DiyasOverview: React.FC = () => {
  const { isMobile, isTablet, breakpoint } = useResponsive();
  const { getItemStyles } = useStaggeredAnimation(6, 'fadeIn', 120);

  React.useEffect(() => {
    injectAnimationKeyframes();
  }, []);

  const [diyas, setDiyas] = useState<Diya[]>(mockDiyas);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDiya, setSelectedDiya] = useState<Diya | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDiyas = diyas.filter(diya => {
    if (searchTerm && !diya.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !diya.description.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  const statistics: DiyaStatistics = {
    totalCases: diyas.length,
    activeCases: diyas.filter(d => ['reported', 'investigating', 'mediation', 'awaitingPayment'].includes(d.status)).length,
    resolvedCases: diyas.filter(d => d.status === 'resolved' || d.status === 'completed').length,
    totalCompensation: diyas.reduce((sum, d) => sum + d.compensationAmount, 0),
    averageResolutionTime: 15, // days
    pendingPayments: diyas.filter(d => d.status === 'awaitingPayment').length,
    successRate: diyas.length > 0 ? Math.round((diyas.filter(d => d.status === 'completed').length / diyas.length) * 100) : 0
  };

  const handleCreateDiya = async (formData: DiyaFormData) => {
    setLoading(true);
    try {
      // API call would go here
      const newDiya: Diya = {
        id: Date.now().toString(),
        title: formData.title,
        description: formData.description,
        caseType: formData.caseType,
        compensationAmount: formData.compensationAmount,
        priority: formData.priority,
        caseDateOccurred: new Date(formData.caseDateOccurred),
        status: 'reported',
        reportedDate: new Date(),
        reportedById: 'current_user',
        reportedByName: 'المستخدم الحالي',
        involvedParties: formData.involvedParties.map((party, index) => ({
          ...party,
          id: `party_${Date.now()}_${index}`
        })),
        caseDetails: formData.caseDetails,
        documents: [],
        createdDate: new Date(),
        updatedDate: new Date()
      };

      setDiyas(prev => [newDiya, ...prev]);
      setShowCreateModal(false);
    } catch (error) {
      logger.error('Error creating diya:', { error });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (diyaId: string, newStatus: IDiyaStatus) => {
    try {
      // API call would go here
      setDiyas(prev => prev.map(diya =>
        diya.id === diyaId ? { ...diya, status: newStatus, updatedDate: new Date() } : diya
      ));
    } catch (error) {
      logger.error('Error updating status:', { error });
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

  const primaryButtonStyle: React.CSSProperties = {
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
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
    userSelect: 'none' as const,
    WebkitTapHighlightColor: 'transparent',
    flex: isMobile ? '1' : 'none'
  };

  const statsGridStyle: React.CSSProperties = {
    ...getResponsiveGridStyles(breakpoint, { xs: 1, sm: 2, md: 3, lg: 6 }),
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
    fontSize: isMobile ? '24px' : '32px',
    fontWeight: '700',
    marginBottom: isMobile ? '6px' : '8px',
    fontFamily: 'Cairo, Tajawal, sans-serif',
    letterSpacing: '-0.02em'
  };

  const statLabelStyle: React.CSSProperties = {
    fontSize: isMobile ? '12px' : '14px',
    color: '#6b7280',
    fontWeight: '500',
    lineHeight: '1.4'
  };

  const searchStyle: React.CSSProperties = {
    position: 'relative',
    maxWidth: isMobile ? '100%' : '400px',
    width: '100%',
    marginBottom: isMobile ? '20px' : '24px'
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

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>
          <ScaleIcon style={{ width: '32px', height: '32px' }} />
          {ARABIC_LABELS.diyasOverview}
        </h1>

        <div style={actionsStyle}>
          <button
            style={primaryButtonStyle}
            onClick={() => setShowCreateModal(true)}
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
            {ARABIC_LABELS.createDiya}
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
            width: isMobile ? '24px' : '32px',
            height: isMobile ? '24px' : '32px',
            color: '#667eea',
            margin: `0 auto ${isMobile ? '12px' : '16px'}`
          }} />
          <div style={{ ...statValueStyle, color: '#667eea' }}>
            {formatArabicNumber(statistics.totalCases)}
          </div>
          <div style={statLabelStyle}>إجمالي القضايا</div>
        </div>

        <div
          style={{
            ...statCardStyle,
            ...getItemStyles(1),
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
          <ClockIcon style={{
            width: isMobile ? '24px' : '32px',
            height: isMobile ? '24px' : '32px',
            color: '#f59e0b',
            margin: `0 auto ${isMobile ? '12px' : '16px'}`
          }} />
          <div style={{ ...statValueStyle, color: '#f59e0b' }}>
            {formatArabicNumber(statistics.activeCases)}
          </div>
          <div style={statLabelStyle}>القضايا النشطة</div>
        </div>

        <div
          style={{
            ...statCardStyle,
            ...getItemStyles(2),
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
          <DocumentCheckIcon style={{
            width: isMobile ? '24px' : '32px',
            height: isMobile ? '24px' : '32px',
            color: '#10b981',
            margin: `0 auto ${isMobile ? '12px' : '16px'}`
          }} />
          <div style={{ ...statValueStyle, color: '#10b981' }}>
            {formatArabicNumber(statistics.resolvedCases)}
          </div>
          <div style={statLabelStyle}>القضايا المحلولة</div>
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
          <CurrencyDollarIcon style={{
            width: isMobile ? '24px' : '32px',
            height: isMobile ? '24px' : '32px',
            color: '#3b82f6',
            margin: `0 auto ${isMobile ? '12px' : '16px'}`
          }} />
          <div style={{ ...statValueStyle, color: '#3b82f6' }}>
            {formatArabicCurrency(statistics.totalCompensation)}
          </div>
          <div style={statLabelStyle}>إجمالي التعويضات</div>
        </div>

        <div
          style={{
            ...statCardStyle,
            ...getItemStyles(4),
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)'
          }}
          onMouseEnter={(e) => {
            if (!isMobile) {
              e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(239, 68, 68, 0.2)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isMobile) {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        >
          <ExclamationTriangleIcon style={{
            width: isMobile ? '24px' : '32px',
            height: isMobile ? '24px' : '32px',
            color: '#ef4444',
            margin: `0 auto ${isMobile ? '12px' : '16px'}`,
            animation: statistics.pendingPayments > 0 ? 'pulse 2s infinite' : 'none'
          }} />
          <div style={{ ...statValueStyle, color: '#ef4444' }}>
            {formatArabicNumber(statistics.pendingPayments)}
          </div>
          <div style={statLabelStyle}>في انتظار الدفع</div>
        </div>

        <div
          style={{
            ...statCardStyle,
            ...getItemStyles(5),
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%)'
          }}
          onMouseEnter={(e) => {
            if (!isMobile) {
              e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(139, 92, 246, 0.2)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isMobile) {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        >
          <DocumentCheckIcon style={{
            width: isMobile ? '24px' : '32px',
            height: isMobile ? '24px' : '32px',
            color: '#8b5cf6',
            margin: `0 auto ${isMobile ? '12px' : '16px'}`
          }} />
          <div style={{ ...statValueStyle, color: '#8b5cf6' }}>
            {formatArabicPercentage(statistics.successRate)}
          </div>
          <div style={statLabelStyle}>معدل النجاح</div>
        </div>
      </div>

      <div style={searchStyle}>
        <MagnifyingGlassIcon style={{ ...searchIconStyle, width: '20px', height: '20px' }} />
        <input
          type="text"
          style={searchInputStyle}
          placeholder="البحث في القضايا..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <DiyasTable
        diyas={filteredDiyas}
        onView={(diya) => {
          setSelectedDiya(diya);
          setShowDetailsModal(true);
        }}
        onEdit={(diya) => {
          setSelectedDiya(diya);
          setShowCreateModal(true);
        }}
        loading={loading}
      />

      {showCreateModal && (
        <CreateDiyaModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedDiya(null);
          }}
          onSubmit={handleCreateDiya}
          isLoading={loading}
        />
      )}

      {showDetailsModal && selectedDiya && (
        <DiyaDetailsModal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedDiya(null);
          }}
          diya={selectedDiya}
          onEdit={(diya) => {
            setShowDetailsModal(false);
            setSelectedDiya(diya);
            setShowCreateModal(true);
          }}
          onStatusUpdate={handleStatusUpdate}
          canEdit={true}
        />
      )}
    </div>
  );
};

export default memo(DiyasOverview);