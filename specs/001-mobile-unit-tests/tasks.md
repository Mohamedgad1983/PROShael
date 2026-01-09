# Tasks: Comprehensive Unit Testing for alshuail-mobile

**Input**: Design documents from `/specs/001-mobile-unit-tests/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

All paths relative to `alshuail-mobile/` directory:
- Source code: `src/`
- Tests: `tests/`
- Config: root of `alshuail-mobile/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Testing framework initialization and basic structure

- [X] T001 Install testing dependencies (vitest, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event, jsdom, msw, @vitest/coverage-v8) in alshuail-mobile/package.json
- [X] T002 Create Vitest configuration file in alshuail-mobile/vitest.config.js
- [X] T003 [P] Create test directory structure: alshuail-mobile/tests/{setup.js,mocks/,unit/,components/}
- [X] T004 [P] Add test scripts to alshuail-mobile/package.json (test, test:run, test:coverage, test:ui)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core test infrastructure that MUST be complete before ANY user story tests can be written

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Create global test setup file in alshuail-mobile/tests/setup.js with jsdom environment, localStorage mock, cleanup hooks
- [X] T006 Create MSW server instance in alshuail-mobile/tests/mocks/server.js
- [X] T007 Create base MSW handlers file in alshuail-mobile/tests/mocks/handlers.js with API_URL constant
- [X] T008 [P] Create mock data file for members in alshuail-mobile/tests/mocks/data/members.json
- [X] T009 [P] Create mock data file for payments in alshuail-mobile/tests/mocks/data/payments.json
- [X] T010 [P] Create mock data file for subscriptions in alshuail-mobile/tests/mocks/data/subscriptions.json
- [X] T011 [P] Create mock data file for notifications in alshuail-mobile/tests/mocks/data/notifications.json
- [X] T012 [P] Create mock data file for family tree in alshuail-mobile/tests/mocks/data/familyTree.json
- [X] T013 [P] Create mock data file for initiatives in alshuail-mobile/tests/mocks/data/initiatives.json
- [X] T014 [P] Create mock data file for news in alshuail-mobile/tests/mocks/data/news.json
- [X] T015 [P] Create mock data file for events in alshuail-mobile/tests/mocks/data/events.json
- [X] T016 Create mock factories in alshuail-mobile/tests/mocks/factories.js (createMockMember, createMockPayment, etc.)
- [X] T017 Create test render helpers in alshuail-mobile/tests/utils/renderWithProviders.jsx
- [X] T018 Verify test setup works by running npm test with a simple sanity test

**Checkpoint**: Foundation ready - user story test implementation can now begin in parallel

---

## Phase 3: User Story 1 - Service Layer Testing (Priority: P1) 🎯 MVP

**Goal**: Comprehensive unit tests for all 11 service modules achieving 80% code coverage

**Independent Test**: Run `npm test -- --coverage src/services/` to verify all service tests pass with 80%+ coverage

### MSW Handlers for Services

- [X] T019 [P] [US1] Add auth endpoint handlers (/otp/send, /otp/verify, /auth/mobile-login, /auth/logout, /auth/change-password) to alshuail-mobile/tests/mocks/handlers.js
- [X] T020 [P] [US1] Add member endpoint handlers (/members/profile, /members/search, /members/balance) to alshuail-mobile/tests/mocks/handlers.js
- [X] T021 [P] [US1] Add payment endpoint handlers (/payments/subscription, /payments/diya, /payments/initiative, /payments/bank-transfer, /payments/history) to alshuail-mobile/tests/mocks/handlers.js
- [X] T022 [P] [US1] Add subscription endpoint handlers (/subscriptions/plans, /subscriptions/my, /subscriptions/statement) to alshuail-mobile/tests/mocks/handlers.js
- [X] T023 [P] [US1] Add family tree endpoint handlers (/family-tree/full, /family-tree/branches, /family-tree/branches/:id/members) to alshuail-mobile/tests/mocks/handlers.js
- [X] T024 [P] [US1] Add notification endpoint handlers (/notifications, /notifications/:id/read, /notifications/read-all, /notifications/unread-count, /notifications/register-device) to alshuail-mobile/tests/mocks/handlers.js
- [X] T025 [P] [US1] Add initiative endpoint handlers (/initiatives, /initiatives/:id) to alshuail-mobile/tests/mocks/handlers.js
- [X] T026 [P] [US1] Add news endpoint handlers (/news, /news/:id) to alshuail-mobile/tests/mocks/handlers.js
- [X] T027 [P] [US1] Add events endpoint handlers (/events, /events/:id/rsvp) to alshuail-mobile/tests/mocks/handlers.js

### Service Test Implementation

- [X] T028 [P] [US1] Create authService tests in alshuail-mobile/tests/unit/services/authService.test.js (sendOTP, verifyOTP, login, logout, changePassword - 8 test cases including error handling)
- [X] T029 [P] [US1] Create memberService tests in alshuail-mobile/tests/unit/services/memberService.test.js (getProfile, updateProfile, uploadAvatar, getBalance, getMyData - 10 test cases including error handling)
- [X] T030 [P] [US1] Create paymentService tests in alshuail-mobile/tests/unit/services/paymentService.test.js (paySubscription, payDiya, payInitiative, submitBankTransfer, getPaymentHistory, searchMembers - 12 test cases including error handling)
- [X] T031 [P] [US1] Create subscriptionService tests in alshuail-mobile/tests/unit/services/subscriptionService.test.js (getPlans, getMySubscriptions, getYearlyStatus, getPaymentHistory, getStatement - 8 test cases including error handling)
- [X] T032 [P] [US1] Create familyTreeService tests in alshuail-mobile/tests/unit/services/familyTreeService.test.js (getFullTree, getBranches, getMembers, searchMembers, getMembersByBranch - 8 test cases including error handling)
- [X] T033 [P] [US1] Create notificationService tests in alshuail-mobile/tests/unit/services/notificationService.test.js (getMyNotifications, markAsRead, markAllAsRead, getUnreadCount, registerDevice - 6 test cases including error handling)
- [X] T034 [P] [US1] Create pushNotificationService tests in alshuail-mobile/tests/unit/services/pushNotificationService.test.js (requestPermission, getToken, onMessage with Firebase mocks - 6 test cases including error handling)
- [X] T035 [P] [US1] Create initiativeService tests in alshuail-mobile/tests/unit/services/initiativeService.test.js (getAllInitiatives, getInitiativeById, contribute, getMyContributions - 6 test cases including error handling)
- [X] T036 [P] [US1] Create newsService tests in alshuail-mobile/tests/unit/services/newsService.test.js (getNews, getNewsById, getNewsByCategory, reactToNews - 5 test cases including error handling)
- [X] T037 [P] [US1] Create eventsService tests in alshuail-mobile/tests/unit/services/eventsService.test.js (getAllEvents, getUpcomingEvents, getEventById, updateRSVP - 6 test cases including error handling)
- [ ] T038 [US1] Run coverage report for services and verify 80% threshold: npm test -- --coverage --coverage.include=src/services/

**Checkpoint**: User Story 1 complete - all 11 services have tests with 80%+ coverage

---

## Phase 4: User Story 2 - Utility Functions Testing (Priority: P1)

**Goal**: Comprehensive unit tests for API utility module achieving 70% code coverage

**Independent Test**: Run `npm test -- --coverage src/utils/` to verify utility tests pass with 70%+ coverage

### Utility Test Implementation

- [ ] T039 [US2] Create api.js tests in alshuail-mobile/tests/unit/utils/api.test.js covering:
  - setAuthToken stores token in localStorage and sets axios header
  - getAuthToken retrieves token from localStorage
  - isAuthenticated returns true when token exists
  - isAuthenticated returns false when no token
  - Request interceptor adds Authorization header
  - Response interceptor handles 401 and redirects to login
  - Request timeout is 30 seconds
  - FormData requests do not override Content-Type header
  (8 test cases total)
- [ ] T040 [US2] Run coverage report for utilities and verify 70% threshold: npm test -- --coverage --coverage.include=src/utils/

**Checkpoint**: User Story 2 complete - API utility tests at 70%+ coverage

---

## Phase 5: User Story 3 - Context/State Management Testing (Priority: P2)

**Goal**: Unit tests for React contexts achieving 60% code coverage

**Independent Test**: Run `npm test -- --coverage src/contexts/` to verify context tests pass with 60%+ coverage

### Context Test Implementation

