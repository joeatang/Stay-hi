-- 🚀 VERIFIED FIX: Count from public_shares (NOT hi_moments)
-- Based on DEBUG_MOBILE_STATS.sql results showing total_hi_moments = 1 (wrong)
-- Actual count in public_shares = 53

-- Step 1: Update your count to correct value (53 from public_shares)
UPDATE user_stats
SET 
  total_hi_moments = (
    SELECT COUNT(*) 
    FROM public_shares  -- ✅ CORRECT TABLE (not hi_moments)
    WHERE user_id = user_stats.user_id
  ),
  updated_at = NOW()
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- Step 2: Verify it worked
SELECT 
  user_id,
  total_hi_moments as "Count in user_stats",
  (SELECT COUNT(*) FROM public_shares WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6') as "Actual count in public_shares",
  CASE 
    WHEN total_hi_moments = (SELECT COUNT(*) FROM public_shares WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6')
    THEN '✅ MATCH'
    ELSE '❌ MISMATCH'
  END as status
FROM user_stats
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- Step 3: Check sync trigger is using correct table
SELECT 
  proname as function_name,
  CASE 
    WHEN prosrc LIKE '%public_shares%' THEN '✅ Uses public_shares (CORRECT)'
    WHEN prosrc LIKE '%hi_moments%' THEN '❌ Uses hi_moments (WRONG - OLD TABLE)'
    ELSE '⚠️ Unknown table'
  END as table_check,
  prosrc as full_code
FROM pg_proc 
WHERE proname = 'sync_moment_count';

-- Step 4: Check for any bad functions still using hi_moments
SELECT 
  proname as function_name,
  '❌ FOUND BAD FUNCTION - uses hi_moments (old table)' as issue
FROM pg_proc 
WHERE prosrc LIKE '%hi_moments%' 
  AND proname LIKE '%stat%';

-- 🎯 Expected Results:
-- Step 1: UPDATE 1 row
-- Step 2: Count in user_stats = 53, Actual count = 53, status = ✅ MATCH
-- Step 3: ✅ Uses public_shares (CORRECT)
-- Step 4: Empty (no bad functions found)
