# AL-SHUAIL FAMILY FUND SYSTEM - COMPLETE TESTING PROMPT

## 🎯 OBJECTIVE
You are a Senior QA Engineer. Your mission is to perform comprehensive testing of the Al-Shuail Family Fund Management System - both Backend APIs and Frontend pages. Document all findings, bugs, and recommendations.

---

## 📋 SYSTEM OVERVIEW

### Tech Stack:
- **Backend:** Node.js/Express on Contabo VPS
- **Database:** PostgreSQL (migrated from Supabase)
- **Frontend Admin:** React/TypeScript on Cloudflare Pages
- **Mobile PWA:** React on Cloudflare Pages
- **Authentication:** Phone OTP (WhatsApp/SMS)

### URLs:
- **Backend API:** https://api.alshailfund.com
- **Admin Panel:** https://alshailfund.com
- **Mobile PWA:** https://app.alshailfund.com

### Database Info:
- **Total Tables:** 64 tables
- **Total Members:** 347 active members
- **Total Relationships:** 94 foreign keys
- **Diya Cases:** 3 historical cases with 852+ contributors

---

## 🔧 PHASE 1: BACKEND API TESTING

### Step 1: Health Check
```bash
# Test server is running
curl https://api.alshailfund.com/api/health
curl https://api.alshailfund.com/api/status
```

Expected: 200 OK with server status

### Step 2: Test ALL API Endpoints

#### 2.1 Authentication APIs
```
POST /api/auth/send-otp
POST /api/auth/verify-otp
POST /api/auth/refresh-token
POST /api/auth/logout
GET  /api/auth/me
```

**Test Cases:**
- [ ] Send OTP to valid Saudi phone (+966 5xxxxxxxx)
- [ ] Send OTP to valid Kuwait phone (+965 xxxxxxxx)
- [ ] Send OTP to invalid phone format → Expect 400 error
- [ ] Verify with correct OTP → Expect 200 + JWT token
- [ ] Verify with wrong OTP → Expect 401 error
- [ ] Verify with expired OTP → Expect 401 error
- [ ] Refresh token with valid token → Expect new token
- [ ] Refresh token with expired token → Expect 401
- [ ] Get current user profile → Expect user data

#### 2.2 Members APIs
```
GET    /api/members
GET    /api/members/:id
POST   /api/members
PUT    /api/members/:id
DELETE /api/members/:id
GET    /api/members/search?q=
GET    /api/members/by-branch/:branchId
GET    /api/members/statistics
```

**Test Cases:**
- [ ] Get all members (check pagination works)
- [ ] Get single member by valid UUID
- [ ] Get member by invalid ID → Expect 404
- [ ] Create new member with valid data
- [ ] Create member with duplicate phone → Expect 409 conflict
- [ ] Create member with missing required fields → Expect 400
- [ ] Update member information
- [ ] Delete member (verify soft delete)
- [ ] Search members by Arabic name (e.g., "محمد")
- [ ] Search members by English name
- [ ] Search members by phone number
- [ ] Get members by branch ID (فخذ)
- [ ] Get member statistics → Expect counts

#### 2.3 Subscriptions APIs
```
GET    /api/subscriptions
GET    /api/subscriptions/:id
GET    /api/subscriptions/member/:memberId
POST   /api/subscriptions
PUT    /api/subscriptions/:id
GET    /api/subscriptions/pending
GET    /api/subscriptions/overdue
GET    /api/subscriptions/statistics
```

**Test Cases:**
- [ ] Get all subscriptions with pagination
- [ ] Get subscriptions for specific member
- [ ] Create new subscription (50 SAR monthly)
- [ ] Mark subscription as paid
- [ ] Get pending subscriptions list
- [ ] Get overdue subscriptions list
- [ ] Get subscription statistics (total collected, pending amount)

#### 2.4 Payments APIs
```
GET    /api/payments
GET    /api/payments/:id
POST   /api/payments
GET    /api/payments/member/:memberId
GET    /api/payments/date-range?from=&to=
GET    /api/payments/statistics
```

**Test Cases:**
- [ ] Record new payment with valid data
- [ ] Record payment with invalid member ID → Expect 404
- [ ] Get payment history for specific member
- [ ] Get payments by date range (Hijri dates)
- [ ] Get payment statistics
- [ ] Payment with receipt image upload

#### 2.5 Family Tree APIs
```
GET    /api/family-tree
GET    /api/family-tree/:memberId
POST   /api/family-tree/relationship
PUT    /api/family-tree/relationship/:id
DELETE /api/family-tree/relationship/:id
GET    /api/family-tree/branches
GET    /api/family-branches
GET    /api/family-tree/statistics
```

