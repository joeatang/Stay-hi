-- 🚨 EMERGENCY: Fix the count AND prevent it from resetting again

-- 1. Check if bad function still exists
SELECT 
  proname as function_name,
  CASE 
    WHEN prosrc LIKE '%hi_moments%' THEN '🚨 USES OLD TABLE hi_moments'
    WHEN prosrc LIKE '%public_shares%' THEN '✅ USES CORRECT TABLE'
    ELSE 'Unknown'
  END as table_used
FROM pg_proc
WHERE proname IN ('update_user_stats', 'sync_moment_count');

-- 2. DROP ALL versions of update_user_stats (with any signature)
DROP FUNCTION IF EXISTS update_user_stats(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_user_stats() CASCADE;

-- 3. Re-sync to correct count RIGHT NOW
UPDATE user_stats
SET 
  total_hi_moments = (
    SELECT COUNT(*) 
    FROM public_shares 
    WHERE user_id = user_stats.user_id
  ),
  updated_at = NOW()
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- 4. Verify sync worked
SELECT 
  user_id,
  total_hi_moments as moments_count,
  (SELECT COUNT(*) FROM public_shares WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6') as actual_shares,
  CASE 
    WHEN total_hi_moments = (SELECT COUNT(*) FROM public_shares WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6') 
    THEN '✅ CORRECT'
    ELSE '❌ MISMATCH'
  END as status
FROM user_stats
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- 5. Check what functions remain
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname LIKE '%user_stats%' OR proname LIKE '%moment%'
ORDER BY proname;
