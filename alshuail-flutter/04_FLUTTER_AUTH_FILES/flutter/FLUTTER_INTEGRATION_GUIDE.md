# 📱 دليل دمج شاشات المصادقة - Flutter Integration Guide

## 📁 الملفات المُنشأة:

```
lib/
├── services/
│   └── auth_service.dart         ← خدمة المصادقة الكاملة
└── screens/
    └── auth/
        ├── login_screen.dart             ← شاشة تسجيل الدخول
        ├── otp_verification_screen.dart  ← شاشة التحقق من OTP
        ├── create_password_screen.dart   ← شاشة إنشاء كلمة مرور
        └── forgot_password_screen.dart   ← شاشة استعادة كلمة المرور
```

---

## 🔧 خطوات الدمج:

### الخطوة 1: نسخ الملفات

```bash
# انسخ الملفات إلى مشروع Flutter
cp -r lib/services/* D:/PROShael/alshuail-flutter/lib/services/
cp -r lib/screens/auth/* D:/PROShael/alshuail-flutter/lib/screens/auth/
```

### الخطوة 2: تثبيت المكتبات

أضف هذه المكتبات في `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  http: ^1.1.0
  shared_preferences: ^2.2.2
  local_auth: ^2.1.8
```

ثم نفذ:
```bash
flutter pub get
```

### الخطوة 3: تحديث iOS (للـ Face ID)

في ملف `ios/Runner/Info.plist` أضف:

```xml
<key>NSFaceIDUsageDescription</key>
<string>نحتاج Face ID للدخول السريع والآمن</string>
```

### الخطوة 4: تحديث Android (للبصمة)

في ملف `android/app/src/main/AndroidManifest.xml` أضف:

```xml
<uses-permission android:name="android.permission.USE_BIOMETRIC"/>
```

### الخطوة 5: تحديث Router

في ملف `app_router.dart`:

```dart
import 'screens/auth/login_screen.dart';
import 'screens/auth/otp_verification_screen.dart';
import 'screens/auth/create_password_screen.dart';
import 'screens/auth/forgot_password_screen.dart';

// Routes
GoRoute(
  path: '/login',
  builder: (context, state) => const LoginScreen(),
),
GoRoute(
  path: '/otp-verification',
  builder: (context, state) {
    final args = state.extra as Map<String, dynamic>;
    return OTPVerificationScreen(
      phone: args['phone'],
      requiresPasswordSetup: args['requiresPasswordSetup'] ?? false,
    );
  },
),
GoRoute(
  path: '/create-password',
  builder: (context, state) => const CreatePasswordScreen(),
),
GoRoute(
  path: '/forgot-password',
  builder: (context, state) => const ForgotPasswordScreen(),
),
```

---

## 🔄 مسار المستخدم:

### مستخدم جديد (أول مرة):
```
Login → إدخال رقم الجوال → OTP → إنشاء كلمة مرور → الرئيسية
```

### مستخدم موجود (لديه كلمة مرور):
```
Login → رقم + كلمة مرور → الرئيسية
        ↓
   أو OTP → الرئيسية
        ↓
   أو Face ID → الرئيسية
```

### نسي كلمة المرور:
```
نسيت كلمة المرور → رقم الجوال → OTP → كلمة مرور جديدة → تسجيل الدخول
```

---

## 📱 شاشات التطبيق:

### 1. Login Screen
```
┌─────────────────────────────┐
│      🏛️ شعار الصندوق        │
│                             │
│  ┌───────────────────────┐  │
│  │ 📱 رقم الجوال         │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │ 🔒 كلمة المرور        │  │
│  └───────────────────────┘  │
│                             │
│  [تسجيل الدخول]             │
│                             │
│  ─────── أو ───────         │
│                             │
│  [الدخول برمز OTP]          │
│                             │
│  نسيت كلمة المرور؟          │
│                             │
│        😊 Face ID           │
└─────────────────────────────┘
```

### 2. OTP Verification
```
┌─────────────────────────────┐
│         📨 التحقق           │
│                             │
│  تم إرسال رمز إلى WhatsApp  │
│        0501234567           │
│                             │
│   ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐   │
│   │ │ │ │ │ │ │ │ │ │ │ │   │
│   └─┘ └─┘ └─┘ └─┘ └─┘ └─┘   │
│                             │
│        [تحقق]               │
│                             │
│  لم يصلك؟ إعادة الإرسال (45) │
└─────────────────────────────┘
```

### 3. Create Password
```
┌─────────────────────────────┐
│    🔐 إنشاء كلمة مرور       │
│                             │
│  ┌───────────────────────┐  │
│  │ كلمة المرور الجديدة   │  │
│  └───────────────────────┘  │
│  [═══════════] قوية         │
│                             │
│  ┌───────────────────────┐  │
│  │ تأكيد كلمة المرور     │  │
│  └───────────────────────┘  │
│                             │
│  💡 نصائح لكلمة مرور قوية   │
│                             │
│  [إنشاء كلمة المرور]        │
└─────────────────────────────┘
```

### 4. Forgot Password (3 خطوات)
```
Step 1: رقم الجوال → Step 2: OTP → Step 3: كلمة مرور جديدة
```

---

## 🔗 API Endpoints المستخدمة:

| Method | Endpoint | الاستخدام |
|--------|----------|-----------|
| POST | `/api/auth/login` | دخول بكلمة المرور |
| POST | `/api/auth/request-otp` | طلب OTP |
| POST | `/api/auth/verify-otp` | التحقق من OTP |
| POST | `/api/auth/create-password` | إنشاء كلمة مرور |
| POST | `/api/auth/reset-password` | استعادة كلمة المرور |
| POST | `/api/auth/face-id-login` | دخول بـ Face ID |
| POST | `/api/auth/enable-face-id` | تفعيل Face ID |
| POST | `/api/auth/disable-face-id` | إلغاء Face ID |

---

## ⚙️ تغيير API URL:

في ملف `auth_service.dart` غيّر:

```dart
static const String baseUrl = 'https://api.alshailfund.com/api/auth';
```

إلى عنوان السيرفر الخاص بك.

---

## 🔐 ميزات الأمان:

1. ✅ تشفير كلمة المرور (bcrypt)
2. ✅ OTP صالح 5 دقائق
3. ✅ قفل الحساب بعد 5 محاولات فاشلة
4. ✅ Face ID / البصمة
5. ✅ JWT Token (صالح 30 يوم)
6. ✅ Rate limiting على OTP

---

## 🧪 الاختبار:

### اختبار تسجيل الدخول:
1. افتح التطبيق
2. أدخل رقم جوال مسجل
3. جرب الدخول بكلمة المرور
4. جرب الدخول بـ OTP

### اختبار استعادة كلمة المرور:
1. اضغط "نسيت كلمة المرور"
2. أدخل رقم الجوال
3. أدخل OTP المرسل
4. أنشئ كلمة مرور جديدة

### اختبار Face ID:
1. سجل دخول عادي
2. اذهب للإعدادات → فعّل Face ID
3. اخرج من التطبيق
4. أعد فتحه → سيظهر Face ID

---

## ✅ جاهز للاستخدام!

**ملاحظة**: تأكد من أن الـ Backend يعمل وأن جميع الـ endpoints متاحة قبل الاختبار.

---

**تاريخ الإنشاء**: December 20, 2024
**المشروع**: صندوق عائلة شعيل العنزي
