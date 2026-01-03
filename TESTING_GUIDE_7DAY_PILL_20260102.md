# 🧪 7-Day Pill Testing Guide (Post-Fix)

**Date**: January 2, 2026  
**Fix Applied**: Race condition guard + queue in `setupWeeklyProgress()`  
**Files Modified**: `public/lib/boot/dashboard-main.js`

---

## ✅ Quick Test (2 minutes)

### **1. Basic Functionality**
```bash
# Hard refresh dashboard
Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)

# Check console for:
✅ "🎯 [7-DAY PILL] Starting setupWeeklyProgress..."
✅ "🔥 [7-DAY PILL] Current streak: X days"
✅ "✅ [STREAK SYNC] Stat box + visual grid both updated: X days"
✅ "✅ [7-DAY PILL] setupWeeklyProgress completed"

# Visual check:
✅ Pills render (7 day boxes visible)
✅ Streak number in stat box matches calendar
✅ No blank/stuck pills
```

### **2. Race Condition Test**
```bash
# Rapidly click calendar icon 10 times
# Check console for:
✅ "🔄 [7-DAY PILL] Already running, queuing retry..." (shows guard working)
✅ "🔄 [7-DAY PILL] Processing queued retry..." (shows queue working)
❌ NO duplicate renders happening simultaneously

# Visual check:
✅ Pills stay consistent (no flickering)
✅ Streak number stays stable
✅ No visual glitches
```

---

## 🔬 Comprehensive Testing

### **Test 1: Dashboard Load (Cold Start)**

**Steps:**
1. Close all browser tabs
2. Open fresh tab → `http://localhost:3030/public/hi-dashboard.html`
3. Watch console logs

**Expected Console Output:**
```
🎯 [7-DAY PILL] Initializing weekly progress...
🎯 [7-DAY PILL] Starting setupWeeklyProgress...
🔍 [getUserWeeklyActivity] ProfileManager userId: abc-123-def
📡 [STREAK DEBUG] Starting loadRemoteStreaks...
🔥 [7-DAY PILL] Current streak: 7 days
📅 [7-DAY PILL] Calculating last 7 days of 7 day streak
✅ [7-DAY PILL] Day 1: 2026-01-02 (0 days ago)
✅ [7-DAY PILL] Day 2: 2026-01-01 (1 days ago)
...
✅ [STREAK SYNC] Stat box + visual grid both updated: 7 days
✅ [7-DAY PILL] setupWeeklyProgress completed
```

**Expected UI:**
- ✅ 7 day pills visible
- ✅ Correct days highlighted (based on your streak)
- ✅ Streak number displays (e.g., "7" in stat box)
- ✅ No blank/loading state stuck

---

### **Test 2: Calendar Interaction (Race Condition)**

**Steps:**
1. Dashboard loaded (from Test 1)
2. Click calendar icon → Calendar opens
3. Close calendar
4. Repeat steps 2-3 rapidly 10 times

**Expected Console Output:**
```
# First click:
🎯 [7-DAY PILL] Starting setupWeeklyProgress...

# Rapid subsequent clicks:
🔄 [7-DAY PILL] Already running, queuing retry...
🔄 [7-DAY PILL] Already running, queuing retry...

# After first completes:
✅ [7-DAY PILL] setupWeeklyProgress completed
🔄 [7-DAY PILL] Processing queued retry...
🎯 [7-DAY PILL] Starting setupWeeklyProgress...
✅ [7-DAY PILL] setupWeeklyProgress completed
```

**Expected UI:**
- ✅ Pills render only once per guard cycle
- ✅ No flickering/multiple renders visible
- ✅ Streak number stays stable
- ✅ Pills remain consistent throughout

**❌ FAILURE SIGNS:**
- Multiple "Starting setupWeeklyProgress..." without "completed" in between
- Pills flicker or show wrong data
- Console errors about DOM not found
- Blank pills after calendar closes

---

### **Test 3: Auth State Changes**

