/**
 * MobileProfile - Mobile-optimized user profile management
 * Features: Profile editing, settings, activity history, offline support
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useMobile, useHapticFeedback } from '../../hooks/useMobile';
import { ProfileHeaderSkeleton, SkeletonProvider } from '../Common/SkeletonLoaders';
import LazyImage from '../Common/LazyImage';
import performanceMonitor, { trackUserAction, measureRender } from '../../utils/performanceMonitor';
import '../../styles/mobile-arabic.css';

const MobileProfile = ({ user, isOnline = true, onLogout, device, viewport }) => {
  const { applySafeArea } = useMobile();
  const { feedback } = useHapticFeedback();

  // Component state
  const [profileState, setProfileState] = useState({
    loading: false,
    editing: false,
    profileData: {
      name: user?.name || 'أحمد محمد الشعيل',
      phone: user?.phone || '0551234567',
      email: user?.email || 'ahmed@example.com',
      membershipId: user?.membershipId || 'SH001',
      avatar: user?.avatar || null,
      joinDate: '2023-01-15',
      address: 'الرياض، المملكة العربية السعودية',
      birthDate: '1990-05-15',
      emergencyContact: '0551234568',
      notes: 'عضو نشط في العائلة'
    }
  });

  const [activeSection, setActiveSection] = useState('overview'); // overview, edit, activity, settings

  // Performance monitoring
  const renderMonitor = useMemo(() => measureRender('MobileProfile'), []);

  // Convert numbers to Arabic numerals
  const toArabicNumerals = useCallback((num) => {
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return num.toString().replace(/[0-9]/g, (digit) => arabicNumerals[parseInt(digit)]);
  }, []);

  // Handle profile update
  const handleProfileUpdate = useCallback(async (updatedData) => {
    try {
      setProfileState(prev => ({ ...prev, loading: true }));

      trackUserAction('profile-update', { fields: Object.keys(updatedData) });
      feedback('medium');

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      setProfileState(prev => ({
        ...prev,
        profileData: { ...prev.profileData, ...updatedData },
        loading: false,
        editing: false
      }));

      feedback('success');

      if (isOnline) {
        // TODO: Call actual API
      } else {
        // Save to localStorage for offline
        localStorage.setItem('cached_profile', JSON.stringify({
          ...profileState.profileData,
          ...updatedData
        }));
      }

    } catch (error) {
      console.error('Failed to update profile:', error);
      setProfileState(prev => ({ ...prev, loading: false }));
      feedback('error');
    }
  }, [isOnline, feedback, profileState.profileData]);

  // Handle avatar upload
  const handleAvatarUpload = useCallback(async (file) => {
    try {
      if (!file) return;

      setProfileState(prev => ({ ...prev, loading: true }));
      trackUserAction('avatar-upload', { fileSize: file.size });

      // Create object URL for preview
      const avatarUrl = URL.createObjectURL(file);

      // Simulate upload
      await new Promise(resolve => setTimeout(resolve, 2000));

      setProfileState(prev => ({
        ...prev,
        profileData: { ...prev.profileData, avatar: avatarUrl },
        loading: false
      }));

      feedback('success');

    } catch (error) {
      console.error('Avatar upload failed:', error);
      setProfileState(prev => ({ ...prev, loading: false }));
      feedback('error');
    }
  }, [feedback]);

  // Mock activity data
  const activityData = useMemo(() => [
    {
      id: 'act_001',
      type: 'payment',
      title: 'دفع الاشتراك الشهري',
      description: 'تم دفع اشتراك شهر يناير 2024',
      date: '2024-01-15',
      icon: '💰',
      color: 'green'
    },
    {
      id: 'act_002',
      type: 'activity',
      title: 'مشاركة في فعالية',
      description: 'تسجيل في رحلة العائلة',
      date: '2024-01-10',
      icon: '🎉',
      color: 'blue'
    },
    {
      id: 'act_003',
      type: 'profile',
      title: 'تحديث الملف الشخصي',
      description: 'تم تحديث رقم الهاتف',
      date: '2024-01-05',
      icon: '👤',
      color: 'purple'
    }
  ], []);

  // Profile statistics
  const profileStats = useMemo(() => ({
    totalPayments: 15,
    activitiesJoined: 8,
    membershipYears: 1,
    pointsEarned: 1250
  }), []);

  // Render profile overview
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Profile header */}
      <div className="glass-card text-center">
        <div className="relative inline-block mb-4">
          <LazyImage
            src={profileState.profileData.avatar}
            alt={profileState.profileData.name}
            width="80px"
            height="80px"
            className="w-20 h-20 rounded-full border-4 border-white border-opacity-20"
            placeholder="/default-avatar.png"
            fallback={
              <div className="w-20 h-20 bg-gradient-accent rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {profileState.profileData.name.charAt(0)}
              </div>
            }
          />
          <button
            className="absolute -bottom-1 -right-1 w-6 h-6 bg-accent rounded-full flex items-center justify-center text-white text-sm"
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = (e) => handleAvatarUpload(e.target.files[0]);
              input.click();
            }}
          >
            📷
          </button>
        </div>

        <h2 className="text-xl font-bold text-white mb-1">{profileState.profileData.name}</h2>
        <p className="text-slate-300 text-sm mb-1">رقم العضوية: {toArabicNumerals(profileState.profileData.membershipId)}</p>
        <p className="text-slate-400 text-xs">عضو منذ {profileState.profileData.joinDate}</p>

        <div className="flex gap-2 justify-center mt-4">
          <button
            className="px-4 py-2 bg-accent bg-opacity-20 text-accent rounded-lg text-sm font-medium border border-accent border-opacity-30"
            onClick={() => {
              setActiveSection('edit');
              feedback('light');
            }}
          >
            تعديل الملف
          </button>
          <button
            className="px-4 py-2 bg-white bg-opacity-20 text-white rounded-lg text-sm font-medium"
            onClick={() => {
              setActiveSection('settings');
              feedback('light');
            }}
          >
            الإعدادات
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card text-center">
          <div className="w-12 h-12 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center text-green-400 text-xl mx-auto mb-3">
            💰
          </div>
          <p className="text-slate-300 text-sm mb-1">إجمالي المدفوعات</p>
          <p className="text-white font-bold text-lg">{toArabicNumerals(profileStats.totalPayments)}</p>
        </div>

        <div className="glass-card text-center">
          <div className="w-12 h-12 bg-blue-500 bg-opacity-20 rounded-lg flex items-center justify-center text-blue-400 text-xl mx-auto mb-3">
            🎯
          </div>
          <p className="text-slate-300 text-sm mb-1">الأنشطة المشارك</p>
          <p className="text-white font-bold text-lg">{toArabicNumerals(profileStats.activitiesJoined)}</p>
        </div>

        <div className="glass-card text-center">
          <div className="w-12 h-12 bg-purple-500 bg-opacity-20 rounded-lg flex items-center justify-center text-purple-400 text-xl mx-auto mb-3">
            ⏰
          </div>
          <p className="text-slate-300 text-sm mb-1">سنوات العضوية</p>
          <p className="text-white font-bold text-lg">{toArabicNumerals(profileStats.membershipYears)}</p>
        </div>

        <div className="glass-card text-center">
          <div className="w-12 h-12 bg-yellow-500 bg-opacity-20 rounded-lg flex items-center justify-center text-yellow-400 text-xl mx-auto mb-3">
            🏆
          </div>
          <p className="text-slate-300 text-sm mb-1">النقاط المكتسبة</p>
          <p className="text-white font-bold text-lg">{toArabicNumerals(profileStats.pointsEarned)}</p>
        </div>
      </div>

      {/* Contact information */}
      <div className="glass-card">
        <h3 className="text-lg font-semibold text-white mb-4">معلومات الاتصال</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 bg-opacity-20 rounded-lg flex items-center justify-center text-blue-400">
              📱
            </div>
            <div>
              <p className="text-slate-300 text-sm">رقم الهاتف</p>
              <p className="text-white">{profileState.profileData.phone}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center text-green-400">
              ✉️
            </div>
            <div>
              <p className="text-slate-300 text-sm">البريد الإلكتروني</p>
              <p className="text-white">{profileState.profileData.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-500 bg-opacity-20 rounded-lg flex items-center justify-center text-purple-400">
              📍
            </div>
            <div>
              <p className="text-slate-300 text-sm">العنوان</p>
              <p className="text-white">{profileState.profileData.address}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render edit form
  const RenderEditForm = () => {
    const [formData, setFormData] = useState(profileState.profileData);

    return (
      <div className="space-y-6">
        <div className="glass-card">
          <h3 className="text-lg font-semibold text-white mb-4">تعديل الملف الشخصي</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-slate-300 text-sm mb-2">الاسم الكامل</label>
              <input
                type="text"
                className="w-full bg-black bg-opacity-20 border border-white border-opacity-20 rounded-lg px-4 py-3 text-white"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-slate-300 text-sm mb-2">رقم الهاتف</label>
              <input
                type="tel"
                className="w-full bg-black bg-opacity-20 border border-white border-opacity-20 rounded-lg px-4 py-3 text-white"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-slate-300 text-sm mb-2">البريد الإلكتروني</label>
              <input
                type="email"
                className="w-full bg-black bg-opacity-20 border border-white border-opacity-20 rounded-lg px-4 py-3 text-white"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-slate-300 text-sm mb-2">العنوان</label>
              <textarea
                className="w-full bg-black bg-opacity-20 border border-white border-opacity-20 rounded-lg px-4 py-3 text-white"
                rows="3"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-slate-300 text-sm mb-2">رقم الطوارئ</label>
              <input
                type="tel"
                className="w-full bg-black bg-opacity-20 border border-white border-opacity-20 rounded-lg px-4 py-3 text-white"
                value={formData.emergencyContact}
                onChange={(e) => setFormData(prev => ({ ...prev, emergencyContact: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-slate-300 text-sm mb-2">ملاحظات</label>
              <textarea
                className="w-full bg-black bg-opacity-20 border border-white border-opacity-20 rounded-lg px-4 py-3 text-white"
                rows="3"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              className="flex-1 py-3 bg-accent rounded-lg text-white font-semibold"
              onClick={() => handleProfileUpdate(formData)}
              disabled={profileState.loading}
            >
              {profileState.loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </button>
            <button
              className="px-6 py-3 bg-white bg-opacity-20 rounded-lg text-white"
              onClick={() => setActiveSection('overview')}
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render activity history
  const renderActivity = () => (
    <div className="space-y-6">
      <div className="glass-card">
        <h3 className="text-lg font-semibold text-white mb-4">النشاط الأخير</h3>
        <div className="space-y-4">
          {activityData.map((activity) => (
            <div key={activity.id} className="flex items-center gap-3 p-3 bg-black bg-opacity-20 rounded-lg">
              <div className={`w-10 h-10 bg-${activity.color}-500 bg-opacity-20 rounded-lg flex items-center justify-center text-${activity.color}-400 text-lg`}>
                {activity.icon}
              </div>
              <div className="flex-1">
                <h4 className="text-white font-medium text-sm">{activity.title}</h4>
                <p className="text-slate-300 text-xs">{activity.description}</p>
                <p className="text-slate-400 text-xs mt-1">{activity.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Render settings
  const renderSettings = () => (
    <div className="space-y-6">
      <div className="glass-card">
        <h3 className="text-lg font-semibold text-white mb-4">إعدادات الحساب</h3>

        <div className="space-y-4">
          <button
            className="w-full flex items-center justify-between p-4 bg-black bg-opacity-20 rounded-lg"
            onClick={() => feedback('light')}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">🔔</span>
              <span className="text-white">إعدادات الإشعارات</span>
            </div>
            <span className="text-slate-400">›</span>
          </button>

          <button
            className="w-full flex items-center justify-between p-4 bg-black bg-opacity-20 rounded-lg"
            onClick={() => feedback('light')}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">🔒</span>
              <span className="text-white">الخصوصية والأمان</span>
            </div>
            <span className="text-slate-400">›</span>
          </button>

          <button
            className="w-full flex items-center justify-between p-4 bg-black bg-opacity-20 rounded-lg"
            onClick={() => feedback('light')}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">🌙</span>
              <span className="text-white">المظهر</span>
            </div>
            <span className="text-slate-400">›</span>
          </button>

          <button
            className="w-full flex items-center justify-between p-4 bg-black bg-opacity-20 rounded-lg"
            onClick={() => feedback('light')}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">🌐</span>
              <span className="text-white">اللغة</span>
            </div>
            <span className="text-slate-400">›</span>
          </button>

          <button
            className="w-full flex items-center justify-between p-4 bg-red-500 bg-opacity-20 rounded-lg border border-red-500 border-opacity-30"
            onClick={() => {
              trackUserAction('logout-from-profile');
              onLogout();
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">🚪</span>
              <span className="text-red-400">تسجيل الخروج</span>
            </div>
            <span className="text-red-400">›</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-primary" dir="rtl">
      {/* Safe area container */}
      <div className="safe-area-container pb-20">

        {/* Header */}
        <header
          className="glass-nav sticky top-0 z-40"
          style={applySafeArea(['top'])}
        >
          <div className="container py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-white">الملف الشخصي</h1>
            </div>

            {/* Navigation tabs */}
            <div className="flex gap-1 mt-4 bg-black bg-opacity-20 rounded-xl p-1">
              {[
                { id: 'overview', label: 'نظرة عامة' },
                { id: 'activity', label: 'النشاط' },
                { id: 'settings', label: 'الإعدادات' }
              ].map(tab => (
                <button
                  key={tab.id}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                    activeSection === tab.id
                      ? 'bg-white bg-opacity-20 text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  onClick={() => {
                    setActiveSection(tab.id);
                    feedback('light');
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="container py-6">
          <SkeletonProvider
            loading={profileState.loading && activeSection === 'overview'}
            skeleton={<ProfileHeaderSkeleton />}
          >
            {activeSection === 'overview' && renderOverview()}
            {activeSection === 'edit' && <RenderEditForm />}
            {activeSection === 'activity' && renderActivity()}
            {activeSection === 'settings' && renderSettings()}
          </SkeletonProvider>
        </main>

      </div>

      {/* Offline indicator */}
      {!isOnline && (
        <div className="fixed bottom-24 left-4 right-4 glass-card border border-yellow-500 border-opacity-50">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
            <p className="text-yellow-400 text-sm">وضع عدم الاتصال - التغييرات ستُحفظ محلياً</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileProfile;