# Tasks: Admin Sidebar Accessibility Enhancement

**Input**: Design documents from `/specs/002-sidebar-accessibility/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: Not included - this is a CSS styling change. Verification is visual/manual per quickstart.md.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

**Target File**: `alshuail-admin-arabic/src/components/StyledDashboard.tsx`

This is a single-file modification. All style changes occur within the `styles` object (lines 325-500).

---

## Phase 1: Setup (Preparation)

**Purpose**: Prepare workspace and understand current state

- [x] T001 Create feature branch `002-sidebar-accessibility` from main
- [x] T002 Start development server with `npm start` in `alshuail-admin-arabic/`
- [x] T003 Review current sidebar styles in `alshuail-admin-arabic/src/components/StyledDashboard.tsx` (lines 325-500)

---

## Phase 2: Foundational (Base Styling Changes)

**Purpose**: Apply core styling changes that ALL user stories depend on

**CRITICAL**: These changes enable all three user stories

- [x] T004 Update `styles.sidebar` background from `#1e3a5f` to `linear-gradient(to bottom, #eff6ff, #dbeafe)` in `alshuail-admin-arabic/src/components/StyledDashboard.tsx:327`
- [x] T005 Update `styles.sidebar` width from `220px` to `240px` to accommodate larger text in `alshuail-admin-arabic/src/components/StyledDashboard.tsx:326`
- [x] T006 Add `borderLeft: '1px solid #bfdbfe'` to `styles.sidebar` in `alshuail-admin-arabic/src/components/StyledDashboard.tsx`
- [x] T007 Update `styles.sidebarMobile` background from `#1e3a5f` to `linear-gradient(to bottom, #eff6ff, #dbeafe)` in `alshuail-admin-arabic/src/components/StyledDashboard.tsx:358`
- [x] T008 Update `styles.menuIcon` to add `display: 'none'` to hide all icons in `alshuail-admin-arabic/src/components/StyledDashboard.tsx:474-478`

**Checkpoint**: Light gradient background visible, icons hidden. Foundation ready for user story implementation.

---

## Phase 3: User Story 1 - Elderly Financial Manager Reads Menu Items (Priority: P1) MVP

**Goal**: Ensure all menu text is large enough to read from arm's length without strain

**Independent Test**: Open admin dashboard → verify menu text is clearly readable at arm's length → text appears noticeably larger than before

### Implementation for User Story 1

- [x] T009 [US1] Update `styles.menuItem` fontSize from `14px` to `18px` in `alshuail-admin-arabic/src/components/StyledDashboard.tsx:399`
- [x] T010 [US1] Update `styles.menuItem` fontWeight from `500` to `600` (semibold) in `alshuail-admin-arabic/src/components/StyledDashboard.tsx:400`
- [x] T011 [US1] Update `styles.menuItem` color from `rgba(255, 255, 255, 0.8)` to `#334155` (slate-700) in `alshuail-admin-arabic/src/components/StyledDashboard.tsx:395`
- [x] T012 [US1] Update `styles.menuItemLabel` fontSize from `14px` to `18px` in `alshuail-admin-arabic/src/components/StyledDashboard.tsx:428`

**Checkpoint**: At this point, User Story 1 should be fully functional - menu items readable at arm's length

---

## Phase 4: User Story 2 - Administrator Identifies Active Page (Priority: P2)

**Goal**: Active menu item is clearly distinguishable with high contrast

**Independent Test**: Navigate to any admin page → verify active menu item has distinct blue background with white text → immediately obvious without inspection

### Implementation for User Story 2

- [x] T013 [US2] Update `styles.menuItemActive` background from `rgba(255, 255, 255, 0.15)` to `#2563eb` (blue-600) in `alshuail-admin-arabic/src/components/StyledDashboard.tsx:442`
- [x] T014 [US2] Ensure `styles.menuItemActive` color remains `#ffffff` for contrast in `alshuail-admin-arabic/src/components/StyledDashboard.tsx:443`
- [x] T015 [US2] Update `styles.menuItemActive` borderRadius to `8px` for consistent rounded corners in `alshuail-admin-arabic/src/components/StyledDashboard.tsx:444`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - readable text with clear active state

