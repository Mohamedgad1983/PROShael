import React, { useState, useCallback } from 'react';
import { MagnifyingGlassIcon, PhoneIcon, UserIcon, PrinterIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import './MemberStatementSearch.css';

const MemberStatementSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [error, setError] = useState('');

  // Debounced search function
  const searchMembers = useCallback(async (query) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      const response = await fetch(
        `${API_URL}/api/member-statement/search?query=${encodeURIComponent(query)}`
      );

      if (!response.ok) {
        throw new Error('فشل البحث');
      }

      const data = await response.json();

      if (data.success) {
        setSearchResults(data.results || []);
      } else {
        setError(data.message || 'حدث خطأ أثناء البحث');
      }
    } catch (error) {
      console.error('Search error:', error);
      setError('حدث خطأ في الاتصال بالخادم');

      // Use mock data for testing
      const mockResults = [
        {
          id: '1',
          member_id: 'SH-10001',
          name: 'أحمد محمد الشعيل',
          phone: '0501234567',
          payments: { 2021: 1000, 2022: 1500, 2023: 2000, 2024: 2500, 2025: 3000 },
          total: 10000,
          status: 'sufficient'
        },
        {
          id: '2',
          member_id: 'SH-10002',
          name: 'ابراهيم فلاح العايد',
          phone: '0501000000',
          payments: { 2021: 600, 2022: 600, 2023: 300, 2024: 0, 2025: 0 },
          total: 1500,
          status: 'insufficient'
        }
      ].filter(member =>
        member.name.includes(query) || member.phone.includes(query)
      );

      setSearchResults(mockResults);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle search input change with debouncing
  React.useEffect(() => {
    const timer = setTimeout(() => {
      searchMembers(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, searchMembers]);

  // Handle member selection
  const handleMemberSelect = (member) => {
    setSelectedMember(member);
  };

  // Print statement
  const handlePrint = () => {
    window.print();
  };

  // Export to Excel
  const handleExport = () => {
    if (!selectedMember) return;

    // Create CSV content
    const headers = ['السنة', 'المبلغ'];
    const rows = Object.entries(selectedMember.payments).map(([year, amount]) => [year, amount]);
    rows.push(['الإجمالي', selectedMember.total]);

    const csvContent = [
      `كشف حساب العضو: ${selectedMember.name}`,
      `رقم الهاتف: ${selectedMember.phone}`,
      '',
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `statement_${selectedMember.member_id}_${Date.now()}.csv`;
    link.click();
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
            placeholder="ابحث بالاسم أو رقم الهاتف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            dir="rtl"
          />
          {loading && <div className="search-loading">جاري البحث...</div>}
        </div>

        {error && (
          <div className="search-error">{error}</div>
        )}
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && !selectedMember && (
        <div className="search-results">
          <h3 className="results-title">نتائج البحث ({searchResults.length})</h3>
          <div className="results-list">
            {searchResults.map((member) => (
              <div
                key={member.id}
                className="result-item"
                onClick={() => handleMemberSelect(member)}
              >
                <div className="result-info">
                  <div className="result-name">
                    <UserIcon className="result-icon" />
                    {member.name}
                  </div>
                  <div className="result-phone">
                    <PhoneIcon className="result-icon" />
                    {member.phone}
                  </div>
                </div>
                <div className={`result-status ${member.status}`}>
                  {member.total} ريال
                  {member.status === 'insufficient' && (
                    <span className="status-badge">تحت الحد الأدنى</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Member Statement Display */}
      {selectedMember && (
        <div className="statement-display">
          <div className="statement-card">
            {/* Member Info Header */}
            <div className="statement-member-header">
              <div className="member-info-section">
                <h2>{selectedMember.name}</h2>
                <p>رقم العضوية: {selectedMember.member_id}</p>
                <p>رقم الهاتف: {selectedMember.phone}</p>
              </div>
              <div className="statement-actions">
                <button onClick={handlePrint} className="action-btn print-btn">
                  <PrinterIcon className="btn-icon" />
                  طباعة
                </button>
                <button onClick={handleExport} className="action-btn export-btn">
                  <DocumentArrowDownIcon className="btn-icon" />
                  تصدير
                </button>
                <button
                  onClick={() => setSelectedMember(null)}
                  className="action-btn back-btn"
                >
                  رجوع للبحث
                </button>
              </div>
            </div>

            {/* Payment Table */}
            <div className="statement-table-wrapper">
              <table className="statement-table">
                <thead>
                  <tr>
                    <th>السنة</th>
                    <th>المبلغ المدفوع</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(selectedMember.payments).map(([year, amount]) => (
                    <tr key={year}>
                      <td>{year}</td>
                      <td>{amount.toLocaleString()} ريال</td>
                      <td>
                        <span className={`payment-status ${amount > 0 ? 'paid' : 'unpaid'}`}>
                          {amount > 0 ? 'مدفوع' : 'غير مدفوع'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="total-row">
                    <td>الإجمالي</td>
                    <td colSpan="2" className={`total-amount ${selectedMember.status}`}>
                      {selectedMember.total.toLocaleString()} ريال
                      {selectedMember.status === 'insufficient' && (
                        <span className="minimum-notice">
                          (الحد الأدنى: 3000 ريال)
                        </span>
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Balance Status */}
            <div className={`balance-status-card ${selectedMember.status}`}>
              <div className="status-content">
                <h3>حالة الرصيد</h3>
                <p className="status-text">
                  {selectedMember.status === 'sufficient'
                    ? '✓ الرصيد كافي - العضو ملتزم بالحد الأدنى'
                    : '⚠️ الرصيد غير كافي - يحتاج إلى سداد المتبقي'}
                </p>
                {selectedMember.status === 'insufficient' && (
                  <p className="remaining-amount">
                    المبلغ المتبقي: {(3000 - selectedMember.total).toLocaleString()} ريال
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberStatementSearch;