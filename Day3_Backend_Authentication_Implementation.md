# Day 3 Authentication Implementation - Backend Developer

**Project:** تطبيق الشعيل (Al-Shuail Family App)
**Phase:** Phase 1 - Authentication System
**Date:** Day 3 Implementation
**Status:** Building on successful Days 1-2 foundation

---

## 🎯 DAY 3 MISSION: Authentication System Implementation

**Goal:** Complete authentication APIs with Arabic responses and 7-role system
**Duration:** Full Day
**Dependencies:** Days 1-2 foundation completed ✅

---

## 📋 YOUR DAY 3 DELIVERABLES

### Task 1: Authentication Controller Implementation

Create `controllers/authController.js`:

```javascript
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../config/database');
const logger = require('../utils/logger');
const { formatHijriDate } = require('../utils/hijriDate');

class AuthController {
  // تسجيل مستخدم جديد - Register new user
  async register(req, res) {
    try {
      const { name, email, phone, password, role = 'member' } = req.body;
      
      // التحقق من وجود المستخدم - Check if user exists
      const { data: existingUser } = await supabase
        .from('members')
        .select('id')
        .or(`email.eq.${email},phone.eq.${phone}`)
        .single();

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'البريد الإلكتروني أو رقم الهاتف مسجل مسبقاً',
          messageEn: 'Email or phone already registered'
        });
      }

      // تشفير كلمة المرور - Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // إنشاء المستخدم - Create user
      const { data: newUser, error } = await supabase
        .from('members')
        .insert([{
          name,
          email,
          phone,
          password: hashedPassword,
          role,
          status: 'pending_verification',
          created_at: new Date().toISOString(),
          hijri_created_at: formatHijriDate(new Date())
        }])
        .select()
        .single();

      if (error) {
        logger.error('خطأ في تسجيل المستخدم:', error);
        return res.status(500).json({
          success: false,
          message: 'خطأ في تسجيل المستخدم',
          error: error.message
        });
      }

      // إنشاء رمز التحقق - Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // حفظ رمز التحقق - Save OTP
      await supabase
        .from('verification_codes')
        .insert([{
          user_id: newUser.id,
          code: otp,
          type: 'phone_verification',
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
        }]);

      // إرسال رمز التحقق عبر SMS (simulation)
      logger.info(`رمز التحقق للمستخدم ${phone}: ${otp}`);

      res.status(201).json({
        success: true,
        message: 'تم إنشاء الحساب بنجاح. تم إرسال رمز التحقق إلى هاتفك',
        messageEn: 'Account created successfully. Verification code sent to your phone',
        data: {
          userId: newUser.id,
          name: newUser.name,
          phone: newUser.phone,
          status: 'pending_verification'
        }
      });

    } catch (error) {
      logger.error('خطأ في التسجيل:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ داخلي في الخادم',
        error: error.message
      });
    }
  }

  // تسجيل الدخول - Login
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // البحث عن المستخدم - Find user
      const { data: user, error } = await supabase
        .from('members')
        .select('id, name, email, phone, password, role, status')
        .eq('email', email)
        .single();

      if (error || !user) {
        return res.status(401).json({
          success: false,
          message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
          messageEn: 'Invalid email or password'
        });
      }

      // التحقق من كلمة المرور - Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
          messageEn: 'Invalid email or password'
        });
      }

      // التحقق من حالة الحساب - Check account status
      if (user.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'الحساب غير مفعل. يرجى التحقق من هاتفك',
          messageEn: 'Account not activated. Please verify your phone'
        });
      }

      // إنشاء JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE }
      );

      // إنشاء refresh token
      const refreshToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRE }
      );

      // حفظ refresh token
      await supabase
        .from('refresh_tokens')
        .insert([{
          user_id: user.id,
          token: refreshToken,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }]);

      // تسجيل آخر دخول - Log last login
      await supabase
        .from('members')
        .update({
          last_login: new Date().toISOString(),
          hijri_last_login: formatHijriDate(new Date())
        })
        .eq('id', user.id);

      res.json({
        success: true,
        message: `أهلاً وسهلاً ${user.name}`,
        messageEn: `Welcome ${user.name}`,
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role
          },
          token,
          refreshToken,
          expiresIn: process.env.JWT_EXPIRE
        }
      });

    } catch (error) {
      logger.error('خطأ في تسجيل الدخول:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ داخلي في الخادم',
        error: error.message
      });
    }
  }

  // التحقق من رمز OTP
  async verifyOTP(req, res) {
    try {
      const { userId, code } = req.body;

      // البحث عن رمز التحقق
      const { data: verification, error } = await supabase
        .from('verification_codes')
        .select('*')
        .eq('user_id', userId)
        .eq('code', code)
        .eq('type', 'phone_verification')
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !verification) {
        return res.status(400).json({
          success: false,
          message: 'رمز التحقق غير صحيح أو منتهي الصلاحية',
          messageEn: 'Invalid or expired verification code'
        });
      }

      // تفعيل الحساب
      await supabase
        .from('members')
        .update({
          status: 'active',
          phone_verified_at: new Date().toISOString()
        })
        .eq('id', userId);

      // حذف رمز التحقق
      await supabase
        .from('verification_codes')
        .delete()
        .eq('id', verification.id);

      res.json({
        success: true,
        message: 'تم تفعيل الحساب بنجاح',
        messageEn: 'Account activated successfully'
      });

    } catch (error) {
      logger.error('خطأ في التحقق من الرمز:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ داخلي في الخادم',
        error: error.message
      });
    }
  }

  // تسجيل الخروج - Logout
  async logout(req, res) {
    try {
      const { refreshToken } = req.body;
      
      // حذف refresh token
      if (refreshToken) {
        await supabase
          .from('refresh_tokens')
          .delete()
          .eq('token', refreshToken);
      }

      res.json({
        success: true,
        message: 'تم تسجيل الخروج بنجاح',
        messageEn: 'Logged out successfully'
      });

    } catch (error) {
      logger.error('خطأ في تسجيل الخروج:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ داخلي في الخادم',
        error: error.message
      });
    }
  }
}

module.exports = new AuthController();
```

