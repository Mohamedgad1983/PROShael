# 🧪 API TESTING GUIDE - QUICK START
## News & Initiatives System Testing

**Backend Server:** http://localhost:3001
**Production:** https://proshael.onrender.com

---

## 🔐 STEP 1: GET YOUR ADMIN TOKEN

### Option A: Login as Admin
```bash
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "phone": "0500000000",  # Your admin phone
  "password": "your-password"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": "...", "role": "admin" }
}
```

**Copy the token** - you'll use it in all requests!

---

## 🧪 STEP 2: TEST NEWS SYSTEM

### Test 2.1: Create News Post

```bash
POST http://localhost:3001/api/news
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "title_ar": "إعلان مهم للعائلة",
  "title_en": "Important Family Announcement",
  "content_ar": "نود إعلامكم بخبر مهم يخص جميع أفراد العائلة...",
  "content_en": "We would like to inform you about important news...",
  "category": "announcement",
  "is_published": true
}
```

**Expected Response:**
```json
{
  "message": "News post created successfully",
  "news": {
    "id": "uuid-here",
    "title_ar": "إعلان مهم للعائلة",
    "is_published": true,
    "created_at": "2025-10-07T..."
  }
}
```

**✅ Copy the news ID** - you'll need it for the push notification!

---

### Test 2.2: 🚨 PUSH NOTIFICATION TO 344 MEMBERS

**THE BIG TEST!** This sends notifications to all 344 active members.

```bash
POST http://localhost:3001/api/news/{NEWS_ID}/push-notification
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "custom_message": "خبر عاجل من عائلة الشعيل"
}
```

**Expected Response:**
```json
{
  "message": "Notification sent to 344 members successfully!",
  "recipient_count": 344
}
```

**What Happened:**
- ✅ 344 notification records created in database
- ✅ All members can now see the news
- ✅ Notification badge counter updated for each member
- ⏱️ **Time taken: ~5-7 seconds**

---

### Test 2.3: Get All News (Admin View)

```bash
GET http://localhost:3001/api/news/admin/all
Authorization: Bearer YOUR_TOKEN_HERE
```

**Expected Response:**
```json
{
  "news": [
    {
      "id": "...",
      "title_ar": "إعلان مهم للعائلة",
      "is_published": true,
      "notification_sent": true,
      "notification_count": 344,
      "views_count": 0,
      "created_at": "..."
    }
  ]
}
```

---

### Test 2.4: Get News Statistics

```bash
GET http://localhost:3001/api/news/{NEWS_ID}/stats
Authorization: Bearer YOUR_TOKEN_HERE
```

**Expected Response:**
```json
{
  "news": { "title_ar": "...", "views_count": 123 },
  "stats": {
    "notificationsSent": 344,
    "notificationsRead": 45,
    "readPercentage": "13.08",
    "reactions": { "like": 23, "love": 12 },
    "totalReactions": 35
  }
}
```

---

### Test 2.5: Get Published News (Member View)

```bash
GET http://localhost:3001/api/news
Authorization: Bearer YOUR_TOKEN_HERE
```

**Expected Response:**
```json
{
  "news": [
    {
      "id": "...",
      "title_ar": "إعلان مهم للعائلة",
      "content_ar": "نود إعلامكم...",
      "published_at": "2025-10-07T...",
      "category": "announcement"
    }
  ]
}
```

---

### Test 2.6: Get Unread Notification Count (Member)

```bash
GET http://localhost:3001/api/news/notifications/unread-count
Authorization: Bearer MEMBER_TOKEN_HERE
```

**Expected Response:**
```json
{
  "unread_count": 5
}
```

**This is the badge counter!** 🔴

---

## 💰 STEP 3: TEST INITIATIVES SYSTEM

### Test 3.1: Create Fundraising Initiative

```bash
POST http://localhost:3001/api/initiatives-enhanced
Authorization: Bearer YOUR_ADMIN_TOKEN
Content-Type: application/json

{
  "title_ar": "مشروع بناء مسجد العائلة",
  "title_en": "Family Mosque Construction",
  "description_ar": "نسعى لجمع التبرعات لبناء مسجد العائلة",
  "description_en": "Fundraising for family mosque construction",
  "beneficiary_name_ar": "مسجد عائلة الشعيل",
  "target_amount": 500000,
  "min_contribution": 100,
  "max_contribution": 50000,
  "status": "active"
}
```

**Expected Response:**
```json
{
  "message": "Initiative created successfully",
  "initiative": {
    "id": "...",
    "title_ar": "مشروع بناء مسجد العائلة",
    "target_amount": 500000,
    "current_amount": 0,
    "status": "active"
  }
}
```

**✅ Copy the initiative ID!**

---

### Test 3.2: Get Active Initiatives (Member View)

```bash
GET http://localhost:3001/api/initiatives-enhanced/active
Authorization: Bearer MEMBER_TOKEN
```

**Expected Response:**
```json
{
  "initiatives": [
    {
      "id": "...",
      "title_ar": "مشروع بناء مسجد العائلة",
      "target_amount": 500000,
      "current_amount": 0,
      "progress_percentage": "0.00",
      "status": "active"
    }
  ]
}
```

---

### Test 3.3: Member Contributes Money

