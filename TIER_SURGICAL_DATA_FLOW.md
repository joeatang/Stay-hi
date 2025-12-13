# 🔬 TIER SYSTEM SURGICAL DATA FLOW ANALYSIS
## Complete mapping of tier lifecycle from signup → display

**Date:** 2025-01-12  
**Context:** Comprehensive surgical audit requested by user to ensure ANY user signing up for ANY tier gets correct experience  
**Methodology:** Woz-grade surgical approach - mapping every touch point one-by-one  

---

## 📊 THE 6-TIER SYSTEM (Authoritative)

From **InviteCodeModal.js** (Mission Control tier dropdown):

```javascript
free       → "Hi Explorer"      → $0/mo
bronze     → "Hi Pathfinder"    → $5.55/mo  ← MOST COMMON PURCHASE
silver     → "Hi Trailblazer"   → $15.55/mo
gold       → "Hi Champion"      → $25.55/mo
premium    → "Hi Pioneer"       → $55.55/mo
collective → "Hi Collective"    → $155.55/mo
```

**Critical Note:** User testing **bronze** ($5.55 "Hi Pathfinder") because it's the most common tier purchased.

---

## 🔄 COMPLETE DATA FLOW (Tier Assignment + Display)

### PHASE 1: Invitation Code Creation (Mission Control)

**File:** `/public/mission-control.html` → `InviteCodeModal.js` (Lines 28-179)

```javascript
// Admin selects tier from dropdown
<option value="bronze">🧭 Hi Pathfinder - $5.55/mo (Bronze)</option>

// Modal calls RPC
const { data, error } = await supabaseClient.rpc('admin_generate_invite_code', {
  p_tier: 'bronze',              // ← Database tier value (lowercase)
  p_max_uses: 1,
  p_trial_days: 30
});
```

**Database Write:**
```sql
-- DEPLOY_MASTER_TIER_SYSTEM.sql Lines 34-120
INSERT INTO invitation_codes (
  code,               -- 'ABC123XYZ'
  grants_tier,        -- 'bronze' ← CRITICAL
  max_uses,           -- 1
  trial_days,         -- 30
  created_by          -- admin user_id
)
```

**Result:** Code `ABC123XYZ` grants `bronze` tier in database

---

### PHASE 2: User Signup (signup.html)

**File:** `/public/signup.html` → `/lib/boot/signup-init.js` (Lines 127-280)

```javascript
// 1. User enters invite code in signup form
const invite = document.getElementById('invite-code').value; // 'ABC123XYZ'

// 2. Create auth account
const { data, error } = await supabaseClient.auth.signUp({ 
  email, 
  password
});
userId = data.user?.id; // 'uuid-user-123'

// 3. Mark code as used (CRITICAL TIER ASSIGNMENT HAPPENS HERE)
const { data: usageData, error } = await supabaseClient.rpc('use_invite_code', { 
  p_code: 'ABC123XYZ', 
  p_user_id: userId 
});
```

**Database Write - use_invite_code() RPC:**
```sql
-- DEPLOY_MASTER_TIER_SYSTEM.sql Lines 130-200
CREATE OR REPLACE FUNCTION use_invite_code(p_code TEXT, p_user_id UUID)

DECLARE
  v_grants_tier TEXT;       -- Will be 'bronze'
  v_trial_days INTEGER;     -- Will be 30
BEGIN
  -- 1. Read tier from invitation_codes table
  SELECT grants_tier, trial_days
  INTO v_grants_tier, v_trial_days
  FROM invitation_codes
  WHERE code = p_code;
  -- Result: v_grants_tier = 'bronze', v_trial_days = 30

  -- 2. Create user_memberships row (SINGLE SOURCE OF TRUTH)
  INSERT INTO user_memberships (
    user_id,          -- 'uuid-user-123'
    tier,             -- 'bronze' ← CRITICAL WRITE
    status,           -- 'active'
    invitation_code,  -- 'ABC123XYZ'
    trial_start,      -- NOW()
    trial_end,        -- NOW() + 30 days
    trial_days_total  -- 30
  )
  VALUES (
    p_user_id, v_grants_tier, 'active', p_code,
    NOW(), NOW() + (v_trial_days || ' days')::INTERVAL, v_trial_days
  );

  RETURN jsonb_build_object('success', true, 'tier', v_grants_tier);
END;
```

