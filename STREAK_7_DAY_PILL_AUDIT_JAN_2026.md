# 🔬 SURGICAL AUDIT: 7-DAY PILL STREAK SYSTEM
**Date:** January 3, 2026  
**System:** Dashboard Streak Display & Calendar Integration  
**Scope:** Data flow, consistency, reliability, user trust

---

## 🎯 EXECUTIVE SUMMARY

**Diagnosis:** 🟡 **FUNCTIONAL BUT NOT TIGHT**

Your instinct is correct - the 7-day pill system has **multiple competing data sources** causing inconsistency. It works *most of the time* but lacks a **single source of truth**, leading to:

1. ❌ **Race conditions** between calendar and dashboard updates
2. ❌ **Cache desync** - localStorage can show stale data
3. ❌ **No server-side validation** - streak only calculated client-side
4. ❌ **Duplicate streak logic** - 5+ different calculation methods
5. ❌ **lastHiDate dependency** - breaks if date not set correctly

**Root Cause:** System evolved organically with fallbacks added for reliability, but no consolidation pass to establish authority.

---

## 🔍 ISSUE 1: MULTIPLE DATA SOURCES (NO SINGLE TRUTH)

### Current Architecture (FRAGMENTED)

The 7-day pill pulls streak data from **5 different sources** in this order:

```javascript
// File: dashboard-main.js loadUserStreak()
// 
// Source 1: DIRECT DATABASE QUERY
const { data } = await supabaseClient
  .from('user_stats')
  .select('current_streak')
  .eq('user_id', userId)
  .single();

// Source 2: HIBASE API
const streakResult = await window.HiBase.getUserStreak(userId);

// Source 3: LOCALSTORAGE CACHE
const cached = localStorage.getItem('user_current_streak');

// Source 4: CALENDAR MODULE (when calendar opened)
// File: premium-calendar.js loadRemoteStreaks()
const res = await window.HiBase.streaks.getMyStreaks();
this.updateDashboardStreakPill(res.data.current);

// Source 5: FALLBACK (if all fail)
updateStreakDisplay(0);
```

### The Problem

**Each source can return different values:**

```javascript
// SCENARIO: User drops a Hi at 11:59 PM

// Database: Updated by trigger → streak = 5 ✅
// HiBase cache: Not refreshed yet → streak = 4 ❌
// localStorage: Stale → streak = 4 ❌
// Calendar: Queries database → streak = 5 ✅
// Dashboard pill: Shows 4 (from HiBase cache) ❌

// User sees: "Calendar says 5, dashboard says 4" 😵
```

**Code Evidence:**

```javascript
// dashboard-main.js line 84-89
const { data: statsData, error } = await supabaseClient
  .from('user_stats')
  .select('current_streak')  // ← Direct query (authoritative)
  .eq('user_id', userId)
  .single();

// BUT THEN...

// dashboard-main.js line 118-120
const cached = localStorage.getItem('user_current_streak'); // ← Cache (stale)
if (cached) {
  streakValue = parseInt(cached, 10);  // ← Can override database!
}
```

### Why This Isn't Tight

1. **No Authority Hierarchy**: Database *should* be authoritative, but fallbacks can override it
2. **Race Conditions**: Calendar and dashboard load in parallel, whoever finishes last "wins"
3. **Cache Invalidation**: localStorage never expires - can show 3-day-old data
4. **No Consistency Check**: System never validates if sources agree

---

## 🔍 ISSUE 2: CALENDAR ↔ DASHBOARD SYNC (RACE CONDITION)

### Current Flow

```
USER OPENS DASHBOARD
    ↓
[PARALLEL EXECUTION - THIS IS THE PROBLEM]
    ↓                                ↓
Dashboard loads streak        Calendar module loads
    (queries HiBase)              (queries database)
    ↓                                ↓
Sets pill to 4                  Gets 5 from DB
    ↓                                ↓
[USER OPENS CALENDAR]               ↓
    ↓                                ↓
Calendar calls:                      ↓
updateDashboardStreakPill(5)  ←──────┘
    ↓
Pill now shows 5
(but user saw 4 for 2 seconds)
```

