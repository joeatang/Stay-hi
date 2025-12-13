# 🔬 COMPREHENSIVE TIER SYSTEM AUDIT
## Triple-Checked: Every Nook and Cranny

**Date:** December 11, 2025  
**Scope:** Complete end-to-end tier system validation before proceeding  
**Method:** Surgical audit of every touch point from database → frontend → UI  

---

## ✅ LAYER 1: DATABASE (RPCs + Tables)

### 1.1 get_unified_membership() Function

**File:** `DEPLOY_MASTER_TIER_SYSTEM.sql` (Lines 206-262)

```sql
CREATE OR REPLACE FUNCTION get_unified_membership()
  -- ✅ CORRECT: Queries user_memberships table
  FROM user_memberships WHERE user_id = auth.uid()
```

**Status:** ✅ **CORRECT** - Queries the right table  
**Verification Needed:** Confirm this is actually deployed to Supabase (not the wrong version from `DEPLOY_MEMBERSHIP_TIER_FIX.sql`)

**Action Required:**
```sql
-- Run in Supabase SQL Editor to verify:
SELECT routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'get_unified_membership';

-- MUST contain: "FROM user_memberships"
-- MUST NOT contain: "FROM hi_members"
```

### 1.2 use_invite_code() Function

**File:** `DEPLOY_MASTER_TIER_SYSTEM.sql` (Lines 130-200)

```sql
CREATE OR REPLACE FUNCTION use_invite_code(p_code TEXT, p_user_id UUID)
  -- Reads from invitation_codes
  SELECT grants_tier, trial_days FROM invitation_codes WHERE code = p_code
  
  -- ✅ Writes to user_memberships
  INSERT INTO user_memberships (user_id, tier, status, trial_start, trial_end)
```

**Status:** ✅ **CORRECT** - Writes tier to correct table  
**Gap:** No validation that user_memberships row was created successfully

**Potential Issue:**
- If `INSERT` fails silently (foreign key error, constraint violation)
- RPC returns `success: true` but no row created
- Dashboard then returns tier = 'free' (default)

**Fix Needed:**
```sql
-- Add explicit check after INSERT:
IF NOT FOUND THEN
  RETURN jsonb_build_object('success', false, 'error', 'Failed to create membership');
END IF;
```

### 1.3 user_memberships Table Structure

**Expected Columns:**
- `user_id` (UUID, primary key) ← Foreign key to auth.users
- `tier` (TEXT) ← Should be: free, bronze, silver, gold, premium, collective
- `status` (TEXT) ← active, inactive, expired
- `trial_start` (TIMESTAMPTZ)
- `trial_end` (TIMESTAMPTZ)
- `trial_days_total` (INTEGER)
- `invitation_code` (TEXT) ← For audit trail
- `created_at`, `updated_at` (TIMESTAMPTZ)

**Gap:** No constraint to validate tier values

**Risk:** Admin could accidentally create code with tier = 'platinum' (invalid)

**Fix Needed:**
```sql
ALTER TABLE user_memberships
ADD CONSTRAINT valid_tier_values 
CHECK (tier IN ('free', 'bronze', 'silver', 'gold', 'premium', 'collective'));
```

---

## ⚠️ LAYER 2: FRONTEND TIER LOADING (HiMembership.js)

### 2.1 Tier Loading Flow

**File:** `/public/lib/HiMembership.js` (Lines 65-95)

```javascript
async loadMembershipStatus() {
  // 1. Call RPC
  const result = await this.supabase.rpc('get_unified_membership');
  membership = result.data;
  
  // 2. ⚠️ GAP: No validation if membership is null/undefined
  if (!membership || !membership.tier) {
    console.warn('No membership data returned');
    // Falls through to set tier = 'anonymous' silently
  }
  
  // 3. ✅ Populates features from TIER_CONFIG
  if (membership && membership.tier && !membership.features) {
    membership.features = this.getFeaturesByTier(membership.tier);
  }
  
  // 4. ✅ Saves to localStorage with 5min TTL
  this.saveMembershipCache();
  
  // 5. ✅ Fires hi:membership-changed event
  this.notifyMembershipChange();
}
```

**Identified Gaps:**

