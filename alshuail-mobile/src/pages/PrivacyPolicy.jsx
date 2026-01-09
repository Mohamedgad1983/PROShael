import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Shield, Database, Users, Bell, Lock, Mail, Calendar, Globe } from 'lucide-react'

const PrivacyPolicy = () => {
  const navigate = useNavigate()
  const [language, setLanguage] = useState('ar') // 'ar' or 'en'

  const content = {
    ar: {
      title: 'سياسة الخصوصية',
      appName: 'صندوق عائلة شعيل العنزي',
      lastUpdated: 'آخر تحديث: يناير 2025',
      sections: [
        {
          icon: Shield,
          title: 'مقدمة',
          content: `مرحباً بك في تطبيق صندوق عائلة شعيل العنزي ("التطبيق"). نحن نقدر ثقتك بنا ونلتزم بحماية خصوصيتك. توضح سياسة الخصوصية هذه كيفية جمع معلوماتك الشخصية واستخدامها وحمايتها عند استخدام تطبيقنا.

التطبيق مخصص لإدارة شؤون صندوق العائلة، بما في ذلك الاشتراكات الشهرية، شجرة العائلة، حالات الدية، المناسبات، وخدمات الأعضاء.`
        },
        {
          icon: Database,
          title: 'المعلومات التي نجمعها',
          content: `نقوم بجمع المعلومات التالية:

• رقم الهاتف: لتسجيل الدخول عبر رمز التحقق (OTP) عبر واتساب
• الاسم الكامل: بالعربية والإنجليزية للتعريف
• رقم الهوية الوطنية: للتحقق من العضوية
• صلة القرابة: لبناء شجرة العائلة
• سجل المدفوعات: لتتبع الاشتراكات والمساهمات
• الصورة الشخصية: اختيارية لبطاقة العضوية
• معلومات الجهاز: لإرسال الإشعارات`
        },
        {
          icon: Users,
          title: 'كيف نستخدم معلوماتك',
          content: `نستخدم المعلومات المجمعة للأغراض التالية:

• التحقق من هويتك وتسجيل الدخول الآمن
• إدارة عضويتك في الصندوق
• معالجة الاشتراكات والمدفوعات
• عرض شجرة العائلة والعلاقات
• إرسال إشعارات مهمة عن المناسبات والمستحقات
• إنشاء بطاقة العضوية الرقمية
• تحسين خدمات التطبيق`
        },
        {
          icon: Lock,
          title: 'تخزين البيانات وأمانها',
          content: `نحن نأخذ أمان بياناتك على محمل الجد:

• جميع البيانات مشفرة أثناء النقل باستخدام بروتوكول HTTPS
• نستخدم خوادم آمنة مع تشفير متقدم
• الوصول للبيانات محدود للمسؤولين المعتمدين فقط
• نحتفظ ببياناتك طوال فترة عضويتك
• يمكنك طلب حذف بياناتك في أي وقت`
        },
        {
          icon: Globe,
          title: 'خدمات الطرف الثالث',
          content: `نستخدم الخدمات التالية لتشغيل التطبيق:

• Ultramsg: لإرسال رموز التحقق عبر واتساب
• Firebase: للإشعارات الفورية

هذه الخدمات ملتزمة بمعايير حماية البيانات الدولية ولا تُستخدم بياناتك لأي أغراض تسويقية.`
        },
        {
          icon: Users,
          title: 'خصوصية الأطفال',
          content: `تطبيقنا غير موجه للأطفال دون سن 13 عاماً. لا نجمع معلومات شخصية من الأطفال عن قصد. إذا علمنا بجمع معلومات من طفل، سنحذفها فوراً.

بالنسبة لأبناء أعضاء العائلة، يتم إدارة معلوماتهم من قبل أولياء أمورهم المسجلين في النظام.`
        },
        {
          icon: Shield,
          title: 'حقوقك',
          content: `لديك الحقوق التالية فيما يتعلق ببياناتك:

• الوصول: يمكنك الاطلاع على بياناتك المخزنة
• التصحيح: يمكنك تحديث معلوماتك الشخصية
• الحذف: يمكنك طلب حذف حسابك وبياناتك
• النقل: يمكنك طلب نسخة من بياناتك
• الاعتراض: يمكنك الاعتراض على معالجة بياناتك

لممارسة أي من هذه الحقوق، تواصل معنا عبر معلومات الاتصال أدناه.`
        },
        {
          icon: Mail,
          title: 'معلومات الاتصال',
          content: `للاستفسارات المتعلقة بالخصوصية:

• البريد الإلكتروني: privacy@alshailfund.com
• الهاتف: +966 50 XXX XXXX
• العنوان: المملكة العربية السعودية / الكويت

المطور: محمد (مطور مستقل)
الموقع: https://alshailfund.com`
        },
        {
          icon: Calendar,
          title: 'تحديثات السياسة',
          content: `قد نقوم بتحديث سياسة الخصوصية هذه من وقت لآخر. سنخطرك بأي تغييرات جوهرية عبر:

• إشعار داخل التطبيق
• رسالة عبر واتساب
• تحديث تاريخ "آخر تحديث" في أعلى هذه الصفحة

نوصي بمراجعة هذه السياسة بشكل دوري للاطلاع على أي تغييرات.`
        }
      ],
      backButton: 'العودة',
      toggleLanguage: 'English'
    },
    en: {
      title: 'Privacy Policy',
      appName: 'Al-Shuail Family Fund',
      lastUpdated: 'Last Updated: January 2025',
      sections: [
        {
          icon: Shield,
          title: 'Introduction',
          content: `Welcome to Al-Shuail Family Fund App ("the App"). We value your trust and are committed to protecting your privacy. This Privacy Policy explains how we collect, use, and protect your personal information when using our app.

The App is designed to manage family fund affairs, including monthly subscriptions, family tree, Diya cases, occasions, and member services.`
        },
        {
          icon: Database,
          title: 'Information We Collect',
          content: `We collect the following information:

• Phone Number: For login via OTP verification through WhatsApp
• Full Name: In Arabic and English for identification
• National ID Number: For membership verification
• Family Relationships: To build the family tree
• Payment History: To track subscriptions and contributions
• Profile Photo: Optional for membership card
• Device Information: For sending notifications`
        },
        {
          icon: Users,
          title: 'How We Use Your Information',
          content: `We use collected information for the following purposes:

• Verify your identity and secure login
• Manage your fund membership
• Process subscriptions and payments
• Display family tree and relationships
• Send important notifications about occasions and dues
• Create digital membership card
• Improve app services`
        },
        {
          icon: Lock,
          title: 'Data Storage and Security',
          content: `We take your data security seriously:

• All data is encrypted in transit using HTTPS protocol
• We use secure servers with advanced encryption
• Data access is limited to authorized administrators only
• We retain your data throughout your membership period
• You can request deletion of your data at any time`
        },
        {
          icon: Globe,
          title: 'Third-Party Services',
          content: `We use the following services to operate the app:

• Ultramsg: For sending OTP codes via WhatsApp
• Firebase: For push notifications

These services comply with international data protection standards and your data is not used for any marketing purposes.`
        },
        {
          icon: Users,
          title: "Children's Privacy",
          content: `Our app is not directed to children under 13 years of age. We do not knowingly collect personal information from children. If we learn that we have collected information from a child, we will delete it immediately.

For children of family members, their information is managed by their registered guardians in the system.`
        },
        {
          icon: Shield,
          title: 'Your Rights',
          content: `You have the following rights regarding your data:

• Access: You can view your stored data
• Correction: You can update your personal information
• Deletion: You can request deletion of your account and data
• Portability: You can request a copy of your data
• Objection: You can object to processing of your data

To exercise any of these rights, contact us using the information below.`
        },
        {
          icon: Mail,
          title: 'Contact Information',
          content: `For privacy-related inquiries:

• Email: privacy@alshailfund.com
• Phone: +966 50 XXX XXXX
• Address: Saudi Arabia / Kuwait

Developer: Mohamed (Independent Developer)
Website: https://alshailfund.com`
        },
        {
          icon: Calendar,
          title: 'Policy Updates',
          content: `We may update this Privacy Policy from time to time. We will notify you of any material changes via:

• In-app notification
• WhatsApp message
• Updating the "Last Updated" date at the top of this page

We recommend reviewing this policy periodically to stay informed of any changes.`
        }
      ],
      backButton: 'Back',
      toggleLanguage: 'العربية'
    }
  }

  const currentContent = content[language]

  return (
    <div className={`min-h-screen bg-gray-50 ${language === 'ar' ? 'font-cairo' : ''}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="gradient-primary px-4 pt-12 pb-8">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate(-1)}
            className="back-button"
            aria-label={currentContent.backButton}
          >
            <ArrowRight className={`w-5 h-5 ${language === 'en' ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            className="px-4 py-2 bg-white/20 rounded-lg text-white text-sm font-medium hover:bg-white/30 transition-colors"
          >
            {currentContent.toggleLanguage}
          </button>
        </div>
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-white/90" />
          <h1 className="text-2xl font-bold text-white mb-2">{currentContent.title}</h1>
          <p className="text-white/80 text-sm">{currentContent.appName}</p>
          <p className="text-white/60 text-xs mt-2">{currentContent.lastUpdated}</p>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 -mt-4">
        <div className="space-y-4">
          {currentContent.sections.map((section, index) => {
            const IconComponent = section.icon
            return (
              <div
                key={index}
                className="card animate-fadeIn"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                    <IconComponent className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-800">{section.title}</h2>
                </div>
                <div className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                  {section.content}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center pb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm">
            <Shield className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-gray-500">
              {language === 'ar' ? 'محمي ومؤمن' : 'Protected & Secure'}
            </span>
          </div>
          <p className="mt-4 text-xs text-gray-400">
            © 2025 {currentContent.appName}
          </p>
        </div>
      </div>
    </div>
  )
}

export default PrivacyPolicy
