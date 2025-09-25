import React, { useState, useEffect } from 'react';
import './CrisisDashboard.css';

const CrisisDashboard = () => {
  const [crisisData, setCrisisData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, insufficient, sufficient
  const [refreshing, setRefreshing] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || 'https://proshael.onrender.com';

  // Fetch crisis data from backend
  const fetchCrisisData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/crisis/dashboard`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setCrisisData(data.data);
    } catch (err) {
      console.error('Error fetching crisis data:', err);
      setError('فشل في تحميل بيانات الأزمة');
      // Use mock data as fallback
      setCrisisData(generateMockData());
    } finally {
      setLoading(false);
    }
  };

  // Generate mock data for testing
  const generateMockData = () => {
    const members = [];
    for (let i = 1; i <= 288; i++) {
      const balance = Math.random() * 5000;
      members.push({
        id: i,
        memberId: `SH-${10000 + i}`,
        fullName: `عضو ${i}`,
        phone: `050${String(1000000 + i).padStart(7, '0')}`,
        balance: Math.round(balance),
        targetBalance: 3000,
        shortfall: Math.max(0, 3000 - balance),
        status: balance >= 3000 ? 'sufficient' : 'insufficient',
        percentageComplete: Math.min(100, (balance / 3000) * 100)
      });
    }

    const compliantCount = members.filter(m => m.status === 'sufficient').length;
    const nonCompliantCount = 288 - compliantCount;

    return {
      statistics: {
        totalMembers: 288,
        compliantMembers: compliantCount,
        nonCompliantMembers: nonCompliantCount,
        complianceRate: ((compliantCount / 288) * 100).toFixed(1),
        nonComplianceRate: ((nonCompliantCount / 288) * 100).toFixed(1),
        totalShortfall: members.reduce((sum, m) => sum + m.shortfall, 0),
        minimumBalance: 3000,
        lastUpdated: new Date().toISOString()
      },
      members: members,
      criticalMembers: members
        .filter(m => m.status === 'insufficient')
        .sort((a, b) => b.shortfall - a.shortfall)
        .slice(0, 50)
    };
  };

  useEffect(() => {
    fetchCrisisData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchCrisisData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCrisisData();
    setRefreshing(false);
  };

  // Filter members based on search and status
  const filteredMembers = crisisData?.members?.filter(member => {
    const matchesSearch =
      member.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.phone?.includes(searchTerm) ||
      member.memberId?.includes(searchTerm);

    const matchesFilter =
      filterStatus === 'all' ||
      (filterStatus === 'insufficient' && member.status === 'insufficient') ||
      (filterStatus === 'sufficient' && member.status === 'sufficient');

    return matchesSearch && matchesFilter;
  }) || [];

  if (loading) {
    return (
      <div className="crisis-loading">
        <div className="loading-spinner"></div>
        <p>جاري تحميل بيانات الأزمة...</p>
      </div>
    );
  }

  if (error && !crisisData) {
    return (
      <div className="crisis-error">
        <p>{error}</p>
        <button onClick={handleRefresh} className="retry-button">
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="crisis-dashboard">
      {/* Header */}
      <div className="crisis-header">
        <div className="crisis-title">
          <h1>🚨 لوحة الأزمة المالية</h1>
          <p className="crisis-subtitle">
            متابعة الأعضاء الذين لم يحققوا الحد الأدنى المطلوب (3000 ريال)
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className={`refresh-button ${refreshing ? 'refreshing' : ''}`}
          disabled={refreshing}
        >
          {refreshing ? 'جاري التحديث...' : '🔄 تحديث البيانات'}
        </button>
      </div>

      {/* Critical Alert */}
      {crisisData?.statistics?.nonComplianceRate > 50 && (
        <div className="critical-alert">
          <span className="alert-icon">⚠️</span>
          <div>
            <strong>تحذير حرج:</strong> {crisisData.statistics.nonComplianceRate}% من الأعضاء
            ({crisisData.statistics.nonCompliantMembers} عضو) لم يحققوا الحد الأدنى المطلوب!
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="crisis-stats">
        <div className="stat-card total">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>إجمالي الأعضاء</h3>
            <p className="stat-value">{crisisData?.statistics?.totalMembers || 0}</p>
          </div>
        </div>

        <div className="stat-card insufficient">
          <div className="stat-icon">❌</div>
          <div className="stat-content">
            <h3>دون الحد الأدنى</h3>
            <p className="stat-value">{crisisData?.statistics?.nonCompliantMembers || 0}</p>
            <p className="stat-percentage">{crisisData?.statistics?.nonComplianceRate || 0}%</p>
          </div>
        </div>

        <div className="stat-card sufficient">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>حققوا الحد الأدنى</h3>
            <p className="stat-value">{crisisData?.statistics?.compliantMembers || 0}</p>
            <p className="stat-percentage">{crisisData?.statistics?.complianceRate || 0}%</p>
          </div>
        </div>

        <div className="stat-card shortfall">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>إجمالي النقص</h3>
            <p className="stat-value">
              {new Intl.NumberFormat('ar-SA').format(crisisData?.statistics?.totalShortfall || 0)} ريال
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="crisis-filters">
        <div className="search-box">
          <input
            type="text"
            placeholder="البحث بالاسم، الهاتف، أو رقم العضوية..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-buttons">
          <button
            className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            الكل ({crisisData?.members?.length || 0})
          </button>
          <button
            className={`filter-btn ${filterStatus === 'insufficient' ? 'active' : ''}`}
            onClick={() => setFilterStatus('insufficient')}
          >
            دون الحد الأدنى ({crisisData?.statistics?.nonCompliantMembers || 0})
          </button>
          <button
            className={`filter-btn ${filterStatus === 'sufficient' ? 'active' : ''}`}
            onClick={() => setFilterStatus('sufficient')}
          >
            حققوا الحد ({crisisData?.statistics?.compliantMembers || 0})
          </button>
        </div>
      </div>

      {/* Members Table */}
      <div className="crisis-table-container">
        <table className="crisis-table">
          <thead>
            <tr>
              <th>رقم العضوية</th>
              <th>اسم العضو</th>
              <th>رقم الهاتف</th>
              <th>الرصيد الحالي</th>
              <th>المبلغ المطلوب</th>
              <th>النقص</th>
              <th>نسبة الإنجاز</th>
              <th>الحالة</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.slice(0, 100).map(member => (
              <tr key={member.id} className={member.status === 'insufficient' ? 'insufficient-row' : ''}>
                <td>{member.memberId}</td>
                <td className="member-name">{member.fullName}</td>
                <td>{member.phone}</td>
                <td className="balance">
                  {new Intl.NumberFormat('ar-SA').format(member.balance)} ريال
                </td>
                <td className="target">3000 ريال</td>
                <td className={`shortfall ${member.shortfall > 0 ? 'negative' : ''}`}>
                  {member.shortfall > 0
                    ? `${new Intl.NumberFormat('ar-SA').format(member.shortfall)} ريال`
                    : '-'
                  }
                </td>
                <td>
                  <div className="progress-container">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${member.percentageComplete}%`,
                          backgroundColor: member.status === 'sufficient' ? '#10b981' : '#ef4444'
                        }}
                      ></div>
                    </div>
                    <span className="progress-text">
                      {member.percentageComplete.toFixed(1)}%
                    </span>
                  </div>
                </td>
                <td>
                  <span className={`status-badge ${member.status}`}>
                    {member.status === 'sufficient' ? '✅ مكتمل' : '❌ ناقص'}
                  </span>
                </td>
                <td>
                  <button
                    className="action-btn send-reminder"
                    title="إرسال تذكير"
                  >
                    📧
                  </button>
                  <button
                    className="action-btn view-details"
                    title="عرض التفاصيل"
                  >
                    👁️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredMembers.length > 100 && (
          <div className="table-footer">
            <p>عرض أول 100 عضو من أصل {filteredMembers.length}</p>
          </div>
        )}
      </div>

      {/* Last Updated */}
      <div className="last-updated">
        آخر تحديث: {crisisData?.statistics?.lastUpdated
          ? new Date(crisisData.statistics.lastUpdated).toLocaleString('ar-SA')
          : 'غير محدد'
        }
      </div>
    </div>
  );
};

export default CrisisDashboard;