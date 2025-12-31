# 🔍 Session Loss Root Cause Analysis

## The Problem

User reports: "when i leave google chrome and return hi island isnt loading and i get logged out"

## What We Know

**Session Restore Code Deployed:**
```javascript
// profile.html line 4024, hi-island-NEW.html similar
(async function checkSessionOnLoad() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    const token = localStorage.getItem('sb-gfcubvroxgfvjhacinic-auth-token');
    if (token) {
      const parsed = JSON.parse(token);
      await sb.auth.setSession({
        access_token: parsed.access_token,
        refresh_token: parsed.refresh_token
      });
    }
  }
})();
```

**Supabase Configuration:**
```javascript
// assets/supabase-init.js line 50
const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { 
  auth: { 
    persistSession: true,      // ✅ Store tokens in localStorage
    autoRefreshToken: true     // ✅ Auto-refresh before expiry
  }
});
```

## Possible Root Causes

### Theory 1: Token Expiry During Background
**Mechanism:**
- Supabase JWT tokens expire after 1 hour (default)
- `autoRefreshToken: true` only works while JavaScript is running
- When Chrome backgrounds tab, JavaScript pauses
- If backgrounded > 1 hour, token expires
- When returning, token is expired, no refresh happens

**Evidence:**
- User backgrounds for unknown duration
- Returns to find logged out
- Common on mobile (aggressive tab suspension)

**Test:**
```javascript
// Check token expiry
const token = localStorage.getItem('sb-gfcubvroxgfvjhacinic-auth-token');
if (token) {
  const parsed = JSON.parse(token);
  const expiresAt = new Date(parsed.expires_at * 1000);
  console.log('Token expires:', expiresAt);
  console.log('Time until expiry:', (expiresAt - new Date()) / 1000 / 60, 'minutes');
}
```

**Fix:**
Our session restore code SHOULD handle this by calling `setSession()` with the refresh_token, which should request a new access_token.

**BUT** - If the **refresh_token** is also expired (7 days default), user must re-login.