#### Gap 2.1A: No Error Handling for RPC Failures
```javascript
// Current:
const result = await this.supabase.rpc('get_unified_membership');

// Problem: If RPC throws error, catches it but logs generic message
// User sees "Hi Friend" with no indication WHY

// Fix:
const result = await this.supabase.rpc('get_unified_membership');
if (result.error) {
  console.error('❌ Membership RPC failed:', result.error);
  // Show user-friendly error modal
  this.showTierLoadError(result.error);
  return;
}
```

#### Gap 2.1B: Stale Cache on Signup
```javascript
// Problem: User signs up → cache saved with tier='free' BEFORE use_invite_code completes
// Cache expires in 5 minutes → user sees wrong tier for 5 minutes

// Current cache invalidation:
localStorage.setItem('hi_membership_expires', Date.now() + 5 * 60 * 1000);

// Fix: Clear cache on signup completion
// In signup-init.js after use_invite_code success:
localStorage.removeItem('hi_membership');
sessionStorage.clear();
```

#### Gap 2.1C: No Tier Consistency Validation
```javascript
// Missing: Check if tier in DB matches tier in cache
// If mismatch → log error, force refresh

async validateTierConsistency() {
  const cachedTier = JSON.parse(localStorage.getItem('hi_membership'))?.tier;
  const dbTier = this.membershipStatus?.tier;
  
  if (cachedTier && dbTier && cachedTier !== dbTier) {
    console.error('🚨 TIER MISMATCH:', { cached: cachedTier, database: dbTier });
    // Force reload from database
    localStorage.removeItem('hi_membership');
    await this.loadMembershipStatus();
  }
}
```

### 2.2 Feature Population

**File:** `/public/lib/HiMembership.js` (Lines 250-280)

```javascript
getFeaturesByTier(tier) {
  // ✅ Correctly imports from TIER_CONFIG.js
  if (typeof window !== 'undefined' && window.HiTierConfig) {
    return window.HiTierConfig.getTierFeatures(tier);
  }
  
  // ⚠️ GAP: Hardcoded fallback features (could be stale)
  return { /* legacy features */ };
}
```

**Gap:** If `TIER_CONFIG.js` fails to load, falls back to hardcoded features that may not match database tier definitions.

**Fix:**
```javascript
if (!window.HiTierConfig) {
  console.error('🚨 TIER_CONFIG.js not loaded! Features will be incomplete.');
  // Show user warning
  this.showConfigLoadError();
}
```

---

## ⚠️ LAYER 3: TIER DISPLAY (HiBrandTiers.js + Headers)

### 3.1 Tier Name Mapping

**File:** `/public/lib/HiBrandTiers.js` (Lines 20-100)

```javascript
this.tiers = {
  'free': { name: 'Hi Explorer', emoji: '🌟' },
  'bronze': { name: 'Hi Pathfinder', emoji: '🧭' },  // ← YOUR TEST CASE
  'silver': { name: 'Hi Trailblazer', emoji: '⚡' },
  'gold': { name: 'Hi Champion', emoji: '🏆' },
  'premium': { name: 'Hi Pioneer', emoji: '🔥' },
  'collective': { name: 'Hi Collective', emoji: '🏛️' }
};
```

**Status:** ✅ **CORRECT** - Mapping matches TIER_CONFIG.js

**Gap:** No validation for invalid tier names

**Test:**
```javascript
window.HiBrandTiers.getDisplayInfo('platinum'); // Returns undefined (no fallback)
```

**Fix:**
```javascript
getDisplayInfo(tier) {
  const config = this.tiers[tier];
  if (!config) {
    console.warn(`Unknown tier: ${tier}, falling back to free`);
    return this.tiers.free; // Fallback to free tier
  }
  return config;
}
```

### 3.2 Header Display Logic

**Files:** `dashboard-main.js` (Line 591), `profile-navigation.js` (Line 191)

```javascript
function updateBrandTierDisplay() {
  // ✅ Reads from multiple sources (fallback chain)
  let tierKey = 'anonymous';
  
  // Priority 1: window.__hiMembership (from AuthReady.js)
  if (window.__hiMembership?.tier) {
    tierKey = window.__hiMembership.tier;
  }
  // Priority 2: window.unifiedMembership (legacy)
  else if (window.unifiedMembership?.membershipStatus?.tier) {
    tierKey = window.unifiedMembership.membershipStatus.tier;
  }
  
  // ✅ Updates tier pill via HiBrandTiers
  window.HiBrandTiers.updateTierPill(tierIndicator, tierKey);
}
```

