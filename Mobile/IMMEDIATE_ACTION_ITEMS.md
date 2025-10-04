# IMMEDIATE ACTION ITEMS - AL-SHUAIL MOBILE PWA
## Critical Tasks for Next 48 Hours

**Created**: October 4, 2025
**Priority**: CRITICAL
**Owner**: Development Team

---

## DAY 1 TASKS (TODAY - October 4)

### 🔴 CRITICAL: Security Implementation (4 hours)

#### Task 1: Create Role Check Middleware
**File**: `D:\PROShael\alshuail-backend\middleware\roleCheck.js`
```javascript
import { authenticate } from './auth.js';

// Middleware to ensure only admins can access
export const requireAdmin = async (req, res, next) => {
    try {
        // First authenticate the user
        await authenticate(req, res, () => {
            // Check if user is admin
            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'صلاحيات المسؤول مطلوبة',
                    message_en: 'Admin privileges required',
                    user_role: req.user.role
                });
            }
            next();
        });
    } catch (error) {
        console.error('Admin check error:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في التحقق من الصلاحيات'
        });
    }
};

// Middleware to ensure only members (or admins) can access
export const requireMember = async (req, res, next) => {
    try {
        await authenticate(req, res, () => {
            // Allow both members and admins
            if (!['member', 'admin'].includes(req.user.role)) {
                return res.status(403).json({
                    success: false,
                    message: 'صلاحيات العضو مطلوبة',
                    message_en: 'Member privileges required'
                });
            }
            next();
        });
    } catch (error) {
        console.error('Member check error:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في التحقق من الصلاحيات'
        });
    }
};

// Middleware to ensure members can only access their own data
export const requireOwnData = (req, res, next) => {
    // Skip for admins
    if (req.user.role === 'admin') {
        return next();
    }

    // Check if accessing own data
    const requestedUserId = req.params.userId || req.query.userId || req.body.userId;
    if (requestedUserId && requestedUserId !== req.user.id) {
        return res.status(403).json({
            success: false,
            message: 'لا يمكنك الوصول لبيانات عضو آخر',
            message_en: 'Cannot access other member data'
        });
    }

    // Ensure member routes only return own data
    req.ownDataOnly = true;
    next();
};

export default {
    requireAdmin,
    requireMember,
    requireOwnData
};
```

#### Task 2: Update Server Routes
**File**: Update `D:\PROShael\alshuail-backend\server.js`

Add these lines after importing routes:
```javascript
import { requireAdmin, requireMember } from './middleware/roleCheck.js';

// Apply role-based middleware to routes
// Admin routes - require admin role
app.use('/api/admin', requireAdmin);
app.use('/api/members', requireAdmin); // Members management
app.use('/api/activities', requireAdmin);
app.use('/api/expenses', requireAdmin);
app.use('/api/documents', requireAdmin);

// Member routes - require member role (or admin)
app.use('/api/member', requireMember);
```

#### Task 3: Test Security with Postman
Create test collection with these scenarios:

```http
# Test 1: Member tries to access admin API
POST https://proshael.onrender.com/api/auth/login
{
  "phone": "0501234567",
  "password": "member_password"
}
# Save token as MEMBER_TOKEN

GET https://proshael.onrender.com/api/members
Authorization: Bearer {{MEMBER_TOKEN}}
# Expected: 403 Forbidden

# Test 2: Member accesses own profile
GET https://proshael.onrender.com/api/member/profile
Authorization: Bearer {{MEMBER_TOKEN}}
# Expected: 200 OK with member data

# Test 3: Admin accesses all APIs
POST https://proshael.onrender.com/api/auth/login
{
  "phone": "admin_phone",
  "password": "admin_password"
}
# Save token as ADMIN_TOKEN

GET https://proshael.onrender.com/api/members
Authorization: Bearer {{ADMIN_TOKEN}}
# Expected: 200 OK
```

---

### 🟡 HIGH: Frontend Route Guards (4 hours)

#### Task 1: Create Route Guard Components
**File**: `D:\PROShael\alshuail-admin-arabic\src\components\auth\RouteGuard.jsx`
```javascript
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

// Protected route for admin-only pages
export const AdminRoute = ({ children }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <CircularProgress />
            </Box>
        );
    }

    if (!user) {
        return <Navigate to="/mobile/login" state={{ from: location }} replace />;
    }

    if (user.role !== 'admin') {
        return <Navigate to="/mobile/dashboard" replace />;
    }

    return children;
};

// Protected route for member pages
export const MemberRoute = ({ children }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <CircularProgress />
            </Box>
        );
    }

    if (!user) {
        return <Navigate to="/mobile/login" state={{ from: location }} replace />;
    }

    // Admins can access member routes too
    return children;
};

// Public route that redirects if already logged in
export const PublicRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <CircularProgress />
            </Box>
        );
    }

    if (user) {
        // Redirect based on role
        if (user.role === 'admin') {
            return <Navigate to="/admin/dashboard" replace />;
        } else {
            return <Navigate to="/mobile/dashboard" replace />;
        }
    }

    return children;
};
```

#### Task 2: Update App.jsx Routing
**File**: Update `D:\PROShael\alshuail-admin-arabic\src\App.jsx`
```javascript
import { AdminRoute, MemberRoute, PublicRoute } from './components/auth/RouteGuard';

// In the Routes section:
<Routes>
    {/* Public Routes */}
    <Route path="/mobile/login" element={
        <PublicRoute>
            <MobileLogin />
        </PublicRoute>
    } />

    {/* Member Routes */}
    <Route path="/mobile/dashboard" element={
        <MemberRoute>
            <MobileDashboard />
        </MemberRoute>
    } />
    <Route path="/mobile/profile" element={
        <MemberRoute>
            <MobileProfile />
        </MemberRoute>
    } />
    <Route path="/mobile/payment" element={
        <MemberRoute>
            <MobilePayment />
        </MemberRoute>
    } />
    <Route path="/mobile/payment-history" element={
        <MemberRoute>
            <MobilePaymentHistory />
        </MemberRoute>
    } />
    <Route path="/mobile/notifications" element={
        <MemberRoute>
            <MobileNotifications />
        </MemberRoute>
    } />

    {/* Admin Routes */}
    <Route path="/admin/*" element={
        <AdminRoute>
            {/* Existing admin routes */}
        </AdminRoute>
    } />

    {/* Default Redirect */}
    <Route path="/" element={<Navigate to="/mobile/login" replace />} />
</Routes>
```

---

## DAY 2 TASKS (October 5)

### 🔴 CRITICAL: API Integration Testing (8 hours)

#### Task 1: Test All Member APIs
Create test file: `D:\PROShael\test-member-apis.js`
```javascript
import axios from 'axios';

const API_URL = 'https://proshael.onrender.com/api';
const TEST_PHONE = '0501234567';
const TEST_PASSWORD = 'Test@123';

async function testMemberAPIs() {
    console.log('Starting Member API Tests...\n');

    try {
        // 1. Login
        console.log('1. Testing Login...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            phone: TEST_PHONE,
            password: TEST_PASSWORD
        });
        const token = loginRes.data.token;
        console.log('✅ Login successful');

        // Configure axios with token
        const api = axios.create({
            baseURL: API_URL,
            headers: { 'Authorization': `Bearer ${token}` }
        });

        // 2. Get Profile
        console.log('2. Testing Profile...');
        const profileRes = await api.get('/member/profile');
        console.log('✅ Profile retrieved:', profileRes.data);

        // 3. Get Balance
        console.log('3. Testing Balance...');
        const balanceRes = await api.get('/member/balance');
        console.log('✅ Balance retrieved:', balanceRes.data);

        // 4. Get Payments
        console.log('4. Testing Payment History...');
        const paymentsRes = await api.get('/member/payments');
        console.log('✅ Payments retrieved:', paymentsRes.data.length, 'payments');

        // 5. Get Notifications
        console.log('5. Testing Notifications...');
        const notifRes = await api.get('/member/notifications');
        console.log('✅ Notifications retrieved:', notifRes.data.length, 'notifications');

        // 6. Search Members (for payment on behalf)
        console.log('6. Testing Member Search...');
        const searchRes = await api.get('/member/search?q=أحمد');
        console.log('✅ Search results:', searchRes.data.length, 'members found');

        console.log('\n✅ All Member API tests passed!');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testMemberAPIs();
```

#### Task 2: Fix Any API Issues Found
Based on test results, update controllers as needed.

---

### 🟡 HIGH: Hijri Calendar Implementation (4 hours)

#### Task 1: Install Hijri Library
```bash
cd D:\PROShael\alshuail-admin-arabic
npm install moment-hijri
```

#### Task 2: Create Hijri Utilities
**File**: `D:\PROShael\alshuail-admin-arabic\src\utils\hijriDate.js`
```javascript
import moment from 'moment-hijri';

// Arabic month names
const hijriMonths = [
    'محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر',
    'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
    'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
];

// Convert Gregorian to Hijri
export const toHijri = (gregorianDate) => {
    if (!gregorianDate) return '';
    const m = moment(gregorianDate);
    return m.format('iYYYY/iM/iD');
};

// Get current Hijri date formatted
export const getCurrentHijri = () => {
    const m = moment();
    const day = m.format('iD');
    const month = hijriMonths[parseInt(m.format('iM')) - 1];
    const year = m.format('iYYYY');
    return `${day} ${month} ${year}`;
};

// Format date in both calendars
export const formatBothCalendars = (date) => {
    if (!date) return '';
    const m = moment(date);

    // Hijri
    const hijriDay = m.format('iD');
    const hijriMonth = hijriMonths[parseInt(m.format('iM')) - 1];
    const hijriYear = m.format('iYYYY');

    // Gregorian
    const gregorian = m.format('DD/MM/YYYY');

    return {
        hijri: `${hijriDay} ${hijriMonth} ${hijriYear}`,
        gregorian: gregorian,
        combined: `${hijriDay} ${hijriMonth} ${hijriYear} - ${gregorian}`
    };
};

// Get Hijri date parts
export const getHijriParts = (date) => {
    const m = moment(date || new Date());
    return {
        day: parseInt(m.format('iD')),
        month: parseInt(m.format('iM')),
        monthName: hijriMonths[parseInt(m.format('iM')) - 1],
        year: parseInt(m.format('iYYYY'))
    };
};

// Format relative time in Arabic
export const formatRelativeTime = (date) => {
    const m = moment(date);
    const now = moment();
    const days = now.diff(m, 'days');

    if (days === 0) return 'اليوم';
    if (days === 1) return 'أمس';
    if (days === 2) return 'قبل يومين';
    if (days <= 7) return `قبل ${days} أيام`;
    if (days <= 30) return `قبل ${Math.floor(days / 7)} أسابيع`;
    if (days <= 365) return `قبل ${Math.floor(days / 30)} أشهر`;
    return `قبل ${Math.floor(days / 365)} سنوات`;
};
```

