# 🚀 WOZ-GRADE MOBILE FIX - TESTING GUIDE

## 🎯 What Was Fixed

### Critical Issues Resolved:
1. ✅ **Infinite Loading States** - Queries now timeout after 5 seconds + retry 3 times
2. ✅ **Stats Stuck on Dashes (—)** - Now show "0" instead of infinite loading
3. ✅ **Splash Screen on Foreground** - Only shows on first load, not when returning from background
4. ✅ **Hi Island Global Stats Loading Forever** - Same timeout + retry logic
5. ✅ **Service Worker Serving Stale Code** - Cache version bumped to v1.3.0-woz

### Files Changed:
- `public/lib/query-timeout.js` (NEW) - 5s timeout + 3-retry wrapper
- `public/profile.html` - Use timeout wrapper for stats query
- `public/hi-island.html` - Load timeout wrapper
- `public/lib/boot/island-main.mjs` - Add timeout to global stats
- `public/lib/HiUnifiedSplash.js` - Skip splash on foreground
- `public/sw.js` - Bump cache version

---

## 📱 MOBILE TESTING STEPS

### Test 1: Profile Page Stats (CRITICAL)
1. **Open profile page on mobile**: https://stay-hi.vercel.app/public/profile.html
2. **Expected**: Stats load within 5 seconds showing real values (or 0 if new user)
3. **Check Console Logs**:
   ```
   📊 Loading stats for user: [user-id]
   ✅ Query completed (attempt 1)
   ✅ Stats loaded from Supabase (FRESH): {hi_moments: X, current_streak: Y...}
   ```
4. **If Query Times Out**:
   ```
   ⏱️ Query timed out (attempt 1/4)
   🔄 Retrying in 1000ms...
   ⏱️ Query timed out (attempt 2/4)
   🔄 Retrying in 2000ms...
   ...
   ❌ Stats query timed out after retries - showing fallback
   ```
5. **Verify**: Stats show numbers (0, 1, 53, etc.) - NEVER stuck on "—"

### Test 2: Hi Island Global Stats (CRITICAL)
1. **Open Hi Island**: https://stay-hi.vercel.app/public/hi-island.html
2. **Expected**: "Global Waves", "Total His", "Total Users" load within 5 seconds
3. **Check Elements**: Should show numbers like "1,234" or "0" - NOT "..."
4. **Check Console**:
   ```
   📊 Loading Hi Island global stats with timeout...
   ✅ Hi Island stats loaded: {waves: X, his: Y, users: Z}
   ```
5. **If Timeout**: Should show "0" or cached values - NOT stuck on "..."

### Test 3: Splash Screen on Foreground (CRITICAL)
1. **Open profile page on mobile**
2. **Switch to another app** (Twitter, Settings, whatever)
3. **Return to Stay Hi app**
4. **Expected**: Page loads IMMEDIATELY without splash screen
5. **Check Console**:
   ```
   🎬 Skipping splash - not first load
   ```
6. **MUST NOT SEE**: "Still warming things up..." message

### Test 4: First Load Splash (Should Still Work)
1. **Close ALL browser tabs for Stay Hi**
2. **Clear browser data** (optional but recommended)
3. **Open profile page fresh**
4. **Expected**: Splash screen appears briefly (< 3 seconds) then disappears
5. **Check Console**:
   ```
   🎬 Unified Splash initialized (first load)
   🎬 Hiding splash after [time]ms
   ✅ Splash removed
   ```

### Test 5: Service Worker Cache Update (CRITICAL)
1. **On mobile, open**: https://stay-hi.vercel.app/public/profile.html
2. **Check DevTools > Application > Service Workers**
3. **Expected**: Version shows `v1.0.1-20251230-woz-fix`
4. **OR just verify**: Stats load correctly (means new code is running)
5. **If old cache persists**: Force refresh (pull down on mobile, or Settings > Clear Cache)

---

## 🔍 DEBUGGING COMMANDS