**Gap:** Reads from `window.__hiMembership` which is set by AuthReady.js, but AuthReady.js might not have loaded yet.

**Timing Issue:**
1. dashboard-main.js loads first → calls `updateBrandTierDisplay()`
2. `window.__hiMembership` not set yet → falls back to 'anonymous'
3. AuthReady.js loads 2 seconds later → sets `window.__hiMembership.tier = 'bronze'`
4. **Header still shows "Hi Friend" until page refresh**

**Fix:** Add retry logic
```javascript
function updateBrandTierDisplay() {
  // If tier not loaded yet, retry in 500ms
  if (!window.__hiMembership?.tier && !window._tierRetryCount) {
    window._tierRetryCount = (window._tierRetryCount || 0) + 1;
    if (window._tierRetryCount < 10) {
      setTimeout(updateBrandTierDisplay, 500);
      return;
    }
  }
  // ... rest of logic
}
```

---

## 🚨 LAYER 4: FEATURE ACCESS (Share Sheet, Calendar, Trends)

### 4.1 HiShareSheet.js Tier Gating

**File:** `/public/ui/HiShareSheet/HiShareSheet.js` (Lines 292-313)

```javascript
// 🎯 FUTURE: Tier system infrastructure ready (currently unused)
// const membership = await this.getMembershipTier();
// const tier = membership?.tier || 'free';

// ⚠️ CRITICAL GAP: Tier gating is DISABLED
// 🎯 TIER-GATING DISABLED: All authenticated users get full access
```

**Status:** ❌ **NOT IMPLEMENTED** - All users can share regardless of tier

**Impact:**
- Bronze user ($5.55) should have 10 shares/month limit
- Currently has unlimited shares (same as Gold)
- No enforcement of feature limits from TIER_CONFIG.js

**Fix Required:**
```javascript
async populateShareButtons(tabs) {
  // Enable tier checking
  const membership = await this.getMembershipTier();
  const tier = membership?.tier || 'free';
  
  // Get tier limits from TIER_CONFIG.js
  const features = window.HiTierConfig.getTierFeatures(tier);
  
  // Hide buttons user can't access
  if (!features.shareCreation || features.shareCreation === 0) {
    // Free users can't create shares
    tabs.forEach(tab => tab.style.display = 'none');
    this.showUpgradePrompt('Upgrade to Bronze to start sharing!');
    return;
  }
  
  // Show share type buttons based on tier
  const shareTypes = features.shareTypes || ['public'];
  if (!shareTypes.includes('anonymous')) {
    anonymousBtn.style.display = 'none';
  }
  if (!shareTypes.includes('private')) {
    privateBtn.style.display = 'none';
  }
  
  // Show monthly limit for Bronze/Silver
  if (typeof features.shareCreation === 'number') {
    this.showShareLimit(features.shareCreation); // "8/10 shares used this month"
  }
}
```

### 4.2 Calendar Access

**File:** Need to check where calendar is loaded

**Expected Behavior:**
- Free: No access
- Bronze: No access
- Silver+: Full access

**Current Status:** Unknown - need to search for calendar access checks

**Verification Needed:**
```javascript
// Search for calendar tier checks
grep -r "calendarAccess" public/
```

### 4.3 Trends/Analytics Access

**Expected Behavior:**
- Free/Bronze: No access
- Silver: Basic trends
- Gold+: Full analytics

**Gap:** Need to verify if trends page checks tier before loading

---

## ⚠️ LAYER 5: SIGNUP FLOW (Critical Path)

### 5.1 Signup Flow Steps

**File:** `/public/lib/boot/signup-init.js` (Lines 180-280)

```javascript
// Step 1: Create auth account
const { data, error } = await supabaseClient.auth.signUp({ email, password });
userId = data.user?.id; // ✅ Gets user ID

// Step 2: Mark code as used (WITH RETRY LOGIC) ✅
for (let attempt = 0; attempt < 10; attempt++) {
  const { data: usageData, error } = await supabaseClient.rpc('use_invite_code', { 
    p_code: invite, 
    p_user_id: userId 
  });
  
  if (error?.code === '23503') {
    // Foreign key error - user row not ready yet
    await new Promise(resolve => setTimeout(resolve, 500)); // ✅ Retry after 500ms
    continue;
  }
  
  if (!error) {
    console.log('✅ Code marked as used');
    break;
  }
}

// Step 3: Redirect to dashboard
setTimeout(() => {
  window.location.href = '/hi-dashboard.html';
}, 2000);
```

