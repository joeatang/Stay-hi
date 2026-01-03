# 🚨 CRITICAL ISSUES FOUND - TRIPLE CHECK AUDIT

**Date:** January 3, 2026  
**Status:** ⚠️ **5 ISSUES FOUND - FIXES NEEDED**

---

## ❌ ISSUE 1: StreakAuthority NOT Loaded When Needed

**Location:** `loadUserStreak()` in dashboard-main.js line 73

**Problem:**
```javascript
const streak = await window.StreakAuthority.get(userId);
```

**StreakAuthority.js loads AFTER dashboard-main.js!**

```html
<!-- In hi-dashboard.html -->
<script src="./lib/streak/StreakAuthority.js"></script>  <!-- Line 1833 -->
<script src="./lib/streak/StreakEvents.js"></script>      <!-- Line 1834 -->
<script src="./lib/boot/dashboard-main.js" defer></script> <!-- Line 1836 -->
```

**Impact:** `window.StreakAuthority` is `undefined` when `loadUserStreak()` runs!

**Fix:**
```javascript
// Add fallback check
const streak = window.StreakAuthority 
  ? await window.StreakAuthority.get(userId)
  : { current: 0, longest: 0, lastHiDate: null };
```

---

## ❌ ISSUE 2: StreakEvents.broadcast() Called But Doesn't Update Stat Box

**Location:** `StreakEvents.js` line 47

**Problem:**
```javascript
static async #updateDashboardPill(value) {
  const el = document.getElementById('userStreak');
  if (el) {
    el.textContent = value;  // ← Sets text directly
  }
}
```

**BUT setupWeeklyProgress() ALSO updates the stat box:**
```javascript
// dashboard-main.js line 529
const statEl = document.getElementById('userStreak');
if (statEl && Number.isFinite(streakValue)) {
  statEl.textContent = streakValue;  // ← Overwrites StreakEvents update!
}
```

**Impact:** Race condition! Whoever runs last wins.

**Fix:** Remove duplicate stat box update from setupWeeklyProgress(), let StreakEvents handle it.

---

## ❌ ISSUE 3: getUserWeeklyActivity() Still Uses OLD HiBase API

**Location:** dashboard-main.js line 569

**Problem:**
```javascript
const streakResult = await window.HiBase?.streaks?.getUserStreak?.(userId);
```

**This BYPASSES StreakAuthority!** Different data source = inconsistency returns!

**Impact:** 7-day pill and stat box can show different values (old problem returns).

**Fix:** Use StreakAuthority in getUserWeeklyActivity() too:
```javascript
const streakResult = await window.StreakAuthority.get(userId);
```

---

## ❌ ISSUE 4: NaN Risk in parseInt()

**Location:** StreakAuthority.js lines 81, 82

**Problem:**
```javascript
current: parseInt(value, 10),  // ← What if value is corrupted?
longest: parseInt(localStorage.getItem('user_longest_streak') || '0', 10),
```

**If localStorage has corrupt data:** `parseInt('corrupted')` → `NaN`

**Impact:** UI shows "NaN days" 😱

**Fix:**
```javascript
current: Math.max(0, parseInt(value, 10) || 0),
longest: Math.max(0, parseInt(localStorage.getItem('user_longest_streak') || '0', 10) || 0),
```

---

## ❌ ISSUE 5: Missing Error Handling in StreakEvents.broadcast()

**Location:** StreakEvents.js line 40

**Problem:**
```javascript
await Promise.all([
  this.#updateDashboardPill(newValue),
  this.#updateWeeklyGrid(),
  this.#updateCalendarDisplay(newValue)
]);
```

**If ONE fails, ALL fail!** Promise.all() rejects if any promise rejects.

**Impact:** Calendar fails → dashboard pill doesn't update either.

**Fix:**
```javascript
await Promise.allSettled([  // ← Use allSettled, not all
  this.#updateDashboardPill(newValue),
  this.#updateWeeklyGrid(),
  this.#updateCalendarDisplay(newValue)
]);
```

---

## 🔧 REQUIRED FIXES

All 5 issues need fixing before testing. Ready to implement?