**Test Cases:**
- [ ] Get complete family tree structure
- [ ] Get family tree for specific member (ancestors + descendants)
- [ ] Add parent-child relationship
- [ ] Add spouse relationship
- [ ] Add sibling relationship
- [ ] Update existing relationship
- [ ] Delete relationship
- [ ] Get all branches (الفخوذ العشرة)
- [ ] Get family statistics (generations, members per branch)

#### 2.6 Activities/Initiatives APIs
```
GET    /api/activities
GET    /api/activities/:id
POST   /api/activities
PUT    /api/activities/:id
DELETE /api/activities/:id
GET    /api/activities/active
POST   /api/activities/:id/contribute
GET    /api/activities/:id/contributions
```

**Test Cases:**
- [ ] Get all activities
- [ ] Get active activities only
- [ ] Create new activity with target amount
- [ ] Update activity details
- [ ] Close/archive activity
- [ ] Add contribution to activity
- [ ] Get all contributions for activity
- [ ] Verify contribution total matches current_amount

#### 2.7 Events/Occasions APIs
```
GET    /api/events
GET    /api/events/:id
POST   /api/events
PUT    /api/events/:id
DELETE /api/events/:id
POST   /api/events/:id/attend
GET    /api/events/:id/attendees
GET    /api/events/upcoming
GET    /api/occasions
```

**Test Cases:**
- [ ] Get all events
- [ ] Create new event with date/time/location
- [ ] Update event details
- [ ] Cancel event
- [ ] Register member attendance
- [ ] Get attendees list for event
- [ ] Get upcoming events (sorted by date)
- [ ] Test Hijri date handling

#### 2.8 Diya (Blood Money) APIs
```
GET    /api/diya-cases
GET    /api/diya-cases/:id
POST   /api/diya-cases
PUT    /api/diya-cases/:id
POST   /api/diya-cases/:id/contribute
GET    /api/diya-cases/:id/contributions
GET    /api/diya-cases/statistics
```

**Test Cases:**
- [ ] Get all Diya cases
- [ ] Get single case details
- [ ] Create new Diya case with required amount
- [ ] Add member contribution
- [ ] Update case status (open/collecting/completed/cancelled)
- [ ] Get all contributions for case
- [ ] Get Diya statistics (total cases, total amount collected: 141,000+ SAR)

#### 2.9 Notifications APIs
```
GET    /api/notifications
GET    /api/notifications/unread
POST   /api/notifications
PUT    /api/notifications/:id/read
PUT    /api/notifications/mark-all-read
POST   /api/notifications/send-bulk
```

**Test Cases:**
- [ ] Get user notifications
- [ ] Get unread count
- [ ] Create notification
- [ ] Mark single notification as read
- [ ] Mark all as read
- [ ] Send bulk notification to all members

#### 2.10 Reports APIs
```
GET    /api/reports/financial
GET    /api/reports/members
GET    /api/reports/subscriptions
GET    /api/reports/activities
GET    /api/reports/export/excel
GET    /api/reports/export/pdf
```

**Test Cases:**
- [ ] Generate financial report (income/expenses)
- [ ] Generate members report
- [ ] Generate subscriptions report
- [ ] Export report to Excel format
- [ ] Export report to PDF format
- [ ] Test date range filters

#### 2.11 Settings APIs
```
GET    /api/settings
PUT    /api/settings
GET    /api/settings/app
PUT    /api/settings/app
GET    /api/settings/subscription-plans
```

**Test Cases:**
- [ ] Get all system settings
- [ ] Update settings
- [ ] Get app-specific settings
- [ ] Get subscription plans (50 SAR monthly)

#### 2.12 Audit Log APIs
```
GET    /api/audit-logs
GET    /api/audit-logs/user/:userId
GET    /api/audit-logs/action/:actionType
GET    /api/audit-logs/date-range
```

**Test Cases:**
- [ ] Get all audit logs
- [ ] Filter by user ID
- [ ] Filter by action type (CREATE, UPDATE, DELETE)
- [ ] Filter by date range

---

## 🖥️ PHASE 2: ADMIN PANEL TESTING (https://alshailfund.com)

### Page-by-Page Testing:

