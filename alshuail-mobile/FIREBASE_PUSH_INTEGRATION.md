# 🔔 Firebase Push Notifications - Complete Integration
## صندوق عائلة شعيل العنزي

**Date**: December 2, 2025  
**Status**: ✅ Ready for Deployment

---

## 📁 Files Created/Modified

### New Files
| File | Purpose |
|------|---------|
| `public/firebase-messaging-sw.js` | Service worker for background notifications |
| `src/services/pushNotificationService.js` | Push notification handling service |
| `src/components/NotificationPrompt.jsx` | Permission request UI component |

### Modified Files
| File | Changes |
|------|---------|
| `src/services/index.js` | Added pushNotificationService export |
| `src/pages/Dashboard.jsx` | Added NotificationPrompt component |
| `src/pages/Settings.jsx` | Added notification toggle with push support |

---

## 🔧 Firebase Configuration

### Frontend Web Push
Set these variables in `alshuail-mobile/.env` or in the deployment environment:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_VAPID_KEY=
```

`npm run dev` and `npm run build` generate `public/firebase-sw-config.js` from those variables so the service worker and app use the same Firebase project settings. If the variables are missing, push notifications disable cleanly.

### Backend Admin SDK
Configure backend Firebase Admin credentials through environment variables, not source files:

```bash
FIREBASE_ENABLED=true
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

`FIREBASE_PRIVATE_KEY` should be stored in the server secret manager or `.env` file with escaped newlines if needed.

---

## 🚀 Deployment Steps

### Step 1: Build Mobile App
```bash
cd alshuail-mobile
npm run build
```

### Step 2: Deploy to VPS
```bash
scp -r dist/* root@213.199.62.185:/var/www/mobile/
```

### Step 3: Reload Nginx
```bash
ssh root@213.199.62.185 "nginx -t && systemctl reload nginx"
```

---

## 🧪 Testing Push Notifications

### Test 1: Permission Flow
1. Open https://app.alshailfund.com
2. Login with your phone number
3. After login, notification prompt appears
4. Click "تفعيل" to enable notifications
5. Should see test notification: "تم تفعيل الإشعارات بنجاح!"

### Test 2: Settings Toggle
1. Go to Settings page
2. Toggle "الإشعارات" switch
3. Should request permission if not already granted

### Test 3: Send Test Notification via API
```bash
# First, get member ID from database
# Then send notification:

curl -X POST "https://api.alshailfund.com/api/notifications/push/send" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "memberId": "MEMBER_UUID",
    "title": "🔔 اختبار الإشعارات",
    "body": "هذه رسالة اختبار من صندوق عائلة شعيل"
  }'
```

### Test 4: Broadcast to All Members
```bash
curl -X POST "https://api.alshailfund.com/api/notifications/push/broadcast" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "title": "📢 إعلان هام",
    "body": "تم إطلاق خاصية الإشعارات الفورية!",
    "topic": "all_members"
  }'
```

---

## 📱 User Flow

```
┌─────────────────────────────────────────┐
│  User logs in via WhatsApp OTP          │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Dashboard loads                         │
│  NotificationPrompt appears after 2s    │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  User clicks "تفعيل"                    │
│  - Browser requests permission          │
│  - FCM token generated                  │
│  - Token registered with backend        │
│  - Test notification shown              │
└─────────────────────────────────────────┘
```

---

## 🔔 Notification Types Supported

| Type | Endpoint | Description |
|------|----------|-------------|
| Single | `/push/send` | Send to specific member |
| Multicast | `/push/send` (multiple tokens) | Send to member's devices |
| Broadcast | `/push/broadcast` | Send to all subscribed members |
| Payment Reminder | `/push/payment-reminder` | Payment due notification |
| Event | `/push/event` | Event announcement |

---

## 📊 Database Tables Used

### `device_tokens`
Stores FCM tokens for each device:
- `id` - UUID
- `token` - FCM registration token
- `member_id` - Member UUID
- `platform` - 'web', 'ios', 'android'
- `is_active` - Boolean
- `created_at` - Timestamp
- `updated_at` - Timestamp

### `notification_logs`
Logs all sent notifications:
- `id` - UUID
- `member_id` - Target member
- `title` - Notification title
- `body` - Notification body
- `status` - 'sent', 'failed'
- `success_count` - Number of successful deliveries
- `failure_count` - Number of failures
- `sent_at` - Timestamp

---

## ⚠️ Important Notes

1. **HTTPS Required**: Push notifications only work on HTTPS domains
2. **Service Worker**: Must be at root level (`/firebase-messaging-sw.js`)
3. **Permission**: User must grant permission in browser
4. **Token Refresh**: Tokens may expire and need re-registration

---

## ✅ Checklist

- [x] Firebase Admin SDK configured through environment variables
- [x] Service worker created
- [x] Push notification service created
- [x] Permission prompt component created
- [x] Dashboard integration
- [x] Settings toggle
- [x] API endpoints ready

---

## 🔗 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/notifications/push/register` | Register device token |
| POST | `/api/notifications/push/unregister` | Unregister device token |
| POST | `/api/notifications/push/send` | Send notification to member |
| POST | `/api/notifications/push/broadcast` | Broadcast to all |
| POST | `/api/notifications/push/payment-reminder` | Send payment reminder |
| POST | `/api/notifications/push/event` | Send event notification |

---

**Ready to deploy! 🚀**
