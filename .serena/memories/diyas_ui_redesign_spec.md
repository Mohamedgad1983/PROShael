# Diyas UI Performance Redesign - Design Specification

## Current Problems
1. **Bundle**: 7.5 MB vendor.js (too large)
2. **Data**: Loading all 852 contributions eagerly
3. **Rendering**: No memoization, 278 rows rendered at once
4. **UX**: Slow loading, poor mobile experience

## Solution Summary

### Performance Targets
- Bundle: 7.5MB → 2MB (73% reduction)
- Load time: 5s → 1.5s (70% faster)
- Re-renders: 200ms → 50ms (75% faster)
- Modal: 2s → 100ms (95% faster)

### Implementation Phases
**Phase 1** (Quick Wins): React.memo, useMemo, pagination UI
**Phase 2** (Backend): API pagination, remove embedded data
**Phase 3** (Advanced): Virtual scrolling, code splitting
**Phase 4** (Bundle): Tree shaking, dynamic imports

## Key Design Changes
1. Remove financial_contributions from /api/diyas response
2. Add pagination to /api/diya/:id/contributors (50 per page)
3. Memoize DiyaCard and statistics calculations
4. Lazy load ContributorsModal component
5. Skeleton loading instead of spinner

## Documentation
Full spec: claudedocs/diyas-ui-performance-design-2025-10-16.md
