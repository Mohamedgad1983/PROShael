# Authentication System - Quick Start Guide

## Overview

Phase 1 authentication system with mock OTP for rapid development and testing.

## Quick Start

### 1. Environment Setup

```bash
# Already configured in .env file
VITE_MOCK_OTP_ENABLED=true
VITE_MOCK_OTP_CODE=123456
VITE_SUPABASE_URL=https://oneiggrfzagqjbkdinin.supabase.co
VITE_SUPABASE_ANON_KEY=[configured]
```

### 2. Start Development Server

```bash
npm install
npm run dev
```

### 3. Test Login

1. Open http://localhost:3000/login.html
2. Enter any Saudi phone number (e.g., 0512345678)
3. Click "إرسال رمز التحقق" (Send OTP)
4. See mock OTP code: **123456** (displayed on screen)
5. Enter OTP: 123456
6. Click "تسجيل الدخول" (Login)
7. Redirected to dashboard

## Mock OTP Testing

### Test Case 1: Valid Phone Number
```
Input: 0512345678
Expected: OTP sent successfully
Mock OTP: 123456
```

### Test Case 2: Invalid Phone Number
```
Input: 0412345678 (should start with 05)
Expected: Error message displayed
```

### Test Case 3: Rate Limiting
```
Action: Send OTP 3 times within 1 hour
Expected: 4th attempt blocked with error message
```

### Test Case 4: OTP Expiry
```
Action: Wait 5 minutes after OTP sent
Expected: OTP expired, must request new one
```

### Test Case 5: Wrong OTP
```
Input: 654321 (wrong code)
Expected: Error message, 2 attempts remaining
```

## JWT Token Testing

### Check Token in Browser Console
```javascript
// Get stored token
const token = localStorage.getItem('auth_token');
console.log('Token:', token);

// Parse token payload
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Payload:', payload);

// Check expiry (exp is in seconds)
const expiryDate = new Date(payload.exp * 1000);
console.log('Expires:', expiryDate);
```

### Test Token Refresh
```javascript
// Token manager auto-refreshes 5 minutes before expiry
// To test manually:
import tokenManager from './src/auth/token-manager.js';

// Check if should refresh
console.log('Should refresh:', tokenManager.shouldRefreshToken());

// Get time until expiry
console.log('Time until expiry (seconds):', tokenManager.getTimeUntilExpiry());

// Manually trigger refresh (requires backend)
await tokenManager.refreshToken();
```

## Biometric Authentication Testing

### Test WebAuthn Support
```javascript
// Check if WebAuthn is supported
if (window.PublicKeyCredential) {
  console.log('WebAuthn supported!');

  // Check if platform authenticator available
  PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    .then(available => {
      console.log('Biometric available:', available);
    });
}
```

### Register Biometric (Requires Backend)
```javascript
import biometricAuth from './src/auth/biometric-auth.js';

const result = await biometricAuth.registerBiometric(
  'user_id_123',
  '0512345678',
  'ar'
);

console.log('Registration result:', result);
```

### Login with Biometric (Requires Backend)
```javascript
import biometricAuth from './src/auth/biometric-auth.js';

const result = await biometricAuth.authenticateWithBiometric('ar');

if (result.success) {
  console.log('Token:', result.token);
  // Save token and redirect
}
```

## File Structure

```
D:\PROShael\Mobile\
├── login.html (Login page)
├── src/
│   ├── auth/
│   │   ├── auth-service.js (Mock OTP authentication)
│   │   ├── otp-handler.js (OTP validation & sessions)
│   │   ├── token-manager.js (JWT token management)
│   │   ├── jwt-utils.js (JWT utility functions)
│   │   └── biometric-auth.js (WebAuthn biometric)
│   ├── styles/
│   │   └── login.css (Glassmorphism design)
│   └── scripts/
│       └── login.js (Form handling logic)
├── .env (Environment configuration)
└── README_AUTHENTICATION.md (This file)
```

## Common Issues

### Issue 1: OTP Not Displaying
**Cause**: Mock OTP mode not enabled
**Fix**: Check `.env` file has `VITE_MOCK_OTP_ENABLED=true`

### Issue 2: Rate Limit Not Working
**Cause**: Client-side storage cleared
**Fix**: Rate limit resets on page refresh (by design in development)

### Issue 3: Token Expired After Login
**Cause**: System clock incorrect
**Fix**: Check device date/time settings

### Issue 4: Biometric Not Showing
**Cause**: WebAuthn not supported or backend not configured
**Fix**: Test on iOS Safari or Android Chrome with HTTPS

## Production Checklist

Before deploying to production:

- [ ] Set `VITE_MOCK_OTP_ENABLED=false`
- [ ] Configure real SMS provider (Twilio/AWS SNS)
- [ ] Implement server-side rate limiting
- [ ] Migrate to HttpOnly cookies for token storage
- [ ] Add CSRF protection
- [ ] Enable backend biometric endpoints
- [ ] Test on production domain with HTTPS
- [ ] Security audit passed

## Development vs Production

| Feature | Development | Production |
|---------|-------------|-----------|
| OTP | Mock (123456) | Real SMS |
| Rate Limiting | Client-side | Server-side |
| Token Storage | localStorage | HttpOnly cookies |
| CSRF Protection | None | Enabled |
| Biometric | Partial (needs backend) | Full |
| Error Logging | Console | Sentry |

## API Endpoints (Required for Production)

```
POST /api/auth/send-otp
Body: { phone: "0512345678", lang: "ar" }
Response: { success: true, expiresIn: 300 }

POST /api/auth/verify-otp
Body: { phone: "0512345678", otp: "123456", lang: "ar" }
Response: { success: true, token: "jwt_token", user: {...} }

POST /api/auth/refresh-token
Body: { refreshToken: "refresh_token" }
Response: { token: "new_jwt_token", refreshToken: "new_refresh_token" }

POST /api/auth/biometric/register-challenge
Body: { userId: "123", userName: "0512345678" }
Response: { challenge: "base64_challenge" }

POST /api/auth/biometric/register-verify
Body: { userId: "123", credential: {...} }
Response: { success: true, credentialId: "credential_id" }

POST /api/auth/biometric/auth-challenge
Response: { challenge: "base64_challenge", allowCredentials: [...] }

POST /api/auth/biometric/auth-verify
Body: { credential: {...} }
Response: { success: true, token: "jwt_token", user: {...} }
```

## Testing Checklist

- [ ] Valid phone number accepted (05xxxxxxxx)
- [ ] Invalid phone number rejected
- [ ] Mock OTP (123456) works
- [ ] Correct OTP verifies successfully
- [ ] Wrong OTP shows error
- [ ] 3 failed attempts blocks session
- [ ] OTP expires after 5 minutes
- [ ] Timer counts down correctly
- [ ] Resend OTP works after 1 minute
- [ ] Rate limit blocks after 3 sends
- [ ] Token saved to localStorage
- [ ] Token contains correct payload
- [ ] Auto-redirect to dashboard works
- [ ] Logout clears token
- [ ] Glassmorphism design displays correctly
- [ ] Arabic RTL layout correct
- [ ] Loading spinner shows during requests
- [ ] Error messages display in Arabic
- [ ] Responsive design works on mobile

## Support

For issues or questions:
- Check PHASE_1_TESTING_REPORT.md for detailed testing guide
- Check PHASE_1_COMPLETION_SUMMARY.md for implementation details
- Review console logs for debugging information

---

**Status**: ✅ Ready for testing
**Last Updated**: 2025-10-11
