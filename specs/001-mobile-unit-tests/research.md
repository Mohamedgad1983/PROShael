# Research: Unit Testing Infrastructure for alshuail-mobile

**Feature**: Comprehensive Unit Testing for alshuail-mobile
**Date**: 2026-01-09
**Status**: Complete

## Executive Summary

This research evaluates testing frameworks, mocking strategies, and best practices for implementing comprehensive unit tests in the alshuail-mobile React + Vite PWA application. The recommended stack is **Vitest + React Testing Library + MSW** based on project compatibility, performance, and maintainability.

## Current State Analysis

### Project Architecture

The alshuail-mobile application follows a service-oriented architecture:

```
src/
├── services/     # 11 modules - Business logic layer
├── utils/        # 1 module - API configuration
├── contexts/     # 2 providers - State management
├── components/   # 3 components - Reusable UI
└── pages/        # 22 pages - Route handlers
```

### Technology Stack

| Technology | Version | Testing Implications |
|------------|---------|---------------------|
| React | 18.2.0 | Concurrent mode, hooks, Suspense boundaries |
| Vite | 5.0.0 | ESM-first, HMR, fast cold starts |
| Axios | 1.6.0 | HTTP client for API calls |
| Firebase | 12.6.0 | Push notifications (FCM) |
| React Router | 6.20.0 | Client-side routing |
| Tailwind CSS | 3.3.5 | Utility-first styling |

### Current Testing State

- **No existing tests** - Zero test files, no testing dependencies
- **No coverage tracking** - No baseline metrics available
- **No CI/CD tests** - Deployment not gated on test results

## Testing Framework Evaluation

### Option 1: Vitest (Recommended)

**Pros:**
- Native Vite integration - Uses same config, instant transforms
- Jest-compatible API - Familiar syntax, easy migration paths
- Built-in coverage - c8/istanbul integration out of the box
- ESM-first - Matches project's module system
- Watch mode - Fast feedback during development
- In-source testing - Can write tests alongside code if desired

**Cons:**
- Newer ecosystem - Some edge cases less documented
- Different from Jest - Team may need brief onboarding

**Configuration Complexity:** Low - Works with Vite config

### Option 2: Jest

**Pros:**
- Industry standard - Wide adoption, extensive documentation
- Large ecosystem - Mature plugins and integrations
- Snapshot testing - Built-in snapshot capabilities

**Cons:**
- ESM challenges - Requires babel-jest or experimental flags for ESM
- Vite incompatibility - Needs separate configuration, slower transforms
- CJS assumptions - Default behavior assumes CommonJS

**Configuration Complexity:** Medium - Requires babel or SWC setup

### Option 3: Mocha + Chai

**Pros:**
- Flexible - Mix and match assertion libraries
- Stable - Long track record

**Cons:**
- Manual setup - No built-in mocking, coverage, or React support
- Less React-focused - Requires significant additional tooling
- ESM partial - Some plugins still CJS-only

**Configuration Complexity:** High - Manual assembly required

### Recommendation: Vitest

Vitest is the clear choice for this Vite-based project. It provides native integration, fast execution, and Jest-compatible API with minimal configuration.

## Component Testing Library Evaluation

### Option 1: React Testing Library (Recommended)

**Pros:**
- User-centric queries - Tests what users see and interact with
- Accessibility-first - Encourages accessible component design
- RTL support - Built-in directional text handling
- Official recommendation - Endorsed by React team
- Active maintenance - Regular updates, strong community

**Cons:**
- Learning curve - Different mental model than Enzyme
- No implementation access - Can't directly test state/props

**Best For:** Testing behavior, not implementation

### Option 2: Enzyme

**Pros:**
- Implementation access - Can test internal state and props
- Shallow rendering - Isolated component testing

**Cons:**
- React 18 incompatible - No official support for React 18
- Deprecated patterns - Encourages testing implementation details
- Maintenance concerns - Slow updates, uncertain future

**Not Recommended:** Incompatible with React 18

### Recommendation: React Testing Library

React Testing Library aligns with modern React practices and supports the project's React 18 version. Its accessibility-focused queries will help ensure RTL/Arabic compliance.

## API Mocking Strategy Evaluation

### Option 1: MSW (Mock Service Worker) - Recommended

**Pros:**
- Network-level interception - Most realistic mocking
- Browser + Node - Works in jsdom and real browsers
- REST handlers - Matches project's axios/REST architecture
- Reusable handlers - Centralized mock definitions
- Dev tools - Request inspection and debugging
- No implementation coupling - Tests don't depend on axios internals

**Cons:**
- Service worker complexity - Setup requires understanding SW lifecycle
- Slightly more setup - More boilerplate than axios-mock-adapter

**Sample Handler:**
```javascript
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.post('/api/otp/send', () => {
    return HttpResponse.json({ success: true, message: 'OTP sent' })
  }),
  http.get('/api/members/profile', () => {
    return HttpResponse.json({
      id: 1,
      full_name_ar: 'محمد أحمد الشعيل',
      balance: '1500.00'
    })
  })
]
```

### Option 2: axios-mock-adapter

**Pros:**
- Simple setup - Direct axios integration
- Lightweight - Minimal dependencies

**Cons:**
- Axios-coupled - Tests break if HTTP library changes
- Less realistic - Mocks at adapter level, not network
- Limited debugging - No request inspection tools

### Option 3: Nock

**Pros:**
- Mature library - Long track record
- Good documentation - Well-documented patterns

**Cons:**
- Node.js only - Doesn't work with jsdom/browser tests
- Not recommended - Incompatible with component testing in jsdom