#### 2.1 Login Page (/login)
- [ ] Page loads without errors
- [ ] Logo and branding display correctly
- [ ] Phone input field accepts Saudi format (+966 5xxxxxxxx)
- [ ] Phone input field accepts Kuwait format (+965 xxxxxxxx)
- [ ] "Send OTP" button works
- [ ] OTP input appears after sending
- [ ] 6-digit OTP verification works
- [ ] Error messages display in Arabic
- [ ] Successful login redirects to dashboard
- [ ] Remember me functionality (if exists)

#### 2.2 Dashboard Page (/dashboard)
- [ ] Page loads after login
- [ ] Welcome message with user name in Arabic
- [ ] Statistics cards display:
  - [ ] Total members count (347)
  - [ ] Active subscriptions count
  - [ ] Pending payments amount
  - [ ] Total revenue (SAR)
- [ ] Recent activities list loads
- [ ] Recent payments list loads
- [ ] Charts/graphs render correctly
- [ ] Arabic text displays correctly (RTL)
- [ ] Quick action buttons work

#### 2.3 Members Management Page (/members)
- [ ] Members table loads with data
- [ ] Pagination works (10/25/50 per page)
- [ ] Search by Arabic name works (e.g., "الشعيل")
- [ ] Search by phone number works
- [ ] Filter by branch (فخذ) works
- [ ] Filter by status (active/inactive) works
- [ ] "Add New Member" button opens form
- [ ] Add member form validation:
  - [ ] Required fields marked
  - [ ] Phone format validation
  - [ ] National ID validation
- [ ] Edit member opens pre-filled form
- [ ] Delete shows confirmation dialog
- [ ] Soft delete works (member hidden, not removed)
- [ ] View member details modal shows all info
- [ ] Export to Excel button works
- [ ] Bulk actions work (if available)

#### 2.4 Subscriptions Page (/subscriptions)
- [ ] Subscriptions list loads
- [ ] Filter by status:
  - [ ] Paid (مدفوع)
  - [ ] Pending (معلق)
  - [ ] Overdue (متأخر)
- [ ] Filter by year (Hijri: 1445, 1446, etc.)
- [ ] Filter by month (Hijri months)
- [ ] Record payment manually:
  - [ ] Select member
  - [ ] Enter amount (50 SAR)
  - [ ] Upload receipt image
  - [ ] Save payment
- [ ] View payment history for member
- [ ] Send reminder notification button
- [ ] Bulk send reminders
- [ ] Subscription statistics display

#### 2.5 Family Tree Page (/family-tree)
- [ ] Tree visualization loads
- [ ] All 347 members appear in tree
- [ ] 10 branches (فخوذ) visible
- [ ] Zoom in/out controls work
- [ ] Pan/drag to navigate
- [ ] Click member node shows details card
- [ ] Member card shows:
  - [ ] Photo
  - [ ] Name (Arabic)
  - [ ] Membership ID
  - [ ] Branch name
- [ ] Add relationship button
- [ ] Edit relationship
- [ ] Delete relationship (with confirmation)
- [ ] Filter by branch works
- [ ] Search member within tree
- [ ] Legend/key visible

#### 2.6 Activities/Initiatives Page (/activities)
- [ ] Activities list loads
- [ ] Active/closed filter works
- [ ] Create new activity form:
  - [ ] Title (Arabic/English)
  - [ ] Description
  - [ ] Target amount
  - [ ] Start/end dates
  - [ ] Beneficiary info
- [ ] Edit activity works
- [ ] View contributions list
- [ ] Progress bar shows accurate percentage
- [ ] Close activity button
- [ ] Archive old activities

#### 2.7 Events Page (/events)
- [ ] Events list loads
- [ ] Calendar view displays events
- [ ] Create new event form:
  - [ ] Title
  - [ ] Date (Hijri picker)
  - [ ] Time
  - [ ] Location
  - [ ] Description
- [ ] Edit event works
- [ ] View attendees list
- [ ] Mark attendance
- [ ] Cancel event (with notification)

#### 2.8 Diya Cases Page (/diya)
- [ ] Cases list loads
- [ ] Case status badges display correctly
- [ ] Create new case form
- [ ] View case contributions
- [ ] 852+ contributors visible for historical cases
- [ ] Total collected (141,000+ SAR) displays
- [ ] Update case status
- [ ] Close case with documentation

#### 2.9 Reports Page (/reports)
- [ ] Financial report section
- [ ] Members report section
- [ ] Subscriptions report section
- [ ] Date range picker works (Hijri)
- [ ] Generate report button
- [ ] Report preview displays
- [ ] Charts render correctly
- [ ] Export to Excel downloads file
- [ ] Export to PDF downloads file
- [ ] Print report button

