import React, { useState, useEffect, useMemo, useCallback } from 'react';
// Optimized imports - only icons actually used in this component
import {
  HandRaisedIcon,
  ScaleIcon,
  UsersIcon,
  BanknotesIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ShieldExclamationIcon,
  XMarkIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
import { HijriDateDisplay, HijriDateFilter, HijriCalendarWidget } from '../Common/HijriDateDisplay';
import { HijriDateInput } from '../Common/HijriDateInput';
import { formatHijriDate, formatDualDate, formatTimeAgo, isOverdue, getDaysUntil } from '../../utils/hijriDateUtils';
import { toHijri, toGregorian } from 'hijri-converter';
import '../../styles/ultra-premium-islamic-design.css';

// ========================================
// Helper Functions (Moved Outside Component for Performance)
// ========================================

const getStatusInfo = (status: string) => {
  const statuses: Record<string, any> = {
    active: { label: 'نشطة', color: '#007AFF', icon: CheckCircleIcon, bgColor: 'bg-blue-100' },
    completed: { label: 'مكتملة', color: '#30D158', icon: CheckCircleIcon, bgColor: 'bg-green-100' },
    urgent: { label: 'عاجلة', color: '#FF3B30', icon: ExclamationTriangleIcon, bgColor: 'bg-red-100' },
    pending: { label: 'معلقة', color: '#FF9500', icon: ClockIcon, bgColor: 'bg-orange-100' }
  };
  return statuses[status] || statuses.active;
};

const getPriorityInfo = (priority: string) => {
  const priorities: Record<string, any> = {
    high: { label: 'عالية', color: '#FF3B30' },
    medium: { label: 'متوسطة', color: '#FF9500' },
    low: { label: 'منخفضة', color: '#8E8E93' }
  };
  return priorities[priority] || priorities.medium;
};

const getCategoryInfo = (category: string) => {
  const categories: Record<string, any> = {
    accident: { label: 'حادث', icon: ShieldExclamationIcon, gradient: 'from-red-500 to-orange-500' },
    medical: { label: 'طبي', icon: HandRaisedIcon, gradient: 'from-blue-500 to-cyan-500' },
    dispute: { label: 'خلاف', icon: ScaleIcon, gradient: 'from-purple-500 to-pink-500' },
    other: { label: 'أخرى', icon: DocumentTextIcon, gradient: 'from-gray-500 to-gray-600' }
  };
  return categories[category] || categories.other;
};

interface Diya {
  id: number;
  caseNumber: string;
  title: string;
  description: string;
  totalAmount: number;
  collectedAmount: number;
  remainingAmount: number;
  status: 'active' | 'completed' | 'urgent' | 'pending';
  priority: 'high' | 'medium' | 'low';
  startDate: string;
  deadline: string;
  contributorsCount: number;
  beneficiary: string;
  createdBy: string;
  category: 'accident' | 'medical' | 'dispute' | 'other';
  documents: string[];
  payments: Payment[];
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

interface Payment {
  id: number;
  contributorName: string;
  amount: number;
  date: string;
  paymentMethod: 'cash' | 'bank' | 'online';
  receiptNumber?: string;
}

interface Contributor {
  member_id: string;
  member_name: string;
  membership_number: string;
  tribal_section: string;
  amount: number;
  contribution_date: string;
  payment_method: string;
}

const HijriDiyasManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [diyas, setDiyas] = useState<Diya[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDiya, setSelectedDiya] = useState<Diya | null>(null);
  const [fromHijriDate, setFromHijriDate] = useState('');
  const [fromGregorianDate, setFromGregorianDate] = useState('');
  const [toHijriDate, setToHijriDate] = useState('');
  const [toGregorianDate, setToGregorianDate] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [showContributorsModal, setShowContributorsModal] = useState(false);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [contributorsPage, setContributorsPage] = useState(1);
  const [contributorsTotalPages, setContributorsTotalPages] = useState(1);
  const [contributorsTotal, setContributorsTotal] = useState(0);
  const [contributorsLoading, setContributorsLoading] = useState(false);
  const contributorsPerPage = 50;

  // Fetch real Diyas data from database
  const fetchDiyas = async () => {
    setLoading(true);
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'https://proshael.onrender.com';
      const response = await fetch(`${API_URL}/api/diyas`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch diyas');
      }

      const result = await response.json();

      if (result.success && result.data) {
        // Transform activities table data to match component interface
        const transformedDiyas = result.data.map((diya: any) => ({
          id: diya.id,
          caseNumber: diya.case_number || `DY-${diya.id.slice(0, 8)}`,
          title: diya.title_ar || diya.title_en || 'دية',
          description: diya.description_ar || diya.description_en || '',
          totalAmount: Number(diya.target_amount) || 0,
          collectedAmount: Number(diya.current_amount) || 0,
          remainingAmount: (Number(diya.target_amount) || 0) - (Number(diya.current_amount) || 0),
          status: diya.status === 'completed' ? 'completed' : diya.status === 'active' ? 'active' : 'pending',
          priority: diya.urgency_level >= 4 ? 'high' : diya.urgency_level >= 2 ? 'medium' : 'low',
          startDate: diya.collection_start_date || diya.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          deadline: diya.collection_deadline || diya.collection_end_date || diya.updated_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          contributorsCount: diya.contributor_count || diya.contribution_count || diya.financial_contributions?.length || 0,
          beneficiary: diya.beneficiary_name_ar || diya.beneficiary_name_en || 'غير محدد',
          createdBy: 'الإدارة',
          category: 'other',
          documents: [],
          payments: (diya.financial_contributions || []).slice(0, 10).map((contrib: any) => ({
            id: contrib.id,
            contributorName: contrib.contributor_name || 'عضو',
            amount: Number(contrib.contribution_amount) || 0,
            date: contrib.contribution_date || contrib.created_at,
            paymentMethod: contrib.payment_method || 'cash',
            receiptNumber: contrib.payment_reference
          })),
          createdAt: diya.created_at,
          updatedAt: diya.updated_at,
          notes: diya.internal_notes || diya.public_notes_ar || ''
        }));

        setDiyas(transformedDiyas);
        console.log(`✅ Loaded ${transformedDiyas.length} real Diyas from database with ${transformedDiyas.reduce((sum: number, d: Diya) => sum + d.contributorsCount, 0)} total contributors`);
      }
    } catch (error) {
      console.error('Error fetching diyas:', error);
      // Keep empty array on error
      setDiyas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiyas();
  }, []);

  // Fetch contributors for a specific diya with server-side pagination
  const fetchContributors = async (diyaId: number | string, page: number = 1) => {
    try {
      setContributorsLoading(true);
      const API_URL = process.env.REACT_APP_API_URL || 'https://proshael.onrender.com';
      const response = await fetch(`${API_URL}/api/diya/${diyaId}/contributors?page=${page}&limit=${contributorsPerPage}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const result = await response.json();
      if (result.success && result.data) {
        setContributors(result.data);
        setContributorsPage(page);
        setContributorsTotalPages(result.pagination?.totalPages || 1);
        setContributorsTotal(result.pagination?.total || result.data.length);

        // Only open modal on first fetch
        if (page === 1) {
          setShowContributorsModal(true);
        }
      }
    } catch (error) {
      console.error('Error fetching contributors:', error);
    } finally {
      setContributorsLoading(false);
    }
  };

  // Handle viewing contributors (memoized)
  const handleViewContributors = useCallback((diya: Diya) => {
    setSelectedDiya(diya);
    fetchContributors(diya.id, 1);
  }, []);

  // Handle page change in contributors modal
  const handleContributorsPageChange = useCallback((newPage: number) => {
    if (selectedDiya) {
      fetchContributors(selectedDiya.id, newPage);
    }
  }, [selectedDiya]);

  // Add Diya Modal
  const AddDiyaModal: React.FC = () => {
    const [diyaData, setDiyaData] = useState({
      title: '',
      description: '',
      totalAmount: 0,
      beneficiary: '',
      category: 'accident',
      priority: 'medium',
      startDate: '',
      deadline: '',
      notes: '',
      // Hijri date fields
      startDay: '',
      startMonth: '',
      startYear: '1446',
      deadlineDay: '',
      deadlineMonth: '',
      deadlineYear: '1446'
    });

    // Hijri months
    const hijriMonths = [
      { value: '01', label: 'محرم' },
      { value: '02', label: 'صفر' },
      { value: '03', label: 'ربيع الأول' },
      { value: '04', label: 'ربيع الآخر' },
      { value: '05', label: 'جمادى الأولى' },
      { value: '06', label: 'جمادى الآخرة' },
      { value: '07', label: 'رجب' },
      { value: '08', label: 'شعبان' },
      { value: '09', label: 'رمضان' },
      { value: '10', label: 'شوال' },
      { value: '11', label: 'ذو القعدة' },
      { value: '12', label: 'ذو الحجة' }
    ];

    // Generate days (1-30)
    const days = Array.from({ length: 30 }, (_, i) => ({
      value: String(i + 1).padStart(2, '0'),
      label: String(i + 1)
    }));

    // Generate years (1445-1450)
    const years = Array.from({ length: 6 }, (_, i) => ({
      value: String(1445 + i),
      label: String(1445 + i)
    }));

    return (
      <div className="modal-overlay-premium" onClick={() => setShowAddModal(false)}>
        <div className="modal-content-premium" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1700px', height: 'auto', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: '0.75rem' }}>
          {/* Modal Header - Minimal */}
          <div className="flex items-center justify-between mb-1.5 flex-shrink-0">
            <h2 className="text-sm font-bold text-gray-900">إضافة حالة دية جديدة</h2>
            <button onClick={() => setShowAddModal(false)} className="p-0.5 rounded hover:bg-gray-100">
              <XMarkIcon className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Form - Maximum Compact 3-Row Layout */}
          <form className="flex-shrink-0" style={{ padding: '0.5rem 0' }}>
            <div className="grid grid-cols-12 gap-1.5">
              {/* Row 1: Title + Category + Priority + Amount */}
              <div className="col-span-6">
                <label className="block text-xs text-gray-700" style={{ marginBottom: '2px' }}>عنوان الحالة *</label>
                <input type="text" value={diyaData.title} onChange={(e) => setDiyaData({ ...diyaData, title: e.target.value })} style={{ padding: '4px 8px', fontSize: '13px', height: '32px' }} className="w-full rounded-lg border border-gray-300" placeholder="دية حادث سير" required />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-700" style={{ marginBottom: '2px' }}>الفئة *</label>
                <select value={diyaData.category} onChange={(e) => setDiyaData({ ...diyaData, category: e.target.value })} style={{ padding: '4px 8px', fontSize: '13px', height: '32px' }} className="w-full rounded-lg border border-gray-300">
                  <option value="accident">حادث</option>
                  <option value="medical">طبي</option>
                  <option value="dispute">خلاف</option>
                  <option value="other">أخرى</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-700" style={{ marginBottom: '2px' }}>الأولوية *</label>
                <select value={diyaData.priority} onChange={(e) => setDiyaData({ ...diyaData, priority: e.target.value })} style={{ padding: '4px 8px', fontSize: '13px', height: '32px' }} className="w-full rounded-lg border border-gray-300">
                  <option value="high">عالية</option>
                  <option value="medium">متوسطة</option>
                  <option value="low">منخفضة</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-700" style={{ marginBottom: '2px' }}>المبلغ *</label>
                <input type="number" value={diyaData.totalAmount} onChange={(e) => setDiyaData({ ...diyaData, totalAmount: parseInt(e.target.value) })} style={{ padding: '4px 8px', fontSize: '13px', height: '32px' }} className="w-full rounded-lg border border-gray-300" min="0" required />
              </div>

              {/* Row 2: Beneficiary + Start Date + Deadline Date */}
              <div className="col-span-4">
                <label className="block text-xs text-gray-700" style={{ marginBottom: '2px' }}>المستفيد *</label>
                <input type="text" value={diyaData.beneficiary} onChange={(e) => setDiyaData({ ...diyaData, beneficiary: e.target.value })} style={{ padding: '4px 8px', fontSize: '13px', height: '32px' }} className="w-full rounded-lg border border-gray-300" placeholder="اسم العائلة" required />
              </div>
              <div className="col-span-4">
                <label className="block text-xs text-gray-700" style={{ marginBottom: '2px' }}>تاريخ البداية (هجري) *</label>
                <div className="grid grid-cols-3 gap-1">
                  <select value={diyaData.startDay} onChange={(e) => setDiyaData({ ...diyaData, startDay: e.target.value })} style={{ padding: '4px', fontSize: '13px', height: '32px' }} className="rounded-lg border border-gray-300" required>
                    <option value="">يوم</option>
                    {days.map(day => <option key={day.value} value={day.value}>{day.label}</option>)}
                  </select>
                  <select value={diyaData.startMonth} onChange={(e) => setDiyaData({ ...diyaData, startMonth: e.target.value })} style={{ padding: '4px', fontSize: '13px', height: '32px' }} className="rounded-lg border border-gray-300" required>
                    <option value="">شهر</option>
                    {hijriMonths.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  <select value={diyaData.startYear} onChange={(e) => setDiyaData({ ...diyaData, startYear: e.target.value })} style={{ padding: '4px', fontSize: '13px', height: '32px' }} className="rounded-lg border border-gray-300" required>
                    <option value="">سنة</option>
                    {years.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="col-span-4">
                <label className="block text-xs text-gray-700" style={{ marginBottom: '2px' }}>الموعد النهائي (هجري) *</label>
                <div className="grid grid-cols-3 gap-1">
                  <select value={diyaData.deadlineDay} onChange={(e) => setDiyaData({ ...diyaData, deadlineDay: e.target.value })} style={{ padding: '4px', fontSize: '13px', height: '32px' }} className="rounded-lg border border-gray-300" required>
                    <option value="">يوم</option>
                    {days.map(day => <option key={day.value} value={day.value}>{day.label}</option>)}
                  </select>
                  <select value={diyaData.deadlineMonth} onChange={(e) => setDiyaData({ ...diyaData, deadlineMonth: e.target.value })} style={{ padding: '4px', fontSize: '13px', height: '32px' }} className="rounded-lg border border-gray-300" required>
                    <option value="">شهر</option>
                    {hijriMonths.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  <select value={diyaData.deadlineYear} onChange={(e) => setDiyaData({ ...diyaData, deadlineYear: e.target.value })} style={{ padding: '4px', fontSize: '13px', height: '32px' }} className="rounded-lg border border-gray-300" required>
                    <option value="">سنة</option>
                    {years.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Row 3: Description + Notes */}
              <div className="col-span-6">
                <label className="block text-xs text-gray-700" style={{ marginBottom: '2px' }}>الوصف *</label>
                <input type="text" value={diyaData.description} onChange={(e) => setDiyaData({ ...diyaData, description: e.target.value })} style={{ padding: '4px 8px', fontSize: '13px', height: '32px' }} className="w-full rounded-lg border border-gray-300" placeholder="تفاصيل الحالة" required />
              </div>
              <div className="col-span-6">
                <label className="block text-xs text-gray-700" style={{ marginBottom: '2px' }}>ملاحظات</label>
                <input type="text" value={diyaData.notes} onChange={(e) => setDiyaData({ ...diyaData, notes: e.target.value })} style={{ padding: '4px 8px', fontSize: '13px', height: '32px' }} className="w-full rounded-lg border border-gray-300" placeholder="ملاحظات" />
              </div>
            </div>
          </form>

          {/* Action Buttons - Minimal */}
          <div className="flex items-center justify-end gap-2 pt-1.5 border-t flex-shrink-0 mt-1.5">
            <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: '6px 16px', fontSize: '13px' }} className="rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
              إلغاء
            </button>
            <button type="submit" style={{ padding: '6px 16px', fontSize: '13px' }} className="btn-gradient-premium" onClick={(e) => { e.preventDefault(); console.log('Diya Data:'); setShowAddModal(false); }}>
              إضافة
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Hijri date filtering logic (using Gregorian conversion for comparison)
  const filterDiyasByHijriDate = (diyasToFilter: Diya[]) => {
    if (!fromGregorianDate && !toGregorianDate) return diyasToFilter;

    return diyasToFilter.filter(diya => {
      if (!diya.startDate && !diya.createdAt) return false;

      // Compare with Gregorian dates (database format)
      const itemDateStr = (diya.startDate || diya.createdAt).split('T')[0];

      // Check if within range
      if (fromGregorianDate && itemDateStr < fromGregorianDate) return false;
      if (toGregorianDate && itemDateStr > toGregorianDate) return false;
      return true;
    });
  };

  // Clear date filters
  const clearDateFilters = () => {
    setFromHijriDate('');
    setFromGregorianDate('');
    setToHijriDate('');
    setToGregorianDate('');
  };

  // Apply filtering (memoized)
  const filteredDiyas = useMemo(() => filterDiyasByHijriDate(diyas), [diyas, fromGregorianDate, toGregorianDate]);

  // Calculate statistics (memoized to prevent recalculation on every render)
  const statistics = useMemo(() => ({
    totalDiyas: filteredDiyas.length,
    activeDiyas: filteredDiyas.filter(d => d.status === 'active' || d.status === 'urgent').length,
    totalAmountNeeded: filteredDiyas.reduce((sum, d) => sum + d.totalAmount, 0),
    totalCollected: filteredDiyas.reduce((sum, d) => sum + d.collectedAmount, 0),
    totalRemaining: filteredDiyas.reduce((sum, d) => sum + d.remainingAmount, 0)
  }), [filteredDiyas]);

  // Diya Card Component (Memoized for Performance)
  const DiyaCard = React.memo<{ diya: Diya }>(({ diya }) => {
    const statusInfo = getStatusInfo(diya.status);
    const priorityInfo = getPriorityInfo(diya.priority);
    const categoryInfo = getCategoryInfo(diya.category);
    const CategoryIcon = categoryInfo.icon;
    const StatusIcon = statusInfo.icon;

    const progressPercentage = (diya.collectedAmount / diya.totalAmount) * 100;
    const daysLeft = getDaysUntil(diya.deadline);
    const isUrgent = diya.status === 'urgent' || daysLeft < 7;

    return (
      <div className={`glass-card-premium ${isUrgent ? 'border-red-300' : ''}`} style={{ padding: '24px', marginBottom: '16px' }}>
        {/* Urgent Badge */}
        {isUrgent && (
          <div className="absolute top-4 left-4">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500 text-white animate-pulse">
              عاجل
            </span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-14 h-14 rounded-xl bg-gradient-to-r ${categoryInfo.gradient} flex items-center justify-center text-white shadow-lg`}
            >
              <CategoryIcon className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{diya.title}</h3>
              <p className="text-sm text-gray-600">رقم الحالة: {diya.caseNumber}</p>
              <p className="text-xs text-gray-500 mt-1">{diya.description}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor}`}
                  style={{ color: statusInfo.color }}>
              {statusInfo.label}
            </span>
            <span className="text-xs font-medium" style={{ color: priorityInfo.color }}>
              أولوية {priorityInfo.label}
            </span>
          </div>
        </div>

        {/* Dates with Hijri */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">تاريخ البداية:</span>
              <HijriDateDisplay
                date={diya.startDate}
                format="medium"
                showIcon={false}
                showBoth={true}
                style={{ padding: '2px 4px', fontSize: '12px' }}
              />
            </div>
            <div className="flex items-center gap-2">
              <ClockIcon className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-gray-600">الموعد النهائي:</span>
              <HijriDateDisplay
                date={diya.deadline}
                format="medium"
                showIcon={false}
                showBoth={true}
                highlightToday={isOverdue(diya.deadline)}
                style={{
                  padding: '2px 4px',
                  fontSize: '12px',
                  borderColor: isOverdue(diya.deadline) ? 'rgba(255, 59, 48, 0.3)' : undefined
                }}
              />
              {daysLeft > 0 ? (
                <span className="text-xs font-medium text-green-600">({daysLeft} يوم متبقي)</span>
              ) : (
                <span className="text-xs font-medium text-red-600">(متأخر {Math.abs(daysLeft)} يوم)</span>
              )}
            </div>
          </div>
        </div>

        {/* Financial Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">التقدم المالي</span>
            <span className="text-sm font-bold" style={{ color: progressPercentage >= 100 ? '#30D158' : '#007AFF' }}>
              {progressPercentage.toFixed(1)}%
            </span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
            <div
              className="h-full rounded-full progress-bar-fill"
              style={{
                width: `${Math.min(progressPercentage, 100)}%`,
                background: progressPercentage >= 100
                  ? 'linear-gradient(135deg, #30D158, #34C759)'
                  : 'linear-gradient(135deg, #007AFF, #5856D6)'
              }}
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              تم جمع: <span className="font-bold text-green-600">{diya.collectedAmount.toLocaleString()} ريال</span>
            </span>
            <span className="text-gray-600">
              المتبقي: <span className="font-bold text-orange-600">{diya.remainingAmount.toLocaleString()} ريال</span>
            </span>
          </div>
        </div>

        {/* Contributors and Beneficiary */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <UserGroupIcon className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-gray-600">
                المساهمون: <span className="font-medium">{diya.contributorsCount}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <UsersIcon className="w-4 h-4 text-green-500" />
              <span className="text-sm text-gray-600">
                المستفيد: <span className="font-medium">{diya.beneficiary}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Recent Payments */}
        {diya.payments.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">آخر المساهمات</h4>
            <div className="space-y-2">
              {diya.payments.slice(0, 3).map(payment => (
                <div key={payment.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{payment.contributorName}</span>
                    <HijriDateDisplay
                      date={payment.date}
                      format="relative"
                      showIcon={false}
                      showBoth={false}
                      style={{ fontSize: '11px', color: '#6B7280' }}
                    />
                  </div>
                  <span className="font-bold text-green-600">{payment.amount.toLocaleString()} ريال</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              آخر تحديث: <HijriDateDisplay date={diya.updatedAt} format="relative" showIcon={false} showBoth={false} />
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleViewContributors(diya)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="عرض قائمة المساهمين"
            >
              <EyeIcon className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <DocumentArrowDownIcon className="w-5 h-5 text-gray-600" />
            </button>
            <button className="btn-gradient-premium text-sm px-4 py-2">
              <CurrencyDollarIcon className="w-4 h-4 inline ml-1" />
              المساهمة
            </button>
          </div>
        </div>
      </div>
    );
  });

  // Statistics Cards (Memoized)
  const StatCard = React.memo<{
    title: string;
    value: string | number;
    icon: any;
    gradient: string;
    subtitle?: string;
    trend?: string
  }>(({ title, value, icon: Icon, gradient, subtitle, trend }) => (
    <div className="glass-card-premium stat-badge-premium">
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg icon-wrapper-gradient"
          style={{ background: `linear-gradient(135deg, ${gradient})` }}
        >
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <div className={`text-sm font-medium ${trend.includes('+') ? 'text-green-600' : trend.includes('-') ? 'text-red-600' : 'text-gray-600'}`}>
            {trend}
          </div>
        )}
      </div>
      <div className="space-y-1">
        <h3 className="text-sm text-gray-600 font-medium">{title}</h3>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-xs text-gray-700">{subtitle}</p>}
      </div>
    </div>
  ));

  // Skeleton Loading Component
  const DiyasSkeleton = () => (
    <div className="animate-pulse space-y-4">
      {/* Statistics Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="bg-gray-200 h-32 rounded-xl"></div>
        ))}
      </div>
      {/* Cards Skeleton */}
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-gray-200 h-96 rounded-xl"></div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="p-6" dir="rtl">
        <DiyasSkeleton />
      </div>
    );
  }

  return (
    <div className="p-3" dir="rtl">
      {/* Compact Header */}
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">إدارة الديات</h1>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-gradient-premium flex items-center gap-1.5 text-sm px-3 py-1.5"
          >
            <PlusIcon className="w-4 h-4" />
            إضافة
          </button>
        </div>

        {/* Hijri Date Filter */}
        <div className="mb-6">
          <button
            onClick={() => setShowDateFilter(!showDateFilter)}
            className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3 hover:shadow-md transition-all duration-200"
          >
            <span className="text-2xl">📅</span>
            <span className="font-medium text-gray-700">تصفية بالتاريخ الهجري</span>
            <span className={`mr-auto transform transition-transform duration-200 ${showDateFilter ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>

          {showDateFilter && (
            <div className="mt-4 bg-white rounded-2xl shadow-lg border border-gray-100 p-6 transition-all duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* From Date - Hijri Input */}
                <HijriDateInput
                  value={fromHijriDate}
                  onChange={(hijri, gregorian) => {
                    setFromHijriDate(hijri);
                    setFromGregorianDate(gregorian);
                  }}
                  label="من تاريخ (هجري)"
                  minYear={1440}
                  maxYear={1450}
                />

                {/* To Date - Hijri Input */}
                <HijriDateInput
                  value={toHijriDate}
                  onChange={(hijri, gregorian) => {
                    setToHijriDate(hijri);
                    setToGregorianDate(gregorian);
                  }}
                  label="إلى تاريخ (هجري)"
                  minYear={1440}
                  maxYear={1450}
                />
              </div>

              {/* Filter Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={clearDateFilters}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-xl transition-all duration-200"
                >
                  مسح الفلاتر
                </button>
                <button
                  onClick={() => setShowDateFilter(false)}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
                >
                  تطبيق
                </button>
              </div>

              {/* Active Filters Display */}
              {(fromHijriDate || toHijriDate) && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <span className="font-semibold text-gray-700">الفلاتر النشطة (تاريخ هجري):</span>
                    {fromHijriDate && (
                      <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg">
                        من: {fromHijriDate} هـ
                      </span>
                    )}
                    {toHijriDate && (
                      <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg">
                        إلى: {toHijriDate} هـ
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Compact Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
        <StatCard
          title="إجمالي الحالات"
          value={statistics.totalDiyas}
          icon={ScaleIcon}
          gradient="#FF9500, #F59E0B"
          subtitle="جميع الحالات المسجلة"
        />
        <StatCard
          title="الحالات النشطة"
          value={statistics.activeDiyas}
          icon={HandRaisedIcon}
          gradient="#FF3B30, #FF2D92"
          subtitle="تحتاج إلى دعم"
          trend={statistics.activeDiyas > 0 ? `${statistics.activeDiyas} نشطة` : ''}
        />
        <StatCard
          title="المبلغ المطلوب"
          value={`${statistics.totalAmountNeeded.toLocaleString()} ريال`}
          icon={BanknotesIcon}
          gradient="#5856D6, #AF52DE"
          subtitle="إجمالي الديات"
        />
        <StatCard
          title="المبلغ المحصل"
          value={`${statistics.totalCollected.toLocaleString()} ريال`}
          icon={CheckCircleIcon}
          gradient="#30D158, #34C759"
          subtitle={`${((statistics.totalCollected / statistics.totalAmountNeeded) * 100).toFixed(1)}% من الهدف`}
          trend="+25%"
        />
        <StatCard
          title="المبلغ المتبقي"
          value={`${statistics.totalRemaining.toLocaleString()} ريال`}
          icon={CurrencyDollarIcon}
          gradient="#007AFF, #5AC8FA"
          subtitle="يحتاج إلى جمع"
        />
      </div>

      {/* Compact Search and Filters */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="البحث في الحالات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-premium w-full pr-10"
          />
          <MagnifyingGlassIcon className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="input-premium"
        >
          <option value="">جميع الحالات</option>
          <option value="active">نشطة</option>
          <option value="urgent">عاجلة</option>
          <option value="completed">مكتملة</option>
          <option value="pending">معلقة</option>
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="input-premium"
        >
          <option value="">جميع الأولويات</option>
          <option value="high">عالية</option>
          <option value="medium">متوسطة</option>
          <option value="low">منخفضة</option>
        </select>
      </div>

      {/* Diyas List */}
      <div className="space-y-4">
        {filteredDiyas
          .filter(diya => {
            const matchesSearch = diya.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                 diya.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                 diya.caseNumber.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = !filterStatus || diya.status === filterStatus;
            const matchesPriority = !filterPriority || diya.priority === filterPriority;
            return matchesSearch && matchesStatus && matchesPriority;
          })
          .map(diya => (
            <DiyaCard key={diya.id} diya={diya} />
          ))}
      </div>

      {/* Add Diya Modal */}
      {showAddModal && <AddDiyaModal />}

      {/* Contributors Modal - Full Screen */}
      {showContributorsModal && selectedDiya && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm z-50"
          onClick={() => setShowContributorsModal(false)}
        >
          <div
            className="absolute inset-0 m-1 bg-white rounded-lg flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ultra-Compact Header with Statistics - Fixed Height */}
            <div className="px-3 py-1.5 border-b flex-shrink-0 bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-bold text-gray-900">{selectedDiya.title}</h2>
                  <div className="flex gap-2 text-xs">
                    <span className="bg-blue-600 text-white px-2 py-0.5 rounded font-bold">الإجمالي: {contributorsTotal}</span>
                    <span className="bg-green-600 text-white px-2 py-0.5 rounded font-bold">المبلغ: {selectedDiya.collectedAmount.toLocaleString()} ر.س</span>
                    <span className="bg-purple-600 text-white px-2 py-0.5 rounded font-bold">المتوسط: {contributorsTotal > 0 ? (selectedDiya.collectedAmount / contributorsTotal).toFixed(0) : 0} ر.س</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowContributorsModal(false)}
                  className="p-0.5 hover:bg-red-100 rounded transition-colors"
                >
                  <XMarkIcon className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </div>

            {/* Table Container - Maximum Space */}
            <div className="flex-1 overflow-hidden px-1">
              {contributorsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
                    <p className="text-sm text-gray-600">جاري التحميل...</p>
                  </div>
                </div>
              ) : contributors.length > 0 ? (
                <div className="h-full flex flex-col">
                  {/* Full-Width Table Header - Sticky */}
                  <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white grid grid-cols-5 gap-2 px-3 py-1.5 text-xs font-bold flex-shrink-0 sticky top-0 z-10">
                    <div className="text-right">المسلسل</div>
                    <div className="text-right">الاسم</div>
                    <div className="text-right">الفخذ</div>
                    <div className="text-right">المبلغ</div>
                    <div className="text-right">التاريخ</div>
                  </div>

                  {/* Table Body - Full Width, Maximum Space */}
                  <div className="flex-1 overflow-y-auto bg-white">
                    {contributors.map((contributor, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-5 gap-2 px-3 py-1.5 border-b border-gray-100 hover:bg-blue-50 transition-colors items-center"
                      >
                        <div className="text-right text-xs font-medium text-gray-700">{contributor.membership_number}</div>
                        <div className="text-right text-sm font-semibold text-gray-900 truncate">{contributor.member_name}</div>
                        <div className="text-right text-xs text-gray-600">{contributor.tribal_section || '-'}</div>
                        <div className="text-right text-sm font-bold text-green-700">{contributor.amount.toLocaleString()}</div>
                        <div className="text-right text-xs text-gray-500">
                          {new Date(contributor.contribution_date).toLocaleDateString('ar-SA')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-500">
                    <DocumentTextIcon className="w-16 h-16 mx-auto mb-2 text-gray-300" />
                    <p>لا توجد مساهمات حالياً</p>
                  </div>
                </div>
              )}
            </div>

            {/* Ultra-Minimal Footer - Absolute Minimum Height */}
            <div className="border-t px-2 py-0.5 flex-shrink-0 bg-white">
              {contributorsTotalPages > 1 && !contributorsLoading ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-600 font-medium whitespace-nowrap">
                    {((contributorsPage - 1) * contributorsPerPage) + 1}-{Math.min(contributorsPage * contributorsPerPage, contributorsTotal)} من {contributorsTotal}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => handleContributorsPageChange(contributorsPage - 1)}
                      disabled={contributorsPage === 1}
                      className="px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed rounded text-xs"
                    >
                      السابق
                    </button>
                    {Array.from({ length: contributorsTotalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === contributorsTotalPages || Math.abs(p - contributorsPage) <= 1)
                      .map((pageNum, idx, arr) => (
                        <React.Fragment key={pageNum}>
                          {idx > 0 && arr[idx - 1] !== pageNum - 1 && <span className="px-0.5 text-gray-400 text-xs">...</span>}
                          <button
                            onClick={() => handleContributorsPageChange(pageNum)}
                            className={`px-1.5 py-0.5 rounded text-xs ${
                              pageNum === contributorsPage
                                ? 'bg-blue-600 text-white font-bold'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                            }`}
                          >
                            {pageNum}
                          </button>
                        </React.Fragment>
                      ))}
                    <button
                      onClick={() => handleContributorsPageChange(contributorsPage + 1)}
                      disabled={contributorsPage >= contributorsTotalPages}
                      className="px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed rounded text-xs"
                    >
                      التالي
                    </button>
                    <button
                      onClick={() => setShowContributorsModal(false)}
                      className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded text-xs ml-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowContributorsModal(false)}
                    className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded text-xs"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {diyas.length === 0 && (
        <div className="text-center py-12">
          <HandRaisedIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد حالات</h3>
          <p className="text-sm text-gray-600">ابدأ بإضافة أول حالة دية</p>
        </div>
      )}
    </div>
  );
};

export default HijriDiyasManagement;