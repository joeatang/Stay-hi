# 🔥 FIX: Zombie Mode AbortErrors

## Root Causes Found

### Issue 1: Duplicate Island Initialization
**File**: `public/lib/boot/island-main.mjs` line 1200-1206  
**Problem**: Timeout check uses wrong variable
```javascript
// WRONG:
if (!window.__islandInitCalled) {  // ❌ This is never set!
  console.warn('⚠️ DOMContentLoaded never fired, forcing init NOW');
  initHiIsland();
}

// CORRECT:
if (!window.__islandInitRunning) {  // ✅ This is the guard variable
  console.warn('⚠️ DOMContentLoaded never fired, forcing init NOW');
  initHiIsland();
}
```
**Result**: Init runs TWICE → duplicate ProfileManager loads → race conditions

---

### Issue 2: ProfileManager Timeout Doesn't Abort Query
**File**: `public/lib/ProfileManager.js` line 534-551  
**Problem**: `Promise.race()` abandons query without aborting it
```javascript
// WRONG:
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('TIMEOUT')), 3000);
});
const queryPromise = supabase.from('profiles')...;
await Promise.race([queryPromise, timeoutPromise]);
// ❌ queryPromise keeps running even after timeout!
```

**Result**: 
- Query times out after 3s
- User navigates away
- Abandoned query tries to complete → **AbortError**
- "Profile query timed out - using cache" warning

**Correct Solution**:
```javascript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 3000);
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', this._userId)
  .abortSignal(controller.signal)  // ✅ Supabase respects this
  .single();
clearTimeout(timeoutId);
```

---

### Issue 3: Feed Database Load Same Issue
**Likely in**: Feed loading code (HiRealFeed.js or similar)  
**Same pattern**: Promise.race without AbortController

---

## Console Evidence Matches

From user's console logs:
```
⚠️ DOMContentLoaded never fired, forcing init NOW
🏝️ Hi Island initializing... (runs TWICE)  ← Issue 1
⚠️ Profile query timed out - using cache    ← Issue 2
⚠️ Feed database load timed out - using cache ← Issue 3
AbortError: The operation was aborted       ← Result
```

---

## Fix Priority

1. **HIGH**: Fix island-main.mjs duplicate init (5-line fix)
2. **HIGH**: Add AbortController to ProfileManager timeout (10-line fix)
3. **MEDIUM**: Find and fix feed loading timeout (similar pattern)

---

## Implementation Plan

### Fix 1: island-main.mjs
```javascript
// Line 1201
if (!window.__islandInitRunning) {  // Changed from __islandInitCalled
  console.warn('⚠️ DOMContentLoaded never fired, forcing init NOW');
  initHiIsland();
}
```

### Fix 2: ProfileManager.js
```javascript
// Replace lines 534-551
async _loadProfileFromDatabase() {
  // ... existing code ...
  
  try {
    const supabase = this._getSupabase();
    
    // 🔥 FIX: Use AbortController to actually cancel timed-out queries
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn('⏱️ Profile query timeout - aborting');
      controller.abort();
    }, 3000);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', this._userId)
        .abortSignal(controller.signal)
        .single();
      
      clearTimeout(timeoutId);
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      // ... rest of existing code ...
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        console.warn('⚠️ Profile query timed out - using cache');
      } else {
        throw err;
      }
    }
  } catch (error) {
    // ... existing error handling ...
  }
}
```

### Fix 3: Find Feed Loading
```bash
# Search for similar timeout patterns
grep -r "Promise.race" public/
grep -r "timed out - using cache" public/
```

---

## Testing Plan

1. Deploy fixes to production
2. Hard refresh Hi Island on mobile
3. Navigate between tabs rapidly
4. Check console for:
   - ✅ No "initializing TWICE" logs
   - ✅ No AbortError messages
   - ✅ "Profile query timed out" followed by "aborting" (not error)
   - ✅ Smooth navigation without freezing

---

## User Impact

**Before**: 
- Random freezing after 3-5s on Hi Island
- AbortErrors in console
- Duplicate initialization causing memory buildup

**After**:
- Clean query cancellation
- Single initialization
- No zombie mode symptoms
