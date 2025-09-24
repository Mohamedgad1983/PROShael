import React, { useState, useEffect, useRef } from 'react';
import {
  HomeIcon,
  UsersIcon,
  CreditCardIcon,
  BanknotesIcon,
  CalendarIcon,
  LightBulbIcon,
  ScaleIcon,
  DocumentTextIcon,
  CogIcon,
  ChartBarIcon,
  UserGroupIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronLeftIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import { Line, Doughnut } from 'react-chartjs-2';
// @ts-ignore
import SubscriptionsManagement from './Subscriptions/SubscriptionsManagement.jsx';
// @ts-ignore
import PaymentsTracking from './Payments/PaymentsTracking.jsx';
// @ts-ignore
import AppleOccasionsManagement from './Occasions/AppleOccasionsManagement.jsx';
// @ts-ignore
import AppleInitiativesManagement from './Initiatives/AppleInitiativesManagement.jsx';
// @ts-ignore
import AppleDiyasManagement from './Diyas/AppleDiyasManagement.jsx';
import { NotificationsCenter } from './Notifications';
import FinancialReportsSimple from './Reports/FinancialReportsSimple';
// @ts-ignore
import AppleMembersManagement from './Members/AppleMembersManagement';
// @ts-ignore
import EnhancedMembersManagement from './Members/EnhancedMembersManagement.jsx';
// @ts-ignore
import TwoSectionMembers from './Members/TwoSectionMembers.jsx';
// @ts-ignore
import Settings from './Settings/Settings.jsx';
import { formatHijriDate, getCurrentHijriDate, formatDualDate } from '../utils/hijriDateUtils';
// Import Apple Design System CSS for premium styling
import './Members/AppleDesignSystem.css';
// Import logo
import logo from '../assets/logo.svg';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// Add keyframe animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes ripple {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
  @keyframes contentEnter {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
  .ripple {
    position: absolute;
    border-radius: 50%;
    transform: scale(0);
    animation: ripple 600ms ease-out;
    background: rgba(255, 255, 255, 0.3);
  }
  @media (max-width: 768px) {
    .mobile-menu-btn {
      display: block !important;
    }
    .desktop-sidebar {
      display: none !important;
    }
  }
  @media (min-width: 769px) {
    .mobile-menu-btn {
      display: none !important;
    }
    .mobile-sidebar {
      display: none !important;
    }
  }
`;
if (!document.querySelector('#dashboard-styles')) {
  styleSheet.id = 'dashboard-styles';
  document.head.appendChild(styleSheet);
}

const styles = {
  container: {
    height: '100vh',
    background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
    fontFamily: 'Tajawal, Cairo, sans-serif',
    direction: 'rtl' as const,
    color: 'white',
    position: 'relative' as const,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const
  },
  header: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    padding: '1rem 2rem',
    height: '80px',
    flexShrink: 0,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    position: 'sticky' as const,
    top: 0,
    zIndex: 100
  },
  mobileMenuButton: {
    display: 'none',
    padding: '8px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  breadcrumbs: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: '1rem'
  },
  mainLayout: {
    display: 'flex',
    height: 'calc(100vh - 80px)',
    flex: 1,
    overflow: 'hidden'
  },
  sidebar: {
    width: '280px',
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    padding: '2rem 1rem',
    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative' as const,
    height: '100%',
    overflowY: 'auto' as const
  },
  sidebarOverlay: {
    display: 'none',
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(5px)',
    zIndex: 199,
    opacity: 0,
    transition: 'opacity 0.3s'
  },
  sidebarMobile: {
    position: 'fixed' as const,
    top: 0,
    right: '-100%',
    bottom: 0,
    width: '80%',
    maxWidth: '320px',
    background: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(25px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    boxShadow: '-5px 0 25px rgba(0, 0, 0, 0.3)',
    padding: '2rem 1rem',
    transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    zIndex: 200,
    overflowY: 'auto' as const
  },
  sidebarMobileOpen: {
    right: 0
  },
  closeButton: {
    position: 'absolute' as const,
    top: '1rem',
    left: '1rem',
    padding: '8px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 20px',
    marginBottom: '8px',
    borderRadius: '12px',
    background: 'transparent',
    border: '2px solid transparent',
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    width: '100%',
    textAlign: 'right' as const,
    position: 'relative' as const,
    overflow: 'hidden',
    minHeight: '48px'
  },
  menuItemActive: {
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(139, 92, 246, 0.25))',
    color: 'white',
    border: '2px solid rgba(59, 130, 246, 0.4)',
    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
    transform: 'translateX(-4px)'
  },
  menuItemHover: {
    background: 'rgba(255, 255, 255, 0.08)',
    transform: 'translateX(-2px)'
  },
  activeIndicator: {
    position: 'absolute' as const,
    right: 0,
    width: '4px',
    height: '70%',
    background: 'linear-gradient(180deg, #3b82f6, #8b5cf6)',
    borderRadius: '4px 0 0 4px',
    opacity: 0,
    transition: 'opacity 0.3s'
  },
  activeIndicatorVisible: {
    opacity: 1
  },
  menuIcon: {
    width: '22px',
    height: '22px',
    transition: 'transform 0.3s'
  },
  menuIconActive: {
    transform: 'scale(1.15) rotate(5deg)'
  },
  content: {
    flex: 1,
    padding: '2rem',
    overflowY: 'auto' as const,
    position: 'relative' as const,
    height: 'calc(100vh - 80px)',
    maxHeight: 'calc(100vh - 80px)'
  },
  contentTransition: {
    opacity: 0,
    transform: 'translateX(20px)',
    animation: 'contentEnter 300ms cubic-bezier(0.4, 0, 0.2, 1) forwards'
  },
  sectionHeader: {
    marginBottom: '2rem',
    opacity: 0,
    animation: 'fadeInUp 400ms ease-out forwards'
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '400px'
  },
  loadingSpinner: {
    width: '50px',
    height: '50px',
    border: '3px solid rgba(255, 255, 255, 0.1)',
    borderTop: '3px solid rgba(59, 130, 246, 0.8)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    padding: '3rem',
    textAlign: 'center' as const
  },
  emptyStateIcon: {
    width: '80px',
    height: '80px',
    opacity: 0.3,
    marginBottom: '1.5rem'
  },
  skeletonCard: {
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '16px',
    padding: '1.5rem',
    marginBottom: '1rem',
    animation: 'pulse 2s ease-in-out infinite'
  },
  skeletonLine: {
    height: '12px',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '6px',
    marginBottom: '8px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem',
    flexShrink: 0
  },
  statCard: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '16px',
    padding: '1.5rem',
    textAlign: 'center' as const,
    transition: 'transform 0.3s',
    cursor: 'pointer'
  },
  iconBox: {
    width: '60px',
    height: '60px',
    margin: '0 auto 1rem',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '1.5rem',
    flexShrink: 0
  },
  chartCard: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '16px',
    padding: '1.5rem',
    height: '300px'
  },
  activitiesCard: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '16px',
    padding: '1.5rem'
  },
  activityItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    marginBottom: '0.5rem',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  }
};

interface StyledDashboardProps {
  onLogout: () => void;
}

const StyledDashboard: React.FC<StyledDashboardProps> = ({ onLogout }) => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [contentKey, setContentKey] = useState(0);
  const [currentHijriDate, setCurrentHijriDate] = useState(getCurrentHijriDate());
  const contentRef = useRef<HTMLDivElement>(null);

  // Update Hijri date on component mount
  useEffect(() => {
    setCurrentHijriDate(getCurrentHijriDate());
    // Update date every day at midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    const midnightTimeout = setTimeout(() => {
      setCurrentHijriDate(getCurrentHijriDate());
      // Set up daily interval after first midnight
      const dailyInterval = setInterval(() => {
        setCurrentHijriDate(getCurrentHijriDate());
      }, 24 * 60 * 60 * 1000);
      return () => clearInterval(dailyInterval);
    }, msUntilMidnight);

    return () => clearTimeout(midnightTimeout);
  }, []);

  // Subscriptions Management State
  const [subscriptionsTab, setSubscriptionsTab] = useState('overview');
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>(() => {
    const savedPlans = localStorage.getItem('subscriptionPlans');
    return savedPlans ? JSON.parse(savedPlans) : [];
  });
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // Handle section change with animation
  const handleSectionChange = (sectionId: string) => {
    if (sectionId === activeSection) return;

    setIsLoading(true);
    // Trigger exit animation
    if (contentRef.current) {
      contentRef.current.style.opacity = '0';
      contentRef.current.style.transform = 'translateX(-20px)';
    }

    setTimeout(() => {
      setActiveSection(sectionId);
      setContentKey(prev => prev + 1);
      setSidebarOpen(false);
      setIsLoading(false);
    }, 200);
  };

  // Add ripple effect on click
  const createRipple = (event: React.MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget;
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('ripple');

    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  };

  // Handle mobile sidebar toggle
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Add swipe gesture support for mobile
  useEffect(() => {
    let startX = 0;
    let currentX = 0;
    let isDragging = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches[0].clientX < 50) { // Start from left edge
        startX = e.touches[0].clientX;
        isDragging = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      currentX = e.touches[0].clientX;

      if (currentX - startX > 100) {
        setSidebarOpen(true);
        isDragging = false;
      }
    };

    const handleTouchEnd = () => {
      isDragging = false;
    };

    if (window.innerWidth <= 768) {
      document.addEventListener('touchstart', handleTouchStart);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);

      return () => {
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: HomeIcon },
    { id: 'members', label: 'الأعضاء', icon: UsersIcon },
    { id: 'subscriptions', label: 'الاشتراكات', icon: CreditCardIcon },
    { id: 'payments', label: 'المدفوعات', icon: BanknotesIcon },
    { id: 'occasions', label: 'المناسبات', icon: CalendarIcon },
    { id: 'initiatives', label: 'المبادرات', icon: LightBulbIcon },
    { id: 'diyas', label: 'الديات', icon: ScaleIcon },
    { id: 'notifications', label: 'الإشعارات', icon: BellIcon },
    { id: 'reports', label: 'التقارير', icon: DocumentTextIcon },
    { id: 'settings', label: 'الإعدادات', icon: CogIcon }
  ];

  const stats = [
    {
      title: 'إجمالي الأعضاء',
      value: '45',
      icon: UserGroupIcon,
      color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      trend: 5
    },
    {
      title: 'الأنشطة النشطة',
      value: '12',
      icon: ChartBarIcon,
      color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      trend: 8
    },
    {
      title: 'الإيرادات الشهرية',
      value: '25,000 ر.س',
      icon: BanknotesIcon,
      color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      trend: 18
    },
    {
      title: 'المدفوعات المعلقة',
      value: '8',
      icon: ClockIcon,
      color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      trend: -12
    }
  ];

  // Mock Subscription Data
  const mockPlans = [
    {
      id: 1,
      name_ar: 'الاشتراك الشهري',
      name_en: 'Monthly Subscription',
      price: 100,
      duration_months: 1,
      status: 'active',
      description: 'اشتراك شهري للأعضاء',
      benefits: ['استخدام المرافق', 'المشاركة في الفعاليات', 'الدعم الفني'],
      subscribers_count: 25
    },
    {
      id: 2,
      name_ar: 'الاشتراك السنوي',
      name_en: 'Annual Subscription',
      price: 1000,
      duration_months: 12,
      status: 'active',
      description: 'اشتراك سنوي بخصم 20%',
      benefits: ['استخدام المرافق', 'المشاركة في الفعاليات', 'الدعم الفني', 'استشارات مجانية'],
      subscribers_count: 18
    },
    {
      id: 3,
      name_ar: 'الاشتراك المميز',
      name_en: 'Premium Subscription',
      price: 200,
      duration_months: 1,
      status: 'active',
      description: 'اشتراك شهري مع خدمات إضافية',
      benefits: ['جميع مزايا الاشتراك الشهري', 'خدمات VIP', 'أولوية في الحجوزات', 'دعم 24/7'],
      subscribers_count: 8
    }
  ];

  const mockSubscriptions = [
    {
      id: 1,
      member_id: 1,
      member_name: 'أحمد محمد الشعيل',
      plan_id: 1,
      plan_name: 'الاشتراك الشهري',
      status: 'active',
      start_date: '2024-01-01',
      due_date: '2024-02-01',
      amount: 100,
      payment_status: 'paid'
    },
    {
      id: 2,
      member_id: 2,
      member_name: 'فاطمة عبدالله الشعيل',
      plan_id: 2,
      plan_name: 'الاشتراك السنوي',
      status: 'overdue',
      start_date: '2023-01-01',
      due_date: '2023-12-15',
      amount: 1000,
      payment_status: 'overdue'
    },
    {
      id: 3,
      member_id: 3,
      member_name: 'خالد سعد الشعيل',
      plan_id: 3,
      plan_name: 'الاشتراك المميز',
      status: 'active',
      start_date: '2024-01-15',
      due_date: '2024-02-15',
      amount: 200,
      payment_status: 'paid'
    },
    {
      id: 4,
      member_id: 4,
      member_name: 'نورا حسن الشعيل',
      plan_id: 1,
      plan_name: 'الاشتراك الشهري',
      status: 'cancelled',
      start_date: '2023-10-01',
      due_date: '2023-11-01',
      amount: 100,
      payment_status: 'cancelled'
    },
    {
      id: 5,
      member_id: 5,
      member_name: 'سارة علي الشعيل',
      plan_id: 2,
      plan_name: 'الاشتراك السنوي',
      status: 'pending',
      start_date: '2024-01-20',
      due_date: '2025-01-20',
      amount: 1000,
      payment_status: 'pending'
    }
  ];

  // Initialize subscription data
  // Function to toggle plan status
  const togglePlanStatus = (planId: string) => {
    const updatedPlans = plans.map(plan => {
      if (plan.id === planId) {
        return {
          ...plan,
          status: plan.status === 'active' ? 'inactive' : 'active'
        };
      }
      return plan;
    });
    setPlans(updatedPlans);
    // Save to localStorage to persist changes
    localStorage.setItem('subscriptionPlans', JSON.stringify(updatedPlans));
  };

  useEffect(() => {
    if (activeSection === 'subscriptions' && plans.length === 0) {
      // Only load mock data if no saved plans exist
      const savedPlans = localStorage.getItem('subscriptionPlans');
      if (!savedPlans) {
        setPlans(mockPlans);
        localStorage.setItem('subscriptionPlans', JSON.stringify(mockPlans));
      }
      setSubscriptions(mockSubscriptions);
    }
  }, [activeSection, plans.length]);

  const revenueData = {
    labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
    datasets: [{
      label: 'الإيرادات الشهرية',
      data: [15000, 20000, 18000, 25000, 22000, 28000],
      borderColor: 'rgba(59, 130, 246, 1)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.4,
      fill: true
    }]
  };

  const memberDistribution = {
    labels: ['أعضاء نشطين', 'أعضاء غير نشطين', 'أعضاء جدد'],
    datasets: [{
      data: [35, 8, 12],
      backgroundColor: [
        'rgba(34, 197, 94, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(168, 85, 247, 0.8)'
      ],
      borderWidth: 0
    }]
  };

  const chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: 'rgba(255, 255, 255, 0.8)',
          font: {
            family: 'Tajawal',
            size: 12
          }
        }
      }
    },
    scales: {
      y: {
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)',
          font: {
            family: 'Tajawal'
          }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      x: {
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)',
          font: {
            family: 'Tajawal'
          }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      }
    }
  };

  const activities = [
    { user: 'أحمد الشعيل', action: 'دفع اشتراك شهري', time: 'منذ ساعتين', amount: '500 ريال' },
    { user: 'فاطمة الشعيل', action: 'انضمام عضو جديد', time: 'منذ 4 ساعات', amount: null },
    { user: 'محمد الشعيل', action: 'تنظيم مناسبة عائلية', time: 'منذ يوم', amount: null },
    { user: 'سارة الشعيل', action: 'مساهمة في مبادرة خيرية', time: 'منذ يومين', amount: '1000 ريال' }
  ];

  // Get current section label
  const getCurrentSectionLabel = () => {
    const current = menuItems.find(item => item.id === activeSection);
    return current?.label || 'لوحة التحكم';
  };

  // Render loading skeleton
  const renderLoadingSkeleton = () => (
    <div>
      <div style={styles.skeletonCard}>
        <div style={{ ...styles.skeletonLine, width: '60%' }} />
        <div style={{ ...styles.skeletonLine, width: '80%' }} />
        <div style={{ ...styles.skeletonLine, width: '40%' }} />
      </div>
      <div style={styles.skeletonCard}>
        <div style={{ ...styles.skeletonLine, width: '70%' }} />
        <div style={{ ...styles.skeletonLine, width: '50%' }} />
        <div style={{ ...styles.skeletonLine, width: '90%' }} />
      </div>
    </div>
  );

  // Comprehensive Subscription Management Section
  const renderSubscriptionsSection = () => {
    // Helper function to get status color
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'active': return '#10b981';
        case 'overdue': return '#ef4444';
        case 'pending': return '#f59e0b';
        case 'cancelled': return '#6b7280';
        default: return '#6b7280';
      }
    };

    // Helper function to get status text
    const getStatusText = (status: string) => {
      switch (status) {
        case 'active': return 'نشط';
        case 'overdue': return 'متأخر';
        case 'pending': return 'في الانتظار';
        case 'cancelled': return 'ملغي';
        default: return 'غير محدد';
      }
    };

    // Calculate subscription statistics
    const totalSubscriptions = subscriptions.length;
    const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active').length;
    const overdueSubscriptions = subscriptions.filter(sub => sub.status === 'overdue').length;
    const totalRevenue = subscriptions.reduce((sum, sub) => sum + (sub.payment_status === 'paid' ? sub.amount : 0), 0);

    // Subscription tabs
    const subscriptionTabs = [
      { id: 'overview', label: 'نظرة عامة', icon: ChartBarIcon },
      { id: 'plans', label: 'خطط الاشتراك', icon: CreditCardIcon },
      { id: 'members', label: 'اشتراكات الأعضاء', icon: UsersIcon },
      { id: 'schedule', label: 'جدول المدفوعات', icon: CalendarIcon },
      { id: 'analytics', label: 'التحليلات', icon: ArrowTrendingUpIcon }
    ];

    return (
      <div style={{ animation: 'fadeInUp 0.6s ease-out' }}>
        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          marginBottom: '2rem',
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          padding: '8px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          overflowX: 'auto'
        }}>
          {subscriptionTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = subscriptionsTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSubscriptionsTab(tab.id)}
                style={{
                  flex: '1',
                  minWidth: '140px',
                  padding: '12px 16px',
                  background: isActive ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: isActive ? 'bold' : 'normal',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <Icon style={{ width: '18px', height: '18px' }} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {subscriptionsTab === 'overview' && (
          <div>
            {/* Statistics Cards */}
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={{ ...styles.iconBox, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                  <CreditCardIcon style={{ width: '30px', height: '30px', color: 'white' }} />
                </div>
                <h3 style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '8px' }}>
                  إجمالي الاشتراكات
                </h3>
                <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
                  {totalSubscriptions}
                </div>
              </div>

              <div style={styles.statCard}>
                <div style={{ ...styles.iconBox, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                  <UsersIcon style={{ width: '30px', height: '30px', color: 'white' }} />
                </div>
                <h3 style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '8px' }}>
                  اشتراكات نشطة
                </h3>
                <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
                  {activeSubscriptions}
                </div>
              </div>

              <div style={styles.statCard}>
                <div style={{ ...styles.iconBox, background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}>
                  <ClockIcon style={{ width: '30px', height: '30px', color: 'white' }} />
                </div>
                <h3 style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '8px' }}>
                  مدفوعات متأخرة
                </h3>
                <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
                  {overdueSubscriptions}
                </div>
              </div>

              <div style={styles.statCard}>
                <div style={{ ...styles.iconBox, background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
                  <BanknotesIcon style={{ width: '30px', height: '30px', color: 'white' }} />
                </div>
                <h3 style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '8px' }}>
                  إجمالي الإيرادات
                </h3>
                <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
                  {totalRevenue.toLocaleString('ar-SA')} ر.س
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '16px',
              padding: '2rem',
              marginBottom: '2rem'
            }}>
              <h3 style={{ fontSize: '18px', marginBottom: '1rem' }}>إجراءات سريعة</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <button
                  onClick={() => setShowPlanModal(true)}
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <CreditCardIcon style={{ width: '18px', height: '18px' }} />
                  إضافة خطة جديدة
                </button>

                <button
                  onClick={() => setShowSubscriptionModal(true)}
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <UsersIcon style={{ width: '18px', height: '18px' }} />
                  اشتراك عضو جديد
                </button>


                <button
                  onClick={() => setSubscriptionsTab('analytics')}
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <ChartBarIcon style={{ width: '18px', height: '18px' }} />
                  عرض التقارير
                </button>

                <button
                  onClick={() => setSubscriptionsTab('schedule')}
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <CalendarIcon style={{ width: '18px', height: '18px' }} />
                  جدول المدفوعات
                </button>
              </div>
            </div>

            {/* Recent Activities */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '16px',
              padding: '2rem'
            }}>
              <h3 style={{ fontSize: '18px', marginBottom: '1rem' }}>آخر الأنشطة</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {subscriptions.slice(0, 5).map((subscription, index) => (
                  <div key={subscription.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: getStatusColor(subscription.status)
                      }}></div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '500' }}>{subscription.member_name}</div>
                        <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}>
                          {subscription.plan_name}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        background: getStatusColor(subscription.status) + '20',
                        color: getStatusColor(subscription.status),
                        border: `1px solid ${getStatusColor(subscription.status)}40`
                      }}>
                        {getStatusText(subscription.status)}
                      </div>
                      <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '4px' }}>
                        {subscription.amount} ر.س
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Plans Tab Content */}
        {subscriptionsTab === 'plans' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold' }}>خطط الاشتراك</h3>
              <button
                onClick={() => { setEditingPlan(null); setShowPlanModal(true); }}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <CreditCardIcon style={{ width: '18px', height: '18px' }} />
                إضافة خطة جديدة
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {plans.map((plan) => (
                <div key={plan.id} style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '16px',
                  padding: '2rem',
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <h4 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '0.5rem' }}>{plan.name_ar}</h4>
                      <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '1rem' }}>
                        {plan.description}
                      </p>
                    </div>
                    <div style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      background: plan.status === 'active' ? '#10b98120' : '#6b728020',
                      color: plan.status === 'active' ? '#10b981' : '#6b7280',
                      border: `1px solid ${plan.status === 'active' ? '#10b98140' : '#6b728040'}`
                    }}>
                      {plan.status === 'active' ? 'نشط' : 'غير نشط'}
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4facfe', marginBottom: '0.5rem' }}>
                      {plan.price.toLocaleString('ar-SA')} ر.س
                    </div>
                    <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)' }}>
                      كل {plan.duration_months === 1 ? 'شهر' : `${plan.duration_months} أشهر`}
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <h5 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '0.5rem' }}>المزايا:</h5>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {plan.benefits.map((benefit: string, index: number) => (
                        <li key={index} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '4px',
                          fontSize: '13px',
                          color: 'rgba(255, 255, 255, 0.8)'
                        }}>
                          <div style={{
                            width: '4px',
                            height: '4px',
                            borderRadius: '50%',
                            background: '#10b981'
                          }}></div>
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)' }}>
                      {plan.subscribers_count} مشترك
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => { setEditingPlan(plan); setShowPlanModal(true); }}
                      style={{
                        flex: '1',
                        padding: '10px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '6px',
                        color: 'white',
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                    >
                      تعديل
                    </button>
                    <button
                      onClick={() => togglePlanStatus(plan.id)}
                      style={{
                        flex: '1',
                        padding: '10px',
                        background: plan.status === 'active' ? 'rgba(132, 204, 22, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        border: `1px solid ${plan.status === 'active' ? 'rgba(132, 204, 22, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                        borderRadius: '6px',
                        color: plan.status === 'active' ? '#bef264' : '#f87171',
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (plan.status === 'active') {
                          e.currentTarget.style.background = 'rgba(132, 204, 22, 0.3)';
                          e.currentTarget.style.borderColor = 'rgba(132, 204, 22, 0.6)';
                          e.currentTarget.style.color = 'white';
                        } else {
                          e.currentTarget.style.background = 'rgba(34, 197, 94, 0.2)';
                          e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.5)';
                          e.currentTarget.style.color = '#86efac';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (plan.status === 'active') {
                          e.currentTarget.style.background = 'rgba(132, 204, 22, 0.2)';
                          e.currentTarget.style.borderColor = 'rgba(132, 204, 22, 0.4)';
                          e.currentTarget.style.color = '#bef264';
                        } else {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                          e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                          e.currentTarget.style.color = '#f87171';
                        }
                      }}
                    >
                      {plan.status === 'active' ? 'إيقاف' : 'تفعيل'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Member Subscriptions Tab Content */}
        {subscriptionsTab === 'members' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold' }}>اشتراكات الأعضاء</h3>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="بحث عن عضو..."
                  style={{
                    padding: '10px 16px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '14px',
                    width: '200px'
                  }}
                />
                <select
                  style={{
                    padding: '10px 16px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '14px'
                  }}
                >
                  <option value="all">جميع الحالات</option>
                  <option value="active">نشط</option>
                  <option value="overdue">متأخر</option>
                  <option value="cancelled">ملغي</option>
                  <option value="pending">في الانتظار</option>
                </select>
              </div>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '16px',
              overflow: 'hidden'
            }}>
              {/* Table Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr 1fr',
                gap: '1rem',
                padding: '1.5rem',
                background: 'rgba(255, 255, 255, 0.05)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                fontSize: '14px',
                fontWeight: 'bold',
                color: 'rgba(255, 255, 255, 0.8)'
              }}>
                <div>اسم العضو</div>
                <div>خطة الاشتراك</div>
                <div>الحالة</div>
                <div>تاريخ الاستحقاق</div>
                <div>المبلغ</div>
                <div>الإجراءات</div>
              </div>

              {/* Table Body */}
              {subscriptions.map((subscription, index) => (
                <div key={subscription.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr 1fr',
                  gap: '1rem',
                  padding: '1.5rem',
                  borderBottom: index < subscriptions.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                  fontSize: '14px',
                  alignItems: 'center'
                }}>
                  <div style={{ fontWeight: '500' }}>{subscription.member_name}</div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>{subscription.plan_name}</div>
                  <div>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      background: getStatusColor(subscription.status) + '20',
                      color: getStatusColor(subscription.status),
                      border: `1px solid ${getStatusColor(subscription.status)}40`
                    }}>
                      {getStatusText(subscription.status)}
                    </span>
                  </div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    {formatHijriDate(subscription.due_date)}
                  </div>
                  <div style={{ fontWeight: '500' }}>{subscription.amount} ر.س</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={{
                      padding: '6px 12px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: 'white',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}>
                      تعديل
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment Schedule Tab Content */}
        {subscriptionsTab === 'schedule' && (
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '2rem' }}>جدول المدفوعات</h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {/* Upcoming Payments */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '16px',
                padding: '2rem'
              }}>
                <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '1rem', color: '#f59e0b' }}>
                  مدفوعات قادمة (7 أيام)
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {subscriptions.filter(sub => {
                    const dueDate = new Date(sub.due_date);
                    const today = new Date();
                    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                    return dueDate >= today && dueDate <= nextWeek && sub.status === 'active';
                  }).map((subscription) => (
                    <div key={subscription.id} style={{
                      padding: '12px',
                      background: 'rgba(245, 158, 11, 0.1)',
                      borderRadius: '8px',
                      border: '1px solid rgba(245, 158, 11, 0.3)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '500' }}>{subscription.member_name}</div>
                          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}>
                            {subscription.plan_name}
                          </div>
                        </div>
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#f59e0b' }}>
                            {subscription.amount} ر.س
                          </div>
                          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}>
                            {formatHijriDate(subscription.due_date)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Overdue Payments */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '16px',
                padding: '2rem'
              }}>
                <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '1rem', color: '#ef4444' }}>
                  مدفوعات متأخرة
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {subscriptions.filter(sub => sub.status === 'overdue').map((subscription) => (
                    <div key={subscription.id} style={{
                      padding: '12px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      borderRadius: '8px',
                      border: '1px solid rgba(239, 68, 68, 0.3)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '500' }}>{subscription.member_name}</div>
                          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}>
                            {subscription.plan_name}
                          </div>
                        </div>
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#ef4444' }}>
                            {subscription.amount} ر.س
                          </div>
                          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}>
                            {formatHijriDate(subscription.due_date)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab Content */}
        {subscriptionsTab === 'analytics' && (
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '2rem' }}>تحليلات الاشتراكات</h3>

            {/* Revenue Chart */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '16px',
              padding: '2rem',
              marginBottom: '2rem'
            }}>
              <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '1rem' }}>إيرادات الاشتراكات</h4>
              <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  سيتم عرض رسوم الإيرادات البيانية هنا
                </div>
              </div>
            </div>

            {/* Subscription Distribution */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '16px',
                padding: '2rem'
              }}>
                <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '1rem' }}>توزيع الخطط</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {plans.map((plan) => {
                    const percentage = ((plan.subscribers_count / plans.reduce((sum, p) => sum + p.subscribers_count, 0)) * 100).toFixed(1);
                    return (
                      <div key={plan.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px' }}>{plan.name_ar}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '60px',
                            height: '6px',
                            background: 'rgba(255, 255, 255, 0.2)',
                            borderRadius: '3px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${percentage}%`,
                              height: '100%',
                              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                              borderRadius: '3px'
                            }}></div>
                          </div>
                          <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}>
                            {percentage}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '16px',
                padding: '2rem'
              }}>
                <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '1rem' }}>إحصائيات سريعة</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)' }}>متوسط الإيراد للعضو:</span>
                    <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
                      {totalSubscriptions > 0 ? Math.round(totalRevenue / totalSubscriptions) : 0} ر.س
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)' }}>معدل النمو:</span>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#10b981' }}>+15%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)' }}>معدل الإلغاء:</span>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#ef4444' }}>3%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)' }}>أعلى خطة:</span>
                    <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
                      {plans.find(p => p.subscribers_count === Math.max(...plans.map(p => p.subscribers_count)))?.name_ar || '---'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Plan Modal */}
        {showPlanModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '2rem'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold' }}>
                  {editingPlan ? 'تعديل الخطة' : 'إضافة خطة جديدة'}
                </h3>
                <button
                  onClick={() => { setShowPlanModal(false); setEditingPlan(null); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'white',
                    fontSize: '24px',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  ×
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  // Get form values
                  const formData = new FormData(e.currentTarget);
                  const benefitsText = formData.get('benefits') as string;
                  const newPlan = {
                    id: editingPlan?.id || Date.now(),
                    name_ar: formData.get('name_ar') as string,
                    description: formData.get('description') as string,
                    price: Number(formData.get('price')),
                    duration_months: Number(formData.get('duration')),
                    benefits: benefitsText ? benefitsText.split(',').map(b => b.trim()) : [],
                    status: 'active'
                  };

                  // Update plans state
                  let updatedPlans;
                  if (editingPlan) {
                    updatedPlans = plans.map(p => p.id === editingPlan.id ? newPlan : p);
                  } else {
                    updatedPlans = [...plans, newPlan];
                  }

                  setPlans(updatedPlans);
                  // Save to localStorage
                  localStorage.setItem('subscriptionPlans', JSON.stringify(updatedPlans));

                  // Close modal and reset
                  setShowPlanModal(false);
                  setEditingPlan(null);
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                    اسم الخطة (عربي)
                  </label>
                  <input
                    type="text"
                    name="name_ar"
                    defaultValue={editingPlan?.name_ar || ''}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '14px'
                    }}
                    placeholder="مثال: الاشتراك الشهري"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                    الوصف
                  </label>
                  <textarea
                    name="description"
                    defaultValue={editingPlan?.description || ''}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '14px',
                      resize: 'vertical'
                    }}
                    placeholder="وصف موجز للخطة"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                      السعر (ريال)
                    </label>
                    <input
                      type="number"
                      name="price"
                      defaultValue={editingPlan?.price || ''}
                      min="0"
                      step="1"
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '14px'
                      }}
                      placeholder="100"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '14px', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                      المدة (بالأشهر)
                    </label>
                    <select
                      name="duration"
                      defaultValue={editingPlan?.duration_months || 1}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '14px'
                      }}
                    >
                      <option value={1}>1 شهر</option>
                      <option value={3}>3 أشهر</option>
                      <option value={6}>6 أشهر</option>
                      <option value={12}>12 شهر (سنوي)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                    المزايا (فصل بعلامة فاصلة)
                  </label>
                  <textarea
                    name="benefits"
                    defaultValue={editingPlan?.benefits?.join(', ') || ''}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '14px',
                      resize: 'vertical'
                    }}
                    placeholder="استخدام المرافق, المشاركة في الفعاليات, الدعم الفني"
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => { setShowPlanModal(false); setEditingPlan(null); }}
                    style={{
                      flex: '1',
                      padding: '12px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    style={{
                      flex: '1',
                      padding: '12px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '14px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    {editingPlan ? 'حفظ التغييرات' : 'إضافة الخطة'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Subscription Modal */}
        {showSubscriptionModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '2rem'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold' }}>اشتراك عضو جديد</h3>
                <button
                  onClick={() => setShowSubscriptionModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'white',
                    fontSize: '24px',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  ×
                </button>
              </div>

              <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                    اسم العضو
                  </label>
                  <input
                    type="text"
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '14px'
                    }}
                    placeholder="أحمد محمد الشعيل"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                    خطة الاشتراك
                  </label>
                  <select
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '14px'
                    }}
                  >
                    <option value="">اختر خطة الاشتراك</option>
                    {plans.filter(plan => plan.status === 'active').map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name_ar} - {plan.price} ر.س
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                    تاريخ بداية الاشتراك
                  </label>
                  <input
                    type="date"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowSubscriptionModal(false)}
                    style={{
                      flex: '1',
                      padding: '12px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    style={{
                      flex: '1',
                      padding: '12px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '14px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    إضافة الاشتراك
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render empty state for sections
  const renderEmptyState = (section: string) => {
    const emptyStates: Record<string, { icon: any, message: string, description: string }> = {
      members: {
        icon: UsersIcon,
        message: 'لا يوجد أعضاء حتى الآن',
        description: 'ابدأ بإضافة أعضاء جدد إلى نظام إدارة العائلة'
      },
      subscriptions: {
        icon: CreditCardIcon,
        message: 'لا توجد اشتراكات',
        description: 'قم بإنشاء خطط الاشتراك للأعضاء'
      },
      payments: {
        icon: BanknotesIcon,
        message: 'لا توجد مدفوعات',
        description: 'سيتم عرض المدفوعات هنا عند إضافتها'
      },
      occasions: {
        icon: CalendarIcon,
        message: 'لا توجد مناسبات قادمة',
        description: 'أضف مناسبات العائلة القادمة'
      },
      initiatives: {
        icon: LightBulbIcon,
        message: 'لا توجد مبادرات نشطة',
        description: 'ابدأ مبادرة جديدة للعائلة'
      },
      diyas: {
        icon: ScaleIcon,
        message: 'لا توجد ديات مسجلة',
        description: 'سجل الديات ومتابعتها من هنا'
      },
      reports: {
        icon: DocumentTextIcon,
        message: 'لا توجد تقارير',
        description: 'سيتم إنشاء التقارير تلقائياً عند توفر البيانات'
      },
      settings: {
        icon: CogIcon,
        message: 'إعدادات النظام',
        description: 'قم بتخصيص إعدادات النظام حسب احتياجاتك'
      }
    };

    const state = emptyStates[section];
    if (!state) return null;

    const Icon = state.icon;
    return (
      <div style={styles.emptyState}>
        <Icon style={styles.emptyStateIcon} />
        <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>{state.message}</h3>
        <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>{state.description}</p>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      {/* Mobile Sidebar Overlay */}
      <div
        className="mobile-sidebar-overlay"
        style={{
          ...styles.sidebarOverlay,
          ...(sidebarOpen ? { display: 'block', opacity: 1 } : {})
        }}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            className="mobile-menu-btn"
            onClick={() => setSidebarOpen(true)}
            style={styles.mobileMenuButton}
            aria-label="فتح القائمة"
          >
            <Bars3Icon style={{ width: '24px', height: '24px' }} />
          </button>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#007AFF' }}>لوحة تحكم صندوق شعيل العنزي</h1>
        </div>
        <button
          onClick={onLogout}
          style={{
            padding: '8px 24px',
            background: 'rgba(132, 204, 22, 0.15)',
            border: '1px solid rgba(132, 204, 22, 0.3)',
            borderRadius: '8px',
            color: '#bef264',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(132, 204, 22, 0.25)';
            e.currentTarget.style.borderColor = 'rgba(132, 204, 22, 0.5)';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(132, 204, 22, 0.15)';
            e.currentTarget.style.borderColor = 'rgba(132, 204, 22, 0.3)';
            e.currentTarget.style.color = '#bef264';
          }}
        >
          تسجيل الخروج
        </button>
      </div>

      <div style={styles.mainLayout}>
        {/* Desktop Sidebar */}
        <div className="desktop-sidebar" style={styles.sidebar}>
          <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
            <img
              src={logo}
              alt="Shuail Al-Anzi Fund Logo"
              style={{
                width: '140px',
                height: '140px',
                display: 'block',
                margin: '0 auto 1rem auto',
                filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))',
                background: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '50%',
                padding: '10px'
              }}
            />
            <h2 style={{ fontSize: '20px', marginBottom: '8px', color: '#ffffff', fontWeight: '600' }}>صندوق شعيل العنزي</h2>
            <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)' }}>Shuail Al-Anzi Fund</p>
          </div>

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={(e) => {
                  createRipple(e);
                  handleSectionChange(item.id);
                }}
                style={{
                  ...styles.menuItem,
                  ...(isActive ? styles.menuItemActive : {})
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    Object.assign(e.currentTarget.style, styles.menuItemHover);
                    const icon = e.currentTarget.querySelector('svg');
                    if (icon instanceof HTMLElement) {
                      icon.style.transform = 'scale(1.1) rotate(-5deg)';
                    }
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.transform = 'translateX(0)';
                    const icon = e.currentTarget.querySelector('svg');
                    if (icon instanceof HTMLElement) {
                      icon.style.transform = 'scale(1) rotate(0)';
                    }
                  }
                }}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <div style={{
                  ...styles.activeIndicator,
                  ...(isActive ? styles.activeIndicatorVisible : {})
                }} />
                <Icon style={{
                  ...styles.menuIcon,
                  ...(isActive ? styles.menuIconActive : {})
                }} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Mobile Sidebar */}
        <div
          className="mobile-sidebar"
          style={{
            ...styles.sidebarMobile,
            ...(sidebarOpen ? styles.sidebarMobileOpen : {})
          }}
        >
          <button
            onClick={() => setSidebarOpen(false)}
            style={styles.closeButton}
            aria-label="إغلاق القائمة"
          >
            <XMarkIcon style={{ width: '20px', height: '20px' }} />
          </button>

          <div style={{ marginBottom: '2rem', marginTop: '3rem', textAlign: 'center' }}>
            <img
              src={logo}
              alt="Shuail Al-Anzi Fund Logo"
              style={{
                width: '100px',
                height: '100px',
                display: 'block',
                margin: '0 auto 1rem auto',
                filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))',
                background: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '50%',
                padding: '10px'
              }}
            />
            <h2 style={{ fontSize: '20px', marginBottom: '8px', color: '#ffffff', fontWeight: '600' }}>صندوق شعيل العنزي</h2>
            <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)' }}>Shuail Al-Anzi Fund</p>
          </div>

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={(e) => {
                  createRipple(e);
                  handleSectionChange(item.id);
                }}
                style={{
                  ...styles.menuItem,
                  ...(isActive ? styles.menuItemActive : {})
                }}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <div style={{
                  ...styles.activeIndicator,
                  ...(isActive ? styles.activeIndicatorVisible : {})
                }} />
                <Icon style={{
                  ...styles.menuIcon,
                  ...(isActive ? styles.menuIconActive : {})
                }} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Content */}
        <div style={styles.content}>
          {/* Breadcrumbs */}
          <div style={styles.breadcrumbs}>
            <HomeIcon style={{ width: '16px', height: '16px' }} />
            <ChevronLeftIcon style={{ width: '14px', height: '14px', opacity: 0.5 }} />
            <span>{getCurrentSectionLabel()}</span>
          </div>

          {/* Content Area with Transitions */}
          <div
            ref={contentRef}
            key={contentKey}
            style={styles.contentTransition}
          >
            {isLoading ? (
              <div style={styles.loadingContainer}>
                <div style={styles.loadingSpinner} />
              </div>
            ) : (
              <>
                {/* Section Header */}
                <div style={styles.sectionHeader}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>
                        {activeSection === 'dashboard' ? 'مرحباً بك في لوحة التحكم' : getCurrentSectionLabel()}
                      </h1>
                      <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        {activeSection === 'dashboard'
                          ? 'نظام إدارة عائلة الشعيل - نظرة شاملة على الأنشطة والمالية'
                          : `إدارة ${getCurrentSectionLabel()} - عائلة الشعيل`}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', padding: '8px 16px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px' }}>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981', marginBottom: '4px' }}>
                        {currentHijriDate.formatted}
                      </div>
                      <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                        {currentHijriDate.gregorian}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dynamic Content Based on Active Section */}
                {activeSection === 'dashboard' && (
                  <div style={{
                    height: 'calc(100% - 100px)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.5rem',
                    overflowY: 'auto',
                    paddingBottom: '20px'
                  }}>
                    {/* Statistics Cards */}
                    <div style={styles.statsGrid}>
                      {stats.map((stat, index) => {
                        const Icon = stat.icon;
                        return (
                          <div
                            key={index}
                            style={styles.statCard}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-5px)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                            }}
                          >
                            <div style={{ ...styles.iconBox, background: stat.color }}>
                              <Icon style={{ width: '30px', height: '30px', color: 'white' }} />
                            </div>
                            <h3 style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '8px' }}>
                              {stat.title}
                            </h3>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
                              {stat.value}
                            </div>
                            <div style={{
                              fontSize: '12px',
                              color: stat.trend > 0 ? '#10b981' : '#ef4444',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}>
                              <ArrowTrendingUpIcon style={{
                                width: '14px',
                                height: '14px',
                                transform: stat.trend < 0 ? 'rotate(180deg)' : 'none'
                              }} />
                              {Math.abs(stat.trend)}%
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Charts */}
                    <div style={styles.chartsGrid}>
                      <div style={styles.chartCard}>
                        <h3 style={{ fontSize: '18px', marginBottom: '1rem' }}>الإيرادات الشهرية</h3>
                        <div style={{ height: 'calc(100% - 40px)' }}>
                          <Line data={revenueData} options={chartOptions} />
                        </div>
                      </div>

                      <div style={styles.chartCard}>
                        <h3 style={{ fontSize: '18px', marginBottom: '1rem' }}>توزيع الأعضاء</h3>
                        <div style={{ height: 'calc(100% - 40px)' }}>
                          <Doughnut data={memberDistribution} options={chartOptions} />
                        </div>
                      </div>
                    </div>

                    {/* Recent Activities */}
                    <div style={styles.activitiesCard}>
                      <h3 style={{ fontSize: '18px', marginBottom: '1rem' }}>الأنشطة الحديثة</h3>
                      {activities.map((activity, index) => (
                        <div key={index} style={styles.activityItem}>
                          <div>
                            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{activity.user}</div>
                            <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)' }}>
                              {activity.action}
                            </div>
                          </div>
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>
                              {activity.time}
                            </div>
                            {activity.amount && (
                              <div style={{ fontSize: '14px', color: '#10b981', fontWeight: 'bold' }}>
                                {activity.amount}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Other Sections Content */}
                {activeSection === 'members' && (
                  <div>
                    <TwoSectionMembers />
                  </div>
                )}

                {activeSection === 'subscriptions' && (
                  <SubscriptionsManagement />
                )}

                {activeSection === 'payments' && (
                  <PaymentsTracking />
                )}

                {activeSection === 'occasions' && (
                  <AppleOccasionsManagement />
                )}

                {activeSection === 'initiatives' && (
                  <AppleInitiativesManagement />
                )}

                {activeSection === 'diyas' && (
                  <AppleDiyasManagement />
                )}

                {activeSection === 'notifications' && (
                  <div>
                    <NotificationsCenter />
                  </div>
                )}

                {activeSection === 'reports' && (
                  <FinancialReportsSimple />
                )}

                {activeSection === 'settings' && (
                  <Settings />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StyledDashboard;