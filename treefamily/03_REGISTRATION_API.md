# 03 - REGISTRATION API

**Phase**: Backend API Development  
**Time**: 1.5-2 hours  
**Goal**: Build all registration endpoints for mobile app

---

## 🎯 OBJECTIVES

By the end of this step:
- ✅ 5 registration endpoints created
- ✅ OTP generation and verification working
- ✅ Clan selection endpoint ready
- ✅ Registration submission functional
- ✅ All endpoints tested with Postman/curl

---

## 📡 ENDPOINTS TO BUILD

1. `POST /api/register/send-otp` - Send OTP to phone
2. `POST /api/register/verify-otp` - Verify OTP code
3. `GET /api/register/clans` - Get available clans
4. `POST /api/register/submit` - Submit registration request
5. `GET /api/register/status/:phone` - Check registration status

---

## 📋 STEP-BY-STEP INSTRUCTIONS

### STEP 1: Create OTP Generator Utility

Create `backend/utils/otpGenerator.js`:

```javascript
/**
 * OTP Generator Utility
 * Generates and validates OTP codes
 */

// Generate random 4-digit OTP
function generateOTP() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

// Generate OTP expiration time (5 minutes from now)
function getOTPExpiration() {
    const now = new Date();
    return new Date(now.getTime() + 5 * 60000); // 5 minutes
}

// Check if OTP is expired
function isOTPExpired(expirationTime) {
    return new Date() > new Date(expirationTime);
}

// Validate OTP format (4 digits)
function isValidOTPFormat(otp) {
    return /^\d{4}$/.test(otp);
}

module.exports = {
    generateOTP,
    getOTPExpiration,
    isOTPExpired,
    isValidOTPFormat
};
```

---

### STEP 2: Create SMS Service Utility

Create `backend/utils/smsService.js`:

```javascript
/**
 * SMS Service Utility
 * Handles sending SMS messages
 * Currently uses console logging (replace with actual SMS provider)
 */

// Send OTP via SMS
async function sendOTP(phone, otp) {
    console.log('📲 SMS Service: Sending OTP');
    console.log(`   Phone: ${phone}`);
    console.log(`   OTP: ${otp}`);
    console.log(`   Message: رمز التحقق الخاص بك هو: ${otp}`);
    
    // TODO: Integrate with actual SMS provider
    // Example: Twilio, AWS SNS, etc.
    /*
    const response = await smsProvider.send({
        to: phone,
        message: `رمز التحقق الخاص بك هو: ${otp}\nصالح لمدة 5 دقائق`
    });
    */
    
    // Simulate success for now
    return {
        success: true,
        message: 'OTP sent successfully (console)',
        phone: phone
    };
}

// Send registration approval notification
async function sendApprovalNotification(phone, memberName) {
    console.log('📲 SMS Service: Sending approval notification');
    console.log(`   Phone: ${phone}`);
    console.log(`   Message: مرحباً ${memberName}، تم اعتماد طلبك! يمكنك الآن الدخول للتطبيق.`);
    
    return {
        success: true,
        message: 'Approval notification sent (console)'
    };
}

// Send registration rejection notification
async function sendRejectionNotification(phone, memberName, reason) {
    console.log('📲 SMS Service: Sending rejection notification');
    console.log(`   Phone: ${phone}`);
    console.log(`   Message: عذراً ${memberName}، لم تتم الموافقة على طلبك. السبب: ${reason}`);
    
    return {
        success: true,
        message: 'Rejection notification sent (console)'
    };
}

module.exports = {
    sendOTP,
    sendApprovalNotification,
    sendRejectionNotification
};
```

---

### STEP 3: Create Registration Controller

Create `backend/controllers/registrationController.js`:

