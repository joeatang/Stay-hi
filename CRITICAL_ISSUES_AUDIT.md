# 🚨 CRITICAL ISSUES AUDIT - December 24, 2025

## Issue #1: Splash Screen Not Showing ❌

### ROOT CAUSE
**Script loads but condition never met:**
```javascript
// Line 283 in hi-loading-experience.js
const currentPage = window.location.pathname;
if (shouldShowSplash(currentPage)) {
```

**Problem:** `window.location.pathname` on localhost returns:
- Actual: `/public/hi-dashboard.html`
- Expected by SPLASH_PAGES: `hi-dashboard.html` (no /public/ prefix)

**Result:** `shouldShowSplash()` returns FALSE → splash never triggers

### EVIDENCE
```javascript
SPLASH_PAGES = ['hi-dashboard.html', 'hi-island-NEW.html', 'hi-muscle.html']
window.location.pathname = '/public/hi-dashboard.html'
'hi-dashboard.html'.includes('/public/hi-dashboard.html') = FALSE ❌
```

### FIX REQUIRED
Match path regardless of /public/ prefix:
```javascript
function shouldShowSplash(url) {
  if (!url) return false;
  return SPLASH_PAGES.some(page => url.includes(page)); // Works for both with/without prefix
}
```

**Status:** ALREADY CORRECT ✅ (uses .includes()) 
**But still failing...**

### SECONDARY ROOT CAUSE (ACTUAL ISSUE)
Script checks: `url.includes(page)` where:
- url = '/public/hi-dashboard.html'
- page = 'hi-dashboard.html'
- Result: TRUE ✅

BUT `window.hiLoadingExperience` object **doesn't exist** when script runs!

**Reason:** `hi-loading-experience.js` defines the `window.hiLoadingExperience` object BEFORE the `initAutoSplash()` function runs. If the object definition fails, splash never shows.

### REAL ROOT CAUSE
Looking at line 1-240 of hi-loading-experience.js, the object must be instantiated. But on first page load with service worker, there's a race condition where:
1. HTML loads
2. Script loads and runs
3. `window.hiLoadingExperience` exists but isn't ready
4. `start()` call fails silently (optional chaining `?.` swallows error)

---

## Issue #2: Reaction Counts Change on Navigate ❌

### ROOT CAUSE
**Multiple writes to same share button:**

1. **Initial render** (line 1253): Shows database count
   ```javascript
   ${typeof share.wave_count === 'number' ? `👋 ${share.wave_count} Waves` : '👋 Wave Back'}
   ```

2. **localStorage check** (line 1266): Checks if user already waved
   ```javascript
   if (this.wavedShares?.has?.(share.id)) {
     btn.classList.add('waved');
     btn.disabled = true;
     // Count stays, only visual state changes
   }
   ```

3. **handleWaveAction** (line 1013): User waves, RPC returns new count
   ```javascript
   const { data, error } = await supabase.rpc('wave_back', {...});
   const waveCount = data?.wave_count || 0;
   buttonEl.textContent = `👋 ${waveCount} Waves`;
   ```

4. **Page navigates away** → User returns
   
