# 🔥 MOBILE FIX - TESTING GUIDE

## CRITICAL FIXES DEPLOYED

**Commit**: `06b7766` (just pushed to GitHub → auto-deploying to Vercel)

---

## 🎯 ROOT CAUSES FIXED:

### 1. **Profile Taking Forever to Load** ❌ → ✅
**Problem**: `await loadUserStats()` was BLOCKING page render for 10-15 seconds

**Fix**: Removed `await` keyword (lines 3257, 3354)
- Stats now load in **BACKGROUND** (non-blocking)
- Profile renders **INSTANTLY** (like before)
- Stats populate after query completes

### 2. **Getting Logged Out on Background** ❌ → ✅
**Problem**: Session not being restored when returning from background

**Fix**: Added `checkSessionOnLoad()` function
- Checks session **IMMEDIATELY** on page load
- Restores from localStorage if session lost
- Runs BEFORE auth-ready event

### 3. **Service Worker Serving Stale Code** ❌ → ✅
**Problem**: Mobile Chrome cached old JavaScript

**Fix**: Force service worker update
- Bumped version: `v1.3.1-instant`
- Added `skipWaiting()` to install event
- Added `registration.update()` on profile load
- Forces browser to use NEW code immediately

---

## 📱 HOW TO TEST ON MOBILE:

### Step 1: **Force Refresh** (CRITICAL - Must Do First!)
```
Option A: Hard Refresh (Recommended)
1. Open Chrome on mobile
2. Navigate to: https://stay-hi.vercel.app/public/profile.html
3. Tap browser menu (⋮)
4. Scroll down and tap "Settings"
5. Tap "Privacy and security"
6. Tap "Clear browsing data"
7. Select "Cached images and files" ONLY
8. Tap "Clear data"
9. Go back to profile page
10. Refresh page

Option B: Force Reload (Faster but less reliable)
1. Open profile page
2. Long-press refresh button
3. Tap "Hard refresh" (if available)

Option C: Close all Chrome tabs and re-open
```

### Step 2: **Test Instant Profile Load**
```
✅ EXPECTED: Profile shows IMMEDIATELY (< 1 second)
   - Avatar appears instantly
   - Username appears instantly
   - Bio appears instantly
   - Stats show "0" or loading state initially
   - Stats populate after ~1-3 seconds

❌ BEFORE: Blank white screen for 10-15 seconds

TEST:
1. Go to profile page
2. Measure time to first paint
3. Should be < 1 second

SUCCESS CRITERIA:
- Profile info visible in < 1 second
- Stats appear shortly after (1-5 seconds)
- No long blank screen
```

### Step 3: **Test Session Persistence**
```
✅ EXPECTED: Stay logged in after backgrounding

TEST:
1. Open profile page (logged in)
2. Leave Chrome (go to home screen or another app)
3. Wait 30 seconds
4. Return to Chrome
5. Check if still logged in

SUCCESS CRITERIA:
- Still logged in ✅
- Profile still shows your data ✅
- No redirect to sign-in ✅

CHECK CONSOLE (Chrome DevTools on Desktop):
- Should see: "[Profile] ✅ Session active on page load"
- OR: "[Profile] ✅ Session restored on page load"
- NOT: "[Profile] ⚠️ NO SESSION on page load"
```

### Step 4: **Test Hi Island After Background**
```
✅ EXPECTED: Hi Island loads correctly

TEST:
1. Go to Hi Island page
2. Background Chrome for 30 seconds
3. Return to Chrome
4. Check if map and feed load

SUCCESS CRITERIA:
- Map loads ✅
- Feed shows posts ✅
- Not stuck on loading screen ✅
```

### Step 5: **Verify Service Worker Updated**
```
DESKTOP ONLY (for debugging):
1. Open Chrome DevTools (F12)
2. Go to Application tab
3. Click "Service Workers" in left sidebar
4. Check version

SUCCESS CRITERIA:
- Version: "v1.3.1-instant"
- Status: "activated and is running"
```