---

### Task 2: Authentication Routes

Create `routes/auth.js`:

```javascript
const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { validateRequest } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// تسجيل مستخدم جديد - Register
router.post('/register', [
  body('name')
    .notEmpty()
    .withMessage('الاسم مطلوب')
    .isLength({ min: 2, max: 50 })
    .withMessage('الاسم يجب أن يكون بين 2 و 50 حرف'),
  body('email')
    .isEmail()
    .withMessage('صيغة البريد الإلكتروني غير صحيحة'),
  body('phone')
    .matches(/^(05|5)(5|0|3|6|4|9|1|8|7)([0-9]{7})$/)
    .withMessage('رقم الجوال غير صحيح'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('كلمة المرور يجب أن تحتوي على حرف كبير وصغير ورقم'),
  validateRequest
], authController.register);

// تسجيل الدخول - Login  
router.post('/login', [
  body('email')
    .isEmail()
    .withMessage('البريد الإلكتروني مطلوب'),
  body('password')
    .notEmpty()
    .withMessage('كلمة المرور مطلوبة'),
  validateRequest
], authController.login);

// التحقق من رمز OTP
router.post('/verify-otp', [
  body('userId')
    .isUUID()
    .withMessage('معرف المستخدم غير صحيح'),
  body('code')
    .isLength({ min: 6, max: 6 })
    .withMessage('رمز التحقق يجب أن يكون 6 أرقام'),
  validateRequest
], authController.verifyOTP);

// تسجيل الخروج - Logout
router.post('/logout', authController.logout);

// التحقق من صحة الرمز المميز - Verify token
router.get('/verify-token', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'الرمز المميز صالح',
    user: req.user
  });
});

module.exports = router;
```

---

### Task 3: Authentication Middleware Enhancement

Update `middleware/auth.js`:

```javascript
const jwt = require('jsonwebtoken');
const { supabase } = require('../config/database');
const logger = require('../utils/logger');

// التحقق من الرمز المميز - Verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'رمز الوصول مطلوب',
        messageEn: 'Access token required'
      });
    }

    // التحقق من صحة الرمز
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // البحث عن المستخدم
    const { data: user, error } = await supabase
      .from('members')
      .select('id, name, email, phone, role, status')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return res.status(403).json({
        success: false,
        message: 'رمز الوصول غير صالح',
        messageEn: 'Invalid access token'
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'الحساب غير مفعل',
        messageEn: 'Account not activated'
      });
    }

    req.user = user;
    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'انتهت صلاحية رمز الوصول',
        messageEn: 'Access token expired'
      });
    }

    logger.error('خطأ في التحقق من الرمز:', error);
    return res.status(403).json({
      success: false,
      message: 'رمز الوصول غير صالح',
      messageEn: 'Invalid access token'
    });
  }
};

// التحقق من الأدوار - Check user roles
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'المصادقة مطلوبة',
        messageEn: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية للوصول إلى هذا المورد',
        messageEn: 'Insufficient permissions'
      });
    }

    next();
  };
};

// الأدوار المتاحة - Available roles
const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin', 
  FINANCIAL_MANAGER: 'financial_manager',
  ACCOUNTANT: 'accountant',
  EVENT_MANAGER: 'event_manager',
  MEMBER: 'member',
  GUEST: 'guest'
};

module.exports = {
  authenticateToken,
  requireRole,
  ROLES
};
```

---

### Task 4: Validation Middleware

Create `middleware/validation.js`:

```javascript
const { validationResult } = require('express-validator');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const arabicErrors = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));

    return res.status(400).json({
      success: false,
      message: 'خطأ في البيانات المرسلة',
      messageEn: 'Validation error',
      errors: arabicErrors
    });
  }
  
  next();
};

module.exports = { validateRequest };
```

---

### Task 5: Update Main Server File

Update `server.js` to include auth routes:

```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const logger = require('./utils/logger');
const { authenticateToken } = require('./middleware/auth');
const { formatHijriDate } = require('./utils/hijriDate');

// Import routes
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// الوسطاء الأساسيين - Basic Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);

// مسار الاختبار الأساسي - Basic test route
app.get('/api/health', (req, res) => {
  res.json({
    message: 'خادم تطبيق الشعيل يعمل بنجاح',
    status: 'active',
    timestamp: new Date().toISOString(),
    hijriDate: formatHijriDate(new Date())
  });
});

// Test route for authenticated users
app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({
    message: `مرحباً ${req.user.name}، أنت مصادق بنجاح`,
    messageEn: `Welcome ${req.user.name}, you are authenticated`,
    user: req.user,
    timestamp: formatHijriDate(new Date())
  });
});

// معالج الأخطاء العام - Global error handler
app.use((err, req, res, next) => {
  logger.error(err.message);
  res.status(500).json({
    message: 'خطأ في الخادم الداخلي',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// بدء تشغيل الخادم - Start server
app.listen(PORT, () => {
  logger.info(`خادم تطبيق الشعيل يعمل على المنفذ ${PORT}`);
  console.log(`🚀 Al-Shuail Backend Server running on port ${PORT}`);
});

module.exports = app;
```

---

## 🔧 IMMEDIATE ACTIONS FOR DAY 3

### Implementation Checklist:

1. **✅ IMPLEMENT** all authentication controllers and routes above
2. **✅ TEST** all authentication endpoints:
   - `POST /api/auth/register`
   - `POST /api/auth/login`  
   - `POST /api/auth/verify-otp`
   - `POST /api/auth/logout`
   - `GET /api/auth/verify-token`
   - `GET /api/protected` (test authentication)

