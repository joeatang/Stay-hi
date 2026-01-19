# HI ISLAND ZOMBIE PROBLEM - DIAGNOSTIC PLAN

## THE PROBLEM

User reports: "zombie problem still happening" on Hi Island page

**Zombie State = Page stuck loading, not responsive, or broken state after navigation**

## DIAGNOSTIC TOOL CREATED

**File:** `public/test-hi-island-diagnostics.js`

### How to Run:

1. **Open Hi Island page:**
   ```
   http://localhost:3030/hi-island-NEW.html
   ```

2. **Open DevTools Console** (Cmd+Option+J / F12)

3. **Load the diagnostic script:**
   ```javascript
   fetch('/test-hi-island-diagnostics.js').then(r=>r.text()).then(eval)
   ```

4. **Run diagnostics:**
   ```javascript
   hiIslandDiagnostics.runAll()
   ```

### What It Tests:

#### Test 1: Authentication State ✅
- Checks `window.__hiAuthReady`
- Validates session expiry
- Checks AuthReady cache age
- **Zombie Indicator:** Expired session still cached

#### Test 2: Supabase Client ✅
- Finds active Supabase client
- Tests database query
- Validates client health
- **Zombie Indicator:** Client not functional

#### Test 3: Map Initialization ✅
- Checks Leaflet library loaded
- Validates map container exists
- Checks map center/zoom state
- Counts map layers
- **Zombie Indicator:** Map not initialized

#### Test 4: Share Loading ✅
- Checks for loading spinners
- Finds error messages
- Counts markers on map
- **Zombie Indicator:** Stuck loading or no markers

#### Test 5: Event Listeners ✅
- Checks pageshow listener (BFCache)
- Checks pagehide listener (cleanup)
- Checks auth-ready listener
- **Zombie Indicator:** Missing critical listeners

#### Test 6: Auth Timeout Simulation ✅
- Races `getSession()` vs 3-second timeout
- Measures actual response time
- **Zombie Indicator:** getSession > 3 seconds (CRITICAL)

#### Test 7: Leaflet State ✅
- Validates map panes exist
- Checks leaflet-container class
- Tests map.invalidateSize()
- **Zombie Indicator:** Broken Leaflet internal state

#### Test 8: AbortController Leaks ✅
- Checks for global abort controllers
- Counts active vs aborted
- **Zombie Indicator:** Aborted controllers still in memory

## EXPECTED RESULTS

### Healthy State:
```
📊 DIAGNOSTIC SUMMARY
==================================================
✅ Passed: 15
❌ Failed: 0
⚠️  Warned: 2
⏭️  Skipped: 0

✅ No zombie state indicators detected
   System appears healthy
```

### Zombie State Detected:
```
🧟 ZOMBIE STATE INDICATORS:
   🚩 Auth timeout > 3 seconds
   🚩 No markers loaded on map
   🚩 Page stuck in loading state

💡 RECOMMENDED ACTIONS:
   1. Sign out and sign back in
   2. Hard refresh (Cmd+Shift+R / Ctrl+Shift+F5)
   3. Clear localStorage and cookies
   4. Check network tab for stuck requests
```

## COMMON ZOMBIE CAUSES

### 1. Session Timeout Hang
**Symptom:** Page loads forever, no content  
**Cause:** `getSession()` never resolves  
**Fix:** 3-second timeout wrapper (already implemented)  
**Test:** Test 6 will catch this

### 2. BFCache Stale State
**Symptom:** Old data shown after back button  
**Cause:** Browser restores cached page  
**Fix:** pageshow event invalidates queries  
**Test:** Test 5 checks for listeners

### 3. Aborted Queries Not Cleaned Up
**Symptom:** New page load fails  
**Cause:** Previous abort controller still active  
**Fix:** Proper cleanup in pagehide  
**Test:** Test 8 detects leaks

### 4. Map Not Re-initialized
**Symptom:** Map tiles missing or broken  
**Cause:** Leaflet state corrupted  
**Fix:** Check initialization sequence  
**Test:** Test 3 and 7 validate map

### 5. Expired Session Cached
**Symptom:** Auth failures, "not signed in" errors  
**Cause:** AuthReady cache expired but not refreshed  
**Fix:** Check cache TTL and refresh logic  
**Test:** Test 1 validates expiry

## REPRODUCTION STEPS

To trigger zombie state:

1. **Open Hi Island** (fresh load)
2. **Wait for full load** (map + markers visible)
3. **Navigate away** (go to dashboard or island)
4. **Use back button** (trigger BFCache restore)
5. **Check if zombie:**
   - Are markers visible?
   - Can you click on map?
   - Can you open profiles?
   - Is loading spinner stuck?

## DEBUGGING WORKFLOW

### Step 1: Capture Zombie State
When zombie happens:
1. DON'T refresh yet
2. Run `hiIslandDiagnostics.runAll()`
3. Screenshot the console output
4. Check Network tab for pending requests
5. Check Console tab for errors

### Step 2: Identify Root Cause
Look for failed tests:
- **Auth timeout fail** → Session hanging
- **Map markers warn** → Shares not loading
- **Leaflet state fail** → Map corrupted
- **Abort controller warn** → Memory leak

### Step 3: Apply Fix
Based on failure:
- **Session issue:** Hard refresh, sign out/in
- **Map issue:** Call `window.map.invalidateSize()`
- **Loading stuck:** Check abort controllers
- **BFCache issue:** Verify pageshow fires

### Step 4: Verify Fix
After fix:
1. Run diagnostics again
2. Should pass all tests
3. Try reproduction steps
4. Zombie should not recur

## NEXT STEPS

1. **RUN DIAGNOSTICS NOW** - Get baseline healthy state
2. **WAIT FOR ZOMBIE** - When it happens, run again
3. **COMPARE RESULTS** - Find the difference
4. **IMPLEMENT FIX** - Based on failing test
5. **VERIFY** - Zombie should be gone

## FILES TO REVIEW IF ZOMBIE PERSISTS

### Authentication Files:
- `public/lib/auth/HiAuthCore.js` - Session management
- `public/lib/AuthReady.js` - Auth ready system
- `public/lib/boot/signin-init.js` - Sign-in flow

### Hi Island Files:
- `public/hi-island-NEW.html` - Main page
- `public/lib/boot/hi-island-init.js` - Initialization
- `public/components/HiRealFeed.tsx` - Feed component

### Map Files:
- Look for Leaflet initialization code
- Check for map.remove() calls
- Verify marker creation logic

## WENDY'S STREAK - NO CONNECTION

Your time changes (auth fixes) are NOT related to:
- Wendy's streak count
- Zombie state on Hi Island
- Any user data

These are completely separate systems.
