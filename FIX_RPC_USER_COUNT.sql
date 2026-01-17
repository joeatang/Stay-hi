-- ===============================================
-- 🔧 FIX RPC USER COUNT - COMPLETE FIX
-- ===============================================
-- FIXED: Uses individual variables instead of RECORD to avoid
-- "record is not assigned yet" error when p_user_id is NULL
-- 
-- RUN STATUS: ✅ DEPLOYED 2026-01-17

-- 1. DIAGNOSTIC: What does global_stats have NOW?
SELECT 
  'global_stats' as source,
  total_users,
  hi_waves,
  total_his
FROM global_stats;

-- 2. FIX THE RPC: Uses individual variables with defaults
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID DEFAULT auth.uid())
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  gs RECORD;
  v_total_waves BIGINT := 0;
  v_total_shares BIGINT := 0;
  v_current_streak INT := 0;
  v_last_hi_date TIMESTAMPTZ := NULL;
  v_hi_points BIGINT := 0;
BEGIN
  -- 🔧 WOZ FIX: Read from global_stats table (SINGLE SOURCE OF TRUTH)
  SELECT hi_waves, total_his, total_users INTO gs FROM global_stats LIMIT 1;
  
  -- 🎯 Fetch personal stats only if user_id provided
  IF p_user_id IS NOT NULL THEN
    SELECT 
      COALESCE(total_waves, 0),
      COALESCE(total_hi_moments, 0),
      COALESCE(current_streak, 0),
      last_hi_date
    INTO v_total_waves, v_total_shares, v_current_streak, v_last_hi_date
    FROM user_stats
    WHERE user_id = p_user_id;
    
    SELECT COALESCE(balance, 0) INTO v_hi_points
    FROM hi_points
    WHERE user_id = p_user_id;
  END IF;
  
  RETURN jsonb_build_object(
    'personalStats', jsonb_build_object(
      'totalWaves', v_total_waves,
      'totalShares', v_total_shares,
      'weeklyShares', 0,  -- TODO: Calculate from recent shares
      'currentStreak', v_current_streak,
      'hiPoints', v_hi_points,
      'totalMilestones', 0,  -- TODO: Count from milestones table
      'lastWaveAt', v_last_hi_date,
      'lastShareAt', v_last_hi_date
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
    'users', COALESCE(gs.total_users, 0)  -- 🔧 FROM TABLE!
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_stats(UUID) TO anon;

-- 3. Ensure global_stats has correct value
UPDATE global_stats
SET 
  total_users = (SELECT COUNT(*) FROM profiles),
  updated_at = NOW();

-- 4. VERIFY: Test the RPC directly
SELECT get_user_stats(NULL::UUID);

-- 5. FINAL CHECK
SELECT '✅ RPC FIX COMPLETE - Refresh browser!' as status;