**Code Evidence:**

```javascript
// premium-calendar.js line 225-237
updateDashboardStreakPill(streakValue) {
  // 🎯 CONSOLIDATED UPDATE: Trigger unified weekly progress setup
  if (window.setupWeeklyProgress && typeof window.setupWeeklyProgress === 'function') {
    console.log(`🔥 [STREAK SYNC] Triggering consolidated update with value: ${streakValue}`);
    window.setupWeeklyProgress();  // ← OVERWRITES dashboard's value!
  }
}
```

### The Problem

1. **No Synchronization**: Calendar and dashboard load independently
2. **No State Locking**: Calendar can update pill while dashboard is still loading
3. **Whichever-Wins**: Last module to finish sets the value (unpredictable)

### Visual Evidence (User Perspective)

```
Timeline:
0.0s → Page loads → Pill shows "Loading..."
0.5s → Dashboard finishes → Pill shows "4 🔥"
1.2s → Calendar finishes → Pill jumps to "5 🔥"

User thinks: "Wait, did I just gain a streak day by refreshing? Is this accurate?" 😕
```

---

## 🔍 ISSUE 3: SERVER-SIDE VS CLIENT-SIDE CALCULATION

### The Split Brain Problem

**SERVER-SIDE** (SQL Functions)
- Location: `FIX_STREAK_WITH_CHECKINS.sql`
- Logic: Counts consecutive days from `public_shares` AND `hi_points_daily_checkins`
- Runs: On share creation, check-in, manual refresh

**CLIENT-SIDE** (JavaScript)
- Location: `dashboard-main.js generateWeeklyFromStreak()`
- Logic: Works backwards from `lastHiDate`
- Runs: On dashboard load, calendar open

**The Problem: They use different logic**

```sql
-- SERVER-SIDE (FIX_STREAK_WITH_CHECKINS.sql line 34-62)
-- Counts UNION of shares + check-ins
SELECT COUNT(DISTINCT activity_date)
FROM (
  SELECT DATE(created_at) as activity_date 
  FROM public_shares 
  WHERE user_id = user_uuid
  UNION
  SELECT checkin_date as activity_date 
  FROM hi_points_daily_checkins 
  WHERE user_id = user_uuid
) all_activity;
```

```javascript
// CLIENT-SIDE (dashboard-main.js line 665-709)
// Works backwards from lastHiDate ONLY
function generateWeeklyFromStreak(streakData) {
  const lastHi = new Date(lastHiDate + 'T00:00:00');  // ← Single date source
  
  for (let i = 0; i < daysToShow; i++) {
    const streakDay = new Date(lastHi);
    streakDay.setDate(lastHi.getDate() - i);  // ← Assumes consecutive
    activeDays.push(dateKey);
  }
}
```

### Why This Breaks Trust

**SCENARIO: User checks in but doesn't drop a Hi**

```
Day 1: Drop Hi → lastHiDate = 2026-01-01, streak = 1 ✅
Day 2: Drop Hi → lastHiDate = 2026-01-02, streak = 2 ✅
Day 3: Check-in only → lastHiDate = 2026-01-02 (unchanged!), streak = 3 ✅ (server counts it)

BUT...

Client-side generateWeeklyFromStreak():
- lastHiDate = 2026-01-02
- Works backwards 3 days from 2026-01-02
- Shows: Jan 2, Jan 1, Dec 31 ❌ (Dec 31 is WRONG!)
- Should show: Jan 3, Jan 2, Jan 1 ✅

User sees: "Why is Dec 31 lit up? I didn't use the app that day!" 🤔
```

**Code Evidence:**

