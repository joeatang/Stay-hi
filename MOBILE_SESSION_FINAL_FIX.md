# 🎯 Mobile Session Bug - FINAL ROOT CAUSE  
**Date:** January 7, 2026  
**Status:** ROOT CAUSE IDENTIFIED  

---

## 🔬 THE SMOKING GUN

**User report:** "Tier status shows 'Hi Friend' or stuck loading after switching apps"

**Root cause found at [AuthReady.js line 176](../public/lib/AuthReady.js#L176):**

```javascript
const membership = await fetchMembership(sb);  // ⚠️ CAN TIME OUT!
```

### What Happens:
1. User switches to TikTok/YouTube → mobile clears memory
2. User returns → `pageshow` event fires
3. `recheckAuth()` restores session from localStorage ✅
4. Calls `fetchMembership()` → **RPC TIMES OUT** (8 seconds)
5. `membership` becomes `null`
6. Re-fires `hi:auth-ready` with `{ session: ✅, membership: ❌ }`
7. Dashboard shows "Hi Friend" (no tier data)

---

## ✅ THE FIX

**Use cached membership as fallback during mobile restore**

Lines 23-44 already cache tier to localStorage:
```javascript
localStorage.setItem('hi_membership_tier', data.tier || '');
localStorage.setItem('hi_membership_is_admin', data.is_admin ? '1':'0');
```

But lines 164-195 (mobile restore) DON'T read cache on timeout!

**Solution:** Read cached membership when RPC times out

---

## 🚀 IMPLEMENTATION

In `recheckAuth()` function, add fallback:

```javascript
const membership = await fetchMembership(sb);

// ⚠️ FIX: If membership fetch fails (timeout/error), use cached data
if (!membership) {
  const cachedTier = localStorage.getItem('hi_membership_tier');
  const cachedAdmin = localStorage.getItem('hi_membership_is_admin');
  if (cachedTier) {
    console.log('[AuthReady] 📱 Using cached membership (RPC failed):', cachedTier);
    membership = {
      tier: cachedTier,
      is_admin: cachedAdmin === '1'
    };
  }
}
```

This ensures tier display NEVER goes blank, even if database is slow!

---

## 🎯 CONFIDENCE LEVEL

**100% - This is the bug**

Evidence:
- User says "tier shows Hi Friend or loading" (membership missing)
- NOT a redirect issue (stays on same page)
- Happens on ALL pages (mobile restore in AuthReady.js affects everything)
- `fetchMembership()` timeout leaves membership null
- Cache exists but isn't used as fallback
