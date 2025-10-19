# AL-SHUAIL MOBILE PWA - MASTER PROJECT PLAN
## Complete Implementation Guide (A to Z)

**Project Manager**: [Name]  
**Start Date**: [Date]  
**Target Completion**: 4 weeks  
**Budget**: [Amount]  
**Status**: Ready to Start

---

## EXECUTIVE SUMMARY

### Project Objective
Develop and deploy a mobile Progressive Web App (PWA) for Al-Shuail Family Management System that allows 299+ family members to:
- View their subscription balance and status
- Make payments with receipt upload
- View payment history
- Access notifications (news, occasions, diyas, initiatives, condolences)
- View their profile and family information

### Critical Success Factors
1. **Security**: Members can ONLY access their own data (not admin features)
2. **Mobile-First**: Optimized for iPhone 11 and similar devices
3. **Hijri Calendar**: All dates display in Hijri with Gregorian secondary
4. **Offline Capability**: Core features work without internet
5. **WhatsApp Integration**: Notifications via WhatsApp Business

### Current Status
- Database: Complete (64 tables, ready for data)
- Backend API: Exists but needs mobile endpoints
- Admin Dashboard: Working but needs role separation
- Mobile Interface: NOT STARTED (this project)

---

## PROJECT PHASES OVERVIEW

| Phase | Duration | Deliverable | Status |
|-------|----------|-------------|--------|
| **Phase 1: Security & Backend** | Week 1 | Role-based access control + Member APIs | Not Started |
| **Phase 2: Mobile Core UI** | Week 2 | Dashboard + Profile + Navigation | Not Started |
| **Phase 3: Payment System** | Week 3 | Payment form + Receipt upload + History | Not Started |
| **Phase 4: Testing & Launch** | Week 4 | QA + Bug fixes + Deployment | Not Started |

---

## PHASE 1: SECURITY & BACKEND (Week 1)

### Objective
Secure the system and build APIs for mobile app

### Timeline: 5 Working Days

#### Day 1-2: Role-Based Access Control
**Duration**: 2 days  
**Assignee**: Backend Developer  
**Priority**: CRITICAL

**Tasks**:
1. Create `backend/middleware/roleCheck.js`
   - Implement `requireAdmin` middleware
   - Implement `requireMember` middleware
   - Test role verification

2. Create `backend/routes/member.js`
   - GET `/api/member/profile` - Get logged-in member's profile
   - GET `/api/member/balance` - Get member's subscription balance
   - GET `/api/member/payments` - Get member's payment history
   - POST `/api/member/payments` - Submit new payment
   - GET `/api/member/search` - Search members (for pay-on-behalf)

3. Update `backend/server.js`
   - Apply `requireAdmin` to all `/api/admin/*` routes
   - Apply `requireMember` to all `/api/member/*` routes
   - Test with Postman

**Deliverables**:
- All admin routes protected
- Member routes return only user's own data
- Postman test collection

**Testing**:
- Member cannot access admin APIs (403 error)
- Member can access own profile (200 OK)
- Admin can access both admin and member routes

---

#### Day 3-4: Frontend Route Guards
**Duration**: 2 days  
**Assignee**: Frontend Developer  
**Priority**: CRITICAL

**Tasks**:
1. Create `frontend/src/utils/RouteGuard.jsx`
   - `<AdminRoute>` component
   - `<MemberRoute>` component
   - Role-based redirects

2. Update `frontend/src/App.jsx`
   - Wrap admin routes with `<AdminRoute>`
   - Create mobile routes with `<MemberRoute>`
   - Add smart redirect logic

3. Update `frontend/src/pages/auth/Login.jsx`
   - Redirect members to `/mobile/dashboard`
   - Redirect admins to `/admin/dashboard`

**Deliverables**:
- Members cannot access `/admin/*` pages
- Login redirects based on role
- Route guards tested

**Testing**:
- Login as member -> redirects to mobile
- Try to access `/admin/dashboard` as member -> blocked
- Login as admin -> access all features

---

#### Day 5: Hijri Calendar Integration
**Duration**: 1 day  
**Assignee**: Full-stack Developer  
**Priority**: HIGH

**Tasks**:
1. Install packages
   - Frontend: `npm install moment-hijri`
   - Backend: `npm install hijri-date`

2. Create `frontend/src/utils/hijriDate.js`
   - `toHijri()` - Convert Gregorian to Hijri
   - `getCurrentHijri()` - Get current Hijri date
   - `formatBothCalendars()` - Format date in both calendars
   - Arabic month names array

3. Create `backend/utils/hijriDate.js`
   - Backend conversion functions
   - Add Hijri dates to API responses

**Deliverables**:
- Hijri utility functions working
- Test conversions accurate
- Ready for UI integration

---

## PHASE 2: MOBILE CORE UI (Week 2)

### Objective
Build main mobile interface and navigation

### Timeline: 5 Working Days

#### Day 1-2: Mobile Dashboard
**Duration**: 2 days  
**Assignee**: Frontend Developer  
**Priority**: HIGH

**Reference**: `mobile-dashboard-updated.html`

**Tasks**:
1. Create `frontend/src/pages/mobile/Dashboard.jsx`
   - Header with Hijri date
   - Balance card with progress bar
   - Quick action buttons (4)
   - Notifications section with filters
   - Collapsible payments list
   - Bottom navigation

2. Create `frontend/src/pages/mobile/Dashboard.css`
   - RTL layout
   - Mobile-responsive design
   - Purple gradient header
   - Smooth animations

3. Integrate with APIs
   - Fetch member profile
   - Fetch current balance
   - Fetch recent payments
   - Fetch notifications

**Deliverables**:
- Dashboard displays real data
- All sections functional
- Responsive on mobile

**Acceptance Criteria**:
- Balance shows correct amount and color (red/green)
- Progress bar animates
- Hijri date displays correctly
- Can filter notifications
- Payments list expands/collapses

---

#### Day 3: Member Profile Page
**Duration**: 1 day  
**Assignee**: Frontend Developer  
**Priority**: MEDIUM

**Tasks**:
1. Create `frontend/src/pages/mobile/Profile.jsx`
   - Display member information
   - Membership number
   - Tribal section (فخذ)
   - Family branch (فرع)
   - Financial status summary
   - ID card download button

2. API Integration
   - GET `/api/member/profile`
   - GET `/api/member/id-card` (PDF generation)

**Deliverables**:
- Profile page complete
- ID card can be downloaded
- All member info displays correctly

---

#### Day 4: Notifications System
**Duration**: 1 day  
**Assignee**: Full-stack Developer  
**Priority**: HIGH

**Tasks**:
1. Backend: Create notifications API
   - GET `/api/member/notifications`
   - POST `/api/member/notifications/:id/read`
   - Filter by type (news, occasions, diya, initiatives, condolences)

2. Frontend: Notification details modal
   - Click notification -> show full details
   - Mark as read functionality
   - Support for images/attachments

**Deliverables**:
- Notifications load from database
- Can filter by type
- Badge shows unread count
- Can mark as read

---

#### Day 5: Navigation & Polish
**Duration**: 1 day  
**Assignee**: Frontend Developer  
**Priority**: MEDIUM

**Tasks**:
1. Bottom navigation component
   - Home (Dashboard)
   - Payment
   - Family Tree (placeholder)
   - Settings (placeholder)

2. Mobile layout optimization
   - Test on iPhone 11 (375x812)
   - Test on Android (various sizes)
   - Fix any layout issues

3. Loading states and error handling
   - Skeleton screens
   - Error messages in Arabic
   - Offline mode indicators

**Deliverables**:
- Navigation works smoothly
- App looks good on all mobile devices
- Loading states implemented

---

## PHASE 3: PAYMENT SYSTEM (Week 3)

### Objective
Complete payment functionality

### Timeline: 5 Working Days

#### Day 1-2: Payment Form
**Duration**: 2 days  
**Assignee**: Frontend Developer  
**Priority**: CRITICAL

**Reference**: `mobile-payment-visual-demo.html`

**Tasks**:
1. Create `frontend/src/pages/mobile/Payment.jsx`
   - Payment mode selector (self/on-behalf)
   - Member search (for on-behalf)
   - Amount input
   - Notes field
   - Submit button

2. Create `frontend/src/pages/mobile/Payment.css`
   - Form styling
   - Validation states
   - Success modal

3. Form validation
   - Amount > 0
   - Member selected (if on-behalf)
   - All required fields filled

**Deliverables**:
- Payment form working
- Can switch between self/behalf modes
- Member search functional
- Form validates before submit

---

#### Day 3: Receipt Upload
**Duration**: 1 day  
**Assignee**: Full-stack Developer  
**Priority**: CRITICAL

**Tasks**:
1. Frontend: Upload component
   - Camera capture button
   - Gallery selection button
   - Image preview
   - File validation (max 5MB, JPG/PNG/PDF)

2. Backend: Receipt upload API
   - POST `/api/receipts/upload`
   - Store in Supabase storage
   - Link to payment record
   - Generate thumbnail

**Deliverables**:
- Can capture photo
- Can select from gallery
- Image previews before upload
- Receipt saved to database

**Technical Notes**:
- Use Supabase Storage for files
- Generate unique filename: `receipt_[payment_id]_[timestamp].jpg`
- Store path in `payments.receipt_url`

---

#### Day 4: Payment History
**Duration**: 1 day  
**Assignee**: Frontend Developer  
**Priority**: HIGH

**Tasks**:
1. Create `frontend/src/pages/mobile/PaymentHistory.jsx`
   - List of all payments
   - Filter by year/month
   - Filter by status (approved/pending/rejected)
   - Click payment -> view details modal

2. Payment details modal
   - Full payment information
   - Receipt image viewer
   - Approved by (if applicable)
   - Payment notes

3. API Integration
   - GET `/api/member/payments?year=2024&month=10`
   - GET `/api/member/payments/:id/receipt`

**Deliverables**:
- Payment history page complete
- Can filter payments
- Receipt images display
- Shows payment status

---

#### Day 5: Payment Testing
**Duration**: 1 day  
**Assignee**: QA Tester  
**Priority**: CRITICAL

**Test Cases**:
1. Self payment flow
   - Enter amount
   - Upload receipt
   - Submit
   - Verify in database

2. Pay-on-behalf flow
   - Search member
   - Select member
   - Enter amount
   - Upload receipt
   - Submit
   - Verify correct beneficiary

3. Edge cases
   - Submit without receipt
   - Submit with 0 amount
   - Submit without selecting member (on-behalf)
   - Large file upload (>5MB)
   - Invalid file type

**Deliverables**:
- All test cases pass
- Bug list for fixes
- Payment system approved

---

## PHASE 4: TESTING & LAUNCH (Week 4)

### Objective
Final testing, bug fixes, and deployment

### Timeline: 5 Working Days

#### Day 1-2: Integration Testing
**Duration**: 2 days  
**Assignee**: QA Tester + Developers  
**Priority**: CRITICAL

**Test Scenarios**:

1. **Complete User Journey**
   - Member logs in
   - Views dashboard
   - Checks balance (red if insufficient)
   - Makes payment
   - Uploads receipt
   - Receives confirmation
   - Views payment in history

2. **Security Testing**
   - Member tries to access admin routes -> blocked
   - Member tries to view other member's data -> blocked
   - Member accesses own data -> success
   - Admin can access everything -> success

3. **Mobile Device Testing**
   - iPhone 11 (375x812) - Primary device
   - iPhone 13 Pro (390x844)
   - Samsung Galaxy S21 (360x800)
   - iPad (768x1024) - Optional

4. **Browser Testing**
   - Safari iOS
   - Chrome Android
   - Firefox Mobile

5. **Network Testing**
   - Slow 3G
   - Offline mode
   - Airplane mode
   - Poor connection

**Deliverables**:
- Test report with results
- List of bugs found
- Priority classification (Critical/High/Medium/Low)

---

#### Day 3: Bug Fixes
**Duration**: 1 day  
**Assignee**: Developers  
**Priority**: CRITICAL

**Process**:
1. Review bug list from testing
2. Fix critical bugs first
3. Fix high priority bugs
4. Medium/low bugs -> backlog (post-launch)

**Common Issues to Watch For**:
- RTL layout issues
- Date formatting errors
- Image upload failures
- API timeout errors
- Mobile keyboard covering inputs
- Progress bar not animating
- Balance color calculation wrong

**Deliverables**:
- All critical bugs fixed
- All high priority bugs fixed
- Updated test report

---

#### Day 4: User Acceptance Testing (UAT)
**Duration**: 1 day  
**Assignee**: Project Manager + Client  
**Priority**: HIGH

**UAT Checklist**:

1. **Dashboard**
   - [ ] Member name displays correctly
   - [ ] Hijri date is accurate
   - [ ] Balance shows correct amount
   - [ ] Balance color correct (red < 3000, green >= 3000)
   - [ ] Progress bar percentage accurate
   - [ ] Quick action buttons work
   - [ ] Notifications load and display
   - [ ] Can filter notifications
   - [ ] Recent payments expand/collapse

2. **Payment**
   - [ ] Can make self payment
   - [ ] Can search members
   - [ ] Can make on-behalf payment
   - [ ] Camera works
   - [ ] Gallery selection works
   - [ ] Receipt preview displays
   - [ ] Payment submits successfully
   - [ ] Success message displays

3. **Profile**
   - [ ] All member info displays
   - [ ] Membership number correct
   - [ ] Can download ID card

4. **Security**
   - [ ] Member cannot access admin
   - [ ] Can only see own data

**Deliverables**:
- UAT sign-off document
- Final change requests
- Go/No-Go decision

---

#### Day 5: Deployment & Launch
**Duration**: 1 day  
**Assignee**: DevOps + Project Manager  
**Priority**: CRITICAL

**Pre-Deployment Checklist**:
- [ ] All tests passed
- [ ] UAT approved
- [ ] Database backup created
- [ ] Production environment ready
- [ ] SSL certificates valid
- [ ] Domain configured
- [ ] Environment variables set
- [ ] Monitoring tools active

**Deployment Steps**:

1. **Backend Deployment** (Render.com)
   ```bash
   # Push to production branch
   git checkout production
   git merge main
   git push origin production
   
   # Verify deployment
   curl https://proshael.onrender.com/health
   ```

2. **Frontend Deployment** (Cloudflare Pages)
   ```bash
   # Build production
   npm run build
   
   # Deploy to Cloudflare
   # Automatic on git push to main
   
   # Verify deployment
   curl https://alshuail-admin.pages.dev
   ```

3. **Database Migration**
   - Run final database scripts
   - Verify data integrity
   - Test on production

**Post-Deployment**:
1. Smoke test in production
   - Login works
   - Dashboard loads
   - Payment can be made
   - Data displays correctly

2. Monitor for 2 hours
   - Check error logs
   - Monitor API response times
   - Watch for user reports

3. Announce launch
   - Send WhatsApp message to members
   - Provide login instructions
   - Share support contact

**Deliverables**:
- Mobile PWA live in production
- All features working
- Monitoring active
- Launch announcement sent

---

## RESOURCE ALLOCATION

### Team Structure

| Role | Name | Allocation | Responsibilities |
|------|------|------------|------------------|
| **Project Manager** | [Name] | 100% | Overall coordination, timeline, reporting |
| **Backend Developer** | [Name] | 100% | APIs, security, database |
| **Frontend Developer** | [Name] | 100% | Mobile UI, React components |
| **Full-stack Developer** | [Name] | 50% | Support both teams |
| **QA Tester** | [Name] | 75% | Testing, bug reporting |
| **DevOps** | [Name] | 25% | Deployment, monitoring |
| **Designer** | [Name] | 25% | UI review, assets |

### Time Allocation by Phase

| Phase | Dev Hours | QA Hours | PM Hours | Total |
|-------|-----------|----------|----------|-------|
| Phase 1 | 32 | 8 | 8 | 48 |
| Phase 2 | 40 | 8 | 8 | 56 |
| Phase 3 | 40 | 16 | 8 | 64 |
| Phase 4 | 16 | 24 | 8 | 48 |
| **Total** | **128** | **56** | **32** | **216** |

---

## RISK MANAGEMENT

### Critical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Security vulnerability in role separation | HIGH | MEDIUM | Thorough security testing, code review |
| Receipt upload failures | HIGH | MEDIUM | Test on multiple devices, fallback to manual |
| Hijri date calculation errors | MEDIUM | LOW | Use tested library (moment-hijri) |
| Mobile browser compatibility issues | MEDIUM | MEDIUM | Test on all target devices |
| Database performance with 299+ members | LOW | LOW | Optimize queries, add indexes |
| Backend API downtime | HIGH | LOW | Use Render.com's monitoring, set up alerts |

### Risk Response Plan

**If Security Issue Found**:
1. Stop deployment immediately
2. Fix security issue
3. Re-test thoroughly
4. Proceed only after sign-off

**If Critical Bug in Production**:
1. Assess impact (how many users affected)
2. Rollback if necessary
3. Fix in emergency patch
4. Deploy hotfix
5. Verify fix in production