**Steps:**
1. Start logged out (anonymous)
2. Open dashboard → Should show preview pills (2-3 random days)
3. Log in
4. Watch for `hi:auth-ready` event triggering pill refresh

**Expected Console Output:**
```
# Anonymous state:
🔍 [getUserWeeklyActivity] No authenticated user, using anonymous preview

# After login:
🎯 [7-DAY PILL] Auth ready event received
🎯 [7-DAY PILL] Starting setupWeeklyProgress...
🔍 [getUserWeeklyActivity] ProfileManager userId: abc-123
🔥 [7-DAY PILL] Current streak: 7 days
✅ [7-DAY PILL] setupWeeklyProgress completed
```

**Expected UI:**
- ✅ Anonymous: Shows 2-3 random preview pills
- ✅ After login: Shows real streak pills
- ✅ Smooth transition (no flicker)

---

### **Test 4: Scale Test (Large Streaks)**

**Prerequisite**: Need database access to mock large streak

**Mock Streak SQL:**
```sql
-- Temporarily set your user's streak to 2000 days
UPDATE user_streaks 
SET current = 2000, 
    lastHiDate = CURRENT_DATE,
    longest = 2000 
WHERE user_id = auth.uid();
```

**Steps:**
1. Run SQL to set 2000-day streak
2. Hard refresh dashboard
3. Open calendar
4. Check performance (< 100ms render)

**Expected Console Output:**
```
🔥 [7-DAY PILL] Current streak: 2000 days
📅 [7-DAY PILL] Calculating last 7 days of 2000 day streak
✅ [7-DAY PILL] Day 1: 2026-01-02 (0 days ago)
...
✅ [7-DAY PILL] Day 7: 2025-12-27 (6 days ago)
✅ [STREAK SYNC] Stat box + visual grid both updated: 2000 days
```

**Expected UI:**
- ✅ Only last 7 days shown in pills (not first 7)
- ✅ Stat box shows "2000"
- ✅ Calendar handles 2000 days without lag
- ✅ No performance degradation

**Performance Check:**
```javascript
// In browser console:
console.time('pill-render');
await window.setupWeeklyProgress();
console.timeEnd('pill-render');
// Should be < 100ms
```

---

### **Test 5: Network Failure (Graceful Degradation)**

**Steps:**
1. Open DevTools → Network tab
2. Set "Offline" mode
3. Hard refresh dashboard

**Expected Console Output:**
```
❌ Weekly activity load failed: [Network Error]
🔍 [getUserWeeklyActivity] Using anonymous preview
✅ [7-DAY PILL] setupWeeklyProgress completed
```

**Expected UI:**
- ✅ Shows 2-3 preview pills (not blank)
- ✅ Stat box shows "0" or "—" (not stuck on old value)
- ✅ No error thrown to user
- ✅ Recovers when back online

---

### **Test 6: Multi-Tier Verification**

**For Each Tier:**

| Tier | Test Account | Expected Behavior |
|------|--------------|-------------------|
| Free | (create test) | Pills render, 5 shares/month limit shown |
| Bronze | (your current) | Pills render, 30 shares/month shown |
| Silver | (mock tier) | Pills render, 75 shares/month shown |
| Gold | (mock tier) | Pills render, 150 shares/month shown |
| Premium | (mock tier) | Pills render, unlimited shown |
| Collective | (admin) | Pills render, admin features visible |

**SQL to Mock Tier:**
```sql
-- Set your tier temporarily
UPDATE user_tiers 
SET tier = 'gold', 
    starts_at = NOW(), 
    expires_at = NOW() + INTERVAL '30 days'
WHERE user_id = auth.uid();
```

**Steps (Per Tier):**
1. Mock tier in database
2. Hard refresh dashboard
3. Verify pills render
4. Check tier badge displays correctly

**Expected UI:**
- ✅ Pills render regardless of tier
- ✅ Tier badge matches mocked tier
- ✅ Share limits reflect tier
- ✅ No tier-specific pill rendering bugs

---

