# 🚀 Deployment Guide - Al-Shuail Projects

## Two Separate Applications

### 1. Mobile PWA (للأعضاء - For Members) 📱
**Source**: `Mobile/dist/`
**Domain**: https://alshuail-mobile-pwa.pages.dev
**Purpose**: Mobile app for family members

### 2. Admin Panel (للإدارة - For Administrators) 💼
**Source**: `alshuail-admin-arabic/build/`
**Domain**: https://alshuail-admin.pages.dev
**Purpose**: Desktop admin dashboard

---

## ⚠️ IMPORTANT - DO NOT MIX THESE!

**NEVER** deploy:
- ❌ Admin build to `alshuail-mobile-pwa.pages.dev`
- ❌ Mobile build to `alshuail-admin.pages.dev`

---

## Deployment Commands

### Deploy Mobile PWA
```bash
# Option 1: Use script (Recommended)
bash deploy-mobile-pwa.sh

# Option 2: Manual
npx wrangler pages deploy Mobile/dist --project-name alshuail-mobile-pwa
```

### Deploy Admin Panel
```bash
# Option 1: Use script (Recommended)
bash deploy-admin.sh

# Option 2: Manual
cd alshuail-admin-arabic
npm run build
npx wrangler pages deploy build --project-name alshuail-admin
```

---

## Verification Checklist

After deployment, verify:

### Mobile PWA ✅
- [ ] Visit https://alshuail-mobile-pwa.pages.dev
- [ ] Should show **mobile login page** (HTML/CSS/JS)
- [ ] Has 9 pages: login, dashboard, payments, events, profile, notifications, statements, crisis, family-tree
- [ ] Mobile-optimized design
- [ ] No React, pure HTML

### Admin Panel ✅
- [ ] Visit https://alshuail-admin.pages.dev
- [ ] Should show **admin login page** (React app)
- [ ] Has full admin dashboard with sidebar menu
- [ ] Desktop-optimized design
- [ ] React app with all features

---

## Current Deployment URLs (Latest)

**Mobile PWA**: https://794fee9a.alshuail-mobile-pwa.pages.dev
**Admin Panel**: https://986f0a4c.alshuail-admin.pages.dev

---

## Project Structure

```
PROShael/
├── Mobile/                          ← Mobile PWA (Standalone)
│   ├── dist/                        ← Deploy THIS to mobile-pwa
│   │   ├── index.html               ← Entry point
│   │   ├── login.html
│   │   ├── dashboard.html
│   │   └── ... (9 pages total)
│   └── ... (source files)
│
├── alshuail-admin-arabic/           ← Admin Panel (React)
│   ├── build/                       ← Deploy THIS to admin
│   │   ├── index.html
│   │   ├── static/
│   │   └── ... (React build)
│   └── src/
│
└── alshuail-backend/                ← Backend API
    └── ... (Express server)
```

---

## Troubleshooting

### Mobile PWA shows 404
**Fix**: Ensure `Mobile/dist/index.html` exists
```bash
cp Mobile/dist/login.html Mobile/dist/index.html
bash deploy-mobile-pwa.sh
```

### Admin shows Mobile or vice versa
**Fix**: You deployed to wrong project!
- Check the `--project-name` parameter
- Mobile = `alshuail-mobile-pwa`
- Admin = `alshuail-admin`

### Build failed
**Admin Panel**:
```bash
cd alshuail-admin-arabic
rm -rf node_modules/.cache build
npm run build
```

**Mobile PWA**: Already built in `dist/` folder

---

## Quick Reference

| What | Command | Domain |
|------|---------|--------|
| Deploy Mobile PWA | `bash deploy-mobile-pwa.sh` | alshuail-mobile-pwa.pages.dev |
| Deploy Admin | `bash deploy-admin.sh` | alshuail-admin.pages.dev |
| Build Admin | `cd alshuail-admin-arabic && npm run build` | - |
| Mobile Build | Already in `Mobile/dist/` | - |

---

**Remember**: Two different apps, two different domains, two different purposes! 🎯
