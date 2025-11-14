import React, { memo,  useState, useEffect, useCallback } from 'react';
import { memberService } from '../../services/memberService';
import MemberImport from './MemberImport';
import AddMemberModal from './AddMemberModal';
import { logger } from '../../utils/logger';

import {
  MagnifyingGlassIcon,
  FunnelIcon,
  UserGroupIcon,
  UserIcon,
  CheckCircleIcon,
  ClockIcon,
  ShieldCheckIcon,
  ArrowDownTrayIcon,
  PaperAirplaneIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

const MembersManagement = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [members, setMembers] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    profile_completed: '',
    social_security_beneficiary: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  // Load data on component mount and when filters change
  useEffect(() => {
    loadStatistics();
  }, []);

  useEffect(() => {
    loadMembers();
  }, [filters, pagination.page, searchQuery]);

  const loadStatistics = async () => {
    try {
      const stats = await memberService.getMemberStatistics();
      setStatistics(stats);
    } catch (error) {
      logger.error('Error loading statistics:', { error });
    }
  };

  const loadMembers = async () => {
    setLoading(true);
    try {
      const searchFilters = { ...filters };
      if (searchQuery.trim()) {
        searchFilters.search = searchQuery.trim();
      }

      const response = await memberService.getMembersList(
        searchFilters,
        pagination.page,
        pagination.limit
      );

      setMembers(response.members || []);
      setPagination(prev => ({
        ...prev,
        total: response.total || 0,
        totalPages: response.totalPages || 0
      }));
    } catch (error) {
      logger.error('Error loading members:', { error });
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const handleFilterChange = (filterKey, value) => {
    setFilters(prev => ({ ...prev, [filterKey]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSelectMember = (memberId) => {
    setSelectedMembers(prev => {
      if (prev.includes(memberId)) {
        return prev.filter(id => id !== memberId);
      } else {
        return [...prev, memberId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedMembers.length === members.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(members.map(member => member.id));
    }
  };

  const handleExportToExcel = async () => {
    try {
      const blob = await memberService.exportMembersToExcel(filters);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `الأعضاء_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      logger.error('Export error:', { error });
      alert('حدث خطأ أثناء تصدير البيانات');
    }
  };

  const handleSendBulkReminders = async () => {
    if (selectedMembers.length === 0) {
      alert('يرجى اختيار عضو واحد على الأقل');
      return;
    }

    try {
      const result = await memberService.sendRegistrationReminders(selectedMembers);
      alert(`تم إرسال ${result.sentCount} رسالة تذكيرية بنجاح`);
      setSelectedMembers([]);
    } catch (error) {
      logger.error('Error sending reminders:', { error });
      alert('حدث خطأ أثناء إرسال التذكيرات');
    }
  };

  const handleMemberAdded = (newMember) => {
    setShowAddMemberModal(false);
    loadMembers();
    loadStatistics();
    alert('تم إضافة العضو بنجاح');
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // Statistics Cards Component
  const StatisticsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
      <div className="backdrop-blur-md bg-white/70 rounded-2xl p-6 shadow-lg border border-white/20">
        <div className="flex items-center">
          <div className="p-3 bg-blue-100 rounded-full">
            <UserGroupIcon className="w-6 h-6 text-blue-600" />
          </div>
          <div className="mr-4">
            <p className="text-2xl font-bold text-gray-800">{statistics.total || 0}</p>
            <p className="text-gray-600 text-sm">إجمالي الأعضاء</p>
          </div>
        </div>
      </div>

      <div className="backdrop-blur-md bg-white/70 rounded-2xl p-6 shadow-lg border border-white/20">
        <div className="flex items-center">
          <div className="p-3 bg-green-100 rounded-full">
            <UserIcon className="w-6 h-6 text-green-600" />
          </div>
          <div className="mr-4">
            <p className="text-2xl font-bold text-gray-800">{statistics.active || 0}</p>
            <p className="text-gray-600 text-sm">الأعضاء النشطون</p>
          </div>
        </div>
      </div>

      <div className="backdrop-blur-md bg-white/70 rounded-2xl p-6 shadow-lg border border-white/20">
        <div className="flex items-center">
          <div className="p-3 bg-emerald-100 rounded-full">
            <CheckCircleIcon className="w-6 h-6 text-emerald-600" />
          </div>
          <div className="mr-4">
            <p className="text-2xl font-bold text-gray-800">{statistics.completed_profiles || 0}</p>
            <p className="text-gray-600 text-sm">ملفات مكتملة</p>
          </div>
        </div>
      </div>

      <div className="backdrop-blur-md bg-white/70 rounded-2xl p-6 shadow-lg border border-white/20">
        <div className="flex items-center">
          <div className="p-3 bg-yellow-100 rounded-full">
            <ClockIcon className="w-6 h-6 text-yellow-600" />
          </div>
          <div className="mr-4">
            <p className="text-2xl font-bold text-gray-800">{statistics.pending_registration || 0}</p>
            <p className="text-gray-600 text-sm">في انتظار التسجيل</p>
          </div>
        </div>
      </div>

      <div className="backdrop-blur-md bg-white/70 rounded-2xl p-6 shadow-lg border border-white/20">
        <div className="flex items-center">
          <div className="p-3 bg-purple-100 rounded-full">
            <ShieldCheckIcon className="w-6 h-6 text-purple-600" />
          </div>
          <div className="mr-4">
            <p className="text-2xl font-bold text-gray-800">{statistics.social_security_beneficiaries || 0}</p>
            <p className="text-gray-600 text-sm">مستفيدو الضمان</p>
          </div>
        </div>
      </div>
    </div>
  );

  // Filters Component
  const FiltersSection = () => (
    <div className={`backdrop-blur-md bg-white/70 rounded-2xl p-6 shadow-lg border border-white/20 mb-6 transition-all duration-300 ${
      showFilters ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform -translate-y-4 hidden'
    }`}>
      <h3 className="text-lg font-semibold text-gray-800 mb-4">الفلاتر</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">الحالة</label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">جميع الحالات</option>
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
            <option value="suspended">موقوف</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">حالة الملف الشخصي</label>
          <select
            value={filters.profile_completed}
            onChange={(e) => handleFilterChange('profile_completed', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">جميع الملفات</option>
            <option value="true">مكتمل</option>
            <option value="false">غير مكتمل</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">مستفيد من الضمان الاجتماعي</label>
          <select
            value={filters.social_security_beneficiary}
            onChange={(e) => handleFilterChange('social_security_beneficiary', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">الكل</option>
            <option value="true">نعم</option>
            <option value="false">لا</option>
          </select>
        </div>
      </div>
    </div>
  );

  // Members Table Component
  const MembersTable = () => (
    <div className="backdrop-blur-md bg-white/70 rounded-2xl shadow-lg border border-white/20 overflow-hidden">
      {/* Table Actions */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="البحث في الأعضاء..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowAddMemberModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              <PlusIcon className="w-5 h-5" />
              إضافة عضو يدوياً
            </button>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
            >
              <FunnelIcon className="w-5 h-5" />
              الفلاتر
            </button>

            <button
              onClick={handleExportToExcel}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              تصدير Excel
            </button>

            {selectedMembers.length > 0 && (
              <button
                onClick={handleSendBulkReminders}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                <PaperAirplaneIcon className="w-5 h-5" />
                إرسال تذكيرات ({selectedMembers.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50/50">
            <tr>
              <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={selectedMembers.length === members.length && members.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </th>
              <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                الاسم
              </th>
              <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                رقم العضوية
              </th>
              <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                رقم الهاتف
              </th>
              <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                حالة الملف
              </th>
              <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                الحالة
              </th>
              <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                تاريخ التسجيل
              </th>
              <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                الإجراءات
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="8" className="px-6 py-12 text-center">
                  <div className="flex items-center justify-center">
                    <ClockIcon className="w-6 h-6 text-gray-400 animate-spin ml-2" />
                    جاري التحميل...
                  </div>
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                  لا توجد أعضاء مطابقة للبحث
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50/50 transition-colors duration-150">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(member.id)}
                      onChange={() => handleSelectMember(member.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm ml-3">
                        {member.full_name_arabic?.charAt(0) || 'ع'}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {member.full_name_arabic || 'غير محدد'}
                        </div>
                        {member.email && (
                          <div className="text-sm text-gray-500">{member.email}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {member.membership_number || 'غير محدد'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {member.phone || 'غير محدد'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      member.profile_completed
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {member.profile_completed ? 'مكتمل' : 'غير مكتمل'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      member.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : member.status === 'inactive'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {member.status === 'active' ? 'نشط' : member.status === 'inactive' ? 'غير نشط' : 'موقوف'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {member.created_at ? new Date(member.created_at).toLocaleDateString('ar-SA') : 'غير محدد'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="text-blue-600 hover:text-blue-800 p-1">
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button className="text-green-600 hover:text-green-800 p-1">
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-800 p-1">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              عرض {((pagination.page - 1) * pagination.limit) + 1} إلى {Math.min(pagination.page * pagination.limit, pagination.total)} من {pagination.total} عضو
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>

              <span className="px-3 py-1 bg-blue-600 text-white rounded-lg">
                {pagination.page}
              </span>

              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (activeTab === 'import') {
    return <MemberImport />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6" dir="rtl">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="backdrop-blur-md bg-white/70 rounded-2xl p-6 shadow-lg border border-white/20">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">إدارة الأعضاء</h1>
              <p className="text-gray-600">متابعة وإدارة أعضاء عائلة الشعيل</p>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                  activeTab === 'overview'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/50 text-gray-700 hover:bg-white/70'
                }`}
              >
                لوحة الأعضاء
              </button>
              <button
                onClick={() => setActiveTab('import')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                  activeTab === 'import'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/50 text-gray-700 hover:bg-white/70'
                }`}
              >
                استيراد الأعضاء
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Statistics */}
        <StatisticsCards />

        {/* Filters */}
        <FiltersSection />

        {/* Members Table */}
        <MembersTable />

        {/* Add Member Modal */}
        <AddMemberModal
          isOpen={showAddMemberModal}
          onClose={() => setShowAddMemberModal(false)}
          onMemberAdded={handleMemberAdded}
        />
      </div>
    </div>
  );
};

export default memo(MembersManagement);