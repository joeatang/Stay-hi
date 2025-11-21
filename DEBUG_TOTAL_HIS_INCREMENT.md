# 🔍 TOTAL HIS INCREMENT BUG - ROOT CAUSE ANALYSIS

## Problem Statement
User reports: "TOTAL HI's increment by 1" on page refresh/navigation - should ONLY increment via share modals

## Investigation Findings

### ✅ SQL FUNCTIONS ARE CLEAN
- `get_user_stats()`: Read-only, just SELECT statements
- `get_global_stats()`: Read-only, counts from hi_moments table
- `increment_total_hi()`: Only called by trackShareSubmission() ✓
- **NO SQL SIDE EFFECTS**

### ✅ NO CLIENT-SIDE INCREMENT
- No code doing `gTotalHis++` or `gTotalHis += 1`
- GoldStandardTracker.js is the ONLY place calling increment_total_hi()
- **NO ROGUE INCREMENTS**

### ⚠️ DUPLICATE CACHE KEYS FOUND
**TWO different localStorage keys storing Total His:**

1. **`dashboard_total_cache`** (older system)
   - Written by: RealUserCount.js (line 107)
   - Written by: dashboard-main.js (line 625)
   - Read by: dashboard-main.js (line 527)

2. **`globalTotalHis`** (newer system)
   - Written by: UnifiedStatsLoader.js (line 35)
   - Read by: UnifiedStatsLoader.js (line 22)
   - Read by: StatsDebugOverlay.js (line 103)

### 🔍 HYPOTHESIS: Cache Synchronization Issue

**Possible Scenario:**
1. Page Load #1:
   - RealUserCount.js calls get_user_stats() → Gets 100 from DB
   - Writes to `dashboard_total_cache` = 100
   - UnifiedStatsLoader.js reads from cache `globalTotalHis` = 99 (old value)
   - UI shows 99

2. User submits via share modal:
   - Calls increment_total_hi() → DB now = 101
   - Updates window.gTotalHis = 101
   - UI shows 101 ✓

3. Page Refresh:
   - RealUserCount.js calls get_user_stats() → Gets 101 from DB
   - Writes to `dashboard_total_cache` = 101
   - UnifiedStatsLoader.js reads from cache `globalTotalHis` = 100 (was just updated last time)
   - Display flashes 100 → 101, user sees "increment"

### 🎯 ACTUAL ROOT CAUSE

**Multiple stats loaders racing with different cache keys creates appearance of increment**

The user is seeing the transition from cached value → fresh DB value, which looks like an increment but is actually just synchronization lag.

## Verification Needed
1. Check browser localStorage for both keys
2. Monitor console logs on page load
3. Verify which loader runs first
4. Check if values differ between the two cache keys

## Gold Standard Solution

**OPTION A: Unify Cache Keys** (Recommended)
- Consolidate to single cache key `globalTotalHis`
- Update RealUserCount.js and dashboard-main.js to use same key
- Add migration to copy old cache to new key

**OPTION B: Eliminate Cache** (Nuclear)
- Remove all localStorage caching of Total His
- Always fetch fresh from database
- May impact offline experience

**OPTION C: Add Cache Sync** (Complex)
- Keep both systems but add cross-sync
- When one updates, update the other
- More moving parts, more failure modes

## Recommended Fix
Option A - update RealUserCount.js to use `globalTotalHis` key instead of `dashboard_total_cache`
