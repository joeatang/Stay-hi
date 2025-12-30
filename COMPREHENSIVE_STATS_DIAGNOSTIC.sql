-- 🔍 COMPREHENSIVE STATS DIAGNOSTIC
-- Run this to see EXACTLY why stats might be wrong

-- ============================================================================
-- STEP 1: Current state comparison
-- ============================================================================
SELECT 
  '📊 CURRENT STATE' as section,
  us.user_id,
  us.total_hi_moments as "user_stats value",
  (SELECT COUNT(*) FROM public_shares WHERE user_id = us.user_id) as "public_shares count",
  (SELECT COUNT(*) FROM hi_moments WHERE user_id = us.user_id) as "hi_moments count (OLD TABLE)",
  CASE 
    WHEN us.total_hi_moments = (SELECT COUNT(*) FROM public_shares WHERE user_id = us.user_id)
    THEN '✅ CORRECT'
    ELSE '❌ MISMATCH - needs sync'
  END as status,
  us.updated_at as "last_updated"
FROM user_stats us
WHERE us.user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- ============================================================================
-- STEP 2: Check if trigger exists and is active
-- ============================================================================
SELECT 
  '🔍 TRIGGER CHECK' as section,
  tgname as trigger_name,
  tgenabled as enabled,
  CASE 
    WHEN tgenabled = 'O' THEN '✅ ENABLED'
    WHEN tgenabled = 'D' THEN '❌ DISABLED'
    ELSE '⚠️ UNKNOWN'
  END as status
FROM pg_trigger
WHERE tgname = 'sync_moments_on_share';

-- ============================================================================
-- STEP 3: Verify function uses correct table
-- ============================================================================
SELECT 
  '🔍 FUNCTION CODE CHECK' as section,
  proname as function_name,
  CASE 
    WHEN prosrc LIKE '%public_shares%' THEN '✅ Uses public_shares (CORRECT)'
    WHEN prosrc LIKE '%hi_moments%' THEN '❌ Uses hi_moments (WRONG - OLD TABLE)'
    ELSE '⚠️ Unknown'
  END as table_used,
  prosrc as full_code
FROM pg_proc 
WHERE proname = 'sync_moment_count';

-- ============================================================================
-- STEP 4: Check for competing triggers/functions
-- ============================================================================
SELECT 
  '⚠️ COMPETING FUNCTIONS' as section,
  proname as function_name,
  '❌ May be overwriting stats' as warning
FROM pg_proc 
WHERE (prosrc LIKE '%user_stats%' AND prosrc LIKE '%total_hi_moments%')
  AND proname != 'sync_moment_count'
ORDER BY proname;

-- ============================================================================
-- STEP 5: Manual sync to fix any mismatch
-- ============================================================================
UPDATE user_stats
SET 
  total_hi_moments = (SELECT COUNT(*) FROM public_shares WHERE user_id = user_stats.user_id),
  updated_at = NOW()
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6'
RETURNING 
  '🔧 MANUAL SYNC RESULT' as section,
  user_id,
  total_hi_moments as "NEW value",
  (SELECT COUNT(*) FROM public_shares WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6') as "Should be",
  CASE 
    WHEN total_hi_moments = (SELECT COUNT(*) FROM public_shares WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6')
    THEN '✅ FIXED'
    ELSE '❌ STILL WRONG'
  END as status;

-- ============================================================================
-- STEP 6: Verify fix persists (run this 5 seconds after Step 5)
-- ============================================================================
-- Wait 5 seconds, then run:
/*
SELECT 
  '🔍 PERSISTENCE CHECK (run 5 sec after fix)' as section,
  total_hi_moments as "Current value",
  (SELECT COUNT(*) FROM public_shares WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6') as "Expected",
  CASE 
    WHEN total_hi_moments = (SELECT COUNT(*) FROM public_shares WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6')
    THEN '✅ PERSISTED'
    ELSE '❌ RESET - something is overwriting'
  END as status,
  updated_at
FROM user_stats
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';
*/

-- ============================================================================
-- 🎯 EXPECTED RESULTS:
-- ============================================================================
-- Step 1: Should show 53 in both user_stats and public_shares count
-- Step 2: Trigger should be ENABLED
-- Step 3: Function should use public_shares
-- Step 4: Should be empty (no competing functions)
-- Step 5: Should update to 53
-- Step 6: Should still be 53 after 5 seconds
