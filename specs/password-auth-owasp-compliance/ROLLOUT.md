# Password Authentication OWASP Compliance - Rollout Guide

**Version**: 1.0.0
**Date**: 2026-01-09
**Status**: Ready for Deployment

---

## Summary of Changes

### Security Improvements

| Change | Files Modified | Risk Level |
|--------|---------------|------------|
| Feature flag (PASSWORD_AUTH_ENABLED) | `env.js`, `featureFlags.js`, `passwordAuth.routes.js` | Low |
| Phone enumeration fix | `passwordAuth.controller.js`, `otp.routes.js` | Medium |
| Secure OTP generation | `secureOtp.js`, `passwordAuth.controller.js` | Low |
| Remove plain text OTP storage | `passwordAuth.controller.js` | Low |
| Enhanced security logging | `passwordAuth.controller.js` | Low |
| Flutter 503 handling | `auth_service.dart`, `api_service.dart` | Low |

---

## Pre-Deployment Checklist

### Backend

- [ ] Verify `.env` has `PASSWORD_AUTH_ENABLED=true`
- [ ] Verify `.env` has `OTP_AUTH_ENABLED=true`
- [ ] Run `npm install` to ensure all dependencies are present
- [ ] Test password login endpoint locally
- [ ] Test OTP login endpoint locally
- [ ] Verify structured logs appear in console

### Flutter App

- [ ] Run `flutter pub get`
- [ ] Test password login with enabled flag
- [ ] Test password login with disabled flag (expect fallback message)
- [ ] Test OTP login (should always work)

---

## Deployment Steps

### Step 1: Deploy Backend with Flag Disabled (Safe Mode)

```bash
# Set environment variable
PASSWORD_AUTH_ENABLED=false

# Deploy to VPS
ssh user@213.199.62.185
cd /var/www/alshuail-backend
git pull origin main
pm2 restart alshuail-api
```

**Verify**: OTP login works, password login returns 503

### Step 2: Monitor OTP Login

Monitor for 24-48 hours to ensure:
- OTP requests work normally
- No errors in logs
- WhatsApp messages being sent

### Step 3: Enable Password Auth

```bash
# Update environment variable
PASSWORD_AUTH_ENABLED=true

# Restart service
pm2 restart alshuail-api
```

### Step 4: Monitor Password Auth

Monitor security logs for:
```bash
# Watch for security events
tail -f /var/log/alshuail/api.log | grep "\[SECURITY\]"
```

Look for:
- `login_success` - Normal password logins
- `login_failed` - Failed attempts (watch for patterns)
- `account_locked` - Lockouts (investigate if excessive)

---

## Rollback Procedure

### Immediate Rollback (No Code Changes)

If issues are detected, disable password auth instantly:

```bash
# SSH to server
ssh user@213.199.62.185

# Edit environment
nano /var/www/alshuail-backend/.env

# Set PASSWORD_AUTH_ENABLED=false

# Restart
pm2 restart alshuail-api
```

**Effect**: Password login disabled, OTP login continues working

### Full Rollback (Code Revert)

If critical issues require code revert:

```bash
# Revert to previous commit
git log --oneline -5  # Find previous commit
git revert HEAD
git push origin main

# Restart
pm2 restart alshuail-api
```

---

## Monitoring & Alerts

### Key Metrics to Watch

| Metric | Normal | Warning | Critical |
|--------|--------|---------|----------|
| Password login success rate | >95% | <90% | <80% |
| OTP send success rate | >99% | <95% | <90% |
| Account lockouts per hour | <5 | >10 | >50 |
| 503 responses | 0 | >10 | >100 |

### Log Queries

```bash
# Count login successes in last hour
grep "login_success" /var/log/alshuail/api.log | grep "$(date +%Y-%m-%dT%H)" | wc -l

# Count login failures in last hour
grep "login_failed" /var/log/alshuail/api.log | grep "$(date +%Y-%m-%dT%H)" | wc -l

# Find account lockouts
grep "account_locked" /var/log/alshuail/api.log | tail -20
```

---

## Testing Checklist

### OWASP Compliance Tests

1. **Phone Enumeration Test**
   ```bash
   # Test with registered phone
   curl -X POST https://api.alshailfund.com/api/auth/password/request-otp \
     -H "Content-Type: application/json" \
     -d '{"phone": "0501234567"}'

   # Test with unregistered phone
   curl -X POST https://api.alshailfund.com/api/auth/password/request-otp \
     -H "Content-Type: application/json" \
     -d '{"phone": "0599999999"}'

   # PASS: Both return same message "إذا كان رقم الجوال مسجلاً، سيتم إرسال رمز التحقق"
   ```

2. **Feature Flag Test**
   ```bash
   # With PASSWORD_AUTH_ENABLED=false
   curl -X POST https://api.alshailfund.com/api/auth/password/login \
     -H "Content-Type: application/json" \
     -d '{"phone": "0501234567", "password": "test123"}'

   # PASS: Returns 503 with fallback message
   ```

3. **Rate Limiting Test**
   ```bash
   # Send multiple OTP requests quickly
   for i in {1..3}; do
     curl -X POST https://api.alshailfund.com/api/auth/password/request-otp \
       -H "Content-Type: application/json" \
       -d '{"phone": "0501234567"}'
     sleep 10
   done

   # PASS: Second request returns 429 with wait time
   ```

---

## Known Limitations

1. **OTP Store**: In-memory store used for OTP in `otp.routes.js` - consider Redis for production scaling
2. **bcrypt vs Argon2id**: Still using bcrypt (12 rounds) - acceptable but Argon2id recommended for future
3. **No Password Complexity**: Only 6-character minimum - consider adding complexity rules

---

## Support Contacts

- **Development Lead**: Check CLAUDE.md for contacts
- **VPS Access**: SSH key holders only
- **Database Access**: PostgreSQL on 213.199.62.185

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-09 | Initial OWASP compliance implementation |
