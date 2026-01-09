# Changelog

All notable changes to the Al-Shuail Family Management System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-01-11

### Added
- **Subscription Balance Cap**: Maximum balance limited to 3000 SAR (50 SAR × 60 months = 5 years)
- **Financial Manager Permissions**: Added member statement access for financial_manager role
- **Comprehensive Documentation**: Added README.md, CHANGELOG.md, and project organization
- **Project Cleanup**: Archived 200+ documentation files into organized structure

### Changed
- Reorganized project structure for better maintainability
- Updated all packages to use Semantic Versioning v2.0.0
- Cleaned up deprecated Mobile folder files
- Archived historical documentation to `claudedocs/archived/`

### Fixed
- Subscription balance display showing incorrect values (now capped at 3000 SAR)
- Financial Manager role missing member statement navigation
- Permission gaps in RouteGuard and RoleContext

---

## [1.9.0] - 2025-01-10

### Added
- Family Tree add-child endpoint
- Admin document management features
- Expense categories API for dynamic category management

### Fixed
- Expense creation using correct field types
- hasFinancialAccess now includes admin and operational_manager roles

---

## [1.8.0] - 2025-01-08

### Added
- Multi-role support system
- Enhanced role-based navigation
- User management improvements

### Changed
- Upgraded authentication system
- Improved token refresh mechanism

---

## [1.7.0] - 2025-01-05

### Added
- Mobile PWA deployment to VPS
- Push notification infrastructure
- Firebase Cloud Messaging integration

### Changed
- Mobile app moved to `alshuail-mobile` folder
- Improved API response handling for mobile

---

## [1.6.0] - 2025-01-01

### Added
- Statement search functionality
- Member statement export (PDF/Excel)
- Arabic PDF generation with RTL support

### Fixed
- Phone number validation for Kuwait/Saudi formats
- Member search by multiple criteria

---

## [1.5.0] - 2024-12-28

### Added
- Crisis management module
- Emergency support coordination
- Diya tracking system

### Changed
- Dashboard consolidation
- Performance optimizations

---

## [1.4.0] - 2024-12-20

### Added
- Initiatives module
- Events calendar
- Charity projects management

### Fixed
- RTL layout issues in various components
- Chart rendering for Arabic text

---

## [1.3.0] - 2024-12-15

### Added
- Family tree visualization
- Branch (فخوذ) management
- Relationship tracking

### Changed
- Improved tree navigation
- Enhanced member cards

---

## [1.2.0] - 2024-12-10

### Added
- Payment tracking system
- Subscription management
- Receipt generation

### Fixed
- Balance calculation errors
- Payment status updates

---

## [1.1.0] - 2024-12-05

### Added
- Admin dashboard foundation
- Member CRUD operations
- Basic authentication

### Changed
- Initial Arabic localization
- RTL layout implementation

---

## [1.0.0] - 2024-12-01

### Added
- Initial project setup
- Backend API structure
- Database schema design
- Basic authentication system

---

## Version Numbering Guide

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR** version (X.0.0): Incompatible API changes
- **MINOR** version (0.X.0): New features, backwards compatible
- **PATCH** version (0.0.X): Bug fixes, backwards compatible

### Component Versions

| Component | Current Version |
|-----------|-----------------|
| Backend API | 2.0.0 |
| Admin Dashboard | 2.0.0 |
| Mobile PWA | 2.0.0 |

---

## Unreleased

### Planned
- Enhanced reporting dashboard
- Notification preferences
- Multi-language support expansion
- Performance monitoring

---

## Deprecation Notices

### Deprecated in 2.0.0
- Legacy `Mobile/` folder (use `alshuail-mobile/` instead)
- Old documentation files (archived to `claudedocs/archived/`)

---

## Migration Notes

### Upgrading to 2.0.0

1. **Subscription Balance**: Existing balances exceeding 3000 SAR will display as 3000 SAR
2. **Financial Manager Role**: Refresh permissions after update for member statement access
3. **Documentation**: All historical docs moved to `claudedocs/archived/`

---

**For detailed API changes, see [API.md](docs/API.md)**
