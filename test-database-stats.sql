-- ===============================================
-- TEST: Check actual database state for debugging
-- ===============================================

-- 1. Check if user_stats table has any data
SELECT 'user_stats table content:' as check_type;
SELECT 
  user_id, 
  total_waves, 
  total_hi_moments, 
  current_streak,
  created_at
FROM user_stats 
ORDER BY created_at DESC 
LIMIT 5;

-- 2. Check global stats function output
SELECT 'get_global_stats() output:' as check_type;
SELECT * FROM get_global_stats();

-- 3. Check get_user_stats for anonymous user
SELECT 'get_user_stats(null) for anonymous:' as check_type;
SELECT get_user_stats(null);

-- 4. Check if global counters exist
SELECT 'Global wave counter:' as check_type;
SELECT COALESCE(COUNT(*), 0) as wave_events_count 
FROM hi_wave_events;

-- 5. Check user count
SELECT 'Total users in system:' as check_type;
SELECT COUNT(DISTINCT user_id) as unique_users 
FROM user_stats 
WHERE user_id IS NOT NULL;