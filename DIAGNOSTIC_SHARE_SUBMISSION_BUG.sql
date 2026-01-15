-- =============================================================
-- 🔥 COMPREHENSIVE DIAGNOSTIC: Share + Profile + Account Issues
-- =============================================================
-- User: degenmentality@gmail.com
-- Issues Reported:
--   1. Anonymous share from Hi Island not appearing
--   2. Profile click error on Hi Island
--   3. Concern about new accounts having issues
-- 
-- Run ALL sections in Supabase SQL Editor
-- =============================================================
-- 
-- 🚨 IDENTIFIED BUGS:
-- 1. RPC COALESCE bug: Anonymous shares get real user_id (auth.uid())
-- 2. Silent failure: HiDB.insertPublicShare returns {ok:false} instead
--    of throwing, so persist() doesn't catch the failure
-- 3. User sees "success" toast even when RPC failed
-- 4. Missing database records (profile/membership) could cause profile error
-- 
-- 📋 TO FIX:
-- 1. Deploy FIX_ANONYMOUS_SHARE_RPC.sql
-- 2. Repair any missing database records
-- =============================================================

-- ═══════════════════════════════════════════════════════════════
-- SECTION 1: USER IDENTITY CHECK
-- ═══════════════════════════════════════════════════════════════
SELECT '═══ SECTION 1: USER IDENTITY ═══' as section;

SELECT 
  id as user_id,
  email,
  created_at as account_created,
  last_sign_in_at,
  CASE WHEN last_sign_in_at > NOW() - INTERVAL '1 hour' THEN '✅ Active session likely'
       WHEN last_sign_in_at > NOW() - INTERVAL '24 hours' THEN '⚠️ Session may be stale'
       ELSE '❌ Session likely expired' END as session_status
FROM auth.users
WHERE email = 'degenmentality@gmail.com';

-- ═══════════════════════════════════════════════════════════════
-- SECTION 2: MEMBERSHIP STATUS
-- ═══════════════════════════════════════════════════════════════
SELECT '═══ SECTION 2: MEMBERSHIP STATUS ═══' as section;

SELECT 
  um.user_id,
  um.tier,
  um.status,
  um.created_at,
  CASE WHEN um.tier = 'free' THEN '⚠️ Free tier - limited features'
       WHEN um.status != 'active' THEN '❌ Membership not active'
       ELSE '✅ Active membership' END as membership_status
FROM user_memberships um
JOIN auth.users u ON u.id = um.user_id
WHERE u.email = 'degenmentality@gmail.com';

-- ═══════════════════════════════════════════════════════════════
-- SECTION 3: SCHEMA CHECK - public_shares table columns
-- ═══════════════════════════════════════════════════════════════
SELECT '═══ SECTION 3: public_shares SCHEMA ═══' as section;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'public_shares'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ═══════════════════════════════════════════════════════════════
-- SECTION 4: SCHEMA CHECK - Does 'text' column exist?
-- ═══════════════════════════════════════════════════════════════
SELECT '═══ SECTION 4: TEXT COLUMN CHECK ═══' as section;

SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'public_shares' 
    AND column_name = 'text'
  ) THEN '✅ text column EXISTS'
  ELSE '❌ text column MISSING - RPC will FAIL' END as text_column_status,
  
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'public_shares' 
    AND column_name = 'content'
  ) THEN '✅ content column EXISTS'
  ELSE '❌ content column MISSING' END as content_column_status;

-- ═══════════════════════════════════════════════════════════════
-- SECTION 5: RPC FUNCTION CHECK - create_public_share
-- ═══════════════════════════════════════════════════════════════
SELECT '═══ SECTION 5: RPC FUNCTION CHECK ═══' as section;

SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as parameters,
  CASE WHEN p.proname IS NOT NULL THEN '✅ Function exists'
       ELSE '❌ Function MISSING' END as status
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'create_public_share'
  AND n.nspname = 'public';

-- ═══════════════════════════════════════════════════════════════
-- SECTION 6: RLS POLICIES on public_shares
-- ═══════════════════════════════════════════════════════════════
SELECT '═══ SECTION 6: RLS POLICIES ═══' as section;

SELECT 
  policyname,
  cmd as operation,
  permissive,
  CASE WHEN qual IS NOT NULL THEN LEFT(qual::text, 100) ELSE 'N/A' END as using_clause
FROM pg_policies
WHERE tablename = 'public_shares'
ORDER BY cmd, policyname;

-- ═══════════════════════════════════════════════════════════════
-- SECTION 7: USER'S RECENT ARCHIVES (last 48 hours)
-- ═══════════════════════════════════════════════════════════════
SELECT '═══ SECTION 7: USER ARCHIVES ═══' as section;

