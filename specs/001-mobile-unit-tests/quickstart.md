# Quickstart: Unit Testing for alshuail-mobile

**Feature**: Comprehensive Unit Testing
**Date**: 2026-01-09
**Time to Setup**: ~10 minutes

## Prerequisites

- Node.js 18+
- npm 9+
- alshuail-mobile project cloned

## Quick Setup

### 1. Install Dependencies

```bash
cd alshuail-mobile
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom msw @vitest/coverage-v8
```

### 2. Create Vitest Configuration

Create `vitest.config.js` in alshuail-mobile root:

```javascript
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.js'

export default mergeConfig(viteConfig, defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.{test,spec}.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/main.jsx', 'src/App.jsx'],
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 70,
        lines: 70
      }
    }
  }
}))
```

### 3. Create Test Setup File

Create `tests/setup.js`:

```javascript
import '@testing-library/jest-dom'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from './mocks/server'

// Start MSW server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

// Reset handlers after each test
afterEach(() => {
  cleanup()
  server.resetHandlers()
})

// Close server after all tests
afterAll(() => server.close())

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })
```

### 4. Create MSW Server

Create `tests/mocks/server.js`:

```javascript
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

Create `tests/mocks/handlers.js`:

```javascript
import { http, HttpResponse } from 'msw'

const API_URL = 'https://api.alshailfund.com/api'

export const handlers = [
  // Auth endpoints
  http.post(`${API_URL}/otp/send`, () => {
    return HttpResponse.json({ success: true, message: 'OTP sent' })
  }),

  http.post(`${API_URL}/otp/verify`, () => {
    return HttpResponse.json({
      success: true,
      token: 'mock-jwt-token',
      user: {
        id: 1,
        membership_number: 'M001',
        full_name_ar: 'محمد أحمد الشعيل',
        phone: '96512345678'
      }
    })
  }),

  // Member endpoints
  http.get(`${API_URL}/members/profile`, () => {
    return HttpResponse.json({
      id: 1,
      membership_number: 'M001',
      full_name_ar: 'محمد أحمد الشعيل',
      full_name_en: 'Mohammed Ahmed Al-Shuail',
      balance: '1500.00'
    })
  })
]
```

### 5. Add npm Scripts

Update `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
}
```

### 6. Write Your First Test

Create `tests/unit/services/authService.test.js`:

```javascript
import { describe, it, expect } from 'vitest'
import { sendOTP } from '../../../src/services/authService'

describe('authService', () => {
  describe('sendOTP', () => {
    it('sends OTP successfully to valid phone', async () => {
      const result = await sendOTP('96512345678')
      expect(result.success).toBe(true)
    })
  })
})
```

### 7. Run Tests

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run with coverage
npm run test:coverage
```

## Directory Structure

After setup, your test directory should look like:

```
alshuail-mobile/
├── tests/
│   ├── setup.js
│   ├── mocks/
│   │   ├── server.js
│   │   ├── handlers.js
│   │   └── data/
│   ├── unit/
│   │   ├── services/
│   │   ├── utils/
│   │   └── contexts/
│   └── components/
├── vitest.config.js
└── package.json (updated)
```

## Common Commands

| Command | Purpose |
|---------|---------|
| `npm test` | Run tests in watch mode |
| `npm run test:run` | Run tests once and exit |
| `npm run test:coverage` | Run with coverage report |
| `npm run test:ui` | Open Vitest UI in browser |

## Troubleshooting

### "Cannot find module" errors

Ensure your vitest.config.js includes the correct path aliases from vite.config.js.

### MSW handlers not matching

Check that your API_URL matches the base URL in your services. Use `server.listen({ onUnhandledRequest: 'warn' })` to debug.

### localStorage undefined

The setup.js should mock localStorage. If issues persist, ensure setup.js is listed in `setupFiles`.

### Coverage not including files

Check the `include` and `exclude` patterns in coverage config match your source structure.

## Next Steps

1. Complete all service tests (P1)
2. Add utility tests (P1)
3. Add component tests (P2)
4. Configure CI/CD pipeline
5. Verify coverage thresholds pass
