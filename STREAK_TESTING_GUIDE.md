# 🧪 STREAK SYSTEM TESTING GUIDE
**Date:** January 3, 2026  
**System:** 7-Day Pill & Calendar Consistency

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### Step 1: Run SQL Migration
```sql
-- In Supabase SQL Editor, run:
-- FIX_LAST_HI_DATE_ON_CHECKINS.sql

-- Verify trigger created:
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_name = 'sync_last_hi_on_checkin';

-- Should show: sync_last_hi_on_checkin
```

### Step 2: Test Locally
```bash
# Start dev server
python3 -m http.server 3030

# Open in browser
http://localhost:3030/public/hi-dashboard.html
```

---

## 🧪 MANUAL TEST SUITE

### TEST 1: Dashboard Load (Single Source of Truth)
**Expected:** Streak loads from database, shows instantly if cached

1. Hard refresh (Cmd+Shift+R)
2. Open DevTools Console
3. Look for: `🚀 [StreakAuthority] Cache hit:` OR `✅ [StreakAuthority] Database fetch:`
4. Verify `#userStreak` element shows number within 1 second
5. Check localStorage → `user_current_streak` matches UI

**Pass Criteria:**
- ✅ No `STREAK MISMATCH` errors
- ✅ Number appears instantly (< 1 second)
- ✅ No flicker or jump in value

---

### TEST 2: Calendar Sync (No Race Conditions)
**Expected:** Calendar and dashboard always show same value

1. Load dashboard → note streak value (e.g., 5)
2. Open calendar modal
3. Watch console for: `📢 [StreakEvents] Broadcasting streak update:`
4. Verify dashboard pill **does not change** (should already be correct)
5. Close calendar
6. Refresh page
7. Verify value still same

**Pass Criteria:**
- ✅ Dashboard pill never jumps or changes when calendar opens
- ✅ Both displays show identical value
- ✅ Console shows: `✅ [StreakEvents] Broadcast complete`

---

### TEST 3: Check-in Updates lastHiDate
**Expected:** lastHiDate updates on check-in (not just Hi drops)

1. Note current streak (e.g., 7 days)
2. Go to Hi Muscle or wherever check-in happens
3. Do daily check-in
4. Wait 2 seconds
5. Return to dashboard
6. Verify streak increments if it's a new day
7. Open DevTools Console
8. Run: 
   ```javascript
   StreakAuthority.refresh(window.ProfileManager.getUserId()).then(s => console.log(s))
   ```
9. Verify `lastHiDate` is TODAY's date

**Pass Criteria:**
- ✅ Streak increments if new day
- ✅ `lastHiDate` shows today (not yesterday)
- ✅ 7-day pill shows today lit up

---

### TEST 4: Cross-Day Test (Midnight Rollover)
**Expected:** Streak increments at midnight if user active

**WARNING: This test requires staying up until midnight or setting system clock**

1. Check streak at 11:58 PM (e.g., 7 days)
2. Note 7-day pill visual (6 dots lit, today pending)
3. Wait until 12:01 AM
4. Drop a Hi or check in
5. Verify streak goes to 8
6. Verify 7-day pill shows: last 6 days + today (7 dots lit)

**Pass Criteria:**
- ✅ Streak increments immediately
- ✅ No flicker or double-count
- ✅ 7-day pill updates to show today

---

### TEST 5: Cache TTL (Expiration)
**Expected:** Cache expires after 1 minute, refreshes from database

1. Load dashboard (note streak = 5)
2. Wait 90 seconds (cache expires at 60 seconds)
3. Refresh page
4. Watch console for: `🕐 [StreakAuthority] Cache expired`
5. Then: `✅ [StreakAuthority] Database fetch:`
6. Verify no flicker (smooth transition)

**Pass Criteria:**
- ✅ Cache expires after 60 seconds
- ✅ Database fetch happens automatically
- ✅ No visible flicker to user

---

### TEST 6: Offline Graceful Degradation
**Expected:** Shows stale cache if database unavailable