5. **Re-render** (line 1253): Shows STALE database count (trigger hasn't updated yet)

6. **Trigger fires** (async, 100-500ms later): Updates public_shares.wave_count

7. **Next page load**: Shows correct count

### THE PROBLEM
**Database trigger latency:**
```sql
-- COMPLETE_WAVE_SYSTEM.sql line 85
CREATE TRIGGER sync_wave_count_trigger
AFTER INSERT OR DELETE ON wave_reactions
FOR EACH ROW EXECUTE FUNCTION sync_wave_count();
```

Trigger is ASYNC. When user:
1. Clicks wave (RPC returns count=1)
2. Button shows "👋 1 Wave"
3. **Navigates away** (trigger still pending)
4. **Comes back** (query runs, gets count=0 still)
5. Render shows "👋 0 Waves" (STALE)
6. Trigger finally completes
7. Next visit shows correct count

### COMPOUNDING ISSUE
**localStorage out of sync with database:**
- `wavedShares` Set only tracks IDs, not counts
- When user returns, localStorage says "already waved" but DB shows count=0
- Visual: Button disabled (correct) but shows wrong count (stale)

### THE RACE CONDITION
```
T+0ms:   User clicks wave
T+10ms:  RPC wave_back() starts
T+50ms:  Insert into wave_reactions
T+60ms:  Trigger queued (async)
T+80ms:  RPC returns {wave_count: 1, already_waved: true}
T+85ms:  Button updates to "1 Wave", localStorage saves ID
T+100ms: User navigates away ❌ (trigger still pending)
---
T+150ms: Trigger executes, updates public_shares.wave_count = 1
---
T+200ms: User returns, query runs
T+210ms: SELECT returns wave_count = 0 (stale row, trigger ran after query)
T+220ms: Render shows "0 Waves" but button disabled ❌ INCONSISTENCY
```

### MULTIPLE SHARES PER PAGE
User reports "multiple things firing off" - this is:
1. Each share has its own wave button
2. Each button checks localStorage independently
3. If ANY button clicked recently, ALL shares in feed show stale data on next load
4. Some shares show count=0, some show count=1 (depending on when trigger completed)

### FIX REQUIRED
**Option A: Optimistic localStorage cache**
Store counts in localStorage alongside IDs:
```javascript
// Instead of: this.wavedShares = new Set([id1, id2])
// Use: this.wavedCounts = {id1: {count: 1, timestamp: 123}, id2: {count: 2, timestamp: 456}}
```

Render logic:
```javascript
const displayCount = (localStorage has recent count && count > db count) 
  ? localStorage.count 
  : share.wave_count;
```

**Option B: Synchronous trigger (bad performance)**
Make trigger SYNCHRONOUS - blocks until count updated. Bad UX (slower waves).

**Option C: Client-side increment**
When user waves:
1. RPC returns data
2. Update button immediately
3. **Also update feedData array in memory**
4. Next render uses updated in-memory data (not stale DB)

**Option D: Event-driven refresh** (BEST)
When user waves:
1. RPC completes
2. Emit event with {shareId, newCount}
3. All feed instances listen
4. Update specific share in feedData array
5. Re-render only that share card

---

## VERIFICATION PLAN

### For Splash Screen:
1. Add console.log before `window.hiLoadingExperience?.start()`
2. Check if object exists: `console.log('Splash object exists:', !!window.hiLoadingExperience)`
3. Add fallback: If object doesn't exist, show CSS-only splash

### For Reaction Counts:
1. Add logging to handleWaveAction:
   ```javascript
   console.log('Before wave:', share.wave_count);
   console.log('After RPC:', data.wave_count);
   console.log('After navigate back:', share.wave_count);
   ```
2. Check database trigger execution time:
   ```sql
   SELECT created_at, (SELECT wave_count FROM public_shares WHERE id = wave_reactions.share_id)
   FROM wave_reactions ORDER BY created_at DESC LIMIT 5;
   ```
3. Measure latency between INSERT and trigger completion

---

## IMPLEMENTATION PRIORITY

**CRITICAL (fix now):**
1. ✅ Splash screen object existence check
2. ✅ Reaction count event-driven sync

**HIGH (fix soon):**
3. localStorage count caching
4. In-memory feedData updates

**MEDIUM (optimize later):**
5. Debounce navigation to prevent trigger race
6. Preload next page data (eliminates stale reads)

---

## TEST SCENARIOS

**Splash Screen:**
- [ ] Navigate to /public/hi-dashboard.html → see splash
- [ ] Navigate to /hi-dashboard → see splash (no /public/)
- [ ] Open directly → see splash
- [ ] Navigate from another page → see splash

**Reaction Counts:**
- [ ] Wave on share → count shows 1
- [ ] Navigate away immediately (< 100ms)
- [ ] Navigate back → count still shows 1 (not 0)
- [ ] Refresh page → count shows 1 (trigger completed)
- [ ] Wave on 3 different shares → all show correct counts
- [ ] Navigate away/back → all 3 still correct

---

**Status:** Issues identified, fixes ready to implement
**Next:** Surgical code changes to resolve both issues
