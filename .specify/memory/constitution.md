<!--
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           SYNC IMPACT REPORT                                   ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  Version Change: 1.1.1 → 1.2.0 (MINOR - New accessibility principle)          ║
║                                                                                 ║
║  Core Principles:                                                              ║
║    - I. Arabic-First, RTL Excellence (unchanged)                               ║
║    - II. Member Data Security (unchanged)                                      ║
║    - III. API-First Architecture (unchanged)                                   ║
║    - IV. Mobile-First Design (unchanged)                                       ║
║    - V. Financial Accuracy (unchanged)                                         ║
║    - VI. Fund Balance Integrity (unchanged)                                    ║
║    - VII. Elderly-Friendly Accessibility (NEW - KITS sidebar specification)    ║
║                                                                                 ║
║  Changes in v1.2.0:                                                            ║
║    - Added Principle VII: Elderly-Friendly Accessibility                       ║
║    - Added minimum font size requirements (16px minimum)                       ║
║    - Added touch target requirements (44px minimum)                            ║
║    - Added contrast ratio requirements (WCAG AA compliance)                    ║
║    - Added icon-optional navigation guidance                                   ║
║    - Added harmonious color scheme requirements                                ║
║                                                                                 ║
║  Templates Status:                                                              ║
║    - .specify/templates/plan-template.md ✅ Compatible                          ║
║    - .specify/templates/spec-template.md ✅ Compatible                          ║
║    - .specify/templates/tasks-template.md ✅ Compatible                         ║
║                                                                                 ║
║  Follow-up TODOs:                                                              ║
║    - Apply sidebar fix per SIDEBAR_FIX_SPEC.md                                 ║
║    - Audit all admin UI components for accessibility compliance                ║
║    - Consider accessibility testing automation                                 ║
╚═══════════════════════════════════════════════════════════════════════════════╝
-->

# Al-Shuail Family Management System Constitution
# دستور نظام إدارة عائلة شعيل العنزي

## Core Principles | المبادئ الأساسية

### I. Arabic-First, RTL Excellence | اللغة العربية أولاً

Arabic is the PRIMARY language for all user-facing content. English is secondary.

- All UI text MUST have Arabic translation as the default display
- RTL (Right-to-Left) layout MUST be the default for all interfaces
- Arabic error messages MUST be provided for all user-facing errors
- Date displays MUST support Hijri calendar alongside Gregorian
- Phone number validation MUST support Kuwait (+965) and Saudi Arabia (+966) formats
- Family branch names (فخوذ) MUST be displayed in Arabic first

**Rationale**: The Al-Shuail family fund serves Arabic-speaking members primarily in Kuwait and Saudi Arabia. Arabic-first design ensures accessibility and cultural appropriateness.

### II. Member Data Security | أمن بيانات الأعضاء

Family member data is sacred and MUST be protected with the highest standards.

- All API endpoints handling member data MUST require JWT authentication
- Password storage MUST use bcrypt with minimum 12 salt rounds
- OTP codes MUST be stored as hashes only, never plain text
- Phone number enumeration attacks MUST be prevented (OWASP ASVS 2.5.2)
- Audit logs MUST be maintained for all sensitive operations
- Role-based access control MUST be enforced: super_admin > admin > financial_manager > operational_manager > member

**Rationale**: Family member data includes sensitive personal and financial information. Trust is fundamental to family fund participation.

### III. API-First Architecture | بنية API أولاً

Every feature MUST be accessible through the REST API before any UI implementation.

- All business logic MUST reside in the backend API (Express.js)
- Frontend applications (Admin, Mobile PWA, Flutter) MUST only consume API endpoints
- API responses MUST include both `success` boolean and appropriate Arabic `message`
- API versioning MUST be considered for breaking changes
- CORS MUST be properly configured for authorized domains only

**Rationale**: Multiple client applications (web admin, mobile PWA, Flutter native) share the same backend. API-first ensures consistency and maintainability.

### IV. Mobile-First Design | تصميم الجوال أولاً

The mobile experience is the PRIMARY interface for family members.

- Mobile PWA and Flutter app MUST receive feature parity with admin dashboard for member functions
- Touch-friendly UI elements MUST be prioritized (minimum 44px touch targets)
- Offline capability SHOULD be considered for critical read operations
- Push notifications via Firebase MUST be supported for important updates
- WhatsApp OTP MUST be the primary authentication method for members