```javascript
const db = require('../config/database');
const { generateOTP, getOTPExpiration, isOTPExpired, isValidOTPFormat } = require('../utils/otpGenerator');
const { sendOTP } = require('../utils/smsService');

/**
 * Send OTP to phone number
 * POST /api/register/send-otp
 */
exports.sendOTP = async (req, res) => {
    try {
        const { phone } = req.body;

        // Validate phone number
        if (!phone || !/^05\d{8}$/.test(phone)) {
            return res.status(400).json({
                success: false,
                error: 'رقم الجوال غير صحيح. يجب أن يبدأ بـ 05 ويكون 10 أرقام'
            });
        }

        // Check if phone already has an approved registration
        const existingMember = await db.query(
            `SELECT id FROM members WHERE phone = $1`,
            [phone]
        );

        if (existingMember.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'رقم الجوال مسجل مسبقاً'
            });
        }

        // Generate OTP
        const otp = generateOTP();
        const otpExpiration = getOTPExpiration();

        // Check if registration request already exists
        const existingRequest = await db.query(
            `SELECT id FROM registration_requests WHERE phone = $1`,
            [phone]
        );

        if (existingRequest.rows.length > 0) {
            // Update existing request with new OTP
            await db.query(
                `UPDATE registration_requests
                 SET otp_code = $1,
                     otp_expires_at = $2,
                     otp_verified = FALSE,
                     updated_at = NOW()
                 WHERE phone = $3`,
                [otp, otpExpiration, phone]
            );
        } else {
            // Create new registration request
            await db.query(
                `INSERT INTO registration_requests 
                 (phone, otp_code, otp_expires_at, otp_verified, status)
                 VALUES ($1, $2, $3, FALSE, 'pending')`,
                [phone, otp, otpExpiration]
            );
        }

        // Send OTP via SMS
        await sendOTP(phone, otp);

        res.json({
            success: true,
            message: 'تم إرسال رمز التحقق إلى رقم جوالك',
            data: {
                phone: phone,
                expiresIn: '5 minutes'
            }
        });

    } catch (error) {
        console.error('Error in sendOTP:', error);
        res.status(500).json({
            success: false,
            error: 'حدث خطأ أثناء إرسال رمز التحقق'
        });
    }
};

/**
 * Verify OTP code
 * POST /api/register/verify-otp
 */
exports.verifyOTP = async (req, res) => {
    try {
        const { phone, otp } = req.body;

        // Validate input
        if (!phone || !otp) {
            return res.status(400).json({
                success: false,
                error: 'رقم الجوال ورمز التحقق مطلوبان'
            });
        }

        if (!isValidOTPFormat(otp)) {
            return res.status(400).json({
                success: false,
                error: 'رمز التحقق يجب أن يكون 4 أرقام'
            });
        }

        // Get registration request
        const result = await db.query(
            `SELECT * FROM registration_requests WHERE phone = $1`,
            [phone]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'لم يتم العثور على طلب تسجيل لهذا الرقم'
            });
        }

        const request = result.rows[0];

        // Check if already verified
        if (request.otp_verified) {
            return res.json({
                success: true,
                message: 'رقم الجوال تم التحقق منه مسبقاً',
                data: { verified: true }
            });
        }

        // Check if OTP expired
        if (isOTPExpired(request.otp_expires_at)) {
            return res.status(400).json({
                success: false,
                error: 'رمز التحقق منتهي الصلاحية. يرجى طلب رمز جديد'
            });
        }

        // Verify OTP
        if (request.otp_code !== otp) {
            return res.status(400).json({
                success: false,
                error: 'رمز التحقق غير صحيح'
            });
        }

        // Mark as verified
        await db.query(
            `UPDATE registration_requests
             SET otp_verified = TRUE, updated_at = NOW()
             WHERE phone = $1`,
            [phone]
        );

        res.json({
            success: true,
            message: 'تم التحقق من رقم الجوال بنجاح',
            data: {
                verified: true,
                phone: phone
            }
        });

    } catch (error) {
        console.error('Error in verifyOTP:', error);
        res.status(500).json({
            success: false,
            error: 'حدث خطأ أثناء التحقق من الرمز'
        });
    }
};

/**
 * Get available clans/branches
 * GET /api/register/clans
 */
exports.getClans = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                fb.id,
                fb.branch_name_ar as name_ar,
                fb.branch_name_en as name_en,
                fb.branch_head_id,
                m.full_name_ar as head_name_ar,
                m.full_name_en as head_name_en,
                m.phone as head_phone,
                COUNT(DISTINCT m2.id) as member_count
            FROM family_branches fb
            LEFT JOIN members m ON fb.branch_head_id = m.id
            LEFT JOIN members m2 ON m2.family_branch_id = fb.id
            GROUP BY fb.id, m.full_name_ar, m.full_name_en, m.phone
            ORDER BY fb.branch_name_ar
        `);

        res.json({
            success: true,
            data: {
                clans: result.rows,
                total: result.rows.length
            }
        });

    } catch (error) {
        console.error('Error in getClans:', error);
        res.status(500).json({
            success: false,
            error: 'حدث خطأ أثناء جلب قائمة الفخوذ'
        });
    }
};

/**
 * Submit complete registration
 * POST /api/register/submit
 */
