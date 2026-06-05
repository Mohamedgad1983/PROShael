# Project Structure

This repository is organized as a multi-application product with stable deployment paths. Do not move the active application roots unless the CI/CD workflows, VPS paths, Cloudflare Pages project, Flutter build config, Xcode project, and documentation are updated in the same change.

## Active Roots

| Path | Owner | Purpose |
| --- | --- | --- |
| `alshuail-backend/` | Backend | Express API, PostgreSQL access, migrations, API tests, operational scripts |
| `alshuail-admin-arabic/` | Web admin | React/TypeScript admin dashboard deployed to Cloudflare Pages |
| `alshuail-mobile/` | Mobile PWA | React/Vite member PWA deployed to the VPS mobile site |
| `alshuail-flutter/` | Native mobile | Flutter Android/iOS application |
| `AlShuailFund/` | Native iOS | SwiftUI iOS app and Xcode project |
| `database/` | Data | Root-level database schemas and migrations that are not app-local |
| `docs/` | Documentation | Architecture, specs, reports, iOS docs, analysis, migration notes |
| `scripts/` | Operations | Root-level operational utilities that act across applications |
| `.github/workflows/` | CI/CD | Backend, admin, frontend, and test automation |

## Application Boundaries

Each active application owns its local source, package file, lockfile, tests, and build config. Cross-application code should not be copied into another app casually. If a helper is needed by multiple apps, create a small shared package only after there is proven duplication and a clear build path.

Backend code belongs under `alshuail-backend/src/`:

- `config/`: runtime configuration and environment parsing
- `controllers/`: request handlers
- `routes/`: Express route definitions
- `middleware/`: authentication, RBAC, CSRF, rate limiting, request guards
- `services/`: business logic and external integrations
- `utils/`: pure or narrowly scoped helpers
- `scripts/`: backend-only operational scripts
- `migrations/`: backend-owned PostgreSQL migrations
- `__tests__/`: backend tests, split by unit/integration/e2e/security/performance

Admin and mobile frontend code should stay feature-oriented:

- `components/`: reusable or feature-specific UI
- `pages/`: route-level screens
- `services/`: API clients and data access
- `hooks/` and `contexts/`: shared React state and behavior
- `utils/`: formatting, validation, API configuration, date helpers

## Generated And Local-Only Files

Generated outputs are ignored and should not be committed:

- `node_modules/`
- `build/`, `dist/`
- `.wrangler/`
- `coverage/`, `playwright-report/`
- `uploads/`
- `screenshots/`
- `test-results*.json`
- backup archives such as `*.zip`, `*.tar.gz`
- `alshuail-mobile/public/firebase-sw-config.js`

Firebase and other credentials must be supplied through environment variables or secret managers. Do not add service-account JSON files, VAPID key notes, bearer tokens, or local `.mcp` credential files to the repository.

## Archive Policy

Archive folders are historical reference only. They are not part of builds, tests, CI, or deployment. Do not import code from archive folders. If archived code is needed, migrate the specific logic into an active app path and update tests.

Primary archive locations:

- `archive/`
- `alshuail-backend/archive/`
- `alshuail-admin-arabic/archive/`
- `alshuail-flutter/archive/`

## Root Command Surface

Use root commands for normal validation:

```bash
npm run check:audit
npm run check:backend
npm run check:admin
npm run check:mobile
npm run check
```

Use app-local commands when actively developing one application:

```bash
npm run backend:dev
npm run admin:dev
npm run mobile:dev
```

## Change Rules

1. Keep deployment-critical root folder names stable unless the move is deliberately planned.
2. Keep docs under `docs/`; do not recreate root-level report/spec folders.
3. Keep one-off operational scripts under `scripts/` or the owning app's `scripts/`.
4. Keep old backups in `archive/`; do not mix them with active source.
5. Never commit generated build outputs, local credentials, or temporary debug artifacts.
