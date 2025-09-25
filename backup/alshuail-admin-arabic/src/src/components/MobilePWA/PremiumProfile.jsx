/**
 * PremiumProfile - Premium profile screen with glassmorphism
 * Based on the MemberMobileApp design
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './MemberMobileApp.css';

const PremiumProfile = () => {
  const navigate = useNavigate();
  const [memberData, setMemberData] = useState(null);

  useEffect(() => {
    // Load user data from localStorage
    const userData = localStorage.getItem('pwa_user');
    if (userData) {
      setMemberData(JSON.parse(userData));
    } else {
      // Redirect to login if not authenticated
      navigate('/pwa/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('pwa_user');
    localStorage.removeItem('pwa_token');
    navigate('/pwa/login');
  };

  if (!memberData) {
    return <div>جاري التحميل...</div>;
  }

  return (
    <div className="member-mobile-app" dir="rtl">
      <div className="mobile-profile-screen">
        {/* Header with Back */}
        <div className="screen-header">
          <button className="back-btn" onClick={() => navigate('/pwa/dashboard')}>
            ←
          </button>
          <h2>الملف الشخصي</h2>
        </div>

        <div className="profile-content">
          <div className="profile-header">
            <div className="profile-avatar">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h3>{memberData.name}</h3>
            <p>{memberData.membershipId}</p>
          </div>

          <div className="profile-info">
            <div className="info-item">
              <span className="info-label">رقم الهاتف:</span>
              <span className="info-value">{memberData.phone}</span>
            </div>
            <div className="info-item">
              <span className="info-label">تاريخ الانضمام:</span>
              <span className="info-value">{memberData.joinDate || '2023-06-15'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">الرصيد الحالي:</span>
              <span className="info-value" style={{
                color: memberData.balance >= 3000 ? '#34C759' : '#FF3B30',
                fontWeight: 'bold'
              }}>
                {memberData.balance?.toLocaleString() || 0} ريال
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">إجمالي المدفوعات:</span>
              <span className="info-value">{memberData.totalPaid || 450} ريال</span>
            </div>
            <div className="info-item">
              <span className="info-label">حالة الاشتراك:</span>
              <span className="info-value status-active">نشط</span>
            </div>
          </div>

          <div className="profile-actions">
            <button className="profile-btn" onClick={() => navigate('/pwa/settings')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              تعديل البيانات
            </button>

            <button className="profile-btn secondary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              تغيير كلمة المرور
            </button>

            <button className="profile-btn" onClick={() => navigate('/pwa/payments')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
              سجل المدفوعات
            </button>

            <button className="profile-btn" onClick={() => navigate('/pwa/reports')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              كشف الحساب
            </button>

            <button className="logout-button" onClick={handleLogout}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumProfile;