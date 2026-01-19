# 🚨 SILENT LOGOUT INVESTIGATION - Hi Island Navigation Issue
**Date:** 2026-01-19  
**Reported By:** User (multiple instances, HollyRae12 share failures)  
**Symptoms:** Silent logout when navigating in/out of Hi Island - app appears functional but data won't load

---

## 🔍 ROOT CAUSE ANALYSIS

### **Primary Suspect: Unprotected `auth.getSession()` Call**

**Location:** [island-main.mjs](public/lib/boot/island-main.mjs#L1034)

```javascript
// Line 1034 - getUserTypeWithFallbacks()
if (window.supabaseClient?.auth) {
  const { data: { session } } = await window.supabaseClient.auth.getSession();
  if (session?.user) {
    console.log('✅ [DROP HI] User authenticated via Supabase session');
    return 'authenticated';
  }
}
```

**Problem:**
- Called **every time** user clicks "Drop Hi" button (compose share)
- If `getSession()` times out or fails → session may be invalidated
- No retry logic or error recovery
- No session cache check before making network call
- Happens **only on Hi Island** (explains user's observation)

---

## 🎯 AFFECTED CODE PATHS

### **1. Drop Hi Button (Hi Island Only)**
- File: [island-main.mjs](public/lib/boot/island-main.mjs#L925-L1015)
- Triggers: Every click of "Drop Hi" button
- Calls `getUserTypeWithFallbacks()` → unprotected `getSession()` → **potential silent logout**

### **2. BFCache Restore (pageshow event)**
- File: [island-main.mjs](public/lib/boot/island-main.mjs#L772-L805)
- Triggers: When navigating **back to** Hi Island from browser history
- Re-dispatches `hi:auth-ready` event
- If session expired during navigation → re-dispatch with **stale data**

### **3. Multiple getSession() Calls**
Previous Wozniak audit found 6+ `auth.getSession()` calls across codebase:
- island-main.mjs (1 unprotected)
- dashboard-main.js (protected with session cache)
- Other pages use cached session check

---

## 💥 FAILURE SCENARIOS

### **Scenario A: Drop Hi Click → Session Timeout**
1. User on Hi Island, authenticated
2. Clicks "Drop Hi" button
3. `getUserTypeWithFallbacks()` → `auth.getSession()` network call
4. Network slow or Supabase timeout (5s+)
5. Call fails, Supabase SDK **clears local session** as safety measure
6. User silently logged out, no visual indicator
7. Share submission fails with `auth.uid() = NULL`
8. App looks normal but features broken

### **Scenario B: Navigation Away → BFCache Restore**
1. User on Hi Island, authenticated
2. Navigates to Dashboard or other page
3. Browser stores Hi Island in BFCache
4. User clicks back button
5. `pageshow` event fires with `e.persisted = true`
6. Re-dispatches `hi:auth-ready` with **cached ProfileManager data**
7. If session expired during navigation → dispatch with invalid session
8. Auth listeners think user authenticated, but Supabase session NULL
9. Silent logout with zombie UI state

### **Scenario C: Device Sleep Mid-Navigation**
1. User navigating between pages
2. Device sleeps (screen lock)
3. Supabase realtime connection drops
4. Wake device, land on Hi Island
5. Hi Island tries to refresh session via `getSession()`
6. If call fails → session cleared
7. Silent logout

---

## 🛡️ PROTECTION GAPS

### **Missing Safeguards:**
1. ❌ No session cache check before network call (island-main.mjs)
2. ❌ No timeout protection on `getSession()` call
3. ❌ No retry logic for failed auth checks
4. ❌ No error boundary to catch session failures
5. ❌ No visual indicator when auth state changes
6. ❌ No session validation before critical operations (share submit)

### **Dashboard vs Island Comparison:**
| Feature | Dashboard | Hi Island | Status |
|---------|-----------|-----------|--------|
| Session Cache | ✅ 5s TTL | ❌ Direct call | **MISSING** |
| Timeout Protection | ✅ 3s | ❌ None | **MISSING** |
| Retry Logic | ✅ 2 retries | ❌ None | **MISSING** |
| Auth State Listener | ✅ Yes | ⚠️ Partial | **WEAK** |
| Visual Feedback | ✅ Toast | ❌ Silent | **MISSING** |

---

## 🔧 RECOMMENDED FIXES

### **Priority 1: Protect getSession() Call (CRITICAL)**

**File:** island-main.mjs, Line 1034

**Before:**
```javascript
if (window.supabaseClient?.auth) {
  const { data: { session } } = await window.supabaseClient.auth.getSession();
  if (session?.user) {
    return 'authenticated';
  }
}
```

**After:**
```javascript
if (window.supabaseClient?.auth) {
  try {
    // Use cached session if available (5s TTL)
    if (window.__hiAuthReady?.session) {
      const cacheAge = Date.now() - (window.__hiAuthReady._timestamp || 0);
      if (cacheAge < 5000) {
        console.log('✅ Using cached session (age: ${cacheAge}ms)');
        return window.__hiAuthReady.session.user ? 'authenticated' : 'anonymous';
      }
    }
    
    // Add timeout protection (3s max)
    const sessionPromise = window.supabaseClient.auth.getSession();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Session check timeout')), 3000)
    );
    
    const { data: { session }, error } = await Promise.race([
      sessionPromise,
      timeoutPromise
    ]);
    
    if (error) {
      console.warn('⚠️ Session check failed, using cached state:', error.message);
      return window.__hiAuthReady?.session?.user ? 'authenticated' : 'anonymous';
    }
    
    // Update cache
    window.__hiAuthReady = { session, _timestamp: Date.now() };
    
    if (session?.user) {
      return 'authenticated';
    }
  } catch (error) {
    console.warn('⚠️ Session check error, assuming anonymous:', error.message);
    // Don't clear session on network errors
    return window.__hiAuthReady?.session?.user ? 'authenticated' : 'anonymous';
  }
}
```

---

### **Priority 2: Add Session Validation Before Share Submit**

**File:** HiShareSheet.js (share submission flow)

**Add pre-flight check:**
```javascript
async function validateSessionBeforeShare() {
  // Quick cache check (no network call)
  if (window.__hiAuthReady?.session?.user) {
    const cacheAge = Date.now() - (window.__hiAuthReady._timestamp || 0);
    if (cacheAge < 10000) { // 10s cache for shares
      return { valid: true, user: window.__hiAuthReady.session.user };
    }
  }
  
  // If cache stale, do ONE protected getSession() call
  try {
    const { data: { session }, error } = await Promise.race([
      window.supabaseClient.auth.getSession(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
    ]);
    
    if (error || !session?.user) {
      return { valid: false, error: 'Session expired' };
    }
    
    // Update cache
    window.__hiAuthReady = { session, _timestamp: Date.now() };
    return { valid: true, user: session.user };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// In share submission:
const sessionCheck = await validateSessionBeforeShare();
if (!sessionCheck.valid) {
  // Show re-auth modal
  window.HiModal?.alert('Your session expired. Please sign in again to share.', 'Session Expired');
  return { ok: false, error: 'session_expired' };
}
```

---

### **Priority 3: Add Visual Session Expiry Indicator**

Show toast/banner when session expires:
```javascript
window.addEventListener('hi:session-expired', () => {
  const banner = document.createElement('div');
  banner.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; 
    background: #FF7A18; color: white; 
    padding: 12px; text-align: center; z-index: 99999;
  `;
  banner.innerHTML = `
    🔒 Session expired. <a href="#" onclick="location.reload()" style="color: white; font-weight: bold;">Refresh to sign in</a>
  `;
  document.body.prepend(banner);
});
```

---

## 📊 TESTING PLAN

### **Test 1: Drop Hi Button Spam**
1. Open Hi Island as authenticated user
2. Click "Drop Hi" button 10 times rapidly
3. Check console for session errors
4. Verify user stays authenticated
5. Try sharing - should succeed

### **Test 2: Navigation Loop**
1. Start on Hi Island (authenticated)
2. Navigate to Dashboard
3. Navigate back to Hi Island (via back button)
4. Repeat 5 times
5. Try sharing on Hi Island - should succeed

### **Test 3: Device Sleep Recovery**
1. Open Hi Island, authenticate
2. Lock device for 2 minutes
3. Unlock device
4. Try sharing immediately - should either work OR show clear "session expired" message

### **Test 4: Network Failure Simulation**
1. Throttle network to 2G in DevTools
2. Click "Drop Hi" button
3. Verify session doesn't clear on timeout
4. Verify user sees helpful error message

---

## 🎯 SUCCESS CRITERIA

- ✅ User can navigate in/out of Hi Island without silent logout
- ✅ Share submission always checks session validity first
- ✅ Session errors show user-friendly message (not silent failure)
- ✅ Session cache prevents unnecessary network calls
- ✅ Timeout protection prevents hanging auth checks
- ✅ BFCache restore doesn't dispatch stale auth state

---

## 📝 NEXT STEPS

1. **Immediate (Tonight):**
   - Deploy session cache + timeout protection to `getUserTypeWithFallbacks()`
   - Add session validation to HiShareSheet before submit

2. **Tomorrow:**
   - Test with HollyRae12 (have her log out/in and try sharing)
   - Monitor console for session errors

3. **Follow-up:**
   - Add visual session expiry indicator
   - Audit other pages for unprotected `getSession()` calls
   - Document session management best practices

---

## 🔗 RELATED ISSUES

- Share submission failures (HollyRae12) - likely caused by silent logout
- Previous Wozniak audit found 6+ `getSession()` calls - not all protected
- Phone wake detection added but may not cover all logout scenarios
- Migration 008 syntax error (unrelated but fixed)

---

**Priority Level:** 🔥 **CRITICAL** - Affects foundational code/user data integrity  
**Impact:** All Hi Island users, share submission reliability, auth state consistency  
**Estimated Fix Time:** 2-3 hours (testing + deployment)
