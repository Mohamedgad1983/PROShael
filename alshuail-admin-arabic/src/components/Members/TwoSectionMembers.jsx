import React, { useState, useEffect, useCallback, useRef } from 'react';
import { memberService } from '../../services/memberService';
import PremiumRegistration from '../Registration/PremiumRegistration';
import CompactAddMember from './CompactAddMember';
import ArabicSelect from './ArabicSelect';
import HijriDateInput from './HijriDateInput';
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
  const [activeEditTab, setActiveEditTab] = useState('personal'); // 'personal', 'address', 'account'
  const searchTimeoutRef = useRef(null);
  const [filters, setFilters] = useState({
    status: '',
    profile_completed: '',
    social_security_beneficiary: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50, // Increased to 50 for better performance
    total: 0,
    totalPages: 0
  });
  const [initialLoad, setInitialLoad] = useState(true); // Track initial load
  const membersCache = useRef(new Map()); // Cache for loaded pages
  const [isSearching, setIsSearching] = useState(false); // Track search state

  // Get current user role
  const getUserRole = () => {
    // First try to get from localStorage
    let role = localStorage.getItem('userRole');

    // Also check if user data is stored
    const userData = localStorage.getItem('user');
    if (!role && userData) {
      try {
        const user = JSON.parse(userData);
        role = user.role;
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }

    console.log('Current user role:', role);
    return role || 'viewer';
  };

  // Check if user can edit - TEMPORARILY ALLOW ALL USERS FOR TESTING
  const canEdit = () => {
    // TEMPORARY: Allow all users to see the buttons for testing
    return true;

    // Original code - uncomment after testing:
    // const role = getUserRole();
    // return role === 'super_admin' || role === 'admin';
  };

  // Load members only on initial mount
  useEffect(() => {
    loadMembers(false, true);
  }, []);

  // Load members when filters change (NOT search or pagination)
  useEffect(() => {
    if (!initialLoad) {
      // Reset to page 1 and load when filters change
      setPagination(prev => ({ ...prev, page: 1 }));
      loadMembers();
    }
  }, [filters]);

  // Load members when limit changes
  useEffect(() => {
    if (!initialLoad) {
      loadMembers();
    }
  }, [pagination.limit]);

  // Debounced search - only search after user stops typing for 300ms
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!initialLoad) {
      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(() => {
        loadMembers(false, false, true);
      }, 300); // Reduced to 300ms for faster response
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const loadMembers = async (isPagination = false, isInitial = false, isSearch = false) => {
    console.log('🔍 Loading members...');
    console.log('API Base URL:', memberService.baseURL);
    console.log('Auth Token:', localStorage.getItem('token') ? 'Present' : 'Missing');
    console.log('User Role:', getUserRole());

    // Check cache first - include limit in cache key
    const cacheKey = `${pagination.page}-${pagination.limit}-${searchQuery}-${JSON.stringify(filters)}`;
    if (!isInitial && !isSearch && membersCache.current.has(cacheKey)) {
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

    // Only show loading on initial load or when specifically requested
    if (isInitial) {
      setLoading(true);
    }

    // Mark initial load as complete
    if (isInitial) {
      setInitialLoad(false);
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

      // Keep only last 10 pages in cache for better performance
      if (membersCache.current.size > 10) {
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
      setIsSearching(false);
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
    // Don't clear members to avoid flashing
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
    // Detect country code from phone number
    let detectedCountryCode = '966'; // Default Saudi
    let phoneWithoutCode = member.phone || '';

    if (phoneWithoutCode.startsWith('965')) {
      detectedCountryCode = '965'; // Kuwait
      phoneWithoutCode = phoneWithoutCode.substring(3);
    } else if (phoneWithoutCode.startsWith('966')) {
      detectedCountryCode = '966'; // Saudi
      phoneWithoutCode = phoneWithoutCode.substring(3);
    } else if (phoneWithoutCode.startsWith('0')) {
      // Saudi format with leading 0
      detectedCountryCode = '966';
      // Keep the 0 for display
    }

    console.log('🌍 Detected country code:', detectedCountryCode, 'from phone:', member.phone);

    // Ensure all fields are properly populated with empty strings for form inputs
    const memberToEdit = {
      ...member,
      // Convert null to empty string for form compatibility
      gender: member.gender || '',
      tribal_section: member.tribal_section || '',
      national_id: member.national_id || '',
      date_of_birth: member.date_of_birth || '',
      city: member.city || '',
      address: member.address || '',
      occupation: member.occupation || '',
      employer: member.employer || '',
      nationality: member.nationality || 'سعودي',
      notes: member.notes || '',
      email: member.email || '',
      phone: phoneWithoutCode,
      countryCode: detectedCountryCode,
      full_name: member.full_name || ''
    };
    console.log('🖊️ Opening edit modal with member:', memberToEdit);
    console.log('Gender value:', memberToEdit.gender);
    console.log('Tribal section value:', memberToEdit.tribal_section);
    setEditingMember(memberToEdit);
    setActiveEditTab('personal'); // Reset to personal tab when opening
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingMember(null);
  };

  const handleEditChange = (field, value) => {
    console.log(`📝 Field changed: ${field} = ${value}`);
    setEditingMember(prev => {
      const updated = {
        ...prev,
        [field]: value
      };
      console.log('Updated member state:', updated);
      return updated;
    });
  };

  // Simple logging for debugging select values
  useEffect(() => {
    if (editingMember && showEditModal) {
      console.log('🔍 Edit modal opened with member data:', {
        id: editingMember.id,
        name: editingMember.full_name,
        gender: editingMember.gender,
        tribal_section: editingMember.tribal_section
      });
    }
  }, [editingMember, showEditModal]);

  const handleSaveEdit = async () => {
    try {
      setLoading(true);

      // Log the current state of editingMember to debug
      console.log('🔍 Current editingMember state:', editingMember);

      // Combine country code with phone number
      const countryCode = editingMember.countryCode || '966';
      let phoneWithCountry = editingMember.phone || '';

      // If phone doesn't start with country code, add it
      if (phoneWithCountry && !phoneWithCountry.startsWith(countryCode)) {
        // Remove leading 0 if present
        phoneWithCountry = phoneWithCountry.replace(/^0/, '');
        // Add country code
        phoneWithCountry = countryCode + phoneWithCountry;
      }

      console.log('📞 Phone before save:', editingMember.phone);
      console.log('🌍 Country code:', countryCode);
      console.log('📞 Phone with country:', phoneWithCountry);

      // Prepare the update data with all fields - using the exact values from editingMember
      const updateData = {
        full_name: editingMember.full_name,
        phone: phoneWithCountry,
        email: editingMember.email,
        national_id: editingMember.national_id,
        tribal_section: editingMember.tribal_section,
        date_of_birth: editingMember.date_of_birth,
        gender: editingMember.gender,
        nationality: editingMember.nationality || 'سعودي',
        // Address fields (removed district as it doesn't exist in DB)
        city: editingMember.city,
        address: editingMember.address,
        employer: editingMember.employer,
        occupation: editingMember.occupation,
        // Account fields
        membership_number: editingMember.membership_number,
        membership_status: editingMember.membership_status || 'active',
        membership_date: editingMember.membership_date,
        membership_type: editingMember.membership_type || 'regular',
        notes: editingMember.notes
      };

      // Simple data cleaning - REMOVE empty date fields completely
      const cleanedData = {};
      Object.keys(updateData).forEach(key => {
        const value = updateData[key];

        // For date fields, don't include them if they're empty
        if (key === 'date_of_birth' || key === 'membership_date') {
          if (value && value !== '') {
            cleanedData[key] = value;
          }
          // Don't add the field at all if it's empty
        } else {
          // For other fields, convert null/undefined to empty string
          cleanedData[key] = value === undefined || value === null ? '' : value;
        }
      });

      console.log('📤 Sending data to backend:', JSON.stringify(cleanedData, null, 2));

      const response = await memberService.updateMember(editingMember.id, cleanedData);

      console.log('📥 Update response from backend:', response);

      if (response.success) {
        console.log('✅ Update successful! Response data:', response.data);

        // Update the local state with the response data
        const updatedMembers = members.map(member =>
          member.id === editingMember.id ? { ...member, ...response.data } : member
        );
        setMembers(updatedMembers);

        alert('تم تحديث بيانات العضو بنجاح');
        setShowEditModal(false);
        setEditingMember(null);
        setActiveEditTab('personal'); // Reset to personal tab

        // Wait a moment for database to commit, then reload
        await new Promise(resolve => setTimeout(resolve, 500));
        await loadMembers();

        console.log('✅ Data reloaded after update');
      } else {
        throw new Error(response.error || 'Failed to update member');
      }
    } catch (error) {
      console.error('❌ Error updating member:', error);
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
                  <div className="filter-item form-group">
                    <label className="form-label">
                      <span className="label-icon">📊</span>
                      <span>الحالة:</span>
                    </label>
                    <div className="select-wrapper">
                      <select
                        className="enhanced-dropdown"
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                      >
                        <option value="">الكل</option>
                        <option value="active">نشط</option>
                        <option value="inactive">غير نشط</option>
                      </select>
                      <span className="select-arrow">▼</span>
                    </div>
                  </div>
                  <div className="filter-item form-group">
                    <label className="form-label">
                      <span className="label-icon">📋</span>
                      <span>اكتمال الملف:</span>
                    </label>
                    <div className="select-wrapper">
                      <select
                        className="enhanced-dropdown"
                        value={filters.profile_completed}
                        onChange={(e) => handleFilterChange('profile_completed', e.target.value)}
                      >
                        <option value="">الكل</option>
                        <option value="true">مكتمل</option>
                        <option value="false">غير مكتمل</option>
                      </select>
                      <span className="select-arrow">▼</span>
                    </div>
                  </div>
                  <div className="filter-item form-group">
                    <label className="form-label">
                      <span className="label-icon">🏛️</span>
                      <span>الضمان الاجتماعي:</span>
                    </label>
                    <div className="select-wrapper">
                      <select
                        className="enhanced-dropdown"
                        value={filters.social_security_beneficiary}
                        onChange={(e) => handleFilterChange('social_security_beneficiary', e.target.value)}
                      >
                        <option value="">الكل</option>
                        <option value="true">مستفيد</option>
                        <option value="false">غير مستفيد</option>
                      </select>
                      <span className="select-arrow">▼</span>
                    </div>
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
              <label htmlFor="pageSize" className="form-label" style={{ fontSize: '14px', marginBottom: 0 }}>
                <span className="label-icon">📄</span>
                <span>عرض:</span>
              </label>
              <div className="select-wrapper" style={{ minWidth: '80px' }}>
                <select
                  id="pageSize"
                  className="enhanced-dropdown"
                  value={pagination.limit}
                  onChange={(e) => handlePageSizeChange(e.target.value)}
                  style={{ padding: '8px 35px 8px 12px', fontSize: '14px' }}
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
                <span className="select-arrow">▼</span>
              </div>
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
                    <th>الجنس</th>
                    <th>الفخذ</th>
                    <th>الحالة</th>
                    <th>اكتمال الملف</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Show skeleton during initial load only */}
                  {loading && members.length === 0 && (
                    [...Array(5)].map((_, i) => (
                      <tr key={`skeleton-${i}`} className="table-row skeleton-row">
                        <td><div className="skeleton skeleton-text"></div></td>
                        <td><div className="skeleton skeleton-text"></div></td>
                        <td><div className="skeleton skeleton-text"></div></td>
                        <td><div className="skeleton skeleton-text"></div></td>
                        <td><div className="skeleton skeleton-text"></div></td>
                        <td><div className="skeleton skeleton-badge"></div></td>
                        <td><div className="skeleton skeleton-badge"></div></td>
                        <td><div className="skeleton skeleton-actions"></div></td>
                      </tr>
                    ))
                  )}

                  {/* Show empty state when no data */}
                  {!loading && members.length === 0 && (
                    <tr>
                      <td colSpan="8" className="empty-cell">
                        <div className="empty-state">
                          <span>لا توجد بيانات</span>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Show members */}
                  {members.map(member => (
                    <tr key={member.id} className="table-row">
                      <td className="member-name">{member.full_name}</td>
                      <td className="member-phone">{member.phone}</td>
                      <td className="member-email">{member.email || '-'}</td>
                      <td className="member-gender">{member.gender === 'male' ? 'ذكر' : member.gender === 'female' ? 'أنثى' : '-'}</td>
                      <td className="member-tribal">{member.tribal_section || '-'}</td>
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
                        {canEdit() ? (
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
                        ) : (
                          <span className="no-permission-text" title={`الدور الحالي: ${getUserRole()}`}>
                            (عرض فقط - {getUserRole()})
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

      {/* Edit Member Modal - Full Page */}
      {showEditModal && editingMember && (
        <div className="edit-member-fullpage" dir="rtl">
            <div className="modal-header">
              <h2>تعديل بيانات العضو</h2>
              <button className="close-btn" onClick={handleCloseEditModal}>
                <XMarkIcon style={{ width: '24px', height: '24px' }} />
              </button>
            </div>

            <div className="modal-body">
              {/* Section Headers */}
              <div className="section-tabs">
                <div
                  className={`tab ${activeEditTab === 'personal' ? 'active' : ''}`}
                  onClick={() => setActiveEditTab('personal')}
                >
                  المعلومات الشخصية
                </div>
                <div
                  className={`tab ${activeEditTab === 'address' ? 'active' : ''}`}
                  onClick={() => setActiveEditTab('address')}
                >
                  العنوان والعمل
                </div>
                <div
                  className={`tab ${activeEditTab === 'account' ? 'active' : ''}`}
                  onClick={() => setActiveEditTab('account')}
                >
                  معلومات الحساب
                </div>
              </div>

              <div className="form-sections">
                {/* Personal Information Section */}
                {activeEditTab === 'personal' && (
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

                    <div className="form-group" style={{ width: '100%' }}>
                      <label style={{ marginBottom: '8px', display: 'block' }}>رقم الهاتف *</label>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 180px',
                        gap: '12px',
                        width: '100%',
                        direction: 'rtl'
                      }}>
                        <input
                          type="tel"
                          value={editingMember.phone || ''}
                          onChange={(e) => handleEditChange('phone', e.target.value)}
                          placeholder={(editingMember.countryCode || '966') === '966' ? '5XXXXXXXX' : 'XXXXXXXX'}
                          dir="ltr"
                          style={{
                            padding: '12px 16px',
                            fontSize: '16px',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            letterSpacing: '1px',
                            height: '48px'
                          }}
                        />
                        <div className="select-wrapper">
                          <select
                            className="enhanced-dropdown"
                            value={editingMember.countryCode || '966'}
                            onChange={(e) => handleEditChange('countryCode', e.target.value)}
                            style={{
                              padding: '12px 40px 12px 16px',
                              fontSize: '15px',
                              fontWeight: '500',
                              height: '48px'
                            }}
                          >
                            <option value="966">🇸🇦 السعودية +966</option>
                            <option value="965">🇰🇼 الكويت +965</option>
                          </select>
                          <span className="select-arrow">▼</span>
                        </div>
                      </div>
                      <small style={{
                        color: '#6b7280',
                        fontSize: '13px',
                        marginTop: '8px',
                        display: 'block',
                        textAlign: 'right'
                      }}>
                        {(editingMember.countryCode || '966') === '966'
                          ? '💡 رقم سعودي: 9 أرقام تبدأ بـ 5 (مثال: 501234567)'
                          : '💡 رقم كويتي: 8 أرقام (مثال: 12345678)'}
                      </small>
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

                    <ArabicSelect
                      label="الفخذ"
                      id="tribal_section"
                      name="tribal_section"
                      value={editingMember?.tribal_section || ''}
                      onChange={(e) => {
                        console.log('Tribal section changed to:', e.target.value);
                        handleEditChange('tribal_section', e.target.value);
                      }}
                      placeholder="اختر الفخذ"
                      options={[
                        { value: 'الدغيش', label: 'الدغيش' },
                        { value: 'الرشيد', label: 'الرشيد' },
                        { value: 'الشبيعان', label: 'الشبيعان' },
                        { value: 'العيد', label: 'العيد' },
                        { value: 'المسعود', label: 'المسعود' },
                        { value: 'رشود', label: 'رشود' },
                        { value: 'رشيد', label: 'رشيد' },
                        { value: 'عقاب', label: 'عقاب' }
                      ]}
                    />

                    <ArabicSelect
                      label="الجنس"
                      id="gender"
                      name="gender"
                      value={editingMember?.gender || ''}
                      onChange={(e) => {
                        console.log('Gender changed to:', e.target.value);
                        handleEditChange('gender', e.target.value);
                      }}
                      placeholder="اختر الجنس"
                      options={[
                        { value: 'male', label: 'ذكر' },
                        { value: 'female', label: 'أنثى' }
                      ]}
                    />

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

                  {/* Date of Birth with Hijri Support */}
                  <HijriDateInput
                    label="تاريخ الميلاد"
                    value={editingMember.date_of_birth || ''}
                    onChange={(date) => handleEditChange('date_of_birth', date)}
                  />
                </div>
                )}

                {/* Address and Work Section */}
                {activeEditTab === 'address' && (
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
                )}

                {/* Account Information Section */}
                {activeEditTab === 'account' && (
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

                    {/* Join Date with Hijri Support - Full Width */}
                    <div className="form-group full-width">
                      <HijriDateInput
                        label="تاريخ الانضمام"
                        value={editingMember.membership_date || ''}
                        onChange={(date) => handleEditChange('membership_date', date)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        <span className="label-icon">📊</span>
                        <span>حالة العضوية</span>
                      </label>
                      <div className="select-wrapper">
                        <select
                          value={editingMember.membership_status || 'active'}
                          onChange={(e) => handleEditChange('membership_status', e.target.value)}
                          className="form-input enhanced-dropdown"
                          id="membership_status"
                        >
                          <option value="active">✅ نشط</option>
                          <option value="inactive">❌ غير نشط</option>
                          <option value="suspended">⏸️ معلق</option>
                        </select>
                        <span className="select-arrow">▼</span>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        <span className="label-icon">⭐</span>
                        <span>نوع العضوية</span>
                      </label>
                      <div className="select-wrapper">
                        <select
                          value={editingMember.membership_type || 'regular'}
                          onChange={(e) => handleEditChange('membership_type', e.target.value)}
                          className="form-input enhanced-dropdown"
                          id="membership_type"
                        >
                          <option value="regular">⭐ عادي</option>
                          <option value="vip">💎 VIP</option>
                          <option value="honorary">🏆 شرفي</option>
                        </select>
                        <span className="select-arrow">▼</span>
                      </div>
                    </div>
                  </div>
                </div>
                )}

                {/* Additional Information - Show with Account tab */}
                {activeEditTab === 'account' && (
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
                              console.log('Member photo selected:', file);
                              handleEditChange('photo_file', file);
                            }
                          }}
                          className="file-input"
                          id="member-photo"
                        />
                        <label htmlFor="member-photo" className="file-upload-label">
                          <span>📸 اضغط لرفع صورة العضو</span>
                          <span className="file-info">PNG, JPG حد أقصى 10MB</span>
                        </label>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>صورة الهوية الوطنية</label>
                      <div className="file-upload-area">
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => {
                            // Handle file upload
                            const file = e.target.files[0];
                            if (file) {
                              console.log('National ID selected:', file);
                              handleEditChange('national_id_file', file);
                            }
                          }}
                          className="file-input"
                          id="national-id"
                        />
                        <label htmlFor="national-id" className="file-upload-label">
                          <span>🆔 اضغط لرفع صورة الهوية الوطنية</span>
                          <span className="file-info">PNG, JPG, PDF حد أقصى 10MB</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                )}
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
      )}

    </div>
  );
};

// Phase 4: Performance Optimization - Memoize to prevent unnecessary re-renders
export default React.memo(TwoSectionMembers);