exports.submitRegistration = async (req, res) => {
    try {
        const {
            phone,
            full_name_ar,
            full_name_en,
            date_of_birth,
            national_id,
            email,
            city,
            clan_id
        } = req.body;

        // Validate required fields
        if (!phone || !full_name_ar || !date_of_birth || !national_id || !clan_id) {
            return res.status(400).json({
                success: false,
                error: 'جميع الحقول المطلوبة يجب تعبئتها'
            });
        }

        // Check if OTP was verified
        const request = await db.query(
            `SELECT * FROM registration_requests WHERE phone = $1`,
            [phone]
        );

        if (request.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'لم يتم العثور على طلب تسجيل. يرجى البدء من جديد'
            });
        }

        if (!request.rows[0].otp_verified) {
            return res.status(400).json({
                success: false,
                error: 'يجب التحقق من رقم الجوال أولاً'
            });
        }

        // Verify clan exists
        const clanCheck = await db.query(
            `SELECT id FROM family_branches WHERE id = $1`,
            [clan_id]
        );

        if (clanCheck.rows.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'الفخذ المختار غير موجود'
            });
        }

        // Update registration request with complete data
        const updateResult = await db.query(
            `UPDATE registration_requests
             SET full_name_ar = $1,
                 full_name_en = $2,
                 date_of_birth = $3,
                 national_id = $4,
                 email = $5,
                 city = $6,
                 selected_branch_id = $7,
                 status = 'pending',
                 updated_at = NOW()
             WHERE phone = $8
             RETURNING id, status`,
            [full_name_ar, full_name_en, date_of_birth, national_id, 
             email, city, clan_id, phone]
        );

        res.json({
            success: true,
            message: 'تم إرسال طلبك بنجاح! سيتم مراجعته من قبل المسؤول',
            data: {
                request_id: updateResult.rows[0].id,
                status: updateResult.rows[0].status,
                next_steps: [
                    'سيقوم المسؤول بمراجعة طلبك',
                    'ستصلك رسالة SMS عند الموافقة',
                    'يمكنك التحقق من حالة طلبك في أي وقت'
                ]
            }
        });

    } catch (error) {
        console.error('Error in submitRegistration:', error);
        res.status(500).json({
            success: false,
            error: 'حدث خطأ أثناء إرسال الطلب'
        });
    }
};

/**
 * Check registration status
 * GET /api/register/status/:phone
 */
exports.checkStatus = async (req, res) => {
    try {
        const { phone } = req.params;

        const result = await db.query(
            `SELECT 
                rr.id,
                rr.phone,
                rr.full_name_ar,
                rr.status,
                rr.rejection_reason,
                rr.created_at,
                rr.approved_at,
                fb.branch_name_ar as clan_name,
                u.email as approved_by_email
             FROM registration_requests rr
             LEFT JOIN family_branches fb ON rr.selected_branch_id = fb.id
             LEFT JOIN users u ON rr.approved_by = u.id
             WHERE rr.phone = $1`,
            [phone]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'لم يتم العثور على طلب تسجيل لهذا الرقم'
            });
        }

        const request = result.rows[0];

        res.json({
            success: true,
            data: {
                request_id: request.id,
                phone: request.phone,
                full_name: request.full_name_ar,
                status: request.status,
                clan_name: request.clan_name,
                submitted_at: request.created_at,
                approved_at: request.approved_at,
                rejection_reason: request.rejection_reason,
                approved_by: request.approved_by_email
            }
        });

    } catch (error) {
        console.error('Error in checkStatus:', error);
        res.status(500).json({
            success: false,
            error: 'حدث خطأ أثناء التحقق من حالة الطلب'
        });
    }
};
```

---

### STEP 4: Create Registration Routes

Create `backend/routes/registration.js`:

```javascript
const express = require('express');
const router = express.Router();
const registrationController = require('../controllers/registrationController');

// POST /api/register/send-otp
router.post('/send-otp', registrationController.sendOTP);

// POST /api/register/verify-otp
router.post('/verify-otp', registrationController.verifyOTP);

// GET /api/register/clans
router.get('/clans', registrationController.getClans);

// POST /api/register/submit
router.post('/submit', registrationController.submitRegistration);

// GET /api/register/status/:phone
router.get('/status/:phone', registrationController.checkStatus);

module.exports = router;
```

---

### STEP 5: Create Error Handler Middleware

Create `backend/middleware/errorHandler.js`:

```javascript
/**
 * Global Error Handler Middleware
 */

function errorHandler(err, req, res, next) {
    console.error('Error:', err);

    // Default error
    let status = 500;
    let message = 'حدث خطأ في الخادم';

    // Custom error handling
    if (err.name === 'ValidationError') {
        status = 400;
        message = err.message;
    } else if (err.name === 'UnauthorizedError') {
        status = 401;
        message = 'غير مصرح';
    } else if (err.message) {
        message = err.message;
    }

    res.status(status).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
}