SELECT 
  ha.id,
  LEFT(ha.journal, 50) as journal_preview,
  ha.origin,
  ha.type,
  ha.created_at,
  ha.hi_intensity
FROM hi_archives ha
WHERE ha.user_id = (SELECT id FROM auth.users WHERE email = 'degenmentality@gmail.com')
  AND ha.created_at > NOW() - INTERVAL '48 hours'
ORDER BY ha.created_at DESC
LIMIT 10;

-- ═══════════════════════════════════════════════════════════════
-- SECTION 8: USER'S RECENT PUBLIC SHARES (last 48 hours)
-- ═══════════════════════════════════════════════════════════════
SELECT '═══ SECTION 8: USER PUBLIC SHARES ═══' as section;

SELECT 
  ps.id,
  LEFT(COALESCE(ps.text, ps.content, ''), 50) as text_preview,
  ps.visibility,
  ps.origin,
  ps.created_at,
  ps.hi_intensity
FROM public_shares ps
WHERE ps.user_id = (SELECT id FROM auth.users WHERE email = 'degenmentality@gmail.com')
  AND ps.created_at > NOW() - INTERVAL '48 hours'
ORDER BY ps.created_at DESC
LIMIT 10;

-- ═══════════════════════════════════════════════════════════════
-- SECTION 9: ALL ANONYMOUS SHARES (last 24 hours)
-- These should have user_id = NULL if truly anonymous
-- ═══════════════════════════════════════════════════════════════
SELECT '═══ SECTION 9: ANONYMOUS SHARES ═══' as section;

SELECT 
  ps.id,
  ps.user_id,
  LEFT(COALESCE(ps.text, ps.content, ''), 50) as text_preview,
  ps.visibility,
  ps.origin,
  ps.created_at
FROM public_shares ps
WHERE ps.visibility = 'anonymous'
  AND ps.created_at > NOW() - INTERVAL '24 hours'
ORDER BY ps.created_at DESC
LIMIT 20;

-- ═══════════════════════════════════════════════════════════════
-- SECTION 10: SHARES WITH NULL user_id (truly anonymous)
-- ═══════════════════════════════════════════════════════════════
SELECT '═══ SECTION 10: NULL USER_ID SHARES ═══' as section;

SELECT 
  ps.id,
  LEFT(COALESCE(ps.text, ps.content, ''), 50) as text_preview,
  ps.visibility,
  ps.origin,
  ps.created_at
FROM public_shares ps
WHERE ps.user_id IS NULL
  AND ps.created_at > NOW() - INTERVAL '24 hours'
ORDER BY ps.created_at DESC
LIMIT 20;

-- ═══════════════════════════════════════════════════════════════
-- SECTION 11: TODAY'S SHARE STATS
-- ═══════════════════════════════════════════════════════════════
SELECT '═══ SECTION 11: TODAY STATS ═══' as section;

SELECT 
  COUNT(*) as total_shares_today,
  COUNT(CASE WHEN visibility = 'public' THEN 1 END) as public_shares,
  COUNT(CASE WHEN visibility = 'anonymous' THEN 1 END) as anonymous_shares,
  COUNT(CASE WHEN user_id IS NULL THEN 1 END) as null_user_shares,
  COUNT(CASE WHEN origin = 'hi-island' THEN 1 END) as hi_island_shares
FROM public_shares
WHERE created_at > CURRENT_DATE;

-- ═══════════════════════════════════════════════════════════════
-- SECTION 12: hi_archives SCHEMA CHECK
-- ═══════════════════════════════════════════════════════════════
SELECT '═══ SECTION 12: hi_archives SCHEMA ═══' as section;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'hi_archives'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ═══════════════════════════════════════════════════════════════
-- SECTION 13: RLS POLICIES on hi_archives
-- ═══════════════════════════════════════════════════════════════
SELECT '═══ SECTION 13: hi_archives RLS ═══' as section;

SELECT 
  policyname,
  cmd as operation,
  permissive
FROM pg_policies
WHERE tablename = 'hi_archives'
ORDER BY cmd, policyname;

-- ═══════════════════════════════════════════════════════════════
-- SECTION 14: TEST create_public_share RPC MANUALLY
-- This will create a test share - DELETE AFTER
-- ═══════════════════════════════════════════════════════════════
-- UNCOMMENT TO TEST:
-- SELECT '═══ SECTION 14: RPC TEST ═══' as section;
-- SELECT create_public_share(
--   'TEST SHARE - DELETE ME',
--   'anonymous',
--   'hi-island',
--   'hiisland',
--   'Test Location',
--   NULL,  -- user_id = NULL for anonymous
--   '👋',
--   '✨',
--   3
-- ) as rpc_result;