#### 2.10 Settings Page (/settings)
- [ ] Settings page loads
- [ ] System settings section:
  - [ ] Subscription amount (50 SAR)
  - [ ] Grace period
  - [ ] Fiscal year start
- [ ] Notification settings:
  - [ ] SMS enabled/disabled
  - [ ] WhatsApp enabled/disabled
  - [ ] Push notifications
- [ ] Save changes works
- [ ] Reset to defaults option

#### 2.11 Users & Roles Page (/users)
- [ ] Users list loads
- [ ] User roles visible:
  - [ ] Super Admin
  - [ ] Admin
  - [ ] Financial Manager
  - [ ] Tree Manager
  - [ ] Events Manager
  - [ ] Member
- [ ] Create new user
- [ ] Assign role to user
- [ ] Edit user permissions
- [ ] Deactivate user
- [ ] Cannot delete super admin

#### 2.12 Audit Log Page (/audit-logs)
- [ ] Audit logs table loads
- [ ] Filter by date range
- [ ] Filter by user
- [ ] Filter by action type
- [ ] Log details expand/modal
- [ ] Export logs option

---

## 📱 PHASE 3: MOBILE PWA TESTING (https://app.alshailfund.com)

### Test on Multiple Devices:
- [ ] Android Chrome
- [ ] Android Firefox
- [ ] iPhone Safari
- [ ] iPhone Chrome
- [ ] iPad Safari

### Screen-by-Screen Testing:

#### 3.1 Splash/Login Screen
- [ ] App loads on mobile
- [ ] Splash screen displays
- [ ] Login form renders
- [ ] Phone input keyboard is numeric
- [ ] OTP auto-fills from SMS/WhatsApp
- [ ] Login successful
- [ ] Biometric login (if implemented)

#### 3.2 Home/Dashboard Screen
- [ ] Member greeting displays in Arabic
- [ ] Balance card shows:
  - [ ] Current balance
  - [ ] Last payment date (Hijri)
  - [ ] Payment status
- [ ] Quick actions grid:
  - [ ] Pay subscription
  - [ ] Events
  - [ ] Family tree
  - [ ] Account statement
- [ ] Pull-to-refresh works
- [ ] Bottom navigation works

#### 3.3 Profile Screen
- [ ] Personal info displays:
  - [ ] Name (Arabic)
  - [ ] Membership ID (SH-XXXX)
  - [ ] Phone number
  - [ ] Branch (فخذ)
  - [ ] Join date (Hijri)
- [ ] Profile photo displays/upload
- [ ] Edit profile button
- [ ] Update phone number
- [ ] Logout button

#### 3.4 Subscriptions Screen
- [ ] Current subscription status
- [ ] Payment history loads
- [ ] Pay button opens payment flow
- [ ] Payment methods:
  - [ ] K-Net (if integrated)
  - [ ] Bank transfer info
- [ ] Receipt download
- [ ] Payment confirmation

#### 3.5 Family Tree Screen
- [ ] Tree loads on mobile
- [ ] Touch gestures work:
  - [ ] Pinch to zoom
  - [ ] Drag to pan
  - [ ] Tap to select
- [ ] Member cards display info
- [ ] Navigate to related members
- [ ] Branch filter works

#### 3.6 Activities Screen
- [ ] Active activities list
- [ ] Activity card shows:
  - [ ] Title
  - [ ] Progress
  - [ ] Target amount
  - [ ] Deadline
- [ ] Contribute button
- [ ] Contribution form
- [ ] Success confirmation

#### 3.7 Events Screen
- [ ] Upcoming events list
- [ ] Event card shows:
  - [ ] Title
  - [ ] Date (Hijri)
  - [ ] Location
- [ ] RSVP button works
- [ ] Add to calendar option
- [ ] View event details

#### 3.8 Notifications Screen
- [ ] Notifications list loads
- [ ] Unread badge count accurate
- [ ] Tap marks as read
- [ ] Pull-to-refresh
- [ ] Notification types:
  - [ ] Payment reminders
  - [ ] Event announcements
  - [ ] New activities
  - [ ] System messages

#### 3.9 Settings Screen
- [ ] Language switch (Arabic/English)
- [ ] Notification preferences toggle
- [ ] Theme (light/dark if available)
- [ ] About app section
- [ ] Contact support
- [ ] Logout

#### 3.10 PWA Features
- [ ] Add to Home Screen works
- [ ] App icon correct
- [ ] Splash screen on launch
- [ ] Offline mode handling
- [ ] Push notifications work

