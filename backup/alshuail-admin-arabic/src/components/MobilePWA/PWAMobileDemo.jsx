/**
 * Al-Shuail PWA Mobile Demo Component
 * Demonstrates the mobile-first Arabic framework usage
 * Phase M1: Core Mobile Layout Implementation
 */

import React, { useState } from 'react';
import '../../styles/mobile-arabic.css';

const PWAMobileDemo = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  // Sample data for demonstration
  const members = [
    {
      id: 1,
      name: 'أحمد محمد الشعيل',
      membership: 'SH001',
      status: 'نشط',
      phone: '0501234567',
      joinDate: '2024/01/15'
    },
    {
      id: 2,
      name: 'فاطمة علي الشعيل',
      membership: 'SH002',
      status: 'نشط',
      phone: '0507654321',
      joinDate: '2024/02/20'
    },
    {
      id: 3,
      name: 'محمد عبدالله الشعيل',
      membership: 'SH003',
      status: 'معلق',
      phone: '0551234567',
      joinDate: '2024/03/10'
    }
  ];

  const stats = [
    {
      title: 'إجمالي الأعضاء',
      value: '248',
      change: '+12',
      icon: '👥'
    },
    {
      title: 'الأعضاء النشطين',
      value: '231',
      change: '+8',
      icon: '✅'
    },
    {
      title: 'الدفعات الشهرية',
      value: '45,250 ريال',
      change: '+5.2%',
      icon: '💰'
    },
    {
      title: 'الأنشطة القادمة',
      value: '7',
      change: '+2',
      icon: '📅'
    }
  ];

  const handleMemberClick = (member) => {
    setSelectedMember(member);
    setShowBottomSheet(true);
  };

  const closeBottomSheet = () => {
    setShowBottomSheet(false);
    setSelectedMember(null);
  };

  return (
    <div className="min-h-screen bg-gradient-primary" dir="rtl">
      {/* Safe Area Container */}
      <div className="safe-area-container">

        {/* Header with Glass Navigation */}
        <header className="glass-nav sticky top-0 z-50">
          <div className="container">
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-accent rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">ش</span>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">آل شعيل</h1>
                  <p className="text-xs text-slate-300">لوحة إدارة العائلة</p>
                </div>
              </div>

              <button className="touch-target glass rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="container mt-4">
          <nav className="tab-nav">
            <button
              className={`tab-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              نظرة عامة
            </button>
            <button
              className={`tab-nav-item ${activeTab === 'members' ? 'active' : ''}`}
              onClick={() => setActiveTab('members')}
            >
              الأعضاء
            </button>
            <button
              className={`tab-nav-item ${activeTab === 'activities' ? 'active' : ''}`}
              onClick={() => setActiveTab('activities')}
            >
              الأنشطة
            </button>
            <button
              className={`tab-nav-item ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              التقارير
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <main className="container py-6 pb-20">

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="animate-fade-in">
              {/* Statistics Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {stats.map((stat, index) => (
                  <div key={index} className="glass-card">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-accent rounded-lg flex items-center justify-center text-lg">
                        {stat.icon}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-slate-400">{stat.title}</p>
                        <p className="text-lg font-bold text-white">{stat.value}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-success font-medium">{stat.change}</span>
                      <span className="text-xs text-slate-400">هذا الشهر</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="glass-card mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">إجراءات سريعة</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button className="btn btn-primary flex-col py-6">
                    <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    إضافة عضو جديد
                  </button>
                  <button className="btn btn-secondary flex-col py-6">
                    <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    إنشاء تقرير
                  </button>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="glass-card">
                <h3 className="text-lg font-semibold text-white mb-4">النشاط الأخير</h3>
                <div className="space-y-3">
                  {[
                    { action: 'انضمام عضو جديد', name: 'محمد الشعيل', time: 'منذ ساعتين' },
                    { action: 'دفع اشتراك شهري', name: 'فاطمة الشعيل', time: 'منذ 4 ساعات' },
                    { action: 'تحديث بيانات العضوية', name: 'أحمد الشعيل', time: 'أمس' }
                  ].map((activity, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 rounded-lg glass">
                      <div className="w-8 h-8 bg-gradient-accent rounded-full flex items-center justify-center text-sm">
                        {activity.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{activity.action}</p>
                        <p className="text-xs text-slate-400">{activity.name} • {activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Members Tab */}
          {activeTab === 'members' && (
            <div className="animate-slide-in-right">
              {/* Search Bar */}
              <div className="form-group mb-6">
                <div className="relative">
                  <input
                    type="text"
                    className="form-input pl-10"
                    placeholder="البحث عن الأعضاء..."
                  />
                  <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Members List */}
              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="glass-card cursor-pointer transition-all hover:transform hover:scale-[1.02]"
                    onClick={() => handleMemberClick(member)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-accent rounded-full flex items-center justify-center text-white font-bold">
                        {member.name.split(' ')[0].charAt(0)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-white">{member.name}</h4>
                        <div className="flex items-center gap-4 text-sm text-slate-400">
                          <span>{member.membership}</span>
                          <span>{member.phone}</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          member.status === 'نشط'
                            ? 'bg-success bg-opacity-20 text-success'
                            : 'bg-warning bg-opacity-20 text-warning'
                        }`}>
                          {member.status}
                        </span>
                        <p className="text-xs text-slate-400 mt-1">{member.joinDate}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activities Tab */}
          {activeTab === 'activities' && (
            <div className="animate-slide-in-left">
              <div className="glass-card text-center py-12">
                <div className="w-16 h-16 bg-gradient-accent bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">قريباً</h3>
                <p className="text-slate-400">سيتم إضافة إدارة الأنشطة قريباً</p>
              </div>
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <div className="animate-fade-in">
              <div className="glass-card text-center py-12">
                <div className="w-16 h-16 bg-gradient-accent bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">قريباً</h3>
                <p className="text-slate-400">سيتم إضافة التقارير المالية قريباً</p>
              </div>
            </div>
          )}

        </main>

        {/* Floating Action Button */}
        <button className="fab fab-right">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>

        {/* Bottom Navigation */}
        <nav className="bottom-nav">
          <div className="bottom-nav-items">
            <a href="#" className={`bottom-nav-item ${activeTab === 'overview' ? 'active' : ''}`}>
              <svg className="bottom-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
              </svg>
              <span className="bottom-nav-label">الرئيسية</span>
            </a>
            <a href="#" className={`bottom-nav-item ${activeTab === 'members' ? 'active' : ''}`}>
              <svg className="bottom-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <span className="bottom-nav-label">الأعضاء</span>
            </a>
            <a href="#" className="bottom-nav-item">
              <svg className="bottom-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              <span className="bottom-nav-label">المالية</span>
            </a>
            <a href="#" className="bottom-nav-item">
              <svg className="bottom-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="bottom-nav-label">الإعدادات</span>
            </a>
          </div>
        </nav>

        {/* Bottom Sheet Modal */}
        <div className={`bottom-sheet ${showBottomSheet ? 'active' : ''}`}>
          <div className="bottom-sheet-backdrop" onClick={closeBottomSheet}></div>
          <div className="bottom-sheet-content">
            <div className="bottom-sheet-handle"></div>

            {selectedMember && (
              <>
                <div className="bottom-sheet-header">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">تفاصيل العضو</h3>
                    <button
                      className="touch-target glass rounded-lg"
                      onClick={closeBottomSheet}
                    >
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="bottom-sheet-body">
                  <div className="text-center mb-6">
                    <div className="w-20 h-20 bg-gradient-accent rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                      {selectedMember.name.split(' ')[0].charAt(0)}
                    </div>
                    <h4 className="text-xl font-bold text-white mb-2">{selectedMember.name}</h4>
                    <p className="text-slate-400">{selectedMember.membership}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="glass p-4 rounded-lg">
                      <p className="text-sm text-slate-400 mb-1">رقم الهاتف</p>
                      <p className="text-white font-medium">{selectedMember.phone}</p>
                    </div>

                    <div className="glass p-4 rounded-lg">
                      <p className="text-sm text-slate-400 mb-1">تاريخ الانضمام</p>
                      <p className="text-white font-medium">{selectedMember.joinDate}</p>
                    </div>

                    <div className="glass p-4 rounded-lg">
                      <p className="text-sm text-slate-400 mb-1">حالة العضوية</p>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                        selectedMember.status === 'نشط'
                          ? 'bg-success bg-opacity-20 text-success'
                          : 'bg-warning bg-opacity-20 text-warning'
                      }`}>
                        {selectedMember.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button className="btn btn-primary flex-1">
                      <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      اتصال
                    </button>
                    <button className="btn btn-secondary flex-1">
                      <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      تعديل
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default PWAMobileDemo;