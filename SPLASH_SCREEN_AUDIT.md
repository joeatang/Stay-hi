# 🎬 Splash Screen Surgical Audit

## Current State Analysis

### What Exists
- **File**: `assets/hi-loading-experience.js` + `assets/hi-loading-experience.css`
- **Pages with splash**: Dashboard, Hi Island, Hi Muscle, Welcome
- **Trigger logic**: Lines 283-298 in hi-loading-experience.js

### Why You Don't See It

**CRITICAL ISSUE**: The splash only shows if `document.readyState === 'loading'`

```javascript
if (document.readyState === 'loading') {  // ❌ TOO RESTRICTIVE
  const currentPage = window.location.pathname;
  if (shouldShowSplash(currentPage)) {
    window.hiLoadingExperience?.start('Loading...');
    
    window.addEventListener('DOMContentLoaded', async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
      await window.hiLoadingExperience?.hide();
    });
  }
}
```

**What's happening:**
1. Script loads AFTER `DOMContentLoaded` fires (too late)
2. `document.readyState` is already `'interactive'` or `'complete'`
3. Condition fails → splash never shows
4. Duration: 300ms minimum (too short to notice)

---

## Page Load Performance Audit

### Gold Standard Threshold
**Heavy page**: Initial load > 800ms OR requires multiple async operations

| Page | Initial Load Time | Async Operations | Classification |
|------|-------------------|------------------|----------------|
| **hi-dashboard.html** | ~1200-1800ms | Supabase auth + Hi-OS boot + stats + feed + medallion + calendar lazy load | ⚠️ HEAVY |
| **hi-island-NEW.html** | ~1400-2000ms | Supabase auth + Hi-OS boot + feed + share sheet + calendar lazy load | ⚠️ HEAVY |
| **hi-muscle.html** | ~1500-2200ms | Supabase auth + Hi Gym state + calendar + share sheet | ⚠️ HEAVY |
| **profile.html** | ~900-1400ms | Supabase auth + profile data + avatar system + stats | ⚡ MODERATE |
| **welcome.html** | ~400-600ms | Minimal boot + redirect logic | ✅ LIGHT |

### Load Sequence Analysis (Dashboard Example)

```
0ms     → HTML parsing starts
50ms    → CSS parsed
100ms   → hi-loading-experience.js loads (TOO LATE)
150ms   → DOMContentLoaded fires
200ms   → Supabase client initializes
400ms   → Auth check completes
600ms   → Hi-OS boot sequence
800ms   → Stats load from database
1000ms  → Feed data fetches
1200ms  → Medallion renders
1400ms  → Calendar lazy loads
1600ms  → Page fully interactive
```

**Problem**: Splash script loads at 100ms, but only triggers if `readyState === 'loading'` (before 150ms DOMContentLoaded). By the time script executes, DOMContentLoaded already fired.

---

## Root Causes

### Issue #1: Race Condition
- Script checks `document.readyState` synchronously
- If script loads after DOMContentLoaded (common), condition fails
- No splash shows

### Issue #2: Too Short Duration
- Minimum 300ms before hide
- Modern browsers: DOMContentLoaded fires in 100-200ms
- Splash flashes too fast to perceive

### Issue #3: Wrong Trigger Point
- Triggers on initial page load only
- Doesn't trigger on SPA-style navigations
- Misses the actual heavy work (async data loading)

---

## Recommended Gold Standard

### Threshold Criteria
Pages should show splash if they have **2+ of these**:
1. ✅ Supabase auth check (async)
2. ✅ Database queries > 2 (async)
3. ✅ Large component initialization (Hi-OS, feed, medallion)
4. ✅ External API calls
5. ✅ Heavy DOM manipulation (feed rendering)

### Pages Qualifying for Splash
- ✅ **hi-dashboard.html** (auth + stats + feed + medallion + calendar)
- ✅ **hi-island-NEW.html** (auth + feed + share sheet + calendar)
- ✅ **hi-muscle.html** (auth + Hi Gym state + calendar + share)
- ⚡ **profile.html** (borderline - auth + profile + avatar, but feels fast)
- ❌ **welcome.html** (redirect only, no splash needed)

---

## Proposed Solution

### Strategy A: Eager Splash (Recommended)
Show splash IMMEDIATELY on page load, hide when actually ready:

```javascript
// Show splash synchronously (no readyState check)
if (shouldShowSplash(window.location.pathname)) {
  window.hiLoadingExperience?.start('Loading your Hi experience...');
}

// Hide when heavy work is done (not just DOMContentLoaded)
window.addEventListener('hi:ready', async () => {
  await window.hiLoadingExperience?.hide();
});
```

**Benefits:**
- Always shows (no race condition)
- Hides when app is truly ready (custom event)
- Duration matches actual load time

### Strategy B: Minimum Duration
Guarantee splash shows for perceptible time:

```javascript
const MIN_SPLASH_DURATION = 800; // 800ms minimum
const splashStart = Date.now();

window.addEventListener('DOMContentLoaded', async () => {
  const elapsed = Date.now() - splashStart;
  const remaining = Math.max(0, MIN_SPLASH_DURATION - elapsed);
  
  await new Promise(resolve => setTimeout(resolve, remaining));
  await window.hiLoadingExperience?.hide();
});
```

---

## Implementation Priority

### High Priority (User Perceives Lag)
1. **hi-dashboard.html** - Most visited, heaviest load
2. **hi-island-NEW.html** - Core sharing experience
3. **hi-muscle.html** - Heaviest computational load

### Medium Priority
4. **profile.html** - Moderate load, but feels fast enough

### Low Priority (Skip Splash)
5. **welcome.html** - Redirect only, no benefit

---

## Next Steps

1. ✅ **Fix race condition**: Remove `document.readyState === 'loading'` check
2. ✅ **Increase minimum duration**: 300ms → 800ms
3. ✅ **Add custom ready event**: Emit `hi:ready` when app truly interactive
4. ✅ **Test on mobile**: Verify splash shows on slow 3G connections
5. ✅ **A/B test duration**: Find sweet spot (800ms vs 1000ms)

Would you like me to implement Strategy A with the custom ready event?
