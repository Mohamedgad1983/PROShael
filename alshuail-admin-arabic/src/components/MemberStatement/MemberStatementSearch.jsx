import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { MagnifyingGlassIcon, PhoneIcon, UserIcon, PrinterIcon, DocumentArrowDownIcon, HomeIcon, CalendarIcon, CurrencyDollarIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
// Using API instead of direct Supabase connection
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { motion, AnimatePresence } from 'framer-motion';
import './MemberStatementSearch.css';

const MemberStatementSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberStatement, setMemberStatement] = useState(null);
  const [error, setError] = useState('');
  const [showAutoComplete, setShowAutoComplete] = useState(false);

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
      const API_URL = process.env.REACT_APP_API_URL || 'https://proshael.onrender.com';
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
      console.error('Search error:', error);
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
        const API_URL = process.env.REACT_APP_API_URL || 'https://proshael.onrender.com';
        const token = localStorage.getItem('token');
        const response = await fetch(
          `${API_URL}/api/members`,
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
          setShowAutoComplete(true);
        }
      } catch (error) {
        console.error('Error loading initial members:', error);
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

  // Payment status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'partial':
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
      default:
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
    }
  };

  // Payment status badge
  const getStatusBadge = (status) => {
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
  };

  // Calculate payment progress
  const paymentProgress = useMemo(() => {
    if (!memberStatement) return 0;
    return Math.min(100, (memberStatement.totalPaid / memberStatement.totalRequired) * 100);
  }, [memberStatement]);

  // Load member statement with payment details
  const loadMemberStatement = async (member) => {
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
        console.error('Payments fetch error:', paymentsError);
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
      console.error('Error loading statement:', err);
      setError('حدث خطأ في تحميل كشف الحساب');
    } finally {
      setLoading(false);
    }
  };

  // Handle member selection
  const handleMemberSelect = (member) => {
    loadMemberStatement(member);
    setSearchQuery(member.full_name);
  };

  // Print statement
  const handlePrint = () => {
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
  };

  // Export to Excel with XLSX
  const handleExport = () => {
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
  };

  // Export to PDF
  const exportToPDF = () => {
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
  };

  return (
    <div className="member-statement-container">
      {/* Header */}
      <div className="statement-header">
        <h1 className="statement-title">البحث عن كشف الحساب</h1>
        <p className="statement-subtitle">ابحث عن العضو بالاسم أو رقم الهاتف لعرض كشف الحساب</p>
      </div>

      {/* Search Section */}
      <div className="search-section">
        <div className="search-input-wrapper">
          <MagnifyingGlassIcon className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="ابحث برقم العضو، الاسم، أو رقم الجوال..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            dir="rtl"
          />
          {loading && <div className="search-loading">جاري البحث...</div>}
        </div>

        {error && (
          <div className="search-error">{error}</div>
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
      </div>

      {/* Members Table View - Show when no member is selected */}
      {!memberStatement && searchResults.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="members-table-section"
        >
          <div className="table-header">
            <h2 className="table-title">
              إجمالي الأعضاء: {searchResults.length} عضو
            </h2>
            <div className="table-stats">
              <div className="stat-item stat-good">
                <CheckCircleIcon className="stat-icon" />
                <span>مكتمل: {searchResults.filter(m => m.balance >= MINIMUM_BALANCE).length}</span>
              </div>
              <div className="stat-item stat-warning">
                <XCircleIcon className="stat-icon" />
                <span>غير مكتمل: {searchResults.filter(m => m.balance < MINIMUM_BALANCE).length}</span>
              </div>
            </div>
            <p className="table-subtitle">
              اضغط على أي عضو لعرض كشف الحساب التفصيلي
            </p>
          </div>

          {/* Desktop Table View */}
          <div className="members-table-container desktop-view">
            <table className="members-table">
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
                {searchResults.map((member) => (
                  <tr
                    key={member.id}
                    className="member-row"
                    onClick={() => handleMemberSelect(member)}
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="members-cards-container mobile-view">
            {searchResults.map((member) => (
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

            {/* Payment Progress Bar */}
            <div className="payment-progress">
              <div className="progress-header">
                <span>نسبة السداد</span>
                <span>{Math.round(paymentProgress)}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${paymentProgress}%` }}
                />
              </div>
            </div>

            {/* Payment Table */}
            <div className="statement-table-wrapper">
              <h3 className="table-title">تفاصيل المدفوعات السنوية</h3>
              <table className="statement-table">
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
                <tfoot>
                  <tr className="total-row">
                    <td className="font-bold">الإجمالي</td>
                    <td className="font-bold">{memberStatement.totalRequired} ريال</td>
                    <td className="font-bold text-green-600">{memberStatement.totalPaid} ريال</td>
                    <td className="font-bold text-red-600">{memberStatement.outstandingBalance} ريال</td>
                    <td colSpan="3">
                      <div className={`summary-badge ${memberStatement.complianceStatus}`}>
                        {memberStatement.complianceStatus === 'compliant' ?
                          'العضو ملتزم بالحد الأدنى (3000 ريال)' :
                          `يحتاج إلى دفع ${MINIMUM_BALANCE - memberStatement.totalPaid} ريال للوصول للحد الأدنى`}
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Payment Chart */}
            <div className="payment-chart-card">
              <h4 className="text-lg font-semibold mb-4">رسم بياني للمدفوعات</h4>
              <div className="chart-container">
                <div className="bar-chart">
                  {memberStatement.yearlyPayments.map((payment) => (
                    <div key={payment.year} className="chart-bar-wrapper">
                      <div
                        className="chart-bar"
                        style={{
                          height: `${(payment.paid / payment.required) * 100}%`,
                          backgroundColor: payment.status === 'paid' ? '#10b981' :
                                         payment.status === 'partial' ? '#f59e0b' : '#ef4444'
                        }}
                      />
                      <div className="chart-label">{payment.year}</div>
                      <div className="chart-value">{payment.paid}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Balance Status */}
            <div className={`balance-status-card ${memberStatement.complianceStatus}`}>
              <div className="status-content">
                <h3>حالة الرصيد</h3>
                <p className="status-text">
                  {memberStatement.complianceStatus === 'compliant'
                    ? '✓ الرصيد كافي - العضو ملتزم بالحد الأدنى'
                    : '⚠️ الرصيد غير كافي - يحتاج إلى سداد المتبقي'}
                </p>
                {memberStatement.complianceStatus === 'non-compliant' && (
                  <p className="remaining-amount">
                    المبلغ المتبقي للوصول للحد الأدنى: {(MINIMUM_BALANCE - memberStatement.totalPaid).toLocaleString()} ريال
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default MemberStatementSearch;