### If Stats Still Not Loading:
```javascript
// In mobile browser console:
console.log('Query Timeout Available:', !!window.withQueryTimeout);
console.log('Service Worker Version:', navigator.serviceWorker.controller);
console.log('Supabase Client:', !!window.hiSupabase);
```

### If Splash Still Appearing on Foreground:
```javascript
// Check session storage:
console.log('First Load Flag:', sessionStorage.getItem('hi-app-initialized'));
```

### Force Service Worker Update:
```javascript
// In console:
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => reg.unregister());
  location.reload();
});
```

---

## ✅ SUCCESS CRITERIA

### All Tests Must Pass:
- [ ] Profile stats load within 5 seconds (or show 0)
- [ ] Hi Island global stats load within 5 seconds (or show 0)
- [ ] Splash screen DOES NOT appear when returning from background
- [ ] Splash screen DOES appear on first load
- [ ] Stats never stuck on loading dashes (—) or dots (...)
- [ ] No "Slow network or system hiccup" errors
- [ ] Service worker version is v1.3.0-woz

### Specific User Reports Should Be Fixed:
- ✅ "users getting locked/stuck in hi island" - Fixed with timeout + retry
- ✅ "stats showing loading dashes forever" - Now show 0 on timeout
- ✅ "splash page appearing when returning from background" - Skip on foreground
- ✅ "slow network retry message" - Fixed with exponential backoff retry

---

## 🚨 IF ISSUES PERSIST

### Stats Still Stuck on Loading:
1. Check if `query-timeout.js` is loading:
   ```javascript
   console.log(window.withQueryTimeout);
   ```
2. Check if RLS policies are still active (run DEBUG_MOBILE_STATS.sql)
3. Check database value (run FINAL_FIX_MOMENTS_COUNT.sql)

### Splash Still Appearing on Foreground:
1. Check session storage flag:
   ```javascript
   sessionStorage.removeItem('hi-app-initialized');
   location.reload(); // Should show splash
   // Return from background should NOT show splash
   ```
2. Verify HiUnifiedSplash.js changes deployed

### Service Worker Not Updating:
1. Hard refresh: CMD+SHIFT+R (desktop) or pull-down (mobile)
2. Clear site data: Settings > Privacy > Clear Browsing Data
3. Unregister manually (see debugging commands above)

---

## 📊 EXPECTED CONSOLE OUTPUT (Success)

### Profile Page:
```
📊 Loading stats for user: 68d6ac30-742a-47b4-b1d7-0631bf7a2ec6
📊 Fetching fresh stats from database (cache-bust: 1735603200000)
✅ Query completed (attempt 1)
✅ Stats loaded from Supabase (FRESH): {hi_moments: 53, current_streak: 3, total_waves: 14}
📊 Database values: {total_hi_moments (from DB): 53, current_streak (from DB): 3, total_waves (from DB): 14}
🎯 updateStatsDisplay() called with userStats: {hi_moments: 53, current_streak: 3...}
  📊 Setting hi_moments = 53 (database value)
  📊 Setting current_streak = 3 (database value)
  📊 Setting total_waves = 14 (database value)
✅ Stats display updated - all values from database
```

### Hi Island:
```
🏝️ Hi Island initializing...
📊 Loading Hi Island global stats with timeout...
✅ Hi Island stats loaded: {waves: 156, his: 89, users: 23, source: "unified"}
```

---

## 🎉 NEXT STEPS AFTER TESTING

1. **If all tests pass**: Close this issue, mark as resolved
2. **If specific stats wrong** (showing 1 instead of 53): Run FINAL_FIX_MOMENTS_COUNT.sql
3. **If new issues found**: Document and create new issue
4. **Monitor production**: Check for any new user reports

---

## 🔗 RELATED FILES
- `COMPREHENSIVE_FIX_PLAN.md` - Original diagnosis
- `FINAL_FIX_MOMENTS_COUNT.sql` - Database fix for wrong count
- `DEBUG_MOBILE_STATS.sql` - RLS policy check

---

**Deployed**: 2025-12-30
**Commit**: abe124c
**Vercel**: Auto-deployed to https://stay-hi.vercel.app
