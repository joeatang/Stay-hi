# 🎯 TIER SYSTEM: SINGLE SOURCE OF TRUTH
## Wozniak-Grade Architecture to Prevent Future Conflicts

**Date:** December 11, 2025  
**Problem:** Multiple tier systems deployed → SQL functions overwrite each other  
**Solution:** Enforce single source of truth with deprecation protocol  

---

## 📋 THE ONE TRUE TIER SYSTEM

### ✅ AUTHORITATIVE FILES (Use These ONLY)

**Frontend:**
```
✅ /public/lib/config/TIER_CONFIG.js
   - Feature definitions per tier
   - THE definitive source for "what does bronze get?"
   
✅ /public/lib/state/HiBrandTiers.js
   - Display name mapping (bronze → "Hi Pathfinder")
   - Tier badge rendering
   
✅ /public/lib/state/HiMembership.js
   - State management
   - RPC caller (get_unified_membership)
   - Cache management
```

**Backend (SQL):**
```
✅ /sql/migrations/DEPLOY_MASTER_TIER_SYSTEM.sql
   - Creates user_memberships table
   - Creates get_unified_membership() RPC (queries user_memberships)
   - Creates use_invite_code() RPC
   - Creates admin_generate_invite_code() RPC
   
✅ /sql/migrations/tier_enforcement_share_validation.sql
   - Share quota tracking
   - Server-side validation RPCs
   
✅ /sql/migrations/tier_enforcement_tap_limiting.sql
   - Tap quota tracking
   - Cooldown enforcement RPCs
```

**Database:**
```
✅ user_memberships table (SINGLE SOURCE OF TRUTH)
   - user_id → tier mapping
   - Trial dates
   - Invitation codes
```

---

## ❌ DEPRECATED FILES (DO NOT USE)

**Moved to `.deprecated/` folder:**

```
❌ /public/lib/membership/MembershipSystem.js
   - Legacy TIER_1/TIER_2 format
   - Conflicts with TIER_CONFIG.js
   - DEPRECATED: 2025-12-11
   
❌ /public/assets/hi-tier-system.js
   - Redundant tier manager
   - Duplicates HiBrandTiers.js functionality
   - DEPRECATED: 2025-12-11
   
❌ DEPLOY_MEMBERSHIP_TIER_FIX.sql
   - Queries hi_members (wrong table)
   - Overwrites correct get_unified_membership()
   - DEPRECATED: 2025-12-11
   
❌ hi_members.membership_tier column
   - Old tier storage
   - No longer written to
   - KEPT for legacy read-only queries (migration safety)
```

---

## 🔒 DEPLOYMENT PROTOCOL (Prevent Overwrites)

### Rule #1: ONE SQL Migration File Per Feature

**WRONG (Current State):**
```
DEPLOY_MEMBERSHIP_TIER_FIX.sql     ← Creates get_unified_membership()
DEPLOY_MASTER_TIER_SYSTEM.sql      ← ALSO creates get_unified_membership()
                                     ← Which one wins? LAST ONE RUN!
```

**RIGHT (Woz Approach):**
```
/sql/migrations/001_tier_system_foundation.sql
  - Creates ONLY user_memberships table
  - Creates ONLY core tier RPCs
  - IMMUTABLE: Never edit after deployment

/sql/migrations/002_tier_enforcement_shares.sql
  - Creates ONLY share validation RPCs
  - IMMUTABLE: Never edit after deployment

/sql/migrations/003_tier_enforcement_taps.sql
  - Creates ONLY tap limiting RPCs
  - IMMUTABLE: Never edit after deployment
```

**If you need to update an RPC:**
```
/sql/migrations/004_update_get_unified_membership.sql
  - DROP FUNCTION IF EXISTS get_unified_membership();
  - CREATE OR REPLACE FUNCTION get_unified_membership() ...
  - Clear changelog of WHAT changed and WHY
```

### Rule #2: Database Migrations Are Append-Only

**WRONG:**
```sql
-- DEPLOY_MEMBERSHIP_TIER_FIX.sql (edited 5 times)
CREATE OR REPLACE FUNCTION get_unified_membership() ...
-- ↑ Every time you edit this file and re-run, you might break things
```

**RIGHT:**
```sql
-- 001_initial_tier_system.sql (NEVER EDIT)
CREATE FUNCTION get_unified_membership() ... FROM hi_members ...

-- 002_fix_tier_system_query.sql (NEW FILE)
DROP FUNCTION get_unified_membership();
CREATE FUNCTION get_unified_membership() ... FROM user_memberships ...
-- ↑ Clear history: what changed and when
```

### Rule #3: Deployment Checklist

**Before deploying ANY SQL file:**

1. ✅ Check if function name already exists:
   ```sql
   SELECT proname, prosrc 
   FROM pg_proc 
   WHERE proname = 'get_unified_membership';
   ```

2. ✅ If exists, verify which table it queries:
   ```sql
   SELECT routine_definition 
   FROM information_schema.routines 
   WHERE routine_name = 'get_unified_membership';
   -- Should contain "FROM user_memberships"
   ```