**Gap 5.1A: No Cache Invalidation Before Redirect**
```javascript
// Problem: Dashboard loads with stale cache from pre-signup

// Fix: Clear cache before redirect
localStorage.removeItem('hi_membership');
sessionStorage.removeItem('hi_membership');
console.log('🧹 Cleared membership cache before redirect');

window.location.href = '/hi-dashboard.html?new=true';
```

**Gap 5.1B: No Verification That Tier Was Assigned**
```javascript
// After use_invite_code succeeds, verify tier was written:
const { data: verifyData } = await supabaseClient.rpc('get_unified_membership');
if (verifyData?.tier !== 'bronze') {
  console.error('🚨 Tier verification failed!', verifyData);
  // Show error to user
}
```

### 5.2 Email Verification Flow

**Gap:** What happens to tier between signup and email verification?

**Scenario:**
1. User signs up with bronze code
2. `use_invite_code()` writes tier = 'bronze' to user_memberships
3. User does NOT verify email
4. User tries to login → Supabase blocks (email not verified)
5. Does tier persist?

**Verification Needed:**
```sql
-- Check users with tier but no email confirmation
SELECT 
  au.email,
  au.email_confirmed_at,
  um.tier,
  um.created_at
FROM auth.users au
JOIN user_memberships um ON um.user_id = au.id
WHERE au.email_confirmed_at IS NULL
  AND um.tier != 'free';
```

---

## ⚠️ LAYER 6: MOBILE-SPECIFIC ISSUES

### 6.1 Mobile Cache Behavior

**Issue:** Mobile browsers aggressively cache localStorage

**Test Scenario:**
1. User signs up on mobile → tier cached as 'free'
2. `use_invite_code()` completes → tier now 'bronze' in DB
3. Dashboard loads → reads stale cache → shows 'free'
4. Cache expires after 5 minutes → finally shows 'bronze'

**Fix:** Reduce cache TTL for mobile
```javascript
// Detect mobile
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const cacheTTL = isMobile ? 2 * 60 * 1000 : 5 * 60 * 1000; // 2min on mobile, 5min on desktop

localStorage.setItem('hi_membership_expires', Date.now() + cacheTTL);
```

### 6.2 Mobile Event Propagation

**Gap:** Events might not fire across tabs on mobile

**Test:**
1. User opens dashboard in mobile browser
2. User opens profile in new tab
3. Tier updates on profile → event fires
4. Dashboard tab doesn't receive event (mobile Safari suspends inactive tabs)

**Fix:** Use BroadcastChannel API
```javascript
const channel = new BroadcastChannel('hi-tier-updates');

// Send update
channel.postMessage({ type: 'tier-changed', tier: 'bronze' });

// Receive in all tabs
channel.onmessage = (event) => {
  if (event.data.type === 'tier-changed') {
    updateBrandTierDisplay(event.data.tier);
  }
};
```

---

## 🎯 LAYER 7: TIER_CONFIG.js Integration

### 7.1 Global Script Loading

**Files That Must Load TIER_CONFIG.js:**
- ✅ `signup.html` (Line 24) - Loaded BEFORE signup completes
- ❓ `hi-dashboard.html` - Need to verify
- ❓ `profile.html` - Need to verify
- ❓ `hi-island-NEW.html` - Need to verify
- ❓ `hi-muscle.html` - Need to verify

**Verification:**
```bash
grep -r "TIER_CONFIG.js" public/**/*.html
```

**Gap:** If TIER_CONFIG.js fails to load on any page:
- Features undefined → all features blocked
- Or falls back to legacy hardcoded features (stale)

**Fix:** Add load validation
```javascript
// In each HTML file after TIER_CONFIG.js script tag:
<script>
  if (!window.HiTierConfig) {
    console.error('🚨 TIER_CONFIG.js failed to load!');
    document.body.innerHTML = '<h1>Config Error: Please refresh</h1>';
  }
</script>
```

### 7.2 Feature Access Functions

**File:** `/public/lib/config/TIER_CONFIG.js` (Lines 390-420)