---

## 🔍 DEBUGGING IF STILL ISSUES:

### If Profile Still Slow:
```
1. Check console logs:
   - Look for "📊 Loading stats for user:"
   - Should appear AFTER profile renders, not before

2. Verify code loaded:
   - View page source (mobile: Request Desktop Site)
   - Search for "non-blocking for instant page render"
   - Should be present in loadUserStats calls

3. Clear ALL browser data (nuclear option):
   - Settings → Privacy → Clear browsing data
   - Select ALL time, ALL data types
   - Restart Chrome
```

### If Still Getting Logged Out:
```
1. Check console logs (desktop):
   - Connect mobile Chrome to desktop
   - Open chrome://inspect on desktop
   - Select your device
   - Check for "[Profile] Session check" logs

2. Verify localStorage:
   - Console: localStorage.getItem('sb-gfcubvroxgfvjhacinic-auth-token')
   - Should return JSON with access_token

3. Check if Chrome clearing localStorage:
   - Settings → Site settings → stay-hi.vercel.app
   - Verify "Cookies and site data" = ALLOW
   - Verify "Clear data when closed" = OFF
```

### If Stats Still Wrong:
```
1. Re-run SQL fix in Supabase:
   - Go to Supabase SQL Editor
   - Run: SELECT total_hi_moments FROM user_stats WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';
   - Should return 53

2. If not 53, something is resetting the value:
   - Check for triggers
   - Check for functions
   - Check for background jobs

3. Force re-sync:
   - Run: SELECT sync_moment_count();
   - Verify count updates to 53
```

---

## 📊 EXPECTED BEHAVIOR SUMMARY:

| **Before (Broken)** | **After (Fixed)** |
|---------------------|-------------------|
| Profile: 10-15s blank screen | Profile: < 1s instant load |
| Stats: Blocking render | Stats: Non-blocking background |
| Background: Logs out | Background: Stays logged in |
| Hi Island: Fails after background | Hi Island: Works correctly |
| Service Worker: Stale cache | Service Worker: Force updates |

---

## 🚀 NEXT STEPS:

1. **Wait 2-3 minutes** for Vercel deployment to complete
2. **Test on mobile** following steps above
3. **Report results**:
   - ✅ Profile loads instantly?
   - ✅ Stays logged in after background?
   - ✅ Stats show correct values?
   - ✅ Hi Island works after background?

---

## 🧠 TECHNICAL DETAILS (For Context):

### What Changed in Code:

**profile.html Line 3257:**
```javascript
// ❌ BEFORE:
await loadUserStats(userId);  // Blocks page render

// ✅ AFTER:
loadUserStats(userId);  // Fire-and-forget
```

**profile.html Line 4024 (NEW):**
```javascript
// Added session restore on page load
(async function checkSessionOnLoad() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    // Restore from localStorage
    const token = localStorage.getItem('sb-gfcubvroxgfvjhacinic-auth-token');
    if (token) {
      const parsed = JSON.parse(token);
      await sb.auth.setSession({
        access_token: parsed.access_token,
        refresh_token: parsed.refresh_token
      });
    }
  }
})();
```

**sw.js Line 5:**
```javascript
// ❌ BEFORE:
const BUILD_TAG = 'v1.0.1-20251230-woz-fix';
const CACHE_NAME = 'hi-collective-v1.3.0-woz';

// ✅ AFTER:
const BUILD_TAG = 'v1.0.2-20251230-instant-profile';
const CACHE_NAME = 'hi-collective-v1.3.1-instant';

// NEW: Force immediate activation
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});
```

---

## 📞 REPORT FORMAT:

After testing, reply with:
```
✅ FIXED:
- [ ] Profile loads instantly
- [ ] Stays logged in after background
- [ ] Stats show correct values
- [ ] Hi Island works

❌ STILL BROKEN:
- [ ] (describe issue)

🔍 CONSOLE LOGS:
(paste any relevant console messages)
```
