# Optimistic Auth Test Guide

**Commit**: f343ad8 (Jan 20, 2025)  
**Purpose**: Eliminate 90% of zombie mode by trusting cached auth until API proves it's invalid

---

## What Changed

### Architecture Shift
- **Before**: Proactive rechecking on visibilitychange/pageshow/focus → timeout spiral → zombie mode
- **After**: Reactive rechecking ONLY on actual 401/403 API failures → cached auth trusted → no zombie mode

### Files Modified
1. **AuthReady.js** - Disabled proactive listeners, added reactive hi:auth-failed listener
2. **ProfileManager.js** - Detect 401/403, dispatch hi:auth-failed, keep cached profile
3. **HiRealFeed.js** - Detect 401/403, dispatch hi:auth-failed, keep cached feed
4. **dashboard-main.js** - Detect 401/403 in medallion RPC calls
5. **dashboard-main.mjs** - Detect 401/403 in check-in/tap RPCs
6. **hi-island-NEW.html** - Cache buster updated (?v=20260120-optimistic-auth)
7. **hi-pulse.html** - Cache buster updated (?v=20260120-optimistic-auth)

---

## Test Scenarios

### Test 1: Background/Foreground (Safari Mobile)
**Goal**: Verify no zombie mode after backgrounding

1. Open Hi Island in Safari (logged in as bronze/silver/gold user)
2. Verify profile loads correctly (username, tier, points visible)
3. Background Safari → Open Instagram → Browse for 10-15 seconds
4. Return to Safari/Hi Island

**Expected Behavior**:
- ✅ App loads instantly with cached profile (no 3-5s freeze)
- ✅ Profile tier still correct (not regressed to anonymous)
- ✅ Points/streaks preserved
- ✅ Feed shows cached shares immediately
- ✅ No console errors about timeouts
- ✅ Medallion tap still works

**How to Debug**:
```javascript
// Check console logs:
// Should SEE: "✅ Using cached profile while auth recheck runs"
// Should NOT SEE: "⏱️ Profile query timeout (8s) - aborting"
```

### Test 2: Actual Session Expiry
**Goal**: Verify auth recheck DOES happen on real API failure

1. Open Hi Island (logged in)
2. Open browser dev tools → Application → Local Storage
3. Delete `sb-gfcubvroxgfvjhacinic-auth-token` key (simulate expired session)
4. Tap medallion (triggers RPC call)

**Expected Behavior**:
- ✅ Console shows: "🔐 [dashboard-main] Auth failure detected - dispatching hi:auth-failed"
- ✅ Console shows: "🔄 Auth recheck triggered: api-failure"
- ✅ User redirected to login page (or anonymous mode)
- ✅ Points/streaks preserved until recheck completes

### Test 3: Slow Network (Chrome DevTools Throttling)
**Goal**: Verify app doesn't freeze on slow networks

1. Open Hi Island
2. Open DevTools → Network tab → Throttling: Slow 3G
3. Refresh page

**Expected Behavior**:
- ✅ Cached profile loads instantly (no spinner)
- ✅ Cached feed shows immediately
- ✅ New data loads in background (invisible to user)
- ✅ No timeout errors
- ✅ Page remains interactive throughout

### Test 4: Medallion Tap with Auth Failure
**Goal**: Verify RPC auth failures trigger recheck

1. Open dashboard (logged in)
2. Manually corrupt auth token in localStorage (set to "invalid-token")
3. Tap medallion

**Expected Behavior**:
- ✅ Console shows: "🔐 Auth failure in medallion check-in"
- ✅ Window event dispatched: `hi:auth-failed`
- ✅ AuthReady.recheckAuth() triggered
- ✅ User logged out gracefully (no crash)

---

## Console Log Guide

### Good Signs (Optimistic Auth Working)
```
✅ Using cached profile while auth recheck runs
✅ Using cached feed while auth recheck runs
✅ Profile loaded from database
🎯 [AuthReady] Initialized with optimistic auth strategy
```

### Bad Signs (Zombie Mode Regression)
```
⏱️ Profile query timeout (8s) - aborting
❌ visibilitychange triggered auth recheck (should NOT happen)
⚠️ Auth state downgraded to anonymous (premature invalidation)
```

### Expected Auth Failures (Real Session Expiry)
```
🔐 [ProfileManager] Auth failure detected - dispatching hi:auth-failed
🔄 Auth recheck triggered: api-failure
```

---

## Regression Check

### What Should STILL Work
- ✅ Login/logout flow
- ✅ Profile edits (avatar, bio, username)
- ✅ Points/streaks tracking
- ✅ Medallion taps (check-in + wave count)
- ✅ Feed loading (Hi Gym, Hi Island shares)
- ✅ Real-time updates (waves, points)

### What Should STOP Happening
- ❌ Zombie mode after backgrounding
- ❌ 3-5s freeze on app return
- ❌ Tier regression (Bronze → Hi Friend)
- ❌ Premature session invalidation
- ❌ Timeout spiral in console

---

## Rollback Plan (If Issues)

If optimistic auth causes problems, revert with:

```bash
git revert f343ad8
git push origin main
```

This will restore proactive rechecking (zombie mode will return but app won't break).

---

## Data Safety Verification

**Critical**: Verify no points/streaks lost during backgrounding

1. Note current points/streak before backgrounding
2. Background app for 30+ seconds
3. Return to app
4. Verify points/streak unchanged
5. Make a medallion tap (check-in)
6. Verify points incremented correctly

**Expected**: All data preserved (optimistic auth is SAFER than proactive rechecking)

---

## Next Steps (If Zombie Mode Still Occurs)

If backgrounding still causes issues >10% of time:

1. **Check console logs** - Are auth failures being detected?
2. **Verify cache busters** - Are old JS files still loading?
3. **Test on different networks** - Is it network-specific?
4. **Consider PWA** - Install as app for 70-80% improvement
5. **Evaluate native wrapper** - Capacitor.js for 100% solution

---

## User Feedback Collection

Ask beta testers:

1. "Does the app still freeze when you return from Instagram?"
2. "Do you see your correct tier (Bronze/Silver/Gold) after backgrounding?"
3. "Are your points/streaks preserved after switching apps?"
4. "Does the medallion tap still work after backgrounding?"

Expected answers: Yes, Yes, Yes, Yes (all positive)
