import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaUserCircle,
  FaPhone,
  FaIdCard,
  FaUsers,
  FaCalendar,
  FaSignOutAlt,
  FaCog,
  FaLock,
  FaWallet,
  FaCheckCircle,
  FaExclamationTriangle
} from 'react-icons/fa';
import BottomNav from '../../components/mobile/BottomNav';
import '../../styles/mobile/Profile.css';

interface MemberProfile {
  id: string;
  full_name: string;
  membership_number: string;
  phone: string;
  balance: number;
  tribal_section?: string;
  family_branch?: string;
  created_at?: string;
  email?: string;
  status?: string;
  is_compliant?: boolean;
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL || 'https://proshael.onrender.com';

      // Fetch member profile
      const response = await fetch(`${apiUrl}/api/member/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProfile({
          ...data,
          is_compliant: data.balance >= 3000
        });
      } else if (response.status === 401) {
        // Token expired or invalid
        navigate('/mobile/login');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('memberData');
    navigate('/mobile/login');
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'غير محدد';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="mobile-loading">
        <div className="loading-spinner"></div>
        <p>جاري تحميل البيانات...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mobile-error">
        <p>عذراً، حدث خطأ في تحميل البيانات</p>
        <button onClick={() => navigate('/mobile/dashboard')}>
          العودة للرئيسية
        </button>
      </div>
    );
  }

  return (
    <div className="mobile-profile">
      {/* Header */}
      <div className="profile-header">
        <h1>الملف الشخصي</h1>
      </div>

      {/* Profile Card */}
      <motion.div
        className="profile-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="profile-photo-section">
          <div className="profile-photo">
            <FaUserCircle />
          </div>
          <h2>{profile.full_name}</h2>
          <p className="member-number">عضو رقم: {profile.membership_number}</p>
        </div>

        {/* Balance Summary */}
        <div className={`balance-summary ${profile.is_compliant ? 'compliant' : 'non-compliant'}`}>
          <div className="balance-icon">
            <FaWallet />
          </div>
          <div className="balance-info">
            <span className="balance-label">الرصيد الحالي</span>
            <span className="balance-value">{profile.balance.toLocaleString()} ريال</span>
          </div>
          <div className="compliance-status">
            {profile.is_compliant ? (
              <>
                <FaCheckCircle className="status-icon success" />
                <span>ملتزم</span>
              </>
            ) : (
              <>
                <FaExclamationTriangle className="status-icon warning" />
                <span>غير ملتزم</span>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Profile Information */}
      <motion.div
        className="profile-info"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <h3>المعلومات الشخصية</h3>

        <div className="info-item">
          <div className="info-icon">
            <FaPhone />
          </div>
          <div className="info-content">
            <span className="info-label">رقم الجوال</span>
            <span className="info-value">{profile.phone || 'غير محدد'}</span>
          </div>
        </div>

        <div className="info-item">
          <div className="info-icon">
            <FaIdCard />
          </div>
          <div className="info-content">
            <span className="info-label">رقم العضوية</span>
            <span className="info-value">{profile.membership_number}</span>
          </div>
        </div>

        <div className="info-item">
          <div className="info-icon">
            <FaUsers />
          </div>
          <div className="info-content">
            <span className="info-label">القسم القبلي</span>
            <span className="info-value">{profile.tribal_section || 'غير محدد'}</span>
          </div>
        </div>

        {profile.family_branch && (
          <div className="info-item">
            <div className="info-icon">
              <FaUsers />
            </div>
            <div className="info-content">
              <span className="info-label">الفرع العائلي</span>
              <span className="info-value">{profile.family_branch}</span>
            </div>
          </div>
        )}

        <div className="info-item">
          <div className="info-icon">
            <FaCalendar />
          </div>
          <div className="info-content">
            <span className="info-label">تاريخ الانضمام</span>
            <span className="info-value">{formatDate(profile.created_at)}</span>
          </div>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        className="profile-actions"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <button
          className="action-button"
          onClick={() => navigate('/mobile/change-password')}
        >
          <FaLock />
          <span>تغيير كلمة المرور</span>
        </button>

        <button
          className="action-button"
          onClick={() => navigate('/mobile/settings')}
        >
          <FaCog />
          <span>الإعدادات</span>
        </button>

        <button
          className="action-button logout"
          onClick={handleLogout}
        >
          <FaSignOutAlt />
          <span>تسجيل الخروج</span>
        </button>
      </motion.div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="modal-overlay">
          <motion.div
            className="modal-content"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <h3>تأكيد تسجيل الخروج</h3>
            <p>هل أنت متأكد من رغبتك في تسجيل الخروج؟</p>
            <div className="modal-actions">
              <button
                className="confirm-btn"
                onClick={confirmLogout}
              >
                نعم، تسجيل الخروج
              </button>
              <button
                className="cancel-btn"
                onClick={() => setShowLogoutConfirm(false)}
              >
                إلغاء
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default Profile;