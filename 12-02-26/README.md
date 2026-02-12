# 📋 AL-SHUAIL VERIFICATION SPEC-KIT

> Use this kit AFTER Claude Code finishes all migration and cleanup phases.
> It ensures 100% completion with zero gaps.

---

## 📦 Kit Contents (3 Files)

| File | Purpose | How to Use |
|------|---------|------------|
| **VERIFY_MASTER_PROMPT.md** | Paste into Claude Code | Claude Code runs every check, fixes failures, writes report |
| **VERIFICATION_CHECKLIST.md** | Manual tracking | Print it, check boxes as Claude Code completes each item |
| **verify-all.sh** | Automated script | Run `bash verify-all.sh` from project root for instant results |

---

## 🚀 How to Use

### Option A: Claude Code Audit (RECOMMENDED)
**Best for**: Fixing issues as they're found

1. Open Claude Code
2. `/clear` to start fresh
3. Paste the **entire contents** of `VERIFY_MASTER_PROMPT.md`
4. Claude Code will:
   - Run all 52 checks systematically
   - Fix any failures it finds
   - Generate `VERIFICATION_REPORT.md`
5. Review the report

### Option B: Automated Script
**Best for**: Quick pass/fail report

1. Copy `verify-all.sh` to your project root
2. Run: `bash verify-all.sh`
3. Check the output + `VERIFICATION_REPORT.md`
4. If failures found → use Option A to fix them

### Option C: Manual Checklist
**Best for**: Final sign-off by project owner

1. Open `VERIFICATION_CHECKLIST.md`
2. Run each command yourself
3. Check off each box
4. Sign off at the bottom

---

## 📊 What Gets Checked (52 Total Checks)

| Section | Checks | What It Verifies |
|---------|--------|------------------|
| Supabase Removal | 10 | Zero supabase in code, deps, env, config, storage |
| Dead File Removal | 6 | No .backup, .old, .fixed, test scripts in root |
| Scripts Organization | 3 | Clean root, scripts in subdirectories |
| Backend Duplicates | 5 | Single version of each route/controller |
| Frontend Duplicates | 5 | Single version of each component |
| Security | 7 | Auth, no test endpoints, no hardcoded creds, SQL safety |
| Code Quality | 6 | Winston logger, zero console.log, TODO count, file sizes |
| Build & Deploy | 5 | Backend starts, npm clean, admin builds, mobile builds |
| Database | 5 | PostgreSQL running, tables exist, data present, FK intact |

---

## ✅ Success Criteria

```
52/52 checks passed  →  🎉 100% COMPLETE — Ready for production
48-51/52 passed      →  ⚠️  Minor issues — Fix before go-live
< 48/52 passed       →  ❌ Significant gaps — More work needed
```

---

## 💡 Tips

- **Run the automated script first** (`verify-all.sh`) to see where you stand
- **Use Claude Code audit** to fix any failures (it can fix as it finds)
- **Run the script again** after fixes to confirm everything passes
- **Manual checklist** is your final sign-off document
- **Keep VERIFICATION_REPORT.md** as proof of completion

---

## ⚠️ Important Notes

- These checks assume you're running from the **project root** directory
- The project root should contain: `alshuail-backend/`, `alshuail-admin/`, `alshuail-mobile/`, `alshuail-flutter/`
- Database checks require PostgreSQL credentials (set DB_PASSWORD env var)
- Build checks require node_modules installed (run `npm install` first)
- **DO NOT modify alshuail-flutter/** — it's separate and clean
