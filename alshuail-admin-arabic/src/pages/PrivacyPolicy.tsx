import React from 'react';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-center gap-4">
            <img
              src="/logo.svg"
              alt="صندوق الشعيل"
              className="w-12 h-12"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <h1 className="text-2xl font-bold text-gray-800">صندوق شعيل العنزي</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
            سياسة الخصوصية
          </h1>
          <p className="text-center text-gray-500 mb-8">Privacy Policy</p>

          <p className="text-gray-600 mb-6 text-center">
            آخر تحديث: {new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          {/* Introduction */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 border-r-4 border-blue-500 pr-3">
              مقدمة
            </h2>
            <p className="text-gray-600 leading-relaxed">
              مرحباً بكم في تطبيق صندوق شعيل العنزي. نحن نحترم خصوصيتكم ونلتزم بحماية بياناتكم الشخصية.
              توضح سياسة الخصوصية هذه كيفية جمع واستخدام وحماية المعلومات التي تقدمونها لنا عند استخدام تطبيقنا.
            </p>
          </section>

          {/* Information Collection */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 border-r-4 border-blue-500 pr-3">
              المعلومات التي نجمعها
            </h2>
            <p className="text-gray-600 mb-4">نقوم بجمع المعلومات التالية:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 mr-4">
              <li>معلومات الهوية: الاسم الكامل، رقم العضوية</li>
              <li>معلومات الاتصال: رقم الهاتف، البريد الإلكتروني</li>
              <li>معلومات العائلة: صلة القرابة، الفخذ العائلي</li>
              <li>المعلومات المالية: سجل الاشتراكات والمدفوعات</li>
              <li>بيانات الجهاز: نوع الجهاز، نظام التشغيل (لأغراض تقنية فقط)</li>
            </ul>
          </section>

          {/* How We Use Information */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 border-r-4 border-blue-500 pr-3">
              كيف نستخدم معلوماتكم
            </h2>
            <p className="text-gray-600 mb-4">نستخدم المعلومات المجمعة للأغراض التالية:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 mr-4">
              <li>إدارة حسابات الأعضاء والاشتراكات</li>
              <li>إرسال إشعارات مهمة حول الصندوق والمناسبات</li>
              <li>معالجة المدفوعات والاشتراكات</li>
              <li>التواصل معكم بخصوص خدمات الصندوق</li>
              <li>تحسين تجربة المستخدم وتطوير التطبيق</li>
              <li>عرض شجرة العائلة والروابط العائلية</li>
            </ul>
          </section>

          {/* Data Protection */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 border-r-4 border-blue-500 pr-3">
              حماية البيانات
            </h2>
            <p className="text-gray-600 leading-relaxed">
              نتخذ إجراءات أمنية مناسبة لحماية بياناتكم الشخصية من الوصول غير المصرح به أو التغيير أو الإفصاح أو التدمير.
              تشمل هذه الإجراءات:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 mr-4 mt-4">
              <li>تشفير البيانات أثناء النقل والتخزين</li>
              <li>حماية الوصول بكلمات مرور قوية</li>
              <li>المصادقة الآمنة للمستخدمين</li>
              <li>مراجعة دورية لإجراءات الأمان</li>
            </ul>
          </section>

          {/* Data Sharing */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 border-r-4 border-blue-500 pr-3">
              مشاركة البيانات
            </h2>
            <p className="text-gray-600 leading-relaxed">
              نحن لا نبيع أو نؤجر أو نشارك معلوماتكم الشخصية مع أطراف ثالثة لأغراض تسويقية.
              قد نشارك بياناتكم فقط في الحالات التالية:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 mr-4 mt-4">
              <li>مع أعضاء الصندوق الآخرين (معلومات شجرة العائلة فقط)</li>
              <li>عند الضرورة للامتثال للقوانين والأنظمة</li>
              <li>مع مقدمي الخدمات الذين يساعدوننا في تشغيل التطبيق (بموجب اتفاقيات سرية)</li>
            </ul>
          </section>

          {/* User Rights */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 border-r-4 border-blue-500 pr-3">
              حقوقكم
            </h2>
            <p className="text-gray-600 mb-4">يحق لكم:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 mr-4">
              <li>الوصول إلى بياناتكم الشخصية المخزنة لدينا</li>
              <li>طلب تصحيح أي معلومات غير دقيقة</li>
              <li>طلب حذف حسابكم وبياناتكم</li>
              <li>الانسحاب من تلقي الإشعارات</li>
            </ul>
          </section>

          {/* Push Notifications */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 border-r-4 border-blue-500 pr-3">
              الإشعارات
            </h2>
            <p className="text-gray-600 leading-relaxed">
              قد نرسل لكم إشعارات على جهازكم حول:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 mr-4 mt-4">
              <li>تذكيرات الاشتراكات والمدفوعات</li>
              <li>أخبار ومستجدات الصندوق</li>
              <li>المناسبات والفعاليات العائلية</li>
              <li>إعلانات مهمة</li>
            </ul>
            <p className="text-gray-600 mt-4">
              يمكنكم إدارة تفضيلات الإشعارات من إعدادات التطبيق أو إعدادات جهازكم.
            </p>
          </section>

          {/* Data Retention */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 border-r-4 border-blue-500 pr-3">
              الاحتفاظ بالبيانات
            </h2>
            <p className="text-gray-600 leading-relaxed">
              نحتفظ ببياناتكم طالما أنتم أعضاء نشطون في الصندوق.
              في حال طلبتم حذف حسابكم، سنقوم بحذف بياناتكم الشخصية خلال 30 يوماً،
              مع الاحتفاظ بالسجلات المالية حسب المتطلبات القانونية.
            </p>
          </section>

          {/* Children's Privacy */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 border-r-4 border-blue-500 pr-3">
              خصوصية الأطفال
            </h2>
            <p className="text-gray-600 leading-relaxed">
              هذا التطبيق مخصص لأعضاء عائلة الشعيل من جميع الأعمار.
              بيانات الأعضاء القاصرين تتم إدارتها من قبل أولياء أمورهم المسجلين في الصندوق.
            </p>
          </section>

          {/* Changes to Policy */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 border-r-4 border-blue-500 pr-3">
              تغييرات على السياسة
            </h2>
            <p className="text-gray-600 leading-relaxed">
              قد نقوم بتحديث سياسة الخصوصية من وقت لآخر.
              سنقوم بإخطاركم بأي تغييرات جوهرية عبر التطبيق أو البريد الإلكتروني.
              استمراركم في استخدام التطبيق بعد التغييرات يعني موافقتكم على السياسة المحدثة.
            </p>
          </section>

          {/* Contact */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 border-r-4 border-blue-500 pr-3">
              اتصل بنا
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              إذا كان لديكم أي أسئلة أو استفسارات حول سياسة الخصوصية، يرجى التواصل معنا:
            </p>
            <div className="bg-gray-50 rounded-lg p-4 text-gray-600">
              <p className="mb-2"><strong>البريد الإلكتروني:</strong> privacy@alshailfund.com</p>
              <p className="mb-2"><strong>الموقع الإلكتروني:</strong> https://alshailfund.com</p>
              <p><strong>صندوق شعيل العنزي</strong> - المملكة العربية السعودية</p>
            </div>
          </section>

          {/* Agreement */}
          <section className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-gray-600 text-center leading-relaxed">
              باستخدامكم لتطبيق صندوق شعيل العنزي، فإنكم توافقون على شروط سياسة الخصوصية هذه.
            </p>
          </section>
        </div>

        {/* Footer */}
        <footer className="text-center mt-8 pb-8">
          <p className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} صندوق شعيل العنزي. جميع الحقوق محفوظة.
          </p>
          <p className="text-gray-400 text-xs mt-2">
            Shuail Al-Anzi Family Fund - All Rights Reserved
          </p>
        </footer>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