**Database State After Signup:**
```
Table: user_memberships
+------------------+----------+---------+------------------+
| user_id          | tier     | status  | invitation_code  |
+------------------+----------+---------+------------------+
| uuid-user-123    | bronze   | active  | ABC123XYZ        |
+------------------+----------+---------+------------------+
```

**Result:** User's tier is `bronze` in `user_memberships.tier` column

---

### PHASE 3: Dashboard Load (get membership from DB)

**File:** `/public/hi-dashboard.html` → `/lib/HiMembership.js` (Lines 113-190)

```javascript
// 1. User loads dashboard
// 2. HiMembership.init() auto-runs
async loadMembershipStatus() {
  // Get current user from Supabase Auth
  const { data: { user } } = await this.supabase.auth.getUser();
  // user.id = 'uuid-user-123'

  // Call RPC to get membership from database
  const result = await this.supabase.rpc('get_unified_membership');
  membership = result.data;
  
  // ⚠️ CRITICAL: This is where tier is READ from database
  console.log('Membership from DB:', membership);
  // Expected: { tier: 'bronze', status: 'active', days_remaining: 30, ... }
}
```

**Database Read - get_unified_membership() RPC:**
```sql
-- DEPLOY_MASTER_TIER_SYSTEM.sql Lines 206-262
CREATE OR REPLACE FUNCTION get_unified_membership() RETURNS JSONB

BEGIN
  -- Query user_memberships table (SAME TABLE use_invite_code writes to)
  SELECT 
    tier,              -- 'bronze'
    status,            -- 'active'
    trial_end,         -- NOW() + 30 days
    ...
  FROM user_memberships
  WHERE user_id = auth.uid()  -- Current user
  INTO membership_row;

  IF membership_row IS NULL THEN
    -- No membership row → default to 'free'
    RETURN jsonb_build_object('tier', 'free', 'status', 'active', ...);
  END IF;

  -- Calculate days remaining
  days_remaining := EXTRACT(DAY FROM membership_row.trial_end - NOW())::INTEGER;

  RETURN jsonb_build_object(
    'tier', membership_row.tier,              -- 'bronze'
    'status', membership_row.status,          -- 'active'
    'days_remaining', days_remaining,         -- 30
    'trial_end', membership_row.trial_end,
    ...
  );
END;
```

**Result:** Frontend receives `{ tier: 'bronze', status: 'active', days_remaining: 30 }`

---

### PHASE 4: Frontend Processing (HiMembership.js)

**File:** `/lib/HiMembership.js` (Lines 150-250)

```javascript
async loadMembershipStatus() {
  // ... (RPC call above)
  
  // ✅ CRITICAL: Ensure features exist (populate from tier if missing)
  if (membership && membership.tier && !membership.features) {
    console.log('Populating features from tier:', membership.tier);
    membership.features = this.getFeaturesByTier(membership.tier);
    // Uses TIER_CONFIG.js to get features for 'bronze' tier
  }

  // Store membership in class property
  this.membershipStatus = membership;
  // this.membershipStatus = { tier: 'bronze', features: {...}, ... }

  // Save to localStorage (5min cache)
  this.saveMembershipCache();
  // localStorage.setItem('hi_membership', JSON.stringify(membership))

  // Fire event for other components
  this.notifyMembershipChange();
  // Dispatches 'hi:membership-changed' event

  // Update tier pill in header
  if (window.HiBrandTiers?.updateTierPill && membership?.tier) {
    window.HiBrandTiers.updateTierPill(membership.tier);
  }
}
```

**Result:** 
- `window.__hiMembership = { tier: 'bronze', features: {...} }`
- `localStorage['hi_membership'] = '{"tier":"bronze",...}'`
- Event `hi:membership-changed` dispatched

---

### PHASE 5: Tier Display (HiBrandTiers.js → Header)

**File:** `/lib/HiBrandTiers.js` (Lines 1-327)

