# iOS Safari Mobile Diagnostics - Test Protocol

## Objective
Diagnose iOS Safari performance degradation when:
1. Navigating Dashboard → Hi-Island → Dashboard (laggy/broken on return)
2. Backgrounding Safari and returning (app feels broken)

---

## Setup Instructions

### 1. Enable Diagnostics (Choose ONE method)

**Method A: URL Parameter (Session-only)**
```
http://192.168.1.212:3030/public/hi-dashboard.html?diag=1
```

**Method B: localStorage (Persistent)**
On iPhone Safari, open console and run:
```javascript
localStorage.setItem('HI_DIAG', '1');
```
Then navigate to dashboard normally.

**Verify Enabled:**
- You should see a green "🔍 DIAG" badge in top-right corner
- Console shows: `[DIAG] Mobile diagnostics ENABLED` in green

---

## Repro Script - Test 1: Navigation Cycle

**Goal:** Detect listener leaks, BFCache issues, duplicate initialization

### Steps:
1. Load dashboard with `?diag=1`: http://192.168.1.212:3030/public/hi-dashboard.html?diag=1
2. Open Safari Web Inspector (Mac: Safari → Develop → [Your iPhone] → [Tab])
3. Note baseline memory (if shown)
4. Click "Hi Island" in footer
5. Wait 3 seconds on Island page
6. Click "Hi Today" in footer to return to Dashboard
7. **REPEAT STEPS 4-6 THREE TIMES**
8. Check console and network tab

### Evidence Checklist (Copy/Paste to Send Back):

```
=== TEST 1: NAVIGATION CYCLE ===

LIFECYCLE EVENTS (paste all [DIAG:LIFECYCLE] logs):


BFCACHE WARNINGS (search for "restored from BFCache"):


NAVIGATION CLICKS (count how many [DIAG:NAV] logs per cycle):


ERRORS (paste any [DIAG:ERROR] logs):


MEMORY (if available - paste [DIAG:MEMORY] snapshots):
Before navigation:
After 3 cycles:

SUBJECTIVE: Did app feel laggy after 3 cycles? (yes/no)
```

---

## Repro Script - Test 2: Background/Foreground

**Goal:** Detect request storms, stale state, visibility handling issues

### Steps:
1. Load dashboard with `?diag=1`
2. Ensure console is open in Safari Web Inspector
3. Note current time
4. **Swipe Safari to background** (go to home screen)
5. Wait 10 seconds
6. **Return to Safari** (tap app icon or swipe up)
7. **IMMEDIATELY** check console for request burst
8. Check Network tab for concurrent requests

### Evidence Checklist (Copy/Paste to Send Back):

```
=== TEST 2: BACKGROUND/FOREGROUND ===

LIFECYCLE EVENTS (paste visibilitychange + pageshow logs):


REQUEST STORM (paste "Request storm window closed" log):
Total requests in 5 seconds:
Average per second:

TOP 5 REQUESTS (paste [DIAG:REQUESTS] logs showing URLs):


TIMING LOGS (paste any [DIAG:TIMING] logs for ProfileManager/Auth):


ERRORS (paste any errors that appeared after foregrounding):


SUBJECTIVE: Did app feel broken/laggy after returning? (yes/no)
```

---

## Repro Script - Test 3: Combined Stress Test

**Goal:** Maximum reproduction of production symptoms

### Steps:
1. Load dashboard with `?diag=1`
2. Navigate: Dashboard → Island → Dashboard → Island → Dashboard (fast clicks)
3. Background Safari immediately
4. Wait 30 seconds
5. Return to Safari
6. Try navigating to Island again
7. Check console for explosion of logs

### Evidence Checklist (Copy/Paste to Send Back):

```
=== TEST 3: COMBINED STRESS ===

TOTAL ERRORS (count [DIAG:ERROR] entries):

REQUEST STORM COUNT (highest number seen):

BFCACHE HITS (how many "restored from BFCache" warnings):

NAVIGATION LOG COUNT (total [DIAG:NAV] entries):

TIMING - ProfileManager fetches (list all durations):


SUBJECTIVE: 
- App completely broken? (yes/no)
- Specific symptoms (footer not working, content not loading, etc.):

```

---

## Quick Confirmation Tests (In Safari Web Inspector)

### Test: Listener Leak
1. Open Timelines tab (if available) or Memory tab
2. Note baseline memory
3. Do 5 navigation cycles
4. Check if memory increased > 20MB without dropping

**Signal:** Memory keeps climbing = **LEAK CONFIRMED**

### Test: BFCache Corruption
1. Dashboard → Island → Back button
2. Check console immediately for:
   - `pageshow` with `persisted: true`
   - Multiple "init" messages
   - Errors about "already initialized"

**Signal:** persisted=true + duplicate init = **BFCACHE ISSUE CONFIRMED**

### Test: Request Storm
1. Background → Foreground
2. Check Network tab
3. Count overlapping requests in first 2 seconds

**Signal:** 10+ simultaneous requests = **REQUEST STORM CONFIRMED**

---

## How to Disable Diagnostics

**Method A: URL Parameter**
- Just remove `?diag=1` from URL

**Method B: localStorage**
```javascript
localStorage.removeItem('HI_DIAG');
```

**Method C: Clear All**
- Safari → Settings → Clear History and Website Data

---

## What Was Added (Summary)

### New Files:
1. `/public/lib/diagnostics/mobile-diag.js` - Core diagnostic instrumentation
2. `/public/lib/diagnostics/enable-mobile-diag.js` - Conditional loader

### Modified Files:
1. `/public/hi-dashboard.html` - Added one script tag (line ~12)
2. `/public/hi-island-NEW.html` - Added one script tag (line ~19)

### Features:
- ✅ Gated by `?diag=1` or `localStorage.HI_DIAG=1` - OFF by default
- ✅ Logs lifecycle events (visibility, pageshow, pagehide)
- ✅ Tracks navigation clicks with destinations
- ✅ Counts requests in 5-second window after visibility restore
- ✅ Captures global errors with stack traces
- ✅ Times ProfileManager/Auth fetches
- ✅ Detects BFCache restoration
- ✅ Memory snapshots every 10 seconds (if available)
- ✅ Visual indicator (green "DIAG" badge)

### Performance Impact:
- **ZERO** when disabled (gated at loader level)
- When enabled: ~100 console logs per test cycle, minimal CPU overhead

---

## Next Steps After Testing

1. Run all 3 tests on iPhone
2. Copy/paste evidence checklists with actual console logs
3. Based on evidence, I'll confirm root cause
4. Then we implement minimal, surgical fixes
5. Retest to validate fix

**Do NOT implement fixes before diagnosis confirmation.**
