import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { toHijri } from 'hijri-converter';
import {
  ScaleIcon,
  HandRaisedIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CalendarIcon,
  MapPinIcon,
  PhoneIcon,
  ShieldExclamationIcon,
  ShieldCheckIcon,
  UsersIcon,
  BanknotesIcon,
  ChartBarIcon,
  DocumentArrowDownIcon,
  PrinterIcon,
  ShareIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';

const DiyasManagement = () => {
  const { user, canAccessModule } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [diyas, setDiyas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    priority: '',
    payment_status: ''
  });
  const [selectedDiya, setSelectedDiya] = useState(null);
  const [showDiyaModal, setShowDiyaModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // API URL configuration
  const API_URL = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://proshael.onrender.com');

  // Mock diyas data
  const mockDiyas = [
    {
      id: 1,
      case_number: 'DIYA-2024-001',
      title: 'قضية حادث مروري - الطريق الدائري',
      description: 'حادث مروري أدى إلى وفاة المرحوم عبدالله محمد الشعيل على الطريق الدائري',
      type: 'traffic_accident',
      status: 'active',
      priority: 'high',
      payment_status: 'partial',
      diya_amount: 400000,
      paid_amount: 250000,
      remaining_amount: 150000,
      incident_date: '2023-12-15',
      creation_date: '2023-12-20',
      deadline: '2024-06-15',
      hijri_incident: toHijri(2023, 12, 15),
      hijri_creation: toHijri(2023, 12, 20),
      hijri_deadline: toHijri(2024, 6, 15),
      // Parties involved
      victim: {
        name: 'عبدالله محمد الشعيل',
        age: 45,
        relationship: 'ابن العم',
        heirs: ['الزوجة: فاطمة أحمد', 'الابن: محمد عبدالله', 'الابنة: عائشة عبدالله']
      },
      responsible_party: {
        name: 'خالد سعد العتيبي',
        phone: '0501234567',
        insurance_company: 'شركة الراجحي للتأمين',
        policy_number: 'INS-2023-98765'
      },
      // Management
      mediator: 'الشيخ أحمد بن سعد الشعيل',
      assigned_lawyer: 'المحامي عبدالرحمن القحطاني',
      case_manager: 'محمد أحمد الشعيل',
      location: 'الرياض - الطريق الدائري الشرقي',
      court_reference: 'محكمة الرياض العامة - قضية رقم 12345',
      // Financial details
      contributors: [
        { name: 'أحمد محمد الشعيل', amount: 100000 },
        { name: 'سعد محمد الشعيل', amount: 75000 },
        { name: 'فاطمة محمد الشعيل', amount: 50000 },
        { name: 'عبدالرحمن محمد الشعيل', amount: 25000 }
      ],
      contributors_count: 4,
      total_family_contribution: 250000,
      insurance_coverage: 150000,
      notes: 'تم الاتفاق مع أهل المتوفى على المبلغ. يتم التحصيل من شركة التأمين للجزء المتبقي.',
      status_history: [
        { date: '2023-12-20', status: 'opened', description: 'فتح الملف وبدء الإجراءات' },
        { date: '2023-12-25', status: 'investigation', description: 'التحقيق في تفاصيل الحادث' },
        { date: '2024-01-10', status: 'negotiation', description: 'بدء المفاوضات مع الأطراف' },
        { date: '2024-01-20', status: 'agreement', description: 'التوصل لاتفاق مبدئي' }
      ],
      documents: [
        'تقرير الشرطة',
        'تقرير الطب الشرعي',
        'شهادة الوفاة',
        'حصر الورثة',
        'عقد التأمين'
      ]
    },
    {
      id: 2,
      case_number: 'DIYA-2024-002',
      title: 'قضية اعتداء جسدي - مشاجرة',
      description: 'اعتداء جسدي أدى إلى إصابات جسيمة في مشاجرة بين أفراد العائلة',
      type: 'assault',
      status: 'investigation',
      priority: 'medium',
      payment_status: 'pending',
      diya_amount: 80000,
      paid_amount: 0,
      remaining_amount: 80000,
      incident_date: '2024-01-10',
      creation_date: '2024-01-12',
      deadline: '2024-07-10',
      hijri_incident: toHijri(2024, 1, 10),
      hijri_creation: toHijri(2024, 1, 12),
      hijri_deadline: toHijri(2024, 7, 10),
      victim: {
        name: 'سعد عبدالله الشعيل',
        age: 35,
        relationship: 'ابن العم الثاني',
        heirs: ['الوالد: عبدالله سعد', 'الزوجة: نورا أحمد']
      },
      responsible_party: {
        name: 'عبدالعزيز خالد النمر',
        phone: '0501234568',
        insurance_company: null,
        policy_number: null
      },
      mediator: 'الشيخ سعد بن عبدالله الشعيل',
      assigned_lawyer: 'المحامية فاطمة السليمان',
      case_manager: 'أحمد سعد الشعيل',
      location: 'الرياض - حي الملز',
      court_reference: 'محكمة الرياض الجزائية - قضية رقم 67890',
      contributors: [],
      contributors_count: 0,
      total_family_contribution: 0,
      insurance_coverage: 0,
      notes: 'قضية في مرحلة التحقيق. لم يتم تحديد مبلغ الدية نهائياً بعد.',
      status_history: [
        { date: '2024-01-12', status: 'opened', description: 'فتح الملف' },
        { date: '2024-01-15', status: 'investigation', description: 'بدء التحقيق' }
      ],
      documents: [
        'تقرير الشرطة',
        'التقرير الطبي',
        'شهادات الشهود'
      ]
    },
    {
      id: 3,
      case_number: 'DIYA-2023-045',
      title: 'قضية خطأ طبي - مستشفى خاص',
      description: 'وفاة بسبب خطأ طبي في عملية جراحية بمستشفى خاص',
      type: 'medical_error',
      status: 'completed',
      priority: 'high',
      payment_status: 'paid',
      diya_amount: 500000,
      paid_amount: 500000,
      remaining_amount: 0,
      incident_date: '2023-08-20',
      creation_date: '2023-08-25',
      deadline: '2024-02-20',
      hijri_incident: toHijri(2023, 8, 20),
      hijri_creation: toHijri(2023, 8, 25),
      hijri_deadline: toHijri(2024, 2, 20),
      victim: {
        name: 'خديجة أحمد الشعيل',
        age: 60,
        relationship: 'العمة',
        heirs: ['الابن: أحمد خديجة', 'الابن: محمد خديجة', 'الابنة: فاطمة خديجة']
      },
      responsible_party: {
        name: 'مستشفى الرياض التخصصي',
        phone: '0112345678',
        insurance_company: 'شركة سلامة للتأمين',
        policy_number: 'MED-2023-54321'
      },
      mediator: 'الشيخ محمد بن أحمد الشعيل',
      assigned_lawyer: 'المحامي عبدالله المطيري',
      case_manager: 'فاطمة أحمد الشعيل',
      location: 'الرياض - مستشفى الرياض التخصصي',
      court_reference: 'محكمة الرياض التجارية - قضية رقم 11111',
      contributors: [
        { name: 'العائلة الكريمة', amount: 100000 },
        { name: 'تأمين المستشفى', amount: 400000 }
      ],
      contributors_count: 1,
      total_family_contribution: 100000,
      insurance_coverage: 400000,
      notes: 'تم حل القضية بالتراضي. دُفع المبلغ كاملاً من تأمين المستشفى والعائلة.',
      status_history: [
        { date: '2023-08-25', status: 'opened', description: 'فتح الملف' },
        { date: '2023-09-01', status: 'investigation', description: 'التحقيق الطبي' },
        { date: '2023-10-15', status: 'negotiation', description: 'المفاوضات مع المستشفى' },
        { date: '2023-12-20', status: 'agreement', description: 'التوصل للاتفاق النهائي' },
        { date: '2024-01-10', status: 'completed', description: 'دفع المبلغ كاملاً وإغلاق القضية' }
      ],
      documents: [
        'الملف الطبي',
        'تقرير الخطأ الطبي',
        'شهادة الوفاة',
        'حصر الورثة',
        'اتفاقية التسوية',
        'إيصال الدفع'
      ]
    },
    {
      id: 4,
      case_number: 'DIYA-2024-003',
      title: 'قضية حادث عمل - ورشة بناء',
      description: 'إصابة عمل أدت إلى عجز دائم في ورشة بناء',
      type: 'work_accident',
      status: 'cancelled',
      priority: 'low',
      payment_status: 'cancelled',
      diya_amount: 150000,
      paid_amount: 0,
      remaining_amount: 0,
      incident_date: '2024-01-05',
      creation_date: '2024-01-08',
      deadline: '2024-07-05',
      hijri_incident: toHijri(2024, 1, 5),
      hijri_creation: toHijri(2024, 1, 8),
      hijri_deadline: toHijri(2024, 7, 5),
      victim: {
        name: 'محمد سعد الشعيل',
        age: 28,
        relationship: 'ابن العم',
        heirs: ['الوالد: سعد محمد', 'الزوجة: عائشة علي']
      },
      responsible_party: {
        name: 'شركة البناء المتقدم',
        phone: '0112345679',
        insurance_company: 'شركة أليانز للتأمين',
        policy_number: 'WORK-2024-99999'
      },
      mediator: 'الشيخ عبدالرحمن الشعيل',
      assigned_lawyer: 'المحامي خالد الشمري',
      case_manager: 'عبدالله محمد الشعيل',
      location: 'الرياض - موقع البناء',
      court_reference: 'محكمة العمال - قضية رقم 22222',
      contributors: [],
      contributors_count: 0,
      total_family_contribution: 0,
      insurance_coverage: 150000,
      notes: 'تم إلغاء القضية بعد تعافي المصاب وعدم وجود عجز دائم.',
      status_history: [
        { date: '2024-01-08', status: 'opened', description: 'فتح الملف' },
        { date: '2024-01-15', status: 'investigation', description: 'التحقيق في الحادث' },
        { date: '2024-01-25', status: 'cancelled', description: 'إلغاء القضية - تعافي المصاب' }
      ],
      documents: [
        'تقرير الحادث',
        'التقارير الطبية',
        'إقرار التعافي'
      ]
    }
  ];

  useEffect(() => {
    if (canAccessModule('diyas')) {
      loadDiyasData();
    }
  }, [filters]);

  const loadDiyasData = async () => {
    setLoading(true);
    try {
      // Fetch real data from API
      const response = await fetch(`${API_URL}/api/diya/dashboard`);
      const result = await response.json();

      if (result.success && result.data) {
        // Transform API data to match component structure
        // API returns activities table with: title_ar, target_amount, current_amount, contributor_count
        const transformedDiyas = result.data.map(d => ({
          id: d.id,
          case_number: d.case_number || `DIYA-${d.id.substring(0, 8)}`,
          title: d.title_ar || d.title_en || 'قضية دية',
          description: d.description_ar || d.description_en || '',
          type: 'traffic_accident', // Default type
          status: d.status === 'completed' ? 'completed' : 'active',
          priority: 'high',
          payment_status: d.status === 'completed' ? 'paid' : 'partial',
          diya_amount: d.target_amount || 0,
          paid_amount: d.current_amount || 0,
          remaining_amount: (d.target_amount || 0) - (d.current_amount || 0),
          incident_date: d.created_at ? new Date(d.created_at).toLocaleDateString('ar-SA') : '',
          creation_date: d.created_at ? new Date(d.created_at).toLocaleDateString('ar-SA') : '',
          deadline: '',
          hijri_incident: toHijri(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()),
          hijri_creation: toHijri(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()),
          hijri_deadline: toHijri(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()),
          victim: {
            name: d.description_ar || 'غير محدد',
            age: 0,
            relationship: '',
            heirs: []
          },
          responsible_party: {
            name: '',
            phone: '',
            insurance_company: null,
            policy_number: null
          },
          mediator: 'إدارة الصندوق',
          assigned_lawyer: '',
          case_manager: '',
          location: '',
          court_reference: '',
          contributors: d.financial_contributions || [],
          contributors_count: d.contributor_count || d.contribution_count || 0,
          total_family_contribution: d.current_amount || 0,
          insurance_coverage: 0,
          notes: '',
          status_history: [],
          documents: []
        }));

        setDiyas(transformedDiyas);
      } else {
        // Fallback to mock data
        setDiyas(mockDiyas);
      }
    } catch (error) {
      console.error('Error loading diyas data:', error);
      // Fallback to mock data on error
      setDiyas(mockDiyas);
    } finally {
      setLoading(false);
    }
  };

  // RBAC Access Control
  if (!canAccessModule('diyas')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 flex items-center justify-center" dir="rtl">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
            <ShieldExclamationIcon className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">غير مصرح بالوصول</h2>
          <p className="text-gray-600 mb-6">
            ليس لديك صلاحية للوصول إلى قسم إدارة الديات. يتطلب هذا القسم صلاحيات مدير المناسبات والمبادرات أو المدير العام.
          </p>
          <div className="text-sm text-gray-500">
            الصلاحية الحالية: {user?.role || 'غير محدد'}
          </div>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const statistics = {
    total_cases: diyas.length,
    active_cases: diyas.filter(d => d.status === 'active').length,
    investigation_cases: diyas.filter(d => d.status === 'investigation').length,
    completed_cases: diyas.filter(d => d.status === 'completed').length,
    cancelled_cases: diyas.filter(d => d.status === 'cancelled').length,
    total_diya_amount: diyas.reduce((sum, d) => sum + d.diya_amount, 0),
    total_paid_amount: diyas.reduce((sum, d) => sum + d.paid_amount, 0),
    total_remaining: diyas.reduce((sum, d) => sum + d.remaining_amount, 0),
    total_contributors: diyas.reduce((sum, d) => sum + d.contributors_count, 0),
    success_rate: diyas.length > 0 ? ((diyas.filter(d => d.status === 'completed').length / diyas.length) * 100).toFixed(1) : 0
  };

  // Filter diyas
  const filteredDiyas = diyas.filter(diya => {
    const matchesSearch = !searchQuery ||
      diya.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      diya.case_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      diya.victim.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      diya.responsible_party.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = !filters.status || diya.status === filters.status;
    const matchesType = !filters.type || diya.type === filters.type;
    const matchesPriority = !filters.priority || diya.priority === filters.priority;
    const matchesPayment = !filters.payment_status || diya.payment_status === filters.payment_status;

    return matchesSearch && matchesStatus && matchesType && matchesPriority && matchesPayment;
  });

  const formatHijriDate = (gregorianDate) => {
    try {
      const date = new Date(gregorianDate);
      const hijriDate = toHijri(date.getFullYear(), date.getMonth() + 1, date.getDate());
      return `${hijriDate.hy}/${hijriDate.hm}/${hijriDate.hd} هـ`;
    } catch (error) {
      return gregorianDate;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'investigation':
        return <MagnifyingGlassIcon className="w-5 h-5 text-blue-500" />;
      case 'negotiation':
        return <ChatBubbleLeftRightIcon className="w-5 h-5 text-yellow-500" />;
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-blue-500" />;
      case 'cancelled':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'نشط';
      case 'investigation': return 'قيد التحقيق';
      case 'negotiation': return 'قيد التفاوض';
      case 'completed': return 'مكتمل';
      case 'cancelled': return 'ملغي';
      default: return 'غير محدد';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'investigation': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'negotiation': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'traffic_accident':
        return <MapPinIcon className="w-6 h-6 text-red-500" />;
      case 'assault':
        return <ExclamationTriangleIcon className="w-6 h-6 text-orange-500" />;
      case 'medical_error':
        return <DocumentTextIcon className="w-6 h-6 text-blue-500" />;
      case 'work_accident':
        return <ScaleIcon className="w-6 h-6 text-purple-500" />;
      default:
        return <ScaleIcon className="w-6 h-6 text-gray-500" />;
    }
  };

  const getTypeText = (type) => {
    switch (type) {
      case 'traffic_accident': return 'حادث مروري';
      case 'assault': return 'اعتداء';
      case 'medical_error': return 'خطأ طبي';
      case 'work_accident': return 'حادث عمل';
      default: return 'أخرى';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case 'high': return 'عالية';
      case 'medium': return 'متوسطة';
      case 'low': return 'منخفضة';
      default: return 'غير محدد';
    }
  };

  const getPaymentStatusText = (status) => {
    switch (status) {
      case 'paid': return 'مدفوع';
      case 'partial': return 'دفع جزئي';
      case 'pending': return 'معلق';
      case 'cancelled': return 'ملغي';
      default: return 'غير محدد';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'partial': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pending': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Statistics Cards Component
  const StatisticsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 xl:grid-cols-10 gap-6 mb-8">
      {/* Total Cases */}
      <div className="glass-card p-6 hover:scale-105 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">إجمالي القضايا</p>
            <p className="text-3xl font-bold text-gray-900">{statistics.total_cases}</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
            <ScaleIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Active Cases */}
      <div className="glass-card p-6 hover:scale-105 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">النشطة</p>
            <p className="text-3xl font-bold text-green-600">{statistics.active_cases}</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
            <CheckCircleIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Investigation Cases */}
      <div className="glass-card p-6 hover:scale-105 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">قيد التحقيق</p>
            <p className="text-3xl font-bold text-blue-600">{statistics.investigation_cases}</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
            <MagnifyingGlassIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Completed Cases */}
      <div className="glass-card p-6 hover:scale-105 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">المكتملة</p>
            <p className="text-3xl font-bold text-purple-600">{statistics.completed_cases}</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
            <ShieldCheckIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Cancelled Cases */}
      <div className="glass-card p-6 hover:scale-105 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">الملغية</p>
            <p className="text-3xl font-bold text-red-600">{statistics.cancelled_cases}</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
            <XCircleIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Total Diya Amount */}
      <div className="glass-card p-6 hover:scale-105 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">إجمالي مبالغ الديات</p>
            <p className="text-2xl font-bold text-indigo-600">{statistics.total_diya_amount.toLocaleString()} ريال</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <BanknotesIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Total Paid */}
      <div className="glass-card p-6 hover:scale-105 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">إجمالي المدفوع</p>
            <p className="text-2xl font-bold text-cyan-600">{statistics.total_paid_amount.toLocaleString()} ريال</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl flex items-center justify-center">
            <CheckCircleIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Total Remaining */}
      <div className="glass-card p-6 hover:scale-105 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">المبلغ المتبقي</p>
            <p className="text-2xl font-bold text-orange-600">{statistics.total_remaining.toLocaleString()} ريال</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
            <ClockIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Total Contributors */}
      <div className="glass-card p-6 hover:scale-105 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">المساهمين</p>
            <p className="text-3xl font-bold text-pink-600">{statistics.total_contributors}</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center">
            <UsersIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Success Rate */}
      <div className="glass-card p-6 hover:scale-105 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">معدل النجاح</p>
            <p className="text-3xl font-bold text-teal-600">{statistics.success_rate}%</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
            <ChartBarIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>
    </div>
  );

  // Diyas Grid Component
  const DiyasGrid = () => (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="glass-card p-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <MagnifyingGlassIcon className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="البحث برقم القضية أو العنوان أو اسم المتضرر..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
            >
              <option value="">جميع الحالات</option>
              <option value="active">نشط</option>
              <option value="investigation">قيد التحقيق</option>
              <option value="negotiation">قيد التفاوض</option>
              <option value="completed">مكتمل</option>
              <option value="cancelled">ملغي</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={filters.type}
              onChange={(e) => setFilters({...filters, type: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
            >
              <option value="">جميع الأنواع</option>
              <option value="traffic_accident">حادث مروري</option>
              <option value="assault">اعتداء</option>
              <option value="medical_error">خطأ طبي</option>
              <option value="work_accident">حادث عمل</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({...filters, priority: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
            >
              <option value="">جميع الأولويات</option>
              <option value="high">عالية</option>
              <option value="medium">متوسطة</option>
              <option value="low">منخفضة</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={() => setShowCreateModal(true)}
            className="premium-btn flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            قضية جديدة
          </button>
        </div>
      </div>

      {/* Diyas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDiyas.map((diya) => (
          <div key={diya.id} className="glass-card hover:scale-105 transition-all duration-300 overflow-hidden">
            {/* Diya Header */}
            <div className="bg-gradient-to-br from-amber-100 to-orange-100 p-6 relative">
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getStatusColor(diya.status)}`}>
                  {getStatusText(diya.status)}
                </span>
                <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getPriorityColor(diya.priority)}`}>
                  أولوية {getPriorityText(diya.priority)}
                </span>
              </div>

              <div className="flex items-center gap-3 mb-3">
                {getTypeIcon(diya.type)}
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{diya.case_number}</h3>
                  <p className="text-sm text-gray-600">{getTypeText(diya.type)}</p>
                </div>
              </div>

              <h4 className="text-md font-semibold text-gray-800 line-clamp-2">{diya.title}</h4>
            </div>

            {/* Diya Content */}
            <div className="p-6">
              {/* Case Details */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <UserGroupIcon className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">المتضرر:</span>
                  <span className="font-medium text-gray-900">{diya.victim.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <HandRaisedIcon className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">الوسيط:</span>
                  <span className="font-medium text-gray-900">{diya.mediator}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CalendarIcon className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">تاريخ الحادث:</span>
                  <span className="font-medium text-gray-900">{diya.incident_date}</span>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <p className="text-sm text-gray-600">مبلغ الدية</p>
                  <p className="text-lg font-bold text-amber-600">{diya.diya_amount.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">ريال</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">المدفوع</p>
                  <p className="text-lg font-bold text-green-600">{diya.paid_amount.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">ريال</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>تقدم الدفع</span>
                  <span>{diya.diya_amount > 0 ? ((diya.paid_amount / diya.diya_amount) * 100).toFixed(1) : 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-orange-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${diya.diya_amount > 0 ? Math.min((diya.paid_amount / diya.diya_amount) * 100, 100) : 0}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>متبقي: {diya.remaining_amount.toLocaleString()} ريال</span>
                  <span className={`px-1 py-0.5 rounded text-xs ${getPaymentStatusColor(diya.payment_status)}`}>
                    {getPaymentStatusText(diya.payment_status)}
                  </span>
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-2 mb-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  <span>الموعد النهائي: {diya.deadline}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPinIcon className="w-4 h-4" />
                  <span className="line-clamp-1">{diya.location}</span>
                </div>
              </div>

              {/* Contributors */}
              {diya.contributors_count > 0 && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">المساهمون</p>
                  <p className="text-sm font-medium text-gray-900">{diya.contributors_count} مساهم</p>
                  <p className="text-xs text-gray-600">مساهمة العائلة: {diya.total_family_contribution.toLocaleString()} ريال</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => {setSelectedDiya(diya); setShowDiyaModal(true);}}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg hover:from-amber-600 hover:to-orange-700 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <EyeIcon className="w-4 h-4" />
                  عرض
                </button>
                <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200">
                  <PencilIcon className="w-4 h-4" />
                </button>
                <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200">
                  <DocumentArrowDownIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredDiyas.length === 0 && (
        <div className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <ScaleIcon className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد قضايا ديات</h3>
          <p className="text-gray-500">لم يتم العثور على قضايا تطابق المعايير المحددة</p>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل بيانات الديات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50" dir="rtl">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                <ScaleIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">إدارة الديات</h1>
                <p className="text-sm text-gray-600">متابعة وإدارة قضايا الديات والتعويضات</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">مرحباً، {user?.full_name || user?.name}</span>
              <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {(user?.full_name || user?.name || '').charAt(0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <StatisticsCards />

        {/* Tab Navigation */}
        <div className="glass-card p-6 mb-8">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              نظرة عامة
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === 'active'
                  ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              القضايا النشطة
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === 'completed'
                  ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              القضايا المكتملة
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === 'reports'
                  ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              التقارير
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {(activeTab === 'overview' || activeTab === 'active' || activeTab === 'completed') && <DiyasGrid />}
        {activeTab === 'reports' && (
          <div className="glass-card p-8 text-center">
            <DocumentTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">تقارير الديات قريباً</h3>
            <p className="text-gray-500">سيتم إضافة التقارير التفصيلية والإحصائيات قريباً</p>
          </div>
        )}
      </div>

      {/* Add CSS Styles */}
      <style jsx>{`
        .glass-card {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(40px);
          -webkit-backdrop-filter: blur(40px);
          border: 1px solid rgba(255, 255, 255, 0.5);
          border-radius: 20px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .glass-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 50px rgba(0, 0, 0, 0.12);
        }

        .premium-btn {
          background: linear-gradient(135deg, #F59E0B 0%, #EA580C 100%);
          padding: 12px 24px;
          border-radius: 12px;
          color: white;
          font-weight: 600;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          border: none;
          cursor: pointer;
        }

        .premium-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(245, 158, 11, 0.3);
        }

        .premium-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s;
        }

        .premium-btn:hover::before {
          left: 100%;
        }

        .line-clamp-1 {
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
        }

        .line-clamp-2 {
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
      `}</style>
    </div>
  );
};

export default DiyasManagement;