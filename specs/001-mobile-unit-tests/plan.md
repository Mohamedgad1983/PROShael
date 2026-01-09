# Implementation Plan: Comprehensive Unit Testing for alshuail-mobile

**Branch**: `001-mobile-unit-tests` | **Date**: 2026-01-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-mobile-unit-tests/spec.md`

## Summary

This feature establishes a comprehensive unit testing infrastructure for the alshuail-mobile PWA application. The implementation will configure Vitest as the testing framework (compatible with the existing Vite build system), integrate React Testing Library for component tests, and use MSW (Mock Service Worker) for API mocking. Testing will prioritize the 11 service modules (80% coverage target), followed by utilities (70% coverage), and components/contexts (60% coverage). All tests must pass in CI/CD before deployment.

## Technical Context

**Language/Version**: JavaScript (ES Modules) with React 18.2.0
**Primary Dependencies**: React 18, Vite 5.0, Axios 1.6, Firebase 12.6, React Router 6.20, Lucide React
**Storage**: localStorage for tokens and user data, DataCacheContext for in-memory caching
**Testing**: Vitest + React Testing Library + MSW (Mock Service Worker) + jsdom
**Target Platform**: Mobile PWA (browser-based, iOS/Android via Chrome/Safari)
**Project Type**: Mobile PWA (single frontend application)
**Performance Goals**: Full test suite under 5 minutes, 80%/70%/60% coverage targets
**Constraints**: Must mock Firebase, localStorage, external APIs; RTL/Arabic text support required
**Scale/Scope**: 11 services, 3 components, 2 contexts, 1 utility, 22 pages

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Compliance Notes |
|-----------|--------|------------------|
| I. Arabic-First, RTL Excellence | ✅ PASS | Tests will validate RTL rendering and Arabic text display |
| II. Member Data Security | ✅ PASS | Tests will mock authentication, no real credentials used |
| III. API-First Architecture | ✅ PASS | Tests use MSW to mock API responses, validating service contracts |
| IV. Mobile-First Design | ✅ PASS | Component tests will verify mobile touch targets and responsive layouts |
| V. Financial Accuracy | ✅ PASS | Payment service tests will validate financial calculation accuracy |

**Technology Standards Compliance**:
- ✅ Mobile PWA uses React + Vite + Tailwind (per constitution)
- ✅ Tests will use ES Modules syntax
- ✅ Tests will run through ESLint as part of CI/CD

## Project Structure

### Documentation (this feature)

```text
specs/001-mobile-unit-tests/
├── plan.md              # This file
├── research.md          # Phase 0 output - Testing framework research
├── data-model.md        # Phase 1 output - Test organization structure
├── quickstart.md        # Phase 1 output - Test setup guide
├── contracts/           # Phase 1 output - API mock contracts
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
alshuail-mobile/
├── src/
│   ├── services/        # 11 service modules (P1 - 80% coverage)
│   │   ├── authService.js
│   │   ├── memberService.js
│   │   ├── paymentService.js
│   │   ├── subscriptionService.js
│   │   ├── familyTreeService.js
│   │   ├── notificationService.js
│   │   ├── pushNotificationService.js
│   │   ├── initiativeService.js
│   │   ├── newsService.js
│   │   ├── eventsService.js
│   │   └── index.js
│   ├── utils/           # Utility modules (P1 - 70% coverage)
│   │   └── api.js
│   ├── contexts/        # React contexts (P2 - 60% coverage)
│   │   └── DataCacheContext.jsx
│   ├── components/      # Reusable components (P2 - 60% coverage)
│   │   ├── BottomNav.jsx
│   │   ├── MemberSearchField.jsx
│   │   └── NotificationPrompt.jsx
│   ├── pages/           # Page components (P3)
│   │   └── [22 page files]
│   ├── App.jsx
│   └── main.jsx
├── tests/               # NEW - Test directory
│   ├── setup.js         # Test configuration and global mocks
│   ├── mocks/           # MSW handlers and mock data
│   │   ├── handlers.js
│   │   ├── server.js
│   │   └── data/
│   ├── unit/
│   │   ├── services/    # Service tests
│   │   ├── utils/       # Utility tests
│   │   └── contexts/    # Context tests
│   └── components/      # Component tests
├── vitest.config.js     # NEW - Vitest configuration
├── package.json         # Updated with test dependencies
└── .github/
    └── workflows/
        └── test.yml     # NEW - CI/CD test workflow
