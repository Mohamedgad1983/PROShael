/**
 * Mobile Framework Integration Example
 * Shows how to integrate existing components with the mobile framework
 */

import React from 'react';
import { useMobile, useBottomSheet, useHapticFeedback } from '../../hooks/useMobile';
import '../../styles/mobile-arabic.css';

const MobileFrameworkIntegration = () => {
  const { device, viewport, safeArea, applySafeArea } = useMobile();
  const { feedback } = useHapticFeedback();
  const { isOpen, open, close, containerRef } = useBottomSheet();

  // Example: Converting existing dashboard card to mobile-optimized
  const StatCard = ({ title, value, icon, change }) => (
    <div
      className={`glass-card cursor-pointer transition-all ${
        viewport.isMobile ? 'p-4' : 'p-6'
      }`}
      onClick={() => {
        feedback('light');
        open();
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-gradient-accent rounded-lg flex items-center justify-center text-lg">
          {icon}
        </div>
        <div className="flex-1">
          <p className={`text-slate-400 ${viewport.isMobile ? 'text-xs' : 'text-sm'}`}>
            {title}
          </p>
          <p className={`font-bold text-white ${viewport.isMobile ? 'text-lg' : 'text-xl'}`}>
            {value}
          </p>
        </div>
      </div>
      {change && (
        <div className="flex items-center gap-1">
          <span className="text-xs text-success font-medium">{change}</span>
          <span className="text-xs text-slate-400">هذا الشهر</span>
        </div>
      )}
    </div>
  );

  // Example: Mobile-optimized member list item
  const MemberListItem = ({ member }) => (
    <div className="glass-card mb-3 cursor-pointer hover:transform hover:scale-[1.02] transition-all">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-accent rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
          {member.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white truncate">{member.name}</h4>
          <div className={`flex items-center gap-4 text-sm text-slate-400 ${
            viewport.isMobile ? 'flex-col items-start gap-1' : 'flex-row'
          }`}>
            <span>{member.membership}</span>
            <span>{member.phone}</span>
          </div>
        </div>
        <div className="text-center flex-shrink-0">
          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
            member.status === 'نشط'
              ? 'bg-success bg-opacity-20 text-success'
              : 'bg-warning bg-opacity-20 text-warning'
          }`}>
            {member.status}
          </span>
          {!viewport.isMobile && (
            <p className="text-xs text-slate-400 mt-1">{member.joinDate}</p>
          )}
        </div>
      </div>
    </div>
  );

  // Example: Mobile-optimized form
  const MobileForm = () => (
    <form className="space-y-6">
      <div className="form-group">
        <label className="form-label">الاسم الكامل</label>
        <input
          type="text"
          className="form-input"
          placeholder="أدخل الاسم الكامل"
        />
      </div>

      <div className={`grid gap-4 ${viewport.isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
        <div className="form-group">
          <label className="form-label">رقم الهاتف</label>
          <input
            type="tel"
            className="form-input"
            placeholder="05xxxxxxxx"
          />
        </div>
        <div className="form-group">
          <label className="form-label">الحالة</label>
          <select className="form-select">
            <option>اختر الحالة</option>
            <option>نشط</option>
            <option>معلق</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">ملاحظات</label>
        <textarea
          className="form-textarea"
          rows={viewport.isMobile ? 3 : 4}
          placeholder="أدخل الملاحظات..."
        ></textarea>
      </div>

      <div className={`flex gap-3 ${viewport.isMobile ? 'flex-col' : 'flex-row'}`}>
        <button type="submit" className="btn btn-primary flex-1">
          حفظ البيانات
        </button>
        <button type="button" className="btn btn-secondary flex-1" onClick={close}>
          إلغاء
        </button>
      </div>
    </form>
  );

  // Sample data
  const stats = [
    { title: 'إجمالي الأعضاء', value: '248', icon: '👥', change: '+12' },
    { title: 'الأعضاء النشطين', value: '231', icon: '✅', change: '+8' },
    { title: 'الدفعات الشهرية', value: '45,250 ريال', icon: '💰', change: '+5.2%' },
    { title: 'الأنشطة القادمة', value: '7', icon: '📅', change: '+2' }
  ];

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
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-primary" dir="rtl">
      {/* Safe area aware container */}
      <div className="safe-area-container">

        {/* Mobile-optimized header */}
        <header
          className="glass-nav sticky top-0 z-50"
          style={applySafeArea(['top'])}
        >
          <div className="container">
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-accent rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">ش</span>
                </div>
                <div>
                  <h1 className={`font-bold text-white ${viewport.isMobile ? 'text-lg' : 'text-xl'}`}>
                    آل شعيل
                  </h1>
                  <p className="text-xs text-slate-300">إطار العمل المتجاوب</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Device info badge */}
                <span className={`px-2 py-1 rounded-full text-xs bg-glass text-slate-300 ${
                  viewport.isMobile ? 'hidden' : 'inline-block'
                }`}>
                  {viewport.breakpoint.toUpperCase()}
                </span>

                <button className="touch-target glass rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="container py-6 pb-20">

          {/* Framework info card */}
          <div className="glass-card mb-6">
            <h2 className="text-xl font-bold text-white mb-4">معلومات الإطار</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-400">نوع الجهاز</p>
                <p className="text-white font-medium">
                  {device.isMobile ? 'جوال' : 'سطح مكتب'}
                  {device.isIOS && ' (iOS)'}
                  {device.isAndroid && ' (Android)'}
                </p>
              </div>
              <div>
                <p className="text-slate-400">نقطة التوقف</p>
                <p className="text-white font-medium">{viewport.breakpoint}</p>
              </div>
              <div>
                <p className="text-slate-400">أبعاد الشاشة</p>
                <p className="text-white font-medium">{viewport.width} × {viewport.height}</p>
              </div>
              <div>
                <p className="text-slate-400">المنطقة الآمنة</p>
                <p className="text-white font-medium">
                  {safeArea.top}px / {safeArea.bottom}px
                </p>
              </div>
            </div>
          </div>

          {/* Statistics grid */}
          <div className={`grid gap-4 mb-6 ${
            viewport.breakpoint === 'xs' ? 'grid-cols-1' :
            viewport.breakpoint === 'sm' ? 'grid-cols-2' :
            'grid-cols-2 md:grid-cols-4'
          }`}>
            {stats.map((stat, index) => (
              <StatCard key={index} {...stat} />
            ))}
          </div>

          {/* Members section */}
          <div className="glass-card mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">أحدث الأعضاء</h3>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  feedback('medium');
                  open();
                }}
              >
                إضافة عضو
              </button>
            </div>

            <div className="space-y-3">
              {members.map((member) => (
                <MemberListItem key={member.id} member={member} />
              ))}
            </div>
          </div>

          {/* Mobile features demo */}
          <div className="glass-card">
            <h3 className="text-lg font-semibold text-white mb-4">ميزات الجوال</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                className="btn btn-secondary"
                onClick={() => feedback('light')}
              >
                اهتزاز خفيف
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => feedback('heavy')}
              >
                اهتزاز قوي
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => feedback('success')}
              >
                نجح
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => feedback('error')}
              >
                خطأ
              </button>
            </div>
          </div>

        </main>

        {/* Bottom sheet modal */}
        <div className={`bottom-sheet ${isOpen ? 'active' : ''}`} ref={containerRef}>
          <div className="bottom-sheet-backdrop" onClick={close}></div>
          <div className="bottom-sheet-content">
            <div className="bottom-sheet-handle"></div>

            <div className="bottom-sheet-header">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">إضافة عضو جديد</h3>
                <button className="touch-target glass rounded-lg" onClick={close}>
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="bottom-sheet-body">
              <MobileForm />
            </div>
          </div>
        </div>

        {/* Floating action button */}
        <button
          className="fab fab-right"
          onClick={() => {
            feedback('medium');
            open();
          }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>

      </div>
    </div>
  );
};

export default MobileFrameworkIntegration;