# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Al-Shuail Family Management System** - A bilingual (Arabic/English) family fund management platform for managing 347 members across 10 family branches (فخوذ). Full-stack application with three main components.

## Architecture

```
D:/PROShael/
├── alshuail-backend/       # Express.js API (ES Modules)
├── alshuail-admin-arabic/  # React 18 + TypeScript Admin Dashboard
├── alshuail-mobile/        # React + Vite Mobile PWA (main mobile app)
├── Mobile/                 # Legacy mobile folder (deprecated - do not use)
└── claudedocs/             # Generated documentation/reports
```

### Infrastructure
| Component | Technology | URL |
|-----------|------------|-----|
| Backend API | Node.js + Express.js (ES Modules) | `api.alshailfund.com` |
| Admin Dashboard | React 18 + TypeScript + CRACO | `alshailfund.com` |
| Mobile PWA | React + Vite + Tailwind | `app.alshailfund.com` |
| Database | PostgreSQL | Supabase |

### Server Details
- **VPS IP**: 213.199.62.185
- **Backend Path on Server**: `/var/www/PROShael/alshuail-backend`
- **Mobile PWA Path on Server**: `/var/www/mobile`
- **PM2 Process**: `alshuail-backend`

## Common Commands

### Backend (`alshuail-backend/`)
```bash
npm run dev              # Development with watch mode (port 5001)
npm start                # Production (uses .env.production)
npm test                 # Run all tests (ES Modules with --experimental-vm-modules)
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
npm run lint             # ESLint check
npm run lint:fix         # Auto-fix lint issues

# Run single test file
npm test -- --testPathPattern=filename.test.js

# Security commands
npm run security-audit   # Check for vulnerabilities
npm run security:check   # Scan for hardcoded secrets
npm run env:validate     # Validate environment variables
```

### Admin Frontend (`alshuail-admin-arabic/`)
```bash
npm start                # Development server (CRACO on port 3002)
npm run build:fast       # Production build (no sourcemaps - faster, recommended)
npm run build            # Standard production build
npm run type-check       # TypeScript validation
npm run lint             # ESLint check

# PWA commands
npm run pwa:build        # Build with service worker
npm run pwa:validate     # Lighthouse PWA audit
```

### Mobile PWA (`alshuail-mobile/`)
```bash
npm run dev              # Vite development server
npm run build            # Production build (outputs to dist/)
npm run preview          # Preview production build locally
```

### Deployment
```bash
# Admin to Cloudflare Pages
npx wrangler pages deploy "D:/PROShael/alshuail-admin-arabic/build" --project-name=alshuail-admin

# Mobile PWA to VPS
scp -r D:/PROShael/alshuail-mobile/dist/* root@213.199.62.185:/var/www/mobile/

# Backend to VPS
ssh root@213.199.62.185 "cd /var/www/PROShael/alshuail-backend && git pull && npm install && pm2 restart alshuail-backend"

# View backend logs
ssh root@213.199.62.185 "pm2 logs alshuail-backend --lines 50"
```

## Backend Architecture

### Route → Controller → Service Pattern
All backend code follows ES Modules (`"type": "module"` in package.json):
- **Routes** (`src/routes/`): Define API endpoints, apply middleware
- **Controllers** (`src/controllers/`): Handle request/response, business logic
- **Services** (`src/services/`): Reusable business logic, external integrations

### Key Files
- `server.js` - Main entry point, imports all routes, configures middleware
- `src/config/database.js` - Supabase client initialization
- `src/config/env.js` - Centralized environment config (use `config.*` not `process.env.*`)
- `src/middleware/authMiddleware.js` - JWT authentication (`authenticateToken`)
- `src/utils/logger.js` - Winston logging (use `log.info()`, `log.error()`)
- `src/utils/errorCodes.js` - Centralized error handling

### API Base Path: `/api`
Major route groups: `/auth`, `/members`, `/payments`, `/subscriptions`, `/family-tree`, `/notifications`, `/audit`, `/reports`, `/initiatives`, `/expenses`, `/settings`, `/profile`, `/diyas`, `/crisis`, `/news`, `/occasions`

### Services Layer
Key services in `src/services/`:
- `firebaseService.js` - Push notifications via FCM
- `ultramsgService.js` / `twilioService.js` - WhatsApp OTP and notifications
- `receiptService.js` - PDF receipt generation
- `arabicPdfExporter.js` - Arabic PDF exports with RTL support
- `notificationService.js` - Notification orchestration

### Database Access
```javascript
import { supabase } from './src/config/database.js';

// Standard query pattern
const { data, error } = await supabase
  .from('members')
  .select('*, family_branches(branch_name_ar)')
  .eq('id', memberId);

if (error) throw error;
```

### Database Migrations
SQL migrations are in `alshuail-backend/migrations/`. Run via Supabase dashboard or:
```bash
npm run db:migrate
```

## Frontend Architecture

### Admin Dashboard (React 19 + TypeScript)
- Uses CRACO for custom webpack config (`craco.config.js`)
- RTL (right-to-left) support for Arabic via `dir="rtl"`
- DaisyUI + Tailwind CSS for styling
- Chart.js/Recharts for data visualization
- react-router-dom v7 for routing
- Workbox for PWA service worker

