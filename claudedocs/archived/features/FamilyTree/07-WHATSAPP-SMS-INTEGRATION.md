# 07-WHATSAPP-SMS-INTEGRATION.md
# Al-Shuail WhatsApp & SMS OTP Integration - Claude Code Instructions

## 📋 OVERVIEW

Implement WhatsApp Business API and SMS OTP system with:
- WhatsApp OTP for phone verification
- SMS fallback for reliability
- Saudi (+966) and Kuwaiti (+965) phone support
- Template messages in Arabic
- OTP generation and verification
- Rate limiting and security

**Prerequisites**: Files 01-06 completed

---

## 🎯 IMPLEMENTATION CHECKLIST

```
□ WhatsApp Business API integration
□ SMS service integration (Twilio)
□ OTP generation and storage
□ Phone number formatting
□ Template messages (Arabic)
□ Rate limiting
□ Verification endpoints
□ Security measures
```

---

## 📁 FILE STRUCTURE TO CREATE

```
backend/
├── services/
│   ├── whatsapp.service.js      ← Create this
│   ├── sms.service.js           ← Create this
│   └── otp.service.js           ← Create this
├── routes/
│   └── otp.routes.js            ← Create this
├── controllers/
│   └── otp.controller.js        ← Create this
└── utils/
    └── phone-formatter.js       ← Create this
```

---

## STEP 1: PHONE FORMATTER UTILITY

### File: `backend/utils/phone-formatter.js`

```javascript
// Phone Number Formatter for Saudi & Kuwait

/**
 * Format phone to E.164 format (+966XXXXXXXXX or +965XXXXXXXX)
 */
function formatPhoneE164(phone) {
  // Remove all non-digits
  let cleaned = phone.replace(/\D/g, '');
  
  // Saudi Arabia
  if (cleaned.startsWith('966')) {
    return '+' + cleaned;
  } else if (cleaned.startsWith('05')) {
    return '+966' + cleaned.substring(1);
  } else if (cleaned.startsWith('5') && cleaned.length === 9) {
    return '+966' + cleaned;
  }
  
  // Kuwait
  if (cleaned.startsWith('965')) {
    return '+' + cleaned;
  } else if (cleaned.length === 8 && /^[569]/.test(cleaned)) {
    return '+965' + cleaned;
  }
  
  // Already formatted
  if (cleaned.startsWith('+966') || cleaned.startsWith('+965')) {
    return phone;
  }
  
  throw new Error('Invalid phone number format. Must be Saudi (+966) or Kuwaiti (+965)');
}

/**
 * Validate Saudi phone number
 */
function isValidSaudiPhone(phone) {
  const cleaned = phone.replace(/\D/g, '');
  // Saudi mobile numbers: 966 5XXXXXXXX (9 digits after 966)
  return /^(966)?5[0-9]{8}$/.test(cleaned);
}

/**
 * Validate Kuwaiti phone number
 */
function isValidKuwaitiPhone(phone) {
  const cleaned = phone.replace(/\D/g, '');
  // Kuwaiti numbers: 965 XXXXXXXX (8 digits, starting with 5, 6, or 9)
  return /^(965)?[569][0-9]{7}$/.test(cleaned);
}

/**
 * Validate phone number (Saudi or Kuwaiti)
 */
function isValidPhone(phone) {
  return isValidSaudiPhone(phone) || isValidKuwaitiPhone(phone);
}

/**
 * Get country code from phone
 */
function getCountryCode(phone) {
  const formatted = formatPhoneE164(phone);
  if (formatted.startsWith('+966')) return 'SA';
  if (formatted.startsWith('+965')) return 'KW';
  return null;
}

/**
 * Format for display (with spaces)
 */
function formatForDisplay(phone) {
  const e164 = formatPhoneE164(phone);
  
  // Saudi: +966 5X XXX XXXX
  if (e164.startsWith('+966')) {
    const number = e164.substring(4);
    return `+966 ${number.substring(0, 2)} ${number.substring(2, 5)} ${number.substring(5)}`;
  }
  
  // Kuwaiti: +965 XXXX XXXX
  if (e164.startsWith('+965')) {
    const number = e164.substring(4);
    return `+965 ${number.substring(0, 4)} ${number.substring(4)}`;
  }
  
  return e164;
}

module.exports = {
  formatPhoneE164,
  isValidSaudiPhone,
  isValidKuwaitiPhone,
  isValidPhone,
  getCountryCode,
  formatForDisplay
};
```

