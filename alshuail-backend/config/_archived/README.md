# Archived Configuration Files

This directory contains legacy configuration files that are no longer used in production.

## Files

### database.js.old
- **Archived Date:** 2026-02-11
- **Reason:** Replaced by `src/services/database.js`
- **Migration:** Supabase to PostgreSQL migration (Phase 003)
- **Original Purpose:** Supabase client configuration for database access
- **New Implementation:** Direct PostgreSQL access via `pg` Pool in `src/services/database.js`

## Do Not Use

These files are kept for reference only. Do not import or use them in active code.

## Restoration

If you need to reference the old Supabase implementation:
1. Check git history: `git log --follow config/_archived/database.js.old`
2. View original content: `git show HEAD~n:config/database.js`

## Cleanup

These files can be safely deleted after:
- Migration is fully validated
- All tests pass
- Production deployment is stable
- 30-day retention period (expires: 2026-03-13)