-- ═══════════════════════════════════════════════════════════════
-- SECTION 15: ROOT CAUSE ANALYSIS - Check RPC Source Code
-- ═══════════════════════════════════════════════════════════════
SELECT '═══ SECTION 15: RPC SOURCE CODE ═══' as section;

SELECT 
  proname as function_name,
  prosrc as source_code
FROM pg_proc 
WHERE proname = 'create_public_share';

-- 🚨 KNOWN BUG: Look for this line in the source:
-- v_user_id := COALESCE(p_user_id, auth.uid());
-- 
-- PROBLEM: If p_user_id is NULL (anonymous), this falls back to auth.uid()
-- which is the REAL user's ID. Anonymous shares are never truly anonymous!
-- 
-- FIX NEEDED: Change to:
-- v_user_id := p_user_id;  -- Respect NULL for anonymous shares

-- ═══════════════════════════════════════════════════════════════
-- SECTION 16: Check for shares that SHOULD be anonymous but have user_id
-- ═══════════════════════════════════════════════════════════════
SELECT '═══ SECTION 16: FALSELY ATTRIBUTED SHARES ═══' as section;

SELECT 
  ps.id,
  ps.user_id,
  u.email as attributed_to_email,
  ps.visibility,
  LEFT(COALESCE(ps.text, ps.content, ''), 30) as text_preview,
  ps.origin,
  ps.created_at
FROM public_shares ps
LEFT JOIN auth.users u ON u.id = ps.user_id
WHERE ps.visibility = 'anonymous'
  AND ps.user_id IS NOT NULL  -- This is the BUG - should be NULL!
  AND ps.created_at > NOW() - INTERVAL '7 days'
ORDER BY ps.created_at DESC
LIMIT 20;

-- ═══════════════════════════════════════════════════════════════
-- SECTION 17: ACCOUNT INTEGRITY CHECK - degenmentality@gmail.com
-- ═══════════════════════════════════════════════════════════════
SELECT '═══ SECTION 17: ACCOUNT INTEGRITY ═══' as section;

WITH user_info AS (
  SELECT id, email, created_at, last_sign_in_at
  FROM auth.users
  WHERE email = 'degenmentality@gmail.com'
)
SELECT 
  '1️⃣ auth.users' as check_area,
  CASE WHEN u.id IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status,
  u.id::text as user_id,
  u.email,
  u.created_at::text as created,
  u.last_sign_in_at::text as last_signin
FROM user_info u

UNION ALL

SELECT 
  '2️⃣ profiles' as check_area,
  CASE WHEN p.id IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING - CREATE IT!' END as status,
  p.id::text as user_id,
  COALESCE(p.username, 'N/A') as email,
  COALESCE(p.display_name, 'N/A') as created,
  p.created_at::text as last_signin
FROM user_info u
LEFT JOIN profiles p ON p.id = u.id

UNION ALL

SELECT 
  '3️⃣ user_memberships' as check_area,
  CASE WHEN um.id IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING - CREATE IT!' END as status,
  um.user_id::text as user_id,
  COALESCE(um.tier, 'N/A') as email,
  COALESCE(um.status, 'N/A') as created,
  um.created_at::text as last_signin
FROM user_info u
LEFT JOIN user_memberships um ON um.user_id = u.id

UNION ALL

SELECT 
  '4️⃣ user_stats' as check_area,
  CASE WHEN us.user_id IS NOT NULL THEN '✅ EXISTS' ELSE '⚠️ MISSING (created on first activity)' END as status,
  us.user_id::text as user_id,
  COALESCE(us.total_waves::text, '0') as email,
  'N/A' as created,
  us.updated_at::text as last_signin
FROM user_info u
LEFT JOIN user_stats us ON us.user_id = u.id;

-- ═══════════════════════════════════════════════════════════════
-- SECTION 18: REPAIR MISSING RECORDS (degenmentality@gmail.com)
-- ═══════════════════════════════════════════════════════════════
-- UNCOMMENT ONLY IF SECTION 17 SHOWS MISSING RECORDS:

-- SELECT '═══ SECTION 18: REPAIR RECORDS ═══' as section;

