# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Al-Shuail Family Management System - A comprehensive platform consisting of:
1. **Admin Dashboard** - Premium, Apple-inspired admin system with member management, financial tracking, and document handling
2. **Member Mobile App** - Mobile-first application for members with payment processing, notifications, and account management
3. **Backend API** - Node.js/Express API with Supabase integration for both admin and mobile clients

Features glassmorphism design, sophisticated animations, full RTL support for Arabic interface, and complete mobile experience.

## Development Commands

### Frontend (alshuail-admin-arabic/)
```bash
# Install dependencies
npm install

# Development server (default port 3002)
PORT=3002 npm start

# Build production (with memory optimization)
npm run build

# Fast production build (no sourcemaps, optimized)
npm run build:fast

# Run tests
npm test

# Lint code
npm run lint
npm run lint:fix
```

### Backend (alshuail-backend/)
```bash
# Install dependencies
npm install

# Development server with auto-reload (port 5001)
npm run dev

# Production server (port 5001)
npm start

# Run tests
npm test
```

## Architecture Overview

### Frontend Architecture
- **React 19.1.1** with TypeScript
- **Tailwind CSS v4** with Craco configuration
- **Component Structure**:
  - `StyledDashboard.tsx` - Main dashboard container with routing
  - Components organized by feature: `/Members`, `/Reports`, `/Documents`, `/Payments`
  - Apple-inspired design system (`styles/apple-design-system.css`)
  - Common components in `/Common` for reusable UI elements

### Backend Architecture
- **Node.js ES Modules** (`"type": "module"` in package.json)
- **Express.js** with structured MVC pattern
- **Supabase** for PostgreSQL database (with RLS enabled)
- **JWT** authentication with refresh tokens
- **Port**: 5001 (updated from 3001)
- **Directory Structure**:
  ```
  src/
  ├── controllers/  # Request handlers
  ├── routes/       # API endpoint definitions
  ├── services/     # Business logic layer
  ├── middleware/   # Auth, validation, error handling
  ├── config/       # Database and app configuration
  └── utils/        # Shared utilities
  ```

## Key API Integration Patterns

### Frontend API Service Pattern
All API calls go through service layers in `src/services/`:
```javascript
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// Always include Authorization header
headers: {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`
}
```

### Backend CORS Configuration
Backend configured for frontend at port 3002:
```javascript
app.use(cors({
  origin: 'http://localhost:3002',
  credentials: true
}));
```

## Critical Implementation Notes

### Arabic RTL Support
- All Arabic UI components must include `dir="rtl"` on containers
- Use `text-right` for text alignment, `ml-*` for spacing (not `mr-*`)
- Icons positioned on right side of inputs
- Hijri date conversion supported via `hijri-converter` package

### Member Management System (Premium Apple-Inspired)

#### Overview
The Members Management section features a premium, enterprise-grade interface with:
- **Main Dashboard** (`EnhancedMembersManagement.jsx`): Glassmorphic stat cards, member table with actions
- **Premium Registration** (`PremiumRegistration.tsx`): 5-step wizard with gradient progress bars
- **Premium Import** (`PremiumImportMembers.jsx`): 4-step import with drag-drop, validation, and preview
- **Premium Export** (`PremiumExportMembers.jsx`): Multi-format export with field selection and filters
- **Navigation**: Tab-based with back buttons on all sub-pages

#### Key Components
```
src/components/Members/
├── EnhancedMembersManagement.jsx    # Main container with tabs
├── PremiumRegistration.tsx          # 5-step registration form
├── PremiumImportMembers.jsx         # Excel/CSV import wizard
├── PremiumExportMembers.jsx         # Export with filters
├── PremiumImportMembers.css         # Import page styles
├── PremiumExportMembers.css         # Export page styles
└── AppleDesignSystem.css            # Shared design system
```

#### Navigation Flow
1. **Dashboard Tab** → Shows members table, stats, search
2. **Import Tab** → Has back button → Returns to Dashboard
3. **Export Tab** → Has back button → Returns to Dashboard
4. **Add Member Button** → Opens modal → Close (X) returns to Dashboard

#### Import/Export Features
- **Excel Import**: Supports .xlsx, .csv with columns: الاسم الكامل, رقم الهاتف, رقم الواتساب, رقم العضوية
- **Registration Flow**: Token-based registration at `/register/:token`
- **Phone Validation**: Saudi format `^(05|5)(5|0|3|6|4|9|1|8|7)([0-9]{7})$`

### Member Mobile App System (Complete Implementation)

#### Overview
A comprehensive mobile application for regular members accessible at `/member` route, featuring a premium glassmorphic design with full Arabic RTL support, notification system, and advanced payment capabilities.

#### Access & Navigation
- **Route**: `/member` (standalone mobile app for regular users)
- **Login**: Phone number + password authentication
- **Bottom Navigation**: Home, Dashboard, Events, Payments, Settings
- **Viewport**: Optimized for 428px mobile width

#### Key Components & Features

##### 1. Main Component Structure
```
src/components/MemberMobile/
├── MemberMobileApp.jsx      # Main container with routing
├── MemberMobileApp.css       # Glassmorphic styles & animations
├── PaymentSystem.jsx         # Payment components & modals
└── Supporting files...
```

##### 2. Home Screen - Enhanced Notification Center
**Notification Types:**
- **Occasions (مناسبات)**: Wedding invitations, births, meetings
- **Initiatives (مبادرات)**: Charity campaigns, community projects
- **Diyas (ديات)**: Blood money cases requiring contributions

**Features:**
- Real-time notification cards with expand/collapse
- RSVP functionality for events
- Color-coded categories (purple/green/amber)
- Unread count badges
- Time-based sorting (newest first)
- Action buttons per notification type

##### 3. Balance & Payment System

**Balance Card Features:**
- **Minimum Balance**: 3000 riyal requirement with visual indicators
- **Color Coding**:
  - Red when below minimum (< 3000 riyal)
  - Green when above minimum (≥ 3000 riyal)
- **Warning Badge**: "رصيد منخفض" displayed when low
- **Quick Actions**: Payment & Account Statement buttons

**Payment Modal System:**
- **Multi-step Process**:
  1. Select payment type (Initiative/Diya/Member Transfer)
  2. Choose recipient or cause
  3. Enter amount (50 riyal minimum, no maximum)
  4. Add optional note
  5. Attach receipt (image upload)
  6. Review and confirm
  7. Success animation

**Account Statement Screen:**
- Complete transaction history
- Debit/Credit display with running balance
- Transaction filtering by type:
  - Payments (مدفوعات)
  - Deposits (إيداعات)
  - Contributions (مساهمات)
  - Diyas (ديات)
- Date range filtering
- Search functionality
- Export capabilities
- Color-coded transactions (green credits/red debits)

##### 4. Dashboard - Personal Statistics
- Current balance with trend indicator
- Yearly contributions total
- Monthly average calculations
- Contribution ranking (#12 of members)
- Family tree information (generation & branch)
- Visual charts for spending patterns

##### 5. Events Management
- Upcoming events with RSVP
- Past events history
- Event types: Weddings, Births, Meetings
- Attendance tracking
- Location & time details
- Attendee counts

##### 6. Profile & Settings
- Personal information management
- Notification preferences
- Language settings (Arabic/English)
- Security settings (password change)
- App version information
- Support contact

#### Mobile-Specific Design Patterns

##### Glassmorphism Effects
```css
.mobile-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(31, 38, 135, 0.15);
}
```

##### Notification Card Animations
```css
@keyframes slideInUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
```

##### Arabic RTL Support
- All text aligned right
- Icons positioned on right side
- Navigation flows right-to-left
- Form inputs with RTL support

#### Implementation Files

##### Core Files Modified/Created:
1. **MemberMobileApp.jsx** (1350+ lines)
   - Complete mobile application logic
   - Navigation routing
   - State management
   - API integration points

2. **MemberMobileApp.css** (2000+ lines)
   - Comprehensive mobile styles
   - Glassmorphic effects
   - Animations & transitions
   - Responsive layouts

3. **PaymentSystem.jsx** (800+ lines)
   - EnhancedBalanceCard component
   - AccountStatementScreen component
   - PaymentModal with multi-step flow
   - Receipt upload functionality

#### Mobile App Data Structures

##### Member Data Model
```javascript
{
  name: 'أحمد محمد الشعيل',
  phone: '0501234567',
  memberId: 'MEM001',
  balance: 1250,
  minimumBalance: 3000,
  currentSubscription: {
    quantity: 3,
    amount: 150,
    status: 'active'
  },
  accountStatement: [...transactions]
}
```

##### Notification Structure
```javascript
{
  id: 'unique_id',
  type: 'occasion_invitation',
  title: 'عنوان الإشعار',
  shortMessage: 'رسالة مختصرة',
  fullMessage: 'رسالة كاملة',
  actionRequired: true,
  actionText: 'نص الإجراء',
  additionalData: {...},
  createdAt: Date,
  isRead: false
}
```

#### API Integration Points

##### Authentication
- `POST /api/auth/member-login` - Phone + password login
- `POST /api/auth/refresh` - Token refresh

##### Member Data
- `GET /api/members/{id}/profile` - Member profile
- `GET /api/members/{id}/balance` - Current balance
- `GET /api/members/{id}/transactions` - Transaction history
- `GET /api/members/{id}/notifications` - Notifications

##### Payments
- `POST /api/payments` - Process payment
- `POST /api/payments/{id}/receipt` - Upload receipt
- `GET /api/payments/initiatives` - Active initiatives
- `GET /api/payments/diyas` - Active diyas

##### Events
- `GET /api/events/upcoming` - Upcoming events
- `POST /api/events/{id}/rsvp` - RSVP response

#### Mobile Testing Checklist
- [ ] Login with phone number works
- [ ] Balance displays with correct color coding
- [ ] Notifications load and expand properly
- [ ] Payment modal all steps functional
- [ ] Account statement filters work
- [ ] Receipt upload successful
- [ ] Arabic text displays correctly
- [ ] Bottom navigation switches views
- [ ] Responsive on various mobile sizes
- [ ] Offline handling graceful

#### Performance Optimizations
- Lazy loading for notification cards
- Debounced search in transactions
- Memoized calculations for statistics
- Optimized re-renders with React.memo
- Image compression for receipts

#### Security Considerations
- JWT stored securely in localStorage
- Minimum balance enforcement
- Payment amount validation
- File type validation for receipts
- XSS protection in user inputs
- HTTPS enforcement in production

### Authentication Flow
1. Login generates JWT + refresh token
2. Tokens stored in localStorage
3. Protected routes check token validity
4. Auto-refresh mechanism on 401 responses

### Database Schema Highlights
- **Members**: Encrypted national_id, both Gregorian and Hijri dates
- **Registration Tokens**: Temporary passwords with expiration
- **Financial Records**: Support for multiple payment types including flexible payments
- All tables use UUID primary keys

## Environment Variables

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5001
PORT=3002
```

### Frontend (.env.production)
```env
GENERATE_SOURCEMAP=false
REACT_APP_API_URL=http://localhost:5001
NODE_OPTIONS=--max-old-space-size=8192
```

### Backend (.env)
```env
PORT=5001
SUPABASE_URL=<required>
SUPABASE_KEY=<required>
JWT_SECRET=<required>
```

## Common Troubleshooting

### Port Conflicts
```bash
# Windows
netstat -ano | findstr :5001
taskkill /PID <PID> /F
```

### Running Both Services
Always start backend first (port 5001), then frontend (port 3002).

### Database Connection
Check Supabase dashboard for connection issues and query logs.

### Build Issues
If frontend build times out:
```bash
# Use optimized build command
npm run build:fast

# Or increase memory manually
set NODE_OPTIONS=--max-old-space-size=8192
npm run build
```

## 🎨 Premium Apple-Inspired Design System

### Design Philosophy
This project uses a premium Apple-inspired design language featuring:
- **Glassmorphism**: Backdrop blur effects (20-40px) with semi-transparent backgrounds
- **Gradient Overlays**: Linear gradients combining blues and purples (#007AFF to #5856D6)
- **Sophisticated Animations**: Cubic-bezier curves for smooth, natural motion
- **Multi-layered Shadows**: Box shadows with varying opacity for depth
- **Premium Typography**: SF Pro Display font family with careful weight hierarchy

### How to Prompt for This Design Style

To achieve this excellent premium design style in future projects, use these prompting patterns:

#### 1. **Initial Design Request**
```
"Create a premium Apple-inspired [component] with glassmorphism effects, gradient backgrounds,
and sophisticated animations. Use backdrop blur, floating animations, and spring transitions.
Make it feel like a $1000+ enterprise application with attention to micro-interactions."
```

#### 2. **Key Design Elements to Request**
- **Glassmorphism Cards**: "Use glass-morphic cards with backdrop-filter: blur(40px) and semi-transparent white backgrounds"
- **Gradient Backgrounds**: "Apply linear gradients from #007AFF to #5856D6 for primary actions"
- **Floating Animations**: "Add subtle floating animations using keyframes with 3s ease-in-out"
- **Progress Indicators**: "Create multi-step progress bars with animated connectors"
- **Hover Effects**: "Include transform: scale(1.02) and elevated shadows on hover"

#### 3. **Component Structure Pattern**
```
"Build a [component] with:
1. Header section with gradient pattern overlay
2. Glass-morphic content cards with hover effects
3. Icon wrappers with gradient backgrounds
4. Statistics badges with glow effects
5. Action buttons with shimmer animations
6. Responsive grid layout with proper spacing"
```

### CSS Design Patterns

#### Glass Card Pattern
```css
.glass-card {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 20px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.glass-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 15px 50px rgba(0, 0, 0, 0.12);
}
```

#### Gradient Button Pattern
```css
.premium-btn {
  background: linear-gradient(135deg, #007AFF 0%, #5856D6 100%);
  padding: 14px 28px;
  border-radius: 12px;
  color: white;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.premium-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.premium-btn:hover::before {
  left: 100%;
}
```

#### Floating Animation Pattern
```css
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.floating-element {
  animation: float 3s ease-in-out infinite;
}
```

### Color Palette
```css
/* Primary Blues */
--apple-blue-primary: #007AFF;
--apple-blue-secondary: #5AC8FA;
--apple-blue-tertiary: #0051D5;

/* Purple Gradient */
--apple-purple-primary: #5856D6;
--apple-purple-secondary: #AF52DE;

/* Success/Warning/Error */
--apple-green: #34C759;
--apple-yellow: #FFCC00;
--apple-red: #FF3B30;

/* Grays */
--apple-gray-900: #1D1D1F;
--apple-gray-600: #86868B;
--apple-gray-300: #C7C7CC;
--apple-gray-100: #F5F5F7;
```

### Component Examples

#### Premium Import/Export Pages
- 4-step wizard with animated progress indicators
- Drag & drop zones with hover effects
- Live data preview tables
- Validation with categorized results (success/warning/error)
- Animated file upload progress

#### Registration Forms
- Multi-step forms with slide transitions
- Field groups with glass backgrounds
- Floating label animations
- Progress bars with gradient fills
- Success animations with confetti effects

### Animation Timing Functions
```css
/* Smooth Apple-style easing */
--ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
--ease-elastic: cubic-bezier(0.175, 0.885, 0.32, 1.275);
```

### Responsive Design Breakpoints
```css
/* Mobile First Approach */
@media (min-width: 640px) { /* Tablet */ }
@media (min-width: 1024px) { /* Desktop */ }
@media (min-width: 1440px) { /* Large Desktop */ }
```

### Typography Hierarchy
```css
.heading-1 { font-size: 36px; font-weight: 700; letter-spacing: -0.5px; }
.heading-2 { font-size: 28px; font-weight: 600; }
.heading-3 { font-size: 20px; font-weight: 600; }
.body-text { font-size: 15px; font-weight: 400; }
.caption { font-size: 13px; font-weight: 500; }
```

### Prompting Tips for Excellence

1. **Be Specific About Effects**:
   - "Add glassmorphism with 40px backdrop blur"
   - "Use floating animation on the main icon"
   - "Apply shimmer effect on buttons"

2. **Request Multi-Step Processes**:
   - "Create a 4-step wizard with progress indicators"
   - "Add step transitions with slide animations"
   - "Include validation at each step"

3. **Ask for Premium Details**:
   - "Add micro-interactions on all interactive elements"
   - "Include loading skeletons during data fetch"
   - "Create success animations with spring effects"

4. **Specify Layout Patterns**:
   - "Use a grid layout with glass cards"
   - "Add sticky navigation with blur background"
   - "Create responsive columns that stack on mobile"

### File Organization for Premium Components
```
src/components/
├── Premium[Feature]/
│   ├── Premium[Feature].jsx    # Main component
│   ├── Premium[Feature].css     # Dedicated styles
│   └── components/              # Sub-components
├── Registration/
│   ├── PremiumRegistration.tsx
│   └── PremiumRegistration.css
└── Members/
    ├── PremiumImportMembers.jsx
    ├── PremiumExportMembers.jsx
    └── EnhancedMembersManagement.jsx
```

### Testing the Premium Design
1. Check glassmorphism effects work in all browsers
2. Verify animations are smooth (60fps)
3. Test hover states on all interactive elements
4. Ensure responsive design works on all devices
5. Validate color contrast for accessibility
6. Test loading and error states

### Common Premium Patterns Used
- **Stat Cards**: Gradient icons with glow effects
- **Progress Bars**: Animated fill with gradient colors
- **Dropzones**: Dashed borders that animate on hover
- **Modal Overlays**: Full-screen with blur background
- **Tab Navigation**: Pills with active indicators
- **Data Tables**: Hover rows with subtle highlights
- **Form Fields**: Floating labels with focus effects
- **Back Buttons**: Gradient background with hover animations
- **Step Wizards**: Multi-step forms with progress indicators
- **Validation States**: Color-coded (green/yellow/red) with icons

## Recent Implementations (Current Session)

### Expense Management System (Latest - Reports Section)
Implemented a complete expense management system under the Reports section with premium Apple-inspired design.

#### Frontend Components Created/Updated:
1. **ExpenseManagement.jsx** - Main expense management component with:
   - Full CRUD operations (Create, Read, Approve, Reject)
   - Permission-based access control
   - Advanced filtering (status, category, date range, search)
   - Glassmorphic UI with gradient effects
   - Arabic RTL support
   - File upload for receipts
   - Approval workflow with rejection reasons

2. **ExpenseManagement.css** - Premium styling with:
   - Glass morphism effects (backdrop-filter: blur(40px))
   - Gradient buttons and status badges
   - Floating animations
   - Responsive grid layout
   - Status-based color coding (pending/approved/rejected)
   - Print-friendly styles

#### Backend Updates:
1. **expensesControllerSimple.js** - Updated with proper mock data:
   - 4 sample expenses with different statuses
   - Arabic and English titles/descriptions
   - Proper field mapping (title_ar, title_en, description_ar, etc.)
   - Hijri date support
   - Rejection reasons for rejected expenses

2. **API Integration**:
   - Frontend configured to use port 5001 (matching backend)
   - All endpoints functional: GET, POST, PUT (approval), DELETE
   - JWT authentication with role-based access

#### Key Features Implemented:
- **8 Expense Categories**: Operations, Activities, Maintenance, Utilities, Supplies, Travel, Marketing, Other
- **3 Status States**: Pending (orange), Approved (green), Rejected (red)
- **Dual Date Display**: Hijri and Gregorian dates
- **Role Permissions**: super_admin, financial_manager, operational_manager
- **Search & Filters**: Real-time search with category and status filters
- **Sorting Options**: By date, amount (ascending/descending)
- **Responsive Design**: Works on mobile, tablet, and desktop

#### Database Schema (expenses table):
- id (UUID)
- title_ar, title_en
- description_ar, description_en
- amount (numeric)
- expense_category
- status (pending/approved/rejected)
- created_by, approved_by
- hijri_date fields
- rejection_reason
- notes

## 📱 Member Mobile Application

### Overview
The Member Mobile App provides a complete mobile experience for Al-Shuail family members to manage their fund participation, make payments, and stay connected with family initiatives.

### Access Point
- **URL**: `/member` (e.g., `http://localhost:3002/member`)
- **Components Location**: `src/components/MemberMobile/`
- **Main Component**: `MemberMobileApp.jsx`

### Key Features

#### 1. Balance Management with 3000 SAR Minimum
```javascript
// Balance Card Color Coding
- Green: Balance ≥ 3000 SAR (sufficient)
- Red: Balance < 3000 SAR (needs top-up)
- Progress bar shows distance to minimum
- Warning badge "رصيد منخفض" when below minimum
```

#### 2. Payment System
```javascript
// Payment Types Supported
- Initiatives (مبادرات) - min 50 SAR
- Diyas (ديات) - flexible amounts
- Subscriptions (الاشتراكات) - monthly/annual

// Pay-on-Behalf Feature
- Member search with auto-complete
- First/Last name intelligent search
- Auto-fills all member details:
  * Full name, Member ID
  * Phone number, Balance
  * Membership status
- Receipt attachment (image/PDF)
- Payment notes and descriptions
```

#### 3. Notification Categories
```javascript
// Three notification types displayed on home screen:
1. Occasions (المناسبات)
   - Weddings, births, graduations
   - RSVP functionality

2. Initiatives (المبادرات)
   - Active fundraising campaigns
   - Progress tracking (target vs collected)
   - Quick contribution buttons

3. Diyas (الديات)
   - Active cases with amounts
   - Urgency indicators
   - Payment progress bars
```

#### 4. Account Statement
```javascript
// Complete transaction history with:
- Hijri and Gregorian dates
- Transaction filtering (type, date, amount)
- Search functionality
- Export options (PDF, Excel)
- Running balance calculation
- Color-coded transactions (green credit, red debit)
```

### Mobile Components Structure
```
src/components/MemberMobile/
├── MemberMobileApp.jsx       # Main app container with routing
├── PaymentSystem.jsx          # Payment modal and account statement
├── MemberMobileApp.css        # Comprehensive mobile styles (1500+ lines)
└── notification-styles.css    # Notification-specific styles
```

### Backend Integration

#### Mobile-Specific API Endpoints
```javascript
// Authentication
POST /api/auth/member-login      # Phone-based login
POST /api/auth/refresh           # Token refresh

// Member Data
GET /api/members/profile         # Member profile data
GET /api/members/balance         # Current balance with minimum
GET /api/members/transactions    # Transaction history
GET /api/members/notifications   # Occasions, initiatives, diyas

// Payment Processing
POST /api/payments/process       # Process payment with receipt
POST /api/payments/validate-member # Validate member for pay-on-behalf
GET /api/payments/receipt/{id}   # Retrieve payment receipt

// Search
GET /api/search/members          # Auto-complete member search
GET /api/search/initiatives      # Active initiatives
GET /api/search/diyas           # Active diyas
```

### Mobile UI/UX Features
- **Glassmorphic Design**: Premium glass effects with backdrop blur
- **Mobile Viewport**: Optimized for 428px width
- **Touch Targets**: Minimum 48px height for buttons
- **Arabic RTL**: Full right-to-left support
- **Responsive Grid**: Adapts to different screen sizes
- **Loading States**: Skeleton loaders and spinners
- **Error Handling**: User-friendly error messages in Arabic

### Testing Mobile Features
```bash
# Access mobile app
http://localhost:3002/member

# Test scenarios:
1. Login with phone number
2. Check balance color (red if < 3000)
3. Open payment modal
4. Search for member to pay on behalf
5. Upload receipt image
6. View account statement
7. Check notifications
```

## Recent Implementations (Current Session)

### 1. Premium Registration Form (`PremiumRegistration.tsx`)
- 5-step wizard: Personal → Address → Family → Professional → Additional
- Auto-save to localStorage
- Field validation with error messages
- Progress bar with step indicators
- Success animation on completion

### 2. Premium Import Members (`PremiumImportMembers.jsx`)
- 4-step process: Upload → Map → Validate → Import
- Drag & drop file upload with animation
- Auto-mapping of Excel columns
- Validation with categorized results
- Batch import with progress tracking
- Template download feature

### 3. Premium Export Members (`PremiumExportMembers.jsx`)
- Multiple export formats (Excel, CSV, JSON, PDF)
- Advanced filtering options
- Field selection by categories
- Live preview of data
- Statistics dashboard
- Animated export process

### 4. Enhanced Members Management (`EnhancedMembersManagement.jsx`)
- Tab navigation system (Overview, Import, Export)
- Glassmorphic statistics cards
- Search with debouncing
- Filters with dropdown menus
- Pagination controls
- Back buttons on all sub-pages
- Modal overlay for registration

### 5. Navigation Improvements
- **Back Buttons**: Added to Import and Export pages
- **Button Design**: Gradient background, arrow icon, hover effects
- **Placement**: Top of page, consistent styling
- **Hover Effect**: Transform translateX with shadow
- **Text**: "العودة إلى لوحة الأعضاء" (Back to Members Dashboard)

## Dependencies Updated (Latest Security Fixes)
```json
{
  "xlsx-populate": "^1.21.0"  // Secure Excel file processing (replaced vulnerable xlsx)
}
```

## Recent Security Improvements (December 2024)

### Database Security
- **Row Level Security (RLS)**: Enabled on all critical tables (users, members, roles, permissions, expenses)
- **Security Policies**: 15+ RLS policies implemented for proper access control
- **Function Security**: Fixed mutable search_path vulnerability in check_user_permission function

### Package Security
- **Removed**: `xlsx` package (had prototype pollution and ReDoS vulnerabilities)
- **Added**: `xlsx-populate` as secure alternative for Excel operations
- **Build Optimization**: Memory allocation increased to prevent build failures

### Code Quality
- **ESLint Errors**: Fixed critical duplicate export in subscriptionManager.js
- **Build Scripts**: Added optimized build commands with memory management
- **Import Updates**: All Excel-related imports updated to use secure library

## Key Design Elements Implemented

### Glassmorphism
```css
background: rgba(255, 255, 255, 0.9);
backdrop-filter: blur(40px);
-webkit-backdrop-filter: blur(40px);
```

### Gradient Buttons
```css
background: linear-gradient(135deg, #007AFF 0%, #5856D6 100%);
```

### Floating Animations
```css
animation: float 3s ease-in-out infinite;
```

### Progress Indicators
```css
background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
animation: shimmer 2s infinite;
```

## Testing Checklist
- [x] Member dashboard loads with stats
- [x] Import wizard processes Excel files
- [x] Export generates downloadable files
- [x] Registration form validates and submits
- [x] Back buttons navigate correctly
- [x] Hover effects work on all buttons
- [x] Responsive design on mobile
- [x] RTL layout for Arabic text

## Future Enhancements
- SMS integration for registration tokens
- Email notifications
- Advanced analytics dashboard
- Bulk operations (edit, delete)
- Member profile photos
- Activity logs
- Role-based permissions

## CI/CD Pipeline Implementation (Latest Update)

### Overview
Complete enterprise-grade CI/CD infrastructure implemented with GitHub Actions, Docker, and multi-environment deployment support for the Al-Shuail Family Management System.

### GitHub Actions Workflows

#### Frontend Pipeline (`.github/workflows/frontend-ci-cd.yml`)
- **Node.js 18** environment with TypeScript support
- **Arabic RTL** text validation and layout testing
- **ESLint** with Arabic text support
- **React Testing** with RTL support and coverage reporting
- **Multi-environment builds**:
  - `develop` branch → Staging (Vercel)
  - `main` branch → Production (Vercel)
- **Performance auditing** with Lighthouse
- **Security scanning** for vulnerabilities
- **Artifact retention** for 7 days

#### Backend Pipeline (`.github/workflows/backend-ci-cd.yml`)
- **Node.js 18** with PostgreSQL 15 testing
- **ES Modules** support configuration
- **Security audit** automation
- **Docker multi-stage builds** for optimization
- **Database migrations** handling
- **Health check** validation
- **Multi-environment deployments**:
  - `develop` branch → Staging (Railway)
  - `main` branch → Production (Railway)
- **Islamic calendar** validation tests
- **RBAC role** validation

### Docker Infrastructure

#### Production Dockerfiles
- **Multi-stage builds** for size optimization (base → production)
- **Alpine Linux** base for security
- **Non-root user** (alshuail:1001) for security
- **Health checks** integrated
- **Arabic text libraries** support

#### Docker Compose Files
- **Development** (`docker-compose.yml`): Hot reload, PostgreSQL, Redis
- **Production** (`docker-compose.prod.yml`): Scaling, monitoring, backups
- **Custom network**: alshuail-network for service isolation

### Environment Configuration

#### Environment Templates
- **Comprehensive `.env.example`** with 200+ configuration options
- **Environment setup script** (`setup-env.js`) for automated configuration
- **Multi-environment support**: development, staging, production
- **Security-first approach**: JWT secrets, encryption keys, API tokens

#### Platform Configurations
- **Vercel** (`vercel.json`): Frontend deployment with Arabic optimization
- **Railway** (`railway.toml`): Backend deployment with auto-scaling
- **Nginx**: RTL content serving and caching

### Enhanced Package.json Scripts

#### Root-level Orchestration
```json
{
  "scripts": {
    "dev": "concurrently npm:dev:*",
    "docker:dev": "docker-compose up",
    "docker:prod": "docker-compose -f docker-compose.prod.yml up",
    "health-check": "node scripts/health-check.js",
    "pre-deploy:production": "npm run lint && npm run test:ci && npm run security-audit",
    "setup:env": "node scripts/setup-env.js",
    "rtl-check": "node scripts/rtl-check.js",
    "hijri-test": "node scripts/hijri-test.js"
  }
}
```

#### CI/CD Specific Scripts
- **Linting**: `lint`, `lint:check`, `lint:fix`
- **Testing**: `test`, `test:coverage`, `test:integration`, `test:ci`
- **Security**: `security-audit`, `security-fix`
- **Docker**: `docker:build`, `docker:run`, `docker:push`
- **Deployment**: `deploy:staging`, `deploy:production`

### Deployment Commands

#### Initial Setup
```bash
# Setup environment variables
npm run setup:env

# Validate configuration
npm run validate:env

# Test locally with Docker
npm run docker:dev
```

#### Deployment Workflow
```bash
# Pre-deployment checks
npm run pre-deploy:production

# Deploy to staging (automatic on push to develop)
git push origin develop

# Deploy to production (automatic on push to main)
git push origin main
```

### GitHub Secrets Required
```
# Database
SUPABASE_URL
SUPABASE_KEY
JWT_SECRET

# Deployment Platforms
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
RAILWAY_TOKEN
DOCKER_USERNAME
DOCKER_TOKEN

# Monitoring (Optional)
SLACK_WEBHOOK_URL
SENTRY_DSN
```

### Quality Assurance Features
- **Automated testing** on every push
- **Code coverage** reporting (minimum 80%)
- **Security vulnerability** scanning
- **Arabic RTL** layout validation
- **Islamic calendar** accuracy testing
- **Performance benchmarking** (< 3s load time)
- **Bundle size** analysis
- **Lighthouse scores** monitoring

### Monitoring & Health Checks
- **Health endpoint**: `/health` with comprehensive system checks
- **Database connectivity** monitoring
- **Arabic font loading** validation
- **Hijri date conversion** accuracy
- **API response time** tracking (< 500ms target)
- **Container health** monitoring with auto-restart

### Zero-Downtime Deployment
- **Rolling updates** for container deployments
- **Database migration** safety checks
- **Automatic rollback** on failure
- **Blue-green deployment** support
- **Feature flags** for gradual rollout

### Arabic & Islamic Features Support
- **RTL validation** in all pipelines
- **Arabic text processing** libraries in Docker
- **Hijri calendar** testing automation
- **Arabic font** optimization in builds
- **Prayer time API** integration ready
- **Islamic date** formatting validation
- to expense pleaee
- to any anything related mobile