```javascript
function canAccessFeature(tierName, feature) {
  const features = getTierFeatures(tierName);
  const value = features[feature];
  
  // ✅ Handles boolean, number, string values correctly
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  if (value === 'unlimited') return true;
  if (value === 'none') return false;
  
  return false; // Default to no access
}
```

**Status:** ✅ **CORRECT** - Logic is sound

**Gap:** No logging when access denied

**Fix:**
```javascript
function canAccessFeature(tierName, feature) {
  const features = getTierFeatures(tierName);
  const value = features[feature];
  
  const hasAccess = /* ... existing logic ... */;
  
  if (!hasAccess) {
    console.log(`🚫 Feature blocked: ${feature} requires tier ${getRequiredTier(feature)}, user has ${tierName}`);
  }
  
  return hasAccess;
}
```

---

## 🧪 COMPREHENSIVE TEST MATRIX

### Test Scenario 1: Fresh Bronze Signup (Mobile)

| Step | Action | Expected | Gaps Found |
|------|--------|----------|------------|
| 1 | Admin creates bronze code | Code with tier='bronze' in DB | ✅ Works |
| 2 | User enters code in signup form | Code validated | ✅ Works |
| 3 | User submits signup | Auth account created | ✅ Works |
| 4 | RPC: use_invite_code() | Row in user_memberships with tier='bronze' | ⚠️ No verification |
| 5 | Redirect to dashboard | Cache cleared before redirect | ❌ **GAP: Cache not cleared** |
| 6 | Dashboard loads | RPC called: get_unified_membership() | ✅ Works (if deployed) |
| 7 | Tier displayed in header | Shows "🧭 Hi Pathfinder" | ⚠️ **Depends on RPC deployment** |
| 8 | Open share modal | 10 shares/month available | ❌ **GAP: Tier gating disabled** |
| 9 | Check mobile cache | Cache TTL = 2 minutes | ❌ **GAP: Mobile-specific TTL not implemented** |

### Test Scenario 2: Existing User Upgrades Bronze → Gold

| Step | Action | Expected | Gaps Found |
|------|--------|----------|------------|
| 1 | User enters gold code | Code validated | ✅ Works |
| 2 | RPC: use_invite_code() | user_memberships.tier = 'gold' | ⚠️ Overwrites, no transaction log |
| 3 | Cache invalidated | localStorage cleared | ❌ **GAP: No cache clear on upgrade** |
| 4 | Header updates | Shows "🏆 Hi Champion" | ⚠️ Requires event listener |
| 5 | Share modal reopened | Unlimited shares | ❌ **GAP: Tier gating disabled** |

### Test Scenario 3: Trial Expiration (Downgrade)

| Step | Action | Expected | Gaps Found |
|------|--------|----------|------------|
| 1 | Bronze trial ends (7 days) | status = 'expired' in DB | ❌ **GAP: No cron job to update status** |
| 2 | User loads dashboard | RPC returns status='expired', tier='free' | ❌ **GAP: No downgrade logic** |
| 3 | Header updates | Shows "🌟 Hi Explorer" | ⚠️ Depends on RPC |
| 4 | Share modal | Blocked ("Upgrade to share") | ❌ **GAP: No expiration check** |

---

## 🚨 CRITICAL GAPS SUMMARY

### Priority 1: Blocking Issues (Fix Before Proceeding)

1. **❌ Database Deployment Verification**
   - Must confirm `get_unified_membership()` queries `user_memberships` (not `hi_members`)
   - Run diagnostic SQL to verify

2. **❌ Signup Cache Invalidation**
   - Clear localStorage/sessionStorage after `use_invite_code()` success
   - Fix in `signup-init.js` Line 265

3. **❌ Share Sheet Tier Gating**
   - Currently disabled - all users have unlimited access
   - Implement tier checks before Bronze testing

### Priority 2: High-Risk Gaps (Fix This Week)

4. **⚠️ Mobile Cache TTL**
   - 5-minute cache too long for mobile
   - Reduce to 2 minutes for mobile devices

5. **⚠️ Tier Verification After Signup**
   - No confirmation that tier was written successfully
   - Add verification query after `use_invite_code()`

6. **⚠️ Header Display Timing**
   - Race condition: header loads before AuthReady sets tier
   - Add retry logic with 500ms intervals

