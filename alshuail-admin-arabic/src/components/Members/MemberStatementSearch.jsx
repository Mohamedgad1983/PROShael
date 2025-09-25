import React, { useState, useCallback, useRef } from 'react';
import './MemberStatementSearch.css';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const MemberStatementSearch = () => {
  const [searchType, setSearchType] = useState('phone'); // phone, name, memberId
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const statementRef = useRef(null);

  // Mock data - Replace with API call
  const mockMembers = [
    {
      memberId: 'SH-10001',
      fullName: 'أحمد محمد الشعيل',
      phone: '0501234567',
      country: 'SA',
      tribalSection: 'الفخذ الأول',
      balance: 2500,
      status: 'insufficient',
      targetBalance: 3000,
      shortfall: 500,
      payments: [
        { year: 2021, amount: 500, status: 'paid' },
        { year: 2022, amount: 500, status: 'paid' },
        { year: 2023, amount: 500, status: 'paid' },
        { year: 2024, amount: 500, status: 'paid' },
        { year: 2025, amount: 500, status: 'paid' }
      ],
      totalContributions: 2500
    },
    {
      memberId: 'SH-10002',
      fullName: 'محمد عبدالله الشعيل',
      phone: '96551234567',
      country: 'KW',
      tribalSection: 'الفخذ الثاني',
      balance: 3500,
      status: 'sufficient',
      targetBalance: 3000,
      shortfall: 0,
      payments: [
        { year: 2021, amount: 700, status: 'paid' },
        { year: 2022, amount: 700, status: 'paid' },
        { year: 2023, amount: 700, status: 'paid' },
        { year: 2024, amount: 700, status: 'paid' },
        { year: 2025, amount: 700, status: 'paid' }
      ],
      totalContributions: 3500
    }
  ];

  const handleSearch = useCallback(() => {
    setLoading(true);
    setError('');
    setSelectedMember(null);

    setTimeout(() => {
      let results = [];

      if (searchType === 'phone') {
        // Exact match for phone (supports both Saudi and Kuwaiti formats)
        const cleanPhone = searchQuery.replace(/\s/g, '');
        results = mockMembers.filter(m =>
          m.phone.replace(/\s/g, '') === cleanPhone
        );
      } else if (searchType === 'name') {
        // Fuzzy search for Arabic names
        results = mockMembers.filter(m =>
          m.fullName.includes(searchQuery)
        );
      } else if (searchType === 'memberId') {
        // Direct lookup by member ID
        results = mockMembers.filter(m =>
          m.memberId.toUpperCase() === searchQuery.toUpperCase()
        );
      }

      if (results.length === 0) {
        setError('لم يتم العثور على نتائج. تأكد من البيانات المدخلة.');
      } else if (results.length === 1) {
        setSelectedMember(results[0]);
        setSearchResults([]);
      } else {
        setSearchResults(results);
      }

      setLoading(false);
    }, 500);
  }, [searchType, searchQuery]);

  const generatePDF = async () => {
    if (!selectedMember || !statementRef.current) return;

    const canvas = await html2canvas(statementRef.current, {
      scale: 2,
      useCORS: true,
      logging: false
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`statement-${selectedMember.memberId}.pdf`);
  };

  const getStatusColor = (status) => {
    return status === 'sufficient' ? '#34c759' : '#ff3b30';
  };

  const getStatusText = (status) => {
    return status === 'sufficient' ? 'ملتزم' : 'غير ملتزم';
  };

  const formatPhone = (phone, country) => {
    if (country === 'KW') {
      return `+965 ${phone}`;
    }
    return `+966 ${phone}`;
  };

  return (
    <div className="statement-search-container">
      <div className="search-header">
        <h1 className="search-title">البحث عن كشف الحساب</h1>
        <p className="search-subtitle">ابحث عن كشف حسابك باستخدام رقم الهاتف، الاسم، أو رقم العضوية</p>
      </div>

      {/* Search Section */}
      <div className="search-section glass-card">
        <div className="search-type-selector">
          <button
            className={`type-btn ${searchType === 'phone' ? 'active' : ''}`}
            onClick={() => setSearchType('phone')}
          >
            <svg className="type-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            رقم الهاتف
          </button>
          <button
            className={`type-btn ${searchType === 'name' ? 'active' : ''}`}
            onClick={() => setSearchType('name')}
          >
            <svg className="type-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            الاسم
          </button>
          <button
            className={`type-btn ${searchType === 'memberId' ? 'active' : ''}`}
            onClick={() => setSearchType('memberId')}
          >
            <svg className="type-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
            </svg>
            رقم العضوية
          </button>
        </div>

        <div className="search-input-group">
          <input
            type="text"
            className="search-input"
            placeholder={
              searchType === 'phone' ? 'أدخل رقم الهاتف (مثال: 0501234567 أو 96551234567)' :
              searchType === 'name' ? 'أدخل الاسم (يمكن البحث بجزء من الاسم)' :
              'أدخل رقم العضوية (مثال: SH-10001)'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            dir={searchType === 'name' ? 'rtl' : 'ltr'}
          />
          <button className="search-btn" onClick={handleSearch} disabled={loading || !searchQuery}>
            {loading ? (
              <div className="spinner"></div>
            ) : (
              <>
                <svg className="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                بحث
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="error-message">
            <svg className="error-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}
      </div>

      {/* Search Results List */}
      {searchResults.length > 1 && (
        <div className="results-list glass-card">
          <h3 className="results-title">نتائج البحث ({searchResults.length})</h3>
          <div className="results-grid">
            {searchResults.map((member) => (
              <div
                key={member.memberId}
                className="result-card"
                onClick={() => {
                  setSelectedMember(member);
                  setSearchResults([]);
                }}
              >
                <div className="result-header">
                  <span className="result-id">{member.memberId}</span>
                  <span className={`result-status ${member.status}`}>
                    {getStatusText(member.status)}
                  </span>
                </div>
                <h4 className="result-name">{member.fullName}</h4>
                <p className="result-phone">{formatPhone(member.phone, member.country)}</p>
                <div className="result-balance">
                  <span className="balance-label">الرصيد:</span>
                  <span className="balance-amount" style={{ color: getStatusColor(member.status) }}>
                    {member.balance.toLocaleString()} ريال
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Member Statement */}
      {selectedMember && (
        <div className="statement-container glass-card">
          <div className="statement-actions">
            <button className="download-btn" onClick={generatePDF}>
              <svg className="download-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              تحميل PDF
            </button>
            <button className="print-btn" onClick={() => window.print()}>
              <svg className="print-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              طباعة
            </button>
          </div>

          <div className="statement-content" ref={statementRef}>
            <div className="statement-header">
              <h2 className="statement-title">كشف حساب العضو</h2>
              <p className="statement-date">التاريخ: {new Date().toLocaleDateString('ar-SA')}</p>
            </div>

            {/* Member Info */}
            <div className="member-info-section">
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">رقم العضوية:</span>
                  <span className="info-value">{selectedMember.memberId}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">الاسم:</span>
                  <span className="info-value">{selectedMember.fullName}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">رقم الهاتف:</span>
                  <span className="info-value">{formatPhone(selectedMember.phone, selectedMember.country)}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">الفخذ:</span>
                  <span className="info-value">{selectedMember.tribalSection}</span>
                </div>
              </div>
            </div>

            {/* Balance Status */}
            <div className={`balance-status-section ${selectedMember.status}`}>
              <div className="status-header">
                <h3 className="status-title">حالة الرصيد</h3>
                <span className={`status-badge ${selectedMember.status}`}>
                  {getStatusText(selectedMember.status)}
                </span>
              </div>

              <div className="balance-details">
                <div className="balance-item current">
                  <span className="balance-label">الرصيد الحالي:</span>
                  <span className="balance-value" style={{ color: getStatusColor(selectedMember.status) }}>
                    {selectedMember.balance.toLocaleString()} ريال
                  </span>
                </div>
                <div className="balance-item target">
                  <span className="balance-label">الرصيد المطلوب:</span>
                  <span className="balance-value">3,000 ريال</span>
                </div>
                {selectedMember.shortfall > 0 && (
                  <div className="balance-item shortfall">
                    <span className="balance-label">المبلغ المتبقي:</span>
                    <span className="balance-value" style={{ color: '#ff3b30' }}>
                      {selectedMember.shortfall.toLocaleString()} ريال
                    </span>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="progress-container">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.min((selectedMember.balance / 3000) * 100, 100)}%`,
                      backgroundColor: getStatusColor(selectedMember.status)
                    }}
                  />
                </div>
                <span className="progress-text">
                  {((selectedMember.balance / 3000) * 100).toFixed(1)}% من الهدف
                </span>
              </div>
            </div>

            {/* Payment History */}
            <div className="payment-history-section">
              <h3 className="history-title">سجل المدفوعات (2021-2025)</h3>
              <table className="payment-table">
                <thead>
                  <tr>
                    <th>السنة</th>
                    <th>المبلغ</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedMember.payments.map((payment) => (
                    <tr key={payment.year}>
                      <td>{payment.year}</td>
                      <td>{payment.amount.toLocaleString()} ريال</td>
                      <td>
                        <span className={`payment-status ${payment.status}`}>
                          {payment.status === 'paid' ? 'مدفوع' : 'معلق'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td><strong>الإجمالي</strong></td>
                    <td colSpan="2">
                      <strong>{selectedMember.totalContributions.toLocaleString()} ريال</strong>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Footer */}
            <div className="statement-footer">
              <p className="footer-text">هذا الكشف صادر من نظام إدارة صندوق عائلة الشعيل</p>
              <p className="footer-text">للاستفسار: 0501234567</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberStatementSearch;