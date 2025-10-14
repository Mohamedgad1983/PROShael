# 🧪 COMPREHENSIVE E2E TESTING PLAN
**Date**: 2025-01-12
**Phase**: Phase 3 - Day 2 (Testing Infrastructure)
**Approach**: MCP Playwright + Google DevTools
**Scope**: All 8 Mobile PWA Screens from A to Z

---

## 📋 TESTING OVERVIEW

### Testing Tools
- **MCP Playwright**: E2E browser automation and testing
- **Google Chrome DevTools**: Network, Console, Performance, Application debugging
- **Lighthouse**: Performance, Accessibility, SEO audits
- **Mobile Viewport**: iPhone (375x667), Android (412x915)

### Test Environment
- **Backend URL**: https://proshael.onrender.com (Live Production)
- **Frontend**: Local files (D:\PROShael\Mobile\)
- **Database**: Supabase PostgreSQL (64 tables, 299 members)
- **Authentication**: JWT tokens (7-day expiry)

### Test Data
- **Phone**: +966501234567 (mock mode)
- **OTP**: 123456 (mock mode)
- **Test Member ID**: Will be retrieved from JWT token after login

---

## 🎯 TEST SCENARIOS (A to Z)

### 1️⃣ AUTHENTICATION FLOW ✅
**Path**: `login.html` → `dashboard.html`
**Critical**: YES (blocks all other functionality)

**Test Steps**:
1. **Load Login Page**
   - ✅ Verify page loads without errors
   - ✅ Check RTL layout (Arabic)
   - ✅ Verify Cairo font loaded
   - ✅ Check glassmorphism styles

2. **Phone Number Entry**
   - ✅ Enter phone: 0501234567
   - ✅ Verify prefix: +966
   - ✅ Click "إرسال رمز التحقق" (Send OTP)
   - ✅ Backend call: POST /api/auth/mobile-login

3. **OTP Verification**
   - ✅ Verify OTP step appears
   - ✅ Display mock code: 123456
   - ✅ Enter OTP digits: 1-2-3-4-5-6
   - ✅ Click "تسجيل الدخول" (Login)
   - ✅ Backend call: POST /api/auth/mobile-verify

4. **Token Storage**
   - ✅ Verify JWT token stored in localStorage
   - ✅ Verify member data stored
   - ✅ Check token expiry (7 days)
   - ✅ Redirect to dashboard.html

**Expected Results**:
- No console errors
- Successful API responses (200 status)
- Token format: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- Dashboard loads with member name

**DevTools Checks**:
- Network: Both API calls succeed
- Console: No JavaScript errors
- Application: localStorage contains `auth_token` and `member_data`
- Performance: <2 seconds total login time

---

### 2️⃣ DASHBOARD SCREEN ✅
**Path**: `dashboard.html`
**Critical**: YES (home screen)

**Test Steps**:
1. **Load Dashboard**
   - ✅ Verify authentication check
   - ✅ Display member name from token
   - ✅ Load balance widget
   - ✅ Backend call: GET /api/members/:id

2. **Balance Widget**
   - ✅ Display current balance (SAR format)
   - ✅ Show subscription status
   - ✅ Display last payment date
   - ✅ Color coding: Green (≥3000), Red (<3000)

3. **Quick Actions**
   - ✅ 8 action cards visible
   - ✅ Icons loaded correctly
   - ✅ RTL layout correct
   - ✅ Tap effects work

4. **Upcoming Events**
   - ✅ Backend call: GET /api/occasions
   - ✅ Display next 3 events
   - ✅ Hijri dates correct
   - ✅ RSVP status shown

5. **Notifications**
   - ✅ Backend call: GET /api/notifications
   - ✅ Badge count correct
   - ✅ Show unread count

6. **Navigation**
   - ✅ Bottom nav visible
   - ✅ Active state on "Home"
   - ✅ All 5 nav items work

**Expected Results**:
- Member data displays correctly
- All widgets load successfully
- No API errors
- Smooth animations (60fps)

**DevTools Checks**:
- Network: 3-4 API calls on load
- Console: No errors
- Performance: <1.5 seconds load time
- Memory: <50MB usage

---

### 3️⃣ EVENTS SCREEN ✅
**Path**: `events.html`
**Critical**: YES (core feature)

**Test Steps**:
1. **Load Events List**
   - ✅ Backend call: GET /api/occasions
   - ✅ Display upcoming events
   - ✅ Show past events separately
   - ✅ Filter: All / Upcoming / Past

2. **Event Details**
   - ✅ Tap on event card
   - ✅ Modal/detail view opens
   - ✅ Display full description
   - ✅ Show location, date, time
   - ✅ Display max attendees
   - ✅ Show current RSVP status

3. **RSVP Submission** (NEW ENDPOINT)
   - ✅ Select RSVP status: Confirmed / Pending / Declined
   - ✅ Add optional notes
   - ✅ Backend call: PUT /api/occasions/:id/rsvp
   - ✅ Verify capacity check
   - ✅ Show success message
   - ✅ Update UI immediately

4. **Attendees List** (NEW ENDPOINT)
   - ✅ View attendees button
   - ✅ Backend call: GET /api/occasions/:id/attendees
   - ✅ Display attendee list
   - ✅ Show member photos
   - ✅ Display RSVP status
   - ✅ Show statistics:
     - Total responses
     - Confirmed / Pending / Declined counts
     - Attendance rate percentage
     - Capacity used percentage
     - Spots remaining

5. **Offline Mode**
   - ✅ RSVP while offline
   - ✅ Queue in offline storage
   - ✅ Sync when online

**Expected Results**:
- All events display correctly
- RSVP submission works
- Attendees list shows with stats
- Capacity limits enforced

**DevTools Checks**:
- Network: GET /api/occasions, GET /api/occasions/:id/attendees, PUT /api/occasions/:id/rsvp
- Console: No errors
- Application: Offline queue works

---

### 4️⃣ CRISIS MANAGEMENT SCREEN ✅
**Path**: `crisis.html`
**Critical**: YES (emergency system)

**Test Steps**:
1. **Load Crisis Screen** (NEW ENDPOINT)
   - ✅ Backend call: GET /api/crisis
   - ✅ Check for active crisis
   - ✅ Display crisis history
   - ✅ Show last 20 alerts

2. **Active Crisis Alert**
   - ✅ Display alert banner (if active)
   - ✅ Show severity level (low/medium/high/critical)
   - ✅ Color coding: Red (critical), Orange (high)
   - ✅ Display message
   - ✅ Show created date

3. **Mark Safe** (NEW ENDPOINT)
   - ✅ "I'm Safe" button visible
   - ✅ Tap button
   - ✅ Backend call: POST /api/crisis/safe
   - ✅ JWT authentication required
   - ✅ Prevent duplicate responses
   - ✅ Show success confirmation
   - ✅ Admin notification sent

4. **Emergency Contacts** (NEW ENDPOINT)
   - ✅ Backend call: GET /api/crisis/contacts
   - ✅ Display contact list
   - ✅ Priority sorting (Admin → Board → Emergency)
   - ✅ Show phone numbers
   - ✅ Email addresses
   - ✅ Role labels (Arabic)
   - ✅ Tap to call functionality

5. **Crisis History**
   - ✅ Display past alerts
   - ✅ Show resolution dates
   - ✅ Filter by severity
   - ✅ Tap to view details

**Expected Results**:
- Crisis data loads correctly
- Mark safe works (only once per crisis)
- Emergency contacts display
- Call links work on mobile

**DevTools Checks**:
- Network: GET /api/crisis, POST /api/crisis/safe, GET /api/crisis/contacts
- Console: No errors
- Application: JWT token sent with requests

---

### 5️⃣ PAYMENT SCREEN ✅
**Path**: `payment.html`
**Critical**: YES (revenue critical)

**Test Steps**:
1. **Load Payment Options**
   - ✅ Display 3 payment methods:
     - K-Net (Kuwait mock)
     - Credit/Debit Card (mock)
     - Bank Transfer (real)
   - ✅ Show subscription amount: 100 SAR/month
   - ✅ Display member balance

2. **K-Net Payment (Mock)**
   - ✅ Select K-Net
   - ✅ Enter card number: 0000000000000001
   - ✅ Mock approval
   - ✅ Show success animation
   - ✅ Backend call: POST /api/payments/process

3. **Credit Card Payment (Mock)**
   - ✅ Select Credit Card
   - ✅ Enter card: 4242424242424242
   - ✅ CVV: 123
   - ✅ Expiry: 12/25
   - ✅ Mock approval
   - ✅ Backend call: POST /api/payments/process

4. **Bank Transfer (Real)**
   - ✅ Select Bank Transfer
   - ✅ Display bank details:
     - Bank name
     - Account number
     - IBAN
     - Account holder name
   - ✅ Copy buttons work
   - ✅ Upload receipt option
   - ✅ Backend call: POST /api/payments/bank-transfer

5. **Payment Confirmation**
   - ✅ Show receipt modal
   - ✅ Display transaction details
   - ✅ Update balance
   - ✅ Show success message

**Expected Results**:
- All payment methods work
- Mock payments succeed
- Bank transfer details correct
- Balance updates immediately

**DevTools Checks**:
- Network: POST /api/payments/process, POST /api/payments/bank-transfer
- Console: No errors
- Security: No card data logged

---

### 6️⃣ NOTIFICATIONS SCREEN ✅
**Path**: `notifications.html`
**Critical**: MEDIUM

**Test Steps**:
1. **Load Notifications**
   - ✅ Backend call: GET /api/notifications
   - ✅ Display all notifications
   - ✅ Sort by date (newest first)
   - ✅ Show unread count

2. **Notification Types**
   - ✅ Payment confirmations
   - ✅ Event invitations
   - ✅ Crisis alerts
   - ✅ General announcements
   - ✅ System messages

3. **Mark as Read**
   - ✅ Tap notification
   - ✅ Backend call: PUT /api/notifications/:id/read
   - ✅ Remove unread badge
   - ✅ Update count

4. **Delete Notification**
   - ✅ Swipe to delete
   - ✅ Confirm dialog
   - ✅ Backend call: DELETE /api/notifications/:id

5. **Filter Notifications**
   - ✅ All / Unread / Read
   - ✅ By type dropdown

**Expected Results**:
- All notifications display
- Read/unread status works
- Delete functionality works
- Real-time updates

**DevTools Checks**:
- Network: GET /api/notifications, PUT /api/notifications/:id/read
- Console: No errors

---

### 7️⃣ PROFILE SCREEN ✅
**Path**: `profile.html`
**Critical**: MEDIUM

**Test Steps**:
1. **Load Profile**
   - ✅ Backend call: GET /api/members/:id
   - ✅ Display member data:
     - Full name (Arabic + English)
     - Phone number
     - Email
     - Photo
     - Membership status
     - Join date

2. **Edit Profile**
   - ✅ Tap edit button
   - ✅ Enable form fields
   - ✅ Update email
   - ✅ Update photo (upload)
   - ✅ Backend call: PUT /api/members/:id
   - ✅ Validate inputs
   - ✅ Show success message

3. **Change Password**
   - ✅ Old password field
   - ✅ New password field
   - ✅ Confirm password field
   - ✅ Backend call: PUT /api/members/:id/password
   - ✅ Validation: 8+ chars, complexity

4. **Preferences**
   - ✅ Notification settings
   - ✅ Language toggle (Arabic/English)
   - ✅ Theme (future)

5. **Logout**
   - ✅ Tap logout button
   - ✅ Clear localStorage
   - ✅ Redirect to login.html

**Expected Results**:
- Profile data displays correctly
- Updates save successfully
- Password change works
- Logout clears session

**DevTools Checks**:
- Network: GET /api/members/:id, PUT /api/members/:id
- Application: localStorage cleared on logout

---

### 8️⃣ STATEMENTS SCREEN ✅
**Path**: `statements.html`
**Critical**: MEDIUM

**Test Steps**:
1. **Load Statements**
   - ✅ Backend call: GET /api/statements
   - ✅ Display transaction history
   - ✅ Show balance over time
   - ✅ Filter by date range

2. **Transaction Details**
   - ✅ Payment transactions
   - ✅ Credit/debit entries
   - ✅ Running balance
   - ✅ Date stamps
   - ✅ Description

3. **Export Statements**
   - ✅ Export to PDF button
   - ✅ Backend call: GET /api/statements/export/pdf
   - ✅ Download file
   - ✅ Proper formatting

4. **Filter Options**
   - ✅ Date range picker
   - ✅ Transaction type filter
   - ✅ Apply filters

**Expected Results**:
- All statements display
- Export works (or shows coming soon)
- Filters work correctly
- Balance calculations correct

**DevTools Checks**:
- Network: GET /api/statements
- Console: No errors

---

### 9️⃣ FAMILY TREE SCREEN ✅
**Path**: `family-tree.html`
**Critical**: LOW (informational)

**Test Steps**:
1. **Load Family Tree**
   - ✅ Backend call: GET /api/family/tree
   - ✅ Display family hierarchy
   - ✅ Show tribal sections (8 sections)
   - ✅ Member count: 299

2. **Navigation**
   - ✅ Expand/collapse branches
   - ✅ Zoom in/out
   - ✅ Pan view
   - ✅ Search member

3. **Member Details**
   - ✅ Tap on member node
   - ✅ Show mini profile
   - ✅ Display relationships

4. **Offline Support**
   - ✅ Cache tree data
   - ✅ Work offline

**Expected Results**:
- Tree renders correctly
- All 299 members shown
- Interactions smooth
- Offline mode works

**DevTools Checks**:
- Network: GET /api/family/tree
- Performance: <2 seconds render time

---

## 🔍 CROSS-CUTTING TESTS

### A. AUTHENTICATION & AUTHORIZATION ✅
**Test Cases**:
1. ✅ Protected routes redirect to login if no token
2. ✅ Expired token handled gracefully (7-day expiry)
3. ✅ Refresh token mechanism works
4. ✅ JWT token sent with all API requests
5. ✅ 401/403 errors handled correctly

### B. OFFLINE FUNCTIONALITY ✅
**Test Cases**:
1. ✅ Service worker installed
2. ✅ Static assets cached
3. ✅ API responses cached (stale-while-revalidate)
4. ✅ Offline queue for mutations
5. ✅ Background sync works
6. ✅ Offline indicator shown

### C. PERFORMANCE ✅
**Lighthouse Targets**:
- ✅ Performance: ≥90
- ✅ Accessibility: ≥95
- ✅ Best Practices: ≥90
- ✅ SEO: ≥90
- ✅ PWA: ✅ Installable

**Metrics**:
- ✅ First Contentful Paint: <1.5s
- ✅ Largest Contentful Paint: <2.5s
- ✅ Time to Interactive: <3s
- ✅ Cumulative Layout Shift: <0.1
- ✅ Total Blocking Time: <200ms

### D. ACCESSIBILITY ✅
**WCAG 2.1 AA Compliance**:
1. ✅ Screen reader support (Arabic)
2. ✅ Keyboard navigation
3. ✅ Color contrast ≥4.5:1
4. ✅ Focus indicators visible
5. ✅ ARIA labels correct
6. ✅ Alt text for images
7. ✅ Form labels associated

### E. RESPONSIVE DESIGN ✅
**Viewports**:
- ✅ iPhone SE (375x667)
- ✅ iPhone 12 Pro (390x844)
- ✅ Samsung Galaxy (412x915)
- ✅ iPad (768x1024)

**Test Cases**:
1. ✅ Layout adapts correctly
2. ✅ Text readable (no horizontal scroll)
3. ✅ Touch targets ≥44x44px
4. ✅ Images scale properly
5. ✅ Navigation works on mobile

### F. ARABIC RTL SUPPORT ✅
**Test Cases**:
1. ✅ All text right-aligned
2. ✅ Icons mirrored correctly
3. ✅ Animations flow right-to-left
4. ✅ Forms submit correctly
5. ✅ Date formats (Hijri + Gregorian)
6. ✅ Number formats (Arabic numerals)

### G. ERROR HANDLING ✅
**Test Cases**:
1. ✅ Network errors show user-friendly messages (Arabic)
2. ✅ 404 errors handled gracefully
3. ✅ 500 errors logged and reported
4. ✅ Validation errors shown inline
5. ✅ Retry mechanisms work
6. ✅ Fallback to cached data

### H. SECURITY ✅
**Test Cases**:
1. ✅ No sensitive data in localStorage (only tokens)
2. ✅ HTTPS enforced
3. ✅ JWT tokens expire correctly
4. ✅ XSS prevention (input sanitization)
5. ✅ CSRF tokens where needed
6. ✅ Content Security Policy headers

---

## 📊 TESTING EXECUTION PLAN

### Phase 1: Setup (30 minutes)
- [x] Install MCP Playwright
- [ ] Configure mobile viewports
- [ ] Set up Chrome DevTools recording
- [ ] Create test data in Supabase