**Command to create:**
```bash
mkdir -p backend/utils backend/services backend/controllers
cat > backend/utils/phone-formatter.js << 'EOF'
[paste code above]
EOF
```

---

## STEP 2: OTP SERVICE

### File: `backend/services/otp.service.js`

```javascript
// OTP Generation and Management Service
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// OTP Configuration
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_MINUTES = 5;
const MAX_REQUESTS_PER_PERIOD = 3;

/**
 * Generate 6-digit OTP code
 */
function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Create and store OTP
 */
async function createOTP(phone, purpose = 'verification') {
  try {
    // Check rate limiting
    const rateLimitCheck = await checkRateLimit(phone);
    if (!rateLimitCheck.allowed) {
      throw new Error(`تم تجاوز الحد الأقصى للمحاولات. يرجى المحاولة بعد ${rateLimitCheck.waitMinutes} دقيقة`);
    }

    // Generate OTP
    const code = generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

    // Invalidate any existing active OTPs for this phone
    await supabase
      .from('sms_otp')
      .update({ is_active: false })
      .eq('phone', phone)
      .eq('purpose', purpose)
      .eq('is_active', true);

    // Store new OTP
    const { data: otp, error } = await supabase
      .from('sms_otp')
      .insert({
        phone: phone,
        code: code,
        purpose: purpose,
        expires_at: expiresAt.toISOString(),
        attempts: 0,
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('OTP Create Error:', error);
      throw new Error('فشل إنشاء رمز التحقق');
    }

    return {
      id: otp.id,
      code: code,
      expiresAt: expiresAt,
      phone: phone
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Verify OTP code
 */
async function verifyOTP(phone, code, purpose = 'verification') {
  try {
    // Get active OTP
    const { data: otp, error } = await supabase
      .from('sms_otp')
      .select('*')
      .eq('phone', phone)
      .eq('purpose', purpose)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !otp) {
      return {
        success: false,
        message: 'رمز التحقق غير صحيح أو منتهي الصلاحية'
      };
    }

    // Check if expired
    if (new Date(otp.expires_at) < new Date()) {
      await supabase
        .from('sms_otp')
        .update({ is_active: false })
        .eq('id', otp.id);

      return {
        success: false,
        message: 'رمز التحقق منتهي الصلاحية'
      };
    }

    // Check max attempts
    if (otp.attempts >= MAX_ATTEMPTS) {
      await supabase
        .from('sms_otp')
        .update({ is_active: false })
        .eq('id', otp.id);

      return {
        success: false,
        message: 'تم تجاوز الحد الأقصى للمحاولات'
      };
    }

    // Increment attempts
    await supabase
      .from('sms_otp')
      .update({ attempts: otp.attempts + 1 })
      .eq('id', otp.id);

    // Verify code
    if (otp.code !== code) {
      return {
        success: false,
        message: 'رمز التحقق غير صحيح',
        attemptsRemaining: MAX_ATTEMPTS - (otp.attempts + 1)
      };
    }

    // Mark as verified and inactive
    await supabase
      .from('sms_otp')
      .update({ 
        is_active: false,
        verified_at: new Date().toISOString()
      })
      .eq('id', otp.id);

    return {
      success: true,
      message: 'تم التحقق بنجاح',
      otpId: otp.id
    };
  } catch (error) {
    console.error('OTP Verify Error:', error);
    return {
      success: false,
      message: 'خطأ في التحقق من الرمز'
    };
  }
}

/**
 * Check rate limiting
 */
async function checkRateLimit(phone) {
  const limitTime = new Date();
  limitTime.setMinutes(limitTime.getMinutes() - RATE_LIMIT_MINUTES);

  const { data: recentOTPs, error } = await supabase
    .from('sms_otp')
    .select('created_at')
    .eq('phone', phone)
    .gte('created_at', limitTime.toISOString());

  if (error) {
    console.error('Rate Limit Check Error:', error);
    return { allowed: true }; // Allow on error
  }

  if (recentOTPs.length >= MAX_REQUESTS_PER_PERIOD) {
    const oldestRequest = new Date(recentOTPs[0].created_at);
    const waitTime = RATE_LIMIT_MINUTES - Math.floor((new Date() - oldestRequest) / 60000);
    
    return {
      allowed: false,
      waitMinutes: Math.max(1, waitTime)
    };
  }

  return { allowed: true };
}

/**
 * Clean up expired OTPs (run periodically)
 */
async function cleanupExpiredOTPs() {
  const { error } = await supabase
    .from('sms_otp')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .eq('is_active', false);

  if (error) {
    console.error('Cleanup Error:', error);
  }
}

module.exports = {
  generateOTP,
  createOTP,
  verifyOTP,
  checkRateLimit,
  cleanupExpiredOTPs,
  OTP_EXPIRY_MINUTES,
  MAX_ATTEMPTS
};
```