3. ✅ If wrong table, create NEW migration file (don't edit old)

4. ✅ Document in CHANGELOG.md what changed

---

## 🛡️ PREVENTING FUTURE CONFLICTS

### Strategy 1: Rename Old Table (Make Conflicts Impossible)

```sql
-- Migration: 005_deprecate_hi_members_tier.sql
ALTER TABLE hi_members 
  RENAME COLUMN membership_tier TO membership_tier_deprecated;

-- Now any code querying membership_tier will ERROR (not silently fail)
-- Forces developers to fix broken references
```

### Strategy 2: Add Schema Version to RPCs

```sql
-- All new RPCs include version in name
CREATE FUNCTION get_unified_membership_v2() ...  -- Queries user_memberships
-- Old version still exists but not called
CREATE FUNCTION get_unified_membership_v1() ...  -- Queries hi_members (legacy)

-- Frontend explicitly calls v2
await sb.rpc('get_unified_membership_v2');
```

### Strategy 3: Add Database Constraint

```sql
-- Prevent writes to old table
CREATE OR REPLACE FUNCTION block_hi_members_tier_writes()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.membership_tier IS NOT NULL THEN
    RAISE EXCEPTION 'membership_tier is deprecated. Use user_memberships.tier instead.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_membership_tier_writes
  BEFORE INSERT OR UPDATE ON hi_members
  FOR EACH ROW EXECUTE FUNCTION block_hi_members_tier_writes();
```

### Strategy 4: Code Review Checklist

**Add to `.github/PULL_REQUEST_TEMPLATE.md`:**

```markdown
## Tier System Changes Checklist

If this PR touches tier-related code, verify:

- [ ] Does NOT query `hi_members.membership_tier` (use `user_memberships.tier`)
- [ ] Does NOT use `MembershipSystem.js` (use `HiMembership.js`)
- [ ] Does NOT use TIER_1/TIER_2 constants (use 'bronze'/'silver'/etc)
- [ ] SQL migrations are append-only (new file for each change)
- [ ] Updated TIER_SYSTEM_CHANGELOG.md with changes
```

---

## 📊 CURRENT STATE AUDIT

Run this to verify your database is using correct system:

```sql
-- Check which table get_unified_membership queries
SELECT 
  routine_name,
  CASE 
    WHEN routine_definition LIKE '%FROM user_memberships%' THEN '✅ CORRECT (user_memberships)'
    WHEN routine_definition LIKE '%FROM hi_members%' THEN '❌ WRONG (hi_members - DEPRECATED)'
    ELSE '⚠️ UNKNOWN'
  END as table_queried,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'get_unified_membership';

-- Check for zombie references to old table
SELECT 
  proname as function_name,
  'Queries hi_members (DEPRECATED)' as issue
FROM pg_proc
WHERE prosrc LIKE '%hi_members.membership_tier%'
  AND proname NOT LIKE '%_deprecated%';

-- Verify new users are writing to correct table
SELECT 
  'user_memberships' as table_name,
  COUNT(*) as rows,
  MAX(created_at) as last_write
FROM user_memberships
UNION ALL
SELECT 
  'hi_members (old)' as table_name,
  COUNT(*) FILTER (WHERE membership_tier IS NOT NULL) as rows,
  MAX(created_at) as last_write
FROM hi_members;
```

**Expected output:**
```
✅ get_unified_membership queries user_memberships
✅ No functions query hi_members.membership_tier
✅ user_memberships has recent writes (today)
✅ hi_members has NO recent writes (weeks/months ago)
```

---

## 🚀 RECOMMENDED NEXT STEPS

### Immediate (Today):

1. **Deprecate conflicting files:**
   ```bash
   mv DEPLOY_MEMBERSHIP_TIER_FIX.sql .deprecated/
   mv public/lib/membership/MembershipSystem.js .deprecated/
   mv public/assets/hi-tier-system.js .deprecated/
   ```

2. **Deploy QUICK_FIX_TIER_BUG.sql** (fixes get_unified_membership NOW)

3. **Verify with test account** (bronze signup → should show "Hi Pathfinder")

### Short-term (This Week):

4. **Rename old database column** (make conflicts impossible):
   ```sql
   ALTER TABLE hi_members 
     RENAME COLUMN membership_tier TO membership_tier_legacy;
   ```

5. **Add database constraint** (prevent writes to old table)

6. **Create migration changelog** (document all tier system changes)

### Long-term (Next Sprint):

7. **Version all tier RPCs** (get_unified_membership_v2, etc.)

8. **Add CI checks** (grep for deprecated imports)

9. **Create tier system tests** (verify RPCs query correct table)

---

## 💡 WOZ PRINCIPLE: "Make Wrong Code Impossible"

**Bad Architecture (Current):**
- Two tables with same data
- Developer can accidentally use either
- Silent failures (wrong tier displayed)

**Good Architecture (After Fix):**
- One table (user_memberships)
- Old table column renamed (membership_tier_legacy)
- Any reference to old column → DATABASE ERROR
- Forces developers to fix code immediately

**Woz Quote:**
> "If you can write buggy code, the architecture is wrong. 
> Make it impossible to write bugs by design."

---

## 📝 DEPLOYMENT COMMAND

```bash
# 1. Deprecate old files
mkdir -p .deprecated/tier-system-2025-12-11
mv DEPLOY_MEMBERSHIP_TIER_FIX.sql .deprecated/tier-system-2025-12-11/
mv public/lib/membership/MembershipSystem.js .deprecated/tier-system-2025-12-11/
mv public/assets/hi-tier-system.js .deprecated/tier-system-2025-12-11/

# 2. Deploy fix to Supabase
# (Copy QUICK_FIX_TIER_BUG.sql to Supabase SQL Editor and run)

# 3. Verify
# (Run audit queries above)

# 4. Git commit
git add .deprecated/ TIER_SYSTEM_SINGLE_SOURCE_OF_TRUTH.md
git commit -m "🔒 Enforce single source of truth for tier system

- Deprecated old tier files (hi_members, MembershipSystem.js)
- Established TIER_CONFIG.js as authoritative source
- Documented Woz-grade architecture to prevent future conflicts
"
```

---

*"The best code is code that can't be wrong." - Woz*
