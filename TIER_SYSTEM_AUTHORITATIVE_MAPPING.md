# 🎯 TIER SYSTEM - AUTHORITATIVE MAPPING

**Single Source of Truth for Hi Tier System**  
**Created:** January 11, 2025  
**Status:** ✅ Verified from InviteCodeModal.js + TIER_CONFIG.js

---

## 📊 THE 6 TIERS

### Database Value → Display Name → Price

```
free       → "Hi Explorer"      → $0/mo
bronze     → "Hi Pathfinder"    → $5.55/mo
silver     → "Hi Trailblazer"   → $15.55/mo
gold       → "Hi Champion"      → $25.55/mo
premium    → "Hi Pioneer"       → $55.55/mo
collective → "Hi Collective"    → $155.55/mo (Full access + Admin)
```

### Special Display Names

```
anonymous (not signed in) → "Hi Friend"
```

---

## 🏗️ SYSTEM ARCHITECTURE

### Database Layer
- **Table:** `user_memberships`
- **Column:** `tier` (text)
- **Values:** `free`, `bronze`, `silver`, `gold`, `premium`, `collective`
- **Stored by:** `use_invite_code()` RPC when user signs up with code
- **Read by:** `get_unified_membership()` RPC

### RPC Layer
- **Function:** `get_unified_membership()`
- **Returns:** `{ tier: "collective", status: "active", trial_end: timestamp, ... }`
- **CRITICAL:** Must return EXACT tier value from database (no transformation)

### Frontend Layer
- **Config:** `TIER_CONFIG.js` (window.HiTierConfig)
- **Display:** Maps database tier → branded display name
- **Example:** `TIER_CONFIG.collective.displayName = "Hi Collective"`

---

## 🚨 CURRENT PROBLEM (User: joeatang)

### Diagnostic Output
```json
{
  "database": { "membership_tier": "collective" },
  "rpc_returns": { "tier": "premium" },        // ❌ WRONG
  "frontend_displays": "Hi Friend"              // ❌ WRONG (free tier fallback)
}
```

### Root Causes
1. **Database mismatch:** `hi_members.membership_tier` vs `user_memberships.tier`
   - User has tier in BOTH tables
   - Tables might have different values
   - RPC reads from `user_memberships`, diagnostic reads from `hi_members`

2. **RPC issue:** Might be reading wrong table or row
   - Should read: `SELECT tier FROM user_memberships WHERE user_id = ?`
   - May be reading old/wrong row

3. **Frontend fallback:** HiMembership.js shows "Hi Friend" when tier not recognized
   - Expects tier to match TIER_CONFIG keys
   - If RPC returns "premium" but user really has "collective", UI might fail

---

## 🔧 SOLUTION

### Step 1: Verify Database State
```sql
-- Check user's tier in BOTH tables
SELECT 
  'hi_members' as source,
  membership_tier as tier_value
FROM hi_members
WHERE user_id = [USER_ID]

UNION ALL

SELECT 
  'user_memberships' as source,
  tier as tier_value
FROM user_memberships
WHERE user_id = [USER_ID];
```

### Step 2: Fix RPC if Needed
- Ensure `get_unified_membership()` reads from correct table
- Return EXACT tier value (no transformation)
- Add logging to verify which table/row is queried

### Step 3: Standardize on ONE Table
- **Recommended:** Use `user_memberships.tier` (newer system)
- Migrate any data from `hi_members.membership_tier` if needed
- Update all code to reference single source

### Step 4: Update Frontend
- Ensure TIER_CONFIG.js has entries for ALL 6 tiers
- Update HiMembership.js to use tier from RPC
- Remove fallback to "Hi Friend" for authenticated users

---

## 📋 TIER FEATURES (From TIER_CONFIG.js)

### Free Explorer ($0)
- 10 medallion taps/day
- View 5 locations (5mi radius)
- No share creation
- View-only profile

### Bronze Pathfinder ($5.55)
- 50 medallion taps/day
- View 20 locations (20mi radius)
- 10 shares/month
- Basic profile editing

### Silver Trailblazer ($15.55)
- 100 medallion taps/day
- Unlimited location viewing
- 50 shares/month
- Full calendar access

### Gold Champion ($25.55)
- Unlimited medallion taps
- Advanced map filters
- Unlimited shares
- Full trend analytics

### Premium Pioneer ($55.55)
- Everything in Gold
- Early beta access
- Priority support
- Custom profile themes

### Hi Collective ($155.55)
- Everything in Premium
- Admin access
- Community management tools
- Revenue sharing (future)

---

## 🎯 VALIDATION CHECKLIST

For each tier, verify:
- [ ] Database stores correct tier value
- [ ] RPC returns correct tier value (no transformation)
- [ ] Frontend displays correct branded name
- [ ] Share creation access matches tier
- [ ] Calendar access matches tier
- [ ] Medallion tap limits match tier
- [ ] Profile editing access matches tier

---

## 🔍 DEBUGGING COMMANDS

### Check user's current tier
```javascript
// In browser console
const { data } = await window.supabase.rpc('get_unified_membership');
console.log('Tier from RPC:', data.tier);
console.log('Display name:', window.HiTierConfig?.getTierConfig(data.tier)?.displayName);
```

### Check database directly
```sql
SELECT tier, status, trial_end 
FROM user_memberships 
WHERE user_id = auth.uid();
```

### Verify TIER_CONFIG loaded
```javascript
console.log('Tier config:', window.HiTierConfig?.tiers);
console.log('Collective tier:', window.HiTierConfig?.getTierConfig('collective'));
```

---

## 📝 NOTES

- **Anonymous users** (not signed in) always show "Hi Friend"
- **Free tier users** (signed in, no paid tier) show "Hi Explorer"
- **All 6 tiers** must have entries in TIER_CONFIG.js
- **Database constraint** may need updating to accept all 6 values
- **RPC must NOT transform** tier values (return exactly what's in database)
- **Frontend handles display** (database stores technical name, UI shows branded name)

---

## ✅ SUCCESS CRITERIA

When fixed:
- User with `tier: "collective"` in database
- RPC returns `{ tier: "collective", ... }`
- Frontend displays "Hi Collective"
- Share modal accessible
- All collective features enabled
- No "Hi Friend" fallback for paid users