#### Task 3: Update Dashboard to Show Hijri Date
**File**: Update `D:\PROShael\alshuail-admin-arabic\src\pages\mobile\Dashboard.tsx`
```javascript
import { getCurrentHijri } from '../../utils/hijriDate';

// In the component:
const hijriDate = getCurrentHijri();

// In the JSX:
<div className="date-display">
    <span className="hijri-date">{hijriDate}</span>
</div>
```

---

## TESTING CHECKLIST

### Security Testing (Must Pass Today)
- [ ] Member cannot access /api/members endpoint
- [ ] Member cannot access /api/admin/* endpoints
- [ ] Member can only see own profile data
- [ ] Member cannot modify other member's data
- [ ] Admin can access all endpoints
- [ ] JWT token validation working
- [ ] Role is correctly extracted from token
- [ ] Unauthorized requests return 403

### Frontend Testing (Must Pass Today)
- [ ] Login redirects members to /mobile/dashboard
- [ ] Login redirects admins to /admin/dashboard
- [ ] Members cannot navigate to admin pages
- [ ] Route guards show loading state
- [ ] Logout clears session and redirects
- [ ] Back button behavior is correct

### API Testing (Must Pass Tomorrow)
- [ ] All member endpoints return data
- [ ] Receipt upload accepts images
- [ ] Payment submission saves to database
- [ ] Notification filtering works
- [ ] Search returns relevant results
- [ ] Pagination works correctly

---

## CRITICAL FIXES NEEDED

### Issue 1: Missing CORS Headers
**File**: `D:\PROShael\alshuail-backend\server.js`
```javascript
// Ensure CORS is configured for mobile domain
app.use(cors({
    origin: [
        'https://alshuail-admin.pages.dev',
        'http://localhost:3002',
        'http://localhost:3000'
    ],
    credentials: true
}));
```

### Issue 2: JWT Secret Not Set
**File**: `D:\PROShael\alshuail-backend\.env`
```
JWT_SECRET=your-very-secure-secret-key-here-minimum-32-characters
```

### Issue 3: Database Connection Issues
Verify Supabase credentials in `.env`:
```
SUPABASE_URL=https://oneiggrfzagqjbkdinin.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
DATABASE_URL=postgresql://postgres:[password]@db.oneiggrfzagqjbkdinin.supabase.co:5432/postgres
```

---

## DEPLOYMENT VERIFICATION

### Backend Health Check
```bash
curl https://proshael.onrender.com/api/health
# Should return: {"status":"ok","timestamp":"..."}
```

### Frontend Verification
```bash
curl https://alshuail-admin.pages.dev/mobile/login
# Should return HTML page
```

### Database Connectivity
```sql
-- Connect to Supabase and verify member count
SELECT COUNT(*) FROM members;
-- Should return: 299
```

---

## SUPPORT CONTACTS

### Escalation Path
1. **Technical Issues**: Dev Lead (respond within 2 hours)
2. **Security Issues**: Security Lead (respond within 1 hour)
3. **Critical Blockers**: Project Manager (respond immediately)

### Communication Channels
- **Slack**: #alshuail-dev
- **WhatsApp**: Development Group
- **Email**: dev-team@alshuail.com

---

## COMPLETION CRITERIA

### By End of Day 1 (Oct 4)
- [ ] Role-based middleware created and tested
- [ ] Route guards implemented in frontend
- [ ] Security tests passing
- [ ] Hijri calendar utilities created

### By End of Day 2 (Oct 5)
- [ ] All member APIs tested and working
- [ ] Dashboard showing Hijri date
- [ ] Frontend connected to backend
- [ ] Payment flow design finalized

### By End of Weekend (Oct 6)
- [ ] Full security audit complete
- [ ] All critical bugs fixed
- [ ] Ready for Week 2 development
- [ ] Team briefed on next steps

---

**Document Status**: ACTIVE - URGENT ACTION REQUIRED
**Created**: October 4, 2025
**Execute By**: October 5, 2025
**Owner**: Development Team Lead

---