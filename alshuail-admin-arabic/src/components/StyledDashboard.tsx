import React,{ memo,useEffect,useMemo,useRef,useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
BanknotesIcon,Bars3Icon,BellIcon,ChartBarIcon,ChevronLeftIcon,ClockIcon,CogIcon,CreditCardIcon,DocumentTextIcon,FolderIcon,HomeIcon,LightBulbIcon,
ScaleIcon,UserGroupIcon,UserPlusIcon,UsersIcon,XMarkIcon
} from '@heroicons/react/24/outline';

// @ts-ignore
import PaymentsTracking from './Payments/PaymentsTracking.jsx';
// Bank Transfer Requests for on-behalf payments
import { BankTransferRequests } from './Payments';
// Payment approval queue — lists pending mobile-app payments awaiting admin action
import PaymentApprovalQueue from './PaymentApprovals/PaymentApprovalQueue';

// @ts-ignore
import HijriDiyasManagement from './Diyas/HijriDiyasManagement';

import { NotificationsCenter } from './Notifications';

import FinancialReportsSimple from './Reports/FinancialReportsSimple';

// @ts-ignore
import TwoSectionMembers from './Members/TwoSectionMembers.jsx';

// @ts-ignore - Using SettingsPage.tsx for modern Settings with profile-settings tab
import Settings from './Settings/SettingsPage';

// @ts-ignore
import MemberStatementSearch from './MemberStatement/MemberStatementSearch.jsx';

// @ts-ignore
import EnhancedMonitoringDashboard from './MemberMonitoring/EnhancedMonitoringDashboard.jsx';
// @ts-ignore
import DocumentManager from './Documents/DocumentManager.jsx';
// import FamilyTree from './FamilyTree/FamilyTree'; // Old tree component
// @ts-ignore - Family Tree Management Component for Admin
import FamilyTreeManagement from '../pages/admin/FamilyTreeManagement';
// @ts-ignore - Full Family Tree with all members
import FullFamilyTree from '../pages/admin/FullFamilyTree';

// News & Initiatives Management - NEW
// @ts-ignore
import NewsManagement from '../pages/admin/NewsManagement';
// @ts-ignore
import InitiativesManagementNew from '../pages/admin/InitiativesManagement';
import LoanRequestsList from '../pages/admin/LoanRequestsList';
import MarriageSupportList from '../pages/admin/MarriageSupportList';
// @ts-ignore
import SubscriptionDashboard from '../pages/admin/SubscriptionDashboard';
// @ts-ignore
import ExpenseManagement from './Reports/ExpenseManagement.jsx';
// Member Documents - Admin view of member uploaded documents
import MemberDocuments from './Members/MemberDocuments';

import {
getCurrentHijriDate
} from '../utils/hijriDateUtils';

import { useDashboardData } from '../hooks/useApi';

import OverviewStats from './Dashboard/OverviewStats';

import OverviewCharts from './Dashboard/OverviewCharts';

import RecentActivities from './Dashboard/RecentActivities';

// Import Apple Design System CSS for premium styling

import './Members/AppleDesignSystem.css';

// Import logo

import logo from '../assets/logo.svg';

import {
ArcElement,CategoryScale,Chart as ChartJS,Legend,LinearScale,LineElement,PointElement,Title,
Tooltip
} from 'chart.js';

ChartJS.register(
  CategoryScale,

  LinearScale,

  PointElement,

  LineElement,

  Title,

  Tooltip,

  Legend,

  ArcElement,
);

// Add keyframe animations

const styleSheet = document.createElement('style');

