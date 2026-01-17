-- ===============================================
-- ROLLBACK: 2026-01-17_001_get_user_stats_rpc
-- ===============================================
-- Description: Reverts get_user_stats to previous version (counts from public_shares)
-- Use this if the new RPC causes issues
-- 
-- WARNING: This rolls back to the OLD logic that:
-- - Counts total_users from public_shares (not profiles)
-- - Does NOT return personal stats
-- - Returns 16 users instead of actual 25

CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID DEFAULT auth.uid())
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  global_waves BIGINT;
  global_his BIGINT;
  global_users BIGINT;
BEGIN
  -- OLD LOGIC: Count from public_shares (problematic)
  SELECT 
    COALESCE(SUM(wave_count), 0),
    COUNT(*),
    COUNT(DISTINCT user_id)
  INTO global_waves, global_his, global_users
  FROM public_shares;

  RETURN jsonb_build_object(
    'waves', global_waves,
    'total_his', global_his,
    'users', global_users,
    'globalStats', jsonb_build_object(
      'hiWaves', global_waves,
      'totalHis', global_his,
      'totalUsers', global_users,
      'activeUsers24h', 0
    )
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_stats(UUID) TO anon;

-- NOTE: After rollback, you may want to verify with:
-- SELECT get_user_stats(NULL::UUID);
