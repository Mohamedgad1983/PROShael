# Al-Shuail Cleanup + Database Migration — Spec-Kit Prompt Package v2

## 🔴 KEY CHANGE: No More Supabase

This version adds **Phase 0** — a complete migration from Supabase hosted PostgreSQL to self-hosted PostgreSQL on your Contabo VPS. After this migration:
- ❌ No Supabase JS client
- ❌ No Supabase Storage
- ❌ No Supabase Auth
- ✅ Direct PostgreSQL via `pg` (node-postgres) on VPS
- ✅ Local file storage on VPS
- ✅ Custom JWT auth (already exists)

## 📁 Files

| File | Purpose |
|------|---------|
| **MASTER_PROMPT_FOR_CLAUDE_CODE.md** | 🎯 Paste into Claude Code to start |
| constitution.md | Project rules (includes no-Supabase rule) |
| spec.md | Full specification with DB migration |
| plan.md | Technical plan with conversion patterns |
| tasks.md | Actionable checklist |

## 🚀 How to Use

1. Open Claude Code in your project directory
2. Copy ALL contents of `MASTER_PROMPT_FOR_CLAUDE_CODE.md`
3. Paste into Claude Code
4. It will execute Phase 0 (Supabase removal) first, then Phases 1-6 (cleanup)

## ⚠️ Before Starting

1. `git checkout -b pre-migration-backup && git push`
2. **Keep Supabase running** until VPS PostgreSQL is verified
3. Have your Contabo VPS SSH access ready
4. Know your Supabase database password for the pg_dump export

## 📊 Expected Results

| Metric | Before | After |
|--------|--------|-------|
| Supabase dependencies | Multiple | 0 |
| Database access patterns | 3 (Supabase client + pgQueryBuilder + mixed) | 1 (pg Pool) |
| Backup files | 27+ | 0 |
| Duplicate routes/components | 25+ | 0 |
| Test endpoints in prod | 1 | 0 |
| Monthly Supabase cost | $$ | $0 |

## 🕐 Estimated Time

| Phase | Time |
|-------|------|
| Phase 0: Supabase → PostgreSQL | 2-3 hours |
| Phase 1: Delete dead code | 30 min |
| Phase 2: Organize scripts | 20 min |
| Phase 3: Consolidate backend | 45 min |
| Phase 4: Consolidate frontend | 45 min |
| Phase 5: Security fixes | 30 min |
| Phase 6: Code quality | 60 min |
| **Total** | **~6 hours** |
