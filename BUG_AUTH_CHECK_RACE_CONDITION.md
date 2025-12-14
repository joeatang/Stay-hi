# Bug Report: Auth Check Race Condition in Hi Gym

## Issue
Authenticated users (logged in, have tier) get promo modal instead of share sheet when trying to share from Hi Gym page.

## Root Cause
**Race condition in async auth check** - `await window.supabase.auth.getSession()` call may not resolve before auth check completes, especially in:
- Incognito windows
- First page loads
- Slow network conditions

## Code Location
`/public/hi-muscle.html` lines 2625-2650

## What Was Wrong
```javascript
// OLD CODE (BROKEN):
const hasSession = window.supabase?.auth?.getSession ? 
  !!(await window.supabase.auth.getSession())?.data?.session : false;

const canShare = hasSession; // Only checked session
```

**Problems:**
1. Async call may resolve late
2. Only checked session, ignored membership systems
3. Even though `hi:auth-ready` event fired with tier:bronze, this code didn't use it

## Fix Applied
```javascript
// NEW CODE (FIXED):
// Check membership systems first (already loaded from hi:auth-ready)
const hasMembership = !!(
  window.HiMembership?.tier || 
  window.unifiedMembership?.membershipStatus?.tier || 
  window.__hiMembership?.tier
);

// Check session as fallback only if membership not found
let hasSession = false;
if (!hasMembership && window.supabase?.auth?.getSession) {
  try {
    const { data } = await window.supabase.auth.getSession();
    hasSession = !!data?.session;
  } catch (err) {
    console.warn('⚠️ Session check failed:', err);
  }
}

// User is authenticated if EITHER membership exists OR session exists
const canShare = hasMembership || hasSession;
```

**Why This Works:**
1. **Primary check:** Uses membership systems that are ALREADY loaded by `hi:auth-ready` event
2. **No race condition:** Membership objects are synchronous (no await needed)
3. **Fallback:** Still checks session if membership systems unavailable
4. **Multi-source:** Checks 3 different membership sources for redundancy

## Evidence From Logs
```
hi-muscle.html:2813 🔔 [Hi Muscle] hi:auth-ready received, tier: bronze
HiBrandTiers.js:344 🎨 Tier pill updated: bronze → Hi Pathfinder
hi-muscle.html:2807 🎫 [Hi Muscle] Tier updated: bronze

// BUT THEN:
hi-muscle.html:2638 🔍 [HiGYM] Share access check: Object
hi-muscle.html:2645 🔒 User cannot share - showing Hi Muscle auth modal
```

Auth was ready, tier was loaded, but share check still failed because it ONLY looked at session, not membership.

## Why This Keeps Happening
**Multiple independent auth checks scattered across codebase:**
- hi-muscle.html: Share sheet access check
- hi-island-NEW.html: Different auth check
- HiShareSheet.js: Tier enforcement check
- Each page implements its own auth logic

**NO SINGLE SOURCE OF TRUTH** for "is user authenticated?"

## Long-Term Prevention

### 1. Create Unified Auth Check Module
```javascript
// /public/lib/auth/UnifiedAuthCheck.js
export function isUserAuthenticated() {
  // Check membership systems (synchronous, reliable)
  const hasMembership = !!(
    window.HiMembership?.tier || 
    window.unifiedMembership?.membershipStatus?.tier || 
    window.__hiMembership?.tier
  );
  
  return hasMembership;
}

export function getUserTier() {
  return window.HiMembership?.tier || 
         window.unifiedMembership?.membershipStatus?.tier || 
         window.__hiMembership?.tier || 
         null;
}
```

### 2. Use Everywhere
Every page should import and use:
```javascript
import { isUserAuthenticated } from './lib/auth/UnifiedAuthCheck.js';

if (isUserAuthenticated()) {
  openShareSheet();
} else {
  showAuthModal();
}
```

### 3. Document Auth Sources
Create `AUTH_ARCHITECTURE.md`:
- Which system is source of truth? (ProfileManager)
- Which events indicate auth ready? (hi:auth-ready)
- What objects should pages check? (window.HiMembership, etc.)
- When to use session vs membership checks?

### 4. Automated Tests
Test auth checks across:
- Regular window
- Incognito window
- First load vs cached
- Different tiers (bronze, silver, gold)
- Anonymous users

## Testing Checklist
- [ ] Hard refresh Hi Gym page (Cmd+Shift+R)
- [ ] Try to share while logged in as Pathfinder
- [ ] Should see full share sheet, NOT promo modal
- [ ] Test in incognito window
- [ ] Test after fresh login
- [ ] Test after coming back to page later

## Status
✅ Fixed in code
⏳ Needs browser hard refresh to take effect
⏳ Needs testing to verify fix works

---

**Date:** 2024-12-13  
**Frequency:** "keeps happening" - user reported this is recurring  
**Impact:** Breaks sharing for authenticated users, critical UX failure
