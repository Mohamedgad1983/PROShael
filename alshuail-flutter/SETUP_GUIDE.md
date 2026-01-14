# 📱 دليل إعداد التطبيق - Al-Shuail Flutter App

## 🔧 الخطوة 1: إنشاء مجلدات المنصات

```bash
cd D:\PROShael\alshuail-flutter
flutter create .
```

---

## 📱 الخطوة 2: إعداد Android للبصمة

### 2.1 تعديل `android/app/src/main/AndroidManifest.xml`

أضف الأذونات داخل `<manifest>`:

```xml
<uses-permission android:name="android.permission.USE_BIOMETRIC"/>
<uses-permission android:name="android.permission.USE_FINGERPRINT"/>
<uses-permission android:name="android.permission.INTERNET"/>
```

### 2.2 تعديل `android/app/src/main/kotlin/.../MainActivity.kt`

```kotlin
package com.alshuail.app

import io.flutter.embedding.android.FlutterFragmentActivity

class MainActivity: FlutterFragmentActivity() {
}
```

> ⚠️ **مهم**: يجب تغيير `FlutterActivity` إلى `FlutterFragmentActivity`

### 2.3 تعديل `android/app/build.gradle`

```gradle
android {
    namespace "com.alshuail.app"
    compileSdk 34
    
    defaultConfig {
        applicationId "com.alshuail.app"
        minSdk 23  // مهم للبصمة
        targetSdk 34
        versionCode 1
        versionName "1.0.0"
    }
}
```

---

## 🍎 الخطوة 3: إعداد iOS للبصمة (Face ID)

### 3.1 تعديل `ios/Runner/Info.plist`

أضف داخل `<dict>`:

```xml
<key>NSFaceIDUsageDescription</key>
<string>نستخدم بصمة الوجه لتسجيل الدخول السريع</string>
```

---

## 🔥 الخطوة 4: إعداد Firebase (للإشعارات)

### 4.1 Android
1. اذهب إلى Firebase Console
2. أضف مشروع Android جديد
3. حمّل `google-services.json`
4. ضعه في `android/app/`

### 4.2 iOS
1. أضف مشروع iOS في Firebase
2. حمّل `GoogleService-Info.plist`
3. ضعه في `ios/Runner/`

---

## 📦 الخطوة 5: تثبيت Dependencies

```bash
flutter pub get
```

---

## ▶️ الخطوة 6: تشغيل التطبيق

```bash
# للتطوير
flutter run

# Android APK
flutter build apk --release

# iOS
flutter build ios --release
```

---

## ✅ قائمة التحقق

- [ ] `flutter create .` تم تنفيذه
- [ ] أذونات Android مضافة
- [ ] MainActivity تم تغييره إلى FlutterFragmentActivity
- [ ] minSdk = 23
- [ ] NSFaceIDUsageDescription مضاف لـ iOS
- [ ] Firebase مُعدّ (اختياري)
- [ ] `flutter pub get` تم تنفيذه
- [ ] التطبيق يعمل بنجاح

---

## 📱 الشاشات المكتملة (23 شاشة)

### 🔐 المصادقة (5)
1. ✅ SplashScreen - شاشة البداية
2. ✅ LoginScreen - تسجيل الدخول
3. ✅ OtpVerificationScreen - التحقق من OTP
4. ✅ BiometricLoginScreen - الدخول بالبصمة
5. ✅ ProfileCompletionScreen - إكمال الملف

### 🏠 الرئيسية (3)
6. ✅ DashboardScreen - لوحة التحكم
7. ✅ MainNavigation - التنقل الرئيسي
8. ✅ NotificationsScreen - الإشعارات

### 💰 المدفوعات (4)
9. ✅ PaymentsScreen - المدفوعات
10. ✅ PaymentMethodScreen - طريقة الدفع
11. ✅ BankTransferScreen - تحويل بنكي
12. ✅ PaymentDetailsScreen - تفاصيل الدفع

### 🌳 العائلة (3)
13. ✅ FamilyTreeScreen - شجرة العائلة
14. ✅ MemberCardScreen - بطاقة العضوية
15. ✅ AddChildrenScreen - إضافة الأبناء

### 📋 أخرى (8)
16. ✅ ProfileScreen - الملف الشخصي
17. ✅ SettingsScreen - الإعدادات
18. ✅ EventsScreen - الفعاليات
19. ✅ InitiativesScreen - المبادرات
20. ✅ NewsScreen - الأخبار
21. ✅ AccountStatementScreen - كشف الحساب
22. ✅ SuccessScreen - شاشة النجاح

---

## 🎯 الميزات المكتملة

### ✅ المصادقة
- [x] تسجيل الدخول بـ OTP عبر WhatsApp
- [x] Face ID / بصمة الإصبع
- [x] تسجيل الخروج
- [x] حفظ الجلسة

### ✅ البصمة (Biometric)
- [x] BiometricService - خدمة البصمة
- [x] BiometricLoginScreen - شاشة الدخول
- [x] تفعيل/إلغاء من الإعدادات
- [x] دعم Face ID و Fingerprint

### ✅ التخزين
- [x] StorageService - خدمة التخزين
- [x] التخزين الآمن للـ Token
- [x] Cache للبيانات

---

## 📞 الدعم

للمساعدة، تواصل عبر:
- WhatsApp: +966 XX XXX XXXX
- Email: support@alshuail.com

---

**تاريخ التحديث**: ديسمبر 2024
**الإصدار**: 1.0.0
