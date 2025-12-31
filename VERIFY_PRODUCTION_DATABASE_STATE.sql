-- ===============================================
-- 🔬 TRIPLE-CHECK VERIFICATION: Production Database State
-- ===============================================
-- Run this in Supabase SQL Editor to verify actual deployed state
-- This will tell us EXACTLY what's in production vs. what we THINK is there
-- ===============================================

-- ===============================================
-- CHECK 1: Does get_user_share_count RPC exist?
-- ===============================================
SELECT 
  '🔬 CHECK 1: get_user_share_count RPC' as check_name,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ EXISTS'
    ELSE '❌ MISSING (causes 404 lockup)'
  END as status,
  COUNT(*) as function_count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'get_user_share_count'
  AND n.nspname = 'public';

-- Show function signature if it exists
SELECT 
  '📋 Function Signature:' as info,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as parameters,
  pg_get_functiondef(p.oid) as full_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'get_user_share_count'
  AND n.nspname = 'public';

-- ===============================================
-- CHECK 2: Does create_public_share RPC exist?
-- ===============================================
SELECT 
  '🔬 CHECK 2: create_public_share RPC' as check_name,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ EXISTS'
    ELSE '❌ MISSING (share submission will fail)'
  END as status,
  COUNT(*) as function_count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'create_public_share'
  AND n.nspname = 'public';

-- Show function parameters if it exists
SELECT 
  '📋 Function Parameters:' as info,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as parameters
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'create_public_share'
  AND n.nspname = 'public';

-- ===============================================
-- CHECK 3: Does p_origin parameter exist in create_public_share?
-- ===============================================
-- This checks if the RPC accepts origin parameter (required for correct tagging)
SELECT 
  '🔬 CHECK 3: p_origin parameter' as check_name,
  CASE 
    WHEN pg_get_function_arguments(p.oid) LIKE '%p_origin%' THEN '✅ HAS p_origin parameter'
    ELSE '❌ MISSING p_origin parameter (will tag everything as default)'
  END as status,
  pg_get_function_arguments(p.oid) as all_parameters
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'create_public_share'
  AND n.nspname = 'public';

-- ===============================================
-- CHECK 4: Does p_hi_intensity parameter exist in create_public_share?
-- ===============================================
-- This checks if the RPC accepts hi_intensity parameter (optional for Hi Scale feature)
SELECT 
  '🔬 CHECK 4: p_hi_intensity parameter' as check_name,
  CASE 
    WHEN pg_get_function_arguments(p.oid) LIKE '%p_hi_intensity%' THEN '✅ HAS p_hi_intensity parameter'
    ELSE '⚠️ MISSING p_hi_intensity parameter (non-critical, Hi Scale won\'t work)'
  END as status,
  pg_get_function_arguments(p.oid) as all_parameters
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'create_public_share'
  AND n.nspname = 'public';

-- ===============================================
-- CHECK 5: Test get_user_share_count (if it exists)
-- ===============================================
-- This will fail with 404-equivalent if RPC doesn't exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'get_user_share_count' AND n.nspname = 'public'
  ) THEN
    RAISE NOTICE '✅ Testing get_user_share_count...';
    -- Function exists, try calling it
    PERFORM get_user_share_count('month');
    RAISE NOTICE '✅ get_user_share_count executed successfully';
  ELSE
    RAISE WARNING '❌ get_user_share_count does NOT exist - this WILL cause lockup';
  END IF;
END $$;

-- ===============================================
-- CHECK 6: Recent shares - verify origin values
-- ===============================================
-- This shows what origin values are actually stored in the database
SELECT 
  '🔬 CHECK 6: Recent Share Origins' as check_name,
  id,
  origin,
  created_at,
  SUBSTRING(content, 1, 50) as content_preview
FROM public_shares
ORDER BY created_at DESC
LIMIT 10;

