-- ===============================================
-- 🎯 HI OS COMPLIANT ACCESS VERIFICATION
-- ===============================================
-- Tests permissions match hi-access-tiers.js Level 0: Anonymous Explorer specs

-- Test 1: Anonymous Level 0 ALLOWED functions
SELECT 'HI OS LEVEL 0: Anonymous Explorer' as test_type;

-- ✅ Should be ALLOWED: View-only stats (communityStats: 'view_only')
SELECT 'get_user_stats() anon access:' as check_type,
  CASE 
    WHEN has_function_privilege('anon', 'get_user_stats(uuid)', 'execute') 
    THEN '✅ ALLOWED (HI OS Compliant)' 
    ELSE '❌ BLOCKED (HI OS Violation)' 
  END as status;

-- ✅ Should be ALLOWED: Medallion engagement (hiMedallionInteractions: 'unlimited_readonly')
SELECT 'process_medallion_tap() anon access:' as check_type,
  CASE 
    WHEN has_function_privilege('anon', 'process_medallion_tap(uuid)', 'execute') 
    THEN '✅ ALLOWED (HI OS Compliant)' 
    ELSE '❌ BLOCKED (HI OS Violation)' 
  END as status;

-- Test 2: Anonymous Level 0 BLOCKED functions  
SELECT 'HI OS LEVEL 0: Anonymous Restrictions' as test_type;

-- ❌ Should be BLOCKED: Share creation (shareCreation: false)
SELECT 'process_share_submission() anon access:' as check_type,
  CASE 
    WHEN has_function_privilege('anon', 'process_share_submission(uuid, text)', 'execute') 
    THEN '❌ ALLOWED (HI OS Violation)' 
    ELSE '✅ BLOCKED (HI OS Compliant)' 
  END as status;

-- ❌ Should be BLOCKED: Milestones (requires user identity)
SELECT 'check_wave_milestone() anon access:' as check_type,
  CASE 
    WHEN has_function_privilege('anon', 'check_wave_milestone(uuid)', 'execute') 
    THEN '❌ ALLOWED (HI OS Violation)' 
    ELSE '✅ BLOCKED (HI OS Compliant)' 
  END as status;

-- Test 3: Authenticated user access (should have all functions)
SELECT 'AUTHENTICATED USER ACCESS' as test_type;

SELECT 'All functions for authenticated users:' as check_type,
  CASE 
    WHEN has_function_privilege('authenticated', 'get_user_stats(uuid)', 'execute') 
    AND has_function_privilege('authenticated', 'process_share_submission(uuid, text)', 'execute')
    AND has_function_privilege('authenticated', 'check_wave_milestone(uuid)', 'execute')
    THEN '✅ FULL ACCESS' 
    ELSE '❌ MISSING ACCESS' 
  END as status;

-- Test 4: Functional test - can we actually call the functions?
SELECT 'FUNCTIONAL TEST' as test_type;

-- Try calling get_user_stats with null (anonymous)
SELECT 'get_user_stats(null) call test:' as check_type;
SELECT get_user_stats(null) as result_sample;

-- Test 5: Check if functions exist
SELECT 'FUNCTION EXISTENCE TEST' as test_type;

SELECT 
  routine_name,
  routine_type,
  'EXISTS' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'get_user_stats',
    'process_medallion_tap', 
    'update_user_waves',
    'check_wave_milestone'
  )
ORDER BY routine_name;