-- -- Create profile if missing
-- INSERT INTO profiles (id, username, display_name, created_at, updated_at)
-- SELECT id, SPLIT_PART(email, '@', 1), 'Stay Hi User', NOW(), NOW()
-- FROM auth.users
-- WHERE email = 'degenmentality@gmail.com'
-- AND id NOT IN (SELECT id FROM profiles)
-- RETURNING 'Profile created' as result, id;

-- -- Create membership if missing
-- INSERT INTO user_memberships (user_id, tier, status, created_at, updated_at)
-- SELECT id, 'free', 'active', NOW(), NOW()
-- FROM auth.users
-- WHERE email = 'degenmentality@gmail.com'
-- AND id NOT IN (SELECT user_id FROM user_memberships)
-- RETURNING 'Membership created' as result, user_id;

-- ═══════════════════════════════════════════════════════════════
-- SECTION 19: CHECK ALL REQUIRED RPC FUNCTIONS EXIST
-- ═══════════════════════════════════════════════════════════════
SELECT '═══ SECTION 19: RPC FUNCTION CHECK ═══' as section;

SELECT 
  routine_name as function_name,
  CASE 
    WHEN routine_name IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status,
  security_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name IN (
  'create_public_share',
  'get_community_profile',
  'get_own_profile',
  'create_free_membership',
  'handle_new_user'
);

-- ═══════════════════════════════════════════════════════════════
-- SECTION 20: CHECK TRIGGERS FOR NEW USER CREATION
-- ═══════════════════════════════════════════════════════════════
SELECT '═══ SECTION 20: TRIGGER CHECK ═══' as section;

SELECT 
  trigger_name,
  event_object_table as table_name,
  action_timing,
  event_manipulation as event,
  CASE WHEN trigger_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM information_schema.triggers 
WHERE trigger_name IN ('on_auth_user_created', 'on_new_profile_increment_stats')
ORDER BY trigger_name;

-- ═══════════════════════════════════════════════════════════════
-- SUMMARY: Run this to get quick diagnosis
-- ═══════════════════════════════════════════════════════════════
SELECT '═══ QUICK DIAGNOSIS ═══' as section;

SELECT 
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_name = 'public_shares' AND column_name = 'text') > 0 as text_column_exists,
  (SELECT COUNT(*) FROM pg_proc p 
   JOIN pg_namespace n ON n.oid = p.pronamespace 
   WHERE p.proname = 'create_public_share' AND n.nspname = 'public') > 0 as create_share_rpc_exists,
  (SELECT COUNT(*) FROM pg_proc p 
   JOIN pg_namespace n ON n.oid = p.pronamespace 
   WHERE p.proname = 'get_community_profile' AND n.nspname = 'public') > 0 as profile_rpc_exists,
  (SELECT COUNT(*) FROM profiles 
   WHERE id = (SELECT id FROM auth.users WHERE email = 'degenmentality@gmail.com')) > 0 as user_profile_exists,
  (SELECT COUNT(*) FROM user_memberships 
   WHERE user_id = (SELECT id FROM auth.users WHERE email = 'degenmentality@gmail.com')) > 0 as user_membership_exists,
  (SELECT COUNT(*) FROM hi_archives 
   WHERE user_id = (SELECT id FROM auth.users WHERE email = 'degenmentality@gmail.com')
   AND created_at > NOW() - INTERVAL '24 hours') as user_archives_last_24h,
  (SELECT COUNT(*) FROM public_shares 
   WHERE visibility = 'anonymous' AND user_id IS NOT NULL) as falsely_attributed_anon_shares,
  (SELECT COUNT(*) FROM information_schema.triggers 
   WHERE trigger_name = 'on_auth_user_created') > 0 as new_user_trigger_exists;

-- ═══════════════════════════════════════════════════════════════
-- 🏁 END OF DIAGNOSTIC
-- ═══════════════════════════════════════════════════════════════
-- INTERPRETATION:
-- 
-- ✅ All TRUE = System healthy
-- ❌ text_column_exists FALSE = Deploy CRITICAL_FIX_PUBLIC_SHARES_SCHEMA.sql
-- ❌ create_share_rpc_exists FALSE = Deploy UPDATE_RPC_HI_SCALE.sql  
-- ❌ profile_rpc_exists FALSE = Deploy FIX_PROFILE_RPC_PERFORMANCE.sql
-- ❌ user_profile_exists FALSE = Run SECTION 18 repair
-- ❌ user_membership_exists FALSE = Run SECTION 18 repair
-- ❌ new_user_trigger_exists FALSE = New users won't get profiles!
-- 
-- If falsely_attributed_anon_shares > 0 = Deploy FIX_ANONYMOUS_SHARE_RPC.sql
-- ═══════════════════════════════════════════════════════════════

