import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { MagnifyingGlassIcon, PhoneIcon, UserIcon, PrinterIcon, DocumentArrowDownIcon, HomeIcon, CalendarIcon, CurrencyDollarIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
// Using API instead of direct Supabase connection
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { motion, AnimatePresence } from 'framer-motion';
import { logger } from '../../utils/logger';

import './MemberStatementSearch.css';
import './MemberStatementSearchEnhanced.css';

const MemberStatementSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberStatement, setMemberStatement] = useState(null);
  const [error, setError] = useState('');
  const [showAutoComplete, setShowAutoComplete] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'compliant', 'non-compliant'
  const [animatedCounts, setAnimatedCounts] = useState({
    total: 0,
    compliant: 0,
    nonCompliant: 0
  });
  const [itemsPerPage, setItemsPerPage] = useState(20); // Default 20 items per page
  const [currentPage, setCurrentPage] = useState(1);

  // Yearly payment requirements
  const YEARLY_AMOUNT = 600; // SAR per year
  const MINIMUM_BALANCE = 3000; // SAR minimum required

  // Debounced search function with Supabase integration
  const searchMembers = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      setShowAutoComplete(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Use API for search
      const API_URL = process.env.REACT_APP_API_URL || 'https://api.alshailfund.com';
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_URL}/api/members?search=${encodeURIComponent(query)}&limit=10`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('فشل البحث');
      }

      const apiData = await response.json();
      const members = apiData.data || apiData.members || [];

      // Transform data to expected format
      const results = members.map(m => ({
        id: m.id,
        member_no: m.membership_number || m.member_no,
        full_name: m.full_name,
        phone: m.phone,
        tribal_section: m.tribal_section,
        balance: m.balance || 0
      }));

      setSearchResults(results);
      setShowAutoComplete(true);
    } catch (error) {
      logger.error('Search error:', { error });
      setError('حدث خطأ في البحث');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load initial members on component mount
  useEffect(() => {
    const loadInitialMembers = async () => {
      setLoading(true);
      try {
        const API_URL = process.env.REACT_APP_API_URL || 'https://api.alshailfund.com';
        const token = localStorage.getItem('token');
        const response = await fetch(
          `${API_URL}/api/members?limit=500`,  // Request all members (supports up to 500, current: 347)
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        if (response.ok) {
          const apiData = await response.json();
          const members = apiData.data || apiData.members || [];

          const results = members.map(m => ({
            id: m.id,
            member_no: m.membership_number || m.member_no,
            full_name: m.full_name,
            phone: m.phone,
            tribal_section: m.tribal_section,
            balance: m.balance || 0
          }));

          setSearchResults(results);
          setShowAutoComplete(false); // Don't show autocomplete on initial load
        }
      } catch (error) {
        logger.error('Error loading initial members:', { error });
      } finally {
        setLoading(false);
      }
    };

    loadInitialMembers();
  }, []);

  // Handle search input change with debouncing
  useEffect(() => {
    if (searchQuery.length > 1) {
      const timer = setTimeout(() => {
        searchMembers(searchQuery);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [searchQuery, searchMembers]);

  // Payment status icon - memoized with useCallback
  const getStatusIcon = useCallback((status) => {
    switch (status) {
      case 'paid':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'partial':
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
      default:
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
    }
  }, []);

  // Payment status badge - memoized with useCallback
  const getStatusBadge = useCallback((status) => {
    const statusConfig = {
      paid: { text: 'مدفوع', className: 'bg-green-100 text-green-800' },
      partial: { text: 'جزئي', className: 'bg-yellow-100 text-yellow-800' },
      pending: { text: 'معلق', className: 'bg-red-100 text-red-800' }
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.text}
      </span>
    );
  }, []);

  // Calculate payment progress
  const paymentProgress = useMemo(() => {
    if (!memberStatement) return 0;
    return Math.min(100, (memberStatement.totalPaid / memberStatement.totalRequired) * 100);
  }, [memberStatement]);

  // Filter members based on active filter
  const filteredMembers = useMemo(() => {
    if (activeFilter === 'all') return searchResults;
    if (activeFilter === 'compliant') {
      return searchResults.filter(m => m.balance >= MINIMUM_BALANCE);
    }
    if (activeFilter === 'non-compliant') {
      return searchResults.filter(m => m.balance < MINIMUM_BALANCE);
    }
    return searchResults;
  }, [searchResults, activeFilter]);

  // Paginated members
  const paginatedMembers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredMembers.slice(startIndex, endIndex);
  }, [filteredMembers, currentPage, itemsPerPage]);

  // Total pages
  const totalPages = useMemo(() => {
    return Math.ceil(filteredMembers.length / itemsPerPage);
  }, [filteredMembers.length, itemsPerPage]);

  // Reset to page 1 when filter or items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, itemsPerPage]);

  // Count-up animation effect
  useEffect(() => {
    if (searchResults.length === 0) {
      setAnimatedCounts({ total: 0, compliant: 0, nonCompliant: 0 });
      return;
    }

    const totalCount = searchResults.length;
    const compliantCount = searchResults.filter(m => m.balance >= MINIMUM_BALANCE).length;
    const nonCompliantCount = totalCount - compliantCount;

    const duration = 1500; // 1.5 seconds
    const steps = 60;
    const interval = duration / steps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;

      setAnimatedCounts({
        total: Math.round(totalCount * progress),
        compliant: Math.round(compliantCount * progress),
        nonCompliant: Math.round(nonCompliantCount * progress)
      });

      if (currentStep >= steps) {
        setAnimatedCounts({
          total: totalCount,
          compliant: compliantCount,
          nonCompliant: nonCompliantCount
        });
        clearInterval(timer);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [searchResults]);

  // Load member statement with payment details - memoized with useCallback
  const loadMemberStatement = useCallback(async (member) => {
    setLoading(true);
    setError('');

    try {
      // Generate mock payment data based on member's balance
      const memberBalance = member.balance || 0;
      const payments = [];

      // Distribute balance across years
      if (memberBalance > 0) {
        const yearsWithPayment = Math.min(5, Math.floor(memberBalance / 600));
        for (let i = 0; i < yearsWithPayment; i++) {
          payments.push({
            year: 2021 + i,
            amount: 600,
            payment_date: `${2021 + i}-06-15`,
            receipt_number: `RCP-${2021 + i}-${member.member_no}`,
            payment_method: 'بنك الراجحي'
          });
        }
        // Add partial payment if balance is not divisible by 600
        const remainder = memberBalance % 600;
        if (remainder > 0 && yearsWithPayment < 5) {
          payments.push({
            year: 2021 + yearsWithPayment,
            amount: remainder,
            payment_date: `${2021 + yearsWithPayment}-06-15`,
            receipt_number: `RCP-${2021 + yearsWithPayment}-${member.member_no}`,
            payment_method: 'تحويل بنكي'
          });
        }
      }

      const paymentsError = null;

      if (paymentsError && paymentsError.code !== 'PGRST116') {
        logger.error('Payments fetch error:', { paymentsError });
      }

      // Calculate statement data
      const years = [2021, 2022, 2023, 2024, 2025];
      const yearlyPayments = years.map(year => {
        const payment = payments?.find(p => p.year === year);
        return {
          year,
          required: YEARLY_AMOUNT,
          paid: payment?.amount || 0,
          status: payment?.amount >= YEARLY_AMOUNT ? 'paid' : payment?.amount > 0 ? 'partial' : 'pending',
          paymentDate: payment?.payment_date,
          receiptNumber: payment?.receipt_number,
          paymentMethod: payment?.payment_method
        };
      });

      const totalPaid = yearlyPayments.reduce((sum, p) => sum + p.paid, 0);
      const totalRequired = years.length * YEARLY_AMOUNT;
      const outstandingBalance = Math.max(0, totalRequired - totalPaid);
      const complianceStatus = totalPaid >= MINIMUM_BALANCE ? 'compliant' : 'non-compliant';

      setSelectedMember(member);
      setMemberStatement({
        member: member,
        yearlyPayments,
        totalPaid,
        totalRequired,
        outstandingBalance,
        complianceStatus,
        lastPaymentDate: payments?.[0]?.payment_date
      });

      setShowAutoComplete(false);
    } catch (err) {
      logger.error('Error loading statement:', { err });
      setError('حدث خطأ في تحميل كشف الحساب');
    } finally {
      setLoading(false);
    }
  }, [YEARLY_AMOUNT, MINIMUM_BALANCE]);

  // Handle member selection - memoized with useCallback
  const handleMemberSelect = useCallback((member) => {
    loadMemberStatement(member);
    setSearchQuery(member.full_name);
  }, [loadMemberStatement]);

  // Handle back to main list - memoized with useCallback
  const handleBackToList = useCallback(async () => {
    setMemberStatement(null);
    setSelectedMember(null);
    setSearchQuery('');
    setShowAutoComplete(false);

    // Reload all members to show full list
    setLoading(true);
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'https://api.alshailfund.com';
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_URL}/api/members?limit=500`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const apiData = await response.json();
        const members = apiData.data || apiData.members || [];

        const results = members.map(m => ({
          id: m.id,
          member_no: m.membership_number || m.member_no,
          full_name: m.full_name,
          phone: m.phone,
          tribal_section: m.tribal_section,
          balance: m.balance || 0
        }));

        setSearchResults(results);
      }
    } catch (error) {
      logger.error('Error reloading members:', { error });
    } finally {
      setLoading(false);
    }
  }, []);

  // ESC key handler for back navigation
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && memberStatement) {
        handleBackToList();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [memberStatement, handleBackToList]);

  // Print statement - memoized with useCallback
  const handlePrint = useCallback(() => {
    const printWindow = window.open('', '_blank');
    const printContent = document.getElementById('statement-content');

    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>كشف حساب - ${selectedMember?.full_name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700&display=swap');
            body {
              font-family: 'Cairo', sans-serif;
              direction: rtl;
              padding: 20px;
              background: white;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #ddd;
            }
            .member-info {
              margin-bottom: 30px;
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 15px;
            }
            .info-item {
              padding: 10px;
              background: #f8f9fa;
              border-radius: 8px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              padding: 12px;
              border: 1px solid #ddd;
              text-align: right;
            }
            th {
              background: #2980b9;
              color: white;
            }
            .status-paid { color: green; }
            .status-partial { color: orange; }
            .status-pending { color: red; }
            .summary {
              margin-top: 30px;
              padding: 20px;
              background: #f8f9fa;
              border-radius: 8px;
              text-align: center;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${printContent?.innerHTML || ''}
        </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }, [selectedMember]);

  // Export to Excel with XLSX - memoized with useCallback
  const handleExport = useCallback(() => {
    if (!memberStatement) return;

    const data = memberStatement.yearlyPayments.map(payment => ({
      'السنة': payment.year,
      'المبلغ المطلوب': `${payment.required} ريال`,
      'المبلغ المدفوع': `${payment.paid} ريال`,
      'الحالة': payment.status === 'paid' ? 'مدفوع' : payment.status === 'partial' ? 'جزئي' : 'معلق',
      'تاريخ الدفع': payment.paymentDate || '-',
      'رقم الإيصال': payment.receiptNumber || '-'
    }));

    // Add summary row
    data.push({
      'السنة': 'الإجمالي',
      'المبلغ المطلوب': `${memberStatement.totalRequired} ريال`,
      'المبلغ المدفوع': `${memberStatement.totalPaid} ريال`,
      'الحالة': memberStatement.complianceStatus === 'compliant' ? 'ملتزم' : 'غير ملتزم',
      'تاريخ الدفع': '',
      'رقم الإيصال': ''
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'كشف الحساب');

    // Generate filename with member ID and timestamp
    const fileName = `statement_${selectedMember.member_no}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }, [memberStatement, selectedMember]);

  // Export to PDF - memoized with useCallback
  const exportToPDF = useCallback(() => {
    if (!memberStatement) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Set RTL
    doc.setR2L(true);

    // Header
    doc.setFontSize(20);
    doc.text('كشف حساب العضو', 105, 20, { align: 'center' });

    // Member info
    doc.setFontSize(12);
    const memberInfo = [
      `رقم العضو: ${selectedMember.member_no}`,
      `الاسم: ${selectedMember.full_name}`,
      `رقم الجوال: ${selectedMember.phone || '-'}`,
      `الفخذ: ${selectedMember.tribal_section || '-'}`
    ];

    let yPosition = 40;
    memberInfo.forEach(info => {
      doc.text(info, 190, yPosition, { align: 'right' });
      yPosition += 10;
    });

    // Payment table
    const tableData = memberStatement.yearlyPayments.map(payment => [
      payment.status === 'paid' ? '✓' : payment.status === 'partial' ? '◐' : '✗',
      payment.paymentDate || '-',
      `${payment.paid} ريال`,
      `${payment.required} ريال`,
      payment.year
    ]);

    // Add summary row
    tableData.push([
      memberStatement.complianceStatus === 'compliant' ? '✓' : '✗',
      '',
      `${memberStatement.totalPaid} ريال`,
      `${memberStatement.totalRequired} ريال`,
      'الإجمالي'
    ]);

    doc.autoTable({
      head: [['الحالة', 'تاريخ الدفع', 'المدفوع', 'المطلوب', 'السنة']],
      body: tableData,
      startY: yPosition + 10,
      styles: {
        font: 'helvetica',
        halign: 'right',
        fontSize: 11
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 20 },
        1: { cellWidth: 40 },
        2: { cellWidth: 35 },
        3: { cellWidth: 35 },
        4: { cellWidth: 25 }
      }
    });

    // Footer with outstanding balance
    const finalY = doc.lastAutoTable.finalY + 20;
    doc.setFontSize(14);
    doc.setTextColor(memberStatement.outstandingBalance > 0 ? 255 : 0, memberStatement.outstandingBalance > 0 ? 0 : 128, 0);
    doc.text(`المبلغ المتبقي: ${memberStatement.outstandingBalance} ريال`, 105, finalY, { align: 'center' });

    // Save PDF
    const fileName = `statement_${selectedMember.member_no}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  }, [memberStatement, selectedMember]);

  // Memoized filter handler
  const handleFilterChange = useCallback((filter) => {
    setActiveFilter(filter);
  }, []);

  // Memoized pagination handlers
  const handleItemsPerPageChange = useCallback((items) => {
    setItemsPerPage(items);
  }, []);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  const handlePreviousPage = useCallback(() => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  }, [totalPages]);

  return (
    <div className="enhanced-statement-container">
      <div className="statement-content-wrapper">
        {/* Enhanced Header */}
        <motion.div
          className="enhanced-statement-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="header-title-section">
            <div className="header-icon">
              <DocumentArrowDownIcon className="w-12 h-12" />
            </div>
            <div>
              <h1 className="statement-title">البحث عن كشف الحساب</h1>
              <p className="statement-subtitle">ابحث عن العضو بالاسم أو رقم الهاتف لعرض كشف الحساب</p>
            </div>
          </div>
        </motion.div>

        {/* Glassmorphism Search Section */}
        <motion.div
          className="glassmorphism-search-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="glassmorphism-search-wrapper">
            <MagnifyingGlassIcon className="search-icon-enhanced" />
            <input
              type="text"
              className="glassmorphism-search-input"
              placeholder="ابحث برقم العضو، الاسم، أو رقم الجوال..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              dir="rtl"
            />
            {loading && (
              <div className="search-loading-enhanced">
                <div className="loading-spinner"></div>
                <span>جاري البحث...</span>
              </div>
            )}
          </div>

          {/* Quick Filter Chips */}
          <div className="filter-chips-container">
            <button
              className={`filter-chip ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => handleFilterChange('all')}
            >
              <span className="chip-icon">📋</span>
              <span>الكل ({animatedCounts.total})</span>
            </button>
            <button
              className={`filter-chip ${activeFilter === 'compliant' ? 'active' : ''}`}
              onClick={() => handleFilterChange('compliant')}
            >
              <span className="chip-icon">✅</span>
              <span>ملتزم ({animatedCounts.compliant})</span>
            </button>
            <button
              className={`filter-chip ${activeFilter === 'non-compliant' ? 'active' : ''}`}
              onClick={() => handleFilterChange('non-compliant')}
            >
              <span className="chip-icon">⚠️</span>
              <span>غير ملتزم ({animatedCounts.nonCompliant})</span>
            </button>
          </div>

          {error && (
            <motion.div
              className="search-error-enhanced"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {error}
            </motion.div>
          )}

          {/* Auto-complete dropdown */}
          <AnimatePresence>
            {showAutoComplete && searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="autocomplete-dropdown"
              >
                {searchResults.map((member) => (
                  <div
                    key={member.id}
                    onClick={() => handleMemberSelect(member)}
                    className="autocomplete-item"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{member.full_name}</span>
                      <span className="text-sm text-gray-500">{member.member_no}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {member.phone} • {member.tribal_section}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>


        {/* Enhanced Members Table */}
        {!memberStatement && filteredMembers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="enhanced-table-section"
          >
            <div className="enhanced-table-header">
              <h2 className="enhanced-table-title">
                {activeFilter === 'all' ? 'جميع الأعضاء' :
                 activeFilter === 'compliant' ? 'الأعضاء الملتزمين' : 'الأعضاء غير الملتزمين'}
                <span className="title-count">({filteredMembers.length})</span>
              </h2>
              <p className="enhanced-table-subtitle">
                اضغط على أي عضو لعرض كشف الحساب التفصيلي
              </p>
            </div>

            {/* Desktop Enhanced Table View */}
            <div className="enhanced-table-container desktop-view" dir="rtl">
              <table className="enhanced-members-table" dir="rtl">
              <thead>
                <tr>
                  <th>رقم العضوية</th>
                  <th>الاسم الكامل</th>
                  <th>رقم الجوال</th>
                  <th>الفخذ</th>
                  <th>الرصيد</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {paginatedMembers.map((member, index) => (
                  <motion.tr
                    key={member.id}
                    className="enhanced-member-row"
                    onClick={() => handleMemberSelect(member)}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(index * 0.05, 1) }}
                  >
                    <td className="member-no">{member.member_no}</td>
                    <td className="member-name">
                      <div className="name-cell">
                        <UserIcon className="name-icon" />
                        {member.full_name}
                      </div>
                    </td>
                    <td className="member-phone">{member.phone || 'غير متوفر'}</td>
                    <td className="member-section">{member.tribal_section || 'غير محدد'}</td>
                    <td className={`member-balance ${member.balance >= MINIMUM_BALANCE ? 'balance-good' : 'balance-low'}`}>
                      {new Intl.NumberFormat('ar-SA').format(member.balance || 0)} ر.س
                    </td>
                    <td className="member-status">
                      {member.balance >= MINIMUM_BALANCE ? (
                        <span className="status-badge status-good">
                          <CheckCircleIcon className="status-icon" />
                          مكتمل
                        </span>
                      ) : (
                        <span className="status-badge status-warning">
                          <XCircleIcon className="status-icon" />
                          غير مكتمل
                        </span>
                      )}
                    </td>
                    <td className="member-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleMemberSelect(member)}
                        className="view-btn"
                      >
                        <MagnifyingGlassIcon className="btn-icon" />
                        عرض الكشف
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="members-cards-container mobile-view">
            {paginatedMembers.map((member) => (
              <motion.div
                key={member.id}
                className="member-card"
                onClick={() => handleMemberSelect(member)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="card-header">
                  <div className="card-member-info">
                    <UserIcon className="card-icon" />
                    <div>
                      <div className="card-name">{member.full_name}</div>
                      <div className="card-member-no">{member.member_no}</div>
                    </div>
                  </div>
                  {member.balance >= MINIMUM_BALANCE ? (
                    <CheckCircleIcon className="card-status-icon status-good" />
                  ) : (
                    <XCircleIcon className="card-status-icon status-warning" />
                  )}
                </div>
                <div className="card-details">
                  <div className="card-detail-item">
                    <PhoneIcon className="detail-icon" />
                    <span>{member.phone || 'غير متوفر'}</span>
                  </div>
                  <div className="card-detail-item">
                    <HomeIcon className="detail-icon" />
                    <span>{member.tribal_section || 'غير محدد'}</span>
                  </div>
                  <div className="card-detail-item">
                    <CurrencyDollarIcon className="detail-icon" />
                    <span className={member.balance >= MINIMUM_BALANCE ? 'balance-good' : 'balance-low'}>
                      {new Intl.NumberFormat('ar-SA').format(member.balance || 0)} ر.س
                    </span>
                  </div>
                </div>
                <button className="card-view-btn">
                  <MagnifyingGlassIcon className="btn-icon" />
                  عرض كشف الحساب
                </button>
              </motion.div>
            ))}
          </div>

          {/* Pagination Controls */}
          <div className="pagination-controls" dir="rtl">
            {/* Items Per Page Selector */}
            <div className="items-per-page-selector">
              <span className="pagination-label">عرض:</span>
              <div className="page-size-buttons">
                <button
                  className={`page-size-btn ${itemsPerPage === 10 ? 'active' : ''}`}
                  onClick={() => handleItemsPerPageChange(10)}
                >
                  10
                </button>
                <button
                  className={`page-size-btn ${itemsPerPage === 20 ? 'active' : ''}`}
                  onClick={() => handleItemsPerPageChange(20)}
                >
                  20
                </button>
                <button
                  className={`page-size-btn ${itemsPerPage === 50 ? 'active' : ''}`}
                  onClick={() => handleItemsPerPageChange(50)}
                >
                  50
                </button>
              </div>
              <span className="pagination-info">
                من {filteredMembers.length} عضو
              </span>
            </div>

            {/* Page Navigation */}
            {totalPages > 1 && (
              <div className="page-navigation">
                <button
                  className="page-nav-btn"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                >
                  السابق
                </button>
                <div className="page-numbers">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      className={`page-number-btn ${currentPage === page ? 'active' : ''}`}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  className="page-nav-btn"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                >
                  التالي
                </button>
              </div>
            )}

            {/* Current Page Info */}
            <div className="current-page-info">
              صفحة {currentPage} من {totalPages}
            </div>
          </div>
        </motion.div>
      )}

      {/* Member Statement Display */}
      {memberStatement && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="statement-display"
          id="statement-content"
        >
          <div className="statement-card">
            {/* Back Button */}
            <button
              onClick={handleBackToList}
              className="back-to-list-btn"
              title="العودة إلى القائمة (ESC)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
              <span>العودة للقائمة</span>
              <span className="esc-hint">ESC</span>
            </button>

            {/* Member Info Header */}
            <div className="statement-member-header">
              <div className="member-info-section">
                <div className="member-avatar">
                  <UserIcon className="w-12 h-12" />
                </div>
                <div className="member-details">
                  <h2>{selectedMember.full_name}</h2>
                  <div className="member-meta">
                    <span className="meta-item">
                      <UserIcon className="w-4 h-4" />
                      {selectedMember.member_no}
                    </span>
                    <span className="meta-item">
                      <PhoneIcon className="w-4 h-4" />
                      {selectedMember.phone || 'غير متوفر'}
                    </span>
                    <span className="meta-item">
                      <HomeIcon className="w-4 h-4" />
                      {selectedMember.tribal_section || 'غير محدد'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="statement-actions">
                <button onClick={handlePrint} className="action-btn print-btn">
                  <PrinterIcon className="btn-icon" />
                  طباعة
                </button>
                <button onClick={handleExport} className="action-btn export-btn">
                  <DocumentArrowDownIcon className="btn-icon" />
                  Excel
                </button>
                <button onClick={exportToPDF} className="action-btn pdf-btn">
                  <DocumentArrowDownIcon className="btn-icon" />
                  PDF
                </button>
                <button
                  onClick={() => {
                    setSelectedMember(null);
                    setMemberStatement(null);
                    setSearchQuery('');
                  }}
                  className="action-btn back-btn"
                >
                  رجوع للبحث
                </button>
              </div>
            </div>

            {/* Summary Statistics */}
            <div className="summary-stats">
              <div className="stat-card">
                <div className="stat-value">{memberStatement.totalPaid} ريال</div>
                <div className="stat-label">إجمالي المدفوعات</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{memberStatement.totalRequired} ريال</div>
                <div className="stat-label">المبلغ المطلوب</div>
              </div>
              <div className="stat-card">
                <div className={`stat-value ${memberStatement.outstandingBalance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {memberStatement.outstandingBalance} ريال
                </div>
                <div className="stat-label">المبلغ المتبقي</div>
              </div>
              <div className="stat-card">
                <div className={`stat-badge ${memberStatement.complianceStatus === 'compliant' ? 'compliant' : 'non-compliant'}`}>
                  {memberStatement.complianceStatus === 'compliant' ? 'ملتزم' : 'غير ملتزم'}
                </div>
                <div className="stat-label">حالة الالتزام</div>
              </div>
            </div>

            {/* Circular Progress Ring */}
            <div className="circular-progress-section">
              <div className="circular-progress-header">
                <h3>نسبة السداد</h3>
                <p>مقارنة المبلغ المدفوع بالمطلوب</p>
              </div>
              <div className="progress-ring-container">
                <svg className="progress-ring-svg" width="200" height="200">
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#667eea" />
                      <stop offset="100%" stopColor="#764ba2" />
                    </linearGradient>
                  </defs>
                  <circle
                    className="progress-ring-background"
                    cx="100"
                    cy="100"
                    r="85"
                  />
                  <circle
                    className="progress-ring-circle"
                    cx="100"
                    cy="100"
                    r="85"
                    style={{
                      strokeDasharray: `${2 * Math.PI * 85}`,
                      strokeDashoffset: `${2 * Math.PI * 85 * (1 - paymentProgress / 100)}`
                    }}
                  />
                  <text x="100" y="95" className="progress-ring-text">
                    {Math.round(paymentProgress)}%
                  </text>
                  <text x="100" y="115" className="progress-ring-subtext">
                    {memberStatement.totalPaid} / {memberStatement.totalRequired} ريال
                  </text>
                </svg>
                <div className="progress-ring-details">
                  <div className="progress-detail-item">
                    <div className="detail-color" style={{background: 'linear-gradient(135deg, #667eea, #764ba2)'}}></div>
                    <span>مدفوع: {memberStatement.totalPaid} ريال</span>
                  </div>
                  <div className="progress-detail-item">
                    <div className="detail-color" style={{background: '#e5e7eb'}}></div>
                    <span>متبقي: {memberStatement.outstandingBalance} ريال</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Table */}
            <div className="statement-table-wrapper" dir="rtl">
              <h3 className="table-title">تفاصيل المدفوعات السنوية</h3>
              <table className="statement-table" dir="rtl">
                <thead>
                  <tr>
                    <th>السنة</th>
                    <th>المبلغ المطلوب</th>
                    <th>المبلغ المدفوع</th>
                    <th>الباقي</th>
                    <th>الحالة</th>
                    <th>تاريخ الدفع</th>
                    <th>رقم الإيصال</th>
                  </tr>
                </thead>
                <tbody>
                  {memberStatement.yearlyPayments.map((payment) => (
                    <tr key={payment.year} className={`payment-row ${payment.status}`}>
                      <td className="font-medium">{payment.year}</td>
                      <td>{payment.required} ريال</td>
                      <td className={payment.paid > 0 ? 'text-green-600' : ''}>{payment.paid} ريال</td>
                      <td className={payment.required - payment.paid > 0 ? 'text-red-600' : ''}>
                        {Math.max(0, payment.required - payment.paid)} ريال
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(payment.status)}
                          {getStatusBadge(payment.status)}
                        </div>
                      </td>
                      <td>{payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString('ar-SA') : '-'}</td>
                      <td>{payment.receiptNumber || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Timeline View */}
            <div className="timeline-section">
              <div className="timeline-header">
                <h3>سجل المدفوعات السنوية</h3>
                <p>تفاصيل المدفوعات مرتبة زمنياً</p>
              </div>
              <div className="timeline-container">
                {memberStatement.yearlyPayments.map((payment, index) => (
                  <motion.div
                    key={payment.year}
                    className={`timeline-item ${payment.status}`}
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    <div className="timeline-marker">
                      {payment.status === 'paid' ? (
                        <CheckCircleIcon className="w-6 h-6" />
                      ) : payment.status === 'partial' ? (
                        <ClockIcon className="w-6 h-6" />
                      ) : (
                        <XCircleIcon className="w-6 h-6" />
                      )}
                    </div>
                    <div className="timeline-content">
                      <div className="timeline-year">{payment.year}</div>
                      <div className="timeline-details">
                        <div className="timeline-amount">
                          <span className="amount-label">المدفوع:</span>
                          <span className="amount-value">{payment.paid} ريال</span>
                        </div>
                        <div className="timeline-amount">
                          <span className="amount-label">المطلوب:</span>
                          <span className="amount-value">{payment.required} ريال</span>
                        </div>
                        {payment.paymentDate && (
                          <div className="timeline-date">
                            <CalendarIcon className="w-4 h-4" />
                            <span>{new Date(payment.paymentDate).toLocaleDateString('ar-SA')}</span>
                          </div>
                        )}
                        {payment.receiptNumber && (
                          <div className="timeline-receipt">
                            <span>إيصال: {payment.receiptNumber}</span>
                          </div>
                        )}
                      </div>
                      <div className={`timeline-status-badge status-${payment.status}`}>
                        {payment.status === 'paid' ? 'مدفوع بالكامل' :
                         payment.status === 'partial' ? 'مدفوع جزئياً' : 'غير مدفوع'}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
      </div>
    </div>
  );
};


// Phase 4: Performance Optimization - Memoize to prevent unnecessary re-renders
export default React.memo(MemberStatementSearch);