```javascript
// dashboard-main.js line 681-709
const lastHi = new Date(lastHiDate + 'T00:00:00');  // ← Problem: assumes lastHiDate is TODAY if streak is active

for (let i = 0; i < daysToShow; i++) {
  const streakDay = new Date(lastHi);
  streakDay.setDate(lastHi.getDate() - i);  // ← Works backwards (assumes consecutive from lastHiDate)
  
  const dateKey = streakDay.toISOString().split('T')[0];
  activeDays.push(dateKey);  // ← Adds date even if no activity that day!
}
```

### Root Cause

**Server calculates streak correctly** (counts actual activity days)  
**Client displays incorrectly** (assumes consecutive days from lastHiDate)  
**Gap:** lastHiDate doesn't update on check-ins (only on Hi drops)

---

## 🔍 ISSUE 4: CACHE INVALIDATION (STALE DATA)

### Current Caching Strategy

```javascript
// dashboard-main.js line 132
localStorage.setItem('user_current_streak', finalStreak.toString());

// PROBLEM: No expiration time, no validation, no invalidation
```

### When Cache Goes Stale

```
Monday 9:00 AM
  User logs in → Database: 5 → Cache: 5 ✅

Monday 11:59 PM
  User drops Hi → Database: 6 → Cache: 5 ❌ (not updated!)

Tuesday 9:00 AM
  User logs in → Database: 6
  BUT loadUserStreak() hits cache first:
    cached = localStorage.getItem('user_current_streak'); // Returns "5"
    updateStreakDisplay(5);  // Shows wrong value!
  
  Then database loads...
    streakValue = statsData.current_streak; // Gets 6
    updateStreakDisplay(6);  // Corrects to 6
  
  User saw: 5 → 6 flicker (not smooth)
```

### Code Evidence

```javascript
// dashboard-main.js line 73
localStorage.removeItem('user_current_streak');  // ← GOOD: Clears cache
// BUT this only runs on page load, not on streak updates!

// dashboard-main.js line 145-146
const fallback = parseInt(localStorage.getItem('user_current_streak') || '0', 10);
updateStreakDisplay(fallback);  // ← BAD: Shows stale cache if DB fails
```

### The Problem

1. **No TTL (Time To Live)**: Cache never expires
2. **No Validation**: System doesn't check if cache matches reality
3. **Write-After-Read**: Updates cache AFTER showing value (causes flicker)
4. **Partial Invalidation**: Cleared on page load but not on streak changes

---

## 🔍 ISSUE 5: DUPLICATE STREAK CALCULATION LOGIC

### 5+ Different Methods Found

**1. Server-Side SQL** (`FIX_STREAK_WITH_CHECKINS.sql`)
```sql
-- Counts consecutive days with ROW_NUMBER window function
SELECT COUNT(*) FROM streak_calc
WHERE streak_group = (SELECT MAX(activity_date) FROM ordered_dates);
```

**2. HiBase API** (`lib/hibase/streaks.js calculateStreakStatus()`)
```javascript
const daysSinceLastHi = Math.floor((new Date(today) - new Date(lastHiDate)) / (1000 * 60 * 60 * 24));
// Returns: { current, longest, status, daysUntilBreak }
```

**3. Dashboard Visual** (`dashboard-main.js generateWeeklyFromStreak()`)
```javascript
// Works backwards from lastHiDate
for (let i = 0; i < daysToShow; i++) {
  streakDay.setDate(lastHi.getDate() - i);
}
```

**4. Calendar Local** (`premium-calendar.js calculateStreak()`)
```javascript
// Loops through hiMoments object (localStorage)
for (let i = 0; i < 365; i++) {
  if (this.hiMoments[monthKey]?.[dayKey] > 0) {
    streak++;
  } else if (i > 0) {
    break; // Streak broken
  }
}
```

**5. Legacy db.js** (`assets/db.js calculateStreaks()`)
```javascript
// Sorts dates, finds consecutive runs
const daysSinceLastActivity = Math.floor((today - lastDay) / (1000 * 60 * 60 * 24));
if (daysSinceLastActivity <= 1) {
  currentStreak = streak;
}
```