**Rationale**: Family members interact with the system primarily through their mobile devices. The admin dashboard serves administrators only.

### V. Financial Accuracy | الدقة المالية

Financial calculations MUST be 100% accurate. There is ZERO tolerance for financial errors.

- All monetary values MUST be stored and calculated in the smallest currency unit (fils)
- Payment totals MUST be validated server-side before processing
- Subscription, Diya, and Initiative payment tracking MUST reconcile to the fils
- Financial reports MUST balance (total in = total out + balance)
- All financial transactions MUST be logged in audit_logs table
- **Expense creation MUST validate against available fund balance**
- **Balance calculations MUST be atomic to prevent race conditions**

**Rationale**: The family fund manages real money from 347+ members. Financial trust is non-negotiable.

### VI. Fund Balance Integrity | سلامة رصيد الصندوق

The fund balance MUST always reflect the true financial state of the family fund.

**Core Formula**:
```
Fund Balance = Total Subscriptions - Total Expenses - Internal Diya Payments
```

**Mandatory Requirements**:

1. **Balance Components**
   - Subscriptions: All confirmed member subscription payments (Revenue)
   - Expenses: All approved fund expenditures (Outflow)
   - Internal Diya: Diya payments to fund members (Outflow)
   - External Diya: Diya payments to non-members (NOT deducted from balance)

2. **Balance Validation**
   - Expenses MUST NOT be created if they would cause negative fund balance
   - Balance validation MUST occur at transaction time, not batch
   - Concurrent expense creation MUST be handled with proper locking

3. **Diya Classification**
   - Internal Diya (دية داخلية): Paid to family fund members → DEDUCTED from balance
   - External Diya (دية خارجية): Paid to non-members → NOT deducted from balance
   - Diya classification MUST be explicit at creation time

4. **Bank Reconciliation**
   - Fund balance MUST be reconcilable with bank statements
   - Balance snapshots SHOULD be maintained for audit purposes
   - Discrepancies MUST trigger investigation workflow

5. **Expense Approval Workflow**
   - Expenses MUST follow approval workflow before deduction
   - Only `approved` expenses count against fund balance
   - Pending/rejected expenses MUST NOT affect balance calculations

**Rationale**: The fund balance is the single source of truth for available family funds. Integrity ensures trust and enables proper financial planning for diya obligations and initiatives.

### VII. Elderly-Friendly Accessibility | سهولة الوصول لكبار السن

The admin interface MUST be accessible to elderly users, particularly financial managers.

**Typography Requirements**:

- Minimum font size MUST be 16px for body text
- Section headers MUST use 20px (`text-xl font-bold`) minimum
- Menu items and interactive text MUST use 18px (`text-lg font-semibold`) minimum
- Font weight MUST provide adequate contrast (semibold or bold preferred)

**Color and Contrast Requirements**:

- Background colors MUST use light, harmonious tones (light gradients preferred)
- Text MUST meet WCAG AA contrast ratio (4.5:1 for normal text, 3:1 for large text)
- Active/selected states MUST be clearly distinguishable
- Color scheme MUST be coordinated and non-fatiguing for extended use
- Dark backgrounds that reduce readability MUST be avoided in navigation

**Navigation Design**:

- Icons are OPTIONAL and MAY be removed if they cause visual clutter
- Text-only navigation MUST be supported as a valid design choice
- Menu items MUST have adequate padding (minimum `p-3` / 12px)
- Hover and active states MUST use smooth transitions
- Navigation structure MUST remain simple and predictable

**Recommended Color Scheme (Admin Sidebar)**:

| Element | Color | Tailwind Class |
|---------|-------|----------------|
| Background | Light blue gradient | `from-blue-50 to-blue-100` |
| Section Headers | Dark blue | `text-blue-900` |
| Menu Items | Dark gray | `text-slate-700` |
| Active Item | Blue with white text | `bg-blue-600 text-white` |
| Hover State | Light blue | `bg-blue-100 text-blue-800` |

**Rationale**: The Al-Shuail family fund's financial manager is elderly. Accessibility is not optional—it is a requirement for the system to be usable by its primary administrators. Large fonts, clear contrast, and uncluttered design enable confident navigation and reduce errors.

