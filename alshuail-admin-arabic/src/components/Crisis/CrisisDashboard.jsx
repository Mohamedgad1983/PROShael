import React, { memo,  useState, useEffect } from 'react';
import { logger } from '../../utils/logger';

import './CrisisDashboard.css';

const CrisisDashboard = () => {
  const [crisisData, setCrisisData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, insufficient, sufficient
  const [refreshing, setRefreshing] = useState(false);

  // Use hostname detection for local vs production environments
  const API_URL = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://api.alshailfund.com');

  // Log on component mount to debug
  logger.debug('🚀 Crisis Dashboard Component Mounted');
  logger.debug('🔧 Using API_URL:', { API_URL });
  logger.debug('🔧 process.env.REACT_APP_API_URL:', { REACT_APP_API_URL: process.env.REACT_APP_API_URL });

  // Fetch crisis data from backend with comprehensive error handling
  const fetchCrisisData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build the complete URL
      const url = `${API_URL}/api/crisis/dashboard`;

      // Log the exact URL we're calling
      logger.debug('🔍 Crisis Dashboard - Fetching from URL:', { url });
      logger.debug('📡 API_URL configured as:', { API_URL });
      logger.debug('🔧 Environment:', { NODE_ENV: process.env.NODE_ENV });
      logger.debug('🔧 REACT_APP_API_URL from env:', { REACT_APP_API_URL: process.env.REACT_APP_API_URL });

      // Make the fetch request with proper headers
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'omit' // Don't send credentials for testing
      });

      // Log response details
      logger.debug('📡 Response received:', {});
      logger.debug('  - Status:', { status: response.status });
      logger.debug('  - Status Text:', { statusText: response.statusText });
      logger.debug('  - OK:', { ok: response.ok });
      logger.debug('  - URL:', { url: response.url });

      // Log all response headers
      const headers = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      logger.debug('  - Headers:', { headers });

      // Check content type
      const contentType = response.headers.get('content-type');
      logger.debug('📡 Content-Type header:', { contentType });

      // If we're getting HTML instead of JSON, it's likely a redirect or wrong URL
      if (!contentType || !contentType.includes('application/json')) {
        logger.error('❌ ERROR: Response is not JSON!');
        logger.error('  - Expected: application/json');
        logger.error('  - Received:', { contentType });

        // Try to read the response as text to see what we got
        const textResponse = await response.text();
        logger.error('❌ Response body (first 500 chars);:', {});
        logger.error(textResponse.substring(0, 500));

        // Check if it's an HTML page
        if (textResponse.includes('<!DOCTYPE') || textResponse.includes('<html')) {
          logger.error('❌ CRITICAL: Receiving HTML page instead of JSON!');
          logger.error('  - This usually means:', {});
          logger.error('    1. Wrong URL (frontend URL instead of backend);');
          logger.error('    2. Backend is not running on port 3001');
          logger.error('    3. CORS redirect to error page');
        }

        throw new Error(`Server returned ${contentType || 'unknown content'} instead of JSON. Check console for details.`);
      }

      // Check if response is not OK
      if (!response.ok) {
        logger.error('❌ HTTP Error:', { status: response.status, statusText: response.statusText });

        // Try to parse error message from response
        try {
          const errorData = await response.json();
          logger.error('❌ Error response data:', { errorData });
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        } catch (jsonErr) {
          // If we can't parse JSON, use status text
          throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        }
      }

      // Parse JSON response
      let data;
      try {
        const responseText = await response.text();
        logger.debug('📡 Raw response text length:', { length: responseText.length });

        // Parse the JSON
        data = JSON.parse(responseText);
        logger.debug('✅ Successfully parsed JSON');
        logger.debug('📊 Response data structure:', {
          hasSuccess: 'success' in data,
          hasData: 'data' in data,
          hasStatistics: 'statistics' in data,
          hasMembers: 'members' in data,
          keys: Object.keys(data)
        });

        // Log first member if available for debugging
        if (data.data?.members && data.data.members.length > 0) {
          logger.debug('📊 First member sample:', {});
        } else if (data.members && data.members.length > 0) {
          logger.debug('📊 First member sample:', {});
        }
      } catch (parseErr) {
        logger.error('❌ JSON Parse Error:', { parseErr });
        logger.error('  - Error message:', { message: parseErr.message });
        throw new Error('Failed to parse JSON response from server');
      }

      // Handle different response structures
      if (data.success && data.data) {
        logger.debug('✅ Setting crisis data from data.data');
        setCrisisData(data.data);
      } else if (data.statistics && data.members) {
        logger.debug('✅ Setting crisis data from root level');
        setCrisisData(data);
      } else {
        logger.error('❌ Unexpected data structure:', { data });
        logger.error('  - Expected either: { success: true, data: {...} }');
        logger.error('  - Or: { statistics: {...}, members: [...] }');
        throw new Error('Unexpected data structure from server');
      }

      logger.debug('✅ Crisis data successfully loaded and set');

    } catch (err) {
      logger.error('❌ FULL ERROR DETAILS:', {});
      logger.error('  - Error Name:', { name: err.name });
      logger.error('  - Error Message:', { message: err.message });
      logger.error('  - Error Stack:', { stack: err.stack });

      // Check for specific error types
      if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
        logger.error('❌ NETWORK ERROR: Cannot connect to backend!');
        logger.error('  - Make sure backend is running on http://localhost:3001');
        logger.error('  - Run: cd alshuail-backend && npm run dev');
        setError('لا يمكن الاتصال بالخادم - تأكد من تشغيل الخادم على المنفذ 3001');
      } else if (err.message.includes('JSON')) {
        setError('خطأ في تنسيق البيانات من الخادم');
      } else {
        setError(err.message || 'فشل في تحميل بيانات الأزمة');
      }

      // Use mock data as fallback
      logger.debug('📊 Using mock data as fallback');
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
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleRefresh}
            className={`refresh-button ${refreshing ? 'refreshing' : ''}`}
            disabled={refreshing}
          >
            {refreshing ? 'جاري التحديث...' : '🔄 تحديث البيانات'}
          </button>
          <button
            onClick={async () => {
              logger.debug('🧪 Testing direct fetch...');
              try {
                const testUrl = 'http://localhost:3001/api/crisis/dashboard';
                logger.debug('Testing URL:', { testUrl });
                const resp = await fetch(testUrl);
                const text = await resp.text();
                logger.debug('Response headers:', { headers: resp.headers });
                logger.debug('Response text (first 200 chars);:', text.substring(0, 200));
                try {
                  const json = JSON.parse(text);
                  logger.debug('✅ Parsed JSON successfully:', { json });
                  alert('✅ Direct fetch successful! Check console for data.');
                } catch (e) {
                  logger.error('❌ JSON parse failed:', { e });
                  alert('❌ Failed to parse JSON. Check console.');
                }
              } catch (err) {
                logger.error('❌ Direct fetch failed:', { err });
                alert('❌ Direct fetch failed: ' + err.message);
              }
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#ff6b6b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🧪 Test Direct Fetch
          </button>
        </div>
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

export default memo(CrisisDashboard);