### Why This Is Not Tight

1. **5 Different Results Possible**: Each method uses different data sources
2. **Timezone Bugs**: Some use UTC, some use local time
3. **No Unit Tests**: Can't verify all 5 match
4. **Maintenance Nightmare**: Fix bug in one place, breaks another

---

## 🔍 ISSUE 6: NO VALIDATION OR HEALTH CHECKS

### What's Missing

```javascript
// SHOULD EXIST BUT DOESN'T:

async function validateStreakConsistency() {
  const dbValue = await getStreakFromDatabase();
  const cacheValue = localStorage.getItem('user_current_streak');
  const uiValue = document.getElementById('userStreak').textContent;
  
  if (dbValue !== cacheValue || dbValue !== uiValue) {
    console.error('🚨 STREAK MISMATCH:', { dbValue, cacheValue, uiValue });
    // Auto-correct to DB value
    updateStreakDisplay(dbValue);
    localStorage.setItem('user_current_streak', dbValue);
  }
}
```

### Current Reality

- ❌ No validation that sources agree
- ❌ No error if streak jumps unexpectedly (5 → 2 is accepted)
- ❌ No health check on page load
- ❌ No monitoring/alerts for desyncs

---

## 💡 RECOMMENDED FIXES (PRIORITY ORDER)

### 🔴 HIGH PRIORITY - Fix These First

#### **FIX 1: Establish Single Source of Truth (Database)**

**Current Problem:** 5 sources compete, no authority  
**Solution:** Always trust database, others are display-only cache

```javascript
// NEW: lib/streak-authority.js
class StreakAuthority {
  static async getAuthoritative(userId) {
    // 🎯 SINGLE SOURCE: Always query database
    const { data, error } = await supabaseClient
      .from('user_stats')
      .select('current_streak, longest_streak, last_hi_date')
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    
    // 🛡️ VALIDATE: Sanity checks
    if (data.current_streak < 0) {
      console.error('🚨 INVALID STREAK:', data.current_streak);
      return { current: 0, longest: data.longest_streak, lastHiDate: null };
    }
    
    // ✅ CACHE: Update localStorage after validation
    localStorage.setItem('user_current_streak', data.current_streak.toString());
    localStorage.setItem('user_streak_timestamp', Date.now().toString());
    
    return data;
  }
  
  static getCached(maxAgeMs = 60000) { // 1 minute TTL
    const value = localStorage.getItem('user_current_streak');
    const timestamp = localStorage.getItem('user_streak_timestamp');
    
    if (!value || !timestamp) return null;
    
    const age = Date.now() - parseInt(timestamp, 10);
    if (age > maxAgeMs) {
      console.log('🕐 Cache expired, refetching...');
      return null; // Too old, force refresh
    }
    
    return parseInt(value, 10);
  }
}
```

**Implementation:**
```javascript
// dashboard-main.js loadUserStreak() - REPLACE ALL with:
async function loadUserStreak() {
  try {
    // Try cache first (1 min TTL)
    const cached = StreakAuthority.getCached();
    if (cached !== null) {
      updateStreakDisplay(cached);
      return; // Fast path
    }
    
    // Fetch authoritative value
    const streak = await StreakAuthority.getAuthoritative(userId);
    updateStreakDisplay(streak.current);
    
  } catch (error) {
    console.error('Streak load failed:', error);
    updateStreakDisplay(0); // Graceful degradation
  }
}
```

**Benefits:**
- ✅ Database is always authority
- ✅ Cache has TTL (auto-expires)
- ✅ Validation catches corrupt data
- ✅ Single code path (no competing fallbacks)

---

#### **FIX 2: Synchronize Calendar ↔ Dashboard Updates**

**Current Problem:** Race condition causes flicker  
**Solution:** Event-driven updates with state locking