1. Load dashboard while online (streak = 5)
2. Turn off WiFi
3. Refresh page
4. Verify shows 5 (from stale cache)
5. Console shows: `⚠️ [StreakAuthority] Using stale cache: 5`

**Pass Criteria:**
- ✅ Shows stale cache value
- ✅ No error messages in UI (graceful)
- ✅ When back online, refreshes to correct value

---

## 🚨 CRITICAL BUGS TO WATCH FOR

### Bug: Flicker on Load
**Symptom:** Streak shows 4 → jumps to 5  
**Cause:** Race condition (old system)  
**Fix:** StreakEvents should prevent this  
**Verify:** Watch for `🔒 [StreakEvents] Update in progress` logs

### Bug: Calendar Overwrites Dashboard
**Symptom:** Dashboard shows 5, calendar opens, dashboard changes to 4  
**Cause:** Race condition (old system)  
**Fix:** StreakEvents synchronizes updates  
**Verify:** Dashboard value should NEVER change when calendar opens

### Bug: Check-in Doesn't Update lastHiDate
**Symptom:** Check in today, but lastHiDate still yesterday  
**Cause:** Missing SQL trigger  
**Fix:** Run FIX_LAST_HI_DATE_ON_CHECKINS.sql  
**Verify:** Run SQL query from migration file to check sync

---

## ✅ SUCCESS CRITERIA CHECKLIST

After testing, verify ALL of these:

- [ ] Dashboard loads streak in < 1 second
- [ ] No flicker (value never jumps unexpectedly)
- [ ] Calendar and dashboard always show same value
- [ ] Opening calendar doesn't change dashboard pill
- [ ] Check-in updates `lastHiDate` correctly
- [ ] 7-day pill shows accurate days (not phantom days)
- [ ] Cache expires after 1 minute, refreshes smoothly
- [ ] Offline mode shows stale cache gracefully
- [ ] Console shows `✅ [StreakEvents] Broadcast complete`
- [ ] No `STREAK MISMATCH` or `OUT OF SYNC` errors

---

## 🐛 DEBUGGING COMMANDS

If something seems wrong, run these in DevTools Console:

### Check Current Streak Sources
```javascript
// Database value
hiSupabase.from('user_stats')
  .select('current_streak, last_hi_date')
  .eq('user_id', window.ProfileManager.getUserId())
  .single()
  .then(r => console.log('DB:', r.data))

// Cache value
console.log('Cache:', localStorage.getItem('user_current_streak'))

// UI value
console.log('UI:', document.getElementById('userStreak').textContent)
```

### Force Refresh
```javascript
// Bypass cache, fetch from database
StreakAuthority.refresh(window.ProfileManager.getUserId())
  .then(s => console.log('Fresh:', s))
```

### Invalidate Cache
```javascript
// Clear cache, next load will fetch from DB
StreakAuthority.invalidate()
```

### Test Broadcast
```javascript
// Manually trigger synchronized update
StreakEvents.broadcast(99)
// Should see dashboard pill + 7-day grid + calendar all update to 99
```

---

## 📊 MONITORING

After deployment, monitor these metrics:

1. **Cache Hit Rate:** Should be > 80% (most loads from cache)
2. **Database Queries:** Should be minimal (only on cache miss)
3. **Flicker Reports:** Should be 0 (StreakEvents prevents)
4. **Sync Errors:** Should be 0 (no STREAK MISMATCH logs)

---

## 🔧 ROLLBACK PLAN

If issues found in production:

```bash
# Rollback dashboard changes
git checkout HEAD~1 -- public/hi-dashboard.html
git checkout HEAD~1 -- public/lib/boot/dashboard-main.js
git checkout HEAD~1 -- public/assets/premium-calendar.js

# Remove new files
rm public/lib/streak/StreakAuthority.js
rm public/lib/streak/StreakEvents.js

# Commit rollback
git add -A
git commit -m "Rollback: Revert streak system changes (issue found)"
git push origin main
```

SQL trigger is safe to leave (doesn't break anything).

---

**Ready to test?** Start with TEST 1 (Dashboard Load) and work through the list.
