import React, { useState, useEffect } from 'react';
import { toHijri, toGregorian } from 'hijri-converter';
import SimpleHijriDatePicker from '../Common/SimpleHijriDatePicker';
import {
  ScaleIcon,
  BanknotesIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  UsersIcon,
  HandRaisedIcon,
  FireIcon,
  StarIcon,
  ArrowTrendingUpIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const AppleDiyasManagement = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [diyas, setDiyas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDiya, setSelectedDiya] = useState(null);
  const [contributors, setContributors] = useState([]);
  const [showContributorsModal, setShowContributorsModal] = useState(false);

  // API URL configuration
  const API_URL = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://proshael.onrender.com');
  const [newDiya, setNewDiya] = useState({
    title: '',
    type: 'accident',
    amount: '',
    beneficiaryName: '',
    beneficiaryPhone: '',
    incidentDate: '',
    incidentHijriDate: '',
    location: '',
    description: '',
    status: 'pending',
    paidAmount: '0',
    remainingAmount: '',
    collectorName: '',
    notes: ''
  });

  // Mock data for diyas
  const mockDiyas = [
    {
      id: 1,
      title: 'دية حادث مروري - طريق الرياض',
      type: 'accident',
      amount: 300000,
      beneficiaryName: 'عائلة محمد الشعيل',
      beneficiaryPhone: '0555555555',
      incidentDate: '2024-01-15',
      location: 'طريق الرياض - الدمام',
      description: 'حادث مروري أدى إلى وفاة رب الأسرة',
      status: 'in_progress',
      paidAmount: 150000,
      remainingAmount: 150000,
      collectorName: 'أحمد الشعيل',
      contributors: 45,
      priority: 'high',
      tags: ['عاجل', 'حادث', 'طريق']
    },
    {
      id: 2,
      title: 'دية قتل خطأ',
      type: 'manslaughter',
      amount: 400000,
      beneficiaryName: 'ورثة خالد العمري',
      beneficiaryPhone: '0544444444',
      incidentDate: '2024-02-01',
      location: 'المنطقة الشرقية',
      description: 'قتل خطأ في حادث عمل',
      status: 'pending',
      paidAmount: 0,
      remainingAmount: 400000,
      collectorName: 'محمد الشعيل',
      contributors: 0,
      priority: 'high',
      tags: ['قتل خطأ', 'عمل']
    },
    {
      id: 3,
      title: 'دية إصابة - حادث منزلي',
      type: 'injury',
      amount: 50000,
      beneficiaryName: 'سعد الشعيل',
      beneficiaryPhone: '0533333333',
      incidentDate: '2023-12-20',
      location: 'الرياض',
      description: 'إصابة بليغة نتيجة حادث منزلي',
      status: 'completed',
      paidAmount: 50000,
      remainingAmount: 0,
      collectorName: 'فاطمة الشعيل',
      contributors: 23,
      priority: 'medium',
      tags: ['إصابة', 'منزلي', 'مكتمل']
    },
    {
      id: 4,
      title: 'دية حادث عمل',
      type: 'work_accident',
      amount: 200000,
      beneficiaryName: 'عائلة يوسف الشعيل',
      beneficiaryPhone: '0522222222',
      incidentDate: '2024-01-25',
      location: 'جدة - المنطقة الصناعية',
      description: 'حادث في موقع العمل أدى إلى إصابات خطيرة',
      status: 'in_progress',
      paidAmount: 80000,
      remainingAmount: 120000,
      collectorName: 'سارة الشعيل',
      contributors: 28,
      priority: 'high',
      tags: ['عمل', 'صناعي']
    }
  ];

  useEffect(() => {
    fetchRealDiyaData();
  }, []);

  // Fetch real diya data from API
  const fetchRealDiyaData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/diya/dashboard`);
      const result = await response.json();

      if (result.success && result.data) {
        // Transform API data to match component structure
        const transformedDiyas = result.data.map(d => ({
          id: d.activity_id,
          title: d.title_ar || d.title_en,
          type: 'accident', // Default type
          amount: d.target_amount || 100000,
          beneficiaryName: d.description_ar || 'غير محدد',
          paidAmount: d.total_collected || 0,
          remainingAmount: (d.target_amount || 100000) - (d.total_collected || 0),
          contributors: d.total_contributors || 0,
          status: d.collection_status === 'completed' ? 'completed' : 'in_progress',
          priority: 'high',
          collectorName: 'إدارة الصندوق',
          tags: ['دية']
        }));

        setDiyas(transformedDiyas);
      } else {
        // Fallback to mock data
        setDiyas(mockDiyas);
      }
    } catch (error) {
      console.error('Error fetching diya data:', error);
      // Fallback to mock data on error
      setDiyas(mockDiyas);
    } finally {
      setLoading(false);
    }
  };

  // Fetch contributors for specific diya
  const fetchContributors = async (diyaId) => {
    try {
      const response = await fetch(`${API_URL}/api/diya/${diyaId}/contributors`);
      const result = await response.json();

      if (result.success && result.data) {
        setContributors(result.data);
        setShowContributorsModal(true);
      }
    } catch (error) {
      console.error('Error fetching contributors:', error);
    }
  };

  // Handle clicking on a diya card to see contributors
  const handleViewContributors = (diya) => {
    setSelectedDiya(diya);
    fetchContributors(diya.id);
  };

  // Helper functions
  const getTypeInfo = (type) => {
    const types = {
      accident: { label: 'حادث مروري', color: '#FF3B30', icon: ScaleIcon, gradient: 'from-red-500 to-red-600' },
      manslaughter: { label: 'قتل خطأ', color: '#FF9500', icon: ShieldCheckIcon, gradient: 'from-orange-500 to-orange-600' },
      injury: { label: 'إصابة', color: '#FFCC02', icon: HandRaisedIcon, gradient: 'from-yellow-500 to-yellow-600' },
      work_accident: { label: 'حادث عمل', color: '#30D158', icon: FireIcon, gradient: 'from-green-500 to-green-600' },
      other: { label: 'أخرى', color: '#8E8E93', icon: ScaleIcon, gradient: 'from-gray-500 to-gray-600' }
    };
    return types[type] || types.other;
  };

  const getStatusInfo = (status) => {
    const statuses = {
      pending: { label: 'قيد المراجعة', color: '#FF9500', icon: ClockIcon },
      in_progress: { label: 'جاري التحصيل', color: '#007AFF', icon: ArrowTrendingUpIcon },
      completed: { label: 'مكتملة', color: '#30D158', icon: CheckCircleIcon },
      cancelled: { label: 'ملغية', color: '#FF3B30', icon: ExclamationTriangleIcon }
    };
    return statuses[status] || statuses.pending;
  };

  const getPriorityInfo = (priority) => {
    const priorities = {
      high: { label: 'عالية', color: '#FF3B30', icon: FireIcon },
      medium: { label: 'متوسطة', color: '#FF9500', icon: StarIcon },
      low: { label: 'منخفضة', color: '#8E8E93', icon: ClockIcon }
    };
    return priorities[priority] || priorities.medium;
  };

  // Calculate statistics
  const totalDiyas = diyas.length;
  const activeDiyas = diyas.filter(d => d.status === 'in_progress').length;
  const completedDiyas = diyas.filter(d => d.status === 'completed').length;
  const totalAmount = diyas.reduce((sum, d) => sum + d.amount, 0);
  const totalPaid = diyas.reduce((sum, d) => sum + d.paidAmount, 0);
  const totalRemaining = diyas.reduce((sum, d) => sum + d.remainingAmount, 0);
  const totalContributors = diyas.reduce((sum, d) => sum + (d.contributors || 0), 0);

  // Diya tabs
  const diyaTabs = [
    { id: 'overview', label: 'نظرة عامة', icon: ChartBarIcon },
    { id: 'active', label: 'قضايا نشطة', icon: ArrowTrendingUpIcon },
    { id: 'all', label: 'جميع القضايا', icon: ScaleIcon },
    { id: 'reports', label: 'التقارير', icon: DocumentTextIcon }
  ];

  // Handle date change with Hijri conversion
  const handleDateChange = (gregorianDate) => {
    setNewDiya(prev => ({ ...prev, incidentDate: gregorianDate }));
    if (gregorianDate) {
      const date = new Date(gregorianDate);
      const hijri = toHijri(date.getFullYear(), date.getMonth() + 1, date.getDate());
      const hijriFormatted = `${hijri.hd}/${hijri.hm}/${hijri.hy} هـ`;
      setNewDiya(prev => ({ ...prev, incidentHijriDate: hijriFormatted }));
    }
  };

  const handleAmountChange = (amount) => {
    setNewDiya(prev => ({
      ...prev,
      amount: amount,
      remainingAmount: amount - (prev.paidAmount || 0)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Add new diya with generated ID
    const diya = {
      id: diyas.length + 1,
      ...newDiya,
      amount: parseFloat(newDiya.amount) || 0,
      paidAmount: parseFloat(newDiya.paidAmount) || 0,
      remainingAmount: parseFloat(newDiya.amount) - parseFloat(newDiya.paidAmount || 0),
      contributors: 0,
      priority: 'high',
      tags: [getTypeInfo(newDiya.type).label]
    };

    setDiyas([diya, ...diyas]);
    setShowAddModal(false);

    // Reset form
    setNewDiya({
      title: '',
      type: 'accident',
      amount: '',
      beneficiaryName: '',
      beneficiaryPhone: '',
      incidentDate: '',
      incidentHijriDate: '',
      location: '',
      description: '',
      status: 'pending',
      paidAmount: '0',
      remainingAmount: '',
      collectorName: '',
      notes: ''
    });
  };

  const AppleStatCard = ({ title, value, icon: Icon, gradient, subtitle, trend, trendValue }) => (
    <div style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(249, 250, 251, 0.9))', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(229, 231, 235, 0.5)', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', padding: '24px', transform: 'scale(1)', transition: 'transform 0.3s', cursor: 'pointer' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)' }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}>
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${gradient})`,
            animation: 'apple-glow 3s ease-in-out infinite'
          }}
        >
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
            <span>{trendValue}</span>
            <ArrowTrendingUpIcon className={`w-4 h-4 ${trend === 'down' ? 'rotate-180' : ''}`} />
          </div>
        )}
      </div>
      <div className="space-y-1">
        <h3 className="text-sm text-gray-600 font-medium">{title}</h3>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );

  const AppleDiyaCard = ({ diya }) => {
    const typeInfo = getTypeInfo(diya.type);
    const statusInfo = getStatusInfo(diya.status);
    const priorityInfo = getPriorityInfo(diya.priority);
    const TypeIcon = typeInfo.icon;
    const StatusIcon = statusInfo.icon;
    const progressPercentage = ((diya.paidAmount / diya.amount) * 100).toFixed(0);

    return (
      <div style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(249, 250, 251, 0.9))', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(229, 231, 235, 0.5)', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', padding: '24px', transform: 'scale(1)', transition: 'all 0.3s', cursor: 'pointer' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)' }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }} onClick={() => handleViewContributors(diya)}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl bg-gradient-to-r ${typeInfo.gradient} flex items-center justify-center text-white shadow-lg`}
            >
              <TypeIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{diya.title}</h3>
              <p className="text-sm text-gray-600">{typeInfo.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
              style={{ backgroundColor: `${priorityInfo.color}20`, color: priorityInfo.color }}
            >
              {priorityInfo.label}
            </div>
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
              style={{ backgroundColor: `${statusInfo.color}20`, color: statusInfo.color }}
            >
              <StatusIcon className="w-3 h-3" />
              {statusInfo.label}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">المستفيد:</span>
            <span className="font-medium text-gray-900">{diya.beneficiaryName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">المبلغ الكلي:</span>
            <span className="font-bold text-gray-900">{diya.amount.toLocaleString('ar-SA')} ر.س</span>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-xs text-gray-600 mb-2">
              <span>التقدم في التحصيل</span>
              <span>{progressPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-green-500 to-green-400 h-3 rounded-full transition-all duration-500 relative overflow-hidden"
                style={{ width: `${progressPercentage}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse" />
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>محصل: {diya.paidAmount.toLocaleString('ar-SA')} ر.س</span>
              <span>متبقي: {diya.remainingAmount.toLocaleString('ar-SA')} ر.س</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <UsersIcon className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-600">{diya.contributors} مساهم</span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDaysIcon className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-600">{diya.incidentDate}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button style={{ flex: 1, padding: '8px', background: 'linear-gradient(135deg, #3B82F6, #2563EB)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <BanknotesIcon className="w-3 h-3" />
              المساهمة
            </button>
            <button style={{ padding: '8px 12px', background: '#F3F4F6', color: '#4B5563', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <EyeIcon className="w-3 h-3" />
              التفاصيل
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              <AppleStatCard
                title="إجمالي القضايا"
                value={totalDiyas.toString()}
                icon={ScaleIcon}
                gradient="#007AFF, #5856D6"
                trend="up"
                trendValue="+2"
              />
              <AppleStatCard
                title="قضايا نشطة"
                value={activeDiyas.toString()}
                icon={ArrowTrendingUpIcon}
                gradient="#30D158, #32D74B"
              />
              <AppleStatCard
                title="قضايا مكتملة"
                value={completedDiyas.toString()}
                icon={CheckCircleIcon}
                gradient="#FF9500, #FFCC02"
              />
              <AppleStatCard
                title="عدد المساهمين"
                value={totalContributors.toString()}
                icon={UsersIcon}
                gradient="#FF3B30, #FF453A"
                subtitle="إجمالي المساهمين"
              />
            </div>

            {/* Financial Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '16px', padding: '24px' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center">
                    <CurrencyDollarIcon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">المبلغ الإجمالي</h3>
                </div>
                <p className="text-3xl font-bold text-white">{totalAmount.toLocaleString('ar-SA')} ر.س</p>
                <p className="text-sm text-gray-400 mt-2">مجموع جميع القضايا</p>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '16px', padding: '24px' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                    <CheckCircleIcon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">المبلغ المحصل</h3>
                </div>
                <p className="text-3xl font-bold text-green-400">{totalPaid.toLocaleString('ar-SA')} ر.س</p>
                <p className="text-sm text-gray-400 mt-2">تم تحصيله حتى الآن</p>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '16px', padding: '24px' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center">
                    <ExclamationTriangleIcon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">المبلغ المتبقي</h3>
                </div>
                <p className="text-3xl font-bold text-orange-400">{totalRemaining.toLocaleString('ar-SA')} ر.س</p>
                <p className="text-sm text-gray-400 mt-2">يحتاج إلى تحصيل</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '16px', padding: '24px' }}>
              <h3 className="text-lg font-semibold text-white mb-4">إجراءات سريعة</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setShowAddModal(true)}
                  style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #3B82F6, #2563EB)', color: 'white', border: 'none', borderRadius: '100px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <PlusIcon className="w-4 h-4" />
                  إضافة قضية دية
                </button>
                <button style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #10B981, #059669)', color: 'white', border: 'none', borderRadius: '100px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BanknotesIcon className="w-4 h-4" />
                  تسجيل مساهمة
                </button>
                <button style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', color: 'white', border: 'none', borderRadius: '100px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <DocumentTextIcon className="w-4 h-4" />
                  التقارير
                </button>
              </div>
            </div>

            {/* Recent Cases */}
            <div style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '16px', padding: '24px' }}>
              <h3 className="text-lg font-semibold text-white mb-4">أحدث القضايا</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {diyas.slice(0, 3).map((diya) => (
                  <AppleDiyaCard key={diya.id} diya={diya} />
                ))}
              </div>
            </div>
          </div>
        );

      case 'active':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">القضايا النشطة</h3>
                <p className="text-gray-400">القضايا التي تحتاج إلى تحصيل</p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #3B82F6, #2563EB)', color: 'white', border: 'none', borderRadius: '100px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <PlusIcon className="w-4 h-4" />
                إضافة قضية
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {diyas
                .filter(diya => diya.status === 'in_progress' || diya.status === 'pending')
                .map((diya) => (
                  <AppleDiyaCard key={diya.id} diya={diya} />
                ))}
            </div>
          </div>
        );

      case 'all':
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">جميع قضايا الديات</h3>
                <p className="text-gray-400">إدارة جميع قضايا الديات</p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #3B82F6, #2563EB)', color: 'white', border: 'none', borderRadius: '100px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <PlusIcon className="w-4 h-4" />
                إضافة قضية
              </button>
            </div>

            {/* Filters */}
            <div style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '16px', padding: '16px' }}>
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-64">
                  <div style={{ position: 'relative' }}>
                    <MagnifyingGlassIcon style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: 'rgba(255, 255, 255, 0.5)', pointerEvents: 'none' }} />
                    <input
                      type="text"
                      placeholder="البحث في القضايا..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ width: '100%', padding: '12px 16px 12px 44px', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '12px', color: 'white', fontSize: '14px', outline: 'none' }}
                    />
                  </div>
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  style={{ padding: '12px 16px', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '12px', color: 'white', fontSize: '14px', outline: 'none' }}
                >
                  <option value="">جميع الأنواع</option>
                  <option value="accident">حادث مروري</option>
                  <option value="manslaughter">قتل خطأ</option>
                  <option value="injury">إصابة</option>
                  <option value="work_accident">حادث عمل</option>
                  <option value="other">أخرى</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{ padding: '12px 16px', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '12px', color: 'white', fontSize: '14px', outline: 'none' }}
                >
                  <option value="">جميع الحالات</option>
                  <option value="pending">قيد المراجعة</option>
                  <option value="in_progress">جاري التحصيل</option>
                  <option value="completed">مكتملة</option>
                  <option value="cancelled">ملغية</option>
                </select>
              </div>
            </div>

            {/* Diyas Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {diyas
                .filter(diya =>
                  (!filterType || diya.type === filterType) &&
                  (!filterStatus || diya.status === filterStatus) &&
                  (!searchQuery || diya.title.toLowerCase().includes(searchQuery.toLowerCase()))
                )
                .map((diya) => (
                  <AppleDiyaCard key={diya.id} diya={diya} />
                ))}
            </div>
          </div>
        );

      case 'reports':
        return (
          <div style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(249, 250, 251, 0.9))', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(229, 231, 235, 0.5)', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', padding: '32px', textAlign: 'center' }}>
            <DocumentTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">تقارير الديات</h3>
            <p className="text-gray-400">سيتم إضافة تقارير مفصلة عن قضايا الديات قريباً</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6" dir="rtl" style={{ backgroundColor: 'white', minHeight: '100vh' }}>
      {/* Apple Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', padding: '8px', background: 'linear-gradient(135deg, rgba(243, 244, 246, 0.9), rgba(249, 250, 251, 0.9))', backdropFilter: 'blur(10px)', borderRadius: '16px', marginBottom: '24px' }}>
        {diyaTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 20px',
                background: isActive ? 'linear-gradient(135deg, #007AFF, #5856D6)' : 'transparent',
                border: 'none',
                color: isActive ? 'white' : '#86868B',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '100px',
                transition: 'all 0.3s'
              }}
            >
              <Icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div style={{ animation: 'apple-fade-up 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}>
        {renderTabContent()}
      </div>

      {/* Add Diya Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'white',
            borderRadius: '0',
            width: '100%',
            maxWidth: '100%',
            height: '100vh',
            maxHeight: '100vh',
            overflow: 'hidden',
            boxShadow: 'none',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '24px',
              borderBottom: '1px solid #e5e7eb',
              flexShrink: 0
            }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#1F2937'
              }}>إضافة قضية دية جديدة</h2>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  padding: '8px',
                  background: '#F3F4F6',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                <XMarkIcon style={{ width: '24px', height: '24px', color: '#6B7280' }} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{
              flex: 1,
              overflowY: 'auto',
              padding: '32px',
              maxHeight: 'calc(100vh - 160px)'
            }}>
              <div style={{ display: 'grid', gap: '20px' }}>
                {/* Basic Information */}
                <div style={{
                  background: '#F9FAFB',
                  padding: '20px',
                  borderRadius: '12px'
                }}>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    marginBottom: '16px',
                    color: '#374151'
                  }}>معلومات القضية</h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#4B5563' }}>
                        عنوان القضية *
                      </label>
                      <input
                        type="text"
                        required
                        value={newDiya.title}
                        onChange={(e) => setNewDiya(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="مثال: دية حادث مروري - طريق الرياض"
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#4B5563' }}>
                        نوع القضية *
                      </label>
                      <select
                        required
                        value={newDiya.type}
                        onChange={(e) => setNewDiya(prev => ({ ...prev, type: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                      >
                        <option value="accident">حادث مروري</option>
                        <option value="manslaughter">قتل خطأ</option>
                        <option value="injury">إصابة</option>
                        <option value="work_accident">حادث عمل</option>
                        <option value="other">أخرى</option>
                      </select>
                    </div>

                    <div>
                      <SimpleHijriDatePicker
                        label="تاريخ الحادثة"
                        value={newDiya.incidentDate}
                        onChange={(gregorianDate) => setNewDiya(prev => ({ ...prev, incidentDate: gregorianDate }))}
                        required={true}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#4B5563' }}>
                        المكان *
                      </label>
                      <input
                        type="text"
                        required
                        value={newDiya.location}
                        onChange={(e) => setNewDiya(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="مثال: طريق الرياض - الدمام"
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#4B5563' }}>
                        الحالة
                      </label>
                      <select
                        value={newDiya.status}
                        onChange={(e) => setNewDiya(prev => ({ ...prev, status: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                      >
                        <option value="pending">قيد المراجعة</option>
                        <option value="in_progress">جاري التحصيل</option>
                        <option value="completed">مكتملة</option>
                        <option value="cancelled">ملغية</option>
                      </select>
                    </div>

                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#4B5563' }}>
                        وصف القضية
                      </label>
                      <textarea
                        value={newDiya.description}
                        onChange={(e) => setNewDiya(prev => ({ ...prev, description: e.target.value }))}
                        rows="3"
                        placeholder="تفاصيل الحادثة والظروف..."
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '8px',
                          fontSize: '14px',
                          resize: 'vertical'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Beneficiary Information */}
                <div style={{
                  background: '#F9FAFB',
                  padding: '20px',
                  borderRadius: '12px'
                }}>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    marginBottom: '16px',
                    color: '#374151'
                  }}>معلومات المستفيد</h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#4B5563' }}>
                        اسم المستفيد *
                      </label>
                      <input
                        type="text"
                        required
                        value={newDiya.beneficiaryName}
                        onChange={(e) => setNewDiya(prev => ({ ...prev, beneficiaryName: e.target.value }))}
                        placeholder="اسم الشخص أو العائلة"
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#4B5563' }}>
                        رقم الهاتف
                      </label>
                      <input
                        type="tel"
                        value={newDiya.beneficiaryPhone}
                        onChange={(e) => setNewDiya(prev => ({ ...prev, beneficiaryPhone: e.target.value }))}
                        placeholder="05xxxxxxxx"
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Financial Information */}
                <div style={{
                  background: '#F9FAFB',
                  padding: '20px',
                  borderRadius: '12px'
                }}>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    marginBottom: '16px',
                    color: '#374151'
                  }}>المعلومات المالية</h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#4B5563' }}>
                        المبلغ الكلي (ريال) *
                      </label>
                      <input
                        type="number"
                        required
                        value={newDiya.amount}
                        onChange={(e) => handleAmountChange(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#4B5563' }}>
                        المبلغ المحصل
                      </label>
                      <input
                        type="number"
                        value={newDiya.paidAmount}
                        onChange={(e) => setNewDiya(prev => ({
                          ...prev,
                          paidAmount: e.target.value,
                          remainingAmount: (prev.amount || 0) - (e.target.value || 0)
                        }))}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#4B5563' }}>
                        المبلغ المتبقي
                      </label>
                      <input
                        type="number"
                        value={newDiya.remainingAmount || (newDiya.amount - newDiya.paidAmount) || ''}
                        disabled
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                          fontSize: '14px',
                          background: '#F9FAFB',
                          color: '#6B7280'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#4B5563' }}>
                        المسؤول عن التحصيل
                      </label>
                      <input
                        type="text"
                        value={newDiya.collectorName}
                        onChange={(e) => setNewDiya(prev => ({ ...prev, collectorName: e.target.value }))}
                        placeholder="اسم الشخص المسؤول"
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                      />
                    </div>

                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#4B5563' }}>
                        ملاحظات إضافية
                      </label>
                      <textarea
                        value={newDiya.notes}
                        onChange={(e) => setNewDiya(prev => ({ ...prev, notes: e.target.value }))}
                        rows="2"
                        placeholder="أي معلومات أو ملاحظات إضافية..."
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '8px',
                          fontSize: '14px',
                          resize: 'vertical'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'flex-end'
                }}>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    style={{
                      padding: '10px 24px',
                      background: '#F3F4F6',
                      color: '#4B5563',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '10px 24px',
                      background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    إضافة القضية
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contributors Modal */}
      {showContributorsModal && selectedDiya && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }} onClick={() => setShowContributorsModal(false)}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            maxWidth: '1200px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            padding: '32px'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1F2937', marginBottom: '8px' }}>
                  {selectedDiya.title} - قائمة المساهمين
                </h2>
                <div style={{ display: 'flex', gap: '24px', fontSize: '14px', color: '#6B7280' }}>
                  <span>إجمالي المساهمين: <strong>{contributors.length}</strong></span>
                  <span>المبلغ الإجمالي: <strong>{selectedDiya.paidAmount.toLocaleString('ar-SA')} ر.س</strong></span>
                  <span>متوسط المساهمة: <strong>{contributors.length > 0 ? (selectedDiya.paidAmount / contributors.length).toFixed(0) : 0} ر.س</strong></span>
                </div>
              </div>
              <button onClick={() => setShowContributorsModal(false)} style={{
                padding: '8px',
                background: '#F3F4F6',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}>
                <XMarkIcon style={{ width: '24px', height: '24px', color: '#6B7280' }} />
              </button>
            </div>

            <div style={{ background: '#F9FAFB', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#1F2937', color: 'white' }}>
                    <th style={{ padding: '12px', textAlign: 'right', borderRadius: '8px 0 0 0' }}>رقم العضوية</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>الاسم</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>الفخذ</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>المبلغ</th>
                    <th style={{ padding: '12px', textAlign: 'right', borderRadius: '0 8px 0 0' }}>التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {contributors.length > 0 ? (
                    contributors.map((contributor, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #E5E7EB' }}>
                        <td style={{ padding: '12px', textAlign: 'right' }}>{contributor.membership_number}</td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: '500' }}>{contributor.member_name}</td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>{contributor.tribal_section || '-'}</td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#10B981' }}>{contributor.amount.toLocaleString('ar-SA')} ر.س</td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>{new Date(contributor.contribution_date).toLocaleDateString('ar-SA')}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: '#9CA3AF' }}>
                        لا توجد مساهمات حالياً
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setShowContributorsModal(false)} style={{
                padding: '10px 20px',
                background: '#F3F4F6',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer'
              }}>
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppleDiyasManagement;