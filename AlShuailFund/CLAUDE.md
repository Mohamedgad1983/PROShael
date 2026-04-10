# CLAUDE.md - Al-Shuail Family Fund iOS App

## Project Overview
**App Name:** صندوق عائلة شعيل العنزي (Al-Shuail Family Fund)
**Bundle ID:** com.alshuail.fund
**Apple Team ID:** BNJQJM8RW8
**App ID:** 6757306315
**Min iOS:** 16.0
**Architecture:** MVVM + Clean Architecture
**UI Framework:** SwiftUI
**Language:** Swift 6

## What This App Does
A family fund management app serving 347+ members across 10 tribal branches in Saudi Arabia and Kuwait. Members pay 50 SAR/month subscription, participate in family initiatives, view family tree, and manage Diya (blood money) cases.

## Backend API
- **Base URL:** `https://api.alshailfund.com`
- **Auth:** JWT Bearer tokens
- **Database:** PostgreSQL on Contabo VPS (213.199.62.185)
- **Framework:** Node.js/Express

### API Endpoints
```
# Authentication
POST   /api/auth/login          # { phone, password } → { token, user }
POST   /api/auth/logout         # Invalidate token
DELETE /api/auth/account        # Delete user account (Apple requirement)
POST   /api/auth/refresh        # Refresh JWT token

# Members
GET    /api/members             # List all members
GET    /api/members/:id         # Get member details
PUT    /api/members/:id         # Update member profile
GET    /api/members/:id/card    # Get member card data

# Subscriptions & Payments
GET    /api/subscriptions       # Get subscription plans
GET    /api/subscriptions/my    # Get my subscription status
POST   /api/payments            # Submit payment
GET    /api/payments/my         # Get my payment history
POST   /api/payments/receipt    # Upload payment receipt

# Activities & Initiatives
GET    /api/activities          # List activities/initiatives
GET    /api/activities/:id      # Activity details
POST   /api/activities/:id/contribute  # Donate to initiative

# Events & Occasions
GET    /api/events              # List events
GET    /api/events/:id          # Event details
POST   /api/events/:id/rsvp    # RSVP to event
GET    /api/occasions           # List occasions

# Family Tree
GET    /api/family/branches     # List 10 branches
GET    /api/family/tree         # Full family tree
GET    /api/family/tree/:id     # Branch tree
POST   /api/family/children     # Add child (members only)
GET    /api/family/relationships # Get relationships

# Diya Cases
GET    /api/diya                # List cases
GET    /api/diya/:id            # Case details

# Notifications
GET    /api/notifications       # List notifications
PUT    /api/notifications/:id/read  # Mark as read
POST   /api/notifications/token # Register FCM token

# News
GET    /api/news                # News & announcements

# Reports
GET    /api/reports/financial   # Financial summary
GET    /api/reports/statement   # My statement
```

## Design System

### Colors
```swift
static let gradientStart = Color(hex: "667eea")  // Purple-blue
static let gradientEnd = Color(hex: "764ba2")     // Deep purple
static let background = Color(hex: "f5f7fa")
static let textPrimary = Color(hex: "333333")
static let textSecondary = Color(hex: "666666")
static let success = Color(hex: "22c55e")
static let warning = Color(hex: "f59e0b")
static let error = Color(hex: "ef4444")
```

### Typography
- Use Cairo font for Arabic text
- Register Cairo-Regular.ttf, Cairo-Medium.ttf, Cairo-SemiBold.ttf, Cairo-Bold.ttf

### RTL Support
- App is **Arabic-first, RTL layout**
- Use `.environment(\.layoutDirection, .rightToLeft)`
- Phone numbers and dates display LTR within RTL context
- Currency: SAR (ر.س) - display as "ر.س 2,500.00"

### Hijri Calendar
- Primary date format: Hijri (Islamic calendar)
- Use `Calendar(identifier: .islamicUmmAlQura)`
- Display format: "1446/05/15"

## Project Structure
```
AlShuailFund/
├── App/
│   ├── AlShuailFundApp.swift
│   └── AppState.swift
├── Core/
│   ├── Network/
│   │   ├── NetworkManager.swift
│   │   ├── APIEndpoint.swift
│   │   ├── APIError.swift
│   │   └── TokenManager.swift
│   ├── Theme/
│   │   ├── AppColors.swift
│   │   └── AppFonts.swift
│   ├── Extensions/
│   │   └── HijriDateExtension.swift
│   └── Utils/
├── Features/
│   ├── Auth/Views|ViewModels|Services
│   ├── Dashboard/Views
│   ├── Subscriptions/Views
│   ├── Initiatives/Views
│   ├── Events/Views
│   ├── FamilyTree/Views
│   ├── Notifications/Views
│   ├── Profile/Views
│   ├── Diya/Views
│   └── Reports/Views
├── Models/
├── Navigation/
└── Resources/Fonts/
```

## Coding Standards
- Use `async/await` for all network calls
- Use `@MainActor` for ViewModels
- Use `@Published` properties in ViewModels
- Prefer `NavigationStack` over `NavigationView`
- iPad support: adaptive layouts, test on both iPhone and iPad
- All UI strings in Arabic

## Critical Apple Review Requirements
1. **NO WhatsApp dependency** - Login with phone + password only
2. **iPad must work perfectly** - All screens responsive on iPad
3. **Account deletion** - Must have working account deletion
4. **Privacy policy** - Must link to privacy policy URL
5. **Arabic metadata** - App Store listing in Arabic

## Database Schema (Key Tables)
- **members**: id(UUID), full_name_ar, full_name_en, phone, email, family_branch_id, national_id, status
- **users**: id(UUID), email, phone, password_hash, role, permissions, is_active
- **subscriptions**: id, member_id, plan_id, start_date, end_date, status
- **payments**: id, payer_id, subscription_id, amount, payment_date, status
- **activities**: id, title_ar, title_en, target_amount, current_amount, status
- **family_branches**: id, branch_name, branch_head_id (10 branches)
- **family_relationships**: member_from, member_to, relationship_type
- **diya_cases**: id, complainant_id, defendant_id, amount_due, status
- **notifications**: id, user_id, title, message, is_read

## 10 Family Branches
1. رشود (largest - 171+ members)
2. فرحان
3. محمد
4. عبدالله
5. فهد
6. سعد
7. ناصر
8. خالد
9. سلطان
10. عبدالعزيز