---

## 🔍 PHASE 4: CROSS-CUTTING CONCERNS

### 4.1 Arabic Language Support
- [ ] All UI text in Arabic
- [ ] RTL layout correct throughout
- [ ] Arabic fonts render properly (Cairo)
- [ ] Arabic search/filter works
- [ ] Arabic input validation
- [ ] Arabic error messages
- [ ] Arabic date format (Hijri)

### 4.2 Hijri Calendar
- [ ] Dates display in Hijri format
- [ ] Date picker shows Hijri months:
  - [ ] محرم، صفر، ربيع الأول، etc.
- [ ] Date conversion accurate
- [ ] Filter by Hijri year works
- [ ] Member ages calculate correctly

### 4.3 Responsive Design
Test at these breakpoints:
- [ ] Desktop: 1920x1080
- [ ] Desktop: 1366x768
- [ ] Tablet: 768x1024
- [ ] Mobile: 375x667
- [ ] Mobile: 414x896

### 4.4 Performance Testing
- [ ] Initial page load < 3 seconds
- [ ] API response time < 500ms
- [ ] Large list (347 members) loads smoothly
- [ ] Family tree renders without lag
- [ ] No memory leaks on navigation
- [ ] Images lazy load
- [ ] Lighthouse score > 70

### 4.5 Security Testing
- [ ] JWT tokens stored securely
- [ ] Token refresh works
- [ ] Protected routes redirect to login
- [ ] Role-based access enforced:
  - [ ] Member can't access admin pages
  - [ ] Financial manager has limited access
- [ ] API returns 401 for unauthorized
- [ ] API returns 403 for forbidden
- [ ] SQL injection prevented
- [ ] XSS prevented
- [ ] HTTPS enforced
- [ ] CORS configured correctly

### 4.6 Error Handling
- [ ] Network error shows friendly message
- [ ] API error shows Arabic message
- [ ] 404 page exists and styled
- [ ] 500 error handled gracefully
- [ ] Session expiry redirects to login
- [ ] Form validation errors clear
- [ ] Loading states shown

---

## 📝 PHASE 5: GENERATE FINAL REPORT

### Create a comprehensive markdown report:

```markdown
# AL-SHUAIL SYSTEM TEST REPORT

## Executive Summary
- Date: [DATE]
- Tester: Claude Code
- Environment: Production
- Total Tests: [COUNT]
- Passed: [COUNT]
- Failed: [COUNT]
- Pass Rate: [PERCENTAGE]%

## Critical Issues (Must Fix)
1. [Issue description]
   - Severity: Critical
   - Location: [API/Page]
   - Steps to reproduce
   - Expected behavior
   - Actual behavior

## High Priority Issues
...

## Medium Priority Issues
...

## Low Priority Issues
...

## API Test Results Summary
| Endpoint Category | Total | Passed | Failed |
|-------------------|-------|--------|--------|
| Authentication    | X     | X      | X      |
| Members           | X     | X      | X      |
| ...               |       |        |        |

## Frontend Test Results Summary
| Page             | Status | Issues |
|------------------|--------|--------|
| Login            | ✅/❌  | X      |
| Dashboard        | ✅/❌  | X      |
| ...              |        |        |

## Mobile Test Results Summary
| Screen           | Status | Issues |
|------------------|--------|--------|
| Login            | ✅/❌  | X      |
| Home             | ✅/❌  | X      |
| ...              |        |        |

## Performance Metrics
- Average API Response: Xms
- Page Load Time: Xs
- Lighthouse Score: X

## Security Assessment
- Authentication: ✅/❌
- Authorization: ✅/❌
- Data Protection: ✅/❌

## Recommendations
1. [Recommendation]
2. [Recommendation]
3. [Recommendation]

## Next Steps
1. Fix critical issues immediately
2. Address high priority issues within 1 week
3. Plan medium priority fixes for next sprint
```

---

## 🚀 START TESTING NOW

1. Begin with **Phase 1: API Testing**
2. Use curl, Postman, or code to test each endpoint
3. Document every response
4. Note any errors or unexpected behavior
5. Move to **Phase 2** when API testing complete
6. Test each admin page systematically
7. Complete **Phase 3** mobile testing
8. Run **Phase 4** cross-cutting checks
9. Generate final report in **Phase 5**

**Important Notes:**
- Take screenshots of any bugs
- Record response times
- Note exact error messages
- Test both success and failure cases
- Test edge cases (empty data, special characters)
- Verify Arabic text throughout

Good luck with testing! 🎯
