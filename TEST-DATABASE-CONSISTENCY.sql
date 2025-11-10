-- Test both database paths to see which one is wrong

-- Path 1: Direct get_global_stats() (what HiUnifiedGlobalStats calls)
SELECT 'Direct get_global_stats() call:' as test_name;
SELECT * FROM get_global_stats();

-- Path 2: get_user_stats() path (what DashboardStats calls)  
SELECT 'get_user_stats() global stats:' as test_name;
SELECT get_user_stats(null) -> 'globalStats' as global_stats_from_get_user_stats;

-- Check if they return the same hi_waves value
DO $$
DECLARE
  direct_hi_waves INTEGER;
  user_stats_hi_waves INTEGER;
  user_stats_data JSON;
BEGIN
  -- Get direct value
  SELECT hi_waves INTO direct_hi_waves FROM get_global_stats() LIMIT 1;
  
  -- Get value from get_user_stats path
  SELECT get_user_stats(null) INTO user_stats_data;
  user_stats_hi_waves := (user_stats_data -> 'globalStats' ->> 'hiWaves')::INTEGER;
  
  RAISE NOTICE 'Direct get_global_stats() hi_waves: %', direct_hi_waves;
  RAISE NOTICE 'get_user_stats() globalStats.hiWaves: %', user_stats_hi_waves;
  
  IF direct_hi_waves = user_stats_hi_waves THEN
    RAISE NOTICE '✅ BOTH PATHS RETURN SAME VALUE - Database is consistent';
  ELSE  
    RAISE NOTICE '❌ MISMATCH! Database paths return different values!';
  END IF;
END $$;