-- ========================================
-- TRIPLE-CHECK: Verify ALL assumptions before deploying fix
-- ========================================

-- ASSUMPTION 1: user_memberships table exists and has correct columns
SELECT 
  '1️⃣ user_memberships TABLE CHECK' as check,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_memberships'
ORDER BY ordinal_position;

-- ASSUMPTION 2: hi_members table exists (old system)
SELECT 
  '2️⃣ hi_members TABLE CHECK' as check,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'hi_members'
ORDER BY ordinal_position;

-- ASSUMPTION 3: Recent invite signups went into user_memberships (not hi_members)
SELECT 
  '3️⃣ RECENT SIGNUPS IN user_memberships' as check,
  um.tier,
  um.status,
  um.invitation_code,
  um.created_at,
  u.email
FROM user_memberships um
JOIN auth.users u ON u.id = um.user_id
ORDER BY um.created_at DESC
LIMIT 5;

-- ASSUMPTION 4: Check if hi_members has any recent data
SELECT 
  '4️⃣ RECENT SIGNUPS IN hi_members' as check,
  hm.membership_tier,
  hm.tier_expires_at,
  hm.created_at,
  u.email
FROM hi_members hm
LEFT JOIN auth.users u ON u.id = hm.user_id
ORDER BY hm.created_at DESC
LIMIT 5;

-- ASSUMPTION 5: Check current get_unified_membership function definition
SELECT 
  '5️⃣ CURRENT FUNCTION SOURCE' as check,
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_unified_membership';

-- ASSUMPTION 6: Test current function - what does it return?
SELECT 
  '6️⃣ CURRENT FUNCTION OUTPUT' as check,
  get_unified_membership() as current_output;

-- ASSUMPTION 7: Verify tier values in user_memberships match allowed tiers
SELECT 
  '7️⃣ TIER VALUES IN user_memberships' as check,
  tier,
  COUNT(*) as count,
  CASE 
    WHEN tier IN ('free', 'bronze', 'silver', 'gold', 'premium', 'collective') THEN '✅ Valid'
    ELSE '❌ INVALID'
  END as validation
FROM user_memberships
GROUP BY tier;

-- ASSUMPTION 8: Check if both tables reference same users
SELECT 
  '8️⃣ USER OVERLAP BETWEEN TABLES' as check,
  (SELECT COUNT(DISTINCT user_id) FROM user_memberships) as users_in_memberships,
  (SELECT COUNT(DISTINCT user_id) FROM hi_members) as users_in_hi_members,
  (SELECT COUNT(*) FROM (
    SELECT user_id FROM user_memberships
    INTERSECT
    SELECT user_id FROM hi_members
  ) overlap) as users_in_both;

-- ASSUMPTION 9: Check admin_roles table structure
SELECT 
  '9️⃣ admin_roles TABLE CHECK' as check,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'admin_roles';

-- ASSUMPTION 10: What table does use_invite_code function write to?
SELECT 
  '🔟 use_invite_code FUNCTION CHECK' as check,
  routine_name,
  CASE 
    WHEN routine_definition LIKE '%user_memberships%' THEN '✅ Writes to user_memberships'
    WHEN routine_definition LIKE '%hi_members%' THEN '❌ Writes to hi_members'
    ELSE '⚠️ Unknown'
  END as writes_to
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'use_invite_code';
