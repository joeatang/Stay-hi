-- ===============================================
-- MIGRATION: 2026-01-17_001_fix_get_user_stats_rpc
-- ===============================================
-- Description: Fix get_user_stats RPC to return personal stats and read from global_stats table
-- Author: GitHub Copilot
-- Date: 2026-01-17
-- 
-- CHANGES:
-- 1. Uses individual variables instead of RECORD (fixes NULL user_id bug)
-- 2. Reads global stats from global_stats table (not computed from public_shares)
-- 3. Fetches personal stats from user_stats and hi_points tables
-- 4. Returns both globalStats AND personalStats in response
--
-- ROLLBACK: See 2026-01-17_001_ROLLBACK_get_user_stats_rpc.sql

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
  -- Read from global_stats table (SINGLE SOURCE OF TRUTH)
  SELECT hi_waves, total_his, total_users INTO gs FROM global_stats LIMIT 1;
  
  -- Fetch personal stats only if user_id provided
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
      'weeklyShares', 0,
      'currentStreak', v_current_streak,
      'hiPoints', v_hi_points,
      'totalMilestones', 0,
      'lastWaveAt', v_last_hi_date,
      'lastShareAt', v_last_hi_date
    ),
    'globalStats', jsonb_build_object(
      'hiWaves', COALESCE(gs.hi_waves, 0),
      'totalHis', COALESCE(gs.total_his, 0),
      'activeUsers24h', 0,
      'totalUsers', COALESCE(gs.total_users, 0)
    ),
    -- Flat keys for backward compatibility
    'waves', COALESCE(gs.hi_waves, 0),
    'total_his', COALESCE(gs.total_his, 0),
    'users', COALESCE(gs.total_users, 0)
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_stats(UUID) TO anon;
