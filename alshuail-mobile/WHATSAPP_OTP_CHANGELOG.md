# 📱 WhatsApp OTP Integration - Mobile App
## صندوق عائلة شعيل العنزي

**Date**: December 2, 2025  
**Status**: ✅ Complete

---

## 🎯 Changes Made

### 1. Authentication Service (`src/services/authService.js`)

**Changed Endpoints:**
| Method | Old Endpoint | New Endpoint |
|--------|--------------|--------------|
| sendOTP | `/auth/send-otp` | `/otp/send` |
| verifyOTP | `/auth/verify-otp` | `/otp/verify` |
| resendOTP | (new) | `/otp/resend` |
| checkOTPStatus | (new) | `/otp/status` |

**Features:**
- ✅ Send OTP via WhatsApp
- ✅ Verify OTP and get JWT token
- ✅ Resend OTP with cooldown
- ✅ Auto-store token and user data

---

### 2. Login Page (`src/pages/Login.jsx`)

**Complete Rewrite - Two-Step Flow:**

**Step 1: Phone Input**
- Phone number validation (Saudi 🇸🇦 + Kuwait 🇰🇼)
- WhatsApp branding and messaging
- Demo login option (for testing)

**Step 2: OTP Verification**
- 6-digit OTP input with auto-focus
- Paste support
- 5-minute countdown timer
- 60-second resend cooldown
- Auto-submit when complete
- Error handling with retry

**Phone Formats Supported:**
- `05xxxxxxxx` (Saudi local)
- `+966xxxxxxxx` (Saudi international)
- `9xxxxxxx` (Kuwait local)
- `+965xxxxxxx` (Kuwait international)

---

### 3. CSS Updates (`src/index.css`)

Added:
- `.btn-primary:disabled` - Disabled button styling
- `.back-button` - Alternative back button class

---

## 📋 Files Modified

```
alshuail-mobile/
├── src/
│   ├── services/
│   │   └── authService.js     ✅ Updated
│   ├── pages/
│   │   └── Login.jsx          ✅ Rewritten
│   └── index.css              ✅ Updated
└── deploy-otp.bat             ✅ Created
```

---

## 🧪 Testing

### Local Test
```bash
cd D:\PROShael\alshuail-mobile
npm run dev
```

Open: http://localhost:5173

### Test Flow
1. Enter phone number: `0506062321` (or any registered number)
2. Check WhatsApp for OTP
3. Enter 6-digit code
4. Should redirect to dashboard

### API Test
```bash
# Send OTP
curl -X POST https://api.alshailfund.com/api/otp/send \
  -H "Content-Type: application/json" \
  -d '{"phone": "0506062321"}'

# Verify OTP
curl -X POST https://api.alshailfund.com/api/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"phone": "0506062321", "otp": "123456"}'
```

---

## 🚀 Deployment

### Option 1: Batch Script
```batch
D:\PROShael\alshuail-mobile\deploy-otp.bat
```

### Option 2: Manual
```bash
cd D:\PROShael\alshuail-mobile
npm run build
scp -r dist/* root@213.199.62.185:/var/www/mobile/
```

### Option 3: SSH Direct
```bash
ssh root@213.199.62.185
cd /var/www/mobile
# Files should be in place
nginx -t && systemctl reload nginx
```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Can access https://app.alshailfund.com/login
- [ ] Phone input accepts Saudi/Kuwait numbers
- [ ] OTP is received via WhatsApp
- [ ] OTP verification works
- [ ] User is logged in and redirected to dashboard
- [ ] Token is stored in localStorage
- [ ] Demo login still works

---

## 🔧 Troubleshooting

### OTP Not Received
1. Check WhatsApp service: `curl https://api.alshailfund.com/api/otp/status`
2. Verify phone is registered in members table
3. Check Ultramsg dashboard for delivery status

### Login Fails After OTP
1. Check API response in browser dev tools
2. Verify token format in response
3. Check localStorage for `alshuail_token`

### Network Errors
1. Verify API URL in `.env`
2. Check CORS settings on backend
3. Test API directly with curl

---

**Integration Complete! 🎉**
