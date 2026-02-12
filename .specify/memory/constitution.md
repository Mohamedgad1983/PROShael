<!--
+=====================================================================+
|                       SYNC IMPACT REPORT                            |
+=====================================================================+
|  Version Change: 1.2.0 -> 2.0.0 (MAJOR)                           |
|                                                                     |
|  Bump Rationale: Fundamental technology stack change -              |
|    Supabase removed entirely, database access pattern               |
|    incompatibly redefined from Supabase client/pgQueryBuilder       |
|    to pg.Pool only. This invalidates all prior database guidance.   |
|                                                                     |
|  Core Principles:                                                   |
|    - I. Arabic-First, RTL Excellence (enhanced: Cairo font,         |
|         Hijri primary calendar, currency SAR)                       |
|    - II. Member Data Security (enhanced: no hardcoded creds,        |
|         DB password in .env only, sanitize inputs)                  |
|    - III. API-First Architecture (enhanced: consistent JSON         |
|         format, no console.log, Winston logger)                     |
|    - IV. Mobile-First Design (unchanged)                            |
|    - V. Financial Accuracy (unchanged)                              |
|    - VI. Fund Balance Integrity (unchanged)                         |
|    - VII. Elderly-Friendly Accessibility (unchanged)                |
|                                                                     |
|  Added Sections:                                                    |
|    - Technology Stack (NON-NEGOTIABLE) - complete rewrite           |
|    - CRITICAL ARCHITECTURE CHANGE: Database Migration               |
|    - Database Access Pattern (pg.Pool, parameterized SQL)           |
|    - File Organization (no duplicates, no backups in repo)          |
|    - File Storage (replacing Supabase Storage)                      |
|    - Never Break Production (governance mandate)                    |
|                                                                     |
|  Removed Sections:                                                  |
|    - All Supabase references removed                                |
|    - pgQueryBuilder references removed                              |
|    - "PostgreSQL 15 hosted on VPS via pgQueryBuilder" removed       |
|                                                                     |
|  Modified Sections:                                                 |
|    - Technical Standards > Database: rewritten for pg.Pool          |
|    - Technical Standards > Backend: added logger/quality rules      |
|    - Development Workflow > Deployment: unchanged                   |
|                                                                     |
|  Templates Status:                                                  |
|    - .specify/templates/plan-template.md       -> compatible        |
|    - .specify/templates/spec-template.md       -> compatible        |
|    - .specify/templates/tasks-template.md      -> compatible        |
|    - .specify/templates/checklist-template.md  -> compatible        |
|    - .specify/templates/agent-file-template.md -> compatible        |
|                                                                     |
|  Follow-up TODOs:                                                   |
|    - Execute Phase 0: Supabase to PostgreSQL migration              |
|    - Execute Phases 1-6: Codebase cleanup per MASTER_PROMPT         |
|    - Update CLAUDE.md Database section after migration              |
|    - Remove Supabase env vars from .env after verification          |
+=====================================================================+
-->

# Al-Shuail Family Management System Constitution
# دستور نظام إدارة عائلة شعيل العنزي

## Technology Stack (NON-NEGOTIABLE)

| Component | Technology | Host |
|-----------|------------|------|
| Database | PostgreSQL (self-hosted via `pg`) | Contabo VPS |
| Backend | Node.js + Express.js (ES Modules) | Contabo VPS (api.alshailfund.com) |
| Admin Dashboard | React 18 + TypeScript + Tailwind CSS | Cloudflare Pages (alshailfund.com) |
| Mobile PWA | React + Vite | Cloudflare Pages (app.alshailfund.com) |
| Flutter App | Dart/Flutter | Google Play / App Store |
| Auth | WhatsApp OTP via Ultramsg API + Custom JWT | Backend |
| Font | Cairo (Google Fonts) for all Arabic text | All clients |
| File Storage | Local disk on VPS (`/var/www/uploads/alshuail/`) | Contabo VPS |

**Supabase is PROHIBITED.** No Supabase JS client, no Supabase Storage,
no Supabase Auth, no `@supabase/supabase-js` dependency. Zero references
MUST remain in the codebase after migration.

## CRITICAL ARCHITECTURE CHANGE: Database Migration

### FROM: Supabase hosted PostgreSQL
### TO: Self-hosted PostgreSQL on Contabo VPS