```javascript
// HiBrandTiers maps database tier → branded display name
class HiBrandTierSystem {
  constructor() {
    this.tiers = {
      'free': { name: 'Hi Explorer', emoji: '🌟', color: '#10B981' },
      'bronze': { name: 'Hi Pathfinder', emoji: '🧭', color: '#CD7F32' },  // ← HERE
      'silver': { name: 'Hi Trailblazer', emoji: '⚡', color: '#C0C0C0' },
      'gold': { name: 'Hi Champion', emoji: '🏆', color: '#FFD700' },
      'premium': { name: 'Hi Pioneer', emoji: '🔥', color: '#F59E0B' },
      'collective': { name: 'Hi Collective', emoji: '🏛️', color: '#8B5CF6' }
    };
  }

  updateTierPill(tier) {
    const config = this.tiers[tier];  // tier = 'bronze'
    // config = { name: 'Hi Pathfinder', emoji: '🧭', color: '#CD7F32' }

    const pill = document.querySelector('.tier-pill, #tier-badge');
    if (pill) {
      pill.textContent = `${config.emoji} ${config.name}`;
      // Displays: "🧭 Hi Pathfinder"
      pill.style.background = config.gradient;
    }
  }
}
```

**File:** `/public/hi-island-NEW.html` (Lines 1672-1750)

```javascript
// Island listens for membership changes
function updateBrandTierDisplay(data) {
  const tier = data.membership?.tier || data.tier;  // 'bronze'

  // Get tier config from HiBrandTiers
  const tierConfig = window.HiBrandTiers.getDisplayInfo(tier);
  // tierConfig = { name: 'Hi Pathfinder', emoji: '🧭', ... }

  // Update all tier display elements
  const tierElements = document.querySelectorAll('[data-tier-name]');
  tierElements.forEach(el => {
    el.textContent = tierConfig.name;  // "Hi Pathfinder"
    el.style.color = tierConfig.color;
  });
}

// Listen for events
window.addEventListener('hi:membership-changed', (e) => {
  updateBrandTierDisplay(e.detail);
});
```

**Result:** Header shows **"🧭 Hi Pathfinder"** badge

---

## 🔍 WHERE TIER TOUCHES EVERY FILE

### 1. **Database Tables**
- ✅ `invitation_codes.grants_tier` - Stores what tier code grants (write once)
- ✅ `user_memberships.tier` - **SINGLE SOURCE OF TRUTH** (write on signup, read on every load)
- ⚠️ `hi_members.membership_tier` - **LEGACY TABLE** (might have old data, NOT USED)

### 2. **Database Functions (RPCs)**
- ✅ `admin_generate_invite_code(p_tier)` - Writes tier to invitation_codes
- ✅ `use_invite_code(p_code, p_user_id)` - Writes tier to user_memberships
- ✅ `get_unified_membership()` - Reads tier from user_memberships

### 3. **Frontend JavaScript Modules**
- ✅ `TIER_CONFIG.js` - Defines features per tier (taps/day, shares/month)
- ✅ `HiBrandTiers.js` - Maps tier → display name ('bronze' → 'Hi Pathfinder')
- ✅ `HiMembership.js` - Loads tier from DB, caches, fires events
- ⚠️ `MembershipSystem.js` - **LEGACY** (uses TIER_1/TIER_2 format, deprecated)
- ⚠️ `hi-tier-system.js` - **LEGACY** (redundant, should be removed)

### 4. **Boot Scripts (Initialize tier on page load)**
- ✅ `dashboard-main.js` - Calls HiMembership.init(), updates header
- ✅ `profile-navigation.js` - Has updateBrandTierDisplay(), updates tier badge
- ✅ `island-main.mjs` - Updates tier pill in Island header
- ✅ `muscle-main.js` - Updates tier badge in Muscle header
- ✅ `mission-control-init.js` - Admin creates invite codes with tier

### 5. **HTML Pages (Load tier modules)**
- ✅ `signup.html` - Loads TIER_CONFIG.js before signup completes
- ✅ `hi-dashboard.html` - Loads HiBrandTiers.js, HiMembership.js
- ✅ `hi-island-NEW.html` - Loads HiBrandTiers.js, has updateBrandTierDisplay()
- ✅ `profile.html` - Displays tier badge from HiMembership
- ✅ `mission-control.html` - Tier dropdown in InviteCodeModal

### 6. **Feature Access (Check tier permissions)**
- ✅ `HiShareSheet.js` - Checks `membership.features.max_shares_per_month`
- ✅ `anonymous-access-modal.js` - Blocks features if tier = 'anonymous'
- ✅ `auth-guard.js` - Redirects if tier insufficient
- ✅ `TIER_CONFIG.js` - `canAccessFeature(tier, 'calendar')` → true/false