-- Count shares by origin to spot pattern
SELECT 
  '📊 Origin Distribution:' as info,
  origin,
  COUNT(*) as share_count,
  MIN(created_at) as first_share,
  MAX(created_at) as latest_share
FROM public_shares
GROUP BY origin
ORDER BY share_count DESC;

-- ===============================================
-- CHECK 7: Verify RPC permissions
-- ===============================================
-- Check if anonymous/authenticated users can call the RPCs
SELECT 
  '🔬 CHECK 7: RPC Permissions' as check_name,
  p.proname as function_name,
  pg_catalog.array_to_string(p.proacl, E'\n') as permissions
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname IN ('get_user_share_count', 'create_public_share')
  AND n.nspname = 'public';

-- ===============================================
-- SUMMARY REPORT
-- ===============================================
-- This will give you a quick yes/no answer
DO $$
DECLARE
  has_share_count BOOLEAN;
  has_create_share BOOLEAN;
  has_origin_param BOOLEAN;
  create_share_params TEXT;
BEGIN
  -- Check get_user_share_count
  SELECT COUNT(*) > 0 INTO has_share_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE p.proname = 'get_user_share_count' AND n.nspname = 'public';
  
  -- Check create_public_share
  SELECT COUNT(*) > 0 INTO has_create_share
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE p.proname = 'create_public_share' AND n.nspname = 'public';
  
  -- Check if create_public_share has p_origin parameter
  IF has_create_share THEN
    SELECT pg_get_function_arguments(p.oid) INTO create_share_params
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'create_public_share' AND n.nspname = 'public'
    LIMIT 1;
    
    has_origin_param := create_share_params LIKE '%p_origin%';
  ELSE
    has_origin_param := FALSE;
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 PRODUCTION DATABASE STATUS SUMMARY';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  IF has_share_count THEN
    RAISE NOTICE '✅ get_user_share_count: EXISTS';
  ELSE
    RAISE NOTICE '❌ get_user_share_count: MISSING (CAUSES LOCKUP)';
  END IF;
  
  IF has_create_share THEN
    RAISE NOTICE '✅ create_public_share: EXISTS';
    IF has_origin_param THEN
      RAISE NOTICE '   ✅ Has p_origin parameter';
    ELSE
      RAISE NOTICE '   ❌ Missing p_origin parameter (wrong tagging)';
    END IF;
  ELSE
    RAISE NOTICE '❌ create_public_share: MISSING (shares will fail)';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  
  IF NOT has_share_count OR NOT has_create_share OR NOT has_origin_param THEN
    RAISE NOTICE '🚨 ACTION REQUIRED: Deploy EMERGENCY_FIX_LOCKUP_AND_ORIGIN.sql';
  ELSE
    RAISE NOTICE '✅ All RPCs deployed correctly - check frontend code';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;

-- ===============================================
-- INTERPRETATION GUIDE
-- ===============================================
/*

SCENARIO 1: get_user_share_count is MISSING
  ❌ Result: "❌ MISSING (causes 404 lockup)"
  🔥 Impact: Page freezes after clicking share button
  🎯 Fix: Deploy EMERGENCY_FIX_LOCKUP_AND_ORIGIN.sql
  
SCENARIO 2: create_public_share MISSING p_origin
  ❌ Result: "❌ MISSING p_origin parameter"
  🔥 Impact: All shares tagged with default value (probably 'hi5' or 'unknown')
  🎯 Fix: Deploy EMERGENCY_FIX_LOCKUP_AND_ORIGIN.sql
  
SCENARIO 3: Both RPCs correct but origin still wrong
  ✅ Result: Both checks pass but recent shares show wrong origin
  🔥 Impact: Frontend not passing origin correctly
  🎯 Fix: Check HiShareSheet instantiation (new HiShareSheet({ origin: 'hi-island' }))
  
SCENARIO 4: Everything checks out
  ✅ Result: All checks pass AND recent shares have correct origin
  🎯 Next: Clear browser cache, hard refresh, test again

*/
