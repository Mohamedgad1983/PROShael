import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { logger } from '../../utils/logger';

import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  BellIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  ArrowDownTrayIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
import './MemberMonitoringDashboard.css';

const MemberMonitoringDashboard = () => {
  // State Management with Performance Optimizations
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Cache ref to store fetched data
  const membersCache = useRef(null);
  const lastFetchTime = useRef(null);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

  // Filter States with debouncing
  const [searchMemberId, setSearchMemberId] = useState('');
  const [searchName, setSearchName] = useState('');
  const [searchPhone, setSearchPhone] = useState('');

  // Debounced search values for performance
  const [debouncedSearchMemberId, setDebouncedSearchMemberId] = useState('');
  const [debouncedSearchName, setDebouncedSearchName] = useState('');
  const [debouncedSearchPhone, setDebouncedSearchPhone] = useState('');
  const [selectedTribalSection, setSelectedTribalSection] = useState('all');

  // Balance Filter States
  const [balanceFilterType, setBalanceFilterType] = useState('all'); // all, comparison, range, category
  const [balanceComparison, setBalanceComparison] = useState('greater'); // greater, less, equal
  const [balanceComparisonAmount, setBalanceComparisonAmount] = useState('');
  const [balanceRangeFrom, setBalanceRangeFrom] = useState('');
  const [balanceRangeTo, setBalanceRangeTo] = useState('');
  const [balanceCategory, setBalanceCategory] = useState('all'); // all, compliant, non-compliant, critical, excellent
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50); // Increased to 50 for better performance

  // Modal States
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [suspendConfirmStep, setSuspendConfirmStep] = useState(1);

  // API Configuration - Use environment variable or fallback to production
  const API_URL = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://api.alshailfund.com');

  // Tribal Sections (الفخذ)
  const tribalSections = [
    { value: 'all', label: 'جميع الفخوذ' },
    { value: 'رشود', label: 'رشود' },
    { value: 'الدغيش', label: 'الدغيش' },
    { value: 'رشيد', label: 'رشيد' },
    { value: 'العيد', label: 'العيد' },
    { value: 'الرشيد', label: 'الرشيد' },
    { value: 'الشبيعان', label: 'الشبيعان' },
    { value: 'المسعود', label: 'المسعود' },
    { value: 'عقاب', label: 'عقاب' }
  ];

  // Fetch Members Data with Caching and Comprehensive Error Handling
  const fetchMembers = async (forceRefresh = false) => {
    try {
      // Check cache first
      if (!forceRefresh && membersCache.current && lastFetchTime.current) {
        const timeSinceLastFetch = Date.now() - lastFetchTime.current;
        if (timeSinceLastFetch < CACHE_DURATION) {
          logger.debug('✅ Using cached data');
          setMembers(membersCache.current);
          setInitialLoadComplete(true);
          setLoading(false);
          return;
        }
      }

      // Only show loading on initial load or force refresh
      if (!initialLoadComplete || forceRefresh) {
        setLoading(true);
      }
      setError(null);

      // Prepare headers with optional authentication
      const headers = {
        'Content-Type': 'application/json'
      };

      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Try member-monitoring endpoint first with pagination
      // Request all members at once for better client-side filtering and performance
      let response = await fetch(`${API_URL}/api/member-monitoring?limit=500&page=1`, {
        headers,
        mode: 'cors',
        credentials: 'include'
      });

      let data = null;
      let membersData = [];

      // If member-monitoring fails, try regular members endpoint
      if (!response.ok && response.status === 404) {
        logger.debug('⚠️ Trying fallback members endpoint...');
        response = await fetch(`${API_URL}/api/members?limit=500&page=1`, {
          headers,
          mode: 'cors',
          credentials: 'include'
        });
      }

      // Check if response is ok
      if (!response.ok) {
        const errorText = await response.text();
        logger.error('❌ API Error:', { status: response.status, errorText });
        throw new Error(`API Error: ${response.status}`);
      }

      // Parse response safely
      try {
        data = await response.json();
        logger.debug('✅ API Response received:', {
          hasData: !!data,
          hasDataProp: !!(data && data.data);,
          hasMembers: !!(data && data.members),
          isArray: Array.isArray(data)
        });
      } catch (parseErr) {
        logger.error('❌ Failed to parse response:', { parseErr });
        throw new Error('Invalid response format from server');
      }

      // Extract members data with comprehensive checks
      if (data) {
        if (data.success === true && data.data) {
          // Standard successful response
          if (data.data.members && Array.isArray(data.data.members)) {
            membersData = data.data.members;
            logger.debug('✅ Found members in data.data.members');
          } else if (Array.isArray(data.data)) {
            membersData = data.data;
            logger.debug('✅ Found members in data.data array');
          }
        } else if (data.members && Array.isArray(data.members)) {
          // Direct members property
          membersData = data.members;
          logger.debug('✅ Found members in data.members');
        } else if (data.data && Array.isArray(data.data)) {
          // Data array directly
          membersData = data.data;
          logger.debug('✅ Found members in data.data');
        } else if (Array.isArray(data)) {
          // Response is array directly
          membersData = data;
          logger.debug('✅ Found members as direct array');
        }
      }

      // Validate we have array data
      if (!Array.isArray(membersData)) {
        logger.error('❌ Members data is not an array:', { membersData });
        membersData = []; // Set to empty array to prevent crash
      }

      logger.debug(`📊 Processing ${membersData.length} members...`);

      // Map the backend data to frontend format with safety checks
      const formattedMembers = membersData.map(m => {
        // Ensure m is an object
        if (!m || typeof m !== 'object') {
          logger.warn('⚠️ Invalid member object:', { m });
          return null;
        }

        return {
          id: m.id || `temp-${Date.now()}-${Math.random()}`,
          memberId: m.membership_number || m.memberId || m.membershipNumber || 'N/A',
          name: m.full_name || m.fullName || m.name || 'غير متوفر',
          phone: m.phone || m.mobile || 'غير متوفر',
          balance: parseFloat(m.total_balance || m.balance || m.totalBalance || 0) || 0,
          tribalSection: m.tribal_section || m.tribalSection || 'غير محدد',
          status: (parseFloat(m.total_balance || m.balance || m.totalBalance || 0) || 0) >= 3000 ? 'sufficient' : 'insufficient',
          isSuspended: m.is_suspended || m.isSuspended || m.membership_status === 'suspended' || false
        };
      }).filter(m => m !== null); // Remove any null entries

      logger.debug('✅ Formatted members:', { length: formattedMembers.length });
      if (formattedMembers.length > 0) {
        logger.debug('✅ Sample member:', {});
      }

      // Cache the data
      membersCache.current = formattedMembers;
      lastFetchTime.current = Date.now();

      setMembers(formattedMembers);
      setInitialLoadComplete(true);
      setError(null);
    } catch (err) {
      logger.error('❌ Error in fetchMembers:', { err });

      // Set user-friendly error message
      setError('حدث خطأ في تحميل بيانات الأعضاء. يرجى المحاولة لاحقاً.');

      // Use mock data in development
      if (process.env.NODE_ENV === 'development') {
        logger.debug('⚠️ Loading mock data for development...');
        loadMockData();
      } else {
        // In production, set empty members to prevent crash
        setMembers([]);
      }
    } finally {
      setLoading(false);
      setInitialLoadComplete(true);
    }
  };

  // Load Mock Data for Development
  const loadMockData = () => {
    const mockMembers = generateMockMembers();
    // Cache mock data as well
    membersCache.current = mockMembers;
    lastFetchTime.current = Date.now();
    setMembers(mockMembers);
    setInitialLoadComplete(true);
  };

  // Generate Mock Members
  const generateMockMembers = () => {
    const names = [
      'أحمد محمد الشعيل', 'فاطمة عبدالله الشعيل', 'محمد سالم الشعيل',
      'نورا خالد الشعيل', 'عبدالرحمن أحمد الشعيل', 'مريم عبدالعزيز الشعيل'
    ];

    const mockData = [];
    for (let i = 1; i <= 288; i++) {
      const balance = Math.random() * 5000;
      mockData.push({
        id: `member-${i}`,
        memberId: `SH-${String(10000 + i)}`,
        name: names[i % names.length],
        phone: `050${String(1000000 + i).padStart(7, '0')}`,
        balance: Math.round(balance),
        tribalSection: tribalSections[1 + (i % 8)].value,
        status: balance >= 3000 ? 'sufficient' : 'insufficient',
        isSuspended: false
      });
    }
    return mockData;
  };

  // Debounce search inputs for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchMemberId(searchMemberId);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchMemberId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchName(searchName);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchName]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchPhone(searchPhone);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchPhone]);

  // Optimized filtering with useMemo and debounced values
  const filteredMembers = useMemo(() => {
    if (!members || members.length === 0) return [];

    let filtered = [...members];

    // Filter by Member ID (using debounced value)
    if (debouncedSearchMemberId) {
      filtered = filtered.filter(m =>
        m.memberId && m.memberId.toLowerCase().includes(debouncedSearchMemberId.toLowerCase())
      );
    }

    // Filter by Name (using debounced value)
    if (debouncedSearchName) {
      filtered = filtered.filter(m =>
        m.name && m.name.includes(debouncedSearchName)
      );
    }

    // Filter by Phone (using debounced value)
    if (debouncedSearchPhone) {
      filtered = filtered.filter(m =>
        m.phone && m.phone.includes(debouncedSearchPhone)
      );
    }

    // Filter by Tribal Section
    if (selectedTribalSection !== 'all') {
      filtered = filtered.filter(m =>
        m.tribalSection === selectedTribalSection
      );
    }

    // Apply Balance Filters
    if (balanceFilterType === 'comparison' && balanceComparisonAmount) {
      const amount = parseFloat(balanceComparisonAmount);
      if (!isNaN(amount)) {
        filtered = filtered.filter(m => {
          switch (balanceComparison) {
            case 'greater':
              return m.balance > amount;
            case 'less':
              return m.balance < amount;
            case 'equal':
              return m.balance === amount;
            default:
              return true;
          }
        });
      }
    } else if (balanceFilterType === 'range' && (balanceRangeFrom || balanceRangeTo)) {
      const from = balanceRangeFrom ? parseFloat(balanceRangeFrom) : -Infinity;
      const to = balanceRangeTo ? parseFloat(balanceRangeTo) : Infinity;
      filtered = filtered.filter(m => m.balance >= from && m.balance <= to);
    } else if (balanceFilterType === 'category' && balanceCategory !== 'all') {
      filtered = filtered.filter(m => {
        switch (balanceCategory) {
          case 'compliant':
            return m.balance >= 3000;
          case 'non-compliant':
            return m.balance < 3000;
          case 'critical':
            return m.balance < 1000;
          case 'excellent':
            return m.balance >= 5000;
          case '0-500':
            return m.balance >= 0 && m.balance <= 500;
          case '500-1000':
            return m.balance > 500 && m.balance <= 1000;
          case '1000-2000':
            return m.balance > 1000 && m.balance <= 2000;
          case '2000-3000':
            return m.balance > 2000 && m.balance < 3000;
          case '3000-5000':
            return m.balance >= 3000 && m.balance < 5000;
          case '5000+':
            return m.balance >= 5000;
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [members, debouncedSearchMemberId, debouncedSearchName, debouncedSearchPhone, selectedTribalSection,
      balanceFilterType, balanceComparison, balanceComparisonAmount,
      balanceRangeFrom, balanceRangeTo, balanceCategory]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredMembers]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredMembers.length / pageSize) || 1;
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedMembers = filteredMembers.slice(startIndex, endIndex);

  // Ensure current page is valid when page size changes
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // Handle Suspend Action
  const handleSuspend = async (member) => {
    setSelectedMember(member);
    setShowSuspendModal(true);
    setSuspendConfirmStep(1);
  };

  const confirmSuspend = async () => {
    if (suspendConfirmStep === 1) {
      setSuspendConfirmStep(2);
      return;
    }

    try {
      // API call to suspend member
      const response = await fetch(`${API_URL}/api/member-monitoring/${selectedMember.id}/suspend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          reason: 'رصيد أقل من الحد الأدنى المطلوب',
          adminId: localStorage.getItem('userId')
        })
      });

      if (response.ok) {
        // Update local state
        const updatedMembers = members.map(m =>
          m.id === selectedMember.id ? { ...m, isSuspended: true } : m
        );
        setMembers(updatedMembers);
        alert('تم إيقاف العضو بنجاح');
      }
    } catch (err) {
      logger.error('Error suspending member:', { err });
      alert('حدث خطأ في إيقاف العضو');
    } finally {
      setShowSuspendModal(false);
      setSuspendConfirmStep(1);
    }
  };

  // Get current user role
  const getUserRole = () => {
    const role = localStorage.getItem('userRole') || 'admin';
    return role;
  };

  // Check if user can perform actions
  const canPerformActions = () => {
    const role = getUserRole();
    return role === 'super_admin' || role === 'finance_manager';
  };

  // Render Action Buttons based on permissions and balance
  const renderActionButtons = (member) => {
    const hasPermission = canPerformActions();
    const needsAction = member.balance < 3000;

    // No actions for compliant members - show "---"
    if (member.balance >= 3000) {
      return <span className="no-action">---</span>;
    }

    // Show disabled buttons for users without permission
    if (!hasPermission) {
      return (
        <div className="action-buttons">
          <button className="action-btn suspend disabled" disabled title="صلاحية مطلوبة">
            <span className="btn-icon">🚫</span> إيقاف
          </button>
          <button className="action-btn notify disabled" disabled title="صلاحية مطلوبة">
            📱 إشعار
          </button>
        </div>
      );
    }

    // Full action buttons for authorized users
    return (
      <div className="action-buttons">
        {!member.isSuspended && (
          <button
            className="action-btn suspend"
            onClick={() => handleSuspend(member)}
            title="إيقاف العضو"
          >
            <span className="btn-icon">🚫</span> إيقاف
          </button>
        )}
        {member.isSuspended && (
          <span className="suspended-badge">موقوف</span>
        )}
        <NotificationDropdown member={member} onSend={sendNotificationToMember} />
      </div>
    );
  };

  // Notification Dropdown Component
  const NotificationDropdown = ({ member, onSend }) => {
    const [showMenu, setShowMenu] = useState(false);

    return (
      <div className="notification-wrapper">
        <button
          className="action-btn notify-dropdown"
          onClick={() => setShowMenu(!showMenu)}
        >
          📱 <span>إشعار</span> ▼
        </button>

        {showMenu && (
          <div className="notification-options">
            <div
              className="notification-option"
              onClick={() => {
                onSend(member, 'app');
                setShowMenu(false);
              }}
            >
              📱 App Notification
            </div>
            <div
              className="notification-option"
              onClick={() => {
                onSend(member, 'whatsapp');
                setShowMenu(false);
              }}
            >
              💬 WhatsApp
            </div>
            <div
              className="notification-option"
              onClick={() => {
                onSend(member, 'email');
                setShowMenu(false);
              }}
            >
              📧 Email
            </div>
            <div
              className="notification-option"
              onClick={() => {
                onSend(member, 'all');
                setShowMenu(false);
              }}
            >
              💾 All Channels
            </div>
          </div>
        )}
      </div>
    );
  };

  // Handle Notify Action
  const handleNotify = async (member) => {
    setSelectedMember(member);
    setShowNotifyModal(true);
  };

  // Send notification through specific channel
  const sendNotificationToMember = async (member, channel) => {
    const message = member.balance < 3000
      ? `عزيزي ${member.name}، رصيدك الحالي ${member.balance} ريال. المطلوب 3000 ريال كحد أدنى. يرجى تسديد المبلغ المتبقي ${3000 - member.balance} ريال.`
      : `عزيزي ${member.name}، شكراً لالتزامك. رصيدك الحالي ${member.balance} ريال.`;

    try {
      const response = await fetch(`${API_URL}/api/members/${member.id}/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          channel: channel,
          message: message,
          type: member.balance < 3000 ? 'payment_reminder' : 'general',
          adminId: localStorage.getItem('userId')
        })
      });

      if (response.ok) {
        alert(`تم إرسال الإشعار عبر ${channel === 'all' ? 'جميع القنوات' : channel}`);
      }
    } catch (err) {
      logger.error('Error sending notification:', { err });
      alert('حدث خطأ في إرسال الإشعار');
    }
  };

  const sendNotification = async (type) => {
    try {
      // API call to send notification
      const response = await fetch(`${API_URL}/api/member-monitoring/${selectedMember.id}/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          type: type,
          message: type === 'payment'
            ? `عزيزي ${selectedMember.name}، رصيدك الحالي ${selectedMember.balance} ريال وهو أقل من الحد الأدنى المطلوب (3000 ريال). يرجى تسديد المبلغ المتبقي.`
            : `عزيزي ${selectedMember.name}، هذا إشعار من إدارة صندوق آل الشعيل.`
        })
      });

      if (response.ok) {
        alert('تم إرسال الإشعار بنجاح');
      }
    } catch (err) {
      logger.error('Error sending notification:', { err });
      alert('حدث خطأ في إرسال الإشعار');
    } finally {
      setShowNotifyModal(false);
    }
  };

  // Clear All Filters
  const clearAllFilters = () => {
    setSearchMemberId('');
    setSearchName('');
    setSearchPhone('');
    setDebouncedSearchMemberId('');
    setDebouncedSearchName('');
    setDebouncedSearchPhone('');
    setSelectedTribalSection('all');
    setBalanceFilterType('all');
    setBalanceComparisonAmount('');
    setBalanceRangeFrom('');
    setBalanceRangeTo('');
    setBalanceCategory('all');
  };

  // Check if any filter is active
  const hasActiveFilters = () => {
    return debouncedSearchMemberId || debouncedSearchName || debouncedSearchPhone ||
           selectedTribalSection !== 'all' || balanceFilterType !== 'all';
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['رقم العضوية', 'الاسم', 'رقم الهاتف', 'الرصيد', 'الفخذ', 'الحالة'];
    const csvContent = [
      headers.join(','),
      ...filteredMembers.map(member => [
        member.memberId,
        `"${member.name}"`,
        member.phone,
        member.balance,
        member.tribalSection,
        member.balance >= 3000 ? 'ملتزم' : 'غير ملتزم'
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `members_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to Excel (simple HTML table format)
  const exportToExcel = () => {
    const tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <style>
          table { border-collapse: collapse; width: 100%; direction: rtl; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .sufficient { background-color: #d4edda; }
          .insufficient { background-color: #f8d7da; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              <th>رقم العضوية</th>
              <th>الاسم</th>
              <th>رقم الهاتف</th>
              <th>الرصيد</th>
              <th>الفخذ</th>
              <th>الحالة</th>
              <th>النقص</th>
            </tr>
          </thead>
          <tbody>
            ${filteredMembers.map(member => `
              <tr class="${member.balance >= 3000 ? 'sufficient' : 'insufficient'}">
                <td>${member.memberId}</td>
                <td>${member.name}</td>
                <td>${member.phone}</td>
                <td>${member.balance}</td>
                <td>${member.tribalSection}</td>
                <td>${member.balance >= 3000 ? 'ملتزم' : 'غير ملتزم'}</td>
                <td>${member.balance < 3000 ? (3000 - member.balance) : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `members_report_${new Date().toISOString().split('T')[0]}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Initial Load
  useEffect(() => {
    fetchMembers();
  }, []);

  return (
    <div className="member-monitoring-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1 className="dashboard-title">لوحة متابعة الأعضاء</h1>
        <p className="dashboard-subtitle">متابعة حالة الأعضاء والأرصدة المالية</p>
      </div>

      {/* Statistics - Enhanced Inline Format */}
      <div className="stats-inline-container">
        <div className="stats-inline">
          <span className="stat-inline-item total">
            <span className="stat-inline-icon">📊</span>
            <span className="stat-inline-label">إجمالي:</span>
            <span className="stat-inline-value">{filteredMembers.length}</span>
          </span>
          <span className="stat-divider">|</span>
          <span className="stat-inline-item sufficient">
            <span className="stat-inline-icon">✅</span>
            <span className="stat-inline-label">ملتزمون:</span>
            <span className="stat-inline-value">
              {filteredMembers.filter(m => m.balance >= 3000).length}
            </span>
          </span>
          <span className="stat-divider">|</span>
          <span className="stat-inline-item insufficient">
            <span className="stat-inline-icon">❌</span>
            <span className="stat-inline-label">غير ملتزمين:</span>
            <span className="stat-inline-value">
              {filteredMembers.filter(m => m.balance < 3000).length}
            </span>
          </span>
        </div>
      </div>

      {/* Detailed Statistics Cards */}
      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-icon total">
            <CheckCircleIcon className="icon" />
          </div>
          <div className="stat-content">
            <h3>إجمالي الأعضاء</h3>
            <p className="stat-value">{filteredMembers.length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon sufficient">
            <CheckCircleIcon className="icon" />
          </div>
          <div className="stat-content">
            <h3>ملتزمون (≥3000 ريال)</h3>
            <p className="stat-value">
              {filteredMembers.filter(m => m.balance >= 3000).length}
            </p>
            <span className="stat-percentage">
              {((filteredMembers.filter(m => m.balance >= 3000).length / filteredMembers.length) * 100 || 0).toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon insufficient">
            <ExclamationTriangleIcon className="icon" />
          </div>
          <div className="stat-content">
            <h3>غير ملتزمين (&lt;3000 ريال)</h3>
            <p className="stat-value">
              {filteredMembers.filter(m => m.balance < 3000).length}
            </p>
            <span className="stat-percentage warning">
              {((filteredMembers.filter(m => m.balance < 3000).length / filteredMembers.length) * 100 || 0).toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon critical">
            <ExclamationTriangleIcon className="icon" />
          </div>
          <div className="stat-content">
            <h3>وضع حرج (&lt;1000 ريال)</h3>
            <p className="stat-value">
              {filteredMembers.filter(m => m.balance < 1000).length}
            </p>
            <span className="stat-percentage critical">
              {((filteredMembers.filter(m => m.balance < 1000).length / filteredMembers.length) * 100 || 0).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="filters-container">
        <div className="filter-row">
          <div className="filter-group">
            <label>رقم العضوية</label>
            <div className="input-wrapper">
              <MagnifyingGlassIcon className="input-icon" />
              <input
                type="text"
                placeholder="البحث برقم العضوية"
                value={searchMemberId}
                onChange={(e) => setSearchMemberId(e.target.value)}
                className="filter-input"
              />
            </div>
          </div>

          <div className="filter-group">
            <label>الاسم</label>
            <div className="input-wrapper">
              <MagnifyingGlassIcon className="input-icon" />
              <input
                type="text"
                placeholder="البحث بالاسم"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="filter-input"
              />
            </div>
          </div>

          <div className="filter-group">
            <label>رقم التليفون</label>
            <div className="input-wrapper">
              <MagnifyingGlassIcon className="input-icon" />
              <input
                type="text"
                placeholder="البحث برقم التليفون"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                className="filter-input"
              />
            </div>
          </div>

          <div className="filter-group">
            <label>الفخذ</label>
            <div className="input-wrapper">
              <FunnelIcon className="input-icon" />
              <select
                value={selectedTribalSection}
                onChange={(e) => setSelectedTribalSection(e.target.value)}
                className="filter-select"
              >
                {tribalSections.map(section => (
                  <option key={section.value} value={section.value}>
                    {section.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Advanced Balance Filters */}
        <div className="filter-row">
          <div className="filter-group">
            <label>فلتر الرصيد</label>
            <select
              value={balanceFilterType}
              onChange={(e) => setBalanceFilterType(e.target.value)}
              className="filter-select"
            >
              <option value="all">جميع الأرصدة</option>
              <option value="comparison">مقارنة بمبلغ</option>
              <option value="range">نطاق مبلغ</option>
              <option value="category">فئات محددة</option>
            </select>
          </div>

          {balanceFilterType === 'comparison' && (
            <>
              <div className="filter-group">
                <label>المقارنة</label>
                <select
                  value={balanceComparison}
                  onChange={(e) => setBalanceComparison(e.target.value)}
                  className="filter-select"
                >
                  <option value="greater">أكثر من</option>
                  <option value="less">أقل من</option>
                  <option value="equal">يساوي</option>
                </select>
              </div>
              <div className="filter-group">
                <label>المبلغ</label>
                <input
                  type="number"
                  placeholder="3000"
                  value={balanceComparisonAmount}
                  onChange={(e) => setBalanceComparisonAmount(e.target.value)}
                  className="filter-input"
                />
              </div>
            </>
          )}

          {balanceFilterType === 'range' && (
            <>
              <div className="filter-group">
                <label>من</label>
                <input
                  type="number"
                  placeholder="1000"
                  value={balanceRangeFrom}
                  onChange={(e) => setBalanceRangeFrom(e.target.value)}
                  className="filter-input"
                />
              </div>
              <div className="filter-group">
                <label>إلى</label>
                <input
                  type="number"
                  placeholder="5000"
                  value={balanceRangeTo}
                  onChange={(e) => setBalanceRangeTo(e.target.value)}
                  className="filter-input"
                />
              </div>
            </>
          )}

          {balanceFilterType === 'category' && (
            <div className="filter-group">
              <label>الفئة</label>
              <select
                value={balanceCategory}
                onChange={(e) => setBalanceCategory(e.target.value)}
                className="filter-select"
              >
                <option value="all">جميع الفئات</option>
                <option value="compliant">ملتزمون (≥3000 ريال)</option>
                <option value="non-compliant">غير ملتزمين (&lt;3000 ريال)</option>
                <option value="critical">وضع حرج (&lt;1000 ريال)</option>
                <option value="excellent">ممتاز (≥5000 ريال)</option>
                <option value="0-500">0 - 500 ريال</option>
                <option value="500-1000">500 - 1000 ريال</option>
                <option value="1000-2000">1000 - 2000 ريال</option>
                <option value="2000-3000">2000 - 3000 ريال</option>
                <option value="3000-5000">3000 - 5000 ريال</option>
                <option value="5000+">5000+ ريال</option>
              </select>
            </div>
          )}

          {/* Filter Actions */}
          <div className="filter-actions">
            <button
              className="btn-export excel"
              onClick={exportToExcel}
              title="تصدير إلى Excel"
            >
              <DocumentArrowDownIcon className="btn-icon-svg" />
              Excel
            </button>
            <button
              className="btn-export csv"
              onClick={exportToCSV}
              title="تصدير إلى CSV"
            >
              <ArrowDownTrayIcon className="btn-icon-svg" />
              CSV
            </button>
            {hasActiveFilters() && (
              <button
                className="btn-clear-filters"
                onClick={clearAllFilters}
                title="مسح جميع الفلاتر"
              >
                🗑️ مسح الكل
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        {loading && !initialLoadComplete ? (
          <div className="loading-skeleton">
            {/* Skeleton loader for better UX */}
            {[...Array(10)].map((_, index) => (
              <div key={index} className="skeleton-row">
                <div className="skeleton skeleton-cell" style={{ width: '12%' }}></div>
                <div className="skeleton skeleton-cell" style={{ width: '25%' }}></div>
                <div className="skeleton skeleton-cell" style={{ width: '15%' }}></div>
                <div className="skeleton skeleton-cell" style={{ width: '15%' }}></div>
                <div className="skeleton skeleton-cell" style={{ width: '15%' }}></div>
                <div className="skeleton skeleton-cell" style={{ width: '18%' }}></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="error-state">{error}</div>
        ) : (
          <>
            <table className="members-table">
              <thead>
                <tr>
                  <th style={{ width: '12%' }}>رقم العضوية</th>
                  <th style={{ width: '25%' }}>الاسم</th>
                  <th style={{ width: '15%' }}>رقم التليفون</th>
                  <th style={{ width: '15%' }}>الرصيد</th>
                  <th style={{ width: '15%' }}>الفخذ</th>
                  <th style={{ width: '18%' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {paginatedMembers.map(member => (
                  <tr key={member.id} className={member.isSuspended ? 'suspended' : ''}>
                    <td className="member-id">{member.memberId}</td>
                    <td className="member-name">{member.name}</td>
                    <td className="member-phone">{member.phone}</td>
                    <td className="member-balance">
                      <span className={`balance ${member.status} ${member.balance < 1000 ? 'critical' : ''}`}>
                        {member.balance >= 3000 ? '🟢' : '🔴'} {member.balance.toLocaleString('en-US')} ر.س
                      </span>
                      {member.status === 'insufficient' && (
                        <span className="balance-warning">
                          (نقص: {(3000 - member.balance).toLocaleString('en-US')} ر.س)
                        </span>
                      )}
                    </td>
                    <td className="member-tribal">{member.tribalSection}</td>
                    <td className="member-actions">
                      {renderActionButtons(member)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile Card View */}
            <div className="member-cards">
              {paginatedMembers.map(member => (
                <div key={member.id} className="member-card">
                  <div className="member-card-header">
                    <div className="member-card-id-block">
                      <span className="member-card-id-label">رقم العضوية</span>
                      <span className="member-card-id">{member.memberId}</span>
                    </div>
                    <span className={`member-card-status ${member.status}`}>
                      {member.balance >= 3000 ? '🟢 ملتزم' : '🔴 غير ملتزم'}
                    </span>
                  </div>

                  <div className="member-card-body">
                    <div className="member-card-name">
                      <span className="member-card-name-label">الاسم</span>
                      <span>{member.name}</span>
                    </div>

                    <div className="member-card-info">
                      <div className="member-card-info-item">
                        <span className="member-card-info-label">الهاتف:</span>
                        <span>{member.phone}</span>
                      </div>
                      <div className="member-card-info-item">
                        <span className="member-card-info-label">الفخذ:</span>
                        <span>{member.tribalSection}</span>
                      </div>
                    </div>

                    <div className={`member-card-balance ${member.balance < 1000 ? 'critical' : ''}`}>
                      <div className="member-card-balance-label">الرصيد</div>
                      <div className="member-card-balance-value">
                        {member.balance >= 3000 ? '🟢' : '🔴'} {member.balance.toLocaleString('en-US')} ريال
                      </div>
                    </div>

                    {member.balance < 3000 && (
                      <div className="member-card-deficit">
                        نقص: {(3000 - member.balance).toLocaleString('en-US')} ريال
                      </div>
                    )}
                  </div>

                  <div className="member-card-actions">
                    {renderActionButtons(member)}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="pagination-container">
              <div className="page-size-selector">
                <label>عرض:</label>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const newSize = Number(e.target.value);
                    logger.debug('📄 Changing page size to:', { newSize });
                    setPageSize(newSize);
                    setCurrentPage(1);
                  }}
                  className="page-size-select"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>عضو لكل صفحة</span>
              </div>

              <div className="pagination-controls">
                <button
                  className="page-btn"
                  onClick={() => {
                    logger.debug('⬅️ Previous page clicked, current:', { currentPage });
                    setCurrentPage(prev => Math.max(1, prev - 1));
                  }}
                  disabled={currentPage === 1 || totalPages === 0}
                >
                  <ChevronRightIcon className="page-icon" />
                  السابق
                </button>

                <div className="page-numbers">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        className={`page-number ${currentPage === pageNum ? 'active' : ''}`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  className="page-btn"
                  onClick={() => {
                    logger.debug('➡️ Next page clicked, current:', { currentPage, totalPages });
                    setCurrentPage(prev => Math.min(totalPages, prev + 1));
                  }}
                  disabled={currentPage >= totalPages || totalPages === 0}
                >
                  التالي
                  <ChevronLeftIcon className="page-icon" />
                </button>
              </div>

              <div className="page-info">
                صفحة {currentPage} من {totalPages} | إجمالي: {filteredMembers.length} عضو
              </div>
            </div>
          </>
        )}
      </div>

      {/* Suspend Confirmation Modal */}
      {showSuspendModal && (
        <div className="modal-overlay" onClick={() => setShowSuspendModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header warning">
              <ExclamationTriangleIcon className="modal-icon" />
              <h2>تأكيد إيقاف العضو</h2>
            </div>

            <div className="modal-body">
              {suspendConfirmStep === 1 ? (
                <>
                  <p className="warning-text">
                    هل أنت متأكد من إيقاف العضو التالي؟
                  </p>
                  <div className="member-info">
                    <p><strong>الاسم:</strong> {selectedMember?.name}</p>
                    <p><strong>رقم العضوية:</strong> {selectedMember?.memberId}</p>
                    <p><strong>الرصيد الحالي:</strong> {selectedMember?.balance} ر.س</p>
                    <p><strong>النقص:</strong> {3000 - selectedMember?.balance} ر.س</p>
                  </div>
                  <p className="warning-note">
                    سيتم إيقاف جميع خدمات العضو حتى يتم تسديد المبلغ المطلوب
                  </p>
                </>
              ) : (
                <>
                  <p className="confirm-text">
                    تأكيد نهائي - هذا الإجراء لا يمكن التراجع عنه بسهولة
                  </p>
                  <p className="final-warning">
                    اكتب "تأكيد الإيقاف" للمتابعة
                  </p>
                  <input
                    type="text"
                    className="confirm-input"
                    placeholder="تأكيد الإيقاف"
                    onChange={(e) => {
                      if (e.target.value === 'تأكيد الإيقاف') {
                        e.target.classList.add('valid');
                      } else {
                        e.target.classList.remove('valid');
                      }
                    }}
                  />
                </>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => {
                  setShowSuspendModal(false);
                  setSuspendConfirmStep(1);
                }}
              >
                إلغاء
              </button>
              <button
                className="btn-confirm warning"
                onClick={confirmSuspend}
                disabled={suspendConfirmStep === 2 && !document.querySelector('.confirm-input.valid')}
              >
                {suspendConfirmStep === 1 ? 'متابعة' : 'تأكيد الإيقاف'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notify Modal */}
      {showNotifyModal && (
        <div className="modal-overlay" onClick={() => setShowNotifyModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header info">
              <BellIcon className="modal-icon" />
              <h2>إرسال إشعار</h2>
            </div>

            <div className="modal-body">
              <p>اختر نوع الإشعار المراد إرساله للعضو:</p>
              <div className="member-info">
                <p><strong>الاسم:</strong> {selectedMember?.name}</p>
                <p><strong>رقم الهاتف:</strong> {selectedMember?.phone}</p>
              </div>

              <div className="notification-options">
                <button
                  className="notification-type payment"
                  onClick={() => sendNotification('payment')}
                >
                  <BellIcon className="option-icon" />
                  <span>تذكير بالدفع</span>
                  <p className="option-desc">
                    إرسال رسالة تذكير بضرورة تسديد المبلغ المتبقي
                  </p>
                </button>

                <button
                  className="notification-type general"
                  onClick={() => sendNotification('general')}
                >
                  <BellIcon className="option-icon" />
                  <span>إشعار عام</span>
                  <p className="option-desc">
                    إرسال رسالة إشعار عامة من إدارة الصندوق
                  </p>
                </button>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowNotifyModal(false)}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Phase 4: Performance Optimization - Memoize to prevent unnecessary re-renders
export default React.memo(MemberMonitoringDashboard);