### Recommendation: MSW

MSW provides the most realistic mocking at the network level, works with both unit and integration tests, and decouples tests from the HTTP client implementation.

## Coverage Strategy

### Coverage Targets by Module Type

| Module Type | Files | Complexity | Target | Rationale |
|-------------|-------|------------|--------|-----------|
| Services | 11 | High | 80% | Core business logic, API integration |
| Utilities | 1 | Medium | 70% | Shared functions, error handling |
| Contexts | 2 | Medium | 60% | State management, caching logic |
| Components | 3 | Low-Medium | 60% | UI behavior, user interactions |
| Pages | 22 | Low | N/A | Integration tests (P3) |

### Coverage Metrics

- **Line coverage**: Primary metric for pass/fail
- **Branch coverage**: Secondary, ensures conditionals tested
- **Function coverage**: Tertiary, ensures all exports tested

### Coverage Enforcement

```javascript
// vitest.config.js coverage thresholds
coverage: {
  thresholds: {
    statements: 70,
    branches: 60,
    functions: 70,
    lines: 70
  }
}
```

## RTL/Arabic Testing Considerations

### Text Direction Testing

```javascript
test('renders in RTL mode for Arabic', () => {
  render(<BottomNav />, { wrapper: RTLWrapper })
  expect(screen.getByRole('navigation')).toHaveAttribute('dir', 'rtl')
})
```

### Arabic Text Assertions

```javascript
test('displays Arabic member name', () => {
  render(<MemberCard member={mockMember} />)
  expect(screen.getByText(/محمد أحمد الشعيل/)).toBeInTheDocument()
})
```

### Currency/Date Formatting

```javascript
test('formats currency in Arabic locale', () => {
  render(<Balance amount={1500} />)
  expect(screen.getByText(/١٬٥٠٠/)).toBeInTheDocument() // Arabic numerals
})
```

## Test Organization Patterns

### Service Test Structure

```javascript
// tests/unit/services/authService.test.js
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { server } from '../../mocks/server'
import { http, HttpResponse } from 'msw'
import { sendOTP, verifyOTP, login } from '../../../src/services/authService'

describe('authService', () => {
  describe('sendOTP', () => {
    it('sends OTP to valid phone number', async () => {
      const result = await sendOTP('96512345678')
      expect(result.success).toBe(true)
    })

    it('handles invalid phone number', async () => {
      server.use(
        http.post('/api/otp/send', () => {
          return HttpResponse.json({ success: false, message: 'Invalid phone' }, { status: 400 })
        })
      )
      await expect(sendOTP('invalid')).rejects.toThrow()
    })
  })
})
```

### Component Test Structure

```javascript
// tests/components/BottomNav.test.jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import BottomNav from '../../src/components/BottomNav'

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

describe('BottomNav', () => {
  it('renders all navigation items', () => {
    renderWithRouter(<BottomNav />)
    expect(screen.getByRole('navigation')).toBeInTheDocument()
    expect(screen.getByText(/الرئيسية/)).toBeInTheDocument() // Dashboard
    expect(screen.getByText(/المدفوعات/)).toBeInTheDocument() // Payments
  })

  it('highlights active route', () => {
    renderWithRouter(<BottomNav />)
    // Implementation depends on current route
  })
})
```

## Dependencies to Install

### Required Dependencies

```json
{
  "devDependencies": {
    "vitest": "^2.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/user-event": "^14.0.0",
    "jsdom": "^24.0.0",
    "msw": "^2.0.0",
    "@vitest/coverage-v8": "^2.0.0"
  }
}
```

### Package Sizes

| Package | Size (gzipped) | Purpose |
|---------|----------------|---------|
| vitest | ~2.5MB | Test runner |
| @testing-library/react | ~50KB | Component testing |
| @testing-library/jest-dom | ~30KB | DOM matchers |
| @testing-library/user-event | ~20KB | User interactions |
| jsdom | ~1.5MB | DOM simulation |
| msw | ~100KB | API mocking |
| @vitest/coverage-v8 | ~500KB | Coverage reports |

**Total dev dependencies:** ~5MB (development only, not in production)

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Test Suite
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: alshuail-mobile

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: alshuail-mobile/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Run tests with coverage
        run: npm test -- --coverage

      - name: Upload coverage report
        uses: codecov/codecov-action@v3
        with:
          file: ./alshuail-mobile/coverage/lcov.info
```

### Blocking Deployment

Per spec clarification, tests **MUST** pass before deployment (blocking behavior).

```yaml
# In deployment workflow
jobs:
  deploy:
    needs: test  # Deployment depends on test job passing
    if: success()
```

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Firebase mocking complexity | Medium | High | Create dedicated Firebase mock module |
| localStorage in jsdom | Low | Medium | Use @testing-library/react's built-in handling |
| Arabic text encoding | Low | Medium | Use UTF-8 in all test files, regex for assertions |
| Coverage calculation variance | Low | Low | Set thresholds slightly below targets |
| CI/CD timeout | Low | Medium | Parallelize tests, set 10-minute timeout |

## Conclusion

The recommended testing stack for alshuail-mobile is:

1. **Vitest** - Test runner (native Vite integration)
2. **React Testing Library** - Component testing (user-centric)
3. **MSW** - API mocking (network-level)
4. **jsdom** - DOM environment
5. **@vitest/coverage-v8** - Coverage reporting

This combination provides fast execution, realistic testing, and excellent developer experience while meeting the coverage targets defined in the specification.

## References

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [MSW Documentation](https://mswjs.io/)
- [Testing React 18](https://react.dev/learn/testing)