```javascript
// NEW: lib/streak-events.js
class StreakEvents {
  static #updateInProgress = false;
  static #pendingValue = null;
  
  static async broadcastUpdate(newValue) {
    // 🔒 LOCK: Prevent concurrent updates
    if (this.#updateInProgress) {
      console.log('Update in progress, queueing:', newValue);
      this.#pendingValue = newValue;
      return;
    }
    
    this.#updateInProgress = true;
    
    try {
      // 🎯 ATOMIC UPDATE: All displays at once
      const updates = [
        this.#updateDashboardPill(newValue),
        this.#updateWeeklyGrid(newValue),
        this.#updateCalendar(newValue)
      ];
      
      await Promise.all(updates);
      
      // 📢 EVENT: Notify listeners
      window.dispatchEvent(new CustomEvent('hi:streak-synced', {
        detail: { value: newValue, timestamp: Date.now() }
      }));
      
    } finally {
      this.#updateInProgress = false;
      
      // 🔄 PROCESS QUEUE: Handle pending update
      if (this.#pendingValue !== null) {
        const pending = this.#pendingValue;
        this.#pendingValue = null;
        await this.broadcastUpdate(pending);
      }
    }
  }
  
  static #updateDashboardPill(value) {
    const el = document.getElementById('userStreak');
    if (el) el.textContent = value;
  }
  
  static #updateWeeklyGrid(value) {
    if (window.setupWeeklyProgress) {
      window.setupWeeklyProgress();
    }
  }
  
  static #updateCalendar(value) {
    if (window.PremiumCalendar?.instance) {
      window.PremiumCalendar.instance.remoteStreak = { current: value };
      window.PremiumCalendar.instance.updateCalendar();
    }
  }
}
```

**Usage:**
```javascript
// premium-calendar.js - REPLACE updateDashboardStreakPill()
async loadRemoteStreaks() {
  const res = await window.HiBase.streaks.getMyStreaks();
  if (res?.data) {
    await StreakEvents.broadcastUpdate(res.data.current); // ← Single call updates everything
  }
}
```

**Benefits:**
- ✅ No more race conditions
- ✅ No more flicker
- ✅ All displays update atomically
- ✅ Queue handles rapid updates

---

#### **FIX 3: Server-Side lastHiDate Update on Check-ins**

**Current Problem:** lastHiDate only updates on share creation, breaks 7-day pill visual  
**Solution:** Update lastHiDate on check-ins too

```sql
-- MODIFY: hi_points_daily_checkins INSERT trigger
CREATE OR REPLACE FUNCTION update_stats_on_checkin()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user_stats with check-in activity
  INSERT INTO user_stats (user_id, last_hi_date, updated_at)
  VALUES (NEW.user_id, NEW.checkin_date, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    last_hi_date = GREATEST(user_stats.last_hi_date, NEW.checkin_date), -- ← KEY FIX
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stats_after_checkin
AFTER INSERT ON hi_points_daily_checkins
FOR EACH ROW
EXECUTE FUNCTION update_stats_on_checkin();
```

**Benefits:**
- ✅ lastHiDate always reflects most recent activity
- ✅ 7-day pill shows correct days
- ✅ No more phantom days in calendar

---

### 🟡 MEDIUM PRIORITY - Do Next Week

#### **FIX 4: Add Validation & Health Checks**

