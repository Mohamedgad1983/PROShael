// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  UserCircleIcon,
  PhoneIcon,
  IdentificationIcon,
  UserGroupIcon,
  CalendarIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  LockClosedIcon,
  WalletIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import BottomNav from '../../components/mobile/BottomNav';
import '../../styles/mobile/Profile.css';
import { getMemberProfile, getMemberBalance } from '../../services/mobileApi';
import { formatBothCalendars } from '../../utils/hijriDate';

import { logger } from '../../utils/logger';

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

      // Fetch member profile and balance
      const [profileResponse, balanceResponse] = await Promise.all([
        getMemberProfile().catch(err => {
          logger.error('Profile fetch error:', { err });
          return null;
        }),
        getMemberBalance().catch(err => {
          logger.error('Balance fetch error:', { err });
          return null;
        })
      ]);

      if (profileResponse) {
        const profileData = profileResponse.data || profileResponse;
        const balanceData = balanceResponse?.data || balanceResponse;

        setProfile({
          id: profileData.id || profileData.user_id,
          full_name: profileData.full_name || profileData.name,
          membership_number: profileData.membership_number || profileData.id,
          phone: profileData.phone,
          balance: balanceData?.current_balance || profileData.balance || 0,
          tribal_section: profileData.tribal_section,
          family_branch: profileData.family_branch,
          created_at: profileData.created_at,
          email: profileData.email,
          status: profileData.membership_status || profileData.status,
          is_compliant: (balanceData?.current_balance || profileData.balance || 0) >= 3000
        });
      } else {
        // Use sample data if API fails
        const userData = localStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          setProfile({
            id: user.id,
            full_name: user.name || 'أحمد محمد الشعيل',
            membership_number: user.membership_number || 'M-001',
            phone: user.phone || '0555555555',
            balance: user.balance || 5000,
            tribal_section: user.tribal_section || 'آل محمد',
            family_branch: user.family_branch || 'فرع الرياض',
            created_at: user.created_at || new Date().toISOString(),
            status: 'active',
            is_compliant: (user.balance || 5000) >= 3000
          });
        }
      }
    } catch (error) {
      logger.error('Error fetching profile:', { error });
      // Try to use cached data
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setProfile({
          ...user,
          is_compliant: (user.balance || 0) >= 3000
        });
      }
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
    const dateInfo: any = formatBothCalendars(dateString);
    return dateInfo?.hijri?.formatted || 'غير محدد';
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
            <UserCircleIcon className="icon" />
          </div>
          <h2>{profile.full_name}</h2>
          <p className="member-number">عضو رقم: {profile.membership_number}</p>
        </div>

        {/* Balance Summary */}
        <div className={`balance-summary ${profile.is_compliant ? 'compliant' : 'non-compliant'}`}>
          <div className="balance-icon">
            <WalletIcon className="icon" />
          </div>
          <div className="balance-info">
            <span className="balance-label">الرصيد الحالي</span>
            <span className="balance-value">{profile.balance.toLocaleString()} ريال</span>
          </div>
          <div className="compliance-status">
            {profile.is_compliant ? (
              <>
                <CheckCircleIcon className="status-icon success" />
                <span>ملتزم</span>
              </>
            ) : (
              <>
                <ExclamationTriangleIcon className="status-icon warning" />
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
            <PhoneIcon className="icon" />
          </div>
          <div className="info-content">
            <span className="info-label">رقم الجوال</span>
            <span className="info-value">{profile.phone || 'غير محدد'}</span>
          </div>
        </div>

        <div className="info-item">
          <div className="info-icon">
            <IdentificationIcon className="icon" />
          </div>
          <div className="info-content">
            <span className="info-label">رقم العضوية</span>
            <span className="info-value">{profile.membership_number}</span>
          </div>
        </div>

        <div className="info-item">
          <div className="info-icon">
            <UserGroupIcon className="icon" />
          </div>
          <div className="info-content">
            <span className="info-label">القسم القبلي</span>
            <span className="info-value">{profile.tribal_section || 'غير محدد'}</span>
          </div>
        </div>

        {profile.family_branch && (
          <div className="info-item">
            <div className="info-icon">
              <UserGroupIcon className="icon" />
            </div>
            <div className="info-content">
              <span className="info-label">الفرع العائلي</span>
              <span className="info-value">{profile.family_branch}</span>
            </div>
          </div>
        )}

        <div className="info-item">
          <div className="info-icon">
            <CalendarIcon className="icon" />
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
          <LockClosedIcon className="icon" />
          <span>تغيير كلمة المرور</span>
        </button>

        <button
          className="action-button"
          onClick={() => navigate('/mobile/settings')}
        >
          <Cog6ToothIcon className="icon" />
          <span>الإعدادات</span>
        </button>

        <button
          className="action-button logout"
          onClick={handleLogout}
        >
          <ArrowRightOnRectangleIcon className="icon" />
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