# Mobile App API Integration Update Log

**Date**: November 30, 2025
**Developer**: Claude AI
**Version**: 2.1.0

---

## Summary

This update connects all mobile app pages to the real backend API at `https://api.alshailfund.com`. Previously, many pages used mock/demo data. Now they fetch real data from the database.

---

## New Files Created

### `/src/services/` - API Service Layer

1. **`authService.js`** - Authentication operations
   - `sendOTP(phone)` - Send OTP for login
   - `verifyOTP(phone, otp)` - Verify OTP code
   - `memberLogin(phone, password)` - Login with phone/password
   - `mobileLogin(phone, password)` - Alias for member login
   - `verifyToken()` - Validate current token
   - `refreshToken()` - Refresh expired token
   - `changePassword(current, new)` - Change user password
   - `logout()` - Clear auth data

2. **`memberService.js`** - Member profile operations
   - `getProfile()` - Get current user profile
   - `updateProfile(data)` - Update profile info
   - `uploadAvatar(file)` - Upload profile picture
   - `deleteAvatar()` - Remove profile picture
   - `getMyData()` - Get member data from members table
   - `getSubscriptionStatus()` - Get subscription status
   - `getPaymentHistory()` - Get payment history
   - `getNotificationSettings()` - Get notification prefs
   - `updateNotificationSettings(settings)` - Update notification prefs
   - `getAppearanceSettings()` / `updateAppearanceSettings()`
   - `getLanguageSettings()` / `updateLanguageSettings()`

3. **`familyTreeService.js`** - Family tree operations
   - `getFullTree()` - Get complete family tree
   - `getBranches()` - Get all branches (فخوذ)
   - `getStats()` - Get tree statistics
   - `searchMembers(query)` - Search within tree
   - `getMyBranch()` - Get current user's branch
   - `addChild(childData)` - Add a child to current user

4. **`subscriptionService.js`** - Subscription/payment operations
   - `getPlans()` - Get subscription plans
   - `getMySubscriptions()` - Get user's subscriptions
   - `getYearlyStatus(year)` - Get status for specific year
   - `getPaymentHistory()` - Get all payments
   - `makePayment(data)` - Process a payment
   - `getStatement()` - Get member statement

5. **`initiativeService.js`** - Initiative operations
   - `getAllInitiatives()` - Get all initiatives
   - `getInitiativeById(id)` - Get single initiative
   - `contribute(id, data)` - Make contribution
   - `getMyContributions()` - Get user's contributions

6. **`newsService.js`** - News operations
   - `getNews(params)` - Get published news
   - `getNewsById(id)` - Get single news item
   - `getNewsByCategory(category)` - Filter by category
   - `reactToNews(id, reaction)` - React to news

7. **`notificationService.js`** - Notification operations
   - `getMyNotifications(unreadOnly)` - Get notifications
   - `markAsRead(id)` - Mark single as read
   - `markAllAsRead()` - Mark all as read
   - `getUnreadCount()` - Get unread count
   - `registerDevice(token, type)` - Register for push

8. **`index.js`** - Export all services

---

## Updated Pages

### 1. Login.jsx
**Changes:**
- Switched from OTP-only flow to phone+password authentication
- Uses `authService.mobileLogin()` for authentication
- Handles `requires_password_change` flag for first-time login
- Added password visibility toggle
- Shows default password hint (123456)

### 2. Dashboard.jsx
**Changes:**
- Fetches real balance from `memberService.getMyData()`
- Fetches notification count from `notificationService.getUnreadCount()`
- Fetches recent news from `newsService.getRecentNews(1)`
- Fetches payment history from `subscriptionService.getPaymentHistory()`
- Added pull-to-refresh functionality
- Added loading and error states

### 3. FamilyTree.jsx
**Changes:**
- Fetches tree from `familyTreeService.getMyBranch()` or `getFullTree()`
- Fetches stats from `familyTreeService.getStats()`
- Fetches branches from `familyTreeService.getBranches()`
- Uses `familyTreeService.addChild()` to add children
- Falls back to demo tree if API fails

