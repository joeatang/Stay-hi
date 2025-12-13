-- 🔬 DIAGNOSTIC: Bronze ($5.55) Test User Tier Analysis
-- Run this in Supabase SQL Editor to diagnose your specific test signup

-- ========================================
-- STEP 1: Find your test user by email
-- ========================================
-- Replace 'your-test-email@example.com' with the email you used for bronze signup

SELECT 
  '1️⃣ AUTH USER' as check_section,
  id as user_id,
  email,
  created_at as signup_time,
  confirmed_at,
  email_confirmed_at,
  raw_user_meta_data->>'tier' as auth_metadata_tier
FROM auth.users
WHERE email = 'your-test-email@example.com'  -- ← CHANGE THIS
ORDER BY created_at DESC
LIMIT 1;

-- ========================================
-- STEP 2: Check user_memberships table (NEW SYSTEM)
-- ========================================
-- This is where use_invite_code() SHOULD have written tier = 'bronze'

SELECT 
  '2️⃣ user_memberships TABLE' as check_section,
  user_id,
  tier,              -- Should be 'bronze'
  status,            -- Should be 'active'
  invitation_code,   -- Should be your bronze code (e.g., 'ABC123')
  trial_start,
  trial_end,
  trial_days_total,  -- Should be 30
  created_at,
  updated_at
FROM user_memberships
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'your-test-email@example.com'
);

-- If NO ROWS returned → THIS IS THE PROBLEM (use_invite_code failed)
-- If tier = 'free' instead of 'bronze' → invite code logic broken
-- If tier = 'bronze' → Database is correct, issue is in frontend/cache

-- ========================================
-- STEP 3: Check hi_members table (OLD SYSTEM)
-- ========================================
-- This table might have conflicting data

SELECT 
  '3️⃣ hi_members TABLE (OLD)' as check_section,
  id as user_id,
  membership_tier,   -- Might be 'starter', 'enhanced', or NULL
  created_at
FROM hi_members
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'your-test-email@example.com'
);

-- If NO ROWS → Good (old table not used)
-- If membership_tier != tier from user_memberships → CONFLICT DETECTED

-- ========================================
-- STEP 4: Check invitation_codes table
-- ========================================
-- Find the bronze code you used

SELECT 
  '4️⃣ INVITATION CODE' as check_section,
  code,
  grants_tier,       -- Should be 'bronze'
  max_uses,
  current_uses,      -- Should be >= 1 (you used it)
  trial_days,        -- Should be 30
  created_by,
  last_used_at
FROM invitation_codes
WHERE grants_tier = 'bronze'
  AND current_uses > 0
ORDER BY last_used_at DESC
LIMIT 5;

-- ========================================
-- STEP 5: Check membership_transactions log
-- ========================================
-- See if use_invite_code() created a transaction log entry

SELECT 
  '5️⃣ TRANSACTION LOG' as check_section,
  user_id,
  transaction_type,  -- Should be 'invite_code_redemption'
  description,       -- Should mention your invite code
  metadata->>'granted_tier' as granted_tier,  -- Should be 'bronze'
  metadata->>'trial_days' as trial_days,
  created_at
FROM membership_transactions
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'your-test-email@example.com'
)
ORDER BY created_at DESC;

-- If NO ROWS → use_invite_code() never completed successfully
-- If granted_tier != 'bronze' → Wrong tier assigned

-- ========================================
-- STEP 6: Test get_unified_membership() RPC
-- ========================================
-- This is what dashboard calls to load tier

-- Run this AS YOUR TEST USER (in Supabase Dashboard → SQL Editor → Auth tab)
-- OR: Run in browser console: 
-- await supabaseClient.rpc('get_unified_membership')

SELECT get_unified_membership() as rpc_result;

-- Expected result:
-- {
--   "tier": "bronze",
--   "status": "active",
--   "days_remaining": 30,
--   "trial_end": "2025-02-11T...",
--   ...
-- }

-- If returns tier = 'free' or 'anonymous' → RPC broken or querying wrong table

-- ========================================
-- STEP 7: Check which table get_unified_membership() queries
-- ========================================

SELECT 
  '7️⃣ RPC FUNCTION SOURCE' as check_section,
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_unified_membership';