**Command to create:**
```bash
cat > backend/services/otp.service.js << 'EOF'
[paste code above]
EOF
```

---

## STEP 3: WHATSAPP SERVICE

### File: `backend/services/whatsapp.service.js`

```javascript
// WhatsApp Business API Service
const axios = require('axios');
const { formatPhoneE164 } = require('../utils/phone-formatter');

// WhatsApp API Configuration
const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;

/**
 * Send WhatsApp message
 */
async function sendWhatsAppMessage(to, templateName, parameters = {}) {
  try {
    if (!WHATSAPP_PHONE_ID || !WHATSAPP_TOKEN) {
      throw new Error('WhatsApp API not configured');
    }

    const formattedPhone = formatPhoneE164(to);

    const payload = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: 'ar'
        },
        components: buildTemplateComponents(templateName, parameters)
      }
    };

    const response = await axios.post(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_ID}/messages`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      messageId: response.data.messages[0].id,
      provider: 'whatsapp'
    };
  } catch (error) {
    console.error('WhatsApp Send Error:', error.response?.data || error);
    throw new Error('فشل إرسال رسالة واتساب');
  }
}

/**
 * Send OTP via WhatsApp
 */
async function sendOTP(phone, otpCode) {
  try {
    return await sendWhatsAppMessage(phone, 'otp_verification', {
      code: otpCode,
      expiry: '10 دقائق'
    });
  } catch (error) {
    console.error('WhatsApp OTP Error:', error);
    throw error;
  }
}

/**
 * Send registration invitation
 */
async function sendRegistrationInvite(phone, memberName, registrationLink) {
  try {
    return await sendWhatsAppMessage(phone, 'registration_invite', {
      name: memberName,
      link: registrationLink
    });
  } catch (error) {
    console.error('WhatsApp Invite Error:', error);
    throw error;
  }
}

/**
 * Send approval notification
 */
async function sendApprovalNotification(phone, memberName, status) {
  try {
    const templateName = status === 'approved' ? 'member_approved' : 'member_rejected';
    
    return await sendWhatsAppMessage(phone, templateName, {
      name: memberName
    });
  } catch (error) {
    console.error('WhatsApp Notification Error:', error);
    throw error;
  }
}

/**
 * Build template components based on template name
 */
function buildTemplateComponents(templateName, parameters) {
  const components = [];

  switch (templateName) {
    case 'otp_verification':
      components.push({
        type: 'body',
        parameters: [
          { type: 'text', text: parameters.code },
          { type: 'text', text: parameters.expiry || '10 دقائق' }
        ]
      });
      break;

    case 'registration_invite':
      components.push({
        type: 'body',
        parameters: [
          { type: 'text', text: parameters.name }
        ]
      });
      if (parameters.link) {
        components.push({
          type: 'button',
          sub_type: 'url',
          index: 0,
          parameters: [
            { type: 'text', text: parameters.link }
          ]
        });
      }
      break;

    case 'member_approved':
    case 'member_rejected':
      components.push({
        type: 'body',
        parameters: [
          { type: 'text', text: parameters.name }
        ]
      });
      break;
  }

  return components;
}

/**
 * Check WhatsApp API health
 */
async function checkWhatsAppHealth() {
  try {
    if (!WHATSAPP_PHONE_ID || !WHATSAPP_TOKEN) {
      return { healthy: false, message: 'WhatsApp not configured' };
    }

    const response = await axios.get(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_ID}`,
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`
        }
      }
    );

    return { 
      healthy: true, 
      phoneNumber: response.data.display_phone_number 
    };
  } catch (error) {
    return { 
      healthy: false, 
      message: error.message 
    };
  }
}