**Migration Rules (all mandatory):**

1. Remove ALL `@supabase/supabase-js` usage from the backend
2. Remove ALL `supabase.from('table').select()` patterns
3. Use ONLY direct PostgreSQL via `pg` (node-postgres) with connection pool
4. Create a single database service (`services/database.js`) using `pg.Pool`
5. All queries MUST use parameterized SQL to prevent SQL injection
6. Connection string from `.env`: `DATABASE_URL=postgresql://user:pass@localhost:5432/alshuail`
7. Remove Supabase config files: `config/supabase.js`, `config/database.js`
8. Remove `@supabase/supabase-js` from `package.json`
9. Replace Supabase Storage with local file storage on VPS
10. Replace Supabase Auth with custom JWT auth (already partially done)
11. Remove ALL `pgQueryBuilder` usage; use same `query()` from `services/database.js`

## Core Principles | المبادئ الأساسية

### I. Arabic-First, RTL Excellence | اللغة العربية أولاً

Arabic is the PRIMARY language for all user-facing content.
English is secondary.

- All UI text MUST have Arabic translation as the default display
- RTL (Right-to-Left) layout MUST be the default for all interfaces
- Arabic error messages MUST be provided for all user-facing errors
- Hijri calendar dates are PRIMARY and MUST display alongside Gregorian
- Phone number validation MUST support Kuwait (+965) and Saudi (+966)
- Family branch names (فخوذ) MUST be displayed in Arabic first
- Currency is SAR (Saudi Riyal) with 50 SAR monthly subscription
- All user-facing strings MUST be bilingual (Arabic + English)
- Cairo (Google Fonts) MUST be used for all Arabic text rendering

**Rationale**: The Al-Shuail family fund serves 347+ Arabic-speaking
members in Kuwait and Saudi Arabia. Arabic-first design ensures
accessibility and cultural appropriateness.

### II. Member Data Security | أمن بيانات الأعضاء

Family member data is sacred and MUST be protected with the
highest standards.

- All API endpoints handling member data MUST require JWT authentication
- Password storage MUST use bcrypt with minimum 12 salt rounds
- OTP codes MUST be stored as hashes only, never plain text
- Phone number enumeration attacks MUST be prevented (OWASP ASVS 2.5.2)
- Audit logs MUST be maintained for all sensitive operations
- RBAC MUST be enforced: super_admin > admin > financial_manager >
  operational_manager > member
- No hardcoded credentials or API keys in source code
- Database password MUST be in `.env` only, never in code
- All user inputs MUST be sanitized before processing
- Rate limiting MUST be applied to authentication endpoints
- No test/debug endpoints MUST be mounted in production `server.js`

**Rationale**: Family member data includes sensitive personal and
financial information. Trust is fundamental to fund participation.

### III. API-First Architecture | بنية API أولاً

Every feature MUST be accessible through the REST API before any
UI implementation.

- All business logic MUST reside in the backend API (Express.js)
- Frontend apps (Admin, Mobile PWA, Flutter) MUST only consume API
  endpoints and MUST NEVER access the database directly
- API responses MUST follow consistent JSON format:
  `{ success: boolean, data: any, message: string }`
- API versioning MUST be considered for breaking changes
- CORS MUST be configured for authorized domains only
- No `console.log` in production code; use Winston logger exclusively
- Error handling MUST exist on every route with no unhandled rejections

**Rationale**: Multiple client applications share the same backend.
API-first ensures consistency and maintainability.

### IV. Mobile-First Design | تصميم الجوال أولاً

The mobile experience is the PRIMARY interface for family members.

- Mobile PWA and Flutter app MUST receive feature parity with admin
  dashboard for member functions
- Touch-friendly UI elements MUST be prioritized (minimum 44px targets)
- Offline capability SHOULD be considered for critical read operations
- Push notifications via Firebase MUST be supported for important updates
- WhatsApp OTP MUST be the primary authentication method for members

**Rationale**: Family members interact with the system primarily
through mobile devices. The admin dashboard serves administrators only.

### V. Financial Accuracy | الدقة المالية

Financial calculations MUST be 100% accurate. There is ZERO tolerance
for financial errors.