-- Look for:
-- ✅ "FROM user_memberships" → Correct
-- ❌ "FROM hi_members" → Wrong table (this is the bug)

-- ========================================
-- STEP 8: Cross-check ALL tier data for test user
-- ========================================
-- This query shows tier from ALL sources at once

WITH test_user AS (
  SELECT id, email FROM auth.users WHERE email = 'your-test-email@example.com'
)
SELECT 
  '8️⃣ TIER CROSS-CHECK' as check_section,
  tu.email,
  
  -- Source 1: user_memberships table
  um.tier as user_memberships_tier,
  um.status as user_memberships_status,
  
  -- Source 2: hi_members table (old)
  hm.membership_tier as hi_members_tier,
  
  -- Source 3: Auth metadata
  (SELECT raw_user_meta_data->>'tier' FROM auth.users WHERE id = tu.id) as auth_metadata_tier,
  
  -- Consistency check
  CASE 
    WHEN um.tier IS NULL THEN '❌ NO ROW IN user_memberships'
    WHEN um.tier != 'bronze' THEN '❌ WRONG TIER: ' || um.tier
    WHEN hm.membership_tier IS NOT NULL AND hm.membership_tier != um.tier THEN '⚠️ CONFLICT: hi_members has ' || hm.membership_tier
    ELSE '✅ CONSISTENT'
  END as diagnosis

FROM test_user tu
LEFT JOIN user_memberships um ON um.user_id = tu.id
LEFT JOIN hi_members hm ON hm.id = tu.id;

-- ========================================
-- DIAGNOSIS KEY
-- ========================================

-- SCENARIO A: "NO ROW IN user_memberships"
-- → use_invite_code() failed to insert row
-- → Fix: Re-run use_invite_code() with your code + user_id
-- → SQL: SELECT use_invite_code('YOUR_CODE', 'YOUR_USER_ID'::uuid);

-- SCENARIO B: "WRONG TIER: free"
-- → use_invite_code() ran but didn't read grants_tier from invitation_codes
-- → Fix: Check invitation_codes.grants_tier for your code
-- → Fix: Re-deploy DEPLOY_MASTER_TIER_SYSTEM.sql (fixes use_invite_code logic)

-- SCENARIO C: "CONFLICT: hi_members has starter"
-- → get_unified_membership() is querying hi_members instead of user_memberships
-- → Fix: Re-deploy DEPLOY_MASTER_TIER_SYSTEM.sql (fixes get_unified_membership to query correct table)

-- SCENARIO D: "CONSISTENT" but frontend shows wrong tier
-- → Database is correct, issue is in frontend/cache
-- → Fix: Clear localStorage, check HiMembership.js mapping logic

-- ========================================
-- QUICK FIX: Manually set tier to bronze
-- ========================================
-- Run this if you just want to fix your test account NOW

/*
UPDATE user_memberships
SET 
  tier = 'bronze',
  status = 'active',
  trial_end = NOW() + INTERVAL '30 days',
  trial_days_total = 30,
  updated_at = NOW()
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'your-test-email@example.com'
);

-- Then refresh dashboard and clear cache:
-- localStorage.clear(); window.location.reload();
*/

-- ========================================
-- EXPECTED RESULTS (Healthy Bronze User)
-- ========================================

-- 1️⃣ AUTH USER: 
--    email = your-test-email@example.com, confirmed_at = <timestamp>

-- 2️⃣ user_memberships TABLE:
--    tier = 'bronze', status = 'active', trial_days_total = 30

-- 3️⃣ hi_members TABLE:
--    NO ROWS (or membership_tier = 'bronze' if synced)

-- 4️⃣ INVITATION CODE:
--    grants_tier = 'bronze', current_uses = 1, last_used_at = <recent>

-- 5️⃣ TRANSACTION LOG:
--    transaction_type = 'invite_code_redemption', granted_tier = 'bronze'

-- 6️⃣ RPC RESULT:
--    {"tier": "bronze", "status": "active", "days_remaining": 30}

-- 7️⃣ RPC FUNCTION SOURCE:
--    Contains "FROM user_memberships WHERE user_id = auth.uid()"

-- 8️⃣ TIER CROSS-CHECK:
--    diagnosis = '✅ CONSISTENT'
