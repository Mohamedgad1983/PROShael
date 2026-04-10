# 🚀 Al-Shuail Family Fund - iOS App Setup Guide

## خطوات الإعداد في Xcode

### 1. إنشاء مشروع Xcode جديد
```
Open Xcode → New Project → App
- Product Name: AlShuailFund
- Team: Mohamed (BNJQJM8RW8)
- Organization ID: com.alshuail
- Bundle ID: com.alshuail.fund
- Interface: SwiftUI
- Language: Swift
- Minimum Deployments: iOS 16.0
```

### 2. نقل الملفات
```
1. احذف ContentView.swift و AlShuailFundApp.swift الموجودين
2. انقل محتويات AlShuailFund/ folder إلى داخل مجلد المشروع في Xcode
3. اسحب كل الملفات إلى Xcode Navigator
```

### 3. تثبيت خطوط Cairo
```
1. حمل Cairo من Google Fonts: https://fonts.google.com/specimen/Cairo
2. انقل الملفات التالية إلى Resources/Fonts/:
   - Cairo-Regular.ttf
   - Cairo-Medium.ttf
   - Cairo-SemiBold.ttf
   - Cairo-Bold.ttf
3. أضف للـ Info.plist:
   <key>UIAppFonts</key>
   <array>
     <string>Cairo-Regular.ttf</string>
     <string>Cairo-Medium.ttf</string>
     <string>Cairo-SemiBold.ttf</string>
     <string>Cairo-Bold.ttf</string>
   </array>
```

### 4. تشغيل Claude Agent
```
ضع CLAUDE.md في root المشروع
افتح Claude Agent في Xcode
اطلب: "Read CLAUDE.md and build the project. Fix any compilation errors."
```

## 📁 هيكل الملفات (22 ملف)
```
AlShuailFund/
├── CLAUDE.md                          # سياق المشروع لـ Claude Agent
├── App/
│   ├── AlShuailFundApp.swift          # نقطة الدخول
│   └── AppState.swift                 # حالة التطبيق العامة
├── Core/
│   ├── Network/
│   │   ├── NetworkManager.swift       # HTTP client + JWT
│   │   ├── APIEndpoint.swift          # جميع الـ endpoints
│   │   ├── APIError.swift             # أخطاء بالعربي
│   │   └── TokenManager.swift         # Keychain storage
│   ├── Theme/
│   │   ├── AppColors.swift            # نظام الألوان
│   │   └── AppFonts.swift             # خطوط Cairo
│   └── Extensions/
│       └── HijriDateExtension.swift   # التقويم الهجري
├── Models/
│   └── Models.swift                   # جميع النماذج
├── Navigation/
│   └── MainTabView.swift              # التنقل الرئيسي
└── Features/
    ├── Auth/                          # تسجيل الدخول
    ├── Dashboard/                     # لوحة التحكم
    ├── Subscriptions/                 # المدفوعات
    ├── Initiatives/                   # المبادرات
    ├── Events/                        # المناسبات
    ├── FamilyTree/                    # شجرة العائلة
    ├── Notifications/                 # الإشعارات
    ├── Profile/                       # الملف الشخصي
    ├── Diya/                          # قضايا الدية
    └── Reports/                       # التقارير
```

## ✅ ما تم إنجازه (Sprint 0)
- [x] CLAUDE.md بكامل سياق المشروع
- [x] MVVM Architecture
- [x] NetworkManager (JWT + Token Refresh + Upload)
- [x] Design System (Colors + Fonts)
- [x] Auth Flow (Splash → Login → Dashboard)
- [x] Dashboard + Balance Card + Quick Actions
- [x] Profile + Account Deletion (Apple requirement)
- [x] Notifications View
- [x] Subscriptions View
- [x] Family Tree View (10 branches)
- [x] Initiatives View
- [x] Events View
- [x] Diya Cases View
- [x] Reports View
- [x] Hijri Calendar Extension
- [x] All Data Models

## 🔜 Sprint 1 (القادم)
- [ ] ربط Login بالـ API الفعلي
- [ ] تحميل بيانات Dashboard من الخادم
- [ ] iPad responsive layout
- [ ] End-to-end testing