- All monetary values MUST be stored and calculated in smallest unit (fils)
- Payment totals MUST be validated server-side before processing
- Subscription, Diya, and Initiative tracking MUST reconcile to the fils
- Financial reports MUST balance (total in = total out + balance)
- All financial transactions MUST be logged in audit_logs table
- Expense creation MUST validate against available fund balance
- Balance calculations MUST be atomic to prevent race conditions

**Rationale**: The family fund manages real money from 347+ members.
Financial trust is non-negotiable.

### VI. Fund Balance Integrity | سلامة رصيد الصندوق

The fund balance MUST always reflect the true financial state.

**Core Formula**:
```
Fund Balance = Total Subscriptions - Total Expenses - Internal Diya
```

**Mandatory Requirements**:

1. **Balance Components**
   - Subscriptions: All confirmed member subscription payments (Revenue)
   - Expenses: All approved fund expenditures (Outflow)
   - Internal Diya: Payments to fund members (Outflow)
   - External Diya: Payments to non-members (NOT deducted from balance)

2. **Balance Validation**
   - Expenses MUST NOT be created if they would cause negative balance
   - Balance validation MUST occur at transaction time, not batch
   - Concurrent expense creation MUST be handled with proper locking

3. **Diya Classification**
   - Internal (دية داخلية): Paid to members -> DEDUCTED from balance
   - External (دية خارجية): Paid to non-members -> NOT deducted
   - Classification MUST be explicit at creation time

4. **Bank Reconciliation**
   - Fund balance MUST be reconcilable with bank statements
   - Balance snapshots SHOULD be maintained for audit purposes
   - Discrepancies MUST trigger investigation workflow

5. **Expense Approval Workflow**
   - Expenses MUST follow approval workflow before deduction
   - Only `approved` expenses count against fund balance
   - Pending/rejected expenses MUST NOT affect balance calculations

**Rationale**: The fund balance is the single source of truth for
available funds. Integrity ensures trust and proper financial planning.

### VII. Elderly-Friendly Accessibility | سهولة الوصول لكبار السن

The admin interface MUST be accessible to elderly users,
particularly financial managers.

**Typography Requirements**:

- Minimum font size MUST be 16px for body text
- Section headers MUST use 20px (`text-xl font-bold`) minimum
- Menu items MUST use 18px (`text-lg font-semibold`) minimum
- Font weight MUST provide adequate contrast (semibold or bold)

**Color and Contrast Requirements**:

- Background colors MUST use light, harmonious tones
- Text MUST meet WCAG AA contrast ratio (4.5:1 normal, 3:1 large)
- Active/selected states MUST be clearly distinguishable
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

**Rationale**: The family fund's financial manager is elderly.
Accessibility is a requirement, not optional. Large fonts, clear
contrast, and uncluttered design enable confident navigation.

## Technical Standards | المعايير التقنية

### Backend (Node.js/Express.js)
- ES Modules MUST be used (`import/export`, NOT `require()`)
- File extensions MUST be included in imports (e.g., `./file.js`)
- Environment variables MUST be validated at startup via `src/config/env.js`
- Rate limiting MUST be applied to authentication endpoints
- No `console.log` in production code; use Winston logger exclusively
- No hardcoded credentials or API keys in source code
- No test/debug endpoints in production `server.js`

### Frontend (React 18+)
- TypeScript SHOULD be used for new admin dashboard components
- Tailwind CSS MUST be used for styling
- DaisyUI components MUST be used for admin dashboard
- State management via React Context is preferred over Redux
- RTL support via `dir="rtl"` and Tailwind RTL utilities
- Frontends MUST NEVER access the database directly
- Accessibility compliance per Principle VII MUST be verified

### Flutter (Dart)
- Provider or Riverpod MUST be used for state management
- Secure storage MUST be used for tokens and sensitive data
- Arabic localization MUST be the default locale

### Database (Self-Hosted PostgreSQL via pg)

**Access Pattern (NON-NEGOTIABLE)**:
- Single `pg.Pool` instance in `services/database.js`
- ALL controllers MUST import from `services/database.js`
- ALL queries MUST use parameterized statements:
  `query('SELECT * FROM members WHERE id = $1', [id])`
- NEVER concatenate user input into SQL strings
- Use transactions for multi-table operations: `BEGIN...COMMIT/ROLLBACK`
- Connection pooling: min 2, max 20 connections
- Connection string: `DATABASE_URL` environment variable

