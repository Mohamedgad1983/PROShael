import React from 'react';
import FamilyTree from './FamilyTree';
import { useFamilyTreeData } from './useFamilyTreeData';
import './FamilyTree.css';

// Family Tree Page Component with Arabic RTL Support
const FamilyTreePage: React.FC = () => {
  const { treeData, loading, error, searchMembers } = useFamilyTreeData();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-800 to-pink-700" dir="rtl">
      {/* Page Header */}
      <div className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">
                شجرة عائلة الشعيل
              </h1>
              <p className="mt-2 text-white/80">
                عرض تفاعلي لشجرة العائلة مع دعم كامل للغة العربية
              </p>
            </div>
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="text-white text-sm">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 bg-blue-500 rounded-full"></span>
                  <span>ذكر</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 bg-pink-500 rounded-full"></span>
                  <span>أنثى</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Family Tree Component */}
      <div className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
              <p className="mt-4 text-white text-lg">جاري تحميل شجرة العائلة...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <div className="bg-red-500/20 backdrop-blur-lg rounded-lg p-6 max-w-md">
                <p className="text-white text-lg">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-6 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all"
                >
                  إعادة المحاولة
                </button>
              </div>
            </div>
          </div>
        ) : (
          <FamilyTree />
        )}
      </div>

      {/* Statistics Panel */}
      <div className="fixed bottom-4 right-4 bg-white/10 backdrop-blur-lg rounded-lg p-4 border border-white/20">
        <h3 className="text-white font-semibold mb-2">إحصائيات العائلة</h3>
        <div className="space-y-1 text-white/80 text-sm">
          <div>إجمالي الأعضاء: 299</div>
          <div>الأعضاء النشطون: 288</div>
          <div>عدد الأجيال: 4</div>
        </div>
      </div>

      {/* Instructions Panel */}
      <div className="fixed bottom-4 left-4 bg-white/10 backdrop-blur-lg rounded-lg p-4 border border-white/20 max-w-xs">
        <h3 className="text-white font-semibold mb-2">تعليمات الاستخدام</h3>
        <ul className="space-y-1 text-white/80 text-sm" dir="rtl">
          <li>• اضغط على أي عضو لعرض تفاصيله</li>
          <li>• استخدم البحث للوصول السريع</li>
          <li>• يمكنك التكبير والتصغير بعجلة الماوس</li>
          <li>• اسحب لتحريك الشجرة</li>
          <li>• اضغط على زر التصدير لحفظ الشجرة</li>
        </ul>
      </div>
    </div>
  );
};

export default FamilyTreePage;