### Priority 3: Feature Completeness (Next Sprint)

7. **📋 Trial Expiration/Downgrade**
   - No automatic downgrade when trial expires
   - Need cron job or RPC to update status

8. **📋 Upgrade/Downgrade Transaction Log**
   - No audit trail when user changes tiers
   - Add to membership_transactions table

9. **📋 Calendar/Trends Tier Checks**
   - Unknown if calendar checks tier before loading
   - Need to audit calendar access code

### Priority 4: Polish (Before Launch)

10. **✨ Error Messages**
    - Generic "Login failed" when tier loading fails
    - Add user-friendly tier-specific errors

11. **✨ TIER_CONFIG.js Load Validation**
    - Silent failure if script doesn't load
    - Add explicit error UI

12. **✨ Admin Tier Mismatch Alerts**
    - No monitoring for DB vs cache mismatches
    - Add consistency check on every page load

---

## ✅ ACTION PLAN

### Immediate (Do Before Any Testing)

- [ ] **Deploy QUICK_FIX_TIER_BUG.sql to Supabase**
  - Updates `get_unified_membership()` to query correct table
  - Critical blocker - nothing works without this

- [ ] **Run DIAGNOSE_BRONZE_TEST_USER.sql**
  - Verify your test account's tier in database
  - Confirms use_invite_code() wrote tier correctly

- [ ] **Add Cache Invalidation to signup-init.js**
  ```javascript
  localStorage.removeItem('hi_membership');
  sessionStorage.clear();
  ```

### High Priority (This Week)

- [ ] **Enable Tier Gating in HiShareSheet.js**
  - Uncomment Lines 292-293
  - Add feature limit checks

- [ ] **Add Tier Verification After Signup**
  - Query tier immediately after use_invite_code()
  - Show error if mismatch

- [ ] **Fix Mobile Cache TTL**
  - Detect mobile device
  - Reduce cache to 2 minutes

### Medium Priority (Next Sprint)

- [ ] **Audit Calendar/Trends Access**
  - Search for tier checks
  - Add if missing

- [ ] **Implement Upgrade/Downgrade RPCs**
  - `change_user_tier(new_tier, reason)`
  - Log to membership_transactions

- [ ] **Add Trial Expiration Logic**
  - Cron job or RPC trigger
  - Auto-downgrade on expiration

### Low Priority (Before Public Launch)

- [ ] **Add Error UI**
- [ ] **Add Tier Mismatch Monitoring**
- [ ] **Add TIER_CONFIG.js Load Validation**

---

## 📋 TESTING CHECKLIST (After Fixes)

### Bronze Tier ($5.55 "Hi Pathfinder")

- [ ] Generate bronze code in Mission Control
- [ ] Sign up in incognito mobile browser
- [ ] Verify email
- [ ] Load dashboard → Header shows "🧭 Hi Pathfinder"
- [ ] Check database: `SELECT tier FROM user_memberships WHERE user_id = ?`
- [ ] Open share modal → 10 shares/month limit shown
- [ ] Try to create 11th share → Blocked with upgrade prompt
- [ ] Check calendar access → Blocked (Bronze has no calendar)
- [ ] Test on desktop → Same tier display

### All Other Tiers

- [ ] Repeat for free, silver, gold, premium, collective
- [ ] Verify each tier shows correct:
  - Display name (Hi Explorer, Hi Trailblazer, etc.)
  - Feature limits (taps, shares, calendar, trends)
  - Upgrade prompts (correct next tier)

---

## ✅ VERIFICATION QUERIES

```sql
-- 1. Check deployed RPC queries correct table
SELECT routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'get_unified_membership';
-- MUST contain: "FROM user_memberships"

-- 2. Check tier constraint exists
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'valid_tier_values';
-- Should enforce: tier IN ('free', 'bronze', 'silver', 'gold', 'premium', 'collective')

-- 3. Check recent signups got correct tier
SELECT 
  au.email,
  um.tier,
  um.status,
  um.trial_end,
  um.invitation_code
FROM auth.users au
JOIN user_memberships um ON um.user_id = au.id
WHERE au.created_at > NOW() - INTERVAL '7 days'
ORDER BY au.created_at DESC;
```

---

*Comprehensive audit complete. Fix Priority 1 gaps before proceeding with testing.*