---

## COMMUNICATION PLAN

### Daily Standup (15 minutes)
**When**: Every morning 9:00 AM  
**Who**: All team members  
**Format**:
- What I did yesterday
- What I'm doing today
- Any blockers

### Weekly Progress Review (1 hour)
**When**: Every Friday 3:00 PM  
**Who**: PM + Team Leads + Client  
**Agenda**:
- Week achievements
- Next week plan
- Risks and issues
- Budget status

### Status Reports
**Frequency**: Weekly  
**Format**: Email to stakeholders  
**Content**:
- Completed tasks
- In-progress tasks
- Upcoming tasks
- Risks/issues
- Overall status (Green/Yellow/Red)

---

## SUCCESS METRICS

### Technical Metrics
- All test cases pass (100%)
- Page load time < 3 seconds
- API response time < 500ms
- Zero critical security vulnerabilities
- Mobile responsiveness score 95%+

### Business Metrics
- 80% of members login within first week
- 50% of members make payment within first month
- User satisfaction score > 4/5
- Support tickets < 10 per week

### Acceptance Criteria
- [ ] Members can login and view dashboard
- [ ] Balance displays with correct color coding
- [ ] Members can make payments
- [ ] Receipt upload works on mobile
- [ ] Payment history accessible
- [ ] Notifications display correctly
- [ ] Hijri dates accurate
- [ ] Members cannot access admin features
- [ ] System works on iPhone 11
- [ ] No critical bugs in production

---

## POST-LAUNCH PLAN

### Week 1 After Launch
- Monitor closely for issues
- Respond to user feedback
- Fix any critical bugs immediately
- Collect user satisfaction data

### Month 1 After Launch
- Analyze usage patterns
- Identify improvement areas
- Plan Phase 2 features
- Optimize performance

### Future Enhancements (Backlog)
1. Family Tree visualization
2. Document management
3. SMS OTP authentication
4. Push notifications
5. Offline payment queue
6. Advanced analytics
7. Multi-language support (English)

---

## PROJECT DOCUMENTS

### Required Documents
1. ✅ This Master Plan (PROJECT_MASTER_PLAN.md)
2. Technical Specifications (TECHNICAL_SPECS.md)
3. API Documentation (API_DOCUMENTATION.md)
4. Testing Plan (TESTING_PLAN.md)
5. Deployment Guide (DEPLOYMENT_GUIDE.md)
6. User Manual (USER_MANUAL_ARABIC.md)

### Sign-off Required
- [ ] Project plan approved - Client
- [ ] Technical specs approved - Tech Lead
- [ ] Security review passed - Security Team
- [ ] UAT approved - Client
- [ ] Launch approved - Project Manager

---

## CONTACT INFORMATION

### Project Team
- **Project Manager**: [Name] - [Email] - [Phone]
- **Tech Lead**: [Name] - [Email] - [Phone]
- **Client Contact**: [Name] - [Email] - [Phone]

### Escalation Path
1. Team Lead (< 4 hours response)
2. Project Manager (< 8 hours response)
3. Client (< 24 hours response)

### Support Channels
- **Development Issues**: Slack #alshuail-dev
- **Bug Reports**: Jira Project
- **User Support**: WhatsApp Business [Number]

---

## APPENDICES

### A. Technology Stack
- **Frontend**: React 18, React Router, Axios
- **Backend**: Node.js, Express
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Hosting**: Cloudflare Pages (Frontend), Render.com (Backend)
- **Libraries**: moment-hijri, hijri-date

### B. Key URLs
- **Production Frontend**: https://alshuail-admin.pages.dev
- **Production Backend**: https://proshael.onrender.com
- **Database**: oneiggrfzagqjbkdinin.supabase.co
- **Repository**: [Git URL]

### C. Database Info
- **Total Tables**: 64
- **Member Table**: Currently empty (0 rows)
- **Backup**: members_backup_20250928_1039 (299 rows)
- **Database Size**: ~2.5 MB

---

**Document Version**: 1.0  
**Last Updated**: October 3, 2025  
**Next Review**: After Phase 1 Completion  

**Approval Signatures**:
- Project Manager: _________________ Date: _______
- Tech Lead: _________________ Date: _______
- Client: _________________ Date: _______

---

END OF MASTER PROJECT PLAN
