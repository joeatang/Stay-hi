# 🚀 DEPLOYMENT PROTOCOL - NO REGRESSIONS GUARANTEE

## ⛔ RULE #1: NEVER DEPLOY WITHOUT LOCAL VERIFICATION

**If I say "ready for deployment" without completing this checklist, STOP ME.**

---

## 📋 PRE-DEPLOYMENT CHECKLIST (MANDATORY)

### Phase 1: Local Testing (localhost:3030)

#### A. Core Functionality Smoke Test (10 minutes)
Run through these critical paths on LOCAL before any deployment:

```bash
# Start local server
cd /Users/joeatang/Documents/GitHub/Stay-hi/public
python3 -m http.server 3030
```

**Test Matrix:**

| Feature | Test Action | Expected Result | Pass/Fail |
|---------|-------------|-----------------|-----------|
| **Dashboard Load** | Navigate to localhost:3030/hi-dashboard.html | Dashboard loads, no console errors | ☐ |
| **Streak Pill** | Check #userStreak element | Shows number > 0 (not 0) | ☐ |
| **Medallion Tap** | Click medallion | Increments wave counter | ☐ |
| **Hi Island Load** | Navigate to hi-island-NEW.html | Feed loads with shares | ☐ |
| **Filter Buttons** | Click Hi5/HiGym/Island filters | Feed filters correctly | ☐ |
| **Hi-Gym Load** | Navigate to hi-muscle.html | Emotion selector loads | ☐ |
| **Emotion Selection** | Select current → desired emotion | Guidance cards appear | ☐ |
| **Share Creation** | Create and submit a share | Share appears in feed | ☐ |
| **Profile Modal** | Click avatar | Profile modal opens | ☐ |
| **Mission Control** | Navigate to mission control | All 6 tiers display | ☐ |

**ALL MUST PASS BEFORE PROCEEDING TO PHASE 2**

#### B. Browser Cache Test (5 minutes)
Test that cache-busting works:

1. Load dashboard
2. Note the file version in console: `HiRealFeed.js?v=YYYYMMDD`
3. Hard refresh (Cmd+Shift+R)
4. Verify version number is same or newer
5. Check functionality still works after refresh

#### C. Console Error Check (2 minutes)
Open DevTools Console and check for:
- ❌ No red errors
- ⚠️ Yellow warnings are OK (but document them)
- ✅ Key success logs appear ("✅ Loaded X shares", "✅ Streak loaded")

**Document any errors in `ERRORS_BEFORE_DEPLOY.md` before proceeding**

---

### Phase 2: Git Hygiene (5 minutes)

#### A. Commit Verification
```bash
# Check what's being deployed
git status
git diff

# Ensure clean working directory
git add -A
git commit -m "Descriptive commit message with:
- What changed
- Why it changed  
- What was tested"
```

#### B. Version Tagging (CRITICAL for rollback)
```bash
# Tag every production deployment
git tag -a "v$(date +%Y%m%d-%H%M)" -m "Pre-deployment checkpoint: [Brief description]"
git push --tags
```

**Why:** If deployment breaks, instant rollback: `git checkout v20251214-1430`

#### C. Deployment Diff Review
```bash
# See what's different from last deployment
git diff origin/main
```

**RED FLAGS:**
- Deletions of core functions
- Changes to authentication logic
- Database query modifications
- Removal of feature flags

---

### Phase 3: Vercel-Specific Checks (3 minutes)

#### A. Verify vercel.json Integrity
```bash
# Check configuration is valid
cat vercel.json | python3 -m json.tool > /dev/null && echo "✅ Valid JSON" || echo "❌ Invalid JSON"
```

#### B. Check Build Configuration
```json
{
  "builds": [
    { 
      "src": "public/**", 
      "use": "@vercel/static"
    }
  ]
}
```

Verify:
- ✅ `public/**` includes all necessary files
- ✅ No missing directories
- ✅ Static build (not serverless for your case)

#### C. Environment Variables
Check `.env` or Vercel dashboard:
- ✅ SUPABASE_URL set
- ✅ SUPABASE_ANON_KEY set
- ✅ All keys valid and not expired

---

### Phase 4: Staging Deployment (RECOMMENDED)

#### A. Deploy to Preview First
```bash
# Deploy to preview URL (not production)
npm run deploy:preview
# or
npx vercel
```

**Test on Preview URL:**
1. Run through Phase 1 test matrix again
2. Test from different browser (Safari if you use Chrome)
3. Test from mobile device
4. Verify no console errors

#### B. Preview URL Checklist
- [ ] Dashboard loads
- [ ] Streak pill works
- [ ] Filters work
- [ ] Share creation works
- [ ] No critical console errors

**ONLY proceed to production if ALL pass**

---

### Phase 5: Production Deployment (2 minutes)

#### A. Deploy with Caution
```bash
# Final check
echo "About to deploy to PRODUCTION. All tests passed? (yes/no)"
read confirmation

if [ "$confirmation" = "yes" ]; then
  npm run deploy:prod
else
  echo "Deployment cancelled. Fix issues first."
fi
```

#### B. Immediate Post-Deployment Verification (CRITICAL)
**Within 2 minutes of deployment:**

```bash
# Open production URL
open https://stay-nb2skjeuo-joeatangs-projects.vercel.app
```