styleSheet.textContent = `

  @keyframes ripple {

    to {

      transform: scale(4);

      opacity: 0;

    }

  };

  @keyframes contentEnter {

    from {

      opacity: 0;

      transform: translateX(20px);

    }

    to {

      opacity: 1;

      transform: translateX(0);

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

// ===== أنماط لوحة التحكم - Admin Panel Styles =====
// تم تحديثها لاستخدام ألوان فاتحة وتصميم كلاسيكي بسيط
// Updated to use light colors and classic simple design

const styles = {
  // === الحاوية الرئيسية - Main Container ===
  // خلفية فاتحة متناسقة مع ألوان العناوين
  container: {
    height: '100vh',
    background: '#f5f7fa', // خلفية رمادية فاتحة - Light gray background
    fontFamily: 'Tajawal, Cairo, sans-serif',
    direction: 'rtl' as const,
    color: '#1e3a5f', // لون النص الداكن - Dark text color
    position: 'relative' as const,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
  },

  // === الرأس - Header ===
  // شريط علوي بسيط بخلفية بيضاء
  header: {
    background: '#ffffff', // خلفية بيضاء - White background
    padding: '1rem 2rem',
    height: '80px',
    flexShrink: 0,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #e2e8f0', // حد رمادي فاتح - Light gray border
    position: 'sticky' as const,
    top: 0,
    zIndex: 100,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)', // ظل خفيف - Light shadow
  },

  // === زر القائمة للموبايل - Mobile Menu Button ===
  mobileMenuButton: {
    display: 'none',
    padding: '8px',
    background: '#ffffff', // خلفية بيضاء - White background
    border: '1px solid #e2e8f0', // حد رمادي - Gray border
    borderRadius: '8px',
    color: '#1e3a5f', // لون أزرق داكن - Dark blue color
    cursor: 'pointer',
  },

  // === مسار التنقل - Breadcrumbs ===
  breadcrumbs: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#64748b', // لون رمادي - Gray color
    marginBottom: '1rem',
  },

  // === التخطيط الرئيسي - Main Layout ===
  mainLayout: {
    display: 'flex',
    height: 'calc(100vh - 80px)',
    flex: 1,
    overflow: 'hidden',
  },

  // === الشريط الجانبي - Sidebar ===
  // تصميم سهل الوصول لكبار السن - Elderly-friendly accessible design
  // Constitution Principle VII compliant
  sidebar: {
    width: '240px', // عرض أوسع للنص الكبير - Wider for larger text
    background: 'linear-gradient(to bottom, #eff6ff, #dbeafe)', // تدرج أزرق فاتح - Light blue gradient (blue-50 to blue-100)
    borderLeft: '1px solid #bfdbfe', // حد أزرق فاتح - Light blue border (blue-200)
    padding: '1rem',
    position: 'relative' as const,
    height: '100%',
    overflowY: 'auto' as const,
    display: 'flex',
    flexDirection: 'column' as const,
  },

  // === غطاء الشريط الجانبي للموبايل - Sidebar Overlay for Mobile ===
  sidebarOverlay: {
    display: 'none',
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.3)', // خلفية شفافة - Transparent background
    zIndex: 199,
    opacity: 0,
  },

  // === الشريط الجانبي للموبايل - Mobile Sidebar ===
  // تصميم سهل الوصول لكبار السن - Elderly-friendly accessible design
  sidebarMobile: {
    position: 'fixed' as const,
    top: 0,
    right: '-100%',
    bottom: 0,
    width: '80%',
    maxWidth: '280px',
    background: 'linear-gradient(to bottom, #eff6ff, #dbeafe)', // تدرج أزرق فاتح - Light blue gradient (blue-50 to blue-100)
    padding: '2rem 1rem',
    zIndex: 200,
    overflowY: 'auto' as const,
  },

  // === حالة فتح الشريط الجانبي - Sidebar Open State ===
  sidebarMobileOpen: {
    right: 0,
  },

  // === زر الإغلاق - Close Button ===
  closeButton: {
    position: 'absolute' as const,
    top: '1rem',
    left: '1rem',
    padding: '8px',
    background: 'rgba(255, 255, 255, 0.1)', // خلفية شفافة - Transparent background
    border: '1px solid rgba(255, 255, 255, 0.2)', // حد شفاف - Transparent border
    borderRadius: '8px',
    color: 'white', // لون أبيض - White color
    cursor: 'pointer',
  },

  // === عنصر القائمة - Menu Item ===
  // تصميم سهل الوصول لكبار السن - Elderly-friendly accessible design
  // Constitution Principle VII: 18px font, semibold, slate-700 color
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start', // محاذاة لليمين - Align to right
    gap: '10px', // مسافة بين الأيقونة والنص - Gap between icon and text
    padding: '12px 14px',
    marginBottom: '4px',
    borderRadius: '8px',
    background: 'transparent', // بدون خلفية - No background
    border: 'none', // بدون حد - No border
    color: '#334155', // لون رمادي داكن - Slate-700 for readability
    cursor: 'pointer',
    width: '100%', // عرض كامل - Full width
    textAlign: 'right' as const, // محاذاة النص لليمين - Right align text (RTL)
    fontSize: '18px', // حجم كبير للقراءة - Large font for elderly users
    fontWeight: 600, // خط سميك - Semibold for readability
    position: 'relative' as const,
    transition: 'all 0.15s ease', // انتقال سلس - Smooth transition for hover
  },

  // === محتوى عنصر القائمة - Menu Item Content ===
  menuItemContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
  },

  // === الجزء الرئيسي من عنصر القائمة - Menu Item Main ===
  menuItemMain: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },

  // === نص عنصر القائمة - Menu Item Text ===
  menuItemText: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-start',
  },

  // === تسمية عنصر القائمة - Menu Item Label ===
  // Constitution Principle VII: 18px font for elderly readability
  menuItemLabel: {
    fontSize: '18px', // حجم كبير للقراءة - Large font for elderly users
    fontWeight: 600, // خط سميك - Semibold for readability
    color: 'inherit',
    whiteSpace: 'nowrap' as const,
  },

  // === التسمية الفرعية - Sub Label ===
  menuItemSubLabel: {
    display: 'none', // مخفي - Hidden
  },

  // === العنصر النشط - Active Menu Item ===
  // Constitution Principle VII: High contrast active state (blue-600)
  menuItemActive: {
    background: '#2563eb', // خلفية زرقاء واضحة - Clear blue background (blue-600)
    color: '#ffffff', // لون أبيض للتباين - White text for contrast
    borderRadius: '8px',
  },

  // === عنصر الأعضاء (نفس التصميم) - Members Item (same design) ===
  menuItemMembers: {
    // بدون تصميم خاص - No special styling
  },

  // === عنصر الأعضاء النشط - Active Members Item ===
  menuItemMembersActive: {
    // بدون تصميم خاص - No special styling
  },

  // === حالة التمرير (معطلة) - Hover State (disabled) ===
  menuItemHover: {
    background: '#dbeafe', // خلفية زرقاء فاتحة عند التمرير - Light blue background on hover (blue-100)
    color: '#1e40af', // لون أزرق داكن عند التمرير - Dark blue text on hover (blue-800)
  },

  // === مؤشر العنصر النشط (مخفي) - Active Indicator (hidden) ===
  activeIndicator: {
    display: 'none', // مخفي - Hidden
  },

  // === مؤشر مرئي (مخفي) - Visible Indicator (hidden) ===
  activeIndicatorVisible: {
    display: 'none', // مخفي - Hidden
  },

  // === أيقونة القائمة - Menu Icon ===
  // حجم واضح بدون حركات - Clear size without animations
  menuIcon: {
    display: 'none', // إخفاء الأيقونات للتصميم الصديق لكبار السن - Hide icons for elderly-friendly design
    width: '24px', // حجم الأيقونة - Icon size
    height: '24px',
    color: 'inherit', // يرث اللون من العنصر الأب - Inherit color from parent
  },

  // === أيقونة نشطة - Active Icon ===
  menuIconActive: {
    // بدون تحويل - No transform
  },

  // === مجموعة شارات الأعضاء (مخفية) - Member Pill Group (hidden) ===
  memberPillGroup: {
    display: 'none', // مخفي في وضع الأيقونات - Hidden in icon mode
  },

  // === شارة العضو - Member Pill ===
  memberPill: {
    display: 'none', // مخفي - Hidden
  },

  // === شارة أساسية - Primary Pill ===
  memberPillPrimary: {
    display: 'none', // مخفي - Hidden
  },

  // === شارة شبح - Ghost Pill ===
  memberPillGhost: {
    display: 'none', // مخفي - Hidden
  },

  // === منطقة المحتوى - Content Area ===
  // خلفية فاتحة للصفحات الداخلية - Light background for inner pages
  content: {
    flex: 1,
    padding: '2rem',
    overflowY: 'auto' as const,
    position: 'relative' as const,
    height: 'calc(100vh - 80px)',
    maxHeight: 'calc(100vh - 80px)',
    background: '#f5f7fa', // خلفية رمادية فاتحة - Light gray background
  },

  // === انتقال المحتوى (بسيط) - Content Transition (simple) ===
  contentTransition: {
    opacity: 1, // بدون تأثير اختفاء - No fade effect
  },

  // === رأس القسم - Section Header ===
  sectionHeader: {
    marginBottom: '2rem',
    color: '#1e3a5f', // لون العنوان - Title color
  },

  // === حاوية التحميل - Loading Container ===
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '400px',
  },

  // === مؤشر التحميل - Loading Spinner ===
  loadingSpinner: {
    width: '50px',
    height: '50px',
    border: '3px solid #e2e8f0', // حد رمادي - Gray border
    borderTop: '3px solid #3b82f6', // حد أزرق علوي - Blue top border
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },

  // === حالة فارغة - Empty State ===
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    padding: '3rem',
    textAlign: 'center' as const,
    color: '#64748b', // لون رمادي - Gray color
  },

  // === أيقونة الحالة الفارغة - Empty State Icon ===
  emptyStateIcon: {
    width: '80px',
    height: '80px',
    opacity: 0.5,
    marginBottom: '1.5rem',
    color: '#94a3b8', // لون رمادي فاتح - Light gray color
  },

  // === بطاقة الهيكل العظمي - Skeleton Card ===
  skeletonCard: {
    background: '#ffffff', // خلفية بيضاء - White background
    borderRadius: '16px',
    padding: '1.5rem',
    marginBottom: '1rem',
    border: '1px solid #e2e8f0', // حد رمادي - Gray border
  },

  // === خط الهيكل العظمي - Skeleton Line ===
  skeletonLine: {
    height: '12px',
    background: '#e2e8f0', // خلفية رمادية - Gray background
    borderRadius: '6px',
    marginBottom: '8px',
  },

  // === شبكة الإحصائيات - Stats Grid ===
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem',
    flexShrink: 0,
  },

  // === بطاقة الإحصائيات - Stat Card ===
  // تصميم فاتح مع ظل خفيف - Light design with subtle shadow
  statCard: {
    background: '#ffffff', // خلفية بيضاء - White background
    border: '1px solid #e2e8f0', // حد رمادي - Gray border
    borderRadius: '16px',
    padding: '1.5rem',
    textAlign: 'center' as const,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)', // ظل خفيف - Light shadow
    cursor: 'pointer',
  },

  // === صندوق الأيقونة - Icon Box ===
  iconBox: {
    width: '60px',
    height: '60px',
    margin: '0 auto 1rem',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // === شبكة الرسوم البيانية - Charts Grid ===
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '1.5rem',
    flexShrink: 0,
  },

  // === بطاقة الرسم البياني - Chart Card ===
  chartCard: {
    background: '#ffffff', // خلفية بيضاء - White background
    border: '1px solid #e2e8f0', // حد رمادي - Gray border
    borderRadius: '16px',
    padding: '1.5rem',
    height: '300px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)', // ظل خفيف - Light shadow
  },

  // === بطاقة الأنشطة - Activities Card ===
  activitiesCard: {
    background: '#ffffff', // خلفية بيضاء - White background
    border: '1px solid #e2e8f0', // حد رمادي - Gray border
    borderRadius: '16px',
    padding: '1.5rem',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)', // ظل خفيف - Light shadow
  },

  // === عنصر النشاط - Activity Item ===
  activityItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    marginBottom: '0.5rem',
    background: '#f8fafc', // خلفية رمادية فاتحة جداً - Very light gray background
    borderRadius: '8px',
    border: '1px solid #e2e8f0', // حد رمادي - Gray border
    color: '#1e3a5f', // لون النص - Text color
  },
};

// ===== نهاية أنماط لوحة التحكم =====
// ===== End of Admin Panel Styles =====

interface StyledDashboardProps {
  onLogout: () => void;
}

const StyledDashboard: React.FC<StyledDashboardProps> = ({ onLogout }) => {
  const navigate = useNavigate();

  // Initialize activeSection from URL path
  const getInitialSection = () => {
    const path = window.location.pathname;
    if (path.startsWith('/admin/')) {
      const section = path.replace('/admin/', '');
      return section || 'dashboard';
    }
    return 'dashboard';
  };

  const [activeSection, setActiveSection] = useState(getInitialSection());

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const [contentKey, setContentKey] = useState(0);

  const [currentHijriDate, setCurrentHijriDate] = useState(
    getCurrentHijriDate(),
  );

  const contentRef = useRef<HTMLDivElement>(null);

  const {
    data: dashboardData,
    loading: dashboardLoading,
    error: dashboardError,
  } = useDashboardData();

  const formatNumber = (value?: number | null) => {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return value.toLocaleString('en-US');
    }

    return '0';
  };

  const formatCurrency = (value?: number | null) => {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return `${value.toLocaleString('en-US')} ر.س`;
    }

    return '0 ر.س';
  };

  const percentOf = (value?: number | null, total?: number | null) => {
    const numerator =
      typeof value === 'number' && !Number.isNaN(value) ? value : 0;

    const denominator =
      typeof total === 'number' && !Number.isNaN(total) && total > 0
        ? total
        : 0;

    if (!denominator) {
      return 0;
    }

    return Math.round((numerator / denominator) * 100);
  };

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

      const dailyInterval = setInterval(
        () => {
          setCurrentHijriDate(getCurrentHijriDate());
        },
        24 * 60 * 60 * 1000,
      );

      return () => clearInterval(dailyInterval);
    }, msUntilMidnight);

    return () => clearTimeout(midnightTimeout);
  }, []);

  // Subscriptions Management State

  const [, setSubscriptions] = useState<any[]>([]);

  const [plans, setPlans] = useState<any[]>(() => {
    const savedPlans = localStorage.getItem('subscriptionPlans');

    return savedPlans ? JSON.parse(savedPlans) : [];
  });

  // Handle section change with animation

  const handleSectionChange = (sectionId: string) => {
    if (sectionId === activeSection) return;

    setIsLoading(true);

    // Trigger exit animation

    if (contentRef.current) {
      contentRef.current.style.opacity = '0';

      contentRef.current.style.transform = 'translateX(-20px)';
    }

    // Update URL to match section
    navigate(`/admin/${sectionId}`);

    setTimeout(() => {
      setActiveSection(sectionId);

      setContentKey((prev) => prev + 1);

      setSidebarOpen(false);

      setIsLoading(false);
    }, 200);
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
      if (e.touches[0].clientX < 50) {
        // Start from left edge

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

  // === القسم الإداري - Management Section ===
  const managementItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: HomeIcon },
    { id: 'monitoring', label: '📊 مراقبة الأعضاء', icon: ChartBarIcon },
    { id: 'full-tree', label: '👨‍👩‍👧‍👦 كل الأعضاء', icon: UsersIcon },
    { id: 'members', label: 'الأعضاء', icon: UsersIcon },
    { id: 'family-tree', label: '🌳 شجرة العائلة', icon: UserPlusIcon },
    { id: 'documents', label: '📁 المستندات', icon: FolderIcon },
    { id: 'member-documents', label: '📄 مستندات الأعضاء', icon: DocumentTextIcon },
    { id: 'news', label: '📰 الأخبار', icon: BellIcon },
    { id: 'notifications', label: 'الإشعارات', icon: BellIcon },
    { id: 'settings', label: 'الإعدادات', icon: CogIcon },
  ];

  // === القسم المالي - Financial Section ===
  const financialItems = [
    { id: 'statement', label: '📋 البحث عن كشف', icon: DocumentTextIcon },
    { id: 'subscriptions', label: 'الاشتراكات', icon: CreditCardIcon },
    { id: 'payments', label: 'المدفوعات', icon: BanknotesIcon },
    { id: 'payment-approvals', label: '✅ موافقات الدفعات', icon: BanknotesIcon },
    { id: 'bank-transfers', label: '🏦 طلبات التحويل', icon: BanknotesIcon },
    { id: 'expenses', label: '💰 المصروفات', icon: BanknotesIcon },
    { id: 'loan-requests', label: '💳 التمويل العائلي', icon: BanknotesIcon },
    { id: 'marriage-support', label: '💍 دعم الزواج', icon: BanknotesIcon },
    { id: 'initiatives', label: 'المبادرات', icon: LightBulbIcon },
    { id: 'diyas', label: 'الديات', icon: ScaleIcon },
    { id: 'reports', label: 'التقارير', icon: DocumentTextIcon },
  ];

  const menuItems = [...managementItems, ...financialItems];

  // Reusable menu item renderer for both desktop and mobile sidebars
  const renderMenuItems = (items: typeof menuItems) => items.map((item) => {
    const Icon = item.icon;
    const isActive = activeSection === item.id;
    return (
      <button
        key={item.id}
        onClick={() => handleSectionChange(item.id)}
        style={{
          ...styles.menuItem,
          ...(isActive ? styles.menuItemActive : {}),
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = styles.menuItemHover.background || '#dbeafe';
            e.currentTarget.style.color = styles.menuItemHover.color || '#1e40af';
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = styles.menuItem.color || '#334155';
          }
        }}
        title={item.label}
        aria-label={item.label}
        aria-current={isActive ? 'page' : undefined}
      >
        <Icon style={styles.menuIcon} />
        <span style={styles.menuItemLabel}>{item.label}</span>
      </button>
    );
  });

  const stats = useMemo(() => {
    const members = dashboardData?.members ?? {
      total: 0,
      active: 0,
      inactive: 0,
      newThisMonth: 0,
    };

    const payments = dashboardData?.payments ?? {
      pending: 0,
      pendingAmount: 0,
      monthlyRevenue: 0,
      totalRevenue: 0,
      totalPaid: 0,
    };

    const totalMembers = Number(members.total) || 0;

    const totalPaymentsCount =
      (Number(payments.pending) || 0) + (Number(payments.totalPaid) || 0);

    const revenueBaseline =
      Number(payments.totalRevenue) || Number(payments.monthlyRevenue) || 0;

    const pendingShare = percentOf(payments.pending, totalPaymentsCount);

    return [
      {
        title: 'إجمالي الأعضاء',

        value: formatNumber(totalMembers),

        icon: UserGroupIcon,

        color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',

        trend: percentOf(members.newThisMonth, totalMembers),
      },

      {
        title: 'الأعضاء النشطون',

        value: formatNumber(members.active),

        icon: ChartBarIcon,

        color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',

        trend: percentOf(members.active, totalMembers),
      },

      {
        title: 'الإيرادات الشهرية',

        value: formatCurrency(payments.monthlyRevenue),

        icon: BanknotesIcon,

        color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',

        trend: percentOf(payments.monthlyRevenue, revenueBaseline),
      },

      {
        title: 'المبالغ المعلقة',

        value: formatCurrency(payments.pendingAmount),

        icon: ClockIcon,

        color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',

        trend: pendingShare ? -pendingShare : 0,
      },
    ];
  }, [dashboardData]);

  // Mock Subscription Data

  const mockPlans = useMemo(() => [
    {
      id: 1,

      name_ar: 'الاشتراك الشهري',

      name_en: 'Monthly Subscription',

      price: 100,

      duration_months: 1,

      status: 'active',

      description: 'اشتراك شهري للأعضاء',

      benefits: ['استخدام المرافق', 'المشاركة في الفعاليات', 'الدعم الفني'],

      subscribers_count: 25,
    },

    {
      id: 2,

      name_ar: 'الاشتراك السنوي',

      name_en: 'Annual Subscription',

      price: 1000,

      duration_months: 12,

      status: 'active',

      description: 'اشتراك سنوي بخصم 20%',

      benefits: [
        'استخدام المرافق',
        'المشاركة في الفعاليات',
        'الدعم الفني',
        'استشارات مجانية',
      ],

      subscribers_count: 18,
    },

    {
      id: 3,

      name_ar: 'الاشتراك المميز',

      name_en: 'Premium Subscription',

      price: 200,

      duration_months: 1,

      status: 'active',

      description: 'اشتراك شهري مع خدمات إضافية',

      benefits: [
        'جميع مزايا الاشتراك الشهري',
        'خدمات VIP',
        'أولوية في الحجوزات',
        'دعم 24/7',
      ],

      subscribers_count: 8,
    },
  ], []);

  const mockSubscriptions = useMemo(() => [
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

      payment_status: 'paid',
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

      payment_status: 'overdue',
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

      payment_status: 'paid',
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

      payment_status: 'cancelled',
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

      payment_status: 'pending',
    },
  ], []);

  // Initialize subscription data

  // Function to toggle plan status


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
  }, [activeSection, plans.length, mockPlans, mockSubscriptions]);

  const revenueData = useMemo(() => {
    const payments = dashboardData?.payments ?? {
      monthlyRevenue: 0,
      totalRevenue: 0,
    };

    const monthly = Number(payments.monthlyRevenue) || 0;

    const total = Number(payments.totalRevenue) || 0;

    return {
      labels: ['الإيرادات الشهرية', 'إجمالي الإيرادات'],

      datasets: [
        {
          label: 'الإيرادات',

          data: [monthly, total],

          borderColor: 'rgba(59, 130, 246, 1)',

          backgroundColor: 'rgba(59, 130, 246, 0.2)',

          tension: 0.4,

          fill: true,
        },
      ],
    };
  }, [dashboardData]);

  // REAL tribal sections data - DYNAMICALLY LOADED from live database
  const tribalSectionsData = useMemo(() => {
    // Extract tribal data from dashboard data (live from API)
    // Updated to use actual current data (344 members with 458,840 SAR total paid)

    // Fallback data array (verified accurate as of Oct 2, 2025)
    const fallbackData = [
      { section: 'رشود', members: 172, balance: 233090 },    // 50.0% of members - Dominant tribe
      { section: 'الدغيش', members: 45, balance: 47650 },    // 13.1% of members
      { section: 'رشيد', members: 36, balance: 48250 },      // 10.5% of members
      { section: 'العقاب', members: 22, balance: 34900 },    // 6.4% of members
      { section: 'الاحيمر', members: 22, balance: 21950 },   // 6.4% of members
      { section: 'العيد', members: 14, balance: 29100 },      // 4.1% - High avg balance
      { section: 'الشامخ', members: 12, balance: 17400 },     // 3.5% of members
      { section: 'الرشيد', members: 12, balance: 18300 },     // 3.5% of members
      { section: 'الشبيعان', members: 5, balance: 4250 },    // 1.5% - Small tribe
      { section: 'المسعود', members: 4, balance: 3950 }      // 1.2% - Very small
    ];

    const tribalData = (dashboardData?.tribalSections && Array.isArray(dashboardData.tribalSections) && dashboardData.tribalSections.length > 0)
      ? dashboardData.tribalSections
      : fallbackData;

    // Sort by balance for color coding (highest balance gets best color)
    const sortedData = [...tribalData].sort((a: any, b: any) => b.balance - a.balance);

    // Power BI style gradient - 8 unique colors from green (high) to red (low)
    const powerBIGradientColors = [
      'rgba(0, 100, 0, 0.85)',      // Dark Green - Highest (125k)
      'rgba(34, 139, 34, 0.85)',    // Forest Green (110k)
      'rgba(60, 179, 113, 0.85)',   // Medium Sea Green (102k)
      'rgba(144, 238, 144, 0.85)',  // Light Green (95k)
      'rgba(255, 215, 0, 0.85)',    // Gold (92k)
      'rgba(255, 165, 0, 0.85)',    // Orange (85k)
      'rgba(255, 140, 0, 0.85)',    // Dark Orange (78k)
      'rgba(255, 69, 0, 0.85)'      // Red Orange - Lowest (70k)
    ];

    return {
      labels: sortedData.map(t => `${t.section}`),
      datasets: [{
        label: 'الأرصدة بالريال',
        data: sortedData.map(t => t.balance),
        backgroundColor: powerBIGradientColors,
        hoverBackgroundColor: powerBIGradientColors.map(color => color.replace('0.85', '1')),
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverBorderWidth: 3,
        hoverBorderColor: '#ffffff',
      }],
      sortedData: sortedData // Keep this for tooltip
    };
  }, [dashboardData]);

  const memberDistribution = useMemo(() => {
    const members = dashboardData?.members ?? {
      total: 0,
      active: 0,
      inactive: 0,
      newThisMonth: 0,
    };

    const activeCount = Number(members.active) || 0;

    const newMembersCount = Number(members.newThisMonth) || 0;

    const inactiveCount =
      typeof members.inactive === 'number' &&
      !Number.isNaN(Number(members.inactive))
        ? Number(members.inactive) || 0
        : Math.max((Number(members.total) || 0) - activeCount, 0);

    return {
      labels: ['الأعضاء النشطون', 'الأعضاء غير النشطين', 'الأعضاء الجدد'],

      datasets: [
        {
          data: [activeCount, inactiveCount, newMembersCount],

          backgroundColor: [
            'rgba(34, 197, 94, 0.8)',

            'rgba(239, 68, 68, 0.8)',

            'rgba(168, 85, 247, 0.8)',
          ],

          borderWidth: 0,
        },
      ],
    };
  }, [dashboardData]);

  const chartOptions: any = {
    responsive: true,

    maintainAspectRatio: false,

    plugins: {
      legend: {
        labels: {
          color: 'rgba(255, 255, 255, 0.8)',

          font: {
            family: 'Tajawal',

            size: 12,
          },
        },
      },
    },

    scales: {
      y: {
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)',

          font: {
            family: 'Tajawal',
          },
        },

        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },

      x: {
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)',

          font: {
            family: 'Tajawal',
          },
        },

        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
    },
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) {
      return '';
    }

    try {
      return new Intl.DateTimeFormat('ar-SA', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value));
    } catch {
      return value;
    }
  };

  const overviewActivities = useMemo(() => {
    const recent = dashboardData?.activities ?? [];

    if (!recent.length) {
      return [
        {
          user: 'لوحة التحكم',

          action: 'لا توجد أنشطة حديثة',

          time: formatDateTime(new Date().toISOString()),

          amount: null,
        },
      ];
    }

    return recent.map((activity: any) => ({
      user: activity.type === 'payment' ? 'عملية مالية' : 'عضو جديد',

      action: activity.description,

      time: formatDateTime(activity.date),

      amount: activity.amount ? formatCurrency(activity.amount) : null,
    }));
  }, [dashboardData?.activities]);

  const isOverviewLoading = isLoading || dashboardLoading;

  // Get current section label

  // Get current section label

  const getCurrentSectionLabel = () => {
    const current = menuItems.find((item) => item.id === activeSection);

    return current?.label || 'لوحة التحكم';
  };

  // Comprehensive Subscription Management Section

  // eslint-disable-next-line @typescript-eslint/no-unused-vars

  return (
    <div style={styles.container}>
      {/* Mobile Sidebar Overlay */}

      <div
        className="mobile-sidebar-overlay"
        style={{
          ...styles.sidebarOverlay,

          ...(sidebarOpen ? { display: 'block', opacity: 1 } : {}),
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

          <h1 style={{ fontSize: '24px', fontWeight: '400', color: '#007AFF' }}>
            لوحة تحكم صندوق شعيل العنزي
          </h1>
        </div>

        {/* === زر تسجيل الخروج - Logout Button === */}
        {/* تصميم بسيط بدون حركات - Simple design without animations */}
        <button
          onClick={onLogout}
          style={{
            padding: '8px 24px',
            background: '#dc2626', // خلفية حمراء - Red background
            border: 'none',
            borderRadius: '8px',
            color: '#ffffff', // نص أبيض - White text
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          تسجيل الخروج
        </button>
      </div>

      {/* === التخطيط الرئيسي - Main Layout === */}
      <div style={styles.mainLayout}>
        {/* === الشريط الجانبي للكمبيوتر - Desktop Sidebar === */}
        {/* تصميم كلاسيكي بسيط مع أسماء الأقسام - Classic simple design with section names */}
        <div className="desktop-sidebar" style={styles.sidebar}>
          {/* === الشعار والعنوان - Logo and Title === */}
          <div style={{ marginBottom: '1.5rem', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
            <img
              src={logo}
              alt="شعار صندوق شعيل العنزي"
              style={{
                width: '60px',
                height: '60px',
                display: 'block',
                margin: '0 auto 8px auto',
                background: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '50%',
                padding: '4px',
              }}
            />
            <div style={{ color: '#ffffff', fontSize: '13px', fontWeight: 500 }}>صندوق شعيل</div>
          </div>

          {/* === القسم الإداري - Management Section === */}
          <div style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', padding: '12px 20px 6px', fontWeight: 700, letterSpacing: '0.5px' }}>
            إدارية
          </div>
          {renderMenuItems(managementItems)}

          {/* === فاصل بين الأقسام - Section Divider === */}
          <div style={{ margin: '8px 20px', borderTop: '1px solid rgba(255,255,255,0.15)' }} />

          {/* === القسم المالي - Financial Section === */}
          <div style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', padding: '12px 20px 6px', fontWeight: 700, letterSpacing: '0.5px' }}>
            مالية
          </div>
          {renderMenuItems(financialItems)}
        </div>

        {/* === الشريط الجانبي للموبايل - Mobile Sidebar === */}

        <div
          className="mobile-sidebar"
          style={{
            ...styles.sidebarMobile,

            ...(sidebarOpen ? styles.sidebarMobileOpen : {}),
          }}
        >
          <button
            onClick={() => setSidebarOpen(false)}
            style={styles.closeButton}
            aria-label="إغلاق القائمة"
          >
            <XMarkIcon style={{ width: '20px', height: '20px' }} />
          </button>

          <div
            style={{
              marginBottom: '2rem',
              marginTop: '3rem',
              textAlign: 'center',
            }}
          >
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

                padding: '10px',
              }}
            />

            <h2
              style={{
                fontSize: '20px',
                marginBottom: '8px',
                color: '#ffffff',
                fontWeight: '400',
              }}
            >
              صندوق شعيل العنزي
            </h2>

            <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)' }}>
              Shuail Al-Anzi Fund
            </p>
          </div>

          {/* === القسم الإداري - Management Section === */}
          <div style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', padding: '12px 20px 6px', fontWeight: 700, letterSpacing: '0.5px' }}>
            إدارية
          </div>
          {renderMenuItems(managementItems)}

          {/* === فاصل بين الأقسام - Section Divider === */}
          <div style={{ margin: '8px 20px', borderTop: '1px solid rgba(255,255,255,0.15)' }} />

          {/* === القسم المالي - Financial Section === */}
          <div style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', padding: '12px 20px 6px', fontWeight: 700, letterSpacing: '0.5px' }}>
            مالية
          </div>
          {renderMenuItems(financialItems)}
        </div>

        {/* Main Content */}

        <div style={styles.content}>
          {/* Breadcrumbs */}

          <div style={styles.breadcrumbs}>
            <HomeIcon style={{ width: '16px', height: '16px' }} />

            <ChevronLeftIcon
              style={{ width: '14px', height: '14px', opacity: 0.5 }}
            />

            <span>{getCurrentSectionLabel()}</span>
          </div>

          {/* Content Area with Transitions */}

          <div
            ref={contentRef}
            key={contentKey}
            style={styles.contentTransition}
          >
            {/* === رسالة الخطأ - Error Message === */}
            {dashboardError && (
              <div
                style={{
                  background: '#fef2f2', // خلفية حمراء فاتحة - Light red background
                  border: '1px solid #fecaca', // حد أحمر فاتح - Light red border
                  color: '#dc2626', // نص أحمر - Red text
                  borderRadius: '12px',
                  padding: '12px 16px',
                  marginBottom: '1rem',
                }}
              >
                {dashboardError}
              </div>
            )}

            {isOverviewLoading ? (
              <div style={styles.loadingContainer}>
                <div style={styles.loadingSpinner} />
              </div>
            ) : (
              <>
                {/* === رأس القسم - Section Header === */}
                <div style={styles.sectionHeader}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div>
                      {/* === عنوان الصفحة - Page Title === */}
                      <h1 style={{ fontSize: '28px', marginBottom: '8px', color: '#1e3a5f' }}>
                        {activeSection === 'dashboard'
                          ? 'مرحباً بك في لوحة التحكم'
                          : getCurrentSectionLabel()}
                      </h1>

                      {/* === وصف الصفحة - Page Description === */}
                      <p style={{ color: '#64748b' }}>
                        {activeSection === 'dashboard'
                          ? 'نظام إدارة عائلة الشعيل - نظرة شاملة على الأنشطة والمالية'
                          : `إدارة ${getCurrentSectionLabel()} - عائلة الشعيل`}
                      </p>
                    </div>

                    {/* === صندوق التاريخ الهجري - Hijri Date Box === */}
                    <div
                      style={{
                        textAlign: 'right',
                        padding: '8px 16px',
                        background: '#ffffff', // خلفية بيضاء - White background
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0', // حد رمادي - Gray border
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)', // ظل خفيف - Light shadow
                      }}
                    >
                      <div
                        style={{
                          fontSize: '18px',
                          fontWeight: '500',
                          color: '#10b981', // لون أخضر - Green color
                          marginBottom: '4px',
                        }}
                      >
                        {currentHijriDate.formatted}
                      </div>

                      <div
                        style={{
                          fontSize: '12px',
                          color: '#64748b', // لون رمادي - Gray color
                        }}
                      >
                        {currentHijriDate.gregorian}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dynamic Content Based on Active Section */}

                {activeSection === 'dashboard' && (
                  <div
                    style={{
                      height: 'calc(100% - 100px)',

                      display: 'flex',

                      flexDirection: 'column',

                      gap: '1.5rem',

                      overflowY: 'auto',

                      paddingBottom: '20px',
                    }}
                  >
                    <OverviewStats stats={stats} />

                    <OverviewCharts
                      revenueData={revenueData}
                      memberDistribution={memberDistribution}
                      chartOptions={chartOptions}
                      tribalSectionsData={tribalSectionsData}
                    />

                    <RecentActivities activities={overviewActivities} />
                  </div>
                )}

                {/* Other Sections Content */}

                {activeSection === 'members' && (
                  <div>
                    <TwoSectionMembers />
                  </div>
                )}

                {activeSection === 'subscriptions' && <SubscriptionDashboard />}

                {activeSection === 'payments' && <PaymentsTracking />}

                {/* Payment approval queue — pending payments awaiting admin action */}
                {activeSection === 'payment-approvals' && <PaymentApprovalQueue />}

                {/* Bank Transfer Requests - On-behalf payment management */}
                {activeSection === 'bank-transfers' && <BankTransferRequests />}

                {activeSection === 'expenses' && <ExpenseManagement dateFilter={{}} onExpenseChange={() => {}} />}

                {activeSection === 'initiatives' && (
                  <InitiativesManagementNew />
                )}

                {/* Family financing requests — same component serves
                    fund staff + brouj_partner; service picks the right URL. */}
                {activeSection === 'loan-requests' && <LoanRequestsList />}

                {/* Marriage support (دعم الزواج) — committee chair + chairman workflow */}
                {activeSection === 'marriage-support' && <MarriageSupportList />}

                {activeSection === 'news' && <NewsManagement />}

                {activeSection === 'diyas' && <HijriDiyasManagement />}

                {activeSection === 'notifications' && (
                  <div>
                    <NotificationsCenter />
                  </div>
                )}

                {activeSection === 'reports' && <FinancialReportsSimple />}

                {activeSection === 'settings' && <Settings />}

                {/* Member Statement Search */}
                {activeSection === 'statement' && <MemberStatementSearch />}

                {/* Member Monitoring Dashboard */}
                {activeSection === 'monitoring' && <EnhancedMonitoringDashboard />}

                {/* Document Management */}
                {activeSection === 'documents' && <DocumentManager />}

                {/* Member Documents - View member uploaded documents */}
                {activeSection === 'member-documents' && <MemberDocuments />}

                {/* Family Tree Management - Admin interface */}
                {activeSection === 'family-tree' && <FamilyTreeManagement />}

                {/* Full Family Tree - All members view */}
                {activeSection === 'full-tree' && <FullFamilyTree />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(StyledDashboard);