---

## ⚠️ IDENTIFIED CONFLICTS (What User is Experiencing)

### 1. **Two Database Tables Fighting**
```
hi_members.membership_tier       ← OLD SYSTEM (might have 'starter', 'enhanced')
user_memberships.tier            ← NEW SYSTEM (has 'bronze', 'silver', etc.)
```
**Problem:** User signed up with bronze code → `user_memberships.tier = 'bronze'`  
But if `get_unified_membership()` accidentally queries `hi_members` instead → wrong tier returned

### 2. **Stale localStorage Cache (MOBILE)**
```javascript
// HiMembership.js Line 221-223
localStorage.setItem('hi_membership', JSON.stringify(membership));
// Cache expires after 5 minutes
```
**Problem:** User signs up on mobile → tier cached as 'free' before RPC completes → refresh doesn't clear cache → shows wrong tier for 5 minutes

### 3. **Multiple Frontend Modules Competing**
```
TIER_CONFIG.js         → Defines 'bronze' features
HiBrandTiers.js        → Maps 'bronze' → 'Hi Pathfinder'
MembershipSystem.js    → Uses 'TIER_2' (legacy format) ← CONFLICT
hi-tier-system.js      → Another tier manager ← CONFLICT
```
**Problem:** Different modules read tier from different sources → inconsistent display

### 4. **Tier Naming Inconsistencies**
```
Database constraint:  'explorer', 'starter', 'enhanced' (old)
invitation_codes:     'free', 'bronze', 'silver', 'premium' (new)
Legacy MembershipSystem: 'TIER_1', 'TIER_2', 'ADMIN' (uppercase)
Display names:        'Hi Explorer', 'Hi Pathfinder', 'Hi Collective' (branded)
```
**Problem:** Code expecting 'bronze' gets 'starter' → feature gates fail

### 5. **Missing Upgrade/Downgrade Logic**
```sql
-- No RPC function to change existing user's tier
-- No migration path from bronze → premium
-- No automatic downgrade when trial expires
```
**Problem:** User signs up as bronze, wants to upgrade → no function to call

---

## 🎯 ROOT CAUSE ANALYSIS (Why Bronze Shows as "Hi Friend")

**Expected Flow:**
```
1. Admin creates code: grants_tier = 'bronze' ✅
2. User signs up: user_memberships.tier = 'bronze' ✅
3. Dashboard loads: get_unified_membership() returns tier = 'bronze' ✅
4. HiBrandTiers maps: 'bronze' → 'Hi Pathfinder' ✅
5. Header displays: "🧭 Hi Pathfinder" ✅
```

**Actual Flow (What User Experiences):**
```
1. Admin creates code: grants_tier = 'bronze' ✅
2. User signs up: user_memberships.tier = 'bronze' ✅
3. Dashboard loads: get_unified_membership() returns tier = 'anonymous' ❌
4. HiBrandTiers maps: 'anonymous' → 'Hi Friend' ❌
5. Header displays: "👋 Hi Friend" ❌ WRONG!
```

**WHY Step 3 Fails (Hypotheses):**

**A. RPC Reads from Wrong Table**
```sql
-- Current get_unified_membership() might query hi_members instead of user_memberships
SELECT tier FROM hi_members WHERE user_id = auth.uid();
-- Returns NULL (no row) → defaults to 'anonymous'
```

**B. RPC Executes Before use_invite_code() Completes**
```javascript
// signup-init.js Lines 222-250
// Race condition: Dashboard loads while use_invite_code() still retrying
// RPC #1: use_invite_code() - writing tier = 'bronze' (takes 500ms)
// RPC #2: get_unified_membership() - reading tier (executes at 100ms)
// Result: Read happens before write completes → returns NULL
```

**C. User_memberships Row Not Created**
```sql
-- Possible foreign key error if public.users trigger didn't fire
INSERT INTO user_memberships (user_id, tier, ...) VALUES (...);
-- ERROR: foreign key constraint "fk_user" fails
-- RPC returns success but row not inserted
```

**D. Mobile localStorage Cache Not Invalidated**
```javascript
// User signs up → cache saved with tier = 'anonymous' (pre-signup)
localStorage.setItem('hi_membership', '{"tier":"anonymous"}');
// Signup completes → cache not cleared
// Dashboard loads → reads stale cache → shows 'anonymous'
```

