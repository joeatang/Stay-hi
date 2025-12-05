# 🚀 READY TO DEPLOY - Quick Guide

## What We Fixed Today (Dec 4, 2025)

1. **Tier Badge Sync** - Now updates on Island & Muscle pages (not just Dashboard)
2. **Profile Setup Flow** - New users auto-redirected to profile after email verification

## ✅ Deploy Commands (Copy & Paste)

### Minimal Deploy (Safest - Just the 3 core fixes):
```bash
cd /Users/joeatang/Documents/GitHub/Stay-hi

git add public/hi-island-NEW.html
git add public/hi-muscle.html  
git add public/awaiting-verification.html

git commit -m "fix: Enable tier sync across all pages & profile setup redirect

- Uncommented island-floating.js for tier badge updates on Island
- Added muscle-floating.js for tier badge updates on Muscle
- Added session polling in awaiting-verification for auto-redirect to profile

Tested locally ✅ Ready for production ✅"

git push origin main
```

### Full Deploy (All improvements from today):
```bash
cd /Users/joeatang/Documents/GitHub/Stay-hi

git add public/hi-island-NEW.html
git add public/hi-muscle.html
git add public/awaiting-verification.html
git add public/lib/boot/island-floating.js
git add public/lib/boot/muscle-floating.js

git commit -m "feat: Post-launch UX improvements - Tier sync & profile setup

Core Fixes:
- Tier badge now syncs across all pages (Island, Muscle, Dashboard, Profile)
- New user flow: Signup → Email verify → Auto-redirect to profile setup
- Profile onboarding modal opens automatically for new signups

Technical Changes:
- Enabled island-floating.js (tier update listener)
- Enabled muscle-floating.js (tier update listener)
- Added session polling in awaiting-verification.html
- Auto-redirect to profile.html?onboarding=true after verification

Tested: ✅ All pages, ✅ Signup flow, ✅ Tier display
Impact: Low risk, surgical changes only"

git push origin main
```

## 🎯 After Pushing

1. **Watch Vercel Deploy** - Go to Vercel dashboard, wait for green checkmark
2. **Test Production**:
   - Visit your live site
   - Check tier badge on Island page
   - Test signup flow (use test email)
3. **Verify** in `VERCEL_DEPLOY_CHECKLIST.md`

## 🚨 If Issues Occur

**Quick Rollback**:
```bash
git revert HEAD
git push origin main
```

Or use Vercel Dashboard → Deployments → Promote previous deployment

---

**Status**: ✅ Ready to deploy  
**Risk Level**: Low (3 files, 56 lines added)  
**Recommended**: Minimal deploy first, then full deploy if needed