```javascript
// NEW: lib/streak-validator.js
class StreakValidator {
  static async runHealthCheck() {
    const userId = window.ProfileManager?.getUserId();
    if (!userId || userId === 'anonymous') return;
    
    const results = {
      timestamp: new Date().toISOString(),
      checks: []
    };
    
    // Check 1: Database vs Cache
    const dbValue = await this.#getFromDatabase(userId);
    const cacheValue = parseInt(localStorage.getItem('user_current_streak') || '0', 10);
    const uiValue = parseInt(document.getElementById('userStreak')?.textContent || '0', 10);
    
    results.checks.push({
      name: 'Database vs Cache',
      pass: dbValue === cacheValue,
      dbValue,
      cacheValue,
      diff: Math.abs(dbValue - cacheValue)
    });
    
    // Check 2: Database vs UI
    results.checks.push({
      name: 'Database vs UI',
      pass: dbValue === uiValue,
      dbValue,
      uiValue,
      diff: Math.abs(dbValue - uiValue)
    });
    
    // Check 3: Streak Sanity
    results.checks.push({
      name: 'Streak Sanity',
      pass: dbValue >= 0 && dbValue < 10000, // Reasonable bounds
      value: dbValue
    });
    
    // Check 4: lastHiDate Recency
    const { last_hi_date } = await this.#getFullStreak(userId);
    const daysSince = Math.floor((Date.now() - new Date(last_hi_date)) / (1000 * 60 * 60 * 24));
    results.checks.push({
      name: 'lastHiDate Recency',
      pass: daysSince <= 1, // Active streak should be recent
      daysSince,
      lastHiDate: last_hi_date
    });
    
    // Auto-fix critical issues
    const critical = results.checks.filter(c => !c.pass);
    if (critical.length > 0) {
      console.error('🚨 STREAK HEALTH CHECK FAILED:', critical);
      await this.#autoFix(userId, dbValue);
    }
    
    return results;
  }
  
  static async #autoFix(userId, correctValue) {
    // Force all displays to match database
    document.getElementById('userStreak').textContent = correctValue;
    localStorage.setItem('user_current_streak', correctValue.toString());
    await StreakEvents.broadcastUpdate(correctValue);
    console.log('✅ Auto-fixed streak to:', correctValue);
  }
}
```

**Run on:**
- Page load
- After streak update
- Every 5 minutes (background)

---

#### **FIX 5: Consolidate Calculation Logic**

**Current Problem:** 5 different methods  
**Solution:** Single calculation function

```javascript
// NEW: lib/streak-calculator.js
class StreakCalculator {
  /**
   * Calculate streak from activity dates (client-side backup)
   * NOTE: Server-side SQL is authoritative, this is for preview/offline only
   */
  static calculateFromDates(activityDates) {
    if (activityDates.length === 0) return { current: 0, longest: 0 };
    
    // Sort descending (most recent first)
    const sorted = activityDates
      .map(d => new Date(d).toISOString().split('T')[0])
      .sort()
      .reverse();
    
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    // Check if streak is active (today or yesterday)
    if (sorted[0] !== today && sorted[0] !== yesterday) {
      return { current: 0, longest: this.#findLongestStreak(sorted) };
    }
    
    // Count current streak
    let current = 0;
    let expectedDate = new Date(sorted[0]);
    
    for (const dateStr of sorted) {
      const date = new Date(dateStr);
      const expected = expectedDate.toISOString().split('T')[0];
      
      if (dateStr === expected) {
        current++;
        expectedDate.setDate(expectedDate.getDate() - 1); // Go back one day
      } else {
        break; // Streak broken
      }
    }
    
    return {
      current,
      longest: Math.max(current, this.#findLongestStreak(sorted))
    };
  }
  
  static #findLongestStreak(sortedDates) {
    let longest = 0;
    let current = 1;
    let expectedDate = new Date(sortedDates[0]);
    
    for (let i = 1; i < sortedDates.length; i++) {
      expectedDate.setDate(expectedDate.getDate() - 1);
      const expected = expectedDate.toISOString().split('T')[0];
      
      if (sortedDates[i] === expected) {
        current++;
      } else {
        longest = Math.max(longest, current);
        current = 1;
        expectedDate = new Date(sortedDates[i]);
      }
    }
    
    return Math.max(longest, current);
  }
}
```

**Replace:**
- ❌ `dashboard-main.js generateWeeklyFromStreak()` → Use StreakCalculator
- ❌ `premium-calendar.js calculateStreak()` → Use StreakCalculator
- ❌ `assets/db.js calculateStreaks()` → Use StreakCalculator
- ✅ Keep SQL function (server-side authority)

