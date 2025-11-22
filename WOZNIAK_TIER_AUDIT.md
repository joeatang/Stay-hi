# 🔍 COMPLETE TIER SYSTEM AUDIT - WOZNIAK GRADE

## CURRENT STATE DISCOVERY

### 1. DATABASE TIER VALUES (Source of Truth)
**invitation_codes.grants_tier:** 'premium'
**user_memberships.tier:** 'premium'
**Trial Days:** 30 days

### 2. TIER DETECTION SYSTEMS (Multiple competing systems found!)

#### System A: HiTier.js (lib/access/HiTier.js)
- **Purpose:** Lightweight tier detection
- **Allowed Tiers:** ['free', 'bronze', 'silver', 'gold', 'premium', 'collective']
- **Source Priority:** 
  1. window.__hiMembership.tier
  2. auth.user.user_metadata.tier
  3. user_memberships table query
  4. localStorage fallback
- **Exports:** getTier(), isAtLeast(tier), refresh(), tierRank(tier)
- **Used By:** header.js badge display

#### System B: HiBrandTiers.js (lib/HiBrandTiers.js)
- **Purpose:** UI display names for tiers
- **Tier Mappings:**
  - 'anonymous' → 'Hi Friend'
  - '24hr' → 'Hi Spark'
  - '7d' → 'Hi Explorer'
  - '14d' → 'Hi Trailblazer'
  - '30d' → 'Hi Pioneer'
  - '60d' → 'Hi Champion'
  - '90d' → 'Hi Legend'
  - 'member' → 'Hi Family'
  - 'collective' → 'Collective'
  - 'enhanced' → 'Enhanced'
  - 'starter' → 'Starter'
  - **'premium' → 'Hi Pioneer'** ✅ EXISTS
- **Exports:** getBrandName(tier), getTierColor(tier), getTierEmoji(tier)
- **Used By:** Dashboard tier display

#### System C: HiMembership.js (lib/HiMembership.js)
- **Purpose:** Full membership + access control
- **Tier Mappings:**
  - ANONYMOUS: level 0
  - STAN_MEMBER: level 1
  - TIER_1: level 2 ($5.55)
  - TIER_2: level 3 ($15.55)
  - TIER_3: level 4 ($55.55)
  - HI_ARCHITECT: level 5 ($155.55)
  - ADMIN: level 99
- **Access Control:** canAccess(feature), hasAccess(feature)
- **PROBLEM:** Expects 'TIER_1', 'TIER_2', 'TIER_3' but database has 'premium'!

#### System D: HiAuthTierSystem (assets/hi-tier-system.js)
- **Purpose:** Legacy tier detection
- **Status:** ⚠️ Overlaps with HiMembership.js
- **Used By:** hi-island

#### System E: UnifiedMembershipSystem (mentioned in code but not found)
- **Purpose:** Unknown - referenced but implementation unclear
- **Status:** 🔍 Need to verify if this exists

### 3. ACCESS CONTROL SYSTEMS (Feature Gating)

#### A. hiAccessManager
- **File:** Unknown - needs to be located
- **Method:** canAccess('shareCreation')
- **Used By:** dashboard-main.mjs line 129

#### B. HiTierSystem
- **File:** Unknown - needs to be located  
- **Method:** hasCapability('drop_hi')
- **Used By:** dashboard-main.mjs line 130

#### C. unifiedMembership
- **File:** Unknown - needs to be located
- **Method:** hasAccess('shareCreation')
- **Used By:** dashboard-main.mjs line 131

### 4. DATABASE FUNCTIONS

#### get_unified_membership()
**Current Return Format:**
```json
{
  "tier": "premium",
  "status": "active",
  "trial_end": "2025-12-22...",
  "days_remaining": 30,
  "is_admin": false
}
```

**PROBLEM:** Missing `features` object that HiMembership.js expects!

**Expected Format (inferred from HiMembership.js):**
```json
{
  "tier": "premium",
  "status": "active",
  "features": {
    "shareCreation": "unlimited",
    "hiMedallionInteractions": "unlimited",
    "mapAccess": "full",
    "profileAccess": "full",
    "hiMuscleAccess": true,
    "calendarAccess": true
  }
}
```

### 5. PAGE-BY-PAGE ACCESS REQUIREMENTS

#### Dashboard (hi-dashboard.html)
**Scripts Loaded:**
- HiTier.js ✅
- HiBrandTiers.js ✅
- HiMembership.js ✅
- dashboard-main.mjs (medallion hold logic)

**Features:**
- Medallion tap → Increment waves (all tiers)
- Medallion hold (1.5s) → Open share sheet
  - Anonymous: Show auth modal
  - Premium: Should open share sheet ❌ CURRENTLY BROKEN
- Header badge → Show tier name
  - Currently shows: "Hi Pioneer" (from HiBrandTiers)
  - Should show: "⭐ Premium Member" (from header.js)

**Access Check Location:** dashboard-main.mjs:129-147

#### Island (hi-island)
**Scripts Loaded:** Need to check
**Features:**
- Share creation
- Access control checks
**Current Issue:** Treating premium user as anonymous

#### Profile (profile.html)
**Current Issues:**
- Large blank space before content
- Header looks weird
**Features Working:**
- Avatar upload ✅
- Username update ✅