## Technical Standards | المعايير التقنية

### Backend (Node.js/Express.js)
- ES Modules MUST be used (`import/export`, NOT `require()`)
- File extensions MUST be included in imports (e.g., `./file.js`)
- Environment variables MUST be validated at startup via `src/config/env.js`
- Database queries MUST use parameterized queries to prevent SQL injection
- Rate limiting MUST be applied to authentication endpoints

### Frontend (React 18+)
- TypeScript SHOULD be used for new admin dashboard components
- Tailwind CSS MUST be used for styling
- DaisyUI components MUST be used for admin dashboard
- State management via React Context is preferred over Redux
- RTL support via `dir="rtl"` and Tailwind RTL utilities
- **Accessibility compliance per Principle VII MUST be verified for all admin UI**

### Flutter (Dart)
- Provider or Riverpod MUST be used for state management
- Secure storage MUST be used for tokens and sensitive data
- Arabic localization MUST be the default locale

### Database (PostgreSQL on VPS)
- PostgreSQL 15 hosted on VPS (213.199.62.185)
- Raw SQL queries via pgQueryBuilder
- Foreign key constraints MUST be defined for relational integrity
- Indexes MUST exist on frequently queried columns (phone, member_id)
- Database backups MUST be scheduled regularly
- **Fund balance calculations MUST use database transactions**

## Fund Balance Implementation Standards | معايير تنفيذ رصيد الصندوق

### Database Requirements
- Fund balance MUST be calculated via PostgreSQL view (`vw_fund_balance`) for real-time accuracy
- `expenses` table MUST have `status` column with values: `pending`, `approved`, `rejected`, `paid`
- `diya_cases` table MUST have `diya_type` column with values: `internal`, `external`
- Balance validation MUST use PostgreSQL transactions with proper isolation
- `fund_balance_snapshots` table MUST store point-in-time reconciliation records

### API Endpoints
- `GET /api/fund-balance` - Returns current calculated fund balance
- `GET /api/fund-balance/breakdown` - Returns detailed balance components
- Balance validation MUST be included in `POST /api/expenses` endpoint
- Expense approval MUST recalculate and validate balance

### UI Requirements
- Fund balance MUST be displayed prominently on admin dashboard
- Balance warnings MUST appear when balance is below threshold (3600 SAR minimum)
- Expense creation form MUST show available balance
- Balance history/trend visualization SHOULD be provided
- **All balance displays MUST comply with Principle VII accessibility requirements**

## Development Workflow | سير العمل التطويري

### Git Workflow
- Feature branches MUST be created for all new work
- Branch naming: `feature/description` or `fix/description`
- Commits MUST have descriptive messages in English
- Main branch MUST always be deployable

### Code Review
- All changes to financial calculation logic MUST be reviewed
- Security-sensitive changes MUST include security review notes
- API contract changes MUST be documented
- **Fund balance logic changes require additional validation testing**
- **Accessibility changes MUST be verified against Principle VII**

### Deployment
- Admin dashboard deploys to Cloudflare Pages
- Mobile PWA deploys to VPS via scp
- Backend deploys to VPS via git pull + pm2 restart
- Database migrations MUST be tested on staging first

### Testing
- API endpoints MUST be tested via integration tests
- Authentication flows MUST have security tests
- Financial calculations MUST have unit tests with edge cases
- **Fund balance calculations MUST have reconciliation tests**
- **Concurrent expense creation MUST be tested for race conditions**
- **Accessibility compliance SHOULD be verified for admin UI changes**

## Governance | الحوكمة

This constitution supersedes all other development practices for the Al-Shuail Family Management System.

### Amendment Process
1. Proposed amendments MUST be documented with rationale
2. Amendments affecting security or financial accuracy require careful review
3. All amendments MUST update the constitution version

### Versioning Policy
- **MAJOR**: Principle removal or incompatible governance changes
- **MINOR**: New principle added or material guidance expansion
- **PATCH**: Clarifications, wording fixes, non-semantic refinements

### Compliance
- All pull requests MUST verify compliance with constitution principles
- Violations MUST be documented in Complexity Tracking section of plan.md
- Runtime development guidance available in `CLAUDE.md`

**Version**: 1.2.0 | **Ratified**: 2026-01-14 | **Last Amended**: 2026-01-25
