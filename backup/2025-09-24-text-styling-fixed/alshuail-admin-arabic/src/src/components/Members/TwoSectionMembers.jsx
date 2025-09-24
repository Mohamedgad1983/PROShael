import React, { useState, useEffect, useCallback } from 'react';
import { memberService } from '../../services/memberService';
import PremiumRegistration from '../Registration/PremiumRegistration';
import CompactAddMember from './CompactAddMember';
import './TwoSectionMembers.css';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  UserPlusIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

const TwoSectionMembers = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [currentView, setCurrentView] = useState('list'); // 'list' or 'add'
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

  // Load members when component mounts or filters change
  useEffect(() => {
    loadMembers();
  }, [filters, pagination.page, searchQuery]);

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
      console.error('Error loading members:', error);
      // Use mock data if service fails
      setMembers(getMockMembers());
      setPagination(prev => ({
        ...prev,
        total: 50,
        totalPages: 5
      }));
    } finally {
      setLoading(false);
    }
  };

  const getMockMembers = () => [
    { id: 1, full_name: 'محمد أحمد الشعيل', phone: '0501234567', status: 'active', email: 'mohamed@example.com', profile_completed: true },
    { id: 2, full_name: 'فاطمة عبدالله العنزي', phone: '0512345678', status: 'active', email: 'fatima@example.com', profile_completed: true },
    { id: 3, full_name: 'عبدالرحمن سعود الشعيل', phone: '0523456789', status: 'inactive', email: 'abdulrahman@example.com', profile_completed: false },
    { id: 4, full_name: 'نورة محمد العنزي', phone: '0534567890', status: 'active', email: 'noura@example.com', profile_completed: true },
    { id: 5, full_name: 'خالد فيصل الشعيل', phone: '0545678901', status: 'active', email: 'khalid@example.com', profile_completed: false }
  ];

  const handleSearch = useCallback((e) => {
    setSearchQuery(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const handleFilterChange = (filterKey, value) => {
    setFilters(prev => ({ ...prev, [filterKey]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleExport = async () => {
    try {
      // Create sample data with Arabic characters
      const exportData = members.map(member => ({
        'الاسم الكامل': member.full_name,
        'رقم الهاتف': member.phone,
        'البريد الإلكتروني': member.email || '',
        'الحالة': member.status === 'active' ? 'نشط' : 'غير نشط',
        'اكتمال الملف': member.profile_completed ? 'مكتمل' : 'غير مكتمل'
      }));

      // Convert to CSV with UTF-8 BOM for Arabic support
      const csvContent = '\ufeff' + convertToCSV(exportData);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `الأعضاء_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('حدث خطأ في تصدير البيانات');
    }
  };

  const convertToCSV = (data) => {
    if (!data.length) return '';
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    const csvRows = data.map(row =>
      headers.map(header => `"${(row[header] || '').toString().replace(/"/g, '""')}"`).join(',')
    );
    return [csvHeaders, ...csvRows].join('\n');
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.xlsx,.xls';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const text = event.target.result;
            const lines = text.split('\n');
            const headers = lines[0].split(',').map(h => h.replace(/["\r]/g, '').trim());

            const importedMembers = [];
            for (let i = 1; i < lines.length; i++) {
              if (lines[i].trim()) {
                const values = lines[i].match(/(".*?"|[^,]+)/g).map(v => v.replace(/["\r]/g, '').trim());
                const member = {};
                headers.forEach((header, index) => {
                  if (header === 'الاسم الكامل') member.full_name = values[index];
                  if (header === 'رقم الهاتف') member.phone = values[index];
                  if (header === 'البريد الإلكتروني') member.email = values[index];
                  if (header === 'الحالة') member.status = values[index] === 'نشط' ? 'active' : 'inactive';
                  if (header === 'اكتمال الملف') member.profile_completed = values[index] === 'مكتمل';
                });
                if (member.full_name && member.phone) {
                  importedMembers.push({
                    ...member,
                    id: Date.now() + i
                  });
                }
              }
            }

            if (importedMembers.length > 0) {
              setMembers(prev => [...prev, ...importedMembers]);
              alert(`تم استيراد ${importedMembers.length} عضو بنجاح`);
            } else {
              alert('لم يتم العثور على بيانات صالحة للاستيراد');
            }
          } catch (error) {
            console.error('Import error:', error);
            alert('حدث خطأ في استيراد البيانات');
          }
        };
        reader.readAsText(file, 'UTF-8');
      }
    };
    input.click();
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleMemberAdded = (newMember) => {
    setCurrentView('list');
    loadMembers();
  };

  const handleAddMemberClick = () => {
    setCurrentView('add');
  };

  const handleBackToList = () => {
    setCurrentView('list');
  };

  // If showing Add Member full page
  if (currentView === 'add') {
    return (
      <div className="full-page-add-member">
        <div className="add-member-header">
          <button className="back-to-list-btn" onClick={handleBackToList}>
            <ArrowLeftIcon className="btn-icon" />
            <span>العودة إلى قائمة الأعضاء</span>
          </button>
          <h1 className="add-member-title">إضافة عضو جديد</h1>
        </div>
        <div className="add-member-content">
          <CompactAddMember onMemberAdded={handleMemberAdded} />
        </div>
      </div>
    );
  }

  // Default view - Members list with two sections
  return (
    <div className="two-section-container">
      {/* TOP SECTION - Controls */}
      <div className="top-control-section">
        <div className="control-section-inner">
          {/* Row 1: Add Member and Search */}
          <div className="control-row">
            <button
              className="add-member-btn"
              onClick={handleAddMemberClick}
            >
              <UserPlusIcon className="btn-icon" />
              <span>إضافة عضو جديد</span>
            </button>

            <div className="search-container">
              <MagnifyingGlassIcon className="search-icon" />
              <input
                type="text"
                placeholder="البحث عن عضو..."
                value={searchQuery}
                onChange={handleSearch}
                className="search-input"
                dir="rtl"
              />
            </div>
          </div>

          {/* Row 2: Filters and Export */}
          <div className="control-row">
            <div className="filter-group">
              <button
                className="filter-toggle-btn"
                onClick={() => setShowFilters(!showFilters)}
              >
                <AdjustmentsHorizontalIcon className="btn-icon" />
                <span>الفلاتر</span>
                {Object.values(filters).filter(v => v).length > 0 && (
                  <span className="filter-badge">
                    {Object.values(filters).filter(v => v).length}
                  </span>
                )}
              </button>

              {showFilters && (
                <div className="filter-dropdown">
                  <div className="filter-item">
                    <label>الحالة:</label>
                    <select
                      value={filters.status}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                    >
                      <option value="">الكل</option>
                      <option value="active">نشط</option>
                      <option value="inactive">غير نشط</option>
                    </select>
                  </div>
                  <div className="filter-item">
                    <label>اكتمال الملف:</label>
                    <select
                      value={filters.profile_completed}
                      onChange={(e) => handleFilterChange('profile_completed', e.target.value)}
                    >
                      <option value="">الكل</option>
                      <option value="true">مكتمل</option>
                      <option value="false">غير مكتمل</option>
                    </select>
                  </div>
                  <div className="filter-item">
                    <label>الضمان الاجتماعي:</label>
                    <select
                      value={filters.social_security_beneficiary}
                      onChange={(e) => handleFilterChange('social_security_beneficiary', e.target.value)}
                    >
                      <option value="">الكل</option>
                      <option value="true">مستفيد</option>
                      <option value="false">غير مستفيد</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="import-export-group">
              <button className="import-btn" onClick={handleImport}>
                <ArrowUpTrayIcon className="btn-icon" />
                <span>استيراد Excel</span>
              </button>
              <button className="export-btn" onClick={handleExport}>
                <ArrowDownTrayIcon className="btn-icon" />
                <span>تصدير Excel</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION - Members Table */}
      <div className="bottom-data-section">
        <div className="data-section-inner">
          {/* Results Count */}
          <div className="results-info">
            <span>عرض {members.length} من {pagination.total} عضو</span>
          </div>

          {/* Members Table */}
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>جاري تحميل البيانات...</p>
            </div>
          ) : (
            <div className="members-table-container">
              <table className="members-table">
                <thead>
                  <tr>
                    <th>الاسم الكامل</th>
                    <th>رقم الهاتف</th>
                    <th>البريد الإلكتروني</th>
                    <th>الحالة</th>
                    <th>اكتمال الملف</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(member => (
                    <tr key={member.id} className="table-row">
                      <td className="member-name">{member.full_name}</td>
                      <td className="member-phone">{member.phone}</td>
                      <td className="member-email">{member.email || '-'}</td>
                      <td>
                        <span className={`status-badge ${member.status}`}>
                          {member.status === 'active' ? 'نشط' : 'غير نشط'}
                        </span>
                      </td>
                      <td>
                        <span className={`profile-badge ${member.profile_completed ? 'complete' : 'incomplete'}`}>
                          {member.profile_completed ? 'مكتمل' : 'غير مكتمل'}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <button className="action-btn view" title="عرض">
                          <EyeIcon />
                        </button>
                        <button className="action-btn edit" title="تعديل">
                          <PencilIcon />
                        </button>
                        <button className="action-btn delete" title="حذف">
                          <TrashIcon />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="pagination-container">
              <button
                className="pagination-btn"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                <ChevronRightIcon />
              </button>

              <div className="page-numbers">
                {[...Array(pagination.totalPages)].map((_, index) => (
                  <button
                    key={index + 1}
                    className={`page-number ${pagination.page === index + 1 ? 'active' : ''}`}
                    onClick={() => handlePageChange(index + 1)}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>

              <button
                className="pagination-btn"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
              >
                <ChevronLeftIcon />
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default TwoSectionMembers;