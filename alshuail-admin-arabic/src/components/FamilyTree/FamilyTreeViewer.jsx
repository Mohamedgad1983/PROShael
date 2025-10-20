import React, { useState } from 'react';
import {
  UsersIcon,
  ChartBarIcon,
  DevicePhoneMobileIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

/**
 * FamilyTreeViewer Component
 * Displays the new HTML-based family tree interface using iframes
 * Replaces the old D3.js tree visualization
 */
const FamilyTreeViewer = () => {
  // State to track which view is active
  const [activeView, setActiveView] = useState('admin'); // admin, tree, mobile

  // Get the base URL for the HTML files
  const getHtmlUrl = (filename) => {
    // In development, files are served from public folder
    return `/family-tree/${filename}`;
  };

  // View configurations
  const views = {
    admin: {
      title: 'إدارة الفخوذ والتسجيلات',
      subtitle: 'لوحة تحكم الفخوذ الثمانية',
      icon: UsersIcon,
      url: getHtmlUrl('admin_clan_management.html'),
      color: 'bg-purple-600'
    },
    tree: {
      title: 'شجرة العائلة',
      subtitle: 'عرض الشجرة الكاملة بالخط الزمني',
      icon: ChartBarIcon,
      url: getHtmlUrl('family-tree-timeline.html'),
      color: 'bg-green-600'
    },
    mobile: {
      title: 'تسجيل عضو جديد',
      subtitle: 'واجهة التسجيل للأعضاء الجدد',
      icon: DevicePhoneMobileIcon,
      url: getHtmlUrl('mobile_app_registration.html'),
      color: 'bg-blue-600'
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header Navigation */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Title */}
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                {views[activeView].title}
              </h1>
              <span className="ml-3 text-sm text-gray-500">
                {views[activeView].subtitle}
              </span>
            </div>

            {/* View Switcher Tabs */}
            <div className="flex space-x-2 rtl:space-x-reverse">
              {Object.entries(views).map(([key, view]) => {
                const Icon = view.icon;
                const isActive = activeView === key;

                return (
                  <button
                    key={key}
                    onClick={() => setActiveView(key)}
                    className={`
                      flex items-center px-4 py-2 rounded-lg transition-all duration-200
                      ${isActive
                        ? `${view.color} text-white shadow-lg transform scale-105`
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5 ml-2" />
                    <span className="text-sm font-medium">{view.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Info Banner */}
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="mr-3 flex-1 md:flex md:justify-between">
                <p className="text-sm text-blue-700">
                  {activeView === 'admin' && 'استخدم هذه الواجهة لإدارة الفخوذ الثمانية واعتماد طلبات الانضمام'}
                  {activeView === 'tree' && 'اعرض شجرة العائلة الكاملة مع 12 جيل من 1900 إلى 2025'}
                  {activeView === 'mobile' && 'واجهة تسجيل الأعضاء الجدد عبر رقم الجوال والتحقق بـ OTP'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Iframe Container */}
      <div className="flex-1 relative bg-white">
        <iframe
          key={activeView} // Force reload when view changes
          src={views[activeView].url}
          title={views[activeView].title}
          className="absolute inset-0 w-full h-full border-0"
          style={{ minHeight: '600px' }}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>

      {/* Loading Overlay (shown briefly during iframe load) */}
      <div
        className="hidden absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center"
        id="loading-overlay"
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    </div>
  );
};

export default FamilyTreeViewer;