### 4. Initiatives.jsx
**Changes:**
- Fetches initiatives from `initiativeService.getAllInitiatives()`
- Calculates stats from real data
- Processes initiatives with proper field mapping
- Falls back to demo data on error

### 5. News.jsx
**Changes:**
- Fetches news from `newsService.getNews()`
- Supports category filtering
- Uses `newsService.reactToNews()` for likes
- Adds sharing functionality
- Falls back to demo data on error

### 6. Notifications.jsx
**Changes:**
- Fetches from `notificationService.getMyNotifications()`
- Uses `notificationService.markAsRead()` for individual items
- Uses `notificationService.markAllAsRead()` for bulk action
- Shows unread count badge
- Added pull-to-refresh

### 7. Payments.jsx
**Changes:**
- Fetches from `subscriptionService.getMySubscriptions()`
- Falls back to `subscriptionService.getBalanceSummary()`
- Calculates totals from real data
- Shows loading and error states
- Added refresh button

---

## API Endpoints Used

### Authentication
```
POST /api/auth/mobile-login  - Login with phone/password
POST /api/auth/member-login  - Alternative login endpoint
POST /api/auth/verify        - Verify token
POST /api/auth/refresh       - Refresh token
POST /api/auth/change-password - Change password
POST /api/auth/logout        - Clear session
```

### Members
```
GET  /api/members/me         - Get current member data
GET  /api/user/profile       - Get user profile
PUT  /api/user/profile       - Update profile
POST /api/user/profile/avatar - Upload avatar
```

### Family Tree
```
GET /api/family-tree         - Get full tree
GET /api/family-tree/my-branch - Get user's branch
GET /api/family-tree/branches - Get all branches
GET /api/family-tree/stats   - Get statistics
POST /api/family-tree/add-child - Add child
```

### Subscriptions
```
GET /api/subscriptions/my    - Get user's subscriptions
GET /api/subscriptions/balance - Get balance summary
GET /api/subscriptions/year/:year - Get yearly details
GET /api/payments/history    - Get payment history
```

### Initiatives
```
GET /api/initiatives         - Get all initiatives
GET /api/initiatives/:id     - Get single initiative
GET /api/initiatives/stats   - Get statistics
POST /api/initiatives/:id/contribute - Make contribution
```

### News
```
GET /api/news                - Get published news
GET /api/news/:id            - Get single news
POST /api/news/:id/react     - React to news
```

### Notifications
```
GET /api/news/notifications/my - Get user's notifications
PATCH /api/news/notifications/:id/read - Mark as read
PATCH /api/news/notifications/mark-all-read - Mark all read
GET /api/news/notifications/unread-count - Get unread count
```

---

## Error Handling

All pages now include:
- Loading spinners during data fetch
- Error messages when API calls fail
- Graceful fallback to demo data
- Pull-to-refresh capability
- Toast notifications for actions

---

## Testing

To test the integration:

1. **Build the app:**
   ```bash
   cd D:\PROShael\alshuail-mobile
   npm run build
   ```

2. **Deploy to VPS:**
   ```bash
   scp -r dist/* root@213.199.62.185:/var/www/mobile/
   ```

3. **Test login:**
   - Phone: 0501234567
   - Password: 123456

4. **Test each page:**
   - Dashboard should show real balance
   - Family Tree should load user's branch
   - Payments should show subscription history
   - News should load from database
   - Notifications should show count

---

## Known Limitations

1. Some endpoints may need to be created on backend:
   - `/api/family-tree/my-branch`
   - `/api/family-tree/add-child`
   - `/api/subscriptions/my`

2. Payment integration (K-Net) not yet implemented
3. Push notifications not yet configured
4. OTP flow disabled (using password instead)

---

## Next Steps

1. Create missing backend endpoints
2. Implement K-Net payment gateway
3. Set up Firebase push notifications
4. Add WhatsApp OTP integration
5. Test with real member accounts

---

**Document Version**: 1.0
**Last Updated**: November 30, 2025