**Prohibited**:
- No `@supabase/supabase-js` imports
- No `supabase.from()` calls
- No `pgQueryBuilder` usage
- No `config/supabase.js` or Supabase config files
- No direct `pool.query()` calls outside `services/database.js`

**Required**:
- Foreign key constraints for relational integrity
- Indexes on frequently queried columns (phone, member_id)
- Regular scheduled database backups
- Fund balance calculations MUST use database transactions
- Fund balance view (`vw_fund_balance`) for real-time accuracy

### File Organization

- One version of each component/route/controller (no duplicates)
- Backup files belong in git history, NOT in the repository
- Test scripts go in `scripts/` or `tests/` directory, NOT root
- No `.backup`, `.fixed`, `.original`, `.modern` suffixes in production
- Root-level scripts MUST be organized into `scripts/` subdirectories

### File Storage (Replacing Supabase Storage)

- Upload directory: `/var/www/uploads/alshuail/`
- Sub-directories: `member-photos/`, `member-documents/`,
  `financial-reports/`, `competition-media/`
- Serve static files via Nginx or Express static middleware
- Max file size: 10MB
- Allowed types: jpg, jpeg, png, pdf, xlsx, docx

## Fund Balance Implementation Standards | معايير تنفيذ رصيد الصندوق

### Database Requirements
- Fund balance MUST be calculated via view (`vw_fund_balance`)
- `expenses` table MUST have `status` column: pending, approved,
  rejected, paid
- `diya_cases` table MUST have `diya_type` column: internal, external
- Balance validation MUST use transactions with proper isolation
- `fund_balance_snapshots` table MUST store reconciliation records

### API Endpoints
- `GET /api/fund-balance` - Returns current calculated fund balance
- `GET /api/fund-balance/breakdown` - Returns detailed components
- Balance validation MUST be included in `POST /api/expenses`
- Expense approval MUST recalculate and validate balance

### UI Requirements
- Fund balance MUST be displayed prominently on admin dashboard
- Balance warnings at threshold (3600 SAR minimum)
- Expense creation form MUST show available balance
- Balance history/trend visualization SHOULD be provided
- All balance displays MUST comply with Principle VII accessibility

## Development Workflow | سير العمل التطويري

### Never Break Production
- All changes MUST be backward compatible with 347 member records
- NEVER drop or alter database columns without migration scripts
- NEVER remove API endpoints that clients currently use
- Always test changes against live backend at api.alshailfund.com
- Keep Supabase running until VPS PostgreSQL is fully verified

### Git Workflow
- Feature branches MUST be created for all new work
- Branch naming: `feature/description` or `fix/description`
- Commits MUST have descriptive messages in English
- Main branch MUST always be deployable
- Create backup branch before major migrations

### Code Review
- All changes to financial calculation logic MUST be reviewed
- Security-sensitive changes MUST include security review notes
- API contract changes MUST be documented
- Fund balance logic changes require additional validation testing
- Accessibility changes MUST be verified against Principle VII
- Database migration changes MUST be reviewed for data safety

### Deployment
- Admin dashboard deploys to Cloudflare Pages
- Mobile PWA deploys to VPS via scp
- Backend deploys to VPS via git pull + pm2 restart
- Database migrations MUST be tested on staging first
- Verify builds pass after each phase of migration

### Testing
- API endpoints MUST be tested via integration tests
- Authentication flows MUST have security tests
- Financial calculations MUST have unit tests with edge cases
- Fund balance calculations MUST have reconciliation tests
- Concurrent expense creation MUST be tested for race conditions
- Accessibility compliance SHOULD be verified for admin UI changes

## Governance | الحوكمة

This constitution supersedes all other development practices for
the Al-Shuail Family Management System.

### Amendment Process
1. Proposed amendments MUST be documented with rationale
2. Amendments affecting security or financial accuracy require
   careful review
3. All amendments MUST update the constitution version

### Versioning Policy
- **MAJOR**: Principle removal, technology stack change, or
  incompatible governance changes
- **MINOR**: New principle added or material guidance expansion
- **PATCH**: Clarifications, wording fixes, non-semantic refinements

### Compliance
- All pull requests MUST verify compliance with constitution
- Violations MUST be documented in Complexity Tracking of plan.md
- Runtime development guidance available in `CLAUDE.md`

**Version**: 2.0.0 | **Ratified**: 2026-01-14 | **Last Amended**: 2026-02-11
