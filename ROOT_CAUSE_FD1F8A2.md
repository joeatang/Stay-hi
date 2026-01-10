# Root Cause: Forward Navigation Abort Cascade + Listener Stacking

**Build:** fd1f8a2  
**Date:** 2026-01-10

## The Real Problem

You're clicking the Dashboard link in the header (forward navigation), not using the back button. This causes:

1. **Fresh page load** while previous page's queries still running  
2. **Browser aborts** all in-flight Supabase requests (standard behavior)
3. **AbortErrors propagate** as unhandled rejections (10 on Dashboard return)
4. **Components re-initialize** without idempotency guards → listener stacking (11→51 click listeners!)
5. **ProfileManager races** between aborted old queries and new initialization

## Test Evidence (Build 79cd660)

```
Dashboard load 1: ✅ Clean start
Island load 1: ✅ Works fine  
Dashboard load 2: ❌ 10 AbortErrors, 51 click listeners, slow load
Island load 2: ❌ 35 click listeners, TypeError on pagehide
```

**NO BFCache restoration happened** - all fresh page loads.

## Root Causes

### 1. AbortError Cascade (Invariant 1 FAIL)
**Files throwing unhandled AbortErrors:**
- ProfileManager.js:432, 470
- RealUserCount.js:31  
- HiBase index.js:148
- hifeed-verification.js wrapping errors

**Fix required:** Wrap EVERY Supabase call:
```javascript
catch (err) {
  if (err.name === 'AbortError') return null; // Silent, expected
  throw err;
}
```

### 2. Listener Stacking (Invariant 2 FAIL)
**Files without idempotency:**
- dashboard-main.js: setupNavigationHandler() - no guard
- HiHeader.js: mount() - no guard
- profile-navigation.js: init() - no guard  
- mobile-diag-overlay.js - document click listener

**Evidence:** Dashboard click listeners: 11 → 39 → 51

### 3. Request Storm (Invariant 3 FAIL)  
`check_admin_access_v2`: 6-8 simultaneous requests per page load

**Fix:** Debounce admin checks, cache for 60s.

### 4. BFCache Never Used
**Removed blockers:**
- ✅ beforeunload → pagehide  
- ✅ pagehide cleanup (TypeError fixed)

**To test:** Use **BACK BUTTON** (not clicking links!)

## Next Action

**For you:** Test with BACK BUTTON:
1. Dashboard → Island (click link)
2. Press device **back button** (not header link!)
3. Look for: `🔄 BFCache restore detected`

**For me:** Fix AbortError handling + idempotency guards (75 min work).

The issue is **not BFCache** - it's forward navigation triggering clean slate rebuilds without proper abort handling or idempotency.