---

### 🟢 LOW PRIORITY - Polish & Nice-to-Have

#### **FIX 6: Add Streak Confidence Indicator**

Show users when streak data is fresh vs stale:

```html
<div id="userStreak">
  5
  <span class="streak-freshness" title="Updated 30 seconds ago">✅</span>
</div>
```

```javascript
class StreakFreshness {
  static update(timestamp) {
    const age = Date.now() - timestamp;
    const el = document.querySelector('.streak-freshness');
    
    if (age < 60000) {
      el.textContent = '✅'; // Fresh (< 1 min)
      el.title = 'Just updated';
    } else if (age < 300000) {
      el.textContent = '🕐'; // Aging (1-5 min)
      el.title = `Updated ${Math.floor(age / 60000)} min ago`;
    } else {
      el.textContent = '⚠️'; // Stale (> 5 min)
      el.title = 'Click to refresh';
      el.style.cursor = 'pointer';
      el.onclick = () => loadUserStreak();
    }
  }
}
```

---

## 📊 TESTING PLAN

### Manual Testing Checklist

**Test 1: Dashboard Load**
- [ ] Hard refresh (Cmd+Shift+R)
- [ ] Check pill shows number within 2 seconds
- [ ] Open DevTools → Console
- [ ] Verify no `STREAK MISMATCH` errors
- [ ] Check `localStorage` → `user_current_streak` matches UI

**Test 2: Calendar Sync**
- [ ] Open dashboard → note streak value
- [ ] Open calendar modal
- [ ] Verify dashboard pill doesn't change
- [ ] Close calendar
- [ ] Refresh page
- [ ] Verify value is still same

**Test 3: Check-in Test**
- [ ] Note current streak (e.g., 5)
- [ ] Do daily check-in
- [ ] Wait 2 seconds
- [ ] Verify streak increments to 6
- [ ] Open calendar
- [ ] Verify today is marked active
- [ ] Verify 7-day pill shows today lit

**Test 4: Cross-Day Test**
- [ ] Check streak at 11:58 PM (e.g., 7)
- [ ] Wait until 12:01 AM
- [ ] Drop a Hi
- [ ] Verify streak goes to 8
- [ ] Verify yesterday + today both lit in 7-day pill

**Test 5: Cache Expiration**
- [ ] Load dashboard (note streak = 5)
- [ ] Wait 2 minutes (cache expires)
- [ ] Refresh page
- [ ] Verify no flicker (should load from database smoothly)

---

## ✅ SUCCESS CRITERIA

After implementing fixes, system should:

1. ✅ **Single Source of Truth**: Database always authoritative
2. ✅ **No Flicker**: Streak number never jumps unexpectedly
3. ✅ **No Desync**: Dashboard and calendar always match
4. ✅ **Fast Load**: Cached value shows instantly, updates if stale
5. ✅ **Health Checks**: System validates consistency every 5 min
6. ✅ **User Trust**: "I know my streak is accurate"

---

## 🎯 SUMMARY: WHY IT'S NOT TIGHT

**Your instinct is 100% correct.** The 7-day pill system has:

1. ❌ **No single source of truth** - 5 competing data sources
2. ❌ **Race conditions** - calendar can overwrite dashboard mid-load
3. ❌ **Stale cache** - localStorage never expires
4. ❌ **Split brain** - server calculates correctly, client displays incorrectly
5. ❌ **Duplicate logic** - 5 different calculation methods
6. ❌ **No validation** - system doesn't check if sources agree

**The fix is not complex, just consolidation:**
- Make database the authority
- Add cache TTL
- Synchronize updates
- Fix lastHiDate on check-ins
- Run health checks

**This is a refactoring job, not a rewrite.** The data is correct in the database, we just need to trust it consistently.

---

**Do these findings resonate with what you're experiencing?** 

Let me know if you want me to implement any of these fixes, or if you want to discuss the approach before we start coding.
