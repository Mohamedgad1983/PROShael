import React, { useState, useEffect, useCallback, useRef } from 'react';
import { memberService } from '../../services/memberService';
import PremiumRegistration from '../Registration/PremiumRegistration';
import CompactAddMember from './CompactAddMember';
import './TwoSectionMembers.css';
import {
  MagnifyingGlassIcon,
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const searchTimeoutRef = useRef(null);
  const [filters, setFilters] = useState({
    status: '',
    profile_completed: '',
    social_security_beneficiary: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25, // Increased from 10 to 25 for better performance
    total: 0,
    totalPages: 0
  });
  const [paginationLoading, setPaginationLoading] = useState(false); // Separate loading state for pagination
  const membersCache = useRef(new Map()); // Cache for loaded pages

  // Get current user role
  const getUserRole = () => {
    const role = localStorage.getItem('userRole') || 'admin';
    return role;
  };

  // Check if user can edit (only super_admin)
  const canEdit = () => {
    const role = getUserRole();
    return role === 'super_admin';
  };

  // Load members when component mounts or filters change (NOT search or pagination)
  useEffect(() => {
    // Reset to page 1 and load when filters change
    setPagination(prev => ({ ...prev, page: 1 }));
    loadMembers();
  }, [filters]);

  // Load members on mount and when limit changes
  useEffect(() => {
    loadMembers();
  }, [pagination.limit]);

  // Debounced search - only search after user stops typing for 500ms
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (searchQuery !== '') {
        loadMembers();
      } else if (searchQuery === '') {
        // Load all members when search is cleared
        loadMembers();
      }
    }, 500); // Wait 500ms after user stops typing

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const loadMembers = async (isPagination = false) => {
    console.log('🔍 Loading members...');
    console.log('API Base URL:', memberService.baseURL);
    console.log('Auth Token:', localStorage.getItem('token') ? 'Present' : 'Missing');
    console.log('User Role:', getUserRole());

    // Check cache first for pagination - include limit in cache key
    const cacheKey = `${pagination.page}-${pagination.limit}-${searchQuery}-${JSON.stringify(filters)}`;
    if (isPagination && membersCache.current.has(cacheKey)) {
      console.log('✅ Using cached data for page', pagination.page);
      const cachedData = membersCache.current.get(cacheKey);
      setMembers(cachedData.members);
      setPagination(prev => ({
        ...prev,
        total: cachedData.total,
        totalPages: cachedData.totalPages
      }));
      return;
    }

    // Use different loading state for pagination
    if (isPagination) {
      setPaginationLoading(true);
    } else {
      setLoading(true);
    }
    try {
      // Only include non-empty filters
      const searchFilters = {};

      // Add search query if present
      if (searchQuery.trim()) {
        searchFilters.search = searchQuery.trim();
      }

      // Only add filter values that are not empty strings
      if (filters.status) {
        searchFilters.status = filters.status;
      }
      if (filters.profile_completed) {
        searchFilters.profile_completed = filters.profile_completed;
      }
      if (filters.social_security_beneficiary) {
        searchFilters.social_security_beneficiary = filters.social_security_beneficiary;
      }

      console.log('📤 Sending request with filters:', searchFilters);
      console.log('Page:', pagination.page, 'Limit:', pagination.limit);

      const response = await memberService.getMembersList(
        searchFilters,
        pagination.page,
        pagination.limit
      );

      console.log('✅ API Response received:', response);

      // Handle API response format: { success, data, pagination }
      const membersData = response.data || response.members || [];
      const paginationData = response.pagination || {};

      console.log('✅ Members count:', membersData.length);
      console.log('✅ Total members:', paginationData.total || response.total);

      setMembers(membersData);
      setPagination(prev => ({
        ...prev,
        total: paginationData.total || response.total || 0,
        totalPages: paginationData.pages || response.totalPages || 0
      }));

      // Cache the data for this page
      membersCache.current.set(cacheKey, {
        members: membersData,
        total: paginationData.total || response.total || 0,
        totalPages: paginationData.pages || response.totalPages || 0
      });

      // Keep only last 5 pages in cache to avoid memory issues
      if (membersCache.current.size > 5) {
        const firstKey = membersCache.current.keys().next().value;
        membersCache.current.delete(firstKey);
      }
    } catch (error) {
      console.error('❌ API Error:', error);
      console.error('❌ Error details:', error.message);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Full error object:', JSON.stringify(error, null, 2));

      // Show error message to user instead of silently falling back
      alert(`خطأ في تحميل البيانات: ${error.message}\n\nتحقق من:\n1. الخادم يعمل على المنفذ 5001\n2. الاتصال بقاعدة البيانات`);

      console.log('⚠️ Setting empty members array due to error');
      setMembers([]);
      setPagination(prev => ({
        ...prev,
        total: 0,
        totalPages: 0
      }));
    } finally {
      setLoading(false);
      setPaginationLoading(false);
      console.log('✅ Loading complete');
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
    // Clear current members to show loading state
    setMembers([]);
    // Clear cache when page changes to ensure fresh data
    membersCache.current.clear();
    // Trigger load with pagination flag
    loadMembers(true);
  };

  const handlePageSizeChange = (newSize) => {
    const newLimit = parseInt(newSize);
    console.log('🔄 Changing page size to:', newLimit);
    // Clear cache when page size changes
    membersCache.current.clear();
    // Update pagination with new limit and reset to page 1
    setPagination(prev => ({
      ...prev,
      limit: newLimit,
      page: 1
    }));
    // The useEffect will trigger loadMembers when limit changes
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

  const handleEditClick = (member) => {
    setEditingMember({ ...member });
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingMember(null);
  };

  const handleEditChange = (field, value) => {
    setEditingMember(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveEdit = async () => {
    try {
      setLoading(true);
      await memberService.updateMember(editingMember.id, editingMember);
      alert('تم تحديث بيانات العضو بنجاح');
      setShowEditModal(false);
      setEditingMember(null);
      loadMembers(); // Reload the list
    } catch (error) {
      console.error('Error updating member:', error);
      alert('حدث خطأ في تحديث البيانات: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (memberId) => {
    if (window.confirm('هل أنت متأكد من حذف هذا العضو؟')) {
      try {
        setLoading(true);
        await memberService.deleteMember(memberId);
        alert('تم حذف العضو بنجاح');
        loadMembers(); // Reload the list
      } catch (error) {
        console.error('Error deleting member:', error);
        alert('حدث خطأ في حذف العضو: ' + error.message);
      } finally {
        setLoading(false);
      }
    }
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
          {/* Results Count and Page Size Selector */}
          <div className="results-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <span>عرض {members.length} من {pagination.total} عضو</span>

            {/* Page Size Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label htmlFor="pageSize" style={{ fontSize: '14px' }}>عرض:</label>
              <select
                id="pageSize"
                value={pagination.limit}
                onChange={(e) => handlePageSizeChange(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  backgroundColor: 'white',
                  fontSize: '14px',
                  cursor: 'pointer',
                  minWidth: '80px'
                }}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <span style={{ fontSize: '14px' }}>في الصفحة</span>
            </div>
          </div>

          {/* Members Table */}
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>جاري تحميل البيانات...</p>
            </div>
          ) : members.length === 0 ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              background: '#f8f9fa',
              borderRadius: '12px',
              margin: '20px 0'
            }}>
              <h3 style={{ color: '#666', marginBottom: '20px' }}>⚠️ لا توجد بيانات</h3>
              <p style={{ color: '#999', marginBottom: '20px' }}>
                يرجى التحقق من الاتصال بالخادم ووجود بيانات في قاعدة البيانات
              </p>
              <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '8px',
                textAlign: 'right',
                maxWidth: '600px',
                margin: '0 auto'
              }}>
                <p><strong>معلومات التشخيص:</strong></p>
                <p>API URL: {memberService.baseURL}</p>
                <p>Token: {localStorage.getItem('token') ? '✅ موجود' : '❌ غير موجود'}</p>
                <p>User Role: {getUserRole()}</p>
                <p>Total: {pagination.total}</p>
                <button
                  onClick={loadMembers}
                  style={{
                    marginTop: '15px',
                    padding: '10px 20px',
                    background: '#007AFF',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  🔄 إعادة المحاولة
                </button>
              </div>
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
                        {canEdit() && (
                          <>
                            <button
                              className="action-btn edit"
                              title="تعديل"
                              onClick={() => handleEditClick(member)}
                            >
                              <PencilIcon />
                            </button>
                            <button
                              className="action-btn delete"
                              title="حذف"
                              onClick={() => handleDelete(member.id)}
                            >
                              <TrashIcon />
                            </button>
                          </>
                        )}
                        {!canEdit() && (
                          <span className="no-permission-text" title="صلاحية مطلوبة">
                            (عرض فقط)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="pagination-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  className="pagination-btn"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  <ChevronRightIcon />
                </button>

                <div className="page-numbers">
                  {/* Show max 5 page numbers at a time */}
                  {(() => {
                    const maxPages = 5;
                    let startPage = Math.max(1, pagination.page - Math.floor(maxPages / 2));
                    let endPage = Math.min(pagination.totalPages, startPage + maxPages - 1);

                    if (endPage - startPage + 1 < maxPages) {
                      startPage = Math.max(1, endPage - maxPages + 1);
                    }

                    const pages = [];
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <button
                          key={i}
                          className={`page-number ${pagination.page === i ? 'active' : ''}`}
                          onClick={() => handlePageChange(i)}
                        >
                          {i}
                        </button>
                      );
                    }
                    return pages;
                  })()}
                </div>

                <button
                  className="pagination-btn"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                >
                  <ChevronLeftIcon />
                </button>
              </div>

              {/* Page info */}
              <div style={{ fontSize: '14px', color: '#666' }}>
                الصفحة {pagination.page} من {pagination.totalPages}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Member Modal */}
      {showEditModal && editingMember && (
        <div className="modal-overlay" onClick={handleCloseEditModal}>
          <div className="modal-content edit-member-modal" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="modal-header">
              <h2>تعديل بيانات العضو</h2>
              <button className="close-btn" onClick={handleCloseEditModal}>
                <XMarkIcon style={{ width: '24px', height: '24px' }} />
              </button>
            </div>

            <div className="modal-body">
              {/* Section Headers */}
              <div className="section-tabs">
                <div className="tab active">المعلومات الشخصية</div>
                <div className="tab">العنوان والعمل</div>
                <div className="tab">معلومات الحساب</div>
              </div>

              <div className="form-sections">
                {/* Personal Information Section */}
                <div className="form-section">
                  <h3 className="section-title">المعلومات الشخصية</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>الاسم الكامل *</label>
                      <input
                        type="text"
                        value={editingMember.full_name || ''}
                        onChange={(e) => handleEditChange('full_name', e.target.value)}
                        className="form-input"
                        placeholder="أدخل الاسم الكامل"
                      />
                    </div>

                    <div className="form-group">
                      <label>رقم الهاتف *</label>
                      <input
                        type="text"
                        value={editingMember.phone || ''}
                        onChange={(e) => handleEditChange('phone', e.target.value)}
                        className="form-input"
                        placeholder="05xxxxxxxx"
                      />
                    </div>

                    <div className="form-group">
                      <label>البريد الإلكتروني</label>
                      <input
                        type="email"
                        value={editingMember.email || ''}
                        onChange={(e) => handleEditChange('email', e.target.value)}
                        className="form-input"
                        placeholder="example@email.com"
                      />
                    </div>

                    <div className="form-group">
                      <label>الفخذ</label>
                      <select
                        value={editingMember.tribal_section || ''}
                        onChange={(e) => handleEditChange('tribal_section', e.target.value)}
                        className="form-input"
                      >
                        <option value="">اختر الفخذ</option>
                        <option value="الشمالي">الشمالي</option>
                        <option value="الجنوبي">الجنوبي</option>
                        <option value="الشرقي">الشرقي</option>
                        <option value="الغربي">الغربي</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>تاريخ الميلاد</label>
                      <input
                        type="date"
                        value={editingMember.date_of_birth || ''}
                        onChange={(e) => handleEditChange('date_of_birth', e.target.value)}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label>الجنس</label>
                      <select
                        value={editingMember.gender || ''}
                        onChange={(e) => handleEditChange('gender', e.target.value)}
                        className="form-input"
                      >
                        <option value="">اختر</option>
                        <option value="male">ذكر</option>
                        <option value="female">أنثى</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>رقم الهوية الوطنية</label>
                      <input
                        type="text"
                        value={editingMember.national_id || ''}
                        onChange={(e) => handleEditChange('national_id', e.target.value)}
                        className="form-input"
                        placeholder="10xxxxxxxxx"
                      />
                    </div>

                    <div className="form-group">
                      <label>الجنسية</label>
                      <input
                        type="text"
                        value={editingMember.nationality || 'سعودي'}
                        onChange={(e) => handleEditChange('nationality', e.target.value)}
                        className="form-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Address and Work Section */}
                <div className="form-section">
                  <h3 className="section-title">العنوان والعمل</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>المدينة</label>
                      <input
                        type="text"
                        value={editingMember.city || ''}
                        onChange={(e) => handleEditChange('city', e.target.value)}
                        className="form-input"
                        placeholder="المدينة"
                      />
                    </div>

                    <div className="form-group">
                      <label>الحي</label>
                      <input
                        type="text"
                        value={editingMember.district || ''}
                        onChange={(e) => handleEditChange('district', e.target.value)}
                        className="form-input"
                        placeholder="الحي"
                      />
                    </div>

                    <div className="form-group full-width">
                      <label>العنوان الكامل</label>
                      <input
                        type="text"
                        value={editingMember.address || ''}
                        onChange={(e) => handleEditChange('address', e.target.value)}
                        className="form-input"
                        placeholder="العنوان بالتفصيل"
                      />
                    </div>

                    <div className="form-group">
                      <label>جهة العمل</label>
                      <input
                        type="text"
                        value={editingMember.employer || ''}
                        onChange={(e) => handleEditChange('employer', e.target.value)}
                        className="form-input"
                        placeholder="اسم جهة العمل"
                      />
                    </div>

                    <div className="form-group">
                      <label>المهنة</label>
                      <input
                        type="text"
                        value={editingMember.occupation || ''}
                        onChange={(e) => handleEditChange('occupation', e.target.value)}
                        className="form-input"
                        placeholder="المسمى الوظيفي"
                      />
                    </div>
                  </div>
                </div>

                {/* Account Information Section */}
                <div className="form-section">
                  <h3 className="section-title">معلومات الحساب</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>رقم العضوية</label>
                      <input
                        type="text"
                        value={editingMember.membership_number || ''}
                        onChange={(e) => handleEditChange('membership_number', e.target.value)}
                        className="form-input"
                        placeholder="سيتم توليده تلقائياً"
                      />
                    </div>

                    <div className="form-group">
                      <label>حالة العضوية</label>
                      <select
                        value={editingMember.membership_status || 'active'}
                        onChange={(e) => handleEditChange('membership_status', e.target.value)}
                        className="form-input"
                      >
                        <option value="active">نشط</option>
                        <option value="inactive">غير نشط</option>
                        <option value="suspended">معلق</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>تاريخ الانضمام</label>
                      <input
                        type="date"
                        value={editingMember.membership_date || ''}
                        onChange={(e) => handleEditChange('membership_date', e.target.value)}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label>نوع العضوية</label>
                      <select
                        value={editingMember.membership_type || 'regular'}
                        onChange={(e) => handleEditChange('membership_type', e.target.value)}
                        className="form-input"
                      >
                        <option value="regular">عادي</option>
                        <option value="vip">VIP</option>
                        <option value="honorary">شرفي</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="form-section">
                  <h3 className="section-title">معلومات إضافية</h3>
                  <div className="form-grid">
                    <div className="form-group full-width">
                      <label>ملاحظات</label>
                      <textarea
                        value={editingMember.notes || ''}
                        onChange={(e) => handleEditChange('notes', e.target.value)}
                        className="form-input"
                        rows="3"
                        placeholder="أي ملاحظات إضافية..."
                      />
                    </div>

                    <div className="form-group">
                      <label>صورة العضو</label>
                      <div className="file-upload-area">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            // Handle file upload
                            const file = e.target.files[0];
                            if (file) {
                              // You can handle file upload here
                              console.log('File selected:', file);
                            }
                          }}
                          className="file-input"
                          id="member-photo"
                        />
                        <label htmlFor="member-photo" className="file-upload-label">
                          <span>اضغط لرفع صورة العضو</span>
                          <span className="file-info">PNG, JPG حد أقصى 10MB</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={handleCloseEditModal}>
                إلغاء
              </button>
              <button className="btn-save" onClick={handleSaveEdit}>
                <span>💾</span> حفظ التغييرات
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TwoSectionMembers;