- [ ] T041 [US3] Create DataCacheContext tests in alshuail-mobile/tests/unit/contexts/DataCacheContext.test.jsx covering:
  - Provider renders children correctly
  - fetchDashboard caches data with MEDIUM TTL
  - fetchProfile returns cached data within TTL
  - fetchProfile fetches new data when cache expired
  - forceRefresh bypasses cache
  - invalidateCache clears specific cache key
  - clearCache clears all cached data
  - getCacheStatus returns correct freshness state
  - Error in fetch propagates to context state
  - Multiple components receive same cached data
  (10 test cases total)
- [ ] T042 [US3] Run coverage report for contexts and verify 60% threshold: npm test -- --coverage --coverage.include=src/contexts/

**Checkpoint**: User Story 3 complete - context tests at 60%+ coverage

---

## Phase 6: User Story 4 - Component Unit Testing (Priority: P2)

**Goal**: Unit tests for 3 reusable UI components achieving 60% code coverage

**Independent Test**: Run `npm test -- --coverage src/components/` to verify component tests pass with 60%+ coverage

### Component Test Implementation

- [ ] T043 [P] [US4] Create BottomNav tests in alshuail-mobile/tests/components/BottomNav.test.jsx covering:
  - Renders navigation container
  - Displays 4 navigation items (Dashboard, Payments, Notifications, Profile)
  - Active route is highlighted
  - Notification badge shows unread count
  - RTL layout renders correctly
  (5 test cases total)
- [ ] T044 [P] [US4] Create MemberSearchField tests in alshuail-mobile/tests/components/MemberSearchField.test.jsx covering:
  - Renders search input with placeholder
  - Typing triggers search callback after 300ms debounce
  - Search results display member name and number
  - Selecting member calls onSelect callback
  - Clear button resets search
  - Selected member shows card with details
  (6 test cases total)
- [ ] T045 [P] [US4] Create NotificationPrompt tests in alshuail-mobile/tests/components/NotificationPrompt.test.jsx covering:
  - Renders prompt after 2 second delay
  - Enable button requests notification permission
  - Dismiss button closes prompt
  - Dismissal sets 7-day cooldown in localStorage
  - Does not show if previously dismissed within cooldown
  (5 test cases total)
- [ ] T046 [US4] Run coverage report for components and verify 60% threshold: npm test -- --coverage --coverage.include=src/components/

**Checkpoint**: User Story 4 complete - component tests at 60%+ coverage

---

## Phase 7: User Story 5 - Page Component Integration Testing (Priority: P3)

**Goal**: Integration tests for critical page components verifying user flows

**Independent Test**: Run `npm test tests/pages/` to verify page integration tests pass

### Page Integration Test Implementation

- [ ] T047 [P] [US5] Create Login page tests in alshuail-mobile/tests/pages/Login.test.jsx covering:
  - Renders phone input and submit button
  - Submitting valid phone sends OTP
  - OTP verification with valid code navigates to dashboard
  - Invalid OTP shows error message
  (4 test cases total)
- [ ] T048 [P] [US5] Create Dashboard page tests in alshuail-mobile/tests/pages/Dashboard.test.jsx covering:
  - Renders with user data from context
  - Displays member name in Arabic
  - Shows balance correctly formatted
  - Quick action buttons navigate correctly
  (4 test cases total)
- [ ] T049 [P] [US5] Create FamilyTree page tests in alshuail-mobile/tests/pages/FamilyTree.test.jsx covering:
  - Fetches and displays family branches
  - Branch click navigates to branch detail
  - Search filters branches
  (3 test cases total)
- [ ] T050 [P] [US5] Create Payments page tests in alshuail-mobile/tests/pages/Payments.test.jsx covering:
  - Displays payment options (subscription, diya, initiative)
  - Navigation to payment type works
  - Payment history shows past transactions
  (3 test cases total)
- [ ] T051 [US5] Run all page integration tests: npm test tests/pages/

**Checkpoint**: User Story 5 complete - critical user flows have integration tests

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: CI/CD integration and final validation

- [ ] T052 Create GitHub Actions workflow in alshuail-mobile/.github/workflows/test.yml with:
  - Trigger on push and pull_request
  - Node.js 18 setup
  - npm ci and npm test --coverage
  - Coverage threshold enforcement (70% global)
  - Artifact upload for coverage reports