### Phase 2: Core Flows (2 hours)
- [ ] Test authentication flow (Scenario 1)
- [ ] Test dashboard screen (Scenario 2)
- [ ] Test events + RSVP + attendees (Scenario 3)
- [ ] Test crisis management (Scenario 4)

### Phase 3: Secondary Flows (2 hours)
- [ ] Test payment flows (Scenario 5)
- [ ] Test notifications (Scenario 6)
- [ ] Test profile (Scenario 7)
- [ ] Test statements (Scenario 8)

### Phase 4: Family Tree (30 minutes)
- [ ] Test family tree (Scenario 9)

### Phase 5: Cross-Cutting (1.5 hours)
- [ ] Test offline functionality
- [ ] Run Lighthouse audits
- [ ] Test accessibility
- [ ] Test responsive design
- [ ] Test Arabic RTL
- [ ] Test error handling
- [ ] Test security

### Phase 6: Documentation (1 hour)
- [ ] Document all issues found
- [ ] Create bug reports
- [ ] Update test coverage report
- [ ] Screenshot critical issues

**Total Estimated Time**: 7-8 hours

---

## 🐛 BUG TRACKING TEMPLATE

### Bug Format
```markdown
**Bug ID**: BUG-001
**Severity**: Critical / High / Medium / Low
**Screen**: [Screen name]
**Description**: [What went wrong]
**Steps to Reproduce**:
1. Step 1
2. Step 2
3. Step 3
**Expected**: [What should happen]
**Actual**: [What actually happened]
**Screenshots**: [Link/embed]
**Console Errors**: [Error messages]
**Network**: [Failed API calls]
**Browser**: Chrome 120, Mobile viewport
**Date Found**: 2025-01-12
```

---

## ✅ SUCCESS CRITERIA

### Must-Have (Blocking Launch)
- [ ] All authentication flows work
- [ ] All API endpoints return data correctly
- [ ] No critical security vulnerabilities
- [ ] Offline mode works
- [ ] Service worker installs correctly
- [ ] All 8 screens load without errors
- [ ] Arabic RTL layout correct

### Should-Have (Fix Before UAT)
- [ ] Lighthouse Performance ≥85
- [ ] Lighthouse Accessibility ≥90
- [ ] All payment methods work
- [ ] Crisis system fully functional
- [ ] Attendees list shows correctly

### Nice-to-Have (Post-Launch)
- [ ] Lighthouse Performance ≥95
- [ ] All animations 60fps
- [ ] <1 second load times
- [ ] Advanced offline features

---

## 📁 TEST ARTIFACTS

### Files to Generate
1. `TEST_RESULTS_2025-01-12.md` - Complete test results
2. `BUG_REPORT_2025-01-12.md` - All bugs found
3. `LIGHTHOUSE_REPORT_*.html` - Performance audits for each screen
4. `SCREENSHOTS/` - Visual evidence of issues
5. `NETWORK_LOGS/` - API call traces
6. `CONSOLE_LOGS/` - JavaScript errors

### Metrics to Capture
- Total tests run
- Passed / Failed / Skipped
- Critical bugs found
- High-priority bugs found
- Average page load time
- Lighthouse scores (all screens)
- API response times
- Offline mode success rate

---

## 🚀 NEXT STEPS AFTER TESTING

1. **Fix Critical Bugs** (Day 3)
   - Address all blocking issues
   - Retest fixed bugs
   - Verify no regressions

2. **Optimize Performance** (Day 3-4)
   - Bundle size reduction
   - Image optimization
   - Code splitting
   - Lazy loading

3. **Frontend-Backend Integration** (Day 4-5)
   - Replace remaining mock data
   - Connect all API endpoints
   - Test end-to-end flows
   - Handle error states

4. **Security Audit** (Week 2)
   - OWASP Top 10 testing
   - Penetration testing
   - JWT token security
   - Input validation

5. **UAT Preparation** (Week 3)
   - Deploy to staging
   - Create UAT test plan
   - Recruit 10-15 family members
   - Prepare feedback forms

---

**Status**: Ready to Execute ✅
**Lead**: Claude Code (Lead Project Manager)
**Estimated Duration**: 7-8 hours
**Target Completion**: Day 2-3 of Phase 3