module.exports = {
  sendWhatsAppMessage,
  sendOTP,
  sendRegistrationInvite,
  sendApprovalNotification,
  checkWhatsAppHealth
};
```

**Command to create:**
```bash
cat > backend/services/whatsapp.service.js << 'EOF'
[paste code above]
EOF
```

---

## STEP 4: SMS FALLBACK SERVICE

### File: `backend/services/sms.service.js`

```javascript
// SMS Service (Twilio) - Fallback for WhatsApp
const twilio = require('twilio');
const { formatPhoneE164 } = require('../utils/phone-formatter');

// Twilio Configuration
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

let twilioClient;

if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

/**
 * Send SMS message
 */
async function sendSMS(to, message) {
  try {
    if (!twilioClient) {
      throw new Error('SMS service not configured');
    }

    const formattedPhone = formatPhoneE164(to);

    const result = await twilioClient.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to: formattedPhone
    });

    return {
      success: true,
      messageId: result.sid,
      provider: 'sms'
    };
  } catch (error) {
    console.error('SMS Send Error:', error);
    throw new Error('فشل إرسال الرسالة النصية');
  }
}

/**
 * Send OTP via SMS
 */
async function sendOTPSMS(phone, otpCode) {
  const message = `
رمز التحقق الخاص بك هو: ${otpCode}

صالح لمدة 10 دقائق
لا تشارك هذا الرمز مع أحد

عائلة الشعيل
  `.trim();

  return await sendSMS(phone, message);
}

/**
 * Send registration invite via SMS
 */
async function sendRegistrationInviteSMS(phone, memberName) {
  const message = `
مرحباً ${memberName}

تمت إضافتك إلى سجل عائلة الشعيل
يرجى إكمال بياناتك من خلال التطبيق

عائلة الشعيل
  `.trim();

  return await sendSMS(phone, message);
}

/**
 * Check SMS service health
 */
async function checkSMSHealth() {
  if (!twilioClient) {
    return { healthy: false, message: 'SMS not configured' };
  }

  try {
    await twilioClient.api.accounts(TWILIO_ACCOUNT_SID).fetch();
    return { healthy: true };
  } catch (error) {
    return { healthy: false, message: error.message };
  }
}

module.exports = {
  sendSMS,
  sendOTPSMS,
  sendRegistrationInviteSMS,
  checkSMSHealth
};
```

**Command to create:**
```bash
cat > backend/services/sms.service.js << 'EOF'
[paste code above]
EOF
```

---

## STEP 5: OTP CONTROLLER

### File: `backend/controllers/otp.controller.js`

```javascript
// OTP Controller
const { createOTP, verifyOTP } = require('../services/otp.service');
const { sendOTP: sendWhatsAppOTP } = require('../services/whatsapp.service');
const { sendOTPSMS } = require('../services/sms.service');
const { isValidPhone, formatPhoneE164 } = require('../utils/phone-formatter');

/**
 * Send OTP (WhatsApp with SMS fallback)
 * POST /api/otp/send
 */
exports.sendOTP = async (req, res) => {
  try {
    const { phone, purpose = 'verification' } = req.body;

    // Validate phone
    if (!phone || !isValidPhone(phone)) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف غير صحيح. يجب أن يكون سعودي (+966) أو كويتي (+965)'
      });
    }

    const formattedPhone = formatPhoneE164(phone);

    // Create OTP
    const otp = await createOTP(formattedPhone, purpose);

    // Try WhatsApp first
    let sent = false;
    let provider = null;

    try {
      await sendWhatsAppOTP(formattedPhone, otp.code);
      sent = true;
      provider = 'whatsapp';
    } catch (whatsappError) {
      console.error('WhatsApp failed, trying SMS:', whatsappError);
      
      // Fallback to SMS
      try {
        await sendOTPSMS(formattedPhone, otp.code);
        sent = true;
        provider = 'sms';
      } catch (smsError) {
        console.error('SMS also failed:', smsError);
      }
    }

    if (!sent) {
      return res.status(500).json({
        success: false,
        message: 'فشل إرسال رمز التحقق. يرجى المحاولة لاحقاً'
      });
    }

    res.json({
      success: true,
      message: `تم إرسال رمز التحقق عبر ${provider === 'whatsapp' ? 'واتساب' : 'الرسائل النصية'}`,
      expiresIn: '10 دقائق',
      provider: provider
    });
  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'خطأ في إرسال رمز التحقق'
    });
  }
};

