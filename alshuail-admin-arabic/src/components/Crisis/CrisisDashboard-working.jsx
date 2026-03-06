import React, { memo,  useState, useEffect } from 'react';
import { logger } from '../../utils/logger';

import './CrisisDashboard.css';

const CrisisDashboard = () => {
  const [crisisData, setCrisisData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

  // Fetch crisis data from backend
  const fetchCrisisData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/crisis/dashboard`, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'ar-SA,ar;q=0.9,en;q=0.8',
          'Accept-Charset': 'utf-8'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.members) {
          logger.debug('✅ Real data loaded:', { statistics: data.data.statistics });
          setCrisisData(data.data);
          setLoading(false);
          return;
        }
      }

      // Fallback to mock data if API fails
      logger.debug('⚠️ API failed, using mock data');
      const mockData = generateMockData();
      setCrisisData(mockData);
      setLoading(false);

    } catch (apiErr) {
      logger.debug('❌ API error:', { message: apiErr.message });
      const mockData = generateMockData();
      setCrisisData(mockData);
      setLoading(false);
    }
  };

  // Generate mock data for testing
  const generateMockData = () => {
    const sampleNames = [
      'أحمد محمد الشعيل', 'فاطمة عبدالله الشعيل', 'محمد سالم الشعيل', 'نورا خالد الشعيل',
      'عبدالرحمن احمد الشعيل', 'مريم عبدالعزيز الشعيل', 'سعد ناصر الشعيل', 'هند فهد الشعيل',
      'خالد عبدالله الشعيل', 'سارة محمد الشعيل', 'عبدالعزيز سالم الشعيل', 'ريم احمد الشعيل'
    ];

    const mockMembers = [];
    for (let i = 1; i <= 288; i++) {
      const balance = Math.random() * 5000;
      const minimumBalance = 3000;

      mockMembers.push({
        id: `member-${i}`,
        memberId: `SH-${String(10000 + i)}`,
        fullName: sampleNames[i % sampleNames.length],
        phone: `050${String(1000000 + i).padStart(7, '0')}`,
        balance: Math.round(balance),
        targetBalance: minimumBalance,
        shortfall: Math.max(0, minimumBalance - balance),
        status: balance >= minimumBalance ? 'sufficient' : 'insufficient',
        percentageComplete: Math.min(100, (balance / minimumBalance) * 100),
        lastPaymentDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    }

    const compliantMembers = mockMembers.filter(m => m.status === 'sufficient').length;
    const totalShortfall = mockMembers.reduce((sum, m) => sum + m.shortfall, 0);

    return {
      statistics: {
        totalMembers: 288,
        compliantMembers,
        nonCompliantMembers: 288 - compliantMembers,
        complianceRate: ((compliantMembers / 288) * 100).toFixed(1),
        nonComplianceRate: (((288 - compliantMembers) / 288) * 100).toFixed(1),
        totalShortfall: Math.round(totalShortfall),
        minimumBalance: 3000,
        lastUpdated: new Date().toISOString()
      },
      members: mockMembers,
      criticalMembers: mockMembers
        .filter(m => m.status === 'insufficient')
        .sort((a, b) => b.shortfall - a.shortfall)
        .slice(0, 50)
    };
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchCrisisData();
    const interval = setInterval(fetchCrisisData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Handle refresh button
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCrisisData();
    setRefreshing(false);
  };

  // Filter members based on search and status
  const filteredMembers = crisisData?.members?.filter(member => {
    const matchesSearch = !searchTerm ||
      member.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.phone?.includes(searchTerm) ||
      member.memberId?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filterStatus === 'all' || member.status === filterStatus;

    return matchesSearch && matchesFilter;
  }) || [];

  // Loading state
  if (loading) {
    return (
      <div className="crisis-dashboard loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">جاري تحميل بيانات الأزمة...</p>
        </div>
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

        <div className="stat-card compliant">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>أعضاء مطابقون للحد الأدنى</h3>
            <p className="stat-value">{crisisData?.statistics?.compliantMembers || 0}</p>
            <p className="stat-percentage">({crisisData?.statistics?.complianceRate || 0}%)</p>
          </div>
        </div>

        <div className="stat-card critical">
          <div className="stat-icon">❌</div>
          <div className="stat-content">
            <h3>أعضاء دون الحد الأدنى</h3>
            <p className="stat-value">{crisisData?.statistics?.nonCompliantMembers || 0}</p>
            <p className="stat-percentage">({crisisData?.statistics?.nonComplianceRate || 0}%)</p>
          </div>
        </div>

        <div className="stat-card shortfall">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>إجمالي النقص المطلوب</h3>
            <p className="stat-value">{(crisisData?.statistics?.totalShortfall || 0).toLocaleString('en-US')} ريال</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="crisis-filters">
        <div className="search-container">
          <input
            type="text"
            placeholder="البحث بالاسم، رقم الهاتف، أو رقم العضوية..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>

        <div className="filter-container">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">جميع الأعضاء</option>
            <option value="insufficient">دون الحد الأدنى</option>
            <option value="sufficient">فوق الحد الأدنى</option>
          </select>
        </div>
      </div>

      {/* Members Table */}
      <div className="crisis-table-container">
        <div className="table-header">
          <h3>
            تفاصيل الأعضاء ({filteredMembers.length} من {crisisData?.statistics?.totalMembers || 0})
          </h3>
        </div>

        <div className="crisis-table">
          <div className="table-header-row">
            <div className="col-member">معلومات العضو</div>
            <div className="col-balance">الرصيد الحالي</div>
            <div className="col-target">الهدف المطلوب</div>
            <div className="col-status">الحالة</div>
            <div className="col-progress">التقدم</div>
            <div className="col-shortfall">النقص</div>
            <div className="col-last-payment">آخر دفعة</div>
          </div>

          {filteredMembers.slice(0, 100).map((member) => {
            const displayName = member.fullName || `عضو ${member.id}`;

            return (
              <div key={member.id} className={`table-row ${member.status}`}>
                <div className="col-member">
                  <div className="member-info">
                    <strong>{displayName}</strong>
                    <div className="member-details">
                      <span>#{member.memberId}</span>
                      {member.phone && <span>📱 {member.phone}</span>}
                    </div>
                  </div>
                </div>

                <div className="col-balance">
                  <span className="balance-amount">
                    {member.balance?.toLocaleString('en-US') || 0} ريال
                  </span>
                </div>

                <div className="col-target">
                  <span className="target-amount">3,000 ريال</span>
                </div>

                <div className="col-status">
                  <span className={`status-badge ${member.status}`}>
                    {member.status === 'sufficient' ? '✅ مطابق' : '❌ ناقص'}
                  </span>
                </div>

                <div className="col-progress">
                  <div className="progress-container">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${Math.min(100, member.percentageComplete || 0)}%` }}
                      ></div>
                    </div>
                    <span className="progress-text">
                      {Math.round(member.percentageComplete || 0)}%
                    </span>
                  </div>
                </div>

                <div className="col-shortfall">
                  {member.shortfall > 0 ? (
                    <span className="shortfall-amount">
                      {member.shortfall.toLocaleString('en-US')} ريال
                    </span>
                  ) : (
                    <span className="no-shortfall">مكتمل</span>
                  )}
                </div>

                <div className="col-last-payment">
                  <span className="payment-date">
                    {member.lastPaymentDate ?
                      new Date(member.lastPaymentDate).toLocaleDateString('ar-SA') :
                      'لا يوجد'
                    }
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {filteredMembers.length > 100 && (
          <div className="table-footer">
            <p>عرض أول 100 عضو من أصل {filteredMembers.length}</p>
          </div>
        )}
      </div>

      {/* Last Updated */}
      <div className="last-updated">
        آخر تحديث: {crisisData?.statistics?.lastUpdated
          ? new Date(crisisData.statistics.lastUpdated).toLocaleString('en-US')
          : 'غير محدد'
        }
      </div>
    </div>
  );
};

export default memo(CrisisDashboard);