### Theory 2: Mobile Chrome Memory Management
**Mechanism:**
- Chrome on mobile aggressively clears memory
- When system needs RAM, Chrome might:
  - Clear Service Worker
  - Clear in-memory JavaScript state
  - BUT localStorage should survive (it's on disk)

**Evidence:**
- Happens specifically on mobile Chrome
- User says "app locking and not working" (tab killed?)

**Test:**
Check if localStorage actually persists:
```javascript
// Before backgrounding
localStorage.setItem('test-persistence', Date.now());

// After returning
console.log('localStorage survived:', !!localStorage.getItem('test-persistence'));
```

**Fix:**
Our session restore code already handles this by reading from localStorage on page load.

### Theory 3: Third-Party Cookie Blocking
**Mechanism:**
- Chrome's privacy settings might block cookies
- Supabase auth uses cookies + localStorage
- If cookies blocked, auth might fail

**Evidence:**
- Would affect ALL sessions, not just after backgrounding
- Less likely if signin works initially

**Test:**
```javascript
console.log('Cookies enabled:', navigator.cookieEnabled);
```

### Theory 4: Service Worker Clearing Storage
**Mechanism:**
- Service Worker might clear localStorage on activate
- Or intercept auth requests incorrectly

**Evidence:**
Looking at sw.js lines 166-169:
```javascript
// Skip Supabase API calls (always need fresh data)
if (url.hostname.includes('supabase.co')) {
  return;  // Don't intercept - pass through
}
```

Service Worker is **NOT intercepting** Supabase auth calls. ✅ RULED OUT

### Theory 5: `detectSessionInUrl: false` Issue
**Mechanism:**
- Supabase can restore session from URL params (OAuth redirects)
- We have `detectSessionInUrl: false` (not set in code, but default is true)
- Might prevent some session restoration

**Evidence:**
Not configured explicitly in supabase-init.js

**Test:**
Add explicit config:
```javascript
auth: { 
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: true,  // Explicitly enable
  storage: window.localStorage,
  storageKey: 'sb-gfcubvroxgfvjhacinic-auth-token'
}
```

## Most Likely Cause: Token Expiry

**The Timeline:**
1. User signs in → Gets tokens (expires in 1 hour)
2. User uses app normally → JavaScript runs, `autoRefreshToken` works
3. User backgrounds Chrome → JavaScript PAUSES
4. Time passes (> 1 hour) → Access token expires, no refresh happens
5. User returns → Token expired, session invalid
6. Our restore code tries to `setSession()` with refresh_token
7. **If refresh_token also expired (7 days)** → Must re-login
8. **If refresh_token valid** → Gets new access_token, works

## Why User Might Still See Logout

**Scenario A: Refresh Token Expired**
- If user hasn't used app in 7 days, refresh_token expired
- Our restore code can't help
- User MUST re-login

**Scenario B: localStorage Cleared**
- Mobile Chrome aggressive memory management
- If localStorage actually cleared (rare), no tokens to restore
- User MUST re-login

**Scenario C: Restore Code Not Running**
- Page loads before restore code executes
- Race condition: AuthReady checks session before restore runs
- Solution: Wait for restore in AuthReady

## Current Solution Assessment

**What We Did:**
✅ Added `checkSessionOnLoad()` to restore from localStorage
✅ Configured `persistSession: true`
✅ Configured `autoRefreshToken: true`

**What We're Missing:**
❌ Don't know WHEN tokens expire (no logging)
❌ Don't know IF localStorage survives backgrounding
❌ Don't verify refresh_token is still valid
❌ AuthReady might run before restore completes (race condition)

## Action Items

### IMMEDIATE: Add Token Expiry Logging
```javascript
// In checkSessionOnLoad()
if (token) {
  const parsed = JSON.parse(token);
  const expiresAt = new Date(parsed.expires_at * 1000);
  const now = new Date();
  const minutesUntilExpiry = (expiresAt - now) / 1000 / 60;
  
  console.log('[Session] Token status:', {
    expiresAt: expiresAt.toISOString(),
    minutesUntilExpiry: minutesUntilExpiry.toFixed(1),
    isExpired: minutesUntilExpiry < 0,
    willExpireSoon: minutesUntilExpiry < 5
  });
  
  if (minutesUntilExpiry < 0) {
    console.warn('[Session] ⚠️ Access token EXPIRED - will try refresh_token');
  }
}
```

### MEDIUM: Fix Race Condition
Ensure session restore completes BEFORE auth guards run:
```javascript
// At top of checkSessionOnLoad()
window.sessionRestoreInProgress = true;

// After restore completes
window.sessionRestoreInProgress = false;
window.dispatchEvent(new CustomEvent('session-restore-complete'));

// In AuthReady.js
if (window.sessionRestoreInProgress) {
  await new Promise(resolve => {
    window.addEventListener('session-restore-complete', resolve, { once: true });
  });
}
```

### LOW: Test localStorage Persistence
Add test on every page load:
```javascript
// Set persistence marker
sessionStorage.setItem('app-was-running', 'true');

// Check on load
const wasRunning = sessionStorage.getItem('app-was-running');
const localStorageWorks = !!localStorage.getItem('sb-gfcubvroxgfvjhacinic-auth-token');

console.log('[Persistence Test]', {
  sessionStorage: wasRunning === 'true',  // Clears on tab close
  localStorage: localStorageWorks          // Should survive
});
```

## Verdict

**Current confidence in session restore: 70%**

**Why it might work:**
- Session restore code looks correct
- Uses refresh_token to get new access_token
- Supabase config is correct

**Why it might fail:**
- If tokens expired (7 days), can't restore
- If localStorage cleared, can't restore  
- Race condition: might check before restore completes
- No logging to diagnose issues

**Recommendation:**
Add logging immediately to see EXACTLY when and why sessions are lost.