/**
 * Verify OTP
 * POST /api/otp/verify
 */
exports.verifyOTP = async (req, res) => {
  try {
    const { phone, code, purpose = 'verification' } = req.body;

    // Validate inputs
    if (!phone || !code) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف والرمز مطلوبان'
      });
    }

    if (!isValidPhone(phone)) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف غير صحيح'
      });
    }

    const formattedPhone = formatPhoneE164(phone);

    // Verify OTP
    const result = await verifyOTP(formattedPhone, code, purpose);

    if (result.success) {
      return res.json({
        success: true,
        message: result.message,
        verified: true
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message,
        attemptsRemaining: result.attemptsRemaining,
        verified: false
      });
    }
  } catch (error) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في التحقق من الرمز'
    });
  }
};

/**
 * Resend OTP
 * POST /api/otp/resend
 */
exports.resendOTP = async (req, res) => {
  // Same as sendOTP
  return exports.sendOTP(req, res);
};

module.exports = exports;
```

**Command to create:**
```bash
cat > backend/controllers/otp.controller.js << 'EOF'
[paste code above]
EOF
```

---

## STEP 6: OTP ROUTES

### File: `backend/routes/otp.routes.js`

```javascript
// OTP Routes
const express = require('express');
const router = express.Router();
const otpController = require('../controllers/otp.controller');

/**
 * Send OTP
 */
router.post('/send', otpController.sendOTP);

/**
 * Verify OTP
 */
router.post('/verify', otpController.verifyOTP);

/**
 * Resend OTP
 */
router.post('/resend', otpController.resendOTP);

module.exports = router;
```

**Command to create:**
```bash
mkdir -p backend/routes
cat > backend/routes/otp.routes.js << 'EOF'
[paste code above]
EOF
```

---

## STEP 7: UPDATE SERVER.JS

Add OTP routes and install dependencies:

```bash
# Install required packages
cd backend
npm install twilio axios

# Add routes to server.js
cat >> backend/server.js << 'EOF'

// OTP Routes
const otpRoutes = require('./routes/otp.routes');
app.use('/api/otp', otpRoutes);

// Cleanup expired OTPs every hour
const { cleanupExpiredOTPs } = require('./services/otp.service');
setInterval(cleanupExpiredOTPs, 60 * 60 * 1000);
EOF
```

---

## STEP 8: UPDATE .ENV FILE

Add WhatsApp and SMS configuration:

```bash
cat >> backend/.env << 'EOF'

# WhatsApp Business API
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_PHONE_ID=your_phone_number_id
WHATSAPP_TOKEN=your_whatsapp_token

# Twilio SMS (Fallback)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890

# Mobile App URL
MOBILE_APP_URL=https://alshuail-mobile.app
EOF
```

---

## STEP 9: CREATE WHATSAPP MESSAGE TEMPLATES

You need to create these templates in your WhatsApp Business Account:

### Template 1: OTP Verification
**Name**: `otp_verification`  
**Language**: Arabic (ar)  
**Category**: Authentication  
**Content**:
```
مرحباً
رمز التحقق الخاص بك هو: {{1}}

صالح لمدة {{2}}
لا تشارك هذا الرمز مع أحد

عائلة الشعيل
```

### Template 2: Registration Invite
**Name**: `registration_invite`  
**Language**: Arabic (ar)  
**Category**: Utility  
**Content**:
```
مرحباً {{1}}

تمت إضافتك إلى سجل عائلة الشعيل
يرجى إكمال بياناتك من خلال الرابط التالي

عائلة الشعيل
```
**Button**: URL button with dynamic link

### Template 3: Member Approved
**Name**: `member_approved`  
**Language**: Arabic (ar)  
**Category**: Utility  
**Content**:
```
مرحباً {{1}}

تمت الموافقة على طلب تسجيلك في عائلة الشعيل
يمكنك الآن الوصول إلى جميع خدمات التطبيق

عائلة الشعيل
```

---

## STEP 10: TEST THE INTEGRATION

### Test 1: Send OTP via WhatsApp
```bash
curl -X POST http://localhost:3000/api/otp/send \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+966501234567",
    "purpose": "verification"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "تم إرسال رمز التحقق عبر واتساب",
  "expiresIn": "10 دقائق",
  "provider": "whatsapp"
}
```

### Test 2: Verify OTP
```bash
curl -X POST http://localhost:3000/api/otp/verify \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+966501234567",
    "code": "123456"
  }'
