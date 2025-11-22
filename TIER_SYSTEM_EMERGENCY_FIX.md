# 🚨 TIER SYSTEM EMERGENCY FIX

## Root Cause Analysis

**User signed up with premium invite code but system treated them as anonymous because:**

### 1. Database Function Querying Wrong Table ❌
- `get_unified_membership()` RPC queries `hi_members` table
- But invite signup creates records in `user_memberships` table
- **Result:** Function returns `tier: 'free'` even though user has `tier: 'premium'`

### 2. Window Bridge Never Set ❌
- `HiTier.js` line 19 checks `window.__hiMembership.tier` as first priority
- But `AuthReady.js` never sets `window.__hiMembership` after fetching membership
- **Result:** HiTier.js skips to fallback checks which also fail

### 3. Event Never Triggered ❌
- `HiTier.js` line 61 listens for `hi:membership-changed` event
- But `AuthReady.js` never dispatches this event after login
- **Result:** Tier badge never updates, stays on default 'free'

## Two-Part Fix Required

### Part 1: Fix Database Function (Supabase)
**File:** `FIX_GET_UNIFIED_MEMBERSHIP.sql`

1. Open Supabase Dashboard → SQL Editor
2. Paste contents of `FIX_GET_UNIFIED_MEMBERSHIP.sql`
3. Click "Run"
4. Verify: Run `SELECT get_unified_membership();` - should return your tier

**What it fixes:**
- Changes query from `hi_members` → `user_memberships`
- Returns tier, status, trial_end, days_remaining, is_admin
- Works for both anonymous and authenticated users

### Part 2: Fix Frontend Event System (Vercel)
**File:** `public/lib/AuthReady.js`

Already fixed in this commit. Changes:
- Line 50: Sets `window.__hiMembership = membership` after fetch
- Line 57: Dispatches `hi:membership-changed` event on auth ready
- Line 79: Sets `window.__hiMembership` on auth updates
- Line 87: Dispatches `hi:membership-changed` event on tier changes

**What it fixes:**
- HiTier.js can read tier from `window.__hiMembership.tier`
- Header badge updates when `hi:membership-changed` fires
- Access control systems see correct tier

## Deployment Steps

### Step 1: Deploy Database Fix (Do This First!)
```
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Open FIX_GET_UNIFIED_MEMBERSHIP.sql from workspace
4. Copy entire contents
5. Paste in SQL Editor
6. Click "Run" (should see "Success")
```

### Step 2: Deploy Frontend Fix
```bash
git add public/lib/AuthReady.js FIX_GET_UNIFIED_MEMBERSHIP.sql
git commit -m "CRITICAL: Fix tier detection system (query user_memberships + set window.__hiMembership)"
git push origin main
```

Vercel will auto-deploy in ~30 seconds.

### Step 3: Verify Fix Works
```
1. Open stay-hi.vercel.app in incognito window
2. Sign in with your premium account
3. Open browser console (Cmd+Opt+J)
4. Look for log: "[AuthReady] ready { user: ..., tier: 'premium', admin: false }"
5. Check header - should show "⭐ Premium Member"
6. Try medallion long-press - should open share sheet (not auth modal)
```

## Testing Commands

### Check Database Function
```sql
-- Run in Supabase SQL Editor after deploying Part 1
SELECT get_unified_membership();

-- Expected output:
{
  "tier": "premium",
  "status": "active",
  "trial_end": "2025-11-29...",
  "days_remaining": 7,
  "is_admin": false
}
```

### Check Frontend State
```javascript
// Run in browser console after deploying Part 2
console.log('Membership:', window.__hiMembership);
console.log('Tier:', window.HiTier?.getTier?.());

// Expected output:
// Membership: { tier: 'premium', status: 'active', ... }
// Tier: 'premium'
```

## Verification Checklist

After deploying both fixes:

- [ ] Database function returns correct tier from user_memberships
- [ ] Console shows "[AuthReady] ready" with tier='premium'
- [ ] `window.__hiMembership` is defined (not undefined)
- [ ] Header badge shows "⭐ Premium Member"
- [ ] Medallion long-press opens share sheet (authenticated flow)
- [ ] No "anonymous user" modals appear
- [ ] Trial countdown shows correct days remaining

## Rollback Plan

If something breaks:

### Rollback Database (Restore old function)
```sql
-- Paste old DEPLOY_MEMBERSHIP_TIER_FIX.sql function
-- This will restore the hi_members query (broken but stable)
```

### Rollback Frontend
```bash
git revert HEAD
git push origin main
```

## Additional Fixes Needed?

After this fix, if tier still not working, check:

1. **Did user_memberships record get created?**
   ```sql
   SELECT * FROM user_memberships 
   WHERE user_id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL');
   ```

2. **Did public.users record get created?**
   ```sql
   SELECT * FROM public.users WHERE email = 'YOUR_EMAIL';
   ```

3. **Did invite code get used?**
   ```sql
   SELECT * FROM invitation_codes WHERE code = 'YOUR_CODE';
   ```

Run `EMERGENCY_TIER_DIAGNOSIS.sql` with your email to check all of these at once.

## Why This Happened

The codebase has TWO membership systems:
1. **Old system:** `hi_members` table (legacy)
2. **New system:** `user_memberships` table (invite codes)

The RPC function was written for the old system but signup flow uses the new system. They were never connected.

**Long-term fix:** Migrate all membership logic to `user_memberships` and deprecate `hi_members`.
