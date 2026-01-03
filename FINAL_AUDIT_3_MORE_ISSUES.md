# 🚨 FINAL AUDIT - 3 MORE CRITICAL ISSUES FOUND

**Date:** January 3, 2026  
**Status:** ⚠️ **3 NEW ISSUES - MUST FIX**

---

## ❌ ISSUE 6: StreakEvents.broadcast() Gets WRONG VALUE

**Location:** premium-calendar.js line 226

**Problem:**
```javascript
updateDashboardStreakPill(streakValue) {
  if (window.StreakEvents) {
    window.StreakEvents.broadcast(streakValue); // ← Passes VALUE from calendar
  }
}
```

**But calendar loads streak from OLD API:**
```javascript
// premium-calendar.js line 188-207
const res = await window.HiBase.streaks.getMyStreaks(); // ← OLD API!
this.updateDashboardStreakPill(res.data.current); // ← Could be stale!
```

**Impact:** Calendar bypasses StreakAuthority → broadcasts stale value → dashboard shows wrong number!

**Fix:** Calendar should call `StreakAuthority.get()` first, THEN broadcast:
```javascript
updateDashboardStreakPill(streakValue) {
  // 🎯 FIX: Always fetch from authority before broadcasting
  const userId = window.ProfileManager?.getUserId?.();
  if (userId && window.StreakAuthority) {
    window.StreakAuthority.get(userId).then(streak => {
      window.StreakEvents.broadcast(streak.current);
    });
  } else {
    // Fallback to passed value
    window.StreakEvents.broadcast(streakValue);
  }
}
```

---

## ❌ ISSUE 7: Calendar Still Loads from OLD API

**Location:** premium-calendar.js line 188

**Problem:**
```javascript
async loadRemoteStreaks() {
  try {
    if (window.HiBase?.streaks?.getMyStreaks) {
      const res = await window.HiBase.streaks.getMyStreaks(); // ← BYPASSES StreakAuthority!
      this.remoteStreak = res.data;
      this.updateDashboardStreakPill(res.data.current);
    }
  }
}
```

**This completely bypasses our new system!** Calendar uses old HiBase API → different value than dashboard.

**Impact:** Old problem returns! Calendar shows 5, dashboard shows 4 (because different sources).

**Fix:** Replace with StreakAuthority:
```javascript
async loadRemoteStreaks() {
  try {
    const userId = window.ProfileManager?.getUserId?.();
    if (userId && userId !== 'anonymous' && window.StreakAuthority) {
      const streak = await window.StreakAuthority.get(userId);
      this.remoteStreak = streak;
      this.updateCalendar();
      // Broadcast through StreakEvents (single source)
      if (window.StreakEvents) {
        window.StreakEvents.broadcast(streak.current);
      }
    }
  } catch (e) {
    console.warn('⚠️ Calendar: failed to load remote streaks', e);
  }
}
```

---

## ❌ ISSUE 8: Cache Invalidation ONLY Removes Timestamp

**Location:** StreakAuthority.js line 92

**Problem:**
```javascript
static invalidate() {
  localStorage.removeItem(this.CACHE_TIMESTAMP_KEY); // ← Only removes timestamp!
  console.log('🧹 [StreakAuthority] Cache invalidated');
}
```

**But getCached() checks for value existence:**
```javascript
// Line 64
const value = localStorage.getItem(this.CACHE_KEY);
const timestamp = localStorage.getItem(this.CACHE_TIMESTAMP_KEY);

if (!value || !timestamp) return null; // ← Returns null if EITHER missing
```

**Impact:** Invalidate only removes timestamp, but old value still in cache. Next get() sees value exists, fetches timestamp (null), returns null, then fetches from database. Works but inefficient.

**Better:** Remove all cache keys for clean slate:
```javascript
static invalidate() {
  localStorage.removeItem(this.CACHE_KEY);
  localStorage.removeItem(this.CACHE_TIMESTAMP_KEY);
  localStorage.removeItem('user_longest_streak');
  localStorage.removeItem('user_last_hi_date');
  localStorage.removeItem(this.CACHE_USER_KEY);
  console.log('🧹 [StreakAuthority] Cache invalidated');
}
```

---

## 🔧 SEVERITY RANKING

**CRITICAL (Must fix before testing):**
- ❌ Issue 6 & 7: Calendar bypasses StreakAuthority (old problem returns!)

**MEDIUM (Should fix):**
- ❌ Issue 8: Inefficient invalidation (works but wasteful)

---

## 📊 EXECUTION FLOW TRACED

**CURRENT BROKEN FLOW:**
```
User opens dashboard
  ↓
loadUserStreak() 
  → StreakAuthority.get(userId)
  → Returns: 5 (from database) ✅
  ↓
Dashboard pill shows: 5 ✅
  ↓
User opens calendar
  ↓
loadRemoteStreaks()
  → window.HiBase.streaks.getMyStreaks() ← BYPASSES StreakAuthority! ❌
  → Returns: 4 (stale from old API) ❌
  ↓
updateDashboardStreakPill(4)
  → StreakEvents.broadcast(4) ← Broadcasts WRONG value! ❌
  ↓
Dashboard pill changes: 5 → 4 ❌❌❌

USER SEES: Flicker! Old problem returns!
```

**CORRECT FLOW SHOULD BE:**
```
User opens dashboard
  ↓
loadUserStreak() 
  → StreakAuthority.get(userId)
  → Returns: 5 ✅
  ↓
Dashboard pill shows: 5 ✅
  ↓
User opens calendar
  ↓
loadRemoteStreaks()
  → StreakAuthority.get(userId) ← USES SAME SOURCE ✅
  → Returns: 5 ✅
  ↓
updateDashboardStreakPill(5)
  → StreakEvents.broadcast(5) ← Same value ✅
  ↓
Dashboard pill stays: 5 ✅

USER SEES: No change (correct!)
```

---

## ✅ WHY THIS IS CRITICAL

**We didn't actually fix the root problem!** Calendar still using old HiBase API means:
- Different data source = inconsistency
- Race condition still possible
- Flicker can still happen

**This must be fixed or the whole refactor was pointless!**