Key directories:
- `src/components/` - Feature-based (FamilyTree/, Settings/, Members/, Reports/, etc.)
- `src/contexts/` - React contexts for state management
- `src/services/` - API service functions
- `src/hooks/` - Custom React hooks

Major feature modules: Dashboard, Members, Payments, FamilyTree, Settings, Reports, Initiatives, Diyas, Crisis, Subscriptions

### Mobile PWA (React 18 + Vite)
- Vite for fast builds with vite-plugin-pwa
- Token stored in `localStorage` as `alshuail_token`
- API client in `src/utils/api.js` with axios interceptors
- Firebase SDK for push notifications
- Tailwind CSS + Lucide icons

Key pages: Login, Dashboard, FamilyTree, Payments, Initiatives, MemberCard, News, Notifications, Settings, Profile

## Testing

### Backend Test Structure (`__tests__/`)
```
__tests__/
├── unit/           # Unit tests for individual functions
├── integration/    # API endpoint tests with real DB
├── e2e/            # End-to-end tests
├── security/       # Security vulnerability tests
├── fixtures/       # Test data and mocks
└── helpers/        # Test utilities
```

Jest config: `jest.config.js` - runs sequentially (`maxWorkers: 1`) to avoid port conflicts.

### Browser Testing
- Admin: `https://alshailfund.com/admin/login` (credentials: `admin@alshuail.com` / `Admin@123`)
- Mobile: `https://app.alshailfund.com/login` (use demo login button)

## Important Patterns

### Phone Number Validation
System handles Kuwait (+965) and Saudi Arabia (+966) formats. Phone normalization in controllers via `normalizePhoneForSearch()`.

### Authentication Flow
1. Login via `/api/auth/login` returns JWT token
2. Frontend stores token in `localStorage` (admin) or `alshuail_token` (mobile)
3. Token sent as `Authorization: Bearer <token>` header
4. `authenticateToken` middleware validates and attaches `req.user`

### Role-Based Access
Roles: `super_admin`, `admin`, `financial_manager`, `operational_manager`, `member`

Check permissions in routes:
```javascript
import { requireRole, requirePermission } from '../middleware/authMiddleware.js';
router.get('/admin-only', authenticateToken, requireRole(['admin', 'super_admin']), handler);
```

### API Response Handling (Mobile)
Always validate responses are arrays before using array methods:
```javascript
const data = response.data;
const items = Array.isArray(data) ? data : (data?.data || data?.items || []);
```

### Arabic/RTL Support
- Document-level `dir="rtl"` for Arabic layout
- Use `text-right` Tailwind classes for Arabic text alignment
- All UI text should support Arabic translations

## Environment Variables

### Backend Required (`.env`)
```
# Required for all environments
SUPABASE_URL=https://oneiggrfzagqjbkdinin.supabase.co
SUPABASE_ANON_KEY=your_anon_key

# Required for production
SUPABASE_SERVICE_KEY=your_service_key
JWT_SECRET=your_jwt_secret

# Optional services
FIREBASE_PROJECT_ID=...       # Push notifications
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
ULTRAMSG_INSTANCE_ID=...      # WhatsApp OTP (recommended)
ULTRAMSG_TOKEN=...
```

### Frontend Environment
- Admin: `REACT_APP_API_URL=https://api.alshailfund.com`
- Mobile: `VITE_API_URL=https://api.alshailfund.com/api`

## Debugging

### Check API Health
```bash
curl https://api.alshailfund.com/api/health
```

### View Server Logs
```bash
ssh root@213.199.62.185 "pm2 logs alshuail-backend --err --lines 30"
```

### Test Authenticated Endpoints
```bash
TOKEN="<jwt_token>"
curl -H "Authorization: Bearer $TOKEN" https://api.alshailfund.com/api/members
```

### Clear PWA Cache
```bash
ssh root@213.199.62.185 "systemctl restart nginx"
```

## Key Database Tables

Core tables in Supabase PostgreSQL:
- `members` - Family members with branch assignment, phone, status
- `family_branches` - 10 family branches (فخوذ) with Arabic names
- `payments` - Subscription payments with receipts
- `subscriptions` - Member subscription periods
- `initiatives` - Family initiatives/projects
- `diyas` - دية (blood money) tracking
- `crisis_cases` - Emergency crisis management
- `notifications` - System notifications
- `audit_logs` - User action logging
- `device_tokens` - FCM tokens for push notifications

## Common Gotchas

### ES Modules
Backend uses ES Modules - always use `import/export`, not `require()`. File extensions required in imports:
```javascript
import { supabase } from './config/database.js';  // .js required
```

### Windows Path Issues
When running commands on Windows, use forward slashes or escape backslashes in paths.

### CORS
The backend allows specific origins. When testing locally, ensure frontend runs on `localhost:3002` (admin) or the configured CORS origin.

### Token Expiry
- Admin tokens: 7 days (`ADMIN_JWT_TTL`)
- Member tokens: 30 days (`MEMBER_JWT_TTL`)

### Hijri Calendar
System uses `hijri-converter` and `moment-hijri` for Islamic calendar support. Subscription years follow Hijri calendar.
