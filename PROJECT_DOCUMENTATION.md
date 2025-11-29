# 📚 Al-Shuail Family Management System - التوثيق النهائي

## 🎯 نظرة عامة

نظام إدارة عائلة الشعيل - منصة رقمية شاملة لإدارة شؤون العائلة تشمل:
- إدارة الأعضاء والاشتراكات
- شجرة العائلة التفاعلية
- إدارة المبادرات والمناسبات
- التقارير المالية
- نظام الإشعارات

---

## 🏗️ البنية التقنية

### Backend
- **Framework**: Node.js + Express.js
- **Database**: PostgreSQL (Supabase)
- **Authentication**: JWT
- **Hosting**: Contabo VPS (Ubuntu 24.04)
- **Process Manager**: PM2
- **SSL**: Let's Encrypt

### Frontend (Admin)
- **Framework**: React 18 + TypeScript
- **Styling**: Tailwind CSS + DaisyUI
- **Hosting**: Cloudflare Pages
- **Charts**: Chart.js

### Mobile PWA
- **Type**: Progressive Web App
- **Notifications**: Firebase Cloud Messaging
- **Offline**: Service Worker

---

## 🌐 الروابط

| الخدمة | الرابط |
|--------|--------|
| API | https://api.alshailfund.com |
| Admin Dashboard | https://alshuail-admin.pages.dev |
| Domain | https://alshailfund.com |

---

## 📊 قاعدة البيانات

### الجداول الرئيسية (64 جدول)

| الجدول | الوصف | الحقول المهمة |
|--------|-------|---------------|
| `members` | بيانات الأعضاء | id, full_name, phone, parent_member_id |
| `users` | مستخدمي النظام | id, email, role, password_hash |
| `subscriptions` | الاشتراكات | member_id, plan_id, status |
| `payments` | المدفوعات | payer_id, amount, payment_date |
| `family_branches` | فخوذ العائلة | id, branch_name |
| `activities` | الأنشطة والمبادرات | id, title_ar, target_amount |
| `audit_logs` | سجل التدقيق | admin_id, action, resource_type |
| `notification_logs` | سجل الإشعارات | member_id, title, status |
| `device_tokens` | رموز الأجهزة (FCM) | token, member_id, platform |

---

## 🔌 الـ APIs

### Authentication
```
POST /api/auth/login          - تسجيل الدخول
POST /api/auth/verify-otp     - تحقق OTP
POST /api/auth/logout         - تسجيل الخروج
```

### Members
```
GET    /api/members           - قائمة الأعضاء
POST   /api/members           - إضافة عضو
GET    /api/members/:id       - بيانات عضو
PUT    /api/members/:id       - تحديث عضو
DELETE /api/members/:id       - حذف عضو
```

### Family Tree
```
GET  /api/family-tree                    - الشجرة الكاملة
GET  /api/family-tree/visualization/:id  - بيانات عضو للعرض
GET  /api/family-tree/search             - بحث
GET  /api/family-tree/stats              - إحصائيات
```

### Subscriptions
```
GET  /api/subscriptions           - قائمة الاشتراكات
POST /api/subscriptions           - إضافة اشتراك
GET  /api/subscriptions/:id       - تفاصيل اشتراك
PUT  /api/subscriptions/:id       - تحديث اشتراك
```

### Push Notifications
```
POST /api/notifications/push/register     - تسجيل جهاز
POST /api/notifications/push/unregister   - إلغاء تسجيل
POST /api/notifications/push/send         - إرسال لعضو
POST /api/notifications/push/broadcast    - إرسال للجميع
```

### Audit Logs
```
GET /api/audit/logs          - سجل التدقيق
GET /api/audit/stats         - إحصائيات
GET /api/audit/export        - تصدير
```

### Reports
```
GET /api/reports/financial   - التقارير المالية
GET /api/reports/members     - تقارير الأعضاء
GET /api/reports/subscriptions - تقارير الاشتراكات
```

---

## 🔐 الأمان

### المصادقة
- JWT Tokens مع انتهاء صلاحية
- CSRF Protection
- Rate Limiting (100 req/15min)

### التشفير
- bcrypt لكلمات المرور
- HTTPS فقط
- Helmet security headers

### الصلاحيات
| الدور | الصلاحيات |
|-------|-----------|
| super_admin | كل الصلاحيات |
| admin | إدارة الأعضاء والاشتراكات |
| financial_manager | التقارير المالية |
| member | عرض فقط |

---

## 🔧 إعداد البيئة

### متغيرات البيئة (.env)
```env
# Database
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_KEY=xxxxx

# Auth
JWT_SECRET=xxxxx

# Firebase
FIREBASE_PROJECT_ID=xxxxx
FIREBASE_PRIVATE_KEY=xxxxx
FIREBASE_CLIENT_EMAIL=xxxxx
```

### أوامر التشغيل
```bash
# Development
npm run dev

# Production
npm start

# Tests
npm test
```

---

## 📱 تطبيق الموبايل (PWA)

### الصفحات
- `/login.html` - تسجيل الدخول
- `/dashboard.html` - لوحة التحكم
- `/profile.html` - الملف الشخصي
- `/payment.html` - المدفوعات
- `/family-tree.html` - شجرة العائلة
- `/events.html` - المناسبات
- `/notifications.html` - الإشعارات

### الإشعارات
- Firebase Cloud Messaging
- Background notifications via Service Worker
- In-app notifications

---

## 📊 الإحصائيات

| المقياس | القيمة |
|---------|--------|
| إجمالي الأعضاء | 347 |
| الجداول | 64 |
| العلاقات | 94 |
| APIs | 50+ |
| الاختبارات | 532 |
| نسبة النجاح | 100% |

---

## 🚀 النشر والتحديث

### تحديث Backend
```bash
ssh root@213.199.62.185
cd /var/www/PROShael
git pull origin main
npm install
pm2 restart all
```

### تحديث Frontend
يتم تلقائياً عبر Cloudflare Pages عند الـ push لـ GitHub.

---

## 📞 معلومات السيرفر

| البند | القيمة |
|-------|--------|
| Provider | Contabo |
| IP | 213.199.62.185 |
| OS | Ubuntu 24.04 LTS |
| RAM | 12GB |
| CPU | 6 vCPUs |
| Storage | 200GB SSD |

---

## ✅ نسبة الإنجاز

| المكون | النسبة |
|--------|--------|
| Backend API | 100% |
| Admin Dashboard | 95% |
| Mobile PWA | 85% |
| Family Tree | 95% |
| Notifications | 100% |
| Audit Logs | 100% |
| **الإجمالي** | **~95%** |

---

## 📝 المتبقي

1. بوابة الدفع (K-Net) - يحتاج تعاقد
2. WhatsApp Business API - يحتاج تعاقد
3. SMS OTP - مؤجل

---

**آخر تحديث**: 29 نوفمبر 2025

**المطور**: Mohamed Gad

**المشروع**: Al-Shuail Family Management System
