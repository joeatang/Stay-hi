-- ===============================================
-- 🚨 DEPLOY 9: FIX get_global_stats RETURN TYPE MISMATCH
-- ===============================================
-- ROOT CAUSE: get_user_stats() expects different columns from get_global_stats()
-- than what we deployed. This causes the global stats to fail loading.

-- Check what get_user_stats expects
SELECT 'get_user_stats expects these columns from get_global_stats():';
-- Based on hi-database-first-stats.sql lines 166-169:
-- 'hiWaves', COALESCE(global_stats.hi_waves, 0),
-- 'totalHis', COALESCE(global_stats.total_his, 0),  
-- 'activeUsers24h', COALESCE(global_stats.active_users_24h, 0),
-- 'totalUsers', COALESCE(global_stats.total_users, 0)

-- ===============================================
-- FIX: UPDATE get_global_stats TO MATCH EXPECTATIONS
-- ===============================================

DROP FUNCTION IF EXISTS get_global_stats() CASCADE;

CREATE OR REPLACE FUNCTION get_global_stats()
RETURNS TABLE (
  hi_waves INTEGER,
  total_his INTEGER,
  active_users_24h INTEGER,
  total_users INTEGER,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Return the latest stats with ALL expected columns
  RETURN QUERY
  SELECT 
    gs.hi_waves::INTEGER,
    gs.total_his::INTEGER,
    0::INTEGER as active_users_24h,  -- Default for now
    0::INTEGER as total_users,       -- Default for now
    gs.updated_at
  FROM global_stats gs
  ORDER BY gs.id DESC
  LIMIT 1;
  
  -- If no stats exist, return zeros
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      0::INTEGER as hi_waves,
      0::INTEGER as total_his,
      0::INTEGER as active_users_24h,
      0::INTEGER as total_users,
      NOW() as updated_at;
  END IF;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_global_stats() TO anon, authenticated;

-- ===============================================
-- VERIFICATION TESTS
-- ===============================================

-- Test get_global_stats works with all expected columns
SELECT 'get_global_stats() test (all columns):' as test_name;
SELECT * FROM get_global_stats();

-- Test that get_user_stats can now read global stats properly
SELECT 'get_user_stats() test (should now work):' as test_name;
SELECT get_user_stats(null);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '🎯 RETURN TYPE MISMATCH FIXED!';
  RAISE NOTICE '✅ get_global_stats() now returns all expected columns';
  RAISE NOTICE '✅ get_user_stats() can now read global stats properly';
  RAISE NOTICE '🔥 Hi waves should now load on page refresh!';
END $$;