```

**Structure Decision**: Tests organized in a dedicated `tests/` directory at project root, with subdirectories matching source structure. This keeps test files separate from production code while maintaining clear module correspondence.

## Complexity Tracking

> No constitution violations detected. Standard implementation approach.

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| Test Framework | Vitest | Native Vite integration, faster than Jest, ESM support |
| Component Testing | React Testing Library | User-centric testing, RTL support, official React recommendation |
| API Mocking | MSW | Intercepts network layer, works with service workers, production-grade |
| Test Location | Separate tests/ directory | Cleaner production builds, easier CI configuration |

## Phase 0: Research Summary

### Testing Framework Evaluation

**Selected: Vitest** (recommended for Vite projects)
- Native Vite integration (uses same config, instant HMR)
- Jest-compatible API (easy migration)
- Built-in code coverage via c8/istanbul
- ESM-first design (matches project architecture)
- Faster execution than Jest for Vite projects

**Alternatives Considered:**
- Jest: Would require additional configuration for ESM/Vite
- Mocha: Less React integration, manual setup required

### API Mocking Strategy

**Selected: MSW (Mock Service Worker)**
- Network-level interception (most realistic)
- Works in browser and Node.js (jsdom)
- REST API handlers match existing axios setup
- Reusable handlers for multiple tests
- Debug mode shows request/response flow

**Alternatives Considered:**
- Axios mock adapter: Tightly coupled to axios implementation
- Nock: Node.js only, wouldn't work for browser tests
- Manual mocks: Harder to maintain, less realistic

### Component Testing Approach

**Selected: React Testing Library + jsdom**
- Queries by accessibility (role, label, text)
- RTL direction testing via container.dir attribute
- User event simulation for realistic interactions
- Arabic text assertions using regular expressions
- No implementation details exposure

### Coverage Requirements

| Module Type | Target | Rationale |
|-------------|--------|-----------|
| Services | 80% | Core business logic, highest risk |
| Utilities | 70% | Shared functions, high reuse |
| Components | 60% | UI layer, visual verification harder |
| Pages | N/A (P3) | Integration tests, lower priority |

## Phase 1: Design Artifacts

### Test Organization

```
tests/
├── setup.js                      # Global setup, mocks, cleanup
├── mocks/
│   ├── handlers.js               # MSW request handlers
│   ├── server.js                 # MSW server instance
│   └── data/
│       ├── members.json          # Mock member data
│       ├── payments.json         # Mock payment data
│       ├── subscriptions.json    # Mock subscription data
│       └── notifications.json    # Mock notification data
├── unit/
│   ├── services/
│   │   ├── authService.test.js
│   │   ├── memberService.test.js
│   │   ├── paymentService.test.js
│   │   ├── subscriptionService.test.js
│   │   ├── familyTreeService.test.js
│   │   ├── notificationService.test.js
│   │   ├── pushNotificationService.test.js
│   │   ├── initiativeService.test.js
│   │   ├── newsService.test.js
│   │   └── eventsService.test.js
│   ├── utils/
│   │   └── api.test.js
│   └── contexts/
│       └── DataCacheContext.test.jsx
└── components/
    ├── BottomNav.test.jsx
    ├── MemberSearchField.test.jsx
    └── NotificationPrompt.test.jsx
```

### Mock Data Design

**Member Mock**:
```json
{
  "id": 1,
  "membership_number": "M001",
  "full_name_ar": "محمد أحمد الشعيل",
  "full_name_en": "Mohammed Ahmed Al-Shuail",
  "phone": "96512345678",
  "branch_id": 1,
  "balance": "1500.00",
  "role": "member"
}
```

**Authentication Mock**:
```json
{
  "success": true,
  "token": "mock-jwt-token",
  "user": { "...member data..." }
}
```

### CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: cd alshuail-mobile && npm ci
      - run: cd alshuail-mobile && npm test -- --coverage
      - name: Check Coverage
        run: |
          # Fail if coverage below thresholds
          cd alshuail-mobile && npm test -- --coverage --coverage.thresholds.lines=70
```

### Key API Contracts to Mock

| Service | Endpoint | Method | Mock Response |
|---------|----------|--------|---------------|
| authService | /otp/send | POST | { success: true, message: "OTP sent" } |
| authService | /otp/verify | POST | { success: true, token: "...", user: {...} } |
| memberService | /members/profile | GET | Member object |
| paymentService | /payments/subscription | POST | { success: true, paymentId: "..." } |
| subscriptionService | /subscriptions/plans | GET | Array of subscription plans |
| familyTreeService | /family-tree/full | GET | Tree structure |
| notificationService | /notifications | GET | Array of notifications |
| initiativeService | /initiatives | GET | Array of initiatives |
| newsService | /news | GET | Array of news items |
| eventsService | /events | GET | Array of events |

## Next Steps

1. Run `/speckit.tasks` to generate implementation tasks
2. Install testing dependencies (vitest, @testing-library/react, msw)
3. Configure vitest.config.js
4. Create test setup and mock infrastructure
5. Implement service tests (P1)
6. Implement utility tests (P1)
7. Implement component/context tests (P2)
8. Configure CI/CD pipeline
9. Verify coverage thresholds
