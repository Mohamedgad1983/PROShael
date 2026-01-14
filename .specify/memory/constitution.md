<!--
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           SYNC IMPACT REPORT                                   ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  Version Change: 1.0.0 → 1.0.1 (PATCH - Database clarification)                ║
║                                                                                 ║
║  Core Principles (unchanged):                                                   ║
║    - I. Arabic-First, RTL Excellence                                            ║
║    - II. Member Data Security                                                   ║
║    - III. API-First Architecture                                                ║
║    - IV. Mobile-First Design                                                    ║
║    - V. Financial Accuracy                                                      ║
║                                                                                 ║
║  Changes in v1.0.1:                                                             ║
║    - Clarified database: PostgreSQL on VPS (NOT Supabase)                       ║
║    - Added database backup requirement                                          ║
║                                                                                 ║
║  Templates Status:                                                              ║
║    - .specify/templates/plan-template.md ✅ Compatible                          ║
║    - .specify/templates/spec-template.md ✅ Compatible                          ║
║    - .specify/templates/tasks-template.md ✅ Compatible                         ║
║                                                                                 ║
║  Follow-up TODOs: None                                                          ║
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

**Rationale**: The family fund manages real money from 347+ members. Financial trust is non-negotiable.

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

### Deployment
- Admin dashboard deploys to Cloudflare Pages
- Mobile PWA deploys to VPS via scp
- Backend deploys to VPS via git pull + pm2 restart
- Database migrations MUST be tested on staging first

### Testing
- API endpoints MUST be tested via integration tests
- Authentication flows MUST have security tests
- Financial calculations MUST have unit tests with edge cases

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

**Version**: 1.0.1 | **Ratified**: 2026-01-14 | **Last Amended**: 2026-01-14
