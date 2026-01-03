# 🧪 7-Day Pills Testing Workflow

**Quick testing guide for various streak lengths**

---

## 🚀 Setup (One Time)

1. **Open 3 windows side-by-side:**
   - Supabase SQL Editor (for running test scripts)
   - Browser with Dashboard (http://localhost:3030/public/hi-dashboard.html)
   - Browser DevTools Console (F12 or Cmd+Option+I)

2. **Open the test SQL file:**
   ```
   TEST_7DAY_PILLS_VARIOUS_STREAKS.sql
   ```

---

## 📋 Testing Workflow (Each Scenario)

### **For Each Test:**

```bash
# 1. Run SQL snippet in Supabase
[Copy SQL for scenario X]
→ Run in SQL Editor
→ Wait for "TEST X: ... set" confirmation

# 2. Refresh dashboard
Cmd+Shift+R (hard refresh)

# 3. Check console logs
✅ "🔥 [7-DAY PILL] Current streak: X days"
✅ "📅 [7-DAY PILL] Calculating last Y days..."
✅ "✅ [7-DAY PILL] setupWeeklyProgress completed"

# 4. Visual verification
✅ Count filled pills (should match expected)
✅ Check stat box number (should match streak)
✅ Verify correct days highlighted

# 5. Performance check (for large streaks)
console.time('render');
await window.setupWeeklyProgress();
console.timeEnd('render'); // Should be < 100ms

# 6. Test race condition
// Rapidly click calendar 10 times
// Pills should stay stable (no flicker)
```

---

## 🎯 Test Scenarios & Expected Results

### **Test 1: Zero-Day Streak (New User)**

```sql
UPDATE user_streaks SET current = 0, lastHiDate = NULL WHERE user_id = auth.uid();
```

**Expected:**
- ✅ All 7 pills **empty** (no fill)
- ✅ Stat box: "0" or "—"
- ✅ Console: "⚠️ [7-DAY PILL] No streak data"

**Visual Check:**
```
[   ] [   ] [   ] [   ] [   ] [   ] [   ]
 Mon   Tue   Wed   Thu   Fri   Sat   Sun
```

---

### **Test 2: 1-Day Streak**

```sql
UPDATE user_streaks SET current = 1, lastHiDate = CURRENT_DATE WHERE user_id = auth.uid();
```

**Expected:**
- ✅ **Only today** filled (rightmost pill)
- ✅ Stat box: "1"
- ✅ Console: "📅 [7-DAY PILL] Calculating last 1 days..."

**Visual Check:**
```
[   ] [   ] [   ] [   ] [   ] [   ] [✅]
 Mon   Tue   Wed   Thu   Fri   Sat   Sun (today)
```

---

### **Test 3: 3-Day Streak**

```sql
UPDATE user_streaks SET current = 3, lastHiDate = CURRENT_DATE WHERE user_id = auth.uid();
```

**Expected:**
- ✅ Last **3 pills** filled (today + 2 previous)
- ✅ Stat box: "3"

**Visual Check:**
```
[   ] [   ] [   ] [   ] [✅] [✅] [✅]
 Mon   Tue   Wed   Thu   Fri   Sat   Sun
                          ↑    ↑    ↑
                         -2   -1  today
```

---

### **Test 4: 7-Day Streak (Full Week)**

```sql
UPDATE user_streaks SET current = 7, lastHiDate = CURRENT_DATE WHERE user_id = auth.uid();
```

**Expected:**
- ✅ **All 7 pills** filled
- ✅ Stat box: "7"
- ✅ Possible milestone badge (if configured)

**Visual Check:**
```
[✅] [✅] [✅] [✅] [✅] [✅] [✅]
 Mon   Tue   Wed   Thu   Fri   Sat   Sun
```

---

### **Test 5: 30-Day Streak**

```sql
UPDATE user_streaks SET current = 30, lastHiDate = CURRENT_DATE WHERE user_id = auth.uid();
```

**Expected:**
- ✅ **Last 7 pills** filled (NOT first 7!)
- ✅ Stat box: "30"
- ✅ Console shows: "Calculating last 7 days of 30 day streak"

**Critical Test:** Pills should show days -6 through today, NOT days 1-7 of the streak.

**Visual Check:**
```
[✅] [✅] [✅] [✅] [✅] [✅] [✅]
 Mon   Tue   Wed   Thu   Fri   Sat   Sun
 -6    -5    -4    -3    -2    -1   today
```

**Console Verification:**
```javascript
// Should log dates like:
✅ [7-DAY PILL] Day 1: 2026-01-02 (0 days ago)  // today
✅ [7-DAY PILL] Day 2: 2026-01-01 (1 days ago)
✅ [7-DAY PILL] Day 3: 2025-12-31 (2 days ago)
// ... NOT days from 30 days ago!
```

---

### **Test 6: 365-Day Streak**

```sql
UPDATE user_streaks SET current = 365, lastHiDate = CURRENT_DATE WHERE user_id = auth.uid();
```

**Expected:**
- ✅ Last 7 pills filled
- ✅ Stat box: "365"
- ✅ **No performance issues** (< 100ms render)

**Performance Check:**
```javascript
// In console:
console.time('365-day-render');
await window.setupWeeklyProgress();
console.timeEnd('365-day-render');
// Should be: 365-day-render: 15-50ms ✅
```

---

### **Test 7: 2000-Day Streak (SCALE TEST)**

```sql
UPDATE user_streaks SET current = 2000, lastHiDate = CURRENT_DATE WHERE user_id = auth.uid();
```

**Expected:**
- ✅ Last 7 pills filled (algorithm doesn't loop 2000 times!)
- ✅ Stat box: "2000"
- ✅ **Instant render** (< 100ms)
- ✅ Calendar opens smoothly (may have scroll lag, that's OK)

**Performance Test:**
```javascript
console.time('2000-day-render');
await window.setupWeeklyProgress();
console.timeEnd('2000-day-render');
// Should be: 2000-day-render: 20-80ms ✅ (NOT 2000ms!)
```

**Console Check:**
```
🔥 [7-DAY PILL] Current streak: 2000 days
📅 [7-DAY PILL] Calculating last 7 days of 2000 day streak
✅ [7-DAY PILL] Day 1: 2026-01-02 (0 days ago)
...
✅ [7-DAY PILL] setupWeeklyProgress completed
```

**Critical:** Should NOT see 2000 date calculations, only 7!

---

### **Test 8: Broken Streak (Old lastHiDate)**

```sql
UPDATE user_streaks SET current = 0, lastHiDate = CURRENT_DATE - INTERVAL '10 days' WHERE user_id = auth.uid();
```

**Expected:**
- ✅ All pills **empty**
- ✅ Stat box: "0"
- ✅ Console: "⚠️ [7-DAY PILL] No streak data" OR "current = 0"
- ✅ **No crash/error**

**Graceful Degradation Check:**
- Should NOT show pills from 10 days ago
- Should NOT throw error
- Should show zero state cleanly

---

### **Test 9: Yesterday's Hi (Edge Case)**

```sql
UPDATE user_streaks SET current = 1, lastHiDate = CURRENT_DATE - INTERVAL '1 day' WHERE user_id = auth.uid();
```

**Expected:**
- ✅ **Only yesterday** filled (second-to-last pill)
- ✅ **Today empty** (streak not continued yet today)
- ✅ Stat box: "1"

**Visual Check:**
```
[   ] [   ] [   ] [   ] [   ] [✅] [   ]
 Mon   Tue   Wed   Thu   Fri   Sat   Sun
                               ↑    ↑
                          yesterday today
                           (filled) (empty)
```

**Console Verification:**
```javascript
// Should calculate yesterday is 1 day ago
✅ [7-DAY PILL] Day 1: 2026-01-01 (1 days ago)
```

---

## 🎬 Race Condition Testing

**After each scenario, test rapid clicks:**

```javascript
// 1. Open calendar → Close it → Repeat 10 times FAST
// 2. Check console for:
✅ "🔄 [7-DAY PILL] Already running, queuing retry..."
✅ "🔄 [7-DAY PILL] Processing queued retry..."

// 3. Verify pills:
✅ No flickering
✅ Numbers stay stable
✅ No duplicate renders visible
```

**❌ FAILURE SIGNS:**
```javascript
// BAD - No guard working:
🎯 [7-DAY PILL] Starting setupWeeklyProgress...
🎯 [7-DAY PILL] Starting setupWeeklyProgress... // ❌ Started again before first finished!
```

---

## 🔄 Restore Real Data

**After all tests, restore your actual streak:**

```sql
-- Run the RESTORE section from TEST_7DAY_PILLS_VARIOUS_STREAKS.sql
UPDATE user_streaks
SET 
  current = b.current,
  longest = b.longest,
  lastHiDate = b.lastHiDate
FROM backup_user_streaks b
WHERE user_streaks.user_id = auth.uid();

-- Verify restoration
SELECT current, lastHiDate FROM user_streaks WHERE user_id = auth.uid();
```

**Then hard refresh dashboard to see your real streak again.**

---

## 📊 Pass/Fail Checklist

| Test | Streak | Expected Pills | Stat Box | Perf | Status |
|------|--------|----------------|----------|------|--------|
| 1 | 0 days | All empty | 0 | - | [ ] |
| 2 | 1 day | Today only | 1 | - | [ ] |
| 3 | 3 days | Last 3 filled | 3 | - | [ ] |
| 4 | 7 days | All 7 filled | 7 | - | [ ] |
| 5 | 30 days | Last 7 (not first!) | 30 | - | [ ] |
| 6 | 365 days | Last 7 filled | 365 | < 100ms | [ ] |
| 7 | 2000 days | Last 7 filled | 2000 | < 100ms | [ ] |
| 8 | Broken (old) | All empty | 0 | - | [ ] |
| 9 | Yesterday | Yesterday filled | 1 | - | [ ] |
| Race | Any | No flicker | Stable | - | [ ] |

---

## 🐛 Debugging Issues

### **Pills Not Updating After SQL Change:**

```javascript
// Force re-render:
await window.setupWeeklyProgress();

// Check streak data:
const userId = window.ProfileManager?.getUserId?.();
const result = await window.HiBase?.streaks?.getUserStreak?.(userId);
console.log('Streak data:', result);
```

### **Wrong Days Shown:**

```javascript
// Check date calculation:
const today = new Date();
const lastHi = new Date('2026-01-02'); // Your lastHiDate
console.log('Days ago:', Math.round((today - lastHi) / (24*60*60*1000)));
```

### **Performance Issues (> 100ms):**

```javascript
// Profile the render:
console.profile('pill-render');
await window.setupWeeklyProgress();
console.profileEnd('pill-render');
// Check flamegraph in DevTools Performance tab
```

---

## 📸 Screenshot Testing

For each scenario, take screenshot showing:
1. **Pills** (with dates/labels visible)
2. **Stat box** (streak number)
3. **Console logs** (showing streak calculation)

**Save as:** `test-X-Y-days.png` (e.g., `test-5-30-days.png`)

---

## ✅ Success Criteria

**All tests pass when:**

- ✅ Pills show **last 7 days** (not first 7) for streaks > 7
- ✅ Stat box matches SQL streak value
- ✅ No race conditions (queue logs show guard working)
- ✅ Large streaks (2000 days) render < 100ms
- ✅ Zero/broken streaks show empty state (no crash)
- ✅ Console logs match expected calculations

---

**Ready to test!** Start with **Test 1** (zero-day), work through all 9 scenarios, then restore real data.