### 6. TIER VALUE MISMATCHES

| System | Expected Value | Actual Value | Match? |
|--------|---------------|--------------|--------|
| Database | 'premium' | 'premium' | ✅ |
| HiTier.js | 'premium' | 'premium' | ✅ |
| HiBrandTiers.js | 'premium' | 'premium' | ✅ |
| HiMembership.js | 'TIER_3' | 'premium' | ❌ |
| header.js | 'premium' | 'premium' | ✅ |

### 7. ROOT CAUSE ANALYSIS

**Problem 1: Tier Value Mismatch**
- Database uses: 'premium' (lowercase)
- HiMembership.js expects: 'TIER_3' (uppercase constant)
- Result: canAccess() returns undefined

**Problem 2: Missing Features Object**
- get_unified_membership() doesn't return features
- HiMembership.js checks: this.membershipStatus.features[feature]
- Result: Checking undefined['shareCreation'] = false

**Problem 3: Multiple Competing Systems**
- 5 different tier detection systems
- Each expects different format
- No single source of truth

**Problem 4: Access Control Fragmentation**
- hiAccessManager.canAccess()
- HiTierSystem.hasCapability()
- unifiedMembership.hasAccess()
- All THREE must succeed or user treated as anon

### 8. CONFLICTING SCENARIOS

**Scenario A: User signs up with 'premium' code**
- ✅ Database stores tier='premium'
- ✅ HiTier.js recognizes it
- ✅ Header badge works (header.js)
- ❌ HiMembership.js doesn't recognize (expects TIER_3)
- ❌ Access control fails
- Result: Authenticated but treated as anonymous

**Scenario B: If we change database to use 'TIER_3'**
- ✅ HiMembership.js works
- ❌ HiTier.js breaks (not in allowedTiers)
- ❌ Header badge breaks
- ❌ HiBrandTiers breaks
- Result: Access works but UI breaks

**Scenario C: Multiple tier systems loaded**
- Dashboard loads both HiTier.js + HiMembership.js
- Both try to manage tier state
- Race conditions possible
- Inconsistent state across pages

### 9. QUESTIONS FOR WOZNIAK

**Q1: What is the intended tier hierarchy?**
Current options:
- Option A: free → bronze → silver → gold → premium → collective
- Option B: anonymous → 24hr → 7d → 14d → 30d → member
- Option C: ANONYMOUS → TIER_1 → TIER_2 → TIER_3 → ADMIN
- **ANSWER NEEDED:** Which is the canonical system?

**Q2: Should tiers be time-based or feature-based?**
- Time-based: '24hr', '7d', '30d' (trial duration)
- Feature-based: 'premium', 'collective' (access level)
- **ANSWER NEEDED:** Database has 'premium' with trial_days_total=30

**Q3: What features should 'premium' tier have?**
```
shareCreation: ? (unlimited/limited/none)
hiMedallionInteractions: ? (unlimited/count)
mapAccess: ? (full/preview/none)
profileAccess: ? (full/view_only)
hiMuscleAccess: ? (true/false)
calendarAccess: ? (true/false)
```
**ANSWER NEEDED:** Feature matrix undefined

**Q4: Should there be ONE tier system or multiple?**
- Current: 5 systems (HiTier, HiBrandTiers, HiMembership, HiAuthTierSystem, unifiedMembership)
- Proposed: Single system with adapters?
- **ANSWER NEEDED:** Architecture decision

### 10. PROPOSED SOLUTION (PENDING APPROVAL)

**Option 1: Normalize to lowercase tier names**
- Change: HiMembership.js to recognize 'premium', 'collective', etc.
- Update: canAccess() to map 'premium' → full access
- Add: features object to get_unified_membership()
- Pro: Minimal database changes
- Con: Requires updating HiMembership.js mapping

**Option 2: Add tier aliases**
- Create: Mapping table 'premium' ↔ 'TIER_3'
- Update: All systems to check aliases
- Pro: Backward compatible
- Con: Adds complexity

**Option 3: Deprecate old systems**
- Keep: HiTier.js as single source of truth
- Remove: HiMembership.js, HiAuthTierSystem
- Create: New access control based on HiTier
- Pro: Clean architecture
- Con: Requires major refactoring

### 11. IMMEDIATE BLOCKERS

1. ❌ Cannot determine which tier system is "correct"
2. ❌ No feature matrix defined for 'premium' tier
3. ❌ Three access control systems all failing
4. ❌ get_unified_membership() missing features object
5. ❌ Island page tier detection unknown

### 12. NEXT STEPS (AWAITING DIRECTION)

**Before ANY code changes:**
1. Define canonical tier names (premium vs TIER_3 vs 30d)
2. Define feature matrix for each tier
3. Choose primary tier detection system
4. Map access control requirements per page
5. Create migration path for existing users

**DO NOT PROCEED** until architectural decisions made.

---

## WOZNIAK'S VERDICT?

This is a **TIER SYSTEM IDENTITY CRISIS**. We have:
- 5 competing tier detection systems
- 3 different naming conventions
- No single source of truth
- Undefined feature matrix
- Fragmented access control

**The system works in parts but fails as a whole because each component expects a different tier format.**

What's the **intended design**?
