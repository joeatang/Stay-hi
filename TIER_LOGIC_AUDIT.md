# 🔬 WOZNIAK-LEVEL TIER LOGIC AUDIT
**Problem**: Premium user sees "Join Hi Collective" modal on profile page

---

## EXECUTION TRACE (Step-by-step)

### Page Load Sequence:

1. **profile.html loads** (line 47)
   - Loads `anonymous-access-modal.js` 
   - Creates `AnonymousAccessModal` class instance
   
2. **AnonymousAccessModal.init()** runs (line 12-43)
   - Listens for `hi:auth-ready` event
   - Sets 3-second timeout fallback
   
3. **profile.html setTimeout** (line 3407-3437)
   - Checks `supabaseClient.auth.getSession()`
   - If no session → calls `showAccessModal()`
   
4. **RACE CONDITION**:
   ```
   SCENARIO A (Modal shows):
   - profile.html setTimeout fires BEFORE hi:auth-ready
   - No session found yet → showAccessModal() 
   - Modal appears ❌
   
   SCENARIO B (No modal):
   - hi:auth-ready fires FIRST with session
   - anonymous-access-modal.js sees session → skips modal
   - profile.html sees session → skips modal
   - Works correctly ✅
   ```

---

## THE BUG - Line 3411

**profile.html line 3411:**
```javascript
const { data: session } = await window.supabaseClient.auth.getSession();
const isAuthenticated = !!session?.session?.user;
```

**PROBLEM**: `session?.session?.user` - **DOUBLE `session`!**

Supabase v2 returns:
```javascript
{ data: { session: { user: {...} } } }
```

So correct code is:
```javascript
const { data: { session } } = await window.supabaseClient.auth.getSession();
const isAuthenticated = !!session?.user;  // NOT session?.session?.user
```

**Current code gets:**
- `session = { session: { user: {...} } }`
- Then checks `session.session.user` ✅ (accidentally correct!)

But should be:
- `{ data: { session } } = ...`
- Then checks `session.user` ✅ (cleaner)

---

## ADDITIONAL ISSUES

### Issue #1: Duplicate Modal Triggers

**anonymous-access-modal.js** (line 90):
```javascript
const protectedPages = ['/profile.html'];
```

**This ALSO runs `checkAccessOnLoad()`** which:
1. Checks localStorage for `sb-.*-auth-token`
2. If not found → `quickAuthCheck()` returns `false`
3. Shows modal IMMEDIATELY (line 104)

**Result**: TWO systems both checking auth, both can show modal!

### Issue #2: localStorage Token Check Fails

**Line 146-161**: Looks for localStorage keys matching `sb-.*-auth-token`

**WOZNIAK QUESTION**: What's the ACTUAL localStorage key name?
- Supabase v2 default: `sb-<project-ref>-auth-token`
- Custom domain: Different pattern?
- **Need to check actual key in browser DevTools**

### Issue #3: Timing Dependencies

**anonymous-access-modal.js** relies on:
1. `hi:auth-ready` event firing
2. 3-second timeout if event doesn't fire
3. localStorage cache being fresh

**profile.html** relies on:
1. `window.supabaseClient` existing
2. `getSession()` returning quickly
3. Session having `session.session.user` structure

**Both can fail independently!**

---

## WOZNIAK'S FIX STRATEGY

### Option A: Remove Duplicate Check (FAST)
```javascript
// profile.html line 3407-3437
// DELETE entire auth check block
// Let anonymous-access-modal.js handle it alone
```

**Pros**: 
- Single source of truth
- No race conditions
- Less code

**Cons**:
- Relies on modal system working perfectly
- No fallback if modal system fails

### Option B: Fix Session Check (PRECISE)
```javascript
// profile.html line 3411
const { data: { session } } = await window.supabaseClient.auth.getSession();
const isAuthenticated = !!session?.user;  // Remove extra .session
```

**Pros**:
- Keeps both systems as redundancy
- More defensive

**Cons**:
- Still have race condition
- Duplicate logic to maintain

### Option C: Unified Auth Check (TESLA-GRADE)
```javascript
// Create single auth check function used by BOTH
window.getAuthStatus = async () => {
  const { data: { session } } = await window.supabaseClient.auth.getSession();
  return !!session?.user;
};

// Both systems call this
const isAuthenticated = await window.getAuthStatus();
```

**Pros**:
- Single source of truth
- Can be cached
- Easy to debug

**Cons**:
- Requires refactoring both files

---

## IMMEDIATE DEBUG STEPS

1. **Check browser console** on profile page:
   - Look for: `🔐 Profile access check:` log
   - See what `isAuthenticated` value is
   - Check if `session?.session?.user` is undefined

2. **Check localStorage keys**:
   - Open DevTools → Application → Local Storage
   - Find actual Supabase token key name
   - Verify it matches regex `/^sb-.*-auth-token$/`

3. **Check membership cache**:
   - Look for `unified_membership_cache` in localStorage
   - Verify tier value is 'premium' not 'anonymous'

4. **Check event firing**:
   - Add breakpoint at anonymous-access-modal.js line 17
   - See if `hi:auth-ready` event fires
   - Check `e.detail.session` value

---

## RECOMMENDED FIX (Surgical)

**Step 1**: Fix session destructuring in profile.html
**Step 2**: Add console.log to see which system shows modal
**Step 3**: Disable one system, test which works better
**Step 4**: Consolidate to winning system

**DO NOT** change both at once - fix one, test, then fix other.

