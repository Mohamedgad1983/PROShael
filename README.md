# Al-Shuail Family Management System

> A comprehensive bilingual (Arabic/English) family fund management platform for managing 347 members across 10 family branches.

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org)

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Development](#development)
- [Deployment](#deployment)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

The Al-Shuail Family Management System is a full-stack application designed to manage:

- **Member Management**: 347 family members across 10 branches (فخوذ)
- **Subscription Tracking**: Monthly subscriptions (50 SAR) with balance management
- **Financial Reports**: Comprehensive payment tracking and reporting
- **Family Tree**: Interactive family tree visualization
- **Initiatives & Events**: Community initiatives and occasion management
- **Crisis Management**: Emergency support coordination
- **Diyas (ديات)**: Blood money tracking and management

### Key Features

- Full Arabic RTL support
- Role-Based Access Control (RBAC)
- PWA support for mobile devices
- Push notifications via Firebase
- WhatsApp OTP authentication
- Hijri calendar integration
- PDF export with Arabic fonts

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      CLIENT APPLICATIONS                         │
├─────────────────────────┬───────────────────────────────────────┤
│  Admin Dashboard        │  Mobile PWA                            │
│  React 18 + TypeScript  │  React 18 + Vite                       │
│  alshailfund.com        │  app.alshailfund.com                   │
└───────────┬─────────────┴──────────────────┬────────────────────┘
            │                                 │
            └─────────────┬───────────────────┘
                          │
            ┌─────────────▼─────────────┐
            │     Backend API           │
            │  Express.js (ES Modules)  │
            │  api.alshailfund.com      │
            └─────────────┬─────────────┘
                          │
            ┌─────────────▼─────────────┐
            │     PostgreSQL            │
            │     (VPS/self-hosted)     │
            └───────────────────────────┘
```

### Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Backend | Node.js + Express.js | 18.x / 4.18.x |
| Admin Frontend | React + TypeScript | 19.x |
| Mobile Frontend | React + Vite | 18.x / 5.x |
| Database | PostgreSQL | 15.x |
| Hosting | VPS + Cloudflare Pages | - |
| Push Notifications | Firebase Cloud Messaging | - |
| SMS/WhatsApp | UltraMsg / Twilio | - |

---

## Project Structure

```
PROShael/
├── alshuail-backend/           # Active Express API, migrations, backend tests
├── alshuail-admin-arabic/      # Active React admin dashboard
├── alshuail-mobile/            # Active React/Vite mobile PWA
├── alshuail-flutter/           # Active Flutter app
├── AlShuailFund/               # Active SwiftUI iOS app
├── database/                   # Root-level database schemas/migrations
├── docs/                       # Architecture, specs, reports, iOS docs, analysis
├── scripts/                    # Root operational scripts
├── archive/                    # Historical backups only, not active source
├── .github/workflows/          # CI/CD workflows
├── package.json                # Root command surface
└── AGENTS.md                   # Repository working instructions
```

See [`docs/PROJECT_STRUCTURE.md`](docs/PROJECT_STRUCTURE.md) for the full structure contract, archive policy, generated-file policy, and app ownership rules.

---

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL 15 access (local or VPS)
- Firebase project (for push notifications)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/alshuail/alshuail-family-system.git
cd alshuail-family-system
```

2. **Install dependencies**
```bash
npm install
npm --prefix alshuail-backend install
npm --prefix alshuail-admin-arabic install
npm --prefix alshuail-mobile install
```

3. **Configure environment variables**

Backend (`.env`):
```env
# Required
DATABASE_URL=postgresql://user:password@localhost:5432/alshuail_db
JWT_SECRET=your_jwt_secret
CSRF_SECRET=your_csrf_secret
PORT=5001

# Optional - Local document storage
UPLOAD_DIR=/var/www/uploads/alshuail
UPLOAD_URL=https://api.alshailfund.com/uploads

# Optional - Push Notifications
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_PRIVATE_KEY=your_private_key

# Optional - WhatsApp
ULTRAMSG_INSTANCE_ID=your_instance_id
ULTRAMSG_TOKEN=your_token
```

Admin (`.env`):
```env
REACT_APP_API_URL=http://localhost:5001
```

Mobile (`.env`):
```env
VITE_API_URL=http://localhost:5001/api
```

4. **Start development servers**
```bash
# Terminal 1 - Backend
npm run backend:dev

# Terminal 2 - Admin Dashboard
npm run admin:dev

# Terminal 3 - Mobile PWA
npm run mobile:dev
```

---

## Development

### Backend Development

```bash
# Development with watch mode
npm run backend:dev

# Run tests
npm run backend:test

# Lint code
npm run backend:lint

# Security scan
npm run backend:security
```

### Admin Dashboard Development

```bash
# Development server
npm run admin:dev

# Type checking
npm run admin:type-check

# Production build
npm run admin:build
```

### Mobile PWA Development

```bash
# Development server
npm run mobile:dev

# Production build
npm run mobile:build

# Lint
npm run mobile:lint
```

---

## Deployment

### Admin Dashboard (Cloudflare Pages)

```bash
cd alshuail-admin-arabic
npm run build:fast
npx wrangler pages deploy build --project-name=alshuail-admin
```

### Mobile PWA (VPS)

```bash
cd alshuail-mobile
npm run build
scp -r dist/* root@213.199.62.185:/var/www/mobile/
```

### Backend (VPS)

```bash
ssh root@213.199.62.185 "cd /var/www/PROShael/alshuail-backend && git pull && npm install && pm2 restart alshuail-backend"
```

---

## API Documentation

### Authentication

```
POST /api/auth/login          # Admin login
POST /api/auth/member-login   # Member login
POST /api/auth/verify         # Verify token
POST /api/auth/refresh        # Refresh token
```

### Members

```
GET    /api/members           # List members
GET    /api/members/:id       # Get member details
POST   /api/members           # Create member
PUT    /api/members/:id       # Update member
DELETE /api/members/:id       # Delete member
```

### Subscriptions

```
GET  /api/subscriptions/admin/subscriptions/stats   # Subscription statistics
GET  /api/subscriptions/admin/subscriptions         # List subscriptions
POST /api/subscriptions/admin/subscriptions/payment # Record payment
```

### Financial Reports

```
GET /api/reports/financial         # Financial summary
GET /api/reports/payments          # Payment reports
GET /api/reports/subscriptions     # Subscription reports
```

For complete API documentation, see [API.md](docs/architecture/API.md).

---

## Testing

### Backend Tests

```bash
# Unit tests from repository root
npm run backend:test

# Full backend validation
npm run check:backend
```

### Product Checks

```bash
# Dependency audits across root, backend, admin, and mobile
npm run check:audit

# Admin TypeScript and production build
npm run check:admin

# Mobile lint and production build
npm run check:mobile

# Full repository validation
npm run check
```

---

## User Roles

| Role | Access Level | Description |
|------|--------------|-------------|
| `super_admin` | Full | Complete system access |
| `financial_manager` | Financial | Subscriptions, payments, reports, member statements |
| `family_tree_admin` | Family Tree | Tree management and relationships |
| `occasions_admin` | Events | Occasions, initiatives, diyas |
| `member` | Limited | Personal profile, payments, events |

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Message Convention

```
type(scope): description

Types: feat, fix, docs, style, refactor, test, chore
Scope: backend, admin, mobile, docs
```

Example: `feat(admin): add subscription balance cap at 3000 SAR`

---

## Support

- **Technical Issues**: Create a GitHub issue
- **Security Issues**: Contact security@alshailfund.com
- **General Inquiries**: info@alshailfund.com

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- Al-Shuail Family Board of Directors
- Development Team
- All contributing family members

---

**Maintained by Al-Shuail Family Fund Development Team**
