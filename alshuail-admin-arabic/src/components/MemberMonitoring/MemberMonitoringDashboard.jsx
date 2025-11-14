import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import './MemberMonitoringDashboard.css';

// Import decomposed components
import MemberMonitoringHeader from './MemberMonitoringHeader';
import MemberMonitoringFilters from './MemberMonitoringFilters';
import MemberMonitoringTable from './MemberMonitoringTable';
import MemberMonitoringPagination from './MemberMonitoringPagination';

import { logger } from '../../utils/logger';

const MemberMonitoringDashboard = memo(() => {
  // State management
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState({
    totalMembers: 0,
    activeMembers: 0,
    compliantMembers: 0,
    nonCompliantMembers: 0,
    criticalMembers: 0
  });

  // Filter states
  const [searchMemberId, setSearchMemberId] = useState('');
  const [searchName, setSearchName] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [selectedTribalSection, setSelectedTribalSection] = useState('all');
  const [balanceFilterType, setBalanceFilterType] = useState('all');
  const [balanceComparison, setBalanceComparison] = useState('greater');
  const [balanceComparisonAmount, setBalanceComparisonAmount] = useState('');
  const [balanceRangeFrom, setBalanceRangeFrom] = useState('');
  const [balanceRangeTo, setBalanceRangeTo] = useState('');
  const [balanceCategory, setBalanceCategory] = useState('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Sorting states
  const [sortField, setSortField] = useState('memberId');
  const [sortDirection, setSortDirection] = useState('asc');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25); // Default to 25 for better UX

  // Load members data
  const loadMembers = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch ALL members from API (backend max 500, enough for our 347 members)
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://proshael.onrender.com';
      const response = await fetch(`${API_BASE_URL}/api/members?limit=500&page=1`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to load members');

      const { data } = await response.json();
      const processedMembers = (data || []).map(member => {
        // Fix: Use explicit undefined check to preserve 0 values (same fix as statement search)
        const balance = member.current_balance !== undefined ? member.current_balance : 0;

        // Required amount: 3000 SAR for each member until 2025
        const requiredAmount = 3000;
        const requiredPayment = Math.max(0, requiredAmount - balance);
        const percentageComplete = Math.min(100, (balance / requiredAmount) * 100);

        let status = 'compliant';
        let statusText = 'ملتزم';
        let statusClass = '';

        if (requiredPayment > 1000) {
          status = 'critical';
          statusText = 'حرج';
          statusClass = 'critical';
        } else if (requiredPayment > 500) {
          status = 'non-compliant';
          statusText = 'غير ملتزم';
          statusClass = 'warning';
        } else if (balance > 500) {
          status = 'excellent';
          statusText = 'ممتاز';
          statusClass = 'excellent';
        }

        return {
          ...member,
          id: member.id,
          memberId: member.membership_number || member.member_id,
          fullName: member.full_name,
          phone: member.phone,
          tribalSection: member.tribal_section || 'غير محدد',
          currentBalance: balance,
          requiredPayment: requiredPayment,
          lastPaymentDate: member.last_payment_date,
          status,
          statusText,
          statusClass
        };
      });

      setMembers(processedMembers);
      setFilteredMembers(processedMembers);

      // Calculate statistics
      const stats = {
        totalMembers: processedMembers.length,
        activeMembers: processedMembers.filter(m => m.membership_status === 'active').length,
        compliantMembers: processedMembers.filter(m => m.status === 'compliant' || m.status === 'excellent').length,
        nonCompliantMembers: processedMembers.filter(m => m.status === 'non-compliant').length,
        criticalMembers: processedMembers.filter(m => m.status === 'critical').length
      };
      setStatistics(stats);

    } catch (error) {
      logger.error('Error loading members:', { error });
      // Show error message without toast for now
      logger.error('حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // Apply filters
  const applyFilters = useCallback(() => {
    let filtered = [...members];

    // Search filters
    if (searchMemberId) {
      filtered = filtered.filter(m =>
        m.memberId?.toString().includes(searchMemberId)
      );
    }

    if (searchName) {
      filtered = filtered.filter(m =>
        m.fullName?.toLowerCase().includes(searchName.toLowerCase())
      );
    }

    if (searchPhone) {
      filtered = filtered.filter(m =>
        m.phone?.includes(searchPhone)
      );
    }

    if (selectedTribalSection !== 'all') {
      filtered = filtered.filter(m =>
        m.tribalSection === selectedTribalSection
      );
    }

    // Balance filters
    if (balanceFilterType === 'comparison' && balanceComparisonAmount) {
      const amount = parseFloat(balanceComparisonAmount);
      if (balanceComparison === 'greater') {
        filtered = filtered.filter(m => m.currentBalance > amount);
      } else if (balanceComparison === 'less') {
        filtered = filtered.filter(m => m.currentBalance < amount);
      } else {
        filtered = filtered.filter(m => m.currentBalance === amount);
      }
    }

    if (balanceFilterType === 'range') {
      if (balanceRangeFrom) {
        filtered = filtered.filter(m => m.currentBalance >= parseFloat(balanceRangeFrom));
      }
      if (balanceRangeTo) {
        filtered = filtered.filter(m => m.currentBalance <= parseFloat(balanceRangeTo));
      }
    }

    if (balanceFilterType === 'category' && balanceCategory !== 'all') {
      filtered = filtered.filter(m => m.status === balanceCategory);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aVal = a[sortField] || '';
      const bVal = b[sortField] || '';

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    setFilteredMembers(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [
    members, searchMemberId, searchName, searchPhone, selectedTribalSection,
    balanceFilterType, balanceComparison, balanceComparisonAmount,
    balanceRangeFrom, balanceRangeTo, balanceCategory,
    sortField, sortDirection
  ]);

  // Apply filters when dependencies change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredMembers.length / pageSize);
  const paginatedMembers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredMembers.slice(startIndex, startIndex + pageSize);
  }, [filteredMembers, currentPage, pageSize]);

  // Event handlers
  const handleSort = useCallback((field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  const handlePageSizeChange = useCallback((size) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchMemberId('');
    setSearchName('');
    setSearchPhone('');
    setSelectedTribalSection('all');
    setBalanceFilterType('all');
    setBalanceComparisonAmount('');
    setBalanceRangeFrom('');
    setBalanceRangeTo('');
    setBalanceCategory('all');
  }, []);

  const handleToggleAdvancedFilters = useCallback(() => {
    setShowAdvancedFilters(prev => !prev);
  }, []);

  const handleViewMemberDetails = useCallback((member) => {
    // Navigate to member details or show modal
    logger.debug(`عرض تفاصيل: ${member.fullName}`);
  }, []);

  const handleContactMember = useCallback((member) => {
    // Initiate contact with member
    if (member.phone) {
      window.open(`https://wa.me/966${member.phone.replace(/^0/, '')}`, '_blank');
    }
  }, []);

  const handleShowNotifications = useCallback(() => {
    // Show notifications panel
    logger.debug('عرض الإشعارات');
  }, []);

  const issueCount = statistics.nonCompliantMembers + statistics.criticalMembers;

  return (
    <div className="member-monitoring-dashboard">
      <MemberMonitoringHeader
        statistics={statistics}
        issueCount={issueCount}
        onShowNotifications={handleShowNotifications}
      />

      <MemberMonitoringFilters
        searchMemberId={searchMemberId}
        searchName={searchName}
        searchPhone={searchPhone}
        selectedTribalSection={selectedTribalSection}
        balanceFilterType={balanceFilterType}
        balanceComparison={balanceComparison}
        balanceComparisonAmount={balanceComparisonAmount}
        balanceRangeFrom={balanceRangeFrom}
        balanceRangeTo={balanceRangeTo}
        balanceCategory={balanceCategory}
        showAdvancedFilters={showAdvancedFilters}
        onSearchMemberIdChange={setSearchMemberId}
        onSearchNameChange={setSearchName}
        onSearchPhoneChange={setSearchPhone}
        onTribalSectionChange={setSelectedTribalSection}
        onBalanceFilterTypeChange={setBalanceFilterType}
        onBalanceComparisonChange={setBalanceComparison}
        onBalanceComparisonAmountChange={setBalanceComparisonAmount}
        onBalanceRangeFromChange={setBalanceRangeFrom}
        onBalanceRangeToChange={setBalanceRangeTo}
        onBalanceCategoryChange={setBalanceCategory}
        onToggleAdvancedFilters={handleToggleAdvancedFilters}
        onClearFilters={handleClearFilters}
      />

      <MemberMonitoringTable
        members={paginatedMembers}
        loading={loading}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        onViewMemberDetails={handleViewMemberDetails}
        onContactMember={handleContactMember}
      />

      {!loading && filteredMembers.length > 0 && (
        <MemberMonitoringPagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredMembers.length}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
    </div>
  );
});

MemberMonitoringDashboard.displayName = 'MemberMonitoringDashboard';

export default MemberMonitoringDashboard;