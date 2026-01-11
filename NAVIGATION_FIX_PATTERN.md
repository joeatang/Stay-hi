# Hi Island Navigation Fix - Working Pattern

## Status: ✅ STABLE (Tagged: `navigation-fix-working-v1`)

## The Problem
Hi Island breaks on 2nd visit: Dashboard → Island → Dashboard → Island = broken feed

## Root Cause
ES6 module-level variables persist across navigation in Mobile Safari. Multiple pageshow listeners were being registered, causing race conditions.

## The Working Pattern

```javascript
// 🚀 CRITICAL: Only register ONE pageshow handler per page load
if (!window.__hiSupabasePageshowRegistered) {
  window.__hiSupabasePageshowRegistered = Date.now();
  const INIT_TIMESTAMP = Date.now();
  
  window.addEventListener('pageshow', (event) => {
    const timeSinceInit = Date.now() - INIT_TIMESTAMP;
    const isInitialPageshow = timeSinceInit < 200;
    
    if (event.persisted) {
      // BFCache restore - clear stale client
      clearSupabaseClient();
    } else if (!isInitialPageshow && createdClient) {
      // Return navigation - clear stale client
      clearSupabaseClient();
    }
    // Initial pageshow - keep fresh client (do nothing)
  });
}
```

## Files Using This Pattern
1. `public/lib/HiSupabase.v3.js` - Supabase client management
2. `public/components/hi-real-feed/HiRealFeed.js` - Feed initialization
3. `public/components/hi-real-feed/UnifiedHiIslandController.js` - Controller lifecycle

## DO NOT ADD
- ❌ `window.__xxxPageshowRegistered = null;` before the check
- ❌ `getHiSupabase()` calls inside pageshow handler
- ❌ `hi:app-restored` event dispatch
- ❌ Any event listeners for `hi:app-restored`

## Why These Break It
1. Setting flag to `null` before check always registers new listener (defeats the guard)
2. Calling `getHiSupabase()` inside handler creates race conditions
3. Custom events cause double-initialization race conditions

## Quick Rollback
```bash
git checkout navigation-fix-working-v1
```

## Commit Reference
- Working: `4ac1068` (tag: `navigation-fix-working-v1`)
- Original fix: `0ed6f68`

---

## HiBrandTiers.js Loading Pattern

### The Problem
Tier pill shows raw database value ("Bronze") instead of branded name ("Hi Pathfinder")

### Root Cause
Using `async` on `<script src="lib/HiBrandTiers.js" async>` causes the script to load AFTER `hi:auth-ready` fires. The fallback in `universal-tier-listener.js` then capitalizes the raw tier name.

### The Pattern
```html
<!-- ✅ CORRECT: No async - loads before auth-ready -->
<script src="lib/HiBrandTiers.js"></script>

<!-- ❌ WRONG: Causes race condition with auth-ready -->
<script src="lib/HiBrandTiers.js" async></script>
```

### All Pages Must Follow
| Page | Line | Status |
|------|------|--------|
| hi-dashboard.html | 203 | ✅ sync |
| hi-island-NEW.html | 184 | ✅ sync |
| hi-island.html | 132 | ✅ sync |
| hi-muscle.html | 121 | ✅ sync |
| profile.html | 133 | ✅ sync |

### DO NOT
- ❌ Add `async` to HiBrandTiers.js
- ❌ Load HiBrandTiers.js multiple times
- ❌ Load HiBrandTiers.js AFTER AuthReady.js import
