import React, { useState, useEffect } from 'react';
import {
  HandRaisedIcon,
  ScaleIcon,
  UsersIcon,
  BanknotesIcon,
  CalendarIcon,
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ShieldExclamationIcon,
  XMarkIcon,
  BellIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
import { HijriDateDisplay, HijriDateFilter, HijriCalendarWidget } from '../Common/HijriDateDisplay';
import { HijriDateInput } from '../Common/HijriDateInput';
import { formatHijriDate, formatDualDate, formatTimeAgo, isOverdue, getDaysUntil } from '../../utils/hijriDateUtils';
import { toHijri, toGregorian } from 'hijri-converter';
import '../../styles/ultra-premium-islamic-design.css';

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

const HijriDiyasManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [diyas, setDiyas] = useState<Diya[]>([]);
  const [loading, setLoading] = useState(false);
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

  // Mock data
  const mockDiyas: Diya[] = [
    {
      id: 1,
      caseNumber: 'DY-2024-001',
      title: 'دية حادث سير - أحمد السالم',
      description: 'دية ناتجة عن حادث سير غير متعمد على طريق الرياض - مكة',
      totalAmount: 300000,
      collectedAmount: 225000,
      remainingAmount: 75000,
      status: 'active',
      priority: 'high',
      startDate: '2024-01-15',
      deadline: '2024-04-15',
      contributorsCount: 45,
      beneficiary: 'عائلة السالم',
      createdBy: 'محمد الشعيل',
      category: 'accident',
      documents: ['police_report.pdf', 'court_order.pdf'],
      payments: [
        { id: 1, contributorName: 'خالد الشعيل', amount: 50000, date: '2024-01-20', paymentMethod: 'bank' },
        { id: 2, contributorName: 'أحمد الشعيل', amount: 25000, date: '2024-01-25', paymentMethod: 'cash' },
        { id: 3, contributorName: 'سارة الشعيل', amount: 30000, date: '2024-02-01', paymentMethod: 'online' }
      ],
      createdAt: '2024-01-15T10:00:00',
      updatedAt: '2024-03-10T14:30:00'
    },
    {
      id: 2,
      caseNumber: 'DY-2024-002',
      title: 'دية خطأ طبي - عبدالله المحمد',
      description: 'دية ناتجة عن خطأ طبي أثناء عملية جراحية',
      totalAmount: 200000,
      collectedAmount: 50000,
      remainingAmount: 150000,
      status: 'urgent',
      priority: 'high',
      startDate: '2024-02-01',
      deadline: '2024-03-31',
      contributorsCount: 12,
      beneficiary: 'عائلة المحمد',
      createdBy: 'فاطمة الشعيل',
      category: 'medical',
      documents: ['medical_report.pdf', 'hospital_statement.pdf'],
      payments: [
        { id: 4, contributorName: 'نورا الشعيل', amount: 20000, date: '2024-02-05', paymentMethod: 'bank' },
        { id: 5, contributorName: 'محمد الشعيل', amount: 30000, date: '2024-02-10', paymentMethod: 'bank' }
      ],
      createdAt: '2024-02-01T09:00:00',
      updatedAt: '2024-03-12T11:00:00',
      notes: 'حالة عاجلة تحتاج إلى دعم سريع'
    }
  ];

  useEffect(() => {
    setDiyas(mockDiyas);
  }, []);

  // Helper functions
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
        <div className="modal-content-premium" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1400px', height: '92vh', display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
          {/* Modal Header - Compact */}
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="icon-wrapper-gradient" style={{ background: 'var(--gradient-royal)', width: '40px', height: '40px' }}>
                <HandRaisedIcon className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">إضافة حالة دية جديدة</h2>
            </div>
            <button
              onClick={() => setShowAddModal(false)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Form - No scrolling, compact layout */}
          <form className="flex-1" style={{ minHeight: 0 }}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {/* Title - Full width */}
              <div className="lg:col-span-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">عنوان الحالة *</label>
                <input
                  type="text"
                  value={diyaData.title}
                  onChange={(e) => setDiyaData({ ...diyaData, title: e.target.value })}
                  className="input-premium w-full text-sm py-2"
                  placeholder="مثال: دية حادث سير - اسم المستفيد"
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">الفئة *</label>
                <select
                  value={diyaData.category}
                  onChange={(e) => setDiyaData({ ...diyaData, category: e.target.value })}
                  className="input-premium w-full text-sm py-2"
                >
                  <option value="accident">حادث</option>
                  <option value="medical">طبي</option>
                  <option value="dispute">خلاف</option>
                  <option value="other">أخرى</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">الأولوية *</label>
                <select
                  value={diyaData.priority}
                  onChange={(e) => setDiyaData({ ...diyaData, priority: e.target.value })}
                  className="input-premium w-full text-sm py-2"
                >
                  <option value="high">عالية</option>
                  <option value="medium">متوسطة</option>
                  <option value="low">منخفضة</option>
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">المبلغ الإجمالي (ريال) *</label>
                <input
                  type="number"
                  value={diyaData.totalAmount}
                  onChange={(e) => setDiyaData({ ...diyaData, totalAmount: parseInt(e.target.value) })}
                  className="input-premium w-full text-sm py-2"
                  min="0"
                  required
                />
              </div>

              {/* Beneficiary */}
              <div className="lg:col-span-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">المستفيد *</label>
                <input
                  type="text"
                  value={diyaData.beneficiary}
                  onChange={(e) => setDiyaData({ ...diyaData, beneficiary: e.target.value })}
                  className="input-premium w-full text-sm py-2"
                  placeholder="اسم العائلة المستفيدة"
                  required
                />
              </div>

              {/* Start Date - Inline layout */}
              <div className="lg:col-span-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">تاريخ البداية (هجري) *</label>
                <div className="grid grid-cols-6 gap-2">
                  <select
                    value={diyaData.startDay}
                    onChange={(e) => setDiyaData({ ...diyaData, startDay: e.target.value })}
                    className="input-premium text-sm py-2"
                    required
                  >
                    <option value="">اليوم</option>
                    {days.map(day => (
                      <option key={day.value} value={day.value}>{day.label}</option>
                    ))}
                  </select>
                  <select
                    value={diyaData.startMonth}
                    onChange={(e) => setDiyaData({ ...diyaData, startMonth: e.target.value })}
                    className="input-premium text-sm py-2 col-span-2"
                    required
                  >
                    <option value="">الشهر</option>
                    {hijriMonths.map(month => (
                      <option key={month.value} value={month.value}>{month.label}</option>
                    ))}
                  </select>
                  <select
                    value={diyaData.startYear}
                    onChange={(e) => setDiyaData({ ...diyaData, startYear: e.target.value })}
                    className="input-premium text-sm py-2"
                    required
                  >
                    <option value="">السنة</option>
                    {years.map(year => (
                      <option key={year.value} value={year.value}>{year.label} هـ</option>
                    ))}
                  </select>

                  {/* Separator */}
                  <div className="col-span-2"></div>
                </div>
              </div>

              {/* Deadline Date - Inline layout */}
              <div className="lg:col-span-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">الموعد النهائي (هجري) *</label>
                <div className="grid grid-cols-6 gap-2">
                  <select
                    value={diyaData.deadlineDay}
                    onChange={(e) => setDiyaData({ ...diyaData, deadlineDay: e.target.value })}
                    className="input-premium text-sm py-2"
                    required
                  >
                    <option value="">اليوم</option>
                    {days.map(day => (
                      <option key={day.value} value={day.value}>{day.label}</option>
                    ))}
                  </select>
                  <select
                    value={diyaData.deadlineMonth}
                    onChange={(e) => setDiyaData({ ...diyaData, deadlineMonth: e.target.value })}
                    className="input-premium text-sm py-2 col-span-2"
                    required
                  >
                    <option value="">الشهر</option>
                    {hijriMonths.map(month => (
                      <option key={month.value} value={month.value}>{month.label}</option>
                    ))}
                  </select>
                  <select
                    value={diyaData.deadlineYear}
                    onChange={(e) => setDiyaData({ ...diyaData, deadlineYear: e.target.value })}
                    className="input-premium text-sm py-2"
                    required
                  >
                    <option value="">السنة</option>
                    {years.map(year => (
                      <option key={year.value} value={year.value}>{year.label} هـ</option>
                    ))}
                  </select>

                  {/* Separator */}
                  <div className="col-span-2"></div>
                </div>
              </div>

              {/* Description - Half width */}
              <div className="lg:col-span-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">الوصف *</label>
                <textarea
                  value={diyaData.description}
                  onChange={(e) => setDiyaData({ ...diyaData, description: e.target.value })}
                  className="input-premium w-full text-sm py-2"
                  rows={1}
                  placeholder="تفاصيل الحالة والظروف"
                  required
                  style={{ minHeight: '42px', resize: 'none' }}
                />
              </div>

              {/* Notes - Half width */}
              <div className="lg:col-span-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">ملاحظات</label>
                <textarea
                  value={diyaData.notes}
                  onChange={(e) => setDiyaData({ ...diyaData, notes: e.target.value })}
                  className="input-premium w-full text-sm py-2"
                  rows={1}
                  placeholder="ملاحظات إضافية"
                  style={{ minHeight: '42px', resize: 'none' }}
                />
              </div>
            </div>
          </form>

          {/* Action Buttons - Fixed at bottom, compact */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t flex-shrink-0 mt-3">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-5 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="btn-gradient-premium text-sm px-5 py-2"
              onClick={(e) => {
                e.preventDefault();
                console.log('Diya Data:');
                setShowAddModal(false);
              }}
            >
              إضافة الحالة
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

  // Apply filtering
  const filteredDiyas = filterDiyasByHijriDate(diyas);

  // Calculate statistics
  const totalDiyas = filteredDiyas.length;
  const activeDiyas = filteredDiyas.filter(d => d.status === 'active' || d.status === 'urgent').length;
  const totalAmountNeeded = filteredDiyas.reduce((sum, d) => sum + d.totalAmount, 0);
  const totalCollected = filteredDiyas.reduce((sum, d) => sum + d.collectedAmount, 0);
  const totalRemaining = filteredDiyas.reduce((sum, d) => sum + d.remainingAmount, 0);

  // Diya Card Component
  const DiyaCard: React.FC<{ diya: Diya }> = ({ diya }) => {
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
            <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
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
  };

  // Statistics Cards
  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: any;
    gradient: string;
    subtitle?: string;
    trend?: string
  }> = ({ title, value, icon: Icon, gradient, subtitle, trend }) => (
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
  );

  return (
    <div className="p-6" dir="rtl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="icon-wrapper-gradient" style={{ background: 'var(--gradient-sunset)' }}>
              <HandRaisedIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">إدارة الديات</h1>
              <p className="text-sm text-gray-600">إدارة حالات الديات والمساهمات المالية</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-gradient-premium flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            إضافة حالة جديدة
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

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard
          title="إجمالي الحالات"
          value={totalDiyas}
          icon={ScaleIcon}
          gradient="#FF9500, #F59E0B"
          subtitle="جميع الحالات المسجلة"
        />
        <StatCard
          title="الحالات النشطة"
          value={activeDiyas}
          icon={HandRaisedIcon}
          gradient="#FF3B30, #FF2D92"
          subtitle="تحتاج إلى دعم"
          trend={activeDiyas > 0 ? `${activeDiyas} نشطة` : ''}
        />
        <StatCard
          title="المبلغ المطلوب"
          value={`${totalAmountNeeded.toLocaleString()} ريال`}
          icon={BanknotesIcon}
          gradient="#5856D6, #AF52DE"
          subtitle="إجمالي الديات"
        />
        <StatCard
          title="المبلغ المحصل"
          value={`${totalCollected.toLocaleString()} ريال`}
          icon={CheckCircleIcon}
          gradient="#30D158, #34C759"
          subtitle={`${((totalCollected / totalAmountNeeded) * 100).toFixed(1)}% من الهدف`}
          trend="+25%"
        />
        <StatCard
          title="المبلغ المتبقي"
          value={`${totalRemaining.toLocaleString()} ريال`}
          icon={CurrencyDollarIcon}
          gradient="#007AFF, #5AC8FA"
          subtitle="يحتاج إلى جمع"
        />
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4 mb-6">
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