module.exports = errorHandler;
```

---

### STEP 6: Create Main Server File

Create `backend/server.js`:

```javascript
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const registrationRoutes = require('./routes/registration');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: [
        'http://localhost:8080',
        'http://localhost:8081',
        process.env.FRONTEND_URL,
        process.env.ADMIN_URL
    ],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/api/register', registrationRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 Al-Shuail API Server Running');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📡 Port: ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
    console.log(`📱 Registration API: http://localhost:${PORT}/api/register`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});
```

---

### STEP 7: Start the Server

```bash
cd backend
npm run dev
```

**Expected Output**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Al-Shuail API Server Running
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 Port: 3000
🌍 Environment: development
🔗 Health Check: http://localhost:3000/health
📱 Registration API: http://localhost:3000/api/register
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## ✅ TESTING ENDPOINTS

### Test 1: Health Check
```bash
curl http://localhost:3000/health
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2025-10-20T08:30:00.000Z"
}
```

---

### Test 2: Send OTP
```bash
curl -X POST http://localhost:3000/api/register/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"0555123456"}'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "تم إرسال رمز التحقق إلى رقم جوالك",
  "data": {
    "phone": "0555123456",
    "expiresIn": "5 minutes"
  }
}
```

**Check Console**: Should see OTP code printed

---

### Test 3: Verify OTP
```bash
# Use the OTP from console output
curl -X POST http://localhost:3000/api/register/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"0555123456","otp":"1234"}'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "تم التحقق من رقم الجوال بنجاح",
  "data": {
    "verified": true,
    "phone": "0555123456"
  }
}
```

---

### Test 4: Get Clans
```bash
curl http://localhost:3000/api/register/clans
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "clans": [
      {
        "id": "uuid",
        "name_ar": "فخذ عبدالرحمن",
        "name_en": "Abdulrahman Branch",
        "head_name_ar": "عبدالرحمن الشعيل",
        "member_count": "25"
      }
    ],
    "total": 3
  }
}
```

---

### Test 5: Submit Registration
```bash
curl -X POST http://localhost:3000/api/register/submit \
  -H "Content-Type: application/json" \
  -d '{
    "phone":"0555123456",
    "full_name_ar":"محمد أحمد الشعيل",
    "full_name_en":"Mohammed Ahmed Al-Shuail",
    "date_of_birth":"1995-05-15",
    "national_id":"1234567890",
    "email":"mohammed@example.com",
    "city":"الرياض",
    "clan_id":"[use-actual-clan-id]"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "تم إرسال طلبك بنجاح! سيتم مراجعته من قبل المسؤول",
  "data": {
    "request_id": "uuid",
    "status": "pending",
    "next_steps": [...]
  }
}
```

---

### Test 6: Check Status
```bash
curl http://localhost:3000/api/register/status/0555123456
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "request_id": "uuid",
    "phone": "0555123456",
    "full_name": "محمد أحمد الشعيل",
    "status": "pending",
    "clan_name": "فخذ عبدالرحمن",
    "submitted_at": "2025-10-20T08:30:00.000Z"
  }
}
```

---

## 🎯 COMPLETION CHECKLIST

- [ ] OTP generator utility created
- [ ] SMS service utility created
- [ ] Registration controller with all 5 methods
- [ ] Registration routes configured
- [ ] Error handler middleware created
- [ ] Main server file created
- [ ] Server starts without errors
- [ ] All 6 tests pass successfully
- [ ] Can send OTP and verify it
- [ ] Can retrieve clan list
- [ ] Can submit complete registration
- [ ] Can check registration status

---

## 🚨 TROUBLESHOOTING

### Server won't start
```bash
# Check if port is already in use
lsof -i :3000

# Kill process if needed
kill -9 [PID]

# Or use different port
PORT=3001 npm run dev
```

### Database connection fails
```bash
# Test database connection
node test-database.js

# Check .env file
cat .env | grep DATABASE
```

### OTP not generating
```bash
# Test OTP generator
node -e "const otp = require('./utils/otpGenerator'); console.log(otp.generateOTP());"
```

---

## 📊 CURRENT STATUS

```
Project Setup: ████████████████████ 100%
Database Setup: ████████████████████ 100%
Registration API: ████████████████████ 100%
```

**Completed**: ✅ Registration API fully functional  
**Next Step**: Build Admin API endpoints

---

## ⏭️ NEXT FILE

**File**: `04_ADMIN_API.md`  
**Purpose**: Build admin endpoints for clan management and approvals

---

**Time Spent**: ~2 hours  
**Total Time**: ~3 hours  
**Estimated Remaining**: 6-7 hours
