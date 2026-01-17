-- ===============================================
-- 🔧 FIX RPC USER COUNT - MINIMAL FIX
-- ===============================================
-- The UPDATE to global_stats was correct, but the RPC 
-- is still using the OLD logic that counts from public_shares.
-- This script fixes the RPC to read from global_stats table.

-- 1. DIAGNOSTIC: What does global_stats have NOW?
SELECT 
  'global_stats' as source,
  total_users,
  hi_waves,
  total_his
FROM global_stats;

-- 2. FIX THE RPC: Replace get_user_stats to read from global_stats AND user_stats
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID DEFAULT auth.uid())
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  gs RECORD;
  us RECORD;
  user_points BIGINT;
BEGIN
  -- 🔧 WOZ FIX: Read from global_stats table (SINGLE SOURCE OF TRUTH)
  -- NOT computed from public_shares anymore!
  SELECT hi_waves, total_his, total_users INTO gs FROM global_stats LIMIT 1;
  
  -- 🎯 NEW: Fetch REAL personal stats from user_stats (if user is authenticated)
  IF p_user_id IS NOT NULL THEN
    SELECT 
      COALESCE(total_waves, 0) as total_waves,
      COALESCE(total_hi_moments, 0) as total_shares,
      COALESCE(current_streak, 0) as current_streak,
      COALESCE(longest_streak, 0) as longest_streak,
      last_hi_date
    INTO us
    FROM user_stats
    WHERE user_id = p_user_id;
    
    -- Get hi_points balance
    SELECT COALESCE(balance, 0) INTO user_points
    FROM hi_points
    WHERE user_id = p_user_id;
  END IF;
  
  RETURN jsonb_build_object(
    'personalStats', jsonb_build_object(
      'totalWaves', COALESCE(us.total_waves, 0),
      'totalShares', COALESCE(us.total_shares, 0),
      'weeklyShares', 0,  -- TODO: Calculate from recent shares
      'currentStreak', COALESCE(us.current_streak, 0),
      'hiPoints', COALESCE(user_points, 0),
      'totalMilestones', 0,  -- TODO: Count from milestones table
      'lastWaveAt', us.last_hi_date,
      'lastShareAt', us.last_hi_date
    ),
    'globalStats', jsonb_build_object(
      'hiWaves', COALESCE(gs.hi_waves, 0),
      'totalHis', COALESCE(gs.total_his, 0),
      'activeUsers24h', 0,
      'totalUsers', COALESCE(gs.total_users, 0)  -- FROM TABLE, NOT COMPUTED
    ),
    -- Also include flat keys for compatibility  
    'waves', COALESCE(gs.hi_waves, 0),
    'total_his', COALESCE(gs.total_his, 0),
    'users', COALESCE(gs.total_users, 0)  -- 🔧 FROM TABLE, NOT public_shares count!
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_stats(UUID) TO anon;

-- 3. ALSO ensure global_stats has the correct value
UPDATE global_stats
SET 
  total_users = (SELECT COUNT(*) FROM profiles),
  updated_at = NOW();

-- 4. VERIFY: Test the RPC directly
SELECT get_user_stats(NULL::UUID);

-- 5. FINAL CHECK
SELECT '✅ RPC FIX COMPLETE - Refresh browser!' as status;