- [ ] T053 Update alshuail-mobile/package.json with coverage thresholds in vitest config
- [ ] T054 Run full test suite and verify all tests pass: npm run test:run
- [ ] T055 Generate coverage report and verify all targets met: npm run test:coverage
- [ ] T056 Verify test suite completes in under 5 minutes
- [ ] T057 Validate quickstart.md instructions work for new developer setup

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 (P1) and US2 (P1) can proceed in parallel
  - US3 (P2) and US4 (P2) can proceed in parallel (after or with US1/US2)
  - US5 (P3) can proceed after any P1/P2 story
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 - Services (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **US2 - Utilities (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **US3 - Contexts (P2)**: Can start after Foundational (Phase 2) - May use service mocks from US1
- **US4 - Components (P2)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **US5 - Pages (P3)**: Can start after Foundational (Phase 2) - Benefits from US1-US4 being complete

### Parallel Opportunities

**Within Phase 1 (Setup):**
- T003 and T004 can run in parallel

**Within Phase 2 (Foundational):**
- T008-T015 (mock data files) can all run in parallel

**Within Phase 3 (US1 - Services):**
- T019-T027 (MSW handlers) can all run in parallel
- T028-T037 (service tests) can all run in parallel

**Within Phase 6 (US4 - Components):**
- T043-T045 (component tests) can all run in parallel

**Within Phase 7 (US5 - Pages):**
- T047-T050 (page tests) can all run in parallel

**Cross-Phase:**
- Once Foundational completes, US1 and US2 can run in parallel
- US3 and US4 can run in parallel with or after US1/US2

---

## Parallel Example: User Story 1 (Services)

```bash
# Launch all MSW handlers in parallel:
Task: "T019 Add auth endpoint handlers to handlers.js"
Task: "T020 Add member endpoint handlers to handlers.js"
Task: "T021 Add payment endpoint handlers to handlers.js"
Task: "T022 Add subscription endpoint handlers to handlers.js"
Task: "T023 Add family tree endpoint handlers to handlers.js"
Task: "T024 Add notification endpoint handlers to handlers.js"
Task: "T025 Add initiative endpoint handlers to handlers.js"
Task: "T026 Add news endpoint handlers to handlers.js"
Task: "T027 Add events endpoint handlers to handlers.js"

# Then launch all service tests in parallel:
Task: "T028 Create authService tests"
Task: "T029 Create memberService tests"
Task: "T030 Create paymentService tests"
Task: "T031 Create subscriptionService tests"
Task: "T032 Create familyTreeService tests"
Task: "T033 Create notificationService tests"
Task: "T034 Create pushNotificationService tests"
Task: "T035 Create initiativeService tests"
Task: "T036 Create newsService tests"
Task: "T037 Create eventsService tests"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Services - 80% coverage)
4. **STOP and VALIDATE**: Run `npm test -- --coverage` - services should have 80%+ coverage
5. This alone provides significant regression protection for the most critical code

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 (Services) → 80% service coverage → Major risk reduction (MVP!)
3. Add User Story 2 (Utilities) → 70% utility coverage → API layer protected
4. Add User Story 3 (Contexts) → 60% context coverage → State management protected
5. Add User Story 4 (Components) → 60% component coverage → UI layer protected
6. Add User Story 5 (Pages) → Critical flows tested → End-to-end confidence
7. Each story adds coverage without breaking previous tests

### Time-Constrained Prioritization

If time is limited (per spec clarification):
1. **Priority 1**: Setup + Foundational + US1 (Services) - HIGHEST VALUE
2. **Priority 2**: US2 (Utilities) - Quick win, shared logic
3. **Priority 3**: US3/US4 (Contexts/Components) - Important but lower risk
4. **Priority 4**: US5 (Pages) - Nice to have

---

## Summary

| Phase | Tasks | Parallelizable | Coverage Target |
|-------|-------|----------------|-----------------|
| Setup | 4 | 2 | N/A |
| Foundational | 14 | 8 | N/A |
| US1 - Services | 20 | 19 | 80% |
| US2 - Utilities | 2 | 0 | 70% |
| US3 - Contexts | 2 | 0 | 60% |
| US4 - Components | 4 | 3 | 60% |
| US5 - Pages | 5 | 4 | N/A |
| Polish | 6 | 0 | Global 70% |
| **Total** | **57** | **36** | |

**Test Cases**: ~109 total (75 services + 8 utilities + 10 contexts + 16 components + ~14 pages)

---

## Notes

- [P] tasks = different files, no dependencies, can be executed simultaneously
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Run coverage after each story phase to verify targets
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All paths assume working directory is `alshuail-mobile/`
