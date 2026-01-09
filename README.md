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
            │     (Supabase)            │
            └───────────────────────────┘
```

### Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Backend | Node.js + Express.js | 18.x / 4.18.x |
| Admin Frontend | React + TypeScript | 19.x |
| Mobile Frontend | React + Vite | 18.x / 5.x |
| Database | PostgreSQL | 15.x |
| Hosting | Supabase + Cloudflare Pages | - |
| Push Notifications | Firebase Cloud Messaging | - |
| SMS/WhatsApp | UltraMsg / Twilio | - |

---

## Project Structure

```
D:/PROShael/
├── alshuail-backend/           # Express.js API Server
│   ├── src/
│   │   ├── config/             # Configuration files
│   │   ├── controllers/        # Route handlers
│   │   ├── middleware/         # Express middleware
│   │   ├── routes/             # API route definitions
│   │   ├── services/           # Business logic services
│   │   └── utils/              # Utility functions
│   ├── migrations/             # Database migrations
│   └── __tests__/              # Test suites
│
├── alshuail-admin-arabic/      # React Admin Dashboard
│   ├── src/
│   │   ├── components/         # React components (feature-based)
│   │   ├── contexts/           # React contexts
│   │   ├── hooks/              # Custom hooks
│   │   ├── services/           # API service functions
│   │   └── utils/              # Utility functions
│   └── public/                 # Static assets
│
├── alshuail-mobile/            # React Mobile PWA
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── pages/              # Page components
│   │   └── utils/              # Utility functions
│   └── public/                 # PWA assets
│
├── claudedocs/                 # Documentation archive
│   └── archived/               # Historical documentation
│
├── CLAUDE.md                   # AI assistant instructions
├── README.md                   # This file
└── CHANGELOG.md                # Version history
```

---

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Supabase account
- Firebase project (for push notifications)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/alshuail/alshuail-family-system.git
cd alshuail-family-system
```

2. **Install dependencies**
```bash
# Backend
cd alshuail-backend
npm install

# Admin Dashboard
cd ../alshuail-admin-arabic
npm install

# Mobile PWA
cd ../alshuail-mobile
npm install
```

3. **Configure environment variables**

Backend (`.env`):
```env
# Required
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
JWT_SECRET=your_jwt_secret
PORT=5001

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
cd alshuail-backend
npm run dev

# Terminal 2 - Admin Dashboard
cd alshuail-admin-arabic
npm start

# Terminal 3 - Mobile PWA
cd alshuail-mobile
npm run dev
```

---

## Development

### Backend Development

```bash
cd alshuail-backend

# Development with watch mode
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Security audit
npm run security-audit
```

### Admin Dashboard Development

```bash
cd alshuail-admin-arabic

# Development server
npm start

# Type checking
npm run type-check

# Production build
npm run build:fast

# Run tests
npm test
```

### Mobile PWA Development

```bash
cd alshuail-mobile

# Development server
npm run dev

# Production build
npm run build

# Preview build
npm run preview
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

For complete API documentation, see [API.md](docs/API.md).

---

## Testing

### Backend Tests

```bash
cd alshuail-backend

# Run all tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# Coverage report
npm run test:coverage
```

### Frontend Tests

```bash
cd alshuail-admin-arabic

# Run tests
npm test

# Coverage report
npm run test:coverage
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
