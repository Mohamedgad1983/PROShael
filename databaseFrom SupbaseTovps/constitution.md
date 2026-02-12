# Constitution - Al-Shuail Family Fund Management System

## Project Identity

- **Name**: Al-Shuail Family Fund Management System (نظام صندوق عائلة الشعيل)
- **Type**: Family fund management platform (financial + social)
- **Users**: 347+ Saudi/Kuwaiti family members across 10 tribal branches (فخوذ)
- **Languages**: Arabic (primary, RTL), English (secondary)
- **Calendar**: Hijri (primary), Gregorian (secondary)

## Technology Stack (NON-NEGOTIABLE)

- **Database**: PostgreSQL on Contabo VPS (SELF-HOSTED — NO Supabase)
- **Backend**: Node.js + Express.js (ES Modules) hosted on Contabo VPS (api.alshailfund.com)
- **Admin Dashboard**: React 18 + TypeScript + Tailwind CSS on Cloudflare Pages (alshailfund.com)
- **Mobile PWA**: React + Vite on Cloudflare Pages (app.alshailfund.com)
- **Flutter App**: Dart/Flutter for native mobile (alshuail-flutter/)
- **Auth**: WhatsApp OTP via Ultramsg API
- **Font**: Cairo (Google Fonts) for all Arabic text

## CRITICAL ARCHITECTURE CHANGE: Database Migration

### FROM: Supabase hosted PostgreSQL (oneiggrfzagqjbkdinin.supabase.co)
### TO: Self-hosted PostgreSQL on Contabo VPS

**Rules for this migration:**
1. Remove ALL Supabase JS client (`@supabase/supabase-js`) usage from the backend
2. Remove ALL `supabase.from('table').select()` patterns
3. Use ONLY direct PostgreSQL via `pg` (node-postgres) library with a connection pool
4. Create a single database service (`services/database.js`) using `pg.Pool`
5. All queries use parameterized SQL (prevent SQL injection)
6. Connection string from `.env`: `DATABASE_URL=postgresql://user:pass@localhost:5432/alshuail`
7. Remove Supabase config files: `config/supabase.js`, `config/database.js` (if Supabase-based)
8. Remove `@supabase/supabase-js` from `package.json`
9. Supabase Storage buckets must be replaced with local file storage on VPS (`/var/www/uploads/`)
10. Supabase Auth must be fully replaced by custom JWT auth (already partially done)

## Non-Negotiable Principles

### 1. Never Break Production
- All changes must be backward compatible with existing 347 member records
- Never drop or alter database columns with existing data without migration
- Never remove API endpoints that mobile or admin apps currently use
- Always test changes against live backend at api.alshailfund.com

### 2. Cultural & Regional Requirements
- Arabic RTL layout must work correctly everywhere
- Hijri calendar dates are PRIMARY - always display alongside Gregorian
- Phone formats: Saudi (+966) and Kuwait (+965) must both be supported
- Currency: SAR (Saudi Riyal) - 50 SAR monthly subscription
- All user-facing strings must be bilingual (Arabic + English)

### 3. Code Quality Standards
- No console.log in production code (use Winston logger)
- No hardcoded credentials or API keys in source code
- No test/debug endpoints in production server.js
- All API responses must follow consistent JSON format: `{ success: boolean, data: any, message: string }`
- Error handling on every route - no unhandled promise rejections

### 4. Database Access Pattern (NEW - PostgreSQL Direct)
- Single `pg.Pool` instance in `services/database.js`
- All controllers import from `services/database.js`
- ALL queries must use parameterized statements: `pool.query('SELECT * FROM members WHERE id = $1', [id])`
- NEVER concatenate user input into SQL strings
- Use transactions for multi-table operations: `BEGIN...COMMIT/ROLLBACK`
- Connection pooling: min 2, max 20 connections

### 5. File Organization
- One version of each component/route/controller (no duplicates)
- Backup files belong in git history, NOT in the repo
- Test scripts go in a `scripts/` or `tests/` directory, NOT root
- No .backup, .fixed, .original, .modern suffixes in production code

### 6. Security
- JWT authentication required on all non-public endpoints
- RBAC middleware on all admin endpoints
- No test routes mounted in production
- Sanitize all user inputs
- Rate limiting on auth endpoints
- Database password in `.env` only, never in code

### 7. File Storage (Replacing Supabase Storage)
- Upload directory: `/var/www/uploads/alshuail/`
- Sub-directories: `member-photos/`, `member-documents/`, `financial-reports/`, `competition-media/`
- Serve static files via Nginx or Express static middleware
- Max file size: 10MB
- Allowed types: jpg, jpeg, png, pdf, xlsx, docx
