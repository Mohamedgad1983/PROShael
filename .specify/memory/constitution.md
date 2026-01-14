<!--
SYNC IMPACT REPORT
==================
Version change: 0.0.0 → 1.0.0 (Initial constitution)
Added sections:
  - Core Principles (5 principles)
  - Technology Standards
  - Security Requirements
  - Governance
Templates requiring updates:
  ✅ constitution.md (this file)
  ⚠ pending: plan-template.md, spec-template.md, tasks-template.md (verify alignment)
Follow-up TODOs: None
-->

# Al-Shuail Family Management System Constitution

## Core Principles

### I. Arabic-First, RTL Excellence
All user interfaces MUST support Arabic as the primary language with full RTL (Right-to-Left) layout.
- Arabic text MUST be displayed correctly with proper font rendering (Cairo font preferred)
- All forms, tables, and navigation MUST be RTL-aware
- English MUST be available as a secondary language option
- Hijri (Islamic) calendar MUST be supported alongside Gregorian dates

**Rationale**: The system serves an Arabic-speaking family in Kuwait/Saudi Arabia. Native language support is essential for adoption and usability.

### II. Member Data Security
Family member personal and financial data MUST be protected with multi-layer security.
- Authentication MUST use JWT tokens with appropriate expiry (Admin: 7 days, Member: 30 days)
- OTP verification via WhatsApp MUST be required for login
- Biometric authentication (Face ID/Touch ID) SHOULD be available on mobile
- Role-based access control (RBAC) MUST enforce data visibility boundaries
- Sensitive data MUST NOT be logged or exposed in error messages

**Rationale**: Family financial and personal data requires strong protection to maintain trust and comply with data protection expectations.

### III. API-First Architecture
The backend API MUST be the single source of truth for all client applications.
- All business logic MUST reside in the backend, not duplicated in frontends
- API endpoints MUST return consistent JSON response structures
- API versioning MUST be considered for breaking changes
- All frontends (Admin, PWA, Flutter) MUST consume the same API

**Rationale**: Multiple frontend applications require a unified, reliable backend to ensure data consistency and reduce maintenance burden.

### IV. Mobile-First Design
The mobile experience MUST be prioritized for family member interactions.
- All member-facing features MUST work on mobile devices (PWA and Flutter)
- Touch targets MUST be appropriately sized for mobile interaction
- Offline capability SHOULD be implemented for critical read operations
- Push notifications MUST be supported via Firebase Cloud Messaging
- Performance MUST be optimized for mobile networks

**Rationale**: Family members primarily access the system via mobile devices. Desktop admin is secondary.

### V. Financial Accuracy
All financial calculations and records MUST be accurate and auditable.
- Payment amounts MUST use appropriate decimal precision
- All financial transactions MUST be logged in audit trails
- Balance calculations MUST be consistent across all views
- Financial reports MUST reconcile with transaction records
- Manual balance adjustments MUST require authorization and documentation

**Rationale**: The system manages family subscriptions, payments, and charitable funds (Diyas). Financial integrity is critical for family trust.

## Technology Standards

The following technology stack MUST be used for consistency and maintainability:

| Layer | Technology | Version |
|-------|------------|---------|
| Backend | Node.js + Express.js (ES Modules) | 18+ |
| Admin Frontend | React + TypeScript + CRACO | 18+ |
| Mobile PWA | React + Vite + Tailwind | 18+ |
| Mobile Native | Flutter + Dart | 3.x |
| Database | PostgreSQL (self-hosted on VPS) | 14+ |
| Process Manager | PM2 | Latest |

**Code Standards**:
- Backend MUST use ES Modules (import/export), not CommonJS
- Frontend MUST use TypeScript for type safety
- All code MUST pass ESLint checks before commit
- Database queries MUST use parameterized statements (no SQL injection)

## Security Requirements

Authentication and authorization MUST follow these requirements:

1. **Authentication Methods**:
   - Phone number + WhatsApp OTP (primary)
   - Password authentication (optional, for returning users)
   - Biometric authentication (Flutter app)

2. **Authorization Roles**:
   - `super_admin`: Full system access
   - `admin`: Administrative functions
   - `financial_manager`: Financial operations
   - `operational_manager`: Operational tasks
   - `member`: Personal data and payments only

3. **API Security**:
   - All API endpoints (except public) MUST require Bearer token
   - CORS MUST be configured for known origins only
   - Rate limiting MUST be enforced (500 requests per 15 minutes)
   - HTTPS MUST be enforced in production

## Governance

This constitution establishes the foundational principles for the Al-Shuail Family Management System. All development decisions MUST align with these principles.

**Amendment Process**:
1. Proposed changes MUST be documented with rationale
2. Changes affecting security or financial accuracy require stakeholder approval
3. Version number MUST be incremented according to semantic versioning
4. All team members MUST be notified of constitution changes

**Compliance**:
- All pull requests MUST verify compliance with these principles
- Code reviews MUST check for principle violations
- Exceptions MUST be documented and justified

**Guidance**: See `CLAUDE.md` for runtime development guidance and project-specific commands.

**Version**: 1.0.0 | **Ratified**: 2025-01-09 | **Last Amended**: 2025-01-09