---

## 🔬 DIAGNOSTIC PLAN (Surgical Approach)

### Step 1: Verify Database State
```sql
-- Check if user row exists in correct table
SELECT * FROM user_memberships WHERE user_id = 'uuid-user-123';
-- Expected: tier = 'bronze', status = 'active'

-- Check if old table has conflicting data
SELECT * FROM hi_members WHERE id = 'uuid-user-123';
-- Expected: NULL or tier = 'bronze' (if synced)

-- Check which table get_unified_membership() queries
SELECT routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'get_unified_membership';
-- Look for "FROM user_memberships" or "FROM hi_members"
```

### Step 2: Test RPC in Isolation
```javascript
// In browser console on dashboard
const { data, error } = await supabaseClient.rpc('get_unified_membership');
console.log('RPC Result:', data);
// Expected: { tier: 'bronze', status: 'active', ... }
// If returns 'free' or 'anonymous' → RPC broken
```

### Step 3: Check Cache State (Mobile)
```javascript
// In mobile browser console
console.log(localStorage.getItem('hi_membership'));
// If shows tier = 'anonymous' but DB shows tier = 'bronze' → cache stale
localStorage.removeItem('hi_membership');
window.location.reload();
// If tier fixes after clearing cache → cache invalidation broken
```

### Step 4: Trace Signup Flow (Real-time)
```javascript
// Add logging to signup-init.js Line 223
const { data: usageData, error } = await supabaseClient.rpc('use_invite_code', { 
  p_code: invite, 
  p_user_id: userId 
});
console.log('✅ use_invite_code result:', usageData);
// Should log: { success: true, tier: 'bronze', trial_days: 30 }

// Then immediately query membership
const { data: memberData } = await supabaseClient.rpc('get_unified_membership');
console.log('✅ get_unified_membership result:', memberData);
// Should log: { tier: 'bronze', status: 'active', ... }
```

### Step 5: Test Each Tier End-to-End
```
For each tier (free, bronze, silver, gold, premium, collective):
1. Generate invite code in Mission Control
2. Open incognito browser (mobile viewport)
3. Sign up with code
4. Verify email
5. Load dashboard
6. Check header tier badge
7. Test feature access (share modal, calendar)

Expected: ALL tiers show correct branded name + features
```

---

## 💊 SURGICAL FIX STRATEGY

### Fix #1: Consolidate Database Tables
```sql
-- Make user_memberships THE ONLY source of truth
-- Deprecate hi_members.membership_tier

-- Update all RPCs to ONLY query user_memberships
CREATE OR REPLACE FUNCTION get_unified_membership() RETURNS JSONB
AS $$
  SELECT * FROM user_memberships WHERE user_id = auth.uid();  -- ✅ Correct table
  -- NOT: SELECT * FROM hi_members WHERE id = auth.uid();     -- ❌ Old table
$$;

-- Optional: Sync old data to new table
INSERT INTO user_memberships (user_id, tier, status, created_at)
SELECT id, membership_tier, 'active', created_at 
FROM hi_members 
WHERE membership_tier IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;
```

### Fix #2: Force Cache Invalidation on Signup
```javascript
// signup-init.js Line 265 (after successful use_invite_code)
console.log('✅ Code marked as used successfully:', usageData);

// CRITICAL: Clear any pre-signup cache
localStorage.removeItem('hi_membership');
sessionStorage.removeItem('hi_membership');
console.log('🧹 Cleared membership cache before redirect');

// Redirect to dashboard
setTimeout(() => {
  window.location.href = '/hi-dashboard.html?new=true';
}, 2000);
```

### Fix #3: Reduce Mobile Cache TTL
```javascript
// HiMembership.js Line 221
saveMembershipCache() {
  const cacheData = {
    membership: this.membershipStatus,
    timestamp: Date.now(),
    version: '2.0'  // Add version for cache busting
  };
  
  // Reduce TTL to 2 minutes (was 5)
  localStorage.setItem('hi_membership', JSON.stringify(cacheData));
  localStorage.setItem('hi_membership_expires', Date.now() + 2 * 60 * 1000);
}

// Force refresh if cache older than version
loadMembershipCache() {
  const cached = JSON.parse(localStorage.getItem('hi_membership'));
  if (cached.version !== '2.0') {
    console.log('🔄 Cache version mismatch, forcing refresh');
    return null;  // Force DB fetch
  }
  // ... rest of cache logic
}
```