```

### Test 3: Test with Kuwaiti Number
```bash
curl -X POST http://localhost:3000/api/otp/send \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+96550001234",
    "purpose": "verification"
  }'
```

### Test 4: Test SMS Fallback
Temporarily disable WhatsApp in .env and test:
```bash
# Comment out WhatsApp credentials in .env
WHATSAPP_TOKEN=disabled

# Then run test again - should use SMS
curl -X POST http://localhost:3000/api/otp/send \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+966501234567"
  }'
```

---

## ✅ VERIFICATION CHECKLIST

```
□ WhatsApp Business API configured
□ SMS service (Twilio) configured as fallback
□ OTP generation working
□ OTP storage in database
□ Saudi phone numbers (+966) working
□ Kuwaiti phone numbers (+965) working
□ Phone formatting correct
□ Rate limiting working (max 3 per 5 min)
□ OTP expiry (10 minutes) working
□ Verification working
□ Templates created in WhatsApp Business
□ SMS fallback working
```

---

## 🔧 TROUBLESHOOTING

### Issue: WhatsApp messages not sending
**Solution**: Check WhatsApp Business API setup:
1. Verify WHATSAPP_PHONE_ID is correct
2. Verify WHATSAPP_TOKEN is valid
3. Check templates are approved
4. Test with: `curl https://graph.facebook.com/v18.0/me?access_token=YOUR_TOKEN`

### Issue: Phone number format errors
**Solution**: Test phone formatter:
```javascript
const { formatPhoneE164 } = require('./utils/phone-formatter');
console.log(formatPhoneE164('0501234567')); // Should output: +966501234567
console.log(formatPhoneE164('50001234'));   // Should output: +96550001234
```

### Issue: SMS not working
**Solution**: Check Twilio configuration:
```bash
curl -X GET 'https://api.twilio.com/2010-04-01/Accounts.json' \
  -u "YOUR_ACCOUNT_SID:YOUR_AUTH_TOKEN"
```

### Issue: Rate limit too strict
**Solution**: Adjust in otp.service.js:
```javascript
const MAX_REQUESTS_PER_PERIOD = 5; // Increase from 3
const RATE_LIMIT_MINUTES = 10; // Increase from 5
```

---

## 📊 DATABASE VERIFICATION

Check OTP table:
```sql
-- View recent OTPs
SELECT 
  phone,
  code,
  purpose,
  created_at,
  expires_at,
  attempts,
  is_active,
  verified_at
FROM sms_otp
ORDER BY created_at DESC
LIMIT 10;

-- Count active OTPs
SELECT COUNT(*) FROM sms_otp WHERE is_active = true;

-- Check rate limiting
SELECT 
  phone,
  COUNT(*) as request_count,
  MAX(created_at) as last_request
FROM sms_otp
WHERE created_at >= NOW() - INTERVAL '5 minutes'
GROUP BY phone
HAVING COUNT(*) >= 3;
```

---

## 📝 WHATSAPP BUSINESS SETUP GUIDE

### 1. Create WhatsApp Business Account
- Go to: https://business.facebook.com/
- Create Business Portfolio
- Add WhatsApp Business API

### 2. Get Phone Number ID
- In Business Manager, go to WhatsApp > API Setup
- Copy the "Phone Number ID"

### 3. Generate Access Token
- In WhatsApp > API Setup
- Generate System User Token
- Give it `whatsapp_business_messaging` permission

### 4. Create Message Templates
- Go to WhatsApp > Message Templates
- Create templates as specified above
- Wait for approval (usually 24 hours)

### 5. Test Configuration
```bash
curl -X GET \
  'https://graph.facebook.com/v18.0/YOUR_PHONE_ID' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

---

## 📝 NEXT STEPS

After completing this file:
- ✅ WhatsApp OTP working
- ✅ SMS fallback implemented
- ✅ Saudi & Kuwaiti phones supported
- ✅ Rate limiting active
- ⏭️ **NEXT**: File 08 - Testing

---

**Status**: Ready for Claude Code execution
**Estimated Time**: 40-50 minutes (includes WhatsApp setup)
**Dependencies**: Files 01-06 completed, WhatsApp Business Account required
**Next File**: 08-TESTING.md
