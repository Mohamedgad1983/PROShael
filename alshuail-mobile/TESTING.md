# Testing Guide - Al-Shuail Mobile PWA

Comprehensive testing documentation for the mobile PWA application.

## Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Coverage Targets](#coverage-targets)
- [Test Categories](#test-categories)
- [Writing Tests](#writing-tests)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Al-Shuail Mobile PWA has **196 passing tests** with comprehensive coverage across:
- **Unit Tests**: Services, utilities, contexts, and components
- **Integration Tests**: Page flows and multi-component interactions
- **Coverage**: >80% for critical code paths

### Test Stack

- **Framework**: [Vitest](https://vitest.dev/) v4.0.16
- **Testing Library**: [@testing-library/react](https://testing-library.com/react) v16.3.1
- **API Mocking**: [MSW](https://mswjs.io/) (Mock Service Worker) v2.12.7
- **Environment**: jsdom with localStorage, window.location mocking

---

## Test Structure

```
tests/
├── setup.js                    # Global test configuration
├── mocks/
│   ├── handlers.js            # MSW API handlers (80+ endpoints)
│   └── localStorage.js        # localStorage mock
├── unit/
│   ├── services/              # Service layer tests (87 tests)
│   ├── utils/                 # Utility function tests (20 tests)
│   ├── contexts/              # React Context tests (25 tests)
│   └── components/            # UI component tests (68 tests)
└── integration/
    ├── LoginFlow.test.jsx     # Complete authentication flow
    ├── DashboardIntegration.test.jsx  # Dashboard + cache + components
    └── NavigationFlow.test.jsx        # Multi-page navigation

```

---

## Running Tests

### All Tests

```bash
npm test                          # Run all tests with watch mode
npm test -- --run                 # Run once without watch
npm test -- --run --reporter=verbose  # Verbose output
```

### Specific Test Suites

```bash
# Unit tests only
npm test -- tests/unit/ --run

# Integration tests only
npm test -- tests/integration/ --run

# Specific category
npm test -- tests/unit/services/ --run
npm test -- tests/unit/components/ --run
```

### Single Test File

```bash
npm test -- tests/unit/services/memberService.test.js --run
npm test -- tests/unit/components/BottomNav.test.jsx --run
```

### Coverage Reports

```bash
# Generate coverage for all code
npm test -- --run --coverage

# Coverage for specific directories
npm test -- --run --coverage --coverage.include=src/services/
npm test -- --run --coverage --coverage.include=src/contexts/
npm test -- --run --coverage --coverage.include=src/components/
```

---

## Coverage Targets

| Category | Target | Achieved | Status |
|----------|--------|----------|--------|
| **Services** | 80% | varies by service | ⚠️ In Progress |
| **Utilities** | 70% | **96.29%** | ✅ EXCEEDED |
| **Contexts** | 60% | **81.43%** | ✅ EXCEEDED |
| **Components** | 60% | **98.14%** | ✅ EXCEEDED |

### Service Coverage Details

| Service | Coverage | Tests | Status |
|---------|----------|-------|--------|
| paymentService | 84% | 14 | ✅ |
| newsService | 81.81% | 7 | ✅ |
| memberService | 77.55% | 21 | ⚠️ |
| authService | 66.66% | 6 | ⚠️ |
| notificationService | 58.82% | 5 | ⚠️ |
| familyTreeService | 37.5% | 10 | ⚠️ |
| subscriptionService | 22.22% | 9 | ⚠️ |
| initiativeService | 20% | 5 | ⚠️ |
| occasionService | 12.5% | 2 | ⚠️ |

---

## Test Categories

### 1. Service Layer Tests (87 tests)

Tests for all API service modules in `src/services/`.

**Example: memberService.test.js**
```javascript
describe('memberService', () => {
  it('should fetch member profile data', async () => {
    const result = await memberService.getMyData()
    expect(result.id).toBeDefined()
    expect(result.full_name_ar).toBeDefined()
  })

  it('should update profile information', async () => {
    const updates = { email: 'test@example.com' }
    const result = await memberService.updateProfile(updates)
    expect(result.success).toBe(true)
  })
})
```

### 2. Utility Tests (20 tests)

Tests for utility functions in `src/utils/`.

**Coverage**: 96.29% ✅

**Tests**: `api.test.js`
- Axios instance configuration
- Token management (set, get, isAuthenticated)
- Request/response interceptors
- 401 error handling and redirects

### 3. Context Tests (25 tests)

Tests for React Context providers in `src/contexts/`.

**Coverage**: 81.43% ✅

**Tests**: `DataCacheContext.test.jsx`
- Provider rendering and hook validation
- Cache TTL management (SHORT: 2min, MEDIUM: 5min, LONG: 15min)
- Data fetching with cache-first strategy
- Force refresh functionality
- Cache invalidation
- Error handling with fallback to cached data

### 4. Component Tests (68 tests)

Tests for reusable UI components in `src/components/`.

**Coverage**: 98.14% ✅

#### BottomNav (29 tests) - 100% coverage
- Renders 4 navigation items (Arabic RTL)
- Active state highlighting
- Navigation functionality
- Notification badge display
- Edge cases (undefined/negative counts)

#### MemberSearchField (20 tests) - 96.36% coverage
- Debounced search (300ms)
- Search results dropdown
- Member selection
- Error handling
- Click outside to close

#### NotificationPrompt (19 tests) - 100% coverage
- Visibility logic (checks permissions, support, dismissal cooldown)
- 2-second display delay
- Enable/dismiss flows
- Success/error states
- Integration with pushNotificationService

### 5. Integration Tests

Multi-component and page-level integration tests.

#### LoginFlow.test.jsx
- Phone number entry and validation
- OTP sending via WhatsApp
- OTP verification
- Complete authentication flow
- Error handling

#### DashboardIntegration.test.jsx
- Dashboard data loading with cache
- Pull-to-refresh functionality
- Integration with BottomNav
- Quick actions navigation
- Recent activity and news display

#### NavigationFlow.test.jsx
- Navigation between pages
- Cache persistence across navigation
- BottomNav active state
- Complete user journeys

---

## Writing Tests

### Best Practices

1. **Use descriptive test names**
   ```javascript
   it('should fetch member profile data successfully', async () => {})
   // Better than: it('works', async () => {})
   ```

2. **Follow AAA pattern** (Arrange, Act, Assert)
   ```javascript
   it('should update notification settings', async () => {
     // Arrange
     const settings = { email_notifications: true }

     // Act
     const result = await memberService.updateNotificationSettings(settings)

     // Assert
     expect(result.success).toBe(true)
   })
   ```

3. **Mock external dependencies**
   ```javascript
   vi.mock('../../src/services', () => ({
     memberService: {
       getMyData: vi.fn(),
     },
   }))
   ```

4. **Use waitFor for async operations**
   ```javascript
   await waitFor(() => {
     expect(screen.getByText('محمد أحمد')).toBeDefined()
   }, { timeout: 500 })
   ```

5. **Test user interactions**
   ```javascript
   const button = screen.getByText('إرسال')
   fireEvent.click(button)
   ```

### Component Testing Pattern

```javascript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import MyComponent from '../../src/components/MyComponent'

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(
      <BrowserRouter>
        <MyComponent />
      </BrowserRouter>
    )

    expect(screen.getByText('Expected Text')).toBeDefined()
  })
})
```

### Service Testing Pattern

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import myService from '../../src/services/myService'

describe('myService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call API endpoint correctly', async () => {
    const result = await myService.getData()
    expect(result).toBeDefined()
  })
})
```

---

## CI/CD Integration

### GitHub Actions Workflow

Automated testing runs on:
- **Push** to `main`, `develop`, or feature branches
- **Pull Requests** to `main` or `develop`

**Workflow**: `.github/workflows/mobile-pwa-tests.yml`

### Jobs

1. **Test Job**
   - Runs all unit tests
   - Runs integration tests (optional)
   - Generates coverage report
   - Checks coverage thresholds
   - Uploads coverage to Codecov
   - Comments PR with coverage report

2. **Lint Job**
   - Runs ESLint checks
   - Continues on error (warnings only)

### Coverage Gates

Tests will **fail** if coverage drops below:
- **Statements**: 70%
- **Branches**: 60%
- **Functions**: 70%
- **Lines**: 70%

### PR Comments

GitHub Actions automatically comments on PRs with:
- Coverage percentages for each metric
- Comparison to thresholds
- Pass/fail status

---

## Troubleshooting

### Common Issues

#### 1. Tests timing out

**Problem**: Tests exceed default timeout (5s)

**Solution**: Increase timeout for specific tests
```javascript
it('should handle slow operation', async () => {
  // test code
}, { timeout: 10000 }) // 10 seconds
```

#### 2. MSW handler not matching

**Problem**: API call not intercepted by MSW

**Solution**: Check handler URL and HTTP method
```javascript
// Ensure exact match
http.get('https://api.alshailfund.com/api/members/profile', ...)
```

#### 3. React act() warnings

**Problem**: State updates not wrapped in act()

**Solution**: Use act() for state changes
```javascript
await act(async () => {
  fireEvent.click(button)
})
```

#### 4. localStorage not defined

**Problem**: Tests fail due to missing localStorage

**Solution**: Already configured in `tests/setup.js`

#### 5. Module not found

**Problem**: Import path issues

**Solution**: Use relative paths from test file
```javascript
import Component from '../../src/components/Component'
```

### Debug Mode

Run tests with additional logging:

```bash
# Verbose output
npm test -- --run --reporter=verbose

# Watch specific file
npm test -- path/to/test.js

# Run single test
npm test -- path/to/test.js -t "test name"
```

---

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [MSW Documentation](https://mswjs.io/docs/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

## Contributing

When adding new features:

1. ✅ Write tests for new services/components
2. ✅ Ensure coverage meets thresholds
3. ✅ Run tests locally before pushing
4. ✅ Check CI/CD passes on PR
5. ✅ Update this documentation if needed

---

**Last Updated**: January 2026
**Test Count**: 196 passing tests
**Overall Coverage**: >70% (target areas >80-98%)