### Fix #4: Deprecate Legacy Modules
```javascript
// Remove or disable competing tier systems
// ❌ DELETE: /lib/MembershipSystem.js (legacy TIER_1/TIER_2 format)
// ❌ DELETE: /assets/hi-tier-system.js (redundant)

// ✅ KEEP ONLY:
// - TIER_CONFIG.js (features per tier)
// - HiBrandTiers.js (display names)
// - HiMembership.js (state management)
```

### Fix #5: Add Upgrade/Downgrade RPCs
```sql
-- New RPC: Change user's tier
CREATE OR REPLACE FUNCTION change_user_tier(
  p_user_id UUID,
  p_new_tier TEXT,
  p_reason TEXT DEFAULT 'admin_upgrade'
) RETURNS JSONB AS $$
BEGIN
  -- Validate tier
  IF p_new_tier NOT IN ('free', 'bronze', 'silver', 'gold', 'premium', 'collective') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid tier');
  END IF;

  -- Update user_memberships
  UPDATE user_memberships
  SET 
    tier = p_new_tier,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Log transaction
  INSERT INTO membership_transactions (
    user_id, transaction_type, description, metadata, created_at
  ) VALUES (
    p_user_id, 'tier_change', p_reason,
    jsonb_build_object('old_tier', OLD.tier, 'new_tier', p_new_tier),
    NOW()
  );

  RETURN jsonb_build_object('success', true, 'new_tier', p_new_tier);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant to authenticated users
GRANT EXECUTE ON FUNCTION change_user_tier(UUID, TEXT, TEXT) TO authenticated;
```

### Fix #6: Add Tier Consistency Validator
```javascript
// HiMembership.js - add validation on every load
async validateTierConsistency() {
  const dbTier = this.membershipStatus?.tier;
  const cachedTier = JSON.parse(localStorage.getItem('hi_membership'))?.tier;
  const displayTier = document.querySelector('.tier-pill')?.dataset.tier;

  if (dbTier !== cachedTier || dbTier !== displayTier) {
    console.error('⚠️ TIER MISMATCH DETECTED', {
      database: dbTier,
      cache: cachedTier,
      display: displayTier,
      user: this.currentUser.id
    });

    // Log to error tracking service
    await this.logTierMismatch({
      user_id: this.currentUser.id,
      db_tier: dbTier,
      cached_tier: cachedTier,
      display_tier: displayTier,
      timestamp: new Date().toISOString()
    });

    // Force cache clear and reload
    localStorage.removeItem('hi_membership');
    this.loadMembershipStatus();  // Fetch fresh from DB
  }
}
```

---

## ✅ SUCCESS CRITERIA (User's Requirements)

- [ ] **ANY user signing up for ANY tier** → Correct tier in database
- [ ] **Tier displays correctly** → Header shows branded name (e.g., "🧭 Hi Pathfinder")
- [ ] **Works on mobile** → No cache issues, refreshes correctly
- [ ] **Feature access matches tier** → Share modal, calendar, etc. respect tier limits
- [ ] **Upgrade/downgrade works** → Users can change tiers seamlessly
- [ ] **Single source of truth** → Only `user_memberships.tier` used (no conflicts)
- [ ] **Long-term account integrity** → Never breaks, no race conditions
- [ ] **Works identically everywhere** → Mobile, tablet, desktop all consistent

---

## 📋 NEXT STEPS (Surgical Approach)

1. ✅ **Complete data flow mapping** (THIS DOCUMENT)
2. ⏭️ **Run diagnostic queries** (Check database state for user's test account)
3. ⏭️ **Identify which fix applies** (DB table? Cache? RPC? Race condition?)
4. ⏭️ **Implement ONE fix at a time** (Deploy, test, validate)
5. ⏭️ **Test tier-by-tier** (Free → Bronze → Silver → Gold → Premium → Collective)
6. ⏭️ **Add monitoring** (Tier mismatch alerts, consistency checks)

**User's Methodology:** "surgically one by one find a clean and efficient way... approach this exactly how woz would"

---

*End of surgical data flow analysis*
