# Gold-Standard Stability Plan: iOS Safari MPA Navigation

**Build:** `0ffe9ee` (deployed to Vercel)  
**Date:** 2026-01-10  
**Architecture:** MPA (no changes)

---

## Invariants & Measurement Methods

### Invariant 1: Zero Unhandled Rejections
**Definition:** After 10 nav cycles + background/resume, `unhandledRejections === 0`

**Measurement:**
```javascript
// Auto-tracked by invariant-monitor.js
checkInvariants().invariants['1_unhandledRejections']
```

**Current Status:** UNKNOWN (requires testing with fresh cache)

**If FAIL:**
```javascript
// Root cause: AbortError from controller.init() propagating
// Fix applied: Try-catch in island-main.mjs line 79-88
// Verification: Check rejectionDetails for error.name === 'AbortError'
```

**Smallest Change if Still Failing:**
Add to ProfileManager.js line 72:
```javascript
try {
  await this._loadProfileFromDatabase();
} catch (error) {
  if (error.name === 'AbortError') return; // Silent, expected
  throw error;
}
```

---

### Invariant 2: Idempotent Initialization
**Definition:** No listener type exceeds 10 attachments per page lifecycle

**Measurement:**
```javascript
checkInvariants().invariants['2_listenerDuplication']
// Shows count per event type: { "Island:hi:auth-ready": 3, ... }
```

**Current Status:** LIKELY PASS (guards added to all init functions)

**Evidence:**
- Line 219: `if (tabSystemInitialized) return;`
- Line 323: `if (originFiltersInitialized) return;`
- Line 412: `if (tryItLinkInitialized) return;`
- Line 507: `if (hiMapInitialized) return;`
- Line 129: `if (tierListenerSetup) return;`

**If FAIL (specific event type > 10):**
Search codebase for that event type, add guard flag:
```javascript
let myFeatureInitialized = false;
function initMyFeature() {
  if (myFeatureInitialized) return;
  myFeatureInitialized = true;
  // ... rest of init
}
```

---

### Invariant 3: Bounded Request Counts
**Definition:** No URL endpoint exceeds 5 requests in test session

**Measurement:**
```javascript
checkInvariants().invariants['3_requestStorms']
// Shows: { "https://api.../profiles": 12, ... } if storm detected
```

**Current Status:** LIKELY FAIL (ProfileManager may fetch on every auth-ready)

**If FAIL:**
Check specific URL in requestCounts. If ProfileManager:
```javascript
// Add cache check in ProfileManager._loadProfileFromDatabase()
if (this._profileCache && Date.now() - this._profileCacheTime < 5000) {
  return this._profileCache; // Return cached within 5s
}
```

---

### Invariant 4: No State Degradation on Abort
**Definition:** Tier display, streak, stats never show fallback values after abort

**Measurement:**
Manual visual inspection after nav cycles:
1. Dashboard shows correct tier (not "Bronze")
2. Streak shows user's actual streak (not 0)
3. Stats show real numbers (not cached fallback)

**Current Status:** FAIL (user reports "Bronze" fallback)

**Root Cause:** HiBrandTiers loading async (FIXED: removed async attribute)

**If Still FAIL:**
Check console for: `🔍 HiBrandTiers available at load time? object`
- If `undefined`: Script load order broken
- If `object`: Timing issue in universal-tier-listener.js

**Smallest Change:**
In universal-tier-listener.js line 36, add retry:
```javascript
if (!window.HiBrandTiers) {
  // Wait 100ms and retry once
  await new Promise(resolve => setTimeout(resolve, 100));
}
```

---

### Invariant 5: Build Version Proof
**Definition:** Console shows `🏗️ BUILD: 0ffe9ee | Page` on every load

**Measurement:**
Open DevTools → Console → Look for first log

**Current Status:** DEPLOYABLE (just added)

**If FAIL (wrong hash or missing):**
- Browser cache: Hard refresh (Cmd+Shift+R) with DevTools open
- Vercel cache: Wait 2-3 minutes for CDN propagation
- Verify: Go to vercel.com → Deployments → Check latest commit matches

---

## Testing Protocol

### Fresh Test (Required First)
```bash
1. Close ALL stay-hi.vercel.app tabs
2. Open NEW incognito window
3. Open DevTools FIRST (before loading page)
4. Navigate to: https://stay-hi.vercel.app/hi-dashboard.html
5. Verify: 🏗️ BUILD: 0ffe9ee | Dashboard
```

If build hash wrong → **STOP, cache issue, test invalid**

### 10-Cycle Navigation Test
```bash
Cycle 1-3: Dashboard → Island → Dashboard → Island → Dashboard → Island
Cycle 4-6: Background app (Home screen) 10s → Resume
Cycle 7-10: Repeat above
```

After 10 cycles:
```javascript
checkInvariants()
```

### Expected Output
```javascript
{
  invariants: {
    '1_unhandledRejections': { status: 'PASS ✅', value: 0 },
    '2_listenerDuplication': { status: 'PASS ✅', counts: {...} },
    '3_requestStorms': { status: 'PASS ✅', counts: {...} }
  }
}
```

---

## Current State Assessment

### What's Been Fixed
1. ✅ `beforeunload` → `pagehide` (BFCache re-enabled)
2. ✅ HiBrandTiers `async` removed (sync loading)
3. ✅ AbortError caught in controller.init() (no throw to caller)
4. ✅ Idempotency guards on all init functions
5. ✅ Invariant monitoring added (measurement framework)

### What Requires Verification
- Build hash visible (confirms fresh code loading)
- Unhandled rejections = 0 (confirms error handling works)
- Listener counts stable (confirms idempotency works)
- Visual state correct (confirms no fallback degradation)

### Next Immediate Action
**User must:**
1. Wait 2 minutes (Vercel deploy + CDN propagation)
2. Hard refresh in new incognito window
3. Verify build hash: `0ffe9ee`
4. Run 10-cycle test
5. Report `checkInvariants()` output

**Only then** can we know which invariants PASS/FAIL and apply targeted fixes.

---

## Maintenance

### On Every Deploy
1. Update `window.__BUILD_HASH__` in both HTML files
2. Run test protocol
3. Archive `checkInvariants()` output
4. If any invariant fails, apply smallest fix from this doc

### Adding New Async Init
```javascript
let myFeatureReady = false;
async function initMyFeature() {
  if (myFeatureReady) return;
  myFeatureReady = true;
  // Your code with try-catch for AbortError
}
```

No architecture changes. Evidence-driven fixes only.