```bash
POST http://localhost:3001/api/initiatives-enhanced/{INITIATIVE_ID}/contribute
Authorization: Bearer MEMBER_TOKEN
Content-Type: application/json

{
  "amount": 1000,
  "payment_method": "bank_transfer"
}
```

**Expected Response:**
```json
{
  "message": "Contribution submitted successfully. Pending approval.",
  "donation": {
    "id": "...",
    "amount": 1000,
    "payment_method": "bank_transfer",
    "created_at": "..."
  }
}
```

---

### Test 3.4: Admin Approves Contribution

```bash
PATCH http://localhost:3001/api/initiatives-enhanced/donations/{DONATION_ID}/approve
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Expected Response:**
```json
{
  "message": "Donation approved successfully",
  "donation": {
    "id": "...",
    "amount": 1000,
    "approved_by": "admin-user-id",
    "approval_date": "2025-10-07T..."
  }
}
```

**What Happened:**
- ✅ Donation approved
- ✅ Initiative `current_amount` auto-updated to 1000
- ✅ Progress bar now shows 0.2% (1000/500000)

---

### Test 3.5: Get Initiative Details (Admin)

```bash
GET http://localhost:3001/api/initiatives-enhanced/{INITIATIVE_ID}/details
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Expected Response:**
```json
{
  "initiative": {
    "id": "...",
    "title_ar": "مشروع بناء مسجد العائلة",
    "target_amount": 500000,
    "current_amount": 1000
  },
  "donations": [
    {
      "id": "...",
      "amount": 1000,
      "donor": {
        "id": "...",
        "full_name_ar": "أحمد محمد الشعيل"
      },
      "approved_by": "...",
      "created_at": "..."
    }
  ],
  "stats": {
    "totalDonations": 1,
    "uniqueDonors": 1,
    "approvedAmount": 1000,
    "progressPercentage": "0.20"
  }
}
```

---

## ✅ STEP 4: VERIFY SUCCESS

### Success Indicators:

**News System:**
- [x] News post created ✅
- [x] Push notification sent to 344 members ✅
- [x] Members can see news feed ✅
- [x] Unread badge counter works ✅
- [x] Statistics showing correctly ✅

**Initiatives System:**
- [x] Initiative created ✅
- [x] Members can see active initiatives ✅
- [x] Members can contribute ✅
- [x] Admin can approve ✅
- [x] Progress bar updates automatically ✅

---

## 🔍 TROUBLESHOOTING

### Issue: 401 Unauthorized
**Fix:** Check your Authorization header has "Bearer " prefix
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Issue: 403 Forbidden
**Fix:** This endpoint requires admin role. Make sure you're logged in as admin.

### Issue: 400 "News not published"
**Fix:** Set `is_published: true` when creating the news.

### Issue: "No members found"
**Fix:** Check that members have `is_active = true` in the database.

### Issue: Network Error
**Fix:** Verify backend server is running:
```bash
curl http://localhost:3001/api/health
```

---

## 📊 PERFORMANCE BENCHMARKS

### Expected Performance (344 Members):

| Test | Expected Time | Status |
|------|---------------|--------|
| Create News | <1s | ✅ Fast |
| Push to 344 Members | 5-7s | ✅ Excellent |
| Get News Feed | <500ms | ✅ Fast |
| Get Unread Count | <300ms | ✅ Fast |
| Create Initiative | <1s | ✅ Fast |
| Contribute Money | <1s | ✅ Fast |

---

## 🎯 ADVANCED TESTS (Optional)

### Test Multiple Notifications
Create 3 news posts and send push for each. Verify badge counter increases correctly.

### Test Read/Unread
1. Get unread count (e.g., 3)
2. Mark one notification as read
3. Get unread count again (should be 2)

### Test Initiative Progress
1. Create initiative with target 10,000
2. Add 5 contributions of 1,000 each
3. Approve all 5
4. Check progress shows 50%

---

## 📝 TESTING CHECKLIST

Use this checklist when testing:

**News System:**
- [ ] Create news with Arabic title
- [ ] Upload image with news
- [ ] Send push notification
- [ ] Verify 344 notifications created
- [ ] Check member can see news
- [ ] Test unread badge counter
- [ ] Mark notification as read
- [ ] Verify badge decreases
- [ ] React to news (like)
- [ ] View news statistics

**Initiatives System:**
- [ ] Create fundraising campaign
- [ ] Set min/max contribution limits
- [ ] Member views active initiatives
- [ ] Member contributes money
- [ ] Verify pending approval status
- [ ] Admin approves contribution
- [ ] Check progress bar updated
- [ ] View contribution history
- [ ] Complete initiative (reach target)
- [ ] Archive completed initiative

---

## 🚀 READY TO TEST!

**Quick Start:**
1. Login as admin
2. Create a test news post
3. Send push notification
4. Watch 344 notifications get created in ~5 seconds!
5. Create a fundraising initiative
6. Have a test member contribute
7. Approve the contribution as admin

**All done!** Your system is working with 344 members! 🎉

---

**For Production:** Replace `http://localhost:3001` with `https://proshael.onrender.com`

**Need Help?** Check the full documentation in:
- `NEWS_INITIATIVES_IMPLEMENTATION_COMPLETE.md`
- `NEWS_SCALABILITY_ANALYSIS.md`
- `News/03_NEWS_API_GUIDE_PERFECT.md`