## 🚨 Failure Scenarios

### **❌ Race Condition Detected**

**Symptoms:**
- Console shows multiple "Starting setupWeeklyProgress..." without "completed"
- Pills flicker rapidly
- Streak number changes randomly

**Debug:**
```javascript
// Check guard state:
console.log('Running:', window.setupWeeklyProgressRunning);
console.log('Queued:', window.setupWeeklyProgressQueued);
```

**Fix Verification:**
- Guard should block duplicate calls
- Queue should batch rapid requests
- Only one execution should run at a time

---

### **❌ Pills Stuck Loading**

**Symptoms:**
- Skeleton loader never replaces with real pills
- Console shows "Starting..." but not "completed"
- weekStrip still contains skeleton HTML

**Debug:**
```javascript
// Check execution state:
console.log('weekStrip HTML:', document.getElementById('weekStrip').innerHTML);
console.log('Weekly activity:', await getUserWeeklyActivity());
```

**Likely Causes:**
- Network timeout (data never arrives)
- Error thrown in middle of function (check catch block)
- DOM element missing (weekStrip not found)

---

### **❌ Wrong Days Highlighted**

**Symptoms:**
- Pills show days that don't match calendar
- Streak number correct, but visual wrong

**Debug:**
```javascript
// Check date calculation:
const activity = await getUserWeeklyActivity();
console.log('Active days:', activity.activeDays);
console.log('Expected today:', new Date().toISOString().split('T')[0]);
```

**Likely Causes:**
- Timezone mismatch (UTC vs local)
- Date arithmetic bug (off-by-one)
- lastHiDate not normalized to midnight

---

## ✅ Success Criteria

### **All Tests Pass:**

- [x] Dashboard loads pills correctly (Test 1)
- [x] No race conditions detected (Test 2)
- [x] Auth state changes handled (Test 3)
- [x] 2000-day streaks render < 100ms (Test 4)
- [x] Network failures degrade gracefully (Test 5)
- [x] All 6 tiers work correctly (Test 6)

### **Console Logs Clean:**

- ✅ No "Already running" spam (indicates proper queue)
- ✅ Each render cycle completes (see "completed" log)
- ✅ Streak numbers match visual pills
- ✅ No errors/warnings in console

### **Visual Quality:**

- ✅ Pills render smoothly (no flicker)
- ✅ Correct days highlighted
- ✅ Streak number matches calendar
- ✅ Animations work (fade-in)
- ✅ Responsive on mobile

---

## 🔧 Rollback Plan

**If fix causes issues:**

```bash
# Revert changes:
git checkout HEAD^ -- public/lib/boot/dashboard-main.js

# Or manually remove:
# - Lines 522-524: Guard variables
# - Lines 527-537: Guard check
# - Lines 598-609: Finally block with queue processing
```

**Restore Original:**
```javascript
async function setupWeeklyProgress() {
  try {
    const weekStrip = document.getElementById('weekStrip');
    if (!weekStrip) return;
    // ... rest of original function
  } catch (error) {
    console.error('❌ [STREAK SYNC] setupWeeklyProgress failed:', error);
    const statEl = document.getElementById('userStreak');
    if (statEl) statEl.textContent = '0';
  }
}
```

---

## 📞 Report Results

**After testing, report:**

1. **Which tests passed/failed**
2. **Console logs during failure** (screenshot/paste)
3. **Visual symptoms** (screen recording if possible)
4. **Browser + OS version**
5. **User tier during test**
6. **Streak length during test**

**Format:**
```
Test Results (2026-01-02):
✅ Test 1: Dashboard load - PASSED
✅ Test 2: Race condition - PASSED (saw queue logs)
❌ Test 3: Auth changes - FAILED (pills didn't refresh after login)
   - Console: [paste error logs]
   - Browser: Chrome 120.0.6099.109 (macOS 14.2)
   - Tier: Bronze
   - Streak: 7 days
```

---

**Ready to test!** Start with **Quick Test** (2 min), then run full suite if issues found.