---

## Phase 5: User Story 3 - Administrator Hovers Over Menu Items (Priority: P3)

**Goal**: Smooth hover feedback on menu items

**Independent Test**: Hover mouse over each sidebar item → observe smooth transition to light blue background → transition back when mouse leaves

### Implementation for User Story 3

- [x] T016 [US3] Add `transition: 'all 0.15s ease'` to `styles.menuItem` for smooth hover effects in `alshuail-admin-arabic/src/components/StyledDashboard.tsx`
- [x] T017 [US3] Update `styles.menuItemHover` to set `background: '#dbeafe'` (blue-100) in `alshuail-admin-arabic/src/components/StyledDashboard.tsx:458-460`
- [x] T018 [US3] Update `styles.menuItemHover` to set `color: '#1e40af'` (blue-800) in `alshuail-admin-arabic/src/components/StyledDashboard.tsx:458-460`
- [x] T019 [US3] Verify hover state is applied on mouse enter events in the JSX rendering (lines 4006-4030)

**Checkpoint**: All three user stories should now be independently functional

---

## Phase 6: Polish & Verification

**Purpose**: Final verification and deployment

- [ ] T020 Verify FR-001: All menu items use 18px font size
- [ ] T021 Verify FR-002: Section headers use 20px font size (if any exist)
- [ ] T022 Verify FR-003: Light gradient background (blue-50 to blue-100)
- [ ] T023 Verify FR-004: No icons visible in sidebar
- [ ] T024 Verify FR-005: Active state has distinct contrast (blue-600)
- [ ] T025 Verify FR-006: Hover effects respond smoothly (≤150ms)
- [ ] T026 Verify FR-007: RTL layout preserved (text aligned right)
- [ ] T027 Verify FR-008: All navigation links work correctly (test each menu item)
- [ ] T028 Verify FR-010: WCAG AA contrast ratio met (use accessibility tool)
- [x] T029 Run production build with `npm run build:fast` in `alshuail-admin-arabic/`
- [x] T030 Deploy to Cloudflare Pages with `npx wrangler pages deploy build --project-name=alshuail-admin`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can proceed sequentially in priority order (P1 → P2 → P3)
  - Each story builds on prior styling but is independently testable
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after US1 - Active state styling independent
- **User Story 3 (P3)**: Can start after US2 - Hover effects independent

### Within Each User Story

- All tasks modify the same file but different style objects
- Tasks within a story should be done sequentially (same file)
- Story complete before moving to next priority

### Parallel Opportunities

- T004-T008 (Foundational) can be done together (different style objects)
- T009-T012 (US1) are sequential (same file section)
- T013-T015 (US2) are sequential (same style object)
- T016-T019 (US3) are sequential (same style object)
- T020-T028 (Verification) can be done in parallel

---

## Parallel Example: Foundational Phase

```bash
# These modify different style objects in the same file:
T004: styles.sidebar.background
T005: styles.sidebar.width
T006: styles.sidebar.borderLeft
T007: styles.sidebarMobile.background
T008: styles.menuIcon.display

# Can be combined into a single edit session
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T008)
3. Complete Phase 3: User Story 1 (T009-T012)
4. **STOP and VALIDATE**: Test readability at arm's length
5. If acceptable, deploy MVP

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → **MVP Complete!**
3. Add User Story 2 → Test active state → Deploy
4. Add User Story 3 → Test hover effects → Deploy
5. Each story adds value without breaking previous stories

### Single Developer Strategy

Since this is a single-file modification:
1. Complete all tasks in order (T001-T030)
2. Single commit with all style changes
3. Deploy and verify

---

## Notes

- All tasks modify `alshuail-admin-arabic/src/components/StyledDashboard.tsx`
- [Story] labels map tasks to specific user stories for traceability
- Each user story is independently testable per spec.md
- Verification tasks (T020-T028) map directly to functional requirements
- No tests included - visual verification per quickstart.md
- Commit after each phase for clean rollback points
