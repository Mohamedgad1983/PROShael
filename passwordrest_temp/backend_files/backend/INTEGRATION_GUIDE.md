# 📋 دليل دمج ملفات المصادقة - Backend Integration Guide

## 📁 الملفات المُنشأة:

```
backend/
├── controllers/
│   └── authController.js      ← Controller (11 functions)
├── routes/
│   └── authRoutes.js          ← Routes (10 endpoints)
├── middleware/
│   └── authMiddleware.js      ← Auth middleware
└── services/
    └── whatsappService.js     ← WhatsApp OTP service
```

---

## 🔧 خطوات الدمج:

### الخطوة 1: نسخ الملفات

انسخ الملفات إلى مجلد Backend على VPS:

```bash
# الاتصال بالسيرفر
ssh root@your-vps-ip

# الانتقال لمجلد Backend
cd /var/www/alshuail-backend

# إنشاء المجلدات إذا لم تكن موجودة
mkdir -p controllers routes middleware services
```

### الخطوة 2: تحديث app.js أو server.js

أضف هذا السطر لتسجيل routes المصادقة:

```javascript
// في ملف app.js أو server.js

// Import auth routes
const authRoutes = require('./routes/authRoutes');

// Use auth routes
app.use('/api/auth', authRoutes);
```

### الخطوة 3: تحديث ملف .env

تأكد من وجود هذه المتغيرات:

```env
# JWT
JWT_SECRET=your-super-secret-key-here-make-it-long-and-random

# WhatsApp (Ultramsg)
ULTRAMSG_INSTANCE_ID=instance12345
ULTRAMSG_TOKEN=your-ultramsg-token
```

### الخطوة 4: تثبيت المكتبات المطلوبة

```bash
npm install bcryptjs jsonwebtoken axios
```

### الخطوة 5: إعادة تشغيل السيرفر

```bash
pm2 restart alshuail-api
# أو
pm2 restart all
```

---

## 🔗 API Endpoints المتاحة:

### Public (بدون تسجيل دخول):

| Method | Endpoint | الوصف |
|--------|----------|-------|
| POST | `/api/auth/login` | دخول بالباسورد |
| POST | `/api/auth/request-otp` | طلب رمز OTP |
| POST | `/api/auth/verify-otp` | التحقق من OTP |
| POST | `/api/auth/reset-password` | استعادة كلمة المرور |
| POST | `/api/auth/face-id-login` | دخول بـ Face ID |

### Protected (يتطلب Token):

| Method | Endpoint | الوصف |
|--------|----------|-------|
| POST | `/api/auth/create-password` | إنشاء كلمة مرور |
| POST | `/api/auth/enable-face-id` | تفعيل Face ID |
| POST | `/api/auth/disable-face-id` | إلغاء Face ID |

### Admin (Super Admin فقط):

| Method | Endpoint | الوصف |
|--------|----------|-------|
| GET | `/api/auth/admin/member/:id/security` | معلومات أمان العضو |
| DELETE | `/api/auth/admin/member/:id/password` | حذف كلمة المرور |
| DELETE | `/api/auth/admin/member/:id/face-id` | حذف Face ID |

---

## 📝 أمثلة الاستخدام:

### 1. تسجيل دخول بكلمة المرور:

```bash
curl -X POST https://api.alshailfund.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "0501234567",
    "password": "mypassword123"
  }'
```

**الرد:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "member": {
    "id": "uuid-here",
    "phone": "0501234567",
    "fullNameAr": "محمد أحمد الشعيل",
    "role": "member"
  }
}
```

### 2. طلب OTP:

```bash
curl -X POST https://api.alshailfund.com/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "0501234567",
    "purpose": "login"
  }'
```

### 3. التحقق من OTP:

```bash
curl -X POST https://api.alshailfund.com/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "0501234567",
    "otp": "123456"
  }'
```

### 4. إنشاء كلمة مرور (يتطلب Token):

```bash
curl -X POST https://api.alshailfund.com/api/auth/create-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "password": "newpassword123",
    "confirmPassword": "newpassword123"
  }'
```

### 5. حذف كلمة مرور عضو (Super Admin):

```bash
curl -X DELETE https://api.alshailfund.com/api/auth/admin/member/MEMBER_UUID/password \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

## ✅ اختبار سريع:

بعد الدمج، جرب هذا الطلب للتأكد من عمل الـ API:

```bash
curl https://api.alshailfund.com/api/auth/request-otp \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"phone": "0501234567", "purpose": "login"}'
```

---

## 🔐 ملاحظات أمنية:

1. **JWT_SECRET** يجب أن يكون طويل وعشوائي (32+ حرف)
2. **كلمات المرور** مشفرة بـ bcrypt (12 rounds)
3. **OTP** صالح لـ 5 دقائق فقط
4. **الحساب يُقفل** بعد 5 محاولات فاشلة (30 دقيقة)
5. **كل العمليات الأمنية** تُسجل في `security_audit_log`

---

## 📞 في حالة وجود مشاكل:

1. تحقق من logs: `pm2 logs alshuail-api`
2. تأكد من اتصال قاعدة البيانات
3. تأكد من صحة Ultramsg credentials
4. تأكد من وجود JWT_SECRET في .env

---

**جاهز للخطوة التالية! 🚀**