**Quick Smoke Test on Production:**
1. ⏱️ Dashboard loads (< 3 seconds)
2. ⏱️ No console errors (check immediately)
3. ⏱️ Streak pill shows number
4. ⏱️ Click one filter button (verify it works)

**If ANY fail: Immediate rollback procedure (see Phase 6)**

---

### Phase 6: Rollback Procedure (Emergency)

#### A. Instant Rollback via Git Tag
```bash
# List recent tags
git tag -l | tail -5

# Rollback to previous version
git checkout v20251214-1430  # Use actual tag

# Force push to trigger redeployment
git push origin main --force

# Or revert specific commit
git revert HEAD
git push origin main
```

#### B. Vercel Dashboard Rollback
1. Go to vercel.com dashboard
2. Find project "Stay-hi"
3. Click "Deployments"
4. Find last working deployment
5. Click "..." → "Promote to Production"

**Takes 30 seconds, zero code changes needed**

---

## 🎯 REGRESSION PREVENTION STRATEGIES

### 1. Feature Flags for Risky Changes
```javascript
// In feature-flags.js, mark new features as beta
const defaults = {
  new_feature_name: { 
    enabled: false,  // Start disabled in production
    config: { beta: true }, 
    source: 'default' 
  }
};
```

**Turn on AFTER deployment verified:**
```javascript
// In browser console or via Supabase
await window.HiFlags.setFlag('new_feature_name', true);
```

### 2. Cache Busting Strategy (Vercel-Friendly)
```html
<!-- In HTML files, use timestamp versioning -->
<script src="./components/hi-real-feed/HiRealFeed.js?v=20241214"></script>
```

**On deployment, increment version:**
```bash
# Auto-increment cache buster
find public -name "*.html" -exec sed -i '' 's/?v=[0-9]*/?v='$(date +%Y%m%d)'/g' {} +
```

### 3. Automated Smoke Tests (Optional but Recommended)
Create `scripts/smoke-test.js`:
```javascript
// Hit critical endpoints, verify responses
const tests = [
  { url: '/hi-dashboard.html', expect: 'Dashboard' },
  { url: '/hi-island-NEW.html', expect: 'Hi Island' },
  { url: '/hi-muscle.html', expect: 'Hi Gym' }
];

// Run after each deployment
for (const test of tests) {
  const res = await fetch(baseURL + test.url);
  const text = await res.text();
  if (!text.includes(test.expect)) {
    console.error(`❌ SMOKE TEST FAILED: ${test.url}`);
    process.exit(1);
  }
}
console.log('✅ All smoke tests passed');
```

### 4. Change Documentation
**For every deployment, create:**
```markdown
## Deployment [DATE]
**Changed Files:** [list]
**Why:** [reason]
**Tested:** [checklist]
**Risks:** [known issues]
**Rollback Plan:** [if needed]
```

---

## 🔒 GUARDRAILS (Rules to Prevent Bad Deployments)

### Rule 1: No "Quick Fixes" on Friday
- Deployments Friday 5pm+ = BAD
- Weekend monitoring is limited
- Wait until Monday

### Rule 2: No Multi-Feature Deployments
- One feature per deployment
- Easier to identify what broke
- Faster rollback

### Rule 3: Test What You Changed
- Changed filters? Test filters.
- Changed streak? Test streak.
- Changed authentication? Test auth.

### Rule 4: Someone Else Tests (Ideal)
- You test locally
- Someone else tests preview
- Reduces "works on my machine" issues

### Rule 5: Monitor After Deploy
- Watch console for 5 minutes after deploy
- Check error tracking (if configured)
- Monitor user feedback channels

---

## 🎓 LESSONS LEARNED (This Deployment)

### What Went Wrong:
1. ❌ No pre-deployment testing checklist
2. ❌ Assumed "fixed" = "tested"
3. ❌ Didn't verify streak pill specifically
4. ❌ Didn't test with fresh browser cache
5. ❌ No staging deployment first

### What Went Right:
✅ Quick rollback capability (git tags)
✅ Good commit messages for debugging
✅ Identified issues quickly
✅ Fixed root causes, not symptoms

### New Rules (Effective Immediately):
1. **I will NEVER say "ready for deployment"** without running the Phase 1 test matrix
2. **You will NEVER deploy** without completing the checklist
3. **All deployments** get a git tag for instant rollback
4. **Preview deployments** are mandatory for significant changes

---

## 📊 DEPLOYMENT SCORECARD

Track deployment quality:

| Date | Features | Tests Passed | Issues Found | Rollback Needed |
|------|----------|--------------|--------------|-----------------|
| 2025-12-14 | Streak fix, Filter fix | ❌ No testing | 3 regressions | ❌ No |
| NEXT | [List features] | ✅ All Phase 1 | 0 expected | N/A |

**Goal: 100% "Tests Passed" before any production deployment**

---

## ✅ COMMITMENT

**From now on:**
- I will run through Phase 1-3 BEFORE saying "ready to deploy"
- I will create this checklist for EVERY deployment
- I will never skip testing to "save time"
- I will tag every production deployment for rollback

**Your job:**
- Hold me accountable to this process
- Don't let me skip steps
- If I say "deploy" without testing proof, say "STOP - run the checklist first"

---

## 🚀 READY TO USE

**Next deployment:**
1. I make changes
2. I run Phase 1 test matrix (show you results)
3. I run Phase 2-3 checks
4. I deploy to preview
5. We verify preview together
6. Only then → production deployment

**Zero regressions, Vercel-compliant, production-grade.**