3. **✅ CREATE** test requests in Postman/Thunder Client
4. **✅ VERIFY** Arabic error messages work properly
5. **✅ ENSURE** 7-role system is properly implemented
6. **✅ TEST** JWT token generation and validation
7. **✅ VERIFY** OTP system functionality

---

## 📤 HANDOFF DELIVERABLES FOR OTHER TEAMS

### For Frontend Developer (Available by end of Day 3):

**Authentication API Endpoints:**
- **Base URL:** `http://localhost:5000/api/auth`

**Available Endpoints:**
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/verify-otp
POST /api/auth/logout  
GET  /api/auth/verify-token
GET  /api/protected (test endpoint)
```

**Sample Request/Response Examples:**

**Register Request:**
```json
{
  "name": "أحمد محمد الشعيل",
  "email": "ahmed@alshuail.com", 
  "phone": "0551234567",
  "password": "Password123",
  "role": "member"
}
```

**Register Response:**
```json
{
  "success": true,
  "message": "تم إنشاء الحساب بنجاح. تم إرسال رمز التحقق إلى هاتفك",
  "data": {
    "userId": "uuid",
    "name": "أحمد محمد الشعيل",
    "phone": "0551234567",
    "status": "pending_verification"
  }
}
```

**Login Response:**
```json
{
  "success": true,
  "message": "أهلاً وسهلاً أحمد محمد الشعيل",
  "data": {
    "user": {
      "id": "uuid",
      "name": "أحمد محمد الشعيل",
      "email": "ahmed@alshuail.com",
      "phone": "0551234567", 
      "role": "member"
    },
    "token": "jwt_token_here",
    "refreshToken": "refresh_token_here",
    "expiresIn": "7d"
  }
}
```

### For DevOps Engineer:

**Environment Variables Required:**
```env
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d
```

**Database Tables Used:**
- `members` (main user table)
- `verification_codes` (OTP codes)
- `refresh_tokens` (JWT refresh tokens)

### For QA Engineer:

**Test Scenarios:**
1. User registration with valid data
2. User registration with duplicate email/phone
3. Login with valid credentials
4. Login with invalid credentials
5. OTP verification success/failure
6. Token validation and expiration
7. Role-based access testing
8. Arabic error message validation

---

## 🎯 SUCCESS CRITERIA FOR DAY 3

- [ ] ✅ All authentication endpoints working properly
- [ ] ✅ Arabic error messages implemented throughout
- [ ] ✅ 7-role system functional with proper validation
- [ ] ✅ JWT tokens generated and validated correctly
- [ ] ✅ OTP verification system working
- [ ] ✅ Password hashing and verification secure
- [ ] ✅ Proper validation and security measures
- [ ] ✅ Hijri date integration in user records
- [ ] ✅ Comprehensive error handling
- [ ] ✅ All endpoints tested and documented

---

## 🔜 DAY 4 PREVIEW - Member Management APIs

Tomorrow you will implement:
- GET `/api/members` (with pagination and Arabic search)
- GET `/api/members/:id` (individual member details)
- POST `/api/members` (create new member)
- PUT `/api/members/:id` (update member)
- DELETE `/api/members/:id` (soft delete)
- Member photo upload functionality
- Family relationship management

---

## 📊 PROGRESS TRACKING

**Daily Report Format:**
```
التاريخ: [Today's Date]
المهام المكتملة: 
- ✅ Authentication Controller
- ✅ Auth Routes
- ✅ Middleware Updates
- ✅ Server Integration
- ✅ Testing Complete

المهام الجارية: [Current work if any]
المعوقات: [Any blockers]
التسليم للفرق الأخرى: [Handoffs completed]
الاستعداد لليوم التالي: [Day 4 preparation status]
```

---

**🚀 BEGIN DAY 3 IMPLEMENTATION NOW! ابدأ تنفيذ اليوم الثالث الآن!**

**Continue the excellent progress and maintain the high-quality Arabic localization standards established in Days 1-2!**
