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

-- 2. FIX THE RPC: Replace get_user_stats to read from global_stats
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID DEFAULT auth.uid())
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  gs RECORD;
BEGIN
  -- 🔧 WOZ FIX: Read from global_stats table (SINGLE SOURCE OF TRUTH)
  -- NOT computed from public_shares anymore!
  SELECT hi_waves, total_his, total_users INTO gs FROM global_stats LIMIT 1;
  
  RETURN jsonb_build_object(
    'personalStats', jsonb_build_object(
      'totalWaves', 0,
      'totalShares', 0,
      'weeklyShares', 0,
      'currentStreak', 0,
      'hiPoints', 0,
      'totalMilestones', 0,
      'lastWaveAt', NULL,
      'lastShareAt', NULL
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
